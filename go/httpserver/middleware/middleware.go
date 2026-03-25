package middleware

import (
	"net"
	"net/http"
)

func isPrivateIP(ipStr string) bool {
	// 去掉端口号 (例如 "192.168.1.100:54321" -> "192.168.1.100")
	host, _, err := net.SplitHostPort(ipStr)
	if err != nil {
		host = ipStr // 如果没有端口号，直接使用原字符串
	}

	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}

	// 1. 检查是否为回环地址 (127.0.0.1, ::1)
	if ip.IsLoopback() {
		return true
	}

	// 2. 检查常用的私有内网地址段
	// A类: 10.0.0.0/8
	// B类: 172.16.0.0/12
	// C类: 192.168.0.0/16
	if ip4 := ip.To4(); ip4 != nil {
		return ip4[0] == 10 ||
			(ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31) ||
			(ip4[0] == 192 && ip4[1] == 168)
	}

	return false
}

func AuthIfNgrokByHeader(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isPrivateIP(r.RemoteAddr) && r.Header.Get("X-Forwarded-Host") == "" { //内网并且不是 ngrok 不需要授权
			next.ServeHTTP(w, r)
			return
		}

		auth := r.Header.Get("API-KEY-FEEHI")

		if auth == "Yz2Q5pHk9WUuzOjkFeehi" {
			next.ServeHTTP(w, r)
			return
		}

		user, pass, ok := r.BasicAuth()
		if !ok || user != "admin" || pass != "Yz2Q5pHk9WUuzOjkFeehi" {
			w.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
