package children

import (
	"database/sql"
	"net/http"
)

func Router(db *sql.DB) *http.ServeMux {
	handler := &ChildrenHandler{}
	handler.Init(db)
	mux := http.NewServeMux()

	mux.HandleFunc("/children/", handler.AIPrompts)
	mux.HandleFunc("/children/ai-prompts", handler.AIPrompts)
	return mux
}
