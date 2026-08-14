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
 * Table/column names below are deliberately generic ("settings",
 * "profileId", "notes_archive", "note_attachments") rather than anything
 * containing "vault". Row *content* is protected by encryption, but table
 * and column names live in SQLite's schema in the clear (sqlite_master) --
 * anyone who can open the raw .db file (root, a debug adb backup, etc.)
 * reads schema names before ever touching a PIN. profileId itself stores
 * VaultKind.storageCode ("p1"/"p2"), never the literal "REAL"/"DECOY".
 *
 * One row per vault profile. Holds only what's needed to derive and verify
 * that profile's key from a typed PIN -- never the PIN or the key itself.
 * See CryptoUtil for why the key is PIN-derived rather than Keystore-only.
 */
@Entity(tableName = "app_settings")
data class VaultConfig(
    @PrimaryKey val profileId: String, // VaultKind.storageCode, e.g. "p1"/"p2"
    val salt: ByteArray,
    val iterations: Int,
    val verifierHash: ByteArray,
    // Optional biometric convenience unlock: the vault's AES key wrapped by
    // an Android Keystore key that itself requires a biometric prompt to
    // use. Null until the user opts in from inside an unlocked vault.
    val biometricWrappedKey: ByteArray? = null,
    val biometricIv: ByteArray? = null
)

@Entity(tableName = "notes_archive")
data class VaultNote(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val profileId: String,
    val encryptedTitle: ByteArray,
    val encryptedBody: ByteArray,
    val updatedAt: Long
)

@Entity(tableName = "note_attachments")
data class VaultMedia(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val profileId: String,
    /** File name on disk under filesDir/attachments/, contents are AES-GCM encrypted, .dat extension. */
    val storageFileName: String,
    val mimeType: String,
    val isVideo: Boolean,
    /** Small encrypted JPEG thumbnail so the grid never touches the full file. */
    val encryptedThumbnail: ByteArray,
    /** Encrypted original display name, restored on export. */
    val encryptedDisplayName: ByteArray,
    val addedAt: Long
)
