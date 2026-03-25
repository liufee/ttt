package srv

import (
	serviceWeibo "feehiapp/httpserver/service/weibo"
	"time"
)

// 微博结构体
type Weibo struct {
	ID          string    `json:"id"`
	Type        int       `json:"type"`
	Content     string    `json:"text"`
	Media       []Media   `json:"media"`
	Comments    []Comment `json:"comments"`
	RepostNum   int       `json:"forwardCount"`
	LikeNum     int       `json:"likeCount"`
	CommentNum  int       `json:"commentCount"`
	CreatedAt   string    `json:"createdAt"`
	UID         string    `json:"uid"`
	User        User      `json:"user"`
	Retweet     *Weibo    `json:"repost"`
	Coordinates string    `json:"coordinates"`
	Location    *Location `json:"location"`
	By          By        `json:"by"`
	TSR         int       `json:"tsr"`
	TSRVerified int       `json:"tsrVerified"`
}

// 媒体结构体
type Media struct {
	Mime      string `json:"Mime"`
	Origin    string `json:"Origin"`
	LivePhoto string `json:"LivePhoto"`
	IsLarge   int    `json:"IsLarge"`
}

// 评论结构体
type Comment struct {
	ID             string    `json:"id"`
	Content        string    `json:"text"`
	User           User      `json:"author"`
	Location       *Location `json:"location"`
	Media          []Media   `json:"media"`
	ReplyToComment *Comment  `json:"replyToComment"`
	CreatedAt      string    `json:"createdAt"`
	TSR            int       `json:"tsr"`
	TSRVerified    int       `json:"tsrVerified"`
}

// 用户结构体
type User struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

// 位置结构体
type Location struct {
	Address     string      `json:"address"`
	Coordinates Coordinates `json:"coordinates"`
}

// 坐标结构体
type Coordinates struct {
	Longitude float64
	Latitude  float64
}

// 赞结构体
type Like struct {
	ID    string `json:"id"`
	User  User   `json:"user"`
	Count int    `json:"count"`
}

