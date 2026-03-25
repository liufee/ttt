package com.feehiapp.background

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.feehiapp.headless.HeadlessService

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra("taskId") ?: return

        FlexibleAlarmScheduler.init(context)

        FlexibleAlarmScheduler.getTask(taskId)?.let { task ->
            if (task.type == TaskType.ONCE) {
                FlexibleAlarmScheduler.cancelTask(context, task.id)
            } else {
                FlexibleAlarmScheduler.scheduleNext(context, task)
            }
        }

        HeadlessService.sendEvent(
            context = context,
            event = "BackgroundTask",
            params = mapOf(
                "taskId" to taskId
            )
        )
    }
}
