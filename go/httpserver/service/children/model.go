package children

import "time"

type EventType string

const (
	EventTypeEat   EventType = "eat"
	EventTypePoop  EventType = "poop"
	EventTypePee   EventType = "pee"
	EventTypeSleep EventType = "sleep"
	EventTypeCry   EventType = "cry"
)

// 定义基础事件
type BaseEvent struct {
	Id        string    `json:"id"`
	Child     string    `json:"child"`
	EventType string    `json:"eventType"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
	Duration  int       `json:"duration"`
}

// 各种事件类型
type EatEvent struct {
	BaseEvent
	Amount int `json:"amount"`
}

type PoopEvent struct {
	BaseEvent
	Type  string `json:"type"`
	Color string `json:"color"`
}

type PeeEvent struct {
	BaseEvent
	Level string `json:"level"`
}

type SleepEvent struct {
	BaseEvent
}

type CryEvent struct {
	BaseEvent
	Level string `json:"level"`
}
