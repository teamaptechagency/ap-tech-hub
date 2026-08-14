package com.aptech.notebook

import android.app.Application
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.aptech.notebook.security.VaultSession

class NotebookApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Whole-process background/foreground signal (not per-Activity) --
        // covers task switching, the recents screen, a phone call
        // interrupting the app, etc. Any of those should re-lock the vault.
        ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStop(owner: LifecycleOwner) {
                VaultSession.lock()
            }
        })
    }
}
