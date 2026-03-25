package weibo

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type WeiboRepository struct {
	DB *sql.DB
}

func NewWeiboRepository(db *sql.DB) *WeiboRepository {
	return &WeiboRepository{DB: db}
}

func (r *WeiboRepository) Init(businessDB string) error {
	_, err := r.DB.Exec(fmt.Sprintf(`ATTACH '%s' AS business`, businessDB))
	return err
}

func (r *WeiboRepository) DeleteWeibo(id string, retweetId string) error {
	// 开始事务处理多个表
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	result, err := tx.Exec("DELETE FROM feeds WHERE id = ?", id)
	if err != nil {
		tx.Rollback()
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		tx.Rollback()
		return err
	}

	if rowsAffected == 0 {
		tx.Rollback()
		return sql.ErrNoRows
	}

	// 删除对应的TSR记录
	_, err = tx.Exec("DELETE FROM tsr WHERE type = 'feed' AND third_id = ?", id)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("删除TSR记录失败: %v", err)
	}

	// 删除对应的评论
	_, err = tx.Exec("DELETE FROM comments WHERE feed_id = ?", id)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("删除评论记录失败: %v", err)
	}

	if retweetId != "" {
		// 修改被转发的微博的转发数 -1
		_, err = tx.Exec("UPDATE feeds SET repost_num = repost_num - 1 WHERE id = ?", retweetId)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("修改被转发微博的转发数记录失败: %v", err)
		}
	}

	// 提交事务
	err = tx.Commit()
	if err != nil {
		tx.Rollback()
		return err
	}

	return nil
}

func (r *WeiboRepository) DeleteComment(id string, feedID string) error {
	// 开始事务处理
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 删除评论
	result, err := tx.Exec("DELETE FROM comments WHERE id = ?", id)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("删除评论失败: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		tx.Rollback()
		return err
	}

	if rowsAffected == 0 {
		tx.Rollback()
		return sql.ErrNoRows
	}

	// 更新微博的评论数
	_, err = tx.Exec("UPDATE feeds SET comment_num = comment_num - 1 WHERE id = ?", feedID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("更新微博评论数失败: %v", err)
	}

	// 删除对应的TSR记录
	_, err = tx.Exec("DELETE FROM tsr WHERE type = 'comment' AND third_id = ?", id)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("删除TSR记录失败: %v", err)
	}

	// 提交事务
	err = tx.Commit()
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("事务提交失败: %v", err)
	}

	return nil
}

