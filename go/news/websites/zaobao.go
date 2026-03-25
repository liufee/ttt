package websites

import (
	"bytes"
	"encoding/json"
	"feehiapp/httpserver/util"
	"github.com/antchfx/htmlquery"
	"strconv"
	"strings"
	"time"
)

func ParseZaobao(pageType string, html string, xpath string) string {
	if pageType == "list" {
		return parseZaobaoListPage(html, xpath)
	}
	return ParseZaobaoDetailPage(html, xpath)
}

func parseZaobaoListPage(html string, xpath string) string {
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
		text := strings.TrimSpace(htmlquery.SelectAttr(node, "title"))
		if node != nil && text == "" {
			text = node.Data
		}
		href := htmlquery.SelectAttr(node, "href")

		dateNode := htmlquery.FindOne(node, ".//following-sibling::div//span/text()")
		if dateNode == nil {
			dateNode = htmlquery.FindOne(node, "./../following-sibling::div//span/text()")
			if dateNode != nil {
				htmlquery.FindOne(node, "./../../following-sibling::div//span/text()")

			}
		}

		date := "获取时间失败"
		if dateNode != nil {
			date = dateNode.Data
			date = strings.Trim(date, "\n")
			date = strings.TrimSpace(date)
			if date == time.Now().Format("01-02") { //显示的是日期
				date = time.Now().AddDate(0, 0, -1).In(util.TimeZone()).Format("2006-01-02") + " 00:00:00"
			} else if strings.Contains(date, "分钟前") {
				date = strings.ReplaceAll(date, "分钟前", "")
				t, err := strconv.Atoi(date)
				if err != nil {
					date = err.Error()
				} else {
					date = time.Now().Add(-time.Minute * time.Duration(t)).In(util.TimeZone()).Format(time.DateTime)
				}

			} else if t, err := time.Parse("2006 1月2日", time.Now().In(util.TimeZone()).Format("2006 ")+date); err == nil {
				date = t.Format(time.DateTime)
			} else if strings.Contains(date, "刚刚") {
				date = time.Now().Format(time.DateTime)
			} else {
				date = time.Now().In(util.TimeZone()).Format("2006-01-02") + " " + date + ":00"
			}
		}
		items = append(items, Item{
			Href: strings.Trim(href, "\n"),
			Text: strings.Trim(text, "\n"),
			Date: date,
		})
	}
	res, err := json.Marshal(items)
	if err != nil {
		return err.Error()
	}
	return string(res)
}

func ParseZaobaoDetailPage(html string, xpath string) string {
	return ""
}
