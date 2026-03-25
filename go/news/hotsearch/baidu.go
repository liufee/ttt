package hotsearch

import (
	"bytes"
	"encoding/json"
	"github.com/antchfx/htmlquery"
	"strings"
)

func ParseBaidu(pageType string, html string, xpath string) string {
	if pageType == "list" {
		return parseBaiduListPage(html, xpath)
	}
	return ""
}

func parseBaiduListPage(html string, xpath string) string {
	if len(strings.TrimSpace(html)) == 0 {
		return "[]"
	}
	doc, err := htmlquery.Parse(bytes.NewReader([]byte(html)))
	if err != nil {
		return err.Error()
	}
	var items []Item
	nodes := htmlquery.Find(doc, xpath)
	for _, node := range nodes {
		var item Item
		titleNode := htmlquery.FindOne(node, ".//div[@class='c-single-text-ellipsis']/text()")
		if titleNode != nil {
			item.Title = titleNode.Data
		}
		linkNode := htmlquery.FindOne(node, ".//a")
		if linkNode != nil {
			item.Link = htmlquery.SelectAttr(linkNode, "href")
		}
		tagNode := htmlquery.FindOne(node, ".//div[contains(@class, 'hot-tag_')]/text()")
		if tagNode != nil {
			item.Tag = tagNode.Data
		}
		hotIndexNode := htmlquery.FindOne(node, ".//div[contains(@class, 'index_')]/text()")
		if hotIndexNode != nil {
			item.HotIndex = hotIndexNode.Data
		}
		rankNode := htmlquery.FindOne(node, ".//a/div[contains(@class, 'index_')]/text()")
		if rankNode != nil {
			item.Rank = rankNode.Data
		}
		items = append(items, item)
	}
	res, err := json.Marshal(items)
	if err != nil {
		return err.Error()
	}
	return string(res)
}
