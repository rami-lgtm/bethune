package com.bethune.app

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.media.MediaPlayer
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.android.RecognitionListener
import org.vosk.android.SpeechService
import org.json.JSONObject
import java.io.IOException

/**
 * Foreground service that listens for "okay computer" wake word using Vosk
 * offline speech recognition, then captures the command and sends it to the web chat.
 *
 * Flow:
 * 1. WAITING mode: Vosk continuously transcribes, looking for wake phrase
 * 2. Wake phrase found → play chime, extract command from same utterance
 *    e.g. "okay computer vacuum the floor" → command = "vacuum the floor"
 * 3. If no command in same utterance, switch to CAPTURING mode
 * 4. CAPTURING mode: next complete utterance becomes the command
 * 5. Send command to web chat via JavaScript bridge
 * 6. Return to WAITING mode
 */
class WakeWordService : Service(), RecognitionListener {

    companion object {
        private const val TAG = "WakeWordService"
        private const val NOTIFICATION_ID = 1
        private const val SAMPLE_RATE = 16000f

        private val WAKE_PHRASES = listOf(
            "okay computer",
            "ok computer",
            "hey computer",
            "okay bethune",
            "ok bethune",
            "hey bethune"
        )

        private const val DETECTION_COOLDOWN_MS = 2000L
        // How long to wait for a command after wake word (ms)
        private const val COMMAND_TIMEOUT_MS = 8000L

        @Volatile
        var isRunning = false
            private set
    }

    private enum class ListenMode { WAITING, CAPTURING }

