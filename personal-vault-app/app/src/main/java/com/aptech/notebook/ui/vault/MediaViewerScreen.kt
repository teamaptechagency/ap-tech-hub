package com.aptech.notebook.ui.vault

import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Decrypts the requested item to a private cache file only for as long as
 * this screen is open, and wipes that file the moment the screen is left
 * (back press, export, or delete) -- decrypted bytes should never outlive
 * the view.
 */
@Composable
fun MediaViewerScreen(
    isVideo: Boolean,
    displayName: String,
    decryptToCacheFile: suspend () -> File,
    onBack: () -> Unit,
    onExport: () -> Unit,
    onDelete: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var cacheFile by remember { mutableStateOf<File?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            cacheFile = decryptToCacheFile()
        } catch (t: Throwable) {
            error = "Could not decrypt this item"
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            cacheFile?.delete()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(displayName, maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onExport) {
                        Icon(Icons.Default.Download, contentDescription = "Export to gallery")
                    }
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete")
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentAlignment = Alignment.Center
        ) {
            val file = cacheFile
            when {
                error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
                file == null -> CircularProgressIndicator()
                isVideo -> VideoPlayer(file)
                else -> DecryptedImage(file)
            }
        }
    }
}

@Composable
private fun DecryptedImage(file: File) {
    var bitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
    LaunchedEffect(file) {
        bitmap = withContext(Dispatchers.IO) { BitmapFactory.decodeFile(file.absolutePath) }
    }
    bitmap?.let {
        Image(
            bitmap = it.asImageBitmap(),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Fit
        )
    } ?: CircularProgressIndicator()
}

@Composable
private fun VideoPlayer(file: File) {
    val context = LocalContext.current
    val player = remember {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(Uri.fromFile(file)))
            prepare()
            playWhenReady = true
        }
    }
    DisposableEffect(Unit) {
        onDispose { player.release() }
    }
    AndroidView(
        factory = { PlayerView(it).apply { this.player = player } },
        modifier = Modifier.fillMaxSize()
    )
}
