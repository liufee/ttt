package httpserver

import (
	"crypto/tls"
	"database/sql"
	"feehiapp/httpserver/handler/children"
	"feehiapp/httpserver/handler/exercise"
	"feehiapp/httpserver/handler/novel"
	"feehiapp/httpserver/handler/tool"
	"feehiapp/httpserver/handler/weibo"
	"feehiapp/httpserver/middleware"
	"feehiapp/httpserver/templates"
	"feehiapp/httpserver/util"
	"fmt"
	"golang.org/x/net/context"
	_ "modernc.org/sqlite"
	"net/http"
	"time"
)

func fatal(err error) {
	if err != nil {
		panic(err)
	}
}

var httpServer *http.Server

var (
	dbNovel    *sql.DB
	dbWeibo    *sql.DB
	dbExercise *sql.DB
	dbChildren *sql.DB
)

func StartHTTPServer(isHTTPS string, isNewGoroutineListen string, novelDB string, weiboDB string, exerciseDB string, businessDB string, childrenDB string, weiboFileBasePath string, largeWeiboFileBasePath string, amapWebKey string, port string) string {
	if httpServer != nil {
		return "already_started," + util.GetIPAddrs(port)
	}

	var err error
	dbNovel, err = sql.Open("sqlite", novelDB)
	fatal(err)

	dbWeibo, err = sql.Open("sqlite", weiboDB+"?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	fatal(err)

	dbExercise, err = sql.Open("sqlite", exerciseDB+"?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	fatal(err)

	dbChildren, err = sql.Open("sqlite", childrenDB+"?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	fatal(err)

	mainMux := http.NewServeMux()

	mainMux.HandleFunc("/assets", templates.Assets)

	// 添加novel路由组
	mainMux.Handle("/novel/", novel.Router(dbNovel))

	//添加tool路由组
	mainMux.Handle("/tool/", tool.Router())
	mainMux.Handle("/sync/", tool.Router())

	// 添加weibo路由组
	mainMux.Handle("/weibo/", weibo.Router(dbWeibo, businessDB, weiboFileBasePath, largeWeiboFileBasePath, amapWebKey))

	// 添加exercise路由组
	mainMux.Handle("/exercise/", exercise.Router(dbExercise))

	//添加children路由组
	mainMux.Handle("/children/", children.Router(dbChildren))

	cert, err := tls.X509KeyPair([]byte(certPem), []byte(keyPem))
	fatal(err)

	httpServer = &http.Server{Addr: fmt.Sprintf("0.0.0.0:%s", port), TLSConfig: &tls.Config{Certificates: []tls.Certificate{cert}}, Handler: middleware.AuthIfNgrokByHeader(mainMux)}

	var startServer = func() {
		if isHTTPS == "yes" {
			err = httpServer.ListenAndServeTLS("", "")
		} else {
			err = httpServer.ListenAndServe()
		}
		if err != nil {
			fmt.Println(err)
		}
	}
	if isNewGoroutineListen == "yes" {
		go func() {
			startServer()
		}()
	} else {
		startServer()
	}

	return "start_success," + util.GetIPAddrs(port)
}

func StopHTTPServer() string {
	if httpServer == nil {
		return "not_started"
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		return err.Error()
	}
	if dbNovel != nil {
		_ = dbNovel.Close()
		dbNovel = nil
	}
	if dbWeibo != nil {
		_ = dbWeibo.Close()
		dbWeibo = nil
	}
	if dbExercise != nil {
		_ = dbExercise.Close()
		dbExercise = nil
	}
	if dbChildren != nil {
		_ = dbChildren.Close()
		dbChildren = nil
	}
	httpServer = nil
	return "finished"
}

var keyPem = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRBoQiiafBXkx9
8PmPTPBEuujiDUQnQofNW8xKZZnkx1NIfa09Tdo0fmr5Lfg3G75bW+Fqu2Njhall
2+r8iXiYFCJIvxzo0EILx0cRHDKZUlXDw84TWCP3hhxf7jKXB2WQOhwH4ubHUaN5
MSP09PumiRdHdT7cM581+AnAyWqdxQcjChK8mcX3EDEX9opQOcojMmEzODp2utSj
s4LSHzM85OFQhk7B6+yAx4sR89Y/XRO+yLSpbgJNh2kTSwWxf1XJeuz55CyymEiU
cGxknHkA84bxj2fbV0lQDuGMymtWvKFWJH8mC9LQxo/ja7CHIcmqUVrgVE6h1wvM
M/C5l6PtAgMBAAECggEAArFBoMuYIGqtXo6XkFZ5M9Fv2tWOlAOMie3NnFm3A+uO
BuguLpTNo5EgofQLIfPsCEjkhuzsqKVZ8L4b8UPODLDEXkkulKXLa/5q9m1KuOSG
xp5DjcaRXrNYszhMvjBHXnZj0mAvASXr4/g+PSiuAyT56p7if+X0U4wjMrCwJwxo
MlvgidJxt5JRmiBlGTiJOF9JtkHFjDuVdU0pSvUTcf0vItcRUZqKolw4YEvFTmJy
YWUmbjc0rJ1y51yI3Q/SPwWd2FmxpZdKetQ5B+7ZlsOiYCdgFBoeQRPHOtHXAkxR
mtI+p2aL6QR0G+uYEzGCAqGfQ0mwJCwBpJJU2hmeUQKBgQDoOcgMxeLdVPhYSxvc
lJrlabPs0p/dLiSucISQxaZxKWenRbY8CL1EdZGfSncIaeJY94ey4eCjEEQrWJk5
WEteuK0qXFYFE8Ymp59QVvfVV+6IwU7Ad3e9kg/p76H42uE+QpaZ9ohuihymwaIz
TI2q4TQ03KY6sNlxE//FevFs9QKBgQDmbLKdE8guu0Cu951NQwjzTwxNmOesyUeM
LgrUSyJb9a4dRqT2XguO2kdWUaCbpfFf5kcs7u80vIsBpAT5Z0yJYmvzC60wYQaT
Gtm+jVnHTxYil9cMvFBzrM0wv45+rGFBEa3lfs4M6x8H5n04p+2rzwmrxz7at/vk
PGGhVXQAGQKBgFihvQWK/VRGWuav+/lLSncmycIofVVYiC1/ykjK9wSXrfT8uVne
aAZZ7PNj41x1tSsJhmQyq57w1WPJ0+k8FsAXMhhJ15bmfilArqBmIP7vKZ5OUTVK
I4xZ0/MQP7yQJYmytnIa0uWFlvvaSYLUw/klLNzEHjmmR8dNv7/qdXyFAoGBAN9n
O7U3XLqSKiB5SjWCbMcZOOBzAwtvCsNKUI2LWwC1rd4MhBupCqOx1cBG2+SMev1z
kkZqUdlbg5pPn9L+6CG7HtZB1+Qz7d/qBHrPKOAoOVnIxWM/oPDF9RryXgFKt/AS
Z/s9eiDkRO2v9nBbv/73eHTndHUyNDIQqMd2xkThAoGAH6LglMIuAXLa/O836UZg
21NGR0Jy+u8R8CVcyDteF0FcuFNWpfQXuyHeoSoOtl7RWKJJQjtonj3x7tUrEYN9
19G1lrwN+f2ojM5jwPjcZQNyGOi9ivHzF6XbpQ/xzRIwxYn/flGxLz2sy2ch1A8X
axEwO2fi07K8Cf0xP+JaFjw=
-----END PRIVATE KEY-----`

var certPem = `-----BEGIN CERTIFICATE-----
MIID4zCCAsugAwIBAgIUBhGOcvW0mJ48p3L3IRMIQdLWO5UwDQYJKoZIhvcNAQEL
BQAwXDELMAkGA1UEBhMCR0wxDzANBgNVBAgMBkdsb2JhbDEPMA0GA1UEBwwGR2xv
YmFsMQ4wDAYDVQQKDAVGZWVoaTELMAkGA1UECwwCSVQxDjAMBgNVBAMMBUZlZWhp
MB4XDTI2MDMxNTE0MDk0MVoXDTM2MDMxMjE0MDk0MVowXDELMAkGA1UEBhMCR0wx
DzANBgNVBAgMBkdsb2JhbDEPMA0GA1UEBwwGR2xvYmFsMQ4wDAYDVQQKDAVGZWVo
aTELMAkGA1UECwwCSVQxDjAMBgNVBAMMBUZlZWhpMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEA0QaEIomnwV5MffD5j0zwRLro4g1EJ0KHzVvMSmWZ5MdT
SH2tPU3aNH5q+S34Nxu+W1vhartjY4WpZdvq/Il4mBQiSL8c6NBCC8dHERwymVJV
w8POE1gj94YcX+4ylwdlkDocB+Lmx1GjeTEj9PT7pokXR3U+3DOfNfgJwMlqncUH
IwoSvJnF9xAxF/aKUDnKIzJhMzg6drrUo7OC0h8zPOThUIZOwevsgMeLEfPWP10T
vsi0qW4CTYdpE0sFsX9VyXrs+eQssphIlHBsZJx5APOG8Y9n21dJUA7hjMprVryh
ViR/JgvS0MaP42uwhyHJqlFa4FROodcLzDPwuZej7QIDAQABo4GcMIGZMHgGA1Ud
EQRxMG+CCWxvY2FsaG9zdIILKi5mZWVoaS5jb22CCWZlZWhpLmNvbYIMKi5maGku
cXp6LmlvggpmaGkucXp6LmlvggwqLmhray5xenouaW+CCmhray5xenouaW+HBH8A
AAGHBMCoAQKHBMCoAQOHBMCoAQgwHQYDVR0OBBYEFP1vU6i3DzA9Ic8XZrpFV48Q
mrA6MA0GCSqGSIb3DQEBCwUAA4IBAQALlX2rwjzCl9WCvYRKNT40XtyLeBV/Ahb8
uWSuUginRA2GuK7pYzicpQ6qUmtUCdE1Rsr4/2cZdj7Ea7Ot2be+MhiRqoDHtwzI
ELLD0frKsCP9ZaZG/qIeSoORCbYRJArDWtAiG5zcJXPLv71XHB8+7krdi5GoXiFR
5H+Lu03uKQkYByqJSu+q07V7VdAucwfbn1TMpZOb3GSIcPtvpYc3hbuudNAEEDd/
FnhE+4arYefNziLDhsFDk+BiJLjvk6atKklJj+AcNM+GZ1lzEY2eaTz51MmZWkaC
NwnWqWKJUQZ3aKzOeemtKgUHwO4esHaHIzpBneIT+l6oGzQNjpgz
-----END CERTIFICATE-----`
