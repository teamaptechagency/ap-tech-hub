package com.aptech.notebook.data

import android.content.Context
import com.aptech.notebook.security.CryptoUtil
import com.aptech.notebook.security.VaultKind
import com.aptech.notebook.security.VaultSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import javax.crypto.SecretKey

/**
 * Config + notes side of the vault. Media import/export lives in
 * VaultMediaRepository since it deals with content:// URIs and streaming
 * rather than small encrypted blobs.
 */
class VaultRepository(context: Context) {

    private val db = NotebookDatabase.get(context)
    private val configDao = db.vaultConfigDao()
    private val noteDao = db.vaultNoteDao()

    suspend fun isSetUp(): Boolean = withContext(Dispatchers.IO) {
        configDao.count() >= 2 // REAL + DECOY both configured
    }

    /**
     * First-run setup. realPin and decoyPin must differ (enforced by the
     * caller/UI) -- if they collided, the two vaults would be
     * indistinguishable and one PIN would silently shadow the other.
     */
    suspend fun setupVaults(realPin: CharArray, decoyPin: CharArray) = withContext(Dispatchers.IO) {
        configDao.upsert(buildConfig(VaultKind.REAL, realPin))
        configDao.upsert(buildConfig(VaultKind.DECOY, decoyPin))
    }

    private fun buildConfig(kind: VaultKind, pin: CharArray): VaultConfig {
        val salt = CryptoUtil.randomBytes(16)
        val key = CryptoUtil.deriveKey(pin, salt)
        val verifier = CryptoUtil.verifierHash(key)
        return VaultConfig(
            vaultKind = kind.name,
            salt = salt,
            iterations = CryptoUtil.PBKDF2_ITERATIONS,
            verifierHash = verifier
        )
    }

    /**
     * Tries a typed PIN against both vaults. Returns the matched kind and
     * puts its key into VaultSession, or returns null on no match -- the
     * caller must NOT reveal whether a vault exists or which PIN was wrong;
     * both a bad PIN and "no vault yet" should look identical from outside.
     */
    suspend fun tryUnlock(pin: CharArray): VaultKind? = withContext(Dispatchers.IO) {
        for (kind in VaultKind.entries) {
            val config = configDao.get(kind.name) ?: continue
            val key = CryptoUtil.deriveKey(pin, config.salt, config.iterations)
            if (CryptoUtil.constantTimeEquals(CryptoUtil.verifierHash(key), config.verifierHash)) {
                VaultSession.unlock(kind, key)
                return@withContext kind
            }
        }
        null
    }

    suspend fun getConfig(kind: VaultKind): VaultConfig? = withContext(Dispatchers.IO) {
        configDao.get(kind.name)
    }

    suspend fun saveBiometricEnrollment(kind: VaultKind, wrappedKey: ByteArray, iv: ByteArray) =
        withContext(Dispatchers.IO) {
            val existing = configDao.get(kind.name) ?: return@withContext
            configDao.upsert(existing.copy(biometricWrappedKey = wrappedKey, biometricIv = iv))
        }

    suspend fun clearBiometricEnrollment(kind: VaultKind) = withContext(Dispatchers.IO) {
        val existing = configDao.get(kind.name) ?: return@withContext
        configDao.upsert(existing.copy(biometricWrappedKey = null, biometricIv = null))
    }

    // ---- Notes (encrypted with the currently unlocked vault's session key) ----

    fun observeNotes(kind: VaultKind): Flow<List<DecryptedVaultNote>> =
        noteDao.observeForVault(kind.name).map { list ->
            val key = VaultSession.key ?: return@map emptyList()
            list.map { it.decrypt(key) }
        }

    suspend fun saveNote(kind: VaultKind, id: Long?, title: String, body: String) =
        withContext(Dispatchers.IO) {
            val key = VaultSession.key ?: error("Vault is locked")
            val note = VaultNote(
                id = id ?: 0,
                vaultKind = kind.name,
                encryptedTitle = CryptoUtil.encryptBytes(title.toByteArray(Charsets.UTF_8), key),
                encryptedBody = CryptoUtil.encryptBytes(body.toByteArray(Charsets.UTF_8), key),
                updatedAt = System.currentTimeMillis()
            )
            if (id == null) noteDao.insert(note) else noteDao.update(note)
        }

    suspend fun deleteNote(note: VaultNote) = withContext(Dispatchers.IO) {
        noteDao.delete(note)
    }

    suspend fun getDecryptedNote(id: Long): DecryptedVaultNote? = withContext(Dispatchers.IO) {
        val key = VaultSession.key ?: return@withContext null
        noteDao.getById(id)?.decrypt(key)
    }

    suspend fun deleteNoteById(id: Long) = withContext(Dispatchers.IO) {
        noteDao.getById(id)?.let { noteDao.delete(it) }
    }
}

data class DecryptedVaultNote(val id: Long, val title: String, val body: String, val updatedAt: Long)

private fun VaultNote.decrypt(key: SecretKey): DecryptedVaultNote = DecryptedVaultNote(
    id = id,
    title = String(CryptoUtil.decryptBytes(encryptedTitle, key), Charsets.UTF_8),
    body = String(CryptoUtil.decryptBytes(encryptedBody, key), Charsets.UTF_8),
    updatedAt = updatedAt
)
