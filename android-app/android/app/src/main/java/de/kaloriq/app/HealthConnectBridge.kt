package de.kaloriq.app

import android.content.Intent
import android.net.Uri
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * Brücke zu Health Connect: liest heute Schritte und das letzte Gewicht.
 * Die Berechtigungen werden über den offiziellen Health-Connect-Dialog
 * angefragt; es werden keine Daten geschrieben.
 *
 * Wichtig: Health Connect enthält nur Daten, die andere Apps (z. B. Google Fit
 * oder Samsung Health) dorthin schreiben. Der Gerätesensor von Kaloriq ist
 * davon unabhängig.
 */
class HealthConnectBridge(
    private val activity: ComponentActivity,
    private val webView: WebView,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val stepsPermission = HealthPermission.getReadPermission(StepsRecord::class)
    private val weightPermission = HealthPermission.getReadPermission(WeightRecord::class)
    private val required = setOf(stepsPermission, weightPermission)

    private val launcher: ActivityResultLauncher<Set<String>> =
        activity.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
        ) { granted ->
            emit(
                "window.__kaloriqHealthPermission",
                JSONObject()
                    .put("granted", granted.containsAll(required))
                    .put("steps", granted.contains(stepsPermission))
                    .put("weight", granted.contains(weightPermission))
                    .toString(),
            )
        }

    @JavascriptInterface
    fun isAvailable(): Boolean = try {
        HealthConnectClient.getSdkStatus(activity) == HealthConnectClient.SDK_AVAILABLE
    } catch (_: Exception) {
        false
    }

    /** Status für die Oberfläche: SDK-Zustand und erteilte Berechtigungen. */
    @JavascriptInterface
    fun status(): String {
        val sdk = try {
            HealthConnectClient.getSdkStatus(activity)
        } catch (_: Exception) {
            -1
        }
        var steps = false
        var weight = false
        var permissionError: String? = null
        if (sdk == HealthConnectClient.SDK_AVAILABLE) {
            try {
                val granted = runBlocking {
                    HealthConnectClient.getOrCreate(activity)
                        .permissionController
                        .getGrantedPermissions()
                }
                steps = granted.contains(stepsPermission)
                weight = granted.contains(weightPermission)
            } catch (e: Exception) {
                permissionError = e.message ?: e.javaClass.simpleName
            }
        }
        return JSONObject()
            .put(
                "sdk",
                when (sdk) {
                    HealthConnectClient.SDK_AVAILABLE -> "available"
                    HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
                    HealthConnectClient.SDK_UNAVAILABLE -> "unavailable"
                    else -> "error"
                },
            )
            .put("steps", steps)
            .put("weight", weight)
            .put("error", permissionError ?: JSONObject.NULL)
            .toString()
    }

    @JavascriptInterface
    fun hasPermissions(): Boolean = runBlocking {
        try {
            val client = HealthConnectClient.getOrCreate(activity)
            client.permissionController.getGrantedPermissions().containsAll(required)
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun requestPermissions() {
        if (!isAvailable()) {
            emitError("Health Connect ist auf diesem Gerät nicht verfügbar.")
            return
        }
        activity.runOnUiThread {
            try {
                launcher.launch(required)
            } catch (e: Exception) {
                emitError(e.message ?: "Berechtigung fehlgeschlagen.")
            }
        }
    }

    /** Öffnet Health Connect; ohne Health Connect-App den Play-Store-Eintrag. */
    @JavascriptInterface
    fun openSettings() {
        activity.runOnUiThread {
            val direct = Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                activity.startActivity(direct)
                return@runOnUiThread
            } catch (_: Exception) {
                // Health Connect (noch) nicht installiert.
            }
            try {
                activity.startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("market://details?id=com.google.android.apps.healthdata"),
                    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            } catch (_: Exception) {
                emitError("Health Connect konnte nicht geöffnet werden.")
            }
        }
    }

    /**
     * Liest Schritte von heute und das jüngste Gewicht der letzten 30 Tage.
     * Schritte und Gewicht werden getrennt gelesen: Fehlt eine Berechtigung
     * oder gibt es keine Daten, bleibt der andere Wert nutzbar.
     */
    @JavascriptInterface
    fun readToday() {
        scope.launch {
            val json = JSONObject()
            val errors = JSONArray()
            var steps: Long? = null
            var weight: Double? = null

            val client = try {
                HealthConnectClient.getOrCreate(activity)
            } catch (e: Exception) {
                emitError(e.message ?: "Health Connect ist nicht verfügbar.")
                return@launch
            }

            val now = Instant.now()
            val start = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant()

            try {
                steps = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(start, now),
                    ),
                )[StepsRecord.COUNT_TOTAL] ?: 0L
            } catch (e: Exception) {
                errors.put("steps: ${e.message ?: e.javaClass.simpleName}")
            }

            try {
                val weights = client.readRecords(
                    ReadRecordsRequest(
                        recordType = WeightRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(
                            now.minus(30, ChronoUnit.DAYS),
                            now,
                        ),
                        ascendingOrder = false,
                        pageSize = 1,
                    ),
                )
                weight = weights.records.firstOrNull()?.weight?.inKilograms
            } catch (e: Exception) {
                errors.put("weight: ${e.message ?: e.javaClass.simpleName}")
            }

            json.put("steps", steps ?: JSONObject.NULL)
            json.put("weight", weight ?: JSONObject.NULL)
            json.put("errors", errors)
            json.put("date", LocalDate.now().toString())
            emit("window.__kaloriqHealthData", json.toString())
        }
    }

    private fun emit(function: String, json: String) {
        webView.post {
            webView.evaluateJavascript("$function&&$function($json);", null)
        }
    }

    private fun emitError(message: String) {
        emit(
            "window.__kaloriqHealthError",
            JSONObject().put("message", message).toString(),
        )
    }
}
