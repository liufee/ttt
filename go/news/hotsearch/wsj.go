package hotsearch

import (
	"encoding/json"
	"encoding/xml"
	"strings"
)

func ParseWsj(pageType string, html string, xpath string) string {
	if pageType == "list" {
		return parseWsjListPage(html, xpath)
	}
	return ""
}

func parseWsjListPage(html string, xpath string) string {
	if len(strings.TrimSpace(html)) == 0 {
		return "[]"
	}
	var wsjResult WsjRss
	err := xml.Unmarshal([]byte(html), &wsjResult)
	if err != nil {
		return err.Error()
	}

	var items []Item
	for _, itm := range wsjResult.Channel.Items {
		var item Item
		item.Title = itm.Title
		item.Link = itm.Link
		item.Time = itm.PubDate
		items = append(items, item)
	}

	res, err := json.Marshal(items)
	if err != nil {
		return err.Error()
	}
	return string(res)
}

type WsjRss struct {
	Channel struct {
		Items []struct {
			Title   string `xml:"title"`
			Link    string `xml:"link"`
			PubDate string `xml:"pubDate"`
		} `xml:"item"`
	} `xml:"channel"`
}
