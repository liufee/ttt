package exercise

import (
	"database/sql"
	"encoding/json"
	"feehiapp/httpserver/service/exercise"
	"feehiapp/httpserver/templates"
	"feehiapp/httpserver/util"
	"fmt"
	"html/template"
	"net/http"
	"strconv"
	"strings"
	"time"
)

var exerciseTemplates = templates.ExerciseTemplates

type ExerciseHandler struct {
	Service *exercise.ExerciseService
}

func (h *ExerciseHandler) Init(db *sql.DB) {
	h.Service = exercise.NewExerciseService(db)
}

func (h *ExerciseHandler) List(w http.ResponseWriter, r *http.Request) {
	dailyExercises, err := h.Service.GetDailyExercise([]exercise.ExerciseType{
		exercise.ExerciseTypeAbdominal, exercise.ExerciseTypeSitUpPushUp, exercise.ExerciseTypeRun,
	}, "", "", "desc")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	dailyExercisesJSON, err := json.Marshal(dailyExercises)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 使用嵌入的模板文件
	tmpl, err := template.New("").Funcs(template.FuncMap{
		"eqInt": func(a, b int) bool { return a == b },
	}).ParseFS(exerciseTemplates, "exercise/layout.html", "exercise/list.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	err = tmpl.ExecuteTemplate(w, "layout.html", map[string]interface{}{
		"dailyExercises":     dailyExercises,
		"dailyExercisesJSON": template.JS(dailyExercisesJSON),
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (h *ExerciseHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		// 显示创建表单页面
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl, err := template.ParseFS(exerciseTemplates, "exercise/layout.html", "exercise/new.html")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		err = tmpl.ExecuteTemplate(w, "layout.html", map[string]interface{}{})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		return
	}

	// 处理POST请求，保存数据
	// 解析表单数据
	err := r.ParseForm()
	if err != nil {
		http.Error(w, "无法解析表单数据: "+err.Error(), http.StatusBadRequest)
		return
	}

	exerciseTypeStr := r.FormValue("type")
	if exerciseTypeStr == "" {
		http.Error(w, "运动类型不能为空", http.StatusBadRequest)
		return
	}

	// 获取开始时间和结束时间
	startTime := r.FormValue("start_time")
	endTime := r.FormValue("end_time")
	if startTime == "" || endTime == "" {
		http.Error(w, "开始时间和结束时间不能为空", http.StatusBadRequest)
		return
	}

	// 解析时间
	start, err := time.ParseInLocation("2006-01-02T15:04:05", startTime, util.TimeZone())
	if err != nil {
		http.Error(w, "开始时间格式错误: "+err.Error(), http.StatusBadRequest)
		return
	}

	end, err := time.ParseInLocation("2006-01-02T15:04:05", endTime, util.TimeZone())
	if err != nil {
		http.Error(w, "结束时间格式错误: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 解析运动类型
	exerciseType, err := strconv.Atoi(exerciseTypeStr)
	if err != nil {
		http.Error(w, "运动类型格式错误: "+err.Error(), http.StatusBadRequest)
		return
	}

	exerciseObj := exercise.Exercise{
		Type:    exercise.ExerciseType(exerciseType),
		StartAt: start,
		EndAt:   end,
		Status:  exercise.StatusCompleted,
		TSR:     1,
	}

	// 根据不同运动类型处理数据

	switch exerciseType {
	case 1: // 腹部训练

	case 2: // 跑步
		distanceStr := r.FormValue("distance")
		distance, _ := strconv.ParseFloat(distanceStr, 64)

		// 计算时长(分钟)
		duration := end.Sub(start)
		h := int(duration.Hours())
		m := int(duration.Minutes()) % 60
		s := int(duration.Seconds()) % 60
		formattedDuration := fmt.Sprintf("%02d:%02d:%02d", h, m, s)

		// 计算平均配速 (距离/小时)
		durationHours := duration.Hours()
		avgPace := 0.0
		if durationHours > 0 {
			avgPace = distance / durationHours
		}

		// 计算无定位跑步时间(这里设为0，可以根据需要调整)
		runningWithoutPosition := 1

		exerciseObj.Run = &exercise.Run{
			AvgPace:                avgPace,
			Distance:               distance,
			RunDuration:            formattedDuration,
			RunningWithoutPosition: runningWithoutPosition,
		}

	case 3: // 仰卧起坐/俯卧撑
		situp, _ := strconv.Atoi(r.FormValue("situp"))
		pushup, _ := strconv.Atoi(r.FormValue("pushup"))
		curlup, _ := strconv.Atoi(r.FormValue("curlup"))
		legsUpTheWallPose, _ := strconv.Atoi(r.FormValue("legsUpTheWallPose"))

		exerciseObj.SitUpPushUp = &exercise.SitUpPushUp{
			PushUp:            pushup,
			SitUp:             situp,
			CurlUp:            curlup,
			LegsUpTheWallPose: legsUpTheWallPose,
		}
	}

	_, err = h.Service.CreateExercise(exerciseObj)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/exercise/list", http.StatusSeeOther)
}

func (h *ExerciseHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "无效的ID", http.StatusBadRequest)
		return
	}

	err = h.Service.DeleteExercise(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/exercise/list", http.StatusSeeOther)
}

func (h *ExerciseHandler) View(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "无效的ID", http.StatusBadRequest)
		return
	}

	exercise, err := h.Service.GetExerciseByID(id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "未找到该记录", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	tmpl, err := template.New("").Funcs(template.FuncMap{
		"eqInt": func(a, b int) bool { return a == b },
	}).ParseFS(exerciseTemplates, "exercise/layout.html", "exercise/view.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = tmpl.ExecuteTemplate(w, "layout.html", map[string]interface{}{
		"exercise": exercise,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (h *ExerciseHandler) AiPrompts(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		tmpl, err := template.New("").Funcs(template.FuncMap{}).ParseFS(exerciseTemplates, "exercise/aiPrompts.html")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl.ExecuteTemplate(w, "aiPrompts.html", nil)
		return
	}
	rangeType := r.URL.Query().Get("range")
	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")
	typeStr := r.URL.Query().Get("types")

	if typeStr == "" {
		http.Error(w, "no types", http.StatusBadRequest)
		return
	}

	// 解析运动类型
	typeArr := strings.Split(typeStr, ",")
	var types []exercise.ExerciseType
	for _, t := range typeArr {
		i, _ := strconv.Atoi(t)
		types = append(types, exercise.ExerciseType(i))
	}

	result, err := h.Service.GetAiPrompts(rangeType, start, end, types)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write([]byte(result))
}

func (h *ExerciseHandler) Abdominal(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		tmpl, err := template.New("").Funcs(template.FuncMap{}).ParseFS(exerciseTemplates, "exercise/abdominal.html")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		exercises, _, err := h.Service.GetExerciseList([]exercise.ExerciseType{exercise.ExerciseTypeAbdominal}, 1, 12, "", "", "")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl.ExecuteTemplate(w, "abdominal.html", map[string]interface{}{
			"exercises": exercises,
		})
		return
	}
}
