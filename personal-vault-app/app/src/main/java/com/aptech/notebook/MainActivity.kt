package com.aptech.notebook

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.biometric.BiometricPrompt
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.aptech.notebook.security.BiometricVaultUnlock
import com.aptech.notebook.security.VaultKind
import com.aptech.notebook.ui.nav.NotebookNavHost
import javax.crypto.Cipher
import javax.crypto.SecretKey

/**
 * FragmentActivity (not plain ComponentActivity) because androidx.biometric's
 * BiometricPrompt requires one. Compose works the same way on top of it.
 */
class MainActivity : FragmentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    NotebookNavHost(
                        setScreenSecure = ::setScreenSecure,
                        requestBiometricEnroll = ::requestBiometricEnroll,
                        requestBiometricUnlock = ::requestBiometricUnlock
                    )
                }
            }
        }
    }

    /** Vault screens set this true so screenshots/screen-recording of hidden content are blocked. */
    private fun setScreenSecure(secure: Boolean) {
        if (secure) {
            window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }

    private fun requestBiometricEnroll(
        kind: VaultKind,
        vaultKey: SecretKey,
        onDone: (wrapped: ByteArray, iv: ByteArray) -> Unit,
        onError: () -> Unit
    ) {
        val cipher = try {
            BiometricVaultUnlock.encryptCipherFor(kind)
        } catch (t: Throwable) {
            onError(); return
        }
        val prompt = BiometricPrompt(this, ContextCompat.getMainExecutor(this), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                val resultCipher = result.cryptoObject?.cipher ?: return onError()
                val (wrapped, iv) = BiometricVaultUnlock.wrap(resultCipher, vaultKey)
                onDone(wrapped, iv)
            }
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) = onError()
        })
        prompt.authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle("Enable fingerprint unlock")
                .setNegativeButtonText("Cancel")
                .build(),
            BiometricPrompt.CryptoObject(cipher)
        )
    }

    private fun requestBiometricUnlock(
        kind: VaultKind,
        wrappedKey: ByteArray,
        iv: ByteArray,
        onDone: (SecretKey) -> Unit,
        onError: () -> Unit
    ) {
        val cipher = try {
            BiometricVaultUnlock.decryptCipherFor(kind, iv)
        } catch (t: Throwable) {
            onError(); return
        }
        val prompt = BiometricPrompt(this, ContextCompat.getMainExecutor(this), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                val resultCipher = result.cryptoObject?.cipher ?: return onError()
                onDone(BiometricVaultUnlock.unwrap(resultCipher, wrappedKey))
            }
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) = onError()
        })
        prompt.authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock private space")
                .setNegativeButtonText("Use PIN instead")
                .build(),
            BiometricPrompt.CryptoObject(cipher)
        )
    }
}
