package children

import (
	"errors"
	"fmt"
	"time"
)

func getAge(child string, now time.Time, loc *time.Location) (string, error) {
	var birthStr string
	switch child {
	case "son":
		birthStr = "2026-05-31"
	case "daughter":
		birthStr = "2026-08-10"
	default:
		return "", errors.New("invalid who")
	}

	layout := "2006-01-02"

	birth, err := time.ParseInLocation(layout, birthStr, loc)
	if err != nil {
		return "", err
	}
	if now.Before(birth) {
		return "0周", nil
	}

	// 计算总天数
	days := int(now.Sub(birth).Hours() / 24)

	// 计算月龄
	yearDiff := now.Year() - birth.Year()
	monthDiff := int(now.Month()) - int(birth.Month())
	months := yearDiff*12 + monthDiff

	if now.Day() < birth.Day() {
		months--
	}

	if months <= 0 {
		weeks := days / 7
		if weeks <= 0 {
			return fmt.Sprintf("%d天", days), nil
		}
		return fmt.Sprintf("%d周", weeks), nil
	}

	return fmt.Sprintf("%d个月", months), nil
}
