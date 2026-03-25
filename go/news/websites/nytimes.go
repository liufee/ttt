package websites

import (
	"bytes"
	"encoding/json"
	"feehiapp/httpserver/util"
	"github.com/antchfx/htmlquery"
	"regexp"
	"strings"
	"time"
)

func ParseNytimes(pageType string, html string, xpath string) string {
	if pageType == "list" {
		return parseNytimesListPage(html, xpath)
	}
	return ParseNytimesDetailPage(html, xpath)
}

func parseNytimesListPage(html string, xpath string) string {
	if len(strings.TrimSpace(html)) == 0 {
		return "[]"
	}
	doc, err := htmlquery.Parse(bytes.NewReader([]byte(html)))
	if err != nil {
		return err.Error()
	}
	list := htmlquery.Find(doc, xpath)
	var items = make([]Item, 0)
	dateRe := regexp.MustCompile(`\d{8}`)
	for _, node := range list {
		text := strings.TrimSpace(htmlquery.SelectAttr(node, "title"))
		if node != nil && text == "" {
			text = node.Data
		}
		href := htmlquery.SelectAttr(node, "href")

		media := make([]string, 0)
		mediaNode := htmlquery.FindOne(node, "../../div//img")
		if mediaNode != nil {
			src := strings.TrimSpace(htmlquery.SelectAttr(mediaNode, "data-url"))
			if src != "" {
				media = append(media, src)
			}
		}

		date := ""
		dateNode := htmlquery.FindOne(node, "../..//span[@class='time']/text()")
		if dateNode != nil {
			dateStr := strings.TrimSpace(dateNode.Data)
			if dateStr != "" {
				today := time.Now()
				t, err := time.ParseInLocation("15:04", dateStr, util.TimeZone())
				if err == nil {
					date = time.Date(today.Year(), today.Month(), today.Day(),
						t.Hour(), t.Minute(), t.Second(), t.Nanosecond(), util.TimeZone()).In(util.TimeZone()).Format(time.DateTime)
				}
			}
		}
		if date == "" {
			match := dateRe.FindString(href)
			date = "获取时间失败"
			if match != "" {
				t, err := time.Parse("20060102", match)
				if err == nil {
					date = t.In(util.TimeZone()).Format(time.DateTime)
				}
			}
		}

		items = append(items, Item{
			Href:  href,
			Text:  text,
			Date:  date,
			Media: media,
		})
	}
	res, err := json.Marshal(items)
	if err != nil {
		return err.Error()
	}
	return string(res)
}

func ParseNytimesDetailPage(html string, xpath string) string {
	return ""
}
