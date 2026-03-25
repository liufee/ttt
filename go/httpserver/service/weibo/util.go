package weibo

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

func RemoveFileAndEmptyDirs(filePath string) error {
	// 1. 判断文件是否存在
	info, err := os.Stat(filePath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil // 文件不存在，不报错
		}
		return err // 其他错误
	}

	// 2. 不是普通文件直接报错（防误删）
	if info.IsDir() {
		return errors.New("path is a directory, not a file")
	}

	// 3. 删除文件
	if err := os.Remove(filePath); err != nil {
		return err
	}

	// 4. 递归删除空目录
	dir := filepath.Dir(filePath)
	for {
		empty, err := isDirEmpty(dir)
		if err != nil || !empty {
			break
		}

		if err := os.Remove(dir); err != nil {
			return err
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break // 到根目录了
		}
		dir = parent
	}

	return nil
}

func isDirEmpty(dir string) (bool, error) {
	f, err := os.Open(dir)
	if err != nil {
		return false, err
	}
	defer f.Close()

	// 只读一个条目，够快
	_, err = f.Readdirnames(1)
	if err == nil {
		return false, nil
	}
	if errors.Is(err, os.ErrNotExist) {
		return false, err
	}
	return true, nil // EOF → 空目录
}

func getMime(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// http.DetectContentType 只检查文件头的前 512 个字节。
	// 为了效率，我们只读取这些字节。
	header := make([]byte, 512)
	_, err = file.Read(header)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("failed to read file header: %w", err)
	}
	return http.DetectContentType(header), nil
}
