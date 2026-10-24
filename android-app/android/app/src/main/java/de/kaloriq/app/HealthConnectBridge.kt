package de.kaloriq.app

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
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * Brücke zu Health Connect: liest heute Schritte und das letzte Gewicht.
 * Die Berechtigungen werden über den offiziellen Health-Connect-Dialog
 * angefragt; es werden keine Daten geschrieben.
 */
class HealthConnectBridge(
    private val activity: ComponentActivity,
    private val webView: WebView,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val required = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
    )

    private val launcher: ActivityResultLauncher<Set<String>> =
        activity.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
        ) { granted ->
            emit(
                "window.__kaloriqHealthPermission",
                JSONObject().put("granted", granted.containsAll(required)).toString(),
            )
        }

    @JavascriptInterface
    fun isAvailable(): Boolean = try {
        HealthConnectClient.getSdkStatus(activity) == HealthConnectClient.SDK_AVAILABLE
    } catch (_: Exception) {
        false
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

    /** Liest Schritte von heute und das jüngste Gewicht der letzten 30 Tage. */
    @JavascriptInterface
    fun readToday() {
        scope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(activity)
                val now = Instant.now()
                val start = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant()

                val steps = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(start, now),
                    ),
                )[StepsRecord.COUNT_TOTAL] ?: 0L

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
                val weight = weights.records.firstOrNull()?.weight?.inKilograms

                val json = JSONObject()
                    .put("steps", steps)
                    .put("weight", weight ?: JSONObject.NULL)
                    .put("date", LocalDate.now().toString())
                emit("window.__kaloriqHealthData", json.toString())
            } catch (e: Exception) {
                emitError(e.message ?: "Health Connect konnte nicht gelesen werden.")
            }
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
