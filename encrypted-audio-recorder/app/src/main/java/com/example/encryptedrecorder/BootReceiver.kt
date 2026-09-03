package com.example.encryptedrecorder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "Boot/Package event received: $action")

        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON") {
            
            val dbHelper = ContactsDatabaseHelper(context)
            val isBackgroundEnabled = dbHelper.getSetting(ContactsDatabaseHelper.KEY_BACKGROUND_ENABLED, false)

            if (isBackgroundEnabled) {
                Log.d(TAG, "Background call listener is enabled in DB settings following system boot/update.")
            } else {
                Log.d(TAG, "Background call listener is disabled in DB settings on boot.")
            }
        }
    }
}
