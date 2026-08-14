package com.aptech.notebook.ui.vault

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.clickable
import com.aptech.notebook.data.DecryptedVaultMediaMeta
import com.aptech.notebook.data.DecryptedVaultNote
import com.aptech.notebook.security.VaultKind

private enum class VaultTab { NOTES, GALLERY }

@Composable
fun VaultHomeScreen(
    kind: VaultKind,
    notes: List<DecryptedVaultNote>,
    media: List<DecryptedVaultMediaMeta>,
    onAddNote: () -> Unit,
    onOpenNote: (Long) -> Unit,
    onImportMedia: () -> Unit,
    onOpenMedia: (Long) -> Unit,
    onLock: () -> Unit,
    onOpenSettings: () -> Unit
) {
    var tab by remember { mutableStateOf(VaultTab.NOTES) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (kind == VaultKind.REAL) "Private space" else "Private space") },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                    IconButton(onClick = onLock) {
                        Icon(Icons.Default.Lock, contentDescription = "Lock")
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == VaultTab.NOTES,
                    onClick = { tab = VaultTab.NOTES },
                    icon = { Icon(Icons.Default.Description, contentDescription = null) },
                    label = { Text("Notes") }
                )
                NavigationBarItem(
                    selected = tab == VaultTab.GALLERY,
                    onClick = { tab = VaultTab.GALLERY },
                    icon = { Icon(Icons.Default.PhotoLibrary, contentDescription = null) },
                    label = { Text("Gallery") }
                )
            }
        },
        floatingActionButton = {
            FloatingActionButton(onClick = if (tab == VaultTab.NOTES) onAddNote else onImportMedia) {
                Icon(
                    if (tab == VaultTab.NOTES) Icons.Default.Add else Icons.Default.Upload,
                    contentDescription = if (tab == VaultTab.NOTES) "New note" else "Import from gallery"
                )
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                VaultTab.NOTES -> VaultNotesList(notes, onOpenNote)
                VaultTab.GALLERY -> VaultGalleryGrid(media, onOpenMedia)
            }
        }
    }
}

@Composable
private fun VaultNotesList(notes: List<DecryptedVaultNote>, onOpenNote: (Long) -> Unit) {
    if (notes.isEmpty()) {
        EmptyState(icon = Icons.Default.Description, text = "No private notes yet")
        return
    }
    LazyColumn(contentPadding = PaddingValues(vertical = 8.dp)) {
        items(notes, key = { it.id }) { note ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenNote(note.id) }
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Text(note.title.ifBlank { "Untitled" }, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(2.dp))
                Text(
                    note.body,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2
                )
            }
            HorizontalDivider()
        }
    }
}

@Composable
private fun VaultGalleryGrid(media: List<DecryptedVaultMediaMeta>, onOpenMedia: (Long) -> Unit) {
    if (media.isEmpty()) {
        EmptyState(icon = Icons.Default.PhotoLibrary, text = "No hidden photos or videos yet")
        return
    }
    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        contentPadding = PaddingValues(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        items(media, key = { it.id }) { item ->
            Box(
                modifier = Modifier
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { onOpenMedia(item.id) }
            ) {
                item.thumbnail?.let {
                    Image(
                        bitmap = it.asImageBitmap(),
                        contentDescription = item.displayName,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } ?: Box(Modifier.fillMaxSize().clip(RoundedCornerShape(8.dp))) {
                    // decrypt failed or no thumbnail
                }
                if (item.isVideo) {
                    Icon(
                        Icons.Default.PlayCircle,
                        contentDescription = "Video",
                        tint = Color.White,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyState(icon: ImageVector, text: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.outline)
            Spacer(Modifier.height(8.dp))
            Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
