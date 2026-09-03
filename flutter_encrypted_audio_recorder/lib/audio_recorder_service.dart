import 'dart:io';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'crypto_service.dart';
import 'foreground_service.dart';

class AudioRecorderService {
  final AudioRecorder _audioRecorder = AudioRecorder();
  final CryptoService _cryptoService = CryptoService();
  bool _isRecording = false;
  String? _tempPath;

  bool get isRecording => _isRecording;

  Future<void> startRecording({bool showNotification = true}) async {
    if (_isRecording) return;

    if (showNotification) {
      // Start Foreground Service Notification
      await ForegroundTaskHandler.startForegroundTask();
    } else {
      // If toggled off, ensure foreground notification task is stopped/suppressed
      await ForegroundTaskHandler.stopForegroundTask();
    }

    // 2. Prepare temporary file
    final tempDir = await getTemporaryDirectory();
    final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
    _tempPath = '${tempDir.path}/temp_rec_$timestamp.m4a';

    // 3. Begin recording
    await _audioRecorder.start(
      const RecordConfig(encoder: AudioEncoder.aacLc),
      path: _tempPath!,
    );

    _isRecording = true;
  }

  Future<File?> stopRecordingAndEncrypt() async {
    if (!_isRecording) return null;

    final path = await _audioRecorder.stop();
    _isRecording = false;

    // Stop mandatory foreground notification
    await ForegroundTaskHandler.stopForegroundTask();

    if (path != null && File(path).existsSync()) {
      final rawFile = File(path);
      final docsDir = await getApplicationDocumentsDirectory();
      final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
      final encryptedOutputFile = File('${docsDir.path}/Encrypted_Record_$timestamp.enc');

      // Encrypt file using AES-256 GCM
      final encryptedFile = await _cryptoService.encryptFile(rawFile, encryptedOutputFile);

      // Securely delete unencrypted cache file
      if (rawFile.existsSync()) {
        await rawFile.delete();
      }

      return encryptedFile;
    }

    return null;
  }

  Future<List<File>> getEncryptedFiles() async {
    final docsDir = await getApplicationDocumentsDirectory();
    final dir = Directory(docsDir.path);
    final List<FileSystemEntity> entities = await dir.list().toList();

    return entities
        .whereType<File>()
        .where((file) => file.path.endsWith('.enc'))
        .toList();
  }

  void dispose() {
    _audioRecorder.dispose();
  }
}