    private var model: Model? = null
    private var speechService: SpeechService? = null
    private var mediaPlayer: MediaPlayer? = null
    private var lastDetectionTime = 0L
    private var listenMode = ListenMode.WAITING
    private var captureStartTime = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        initModel()
        return START_STICKY
    }

    override fun onDestroy() {
        speechService?.stop()
        speechService?.shutdown()
        speechService = null
        model?.close()
        model = null
        mediaPlayer?.release()
        mediaPlayer = null
        isRunning = false
        super.onDestroy()
    }

    private fun createNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, BethuneApp.WAKE_WORD_CHANNEL_ID)
            .setContentTitle("Bethune")
            .setContentText("Listening for \"Okay Computer\"...")
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun initModel() {
        NativeDebugLog.log("Initializing Vosk model...")

        Thread {
            try {
                val modelDir = java.io.File(filesDir, "model")
                if (!java.io.File(modelDir, "conf/mfcc.conf").exists()) {
                    NativeDebugLog.log("Copying model to internal storage...")
                    copyAssetDir("model-en-us", modelDir)
                    NativeDebugLog.log("Model copied")
                } else {
                    NativeDebugLog.log("Model already cached")
                }

                model = Model(modelDir.absolutePath)
                NativeDebugLog.log("Vosk model loaded OK")
                startListening()
            } catch (e: Exception) {
                NativeDebugLog.log("ERROR loading model: ${e.message}")
                Log.e(TAG, "Failed to load Vosk model", e)
                stopSelf()
            }
        }.start()
    }

    private fun copyAssetDir(assetPath: String, targetDir: java.io.File) {
        val assetManager = assets
        val files = assetManager.list(assetPath) ?: return
        targetDir.mkdirs()
        for (file in files) {
            val srcPath = "$assetPath/$file"
            val destFile = java.io.File(targetDir, file)
            val subFiles = assetManager.list(srcPath)
            if (subFiles != null && subFiles.isNotEmpty()) {
                copyAssetDir(srcPath, destFile)
            } else {
                assetManager.open(srcPath).use { input ->
                    destFile.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
            }
        }
    }

    private fun startListening() {
        val m = model ?: return
        try {
            val recognizer = Recognizer(m, SAMPLE_RATE)
            recognizer.setMaxAlternatives(0)
            recognizer.setPartialWords(false)

            speechService = SpeechService(recognizer, SAMPLE_RATE)
            speechService?.startListening(this)
            NativeDebugLog.log("Listening — say \"Okay Computer\"")
        } catch (e: IOException) {
            NativeDebugLog.log("ERROR starting Vosk: ${e.message}")
            Log.e(TAG, "Failed to start Vosk", e)
        }
    }

    // ==================== RecognitionListener ====================

    override fun onPartialResult(hypothesis: String?) {
        hypothesis ?: return
        val text = parseText(hypothesis)
        if (text.isEmpty()) return

        when (listenMode) {
            ListenMode.WAITING -> {
                // Check for wake word in partial results for faster response
                checkForWakeWord(text)
            }
            ListenMode.CAPTURING -> {
                // Show partial command in debug
                NativeDebugLog.log("Hearing: \"$text\"")
                // Send partial to web view so user sees it typing
                sendPartialToWebView(text)
            }
        }
    }

    override fun onResult(hypothesis: String?) {
        hypothesis ?: return
        val text = parseText(hypothesis)
        if (text.isEmpty()) return

        when (listenMode) {
            ListenMode.WAITING -> {
                NativeDebugLog.log("Heard: \"$text\"")
                checkForWakeWord(text)
            }
            ListenMode.CAPTURING -> {
                // This is the complete command
                NativeDebugLog.log("Command: \"$text\"")
                sendCommandToWebView(text)
                listenMode = ListenMode.WAITING
                NativeDebugLog.log("Back to listening for wake word")
            }
        }
    }

    override fun onFinalResult(hypothesis: String?) {
        hypothesis ?: return
        val text = parseText(hypothesis)
        if (text.isNotEmpty() && listenMode == ListenMode.CAPTURING) {
            NativeDebugLog.log("Final command: \"$text\"")
            sendCommandToWebView(text)
            listenMode = ListenMode.WAITING
        }
    }

    override fun onError(error: Exception?) {
        NativeDebugLog.log("Vosk error: ${error?.message}")
        Log.e(TAG, "Vosk error", error)
        listenMode = ListenMode.WAITING
    }

    override fun onTimeout() {
        NativeDebugLog.log("Vosk timeout — restarting...")
        listenMode = ListenMode.WAITING
        speechService?.stop()
        startListening()
    }

    // ==================== Wake Word + Command ====================

    private fun parseText(json: String): String {
        return try {
            val obj = JSONObject(json)
            obj.optString("text", obj.optString("partial", ""))
                .lowercase()
                .trim()
        } catch (e: Exception) {
            ""
        }
    }

    private fun checkForWakeWord(text: String) {
        val now = System.currentTimeMillis()
        if (now - lastDetectionTime < DETECTION_COOLDOWN_MS) return

        for (phrase in WAKE_PHRASES) {
            if (text.contains(phrase)) {
                lastDetectionTime = now
                NativeDebugLog.log("*** WAKE WORD: \"$phrase\" ***")

                // Play chime
                playChime()

                // Check if there's a command after the wake phrase
                // e.g. "okay computer vacuum the floor"
                val idx = text.indexOf(phrase) + phrase.length
                val afterWake = text.substring(idx).trim()

                if (afterWake.isNotEmpty()) {
                    // Command was in the same utterance
                    NativeDebugLog.log("Inline command: \"$afterWake\"")
                    sendCommandToWebView(afterWake)
                } else {
                    // No command yet — switch to capture mode for next utterance
                    NativeDebugLog.log("Waiting for command...")
                    listenMode = ListenMode.CAPTURING
                    captureStartTime = now
                    // Notify web view that wake word was detected (show indicator)
                    notifyWakeWordDetected()
                }
                return
            }
        }

        // Check capture timeout
        if (listenMode == ListenMode.CAPTURING &&
            System.currentTimeMillis() - captureStartTime > COMMAND_TIMEOUT_MS
        ) {
            NativeDebugLog.log("Command timeout — back to waiting")
            listenMode = ListenMode.WAITING
        }
    }

    private fun playChime() {
        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer.create(this, R.raw.wake_chime)
            mediaPlayer?.setOnCompletionListener { it.release() }
            mediaPlayer?.start()
        } catch (e: Exception) {
            Log.w(TAG, "Could not play chime: ${e.message}")
        }
    }

    private fun notifyWakeWordDetected() {
        // Bring activity to foreground and tell web view we're listening for command
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("wake_word", true)
        }
        startActivity(intent)

        // Tell web view to show "listening" indicator
        sendJsToWebView("if(window.onBethuneWakeWord)window.onBethuneWakeWord()")
    }

    private fun sendPartialToWebView(text: String) {
        val escaped = text.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"")
        sendJsToWebView("if(window.onBethunePartial)window.onBethunePartial('$escaped')")
    }

    private fun sendCommandToWebView(command: String) {
        val escaped = command.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"")
        sendJsToWebView("if(window.onBethuneCommand)window.onBethuneCommand('$escaped')")
        NativeDebugLog.log("Sent to chat: \"$command\"")
    }

    private fun sendJsToWebView(js: String) {
        val intent = Intent("com.bethune.EVALUATE_JS")
        intent.putExtra("js", js)
        sendBroadcast(intent)
    }
}
