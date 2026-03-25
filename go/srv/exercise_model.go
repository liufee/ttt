package srv

import (
	"feehiapp/httpserver/service/exercise"
	"fmt"
	"time"
)

type ExerciseType exercise.ExerciseType

const (
	ExerciseTypeAbdominal   = 1
	ExerciseTypeRun         = 2
	ExerciseTypeSitUpPushUp = 3
)

type Status exercise.Status

type Exercise struct {
	ID          string       `json:"id"`
	Type        ExerciseType `json:"type"`
	StartAt     string       `json:"startAt"`
	EndAt       string       `json:"endAt"`
	Abdominal   *Abdominal   `json:"abdominal,omitempty"`
	Run         *Run         `json:"run,omitempty"`
	Status      Status       `json:"status"`
	SitUpPushUp *SitUpPushUp `json:"sitUpPushUp,omitempty"`
	TSR         int          `json:"tsr"`
	TSRVerified int          `json:"tsrVerified"`
}

type Abdominal struct {
}

type Run struct {
	AvgPace                float64 `json:"avgPace"`
	Distance               float64 `json:"distance"`
	RunDuration            string  `json:"runDuration"`
	RunningWithoutPosition int     `json:"runningWithoutPosition"`
	Paths                  []Path  `json:"paths"`
}

type SitUpPushUp struct {
	SitUp             int `json:"sitUp"`
	PushUp            int `json:"pushUp"`
	CurlUp            int `json:"curlUp"`
	LegsUpTheWallPose int `json:"legsUpTheWallPose"`
}

type Path struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Time      int64   `json:"time"`
}

type DailyExercise struct {
	Date      string     `json:"date"`
	Exercises []Exercise `json:"exercises"`
	// 添加完成项目数和是否完成所有项目的字段
	CompletedTypes int  `json:"completedTypes"`
	AllCompleted   bool `json:"allCompleted"`
}

func convertToServiceExercise(e Exercise) (serviceExercise exercise.Exercise, err error) {
	serviceExercise = exercise.Exercise{
		ID:          e.ID,
		Type:        exercise.ExerciseType(e.Type),
		Status:      exercise.Status(e.Status),
		TSR:         e.TSR,
		TSRVerified: e.TSRVerified == 1,
	}

	// time
	if e.StartAt != "" {
		serviceExercise.StartAt, err = time.Parse("2006-01-02 15:04:05", e.StartAt)
		if err != nil {
			return serviceExercise, fmt.Errorf("parse StartAt failed: %w", err)
		}
	}

	if e.EndAt != "" {
		serviceExercise.EndAt, err = time.Parse("2006-01-02 15:04:05", e.EndAt)
		if err != nil {
			return serviceExercise, fmt.Errorf("parse EndAt failed: %w", err)
		}
	}

	// body
	switch e.Type {
	case ExerciseTypeAbdominal:
		serviceExercise.Abdominal = &exercise.Abdominal{}

	case ExerciseTypeRun:
		if e.Run != nil {
			serviceExercise.Run = &exercise.Run{
				AvgPace:                e.Run.AvgPace,
				Distance:               e.Run.Distance,
				RunDuration:            e.Run.RunDuration,
				RunningWithoutPosition: e.Run.RunningWithoutPosition,
			}
			serviceExercise.Run.Paths = make([]exercise.Path, len(e.Run.Paths))
			for idx, p := range e.Run.Paths {
				serviceExercise.Run.Paths[idx] = exercise.Path{
					Latitude:  p.Latitude,
					Longitude: p.Longitude,
					Time:      p.Time,
				}
			}
		}

	case ExerciseTypeSitUpPushUp:
		if e.SitUpPushUp != nil {
			serviceExercise.SitUpPushUp = &exercise.SitUpPushUp{
				PushUp:            e.SitUpPushUp.PushUp,
				SitUp:             e.SitUpPushUp.SitUp,
				CurlUp:            e.SitUpPushUp.CurlUp,
				LegsUpTheWallPose: e.SitUpPushUp.LegsUpTheWallPose,
			}
		}

	default:
		return serviceExercise, fmt.Errorf("unknown exercise type: %d", e.Type)
	}

	return serviceExercise, nil
}

func convertToServiceExercises(exercises []Exercise) ([]exercise.Exercise, error) {
	if len(exercises) == 0 {
		return nil, nil
	}

	result := make([]exercise.Exercise, len(exercises))
	for idx, ex := range exercises {
		serviceExercise, err := convertToServiceExercise(ex)
		if err != nil {
			return nil, err
		}
		result[idx] = serviceExercise
	}

	return result, nil
}

func convertToExercise(serviceExercise exercise.Exercise) (Exercise, error) {
	e := Exercise{
		ID:          serviceExercise.ID,
		Type:        ExerciseType(serviceExercise.Type),
		Status:      Status(serviceExercise.Status),
		TSR:         serviceExercise.TSR,
		TSRVerified: boolToInt(serviceExercise.TSRVerified),
	}

	// time
	if !serviceExercise.StartAt.IsZero() {
		e.StartAt = serviceExercise.StartAt.Format("2006-01-02 15:04:05")
	}

	if !serviceExercise.EndAt.IsZero() {
		e.EndAt = serviceExercise.EndAt.Format("2006-01-02 15:04:05")
	}

	switch serviceExercise.Type {
	case exercise.ExerciseTypeAbdominal:
		e.Abdominal = &Abdominal{}

	case exercise.ExerciseTypeRun:
		if serviceExercise.Run != nil {
			e.Run = &Run{
				AvgPace:                serviceExercise.Run.AvgPace,
				Distance:               serviceExercise.Run.Distance,
				RunDuration:            serviceExercise.Run.RunDuration,
				RunningWithoutPosition: serviceExercise.Run.RunningWithoutPosition,
			}
			e.Run.Paths = make([]Path, len(serviceExercise.Run.Paths))
			for idx, p := range serviceExercise.Run.Paths {
				e.Run.Paths[idx] = Path{
					Latitude:  p.Latitude,
					Longitude: p.Longitude,
					Time:      p.Time,
				}
			}
		}

	case exercise.ExerciseTypeSitUpPushUp:
		if serviceExercise.SitUpPushUp != nil {
			e.SitUpPushUp = &SitUpPushUp{
				PushUp:            serviceExercise.SitUpPushUp.PushUp,
				SitUp:             serviceExercise.SitUpPushUp.SitUp,
				CurlUp:            serviceExercise.SitUpPushUp.CurlUp,
				LegsUpTheWallPose: serviceExercise.SitUpPushUp.LegsUpTheWallPose,
			}
		}

	default:
		return e, fmt.Errorf("unknown exercise type: %d", serviceExercise.Type)
	}

	return e, nil
}

func convertToExercises(serviceExercises []exercise.Exercise) ([]Exercise, error) {
	result := make([]Exercise, len(serviceExercises))

	for idx, se := range serviceExercises {
		ex, err := convertToExercise(se)
		if err != nil {
			return nil, err
		}
		result[idx] = ex
	}

	return result, nil
}
func convertToServiceTypes(types []ExerciseType) []exercise.ExerciseType {
	serviceTypes := make([]exercise.ExerciseType, len(types))
	for idx, t := range types {
		serviceTypes[idx] = exercise.ExerciseType(t)
	}
	return serviceTypes
}
