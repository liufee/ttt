package weibo

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"feehiapp/httpserver/repository/weibo"
	httpserverUtil "feehiapp/httpserver/util"
	"feehiapp/util"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const TimeFormat = "2006-01-02 15:04:05-07:00"

type WeiboService struct {
	basePath      string
	largeBasePath string
	repo          *weibo.WeiboRepository
}

func NewWeiboService(dbWeibo *sql.DB, basePath string, largeBasePath string) *WeiboService {
	return &WeiboService{repo: weibo.NewWeiboRepository(dbWeibo), basePath: basePath, largeBasePath: largeBasePath}
}

func (s *WeiboService) Init(businessDB string) error {
	return s.repo.Init(businessDB)
}

func (s *WeiboService) DeleteWeibo(id string) error {
	wb, err := s.GetWeiboByID(id)
	if err != nil {
		return err
	}
	for _, media := range wb.Media {
		err := RemoveFileAndEmptyDirs(s.assembleAbsoluteMediaPath(media))
		if err != nil {
			return err
		}
	}
	return s.repo.DeleteWeibo(id, wb.RetweetID)
}

func (s *WeiboService) DeleteComment(id string, feedID string) error {
	return s.repo.DeleteComment(id, feedID)
}

func (s *WeiboService) CreateWeibo(weiboObj Weibo, UploadMedia func(feedId string, uid string) ([]Media, error)) error {
	now := time.Now()
	weiboId := strconv.FormatInt(now.UnixMilli(), 10)

	media, err := UploadMedia(weiboId, weiboObj.UID)
	if err != nil {
		return err
	}

	var repoMedia []weibo.Media
	for _, m := range media {
		repoMedia = append(repoMedia, weibo.Media{
			Mime:          m.Mime,
			Origin:        m.Origin,
			IsLarge:       m.IsLarge,
			LivePhoto:     m.LivePhoto,
			OriginSina:    m.OriginSina,
			LivePhotoSina: m.LivePhotoSina,
		})
	}

	tsrData := ""
	if weiboObj.TSR == 1 {
		weiboObj.Time = now
		weiboObj.Media = media
		originStr, err := s.AssembleCreateTSRStr("feed", &weiboObj, nil)
		if err != nil {
			return err
		}
		tsrData = util.GenerateTSR(originStr)
		if strings.HasPrefix(tsrData, "error:") {
			return fmt.Errorf("generate tsr failed: %s", tsrData)
		}
	}
	coordinates := ""
	address := ""
	if weiboObj.Location != nil {
		coordinates = fmt.Sprintf("%v,%v", weiboObj.Location.Coordinates.Longitude, weiboObj.Location.Coordinates.Latitude)
		address = weiboObj.Location.Address
	}

	repoWeibo := weibo.Weibo{
		ID:          weiboId,
		LinkHref:    weiboObj.LinkHref,
		URL:         weiboObj.URL,
		UID:         weiboObj.UID,
		Time:        now.In(httpserverUtil.TimeZone()).Format(TimeFormat),
		Content:     weiboObj.Content,
		Coordinates: coordinates,
		Location:    address,
		CommentNum:  weiboObj.CommentNum,
		LikeNum:     weiboObj.LikeNum,
		RepostNum:   weiboObj.RepostNum,
		ByID:        weiboObj.ByID,
		RetweetID:   weiboObj.RetweetID,
		Type:        weiboObj.Type,
		TSR:         weiboObj.TSR,
		TSRInfo: weibo.TSR{
			Type:    "feed",
			ThirdID: weiboId,
			TSR:     tsrData,
		},
	}

	return s.repo.CreateWeibo(repoWeibo, repoMedia)
}

