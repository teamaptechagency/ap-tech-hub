package com.aptech.notebook.ui.notebook

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aptech.notebook.data.PublicNote
import java.text.DateFormat
import java.util.Date

/**
 * The entire point of this screen is to look and behave like a completely
 * unremarkable notes app. There is exactly one thing hidden here: a
 * long-press on the title opens the vault PIN screen. Nothing changes
 * visually on press-down, so a stray long-press doesn't tip anyone off --
 * it only navigates once the press is released as a genuine long-click.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun NoteListScreen(
    notes: List<PublicNote>,
    onAddNote: () -> Unit,
    onOpenNote: (Long) -> Unit,
    onSecretTrigger: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Notebook",
                        modifier = Modifier.combinedClickable(
                            onClick = {},
                            onLongClick = onSecretTrigger
                        )
                    )
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddNote) {
                Icon(Icons.Default.Add, contentDescription = "New note")
            }
        }
    ) { padding ->
        if (notes.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text("No notes yet. Tap + to add one.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                items(notes, key = { it.id }) { note ->
                    NoteRow(note = note, onClick = { onOpenNote(note.id) })
                    HorizontalDivider()
                }
            }
        }
    }
}

@Composable
private fun NoteRow(note: PublicNote, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Text(
            text = note.title.ifBlank { "Untitled" },
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = note.body,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(note.updatedAt)),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline
        )
    }
}
