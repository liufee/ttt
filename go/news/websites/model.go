package websites

type Item struct {
	Href  string   `json:"href"`
	Text  string   `json:"text"`
	Date  string   `json:"date"`
	Media []string `json:"media"`
}
