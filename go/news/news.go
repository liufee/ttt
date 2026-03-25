package news

import "feehiapp/news/websites"

func ParseNews(kind string, pageType string, html string, listXpath string) string {
	var result string
	switch kind {
	case "common":
		result = websites.ParseCommon(pageType, html, listXpath)
	case "zaobao":
		result = websites.ParseZaobao(pageType, html, listXpath)
	case "nytimes":
		result = websites.ParseNytimes(pageType, html, listXpath)
	case "buzzing":
		result = websites.ParseBuzzing(pageType, html, listXpath)
	case "rfi":
		result = websites.ParseRfi(pageType, html, listXpath)
	}
	return result
}
