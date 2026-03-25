package news

import (
	"feehiapp/news/hotsearch"
)

func ParseHotSearch(kind string, pageType string, html string, listXpath string) string {
	var result string
	switch kind {
	case "baidu":
		result = hotsearch.ParseBaidu(pageType, html, listXpath)
	case "weibo":
		result = hotsearch.ParseWeibo(pageType, html, listXpath)
	case "wsj":
		result = hotsearch.ParseWsj(pageType, html, listXpath)

	}
	return result
}
