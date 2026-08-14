package com.aptech.notebook.ui.nav

import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.aptech.notebook.data.NotebookDatabase
import com.aptech.notebook.data.PublicNote
import com.aptech.notebook.data.VaultMediaRepository
import com.aptech.notebook.data.VaultRepository
import com.aptech.notebook.security.VaultKind
import com.aptech.notebook.security.VaultSession
import com.aptech.notebook.ui.notebook.NoteEditScreen
import com.aptech.notebook.ui.notebook.NoteListScreen
import com.aptech.notebook.ui.vault.MediaViewerScreen
import com.aptech.notebook.ui.vault.VaultHomeScreen
import com.aptech.notebook.ui.vault.VaultSettingsScreen
import com.aptech.notebook.ui.vault.VaultSetupScreen
import com.aptech.notebook.ui.vault.VaultUnlockScreen
import kotlinx.coroutines.launch
import javax.crypto.SecretKey

private const val ROUTE_NOTES = "notes"
private const val ROUTE_NOTE_EDIT = "note_edit/{id}"
private const val ROUTE_VAULT_SETUP = "vault_setup"
private const val ROUTE_VAULT_UNLOCK = "vault_unlock"
private const val ROUTE_VAULT_HOME = "vault_home/{kind}"
private const val ROUTE_VAULT_NOTE_EDIT = "vault_note_edit/{kind}/{id}"
private const val ROUTE_VAULT_MEDIA = "vault_media_view/{kind}/{id}"
private const val ROUTE_VAULT_SETTINGS = "vault_settings/{kind}"

