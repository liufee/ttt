package qqexmail

import "feehiapp/qqexmail/sdk"

func GetExmailLoginURL(corpId string, corpSecret string, emailSuffix string, tokenPath string, alias string) string {
	mail := sdk.NewQQExmail(corpId, corpSecret, emailSuffix, tokenPath)
	url, err := mail.GetAutoLoginUrl(alias)
	if err != nil {
		return "error:" + err.Error()
	}
	return url
}
