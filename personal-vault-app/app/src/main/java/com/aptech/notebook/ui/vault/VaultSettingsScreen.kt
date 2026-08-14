package com.aptech.notebook.ui.vault

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aptech.notebook.security.VaultKind

@Composable
fun VaultSettingsScreen(
    kind: VaultKind,
    biometricEnabled: Boolean,
    onBack: () -> Unit,
    onToggleBiometric: (Boolean) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Vault settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Unlock with fingerprint", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "Convenience only -- the PIN still works and is required if biometrics fail.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Switch(checked = biometricEnabled, onCheckedChange = onToggleBiometric)
            }
        }
    }
}
