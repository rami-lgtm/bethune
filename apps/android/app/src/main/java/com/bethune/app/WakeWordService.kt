package com.bethune.app

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

/**
 * Foreground service that continuously listens for the "Hey Bethune" wake word
 * using a microWakeWord TFLite model.
 *
 * Audio pipeline:
 * 1. Capture 16kHz mono PCM audio via AudioRecord
 * 2. Buffer into overlapping windows matching the model's input spec
 * 3. Run TFLite inference on each window
 * 4. If confidence > threshold, notify MainActivity to activate voice input
 */
class WakeWordService : Service() {

    companion object {
        private const val TAG = "WakeWordService"
        private const val NOTIFICATION_ID = 1
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT

        // microWakeWord model parameters
        // The model expects 1820ms of audio (29120 samples at 16kHz) as input
        private const val MODEL_INPUT_SAMPLES = 29120
        // Sliding window step: process every 320 samples (~20ms) for responsiveness
        private const val STEP_SAMPLES = 320
        // Wake word detection threshold (0.0-1.0)
        private const val DETECTION_THRESHOLD = 0.5f
        // Cooldown after detection to prevent repeated triggers (ms)
        private const val DETECTION_COOLDOWN_MS = 3000L

        // Model file in assets/ — replace with your trained "Hey Bethune" model
        private const val MODEL_FILENAME = "hey_bethune.tflite"

        @Volatile
        var isRunning = false
            private set
    }

    private var interpreter: Interpreter? = null
    private var audioRecord: AudioRecord? = null
    private var isListening = false
    private var listenerThread: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        startListening()
        return START_STICKY
    }

    override fun onDestroy() {
        stopListening()
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
            .setContentText("Listening for \"Hey Bethune\"...")
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun startListening() {
        if (isListening) return

        try {
            interpreter = Interpreter(loadModelFile())
            Log.d(TAG, "TFLite model loaded successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load TFLite model: ${e.message}")
            Log.e(TAG, "Place your trained hey_bethune.tflite model in app/src/main/assets/")
            stopSelf()
            return
        }

        val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT,
            bufferSize.coerceAtLeast(MODEL_INPUT_SAMPLES * 2)
        )

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord failed to initialize")
            stopSelf()
            return
        }

        isListening = true
        listenerThread = Thread(::audioLoop, "WakeWordListener").also { it.start() }
    }

    private fun stopListening() {
        isListening = false
        listenerThread?.join(2000)
        listenerThread = null

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        interpreter?.close()
        interpreter = null
    }

    private fun audioLoop() {
        val ringBuffer = ShortArray(MODEL_INPUT_SAMPLES)
        var ringPos = 0
        val readBuffer = ShortArray(STEP_SAMPLES)
        var lastDetectionTime = 0L

        audioRecord?.startRecording()
        Log.d(TAG, "Wake word listening started")

        while (isListening) {
            val read = audioRecord?.read(readBuffer, 0, STEP_SAMPLES) ?: -1
            if (read <= 0) continue

            // Write into ring buffer
            for (i in 0 until read) {
                ringBuffer[ringPos] = readBuffer[i]
                ringPos = (ringPos + 1) % MODEL_INPUT_SAMPLES
            }

            // Run inference
            val now = System.currentTimeMillis()
            if (now - lastDetectionTime < DETECTION_COOLDOWN_MS) continue

            val confidence = runInference(ringBuffer, ringPos)
            if (confidence > DETECTION_THRESHOLD) {
                Log.d(TAG, "Wake word detected! Confidence: $confidence")
                lastDetectionTime = now
                notifyWakeWordDetected()
            }
        }

        Log.d(TAG, "Wake word listening stopped")
    }

    /**
     * Run TFLite inference on the audio buffer.
     * Converts the ring buffer to a properly ordered float array,
     * normalizes to [-1, 1], and feeds it to the model.
     */
    private fun runInference(ringBuffer: ShortArray, ringPos: Int): Float {
        val interp = interpreter ?: return 0f

        // Reorder ring buffer so oldest sample is first
        val inputFloat = FloatArray(MODEL_INPUT_SAMPLES)
        for (i in 0 until MODEL_INPUT_SAMPLES) {
            val idx = (ringPos + i) % MODEL_INPUT_SAMPLES
            inputFloat[i] = ringBuffer[idx] / 32768f // Normalize 16-bit PCM to [-1, 1]
        }

        // Prepare input tensor [1, MODEL_INPUT_SAMPLES]
        val inputBuffer = ByteBuffer.allocateDirect(MODEL_INPUT_SAMPLES * 4).apply {
            order(ByteOrder.nativeOrder())
            for (sample in inputFloat) {
                putFloat(sample)
            }
            rewind()
        }

        // Prepare output tensor [1, 1] — wake word probability
        val outputBuffer = ByteBuffer.allocateDirect(4).apply {
            order(ByteOrder.nativeOrder())
        }

        try {
            interp.run(inputBuffer, outputBuffer)
            outputBuffer.rewind()
            return outputBuffer.float
        } catch (e: Exception) {
            Log.e(TAG, "Inference error: ${e.message}")
            return 0f
        }
    }

    private fun notifyWakeWordDetected() {
        // Send broadcast to wake up the activity
        val intent = Intent("com.bethune.WAKE_WORD_DETECTED")
        sendBroadcast(intent)

        // Also try to call the activity directly if it exists
        val activityIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("wake_word", true)
        }
        startActivity(activityIntent)
    }

    private fun loadModelFile(): MappedByteBuffer {
        val fileDescriptor = assets.openFd(MODEL_FILENAME)
        val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        return fileChannel.map(
            FileChannel.MapMode.READ_ONLY,
            fileDescriptor.startOffset,
            fileDescriptor.declaredLength
        )
    }
}
