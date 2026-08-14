package com.aptech.notebook.ui.vault

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

/**
 * First-run setup, reached only via the secret trigger before any vault
 * exists. Creates two independent PINs: the real vault and a decoy vault
 * that can be shown under pressure. They must not match -- otherwise one
 * PIN would silently open both, defeating the point.
 */
@Composable
fun VaultSetupScreen(
    onCancel: () -> Unit,
    onSetupComplete: (realPin: String, decoyPin: String) -> Unit
) {
    var realPin by remember { mutableStateOf("") }
    var realPinConfirm by remember { mutableStateOf("") }
    var decoyPin by remember { mutableStateOf("") }
    var decoyPinConfirm by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    fun validate(): String? = when {
        realPin.length < 4 -> "Real PIN must be at least 4 digits"
        realPin != realPinConfirm -> "Real PIN entries don't match"
        decoyPin.length < 4 -> "Decoy PIN must be at least 4 digits"
        decoyPin != decoyPinConfirm -> "Decoy PIN entries don't match"
        realPin == decoyPin -> "Real and decoy PINs must be different"
        else -> null
    }

    Scaffold(topBar = { TopAppBar(title = { Text("Set up private space") }) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp)
        ) {
            Text(
                "This creates two separate PINs. There is no way to recover a " +
                    "forgotten PIN or the data behind it -- write them down somewhere safe.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(20.dp))

            Text("Real PIN", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(4.dp))
            PinField(value = realPin, onChange = { realPin = it; error = null }, label = "Enter PIN")
            Spacer(Modifier.height(8.dp))
            PinField(value = realPinConfirm, onChange = { realPinConfirm = it; error = null }, label = "Confirm PIN")

            Spacer(Modifier.height(24.dp))

            Text("Decoy PIN", style = MaterialTheme.typography.titleSmall)
            Text(
                "Opens a separate, empty space you can show if you're ever pressured to unlock.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(4.dp))
            PinField(value = decoyPin, onChange = { decoyPin = it; error = null }, label = "Enter PIN")
            Spacer(Modifier.height(8.dp))
            PinField(value = decoyPinConfirm, onChange = { decoyPinConfirm = it; error = null }, label = "Confirm PIN")

            error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(Modifier.height(24.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = onCancel) { Text("Cancel") }
                Button(onClick = {
                    val problem = validate()
                    if (problem != null) {
                        error = problem
                    } else {
                        onSetupComplete(realPin, decoyPin)
                    }
                }) { Text("Create") }
            }
        }
    }
}

@Composable
fun PinField(value: String, onChange: (String) -> Unit, label: String) {
    OutlinedTextField(
        value = value,
        onValueChange = { new -> if (new.length <= 8 && new.all { it.isDigit() }) onChange(new) },
        label = { Text(label) },
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        modifier = Modifier.fillMaxWidth()
    )
}
