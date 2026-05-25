# Eryxon Flow — ProGuard / R8 rules
#
# Capacitor + plugins rely on reflection-based plugin discovery; keep their
# annotations and plugin classes intact so release builds don't strip the
# bridge surface and break the Camera / Scanner / Haptics plugins at runtime.

-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# --- Capacitor core ---
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod *;
    @com.getcapacitor.annotation.PluginMethod *;
}

# --- Capacitor plugins ---
-keep class com.capacitorjs.plugins.** { *; }
-keep class io.capawesome.capacitorjs.plugins.** { *; }
-keep class io.capgo.** { *; }

# --- ML Kit (barcode scanner) ---
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.vision.** { *; }
-dontwarn com.google.mlkit.**

# --- AndroidX BiometricPrompt ---
-keep class androidx.biometric.** { *; }

# --- WebView JavaScript bridge ---
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Cordova compatibility shim
-keep class org.apache.cordova.** { *; }
-keep class * extends org.apache.cordova.CordovaPlugin
