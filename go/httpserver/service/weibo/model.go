package weibo

import (
	"errors"
	"feehiapp/httpserver/repository/weibo"
	httpserverUtil "feehiapp/httpserver/util"
	"strconv"
	"strings"
	"time"
)

// 微博结构体
type Weibo struct {
	ID          string    `json:"id"`
	LinkHref    string    `json:"link_href"`
	URL         string    `json:"url"`
	UID         string    `json:"uid"`
	Time        time.Time `json:"time"`
	Content     string    `json:"content"`
	Location    *Location `json:"location"`
	CommentNum  int       `json:"comment_num"`
	LikeNum     int       `json:"like_num"`
	RepostNum   int       `json:"repost_num"`
	ByID        int       `json:"by_id"`
	RetweetID   string    `json:"retweet_id"`
	Type        int       `json:"type"`
	TSR         int       `json:"tsr"`
	Retweet     *Weibo
	Media       []Media
	User        User
	By          By
	TSRVerified bool
}

func (wb *Weibo) LoadFromRepoWeibo(repoWeibo weibo.Weibo) error {
	if wb == nil {
		return errors.New("nil receiver")
	}
	var location *Location
	if repoWeibo.Coordinates != "" {
		coordinates := strings.Split(repoWeibo.Coordinates, ",")
		if len(coordinates) != 2 {
			return errors.New("coordinates format error:" + repoWeibo.Coordinates)
		}
		longitude, err := strconv.ParseFloat(coordinates[0], 64)
		if err != nil {
			return err
		}
		latitude, err := strconv.ParseFloat(coordinates[1], 64)
		if err != nil {
			return err
		}
		location = &Location{
			Address: repoWeibo.Location,
			Coordinates: Coordinates{
				Longitude: longitude,
				Latitude:  latitude,
			},
		}
	}
	if repoWeibo.ID == "1741884923968" || repoWeibo.ID == "1743846080172" || repoWeibo.ID == "1744011193022" || repoWeibo.ID == "1744019487613" {
		repoWeibo.Time = strings.Replace(repoWeibo.Time, "Z", "+08:00", 1)
	}
	tm, err := time.ParseInLocation(time.RFC3339, repoWeibo.Time, httpserverUtil.TimeZone())
	if err != nil {
		return err
	}
	*wb = Weibo{
		ID:         repoWeibo.ID,
		LinkHref:   repoWeibo.LinkHref,
		URL:        repoWeibo.URL,
		UID:        repoWeibo.UID,
		Time:       tm,
		Content:    repoWeibo.Content,
		Location:   location,
		CommentNum: repoWeibo.CommentNum,
		LikeNum:    repoWeibo.LikeNum,
		RepostNum:  repoWeibo.RepostNum,
		ByID:       repoWeibo.ByID,
		RetweetID:  repoWeibo.RetweetID,
		Type:       repoWeibo.Type,
		TSR:        repoWeibo.TSR,
	}
	return nil
}

// 媒体结构体
type Media struct {
	Mime          string
	Origin        string
	LivePhoto     string
	OriginSina    string
	LivePhotoSina string
	IsLarge       int
}

// 用户结构体
type User struct {
	ID     string
	Name   string
	Avatar string
}

// 位置结构体
type Location struct {
	Address     string
	Coordinates Coordinates
}

// 坐标结构体
type Coordinates struct {
	Longitude float64
	Latitude  float64
}

// 来源结构体
type By struct {
	Id    int
	URL   string
	Title string
}

// 评论结构体
type Comment struct {
	ID          string
	FeedID      string
	UID         string
	Content     string
	Location    *Location
	Media       []Media
	Time        time.Time
	TSR         int
	ReplyTo     *Comment // 指向被回复的评论
	User        User
	TSRVerified bool
}

func (comment *Comment) LoadFromRepoComment(repoComment weibo.Comment) error {
	var location *Location
	if repoComment.Location != "" {
		temp := strings.SplitN(repoComment.Location, ",", 3)
		if len(temp) == 3 {
			//return errors.New("location format error:" + repoComment.Location)

			longitude, err := strconv.ParseFloat(temp[0], 64)
			if err != nil {
				return err
			}
			latitude, err := strconv.ParseFloat(temp[1], 64)
			if err != nil {
				return err
			}
			location = &Location{
				Address: temp[2],
				Coordinates: Coordinates{
					Longitude: longitude,
					Latitude:  latitude,
				},
			}
		} else {
			location = &Location{Address: strings.ReplaceAll(repoComment.Location, "来自", "")}
		}
	}
	if repoComment.ID == "1745175971523" || repoComment.ID == "1756215012186" || repoComment.ID == "1765516832737" || repoComment.ID == "1765517503538" || repoComment.ID == "1765518157975" || repoComment.ID == "1765518659652" {
		repoComment.Time = strings.Replace(repoComment.Time, "Z", "+08:00", 1)
	}
	tm, err := time.ParseInLocation(time.RFC3339, repoComment.Time, httpserverUtil.TimeZone())
	if err != nil {
		return err
	}
	*comment = Comment{
		ID:       repoComment.ID,
		FeedID:   repoComment.FeedID,
		UID:      repoComment.UID,
		Content:  repoComment.Content,
		Location: location,
		Time:     tm,
		TSR:      repoComment.TSR,
	}
	return nil
}

// 赞结构体
type Like struct {
	ID     string
	FeedID string `json:"feed_id"`
	UID    string `json:"uid"`
	Count  int    `json:"count"`
	User   User
}

// 转发结构体
type BeenPosted struct {
	ID      string    `json:"id"`
	FeedID  string    `json:"feed_id"`
	UID     string    `json:"uid"`
	Content string    `json:"content"`
	Time    time.Time `json:"time"`
	User    User
}

// TSR结构体
type TSR struct {
	Type    string
	ThirdID string
	TSR     string
}
