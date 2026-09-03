package com.example.encryptedrecorder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.CallLog
import android.telephony.TelephonyManager
import android.util.Log
import android.widget.Toast
import androidx.core.content.ContextCompat

class CallReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallReceiver"
        private const val PREFS_NAME = "call_receiver_prefs"
        private const val KEY_SAVED_NUMBER = "saved_number"
        private var lastState = TelephonyManager.EXTRA_STATE_IDLE
        private var isRecordingCall = false
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != TelephonyManager.ACTION_PHONE_STATE_CHANGED && action != Intent.ACTION_NEW_OUTGOING_CALL) return

        val dbHelper = ContactsDatabaseHelper(context)
        val isBackgroundEnabled = dbHelper.getSetting(ContactsDatabaseHelper.KEY_BACKGROUND_ENABLED, false)
        val isNotificationEnabled = dbHelper.getSetting(ContactsDatabaseHelper.KEY_NOTIFICATION_ENABLED, false)

        if (!isBackgroundEnabled) {
            Log.d(TAG, "Background call monitoring disabled in DB settings.")
            return
        }

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Capture number from intent if available
        var numberFromIntent: String? = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
        if (numberFromIntent.isNullOrEmpty() && action == Intent.ACTION_NEW_OUTGOING_CALL) {
            numberFromIntent = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
        }

        if (!numberFromIntent.isNullOrEmpty()) {
            prefs.edit().putString(KEY_SAVED_NUMBER, numberFromIntent).apply()
            Log.d(TAG, "Saved incoming/outgoing call number to prefs: $numberFromIntent")
        }

        val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        Log.d(TAG, "Phone State Change: $stateStr | Intent Action: $action")

        if (stateStr == lastState) return
        lastState = stateStr

        when (stateStr) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                val savedNumber = prefs.getString(KEY_SAVED_NUMBER, null)
                Log.d(TAG, "Incoming call ringing from: ${savedNumber ?: "Unknown/Private"}")
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                // Call answered / picked up
                var targetNumber = prefs.getString(KEY_SAVED_NUMBER, null)

                // Fallback: If caller ID was withheld by OS in Intent, query recent CallLog
                if (targetNumber.isNullOrEmpty()) {
                    targetNumber = getLatestCallLogNumber(context)
                    if (!targetNumber.isNullOrEmpty()) {
                        prefs.edit().putString(KEY_SAVED_NUMBER, targetNumber).apply()
                        Log.d(TAG, "Retrieved number from CallLog fallback: $targetNumber")
                    }
                }

                Log.d(TAG, "Call OFFHOOK (Active Call) with number: $targetNumber")

                if (!isRecordingCall && !targetNumber.isNullOrEmpty()) {
                    if (dbHelper.isPhoneNumberInWhitelist(targetNumber)) {
                        Log.d(TAG, "Match found in whitelist for $targetNumber! Starting background recording service.")
                        isRecordingCall = true
                        
                        try {
                            val startIntent = Intent(context, AudioRecordingService::class.java).apply {
                                this.action = AudioRecordingService.ACTION_START
                                putExtra(AudioRecordingService.EXTRA_SHOW_NOTIFICATION, isNotificationEnabled)
                            }
                            ContextCompat.startForegroundService(context, startIntent)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to start AudioRecordingService", e)
                        }
                    } else {
                        Log.d(TAG, "Call active from $targetNumber, but number is NOT in whitelist database table.")
                    }
                }
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                // Call ended / disconnected
                if (isRecordingCall) {
                    Log.d(TAG, "Call disconnected. Stopping recording & saving encrypted file.")
                    isRecordingCall = false
                    try {
                        val stopIntent = Intent(context, AudioRecordingService::class.java).apply {
                            this.action = AudioRecordingService.ACTION_STOP
                        }
                        context.startService(stopIntent)
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to stop AudioRecordingService", e)
                    }
                }
                prefs.edit().remove(KEY_SAVED_NUMBER).apply()
            }
        }
    }

    private fun getLatestCallLogNumber(context: Context): String? {
        return try {
            if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "READ_CALL_LOG permission not granted for CallLog fallback query")
                return null
            }
            val cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls.NUMBER),
                null, null,
                "${CallLog.Calls.DATE} DESC"
            )
            cursor?.use {
                if (it.moveToFirst()) {
                    val numIndex = it.getColumnIndex(CallLog.Calls.NUMBER)
                    if (numIndex >= 0) {
                        it.getString(numIndex)
                    } else null
                } else null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying CallLog fallback", e)
            null
        }
    }
}
