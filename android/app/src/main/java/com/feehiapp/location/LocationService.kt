package com.feehiapp.location

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.*
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.amap.api.location.AMapLocationClient
import com.amap.api.location.AMapLocationClientOption
import android.os.Handler
import android.os.Looper
import kotlin.random.Random
import com.feehiapp.headless.HeadlessService
import android.os.PowerManager
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicLong


class LocationService : Service() {

    private lateinit var client: AMapLocationClient
    private lateinit var screenReceiver: BroadcastReceiver
    private var isScreenOn = true
    private val prefsName = "location_cache"

    override fun onCreate() {
        super.onCreate()
        startForeground(1, createNotification())
        registerScreenReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val useMock = intent?.getBooleanExtra("useMock", false) ?: false

        if (useMock) {
            startMockRun()
        } else {
            startLocation()
        }

        return START_STICKY
    }

    // ---- startup anti-jump filter (只处理开始不稳定) ----
    private var startupMode = true
    private var startupStartTime = 0L

    private var hasAnchor = false
    private var anchorLat = 0.0
    private var anchorLng = 0.0
    private var anchorTime = 0L

    private var startupPassCount = 0

    private fun applyLocationConfig() {
        val pm = getSystemService(PowerManager::class.java)
        val idle = pm.isDeviceIdleMode

        val option = AMapLocationClientOption().apply {
            when {
                isScreenOn -> {
                    locationMode = AMapLocationClientOption.AMapLocationMode.Hight_Accuracy
                    interval = 1000L
                    isGpsFirst = true
                }
                idle -> {
                    locationMode = AMapLocationClientOption.AMapLocationMode.Battery_Saving
                    interval = 60000L
                    isGpsFirst = false
                }
                else -> {
                    locationMode = AMapLocationClientOption.AMapLocationMode.Hight_Accuracy
                    interval = 10000L
                    isGpsFirst = false
                }
            }

            isOnceLocation = false
            isNeedAddress = false
            isMockEnable = false
            isLocationCacheEnable = false
        }
        client.setLocationOption(option)

        client.setLocationListener { loc ->
            if (loc.errorCode != 0) return@setLocationListener

            val now = System.currentTimeMillis()
            val lat = loc.latitude
            val lng = loc.longitude
            val acc = loc.accuracy
            val type = loc.locationType

            // ---------- 只在启动前 15 秒做强过滤 ----------
            if (startupMode) {

                // 超过 15 秒直接退出启动模式（别卡死）
                if (now - startupStartTime > 15_000L) {
                    startupMode = false
                } else {

                    // 1) 先建立 anchor（可信基准点）
                    if (!hasAnchor) {

                        // anchor 条件：GPS 或者 精度非常好
                        val isGps = (type == 1)
                        val goodGps = isGps && acc > 0 && acc <= 30f

                        // anchor 建立前，一个点都不写入
                        if (!goodGps) return@setLocationListener

                        hasAnchor = true
                        anchorLat = lat
                        anchorLng = lng
                        anchorTime = now
                        startupPassCount = 1
                        // ⚠️注意：anchor 建立前，一个点都不写入
                        return@setLocationListener
                    }

                    // ⭐启动阶段 anchor 后也必须是 GPS 点
                    if (type != 1) return@setLocationListener

                    // ⭐启动阶段只接受精度足够好的 GPS 点
                    if (acc <= 0 || acc > 35f) return@setLocationListener

                    // 2) 有 anchor 后：拒绝大跳点（解决你描述的第1-2点距离过大）
                    val dt = (now - anchorTime).coerceAtLeast(1L)
                    val dist = distanceMeters(anchorLat, anchorLng, lat, lng)

                    // 允许的最大移动距离：按时间比例放宽
                    val maxDist = 8.0 * (dt / 1000.0) + 10.0

                    if (dist > maxDist) {
                        // 丢弃跳点，不更新 anchor
                        return@setLocationListener
                    }

                    // 通过：更新 anchor
                    anchorLat = lat
                    anchorLng = lng
                    anchorTime = now
                    startupPassCount++

                    // 连续 3 个点通过后退出启动模式
                    if (startupPassCount >= 3) {
                        startupMode = false
                        handleLocation(lat, lng, now)
                    }
                    return@setLocationListener
                }
            }

            handleLocation(lat, lng, now)
        }
    }

    private fun startLocation() {
        client = AMapLocationClient(applicationContext)

        startupMode = true
        startupStartTime = System.currentTimeMillis()
        hasAnchor = false
        startupPassCount = 0

        applyLocationConfig()
        client.startLocation()
    }

    private fun handleLocation(lat: Double, lng: Double, time: Long) {
        // 缓存到本地
        saveLocation(lat, lng, time)

        // 前台/亮屏时一次性发送所有缓存位置
        if (isAppActive()) {
            flushLocationsToJSFromCache()
        }
        if (locationCache.size > 5000) locationCache.clear()
    }

