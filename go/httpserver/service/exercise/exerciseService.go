package exercise

import (
	"database/sql"
	"encoding/json"
	"errors"
	"feehiapp/httpserver/repository/exercise"
	httpserverUtil "feehiapp/httpserver/util"
	"feehiapp/util"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"
)

type ExerciseService struct {
	repo *exercise.ExerciseRepository
}

func NewExerciseService(db *sql.DB) *ExerciseService {
	return &ExerciseService{repo: exercise.NewExerciseRepository(db)}
}

func (s *ExerciseService) GetExerciseList(types []ExerciseType, page int, perPage int, startTime string, endTime string, sortOrder string) ([]Exercise, int, error) {
	repoTypes := make([]exercise.ExerciseType, len(types))
	for idx, v := range types {
		repoTypes[idx] = exercise.ExerciseType(v)
	}
	repoExercises, total, err := s.repo.GetExerciseList(repoTypes, page, perPage, startTime, endTime, sortOrder)
	if err != nil {
		return nil, 0, err
	}

	var exercises []Exercise
	var exerciseIDs []string

	for _, re := range repoExercises {
		se := Exercise{
			ID:      re.ID,
			Type:    ExerciseType(re.Type),
			Ext:     re.Ext,
			StartAt: re.StartAt,
			EndAt:   re.EndAt,
			Status:  Status(re.Status),
			TSR:     re.TSR,
		}

		se.Parse()
		exercises = append(exercises, se)
		exerciseIDs = append(exerciseIDs, se.ID)
	}

	// 获取TSR验证信息
	mp, err := s.repo.GetTSRsMap(exerciseIDs, "exercise")
	if err != nil {
		return nil, 0, err
	}

	// 获取跑步路径
	runMaps, err := s.GetExerciseRunPaths(exerciseIDs)
	if err != nil {
		return nil, 0, err
	}

	// 验证TSR
	for idx, exercise := range exercises {
		ex, err := s.getTsrVerify(exercise, mp, runMaps)
		if err != nil {
			return nil, 0, err
		}
		exercises[idx] = ex
	}

	return exercises, total, nil
}

// GetDailyExercise 按日期分组获取运动数据
func (s *ExerciseService) GetDailyExercise(types []ExerciseType, startTime string, endTime string, sortOrder string) ([]DailyExercise, error) {
	exercises, _, err := s.GetExerciseList(types, 1, -1, startTime, endTime, sortOrder)
	if err != nil {
		return nil, err
	}
	// 按日期分组
	type RepoDailyExercise = DailyExercise

	dailyExercises := make([]RepoDailyExercise, 0)
	exerciseMap := make(map[string][]Exercise)

	// 用于跟踪每天完成的运动类型
	dateTypeMap := make(map[string]map[ExerciseType]bool)

	for _, exercise := range exercises {
		date := exercise.StartAt.Format("2006-01-02")
		exerciseMap[date] = append(exerciseMap[date], exercise)

		// 记录该日期已完成的运动类型
		if _, exists := dateTypeMap[date]; !exists {
			dateTypeMap[date] = make(map[ExerciseType]bool)
		}
		dateTypeMap[date][exercise.Type] = true
	}

	// 按日期排序
	dates := make([]string, 0, len(exerciseMap))
	for date := range exerciseMap {
		dates = append(dates, date)
	}

	// 添加排序逻辑，确保日期按降序排列
	sort.Slice(dates, func(i, j int) bool {
		return dates[i] > dates[j]
	})

	// 构建按日期分组的列表
	for _, date := range dates {
		// 计算完成的运动类型数量
		completedTypes := len(dateTypeMap[date])
		allCompleted := completedTypes >= 3 // 如果完成了3种运动类型则为true

		dailyExercises = append(dailyExercises, RepoDailyExercise{
			Date:           date,
			Exercises:      exerciseMap[date],
			CompletedTypes: completedTypes,
			AllCompleted:   allCompleted,
		})
	}

	return dailyExercises, nil
}

