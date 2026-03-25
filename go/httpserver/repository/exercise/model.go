package exercise

import (
	"time"
)

type ExerciseType int

const (
	ExerciseTypeAbdominal   = 1
	ExerciseTypeRun         = 2
	ExerciseTypeSitUpPushUp = 3
)

type Status int

const (
	StatusUncompleted = 0
	StatusCompleted   = 1
)

type Exercise struct {
	ID      string       `json:"id"`
	Type    ExerciseType `json:"Type"`
	Ext     *string      `json:"ext"`
	StartAt time.Time    `json:"StartAt"`
	EndAt   time.Time    `json:"EndAt"`
	Status  Status       `json:"Status"`
	Paths   string       `json:"Paths"`
	TSR     int          `json:"TSR"`
	TSRInfo string       `json:"TSRInfo"`
}

type TSR struct {
	Type    string
	ThirdID string
	TSR     string
}
