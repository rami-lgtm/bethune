package com.bethune.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
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
                    // Grant microphone access to the web app for voice input
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

            // JavaScript bridge for wake word activation
            addJavascriptInterface(BethuneJsBridge(this), "BethuneNative")
        }

        setContentView(webView)

        // Load the Bethune web app
        webView.loadUrl(BuildConfig.BETHUNE_URL)

        // Request permissions and start wake word service
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

    /**
     * Called by WakeWordService when "Hey Bethune" is detected.
     * Activates the web app's voice input via JavaScript.
     */
    fun onWakeWordDetected() {
        runOnUiThread {
            // Bring app to foreground if needed
            webView.evaluateJavascript(
                """
                if (window.onBethuneWakeWord) {
                    window.onBethuneWakeWord();
                }
                """.trimIndent(),
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
        webView.destroy()
        super.onDestroy()
    }

    /**
     * JavaScript interface exposed to the web app as window.BethuneNative
     */
    inner class BethuneJsBridge(private val webView: WebView) {

        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun isWakeWordActive(): Boolean {
            return WakeWordService.isRunning
        }

        @JavascriptInterface
        fun openWifiSettings() {
            val intent = Intent(android.provider.Settings.ACTION_WIFI_SETTINGS)
            startActivity(intent)
        }
    }
}
