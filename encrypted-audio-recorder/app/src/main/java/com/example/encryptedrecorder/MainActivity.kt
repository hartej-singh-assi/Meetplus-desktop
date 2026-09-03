package com.example.encryptedrecorder

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.ContactsContract
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var statusTextView: TextView
    private lateinit var layoutEncryptedFilesList: android.widget.LinearLayout
    private lateinit var contactsListTextView: TextView
    private lateinit var btnStart: Button
    private lateinit var btnStop: Button
    private lateinit var btnRefreshList: Button
    private lateinit var btnSelectContacts: Button

    private lateinit var dbHelper: ContactsDatabaseHelper

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val recordAudioGranted = permissions[Manifest.permission.RECORD_AUDIO] ?: false
        if (recordAudioGranted) {
            Toast.makeText(this, "Permissions granted successfully", Toast.LENGTH_SHORT).show()
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_CONTACTS,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.READ_CALL_LOG
        ).apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        val ungrantedPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        val needsManageStorage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            !android.os.Environment.isExternalStorageManager()
        } else false

        if (ungrantedPermissions.isNotEmpty() || needsManageStorage) {
            showManageAllAccessDialog(ungrantedPermissions.toTypedArray(), needsManageStorage)
        }
    }

    private fun showManageAllAccessDialog(ungrantedPermissions: Array<String>, needsManageStorage: Boolean) {
        AlertDialog.Builder(this, R.style.CustomAlertDialogTheme)
            .setTitle("Manage All Access Required")
            .setMessage("To record, encrypt, and manage audio files seamlessly in the background, this app requires complete access permissions (Microphone, Contacts, Phone, Notifications & Storage Access).")
            .setPositiveButton("Manage All Access") { dialog, _ ->
                dialog.dismiss()
                if (ungrantedPermissions.isNotEmpty()) {
                    permissionLauncher.launch(ungrantedPermissions)
                }
                if (needsManageStorage && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    try {
                        val intent = Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                            data = android.net.Uri.parse("package:$packageName")
                        }
                        startActivity(intent)
                    } catch (e: Exception) {
                        val intent = Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                        startActivity(intent)
                    }
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val pm = getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
                    if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                        try {
                            val intent = Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                data = android.net.Uri.parse("package:$packageName")
                            }
                            startActivity(intent)
                        } catch (ignored: Exception) {}
                    }
                }
            }
            .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
            .setCancelable(false)
            .show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        dbHelper = ContactsDatabaseHelper(this)

        statusTextView = findViewById(R.id.tvStatus)
        layoutEncryptedFilesList = findViewById(R.id.layoutEncryptedFilesList)
        contactsListTextView = findViewById(R.id.tvContactsList)
        btnStart = findViewById(R.id.btnStart)
        btnStop = findViewById(R.id.btnStop)
        btnRefreshList = findViewById(R.id.btnRefreshList)
        btnSelectContacts = findViewById(R.id.btnSelectContacts)
        val switchBackgroundMode: androidx.appcompat.widget.SwitchCompat = findViewById(R.id.switchBackgroundMode)
        val switchShowNotification: androidx.appcompat.widget.SwitchCompat = findViewById(R.id.switchShowNotification)
        val swipeRefreshLayout: androidx.swiperefreshlayout.widget.SwipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)

        val scrollEncryptedFiles: androidx.core.widget.NestedScrollView = findViewById(R.id.scrollEncryptedFiles)
        scrollEncryptedFiles.setOnTouchListener { v, _ ->
            v.parent.requestDisallowInterceptTouchEvent(true)
            false
        }

        swipeRefreshLayout.setColorSchemeColors(android.graphics.Color.parseColor("#0EA5E9"))
        swipeRefreshLayout.setProgressBackgroundColorSchemeColor(android.graphics.Color.parseColor("#1E293B"))

        checkAndRequestPermissions()

        fun syncAllUiStateFromDbAndStorage() {
            val bgState = dbHelper.getSetting(ContactsDatabaseHelper.KEY_BACKGROUND_ENABLED, false)
            val notifState = dbHelper.getSetting(ContactsDatabaseHelper.KEY_NOTIFICATION_ENABLED, false)

            switchBackgroundMode.isChecked = bgState
            switchShowNotification.isChecked = notifState

            if (bgState) {
                statusTextView.text = "Status: Call Listener Active in Background (DB Selective Whitelist)"
            } else {
                statusTextView.text = "Status: Idle"
            }

            refreshSelectedContactsDisplay()
            refreshEncryptedFileList()
        }

        swipeRefreshLayout.setOnRefreshListener {
            syncAllUiStateFromDbAndStorage()
            swipeRefreshLayout.isRefreshing = false
            Toast.makeText(this, "Synced DB values, settings & files!", Toast.LENGTH_SHORT).show()
        }

        // Restore persisted toggle settings from database
        syncAllUiStateFromDbAndStorage()

        switchShowNotification.setOnCheckedChangeListener { _, isChecked ->
            dbHelper.saveSetting(ContactsDatabaseHelper.KEY_NOTIFICATION_ENABLED, isChecked)
            Toast.makeText(this, "Notification toggle saved to DB: ${if (isChecked) "ON" else "OFF"}", Toast.LENGTH_SHORT).show()
        }

        switchBackgroundMode.setOnCheckedChangeListener { _, isChecked ->
            dbHelper.saveSetting(ContactsDatabaseHelper.KEY_BACKGROUND_ENABLED, isChecked)
            if (isChecked) {
                statusTextView.text = "Status: Call Listener Active in Background (DB Selective Whitelist)"
                Toast.makeText(this, "Call recording active in background for DB whitelisted contacts", Toast.LENGTH_SHORT).show()
            } else {
                val intent = Intent(this, AudioRecordingService::class.java).apply {
                    action = AudioRecordingService.ACTION_STOP
                }
                startService(intent)
                statusTextView.text = "Status: Background Call Listener Disabled"
                refreshEncryptedFileList()
            }
        }

        btnStart.setOnClickListener {
            val intent = Intent(this, AudioRecordingService::class.java).apply {
                action = AudioRecordingService.ACTION_START
                putExtra(AudioRecordingService.EXTRA_SHOW_NOTIFICATION, switchShowNotification.isChecked)
            }
            ContextCompat.startForegroundService(this, intent)
            statusTextView.text = "Status: Recording Active"
        }

        btnStop.setOnClickListener {
            val intent = Intent(this, AudioRecordingService::class.java).apply {
                action = AudioRecordingService.ACTION_STOP
            }
            startService(intent)
            switchBackgroundMode.isChecked = false
            statusTextView.text = "Status: Recording Stopped (Files Encrypted)"
            refreshEncryptedFileList()
        }

        val btnHeaderSync: com.google.android.material.button.MaterialButton = findViewById(R.id.btnHeaderSync)
        btnHeaderSync.setOnClickListener {
            syncAllUiStateFromDbAndStorage()
            Toast.makeText(this, "Synced DB values, settings & files!", Toast.LENGTH_SHORT).show()
        }

        val btnExpandRecordings: com.google.android.material.button.MaterialButton = findViewById(R.id.btnExpandRecordings)
        btnExpandRecordings.setOnClickListener {
            openExpandedRecordingsDialog()
        }

        btnRefreshList.setOnClickListener {
            syncAllUiStateFromDbAndStorage()
            Toast.makeText(this, "Synced DB values, settings & files!", Toast.LENGTH_SHORT).show()
        }

        btnSelectContacts.setOnClickListener {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                permissionLauncher.launch(arrayOf(Manifest.permission.READ_CONTACTS))
            } else {
                openContactsMultiSelectDialog()
            }
        }

        val btnAddCustomContact: Button = findViewById(R.id.btnAddCustomContact)
        btnAddCustomContact.setOnClickListener {
            openAddCustomContactDialog()
        }

        val btnClearContacts: Button = findViewById(R.id.btnClearContacts)
        btnClearContacts.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Clear Database Contacts")
                .setMessage("Are you sure you want to delete all saved contacts from the local database table?")
                .setPositiveButton("Clear All") { dialog, _ ->
                    dbHelper.clearAllContacts()
                    refreshSelectedContactsDisplay()
                    Toast.makeText(this, "Cleared all contacts from DB table", Toast.LENGTH_SHORT).show()
                    dialog.dismiss()
                }
                .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
                .show()
        }

        contactsListTextView.setOnClickListener {
            showDeleteIndividualContactDialog()
        }

        refreshEncryptedFileList()
        refreshSelectedContactsDisplay()
    }



    private fun openContactsMultiSelectDialog() {
        val contactsList = mutableListOf<ContactItem>()
        val contentResolver = contentResolver
        val cursor = contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER
            ),
            null, null, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
        )

        cursor?.use {
            val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            while (it.moveToNext()) {
                val name = if (nameIndex >= 0) it.getString(nameIndex) ?: "Unknown" else "Unknown"
                val number = if (numberIndex >= 0) it.getString(numberIndex) ?: "" else ""
                contactsList.add(ContactItem(name = name, phoneNumber = number))
            }
        }

        if (contactsList.isEmpty()) {
            contactsList.add(ContactItem(name = "Mom", phoneNumber = "+1 555-0192"))
            contactsList.add(ContactItem(name = "Boss", phoneNumber = "+1 555-0144"))
            contactsList.add(ContactItem(name = "Emergency Contact", phoneNumber = "+1 555-0188"))
            contactsList.add(ContactItem(name = "John Doe", phoneNumber = "+1 555-0123"))
            contactsList.add(ContactItem(name = "Jane Smith", phoneNumber = "+1 555-0156"))
        }

        val selectedPhoneSet = dbHelper.getAllSelectedContacts().map { it.phoneNumber }.toMutableSet()
        var filteredContacts = contactsList.toList()

        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(32, 24, 32, 8)
        }

        val searchEditText = android.widget.EditText(this).apply {
            hint = "Search contact name or phone..."
            setHintTextColor(android.graphics.Color.parseColor("#64748B"))
            setTextColor(android.graphics.Color.parseColor("#F8FAFC"))
            setBackgroundResource(R.drawable.bg_container)
            setPadding(28, 20, 28, 20)
            setSingleLine()
        }

        val listView = android.widget.ListView(this).apply {
            choiceMode = android.widget.ListView.CHOICE_MODE_MULTIPLE
            divider = null
        }

        val spacer = android.view.View(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT, 16
            )
        }

        layout.addView(searchEditText)
        layout.addView(spacer)
        layout.addView(listView)

        fun updateListView(query: String) {
            filteredContacts = contactsList.filter {
                it.name.contains(query, ignoreCase = true) || it.phoneNumber.contains(query, ignoreCase = true)
            }
            val displayStrings = filteredContacts.map { "${it.name}  —  ${it.phoneNumber}" }
            val adapter = object : android.widget.ArrayAdapter<String>(
                this,
                R.layout.item_contact_checkbox,
                displayStrings
            ) {
                override fun getView(position: Int, convertView: android.view.View?, parent: android.view.ViewGroup): android.view.View {
                    val view = super.getView(position, convertView, parent)
                    if (view is android.widget.TextView) {
                        view.setTextColor(android.graphics.Color.parseColor("#F8FAFC"))
                    }
                    return view
                }
            }
            listView.adapter = adapter

            for (i in filteredContacts.indices) {
                if (selectedPhoneSet.contains(filteredContacts[i].phoneNumber)) {
                    listView.setItemChecked(i, true)
                }
            }
        }

        updateListView("")

        searchEditText.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                for (i in filteredContacts.indices) {
                    if (listView.isItemChecked(i)) {
                        selectedPhoneSet.add(filteredContacts[i].phoneNumber)
                    } else {
                        selectedPhoneSet.remove(filteredContacts[i].phoneNumber)
                    }
                }
                updateListView(s.toString())
            }
            override fun afterTextChanged(s: android.text.Editable?) {}
        })

        listView.setOnItemClickListener { _, _, position, _ ->
            val contact = filteredContacts[position]
            if (listView.isItemChecked(position)) {
                selectedPhoneSet.add(contact.phoneNumber)
            } else {
                selectedPhoneSet.remove(contact.phoneNumber)
            }
        }

        com.google.android.material.dialog.MaterialAlertDialogBuilder(this, R.style.CustomAlertDialogTheme)
            .setTitle("Select Contacts to Save to DB")
            .setView(layout)
            .setPositiveButton("Save to DB") { dialog, _ ->
                for (i in filteredContacts.indices) {
                    if (listView.isItemChecked(i)) {
                        selectedPhoneSet.add(filteredContacts[i].phoneNumber)
                    } else {
                        selectedPhoneSet.remove(filteredContacts[i].phoneNumber)
                    }
                }

                dbHelper.clearAllContacts()
                contactsList.filter { selectedPhoneSet.contains(it.phoneNumber) }.forEach {
                    dbHelper.insertContact(it.name, it.phoneNumber)
                }

                refreshSelectedContactsDisplay()
                Toast.makeText(this, "Saved selected contacts to DB table!", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun openAddCustomContactDialog() {
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(40, 24, 40, 8)
        }

        val nameInput = android.widget.EditText(this).apply {
            hint = "Contact Label / Name (e.g. Unregistered)"
            setHintTextColor(android.graphics.Color.parseColor("#64748B"))
            setTextColor(android.graphics.Color.parseColor("#F8FAFC"))
            setBackgroundResource(R.drawable.bg_container)
            setPadding(28, 20, 28, 20)
            setSingleLine()
        }

        val phoneInput = android.widget.EditText(this).apply {
            hint = "Phone Number (e.g. +1 555-9988)"
            setHintTextColor(android.graphics.Color.parseColor("#64748B"))
            setTextColor(android.graphics.Color.parseColor("#F8FAFC"))
            setBackgroundResource(R.drawable.bg_container)
            setPadding(28, 20, 28, 20)
            inputType = android.text.InputType.TYPE_CLASS_PHONE
            setSingleLine()
        }

        val spacer = android.view.View(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT, 16
            )
        }

        layout.addView(nameInput)
        layout.addView(spacer)
        layout.addView(phoneInput)

        com.google.android.material.dialog.MaterialAlertDialogBuilder(this, R.style.CustomAlertDialogTheme)
            .setTitle("Add Unregistered / Custom Number")
            .setView(layout)
            .setPositiveButton("Add to DB") { dialog, _ ->
                val name = if (nameInput.text.toString().trim().isEmpty()) "Unregistered Contact" else nameInput.text.toString().trim()
                val phone = phoneInput.text.toString().trim()

                if (phone.isNotEmpty()) {
                    dbHelper.insertContact(name, phone)
                    refreshSelectedContactsDisplay()
                    Toast.makeText(this, "Added $phone to DB table!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Phone number cannot be empty", Toast.LENGTH_SHORT).show()
                }
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun showDeleteIndividualContactDialog() {
        val contacts = dbHelper.getAllSelectedContacts()
        if (contacts.isEmpty()) return

        val displayItems = contacts.map { "${it.name}  —  ${it.phoneNumber}" }

        val adapter = object : android.widget.ArrayAdapter<String>(
            this,
            R.layout.item_dialog_single,
            displayItems
        ) {
            override fun getView(position: Int, convertView: android.view.View?, parent: android.view.ViewGroup): android.view.View {
                val view = super.getView(position, convertView, parent)
                if (view is android.widget.TextView) {
                    view.setTextColor(android.graphics.Color.parseColor("#F8FAFC"))
                }
                return view
            }
        }

        com.google.android.material.dialog.MaterialAlertDialogBuilder(this, R.style.CustomAlertDialogTheme)
            .setTitle("Delete Individual Contact from DB")
            .setAdapter(adapter) { dialog, which ->
                val targetContact = contacts[which]
                dbHelper.deleteContactById(targetContact.id)
                refreshSelectedContactsDisplay()
                Toast.makeText(this, "Deleted ${targetContact.name} from DB table", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun refreshSelectedContactsDisplay() {
        val contacts = dbHelper.getAllSelectedContacts()
        if (contacts.isEmpty()) {
            contactsListTextView.text = "No contacts stored in DB table."
            contactsListTextView.setTextColor(android.graphics.Color.parseColor("#94A3B8"))
        } else {
            val sb = StringBuilder()
            contacts.forEach { contact ->
                sb.append("• ${contact.name} — ${contact.phoneNumber}\n")
            }
            contactsListTextView.text = sb.toString().trim() + "\n\n(Tap list to delete individual item)"
            contactsListTextView.setTextColor(android.graphics.Color.parseColor("#F8FAFC"))
        }
    }

    private fun refreshEncryptedFileList() {
        layoutEncryptedFilesList.removeAllViews()
        val accessibleRecords = dbHelper.getAccessibleRecordings(filesDir)
        if (accessibleRecords.isEmpty()) {
            val emptyTv = TextView(this).apply {
                text = "No accessible encrypted recordings found."
                setTextColor(android.graphics.Color.parseColor("#94A3B8"))
                textSize = 13f
                setPadding(24, 24, 24, 24)
            }
            layoutEncryptedFilesList.addView(emptyTv)
        } else {
            accessibleRecords.forEach { rec ->
                val file = File(rec.filePath)
                val itemView = layoutInflater.inflate(R.layout.item_encrypted_file, layoutEncryptedFilesList, false)
                val tvFileName = itemView.findViewById<TextView>(R.id.tvItemFileName)
                val tvFileSize = itemView.findViewById<TextView>(R.id.tvItemFileSize)
                val tvFileDetails = itemView.findViewById<TextView>(R.id.tvItemFileDetails)
                val btnPlay = itemView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnItemPlay)
                val btnDelete = itemView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnItemDelete)

                tvFileName.text = rec.fileName
                tvFileSize.text = "${rec.fileSize / 1024} KB"
                tvFileDetails?.text = "📅 ${rec.createdAt} • AES-256 GCM"

                btnPlay.setOnClickListener {
                    playEncryptedAudioFile(file)
                }

                btnDelete.setOnClickListener {
                    AlertDialog.Builder(this)
                        .setTitle("Delete Encrypted File")
                        .setMessage("Are you sure you want to permanently delete ${rec.fileName}?")
                        .setPositiveButton("Delete") { dialog, _ ->
                            if (file.exists()) {
                                file.delete()
                                refreshEncryptedFileList()
                                Toast.makeText(this, "Deleted ${rec.fileName}", Toast.LENGTH_SHORT).show()
                            }
                            dialog.dismiss()
                        }
                        .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
                        .show()
                }

                layoutEncryptedFilesList.addView(itemView)
            }
        }
    }

    private fun openExpandedRecordingsDialog() {
        val accessibleRecords = dbHelper.getAccessibleRecordings(filesDir)
        val allFiles = accessibleRecords.map { File(it.filePath) }

        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(32, 24, 32, 8)
        }

        val searchInput = android.widget.EditText(this).apply {
            hint = "Search recording name or date..."
            setHintTextColor(android.graphics.Color.parseColor("#64748B"))
            setTextColor(android.graphics.Color.parseColor("#F8FAFC"))
            setBackgroundResource(R.drawable.bg_container)
            setPadding(28, 20, 28, 20)
            setSingleLine()
        }

        val countTextView = TextView(this).apply {
            text = "Showing ${allFiles.size} encrypted recordings"
            setTextColor(android.graphics.Color.parseColor("#94A3B8"))
            textSize = 12f
            setPadding(0, 12, 0, 12)
        }

        val scrollView = androidx.core.widget.NestedScrollView(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                800
            )
            setBackgroundResource(R.drawable.bg_container)
            setPadding(8, 8, 8, 8)
            isFillViewport = true
            isVerticalScrollBarEnabled = true
        }

        val listContainer = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
        }
        scrollView.addView(listContainer)

        val dateFormat = java.text.SimpleDateFormat("MMM dd, yyyy 'at' hh:mm a", java.util.Locale.US)

        fun updateExpandedList(query: String) {
            listContainer.removeAllViews()
            val filtered = allFiles.filter { file ->
                val formattedDate = dateFormat.format(java.util.Date(file.lastModified()))
                file.name.contains(query, ignoreCase = true) || formattedDate.contains(query, ignoreCase = true)
            }
            countTextView.text = "Showing ${filtered.size} of ${allFiles.size} encrypted recordings"

            if (filtered.isEmpty()) {
                val emptyTv = TextView(this).apply {
                    text = "No matching encrypted files found."
                    setTextColor(android.graphics.Color.parseColor("#94A3B8"))
                    textSize = 13f
                    setPadding(24, 24, 24, 24)
                }
                listContainer.addView(emptyTv)
            } else {
                filtered.forEach { file ->
                    val itemView = layoutInflater.inflate(R.layout.item_encrypted_file, listContainer, false)
                    val tvFileName = itemView.findViewById<TextView>(R.id.tvItemFileName)
                    val tvFileSize = itemView.findViewById<TextView>(R.id.tvItemFileSize)
                    val tvFileDetails = itemView.findViewById<TextView>(R.id.tvItemFileDetails)
                    val btnPlay = itemView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnItemPlay)
                    val btnDelete = itemView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnItemDelete)

                    tvFileName.text = file.name
                    tvFileSize.text = "${file.length() / 1024} KB"
                    val formattedDate = dateFormat.format(java.util.Date(file.lastModified()))
                    tvFileDetails?.text = "📅 $formattedDate • AES-256 GCM"

                    btnPlay.setOnClickListener {
                        playEncryptedAudioFile(file)
                    }

                    btnDelete.setOnClickListener {
                        AlertDialog.Builder(this)
                            .setTitle("Delete Encrypted File")
                            .setMessage("Are you sure you want to delete ${file.name}?")
                            .setPositiveButton("Delete") { dialog, _ ->
                                if (file.exists()) {
                                    file.delete()
                                    refreshEncryptedFileList()
                                    updateExpandedList(searchInput.text.toString())
                                    Toast.makeText(this, "Deleted ${file.name}", Toast.LENGTH_SHORT).show()
                                }
                                dialog.dismiss()
                            }
                            .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
                            .show()
                    }

                    listContainer.addView(itemView)
                }
            }
        }

        updateExpandedList("")

        searchInput.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                updateExpandedList(s.toString())
            }
            override fun afterTextChanged(s: android.text.Editable?) {}
        })

        layout.addView(searchInput)
        layout.addView(countTextView)
        layout.addView(scrollView)

        com.google.android.material.dialog.MaterialAlertDialogBuilder(this, R.style.CustomAlertDialogTheme)
            .setTitle("🔒 All Encrypted Recordings")
            .setView(layout)
            .setPositiveButton("Close") { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private var activeMediaPlayer: android.media.MediaPlayer? = null
    private var playerHandler: android.os.Handler? = null
    private var playerRunnable: Runnable? = null

    private fun showPlayAudioFileDialog(files: Array<File>) {
        val displayNames = files.map { "▶ ${it.name}  (${it.length() / 1024} KB)" }
        val adapter = object : android.widget.ArrayAdapter<String>(
            this,
            R.layout.item_dialog_single,
            displayNames
        ) {
            override fun getView(position: Int, convertView: android.view.View?, parent: android.view.ViewGroup): android.view.View {
                val view = super.getView(position, convertView, parent)
                if (view is android.widget.TextView) {
                    view.setTextColor(android.graphics.Color.parseColor("#F8FAFC"))
                }
                return view
            }
        }

        com.google.android.material.dialog.MaterialAlertDialogBuilder(this, R.style.CustomAlertDialogTheme)
            .setTitle("Select Recording to Decrypt & Play")
            .setAdapter(adapter) { dialog, which ->
                val chosenFile = files[which]
                playEncryptedAudioFile(chosenFile)
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun playEncryptedAudioFile(file: File) {
        try {
            val secManager = SecurityManager(applicationContext)
            val decryptedBytes = secManager.decryptFileToBytes(file)

            val tempPlayFile = File(cacheDir, "temp_play.m4a")
            tempPlayFile.writeBytes(decryptedBytes)

            activeMediaPlayer?.release()
            playerHandler?.removeCallbacksAndMessages(null)

            val playerView = layoutInflater.inflate(R.layout.dialog_audio_player, null)
            val tvFileName = playerView.findViewById<android.widget.TextView>(R.id.tvPlayerFileName)
            val tvFileInfo = playerView.findViewById<android.widget.TextView>(R.id.tvPlayerFileInfo)
            val seekBar = playerView.findViewById<android.widget.SeekBar>(R.id.seekBarAudio)
            val tvCurrentTime = playerView.findViewById<android.widget.TextView>(R.id.tvCurrentTime)
            val tvTotalTime = playerView.findViewById<android.widget.TextView>(R.id.tvTotalTime)
            val fabPlayPause = playerView.findViewById<com.google.android.material.floatingactionbutton.FloatingActionButton>(R.id.fabPlayPause)
            val btnRewind = playerView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnRewind)
            val btnForward = playerView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnForward)
            val btnSpeed = playerView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnSpeed)
            val btnStopAudio = playerView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnStopAudio)

            tvFileName.text = file.name
            tvFileInfo.text = "AES-256 GCM In-Memory Decryption • ${file.length() / 1024} KB"

            val mp = android.media.MediaPlayer().apply {
                setDataSource(tempPlayFile.absolutePath)
                prepare()
                start()
            }
            activeMediaPlayer = mp

            val totalDurationMs = mp.duration
            seekBar.max = totalDurationMs

            fun formatMs(ms: Int): String {
                val totalSec = ms / 1000
                val seconds = totalSec % 60
                val minutes = (totalSec / 60) % 60
                return String.format("%02d:%02d", minutes, seconds)
            }

            tvTotalTime.text = formatMs(totalDurationMs)
            fabPlayPause.setImageResource(android.R.drawable.ic_media_pause)

            val handler = android.os.Handler(android.os.Looper.getMainLooper())
            playerHandler = handler

            val updateProgressTask = object : Runnable {
                override fun run() {
                    activeMediaPlayer?.let { player ->
                        if (player.isPlaying) {
                            val currentPos = player.currentPosition
                            seekBar.progress = currentPos
                            tvCurrentTime.text = formatMs(currentPos)
                            handler.postDelayed(this, 200)
                        }
                    }
                }
            }
            playerRunnable = updateProgressTask
            handler.post(updateProgressTask)

            fabPlayPause.setOnClickListener {
                activeMediaPlayer?.let { player ->
                    if (player.isPlaying) {
                        player.pause()
                        fabPlayPause.setImageResource(android.R.drawable.ic_media_play)
                        handler.removeCallbacks(updateProgressTask)
                    } else {
                        player.start()
                        fabPlayPause.setImageResource(android.R.drawable.ic_media_pause)
                        handler.post(updateProgressTask)
                    }
                }
            }

            seekBar.setOnSeekBarChangeListener(object : android.widget.SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(sb: android.widget.SeekBar?, progress: Int, fromUser: Boolean) {
                    if (fromUser) {
                        activeMediaPlayer?.seekTo(progress)
                        tvCurrentTime.text = formatMs(progress)
                    }
                }
                override fun onStartTrackingTouch(sb: android.widget.SeekBar?) {}
                override fun onStopTrackingTouch(sb: android.widget.SeekBar?) {}
            })

            btnRewind.setOnClickListener {
                activeMediaPlayer?.let { player ->
                    val newPos = (player.currentPosition - 10000).coerceAtLeast(0)
                    player.seekTo(newPos)
                    seekBar.progress = newPos
                    tvCurrentTime.text = formatMs(newPos)
                }
            }

            btnForward.setOnClickListener {
                activeMediaPlayer?.let { player ->
                    val newPos = (player.currentPosition + 10000).coerceAtMost(totalDurationMs)
                    player.seekTo(newPos)
                    seekBar.progress = newPos
                    tvCurrentTime.text = formatMs(newPos)
                }
            }

            val speeds = listOf(1.0f, 1.25f, 1.5f, 2.0f, 0.75f)
            var speedIndex = 0

            btnSpeed.setOnClickListener {
                speedIndex = (speedIndex + 1) % speeds.size
                val currentSpeed = speeds[speedIndex]
                btnSpeed.text = "${currentSpeed}x"
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    activeMediaPlayer?.let { player ->
                        val isPlaying = player.isPlaying
                        player.playbackParams = player.playbackParams.setSpeed(currentSpeed)
                        if (!isPlaying) player.pause()
                    }
                }
            }

            val dialog = com.google.android.material.dialog.MaterialAlertDialogBuilder(this, R.style.CustomAlertDialogTheme)
                .setView(playerView)
                .setCancelable(true)
                .create()

            btnStopAudio.setOnClickListener {
                dialog.dismiss()
            }

            mp.setOnCompletionListener {
                fabPlayPause.setImageResource(android.R.drawable.ic_media_play)
                seekBar.progress = totalDurationMs
                tvCurrentTime.text = formatMs(totalDurationMs)
                handler.removeCallbacks(updateProgressTask)
            }

            dialog.setOnDismissListener {
                handler.removeCallbacksAndMessages(null)
                activeMediaPlayer?.stop()
                activeMediaPlayer?.release()
                activeMediaPlayer = null
                if (tempPlayFile.exists()) {
                    tempPlayFile.delete()
                }
            }

            dialog.show()

        } catch (e: Exception) {
            Toast.makeText(this, "Error decrypting/playing audio: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroy() {
        playerHandler?.removeCallbacksAndMessages(null)
        activeMediaPlayer?.release()
        activeMediaPlayer = null
        super.onDestroy()
    }
}
