package com.aptech.notebook.ui.vault

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Reached only via the notebook's hidden long-press trigger. Deliberately
 * gives no feedback on failure -- a wrong PIN (or a curious third party
 * mashing digits) just quietly returns to the notebook, exactly as if
 * nothing were there at all. The right PIN routes to the real vault, the
 * decoy PIN routes to the decoy vault; the screen itself can't tell which
 * is which, that's decided by the repository.
 */
@Composable
fun VaultUnlockScreen(
    biometricAvailable: Boolean,
    onCancel: () -> Unit,
    onSubmitPin: (String) -> Unit,
    onBiometricRequested: () -> Unit
) {
    var pin by remember { mutableStateOf("") }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Enter PIN", style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(24.dp))
            PinField(value = pin, onChange = { pin = it }, label = "PIN")
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = { onSubmitPin(pin); pin = "" },
                enabled = pin.length >= 4,
                modifier = Modifier.fillMaxWidth()
            ) { Text("Unlock") }

            if (biometricAvailable) {
                Spacer(Modifier.height(12.dp))
                IconButton(onClick = onBiometricRequested) {
                    Icon(Icons.Default.Fingerprint, contentDescription = "Use fingerprint")
                }
            }

            Spacer(Modifier.height(20.dp))
            TextButton(onClick = onCancel) { Text("Cancel") }
        }
    }
}
