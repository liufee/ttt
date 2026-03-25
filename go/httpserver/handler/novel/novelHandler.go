package novel

import (
	"database/sql"
	"feehiapp/httpserver/templates"
	"html/template"
	"net/http"
	"strconv"
)

var novelTemplates = templates.NovelTemplates

type NovelHandler struct {
	DB *sql.DB
}

func (n *NovelHandler) List(writer http.ResponseWriter, request *http.Request) {
	pageStr := request.URL.Query().Get("page")
	if pageStr == "" {
		pageStr = "1"
	}
	perPageStr := request.URL.Query().Get("per-page")
	if perPageStr == "" {
		perPageStr = "100"
	}
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		page = 1
	}
	perPage, err := strconv.Atoi(perPageStr)
	if err != nil {
		perPage = 100
	}
	keyword := request.URL.Query().Get("keyword")

	var total int64
	var novels []Novel
	offset := (page - 1) * perPage
	var rows *sql.Rows
	if keyword != "" {
		if err = n.DB.QueryRow("SELECT count(*) from novels where title like ? or content like ?", "%"+keyword+"%", "%"+keyword+"%").Scan(&total); err != nil {
			http.Error(writer, err.Error(), http.StatusInternalServerError)
			return
		}
		rows, err = n.DB.Query("SELECT id,tid,platform,title,content from novels where title like ? or content like ? limit ? OFFSET ?", "%"+keyword+"%", "%"+keyword+"%", perPage, offset)
		if err != nil {
			http.Error(writer, err.Error(), http.StatusInternalServerError)

			return
		}
	} else {
		if err = n.DB.QueryRow("SELECT count(*) from novels").Scan(&total); err != nil {
			http.Error(writer, err.Error(), http.StatusInternalServerError)

			return
		}

		rows, err = n.DB.Query("SELECT id,tid,platform,title,content from novels  limit ? OFFSET ?", perPage, offset)
		if err != nil {
			http.Error(writer, err.Error(), http.StatusInternalServerError)

			return
		}
	}

	for rows.Next() {
		var novel Novel
		if err := rows.Scan(&novel.ID, &novel.TID, &novel.Platform, &novel.Title, &novel.Content); err != nil {
			http.Error(writer, err.Error(), http.StatusInternalServerError)

			return
		}
		novels = append(novels, novel)
	}

	if err = rows.Err(); err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)

		return
	}

	type data struct {
		Novels   []Novel
		Total    int64
		PerPage  int64
		Page     int
		Keyword  string
		NextPage string
		PrevPage string
	}

	tmpl, err := template.New("layout.html").Funcs(template.FuncMap{
		"safeHTML": func(s string) template.HTML {
			return template.HTML(s)
		},
		"add": func(a, b int) int {
			return a + b
		},
		"sub": func(a, b int) int {
			return a - b
		},
		// 添加divUp函数用于计算总页数
		"divUp": func(a, b int64) int {
			return int((a + b - 1) / b)
		},
		// 添加until函数用于生成页码范围
		"until": func(n int) []int {
			result := make([]int, n)
			for i := 0; i < n; i++ {
				result[i] = i
			}
			return result
		},
	}).ParseFS(novelTemplates, "novel/layout.html", "novel/list.html")
	if err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)
		return
	}

	err = tmpl.ExecuteTemplate(writer, "layout.html", data{
		Novels:   novels,
		Total:    total,
		PerPage:  int64(perPage),
		Page:     page,
		Keyword:  keyword,
		NextPage: "/?page=" + strconv.Itoa(page+1) + "&keyword=" + request.URL.Query().Get("keyword") + "&per-page=" + strconv.Itoa(perPage),
		PrevPage: "/?page=" + strconv.Itoa(page-1) + "&keyword=" + request.URL.Query().Get("keyword") + "&per-page=" + strconv.Itoa(perPage),
	})
	if err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (n *NovelHandler) HttpDetailPage(writer http.ResponseWriter, request *http.Request) {
	var novel Novel
	id := request.URL.Query().Get("id")
	if id == "" {
		http.Error(writer, "id empty", http.StatusInternalServerError)

		return
	}

	err := n.DB.QueryRow("select id,tid,title,platform,content from novels where id=?", id).Scan(&novel.ID, &novel.TID, &novel.Title, &novel.Platform, &novel.Content)
	if err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)

		return
	}

	type data struct {
		Novel            Novel
		NovelContentHTML template.HTML
	}

	tmpl, err := template.New("layout.html").Funcs(template.FuncMap{
		"safeHTML": func(s string) template.HTML {
			return template.HTML(s)
		},
	}).ParseFS(novelTemplates, "novel/layout.html", "novel/detail.html")
	if err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)
		return
	}

	err = tmpl.ExecuteTemplate(writer, "layout.html", data{
		Novel:            novel,
		NovelContentHTML: template.HTML(novel.Content),
	})
	if err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)
		return
	}
}

type Novel struct {
	ID       uint   `gorm:"primaryKey;column:id"`
	Platform int    `column:"platform"`
	TID      string `gorm:"column:tid"`
	Title    string `gorm:"column:title"`
	Content  string `gorm:"column:content"`
}
