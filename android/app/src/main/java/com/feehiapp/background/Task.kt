package com.feehiapp.background

import java.io.Serializable

enum class TaskType : Serializable {
    ONCE, MINUTE, HOUR, DAILY, WEEKLY, MONTHLY
}

data class Task(
    val id: String,
    val type: TaskType,
    val triggerAt: Long = 0L, // 一次性任务触发时间（毫秒时间戳，仅 ONCE 使用）
    val hour: Int = 0,
    val minute: Int = 0,
    val dayOfWeek: Int = 0,   // 仅 WEEKLY 有效
    val intervalMonths: Int = 1 // 仅 MONTHLY 有效
) : Serializable
