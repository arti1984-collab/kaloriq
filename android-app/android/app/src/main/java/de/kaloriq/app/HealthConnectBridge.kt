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
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Mass
import androidx.health.connect.client.units.Volume
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
 * Brücke zu Health Connect.
 *
 * Lesen: Schritte, Gewicht, Aktivitäten (Dauer + Kalorien) der letzten Tage.
 * Schreiben (nur auf Wunsch): Nährwerte als NutritionRecord und Wasser als
 * HydrationRecord – jeweils für einen Tag, vorher werden eigene Einträge des
 * Tages ersetzt, damit mehrfaches Schreiben keine Doppel zählt.
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
    private val exercisePermission = HealthPermission.getReadPermission(ExerciseSessionRecord::class)
    private val burnedPermission = HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
    private val nutritionPermission = HealthPermission.getWritePermission(NutritionRecord::class)
    private val hydrationPermission = HealthPermission.getWritePermission(HydrationRecord::class)

    private val required = setOf(stepsPermission, weightPermission)
    private val exerciseRequired = setOf(exercisePermission, burnedPermission)
    private val writeRequired = setOf(nutritionPermission, hydrationPermission)

    private val launcher: ActivityResultLauncher<Set<String>> =
        activity.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
        ) {
            emitGranted("read")
        }

    private val exerciseLauncher: ActivityResultLauncher<Set<String>> =
        activity.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
        ) {
            emitGranted("exercise")
        }

    private val writeLauncher: ActivityResultLauncher<Set<String>> =
        activity.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
        ) {
            emitGranted("write")
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
        var exercise = false
        var nutrition = false
        var hydration = false
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
                exercise = granted.containsAll(exerciseRequired)
                nutrition = granted.contains(nutritionPermission)
                hydration = granted.contains(hydrationPermission)
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
            .put("exercise", exercise)
            .put("nutrition", nutrition)
            .put("hydration", hydration)
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

    /** Schritte und Gewicht lesen. */
    @JavascriptInterface
    fun requestPermissions() {
        launchPermission(launcher, required)
    }

    /**
     * Zusätzliche Berechtigungen anfragen.
     * @param group "exercise" (Aktivitäten + Verbrauch) oder "write" (Nährwerte + Wasser)
     */
    @JavascriptInterface
    fun requestExtras(group: String) {
        val wanted = when (group) {
            "exercise" -> exerciseRequired
            "write" -> writeRequired
            else -> return
        }
        launchPermission(if (group == "exercise") exerciseLauncher else writeLauncher, wanted)
    }

    private fun launchPermission(launcher: ActivityResultLauncher<Set<String>>, wanted: Set<String>) {
        if (!isAvailable()) {
            emitError("Health Connect ist auf diesem Gerät nicht verfügbar.")
            return
        }
        activity.runOnUiThread {
            try {
                launcher.launch(wanted)
            } catch (e: Exception) {
                emitError(e.message ?: "Berechtigung fehlgeschlagen.")
            }
        }
    }

    private fun emitGranted(group: String) {
        scope.launch {
            val granted = try {
                HealthConnectClient.getOrCreate(activity)
                    .permissionController
                    .getGrantedPermissions()
            } catch (_: Exception) {
                emptySet()
            }
            emit(
                "window.__kaloriqHealthPermission",
                JSONObject()
                    .put("scope", group)
                    .put("granted", when (group) {
                        "exercise" -> granted.containsAll(exerciseRequired)
                        "write" -> granted.containsAll(writeRequired)
                        else -> granted.containsAll(required)
                    })
                    .put("steps", granted.contains(stepsPermission))
                    .put("weight", granted.contains(weightPermission))
                    .put("exercise", granted.containsAll(exerciseRequired))
                    .put("nutrition", granted.contains(nutritionPermission))
                    .put("hydration", granted.contains(hydrationPermission))
                    .toString(),
            )
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

    /**
     * Schreibt Nährwerte und/oder Wasser eines Tages nach Health Connect.
     * payload: { date, kcal, protein, carbs, fat, water, nutrition, hydration }
     * Eigene Einträge des Tages werden vorher entfernt – mehrfaches Schreiben
     * erzeugt so keine doppelten Kalorien.
     */
    @JavascriptInterface
    fun writeDay(payload: String) {
        scope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(activity)
                val granted = client.permissionController.getGrantedPermissions()
                val json = JSONObject(payload)
                val date = try {
                    LocalDate.parse(json.optString("date", LocalDate.now().toString()))
                } catch (_: Exception) {
                    LocalDate.now()
                }
                val zone = ZoneId.systemDefault()
                val start = date.atStartOfDay(zone).toInstant()
                val end = date.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
                val startOffset = zone.rules.getOffset(start)
                val endOffset = zone.rules.getOffset(end)
                val records = mutableListOf<Record>()
                val labels = JSONArray()

                val wantNutrition = json.optBoolean("nutrition", true)
                    && granted.contains(nutritionPermission)
                if (wantNutrition) {
                    client.deleteRecords(NutritionRecord::class, TimeRangeFilter.between(start, end))
                    val kcal = json.optDouble("kcal", 0.0)
                    val protein = json.optDouble("protein", 0.0)
                    val carbs = json.optDouble("carbs", 0.0)
                    val fat = json.optDouble("fat", 0.0)
                    if (kcal > 0 || protein > 0 || carbs > 0 || fat > 0) {
                        records.add(
                            NutritionRecord(
                                startTime = start,
                                startZoneOffset = startOffset,
                                endTime = end,
                                endZoneOffset = endOffset,
                                metadata = Metadata.manualEntry(),
                                energy = Energy.kilocalories(kcal),
                                protein = Mass.grams(protein),
                                totalCarbohydrate = Mass.grams(carbs),
                                totalFat = Mass.grams(fat),
                                name = "Kaloriq",
                            ),
                        )
                        labels.put("nutrition")
                    }
                }

                val wantHydration = json.optBoolean("hydration", true)
                    && granted.contains(hydrationPermission)
                if (wantHydration) {
                    client.deleteRecords(HydrationRecord::class, TimeRangeFilter.between(start, end))
                    val water = json.optDouble("water", 0.0)
                    if (water > 0) {
                        records.add(
                            HydrationRecord(
                                startTime = start,
                                startZoneOffset = startOffset,
                                endTime = end,
                                endZoneOffset = endOffset,
                                volume = Volume.milliliters(water),
                                metadata = Metadata.manualEntry(),
                            ),
                        )
                        labels.put("hydration")
                    }
                }

                if (records.isNotEmpty()) client.insertRecords(records)

                emit(
                    "window.__kaloriqHealthWrite",
                    JSONObject()
                        .put("ok", true)
                        .put("written", labels)
                        .put("error", JSONObject.NULL)
                        .toString(),
                )
            } catch (e: Exception) {
                emit(
                    "window.__kaloriqHealthWrite",
                    JSONObject()
                        .put("ok", false)
                        .put("written", JSONArray())
                        .put("error", e.message ?: e.javaClass.simpleName)
                        .toString(),
                )
            }
        }
    }

    /**
     * Liest Aktivitäten der letzten Tage (Dauer und Kalorien).
     * @param days Anzahl Tage inklusive heute (1–30)
     */
    @JavascriptInterface
    fun readWorkouts(days: Int) {
        scope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(activity)
                val zone = ZoneId.systemDefault()
                val today = LocalDate.now()
                val span = days.coerceIn(1, 30).toLong()
                val start = today.minusDays(span - 1).atStartOfDay(zone).toInstant()
                val now = Instant.now()
                val sessions = client.readRecords(
                    ReadRecordsRequest(
                        recordType = ExerciseSessionRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(start, now),
                        ascendingOrder = false,
                        pageSize = 60,
                    ),
                ).records

                val list = JSONArray()
                for (session in sessions) {
                    var kcal: Double? = null
                    try {
                        kcal = client.aggregate(
                            AggregateRequest(
                                metrics = setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL),
                                timeRangeFilter = TimeRangeFilter.between(
                                    session.startTime,
                                    session.endTime,
                                ),
                            ),
                        )[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories
                    } catch (_: Exception) {
                        // Ohne Verbrauchs-Berechtigung bleibt nur die Dauer.
                    }
                    list.put(
                        JSONObject()
                            .put("title", session.title?.takeIf { it.isNotBlank() } ?: exerciseLabel(session.exerciseType))
                            .put("start", session.startTime.toString())
                            .put("date", session.startTime.atZone(zone).toLocalDate().toString())
                            .put("minutes", ChronoUnit.MINUTES.between(session.startTime, session.endTime))
                            .put("kcal", kcal ?: JSONObject.NULL),
                    )
                }

                emit(
                    "window.__kaloriqHealthWorkouts",
                    JSONObject()
                        .put("workouts", list)
                        .put("today", today.toString())
                        .put("error", JSONObject.NULL)
                        .toString(),
                )
            } catch (e: Exception) {
                emit(
                    "window.__kaloriqHealthWorkouts",
                    JSONObject()
                        .put("workouts", JSONArray())
                        .put("error", e.message ?: e.javaClass.simpleName)
                        .toString(),
                )
            }
        }
    }

    private fun exerciseLabel(type: Int): String = when (type) {
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "Gehen"
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "Laufen"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY -> "Radfahren"
        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING -> "Krafttraining"
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL -> "Schwimmen"
        ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "Yoga"
        ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING -> "HIIT"
        ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT -> "Training"
        else -> "Aktivität"
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
