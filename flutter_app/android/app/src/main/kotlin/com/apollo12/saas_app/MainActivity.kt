package com.apollo12.saas_app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.content.Intent
import android.net.Uri
import android.os.Bundle

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.apollo12.saas_app/native"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "openExternalUrl" -> {
                    val url = call.argument<String>("url")
                    if (url != null) {
                        openExternalUrl(url)
                        result.success(true)
                    } else {
                        result.error("INVALID_URL", "URL is null", null)
                    }
                }
                "getDeviceInfo" -> {
                    val deviceInfo = getDeviceInfo()
                    result.success(deviceInfo)
                }
                "shareContent" -> {
                    val text = call.argument<String>("text")
                    val subject = call.argument<String>("subject")
                    if (text != null) {
                        shareContent(text, subject)
                        result.success(true)
                    } else {
                        result.error("INVALID_CONTENT", "Text is null", null)
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun openExternalUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        } catch (e: Exception) {
            // Handle error
        }
    }

    private fun getDeviceInfo(): Map<String, String> {
        return mapOf(
            "model" to android.os.Build.MODEL,
            "brand" to android.os.Build.BRAND,
            "version" to android.os.Build.VERSION.RELEASE,
            "sdk" to android.os.Build.VERSION.SDK_INT.toString()
        )
    }

    private fun shareContent(text: String, subject: String?) {
        try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
                if (subject != null) {
                    putExtra(Intent.EXTRA_SUBJECT, subject)
                }
            }
            startActivity(Intent.createChooser(intent, "Paylaş"))
        } catch (e: Exception) {
            // Handle error
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Handle deep links
        handleDeepLink(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        intent?.data?.let { uri ->
            // Handle deep link URI
            // Example: https://saas.apollo12.co/test1/dashboard
            val path = uri.path
            val host = uri.host
            
            if (host == "saas.apollo12.co" && path != null) {
                // Extract tenant domain from path
                val pathSegments = path.split("/").filter { it.isNotEmpty() }
                if (pathSegments.isNotEmpty()) {
                    val tenantDomain = pathSegments[0]
                    // Pass tenant domain to Flutter app
                    sendDeepLinkToFlutter(tenantDomain)
                }
            }
        }
    }

    private fun sendDeepLinkToFlutter(tenantDomain: String) {
        flutterEngine?.dartExecutor?.binaryMessenger?.let { messenger ->
            MethodChannel(messenger, CHANNEL).invokeMethod("handleDeepLink", mapOf(
                "tenantDomain" to tenantDomain,
                "timestamp" to System.currentTimeMillis()
            ))
        }
    }
} 