func (r *WeiboRepository) CreateWeibo(weibo Weibo, media []Media) error {
	// 开始事务处理多个表
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 插入微博
	_, err = tx.Exec("INSERT INTO feeds (id, uid,type,link_href,url,time,content,coordinates,location,comment_num,like_num,repost_num,by_id,retweet_id,tsr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		weibo.ID, weibo.UID, weibo.Type, weibo.LinkHref, weibo.URL, weibo.Time, weibo.Content, weibo.Coordinates, weibo.Location, weibo.CommentNum, weibo.LikeNum, weibo.RepostNum, weibo.ByID, weibo.RetweetID, weibo.TSR)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 插入媒体文件
	for _, m := range media {
		picture, _ := json.Marshal(m)
		_, err = tx.Exec("INSERT INTO pictures (type, third_id, picture) VALUES (?, ?, ?)",
			"feed", weibo.ID, string(picture))
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	if weibo.RetweetID != "" {
		// 修改被转发微博的转发数 +1
		_, err = tx.Exec("UPDATE feeds SET repost_num = repost_num + 1 WHERE id = ?", weibo.RetweetID)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	if weibo.TSR == 1 {
		_, err = tx.Exec("INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)",
			weibo.TSRInfo.Type, weibo.TSRInfo.ThirdID, weibo.TSRInfo.TSR)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	// 提交事务
	err = tx.Commit()
	if err != nil {
		tx.Rollback()
		return err
	}

	return nil
}

func (r *WeiboRepository) CreateComment(comment Comment, media []Media) error {
	// 开始事务处理
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 插入媒体文件
	for _, m := range media {
		picture, _ := json.Marshal(m)
		_, err = tx.Exec("INSERT INTO pictures (type, third_id, picture) VALUES (?, ?, ?)",
			"comment", comment.ID, string(picture))
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	// 插入评论
	var replyToNull sql.NullString
	if comment.ReplyTo != nil && *comment.ReplyTo != "" {
		replyToNull = sql.NullString{String: *comment.ReplyTo, Valid: true}
	} else {
		replyToNull = sql.NullString{String: "", Valid: false}
	}

	result, err := tx.Exec("INSERT INTO comments (id, feed_id, user_id, content, time, reply_to, location, tsr, like_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		comment.ID, comment.FeedID, comment.UID, comment.Content, comment.Time, replyToNull, comment.Location, comment.TSR, 0)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 获取插入的评论ID
	_, err = result.LastInsertId()
	if err != nil {
		tx.Rollback()
		return err
	}

	// 更新微博的评论数
	_, err = tx.Exec("UPDATE feeds SET comment_num = comment_num + 1 WHERE id = ?", comment.FeedID)
	if err != nil {
		tx.Rollback()
		return err
	}

	if comment.TSR == 1 {
		_, err = tx.Exec("INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)",
			comment.TSRInfo.Type, comment.TSRInfo.ThirdID, comment.TSRInfo.TSR)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	// 提交事务
	err = tx.Commit()
	if err != nil {
		tx.Rollback()
		return err
	}

	return nil
}

func (r *WeiboRepository) CreateRetweet(originalWeiboID string, retweetWeibo Weibo) error {
	// 开始事务处理
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 插入转发微博
	_, err = tx.Exec("INSERT INTO feeds (id, uid, type, link_href, url, time, content, coordinates, location, comment_num, like_num, repost_num, by_id, retweet_id, tsr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		retweetWeibo.ID, retweetWeibo.UID, retweetWeibo.Type, retweetWeibo.LinkHref, retweetWeibo.URL, retweetWeibo.Time, retweetWeibo.Content, retweetWeibo.Coordinates, retweetWeibo.Location, retweetWeibo.CommentNum, retweetWeibo.LikeNum, retweetWeibo.RepostNum, retweetWeibo.ByID, retweetWeibo.RetweetID, retweetWeibo.TSR)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 更新原微博的转发数
	_, err = tx.Exec("UPDATE feeds SET repost_num = repost_num + 1 WHERE id = ?", originalWeiboID)
	if err != nil {
		tx.Rollback()
		return err
	}

	if retweetWeibo.TSR == 1 {
		_, err = tx.Exec("INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)",
			retweetWeibo.TSRInfo.Type, retweetWeibo.TSRInfo.ThirdID, retweetWeibo.TSRInfo.TSR)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	// 提交事务
	err = tx.Commit()
	if err != nil {
		tx.Rollback()
		return err
	}

	return nil
}

func (r *WeiboRepository) GetWeiboList(uids []string, page int, perPage int, keyword string, startTime string, endTime string, sortOrder string) ([]Weibo, int, error) {
	// 计算偏移量
	offset := (page - 1) * perPage

	// 查询总数
	var total int
	var countQuery string
	var countArgs []interface{}

	for i, v := range uids {
		uids[i] = "'" + v + "'"
	}

	// 构建时间范围条件
	timeCondition := ""
	if startTime != "" || endTime != "" {
		timeCondition = " and " + r.getTimeCondition(startTime, endTime)
	}

	if keyword != "" {
		countQuery = fmt.Sprintf("select count(distinct feeds.id) FROM feeds left join retweets on feeds.retweet_id = retweets.id left join comments on feeds.id = comments.feed_id left join users on retweets.uid=users.id where feeds.uid in (%s)%s and (feeds.content like ? or retweets.content like ? or comments.content like ? or users.name like ?)", strings.Join(uids, ","), timeCondition)
		countArgs = append(countArgs, "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	} else {
		countQuery = fmt.Sprintf("select count(*) FROM feeds where uid in (%s)%s", strings.Join(uids, ","), timeCondition)
	}

	err := r.DB.QueryRow(countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// 查询当前页数据
	var dataQuery string
	var dataArgs []interface{}

	// 确定排序方向
	orderClause := "feeds.time DESC"
	if sortOrder == "asc" {
		orderClause = "feeds.time ASC"
	}

	// 构建查询语句
	if keyword != "" {
		dataQuery = fmt.Sprintf("select feeds.id, feeds.content, feeds.uid, feeds.by_id, feeds.coordinates, feeds.location, feeds.comment_num, feeds.like_num, feeds.repost_num, feeds.type, feeds.url, feeds.tsr, feeds.retweet_id, feeds.time FROM feeds left join retweets on feeds.retweet_id = retweets.id left join comments on feeds.id = comments.feed_id left join users on retweets.uid = users.id where feeds.uid in (%s)%s and (feeds.content like ? or retweets.content like ? or comments.content like ? or users.name like ?) GROUP BY feeds.id ORDER BY %s limit ? offset ?", strings.Join(uids, ","), timeCondition, orderClause)
		dataArgs = append(dataArgs, "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", perPage, offset)
	} else {
		dataQuery = fmt.Sprintf("SELECT id, content, uid, by_id, coordinates, location, comment_num, like_num, repost_num, type, url, tsr, retweet_id, time FROM feeds where feeds.uid in (%s)%s ORDER BY %s LIMIT ? OFFSET ?", strings.Join(uids, ","), timeCondition, orderClause)
		dataArgs = append(dataArgs, perPage, offset)
	}

	rows, err := r.DB.Query(dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var weibos []Weibo
	for rows.Next() {
		var weibo Weibo
		err := rows.Scan(&weibo.ID, &weibo.Content, &weibo.UID, &weibo.ByID, &weibo.Coordinates, &weibo.Location, &weibo.CommentNum, &weibo.LikeNum, &weibo.RepostNum, &weibo.Type, &weibo.URL, &weibo.TSR, &weibo.RetweetID, &weibo.Time)
		if err != nil {
			return nil, 0, err
		}
		weibos = append(weibos, weibo)
	}

	return weibos, total, nil
}

func (r *WeiboRepository) GetWeiboByID(id string) (*Weibo, error) {
	var weibo Weibo
	err := r.DB.QueryRow("SELECT id, content, uid, by_id, coordinates, location, comment_num, like_num, repost_num, type, url, by_id, retweet_id, tsr, time FROM feeds WHERE id = ?", id).
		Scan(&weibo.ID, &weibo.Content, &weibo.UID, &weibo.ByID, &weibo.Coordinates, &weibo.Location, &weibo.CommentNum, &weibo.LikeNum, &weibo.RepostNum, &weibo.Type, &weibo.URL, &weibo.ByID, &weibo.RetweetID, &weibo.TSR, &weibo.Time)
	if err != nil {
		return nil, err
	}
	return &weibo, nil
}

func (r *WeiboRepository) GetCommentByID(commentID string) (*Comment, error) {
	row := r.DB.QueryRow(`
		SELECT id, feed_id, user_id, content, location, time, reply_to, tsr
		FROM comments
		WHERE id = ?
		LIMIT 1
	`, commentID)

	var comment Comment
	var replyToID sql.NullString

	err := row.Scan(
		&comment.ID,
		&comment.FeedID,
		&comment.UID,
		&comment.Content,
		&comment.Location,
		&comment.Time,
		&replyToID,
		&comment.TSR,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if replyToID.Valid && replyToID.String != "0" && replyToID.String != "" {
		comment.ReplyTo = &replyToID.String
	}

	return &comment, nil
}

func (r *WeiboRepository) GetCommentsByIDs(ids []string) ([]*Comment, error) {
	if len(ids) == 0 {
		return nil, nil
	}

	rows, err := r.DB.Query(fmt.Sprintf("SELECT id, feed_id, user_id, content, location, time, tsr, reply_to FROM comments WHERE id IN (%s)", strings.Join(ids, ",")))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*Comment
	for rows.Next() {
		var c Comment
		var replyTo sql.NullString
		if err := rows.Scan(&c.ID, &c.FeedID, &c.UID, &c.Content, &c.Location, &c.Time, &c.TSR, &replyTo); err != nil {
			return nil, err
		}
		if replyTo.Valid {
			c.ReplyTo = &replyTo.String
		}
		comments = append(comments, &c)
	}
	return comments, nil
}

func (r *WeiboRepository) GetCommentsByFeedID(feedID string) ([]Comment, error) {
	// 查询评论，按时间排序
	rows, err := r.DB.Query(`
		SELECT id, feed_id, user_id, content, location, time, reply_to, tsr
		FROM comments
		WHERE feed_id = ?
		ORDER BY time DESC`, feedID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []Comment
	// 先获取所有评论
	for rows.Next() {
		var comment Comment
		var replyToID sql.NullString

		err := rows.Scan(&comment.ID, &comment.FeedID, &comment.UID, &comment.Content, &comment.Location, &comment.Time, &replyToID, &comment.TSR)
		if err != nil {
			return nil, err
		}

		// 如果有回复目标，则保存回复ID
		if replyToID.Valid && replyToID.String != "0" && replyToID.String != "" {
			comment.ReplyTo = &replyToID.String
		}

		comments = append(comments, comment)
	}

	return comments, nil
}

func (r *WeiboRepository) GetLikesByFeedID(feedID string) ([]Like, error) {
	rows, err := r.DB.Query(`
		SELECT id, feed_id, user_id, count
		FROM likes
		WHERE feed_id = ?`, feedID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var likes []Like

	for rows.Next() {
		var like Like
		if err := rows.Scan(
			&like.ID,
			&like.FeedID,
			&like.UID,
			&like.Count,
		); err != nil {
			return nil, err
		}
		likes = append(likes, like)
	}

	return likes, nil
}

func (r *WeiboRepository) GetBeenRepostedByFeedID(feedID string) ([]BeenPosted, error) {
	rows, err := r.DB.Query(`
		SELECT id, feed_id, user_id, content, time
		FROM been_reposts
		WHERE feed_id = ?`, feedID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reposts []BeenPosted

	for rows.Next() {
		var beenReposted BeenPosted
		if err := rows.Scan(
			&beenReposted.ID,
			&beenReposted.FeedID,
			&beenReposted.UID,
			&beenReposted.Content,
			&beenReposted.Time,
		); err != nil {
			return nil, err
		}
		reposts = append(reposts, beenReposted)
	}

	rows, err = r.DB.Query(`
		SELECT id, retweet_id, uid, content, time
		FROM feeds
		WHERE retweet_id = ?`, feedID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var beenReposted BeenPosted
		if err := rows.Scan(
			&beenReposted.ID,
			&beenReposted.FeedID,
			&beenReposted.UID,
			&beenReposted.Content,
			&beenReposted.Time,
		); err != nil {
			return nil, err
		}
		reposts = append(reposts, beenReposted)
	}

	return reposts, nil
}

func (r *WeiboRepository) GetCompatibleRetweetByID(id string) (*Weibo, error) {
	query := `
		SELECT id, content, repost_num, like_num,
		       comment_num, uid, by_id, time
		FROM retweets
		WHERE id = ?
		LIMIT 1
	`

	row := r.DB.QueryRow(query, id)

	var item Weibo
	err := row.Scan(
		&item.ID,
		&item.Content,
		&item.RepostNum,
		&item.LikeNum,
		&item.CommentNum,
		&item.UID,
		&item.ByID,
		&item.Time,
	)
	if err != nil {
		return nil, err
	}

	weibo := Weibo{
		ID:         item.ID,
		Type:       1,
		Content:    item.Content,
		CommentNum: item.CommentNum,
		LikeNum:    item.LikeNum,
		RepostNum:  item.RepostNum,
		Time:       item.Time,
		UID:        item.UID,
		TSR:        0,
	}

	return &weibo, nil
}

func (r *WeiboRepository) GetUsersMap(userIDs []string) (map[string]User, error) {
	if onlyFromAllowed(userIDs, []string{"1570737487", "2127717142", "3"}) {
		return map[string]User{
			"1570737487": {ID: "1570737487", Name: "变身黄瓜给你用", Avatar: "users/1570737487.jpg"},
			"2127717142": {ID: "2127717142", Name: "遵守寂寞程序", Avatar: "users/2127717142.jpg"},
			"3":          {ID: "3", Name: "灰灰", Avatar: "users/3.jpg"},
		}, nil
	}
	for i, v := range userIDs {
		userIDs[i] = "'" + v + "'"
	}
	rows, err := r.DB.Query(fmt.Sprintf("select id, name, pic_local from users where id in (%s)", strings.Join(userIDs, ",")))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users = make(map[string]User)
	for rows.Next() {
		var user User
		err = rows.Scan(&user.ID, &user.Name, &user.Avatar)
		if err != nil {
			return nil, err
		}
		users[user.ID] = user
	}
	return users, nil
}

func onlyFromAllowed(ids []string, allowed []string) bool {
	if len(ids) == 0 {
		return true
	}

	allow := make(map[string]struct{}, len(allowed))
	for _, v := range allowed {
		allow[v] = struct{}{}
	}

	for _, id := range ids {
		if _, ok := allow[id]; !ok {
			return false
		}
	}

	return true
}

func (r *WeiboRepository) GetBiesMap(byIDs []string) (map[string]By, error) {
	var bies = map[string]By{
		"88": {
			Id:    88,
			URL:   "",
			Title: "手机客户端",
		},
		"89": {
			Id:    89,
			URL:   "",
			Title: "Web浏览器",
		},
	}
	if onlyFromAllowed(byIDs, []string{"88", "89"}) {
		return bies, nil
	}
	rows, err := r.DB.Query(fmt.Sprintf("select id, title, url  from bies where id in (%s)", strings.Join(byIDs, ",")))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var by By
		err = rows.Scan(&by.Id, &by.Title, &by.URL)
		if err != nil {
			return nil, err
		}
		bies[strconv.Itoa(by.Id)] = by
	}

	return bies, nil
}

func (r *WeiboRepository) GetTSRsMap(thirdIDs []string, tp string) (map[string]TSR, error) {
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

func (r *WeiboRepository) GetRetweetsMap(retweetIds []string) (map[string]Weibo, error) {
	repostsMap := make(map[string]Weibo)
	if len(retweetIds) == 0 {
		return repostsMap, nil
	}

	var feedIds []string
	var repostIds []string
	for _, id := range retweetIds {
		if len(id) == 13 {
			feedIds = append(feedIds, id)
		} else {
			repostIds = append(repostIds, id)
		}
	}

	if len(feedIds) > 0 {
		// 构造查询参数占位符
		placeholders := make([]string, len(feedIds))
		args := make([]interface{}, len(feedIds))
		for i, id := range feedIds {
			placeholders[i] = "?"
			args[i] = id
		}

		query := fmt.Sprintf("SELECT id, content, uid, by_id, coordinates, location, comment_num, like_num, repost_num, type, url, tsr, time, retweet_id FROM feeds WHERE id IN (%s)", strings.Join(placeholders, ","))

		rows, err := r.DB.Query(query, args...)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		var feedRows []Weibo
		for rows.Next() {
			var weibo Weibo
			err := rows.Scan(&weibo.ID, &weibo.Content, &weibo.UID, &weibo.ByID, &weibo.Coordinates, &weibo.Location, &weibo.CommentNum, &weibo.LikeNum, &weibo.RepostNum, &weibo.Type, &weibo.URL, &weibo.TSR, &weibo.Time, &weibo.RetweetID)
			if err != nil {
				return nil, err
			}
			feedRows = append(feedRows, weibo)
		}

		// 转换为微博对象
		for _, weibo := range feedRows {
			repostsMap[weibo.ID] = weibo
		}
	}

	if len(repostIds) > 0 {
		// 构造查询参数占位符
		placeholders := make([]string, len(repostIds))
		args := make([]interface{}, len(repostIds))
		for i, id := range repostIds {
			placeholders[i] = "?"
			args[i] = id
		}

		query := fmt.Sprintf("SELECT id, content, repost_num, like_num, comment_num, uid, by_id, coordinates, location, time FROM retweets WHERE id IN (%s)", strings.Join(placeholders, ","))

		rows, err := r.DB.Query(query, args...)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		retweets := []Weibo{}
		for rows.Next() {
			var retweet Weibo
			err := rows.Scan(&retweet.ID, &retweet.Content, &retweet.RepostNum, &retweet.LikeNum, &retweet.CommentNum, &retweet.UID, &retweet.ByID, &retweet.Coordinates, &retweet.Location, &retweet.Time)
			if err != nil {
				return nil, err
			}
			retweets = append(retweets, retweet)
		}

		// 构建微博对象
		for _, item := range retweets {
			weibo := Weibo{
				ID:         item.ID,
				Type:       1,
				Content:    item.Content,
				CommentNum: item.CommentNum,
				LikeNum:    item.LikeNum,
				RepostNum:  item.RepostNum,
				Time:       item.Time,
				UID:        item.UID,
				TSR:        0,
			}

			repostsMap[weibo.ID] = weibo
		}
	}

	return repostsMap, nil
}

func (r *WeiboRepository) GetAttachmentsMap(attachmentIds []string, tp string) (map[string][]Media, error) {
	if len(attachmentIds) == 0 {
		return make(map[string][]Media), nil
	}

	query := fmt.Sprintf("select third_id, picture from pictures where type = ? and third_id in ('%s')",
		strings.Join(attachmentIds, "','"))

	// 查询媒体文件并关联到对应的微博
	pictureRows, err := r.DB.Query(query, tp)
	if err != nil {
		return nil, err
	}
	defer pictureRows.Close()

	// 创建一个map来存储每个微博的媒体文件
	weiboMediaMap := make(map[string][]Media)
	for pictureRows.Next() {
		var thirdID string
		var pictureData string
		err := pictureRows.Scan(&thirdID, &pictureData)
		if err != nil {
			return nil, err
		}

		var media Media
		err = json.Unmarshal([]byte(pictureData), &media)
		if err != nil {
			return nil, err
		}
		if media.LivePhoto != "" {
			media.Origin = media.LivePhoto
		}
		// 将媒体文件添加到对应微博的媒体列表中
		weiboMediaMap[thirdID] = append(weiboMediaMap[thirdID], media)
	}
	return weiboMediaMap, nil
}

func (r *WeiboRepository) MarkWeibo(id string, status int) error {
	_, err := r.DB.Exec("INSERT INTO business.feed_mark (id, status, created_at) VALUES (?, ?, ?)",
		id, status, time.Now().Format(time.DateTime))
	return err
}

func (r *WeiboRepository) GetRandomWeibos(uids []string, perPage int) ([]Weibo, error) {
	// 创建标记表（如果不存在）
	_, err := r.DB.Exec(`CREATE TABLE IF NOT EXISTS business.feed_mark(
		id INTEGER PRIMARY KEY,
		status int default 0,
		created_at TEXT
	)`)
	if err != nil {
		return nil, err
	}

	// 构建查询
	uidStr := ""
	for i, uid := range uids {
		if i > 0 {
			uidStr += ","
		}
		uidStr += "'" + uid + "'"
	}

	query := fmt.Sprintf("SELECT feeds.id, feeds.content, feeds.uid, feeds.by_id, feeds.location, feeds.comment_num, feeds.like_num, feeds.repost_num, feeds.type, feeds.url, feeds.tsr, feeds.retweet_id, time FROM main.feeds as feeds left join business.feed_mark as mark on mark.id=feeds.id where mark.id is null and feeds.uid in (%s) ORDER BY RANDOM() DESC LIMIT ?", uidStr)

	rows, err := r.DB.Query(query, perPage)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var weibos []Weibo
	for rows.Next() {
		var weibo Weibo
		err := rows.Scan(&weibo.ID, &weibo.Content, &weibo.UID, &weibo.ByID, &weibo.Location, &weibo.CommentNum, &weibo.LikeNum, &weibo.RepostNum, &weibo.Type, &weibo.URL, &weibo.TSR, &weibo.RetweetID, &weibo.Time)
		if err != nil {
			return nil, err
		}
		weibos = append(weibos, weibo)
	}

	return weibos, nil
}

func (r *WeiboRepository) getTimeCondition(startTime, endTime string) string {
	var conditions []string

	if startTime != "" {
		if t, err := time.Parse(time.DateTime, startTime); err == nil {
			conditions = append(conditions, fmt.Sprintf("feeds.time >= '%s'", t.Format("2006-01-02 15:04:05")))
		}
	}

	if endTime != "" {
		if t, err := time.Parse(time.DateTime, endTime); err == nil {
			conditions = append(conditions, fmt.Sprintf("feeds.time <= '%s'", t.Format("2006-01-02 15:04:05")))
		}
	}

	if len(conditions) > 0 {
		return strings.Join(conditions, " AND ")
	}

	return ""
}

func (r *WeiboRepository) GetDB() *sql.DB {
	return r.DB
}
