package com.example.encryptedrecorder

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ContactItem(
    val id: Long = 0,
    val name: String,
    val phoneNumber: String
)

data class VoiceRecordingRecord(
    val id: Long = 0,
    val fileName: String,
    val filePath: String,
    val fileSize: Long,
    val createdAt: String,
    val durationSeconds: Int = 0
)

class ContactsDatabaseHelper(context: Context) :
    SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "selected_contacts.db"
        private const val DATABASE_VERSION = 3

        const val TABLE_CONTACTS = "selected_contacts"
        const val COLUMN_ID = "id"
        const val COLUMN_NAME = "name"
        const val COLUMN_PHONE = "phone_number"

        const val TABLE_SETTINGS = "app_settings"
        const val COLUMN_SETTING_KEY = "setting_key"
        const val COLUMN_SETTING_VAL = "setting_value"

        const val TABLE_RECORDINGS = "voice_recordings"
        const val COLUMN_REC_ID = "id"
        const val COLUMN_FILE_NAME = "file_name"
        const val COLUMN_FILE_PATH = "file_path"
        const val COLUMN_FILE_SIZE = "file_size"
        const val COLUMN_CREATED_AT = "created_at"
        const val COLUMN_DURATION = "duration_seconds"

        const val KEY_BACKGROUND_ENABLED = "is_background_enabled"
        const val KEY_NOTIFICATION_ENABLED = "is_notification_enabled"
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createContactsTable = """
            CREATE TABLE $TABLE_CONTACTS (
                $COLUMN_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COLUMN_NAME TEXT NOT NULL,
                $COLUMN_PHONE TEXT NOT NULL
            )
        """.trimIndent()

        val createSettingsTable = """
            CREATE TABLE $TABLE_SETTINGS (
                $COLUMN_SETTING_KEY TEXT PRIMARY KEY,
                $COLUMN_SETTING_VAL TEXT NOT NULL
            )
        """.trimIndent()

        val createRecordingsTable = """
            CREATE TABLE $TABLE_RECORDINGS (
                $COLUMN_REC_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COLUMN_FILE_NAME TEXT UNIQUE NOT NULL,
                $COLUMN_FILE_PATH TEXT NOT NULL,
                $COLUMN_FILE_SIZE INTEGER NOT NULL,
                $COLUMN_CREATED_AT TEXT NOT NULL,
                $COLUMN_DURATION INTEGER DEFAULT 0
            )
        """.trimIndent()

        db.execSQL(createContactsTable)
        db.execSQL(createSettingsTable)
        db.execSQL(createRecordingsTable)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            val createSettingsTable = """
                CREATE TABLE IF NOT EXISTS $TABLE_SETTINGS (
                    $COLUMN_SETTING_KEY TEXT PRIMARY KEY,
                    $COLUMN_SETTING_VAL TEXT NOT NULL
                )
            """.trimIndent()
            db.execSQL(createSettingsTable)
        }
        if (oldVersion < 3) {
            val createRecordingsTable = """
                CREATE TABLE IF NOT EXISTS $TABLE_RECORDINGS (
                    $COLUMN_REC_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    $COLUMN_FILE_NAME TEXT UNIQUE NOT NULL,
                    $COLUMN_FILE_PATH TEXT NOT NULL,
                    $COLUMN_FILE_SIZE INTEGER NOT NULL,
                    $COLUMN_CREATED_AT TEXT NOT NULL,
                    $COLUMN_DURATION INTEGER DEFAULT 0
                )
            """.trimIndent()
            db.execSQL(createRecordingsTable)
        }
    }

    fun insertContact(name: String, phoneNumber: String): Long {
        val db = writableDatabase
        val values = ContentValues().apply {
            put(COLUMN_NAME, name)
            put(COLUMN_PHONE, phoneNumber)
        }
        return db.insert(TABLE_CONTACTS, null, values)
    }

    fun getAllSelectedContacts(): List<ContactItem> {
        val contactsList = mutableListOf<ContactItem>()
        val db = readableDatabase
        val cursor = db.query(
            TABLE_CONTACTS,
            arrayOf(COLUMN_ID, COLUMN_NAME, COLUMN_PHONE),
            null, null, null, null, "$COLUMN_NAME ASC"
        )

        cursor.use {
            if (it.moveToFirst()) {
                val idIndex = it.getColumnIndexOrThrow(COLUMN_ID)
                val nameIndex = it.getColumnIndexOrThrow(COLUMN_NAME)
                val phoneIndex = it.getColumnIndexOrThrow(COLUMN_PHONE)

                do {
                    val id = it.getLong(idIndex)
                    val name = it.getString(nameIndex)
                    val phone = it.getString(phoneIndex)
                    contactsList.add(ContactItem(id, name, phone))
                } while (it.moveToNext())
            }
        }
        return contactsList
    }

    fun deleteContactById(id: Long): Int {
        val db = writableDatabase
        return db.delete(TABLE_CONTACTS, "$COLUMN_ID = ?", arrayOf(id.toString()))
    }

    fun clearAllContacts() {
        val db = writableDatabase
        db.delete(TABLE_CONTACTS, null, null)
    }

    fun saveSetting(key: String, value: Boolean) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put(COLUMN_SETTING_KEY, key)
            put(COLUMN_SETTING_VAL, if (value) "true" else "false")
        }
        db.insertWithOnConflict(TABLE_SETTINGS, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getSetting(key: String, defaultValue: Boolean = false): Boolean {
        val db = readableDatabase
        val cursor = db.query(
            TABLE_SETTINGS,
            arrayOf(COLUMN_SETTING_VAL),
            "$COLUMN_SETTING_KEY = ?",
            arrayOf(key),
            null, null, null
        )
        cursor.use {
            if (it.moveToFirst()) {
                val valIndex = it.getColumnIndexOrThrow(COLUMN_SETTING_VAL)
                return it.getString(valIndex) == "true"
            }
        }
        return defaultValue
    }

    fun isPhoneNumberInWhitelist(incomingNumber: String): Boolean {
        if (incomingNumber.isBlank()) return false
        val cleanIncoming = incomingNumber.replace(Regex("[^0-9]"), "")
        if (cleanIncoming.isEmpty()) return false

        val contacts = getAllSelectedContacts()
        return contacts.any { contact ->
            val cleanDbNumber = contact.phoneNumber.replace(Regex("[^0-9]"), "")
            if (cleanDbNumber.isEmpty()) {
                false
            } else {
                cleanIncoming == cleanDbNumber ||
                cleanIncoming.endsWith(cleanDbNumber) ||
                cleanDbNumber.endsWith(cleanIncoming) ||
                (cleanIncoming.length >= 7 && cleanDbNumber.length >= 7 && 
                 cleanIncoming.takeLast(7) == cleanDbNumber.takeLast(7))
            }
        }
    }

    fun insertRecording(fileName: String, filePath: String, fileSize: Long, createdAt: String, durationSeconds: Int = 0): Long {
        val db = writableDatabase
        val values = ContentValues().apply {
            put(COLUMN_FILE_NAME, fileName)
            put(COLUMN_FILE_PATH, filePath)
            put(COLUMN_FILE_SIZE, fileSize)
            put(COLUMN_CREATED_AT, createdAt)
            put(COLUMN_DURATION, durationSeconds)
        }
        return db.insertWithOnConflict(TABLE_RECORDINGS, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getAccessibleRecordings(filesDir: File? = null): List<VoiceRecordingRecord> {
        val db = writableDatabase

        // Auto-index any existing physical .enc files into DB table
        filesDir?.let { dir ->
            if (dir.exists()) {
                dir.listFiles { _, name -> name.endsWith(".enc") }?.forEach { file ->
                    val dateStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
                        .format(Date(file.lastModified()))
                    insertRecording(file.name, file.absolutePath, file.length(), dateStr)
                }
            }
        }

        val list = mutableListOf<VoiceRecordingRecord>()
        val cursor = db.query(TABLE_RECORDINGS, null, null, null, null, null, "$COLUMN_REC_ID DESC")
        val staleIds = mutableListOf<Long>()

        cursor.use {
            if (it.moveToFirst()) {
                val idIdx = it.getColumnIndexOrThrow(COLUMN_REC_ID)
                val nameIdx = it.getColumnIndexOrThrow(COLUMN_FILE_NAME)
                val pathIdx = it.getColumnIndexOrThrow(COLUMN_FILE_PATH)
                val sizeIdx = it.getColumnIndexOrThrow(COLUMN_FILE_SIZE)
                val dateIdx = it.getColumnIndexOrThrow(COLUMN_CREATED_AT)
                val durIdx = it.getColumnIndexOrThrow(COLUMN_DURATION)

                do {
                    val id = it.getLong(idIdx)
                    val name = it.getString(nameIdx)
                    val path = it.getString(pathIdx)
                    val size = it.getLong(sizeIdx)
                    val date = it.getString(dateIdx)
                    val dur = it.getInt(durIdx)

                    val file = File(path)
                    // Return ONLY files that are currently accessible on the local file system
                    if (file.exists() && file.isFile) {
                        list.add(VoiceRecordingRecord(id, name, path, file.length(), date, dur))
                    } else {
                        // Track deleted files to purge stale DB entries
                        staleIds.add(id)
                    }
                } while (it.moveToNext())
            }
        }

        // Purge stale DB entries for files deleted externally from disk
        if (staleIds.isNotEmpty()) {
            for (staleId in staleIds) {
                db.delete(TABLE_RECORDINGS, "$COLUMN_REC_ID = ?", arrayOf(staleId.toString()))
            }
        }

        return list
    }
}
