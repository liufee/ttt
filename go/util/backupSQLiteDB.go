package util

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"os"
	"sync"

	"github.com/klauspost/compress/zstd"
	_ "modernc.org/sqlite"
)

var mu sync.Mutex

func BackupSQLiteDBWal(dbPath, key string) string {
	mu.Lock()
	defer mu.Unlock()
	walPath := dbPath + "-wal"
	walBytes, err := os.ReadFile(walPath)
	if err != nil {
		return "error: read wal: " + err.Error()
	}
	if len(walBytes) == 0 {
		return "0"
	}

	dsn := dbPath + "?_pragma=journal_mode(WAL)&_pragma=busy_timeout(3000)&cache=shared"

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return "error: open db: " + err.Error()
	}
	db.Exec("PRAGMA wal_checkpoint(TRUNCATE);")

	encoder, _ := zstd.NewWriter(nil)
	compressed := encoder.EncodeAll(walBytes, make([]byte, 0, len(walBytes)))

	if key != "" {
		encrypted := EncryptBytes(compressed, key)
		if bytes.HasPrefix(encrypted, []byte("error:")) {
			return "error: encrypt: " + string(encrypted)
		}
		return base64.StdEncoding.EncodeToString(encrypted)
	}

	return base64.StdEncoding.EncodeToString(compressed)
}

func RestoreSQLiteDBFromWal(dbPath, walStr, key string) string {
	mu.Lock()
	defer mu.Unlock()
	walContent, err := base64.StdEncoding.DecodeString(walStr)
	if err != nil {
		return "error: base64 decode: " + err.Error()
	}
	compressed := walContent

	if key != "" {
		compressed = DecryptBytes(walContent, key)
		if bytes.HasPrefix(compressed, []byte("error:")) {
			return "error: decrypt: " + string(compressed)
		}
	}

	// zstd 解压
	decoder, _ := zstd.NewReader(nil)
	walBytes, err := decoder.DecodeAll(compressed, nil)
	if err != nil {
		return "error: zstd decode: " + err.Error()
	}

	// 写 WAL 文件
	walPath := dbPath + "-wal"
	if err := os.WriteFile(walPath, walBytes, 0777); err != nil {
		return "error: write wal: " + err.Error()
	}
	// 打开 SQLite（自动 replay）
	dsn := dbPath + "?_pragma=journal_mode(WAL)&_pragma=busy_timeout(3000)&cache=shared"

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return "error: open db: " + err.Error()
	}
	defer db.Close()
	db.SetMaxOpenConns(1)

	// checkpoint TRUNCATE
	if _, err := db.Exec("PRAGMA wal_checkpoint(TRUNCATE);"); err != nil {
		return "error: checkpoint truncate: " + err.Error()
	}

	return ""
}