func (s *ExerciseService) GetExerciseByID(id int64) (*Exercise, error) {
	repoExercise, err := s.repo.GetExerciseByID(id)
	if err != nil {
		return nil, err
	}

	serviceExercise := &Exercise{
		ID:      repoExercise.ID,
		Type:    ExerciseType(repoExercise.Type),
		Ext:     repoExercise.Ext,
		StartAt: repoExercise.StartAt,
		EndAt:   repoExercise.EndAt,
		Status:  Status(repoExercise.Status),
		TSR:     repoExercise.TSR,
	}

	serviceExercise.Parse()

	idStr := strconv.FormatInt(id, 10)
	mp, err := s.repo.GetTSRsMap([]string{idStr}, "exercise")
	if err != nil {
		return nil, err
	}

	pathMaps, err := s.GetExerciseRunPaths([]string{idStr})
	if err != nil {
		return nil, err
	}

	if paths, ok := pathMaps[idStr]; ok && serviceExercise.Run != nil {
		serviceExercise.Run.Paths = paths
	}

	ex, err := s.getTsrVerify(*serviceExercise, mp, pathMaps)
	if err != nil {
		return nil, err
	}

	*serviceExercise = ex

	return serviceExercise, nil
}

func (s *ExerciseService) SaveRunPaths(exerciseObj Exercise) error {
	pathStr := ""
	for _, path := range exerciseObj.Run.Paths {
		pathStr += fmt.Sprintf("%f,%f,%s;", path.Latitude, path.Longitude, time.UnixMilli(path.Time).In(httpserverUtil.TimeZone()).Format("2006-01-02 15:04:05"))
	}
	if strings.HasSuffix(pathStr, ";") {
		pathStr = pathStr[:len(pathStr)-1]
	}
	return s.repo.SaveRunPaths(
		exerciseObj.StartAt.Format(time.DateTime),
		exerciseObj.EndAt.Format(time.DateTime),
		exerciseObj.Run.AvgPace,
		exerciseObj.Run.Distance,
		exerciseObj.Run.RunDuration,
		pathStr,
	)
}

func (s *ExerciseService) CreateExercise(exerciseObj Exercise) (int64, error) {
	err := exerciseObj.Assemble()
	if err != nil {
		return 0, err
	}

	tsrInfo, err := s.generateTSR(&exerciseObj)
	if err != nil {
		return 0, err
	}

	repoExercise := exercise.Exercise{
		Type:    exercise.ExerciseType(exerciseObj.Type),
		Ext:     exerciseObj.Ext,
		StartAt: exerciseObj.StartAt,
		EndAt:   exerciseObj.EndAt,
		Status:  exercise.Status(exerciseObj.Status),
		TSR:     exerciseObj.TSR,
		Paths: func() string {
			if exerciseObj.Run == nil {
				return ""
			}
			return exerciseObj.Run.PathsStr
		}(),
		TSRInfo: tsrInfo,
	}

	insertID, err := s.repo.CreateExercise(repoExercise)
	if err != nil {
		return 0, err
	}

	return insertID, nil
}

func (s *ExerciseService) generateTSR(exerciseObj *Exercise) (string, error) {
	tsrInfo := ""
	if exerciseObj.TSR == 1 {
		paths := make([]Path, 0)
		if exerciseObj.Type == ExerciseTypeRun && exerciseObj.Run != nil {
			paths = exerciseObj.Run.Paths
		}
		str := s.AssembleCreateTSRStr(exerciseObj, paths)
		tsrInfo = util.GenerateTSRWithMediaV2(str, "")
		if strings.HasPrefix(tsrInfo, "error:") {
			return "", fmt.Errorf("generate tsr failed: %s", tsrInfo)
		}
	}
	return tsrInfo, nil
}

func (s *ExerciseService) UpdateExercise(exerciseObj Exercise) error {
	err := exerciseObj.Assemble()
	if err != nil {
		return err
	}

	tsrInfo, err := s.generateTSR(&exerciseObj)
	if err != nil {
		return err
	}

	repoExercise := exercise.Exercise{
		ID:      exerciseObj.ID,
		Type:    exercise.ExerciseType(exerciseObj.Type),
		Ext:     exerciseObj.Ext,
		StartAt: exerciseObj.StartAt,
		EndAt:   exerciseObj.EndAt,
		Status:  exercise.Status(exerciseObj.Status),
		TSR:     exerciseObj.TSR,
		Paths: func() string {
			if exerciseObj.Run == nil {
				return ""
			}
			return exerciseObj.Run.PathsStr
		}(),
		TSRInfo: tsrInfo,
	}

	return s.repo.UpdateExercise(repoExercise)
}

