package templates

import (
	"bytes"
	"embed"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
)

//go:embed tool/*
var ToolTemplates embed.FS

//go:embed exercise/*
var ExerciseTemplates embed.FS

//go:embed weibo/**
var WeiboTemplates embed.FS

//go:embed novel/*
var NovelTemplates embed.FS

//go:embed children/*
var ChildrenTemplates embed.FS

func Assets(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		http.NotFound(w, r)
		return
	}

	var fsys embed.FS

	switch {
	case strings.HasPrefix(filePath, "weibo/"):
		fsys = WeiboTemplates
	case strings.HasPrefix(filePath, "exercise/"):
		fsys = ExerciseTemplates
	case strings.HasPrefix(filePath, "tool/"):
		fsys = ToolTemplates
	case strings.HasPrefix(filePath, "novel/"):
		fsys = NovelTemplates
	case strings.HasPrefix(filePath, "children/"):
		fsys = ChildrenTemplates
	default:
		http.NotFound(w, r)
		return
	}

	f, err := fsys.Open(filePath)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		http.Error(w, "stat error", http.StatusInternalServerError)
		return
	}

	data, err := fsys.ReadFile(filePath)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	mimeType := mime.TypeByExtension(filepath.Ext(filePath))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", mimeType)

	if err != nil {
		http.Error(w, "File stat error", http.StatusInternalServerError)
		return
	}
	http.ServeContent(w, r, filepath.Base(filePath), info.ModTime(), bytes.NewReader(data))
}
