package com.bethune.app

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaPlayer
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
import kotlin.math.*

/**
 * Foreground service that continuously listens for the "Okay Computer" wake word
 * using a microWakeWord TFLite model.
 *
 * Pipeline (matching ESPHome's implementation):
 * 1. Capture 16kHz mono PCM audio in 30ms frames (480 samples)
 * 2. Compute mel spectrogram features (40 int8 values per frame)
 * 3. Feed features to the streaming TFLite model
 * 4. Apply sliding window averaging on output probabilities
 * 5. Trigger when average exceeds threshold
 * 6. Play chime sound on detection
 */
class WakeWordService : Service() {

    companion object {
        private const val TAG = "WakeWordService"
        private const val NOTIFICATION_ID = 1
        private const val SAMPLE_RATE = 16000

        // Audio frame parameters
        private const val FEATURE_DURATION_MS = 30
        private const val FEATURE_SAMPLES = SAMPLE_RATE * FEATURE_DURATION_MS / 1000  // 480
        private const val NUM_FEATURES = 40
        private const val FFT_SIZE = 512

        // Mel filterbank range (from ESPHome preprocessor_settings.h)
        private const val MEL_LOWER_HZ = 125.0
        private const val MEL_UPPER_HZ = 7500.0

        // Model parameters from okay_computer.json
        private const val PROBABILITY_CUTOFF_UINT8 = 247  // 0.97 * 255
        private const val SLIDING_WINDOW_SIZE = 5
        private const val FEATURE_STEP_SIZE = 10
        private const val MIN_SLICES_BEFORE_DETECTION = 100

        private const val DETECTION_COOLDOWN_MS = 3000L
        private const val MODEL_FILENAME = "hey_bethune.tflite"

        @Volatile
        var isRunning = false
            private set
    }

    private var interpreter: Interpreter? = null
    private var audioRecord: AudioRecord? = null
    private var isListening = false
    private var listenerThread: Thread? = null
    private var mediaPlayer: MediaPlayer? = null

    // Mel filterbank
    private lateinit var melFilterbank: Array<FloatArray>
    private lateinit var hannWindow: FloatArray

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        initMelFilterbank()
        hannWindow = FloatArray(FFT_SIZE) {
            0.5f * (1.0f - cos(2.0f * PI.toFloat() * it / (FFT_SIZE - 1)))
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        startListening()
        return START_STICKY
    }

