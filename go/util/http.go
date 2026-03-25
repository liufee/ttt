package util

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

func HTTPClient(req string) string {
	var request struct {
		Proxy   string            `json:"proxy"`
		Method  string            `json:"method"`
		URL     string            `json:"url"`
		Headers map[string]string `json:"headers"`
		Body    string            `json:"body"`
	}
	err := json.Unmarshal([]byte(req), &request)
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}

	client := &http.Client{
		Transport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}},
	}

	if request.Proxy != "" {
		proxyURL, err := url.Parse(request.Proxy)
		if err != nil {
			return fmt.Sprintf("error:%v", err)
		}
		transport, _ := client.Transport.(*http.Transport)
		transport.Proxy = http.ProxyURL(proxyURL)
	}
	var reqInstance *http.Request
	if request.Body != "" {
		reqInstance, err = http.NewRequest(strings.ToUpper(request.Method), request.URL, strings.NewReader(request.Body))
	} else {
		reqInstance, err = http.NewRequest(strings.ToUpper(request.Method), request.URL, nil)
	}
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}
	for k, v := range request.Headers {
		reqInstance.Header.Add(k, v)
	}
	resp, err := client.Do(reqInstance)
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}
	defer resp.Body.Close()
	result, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Sprintf("error:%v", err)
	}
	return string(result)
}
