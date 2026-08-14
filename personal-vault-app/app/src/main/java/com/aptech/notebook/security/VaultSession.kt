package com.aptech.notebook.security

import javax.crypto.SecretKey

enum class VaultKind { REAL, DECOY }

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