func (s *WeiboService) CreateComment(comment Comment, UploadMedia func(feedId string, commentId string, uid string) ([]Media, error)) error {
	var replyToString *string
	if comment.ReplyTo != nil {
		replyToString = &comment.ReplyTo.ID
	}

	now := time.Now()
	commentID := strconv.FormatInt(now.UnixMilli(), 10)

	media, err := UploadMedia(comment.FeedID, commentID, comment.UID)
	if err != nil {
		return err
	}

	tsrData := ""
	if comment.TSR == 1 {
		originSTR, err := s.AssembleCreateTSRStr("comment", nil, &Comment{
			Time:    now,
			Content: comment.Content,
			Media:   media,
		})
		if err != nil {
			return err
		}
		tsrData = util.GenerateTSRWithMediaV2(originSTR, "")
		if strings.HasPrefix(tsrData, "error:") {
			return fmt.Errorf("generate tsr failed: %s", tsrData)
		}
	}

	var repoMedia []weibo.Media
	for _, m := range media {
		repoMedia = append(repoMedia, weibo.Media{
			Mime:          m.Mime,
			Origin:        m.Origin,
			LivePhoto:     m.LivePhoto,
			OriginSina:    m.OriginSina,
			LivePhotoSina: m.LivePhotoSina,
			IsLarge:       m.IsLarge,
		})
	}

	location := ""
	if comment.Location != nil {
		location = fmt.Sprintf("%v,%v,%s", comment.Location.Coordinates.Longitude, comment.Location.Coordinates.Latitude, comment.Location.Address)
	}

	repoComment := weibo.Comment{
		ID:       commentID,
		FeedID:   comment.FeedID,
		UID:      comment.UID,
		Content:  comment.Content,
		Location: location,
		Time:     now.In(httpserverUtil.TimeZone()).Format(TimeFormat),
		TSR:      comment.TSR,
		ReplyTo:  replyToString,
		TSRInfo: weibo.TSR{
			Type:    "comment",
			ThirdID: commentID,
			TSR:     tsrData,
		},
	}

	return s.repo.CreateComment(repoComment, repoMedia)
}

func (s *WeiboService) GetWeiboList(uids []string, page int, perPage int, keyword string, startTime string, endTime string, sortOrder string) ([]Weibo, int, error) {
	repoWeibos, total, err := s.repo.GetWeiboList(uids, page, perPage, keyword, startTime, endTime, sortOrder)
	if err != nil {
		return nil, 0, err
	}

	var serviceWeibos = []Weibo{}
	for _, rw := range repoWeibos {
		var sw = Weibo{}
		err = sw.LoadFromRepoWeibo(rw)
		if err != nil {
			return nil, 0, err
		}
		serviceWeibos = append(serviceWeibos, sw)
	}

	err = s.enrichWeibosBatch(serviceWeibos)
	if err != nil {
		return nil, 0, err
	}

	return serviceWeibos, total, nil
}

func (s *WeiboService) GetWeiboByID(id string) (*Weibo, error) {
	repoWeibo, err := s.repo.GetWeiboByID(id)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if repoWeibo == nil {
		repoWeibo, err = s.repo.GetCompatibleRetweetByID(id)
		if err != nil {
			return nil, err
		}
	}

	var serviceWeibo = Weibo{}
	err = serviceWeibo.LoadFromRepoWeibo(*repoWeibo)
	if err != nil {
		return nil, err
	}
	var serviceWeibos = []Weibo{serviceWeibo}
	err = s.enrichWeibosBatch(serviceWeibos)
	if err != nil {
		return nil, err
	}

	return &serviceWeibos[0], nil
}

