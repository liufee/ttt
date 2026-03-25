package exercise

import (
	"database/sql"
	"feehiapp/httpserver/util"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type ExerciseRepository struct {
	DB *sql.DB
}

func NewExerciseRepository(db *sql.DB) *ExerciseRepository {
	return &ExerciseRepository{DB: db}
}

func (r *ExerciseRepository) GetExerciseList(types []ExerciseType, page int, perPage int, startTime string, endTime string, sortOrder string) ([]Exercise, int, error) {
	var typesStr strings.Builder

	for i, v := range types {
		if i > 0 {
			typesStr.WriteString(",")
		}
		typesStr.WriteString(strconv.Itoa(int(v)))
	}

	// 构建时间范围条件
	timeCondition := ""
	if startTime != "" || endTime != "" {
		timeCondition = " AND " + r.getTimeCondition(startTime, endTime)
	}

	// 查询总数
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM exercise WHERE type IN (%s)%s", typesStr.String(), timeCondition)
	err := r.DB.QueryRow(countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// 确定排序方向
	orderClause := "start_at DESC"
	if sortOrder == "asc" {
		orderClause = "start_at ASC"
	}

	var rows *sql.Rows
	if perPage == -1 {
		// 不分页，直接查全部
		dataQuery := fmt.Sprintf(
			`SELECT id, type, start_at, end_at, status, ext, tsr
		 FROM exercise
		 WHERE type IN (%s)%s
		 ORDER BY %s`,
			typesStr.String(),
			timeCondition,
			orderClause,
		)
		rows, err = r.DB.Query(dataQuery)
	} else {
		offset := (page - 1) * perPage
		dataQuery := fmt.Sprintf(
			`SELECT id, type, start_at, end_at, status, ext, tsr
		 FROM exercise
		 WHERE type IN (%s)%s
		 ORDER BY %s
		 LIMIT ? OFFSET ?`,
			typesStr.String(),
			timeCondition,
			orderClause,
		)
		rows, err = r.DB.Query(dataQuery, perPage, offset)
	}

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var exercises []Exercise
	for rows.Next() {
		var e Exercise
		var startAt string
		var endAt string
		err := rows.Scan(&e.ID, &e.Type, &startAt, &endAt, &e.Status, &e.Ext, &e.TSR)
		if err != nil {
			return nil, 0, err
		}
		e.StartAt, _ = time.ParseInLocation("2006-01-02 15:04:05", startAt, util.TimeZone())
		e.EndAt, _ = time.ParseInLocation("2006-01-02 15:04:05", endAt, util.TimeZone())
		exercises = append(exercises, e)
	}

	return exercises, total, nil
}

// 添加时间条件构建方法
func (r *ExerciseRepository) getTimeCondition(startTime, endTime string) string {
	var conditions []string

	if startTime != "" {
		if t, err := time.Parse(time.DateTime, startTime); err == nil {
			conditions = append(conditions, fmt.Sprintf("start_at >= '%s'", t.Format("2006-01-02 15:04:05")))
		}
	}

	if endTime != "" {
		if t, err := time.Parse(time.DateTime, endTime); err == nil {
			conditions = append(conditions, fmt.Sprintf("start_at <= '%s'", t.Format("2006-01-02 15:04:05")))
		}
	}

	if len(conditions) > 0 {
		return strings.Join(conditions, " AND ")
	}

	return ""
}

func (r *ExerciseRepository) GetExerciseByID(id int64) (*Exercise, error) {
	var e Exercise
	var startAt string
	var endAt string
	err := r.DB.QueryRow("SELECT id, type, start_at, end_at, status, ext, tsr FROM exercise WHERE id = ?", id).
		Scan(&e.ID, &e.Type, &startAt, &endAt, &e.Status, &e.Ext, &e.TSR)
	if err != nil {
		return nil, err
	}
	e.StartAt, _ = time.Parse("2006-01-02 15:04:05", startAt)
	e.EndAt, _ = time.Parse("2006-01-02 15:04:05", endAt)
	return &e, nil
}

func (r *ExerciseRepository) SaveRunPaths(startAt string, endAt string, avgPace float64, distance float64, duration string, paths string) error {

	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	_, err = tx.Exec(
		`INSERT INTO run_records 
		(start_at, end_at, avg_pace, distance, duration, paths) 
		VALUES (?, ?, ?, ?, ?, ?)`, startAt, endAt, avgPace, distance, duration, paths,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *ExerciseRepository) CreateExercise(exercise Exercise) (int64, error) {
	// 开始事务处理多个表
	tx, err := r.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 插入数据库
	result, err := tx.Exec("INSERT INTO exercise (type, status, ext, start_at, end_at, tsr) VALUES (?, ?, ?, ?, ?, ?)",
		exercise.Type, exercise.Status, exercise.Ext, exercise.StartAt.Format(time.DateTime), exercise.EndAt.Format(time.DateTime), exercise.TSR)
	if err != nil {
		return 0, err
	}

	insertID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	if exercise.Type == ExerciseTypeRun && exercise.Paths != "" {
		_, err = tx.Exec("INSERT INTO exercise_run_paths (record_id, paths) VALUES (?, ?)", insertID, exercise.Paths)
		if err != nil {
			return 0, err
		}
	}
	if exercise.TSR == 1 {
		_, err = tx.Exec("INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)",
			"exercise", insertID, exercise.TSRInfo)
	}

	// 提交事务
	err = tx.Commit()
	if err != nil {
		return 0, err
	}

	return insertID, nil
}

func (r *ExerciseRepository) UpdateExercise(exercise Exercise) error {
	// 开始事务
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	_, err = tx.Exec(`UPDATE exercise 
		SET type = ?, status = ?, ext = ?, start_at = ?, end_at = ?, tsr = ? 
		WHERE id = ?`,
		exercise.Type, exercise.Status, exercise.Ext, exercise.StartAt.Format(time.DateTime), exercise.EndAt.Format(time.DateTime), exercise.TSR, exercise.ID)
	if err != nil {
		return err
	}

	// 更新跑步路径，如果是跑步类型
	if exercise.Type == ExerciseTypeRun { // 先删除旧路径再插入新路径（保持逻辑简单）
		_, err = tx.Exec("DELETE FROM exercise_run_paths WHERE record_id = ?", exercise.ID)
		if err != nil {
			return err
		}

		if exercise.Paths != "" {
			_, err = tx.Exec("INSERT INTO exercise_run_paths (record_id, paths) VALUES (?, ?)", exercise.ID, exercise.Paths)
			if err != nil {
				return err
			}
		}
	}

	// 更新 TSR，如果启用
	if exercise.TSR == 1 { // 尝试更新，如果不存在再插入
		res, err := tx.Exec("UPDATE tsr SET tsr = ? WHERE type = ? AND third_id = ?", exercise.TSRInfo, "exercise", exercise.ID)
		if err != nil {
			return err
		}
		rows, _ := res.RowsAffected()
		if rows == 0 { // 不存在则插入
			_, err = tx.Exec("INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)", "exercise", exercise.ID, exercise.TSRInfo)
			if err != nil {
				return err
			}
		}
	} else { // TSR 被关闭则删除
		_, err = tx.Exec("DELETE FROM tsr WHERE type = ? AND third_id = ?", "exercise", exercise.ID)
		if err != nil {
			return err
		}
	}

	err = tx.Commit() // 提交事务
	if err != nil {
		return err
	}

	return nil
}

func (r *ExerciseRepository) DeleteExercise(id int64) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	_, err = tx.Exec("DELETE FROM exercise_run_paths WHERE record_id = ?", id)
	if err != nil {
		return err
	}

	_, err = tx.Exec("DELETE FROM tsr WHERE type = ? AND third_id = ?", "exercise", id)
	if err != nil {
		return err
	}

	_, err = tx.Exec("DELETE FROM exercise WHERE id = ?", id)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *ExerciseRepository) GetTSRsMap(thirdIDs []string, tp string) (map[string]TSR, error) {
	for i, v := range thirdIDs {
		thirdIDs[i] = "'" + v + "'"
	}
	rows, err := r.DB.Query(fmt.Sprintf("select type,third_id,tsr  from tsr where type='%s' and third_id in (%s)", tp, strings.Join(thirdIDs, ",")))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var mp = make(map[string]TSR)
	for rows.Next() {
		var tsr TSR
		err = rows.Scan(&tsr.Type, &tsr.ThirdID, &tsr.TSR)
		if err != nil {
			return nil, err
		}
		mp[tsr.ThirdID] = tsr
	}
	return mp, nil
}

func (r *ExerciseRepository) GetExerciseRunPaths(ids []string) (map[string]string, error) {
	rows, err := r.DB.Query(fmt.Sprintf("select record_id, paths  from exercise_run_paths where record_id in (%s)", strings.Join(ids, ",")))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var mp = make(map[string]string)
	for rows.Next() {
		var recordID string
		var pathStr string
		err = rows.Scan(&recordID, &pathStr)
		if err != nil {
			return nil, err
		}
		mp[recordID] = pathStr
	}
	return mp, nil
}

func (r *ExerciseRepository) GetDB() *sql.DB {
	return r.DB
}
