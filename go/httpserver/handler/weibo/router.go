package weibo

import (
	"database/sql"
	"net/http"
	"strings"
)

func Router(dbWeibo *sql.DB, businessDBPath string, weiboFileBasePath string, largeWeiboFileBasePath string, amapWebKey string) *http.ServeMux {
	if strings.HasSuffix(weiboFileBasePath, "/") {
		weiboFileBasePath = weiboFileBasePath[:len(weiboFileBasePath)-1]
	}
	if strings.HasSuffix(largeWeiboFileBasePath, "/") {
		largeWeiboFileBasePath = largeWeiboFileBasePath[:len(largeWeiboFileBasePath)-1]
	}
	handler := &WeiboHandler{}
	err := handler.Init(dbWeibo, businessDBPath, weiboFileBasePath, largeWeiboFileBasePath, amapWebKey)
	if err != nil {
		panic(err)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/weibo/", handler.List)
	mux.HandleFunc("/weibo/list", handler.List)
	mux.HandleFunc("/weibo/view", handler.View)
	mux.HandleFunc("/weibo/new", handler.Create)
	mux.HandleFunc("/weibo/comment", handler.Comment)
	mux.HandleFunc("/weibo/retweet", handler.Retweet)
	mux.HandleFunc("/weibo/delete", handler.Delete)
	mux.HandleFunc("/weibo/delete-comment", handler.DeleteComment)
	mux.HandleFunc("/weibo/file", handler.File)
	mux.HandleFunc("/weibo/random", handler.RandomWeibo)
	mux.HandleFunc("/weibo/mark", handler.MarkWeibo)
	return mux
}
