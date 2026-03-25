package com.feehiapp.headless

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class HeadlessService : HeadlessJsTaskService() {

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        intent ?: return null

        val eventType = intent.getStringExtra("event") ?: return null

        val data = Arguments.createMap()
        data.putString("event", eventType)

        val extras: Bundle? = intent.extras
        extras?.keySet()?.forEach { key ->
            if (key == "event") return@forEach
            when (val value = extras.get(key)) {
                is String -> data.putString(key, value)
                is Int -> data.putInt(key, value)
                is Long -> data.putDouble(key, value.toDouble())
                is Double -> data.putDouble(key, value)
                is Float -> data.putDouble(key, value.toDouble())
                is Boolean -> data.putBoolean(key, value)
                else -> data.putString(key, value?.toString())
            }
        }

        return HeadlessJsTaskConfig(
            "HeadLessEvent",
            data,
            0,
            true
        )
    }

    companion object {

        fun sendEvent(
            context: Context,
            event: String,
            params: Map<String, Any?> = emptyMap()
        ) {
            val intent = Intent(context, HeadlessService::class.java)
            intent.putExtra("event", event)

            params.forEach { (key, value) ->
                when (value) {
                    is String -> intent.putExtra(key, value)
                    is Int -> intent.putExtra(key, value)
                    is Long -> intent.putExtra(key, value)
                    is Double -> intent.putExtra(key, value)
                    is Float -> intent.putExtra(key, value)
                    is Boolean -> intent.putExtra(key, value)
                    null -> {}
                    else -> intent.putExtra(key, value.toString())
                }
            }

            context.startService(intent)
            HeadlessJsTaskService.acquireWakeLockNow(context)
        }
    }
}
