// Top-level build file
plugins {
    id("com.android.application") version "8.6.0" apply false
    id("org.jetbrains.kotlin.android") version "2.0.20" apply false
    // Kotlin 2.0+ moved the Compose compiler into its own Gradle plugin,
    // versioned in lockstep with Kotlin -- the old AGP
    // composeOptions.kotlinCompilerExtensionVersion mechanism no longer
    // applies (and would in fact fail: compiler 1.5.x doesn't pair with
    // Kotlin 2.0.20).
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.20" apply false
    id("com.google.devtools.ksp") version "2.0.20-1.0.25" apply false
}
