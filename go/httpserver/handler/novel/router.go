package novel

import (
	"database/sql"
	"net/http"
)

func Router(dbNovel *sql.DB) *http.ServeMux {
	handler := &NovelHandler{
		DB: dbNovel,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/novel", handler.List)
	mux.HandleFunc("/novel/list", handler.List)
	mux.HandleFunc("/novel/detail", handler.HttpDetailPage)
	return mux
}
