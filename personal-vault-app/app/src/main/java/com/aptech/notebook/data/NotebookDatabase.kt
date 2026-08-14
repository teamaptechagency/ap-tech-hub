package com.aptech.notebook.data

import android.content.Context
import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [PublicNote::class, VaultConfig::class, VaultNote::class, VaultMedia::class],
    version = 1,
    exportSchema = false
)
abstract class NotebookDatabase : RoomDatabase() {
    abstract fun publicNoteDao(): PublicNoteDao
    abstract fun vaultConfigDao(): VaultConfigDao
    abstract fun vaultNoteDao(): VaultNoteDao
    abstract fun vaultMediaDao(): VaultMediaDao

    companion object {
        @Volatile private var instance: NotebookDatabase? = null

        fun get(context: Context): NotebookDatabase =
            instance ?: synchronized(this) {
                instance ?: androidx.room.Room.databaseBuilder(
                    context.applicationContext,
                    NotebookDatabase::class.java,
                    "notebook.db"
                ).build().also { instance = it }
            }
    }
}
