package sdk

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"time"
)

func NewQQExmail(corpId string, corpSecret string, emailSuffix string, tokenPath string) QQExmail {
	return &qqExmail{
		corpId:      corpId,
		corpSecret:  corpSecret,
		emailSuffix: emailSuffix,
		tokenPath:   tokenPath,
	}
}

type QQExmail interface {
	GetAccessToken(alias string) (accessToken AccessToken, err error)
	GetAutoLoginUrl(alias string) (loginUrl string, err error)
	GetDomain() string
}

const HostApi = "https://api.exmail.qq.com/cgi-bin"

type qqExmail struct {
	baseUri     string
	corpId      string
	corpSecret  string
	emailSuffix string
	tokenPath   string
}

func (mail *qqExmail) GetAccessToken(alias string) (AccessToken, error) {
	var accessToken = AccessToken{}
	var filePath = mail.tokenPath + alias
	result, err := os.ReadFile(filePath)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return accessToken, err
		}
	} else {
		err = json.Unmarshal(result, &accessToken)
		if err != nil {
			return accessToken, err
		}
		if accessToken.CreatedAt != 0 && accessToken.CreatedAt+accessToken.ExpiresIn > int(time.Now().Unix()) {
			return accessToken, nil
		}
	}

	data := url.Values{
		"corpid":     {mail.corpId},
		"corpsecret": {mail.corpSecret},
	}

	res, err := mail.get(HostApi+"/gettoken", data)
	if err != nil {
		return accessToken, err
	}
	err = json.Unmarshal(res, &accessToken)
	if err != nil {
		return accessToken, err
	}
	if accessToken.AccessToken == "" {
		return accessToken, errors.New("token empty")
	}
	accessToken.CreatedAt = int(time.Now().Unix())
	str, err := json.Marshal(accessToken)
	if err != nil {
		return accessToken, err
	}
	err = os.WriteFile(filePath, str, 0777)
	if err != nil {
		return accessToken, err
	}
	return accessToken, nil
}

func (mail *qqExmail) GetAutoLoginUrl(alias string) (loginUrl string, err error) {
	accessToken, err := mail.GetAccessToken(alias)
	if err != nil {
		return loginUrl, err
	}
	data := url.Values{
		"access_token": {accessToken.AccessToken},
		"userid":       {alias + mail.emailSuffix},
	}

	result, err := mail.get(HostApi+"/service/get_login_url?", data)
	if err != nil {
		return loginUrl, err
	}

	var response getLoginUrlResponse
	err = json.Unmarshal(result, &response)
	if err != nil {
		return loginUrl, err
	}
	if response.LoginUrl == "" {
		return loginUrl, errors.New(response.ErrMsg)
	}
	return response.LoginUrl, nil
}

func (mail *qqExmail) GetDomain() string {
	return mail.emailSuffix
}

func (sdk *qqExmail) Post(url string, data *url.Values) []byte {
	resp, err := http.PostForm(url, *data)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	return body
}

func (mail *qqExmail) get(url string, data url.Values) ([]byte, error) {
	lastCharacter := url[len(url)-1:]
	if lastCharacter != "?" {
		url += "?"
	}
	resp, err := http.Get(url + data.Encode())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return body, nil
}
