package websites

import (
	"bytes"
	"github.com/antchfx/htmlquery"
	"strings"
)

func ParseCommon(kind string, html string, xpath string) string {
	if kind == "list" {
		return ParseCommonListPage(html, xpath)
	}
	return ParseCommonDetailPage(html, xpath)
}

func ParseCommonListPage(html string, xpath string) string {
	return ""
}

func ParseCommonDetailPage(html string, xpath string) string {
	if len(strings.TrimSpace(html)) == 0 {
		return ""
	}
	doc, err := htmlquery.Parse(bytes.NewReader([]byte(html)))
	if err != nil {
		return err.Error()
	}
	paragraphs := htmlquery.Find(doc, xpath)
	var article = ""
	for _, p := range paragraphs {
		if p == nil {
			continue
		}
		article += p.Data + "\n"
	}
	return strings.TrimRight(article, "\n")
}