@Composable
fun NotebookNavHost(
    setScreenSecure: (Boolean) -> Unit,
    requestBiometricEnroll: (VaultKind, SecretKey, onDone: (ByteArray, ByteArray) -> Unit, onError: () -> Unit) -> Unit,
    requestBiometricUnlock: (VaultKind, ByteArray, ByteArray, onDone: (SecretKey) -> Unit, onError: () -> Unit) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val navController = rememberNavController()

    val publicDao = remember { NotebookDatabase.get(context).publicNoteDao() }
    val vaultRepo = remember { VaultRepository(context) }
    val mediaRepo = remember { VaultMediaRepository(context) }

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    // Block screenshots/screen-recording only while a vault screen is showing.
    LaunchedEffect(currentRoute) {
        setScreenSecure(currentRoute?.startsWith("vault_home") == true ||
            currentRoute?.startsWith("vault_note_edit") == true ||
            currentRoute?.startsWith("vault_media_view") == true ||
            currentRoute?.startsWith("vault_settings") == true)
    }

    // Re-lock guard: if the process backgrounded (VaultSession wiped by
    // NotebookApp's lifecycle observer) while a vault screen was on top,
    // bounce back to the public notebook the moment we resume.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_START) {
                val route = navController.currentDestination?.route
                val isVaultScreen = route != null && route.startsWith("vault_") && route != ROUTE_VAULT_UNLOCK && route != ROUTE_VAULT_SETUP
                if (isVaultScreen && !VaultSession.isUnlocked) {
                    navController.navigate(ROUTE_NOTES) { popUpTo(ROUTE_NOTES) { inclusive = true } }
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    NavHost(navController = navController, startDestination = ROUTE_NOTES) {

        composable(ROUTE_NOTES) {
            val notes by publicDao.observeAll().collectAsState(initial = emptyList())
            NoteListScreen(
                notes = notes,
                onAddNote = { navController.navigate("note_edit/-1") },
                onOpenNote = { id -> navController.navigate("note_edit/$id") },
                onSecretTrigger = {
                    scope.launch {
                        if (vaultRepo.isSetUp()) {
                            navController.navigate(ROUTE_VAULT_UNLOCK)
                        } else {
                            navController.navigate(ROUTE_VAULT_SETUP)
                        }
                    }
                }
            )
        }

        composable(
            ROUTE_NOTE_EDIT,
            arguments = listOf(navArgument("id") { type = NavType.LongType })
        ) { entry ->
            val id = entry.arguments?.getLong("id") ?: -1L
            val isNew = id == -1L
            var loaded by remember { mutableStateOf<PublicNote?>(null) }
            var ready by remember { mutableStateOf(isNew) }
            LaunchedEffect(id) {
                if (!isNew) {
                    loaded = publicDao.getById(id)
                    ready = true
                }
            }
            if (!ready) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                NoteEditScreen(
                    initialTitle = loaded?.title.orEmpty(),
                    initialBody = loaded?.body.orEmpty(),
                    isNew = isNew,
                    onBack = { navController.popBackStack() },
                    onSave = { title, body ->
                        if (title.isBlank() && body.isBlank()) return@NoteEditScreen
                        scope.launch {
                            if (isNew) {
                                publicDao.insert(PublicNote(title = title, body = body, updatedAt = System.currentTimeMillis()))
                            } else {
                                loaded?.let {
                                    publicDao.update(it.copy(title = title, body = body, updatedAt = System.currentTimeMillis()))
                                }
                            }
                        }
                    },
                    onDelete = {
                        loaded?.let { note -> scope.launch { publicDao.delete(note) } }
                    }
                )
            }
        }

        composable(ROUTE_VAULT_SETUP) {
            VaultSetupScreen(
                onCancel = { navController.popBackStack() },
                onSetupComplete = { realPin, decoyPin ->
                    scope.launch {
                        vaultRepo.setupVaults(realPin.toCharArray(), decoyPin.toCharArray())
                        val kind = vaultRepo.tryUnlock(realPin.toCharArray())
                        if (kind != null) {
                            navController.navigate("vault_home/${kind.name}") {
                                popUpTo(ROUTE_NOTES) { inclusive = false }
                            }
                        } else {
                            navController.popBackStack()
                        }
                    }
                }
            )
        }

        composable(ROUTE_VAULT_UNLOCK) {
            var biometricAvailable by remember { mutableStateOf(false) }
            LaunchedEffect(Unit) {
                biometricAvailable = vaultRepo.getConfig(VaultKind.REAL)?.biometricWrappedKey != null
            }
            VaultUnlockScreen(
                biometricAvailable = biometricAvailable,
                onCancel = { navController.popBackStack() },
                onSubmitPin = { pin ->
                    scope.launch {
                        val kind = vaultRepo.tryUnlock(pin.toCharArray())
                        if (kind != null) {
                            navController.navigate("vault_home/${kind.name}") {
                                popUpTo(ROUTE_NOTES) { inclusive = false }
                            }
                        } else {
                            // Wrong PIN (or none set up): no error, just quietly leave.
                            navController.popBackStack()
                        }
                    }
                },
                onBiometricRequested = {
                    scope.launch {
                        val config = vaultRepo.getConfig(VaultKind.REAL)
                        val wrapped = config?.biometricWrappedKey
                        val iv = config?.biometricIv
                        if (wrapped != null && iv != null) {
                            requestBiometricUnlock(VaultKind.REAL, wrapped, iv, { key ->
                                VaultSession.unlock(VaultKind.REAL, key)
                                navController.navigate("vault_home/${VaultKind.REAL.name}") {
                                    popUpTo(ROUTE_NOTES) { inclusive = false }
                                }
                            }, { /* fall back to PIN silently */ })
                        }
                    }
                }
            )
        }

        composable(
            ROUTE_VAULT_HOME,
            arguments = listOf(navArgument("kind") { type = NavType.StringType })
        ) { entry ->
            val kind = VaultKind.valueOf(entry.arguments!!.getString("kind")!!)

            if (!VaultSession.isUnlocked) {
                LaunchedEffect(Unit) {
                    navController.navigate(ROUTE_NOTES) { popUpTo(ROUTE_NOTES) { inclusive = true } }
                }
                return@composable
            }

            val notes by vaultRepo.observeNotes(kind).collectAsState(initial = emptyList())
            val media by mediaRepo.observeMedia(kind).collectAsState(initial = emptyList())

            val pickMedia = rememberLauncherForActivityResult(
                ActivityResultContracts.PickMultipleVisualMedia()
            ) { uris ->
                if (uris.isEmpty()) return@rememberLauncherForActivityResult
                scope.launch {
                    for (uri in uris) {
                        val mimeType = context.contentResolver.getType(uri) ?: "application/octet-stream"
                        val isVideo = mimeType.startsWith("video/")
                        val displayName = queryDisplayName(context, uri)
                        runCatching { mediaRepo.import(uri, mimeType, displayName, isVideo, kind) }
                    }
                }
            }

            VaultHomeScreen(
                kind = kind,
                notes = notes,
                media = media,
                onAddNote = { navController.navigate("vault_note_edit/${kind.name}/-1") },
                onOpenNote = { id -> navController.navigate("vault_note_edit/${kind.name}/$id") },
                onImportMedia = {
                    pickMedia.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo))
                },
                onOpenMedia = { id -> navController.navigate("vault_media_view/${kind.name}/$id") },
                onLock = {
                    VaultSession.lock()
                    navController.navigate(ROUTE_NOTES) { popUpTo(ROUTE_NOTES) { inclusive = true } }
                },
                onOpenSettings = { navController.navigate("vault_settings/${kind.name}") }
            )
        }

        composable(
            ROUTE_VAULT_NOTE_EDIT,
            arguments = listOf(
                navArgument("kind") { type = NavType.StringType },
                navArgument("id") { type = NavType.LongType }
            )
        ) { entry ->
            val kind = VaultKind.valueOf(entry.arguments!!.getString("kind")!!)
            val id = entry.arguments!!.getLong("id")
            val isNew = id == -1L

            if (!VaultSession.isUnlocked) {
                LaunchedEffect(Unit) { navController.navigate(ROUTE_NOTES) { popUpTo(ROUTE_NOTES) { inclusive = true } } }
                return@composable
            }

            var title by remember { mutableStateOf("") }
            var body by remember { mutableStateOf("") }
            var ready by remember { mutableStateOf(isNew) }
            LaunchedEffect(id) {
                if (!isNew) {
                    vaultRepo.getDecryptedNote(id)?.let { title = it.title; body = it.body }
                    ready = true
                }
            }

            if (!ready) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                NoteEditScreen(
                    initialTitle = title,
                    initialBody = body,
                    isNew = isNew,
                    onBack = { navController.popBackStack() },
                    onSave = { newTitle, newBody ->
                        if (newTitle.isBlank() && newBody.isBlank()) return@NoteEditScreen
                        scope.launch { vaultRepo.saveNote(kind, if (isNew) null else id, newTitle, newBody) }
                    },
                    onDelete = { scope.launch { vaultRepo.deleteNoteById(id) } }
                )
            }
        }

        composable(
            ROUTE_VAULT_MEDIA,
            arguments = listOf(
                navArgument("kind") { type = NavType.StringType },
                navArgument("id") { type = NavType.LongType }
            )
        ) { entry ->
            val id = entry.arguments!!.getLong("id")

            if (!VaultSession.isUnlocked) {
                LaunchedEffect(Unit) { navController.navigate(ROUTE_NOTES) { popUpTo(ROUTE_NOTES) { inclusive = true } } }
                return@composable
            }

            var isVideo by remember { mutableStateOf(false) }
            var displayName by remember { mutableStateOf("") }
            var metaReady by remember { mutableStateOf(false) }
            LaunchedEffect(id) {
                mediaRepo.getMeta(id)?.let {
                    isVideo = it.isVideo
                    displayName = it.displayName
                    metaReady = true
                }
            }

            if (!metaReady) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                MediaViewerScreen(
                    isVideo = isVideo,
                    displayName = displayName,
                    decryptToCacheFile = { mediaRepo.decryptToCacheFile(id) },
                    onBack = { navController.popBackStack() },
                    onExport = {
                        scope.launch {
                            runCatching { mediaRepo.exportToGallery(id) }
                            navController.popBackStack()
                        }
                    },
                    onDelete = {
                        scope.launch {
                            mediaRepo.delete(id)
                            navController.popBackStack()
                        }
                    }
                )
            }
        }

        composable(
            ROUTE_VAULT_SETTINGS,
            arguments = listOf(navArgument("kind") { type = NavType.StringType })
        ) { entry ->
            val kind = VaultKind.valueOf(entry.arguments!!.getString("kind")!!)

            if (!VaultSession.isUnlocked) {
                LaunchedEffect(Unit) { navController.navigate(ROUTE_NOTES) { popUpTo(ROUTE_NOTES) { inclusive = true } } }
                return@composable
            }

            var biometricEnabled by remember { mutableStateOf(false) }
            LaunchedEffect(kind) {
                biometricEnabled = vaultRepo.getConfig(kind)?.biometricWrappedKey != null
            }

            VaultSettingsScreen(
                kind = kind,
                biometricEnabled = biometricEnabled,
                onBack = { navController.popBackStack() },
                onToggleBiometric = { enable ->
                    val key = VaultSession.key ?: return@VaultSettingsScreen
                    if (enable) {
                        requestBiometricEnroll(kind, key, { wrapped, iv ->
                            scope.launch {
                                vaultRepo.saveBiometricEnrollment(kind, wrapped, iv)
                                biometricEnabled = true
                            }
                        }, { /* enrollment failed/cancelled, leave state off */ })
                    } else {
                        com.aptech.notebook.security.BiometricVaultUnlock.removeEnrollment(kind)
                        scope.launch {
                            vaultRepo.clearBiometricEnrollment(kind)
                            biometricEnabled = false
                        }
                    }
                }
            )
        }
    }
}

private fun queryDisplayName(context: android.content.Context, uri: android.net.Uri): String {
    context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (idx >= 0 && cursor.moveToFirst()) {
            cursor.getString(idx)?.let { return it }
        }
    }
    return "imported_${System.currentTimeMillis()}"
}
