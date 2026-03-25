package hotsearch

type Item struct {
	Title    string `json:"title"`
	Link     string `json:"link"`
	Tag      string `json:"tag"`
	HotIndex string `json:"hotIndex"`
	Rank     string `json:"rank"`
	Time     string `json:"time"`
}
