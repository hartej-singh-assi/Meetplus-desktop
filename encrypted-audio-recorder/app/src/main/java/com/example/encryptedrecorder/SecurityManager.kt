package com.example.encryptedrecorder

import android.content.Context
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKey
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

class SecurityManager(private val context: Context) {

    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    /**
     * Encrypts a raw unencrypted file using AES-256 GCM via Jetpack Security.
     */
    fun encryptFile(inputFile: File, outputFile: File) {
        val encryptedFile = EncryptedFile.Builder(
            context,
            outputFile,
            masterKey,
            EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
        ).build()

        FileInputStream(inputFile).use { inputStream ->
            encryptedFile.openFileOutput().use { outputStream ->
                inputStream.copyTo(outputStream)
            }
        }
    }

    /**
     * Decrypts an encrypted file back into raw byte array in memory (e.g. for playback).
     */
    fun decryptFileToBytes(encryptedFile: File): ByteArray {
        val encryptedInput = EncryptedFile.Builder(
            context,
            encryptedFile,
            masterKey,
            EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
        ).build()

        return encryptedInput.openFileInput().use { inputStream ->
            inputStream.readBytes()
        }
    }
}