func (s *ExerciseService) DeleteExercise(id int64) error {
	return s.repo.DeleteExercise(id)
}

func (s *ExerciseService) getTsrVerify(exercise Exercise, tsrsMap map[string]exercise.TSR, pathMaps map[string][]Path) (Exercise, error) {
	if exercise.TSR != 1 {
		return exercise, nil
	}

	tsr := tsrsMap[exercise.ID]
	str := util.ParseTSR(tsr.TSR)

	type Cer struct {
		Name    string
		Content string
	}

	type Result struct {
		Time          string
		HashedMessage string
		HashAlgorithm string
		Certificates  []Cer
	}

	var result Result
	err := json.Unmarshal([]byte(str), &result)
	if err != nil {
		return exercise, err
	}

	tsrData := s.AssembleCreateTSRStr(&exercise, pathMaps[exercise.ID])

	calculatedHash := util.CalculateHash(tsrData, "")
	if strings.HasPrefix(calculatedHash, "error:") {
		return exercise, errors.New(calculatedHash)
	}

	exercise.TSRVerified = calculatedHash == result.HashedMessage
	return exercise, nil
}

func (s *ExerciseService) GetTSRById(id int64) (TSR, error) {
	idStr := fmt.Sprintf("%d", id)
	mp, err := s.repo.GetTSRsMap([]string{idStr}, "exercise")
	if err != nil {
		return TSR{}, err
	}
	if tsr, ok := mp[fmt.Sprintf("%d", id)]; ok {
		return TSR{
			Type:    tsr.Type,
			ThirdID: tsr.ThirdID,
			TSR:     tsr.TSR,
		}, nil
	}
	return TSR{}, errors.New("No TSR")
}
func (s *ExerciseService) GetExerciseRunPaths(ids []string) (map[string][]Path, error) {
	runMaps, err := s.repo.GetExerciseRunPaths(ids)
	if err != nil {
		return nil, err
	}
	pathsMap := make(map[string][]Path)
	for key, value := range runMaps {
		pathsMap[key] = make([]Path, 0)
		lines := strings.Split(value, ";")
		for _, line := range lines {
			if line == "" {
				continue
			}

			one := strings.Split(line, ",")
			if len(one) < 3 {
				continue
			}

			lat, err1 := strconv.ParseFloat(one[0], 64)
			lng, err2 := strconv.ParseFloat(one[1], 64)
			t, err3 := time.ParseInLocation(
				"2006-01-02 15:04:05",
				one[2],
				httpserverUtil.TimeZone(),
			)

			if err1 != nil || err2 != nil || err3 != nil {
				continue
			}

			pathsMap[key] = append(pathsMap[key], Path{
				Latitude:  lat,
				Longitude: lng,
				Time:      t.UnixMilli(),
			})
		}
	}
	return pathsMap, nil
}
func (s *ExerciseService) AssembleCreateTSRStr(exercise *Exercise, paths []Path) string {
	return fmt.Sprintf("%v+%s+%s+%s+%s", exercise.Type, exercise.StartAt.Format(time.DateTime), exercise.EndAt.Format(time.DateTime), *exercise.Ext, getPathStr(paths))
}