func (s *WeiboService) enrichWeiboWithData(weibo *Weibo, usersMap map[string]User, biesMap map[string]By, attachmentsMap map[string][]Media, retweetsMap map[string]Weibo, tsrsMap map[string]TSR) error {
	var err error

	// 填充用户信息
	if user, exists := usersMap[weibo.UID]; exists {
		weibo.User = user
	}

	// 填充来源信息
	if by, exists := biesMap[strconv.Itoa(weibo.ByID)]; exists {
		weibo.By = by
	}

	// 填充附件信息
	if mediaList, exists := attachmentsMap[weibo.ID]; exists {
		weibo.Media = mediaList
	}

	// 填充转发微博
	if weibo.RetweetID != "" {
		if retweet, exists := retweetsMap[weibo.RetweetID]; exists {
			// 填充转发微博的用户信息
			if u, ok := usersMap[retweet.UID]; ok {
				retweet.User = u
			}
			weibo.Retweet = &retweet
		}
	}

	// TSR验证
	if weibo.TSR == 1 {
		if tsr, exists := tsrsMap[weibo.ID]; exists {
			weibo.TSRVerified, err = s.getTsrVerify(*weibo, tsr)
			if err != nil {
				return err
			}
		}
	}

	// 如果有转发微博，也进行TSR验证
	if weibo.Retweet != nil && weibo.Retweet.TSR == 1 {
		if tsr, exists := tsrsMap[weibo.Retweet.ID]; exists {
			weibo.Retweet.TSRVerified, err = s.getTsrVerify(*weibo.Retweet, tsr)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *WeiboService) enrichWeibosBatch(weibos []Weibo) error {
	if len(weibos) == 0 {
		return nil
	}

	// 收集所有需要的ID
	var userIds []string
	var byIds []string
	var weiboIds []string
	var retweetIds []string

	userIdMap := make(map[string]bool)
	byIdMap := make(map[string]bool)
	weiboIdMap := make(map[string]bool)
	retweetIdMap := make(map[string]bool)

	for _, weibo := range weibos {
		// 收集用户ID
		if _, exists := userIdMap[weibo.UID]; !exists && weibo.UID != "" {
			userIds = append(userIds, weibo.UID)
			userIdMap[weibo.UID] = true
		}

		// 收集来源ID
		byIdStr := strconv.Itoa(weibo.ByID)
		if _, exists := byIdMap[byIdStr]; !exists && byIdStr != "0" {
			byIds = append(byIds, byIdStr)
			byIdMap[byIdStr] = true
		}

		// 收集微博ID（用于获取附件）
		if _, exists := weiboIdMap[weibo.ID]; !exists && weibo.ID != "" {
			weiboIds = append(weiboIds, weibo.ID)
			weiboIdMap[weibo.ID] = true
		}

		// 收集转发微博ID
		if _, exists := retweetIdMap[weibo.RetweetID]; !exists && weibo.RetweetID != "" {
			retweetIds = append(retweetIds, weibo.RetweetID)
			retweetIdMap[weibo.RetweetID] = true
		}
	}

	// 批量获取转发微博
	retweetsMap, err := s.GetRetweetsMap(retweetIds)
	if err != nil {
		return err
	}

	// 收集转发用户ID
	for _, retweet := range retweetsMap {
		if _, exists := userIdMap[retweet.UID]; !exists && retweet.UID != "" {
			userIds = append(userIds, retweet.UID)
			userIdMap[retweet.UID] = true
		}
	}

	// 批量获取用户信息
	usersMap, err := s.GetUsersMap(userIds)
	if err != nil {
		return err
	}

	// 批量获取来源信息
	biesMap, err := s.GetBiesMap(byIds)
	if err != nil {
		return err
	}

	// 批量获取附件信息
	attachmentsMap, err := s.GetAttachmentsMap(weiboIds, "feed")
	if err != nil {
		return err
	}

	// 收集需要TSR验证的微博ID
	var tsrWeiboIds []string
	tsrWeiboIdMap := make(map[string]bool)

	for _, weibo := range weibos {
		if weibo.TSR == 1 {
			if _, exists := tsrWeiboIdMap[weibo.ID]; !exists && weibo.ID != "" {
				tsrWeiboIds = append(tsrWeiboIds, weibo.ID)
				tsrWeiboIdMap[weibo.ID] = true
			}
		}

		// 检查转发微博是否需要TSR验证
		if weibo.RetweetID != "" {
			if retweet, ok := retweetsMap[weibo.RetweetID]; ok && retweet.TSR == 1 {
				if _, exists := tsrWeiboIdMap[weibo.RetweetID]; !exists {
					tsrWeiboIds = append(tsrWeiboIds, weibo.RetweetID)
					tsrWeiboIdMap[weibo.RetweetID] = true
				}
			}
		}
	}

	// 批量获取TSR信息
	tsrsMap, err := s.GetTSRsMap(tsrWeiboIds, "feed")
	if err != nil {
		return err
	}

	// 填充微博数据
	for i := range weibos {
		weibo := &weibos[i]
		err := s.enrichWeiboWithData(weibo, usersMap, biesMap, attachmentsMap, retweetsMap, tsrsMap)
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *WeiboService) enrichCommentWithData(comment *Comment, usersMap map[string]User, replyToUsersMap map[string]User, attachmentsMap map[string][]Media, tsrsMap map[string]TSR) error {
	var err error

	// 填充用户信息
	if user, exists := usersMap[comment.UID]; exists {
		comment.User = user
	}

	// 填充回复用户信息
	if comment.ReplyTo != nil && comment.ReplyTo.ID != "" {
		if user, exists := replyToUsersMap[comment.ReplyTo.UID]; exists {
			comment.ReplyTo.User = user
		}
		if attachments, exists := attachmentsMap[comment.ReplyTo.ID]; exists {
			comment.ReplyTo.Media = attachments
		}
	}

	// 填充附件信息
	if attachments, exists := attachmentsMap[comment.ID]; exists {
		comment.Media = attachments
	}

	// TSR验证
	if comment.TSR == 1 {
		if tsr, exists := tsrsMap[comment.ID]; exists {
			comment.TSRVerified, err = s.getCommentTsrVerify(*comment, tsr)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *WeiboService) enrichCommentsBatch(comments []Comment) error {
	if len(comments) == 0 {
		return nil
	}

	// 收集所有需要的ID
	var commentIds []string
	var userIds []string
	var replyToUserIds []string
	var tsrCommentIds []string

	userIdMap := make(map[string]bool)
	replyToUserIdMap := make(map[string]bool)
	tsrCommentIdMap := make(map[string]bool)

	for _, comment := range comments {
		// 收集评论 id
		commentIds = append(commentIds, comment.ID)

		if comment.ReplyTo != nil {
			commentIds = append(commentIds, comment.ReplyTo.ID)

			// 收集回复用户ID
			if comment.ReplyTo.UID != "" {
				if _, exists := replyToUserIdMap[comment.ReplyTo.UID]; !exists {
					replyToUserIds = append(replyToUserIds, comment.ReplyTo.UID)
					replyToUserIdMap[comment.ReplyTo.UID] = true
				}
			}
		}

		// 收集用户ID
		if _, exists := userIdMap[comment.UID]; !exists && comment.UID != "" {
			userIds = append(userIds, comment.UID)
			userIdMap[comment.UID] = true
		}

		// 收集需要TSR验证的评论ID
		if comment.TSR == 1 {
			if _, exists := tsrCommentIdMap[comment.ID]; !exists && comment.ID != "" {
				tsrCommentIds = append(tsrCommentIds, comment.ID)
				tsrCommentIdMap[comment.ID] = true
			}
		}
	}

	// 批量获取用户信息
	usersMap, err := s.GetUsersMap(userIds)
	if err != nil {
		return err
	}

	// 批量获取回复用户信息
	replyToUsersMap, err := s.GetUsersMap(replyToUserIds)
	if err != nil {
		return err
	}

	// 批量获取附件信息
	attachmentsMap, err := s.GetAttachmentsMap(commentIds, "comment")
	if err != nil {
		if err != nil {
			return err
		}
	}

	// 批量获取TSR信息
	tsrsMap, err := s.GetTSRsMap(tsrCommentIds, "comment")
	if err != nil {
		return err
	}

	// 填充评论数据
	for i := range comments {
		comment := &comments[i]
		err := s.enrichCommentWithData(comment, usersMap, replyToUsersMap, attachmentsMap, tsrsMap)
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *WeiboService) GetCommentByID(commentID string) (*Comment, error) {
	rc, err := s.repo.GetCommentByID(commentID)
	if err != nil {
		return nil, err
	}
	if rc == nil {
		return nil, nil
	}

	var sc = Comment{}
	err = sc.LoadFromRepoComment(*rc)
	if rc == nil {
		return nil, nil
	}

	if rc.ReplyTo != nil && *rc.ReplyTo != "" {
		replyToEntities, err := s.repo.GetCommentsByIDs([]string{*rc.ReplyTo})
		if err != nil {
			return nil, err
		}
		if len(replyToEntities) > 0 {
			var replyTo = Comment{}
			err = replyTo.LoadFromRepoComment(*replyToEntities[0])
			if err != nil {
				return nil, err
			}
			sc.ReplyTo = &replyTo
		}
	}

	var comments = []Comment{sc}
	// enrichCommentsBatch 接收 slice，这里复用，避免重复逻辑
	if err := s.enrichCommentsBatch(comments); err != nil {
		return nil, err
	}

	return &comments[0], nil
}

func (s *WeiboService) GetCommentsByFeedID(feedID string) ([]Comment, error) {
	repoComments, err := s.repo.GetCommentsByFeedID(feedID)
	if err != nil {
		return nil, err
	}

	var serviceComments = []Comment{}
	replyToIDSet := make(map[string]struct{})
	for _, rc := range repoComments {
		var sc = Comment{}
		err = sc.LoadFromRepoComment(rc)
		if err != nil {
			return nil, err
		}

		if rc.ReplyTo != nil && *rc.ReplyTo != "" {
			sc.ReplyTo = &Comment{ID: *rc.ReplyTo}
			replyToIDSet[*rc.ReplyTo] = struct{}{}
		}

		serviceComments = append(serviceComments, sc)
	}

	var replyToIDs []string
	for id := range replyToIDSet {
		replyToIDs = append(replyToIDs, id)
	}

	replyToEntities, err := s.repo.GetCommentsByIDs(replyToIDs)
	if err != nil {
		return nil, err
	}

	replyToMap := make(map[string]Comment)
	for _, rc := range replyToEntities {
		var sc = Comment{}
		err = sc.LoadFromRepoComment(*rc)
		if err != nil {
			return nil, err
		}
		replyToMap[rc.ID] = sc
	}

	for i := range serviceComments {
		if serviceComments[i].ReplyTo != nil {
			if r, ok := replyToMap[serviceComments[i].ReplyTo.ID]; ok {
				serviceComments[i].ReplyTo = &r
			}
		}
	}
	err = s.enrichCommentsBatch(serviceComments)
	if err != nil {
		return nil, err
	}

	return serviceComments, nil
}

func (s *WeiboService) GetLikesByFeedID(feedID string) ([]Like, error) {
	repoLikes, err := s.repo.GetLikesByFeedID(feedID)
	if err != nil {
		return nil, err
	}

	var likes []Like = []Like{}
	var userIDs []string
	userIDMap := make(map[string]bool)

	for _, rl := range repoLikes {
		sl := Like{
			ID:     rl.ID,
			FeedID: rl.FeedID,
			UID:    rl.UID,
			Count:  rl.Count,
		}

		likes = append(likes, sl)

		if rl.UID != "" && !userIDMap[rl.UID] {
			userIDs = append(userIDs, rl.UID)
			userIDMap[rl.UID] = true
		}
	}

	// 批量补 user
	usersMap, err := s.GetUsersMap(userIDs)
	if err != nil {
		return nil, err
	}

	for i := range likes {
		if user, ok := usersMap[likes[i].UID]; ok {
			likes[i].User = user
		}
	}

	return likes, nil
}

func (s *WeiboService) GetBeenRepostedByFeedID(feedID string) ([]BeenPosted, error) {
	repoPosts, err := s.repo.GetBeenRepostedByFeedID(feedID)
	if err != nil {
		return nil, err
	}

	var beenReposted = []BeenPosted{}
	var userIDs []string
	userIDMap := make(map[string]bool)
	for _, rp := range repoPosts {
		tm, err := time.ParseInLocation(time.RFC3339, rp.Time, httpserverUtil.TimeZone())
		if err != nil {
			return nil, err
		}
		sp := BeenPosted{
			ID:      rp.ID,
			FeedID:  rp.FeedID,
			UID:     rp.UID,
			Content: rp.Content,
			Time:    tm,
		}

		beenReposted = append(beenReposted, sp)

		if rp.UID != "" && !userIDMap[rp.UID] {
			userIDs = append(userIDs, rp.UID)
			userIDMap[rp.UID] = true
		}
	}

	// 批量补 user
	usersMap, err := s.GetUsersMap(userIDs)
	if err != nil {
		return nil, err
	}

	for i := range beenReposted {
		if user, ok := usersMap[beenReposted[i].UID]; ok {
			beenReposted[i].User = user
		}
	}

	return beenReposted, nil
}

func (h *WeiboService) AssembleCreateTSRStr(tp string, weibo *Weibo, comment *Comment) (string, error) {
	if tp == "comment" {
		cutoffTime, _ := time.ParseInLocation("2006-01-02", "2026-02-18", httpserverUtil.TimeZone())
		if comment.Time.Before(cutoffTime) {
			return fmt.Sprintf("%s+%s", comment.Time.In(httpserverUtil.TimeZone()).Format(time.DateTime), comment.Content), nil
		} else {
			var mediaTsrPath = ""
			for _, media := range comment.Media {
				if media.IsLarge == 1 {
					mediaTsrPath += path.Join(h.largeBasePath, media.Origin) + ","
				} else {
					mediaTsrPath += path.Join(h.basePath, media.Origin) + ","
				}
			}
			result := util.AssembleStrToCreateTSR(fmt.Sprintf("%s+%s+", comment.Time.In(httpserverUtil.TimeZone()).Format(time.DateTime), comment.Content), strings.TrimRight(mediaTsrPath, ","))
			if strings.HasPrefix(result, "error:") {
				return "", errors.New(result)
			}
			return result, nil
		}
	}

	var mediaTsrPath = ""
	for _, media := range weibo.Media {
		if media.IsLarge == 1 {
			mediaTsrPath += path.Join(h.largeBasePath, media.Origin) + ","
		} else {
			mediaTsrPath += path.Join(h.basePath, media.Origin) + ","
		}
	}
	mediaTsrPath = strings.TrimRight(mediaTsrPath, ",")

	var tm string
	if weibo.ID == "1743846080172" || weibo.ID == "1744011193022" {
		tm = weibo.Time.In(httpserverUtil.TimeZone()).Format("2006-01-02 15:04:05")
	} else {
		tm = weibo.Time.In(httpserverUtil.TimeZone()).Format(TimeFormat)
	}
	cutoffTime, _ := time.ParseInLocation("2006-01-02", "2025-12-18", httpserverUtil.TimeZone())
	if weibo.Time.Before(cutoffTime) {
		var mediaContent string
		if len(mediaTsrPath) > 0 {
			media := strings.Split(mediaTsrPath, ",")
			for _, m := range media {
				data, err := os.ReadFile(m)
				if err != nil {
					return "", err
				}
				mediaContent += base64.StdEncoding.EncodeToString(data)
			}
		}
		return fmt.Sprintf("%s+%s+%s", tm, weibo.Content, mediaContent), nil
	} else {
		return util.AssembleStrToCreateTSR(fmt.Sprintf("%s+%s+", tm, weibo.Content), strings.TrimRight(mediaTsrPath, ",")), nil
	}
}

func (h *WeiboService) getTsrVerify(weibo Weibo, tsr TSR) (bool, error) {
	if weibo.TSR != 1 {
		return false, nil
	}

	str := util.ParseTSR(tsr.TSR)
	type Cer struct {
		Name    string
		Content string
	}
	type Result struct {
		Time          string
		HashedMessage string
		HashAlgorithm string
		Certificates  []Cer
	}
	var result Result
	err := json.Unmarshal([]byte(str), &result)
	if err != nil {
		return false, err
	}

	originStr, err := h.AssembleCreateTSRStr("feed", &weibo, nil)
	if err != nil {
		return false, err
	}
	calculatedHash := util.CalculateHash(originStr, "")
	return calculatedHash == result.HashedMessage, nil
}

func (h *WeiboService) getCommentTsrVerify(comment Comment, tsr TSR) (bool, error) {
	if comment.TSR != 1 {
		return false, nil
	}
	str := util.ParseTSR(tsr.TSR)
	type Cer struct {
		Name    string
		Content string
	}
	type Result struct {
		Time          string
		HashedMessage string
		HashAlgorithm string
		Certificates  []Cer
	}
	var result Result
	err := json.Unmarshal([]byte(str), &result)
	if err != nil {
		return false, err
	}
	originStr, err := h.AssembleCreateTSRStr("comment", nil, &comment)
	if err != nil {
		return false, err
	}
	calculatedHash := util.CalculateHash(originStr, "")
	if strings.HasPrefix(calculatedHash, "error:") {
		return false, errors.New(calculatedHash)
	}
	return calculatedHash == result.HashedMessage, nil
}

func (s *WeiboService) GetUsersMap(userIDs []string) (map[string]User, error) {
	repoUsers, err := s.repo.GetUsersMap(userIDs)
	if err != nil {
		return nil, err
	}

	serviceUsers := make(map[string]User)
	for id, ru := range repoUsers {
		su := User{
			ID:     ru.ID,
			Name:   ru.Name,
			Avatar: ru.Avatar,
		}
		serviceUsers[id] = su
	}

	return serviceUsers, nil
}

func (s *WeiboService) GetBiesMap(byIDs []string) (map[string]By, error) {
	repoBies, err := s.repo.GetBiesMap(byIDs)
	if err != nil {
		return nil, err
	}

	serviceBies := make(map[string]By)
	for id, rb := range repoBies {
		sb := By{
			Id:    rb.Id,
			URL:   rb.URL,
			Title: rb.Title,
		}
		serviceBies[id] = sb
	}

	return serviceBies, nil
}

func (s *WeiboService) GetTSRsMap(thirdIDs []string, tp string) (map[string]TSR, error) {
	repoTSRs, err := s.repo.GetTSRsMap(thirdIDs, tp)
	if err != nil {
		return nil, err
	}

	serviceTSRs := make(map[string]TSR)
	for id, rt := range repoTSRs {
		st := TSR{
			Type:    rt.Type,
			ThirdID: rt.ThirdID,
			TSR:     rt.TSR,
		}
		serviceTSRs[id] = st
	}

	return serviceTSRs, nil
}

func (s *WeiboService) GetRetweetsMap(retweetIds []string) (map[string]Weibo, error) {
	repoRetweets, err := s.repo.GetRetweetsMap(retweetIds)
	if err != nil {
		return nil, err
	}

	attachmentsMap, err := s.GetAttachmentsMap(retweetIds, "feed")
	if err != nil {
		return nil, err
	}
	serviceRetweets := make(map[string]Weibo)
	for id, rr := range repoRetweets {
		var sr = Weibo{}
		err = sr.LoadFromRepoWeibo(rr)
		if err != nil {
			return nil, err
		}
		sr.Media = attachmentsMap[rr.ID]
		serviceRetweets[id] = sr
	}

	return serviceRetweets, nil
}

func (s *WeiboService) GetAttachmentsMap(attachmentIds []string, tp string) (map[string][]Media, error) {
	repoAttachments, err := s.repo.GetAttachmentsMap(attachmentIds, tp)
	if err != nil {
		return nil, err
	}

	serviceAttachments := make(map[string][]Media)
	for id, ra := range repoAttachments {
		var sa []Media
		for _, m := range ra {
			sm := Media{
				Mime:          m.Mime,
				Origin:        m.Origin,
				LivePhoto:     m.LivePhoto,
				OriginSina:    m.OriginSina,
				LivePhotoSina: m.LivePhotoSina,
				IsLarge:       m.IsLarge,
			}
			sa = append(sa, sm)
		}
		serviceAttachments[id] = sa
	}

	return serviceAttachments, nil
}

func (s *WeiboService) MarkWeibo(id string, status int) error {
	return s.repo.MarkWeibo(id, status)
}

func (s *WeiboService) GetRandomWeibos(uids []string, perPage int) ([]Weibo, error) {
	repoWeibos, err := s.repo.GetRandomWeibos(uids, perPage)
	if err != nil {
		return nil, err
	}

	var serviceWeibos []Weibo
	for _, rw := range repoWeibos {
		var sw = Weibo{}
		err = sw.LoadFromRepoWeibo(rw)
		if err != nil {
			return nil, err
		}
		serviceWeibos = append(serviceWeibos, sw)
	}

	err = s.enrichWeibosBatch(serviceWeibos)
	if err != nil {
		return nil, err
	}

	return serviceWeibos, nil
}

func (s *WeiboService) GetFilePath(inPath string) (string, bool, error) {
	filePath := s.basePath + "/" + inPath
	if _, err := os.Stat(filePath); err != nil {
		if os.IsNotExist(err) {
			filePath = s.largeBasePath + "/" + inPath
			_, err = os.Stat(filePath)
			if err != nil {
				if os.IsNotExist(err) {
					return "", false, nil
				}
				return "", false, err
			}
		}
		return filePath, true, nil
	}
	return filePath, true, nil
}
func (s *WeiboService) ParseMediaFromMultipart(form *multipart.Form, feedId string, commentId string, uid string) ([]Media, error) {
	var medias []Media

	if form == nil || form.File == nil {
		return medias, nil
	}

	for fieldName, fileHeaders := range form.File {
		if fieldName != "media" {
			continue
		}

		for idx, fh := range fileHeaders {
			file, err := fh.Open()
			if err != nil {
				return nil, fmt.Errorf("无法打开上传文件: %w", err)
			}

			media, err := s.saveMedia(file, fh.Filename, fh.Size, feedId, commentId, uid, idx)
			file.Close()

			if err != nil {
				return nil, err
			}

			medias = append(medias, media)
		}
	}

	return medias, nil
}

func (s *WeiboService) CopyMediaFromLocal(input []Media, feedId string, commentId string, uid string) ([]Media, error) {
	var result []Media

	for idx, m := range input {
		file, err := os.Open(m.Origin)
		if err != nil {
			return nil, fmt.Errorf("打开文件失败 %s %s", m.Origin, err)
		}

		info, err := file.Stat()
		if err != nil {
			file.Close()
			return nil, err
		}

		media, err := s.saveMedia(file, m.Origin, info.Size(), feedId, commentId, uid, idx)
		file.Close()

		if err != nil {
			return nil, err
		}
		media.Mime = m.Mime

		result = append(result, media)
	}

	return result, nil
}

func (s *WeiboService) saveMedia(reader io.Reader, originFilename string, size int64, feedId string, commentId string, uid string, idx int) (Media, error) {
	const atLeastToLargeBasePath = 100 * 1024 * 1024

	now := time.Now()
	year := now.In(httpserverUtil.TimeZone()).Format("2006")
	month := fmt.Sprintf("%02d", now.Month())

	basePath := s.basePath
	isLarge := 0
	if size > atLeastToLargeBasePath {
		basePath = s.largeBasePath
		isLarge = 1
	}

	// 目标目录
	dir := filepath.Join(basePath, uid, year, month)
	if err := os.MkdirAll(dir, os.ModePerm); err != nil {
		return Media{}, fmt.Errorf("无法创建目录: %w", err)
	}

	// 文件名
	dstFileName := ""
	if commentId != "" {
		dstFileName = feedId + "_comment_" + commentId + "_" + strconv.Itoa(idx) + path.Ext(originFilename)
	} else {
		dstFileName = feedId + "_" + strconv.Itoa(idx) + path.Ext(originFilename)
	}
	dstPath := filepath.Join(dir, dstFileName)

	dstFile, err := os.Create(dstPath)
	if err != nil {
		return Media{}, fmt.Errorf("无法创建文件: %w", err)
	}
	defer dstFile.Close()

	if _, err = io.Copy(dstFile, reader); err != nil {
		return Media{}, fmt.Errorf("写入文件失败: %w", err)
	}

	relativePath := filepath.Join(uid, year, month, dstFileName)

	mime, err := getMime(filepath.Join(basePath, relativePath))
	if err != nil {
		return Media{}, fmt.Errorf("无法获取文件类型: %w", err)
	}

	return Media{
		Origin:  relativePath,
		Mime:    mime,
		IsLarge: isLarge,
	}, nil
}

func (s *WeiboService) assembleAbsoluteMediaPath(media Media) string {
	basePath := s.basePath
	if media.IsLarge == 1 {
		basePath = s.largeBasePath
	}
	return path.Join(basePath, media.Origin)
}

func (s *WeiboService) BackupDB(dbPath string, key string, backupPath string, webdavURL string, webDavUser string, webDavPassword string) error {
	err := httpserverUtil.BackupSQLiteDB(dbPath, key, backupPath, webdavURL, webDavUser, webDavPassword, s.repo.GetDB())
	if err != nil {
		return err
	}
	return nil
}

func (s *WeiboService) GetDB() *sql.DB {
	return s.repo.GetDB()
}

func (s *WeiboService) Destroy() error {
	return s.repo.GetDB().Close()
}
