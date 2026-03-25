package sdk

type AccessToken struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int    `json:"expires_in"`
	ErrorCode    int    `json:"errcode"`
	ErrorMessage string `json:"errmsg"`
	CreatedAt    int
}

type getLoginUrlResponse struct {
	ErrCode   int    `json:"errcode"`
	ErrMsg    string `json:"errmsg"`
	LoginUrl  string `json:"login_url"`
	ExpiresIn int    `json:"expires_in"`
}