func (s *ExerciseService) GetAiPrompts(rangeType string, start string, end string, types []ExerciseType) (string, error) {
	temp := time.Now()
	now := time.Date(
		temp.Year(),
		temp.Month(),
		temp.Day(),
		0, 0, 0, 0,
		temp.Location(),
	)
	var startTime, endTime time.Time
	switch rangeType {
	case "latest7Days":
		startTime = now.AddDate(0, 0, -7)
		endTime = now
	case "latest30Days":
		startTime = now.AddDate(0, 0, -30)
		endTime = now
	case "latest3Months":
		startTime = now.AddDate(0, -3, 0)
		endTime = now
	case "latestHalfYear":
		startTime = now.AddDate(0, -6, 0)
		endTime = now
	case "latestYear":
		startTime = now.AddDate(0, -12, 0)
		endTime = now
	case "custom":
		s, err := time.Parse("2006-01-02", start)
		if err != nil {
			return "", err
		}
		e, err := time.Parse("2006-01-02", end)
		if err != nil {
			return "", err
		}
		startTime = s
		endTime = e
	default:
		return "", errors.New("invalid range:" + rangeType)
	}

	list, err := s.GetDailyExercise(
		types,
		startTime.Format(time.DateTime),
		endTime.Format(time.DateTime),
		"asc",
	)

	if err != nil {
		return "", err
	}

	var sb strings.Builder

	// 标题
	sb.WriteString("# 运动数据报告\n\n")
	sb.WriteString(fmt.Sprintf("统计区间：%s ~ %s\n\n",
		startTime.Format("2006-01-02"),
		endTime.Format("2006-01-02"),
	))
	sb.WriteString("说明:无GPS表示跑的路线是一样的 8.5km，所以没有记录具体轨迹;TSR表示是否用 timestamp server 来防记录揣改\n\n")

	// 单一总表
	sb.WriteString("| 日期 | 类型 | 开始 | 结束 | 时长 | 距离km | 速度km/h | 俯卧撑 | 仰卧起坐 | 卷腹 | 倒立 | 无GPS | TSR |\n")
	sb.WriteString("|------|------|------|------|------|--------|----------|--------|----------|------|------|-------|-----|\n")

	var getTypeName = func(t ExerciseType) string {
		switch t {
		case exercise.ExerciseTypeRun:
			return "跑步"
		case exercise.ExerciseTypeAbdominal:
			return "腹肌"
		case exercise.ExerciseTypeSitUpPushUp:
			return "力量"
		default:
			return "未知"
		}
	}

	var formatDuration = func(start, end time.Time) string {
		d := end.Sub(start)
		h := int(d.Hours())
		m := int(d.Minutes()) % 60
		return fmt.Sprintf("%02d:%02d", h, m)
	}

	for _, day := range list {

		shortDate := day.Date[5:] // 去掉年份

		for _, ex := range day.Exercises {

			typeName := getTypeName(ex.Type)

			startStr := ex.StartAt.Format("15:04")
			endStr := ex.EndAt.Format("15:04")
			duration := formatDuration(ex.StartAt, ex.EndAt)

			distance := "-"
			speed := "-"
			push := "-"
			sit := "-"
			curl := "-"
			legs := "-"
			gps := "-"
			tsr := "✘"

			if ex.TSRVerified {
				tsr = "✔"
			}

			if ex.Run != nil {
				distance = fmt.Sprintf("%.2f", ex.Run.Distance)
				speed = fmt.Sprintf("%.2f", ex.Run.AvgPace)
				if ex.Run.RunningWithoutPosition == 1 {
					gps = "是"
				} else {
					gps = "否"
				}
			}

			if ex.SitUpPushUp != nil {
				push = fmt.Sprintf("%d", ex.SitUpPushUp.PushUp)
				sit = fmt.Sprintf("%d", ex.SitUpPushUp.SitUp)
				curl = fmt.Sprintf("%d", ex.SitUpPushUp.CurlUp)
				legs = fmt.Sprintf("%d", ex.SitUpPushUp.LegsUpTheWallPose)
			}

			sb.WriteString(fmt.Sprintf(
				"| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |\n",
				shortDate,
				typeName,
				startStr,
				endStr,
				duration,
				distance,
				speed,
				push,
				sit,
				curl,
				legs,
				gps,
				tsr,
			))
		}
	}
	return sb.String(), nil
}

func (s *ExerciseService) BackupDB(dbPath string, key string, backupPath string, webdavURL string, webDavUser string, webDavPassword string) error {
	err := httpserverUtil.BackupSQLiteDB(dbPath, key, backupPath, webdavURL, webDavUser, webDavPassword, s.repo.GetDB())
	if err != nil {
		return err
	}
	return nil
}

func (s *ExerciseService) GetDB() *sql.DB {
	return s.repo.GetDB()
}

func (s *ExerciseService) Destroy() error {
	return s.repo.GetDB().Close()
}
