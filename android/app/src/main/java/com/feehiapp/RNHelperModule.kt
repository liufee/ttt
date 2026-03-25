package com.feehiapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.BufferedReader
import java.io.InputStreamReader
import android.media.MediaPlayer
import com.facebook.react.bridge.ReadableMap
import com.feehiapp.background.Task
import com.feehiapp.background.TaskType
import com.feehiapp.background.FlexibleAlarmScheduler
import android.content.Intent
import com.feehiapp.location.LocationService
import com.amap.api.location.AMapLocation
import com.amap.api.location.AMapLocationClient
import com.amap.api.location.AMapLocationClientOption
import com.facebook.react.bridge.Arguments

import httpserver.Httpserver
import news.News
import qqexmail.Qqexmail
import util.Util
import version.Version
import srv.Srv

class RNHelperModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "RNHelper"
    }

    @ReactMethod
    fun executeCommand(command: String, promise: Promise) {
        try {
            val process = Runtime.getRuntime().exec(command) // 执行 Shell 命令

            // 读取输出
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val output = StringBuilder()
            var line: String?

            while (reader.readLine().also { line = it } != null) {
                output.append(line).append("\n")
            }

            process.waitFor() // 等待命令完成
            promise.resolve(output.toString()) // 返回命令的输出
        } catch (e: Exception) {
            e.printStackTrace()
            promise.reject("ERROR", e.message) // 返回错误信息
        }
    }

    @ReactMethod
    fun startHTTPServer(isHTTPS: String, novelDB: String, weiboDB: String, exerciseDB: String, businessDB: String, childrenDB: String, weiboFileBasePath: String, largeWeiboFileBasePath: String, amapWebKey: String, port: String, promise: Promise) {
        try {
            val result = Httpserver.startHTTPServer(isHTTPS, "yes", novelDB, weiboDB, exerciseDB, businessDB, childrenDB, weiboFileBasePath, largeWeiboFileBasePath, amapWebKey, port)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun stopHTTPServer(promise: Promise) {
        try {
            val result = Httpserver.stopHTTPServer()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun parseNews(kind: String, pageType: String, html: String, xpath: String, promise: Promise) {
        try {
            val result = News.parseNews(kind, pageType, html, xpath)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun parseHotSearch(kind: String, pageType: String, html: String, xpath: String, promise: Promise) {
        try {
            val result = News.parseHotSearch(kind, pageType, html, xpath)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun generateTSR(data: String, promise: Promise) {
        try {
            val result = Util.generateTSR(data)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun generateTSRWithMedia(data: String, mediaStr: String, promise: Promise) {
        try {
            val result = Util.generateTSRWithMedia(data, mediaStr)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun assembleStrToCreateTSR(data: String, mediaStr: String, promise: Promise) {
        try {
            val result = Util.assembleStrToCreateTSR(data, mediaStr)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun generateTSRWithMediaV2(data: String, mediaStr: String, promise: Promise) {
        try {
            val result = Util.generateTSRWithMediaV2(data, mediaStr)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

     @ReactMethod
     fun parseTSR(data: String, promise: Promise) {
        try {
            val result = Util.parseTSR(data)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

     @ReactMethod
     fun calculateHash(data: String, tp: String, promise: Promise) {
        try {
            val result = Util.calculateHash(data, tp)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

     @ReactMethod
     fun getExmailLoginURL(corpId: String, corpSecret: String, emailSuffix: String, tokenPath: String, alias: String, promise: Promise) {
        try {
            val result = Qqexmail.getExmailLoginURL(corpId, corpSecret, emailSuffix, tokenPath, alias)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
     }

     @ReactMethod
     fun encryptFile(inputPath: String, outputPath: String, key: String, promise: Promise) {
         try {
             val result = Util.encryptFile(inputPath, outputPath, key)
             promise.resolve(result)
         } catch (e: Exception) {
             promise.reject("ERROR", e)
         }
     }

     @ReactMethod
     fun decryptFile(inputPath: String, outputPath: String, key: String, promise: Promise) {
         try {
             val result = Util.decryptFile(inputPath, outputPath, key)
             promise.resolve(result)
         } catch (e: Exception) {
             promise.reject("ERROR", e)
         }
     }

    @ReactMethod
    fun encryptString(plain: String, keyHex: String, promise: Promise) {
        try {
            val result = Util.encryptString(plain, keyHex)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun decryptString(cipherHex: String, keyHex: String, promise: Promise) {
        try {
            val result = Util.decryptString(cipherHex, keyHex)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun httpClient(request: String, promise: Promise) {
        try {
            val result = Util.httpClient(request)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun backupSQLiteDBWal(dbPath: String, key: String, promise: Promise) {
        try {
            val result = Util.backupSQLiteDBWal(dbPath, key)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun restoreSQLiteDBFromWal(dbPath: String, framesStr: String, key: String, promise: Promise) {
        try {
            val result = Util.restoreSQLiteDBFromWal(dbPath, framesStr, key)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    private var player: MediaPlayer? = null

    @ReactMethod
    fun playSound(url: String, promise: Promise) {
        try {
            // 如果已经在播放，先释放
            player?.release()

            player = MediaPlayer().apply {
                setDataSource(url) // 网络链接
                prepareAsync()    // 异步准备
                setOnPreparedListener { start() } // 准备好后开始播放
                setOnCompletionListener {
                    it.release()
                    player = null
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun stopSound(promise: Promise) {
        player?.stop()
        player?.release()
        player = null
        promise.resolve(true)
    }

    @ReactMethod
    fun versionGOGitHash(promise: Promise) {
        try {
            val result = Version.versionGoGitHash()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun versionGOBuildDate(promise: Promise) {
        try {
            val result = Version.versionGOBuildDate()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun versionGOVersion(promise: Promise) {
        try {
            val result = Version.versionGOVersion()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun scheduleTask(taskId: String, type: String, opts: ReadableMap) {
        val taskType = TaskType.valueOf(type.uppercase())
        val task = when(taskType) {
            TaskType.ONCE -> Task(
                id = taskId,
                type = taskType,
                triggerAt = opts.getDouble("triggerAt").toLong()
            )
            TaskType.MINUTE -> Task(taskId, taskType)
            TaskType.HOUR -> Task(taskId, taskType, minute = opts.getInt("minute"))
            TaskType.DAILY -> Task(taskId, taskType, hour = opts.getInt("hour"), minute = opts.getInt("minute"))
            TaskType.WEEKLY -> Task(taskId, taskType, hour = opts.getInt("hour"), minute = opts.getInt("minute"), dayOfWeek = opts.getInt("dayOfWeek"))
            TaskType.MONTHLY -> Task(taskId, taskType, hour = opts.getInt("hour"), minute = opts.getInt("minute"), intervalMonths = opts.getInt("intervalMonths"))
        }
        FlexibleAlarmScheduler.init(reactApplicationContext)
        FlexibleAlarmScheduler.registerTask(reactApplicationContext, task)
    }

    @ReactMethod
    fun callWeiboSrv(method: String, args: String, promise: Promise) {
        try {
            val result = Srv.callWeiboSrv(method, args)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun callExerciseSrv(method: String, args: String, promise: Promise) {
        try {
            val result = Srv.callExerciseSrv(method, args)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun callChildrenSrv(method: String, args: String, promise: Promise) {
        try {
            val result = Srv.callChildrenSrv(method, args)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun startRunLocation(useMock: Boolean) {
        val intent = Intent(reactApplicationContext, LocationService::class.java)
        intent.putExtra("useMock", useMock)
        reactApplicationContext.startForegroundService(intent)
    }

    @ReactMethod
    fun stopRunLocation() {
        val intent = Intent(reactApplicationContext, LocationService::class.java)
        reactApplicationContext.stopService(intent)
    }

    private var locationClient: AMapLocationClient? = null
    @ReactMethod
    fun initAMapSDK(apiKey: String?) {
        apiKey?.let {
            // 仅更新定位 SDK 隐私协议
            AMapLocationClient.updatePrivacyAgree(reactApplicationContext, true)
            AMapLocationClient.updatePrivacyShow(reactApplicationContext, true, true)
            // 高德定位 SDK Key 可以在 AndroidManifest 中声明
            // 或者通过 setApiKey（定位 6.6.0+ 支持）
            AMapLocationClient.setApiKey(it)
        }
    }

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        try {
            if (locationClient == null) {
                locationClient = AMapLocationClient(reactApplicationContext)
            }

            val option = AMapLocationClientOption().apply {
                isOnceLocation = true
                isNeedAddress = true
                locationMode = AMapLocationClientOption.AMapLocationMode.Hight_Accuracy
            }

            locationClient?.setLocationOption(option)
            locationClient?.setLocationListener { location: AMapLocation? ->
                if (location != null && location.errorCode == 0) {
                    val map = Arguments.createMap().apply {
                        putDouble("latitude", location.latitude)
                        putDouble("longitude", location.longitude)
                        putString("poiName", location.poiName ?: "")
                        putString("address", location.address ?: "")
                    }
                    promise.resolve(map)
                } else {
                    promise.reject(
                        location?.errorCode?.toString() ?: "NULL",
                        location?.errorInfo ?: "Location failed"
                    )
                }
                locationClient?.stopLocation()
            }

            locationClient?.startLocation()
        } catch (e: Exception) {
            promise.reject("LOCATION_ERROR", e.message)
        }
    }
}
