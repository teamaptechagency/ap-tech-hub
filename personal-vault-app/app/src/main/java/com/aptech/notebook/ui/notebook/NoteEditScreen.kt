package com.aptech.notebook.ui.notebook

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun NoteEditScreen(
    initialTitle: String,
    initialBody: String,
    isNew: Boolean,
    onBack: () -> Unit,
    onSave: (title: String, body: String) -> Unit,
    onDelete: () -> Unit
) {
    var title by remember { mutableStateOf(initialTitle) }
    var body by remember { mutableStateOf(initialBody) }

    val saveAndBack = {
        onSave(title, body)
        onBack()
    }
    // Covers the system back gesture/button too, not just the in-app arrow,
    // so a swipe-back never silently discards an edit.
    BackHandler(onBack = saveAndBack)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isNew) "New note" else "Edit note") },
                navigationIcon = {
                    IconButton(onClick = saveAndBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (!isNew) {
                        IconButton(onClick = { onDelete(); onBack() }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete")
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Title") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = body,
                onValueChange = { body = it },
                label = { Text("Note") },
                modifier = Modifier.fillMaxWidth().weight(1f)
            )
        }
    }
}