    data class LocationPoint(val lat: Double, val lng: Double, val time: Long, val seq: Long)

    private val locationCache = CopyOnWriteArrayList<LocationPoint>()
    private val seqGen = AtomicLong(0)
    @Volatile private var lastTime = 0L

    private fun saveLocation(lat: Double, lng: Double, time: Long) {
        //if (time <= lastTime) return
        lastTime = time

        val seq = seqGen.incrementAndGet()
        locationCache.add(LocationPoint(lat, lng, time, seq))
    }

    private val flushQueue = ArrayDeque<List<LocationPoint>>()
    @Volatile private var isFlushing = false
    private fun flushLocationsToJSFromCache() {
        if (locationCache.isEmpty()) return
        val snapshot = locationCache.toList()
        locationCache.clear()
        synchronized(flushQueue) {
            flushQueue.addLast(snapshot)
        }
        if (isFlushing) return
        handler.post { processFlushQueue() }
    }

    private fun processFlushQueue() {
        val nextSnapshot: List<LocationPoint>
        synchronized(flushQueue) {
            if (flushQueue.isEmpty()) {
                isFlushing = false
                return
            }
            nextSnapshot = flushQueue.removeFirst()
            isFlushing = true
        }

        val sorted = nextSnapshot.sortedBy { it.seq }
        HeadlessService.sendEvent(
            applicationContext,
            "locationUpdate",
            mapOf("locations" to sorted.joinToString(";") { "${it.lat},${it.lng},${it.time},${it.seq}" })
        )

        handler.post { processFlushQueue() }
    }

    private fun isAppActive(): Boolean {
        return isScreenOn && isAppInForeground()
    }

    private fun isAppInForeground(): Boolean {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val processes = am.runningAppProcesses ?: return false
        val pkgName = packageName

        for (proc in processes) {
            if (proc.processName == pkgName) {
                return proc.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
            }
        }
        return false
    }

    private fun registerScreenReceiver() {
        screenReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                isScreenOn = intent?.action == Intent.ACTION_SCREEN_ON
                if (::client.isInitialized) {
                    applyLocationConfig()
                }
                if (isScreenOn) flushLocationsToJSFromCache()
            }
        }
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
        }
        registerReceiver(screenReceiver, filter)
    }

    private fun createNotification(): Notification {
        val channelId = "location"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId, "运动定位", NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java)
                ?.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("正在记录运动轨迹")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        stopMockRun()
        if (::client.isInitialized) {
            client.stopLocation()
            client.onDestroy()
        }
        unregisterReceiver(screenReceiver)
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        stopLocationInternal()
        super.onTaskRemoved(rootIntent)
    }

    private fun stopLocationInternal() {
        if (::client.isInitialized) {
            client.stopLocation()
            client.onDestroy()
        }
        stopForeground(true)
        stopSelf()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private val handler = Handler(Looper.getMainLooper())
    private var mockRunnable: Runnable? = null
    private fun startMockRun() {
        // 初始位置
        var lat = 22.600995460902272
        var lng = 113.8487422331694

        // 初始方向（角度 0~360°）
        var angle = Random.nextDouble(0.0, 360.0)

        // 总行走距离 1公里 (单位: 米)
        val totalDistance = 1000.0
        var traveledDistance = 0.0

        // 每秒跑步速度，假设 3 米/秒
        val speed = 10.0

        // 地球半径
        val R = 6371000.0

        mockRunnable = object : Runnable {
            override fun run() {
                if (traveledDistance >= totalDistance) {
                    // 超过1公里后，随机改变方向回去
                    angle = (angle + 180 + Random.nextDouble(-30.0, 30.0)) % 360
                    traveledDistance = 0.0
                }

                // 将角度转换为弧度
                val rad = Math.toRadians(angle)

                // 计算每秒移动的偏移量（单位：度）
                val deltaLat = (speed * Math.cos(rad)) / R * (180 / Math.PI)
                val deltaLng = (speed * Math.sin(rad)) / (R * Math.cos(Math.toRadians(lat))) * (180 / Math.PI)

                lat += deltaLat
                lng += deltaLng
                traveledDistance += speed

                val time = System.currentTimeMillis()
                handleLocation(lat, lng, time)

                // 每秒更新一次
                handler.postDelayed(this, 1000)
            }
        }

        // 启动模拟定位循环
        handler.post(mockRunnable!!)
    }

    private fun stopMockRun() {
        mockRunnable?.let {
            handler.removeCallbacks(it) // 停止 Handler 队列里的循环
            mockRunnable = null         // 清空引用
        }
    }

    private fun distanceMeters(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val R = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }
}
