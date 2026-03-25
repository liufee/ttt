package children

func placeholders(n int) string {
	if n <= 0 {
		return ""
	}
	s := "?"
	for i := 1; i < n; i++ {
		s += ",?"
	}
	return s
}

func int64SliceToInterface(ids []int64) []interface{} {
	res := make([]interface{}, len(ids))
	for i, v := range ids {
		res[i] = v
	}
	return res
}
