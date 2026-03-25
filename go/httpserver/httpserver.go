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
