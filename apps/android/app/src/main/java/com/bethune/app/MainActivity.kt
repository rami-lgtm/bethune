package com.bethune.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.PermissionRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {

    companion object {
        // Static reference so WakeWordService can call evaluateJs directly
        // (same process, no broadcast needed)
        @Volatile
        private var instance: MainActivity? = null

        fun evaluateJs(js: String) {
            val activity = instance ?: return
            Handler(Looper.getMainLooper()).post {
                try {
                    activity.webView.evaluateJavascript(js, null)
                } catch (e: Exception) {
                    // Activity might be destroyed
                }
            }
        }
    }

    private lateinit var webView: WebView
    private var pendingPermissionRequest: PermissionRequest? = null

    private val requestPermissions = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val audioGranted = permissions[Manifest.permission.RECORD_AUDIO] == true

        if (audioGranted) {
            startWakeWordService()
            pendingPermissionRequest?.grant(pendingPermissionRequest?.resources)
        } else {
            pendingPermissionRequest?.deny()
        }
        pendingPermissionRequest = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        instance = this

        // Fullscreen immersive mode (kiosk-like)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.cacheMode = WebSettings.LOAD_DEFAULT

            webViewClient = WebViewClient()
            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    if (request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        if (hasAudioPermission()) {
                            request.grant(request.resources)
                        } else {
                            pendingPermissionRequest = request
                            requestAudioPermission()
                        }
                    } else {
                        request.deny()
                    }
                }
            }

            addJavascriptInterface(BethuneJsBridge(this), "BethuneNative")
        }

        setContentView(webView)
        webView.loadUrl(BuildConfig.BETHUNE_URL)
        checkAndRequestPermissions()
    }

    private fun checkAndRequestPermissions() {
        val permissionsNeeded = mutableListOf<String>()

        if (!hasAudioPermission()) {
            permissionsNeeded.add(Manifest.permission.RECORD_AUDIO)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (permissionsNeeded.isNotEmpty()) {
            requestPermissions.launch(permissionsNeeded.toTypedArray())
        } else {
            startWakeWordService()
        }
    }

    private fun hasAudioPermission(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
    }

    private fun requestAudioPermission() {
        requestPermissions.launch(arrayOf(Manifest.permission.RECORD_AUDIO))
    }

    private fun startWakeWordService() {
        val intent = Intent(this, WakeWordService::class.java)
        ContextCompat.startForegroundService(this, intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra("wake_word", false)) {
            webView.evaluateJavascript(
                "if(window.onBethuneWakeWord)window.onBethuneWakeWord()",
                null
            )
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        instance = null
        webView.destroy()
        super.onDestroy()
    }

    inner class BethuneJsBridge(private val webView: WebView) {

        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun isWakeWordActive(): Boolean {
            return WakeWordService.isRunning
        }

        @JavascriptInterface
        fun getDebugLog(): String {
            return NativeDebugLog.getAll()
        }

        @JavascriptInterface
        fun openWifiSettings() {
            val intent = Intent(android.provider.Settings.ACTION_WIFI_SETTINGS)
            startActivity(intent)
        }
    }
}
