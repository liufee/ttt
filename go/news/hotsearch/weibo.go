package hotsearch

import (
	"bytes"
	"encoding/json"
	"github.com/antchfx/htmlquery"
	"strings"
)

func ParseWeibo(pageType string, html string, xpath string) string {
	if pageType == "list" {
		return parseWeiboListPage(html, xpath)
	}
	return ""
}

func parseWeiboListPage(html string, xpath string) string {
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
		linkNode := htmlquery.FindOne(node, ".//td[@class='td-02']/a")
		if linkNode != nil {
			item.Link = htmlquery.SelectAttr(linkNode, "href")
			if linkNode.FirstChild != nil {
				item.Title = strings.TrimSpace(linkNode.FirstChild.Data)
			}
		}
		hotIndexNode := htmlquery.FindOne(node, ".//td[@class='td-02']/span/text()")
		if hotIndexNode != nil {
			item.HotIndex = strings.TrimSpace(hotIndexNode.Data)
		}

		tagNode := htmlquery.FindOne(node, ".//td[@class='td-03']/i/text()")
		if tagNode != nil {
			item.Tag = tagNode.Data
		}
		rankNode := htmlquery.FindOne(node, ".//td[contains(@class, 'td-01')]/text()")
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
