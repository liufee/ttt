package util

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"github.com/digitorus/timestamp"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

func GenerateTSRWithMedia(str string, mediaStr string) string {
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
	return GenerateTSR(str + mediaContent)
}

func AssembleStrToCreateTSR(str string, mediaStr string) string {
	h := sha256.New()
	mediaDigestHex := ""
	if mediaStr != "" {
		media := strings.Split(mediaStr, ",")
		buf := make([]byte, 1024*1024) // 1MB buffer

		for _, m := range media {
			m = strings.TrimSpace(m)
			if m == "" {
				continue
			}

			f, err := os.Open(m)
			if err != nil {
				return fmt.Sprintf("error:%v", err)
			}

			if _, err := io.CopyBuffer(h, f, buf); err != nil {
				f.Close()
				return fmt.Sprintf("error:%v", err)
			}
			f.Close()
		}
		mediaDigestHex = hex.EncodeToString(h.Sum(nil))
	}
	return str + mediaDigestHex
}

func GenerateTSRWithMediaV2(str string, mediaStr string) string {
	return GenerateTSR(AssembleStrToCreateTSR(str, mediaStr))
}

func GenerateTSR(data string) string {
	req, err := timestamp.CreateRequest(bytes.NewReader([]byte(data)), &timestamp.RequestOptions{
		Certificates: true,
	})
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}
	// 发送请求到 TSA http://timestamp.globalsign.com/tsa/r6advanced1   https://freetsa.org/tsr   http://timestamp.digicert.com
	resp, err := http.Post("http://timestamp.globalsign.com/tsa/r6advanced1", "application/timestamp-query", bytes.NewReader(req))
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}
	defer resp.Body.Close()
	result, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}
	return base64.StdEncoding.EncodeToString(result)
}

func ParseTSR(data string) string {
	dt, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}
	result, err := timestamp.ParseResponse(dt)
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}
	type Cer struct {
		Name    string
		Content string
	}
	type Result struct {
		Time          string
		HashedMessage string
		HashAlgorithm string
		Certificates  []Cer
	}

	var certificates []Cer
	for _, cer := range result.Certificates {
		var buf bytes.Buffer
		pemBlock := &pem.Block{
			Type:  "CERTIFICATE",
			Bytes: cer.Raw, //最后一个是 root 证书
		}
		err = pem.Encode(&buf, pemBlock)
		if err != nil {
			return fmt.Sprintf("error:%v", err)
		}
		certificates = append(certificates, Cer{
			Name:    cer.Subject.CommonName,
			Content: buf.String(),
		})
	}
	//验证 openssl ts -verify -in x.tsr -data 源文件路径(文件注意后面会自动添加\n) -CAfile root证书 -untrusted 中间证书1 -untrusted 中间证书2

	res := Result{
		Time:          result.Time.In(time.FixedZone("Asia/Shanghai", 8*60*60)).Format("2006-01-02 15:04:05"),
		HashedMessage: hex.EncodeToString(result.HashedMessage),
		HashAlgorithm: result.HashAlgorithm.String(),
		Certificates:  certificates,
	}
	body, err := json.Marshal(res)
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}
	return string(body)
}
