package com.aptech.notebook.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface PublicNoteDao {
    @Query("SELECT * FROM public_notes ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<PublicNote>>

    @Query("SELECT * FROM public_notes WHERE id = :id")
    suspend fun getById(id: Long): PublicNote?

    @Insert
    suspend fun insert(note: PublicNote): Long

    @Update
    suspend fun update(note: PublicNote)

    @Delete
    suspend fun delete(note: PublicNote)
}

@Dao
interface VaultConfigDao {
    @Query("SELECT * FROM app_settings WHERE profileId = :profileId")
    suspend fun get(profileId: String): VaultConfig?

    @Query("SELECT COUNT(*) FROM app_settings")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(config: VaultConfig)
}

@Dao
interface VaultNoteDao {
    @Query("SELECT * FROM notes_archive WHERE profileId = :profileId ORDER BY updatedAt DESC")
    fun observeForVault(profileId: String): Flow<List<VaultNote>>

    @Query("SELECT * FROM notes_archive WHERE id = :id")
    suspend fun getById(id: Long): VaultNote?

    @Insert
    suspend fun insert(note: VaultNote): Long

    @Update
    suspend fun update(note: VaultNote)

    @Delete
    suspend fun delete(note: VaultNote)
}

@Dao
interface VaultMediaDao {
    @Query("SELECT * FROM note_attachments WHERE profileId = :profileId ORDER BY addedAt DESC")
    fun observeForVault(profileId: String): Flow<List<VaultMedia>>

    @Query("SELECT * FROM note_attachments WHERE id = :id")
    suspend fun getById(id: Long): VaultMedia?

    @Insert
    suspend fun insert(media: VaultMedia): Long

    @Delete
    suspend fun delete(media: VaultMedia)
}
