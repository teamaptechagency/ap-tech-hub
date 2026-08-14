package com.aptech.notebook.security

import javax.crypto.SecretKey

/**
 * [storageCode] is what actually gets written to disk (DB rows, nav route
 * strings, Keystore aliases) instead of the enum name. "REAL"/"DECOY" in a
 * cleartext SQLite column or table name would tell anyone who opens the raw
 * database file -- no PIN required -- that a hidden vault feature exists.
 * The Kotlin identifiers REAL/DECOY only ever exist at compile time.
 */
enum class VaultKind(val storageCode: String) {
    REAL("p1"),
    DECOY("p2");

    companion object {
        fun fromStorageCode(code: String): VaultKind = entries.first { it.storageCode == code }
    }
}

/**
 * Holds the currently-unlocked vault's AES key in memory only. Nothing here
 * ever touches disk. [lock] is called on app background (see
 * NotebookApp's ProcessLifecycleOwner observer) and wipes the key
 * immediately, so leaving the app -- even briefly, e.g. to answer a call --
 * re-locks the vault.
 */
object VaultSession {

    var kind: VaultKind? = null
        private set

    var key: SecretKey? = null
        private set

    val isUnlocked: Boolean get() = key != null

    fun unlock(kind: VaultKind, key: SecretKey) {
        this.kind = kind
        this.key = key
    }

    fun lock() {
        kind = null
        key = null
    }
}
