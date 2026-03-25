package children

import (
	"database/sql"
	"time"
)

type ChildrenRepository struct {
	DB *sql.DB
}

func NewChildrenRepository(db *sql.DB) *ChildrenRepository {
	return &ChildrenRepository{DB: db}
}

func (r *ChildrenRepository) CreateEvent(event *Event) (int64, error) {
	tx, err := r.DB.Begin()
	if err != nil {
		return 0, err
	}

	res, err := tx.Exec(`
		INSERT INTO events 
		(child, event_type, start_time, end_time, duration)
		VALUES (?, ?, ?, ?, ?)`,
		event.Child,
		event.EventType,
		event.StartTime,
		event.EndTime,
		event.Duration,
	)

	if err != nil {
		tx.Rollback()
		return 0, err
	}

	id, _ := res.LastInsertId()

	for k, v := range event.Meta {
		_, err := tx.Exec(`
			INSERT INTO event_meta
			(event_id, meta_key, meta_value)
			VALUES (?, ?, ?)`,
			id, k, v,
		)
		if err != nil {
			tx.Rollback()
			return 0, err
		}
	}

	return id, tx.Commit()
}

func (r *ChildrenRepository) GetEventsByFilter(children []string, eventTypes []string, startAt, endAt *time.Time, orderBy string, orderSort string, limit int) ([]Event, error) {

	query := `
        SELECT id, child, event_type, start_time, end_time, duration
        FROM events
        WHERE 1=1
    `

	args := []interface{}{}

	query += " AND child IN (" + placeholders(len(children)) + ")"
	for _, child := range children {
		args = append(args, child)
	}

	// ===== event_type 多选 =====
	if len(eventTypes) > 0 {
		query += " AND event_type IN (" + placeholders(len(eventTypes)) + ")"
		for _, t := range eventTypes {
			args = append(args, t)
		}
	}

	// ===== 时间区间 =====
	if startAt != nil {
		query += " AND start_time >= ?"
		args = append(args, *startAt)
	}
	if endAt != nil {
		query += " AND start_time <= ?"
		args = append(args, *endAt)
	}

	// ===== 排序字段白名单 =====
	orderField := "start_time"
	if orderBy == "created_at" {
		orderField = "created_at"
	}
	query += " ORDER BY " + orderField
	if orderSort == "DESC" {
		query += " DESC"
	} else {
		query += " ASC"
	}

	// ===== limit =====
	if limit > 0 {
		query += " LIMIT ?"
		args = append(args, limit)
	}

	rows, err := r.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []Event
	var ids []int64

	for rows.Next() {
		var e Event
		if err := rows.Scan(
			&e.ID,
			&e.Child,
			&e.EventType,
			&e.StartTime,
			&e.EndTime,
			&e.Duration,
		); err != nil {
			return nil, err
		}
		e.Meta = map[string]string{}
		events = append(events, e)
		ids = append(ids, e.ID)
	}

	if len(ids) == 0 {
		return events, nil
	}

	// ===== 查 meta =====
	metaQuery := `
        SELECT event_id, meta_key, meta_value
        FROM event_meta
        WHERE event_id IN (` + placeholders(len(ids)) + `)
    `
	metaArgs := int64SliceToInterface(ids)

	metaRows, err := r.DB.Query(metaQuery, metaArgs...)
	if err != nil {
		return nil, err
	}
	defer metaRows.Close()

	metaMap := make(map[int64]map[string]string)
	for metaRows.Next() {
		var id int64
		var k, v string
		if err := metaRows.Scan(&id, &k, &v); err != nil {
			return nil, err
		}
		if metaMap[id] == nil {
			metaMap[id] = map[string]string{}
		}
		metaMap[id][k] = v
	}

	for i := range events {
		events[i].Meta = metaMap[events[i].ID]
	}

	return events, nil
}

func (r *ChildrenRepository) DeleteEvent(id string) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM event_meta WHERE event_id = ?`, id)
	if err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.Exec(`DELETE FROM events WHERE id = ?`, id)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func (r *ChildrenRepository) GetDB() *sql.DB {
	return r.DB
}
