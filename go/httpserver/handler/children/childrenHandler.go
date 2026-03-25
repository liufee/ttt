package children

import (
	"database/sql"
	childrenService "feehiapp/httpserver/service/children"
	"feehiapp/httpserver/templates"
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"time"
)

var childrenTemplates = templates.ChildrenTemplates

type ChildrenHandler struct {
	Service *childrenService.ChildrenService
}

func (h *ChildrenHandler) Init(dbChildren *sql.DB) error {
	h.Service = childrenService.NewChildrenService(dbChildren)
	return nil
}
func (h *ChildrenHandler) AIPrompts(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		tmpl, err := template.New("").Funcs(template.FuncMap{}).ParseFS(childrenTemplates, "children/aiPrompts.html")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl.ExecuteTemplate(w, "aiPrompts.html", nil)
		return
	}
	q := r.URL.Query()

	child := q.Get("child")
	rangeType := q.Get("range")

	var startAt, endAt *time.Time

	now := time.Now()
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	now = now.In(loc)

	switch rangeType {
	case "today":
		s := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
		e := s.Add(24 * time.Hour)
		startAt, endAt = &s, &e
	case "yesterday":
		s := time.Date(now.Year(), now.Month(), now.Day()-1, 0, 0, 0, 0, loc)
		e := s.Add(24 * time.Hour)
		startAt, endAt = &s, &e
	case "before2":
		s := time.Date(now.Year(), now.Month(), now.Day()-2, 0, 0, 0, 0, loc)
		e := s.Add(24 * time.Hour)
		startAt, endAt = &s, &e
	case "before3":
		s := time.Date(now.Year(), now.Month(), now.Day()-3, 0, 0, 0, 0, loc)
		e := s.Add(24 * time.Hour)
		startAt, endAt = &s, &e
	case "week":
		offset := int(now.Weekday())
		if offset == 0 {
			offset = 7
		}
		s := time.Date(now.Year(), now.Month(), now.Day()-offset+1, 0, 0, 0, 0, loc)
		e := s.Add(7 * 24 * time.Hour)
		startAt, endAt = &s, &e
	case "month":
		s := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
		e := s.AddDate(0, 1, 0)
		startAt, endAt = &s, &e
	case "custom":
		startStr := q.Get("start")
		endStr := q.Get("end")
		s, _ := time.ParseInLocation("2006-01-02", startStr, loc)
		e, _ := time.ParseInLocation("2006-01-02", endStr, loc)
		e = e.Add(24 * time.Hour)
		startAt, endAt = &s, &e
	}

	children := []string{}
	if child != "" {
		children = strings.Split(child, ",")
	}

	events, err := h.Service.GetEvents(
		children,
		nil,
		startAt,
		endAt,
		"start_time",
		"asc",
		1000,
	)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	// 构造自然语言文本
	var lines []string

	age, err := getAge(child, now, loc)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	lines = append(lines, fmt.Sprintf("今天是%s日,宝宝已经%s", now.Format("2006-01-02"), age))

	for _, ev := range events {

		switch e := ev.(type) {

		case childrenService.EatEvent:
			t := e.StartTime.Format("2006年1月2日 15:04")
			lines = append(lines,
				fmt.Sprintf("%s 吃了 %d ml", t, e.Amount),
			)

		case childrenService.PoopEvent:
			t := e.StartTime.Format("2006年1月2日 15:04")
			lines = append(lines,
				fmt.Sprintf("%s 大便，类型：%s，颜色：%s",
					t, e.Type, e.Color),
			)

		case childrenService.PeeEvent:
			t := e.StartTime.Format("2006年1月2日 15:04")
			lines = append(lines,
				fmt.Sprintf("%s 小便，程度：%s",
					t, e.Level),
			)

		case childrenService.SleepEvent:
			start := e.StartTime.Format("2006年1月2日 15:04")
			end := e.EndTime.Format("15:04")
			lines = append(lines,
				fmt.Sprintf("%s - %s 睡觉，共 %d 分钟",
					start, end, e.Duration),
			)

		case childrenService.CryEvent:
			t := e.StartTime.Format("2006年1月2日 15:04")
			lines = append(lines,
				fmt.Sprintf("%s 哭闹，程度：%s",
					t, e.Level),
			)
		}
	}

	output := strings.Join(lines, "\n")

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write([]byte(output))
}
