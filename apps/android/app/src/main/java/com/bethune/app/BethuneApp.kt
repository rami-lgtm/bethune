package com.bethune.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class BethuneApp : Application() {

    companion object {
        const val WAKE_WORD_CHANNEL_ID = "bethune_wake_word"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                WAKE_WORD_CHANNEL_ID,
                "Wake Word Listening",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Bethune is listening for 'Hey Bethune'"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
