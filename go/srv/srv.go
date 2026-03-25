package srv

import "database/sql"

var errorPrefix = "error:"

// TSR结构体
type TSR struct {
	Type    string `json:"type"`
	ThirdID string `json:"thirdID"`
	TSR     string `json:"tsr"`
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func intToBool(i int) bool {
	if i == 1 {
		return true
	}
	return false
}

func createDBTables(db *sql.DB, stmts []string) string {
	tx, err := db.Begin()
	if err != nil {
		return errorPrefix + err.Error()
	}
	defer tx.Rollback()
	for _, s := range stmts {
		if _, err := tx.Exec(s); err != nil {
			return errorPrefix + err.Error()
		}
	}

	if err := tx.Commit(); err != nil {
		return errorPrefix + err.Error()
	}
	return ""
}
