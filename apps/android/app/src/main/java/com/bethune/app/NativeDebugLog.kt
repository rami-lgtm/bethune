package com.bethune.app

import java.util.concurrent.ConcurrentLinkedDeque

/**
 * Thread-safe debug log shared between WakeWordService and the JS bridge.
 * The web debug panel polls this via BethuneNative.getDebugLog().
 */
object NativeDebugLog {
    private val entries = ConcurrentLinkedDeque<String>()
    private const val MAX_ENTRIES = 100

    fun log(msg: String) {
        val ts = java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.US)
            .format(java.util.Date())
        entries.addFirst("[$ts] $msg")
        while (entries.size > MAX_ENTRIES) {
            entries.removeLast()
        }
        android.util.Log.d("BethuneDebug", msg)
    }

    fun getAll(): String {
        return entries.joinToString("\n")
    }

    fun clear() {
        entries.clear()
    }
}
