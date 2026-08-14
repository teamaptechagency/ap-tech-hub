package com.aptech.notebook.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * A completely ordinary note. This is the "cover" content -- anyone who
 * opens the app and pokes around sees only these, and they work exactly
 * like a normal notebook app because they *are* one.
 */
@Entity(tableName = "public_notes")
data class PublicNote(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val body: String,
    val updatedAt: Long
)

/**
 * One row per vault ("REAL" or "DECOY"). Holds only what's needed to derive
 * and verify the vault's key from a typed PIN -- never the PIN or the key
 * itself. See CryptoUtil for why the key is PIN-derived rather than
 * Keystore-only.
 */
@Entity(tableName = "vault_config")
data class VaultConfig(
    @PrimaryKey val vaultKind: String, // "REAL" or "DECOY"
    val salt: ByteArray,
    val iterations: Int,
    val verifierHash: ByteArray,
    // Optional biometric convenience unlock: the vault's AES key wrapped by
    // an Android Keystore key that itself requires a biometric prompt to
    // use. Null until the user opts in from inside an unlocked vault.
    val biometricWrappedKey: ByteArray? = null,
    val biometricIv: ByteArray? = null
)

@Entity(tableName = "vault_notes")
data class VaultNote(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val vaultKind: String,
    val encryptedTitle: ByteArray,
    val encryptedBody: ByteArray,
    val updatedAt: Long
)

@Entity(tableName = "vault_media")
data class VaultMedia(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val vaultKind: String,
    /** File name on disk under filesDir/vault_media/, contents are AES-GCM encrypted. */
    val storageFileName: String,
    val mimeType: String,
    val isVideo: Boolean,
    /** Small encrypted JPEG thumbnail so the grid never touches the full file. */
    val encryptedThumbnail: ByteArray,
    /** Encrypted original display name, restored on export. */
    val encryptedDisplayName: ByteArray,
    val addedAt: Long
)
