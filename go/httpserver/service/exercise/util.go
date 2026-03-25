package exercise

import (
	"feehiapp/httpserver/util"
	"fmt"
	"strings"
	"time"
)

func getPathStr(paths []Path) string {
	pathsStr := ""
	for _, path := range paths {
		pathsStr += fmt.Sprintf("%v,%v,%s;", path.Latitude, path.Longitude, time.UnixMilli(path.Time).In(util.TimeZone()).Format("2006-01-02 15:04:05"))
	}
	if strings.HasSuffix(pathsStr, ";") {
		pathsStr = pathsStr[:len(pathsStr)-1]
	}
	return pathsStr
}
