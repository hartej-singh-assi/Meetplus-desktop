import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:encrypt/encrypt.dart' as encrypt_pkg;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class CryptoService {
  static const _storage = FlutterSecureStorage();
  static const _keyStorageKey = 'aes256_master_key_v1';

  /// Retrieves or generates a hardware-backed 256-bit (32 byte) AES Master Key
  Future<encrypt_pkg.Key> _getOrCreateMasterKey() async {
    String? existingKeyBase64 = await _storage.read(key: _keyStorageKey);
    if (existingKeyBase64 != null) {
      final keyBytes = base64Decode(existingKeyBase64);
      return encrypt_pkg.Key(keyBytes);
    } else {
      final newKey = encrypt_pkg.Key.fromSecureRandom(32);
      await _storage.write(
        key: _keyStorageKey,
        value: base64Encode(newKey.bytes),
      );
      return newKey;
    }
  }

  /// Encrypts an unencrypted raw audio file using AES-256 GCM
  Future<File> encryptFile(File inputFile, File outputFile) async {
    final key = await _getOrCreateMasterKey();
    final iv = encrypt_pkg.IV.fromSecureRandom(12); // 96-bit IV for GCM

    final encrypter = encrypt_pkg.Encrypter(
      encrypt_pkg.AES(key, mode: encrypt_pkg.AESMode.gcm),
    );

    final rawBytes = await inputFile.readAsBytes();
    final encrypted = encrypter.encryptBytes(rawBytes, iv: iv);

    // Prepend IV (12 bytes) to the encrypted payload
    final combinedBytes = Uint8List(iv.bytes.length + encrypted.bytes.length);
    combinedBytes.setAll(0, iv.bytes);
    combinedBytes.setAll(iv.bytes.length, encrypted.bytes);

    await outputFile.writeAsBytes(combinedBytes);
    return outputFile;
  }

  /// Decrypts an encrypted file back into raw byte array
  Future<Uint8List> decryptFile(File encryptedFile) async {
    final key = await _getOrCreateMasterKey();
    final fileBytes = await encryptedFile.readAsBytes();

    if (fileBytes.length < 12) {
      throw Exception("Invalid encrypted file format.");
    }

    final ivBytes = fileBytes.sublist(0, 12);
    final cipherBytes = fileBytes.sublist(12);

    final iv = encrypt_pkg.IV(ivBytes);
    final encrypted = encrypt_pkg.Encrypted(cipherBytes);

    final encrypter = encrypt_pkg.Encrypter(
      encrypt_pkg.AES(key, mode: encrypt_pkg.AESMode.gcm),
    );

    final decryptedList = encrypter.decryptBytes(encrypted, iv: iv);
    return Uint8List.fromList(decryptedList);
  }
}
