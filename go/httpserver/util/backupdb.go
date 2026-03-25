package util

import (
	"bytes"
	"context"
	"crypto/tls"
	"database/sql"
	"errors"
	"feehiapp/util"
	"fmt"
	"github.com/klauspost/compress/zstd"
	"github.com/studio-b12/gowebdav"
	"net/http"
	"os"
	"path"
	"strings"
	"sync"
	"time"
)

var mu sync.Mutex

func BackupSQLiteDB(dbPath string, key string, backupPath string, webdavURL string, webDavUser string, webDavPassword string, db *sql.DB) error {
	mu.Lock()
	defer mu.Unlock()
	walPath := dbPath + "-wal"
	walBytes, err := os.ReadFile(walPath)
	if err != nil {
		return err
	}
	if len(walBytes) == 0 {
		return errors.New("wal is empty")
	}

	encoder, _ := zstd.NewWriter(nil)
	compressed := encoder.EncodeAll(walBytes, make([]byte, 0, len(walBytes)))
	var data []byte
	if key != "" {
		data = util.EncryptBytes(compressed, key)
		if bytes.HasPrefix(data, []byte("error:")) {
			return err
		}
	} else {
		data = compressed
	}
	webdav := gowebdav.NewClient(webdavURL, webDavUser, webDavPassword)
	webdav.SetTransport(&http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	})
	if err := ensureWebDAVDirExist(webdav, backupPath); err != nil {
		return err
	}
	fileName := time.Now().In(time.FixedZone("CST", 8*3600)).Format("2006-01-02_15_04_05.000000") + ".enc"
	err = webdav.Write(path.Join(backupPath, fileName), data, 0644)
	if err != nil {
		return err
	}
	err = truncateTable(db)
	if err != nil {
		return err
	}
	return nil
}

func RestoreSQLiteDB(dbPath string, walBytes []byte, key string) string {
	mu.Lock()
	defer mu.Unlock()
	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	if err != nil {
		return "error: open db: " + err.Error()
	}

	walPath := dbPath + "-wal"
	err = mergeExistingWalIfNeeded(db, walPath)
	if err != nil {
		return "error: merge existing wal: " + err.Error()
	}

	compressed := walBytes
	if key != "" {
		compressed = util.DecryptBytes(walBytes, key)
		if bytes.HasPrefix(compressed, []byte("error:")) {
			return "error: decrypt: " + string(compressed)
		}
	}

	// zstd 解压
	decoder, _ := zstd.NewReader(nil)
	walBytes, err = decoder.DecodeAll(compressed, nil)
	if err != nil {
		return "error: zstd decode: " + err.Error()
	}

	// 写 WAL 文件

	if err := os.WriteFile(walPath, walBytes, 0777); err != nil {
		return "error: write wal: " + err.Error()
	}
	defer db.Close()
	err = truncateTable(db)
	if err != nil {
		return "error: truncate table: " + err.Error()
	}
	return ""
}

func ensureWebDAVDirExist(c *gowebdav.Client, dir string) error {
	parts := strings.Split(dir, "/")
	cur := ""

	for _, p := range parts {
		if p == "" {
			continue
		}
		cur += "/" + p
		_ = c.Mkdir(cur, 0755)
	}
	return nil
}

func mergeExistingWalIfNeeded(db *sql.DB, walPath string) error {
	info, err := os.Stat(walPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	if info.Size() == 0 {
		return nil
	}

	// 让 SQLite 吃掉旧 WAL
	if err := truncateTable(db); err != nil {
		return fmt.Errorf("merge existing wal failed: %w", err)
	}
	return nil
}

func truncateTable(db *sql.DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
	defer cancel()

	// 执行 FULL checkpoint
	var remainingPages int
	done := make(chan error, 1)
	go func() {
		row := db.QueryRow("PRAGMA wal_checkpoint(FULL);")
		// sqlite3 返回三列，取最后一列 remaining_pages
		var totalPages int
		if err := row.Scan(&totalPages, &totalPages, &remainingPages); err != nil {
			done <- fmt.Errorf("full checkpoint failed: %w", err)
			return
		}
		done <- nil
	}()

	select {
	case err := <-done:
		if err != nil {
			return err
		}
	case <-ctx.Done():
		return fmt.Errorf("checkpoint FULL timeout after 3s")
	}

	if remainingPages > 0 {
		//return fmt.Errorf("checkpoint FULL incomplete, remaining pages: %d", remainingPages)
	}

	// WAL 同步完毕，安全 truncate
	_, err := db.Exec("PRAGMA wal_checkpoint(TRUNCATE);")
	if err != nil {
		return fmt.Errorf("truncate WAL failed: %s", err)
	}
	return nil
}
