package com.aptech.notebook.security

import java.io.InputStream
import java.io.OutputStream
import java.security.SecureRandom
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.CipherOutputStream
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * All vault content is encrypted with a key that is derived from the vault's
 * PIN -- never with a key that only lives in the Android Keystore. That is a
 * deliberate choice: if this key were Keystore-only, anyone who could run
 * code as this app (or pull an adb backup on a rooted/debuggable device)
 * could decrypt everything without ever knowing the PIN. Deriving the key
 * from the PIN means the PIN itself is load-bearing -- lose it and the data
 * is gone, which is the correct trade-off for a "secret place" app.
 */
object CryptoUtil {

    private const val KEY_ALGORITHM = "AES"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_IV_LENGTH = 12
    private const val GCM_TAG_LENGTH_BITS = 128
    const val PBKDF2_ITERATIONS = 150_000
    private const val PBKDF2_KEY_LENGTH_BITS = 256

    private val secureRandom = SecureRandom()

    fun randomBytes(size: Int): ByteArray {
        val bytes = ByteArray(size)
        secureRandom.nextBytes(bytes)
        return bytes
    }

    /** Derives a 256-bit AES key from a PIN + salt via PBKDF2-HMAC-SHA256. */
    fun deriveKey(pin: CharArray, salt: ByteArray, iterations: Int = PBKDF2_ITERATIONS): SecretKey {
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val spec = PBEKeySpec(pin, salt, iterations, PBKDF2_KEY_LENGTH_BITS)
        val derived = factory.generateSecret(spec)
        spec.clearPassword()
        return SecretKeySpec(derived.encoded, KEY_ALGORITHM)
    }

    /**
     * A one-way check value derived from the vault key, stored alongside the
     * salt so a typed PIN can be verified *before* attempting to decrypt any
     * real content, without ever persisting the PIN or the raw key.
     */
    fun verifierHash(key: SecretKey): ByteArray {
        val digest = MessageDigest.getInstance("SHA-256")
        digest.update(key.encoded)
        digest.update("notebook-vault-verify".toByteArray(Charsets.UTF_8))
        return digest.digest()
    }

    fun constantTimeEquals(a: ByteArray, b: ByteArray): Boolean {
        if (a.size != b.size) return false
        var result = 0
        for (i in a.indices) result = result or (a[i].toInt() xor b[i].toInt())
        return result == 0
    }

    /** Encrypts a small in-memory blob (e.g. note text). Output = iv || ciphertext+tag. */
    fun encryptBytes(plain: ByteArray, key: SecretKey): ByteArray {
        val iv = randomBytes(GCM_IV_LENGTH)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        val cipherText = cipher.doFinal(plain)
        return iv + cipherText
    }

    fun decryptBytes(blob: ByteArray, key: SecretKey): ByteArray {
        val iv = blob.copyOfRange(0, GCM_IV_LENGTH)
        val cipherText = blob.copyOfRange(GCM_IV_LENGTH, blob.size)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        return cipher.doFinal(cipherText)
    }

    /** Streams (photo/video) file encryption so large media never loads fully into memory. */
    fun encryptStream(input: InputStream, output: OutputStream, key: SecretKey) {
        val iv = randomBytes(GCM_IV_LENGTH)
        output.write(iv)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        CipherOutputStream(output, cipher).use { cos ->
            input.copyTo(cos)
        }
    }

    /** Returns a stream that yields decrypted plaintext as it is read. Caller closes it. */
    fun decryptStream(input: InputStream, key: SecretKey): CipherInputStream {
        val iv = ByteArray(GCM_IV_LENGTH)
        var read = 0
        while (read < GCM_IV_LENGTH) {
            val n = input.read(iv, read, GCM_IV_LENGTH - read)
            if (n < 0) error("Corrupt vault file: truncated IV header")
            read += n
        }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        return CipherInputStream(input, cipher)
    }
}
