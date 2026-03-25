package weibo

import (
	"feehiapp/httpserver/service/weibo"
	"html/template"
)

type Weibo struct {
	weibo.Weibo
	Retweet     *Weibo
	ContentHTML template.HTML
}

func convertToWeibo(serviceWb weibo.Weibo) Weibo {
	var retweet *Weibo
	if serviceWb.Retweet != nil {
		temp := convertToWeibo(*serviceWb.Retweet)
		retweet = &temp
	}
	return Weibo{
		Weibo:       serviceWb,
		Retweet:     retweet,
		ContentHTML: GetContent(serviceWb.Content),
	}
}

type Comment struct {
	weibo.Comment
	ReplyTo     *Comment
	ContentHTML template.HTML
}

func convertToComment(serviceComment weibo.Comment) Comment {
	var replyTo *Comment
	if serviceComment.ReplyTo != nil {
		temp := convertToComment(*serviceComment.ReplyTo)
		replyTo = &temp
	}
	return Comment{
		Comment:     serviceComment,
		ReplyTo:     replyTo,
		ContentHTML: GetContent(serviceComment.Content),
	}
}
