package de.kaloriq.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private StepCounterBridge stepCounter;
    private BarcodeScannerBridge barcodeScanner;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getBridge() != null && getBridge().getWebView() != null) {
            stepCounter = new StepCounterBridge(this, getBridge().getWebView());
            getBridge().getWebView().addJavascriptInterface(stepCounter, "AndroidStepCounter");

            barcodeScanner = new BarcodeScannerBridge(this, getBridge().getWebView());
            getBridge().getWebView().addJavascriptInterface(barcodeScanner, "AndroidBarcodeScanner");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (stepCounter != null) {
            stepCounter.onResume();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        // Unsere Berechtigung zuerst behandeln, danach die Capacitor-Plugins.
        if (stepCounter != null) {
            stepCounter.onPermissionResult(requestCode, permissions, grantResults);
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
        super.onDestroy();
    }
}
