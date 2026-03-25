package children

type Event struct {
	ID        int64             `json:"id"`
	Child     string            `json:"child"`
	EventType string            `json:"event_type"`
	StartTime string            `json:"start_time"`
	EndTime   string            `json:"end_time"`
	Duration  int               `json:"duration"`
	Meta      map[string]string `json:"meta"`
}

type EventFilter struct {
	EventTypes []string // 多选：sleep / eat / poop / pee / cry

	StartFrom *string // start_time >=
	StartTo   *string // start_time <=

	OrderBy   string // start_time / created_at
	OrderDesc bool

	Limit int
}
