package websites

import (
	"bytes"
	"encoding/json"
	"feehiapp/httpserver/util"
	"github.com/antchfx/htmlquery"
	"strings"
	"time"
)

func ParseRfi(pageType string, html string, xpath string) string {
	if pageType == "list" {
		return parseRfiListPage(html, xpath)
	}
	return ParseRfiDetailPage(html, xpath)
}

func parseRfiListPage(html string, xpath string) string {
	if len(strings.TrimSpace(html)) == 0 {
		return "[]"
	}
	doc, err := htmlquery.Parse(bytes.NewReader([]byte(html)))
	if err != nil {
		return err.Error()
	}
	list := htmlquery.Find(doc, xpath)
	var items = make([]Item, 0)
	for _, node := range list {
		href := ""
		hrefNode := htmlquery.FindOne(node, "./a")
		if hrefNode != nil {
			href = strings.TrimSpace(htmlquery.SelectAttr(hrefNode, "href"))
		}

		title := ""
		titleNode := htmlquery.FindOne(node, ".//div[@class='article__title ']//h2/text()")
		if titleNode != nil {
			title = strings.TrimSpace(titleNode.Data)
		}

		date := ""
		dateNode := htmlquery.FindOne(node, ".//time")
		if dateNode != nil {
			dateStr := strings.TrimSpace(htmlquery.SelectAttr(dateNode, "datetime"))
			if dateStr != "" {
				t, err := time.Parse(time.RFC3339, dateStr)
				if err == nil {
					date = t.In(util.TimeZone()).Format(time.DateTime)
				}
			}
		}

		items = append(items, Item{
			Href: href,
			Text: title,
			Date: date,
		})
	}
	res, err := json.Marshal(items)
	if err != nil {
		return err.Error()
	}
	return string(res)
}

func ParseRfiDetailPage(html string, xpath string) string {
	return ""
}
