package weibo

import (
	"database/sql"
	"encoding/json"
	"html/template"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"feehiapp/httpserver/service/weibo"
	"feehiapp/httpserver/templates"
)

var weiboTemplates = templates.WeiboTemplates

var Users = []weibo.User{
	{ID: "1570737487", Name: "变身黄瓜给你用", Avatar: "users/1570737487.jpg"},
	{ID: "2127717142", Name: "遵守寂寞程序", Avatar: "users/2127717142.jpg"},
	{ID: "3", Name: "灰灰", Avatar: "users/3.jpg"},
}

type WeiboHandler struct {
	Service    *weibo.WeiboService
	AmapWebKey string
}

func (h *WeiboHandler) Init(dbWeibo *sql.DB, businessDB string, basePath string, largeBasePath string, amapWebKey string) error {
	h.Service = weibo.NewWeiboService(dbWeibo, basePath, largeBasePath)
	h.AmapWebKey = amapWebKey
	return h.Service.Init(businessDB)
}

func (h *WeiboHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.FormValue("id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	err := h.Service.DeleteWeibo(id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "weibo not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	http.Redirect(w, r, "/weibo/list", http.StatusSeeOther)

}

func (h *WeiboHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.FormValue("id")
	feedID := r.FormValue("feed_id")

	if id == "" {
		http.Error(w, "评论ID不能为空", http.StatusBadRequest)
		return
	}

	if feedID == "" {
		http.Error(w, "微博ID不能为空", http.StatusBadRequest)
		return
	}

	err := h.Service.DeleteComment(id, feedID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "评论不存在", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	http.Redirect(w, r, "/weibo/view?id="+feedID, http.StatusSeeOther)
	return

}

func (h *WeiboHandler) Comment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}

	err := r.ParseMultipartForm(1024 << 20)
	if err != nil {
		http.Error(w, "无法解析表单数据: "+err.Error(), http.StatusBadRequest)
		return
	}

	feedID := r.FormValue("feed_id")
	content := r.FormValue("content")
	uid := r.FormValue("uid")
	replyTo := r.FormValue("reply_to")
	retweet := r.FormValue("retweet") // 是否同时转发

	if feedID == "" || content == "" || uid == "" {
		http.Error(w, "feed_id, content and uid are required", http.StatusBadRequest)
		return
	}

	location, err := GetLocation(r)
	if err != nil {
		http.Error(w, "location 错误: "+err.Error(), http.StatusInternalServerError)
		return
	}

	comment := weibo.Comment{
		ID:       "",
		FeedID:   feedID,
		UID:      uid,
		Content:  content,
		Location: location,
		Time:     time.Time{},
		TSR:      1, // 默认启用TSR
	}

	if replyTo != "" {
		comment.ReplyTo = &weibo.Comment{ID: replyTo}
	}

	err = h.Service.CreateComment(comment, func(feedId string, commentId string, uid string) ([]weibo.Media, error) {
		return h.Service.ParseMediaFromMultipart(r.MultipartForm, feedId, commentId, uid)
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 如果需要同时转发
	if retweet == "1" {
		// 构造转发内容
		retweetContent := content
		if retweetContent == "" {
			retweetContent = "转发微博"
		}

		weiboObj := weibo.Weibo{
			ID:         "",
			UID:        uid,
			Type:       2,
			LinkHref:   "",
			URL:        "",
			Time:       time.Time{},
			Content:    retweetContent,
			Location:   location,
			CommentNum: 0,
			LikeNum:    0,
			RepostNum:  0,
			ByID:       89,
			RetweetID:  feedID,
			TSR:        1,
		}

		err = h.Service.CreateWeibo(weiboObj, func(feedId string, uid string) ([]weibo.Media, error) {
			return h.Service.ParseMediaFromMultipart(r.MultipartForm, feedId, "", uid)
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	http.Redirect(w, r, "/weibo/view?id="+feedID, http.StatusSeeOther)
	return

}

func (h *WeiboHandler) Retweet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}

	err := r.ParseMultipartForm(1024 << 20)
	if err != nil {
		http.Error(w, "无法解析表单数据: "+err.Error(), http.StatusBadRequest)
		return
	}

	feedID := r.FormValue("feed_id")
	content := r.FormValue("content")
	uid := r.FormValue("uid")
	comment := r.FormValue("comment") // 是否同时评论

	if feedID == "" || uid == "" {
		http.Error(w, "feed_id and uid are required", http.StatusBadRequest)
		return
	}

	if content == "" {
		content = "转发微博"
	}

	location, err := GetLocation(r)
	if err != nil {
		http.Error(w, "location 错误: "+err.Error(), http.StatusInternalServerError)
		return
	}

	weiboObj := weibo.Weibo{
		ID:         "",
		UID:        uid,
		Type:       2,
		LinkHref:   "",
		URL:        "",
		Time:       time.Time{},
		Content:    content,
		Location:   location,
		CommentNum: 0,
		LikeNum:    0,
		RepostNum:  0,
		ByID:       89,
		RetweetID:  feedID,
		TSR:        1,
	}

	err = h.Service.CreateWeibo(weiboObj, func(feedId string, uid string) ([]weibo.Media, error) {
		return h.Service.ParseMediaFromMultipart(r.MultipartForm, feedId, "", uid)
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if comment == "1" {
		comment := weibo.Comment{
			ID:       "",
			FeedID:   feedID,
			UID:      uid,
			Content:  content,
			Location: location,
			Time:     time.Time{},
			TSR:      1, // 默认启用TSR
		}

		err = h.Service.CreateComment(comment, func(feedId string, commentId string, uid string) ([]weibo.Media, error) {
			return h.Service.ParseMediaFromMultipart(r.MultipartForm, feedId, commentId, uid)
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	http.Redirect(w, r, "/weibo/view?id="+feedID, http.StatusSeeOther)
	return
}

func (h *WeiboHandler) List(w http.ResponseWriter, r *http.Request) {
	// 获取分页参数
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("per_page")
	filterUserID := r.URL.Query().Get("uid")
	// 添加关键词参数
	keyword := r.URL.Query().Get("keyword")
	// 添加时间范围参数
	startTime := r.URL.Query().Get("start_time")
	endTime := r.URL.Query().Get("end_time")
	// 添加排序参数，默认为降序
	sortOrder := r.URL.Query().Get("sort")
	if sortOrder == "" {
		sortOrder = "desc"
	}

	page := 1
	perPage := 10

	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if perPageStr != "" {
		if pp, err := strconv.Atoi(perPageStr); err == nil && pp > 0 && pp <= 100 {
			perPage = pp
		}
	}

	// 构建用户ID列表
	var uids []string
	if filterUserID != "" {
		uids = []string{filterUserID}
	} else {
		for _, user := range Users {
			uids = append(uids, user.ID)
		}
	}
	filterStartTime := ""
	if startTime != "" {
		filterStartTime = strings.ReplaceAll(startTime, "T", " ") + ":00"
	}
	filterEndTime := ""
	if endTime != "" {
		filterEndTime = strings.ReplaceAll(endTime, "T", " ") + ":00"
	}
	serviceWbs, total, err := h.Service.GetWeiboList(uids, page, perPage, keyword, filterStartTime, filterEndTime, sortOrder)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	weibos := make([]Weibo, len(serviceWbs))
	for idx, serviceWb := range serviceWbs {
		weibos[idx] = convertToWeibo(serviceWb)
	}

	// 计算总页数
	totalPages := (total + perPage - 1) / perPage
	if totalPages == 0 {
		totalPages = 1
	}

	data := struct {
		Weibos     []Weibo
		Page       int
		PerPage    int
		Total      int
		TotalPages int
		Uid        string
		Keyword    string
		StartTime  string
		EndTime    string
		Sort       string
		Users      []weibo.User
	}{
		Weibos:     weibos,
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
		Uid:        filterUserID,
		Keyword:    keyword,
		StartTime:  startTime,
		EndTime:    endTime,
		Sort:       sortOrder,
		Users:      Users,
	}

	// 使用嵌入的模板文件
	tmpl, err := template.New("").Funcs(template.FuncMap{
		"add":   func(a, b int) int { return a + b },
		"sub":   func(a, b int) int { return a - b },
		"eq":    func(a, b string) bool { return a == b },
		"eqInt": func(a, b int) bool { return a == b },
		"stringContain": func(s, prefix string) bool {
			return strings.Contains(strings.ToLower(s), strings.ToLower(prefix))
		},
		"split": func(s, sep string) []string {
			return strings.Split(s, sep)
		},
		"last": func(arr []string) string {
			if len(arr) == 0 {
				return ""
			}
			return arr[len(arr)-1]
		},
		"upper": func(str string) string {
			return strings.ToUpper(str)
		},
	}).ParseFS(weiboTemplates, "weibo/layout.html", "weibo/list.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	err = tmpl.ExecuteTemplate(w, "layout.html", data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (h *WeiboHandler) View(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	serviceWb, err := h.Service.GetWeiboByID(id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "weibo not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	serviceComments, err := h.Service.GetCommentsByFeedID(id)
	if err != nil {
		http.Error(w, "获取评论失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	comments := make([]Comment, len(serviceComments))
	for idx, serviceComment := range serviceComments {
		comments[idx] = convertToComment(serviceComment)
	}

	// 使用嵌入的模板文件
	tmpl, err := template.New("").Funcs(template.FuncMap{
		"stringContain": func(s, prefix string) bool {
			return strings.Contains(strings.ToLower(s), strings.ToLower(prefix))
		},
		"eqInt": func(a, b int) bool { return a == b },
		"split": func(s, sep string) []string {
			return strings.Split(s, sep)
		},
		"last": func(arr []string) string {
			if len(arr) == 0 {
				return ""
			}
			return arr[len(arr)-1]
		},
		"upper": func(str string) string {
			return strings.ToUpper(str)
		},
	}).ParseFS(weiboTemplates, "weibo/layout.html", "weibo/view.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	err = tmpl.ExecuteTemplate(w, "layout.html", struct {
		Weibo      Weibo
		Users      []weibo.User
		Comments   []Comment
		AmapWebKey string
	}{
		Weibo:      convertToWeibo(*serviceWb),
		Users:      Users,
		Comments:   comments,
		AmapWebKey: h.AmapWebKey,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (h *WeiboHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		// 解析 multipart 表单，最大内存 1GB
		err := r.ParseMultipartForm(1024 << 20)
		if err != nil {
			http.Error(w, "无法解析表单数据: "+err.Error(), http.StatusBadRequest)
			return
		}

		content := r.FormValue("content")
		uid := r.FormValue("uid")

		if content == "" {
			http.Error(w, "content is required", http.StatusBadRequest)
			return
		}

		if uid == "" {
			http.Error(w, "uid is required", http.StatusBadRequest)
			return
		}

		if err != nil {
			http.Error(w, "无法处理上传文件: "+err.Error(), http.StatusInternalServerError)
			return
		}

		location, err := GetLocation(r)
		if err != nil {
			http.Error(w, "location 错误: "+err.Error(), http.StatusInternalServerError)
			return
		}

		weiboObj := weibo.Weibo{
			ID:         "",
			UID:        uid,
			Type:       2,
			LinkHref:   "",
			URL:        "",
			Time:       time.Time{},
			Content:    content,
			Location:   location,
			CommentNum: 0,
			LikeNum:    0,
			RepostNum:  0,
			ByID:       89,
			RetweetID:  "",
			TSR:        1,
		}

		err = h.Service.CreateWeibo(weiboObj, func(feedId string, uid string) ([]weibo.Media, error) {
			return h.Service.ParseMediaFromMultipart(r.MultipartForm, feedId, "", uid)
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "/weibo/list", http.StatusSeeOther)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	tmpl, err := template.ParseFS(weiboTemplates, "weibo/layout.html", "weibo/new.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = tmpl.ExecuteTemplate(w, "layout.html", struct {
		Users      []weibo.User
		AmapWebKey string
	}{Users: Users, AmapWebKey: h.AmapWebKey})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

}

func (h *WeiboHandler) File(w http.ResponseWriter, r *http.Request) {
	inPath := r.FormValue("path")
	if strings.HasPrefix(inPath, "http") {
		/*
			result, err := http.Get(inPath)
			if err != nil {
				http.Error(w, "File download err", http.StatusInternalServerError)
				return
			}
			content, err := io.ReadAll(result.Body)
			if err != nil {
				http.Error(w, "File read err", http.StatusInternalServerError)
				return
			}
			http.ServeContent(w, r, "pic", time.Now(), bytes.NewReader(content))
		*/
		return
	}
	filePath, exists, err := h.Service.GetFilePath(inPath)
	if err != nil {
		http.Error(w, "GetFilePath error", http.StatusNotFound)
	}
	if !exists {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	f, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	defer f.Close()

	mimeType := mime.TypeByExtension(filepath.Ext(filePath))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", mimeType)
	info, err := f.Stat()
	if err != nil {
		http.Error(w, "File stat error", http.StatusInternalServerError)
		return
	}
	http.ServeContent(w, r, filepath.Base(filePath), info.ModTime(), f)
}

func (h *WeiboHandler) RandomWeibo(w http.ResponseWriter, r *http.Request) {
	perPageStr := r.URL.Query().Get("per-page")
	filterUserID := r.URL.Query().Get("uid")
	perPage := 1
	if perPageStr != "" {
		if n, err := strconv.Atoi(perPageStr); err == nil && n > 0 {
			perPage = n
		}
	}
	uids := []string{"1570737487", "2127717142", "3"}
	if filterUserID != "" {
		uids = []string{filterUserID}
	}

	serviceWbs, err := h.Service.GetRandomWeibos(uids, perPage)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	wbs := make([]Weibo, len(serviceWbs))
	for idx, serviceWb := range serviceWbs {
		wbs[idx] = convertToWeibo(serviceWb)
	}

	data, err := json.Marshal(wbs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, err = w.Write(data)
}

func (h *WeiboHandler) MarkWeibo(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	statusStr := r.URL.Query().Get("status")
	status, err := strconv.Atoi(statusStr)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = h.Service.MarkWeibo(id, status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = w.Write([]byte("ok"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
