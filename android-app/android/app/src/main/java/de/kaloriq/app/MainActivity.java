package de.kaloriq.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private StepCounterBridge stepCounter;
    private BarcodeScannerBridge barcodeScanner;
    private HealthConnectBridge healthConnect;
    private WidgetBridge widgetBridge;
    private ReminderBridge reminderBridge;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getBridge() != null && getBridge().getWebView() != null) {
            stepCounter = new StepCounterBridge(this, getBridge().getWebView());
            getBridge().getWebView().addJavascriptInterface(stepCounter, "AndroidStepCounter");

            barcodeScanner = new BarcodeScannerBridge(this, getBridge().getWebView());
            getBridge().getWebView().addJavascriptInterface(barcodeScanner, "AndroidBarcodeScanner");

            healthConnect = new HealthConnectBridge(this, getBridge().getWebView());
            getBridge().getWebView().addJavascriptInterface(healthConnect, "AndroidHealth");

            widgetBridge = new WidgetBridge(this);
            getBridge().getWebView().addJavascriptInterface(widgetBridge, "AndroidWidget");

            reminderBridge = new ReminderBridge(this, getBridge().getWebView());
            getBridge().getWebView().addJavascriptInterface(reminderBridge, "AndroidReminders");

            handleWidgetIntent(getIntent());
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("widget_action");
        if (action == null || action.isEmpty()) return;
        WidgetBridge.setPendingAction(this, action);
        try {
            String js = "window.__kaloriqWidgetAction&&window.__kaloriqWidgetAction("
                + org.json.JSONObject.quote(action) + ");";
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(js, null));
        } catch (Exception ignored) {
            // JS wird beim Start ohnehin über getPendingAction abgeholt.
        }
        intent.removeExtra("widget_action");
    }

    @Override
    public void onResume() {
        super.onResume();
        if (stepCounter != null) {
            stepCounter.onResume();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (stepCounter != null) {
            stepCounter.onPause();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        // Unsere Berechtigung zuerst behandeln, danach die Capacitor-Plugins.
        if (stepCounter != null) {
            stepCounter.onPermissionResult(requestCode, permissions, grantResults);
        }
        if (reminderBridge != null) {
            reminderBridge.onPermissionResult(requestCode, permissions, grantResults);
        }
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (barcodeScanner != null) {
            barcodeScanner.onActivityResult(requestCode, resultCode, data);
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onDestroy() {
        if (stepCounter != null) {
            stepCounter.onDestroy();
            stepCounter = null;
        }
        if (barcodeScanner != null) {
            barcodeScanner.onDestroy();
            barcodeScanner = null;
        }
        reminderBridge = null;
        widgetBridge = null;
        healthConnect = null;
        super.onDestroy();
    }
}