// 来源结构体
type By struct {
	Id    int    `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

// 转发结构体
type BeenPosted struct {
	ID        string `json:"id"`
	User      User   `json:"user"`
	Content   string `json:"text"`
	CreatedAt string `json:"time"`
}

func convertToServiceWeibos(wbs []*Weibo) ([]*serviceWeibo.Weibo, error) {
	var serviceWeibos = make([]*serviceWeibo.Weibo, len(wbs))
	var err error
	for idx, wb := range wbs {
		serviceWeibos[idx], err = convertToServiceWeibo(wb)
		if err != nil {
			return nil, err
		}
	}
	return serviceWeibos, nil
}
func convertToServiceWeibo(wb *Weibo) (*serviceWeibo.Weibo, error) {
	retweetId := ""
	if wb.Retweet != nil && wb.Retweet.ID != "" {
		retweetId = wb.Retweet.ID
	}
	createdAt := time.Time{}
	if wb.CreatedAt != "" {
		var err error
		createdAt, err = time.Parse("2006-01-02 15:04:05", wb.CreatedAt)
		if err != nil {
			return nil, err
		}
	}
	var retweet *serviceWeibo.Weibo
	if wb.Retweet != nil && wb.Retweet.ID != "" {
		var err error
		retweet, err = convertToServiceWeibo(wb.Retweet)
		if err != nil {
			return nil, err
		}
	}
	media := make([]serviceWeibo.Media, len(wb.Media))
	for idx, item := range wb.Media {
		media[idx] = serviceWeibo.Media{
			Mime:          item.Mime,
			Origin:        item.Origin,
			LivePhoto:     item.LivePhoto,
			IsLarge:       item.IsLarge,
			OriginSina:    "",
			LivePhotoSina: "",
		}
	}
	var location *serviceWeibo.Location
	if wb.Location != nil {
		location = &serviceWeibo.Location{
			Address: wb.Location.Address,
			Coordinates: serviceWeibo.Coordinates{
				Longitude: wb.Location.Coordinates.Longitude,
				Latitude:  wb.Location.Coordinates.Latitude,
			},
		}
	}
	return &serviceWeibo.Weibo{
		ID:         wb.ID,
		LinkHref:   "",
		URL:        "",
		UID:        wb.UID,
		Time:       createdAt,
		Content:    wb.Content,
		Location:   location,
		CommentNum: wb.CommentNum,
		LikeNum:    wb.LikeNum,
		RepostNum:  wb.RepostNum,
		ByID:       wb.By.Id,
		RetweetID:  retweetId,
		Type:       wb.Type,
		TSR:        wb.TSR,
		Retweet:    retweet,
		Media:      media,
		User: serviceWeibo.User{
			ID:     wb.User.ID,
			Name:   wb.User.Name,
			Avatar: wb.User.Avatar,
		},
		By: serviceWeibo.By{
			Id:    wb.By.Id,
			URL:   wb.By.URL,
			Title: wb.By.Title,
		},
		TSRVerified: intToBool(wb.TSRVerified),
	}, nil
}
func convertToWeibo(serviceWb serviceWeibo.Weibo) Weibo {
	media := make([]Media, len(serviceWb.Media))
	for idx, item := range serviceWb.Media {
		media[idx] = Media{
			Mime:      item.Mime,
			Origin:    item.Origin,
			LivePhoto: item.LivePhoto,
			IsLarge:   item.IsLarge,
		}
	}
	var retweet *Weibo
	if serviceWb.Retweet != nil {
		temp := convertToWeibo(*serviceWb.Retweet)
		retweet = &temp
	}
	var location *Location
	if serviceWb.Location != nil {
		location = &Location{
			Address: serviceWb.Location.Address,
			Coordinates: Coordinates{
				Longitude: serviceWb.Location.Coordinates.Longitude,
				Latitude:  serviceWb.Location.Coordinates.Latitude,
			},
		}
	}
	return Weibo{
		ID:         serviceWb.ID,
		Type:       serviceWb.Type,
		Content:    serviceWb.Content,
		Media:      media,
		Comments:   []Comment{},
		RepostNum:  serviceWb.RepostNum,
		LikeNum:    serviceWb.LikeNum,
		CommentNum: serviceWb.CommentNum,
		CreatedAt:  serviceWb.Time.Format("2006-01-02 15:04:05"),
		UID:        serviceWb.UID,
		User: User{
			ID:     serviceWb.User.ID,
			Name:   serviceWb.User.Name,
			Avatar: serviceWb.User.Avatar,
		},
		Retweet:  retweet,
		Location: location,
		By: By{
			Id:    serviceWb.By.Id,
			Title: serviceWb.By.Title,
			URL:   serviceWb.By.URL,
		},
		TSR:         serviceWb.TSR,
		TSRVerified: boolToInt(serviceWb.TSRVerified),
	}
}

func convertToWeibos(serviceWbs []serviceWeibo.Weibo) ([]Weibo, error) {
	var weibos = make([]Weibo, len(serviceWbs))
	var err error
	for idx, serviceWb := range serviceWbs {
		weibos[idx] = convertToWeibo(serviceWb)
		if err != nil {
			return nil, err
		}
	}
	return weibos, nil
}

func convertToServiceComment(comment Comment) (serviceWeibo.Comment, error) {
	createdAt := time.Time{}
	if comment.CreatedAt != "" {
		var err error
		createdAt, err = time.Parse("2006-01-02 15:04:05", comment.CreatedAt)
		if err != nil {
			return serviceWeibo.Comment{}, err
		}
	}
	var replyTo *serviceWeibo.Comment
	if comment.ReplyToComment != nil {
		temp, err := convertToServiceComment(*comment.ReplyToComment)
		if err != nil {
			return serviceWeibo.Comment{}, err
		}
		replyTo = &temp
	}
	media := make([]serviceWeibo.Media, len(comment.Media))
	for idx, item := range comment.Media {
		media[idx] = serviceWeibo.Media{
			Mime:          item.Mime,
			Origin:        item.Origin,
			LivePhoto:     item.LivePhoto,
			IsLarge:       item.IsLarge,
			OriginSina:    "",
			LivePhotoSina: "",
		}
	}
	var location *serviceWeibo.Location
	if comment.Location != nil {
		location = &serviceWeibo.Location{
			Address: comment.Location.Address,
			Coordinates: serviceWeibo.Coordinates{
				Longitude: comment.Location.Coordinates.Longitude,
				Latitude:  comment.Location.Coordinates.Latitude,
			},
		}
	}
	return serviceWeibo.Comment{
		ID:       comment.ID,
		FeedID:   "",
		UID:      comment.User.ID,
		Content:  comment.Content,
		Location: location,
		Media:    media,
		Time:     createdAt,
		TSR:      comment.TSR,
		ReplyTo:  replyTo,
		User: serviceWeibo.User{
			ID:     comment.User.ID,
			Name:   comment.User.Name,
			Avatar: comment.User.Avatar,
		},
		TSRVerified: intToBool(comment.TSRVerified),
	}, nil
}

func convertToServiceComments(comment []Comment) ([]serviceWeibo.Comment, error) {
	var serviceComments = make([]serviceWeibo.Comment, len(comment))
	var err error
	for idx, c := range comment {
		serviceComments[idx], err = convertToServiceComment(c)
		if err != nil {
			return nil, err
		}
	}
	return serviceComments, nil
}

func convertToComment(serviceComment serviceWeibo.Comment) Comment {
	createdAt := serviceComment.Time.Format("2006-01-02 15:04:05")
	var replyTo *Comment
	if serviceComment.ReplyTo != nil {
		temp := convertToComment(*serviceComment.ReplyTo)
		replyTo = &temp
	}
	media := make([]Media, len(serviceComment.Media))
	for idx, item := range serviceComment.Media {
		media[idx] = Media{
			Mime:      item.Mime,
			Origin:    item.Origin,
			LivePhoto: item.LivePhoto,
			IsLarge:   item.IsLarge,
		}
	}
	var location *Location
	if serviceComment.Location != nil {
		location = &Location{
			Address: serviceComment.Location.Address,
			Coordinates: Coordinates{
				Longitude: serviceComment.Location.Coordinates.Longitude,
				Latitude:  serviceComment.Location.Coordinates.Latitude,
			},
		}
	}
	return Comment{
		ID:      serviceComment.ID,
		Content: serviceComment.Content,
		User: User{
			ID:     serviceComment.User.ID,
			Name:   serviceComment.User.Name,
			Avatar: serviceComment.User.Avatar,
		},
		Location:       location,
		Media:          media,
		ReplyToComment: replyTo,
		CreatedAt:      createdAt,
		TSR:            serviceComment.TSR,
		TSRVerified:    boolToInt(serviceComment.TSRVerified),
	}
}

func convertToComments(serviceComments []serviceWeibo.Comment) []Comment {
	var comments = make([]Comment, len(serviceComments))
	for idx, c := range serviceComments {
		comments[idx] = convertToComment(c)
	}
	return comments
}

func convertToLikes(serviceLikes []serviceWeibo.Like) []Like {
	var likes = make([]Like, len(serviceLikes))
	for idx, like := range serviceLikes {
		likes[idx] = Like{
			ID: like.ID,
			User: User{
				ID:     like.User.ID,
				Name:   like.User.Name,
				Avatar: like.User.Avatar,
			},
			Count: like.Count,
		}
	}
	return likes
}

func convertToBeenPosted(serviceBeenPostes []serviceWeibo.BeenPosted) []BeenPosted {
	var beenPosteds = make([]BeenPosted, len(serviceBeenPostes))
	for idx, serviceBeenPost := range serviceBeenPostes {
		beenPosteds[idx] = BeenPosted{
			ID: serviceBeenPost.ID,
			User: User{
				ID:     serviceBeenPost.User.ID,
				Name:   serviceBeenPost.User.Name,
				Avatar: serviceBeenPost.User.Avatar,
			},
			Content:   serviceBeenPost.Content,
			CreatedAt: serviceBeenPost.Time.Format("2006-01-02 15:04:05"),
		}
	}
	return beenPosteds
}
