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
 * Foreground service that listens for "okay computer" wake word using Vosk,
 * then captures the follow-up command and sends it to the web chat.
 *
 * Flow:
 * 1. WAITING: Vosk transcribes continuously, scanning for wake phrase
 * 2. Wake phrase detected → play chime, switch to CAPTURING
 * 3. CAPTURING: show partial text in chat input as user speaks
 * 4. When user finishes speaking (onResult) → send final command to chat
 * 5. Return to WAITING
 *
 * The wake phrase itself is NEVER included in the command text.
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
        private const val COMMAND_TIMEOUT_MS = 10000L

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
                checkForWakeWord(text)
            }
            ListenMode.CAPTURING -> {
                // Strip any leftover wake phrase from the partial
                val clean = stripWakePhrases(text)
                if (clean.isNotEmpty()) {
                    sendPartialToWebView(clean)
                }
                // Check timeout
                if (System.currentTimeMillis() - captureStartTime > COMMAND_TIMEOUT_MS) {
                    NativeDebugLog.log("Command timeout — back to waiting")
                    listenMode = ListenMode.WAITING
                    sendJsToWebView("if(window.onBethuneCancelCapture)window.onBethuneCancelCapture()")
                }
            }
        }
    }

    override fun onResult(hypothesis: String?) {
        hypothesis ?: return
        val text = parseText(hypothesis)

        when (listenMode) {
            ListenMode.WAITING -> {
                if (text.isNotEmpty()) {
                    checkForWakeWord(text)
                }
            }
            ListenMode.CAPTURING -> {
                // This is the finished utterance — the user stopped talking
                val clean = stripWakePhrases(text)
                if (clean.isNotEmpty()) {
                    NativeDebugLog.log("Command: \"$clean\"")
                    sendCommandToWebView(clean)
                }
                // Even if empty (they just said the wake word again), go back to waiting
                listenMode = ListenMode.WAITING
                NativeDebugLog.log("Back to listening for wake word")
            }
        }
    }

    override fun onFinalResult(hypothesis: String?) {
        hypothesis ?: return
        val text = parseText(hypothesis)
        if (text.isNotEmpty() && listenMode == ListenMode.CAPTURING) {
            val clean = stripWakePhrases(text)
            if (clean.isNotEmpty()) {
                NativeDebugLog.log("Final command: \"$clean\"")
                sendCommandToWebView(clean)
            }
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

    /**
     * Remove any wake phrase from the text so it doesn't appear in the command.
     */
    private fun stripWakePhrases(text: String): String {
        var result = text
        for (phrase in WAKE_PHRASES) {
            result = result.replace(phrase, "")
        }
        return result.trim()
    }

    private fun checkForWakeWord(text: String) {
        val now = System.currentTimeMillis()
        if (now - lastDetectionTime < DETECTION_COOLDOWN_MS) return

        for (phrase in WAKE_PHRASES) {
            if (text.contains(phrase)) {
                lastDetectionTime = now
                NativeDebugLog.log("*** WAKE WORD DETECTED ***")

                // Play chime
                playChime()

                // Always go to CAPTURING mode — wait for user to speak their command
                // after the chime (never send inline commands)
                listenMode = ListenMode.CAPTURING
                captureStartTime = now
                notifyWakeWordDetected()
                return
            }
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
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("wake_word", true)
        }
        startActivity(intent)
        sendJsToWebView("if(window.onBethuneWakeWord)window.onBethuneWakeWord()")
    }

    private fun sendPartialToWebView(text: String) {
        val escaped = escapeJs(text)
        sendJsToWebView("if(window.onBethunePartial)window.onBethunePartial('$escaped')")
    }

    private fun sendCommandToWebView(command: String) {
        val escaped = escapeJs(command)
        sendJsToWebView("if(window.onBethuneCommand)window.onBethuneCommand('$escaped')")
        NativeDebugLog.log("Sent to chat: \"$command\"")
    }

    private fun escapeJs(text: String): String {
        return text.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"")
    }

    private fun sendJsToWebView(js: String) {
        MainActivity.evaluateJs(js)
    }
}
