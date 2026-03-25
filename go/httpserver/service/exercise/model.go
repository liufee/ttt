package exercise

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
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
	ID          string       `json:"id"`
	Type        ExerciseType `json:"Type"`
	Ext         *string      `json:"Ext"`
	StartAt     time.Time    `json:"StartAt"`
	EndAt       time.Time    `json:"EndAt"`
	Status      Status       `json:"Status"`
	TSR         int          `json:"TSR"`
	Abdominal   *Abdominal   `json:"Abdominal,omitempty"`
	SitUpPushUp *SitUpPushUp `json:"SitUpPushUp,omitempty"`
	Run         *Run         `json:"Run,omitempty"`
	TSRVerified bool         `json:"TSRVerified"`
}

func (e *Exercise) Parse() {
	switch e.Type {
	case ExerciseTypeAbdominal:
		e.Abdominal = &Abdominal{}
	case ExerciseTypeRun:
		if e.Ext == nil {
			return
		}
		temp := strings.Split(*e.Ext, ",")
		if len(temp) < 4 {
			return
		}
		avgPace, _ := strconv.ParseFloat(temp[0], 64)
		distance, _ := strconv.ParseFloat(temp[1], 64)
		runDuration := temp[2]
		runningWithoutPosition, _ := strconv.Atoi(temp[3])
		e.Run = &Run{
			AvgPace:                avgPace,
			Distance:               distance,
			RunDuration:            runDuration,
			RunningWithoutPosition: runningWithoutPosition,
		}
	case ExerciseTypeSitUpPushUp:
		if e.Ext == nil {
			return
		}
		temp := strings.Split(*e.Ext, ",")
		if len(temp) < 4 {
			return
		}
		pushUp, _ := strconv.Atoi(temp[0])
		sitUp, _ := strconv.Atoi(temp[1])
		curlUp, _ := strconv.Atoi(temp[2])
		legsUpTheWallPose, _ := strconv.Atoi(temp[3])
		e.SitUpPushUp = &SitUpPushUp{
			PushUp:            pushUp,
			SitUp:             sitUp,
			CurlUp:            curlUp,
			LegsUpTheWallPose: legsUpTheWallPose,
		}
	}
}

func (e *Exercise) Assemble() error {
	var ext string
	switch e.Type {
	case ExerciseTypeAbdominal:
		ext = ""
	case ExerciseTypeSitUpPushUp:
		if e.SitUpPushUp == nil {
			return errors.New("仰卧起坐/俯卧撑数据错误")
		}
		ext = fmt.Sprintf("%d,%d,%d,%d",
			e.SitUpPushUp.PushUp,
			e.SitUpPushUp.SitUp,
			e.SitUpPushUp.CurlUp,
			e.SitUpPushUp.LegsUpTheWallPose,
		)
	case ExerciseTypeRun:
		if e.Run == nil {
			return errors.New("跑步数据错误")
		}
		ext = fmt.Sprintf("%.2f,%.2f,%s,%d",
			e.Run.AvgPace,
			e.Run.Distance,
			e.Run.RunDuration,
			e.Run.RunningWithoutPosition,
		)
		e.Run.PathsStr = getPathStr(e.Run.Paths)

	default:
		return errors.New("未知运动类型")
	}
	e.Ext = &ext

	return nil
}

type Abdominal struct {
}

type Run struct {
	AvgPace                float64 `json:"AvgPace"`
	Distance               float64 `json:"Distance"`
	RunDuration            string  `json:"RunDuration"`
	RunningWithoutPosition int     `json:"RunningWithoutPosition"`
	Paths                  []Path  `json:"Paths"`
	PathsStr               string  `json:"PathsStr"`
}

type SitUpPushUp struct {
	PushUp            int `json:"PushUp"`
	SitUp             int `json:"SitUp"`
	CurlUp            int `json:"CurlUp"`
	LegsUpTheWallPose int `json:"LegsUpTheWallPose"`
}

type DailyExercise struct {
	Date      string
	Exercises []Exercise
	// 添加完成项目数和是否完成所有项目的字段
	CompletedTypes int
	AllCompleted   bool
}

type TSR struct {
	Type    string
	ThirdID string
	TSR     string
}

type Path struct {
	Latitude  float64
	Longitude float64
	Time      int64
}
