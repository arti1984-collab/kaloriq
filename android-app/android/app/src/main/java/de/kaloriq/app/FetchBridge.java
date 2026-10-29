package de.kaloriq.app;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Holt HTML fremder Seiten nativ und gibt es an die App zurueck.
 *
 * Grund: Im WebView gilt CORS. Rezeptseiten erlauben keinen direkten
 * fetch() aus der App, deshalb laedt diese Bruecke die Seite und die App
 * liest anschliessend nur noch die schema.org-Daten (JSON-LD) daraus.
 * Es werden ausschliesslich oeffentliche Seiten gelesen, nichts gesendet
 * und nichts gespeichert.
 */
public class FetchBridge {

    private static final int MAX_CHARS = 3 * 1024 * 1024;
    private static final String USER_AGENT =
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) "
            + "Chrome/120.0 Mobile Safari/537.36";

    private final WebView webView;
    private final ExecutorService pool = Executors.newFixedThreadPool(2);

    public FetchBridge(WebView webView) {
        this.webView = webView;
    }

    @JavascriptInterface
    public void html(final String url, final String requestId) {
        final String id = String.valueOf(requestId);
        pool.execute(() -> {
            JSONObject result = new JSONObject();
            HttpURLConnection connection = null;
            try {
                HttpURLConnection candidate =
                    (HttpURLConnection) new URL(String.valueOf(url)).openConnection();
                connection = candidate;
                candidate.setConnectTimeout(15000);
                candidate.setReadTimeout(20000);
                candidate.setInstanceFollowRedirects(true);
                candidate.setRequestProperty("User-Agent", USER_AGENT);
                candidate.setRequestProperty("Accept", "text/html,application/xhtml+xml");
                candidate.setRequestProperty("Accept-Language", "de-DE,de;q=0.9,en;q=0.8");

                int status = candidate.getResponseCode();
                result.put("status", status);
                result.put("ok", status >= 200 && status < 300);
                result.put("finalUrl", candidate.getURL().toString());

                if (status >= 200 && status < 300) {
                    InputStream stream = candidate.getInputStream();
                    result.put("html", read(stream, charsetOf(candidate.getContentType())));
                } else {
                    result.put("error", "Seite antwortet mit HTTP " + status + ".");
                }
            } catch (Exception error) {
                try {
                    result.put("ok", false);
                    result.put("error", "Seite konnte nicht geladen werden.");
                } catch (Exception ignored) {
                    // JSONObject wirft hier praktisch nie.
                }
            } finally {
                if (connection != null) connection.disconnect();
            }
            emit(id, result.toString());
        });
    }

    private Charset charsetOf(String contentType) {
        if (contentType != null) {
            for (String part : contentType.split(";")) {
                String value = part.trim();
                if (value.toLowerCase().startsWith("charset=")) {
                    String name = value.substring(8).trim().replace("\"", "");
                    try {
                        return Charset.forName(name);
                    } catch (Exception ignored) {
                        break;
                    }
                }
            }
        }
        return StandardCharsets.UTF_8;
    }

    private String read(InputStream stream, Charset charset) throws Exception {
        StringBuilder out = new StringBuilder();
        try (Reader reader = new InputStreamReader(stream, charset)) {
            char[] buffer = new char[8192];
            int count;
            while ((count = reader.read(buffer)) > 0) {
                out.append(buffer, 0, count);
                if (out.length() > MAX_CHARS) break;
            }
        }
        return out.toString();
    }

    private void emit(String requestId, String json) {
        String script = "window.__kaloriqFetchResult&&window.__kaloriqFetchResult("
            + JSONObject.quote(requestId) + "," + JSONObject.quote(json) + ");";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }
}
