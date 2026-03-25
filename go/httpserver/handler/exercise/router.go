package exercise

import (
	"database/sql"
	"net/http"
)

func Router(db *sql.DB) *http.ServeMux {
	handler := &ExerciseHandler{}
	handler.Init(db)
	mux := http.NewServeMux()

	mux.HandleFunc("/exercise/", handler.List)
	mux.HandleFunc("/exercise/list", handler.List)
	mux.HandleFunc("/exercise/view", handler.View)
	mux.HandleFunc("/exercise/new", handler.Create)
	mux.HandleFunc("/exercise/delete", handler.Delete)
	mux.HandleFunc("/exercise/ai-prompts", handler.AiPrompts)
	mux.HandleFunc("/exercise/abdominal", handler.Abdominal)
	return mux
}
