package websites

import (
	"bytes"
	"encoding/json"
	"github.com/antchfx/htmlquery"
	"strings"
	"time"
)

func ParseBuzzing(pageType string, html string, xpath string) string {
	if pageType == "list" {
		return parseBuzzingListPage(html, xpath)
	}
	return ""
}

func parseBuzzingListPage(html string, xpath string) string {
	if len(strings.TrimSpace(html)) == 0 {
		return "[]"
	}
	doc, err := htmlquery.Parse(bytes.NewReader([]byte(html)))
	if err != nil {
		return err.Error()
	}
	list := htmlquery.Find(doc, xpath)
	var items = make([]Item, 0)
	i := 0
	for _, node := range list {
		if i == 15 {
			break
		}
		i++
		textNode := htmlquery.FindOne(node, "./div/a/text()")
		text := ""
		if textNode != nil {
			text = textNode.Data
		}
		engTextNode := htmlquery.FindOne(node, "./div/div[last()]/text()")
		engText := ""
		if textNode != nil {
			engText = engTextNode.Data
			engText = strings.TrimRight(engText, "(")
			engText = strings.TrimSpace(engText)
			text += "\n" + engText
		}
		hrefNode := htmlquery.FindOne(node, "./div//a")
		href := ""
		if hrefNode != nil {
			href = htmlquery.SelectAttr(hrefNode, "href")
		}
		dateNode := htmlquery.FindOne(node, "./div/footer//time")
		date := "获取时间失败"
		if dateNode != nil {
			date = htmlquery.SelectAttr(dateNode, "datetime")
			utcTime, err := time.Parse(time.RFC3339, date)
			if err != nil {
				date = err.Error()
			} else {
				loc, _ := time.LoadLocation("Asia/Shanghai")
				date = utcTime.In(loc).Format("2006-01-02 15:04:05")
			}
		}
		imgNode := htmlquery.FindOne(node, "./div/div//img")
		var media []string = nil
		if imgNode != nil {
			img := htmlquery.SelectAttr(imgNode, "src")
			media = []string{img}
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
