import 'dart:io';
import 'package:intl/intl.dart';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

class SavedContact {
  final int? id;
  final String name;
  final String phone;

  SavedContact({this.id, required this.name, required this.phone});

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
    };
  }

  factory SavedContact.fromMap(Map<String, dynamic> map) {
    return SavedContact(
      id: map['id'] as int?,
      name: map['name'] as String,
      phone: map['phone'] as String,
    );
  }
}

class VoiceRecordingRecord {
  final int? id;
  final String fileName;
  final String filePath;
  final int fileSize;
  final String createdAt;

  VoiceRecordingRecord({
    this.id,
    required this.fileName,
    required this.filePath,
    required this.fileSize,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'file_name': fileName,
      'file_path': filePath,
      'file_size': fileSize,
      'created_at': createdAt,
    };
  }

  factory VoiceRecordingRecord.fromMap(Map<String, dynamic> map) {
    return VoiceRecordingRecord(
      id: map['id'] as int?,
      fileName: map['file_name'] as String,
      filePath: map['file_path'] as String,
      fileSize: map['file_size'] as int,
      createdAt: map['created_at'] as String,
    );
  }
}

class ContactsDatabaseService {
  static Database? _database;

  static const String keyBackgroundEnabled = 'is_background_enabled';
  static const String keyNotificationEnabled = 'is_notification_enabled';

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'selected_contacts.db');

    return await openDatabase(
      path,
      version: 3,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE selected_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE app_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE voice_recordings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT UNIQUE NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            created_at TEXT NOT NULL
          )
        ''');
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await db.execute('''
            CREATE TABLE IF NOT EXISTS app_settings (
              setting_key TEXT PRIMARY KEY,
              setting_value TEXT NOT NULL
            )
          ''');
        }
        if (oldVersion < 3) {
          await db.execute('''
            CREATE TABLE IF NOT EXISTS voice_recordings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              file_name TEXT UNIQUE NOT NULL,
              file_path TEXT NOT NULL,
              file_size INTEGER NOT NULL,
              created_at TEXT NOT NULL
            )
          ''');
        }
      },
    );
  }

  Future<void> replaceSelectedContacts(List<SavedContact> contacts) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('selected_contacts');
      for (var contact in contacts) {
        await txn.insert('selected_contacts', contact.toMap());
      }
    });
  }

  Future<List<SavedContact>> getSelectedContacts() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('selected_contacts', orderBy: 'name ASC');
    return List.generate(maps.length, (i) => SavedContact.fromMap(maps[i]));
  }

  Future<int> deleteContact(int id) async {
    final db = await database;
    return await db.delete('selected_contacts', where: 'id = ?', whereArgs: [id]);
  }

  Future<int> deleteAllContacts() async {
    final db = await database;
    return await db.delete('selected_contacts');
  }

  Future<void> saveSetting(String key, bool value) async {
    final db = await database;
    await db.insert(
      'app_settings',
      {'setting_key': key, 'setting_value': value ? 'true' : 'false'},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<bool> getSetting(String key, {bool defaultValue = false}) async {
    final db = await database;
    final maps = await db.query(
      'app_settings',
      columns: ['setting_value'],
      where: 'setting_key = ?',
      whereArgs: [key],
    );
    if (maps.isNotEmpty) {
      return maps.first['setting_value'] == 'true';
    }
    return defaultValue;
  }

  Future<bool> isPhoneNumberInWhitelist(String phone) async {
    if (phone.isEmpty) return false;
    final cleanIncoming = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final contacts = await getSelectedContacts();
    return contacts.any((contact) {
      final cleanDbNumber = contact.phone.replaceAll(RegExp(r'[^0-9]'), '');
      return cleanDbNumber.isNotEmpty &&
          (cleanIncoming.endsWith(cleanDbNumber) || cleanDbNumber.endsWith(cleanIncoming));
    });
  }

  Future<int> insertRecording(String fileName, String filePath, int fileSize, String createdAt) async {
    final db = await database;
    return await db.insert(
      'voice_recordings',
      {
        'file_name': fileName,
        'file_path': filePath,
        'file_size': fileSize,
        'created_at': createdAt,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<VoiceRecordingRecord>> getAccessibleRecordings(Directory docsDir) async {
    final db = await database;

    // Auto-index existing .enc files from local storage if missing in DB
    if (docsDir.existsSync()) {
      final List<FileSystemEntity> entities = await docsDir.list().toList();
      final encFiles = entities.whereType<File>().where((f) => f.path.endsWith('.enc'));

      for (var file in encFiles) {
        final fileName = basename(file.path);
        final stat = await file.stat();
        final formattedDate = DateFormat('yyyy-MM-dd HH:mm:ss').format(stat.modified);
        await insertRecording(fileName, file.path, stat.size, formattedDate);
      }
    }

    final List<Map<String, dynamic>> maps = await db.query('voice_recordings', orderBy: 'id DESC');
    final List<VoiceRecordingRecord> accessibleRecords = [];
    final List<int> staleIds = [];

    for (var map in maps) {
      final record = VoiceRecordingRecord.fromMap(map);
      final file = File(record.filePath);

      // Return ONLY those files that are currently accessible on the local file system
      if (file.existsSync()) {
        accessibleRecords.add(record);
      } else if (record.id != null) {
        staleIds.add(record.id!);
      }
    }

    // Purge stale DB entries for files deleted externally
    for (var id in staleIds) {
      await db.delete('voice_recordings', where: 'id = ?', whereArgs: [id]);
    }

    return accessibleRecords;
  }
}
