package com.feehiapp

import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivityDelegate(
    private val mainActivity: ReactActivity, mainComponentName: String
) : DefaultReactActivityDelegate(mainActivity, mainComponentName, fabricEnabled) {

    override fun onNewIntent(intent: Intent): Boolean {
        val handled = super.onNewIntent(intent)
        // 更新 MainActivity 的 Intent，避免 JS 拿不到新分享的数据
        mainActivity.setIntent(intent)

        (mainActivity.application as? com.facebook.react.ReactApplication)
                ?.reactNativeHost
                ?.reactInstanceManager
                ?.currentReactContext
                ?.let { reactContext ->
                    sendEvent(reactContext, "NewShareIntent", null)
                }

        return handled
    }

    private fun sendEvent(reactContext: ReactContext, eventName: String, params: String?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
