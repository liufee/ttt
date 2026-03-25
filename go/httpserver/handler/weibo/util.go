package weibo

import (
	"feehiapp/httpserver/service/weibo"
	"html/template"
	"net/http"
	"strconv"
	"strings"
)

func GetContent(content string) template.HTML {
	if !strings.Contains(content, "___SPLIT___") {
		return template.HTML(content)
	}
	strs := strings.Split(content, "___SPLIT___")
	return template.HTML(strs[1])
}

func GetLocation(r *http.Request) (*weibo.Location, error) {
	var location *weibo.Location
	address := r.FormValue("address")
	latitude := r.FormValue("latitude")
	longitude := r.FormValue("longitude")
	if address != "" && latitude != "" && longitude != "" {
		latitude64, err := strconv.ParseFloat(latitude, 64)
		if err != nil {
			return nil, err
		}
		longitude64, err := strconv.ParseFloat(longitude, 64)
		if err != nil {
			return nil, err
		}
		location = &weibo.Location{
			Address: strings.TrimSpace(address),
			Coordinates: weibo.Coordinates{
				Longitude: longitude64,
				Latitude:  latitude64,
			},
		}
	}
	return location, nil
}