    override fun onDestroy() {
        stopListening()
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

    private fun startListening() {
        if (isListening) return

        // Load TFLite model
        try {
            val options = Interpreter.Options().apply {
                setNumThreads(2)
                setUseXNNPACK(true)
            }
            interpreter = Interpreter(loadModelFile(MODEL_FILENAME), options)

            // Log tensor info for debugging
            val model = interpreter!!
            for (i in 0 until model.inputTensorCount) {
                val t = model.getInputTensor(i)
                Log.i(TAG, "Input[$i] '${t.name()}': shape=${t.shape().contentToString()} dtype=${t.dataType()}")
            }
            for (i in 0 until model.outputTensorCount) {
                val t = model.getOutputTensor(i)
                Log.i(TAG, "Output[$i] '${t.name()}': shape=${t.shape().contentToString()} dtype=${t.dataType()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load model: ${e.message}", e)
            stopSelf()
            return
        }

        // Init audio recorder
        val bufferSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize.coerceAtLeast(FEATURE_SAMPLES * 4)
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
        listenerThread?.join(3000)
        listenerThread = null
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        interpreter?.close()
        interpreter = null
    }

    private fun audioLoop() {
        val model = interpreter ?: return

        // Read model input shape to determine stride
        val inputShape = model.getInputTensor(0).shape()
        // Expected shape: [1, stride, 40] or [1, 40]
        val stride = if (inputShape.size == 3) inputShape[1] else 1
        val featureDim = if (inputShape.size == 3) inputShape[2] else inputShape[1]
        Log.i(TAG, "Model expects stride=$stride featureDim=$featureDim")

        if (featureDim != NUM_FEATURES) {
            Log.e(TAG, "Model feature dim ($featureDim) != expected ($NUM_FEATURES)")
            return
        }

        val pcmBuffer = ShortArray(FEATURE_SAMPLES)

        // Accumulate stride frames of features
        val strideBuffer = Array(stride) { ByteArray(NUM_FEATURES) }
        var currentStride = 0
        var stepCount = 0

        // Sliding window for probability averaging
        val probWindow = IntArray(SLIDING_WINDOW_SIZE)
        var probIndex = 0
        var totalSlices = 0
        var lastDetectionTime = 0L

        audioRecord?.startRecording()
        Log.i(TAG, "Listening started (stride=$stride, step=$FEATURE_STEP_SIZE)")

        while (isListening) {
            // Read one 30ms frame
            val read = audioRecord?.read(pcmBuffer, 0, FEATURE_SAMPLES) ?: -1
            if (read < FEATURE_SAMPLES) continue

            stepCount++
            // Only process every Nth frame (matching ESPHome feature_step_size)
            if (stepCount % FEATURE_STEP_SIZE != 0) continue

            // Generate mel features
            val features = computeMelFeatures(pcmBuffer)

            // Add to stride buffer
            strideBuffer[currentStride] = features
            currentStride++

            if (currentStride < stride) continue
            currentStride = 0

            // Run inference
            val prob = runInference(model, strideBuffer, stride)
            if (prob < 0) continue // inference error

            totalSlices++

            // Store in sliding window
            probWindow[probIndex] = prob
            probIndex = (probIndex + 1) % SLIDING_WINDOW_SIZE

            // Log periodically
            if (totalSlices % 50 == 0) {
                val avg = probWindow.sum() / SLIDING_WINDOW_SIZE
                Log.d(TAG, "Slice $totalSlices: prob=$prob avg=$avg threshold=$PROBABILITY_CUTOFF_UINT8")
            }

            // Wait for minimum warmup slices
            if (totalSlices < MIN_SLICES_BEFORE_DETECTION) continue

            // Check cooldown
            val now = System.currentTimeMillis()
            if (now - lastDetectionTime < DETECTION_COOLDOWN_MS) continue

            // Check sliding window average against threshold
            val avgProb = probWindow.sum() / SLIDING_WINDOW_SIZE
            if (avgProb >= PROBABILITY_CUTOFF_UINT8) {
                Log.i(TAG, "*** WAKE WORD DETECTED *** avg=$avgProb threshold=$PROBABILITY_CUTOFF_UINT8")
                lastDetectionTime = now
                // Reset window
                probWindow.fill(0)
                totalSlices = 0
                onWakeWordDetected()
            }
        }

        Log.i(TAG, "Listening stopped")
    }

    /**
     * Run TFLite inference.
     * Input: int8 [1, stride, 40]
     * Output: uint8 [1, 1] (probability 0-255)
     */
    private fun runInference(model: Interpreter, features: Array<ByteArray>, stride: Int): Int {
        // Prepare input: [1, stride, 40] as int8
        val inputSize = stride * NUM_FEATURES
        val inputBuffer = ByteBuffer.allocateDirect(inputSize).apply {
            order(ByteOrder.nativeOrder())
            for (i in 0 until stride) {
                put(features[i])
            }
            rewind()
        }

        // Prepare output: [1, 1]
        // Output type could be uint8 or float depending on model version
        val outputTensor = model.getOutputTensor(0)
        val outputBuffer = ByteBuffer.allocateDirect(outputTensor.numBytes()).apply {
            order(ByteOrder.nativeOrder())
        }

        return try {
            model.run(inputBuffer, outputBuffer)
            outputBuffer.rewind()

            when (outputTensor.dataType()) {
                org.tensorflow.lite.DataType.UINT8 -> outputBuffer.get().toInt() and 0xFF
                org.tensorflow.lite.DataType.FLOAT32 -> (outputBuffer.float * 255).toInt().coerceIn(0, 255)
                org.tensorflow.lite.DataType.INT8 -> (outputBuffer.get().toInt() + 128).coerceIn(0, 255)
                else -> {
                    Log.w(TAG, "Unexpected output dtype: ${outputTensor.dataType()}")
                    outputBuffer.get().toInt() and 0xFF
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Inference error: ${e.message}", e)
            -1
        }
    }

    // ==================== Mel Spectrogram Feature Extraction ====================

    /**
     * Compute 40 int8 mel spectrogram features from 480 PCM samples.
     * Matches ESPHome's audio frontend:
     * - Hann window + FFT
     * - Mel filterbank (125-7500Hz, 40 channels)
     * - Log scale
     * - Quantize to int8 using ESPHome's formula:
     *   int8_val = (feature * 256) / 666 - 128
     */
    private fun computeMelFeatures(pcm: ShortArray): ByteArray {
        // Apply Hann window + zero-pad to FFT_SIZE
        val fft = FloatArray(FFT_SIZE * 2)
        for (i in 0 until FEATURE_SAMPLES.coerceAtMost(FFT_SIZE)) {
            fft[i * 2] = pcm[i].toFloat() * hannWindow[i]
        }

        // FFT
        computeFFT(fft, FFT_SIZE)

        // Power spectrum
        val numBins = FFT_SIZE / 2 + 1
        val power = FloatArray(numBins)
        for (i in 0 until numBins) {
            val re = fft[i * 2]
            val im = fft[i * 2 + 1]
            power[i] = re * re + im * im
        }

        // Mel filterbank energies
        val features = ByteArray(NUM_FEATURES)
        for (i in 0 until NUM_FEATURES) {
            var energy = 0f
            for (j in 0 until numBins) {
                energy += melFilterbank[i][j] * power[j]
            }

            // Match ESPHome's frontend output scaling:
            // Frontend outputs ~0-670 range values
            // Then quantized: (val * 256) / 666 - 128
            val frontendVal = if (energy > 1.0f) {
                // Log scale + shift to match ESPHome ~0-670 range
                (ln(energy) * 40.0f).coerceIn(0f, 670f)
            } else {
                0f
            }

            val quantized = ((frontendVal * 256.0f + 333.0f) / 666.0f - 128.0f)
                .roundToInt()
                .coerceIn(-128, 127)
            features[i] = quantized.toByte()
        }

        return features
    }

    // ==================== Mel Filterbank Init ====================

    private fun hzToMel(hz: Double): Double = 1127.0 * ln(1.0 + hz / 700.0)
    private fun melToHz(mel: Double): Double = 700.0 * (exp(mel / 1127.0) - 1.0)

    private fun initMelFilterbank() {
        val numBins = FFT_SIZE / 2 + 1
        melFilterbank = Array(NUM_FEATURES) { FloatArray(numBins) }

        val melLow = hzToMel(MEL_LOWER_HZ)
        val melHigh = hzToMel(MEL_UPPER_HZ)
        val melPoints = DoubleArray(NUM_FEATURES + 2) {
            melLow + it * (melHigh - melLow) / (NUM_FEATURES + 1)
        }
        val hzPoints = melPoints.map { melToHz(it) }
        val binFreq = SAMPLE_RATE.toDouble() / FFT_SIZE

        for (i in 0 until NUM_FEATURES) {
            val lo = hzPoints[i]
            val mid = hzPoints[i + 1]
            val hi = hzPoints[i + 2]
            for (j in 0 until numBins) {
                val freq = j * binFreq
                melFilterbank[i][j] = when {
                    freq < lo -> 0f
                    freq < mid -> ((freq - lo) / (mid - lo)).toFloat()
                    freq < hi -> ((hi - freq) / (hi - mid)).toFloat()
                    else -> 0f
                }
            }
        }
    }

    // ==================== FFT ====================

    private fun computeFFT(data: FloatArray, n: Int) {
        // Bit-reversal permutation
        var j = 0
        for (i in 0 until n) {
            if (i < j) {
                var t = data[i * 2]; data[i * 2] = data[j * 2]; data[j * 2] = t
                t = data[i * 2 + 1]; data[i * 2 + 1] = data[j * 2 + 1]; data[j * 2 + 1] = t
            }
            var m = n / 2
            while (m >= 1 && j >= m) { j -= m; m /= 2 }
            j += m
        }
        // Cooley-Tukey
        var step = 1
        while (step < n) {
            val half = step; step *= 2
            val angleStep = -PI.toFloat() / half
            for (k in 0 until half) {
                val angle = k * angleStep
                val wr = cos(angle); val wi = sin(angle)
                var i = k
                while (i < n) {
                    val ji = i + half
                    val tr = wr * data[ji * 2] - wi * data[ji * 2 + 1]
                    val ti = wr * data[ji * 2 + 1] + wi * data[ji * 2]
                    data[ji * 2] = data[i * 2] - tr
                    data[ji * 2 + 1] = data[i * 2 + 1] - ti
                    data[i * 2] += tr
                    data[i * 2 + 1] += ti
                    i += step
                }
            }
        }
    }

    // ==================== Wake Word Detection ====================

    private fun onWakeWordDetected() {
        // Play chime sound
        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer.create(this, R.raw.wake_chime)
            mediaPlayer?.setOnCompletionListener { it.release() }
            mediaPlayer?.start()
        } catch (e: Exception) {
            Log.w(TAG, "Could not play chime: ${e.message}")
        }

        // Send broadcast
        sendBroadcast(Intent("com.bethune.WAKE_WORD_DETECTED"))

        // Bring activity to foreground
        val activityIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("wake_word", true)
        }
        startActivity(activityIntent)
    }

    private fun loadModelFile(filename: String): MappedByteBuffer {
        val fd = assets.openFd(filename)
        val input = FileInputStream(fd.fileDescriptor)
        return input.channel.map(
            FileChannel.MapMode.READ_ONLY,
            fd.startOffset,
            fd.declaredLength
        )
    }
}
