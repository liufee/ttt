package tool

import (
	"bytes"
	"encoding/base64"
	"feehiapp/httpserver/templates"
	"golang.org/x/net/websocket"
	"net/http"
	"os"
	"sync"
)

type ToolHandler struct {
	Clients map[*websocket.Conn]bool
	Buffer  map[*websocket.Conn]string
	mutex   sync.Mutex
}

func (t *ToolHandler) Sync(w http.ResponseWriter, request *http.Request) {
	fileContent, _ := templates.ToolTemplates.ReadFile("tool/sync.html")
	w.Header().Set("Content-Type", "text/html")
	_, err := w.Write(fileContent)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (t *ToolHandler) Subscribe(w http.ResponseWriter, request *http.Request) {
	path := request.URL.Query().Get("path")
	content, err := os.ReadFile(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var encoded []byte
	if bytes.Contains(content, []byte("://")) {
		str := base64.StdEncoding.EncodeToString(content)
		encoded = []byte(str)
	} else {
		encoded = content
	}
	_, err = w.Write(encoded)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
