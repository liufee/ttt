package com.feehiapp.background

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import java.util.*

object FlexibleAlarmScheduler {

    private const val PREFS_NAME = "flexible_tasks"
    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun registerTask(context: Context, task: Task) {
        cancelTask(context, task.id)
        saveTask(task)
        scheduleNext(context, task)
    }

    fun cancelTask(context: Context, taskId: String) {
        val intent = Intent(context, AlarmReceiver::class.java)
        val requestCode = taskId.hashCode()
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }

        prefs.edit().remove(taskId).apply()
    }

    private fun saveTask(task: Task) {
        prefs.edit().putString(task.id, serialize(task)).apply()
    }

    fun getTask(id: String): Task? {
        val json = prefs.getString(id, null) ?: return null
        return deserialize(json)
    }

    fun scheduleNext(context: Context, task: Task) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("taskId", task.id)
        }
        val requestCode = task.id.hashCode()
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val nextTime = computeNextTriggerTime(task)
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            nextTime,
            pendingIntent
        )
    }

    private fun computeNextTriggerTime(task: Task): Long {
        val cal = Calendar.getInstance()
        when (task.type) {

            TaskType.ONCE -> {
                return task.triggerAt
            }

            TaskType.MINUTE -> cal.add(Calendar.MINUTE, 1)

            TaskType.HOUR -> {
                cal.add(Calendar.HOUR_OF_DAY, 1)
                cal.set(Calendar.MINUTE, task.minute)
                cal.set(Calendar.SECOND, 0)
            }

            TaskType.DAILY -> {
                cal.set(Calendar.HOUR_OF_DAY, task.hour)
                cal.set(Calendar.MINUTE, task.minute)
                cal.set(Calendar.SECOND, 0)
                if (cal.timeInMillis <= System.currentTimeMillis()) {
                    cal.add(Calendar.DAY_OF_MONTH, 1)
                }
            }

            TaskType.WEEKLY -> {
                cal.set(Calendar.DAY_OF_WEEK, task.dayOfWeek + 1)
                cal.set(Calendar.HOUR_OF_DAY, task.hour)
                cal.set(Calendar.MINUTE, task.minute)
                cal.set(Calendar.SECOND, 0)
                if (cal.timeInMillis <= System.currentTimeMillis()) {
                    cal.add(Calendar.WEEK_OF_YEAR, 1)
                }
            }

            TaskType.MONTHLY -> {
                cal.set(Calendar.HOUR_OF_DAY, task.hour)
                cal.set(Calendar.MINUTE, task.minute)
                cal.set(Calendar.SECOND, 0)
                if (cal.timeInMillis <= System.currentTimeMillis()) {
                    cal.add(Calendar.MONTH, task.intervalMonths)
                }
            }
        }
        return cal.timeInMillis
    }

    private fun serialize(task: Task): String {
        return listOf(
            task.id,
            task.type.name,
            task.triggerAt.toString(),
            task.hour,
            task.minute,
            task.dayOfWeek,
            task.intervalMonths
        ).joinToString(",")
    }

    private fun deserialize(data: String): Task? {
        val parts = data.split(",")
        if (parts.size != 7) return null

        return Task(
            id = parts[0],
            type = TaskType.valueOf(parts[1]),
            triggerAt = parts[2].toLong(),
            hour = parts[3].toInt(),
            minute = parts[4].toInt(),
            dayOfWeek = parts[5].toInt(),
            intervalMonths = parts[6].toInt()
        )
    }
}
