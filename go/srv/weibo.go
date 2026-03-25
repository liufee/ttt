package srv

import (
	"database/sql"
	"encoding/json"
	"feehiapp/httpserver/service/weibo"
)

var weiboService *weibo.WeiboService

func InitWeibo(dbPath string, basePath string, largeBasePath string) string {
	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	if err != nil {
		return "error:" + dbPath + err.Error()
	}
	_, err = db.Exec(`PRAGMA temp_store = MEMORY;`)
	if err != nil {
		return "error:" + err.Error()
	}
	weiboService = weibo.NewWeiboService(db, basePath, largeBasePath)
	return ""
}

func CallWeiboSrv(method string, args string) string {
	if weiboService == nil && method != "InitWeibo" {
		return errorPrefix + "weibo service not init"
	}
	switch method {
	case "InitWeibo":
		var params struct {
			DBPath        string
			BasePath      string
			LargeBasePath string
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return InitWeibo(params.DBPath, params.BasePath, params.LargeBasePath)
	case "CreateWeiboTables":
		var params struct {
			DBPath        string
			BasePath      string
			LargeBasePath string
			Stmts         []string
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return CreateWeiboTables(params.DBPath, params.BasePath, params.LargeBasePath, params.Stmts)
	case "StopWeibo":
		if weiboService != nil {
			weiboService = nil
		}
		return ""
	case "CreateWeibo":
		var params Weibo
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceWb, err := convertToServiceWeibo(&params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		err = weiboService.CreateWeibo(*serviceWb, func(feedId string, uid string) ([]weibo.Media, error) {
			return weiboService.CopyMediaFromLocal(serviceWb.Media, feedId, "", uid)
		})
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	case "GetWeiboByPage":
		var params struct {
			Uids      []string
			Page      int
			PerPage   int
			Keyword   string
			StartTime string
			EndTime   string
			SortOrder string
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceWbs, total, err := weiboService.GetWeiboList(params.Uids, params.Page, params.PerPage, params.Keyword, params.StartTime, params.EndTime, params.SortOrder)
		if err != nil {
			return errorPrefix + err.Error()
		}
		wbs, err := convertToWeibos(serviceWbs)
		if err != nil {
			return errorPrefix + err.Error()
		}
		result, err := json.Marshal(struct {
			List  []Weibo
			Total int
		}{
			List:  wbs,
			Total: total,
		})
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(result)
	case "CreateComment":
		var params struct {
			Comment Comment
			FeedId  string
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceComment, err := convertToServiceComment(params.Comment)
		serviceComment.FeedID = params.FeedId
		if err != nil {
			return errorPrefix + err.Error()
		}
		err = weiboService.CreateComment(serviceComment, func(feedId string, commentId string, uid string) ([]weibo.Media, error) {
			return weiboService.CopyMediaFromLocal(serviceComment.Media, feedId, commentId, uid)
		})
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	case "GetWeiboById":
		serviceWb, err := weiboService.GetWeiboByID(args)
		if err != nil {
			return errorPrefix + err.Error()
		}
		wb := convertToWeibo(*serviceWb)
		weiboStr, err := json.Marshal(wb)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(weiboStr)
	case "DeleteWeiboById":
		err := weiboService.DeleteWeibo(args)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	case "GetCommentsByFeedId":
		serviceComments, err := weiboService.GetCommentsByFeedID(args)
		if err != nil {
			return errorPrefix + err.Error()
		}
		comments := convertToComments(serviceComments)
		commentsStr, err := json.Marshal(comments)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(commentsStr)
	case "GetLikesByFeedId":
		serviceLikes, err := weiboService.GetLikesByFeedID(args)
		if err != nil {
			return errorPrefix + err.Error()
		}
		likesStr, err := json.Marshal(convertToLikes(serviceLikes))
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(likesStr)
	case "GetBeenRepostedByFeedId":
		serviceBeenReposted, err := weiboService.GetBeenRepostedByFeedID(args)
		if err != nil {
			return errorPrefix + err.Error()
		}
		beenRepostedStr, err := json.Marshal(convertToBeenPosted(serviceBeenReposted))
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(beenRepostedStr)
	case "AssembleStrToCreateTSR":
		var params struct {
			Type string
			ID   string
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		var serviceWb *weibo.Weibo
		var serviceComment *weibo.Comment
		if params.Type == "feed" {
			serviceWb, err = weiboService.GetWeiboByID(params.ID)
		} else {
			serviceComment, err = weiboService.GetCommentByID(params.ID)
		}
		if err != nil {
			return errorPrefix + err.Error()
		}
		str, err := weiboService.AssembleCreateTSRStr(params.Type, serviceWb, serviceComment)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return str
	case "GetTSR":
		var params struct {
			Type string
			ID   string
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		tp := "feed"
		if params.Type != "feed" {
			tp = "comment"
		}
		tsrsMap, err := weiboService.GetTSRsMap([]string{params.ID}, tp)
		if _, ok := tsrsMap[params.ID]; ok {
			tsrStr, err := json.Marshal(TSR{
				Type:    tsrsMap[params.ID].Type,
				ThirdID: tsrsMap[params.ID].ThirdID,
				TSR:     tsrsMap[params.ID].TSR,
			})
			if err != nil {
				return errorPrefix + err.Error()
			}
			return string(tsrStr)
		}
		return errorPrefix + "tsr not found"
	case "BackupDB":
		var params struct {
			DBPath     string
			Key        string
			BackupPath string
			WEBDAV     struct {
				URL      string
				Username string
				Password string
			}
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		err = weiboService.BackupDB(params.DBPath, params.Key, params.BackupPath, params.WEBDAV.URL, params.WEBDAV.Username, params.WEBDAV.Password)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	}

	return errorPrefix + method + " method not found"
}

func CreateWeiboTables(dbPath string, basePath string, largeBasePath string, stmts []string) string {
	if weiboService != nil {
		err := weiboService.Destroy()
		if err != nil {
			return errorPrefix + err.Error()
		}
		weiboService = nil
	}

	errStr := InitWeibo(dbPath, basePath, largeBasePath)
	if errStr != "" {
		return errStr
	}

	return createDBTables(weiboService.GetDB(), stmts)
}
