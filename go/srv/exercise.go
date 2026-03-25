package srv

import (
	"database/sql"
	"encoding/json"
	"feehiapp/httpserver/service/exercise"
	"strconv"
)

var exerciseService *exercise.ExerciseService

func InitExercise(dbPath string) string {
	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	if err != nil {
		return "error:" + dbPath + err.Error()
	}
	_, err = db.Exec(`PRAGMA temp_store = MEMORY;`)
	if err != nil {
		return "error:" + err.Error()
	}
	exerciseService = exercise.NewExerciseService(db)
	return ""
}

func CallExerciseSrv(method string, args string) string {
	if exerciseService == nil && method != "InitExercise" {
		return errorPrefix + "exercise service not init"
	}
	switch method {
	case "InitExercise":
		return InitExercise(args)
	case "CreateExerciseTables":
		var params struct {
			DBPath string
			Stmts  []string
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return CreateExerciseTables(params.DBPath, params.Stmts)
	case "StopExercise":
		if exerciseService != nil {
			exerciseService = nil
		}
		return ""
	case "SaveRunPaths":
		var params Exercise
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceExercise, err := convertToServiceExercise(params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		err = exerciseService.SaveRunPaths(serviceExercise)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""

	case "SaveRecord":
		var params Exercise
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceExercise, err := convertToServiceExercise(params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		_, err = exerciseService.CreateExercise(serviceExercise)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	case "UpdateRecord":
		var params Exercise
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceExercise, err := convertToServiceExercise(params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		err = exerciseService.UpdateExercise(serviceExercise)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	case "GetExerciseByID":
		id, err := strconv.ParseInt(args, 10, 64)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceExercise, err := exerciseService.GetExerciseByID(id)
		if err != nil {
			return errorPrefix + err.Error()
		}
		exercise, err := convertToExercise(*serviceExercise)
		if err != nil {
			return errorPrefix + err.Error()
		}
		if err != nil {
			return errorPrefix + err.Error()
		}
		result, err := json.Marshal(exercise)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(result)
	case "DeleteExercise":
		id, err := strconv.ParseInt(args, 10, 64)
		if err != nil {
			return errorPrefix + err.Error()
		}
		err = exerciseService.DeleteExercise(id)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	case "GetExercises":
		var params []ExerciseType
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceExercises, _, err := exerciseService.GetExerciseList(convertToServiceTypes(params), 1, -1, "", "", "desc") // 获取所有记录
		if err != nil {
			return errorPrefix + err.Error()
		}
		exercises, err := convertToExercises(serviceExercises)
		if err != nil {
			return errorPrefix + err.Error()
		}
		str, err := json.Marshal(exercises)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(str)
	case "GetExercisesByPage":
		var params struct {
			Types     []ExerciseType `json:"types"`
			Page      int            `json:"page"`
			PerPage   int            `json:"perPage"`
			StartTime string         `json:"startTime"`
			EndTime   string         `json:"endTime"`
			SortOrder string         `json:"sortOrder"`
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceExercises, total, err := exerciseService.GetExerciseList(
			convertToServiceTypes(params.Types),
			params.Page,
			params.PerPage,
			params.StartTime,
			params.EndTime,
			params.SortOrder,
		)
		if err != nil {
			return errorPrefix + err.Error()
		}
		exercises, err := convertToExercises(serviceExercises)
		if err != nil {
			return errorPrefix + err.Error()
		}
		result := map[string]interface{}{
			"exercises": exercises,
			"total":     total,
		}
		str, err := json.Marshal(result)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(str)
	case "GetDailyExercises":
		var params struct {
			Types     []ExerciseType `json:"types"`
			StartTime string         `json:"startTime"`
			EndTime   string         `json:"endTime"`
			SortOrder string         `json:"sortOrder"`
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		serviceDailyExercises, err := exerciseService.GetDailyExercise(convertToServiceTypes(params.Types), params.StartTime, params.EndTime, params.SortOrder)
		if err != nil {
			return errorPrefix + err.Error()
		}
		dailyExercises := make([]DailyExercise, len(serviceDailyExercises))
		for idx, serviceDailyExercise := range serviceDailyExercises {
			exercises, err := convertToExercises(serviceDailyExercise.Exercises)
			if err != nil {
				return errorPrefix + err.Error()
			}
			dailyExercises[idx] = DailyExercise{
				Date:           serviceDailyExercise.Date,
				Exercises:      exercises,
				CompletedTypes: serviceDailyExercise.CompletedTypes,
				AllCompleted:   serviceDailyExercise.AllCompleted,
			}
		}
		str, err := json.Marshal(dailyExercises)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(str)
	case "AssembleCreateTSRStr":
		id, err := strconv.ParseInt(args, 10, 64)
		if err != nil {
			return errorPrefix + err.Error()
		}
		exerciseObj, err := exerciseService.GetExerciseByID(id)
		if err != nil {
			return errorPrefix + err.Error()
		}
		pathsMap, err := exerciseService.GetExerciseRunPaths([]string{args})
		if err != nil {
			return errorPrefix + err.Error()
		}

		str := exerciseService.AssembleCreateTSRStr(exerciseObj, pathsMap[args])
		if err != nil {
			return errorPrefix + err.Error()
		}
		return str
	case "GetTSR":
		id, err := strconv.ParseInt(args, 10, 64)
		if err != nil {
			return errorPrefix + err.Error()
		}
		tsr, err := exerciseService.GetTSRById(id)
		if err != nil {
			return errorPrefix + err.Error()
		}
		str, err := json.Marshal(TSR{
			Type:    tsr.Type,
			ThirdID: tsr.ThirdID,
			TSR:     tsr.TSR,
		})
		if err != nil {
			return errorPrefix + err.Error()
		}
		return string(str)
	case "GetAiPrompts":
		var params struct {
			RangeType string         `json:"rangeType"`
			Start     string         `json:"start"`
			End       string         `json:"end"`
			Types     []ExerciseType `json:"types"`
		}
		err := json.Unmarshal([]byte(args), &params)
		if err != nil {
			return errorPrefix + err.Error()
		}
		result, err := exerciseService.GetAiPrompts(params.RangeType, params.Start, params.End, convertToServiceTypes(params.Types))
		if err != nil {
			return errorPrefix + err.Error()
		}
		return result
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
		err = exerciseService.BackupDB(params.DBPath, params.Key, params.BackupPath, params.WEBDAV.URL, params.WEBDAV.Username, params.WEBDAV.Password)
		if err != nil {
			return errorPrefix + err.Error()
		}
		return ""
	}

	return errorPrefix + method + " method not found"
}

func CreateExerciseTables(dbPath string, stmts []string) string {
	if exerciseService != nil {
		err := exerciseService.Destroy()
		if err != nil {
			return errorPrefix + err.Error()
		}
		exerciseService = nil
	}

	errStr := InitExercise(dbPath)
	if errStr != "" {
		return errStr
	}

	return createDBTables(exerciseService.GetDB(), stmts)
}
