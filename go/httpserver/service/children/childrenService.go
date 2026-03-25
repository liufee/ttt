package children

import (
	"database/sql"
	"encoding/json"
	"errors"
	"feehiapp/httpserver/repository/children"
	httpserverUtil "feehiapp/httpserver/util"
	"math"
	"strconv"
	"time"
)

type ChildrenService struct {
	repo *children.ChildrenRepository
}

func NewChildrenService(db *sql.DB) *ChildrenService {
	return &ChildrenService{repo: children.NewChildrenRepository(db)}
}

func (s *ChildrenService) CreateEvent(rawEventString string) error {
	rawEvent := []byte(rawEventString)
	var base BaseEvent
	if err := json.Unmarshal(rawEvent, &base); err != nil {
		return err
	}

	diff := base.EndTime.Sub(base.StartTime)
	minutes := int(math.Ceil(diff.Minutes()))

	var event = children.Event{
		Child:     base.Child,
		EventType: base.EventType,
		StartTime: base.StartTime.Format("2006-01-02 15:04:05"),
		EndTime:   base.EndTime.Format("2006-01-02 15:04:05"),
		Duration:  minutes,
		Meta:      make(map[string]string),
	}

	meta := make(map[string]string)

	switch EventType(base.EventType) {
	case EventTypeEat:
		var e EatEvent
		if err := json.Unmarshal(rawEvent, &e); err != nil {
			return err
		}
		meta["amount"] = strconv.Itoa(e.Amount)
	case EventTypePoop:
		var p PoopEvent
		if err := json.Unmarshal(rawEvent, &p); err != nil {
			return err
		}
		meta["type"] = p.Type
		meta["color"] = p.Color
	case EventTypePee:
		var p PeeEvent
		if err := json.Unmarshal(rawEvent, &p); err != nil {
			return err
		}
		meta["level"] = p.Level
	case EventTypeSleep:
		var sEvent SleepEvent
		if err := json.Unmarshal(rawEvent, &sEvent); err != nil {
			return err
		}
	case EventTypeCry:
		var c CryEvent
		if err := json.Unmarshal(rawEvent, &c); err != nil {
			return err
		}
		meta["level"] = c.Level
	default:
		return errors.New("unknown event type")
	}
	event.Meta = meta
	_, err := s.repo.CreateEvent(&event)
	if err != nil {
		return err
	}

	return err
}

func (s *ChildrenService) GetEvents(children []string, eventTypes []EventType, startAt, endAt *time.Time, orderBy string, orderSort string, limit int) ([]interface{}, error) {
	strTypes := make([]string, len(eventTypes))
	for i, t := range eventTypes {
		strTypes[i] = string(t)
	}

	events, err := s.repo.GetEventsByFilter(children, strTypes, startAt, endAt, orderBy, orderSort, limit)
	if err != nil {
		return nil, err
	}

	// 转换成具体类型
	var result = make([]interface{}, len(events))
	for idx, e := range events {
		tUTC, err := time.Parse(time.RFC3339, e.StartTime)
		if err != nil {
			return nil, err
		}

		shanghai, _ := time.LoadLocation("Asia/Shanghai")
		startTime := tUTC.In(shanghai)

		tUTC, err = time.Parse(time.RFC3339, e.EndTime)
		if err != nil {
			return nil, err
		}
		endTime := tUTC.In(shanghai)

		baseEvent := BaseEvent{
			Id:        strconv.Itoa(int(e.ID)),
			Child:     e.Child,
			EventType: e.EventType,
			StartTime: startTime,
			EndTime:   endTime,
			Duration:  e.Duration,
		}
		switch EventType(e.EventType) {
		case EventTypeEat:
			amount := 0
			if val, ok := e.Meta["amount"]; ok {
				amount, _ = strconv.Atoi(val)
			}
			result[idx] = EatEvent{
				BaseEvent: baseEvent,
				Amount:    amount,
			}
		case EventTypePoop:
			result[idx] = PoopEvent{
				BaseEvent: baseEvent,
				Type:      e.Meta["type"],
				Color:     e.Meta["color"],
			}
		case EventTypePee:
			result[idx] = PeeEvent{
				BaseEvent: baseEvent,
				Level:     e.Meta["level"],
			}
		case EventTypeSleep:
			result[idx] = SleepEvent{
				BaseEvent: baseEvent,
			}
		case EventTypeCry:
			result[idx] = CryEvent{
				BaseEvent: baseEvent,
				Level:     e.Meta["level"],
			}
		}
	}

	return result, nil
}

func (s *ChildrenService) DeleteEventById(id string) error {
	return s.repo.DeleteEvent(id)
}

func (s *ChildrenService) BackupDB(dbPath string, key string, backupPath string, webdavURL string, webDavUser string, webDavPassword string) error {
	err := httpserverUtil.BackupSQLiteDB(dbPath, key, backupPath, webdavURL, webDavUser, webDavPassword, s.repo.GetDB())
	if err != nil {
		return err
	}
	return nil
}

func (s *ChildrenService) GetDB() *sql.DB {
	return s.repo.GetDB()
}

func (s *ChildrenService) Destroy() error {
	return s.repo.GetDB().Close()
}
