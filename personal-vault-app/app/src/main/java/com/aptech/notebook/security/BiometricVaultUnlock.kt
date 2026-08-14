package com.aptech.notebook.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Optional convenience: once a vault is unlocked with its PIN, the user can
 * choose to also allow fingerprint/biometric unlock. We never store the PIN
 * or weaken the PIN-derived key -- instead we wrap that key with a *second*,
 * Android Keystore-resident AES key that is hardware-gated to require a
 * successful biometric prompt on every single use
 * (setUserAuthenticationRequired(true), no validity window). The wrapped
 * bytes are safe to store in Room; they're useless without a live biometric
 * check against this device's sensor.
 */
object BiometricVaultUnlock {

    private const val KEYSTORE = "AndroidKeyStore"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH_BITS = 128

    // storageCode ("p1"/"p2"), not vaultKind.name -- an alias visible in
    // Android Keystore listing tools shouldn't spell out "vault"/"real"/
    // "decoy" any more than the on-disk DB should.
    private fun alias(vaultKind: VaultKind) = "notebook_auth_${vaultKind.storageCode}"

    private fun keyStore(): KeyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }

    private fun getOrCreateWrappingKey(vaultKind: VaultKind): SecretKey {
        val ks = keyStore()
        val existing = ks.getKey(alias(vaultKind), null) as? SecretKey
        if (existing != null) return existing

        val keyGen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
        val spec = KeyGenParameterSpec.Builder(
            alias(vaultKind),
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(true) // must pass biometric each use, no grace window
            .build()
        keyGen.init(spec)
        return keyGen.generateKey()
    }

    /** Returns a Cipher ready to be handed to BiometricPrompt.CryptoObject for wrapping. */
    fun encryptCipherFor(vaultKind: VaultKind): Cipher {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateWrappingKey(vaultKind))
        return cipher
    }

    /** Returns a Cipher ready to be handed to BiometricPrompt.CryptoObject for unwrapping. */
    fun decryptCipherFor(vaultKind: VaultKind, iv: ByteArray): Cipher {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateWrappingKey(vaultKind),
            GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        )
        return cipher
    }

    /** Call after BiometricPrompt succeeds on an encrypt cipher, to get storable bytes. */
    fun wrap(cipher: Cipher, vaultKey: SecretKey): Pair<ByteArray, ByteArray> {
        val wrapped = cipher.doFinal(vaultKey.encoded)
        return wrapped to cipher.iv
    }

    /** Call after BiometricPrompt succeeds on a decrypt cipher, to recover the vault key. */
    fun unwrap(cipher: Cipher, wrappedKey: ByteArray): SecretKey {
        val raw = cipher.doFinal(wrappedKey)
        return SecretKeySpec(raw, "AES")
    }

    fun removeEnrollment(vaultKind: VaultKind) {
        runCatching { keyStore().deleteEntry(alias(vaultKind)) }
    }
}
