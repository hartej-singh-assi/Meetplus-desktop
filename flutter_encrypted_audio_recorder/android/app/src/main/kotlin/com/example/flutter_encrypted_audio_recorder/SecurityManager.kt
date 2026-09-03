package com.example.flutter_encrypted_audio_recorder

import android.content.Context
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecurityManager(private val context: Context) {

    private val prefs = context.getSharedPreferences("native_sec_prefs", Context.MODE_PRIVATE)

    private fun getOrCreateSecretKey(): ByteArray {
        val storedKeyHex = prefs.getString("native_aes_key", null)
        if (storedKeyHex != null) {
            return hexToBytes(storedKeyHex)
        }
        val keyGen = KeyGenerator.getInstance("AES")
        keyGen.init(256)
        val secretKey = keyGen.generateKey()
        val keyBytes = secretKey.encoded
        prefs.edit().putString("native_aes_key", bytesToHex(keyBytes)).apply()
        return keyBytes
    }

    fun encryptFile(inputFile: File, outputFile: File) {
        val keyBytes = getOrCreateSecretKey()
        val iv = ByteArray(12) // 96-bit IV for AES-GCM
        SecureRandom().nextBytes(iv)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val secretKeySpec = javax.crypto.spec.SecretKeySpec(keyBytes, "AES")
        val gcmSpec = GCMParameterSpec(128, iv)
        cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, gcmSpec)

        val rawBytes = inputFile.readBytes()
        val encryptedBytes = cipher.doFinal(rawBytes)

        FileOutputStream(outputFile).use { fos ->
            fos.write(iv)
            fos.write(encryptedBytes)
        }
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val sb = StringBuilder()
        for (b in bytes) {
            sb.append(String.format("%02x", b))
        }
        return sb.toString()
    }

    private fun hexToBytes(hex: String): ByteArray {
        val len = hex.length
        val data = ByteArray(len / 2)
        var i = 0
        while (i < len) {
            data[i / 2] = ((Character.digit(hex[i], 16) shl 4) + Character.digit(hex[i + 1], 16)).toByte()
            i += 2
        }
        return data
    }
}
