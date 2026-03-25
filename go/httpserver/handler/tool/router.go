package tool

import (
	"golang.org/x/net/websocket"
	"net/http"
)

func Router() *http.ServeMux {
	handler := &ToolHandler{
		Clients: make(map[*websocket.Conn]bool),
		Buffer:  make(map[*websocket.Conn]string),
	}
	mux := http.NewServeMux()

	mux.Handle("/tool/sync/ws", websocket.Handler(handler.WebsocketHandler))
	mux.HandleFunc("/tool/sync", handler.Sync)
	mux.HandleFunc("/sync/", handler.Sync)
	mux.HandleFunc("/tool/subscribe", handler.Subscribe)
	return mux
}
