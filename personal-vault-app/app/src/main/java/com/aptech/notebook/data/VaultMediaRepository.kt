package com.aptech.notebook.data

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.aptech.notebook.security.CryptoUtil
import com.aptech.notebook.security.VaultKind
import com.aptech.notebook.security.VaultSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import javax.crypto.SecretKey

data class DecryptedVaultMediaMeta(
    val id: Long,
    val displayName: String,
    val mimeType: String,
    val isVideo: Boolean,
    val thumbnail: Bitmap?,
    val addedAt: Long
)

class VaultMediaRepository(private val context: Context) {

    private val db = NotebookDatabase.get(context)
    private val mediaDao = db.vaultMediaDao()

    // "attachments" (not "vault_media") because a notes app plausibly has
    // an attachments folder; app-private filesDir already keeps this out of
    // Gallery/File Manager (see CryptoUtil's doc comment), but the name
    // matters too if this dir is ever inspected directly (root, debug adb
    // backup) before that inspector has any PIN.
    private val storageDir: File by lazy {
        File(context.filesDir, "attachments").apply {
            mkdirs()
            // Belt-and-braces: tells any media scanner that somehow gets
            // access to this directory to skip it. Not load-bearing on a
            // normal device -- app-private storage isn't scanned at all --
            // but harmless and standard practice.
            File(this, ".nomedia").apply { if (!exists()) runCatching { createNewFile() } }
        }
    }

    fun observeMedia(kind: VaultKind): Flow<List<DecryptedVaultMediaMeta>> =
        mediaDao.observeForVault(kind.storageCode).map { list ->
            val key = VaultSession.key ?: return@map emptyList()
            list.map { it.decryptMeta(key) }
        }

    /** Imports a gallery item (photo or video) into the vault, then encrypts+deletes nothing by itself. */
    suspend fun import(uri: Uri, mimeType: String, displayName: String, isVideo: Boolean, kind: VaultKind) =
        withContext(Dispatchers.IO) {
            val key = VaultSession.key ?: error("Vault is locked")
            // .dat, not .jpg/.mp4/.enc: renaming this back to a media
            // extension won't make it openable -- the bytes are genuine
            // AES-GCM ciphertext (IV + encrypted payload + auth tag), not a
            // valid JPEG/MP4 structure, so it just fails to open/plays as
            // corrupt. .dat also doesn't itself announce "this is encrypted"
            // the way .enc would.
            val storageFileName = "${UUID.randomUUID()}.dat"
            val destFile = File(storageDir, storageFileName)

            context.contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(destFile).use { output ->
                    CryptoUtil.encryptStream(input, output, key)
                }
            } ?: error("Could not open source media")

