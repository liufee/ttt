package srv

import (
	"database/sql"
	"encoding/json"
	"feehiapp/httpserver/service/children"
	"time"
)

var childrenService *children.ChildrenService

func InitChildrenService(dbPath string) string {
	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	if err != nil {
		return "error:" + dbPath + err.Error()
	}
	_, err = db.Exec(`PRAGMA temp_store = MEMORY;`)
	if err != nil {
		return "error:" + err.Error()
	}
	childrenService = children.NewChildrenService(db)
	return ""
}

func CallChildrenSrv(method string, args string) string {
	if childrenService == nil && method != "InitChildrenService" {
		return errorPrefix + "children service not init"
	}
	switch method {
	case "InitChildrenService":
		var params struct {
			DBPath string
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return InitChildrenService(params.DBPath)
	case "StopChildrenService":
		if childrenService != nil {
			childrenService = nil
		}
		return ""
	case "CreateChildrenTables":
		var params struct {
			DBPath string
			Stmts  []string
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return CreateChildrenTables(params.DBPath, params.Stmts)
	case "CreateChildrenEvent":
		err := childrenService.CreateEvent(args)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	case "GetEventsByFilter":
		var params struct {
			Children   []string
			EventTypes []children.EventType
			StartAt    *time.Time
			EndAt      *time.Time
			OrderBy    string
			OrderSort  string
			Limit      int
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		results, err := childrenService.GetEvents(params.Children, params.EventTypes, params.StartAt, params.EndAt, params.OrderBy, params.OrderSort, params.Limit)
		if err != nil {
			return errorPrefix + err.Error()
		}
		result, err := json.Marshal(results)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(result)
	case "DeleteEventById":
		err := childrenService.DeleteEventById(args)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
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
		err = childrenService.BackupDB(params.DBPath, params.Key, params.BackupPath, params.WEBDAV.URL, params.WEBDAV.Username, params.WEBDAV.Password)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	}

	return errorPrefix + method + " method not found"
}

func CreateChildrenTables(dbPath string, stmts []string) string {
	if childrenService != nil {
		err := childrenService.Destroy()
		if err != nil {
			return errorPrefix + err.Error()
		}
		childrenService = nil
	}

	errStr := InitChildrenService(dbPath)
	if errStr != "" {
		return errStr
	}

	return createDBTables(childrenService.GetDB(), stmts)
}
