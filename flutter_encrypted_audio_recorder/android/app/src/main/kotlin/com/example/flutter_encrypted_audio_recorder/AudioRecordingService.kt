package com.example.flutter_encrypted_audio_recorder

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AudioRecordingService : Service() {

    private var audioRecord: AudioRecord? = null
    @Volatile private var isRecording = false
    private var recordingThread: Thread? = null
    private var tempAudioFile: File? = null

    private val sampleRate = 44100
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT

    companion object {
        const val CHANNEL_ID = "transparent_audio_recorder_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val EXTRA_SHOW_NOTIFICATION = "EXTRA_SHOW_NOTIFICATION"
        private const val TAG = "AudioRecordingService"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val showNotification = intent?.getBooleanExtra(EXTRA_SHOW_NOTIFICATION, true) ?: true
        when (intent?.action) {
            ACTION_START -> startAudioRecording(showNotification)
            ACTION_STOP -> stopAudioRecording()
        }
        return START_STICKY
    }

    private fun startAudioRecording(showNotification: Boolean = true) {
        if (isRecording) return

        val notification = createForegroundNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        if (!showNotification) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        }

        val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        val bufferSize = Math.max(minBufferSize, 4096)

        val audioSources = intArrayOf(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            MediaRecorder.AudioSource.CAMCORDER,
            MediaRecorder.AudioSource.UNPROCESSED,
            MediaRecorder.AudioSource.MIC,
            MediaRecorder.AudioSource.VOICE_COMMUNICATION
        )

        var recordObj: AudioRecord? = null
        var selectedSource = -1

        for (source in audioSources) {
            try {
                val rec = AudioRecord(
                    source,
                    sampleRate,
                    channelConfig,
                    audioFormat,
                    bufferSize * 2
                )
                if (rec.state == AudioRecord.STATE_INITIALIZED) {
                    recordObj = rec
                    selectedSource = source
                    Log.d(TAG, "AudioRecord initialized successfully with AudioSource: $source")
                    break
                } else {
                    rec.release()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to initialize AudioRecord with source $source", e)
            }
        }

        if (recordObj == null) {
            Log.e(TAG, "Could not initialize AudioRecord with any hardware AudioSource")
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return
        }

        audioRecord = recordObj
        isRecording = true

        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        tempAudioFile = File(cacheDir, "temp_rec_$timestamp.wav")

        try {
            audioRecord?.startRecording()
            Log.d(TAG, "AudioRecord started recording using AudioSource: $selectedSource")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start AudioRecord recording", e)
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return
        }

        recordingThread = Thread {
            writePcmDataToWavFile(tempAudioFile!!, bufferSize)
        }.apply { start() }
    }

    private fun writePcmDataToWavFile(wavFile: File, bufferSize: Int) {
        val data = ByteArray(bufferSize)
        var os: FileOutputStream? = null
        var totalAudioLen: Long = 0

        try {
            os = FileOutputStream(wavFile)
            os.write(ByteArray(44))

            while (isRecording) {
                val read = audioRecord?.read(data, 0, data.size) ?: -1
                if (read > 0) {
                    os.write(data, 0, read)
                    totalAudioLen += read
                }
            }

            os.flush()
            os.close()

            updateWavHeader(wavFile, totalAudioLen)
        } catch (e: Exception) {
            Log.e(TAG, "Error writing PCM data to WAV file", e)
        } finally {
            try {
                os?.close()
            } catch (ignored: Exception) {}
        }
    }

    private fun updateWavHeader(wavFile: File, totalAudioLen: Long) {
        val totalDataLen = totalAudioLen + 36
        val longSampleRate = sampleRate.toLong()
        val channels = 1
        val byteRate = longSampleRate * channels * 16 / 8

        val header = ByteArray(44)
        header[0] = 'R'.code.toByte()
        header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte()
        header[3] = 'F'.code.toByte()
        header[4] = (totalDataLen and 0xff).toByte()
        header[5] = (totalDataLen shr 8 and 0xff).toByte()
        header[6] = (totalDataLen shr 16 and 0xff).toByte()
        header[7] = (totalDataLen shr 24 and 0xff).toByte()
        header[8] = 'W'.code.toByte()
        header[9] = 'A'.code.toByte()
        header[10] = 'V'.code.toByte()
        header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte()
        header[13] = 'm'.code.toByte()
        header[14] = 't'.code.toByte()
        header[15] = ' '.code.toByte()
        header[16] = 16
        header[17] = 0
        header[18] = 0
        header[19] = 0
        header[20] = 1
        header[21] = 0
        header[22] = channels.toByte()
        header[23] = 0
        header[24] = (longSampleRate and 0xff).toByte()
        header[25] = (longSampleRate shr 8 and 0xff).toByte()
        header[26] = (longSampleRate shr 16 and 0xff).toByte()
        header[27] = (longSampleRate shr 24 and 0xff).toByte()
        header[28] = (byteRate and 0xff).toByte()
        header[29] = (byteRate shr 8 and 0xff).toByte()
        header[30] = (byteRate shr 16 and 0xff).toByte()
        header[31] = (byteRate shr 24 and 0xff).toByte()
        header[32] = (channels * 16 / 8).toByte()
        header[33] = 0
        header[34] = 16
        header[35] = 0
        header[36] = 'd'.code.toByte()
        header[37] = 'a'.code.toByte()
        header[38] = 't'.code.toByte()
        header[39] = 'a'.code.toByte()
        header[40] = (totalAudioLen and 0xff).toByte()
        header[41] = (totalAudioLen shr 8 and 0xff).toByte()
        header[42] = (totalAudioLen shr 16 and 0xff).toByte()
        header[43] = (totalAudioLen shr 24 and 0xff).toByte()

        var raf: RandomAccessFile? = null
        try {
            raf = RandomAccessFile(wavFile, "rw")
            raf.seek(0)
            raf.write(header)
        } catch (e: Exception) {
            Log.e(TAG, "Error writing WAV header to file", e)
        } finally {
            raf?.close()
        }
    }

    private fun stopAudioRecording() {
        if (!isRecording) return

        try {
            isRecording = false
            recordingThread?.join(1000)

            audioRecord?.apply {
                if (state == AudioRecord.STATE_INITIALIZED) {
                    stop()
                }
                release()
            }
            audioRecord = null

            tempAudioFile?.let { rawFile ->
                if (rawFile.exists()) {
                    val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
                    val encryptedFile = File(filesDir, "Encrypted_Record_$timestamp.enc")
                    
                    val secManager = SecurityManager(applicationContext)
                    secManager.encryptFile(rawFile, encryptedFile)
                    
                    rawFile.delete()

                    val createdAtStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
                    val dbHelper = ContactsDatabaseHelper(applicationContext)
                    dbHelper.insertRecording(encryptedFile.name, encryptedFile.absolutePath, encryptedFile.length(), createdAtStr)

                    Log.d(TAG, "Recording encrypted and indexed in DB: ${encryptedFile.name} (${encryptedFile.length()} bytes)")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping AudioRecord or encrypting file", e)
        } finally {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun createForegroundNotification(): Notification {
        val stopIntent = Intent(this, AudioRecordingService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            0,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val mainIntent = Intent(this, MainActivity::class.java)
        val mainPendingIntent = PendingIntent.getActivity(
            this,
            0,
            mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Transparent Audio Recorder Active")
            .setContentText("Microphone is actively recording call audio.")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(mainPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .addAction(android.R.drawable.ic_media_pause, "Stop Recording", stopPendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Transparent Audio Recorder",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifies user when microphone audio recording is actively running."
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "onTaskRemoved called - Flutter app swiped away from Recents.")
        val dbHelper = ContactsDatabaseHelper(applicationContext)
        val isBackgroundEnabled = dbHelper.getSetting(ContactsDatabaseHelper.KEY_BACKGROUND_ENABLED, false)

        if (isRecording) {
            Log.d(TAG, "Recording active. Service staying alive.")
        } else if (isBackgroundEnabled) {
            Log.d(TAG, "Background call listener active. Manifest CallReceiver listening.")
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        if (isRecording) {
            stopAudioRecording()
        }
        super.onDestroy()
    }
}