            val thumbBytes = buildThumbnail(uri, isVideo)
            val media = VaultMedia(
                profileId = kind.storageCode,
                storageFileName = storageFileName,
                mimeType = mimeType,
                isVideo = isVideo,
                encryptedThumbnail = CryptoUtil.encryptBytes(thumbBytes, key),
                encryptedDisplayName = CryptoUtil.encryptBytes(displayName.toByteArray(Charsets.UTF_8), key),
                addedAt = System.currentTimeMillis()
            )
            mediaDao.insert(media)
        }

    private fun buildThumbnail(uri: Uri, isVideo: Boolean): ByteArray {
        val bitmap: Bitmap? = if (isVideo) {
            // MediaMetadataRetriever only implements Closeable since API 29;
            // minSdk here is 26, so release() explicitly rather than .use{}.
            val retriever = MediaMetadataRetriever()
            try {
                retriever.setDataSource(context, uri)
                retriever.getFrameAtTime(0)
            } finally {
                retriever.release()
            }
        } else {
            context.contentResolver.openInputStream(uri)?.use { input ->
                val opts = BitmapFactory.Options().apply { inSampleSize = 4 }
                BitmapFactory.decodeStream(input, null, opts)
            }
        }
        val scaled = bitmap?.let { scaleDown(it, 320) }
        val out = ByteArrayOutputStream()
        (scaled ?: Bitmap.createBitmap(320, 320, Bitmap.Config.ARGB_8888))
            .compress(Bitmap.CompressFormat.JPEG, 80, out)
        return out.toByteArray()
    }

    private fun scaleDown(bitmap: Bitmap, maxDim: Int): Bitmap {
        val ratio = minOf(maxDim.toFloat() / bitmap.width, maxDim.toFloat() / bitmap.height, 1f)
        if (ratio >= 1f) return bitmap
        return Bitmap.createScaledBitmap(bitmap, (bitmap.width * ratio).toInt(), (bitmap.height * ratio).toInt(), true)
    }

    /** Decrypts a media item to a private cache file for viewing/playback; caller deletes it when done. */
    suspend fun decryptToCacheFile(mediaId: Long): File = withContext(Dispatchers.IO) {
        val key = VaultSession.key ?: error("Vault is locked")
        val media = mediaDao.getById(mediaId) ?: error("Media not found")
        val srcFile = File(storageDir, media.storageFileName)
        val outFile = File(context.cacheDir, "preview_${UUID.randomUUID()}")
        srcFile.inputStream().use { input ->
            CryptoUtil.decryptStream(input, key).use { decrypted ->
                outFile.outputStream().use { output -> decrypted.copyTo(output) }
            }
        }
        outFile
    }

    /** Decrypts and writes the media back into the device's public gallery via MediaStore. */
    suspend fun exportToGallery(mediaId: Long): Uri = withContext(Dispatchers.IO) {
        val key = VaultSession.key ?: error("Vault is locked")
        val media = mediaDao.getById(mediaId) ?: error("Media not found")
        val displayName = String(CryptoUtil.decryptBytes(media.encryptedDisplayName, key), Charsets.UTF_8)
        val srcFile = File(storageDir, media.storageFileName)

        val collection = if (media.isVideo) {
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI
        } else {
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        }
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, displayName)
            put(MediaStore.MediaColumns.MIME_TYPE, media.mimeType)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val relDir = if (media.isVideo) "Movies/Notebook" else "Pictures/Notebook"
                put(MediaStore.MediaColumns.RELATIVE_PATH, relDir)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
        }
        val resolver = context.contentResolver
        val outUri = resolver.insert(collection, values) ?: error("Could not create gallery entry")

        srcFile.inputStream().use { input ->
            CryptoUtil.decryptStream(input, key).use { decrypted ->
                resolver.openOutputStream(outUri)?.use { output -> decrypted.copyTo(output) }
                    ?: error("Could not open gallery output stream")
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.clear()
            values.put(MediaStore.MediaColumns.IS_PENDING, 0)
            resolver.update(outUri, values, null, null)
        }
        outUri
    }

    suspend fun getMeta(mediaId: Long): DecryptedVaultMediaMeta? = withContext(Dispatchers.IO) {
        val key = VaultSession.key ?: return@withContext null
        mediaDao.getById(mediaId)?.decryptMeta(key)
    }

    suspend fun delete(mediaId: Long) = withContext(Dispatchers.IO) {
        val media = mediaDao.getById(mediaId) ?: return@withContext
        File(storageDir, media.storageFileName).delete()
        mediaDao.delete(media)
    }
}

private fun VaultMedia.decryptMeta(key: SecretKey): DecryptedVaultMediaMeta {
    val name = String(CryptoUtil.decryptBytes(encryptedDisplayName, key), Charsets.UTF_8)
    val thumbBytes = CryptoUtil.decryptBytes(encryptedThumbnail, key)
    val bitmap = BitmapFactory.decodeByteArray(thumbBytes, 0, thumbBytes.size)
    return DecryptedVaultMediaMeta(
        id = id,
        displayName = name,
        mimeType = mimeType,
        isVideo = isVideo,
        thumbnail = bitmap,
        addedAt = addedAt
    )
}
