package util

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
)

func CalculateHash(data string, tp string) string {
	hash := sha256.New()
	hash.Write([]byte(data))
	hashInBytes := hash.Sum(nil)
	return hex.EncodeToString(hashInBytes)
}

// CalculateHashWithMedia deprecated 2025-12-18 之后已废弃，改动 CalculateHash(AssembleStrToCreateTSR)
func CalculateHashWithMedia(data string, tp string, mediaStr string) string {
	var mediaContent = ""
	if mediaStr != "" {
		media := strings.Split(mediaStr, ",")
		for _, m := range media {
			data, err := os.ReadFile(m)
			if err != nil {
				return fmt.Sprintf("error:%v", err)
			}
			mediaContent += base64.StdEncoding.EncodeToString(data)
		}
	}
	hash := sha256.New()
	hash.Write([]byte(data + mediaContent))
	hashInBytes := hash.Sum(nil)
	return hex.EncodeToString(hashInBytes)
}
