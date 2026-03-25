package weibo

// 微博结构体
type Weibo struct {
	ID          string `json:"id"`
	LinkHref    string `json:"link_href"`
	URL         string `json:"url"`
	UID         string `json:"uid"`
	Time        string `json:"time"`
	Content     string `json:"content"`
	Coordinates string `json:"coordinates"`
	Location    string `json:"location"`
	CommentNum  int    `json:"comment_num"`
	LikeNum     int    `json:"like_num"`
	RepostNum   int    `json:"repost_num"`
	ByID        int    `json:"by_id"`
	RetweetID   string `json:"retweet_id"`
	Type        int    `json:"type"`
	TSR         int    `json:"tsr"`
	TSRInfo     TSR    `json:"tsr_info"`
}

// 媒体结构体
type Media struct {
	Mime          string `json:"Mime"`
	Origin        string `json:"Origin"`
	LivePhoto     string `json:"LivePhoto"`
	OriginSina    string `json:"OriginSina"`
	LivePhotoSina string `json:"LivePhotoSina"`
	IsLarge       int    `json:"IsLarge"`
}

// 用户结构体
type User struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

// 来源结构体
type By struct {
	Id    int    `json:"id"`
	URL   string `json:"url"`
	Title string `json:"title"`
}

// 评论结构体
type Comment struct {
	ID       string  `json:"id"`
	FeedID   string  `json:"feed_id"`
	UID      string  `json:"uid"`
	Content  string  `json:"content"`
	Location string  `json:"location"`
	Time     string  `json:"time"`
	TSR      int     `json:"tsr"`
	ReplyTo  *string `json:"reply_to"` // 指向被回复的评论
	TSRInfo  TSR     `json:"tsr_info"`
}

// 赞结构体
type Like struct {
	ID     string
	FeedID string `json:"feed_id"`
	UID    string `json:"uid"`
	Count  int    `json:"count"`
}

// 转发结构体
type BeenPosted struct {
	ID      string `json:"id"`
	FeedID  string `json:"feed_id"`
	UID     string `json:"uid"`
	Content string `json:"content"`
	Time    string `json:"time"`
}

// TSR结构体
type TSR struct {
	Type    string `json:"type"`
	ThirdID string `json:"third_id"`
	TSR     string `json:"tsr"`
}
