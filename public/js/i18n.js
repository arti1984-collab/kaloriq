/* ============================================================
   Kaloriq – Sprachumschaltung (Deutsch / English)
   Die Views bleiben einsprachig (Deutsch) und werden beim
   Rendern übersetzt. Vorteil: kein Umbau der Templates, und
   gespeicherte Daten (Einträge, Namen) bleiben unberührt.
   ============================================================ */

const LOCALES = { de: 'de-DE', en: 'en-US' };
let lang = 'de';

export function getLang() { return lang; }
export function locale() { return LOCALES[lang] || LOCALES.de; }
export function isEnglish() { return lang === 'en'; }

export function setLang(next) {
  lang = next === 'en' ? 'en' : 'de';
  document.documentElement.lang = lang;
  return lang;
}

/* ---------------- Wörterbuch ---------------- */

const EN = {
  // Navigation / allgemein
  'Tagebuch': 'Diary',
  'Fortschritt': 'Progress',
  'Fasten': 'Fasting',
  'Profil': 'Profile',
  'Hauptnavigation': 'Main navigation',
  'KI-Tracking starten': 'Start AI tracking',
  'KI-Tracking': 'AI tracking',
  'Vorheriger Tag': 'Previous day',
  'Nächster Tag': 'Next day',
  'Zu heute springen': 'Jump to today',
  'Schließen': 'Close',
  'Abbrechen': 'Cancel',
  'Speichern': 'Save',
  'Übernehmen': 'Apply',
  'Laden': 'Load',
  'Weiter': 'Next',
  'Zurück': 'Back',
  'Plan': 'Plan',
  'Dein': 'Your',
  'steht': 'is ready',
  'Ein paar': 'A few',
  'Eckdaten': 'basics',
  'Was ist dein': 'What is your',
  'Ziel': 'goal',
  'bist du?': 'are you?',
  'Wie': 'How',
  'aktiv': 'active',
  'Plan starten': 'Start plan',
  'Bereit zum Start': 'Ready to start',

  // Onboarding
  'Wie sollen wir dich nennen?': 'What should we call you?',
  'Damit wir deinen Grundumsatz berechnen können.': 'So we can calculate your basal metabolic rate.',
  'Kalorien, Makros, Wasser und Fasten an einem Ort – inklusive KI-Foto-Erkennung. In zwei Minuten steht dein Plan.':
    'Calories, macros, water and fasting in one place – including AI photo recognition. Your plan is ready in two minutes.',
  '✓ Alle Daten bleiben auf deinem Handy': '✓ All data stays on your phone',
  '✓ Funktioniert auch offline': '✓ Works offline too',
  '✓ Kein Konto, keine Cloud': '✓ No account, no cloud',
  'Deine Daten bleiben ausschließlich auf diesem Gerät.': 'Your data stays exclusively on this device.',
  '(optional)': '(optional)',
  'Name': 'Name',
  'Geschlecht': 'Sex',
  '♀ Weiblich': '♀ Female',
  '♂ Männlich': '♂ Male',
  'Alter': 'Age',
  'Größe (cm)': 'Height (cm)',
  'Gewicht (kg)': 'Weight (kg)',
  'Zielgewicht (kg)': 'Target weight (kg)',
  'Ziel (kg)': 'Target (kg)',
  'Zielgewicht': 'Target weight',
  'Gewicht': 'Weight',
  'Aktivität': 'Activity',
  'Kaum aktiv': 'Sedentary',
  'Leicht aktiv': 'Lightly active',
  'Mäßig aktiv': 'Moderately active',
  'Aktiv': 'Active',
  'Sehr aktiv': 'Very active',
  'Kaum aktiv – Schreibtisch, kaum Alltagsbewegung': 'Sedentary – desk job, little daily movement',
  'Leicht aktiv – Sitzend, 1–2× Sport pro Woche': 'Lightly active – seated, 1–2 workouts per week',
  'Mäßig aktiv – Viel auf den Beinen, 3–4× Sport': 'Moderately active – on your feet a lot, 3–4 workouts per week',
  'Aktiv – Körperliche Arbeit, 5–6× Sport': 'Active – physical job, 5–6 workouts per week',
  'Sehr aktiv – Schwere Arbeit oder Leistungssport': 'Very active – heavy work or competitive sports',
  'Schreibtisch, kaum Alltagsbewegung': 'Desk job, little daily movement',
  'Sitzend, 1–2× Sport pro Woche': 'Seated, 1–2 workouts per week',
  'Viel auf den Beinen, 3–4× Sport': 'On your feet a lot, 3–4 workouts',
  'Körperliche Arbeit, 5–6× Sport': 'Physical job, 5–6 workouts',
  'Schwere Arbeit oder Leistungssport': 'Heavy work or competitive sports',
  'Alltag zählt mehr als Sport. Wähle, was die meiste Zeit auf dich zutrifft.':
    'Everyday life matters more than sport. Pick what applies most of the time.',
  'Abnehmen, zunehmen oder einfach': 'Lose weight, gain weight or simply',
  'besser essen': 'eat better',
  'Abnehmen': 'Lose weight',
  'Zunehmen': 'Gain weight',
  'Gewicht halten': 'Maintain weight',
  '📉 Abnehmen': '📉 Lose weight',
  '📈 Zunehmen': '📈 Gain weight',
  '⚖️ Gewicht halten': '⚖️ Maintain weight',
  'Kaloriendefizit, langsam und nachhaltig': 'Calorie deficit, slow and sustainable',
  'Kontrollierter Überschuss für Muskelaufbau': 'Controlled surplus for muscle gain',
  'Kalorienbedarf decken': 'Meet your calorie needs',
  'Tempo': 'Pace',
  'Tempo:': 'Pace:',
  'Sportliche Einheiten kannst du später zusätzlich als Aktivität eintragen.':
    'You can log workouts later as activity.',
  'Grundumsatz': 'BMR',
  'Gesamtumsatz': 'TDEE',
  'Tagesziel': 'Daily target',
  'Tägliches Kalorienziel': 'Daily calorie target',
  'Protein': 'Protein',
  'Kohlenhydrate': 'Carbs',
  'Fett': 'Fat',
  'Wasser': 'Water',
  'Voraussichtlich': 'Estimated',
  'bei gleichbleibendem Tempo': 'at the current pace',
  'Ziel erreicht in': 'Goal reached in',
  'empfohlen pro Tag': 'recommended per day',
  'Richtwerte, keine medizinische Beratung.': 'Guidelines only, not medical advice.',
  'Du kannst das jederzeit im Profil anpassen.': 'You can change this anytime in your profile.',
  'Normalgewicht': 'Normal weight',
  'Übergewicht': 'Overweight',
  'Untergewicht': 'Underweight',
  'Richtwerte, kein medizinisches Gerät.': 'Guidelines only, not a medical device.',

  // Tagebuch
  'Heute': 'Today',
  'Gestern': 'Yesterday',
  'Morgen': 'Tomorrow',
  'Tagesziel (ml)': 'Daily target (ml)',
  'Noch nichts eingetragen': 'Nothing logged yet',
  'Noch keine Daten': 'No data yet',
  'Noch nicht gestartet': 'Not started yet',
  'keine Daten': 'no data',
  'Mahlzeiten': 'Meals',
  'Mahlzeit': 'Meal',
  'Frühstück': 'Breakfast',
  'Mittagessen': 'Lunch',
  'Abendessen': 'Dinner',
  'Snacks': 'Snacks',
  '☀️ Frühstück': '☀️ Breakfast',
  '🍽️ Mittagessen': '🍽️ Lunch',
  '🌙 Abendessen': '🌙 Dinner',
  '🍎 Snacks': '🍎 Snacks',
  'Wasser hinzufügen': 'Add water',
  'Wasser entfernen': 'Remove water',
  'Wassermenge': 'Water amount',
  'Menge in ml': 'Amount in ml',
  'Menge in Litern': 'Amount in litres',
  'Bitte eine Menge eingeben': 'Please enter an amount',
  'Schritte': 'Steps',
  'Zählen starten': 'Start counting',
  'Zählen stoppen': 'Stop counting',
  'Schritte korrigieren': 'Correct steps',
  'Schritte gespeichert': 'Steps saved',
  'Schrittzähler läuft': 'Step counter running',
  'Schrittzähler gestoppt': 'Step counter stopped',
  'Kein Zugriff auf den Bewegungssensor': 'No access to the motion sensor',
  'Kein Bewegungssensor verfügbar – Schritte lassen sich manuell eintragen.':
    'No motion sensor available – you can enter steps manually.',
  'Kein Schrittsensor verfügbar – Schritte lassen sich manuell eintragen.':
    'No step sensor available – you can enter steps manually.',
  'Kein Schrittsensor verfügbar': 'No step sensor available',
  'Berechtigung für den Schrittsensor wurde nicht erteilt':
    'Permission for the step sensor was not granted',
  'Zählt über den Gerätesensor – Schritte aus der Zeit mit geschlossener App werden beim nächsten Öffnen nachgetragen.':
    'Counts via the device sensor – steps taken while the app was closed are added the next time you open it.',
  'Tippe auf ▶. Der Gerätesensor zählt auch mit, während die App geschlossen ist.':
    'Tap ▶. The device sensor also counts while the app is closed.',
  'Zählt mit, solange Kaloriq geöffnet ist. Im Hintergrund pausiert der Sensor.':
    'Counts while Kaloriq is open. The sensor pauses in the background.',
  'Tippe auf ▶, um mitzuzählen – solange die App geöffnet ist.':
    'Tap ▶ to start counting – while the app is open.',
  'Für vergangene Tage lassen sich Schritte manuell eintragen – gezählt wird immer für heute.':
    'For past days you can enter steps manually – counting always applies to today.',
  'Frühstück hinzufügen': 'Add breakfast',
  'Mittagessen hinzufügen': 'Add lunch',
  'Abendessen hinzufügen': 'Add dinner',
  'Snacks hinzufügen': 'Add snacks',
  'Schnellzugriff': 'Quick access',
  'kcal übrig': 'kcal left',

  // Hinzufügen / Suche
  'Hinzufügen': 'Add',
  'Suche': 'Search',
  'Suchen': 'Search',
  'Barcode': 'Barcode',
  'Eigene': 'Custom',
  'Scannen': 'Scan',
  'Barcode-Nummer': 'Barcode number',
  'Barcode scannen': 'Scan barcode',
  'Scanner wird geöffnet …': 'Opening scanner …',
  'Scanner nicht verfügbar.': 'Scanner not available.',
  'Kein Barcode erkannt.': 'No barcode detected.',
  'Zeitüberschreitung beim Scan. Bitte erneut versuchen.': 'Scan timed out. Please try again.',
  'Scanner konnte nicht geöffnet werden.': 'Could not open the scanner.',
  'Scan fehlgeschlagen. Bitte erneut versuchen.': 'Scan failed. Please try again.',
  'Scan-Ergebnis konnte nicht gelesen werden.': 'Could not read the scan result.',
  'Scanner wird geladen …': 'Loading scanner …',
  'Scanner konnte nicht geladen werden. Bitte Nummer eingeben.': 'Could not load the scanner. Please enter the number.',
  'Kamerazugriff wurde abgelehnt. Bitte in den Einstellungen erlauben oder Nummer eingeben.':
    'Camera access was denied. Allow it in Settings or enter the number.',
  'Keine Kamera gefunden. Bitte Nummer eingeben.': 'No camera found. Please enter the number.',
  'Die Kamera wird bereits verwendet. Bitte Nummer eingeben.': 'The camera is already in use. Please enter the number.',
  'Kamera nicht verfügbar. Bitte Nummer eingeben.': 'Camera not available. Please enter the number.',
  'Barcode in den Rahmen halten…': 'Hold the barcode inside the frame…',
  'Code erkannt:': 'Code detected:',
  'Kamera-Scan wird von diesem Browser nicht unterstützt – Nummer steht auf der Verpackung.':
    'Camera scanning is not supported in this browser – enter the number from the package.',
  'z. B. 4008400403928': 'e.g. 4008400403928',
  'z. B. Omas Apfelkuchen': "e.g. Grandma's apple pie",
  'Lebensmittel suchen…': 'Search foods…',
  'Gramm': 'Grams',
  'Stück': 'Piece',
  'Portion': 'Portion',
  'Nährwerte pro 100 g': 'Nutrition per 100 g',
  'Speichern & hinzufügen': 'Save & add',
  'Eigene Datenbank · Open Food Facts auf Anfrage': 'Local database · Open Food Facts on request',
  'Kamera öffnen': 'Open camera',
  'Foto aufnehmen': 'Take photo',
  'Kamera-Scan wird von diesem Browser nicht unterstützt – Nummer steht auf der Verpackung.':
    'Camera scanning is not supported by this browser – the number is on the package.',
  'optional': 'optional',

  // Rezepte
  'Rezepte': 'Recipes',
  'Rezept': 'Recipe',
  'Rezept suchen…': 'Search recipes…',
  'Neues Rezept': 'New recipe',
  'Rezept bearbeiten': 'Edit recipe',
  'Zurück zum Tagebuch': 'Back to diary',
  'Rezepte importieren': 'Import recipes',
  'Rezepte exportieren': 'Export recipes',
  'Alle Rezepte exportieren': 'Export all recipes',
  'Rezepte importieren?': 'Import recipes?',
  'Rezepte exportiert': 'Recipes exported',
  'Rezepte importiert': 'Recipes imported',
  'Keine Rezepte zum Exportieren': 'No recipes to export',
  'Ungültige Rezeptdatei.': 'Invalid recipe file.',
  'Keine gültigen Rezepte gefunden.': 'No valid recipes found.',
  'Rezeptdatei ist zu groß.': 'Recipe file is too large.',
  'Noch keine Rezepte': 'No recipes yet',
  'Lege dein erstes Rezept an oder importiere eine JSON-Datei.': 'Create your first recipe or import a JSON file.',
  'Rezept anlegen': 'Create recipe',
  'JSON importieren': 'Import JSON',
  'Keine Rezepte gefunden': 'No recipes found',
  'Andere Suche probieren.': 'Try another search.',
  'Rezepte bleiben lokal auf diesem Gerät. Exportiere sie als JSON, um sie zu teilen oder zu sichern.':
    'Recipes stay on this device. Export them as JSON to share or back up.',
  'Zutaten': 'Ingredients',
  'Zubereitung': 'Preparation',
  'Nährwerte pro Portion': 'Nutrition per serving',
  'Portionen': 'Servings',
  'Zeit (Min.)': 'Time (min)',
  'Titel': 'Title',
  'Tags': 'Tags',
  'Zutat hinzufügen': 'Add ingredient',
  'Zutat suchen': 'Search ingredient',
  'Manuell eingeben': 'Enter manually',
  'Zutat': 'Ingredient',
  'Entfernen': 'Remove',
  'Zutat entfernen': 'Remove ingredient',
  'Aus Datenbank wählen': 'Choose from database',
  'Zutaten und Nährwerte pro 100 g': 'Ingredients and nutrition per 100 g',
  'Änderungen nur lokal': 'Changes are local only',
  'Rezept speichern': 'Save recipe',
  'Rezept gespeichert': 'Recipe saved',
  'Rezept aktualisiert': 'Recipe updated',
  'Rezept gelöscht': 'Recipe deleted',
  'Rezept löschen?': 'Delete recipe?',
  'Rezept nicht gefunden': 'Recipe not found',
  'Bitte Angaben prüfen': 'Please check the details',
  'Bitte einen Titel eingeben': 'Please enter a title',
  'Bitte mindestens eine Zutat mit Menge hinzufügen': 'Please add at least one ingredient with an amount',
  'Bitte alle Zutaten mit Name und Menge ergänzen': 'Please add a name and amount for every ingredient',
  'Keine Zubereitung hinterlegt.': 'No preparation steps.',
  'Zum Tagebuch': 'Add to diary',
  'Zum Tagebuch hinzufügen': 'Add to diary',
  'Rezept zum Tagebuch hinzugefügt': 'Recipe added to diary',
  'Datum': 'Date',
  'Bitte eine gültige Portionszahl eingeben': 'Please enter a valid number of servings',
  'Gesamt': 'Total',
  'Portionsgewicht': 'Serving weight',
  'Gesamtgewicht': 'Total weight',
  'Noch keine Zutaten': 'No ingredients yet',
  'Lokale Datenbank': 'Local database',
  'Nichts gefunden.': 'Nothing found.',
  'Bearbeiten': 'Edit',
  'Zutat hinzugefügt': 'Ingredient added',
  'Schritte, Tipps, Notizen…': 'Steps, tips, notes…',

  // KI-Sheet
  'Foto oder Beschreibung – Kalorien werden geschätzt': 'Photo or description – calories are estimated',
  '📷 Foto': '📷 Photo',
  '📝 Text': '📝 Text',
  'Bild aus Galerie wählen': 'Choose image from gallery',
  'Was hast du gegessen?': 'What did you eat?',
  'Zusatzinfo': 'Additional info',
  'z. B. große Portion, mit Sauce': 'e.g. large portion, with sauce',
  'z. B. 2 Scheiben Vollkornbrot mit Butter, 1 Ei und ein Cappuccino':
    'e.g. 2 slices of wholemeal bread with butter, 1 egg and a cappuccino',
  'Die KI schätzt Portionsgrößen. Prüfe die Werte und passe die Grammzahl an – besonders bei Saucen und Öl.':
    'The AI estimates portion sizes. Check the values and adjust the grams – especially for sauces and oil.',
  '✨ Kalorien schätzen': '✨ Estimate calories',
  'Müsli mit Milch': 'Muesli with milk',
  'Hähnchen mit Reis und Brokkoli': 'Chicken with rice and broccoli',
  'Döner Kebab': 'Doner kebab',
  'Latte macchiato': 'Latte macchiato',

  // Fortschritt
  'Diese Woche': 'This week',
  'Letzte 7 Tage': 'Last 7 days',
  'Verlauf': 'History',
  'Gewicht eintragen': 'Log weight',
  'Balken = Kalorien pro Tag, Linie = dein Ziel (2.240 kcal).': 'Bars = calories per day, line = your target ({0} kcal).',
  'Tipp: am besten morgens, nackt und nach dem Toilettengang wiegen. Schwankungen von 1–2 kg pro Tag sind normal.':
    'Tip: weigh yourself in the morning, naked and after using the toilet. Fluctuations of 1–2 kg per day are normal.',

  // Fasten
  '16:8-Fasten starten': 'Start 16:8 fasting',
  '16:8-Fasten gestartet': '16:8 fasting started',
  'Der Klassiker · 16 Stunden Essenspause.': 'The classic · 16 hours without eating.',
  'Beim Fasten sind Wasser, ungesüßter Tee und schwarzer Kaffee erlaubt. Bei Vorerkrankungen, Schwangerschaft oder Essstörungen vorher ärztlich abklären.':
    'Water, unsweetened tea and black coffee are allowed while fasting. Check with a doctor first if you have prior conditions, are pregnant or have an eating disorder.',
  'nicht gefastet': 'not fasted',
  'Läuft gerade': 'Running now',
  '🔥 Fasten aktiv': '🔥 Fasting active',
  'Fasten beenden': 'End fasting',

  // Profil
  'Körperdaten & Ziel': 'Body data & goal',
  'Makro-Verteilung': 'Macro split',
  'Die Verteilung bestimmt, wie sich dein Kalorienziel auf Protein, Kohlenhydrate und Fett aufteilt.':
    'The split determines how your calorie target is divided into protein, carbs and fat.',
  'Wasserziel': 'Water target',
  'Schrittziel': 'Step goal',
  'Schrittziel gespeichert': 'Step goal saved',
  'Tagesziel (Schritte)': 'Daily target (steps)',
  'Übliche Empfehlung: 7.000–10.000 Schritte pro Tag.': 'Common recommendation: 7,000–10,000 steps per day.',
  'aus Gewicht berechnet': 'calculated from weight',
  'Empfehlung nach Gewicht: ca. 35 ml pro kg =': 'Recommendation by weight: approx. 35 ml per kg =',
  '. Hitze und Sport erhöhen den Bedarf.': '. Heat and exercise increase your needs.',
  'Gemini verbinden': 'Connect Gemini',
  'Gemini API-Key': 'Gemini API key',
  'Modell': 'Model',
  'Key anzeigen': 'Show key',
  'Key löschen': 'Delete key',
  'Verbindung testen': 'Test connection',
  'Kurze Testschätzung senden': 'Send a short test estimate',
  'Demo-Modus (ohne Key)': 'Demo mode (no key)',
  'Demo': 'Demo',
  'Aktiv': 'Active',
  'verbunden': 'connected',
  'nicht aktiv': 'not active',
  'Server-Proxy': 'Server proxy',
  'Läuft die App ohne Server (z. B. installiert), wird der Key direkt auf dem Gerät gespeichert und an Google gesendet.':
    'Without a server (e.g. installed app), the key is stored on the device and sent directly to Google.',
  'Der Key wird nur lokal gespeichert. Wer Zugriff aufs Gerät hat, kann ihn lesen – nutze am besten einen eigenen, nicht geteilten Key.':
    'The key is stored only on this device. Anyone with access can read it – use your own, unshared key.',
  'Kostenlos unter aistudio.google.com/apikey erstellen.': 'Create one for free at aistudio.google.com/apikey.',
  'Tippe auf „Laden“ – dann erscheint hier eine echte Auswahlliste mit allen Modellen deines Keys.':
    'Tap “Load” to see every model your key can use.',
  'z. B. gemini-3.8-flash': 'e.g. gemini-3.8-flash',
  'Google Gemini': 'Google Gemini',
  'Auf dem Handy installieren': 'Install on phone',
  'Als App mit eigenem Icon': 'As an app with its own icon',
  'App installieren': 'Install app',
  'App': 'App',
  'Android': 'Android',
  'Android (Chrome)': 'Android (Chrome)',
  'iPhone (Safari)': 'iPhone (Safari)',
  'Menü ⋮ oben rechts → „App installieren" bzw. „Zum Startbildschirm hinzufügen".':
    'Menu ⋮ top right → “Install app” or “Add to home screen”.',
  'Teilen-Symbol → „Zum Home-Bildschirm".': 'Share icon → “Add to Home Screen”.',
  'Nach der Installation startet Kaloriq im Vollbild, mit eigenem Icon – und funktioniert offline.':
    'After installing, Kaloriq starts full-screen with its own icon – and works offline.',
  'Daten exportieren': 'Export data',
  'Daten importieren': 'Import data',
  'JSON-Backup': 'JSON backup',
  'Backup zurückspielen': 'Restore backup',
  'Sicherungen': 'Backups',
  'Alles zurücksetzen': 'Reset everything',
  'Alles zurücksetzen?': 'Reset everything?',
  'Löscht alle Einträge auf diesem Gerät': 'Deletes all entries on this device',
  'Endgültig löschen': 'Delete permanently',
  'Jetzt sichern': 'Back up now',
  'Alle Einträge, Gewichte und Einstellungen auf diesem Gerät werden gelöscht. Der aktuelle Stand wird dabei automatisch gesichert und kann unter „Sicherungen“ zurückgeholt werden.':
    'All entries, weights and settings on this device will be deleted. The current state is backed up automatically and can be restored under “Backups”.',
  'Die App legt automatisch alle 12 Stunden eine Sicherung an (max. 3 Stände). Vor „Importieren“ und „Zurücksetzen“ wird zusätzlich der aktuelle Stand gesichert. Ein App-Update löscht keine Daten.':
    'The app creates a backup every 12 hours (max. 3 snapshots). The current state is also saved before “Import” and “Reset”. An app update never deletes data.',
  'Ausgewogen': 'Balanced',
  'Kalorien': 'Calories',
  'Sprache': 'Language',
  'Die Auswahl gilt sofort für die ganze App. Deine Daten bleiben unverändert.':
    'The choice applies to the whole app immediately. Your data stays unchanged.',
  'Proteinreich': 'High protein',
  'Low Carb': 'Low carb',

  'Menge (g)': 'Amount (g)',
  'Pro 100 g': 'per 100 g',
  'Quelle': 'Source',
  'Datenbank': 'Database',
  'Tagen': 'days',
  'unter Ziel': 'under target',
  'über Ziel': 'over target',
  'im Ziel': 'on target',
  'Mo': 'Mon',
  'Di': 'Tue',
  'Mi': 'Wed',
  'Do': 'Thu',
  'Fr': 'Fri',
  'Sa': 'Sat',
  'So': 'Sun',
  // Sonstiges
  'Kaloriq wurde installiert': 'Kaloriq has been installed',
  'Wieder online': 'Back online',
  'Offline – lokale Daten funktionieren weiter': 'Offline – local data keeps working',
  'Bitte ein realistisches Gewicht angeben': 'Please enter a realistic weight',
  'Gewicht gespeichert': 'Weight saved',
  'Backup gespeichert': 'Backup saved',
  'Profil aktualisiert': 'Profile updated',
  'Makros angepasst': 'Macros adjusted',
  'Wasserziel gespeichert': 'Water target saved',
  'Key entfernt': 'Key removed',
  'Bitte ein Modell auswählen oder eintippen': 'Please choose or type a model',
  'Demo-Modus – kein Key hinterlegt': 'Demo mode – no key stored',
  'Sicherung wiederhergestellt': 'Backup restored',
  'Sicherung angelegt': 'Backup created',
  'Backup importiert': 'Backup imported',
  'Zurückgesetzt': 'Reset done',
  'Kaloriq wird installiert…': 'Kaloriq is being installed…',
  'Kaloriq läuft bereits als installierte App': 'Kaloriq is already running as an installed app',
  'Eintrag aktualisiert': 'Entry updated',
  'Gelöscht': 'Deleted',
  'Bitte einen Namen eingeben': 'Please enter a name',  'Bitte Kalorien pro 100 g angeben': 'Please enter calories per 100 g',
  'Eigenes Lebensmittel gespeichert': 'Custom food saved',
  'Keine Einträge ausgewählt': 'No entries selected',
  'Nichts in der lokalen Liste gefunden': 'Nothing found in the local list',
  'Nutze die Online-Suche oder lege ein eigenes Lebensmittel an.':
    'Use the online search or create a custom food.',
  'Keine Treffer bei Open Food Facts. Andere Schreibweise probieren oder eigenes Lebensmittel anlegen.':
    'No matches on Open Food Facts. Try a different spelling or create a custom food.',
  'Online-Suche nicht erreichbar (Limit oder kein Netz). Lokale Treffer und eigene Lebensmittel funktionieren weiter.':
    'Online search unavailable (limit or no network). Local results and custom foods still work.',
  'Erkannt': 'Detected',
  'Demo-Modus: Werte aus der lokalen Datenbank. Für echte Foto-Erkennung einen Gemini-Key im Profil hinterlegen.':
    'Demo mode: values from the local database. Add a Gemini key in the profile for real photo recognition.',
  'niedrig': 'low',
  'mittel': 'medium',
  'hoch': 'high',
  'Bitte zuerst ein Foto aufnehmen oder aus der Galerie wählen.':
    'Please take a photo or choose one from the gallery first.',
  'Bitte einen gültigen Barcode eingeben.': 'Please enter a valid barcode.',
  'Produkt nicht gefunden. Bitte manuell eingeben.': 'Product not found. Please enter it manually.',
  'Für dieses Produkt fehlen Nährwerte.': 'This product has no nutrition data.',
  'Bestätigen': 'Confirm',
  'Löschen': 'Delete',
  'Eintrag löschen?': 'Delete entry?',
  'Sicherung wiederherstellen?': 'Restore backup?',
  'Wiederherstellen': 'Restore',
  'Backup einspielen?': 'Import backup?',
  'Die aktuellen Daten auf diesem Gerät werden überschrieben.': 'The current data on this device will be overwritten.',
  'Importieren': 'Import',
  'Import fehlgeschlagen': 'Import failed',
  'Keine gültige Kaloriq-Datei.': 'Not a valid Kaloriq file.',
  'Modellliste konnte nicht geladen werden.': 'Could not load the model list.',
  'Bitte zuerst den API-Key eingeben.': 'Please enter the API key first.',
  'Keine Verbindung zur KI. Internet prüfen.': 'No connection to the AI. Check your internet.',
  'Die Anfrage wurde vom Sicherheitsfilter blockiert. Bitte anderes Bild versuchen.':
    'The request was blocked by the safety filter. Please try another image.',
  'Die KI hat keine Antwort geliefert. Bitte erneut versuchen.': 'The AI returned no answer. Please try again.',
  'Antwort konnte nicht gelesen werden. Bitte erneut versuchen.': 'The response could not be read. Please try again.',
  'Keine Lebensmittel erkannt. Bitte Beschreibung ergänzen.': 'No foods detected. Please add a description.',
  'Dieses Modell ist für deinen Key nicht freigeschaltet. Bitte im Profil unter „KI-Tracking“ → „Modelle laden“ ein verfügbares Modell auswählen.':
    'This model is not enabled for your key. Pick an available model in Profile → “AI tracking” → “Load models”.',
  'Der API-Key ist ungültig. Bitte im Profil prüfen.': 'The API key is invalid. Please check it in your profile.',
  'Zugriff verweigert. Key-Rechte oder Abrechnung prüfen.': 'Access denied. Check the key permissions or billing.',
  'Modell nicht gefunden.': 'Model not found.',
  'Limit erreicht. Bitte kurz warten (Free-Tier: Anfragen pro Minute).':
    'Limit reached. Please wait a moment (free tier: requests per minute).',
  'Bild zu groß. Bitte ein kleineres Foto verwenden.': 'Image too large. Please use a smaller photo.',
  'Alle Angaben sind Schätzwerte – kein medizinisches Gerät.': 'All values are estimates – not a medical device.',
  'Kaloriq braucht JavaScript.': 'Kaloriq requires JavaScript.',
  'kcal': 'kcal',
  'kg': 'kg',
  'Test': 'Test',
  'T': 'T',
  'KH': 'C',

  // Sanfter Modus / Wohlbefinden
  'Wohlbefinden': 'Wellbeing',
  'Sanfter Modus': 'Gentle mode',
  'Aktiv · Wochenrahmen statt Tagesdruck': 'On · weekly range instead of daily pressure',
  'Anti-Burnout: keine roten Zahlen, Pausen erlaubt': 'Anti-burnout: no red numbers, breaks allowed',
  'Richtwert': 'Guide',
  'Wochenrahmen': 'Weekly range',
  'Wochenbalance': 'Weekly balance',
  'Richtwert pro Tag': 'Daily guide',
  'Pause aktiv': 'Pause active',
  'ohne Tagesdruck': 'without daily pressure',
  'Tracking pausieren': 'Pause tracking',
  'Kalorienziel wieder einblenden': 'Show calorie target again',
  'Tagesziel im Tagebuch ausblenden, Daten behalten': 'Hide the daily target in the diary, keep your data',
  'Sanfter Modus aktiviert': 'Gentle mode enabled',
  'Sanfter Modus deaktiviert': 'Gentle mode disabled',
  'Pause · ohne Kaloriendruck': 'Pause · no calorie pressure',
  'Pause machen': 'Take a pause',
  'Pause beenden': 'End pause',
  'Pause aktiviert': 'Pause started',
  'Pause beendet': 'Pause ended',
  'Kein Kaloriendruck': 'No calorie pressure',
  'Dein Kalorienziel ist im Tagebuch ausgeblendet. Du kannst trotzdem eintragen, was du möchtest – nichts wird bewertet.':
    'Your calorie target is hidden in the diary. You can still log whatever you like – nothing is judged.',
  'Dein Kalorienziel ist im Tagebuch ausgeblendet. Deine Daten bleiben erhalten.':
    'Your calorie target is hidden in the diary. Your data stays intact.',
  'kcal heute': 'kcal today',
  'Noch offen': 'Still open',
  'über Richtwert': 'above guide',
  'im Rahmen': 'within range',
  'etwas darüber': 'slightly above',
  'darunter': 'below',
  'Tage mit Eintrag': 'days logged',
  'Tag mit Eintrag': 'day logged',
  'Noch nichts eingetragen. Du musst heute nicht alles perfekt machen.':
    'Nothing logged yet. You don’t have to make today perfect.',
  'Du bist im Rahmen. Kein Grund, heute etwas nachzuholen.': 'You’re within range. No need to catch up today.',
  'Etwas über dem Richtwert. Das gleicht sich über die Woche aus – kein Grund, morgen zu sparen.':
    'A little above the guide. It balances out over the week – no need to save up tomorrow.',
  'Noch keine Einträge in den letzten 7 Tagen.': 'No entries in the last 7 days yet.',
  'Du liegst im Wochenrahmen.': 'You’re within your weekly range.',
  'Diese Woche liegt unter dem Richtwert. Auch das ist okay.': 'This week is below the guide. That’s okay too.',
  'Etwas über dem Richtwert. Einzelne Tage gleichen sich aus – kein Grund, morgen zu sparen.':
    'A little above the guide. Single days balance out – no need to save up tomorrow.',
  'keine Daten': 'no data',
  'Zahlen sind Orientierung, kein Wettkampf.': 'Numbers are guidance, not a competition.',

  // Minimalmodus
  'Minimalmodus': 'Minimal mode',
  'Minimal · ohne Zahlen': 'Minimal · no numbers',
  'Aktiv · Ring, Ziel und Makros ausgeblendet': 'On · ring, target and macros hidden',
  'Nur Mahlzeiten, Wasser und Schritte anzeigen': 'Show only meals, water and steps',
  'Kalorienziel und Makros sind ausgeblendet. Trag einfach ein, was du gegessen hast – ohne Zahlen zu vergleichen.':
    'Calorie target and macros are hidden. Just log what you ate – no need to compare numbers.',
  'Kalorienziel, Wochenbilanz und Makros sind ausgeblendet. Gewicht und Verlauf bleiben sichtbar.':
    'Calorie target, weekly balance and macros are hidden. Weight and history stay visible.',
  'Zahlen einblenden': 'Show numbers',
  'Zahlen wieder eingeblendet': 'Numbers shown again',
  'Minimalmodus aktiviert': 'Minimal mode enabled',
  'Minimalmodus deaktiviert': 'Minimal mode disabled',

  // Flexbereich
  'Flexbereich': 'Flex range',
  'Aus · Ziel zählt exakt': 'Off · the goal is exact',
  'Toleranz': 'Tolerance',
  'Wie viel Spielraum als „im Rahmen“ gilt': 'How much leeway counts as “within range”',
  'Flexbereich aktiviert': 'Flex range enabled',
  'Flexbereich deaktiviert': 'Flex range disabled',
  'unter Richtwert': 'below guide',
  'noch darunter': 'still below',
  'Spielraum': 'Range',
  'Heute liegt unter dem Richtwert. Auch das ist okay – kein Grund, alles aufzuholen.':
    'Today is below the guide. That’s okay too – no need to catch up on everything.',
  'Wie viel Spielraum um dein Kalorienziel als „im Rahmen“ gilt. Innerhalb des Bereichs bleibt alles neutral – ohne rote Zahlen.':
    'How much leeway around your calorie goal counts as “within range”. Inside the range everything stays neutral – no red numbers.',
  'Das Ziel zählt exakt': 'The goal counts exactly',
  'Enger Spielraum': 'Narrow range',
  'Empfohlen': 'Recommended',
  'Großer Spielraum': 'Wide range',
  'kcal drüber': 'kcal over',
  'kcal im Spielraum': 'kcal within range',
  'Der Flexbereich lässt einzelne Tage schwanken – die Woche zählt.':
    'The flex range lets individual days vary – the week is what counts.',

  // Gnaden-Tage
  'Gnaden-Tage': 'Grace days',
  'Aus · ein leerer Tag bricht die Serie': 'Off · a blank day breaks the streak',
  'Gnaden-Tage deaktiviert': 'Grace days disabled',
  'Ein Gnaden-Tag hält deine Serie am Leben, wenn du an einem Tag nichts einträgst. Sie werden automatisch verbraucht und gelten pro Kalendermonat – ohne Punkte, ohne Strafe.':
    'A grace day keeps your streak alive when you don’t log anything on a day. They are used automatically and apply per calendar month – no points, no penalty.',
  'Aktuelle Serie': 'Current streak',
  'Aus': 'Off',
  'Ein leerer Tag bricht die Serie': 'A blank day breaks the streak',
  'Eine bewusste Auszeit': 'A deliberate break',
  'Empfohlen · ein Wochenende flexibel': 'Recommended · one flexible weekend',
  'Großzügiger Spielraum': 'Generous leeway',
  'Gnaden-Tage sind ausgeschaltet.': 'Grace days are turned off.',

  // Pausenmodus
  'Pausenmodus': 'Pause mode',
  'Nur heute drüber oder ein paar Tage': 'Just today off, or a few days',
  'Nur heute drüber oder ein paar Tage ohne Druck': 'Just today off, or a few days without pressure',
  'Pause': 'Pause',
  'Aktiv': 'On',
  'Deine Pause läuft': 'Your pause runs',
  'Kalorienziel und Wochenbilanz sind ausgeblendet, deine Serie ist eingefroren. Trage nur ein, wenn du möchtest – nichts wird bewertet.':
    'Calorie target and weekly balance are hidden, your streak is frozen. Log only if you want to – nothing is judged.',
  'Kalorienziel und Wochenbilanz sind ausgeblendet, deine Serie ist eingefroren.':
    'Calorie target and weekly balance are hidden, your streak is frozen.',
  'Anpassen': 'Adjust',
  'Pause aktiv': 'Pause active',
  'offen': 'open',
  'Manchmal ist einfach „heute drüber“ okay. In der Pause wird dein Kalorienziel ausgeblendet und die Serie eingefroren. Du kannst weiter eintragen – nichts wird bewertet.':
    'Sometimes simply “over today” is okay. During a pause your calorie target is hidden and your streak is frozen. You can keep logging – nothing is judged.',
  'Nur heute': 'Just today',
  'Nur heute drüber': 'Just today off',
  'Ein Tag ohne Bewertung': 'One day without judgement',
  'Kurze Auszeit': 'Short break',
  '1 Woche': '1 week',
  'Eine Woche ohne Druck': 'A week without pressure',
  '2 Wochen': '2 weeks',
  'Längere Pause': 'Longer break',
  'Bis ich es beende': 'Until I end it',
  'Offenes Ende': 'Open end',
  'Eine bestehende Pause lässt sich verlängern oder verkürzen. Vergangene Pausentage bleiben eingefroren.':
    'An existing pause can be extended or shortened. Past pause days stay frozen.',
  'Pause angepasst': 'Pause adjusted',
  'Pause starten': 'Start pause',
  'Pause gestartet · ohne Enddatum': 'Pause started · no end date',
  'Pause gestartet': 'Pause started',
  'Bitte eine Dauer auswählen': 'Please choose a duration',
  'Serie eingefroren': 'streak frozen',
  'ohne Enddatum': 'no end date',

  // Hunger & Sättigung
  'Hunger & Sättigung': 'Hunger & satiety',
  'Hunger vor dem Essen': 'Hunger before eating',
  'Sättigung nach dem Essen': 'Satiety after eating',
  '1 = kaum Hunger · 10 = sehr hungrig': '1 = barely hungry · 10 = very hungry',
  '1 = noch hungrig · 10 = übervoll': '1 = still hungry · 10 = overly full',
  'Optional: Wie hungrig warst du vor dem Essen, wie satt danach? Beides ist freiwillig – du kannst auch nur eine Angabe machen.':
    'Optional: how hungry were you before eating, how full afterwards? Both are optional – you can also give just one rating.',
  'Kein Ziel, keine Bewertung. Tippe eine gewählte Zahl erneut an, um sie zu entfernen.':
    'No goal, no judgement. Tap a selected number again to remove it.',
  'Check-in entfernt': 'Check-in removed',
  'Körpergefühl gespeichert': 'Check-in saved',
  'ändern': 'change',
  'erfassen': 'log',
  'Aktiv · optionaler Check-in pro Mahlzeit': 'On · optional check-in per meal',
  'Aus · keine Check-ins in den Mahlzeiten': 'Off · no check-ins in meals',
  'Hunger-Check aktiviert': 'Hunger check enabled',
  'Hunger-Check deaktiviert': 'Hunger check disabled',

  // Kleine Erfolge
  'Kleine Erfolge': 'Small wins',
  'Nicht alles muss eine Zahl sein.': 'Not everything has to be a number.',
  'Wasser getrunken': 'Drank water',
  'Spaziergang gemacht': 'Went for a walk',
  'Bewusst gegessen': 'Ate mindfully',
  'Mir Zeit genommen': 'Took time for myself',
  'Das zählt auch – ohne Zahl.': 'That counts too – without a number.',
  'Aktiv · Nicht-Zahl-Erfolge im Tagebuch': 'On · non-number wins in the diary',
  'Aus · keine Erfolgs-Karte im Tagebuch': 'Off · no wins card in the diary',
  'Kleine Erfolge aktiviert': 'Small wins enabled',
  'Kleine Erfolge deaktiviert': 'Small wins disabled',
};

/* ---------------- Lebensmittel (Datenbanknamen) ---------------- */

const FOOD_EN = {
  'Vollkornbrot': 'Wholegrain bread',
  'Weizenbrot': 'Wheat bread',
  'Baguette': 'Baguette',
  'Toastbrot': 'Toast bread',
  'Brötchen': 'Bread roll',
  'Croissant': 'Croissant',
  'Knäckebrot': 'Crispbread',
  'Laugenbrezel': 'Pretzel',
  'Haferflocken': 'Oats',
  'Müsli': 'Muesli',
  'Cornflakes': 'Cornflakes',
  'Nudeln, gekocht': 'Pasta, cooked',
  'Reis, gekocht': 'Rice, cooked',
  'Couscous, gekocht': 'Couscous, cooked',
  'Quinoa, gekocht': 'Quinoa, cooked',
  'Kartoffeln, gekocht': 'Potatoes, cooked',
  'Süßkartoffel': 'Sweet potato',
  'Kartoffelpüree': 'Mashed potatoes',
  'Pommes frites': 'French fries',
  'Bratkartoffeln': 'Fried potatoes',
  'Magerquark': 'Low-fat quark',
  'Speisequark 20 %': 'Quark 20%',
  'Naturjoghurt 3,5 %': 'Plain yogurt 3.5%',
  'Griechischer Joghurt 10 %': 'Greek yogurt 10%',
  'Skyr': 'Skyr',
  'Milch 3,5 %': 'Milk 3.5%',
  'Fettarme Milch 1,5 %': 'Low-fat milk 1.5%',
  'Hafermilch': 'Oat milk',
  'Mandelmilch': 'Almond milk',
  'Gouda': 'Gouda',
  'Mozzarella': 'Mozzarella',
  'Feta': 'Feta',
  'Hüttenkäse': 'Cottage cheese',
  'Frischkäse': 'Cream cheese',
  'Butter': 'Butter',
  'Ei (M)': 'Egg (M)',
  'Rührei': 'Scrambled eggs',
  'Gekochtes Ei': 'Boiled egg',
  'Hähnchenbrust': 'Chicken breast',
  'Putenbrust': 'Turkey breast',
  'Rinderhackfleisch': 'Ground beef',
  'Schweineschnitzel': 'Pork schnitzel',
  'Lachs': 'Salmon',
  'Thunfisch (Dose, Wasser)': 'Tuna (canned, water)',
  'Garnelen': 'Shrimp',
  'Salami': 'Salami',
  'Kochschinken': 'Cooked ham',
  'Hackfleischsauce': 'Meat sauce',
  'Tofu': 'Tofu',
  'Räuchertofu': 'Smoked tofu',
  'Tempeh': 'Tempeh',
  'Linsen, gekocht': 'Lentils, cooked',
  'Kichererbsen, gekocht': 'Chickpeas, cooked',
  'Kidneybohnen, gekocht': 'Kidney beans, cooked',
  'Hummus': 'Hummus',
  'Proteinpulver (Whey)': 'Protein powder (whey)',
  'Erbsenprotein': 'Pea protein',
  'Brokkoli': 'Broccoli',
  'Karotte': 'Carrot',
  'Gurke': 'Cucumber',
  'Tomate': 'Tomato',
  'Paprika': 'Bell pepper',
  'Zucchini': 'Zucchini',
  'Blattsalat': 'Lettuce',
  'Spinat': 'Spinach',
  'Champignons': 'Mushrooms',
  'Zwiebel': 'Onion',
  'Erbsen (TK)': 'Peas (frozen)',
  'Mais': 'Corn',
  'Avocado': 'Avocado',
  'Gemischter Salat': 'Mixed salad',
  'Banane': 'Banana',
  'Apfel': 'Apple',
  'Orange': 'Orange',
  'Erdbeeren': 'Strawberries',
  'Heidelbeeren': 'Blueberries',
  'Weintrauben': 'Grapes',
  'Birne': 'Pear',
  'Kiwi': 'Kiwi',
  'Mango': 'Mango',
  'Wassermelone': 'Watermelon',
  'Tiefkühlbeeren': 'Frozen berries',
  'Mandeln': 'Almonds',
  'Walnüsse': 'Walnuts',
  'Erdnüsse': 'Peanuts',
  'Erdnussbutter': 'Peanut butter',
  'Olivenöl': 'Olive oil',
  'Rapsöl': 'Rapeseed oil',
  'Leinsamen': 'Flaxseed',
  'Chiasamen': 'Chia seeds',
  'Honig': 'Honey',
  'Zucker': 'Sugar',
  'Marmelade': 'Jam',
  'Vollmilchschokolade': 'Milk chocolate',
  'Zartbitterschokolade': 'Dark chocolate',
  'Chips': 'Chips',
  'Gummibärchen': 'Gummy bears',
  'Butterkeks': 'Butter biscuit',
  'Proteinriegel': 'Protein bar',
  'Eiscreme': 'Ice cream',
  'Wasser': 'Water',
  'Kaffee, schwarz': 'Coffee, black',
  'Kaffee mit Milch': 'Coffee with milk',
  'Latte macchiato': 'Latte macchiato',
  'Cappuccino': 'Cappuccino',
  'Apfelsaft': 'Apple juice',
  'Orangensaft': 'Orange juice',
  'Cola': 'Cola',
  'Cola Zero': 'Cola Zero',
  'Bier (Pils)': 'Beer (pilsner)',
  'Weißwein': 'White wine',
  'Smoothie': 'Smoothie',
  'Energydrink': 'Energy drink',
  'Pizza Margherita': 'Pizza Margherita',
  'Döner Kebab': 'Doner kebab',
  'Currywurst mit Pommes': 'Currywurst with fries',
  'Cheeseburger': 'Cheeseburger',
  'Sushi (Maki)': 'Sushi (maki)',
  'Wiener Schnitzel': 'Wiener schnitzel',
  'Lasagne': 'Lasagna',
  'Spaghetti Bolognese': 'Spaghetti bolognese',
  'Gemüsesuppe': 'Vegetable soup',
  'Kartoffelsalat': 'Potato salad',
  'Nudelsalat': 'Pasta salad',
  'Caesar Salad': 'Caesar salad',
  'Falafel': 'Falafel',
  'Ramen': 'Ramen',
  'Omelett': 'Omelette',
  'Chicken Curry mit Reis': 'Chicken curry with rice',
  'Buddha Bowl': 'Buddha bowl',
  'Pfannkuchen': 'Pancakes',
  'Waffel': 'Waffle',
  'Kaiserschmarrn': 'Shredded pancake',
  'Müslischale mit Milch': 'Muesli bowl with milk',

  // Gruppen
  'Brot & Backwaren': 'Bread & baked goods',
  'Beilagen & Getreide': 'Sides & grains',
  'Milchprodukte & Eier': 'Dairy & eggs',
  'Fleisch & Fisch': 'Meat & fish',
  'Pflanzliches Protein': 'Plant protein',
  'Gemüse': 'Vegetables',
  'Obst': 'Fruit',
  'Nüsse & Öle': 'Nuts & oils',
  'Süßes & Snacks': 'Sweets & snacks',
  'Getränke': 'Drinks',
  'Gerichte': 'Dishes',
  'Eigene': 'Custom',

  // Portionsangaben
  'Scheibe': 'slice',
  'Stück': 'piece',
  'Portion': 'portion',
  'Becher': 'cup',
  'Glas': 'glass',
  'Kugel': 'scoop',
  'EL': 'tbsp',
  'TL': 'tsp',
  'Dose': 'can',
  'halbe': 'half',
  'Handvoll': 'handful',
  'Riegel': 'bar',
  'Tasse': 'cup',
  'Flasche': 'bottle',
  'Schale': 'bowl',
};

Object.assign(EN, FOOD_EN);

/* ---------------- Muster für dynamische Texte ---------------- */

const RULES = [
  [/^(-?[\d.,]+) kcal pro Tag$/, '$1 kcal/day'],
  [/^([\d.,]+) kcal übrig$/, '$1 kcal left'],
  [/^von ([\d.,]+) kcal$/, 'of $1 kcal'],
  [/^([\d.,]+) kcal Ziel$/, '$1 kcal target'],
  [/^([\d.,]+) kcal · Defizit ([\d.,]+)$/, '$1 kcal · deficit $2'],
  [/^Defizit ([\d.,]+) kcal · (.+)$/, (m) => `Deficit ${m[1]} kcal · ${EN[m[2]] || m[2]}`],
  [/^(Kaum aktiv|Leicht aktiv|Mäßig aktiv|Aktiv|Sehr aktiv) · (Abnehmen|Zunehmen|Gewicht halten)$/,
    (m) => `${EN[m[1]]} · ${EN[m[2]]}`],
  [/^([\d.,]+)\/([\d.,]+) (Tage|Tag) getrackt$/, '$1/$2 days tracked'],
  [/^Balken = Kalorien pro Tag, Linie = dein Ziel \(([\d.,]+) kcal\)\.$/,
    'Bars = calories per day, line = your target ($1 kcal).'],
  [/^([\d.,]+) kcal \/ Tag$/, '$1 kcal/day'],
  [/^P ([\d.,]+) g$/, 'P $1 g'],
  [/^KH ([\d.,]+) g$/, 'C $1 g'],
  [/^F ([\d.,]+) g$/, 'F $1 g'],
  [/^([\d.,]+)\/([\d.,]+)g$/, '$1/$2g'],
  [/^([\d.,]+)\/([\d.,]+) (Tage|Tag)$/, '$1/$2 days'],
  [/^([\d.,]+) von ([\d.,]+) kcal$/, '$1 of $2 kcal'],
  [/^([\d.,]+) Einträge$/, '$1 entries'],
  [/^1 Eintrag$/, '1 entry'],
  [/^([\d.,]+) Einträge · ([\d.,]+) ml Wasser$/, '$1 entries · $2 ml water'],
  [/^([\d.,]+) (Tag|Tage) mit Einträgen · ([\d.,]+) KB$/, '$1 days logged · $3 KB'],
  [/^([\d.,]+) (Tag|Tage)$/, '$1 days'],
  [/^≈ ([\d.,]+) Tage$/, '≈ $1 days'],
  [/^([\d.,]+) kg\/W$/, '$1 kg/wk'],
  [/^([\d.,]+) kg \/ Woche$/, '$1 kg/week'],
  [/^([\d.,]+) kg\/Woche$/, '$1 kg/week'],
  [/^([\d.,]+) kg\/Woche gilt als nachhaltig\. Dein Defizit:$/, '$1 kg/week is considered sustainable. Your deficit:'],
  [/^BMI ([\d.,]+) · (.+)$/, (m) => `BMI ${m[1]} · ${EN[m[2]] || m[2]}`],
  [/^Normal: ([\d.,]+)–([\d.,]+) kg$/, 'Normal: $1–$2 kg'],
  [/^(Männlich|Weiblich) · (\d+) J\. · (\d+) cm · ([\d.,]+) kg$/, (m) =>
    `${m[1] === 'Männlich' ? 'Male' : 'Female'} · ${m[2]} yrs · ${m[3]} cm · ${m[4]} kg`],
  [/^Für Muskelaufbau sind ([\d.,]+)–([\d.,]+) g Protein pro kg Körpergewicht sinnvoll\. Bei ([\d.,]+) kg also etwa (\d+) g\.$/,
    'For muscle gain, $1–$2 g protein per kg body weight makes sense. At $3 kg that is about $4 g.'],
  [/^Für (.+)$/, 'For $1'],
  [/^Ø Kalorien \((\d+) (Tage|Tag)\)$/, (m) => `Ø calories (${m[1]} ${m[1] === '1' ? 'day' : 'days'})`],
  [/^([\d.,]+) % P · ([\d.,]+) % KH · ([\d.,]+) % F — (.+)$/, '$1 % P · $2 % C · $3 % F — $4'],
  [/^Tagesziel basierend auf ([\d.,]+) kcal Grundumsatz und ([\d.,]+) kcal Gesamtumsatz\.$/,
    'Daily target based on $1 kcal BMR and $2 kcal TDEE.'],
  [/^Kaloriq ([\d.]+) · lokale Daten, keine Cloud$/, 'Kaloriq $1 · local data, no cloud'],
  [/^(\d+) (Stand|Stände) · automatisch alle 12 Std\.$/, (m) => `${m[1]} ${m[1] === '1' ? 'snapshot' : 'snapshots'} · automatic every 12 h`],
  [/^Die App legt automatisch alle 12 Stunden/, 'The app creates a backup automatically every 12 hours'],
  [/^(\d+) (Tag|Tage) mit Einträgen$/, (m) => `${m[1]} ${m[1] === '1' ? 'day' : 'days'} logged`],
  [/^− ([\d.,]+) kg bis Ziel$/, '− $1 kg to goal'],
  [/^"(.+)" wird aus dem Tagebuch entfernt\.$/, '"$1" will be removed from your diary.'],  [/^Der Stand vom (.+) ersetzt die aktuellen Daten\. Der jetzige Stand wird vorher gesichert\.$/,
    'The snapshot from $1 replaces the current data. The current state is backed up first.'],
  [/^Fehler (\d+)$/, 'Error $1'],
  [/^([\d.,]+) kcal pro 100 g$/, '$1 kcal per 100 g'],
  [/^([\d.,]+) P · ([\d.,]+) KH · ([\d.,]+) F pro 100 g · ([\d.,]+) kcal$/,
    '$1 P · $2 C · $3 F per 100 g · $4 kcal'],
  [/^([\d.,]+) kcal · P ([\d.,]+) · KH ([\d.,]+) · F ([\d.,]+)$/, '$1 kcal · P $2 · C $3 · F $4'],
  [/^(.+) · P ([\d.,]+) · KH ([\d.,]+) · F ([\d.,]+)$/, '$1 · P $2 · C $3 · F $4'],
  [/^Zu (Frühstück|Mittagessen|Abendessen|Snacks) hinzufügen$/, (m) => `Add to ${EN[m[1]].toLowerCase()}`],
  [/^(\d+) (Einträge|Eintrag) hinzugefügt$/, (m) => `${m[1]} ${m[1] === '1' ? 'entry' : 'entries'} added`],
  [/^(.+) hinzugefügt$/, (m) => `${EN[m[1]] || m[1]} added`],
  [/^Gespeichert · (.+)$/, 'Saved · $1'],
  [/^KI antwortet: (.+) · ([\d.,]+) kcal$/, 'AI responds: $1 · $2 kcal'],
  [/^(.+)-Fasten gestartet$/, '$1 fasting started'],
  [/^🔥 (\d+) (Tag|Tage) Serie · (.+)$/, (m) => `🔥 ${m[1]}-day streak · ${tr(m[3])}`],
  [/^1 Eintrag · ([\d.,]+) kcal übernehmen$/, '1 entry · $1 kcal add'],
  [/^([\d.,]+) Einträge · ([\d.,]+) kcal übernehmen$/, '$1 entries · $2 kcal add'],
  [/^(\d+) Rezepte · lokal gespeichert$/, (m) => `${m[1]} recipes · stored locally`],
  [/^1 Rezept · lokal gespeichert$/, '1 recipe · stored locally'],
  [/^(\d+) lokal gespeichert$/, '$1 stored locally'],
  [/^([\d.,]+) kcal \/ Portion · P ([\d.,]+) g · ([\d.,]+) Portionen$/, '$1 kcal / serving · P $2 g · $3 servings'],
  [/^([\d.,]+) kcal \/ Portion · P ([\d.,]+) g · 1 Portion$/, '$1 kcal / serving · P $2 g · 1 serving'],
  [/^([\d.,]+) kcal \/ Portion$/, '$1 kcal / serving'],
  [/^([\d.,]+) Portionen$/, '$1 servings'],
  [/^1 Portion$/, '1 serving'],
  [/^([\d.,]+) Portionen · ([\d.,]+) Min\.$/, '$1 servings · $2 min'],
  [/^1 Portion · ([\d.,]+) Min\.$/, '1 serving · $1 min'],
  [/^([\d.,]+) Min\.$/, '$1 min'],
  [/^Gesamt ([\d.,]+) g$/, 'Total $1 g'],
  [/^Portion ca\. ([\d.,]+) g$/, 'Serving approx. $1 g'],
  [/^([\d.,]+) g · ([\d.,]+) Portionen$/, '$1 g · $2 servings'],
  [/^([\d.,]+) g · 1 Portion$/, '$1 g · 1 serving'],
  [/^([\d.,]+) kcal · P ([\d.,]+) · KH ([\d.,]+) · F ([\d.,]+) pro 100 g$/, '$1 kcal · P $2 · C $3 · F $4 per 100 g'],
  [/^"(.+)" wird dauerhaft gelöscht\.$/, '"$1" will be permanently deleted.'],
  [/^1 Rezept wird hinzugefügt\. Vorhandene Rezepte mit gleicher ID werden aktualisiert\.$/, '1 recipe will be added. Existing recipes with the same ID will be updated.'],
  [/^(\d+) Rezepte werden hinzugefügt\. Vorhandene Rezepte mit gleicher ID werden aktualisiert\.$/, (m) => `${m[1]} recipes will be added. Existing recipes with the same ID will be updated.`],
  [/^1 Rezept importiert$/, '1 recipe imported'],
  [/^(\d+) Rezepte importiert$/, '$1 recipes imported'],
  [/^1 Rezept exportiert$/, '1 recipe exported'],
  [/^(\d+) Rezepte exportiert$/, '$1 recipes exported'],
  [/^([\d.,]+) (kg|ml|g|kcal)$/, '$1 $2'],
  [/^Gesamtzahl für (.+)\.$/, (m) => `Total for ${tr(m[1])}.`],
  [/^(.+) entfernt$/, '$1 removed'],
  [/^([\d.,]+) Schritte$/, '$1 steps'],
  [/^Aktiv · ±(\d+) % Spielraum um den Richtwert$/, 'On · ±$1% leeway around the guide'],
  [/^Flexbereich ±(\d+) %$/, 'Flex range ±$1%'],
  [/^Ziel ±(\d+) %: ([\d.,]+)–([\d.,]+) kcal$/, 'Goal ±$1%: $2–$3 kcal'],
  [/^([\d.,]+) kcal Richtwert$/, '$1 kcal guide'],
  [/^(\d+) von (\d+) diesen Monat genutzt$/,
    '$1 of $2 used this month'],
  [/^(\d+) von (\d+) Gnaden-Tagen diesen Monat genutzt\.$/,
    '$1 of $2 grace days used this month.'],
  [/^(\d+) übrig$/, '$1 left'],
  [/^1 Gnaden-Tag pro Monat$/, '1 grace day per month'],
  [/^(\d+) Gnaden-Tage pro Monat$/, '$1 grace days per month'],
  [/^(\d+) (Tag|Tage)$/, (m) => `${m[1]} ${m[1] === '1' ? 'day' : 'days'}`],
  [/^(\d+) pro Monat$/, '$1 per month'],
  [/^bis (.+) · noch (\d+) (Tag|Tage)$/,
    (m) => `until ${m[1]} · ${m[2]} ${m[2] === '1' ? 'day' : 'days'}`],
  [/^Hunger (\d+)\/10 · Sättigung (\d+)\/10$/, 'Hunger $1/10 · Satiety $2/10'],
  [/^Hunger (\d+)\/10$/, 'Hunger $1/10'],
  [/^Sättigung (\d+)\/10$/, 'Satiety $1/10'],
  [/^Sättigung (\d+)$/, 'Satiety $1'],
];

/* ---------------- Übersetzen ---------------- */

function normalize(s) {
  return s.replace(/\s+/g, ' ').trim();
}

/** Übersetzt einen einzelnen Text (oder gibt ihn unverändert zurück). */
export function tr(text) {
  if (lang === 'de') return text;
  const key = normalize(text);
  if (!key) return text;

  if (Object.prototype.hasOwnProperty.call(EN, key)) {
    return EN[key].replace('{0}', '');
  }

  for (const [re, out] of RULES) {
    const m = key.match(re);
    if (m) return typeof out === 'function' ? out(m) : key.replace(re, out);
  }

  return text;
}

/** Englischer Name (für Suche/Anzeige), unabhängig von der aktuellen Sprache. */
export function enOf(text) {
  const key = normalize(String(text ?? ''));
  if (!key) return '';
  return Object.prototype.hasOwnProperty.call(EN, key) ? EN[key] : '';
}

const ATTRS = ['placeholder', 'aria-label', 'title'];

function translateElementAttrs(el) {
  if (!el.getAttributeNames) return;
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (!value) continue;
    const next = tr(value);
    if (next !== value) el.setAttribute(name, next);
  }
}

/** Übersetzt einen kompletten DOM-Teilbaum (idempotent). */
export function applyI18n(root = document.body) {
  if (lang === 'de' || !root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    const next = tr(root.nodeValue);
    if (next !== root.nodeValue) root.nodeValue = next;
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateElementAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const raw = node.nodeValue;
      if (!raw || !raw.trim()) continue;
      // Leerzeichen/Umbrüche am Rand erhalten ("Dein <em>Plan</em> steht")
      const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const next = tr(m[2]);
      if (next !== m[2]) node.nodeValue = m[1] + next + m[3];
    }
    root.querySelectorAll('*').forEach(translateElementAttrs);
  }
}

/**
 * Beobachtet spätere Änderungen (Toasts, Live-Werte in Sheets).
 * Übersetzte Texte treffen kein Muster mehr, daher keine Endlosschleife.
 */
export function watchI18n() {
  let busy = false;
  const observer = new MutationObserver((mutations) => {
    if (lang === 'de' || busy) return;
    busy = true;
    try {
      for (const m of mutations) {
        if (m.type === 'characterData') {
          applyI18n(m.target);
        } else {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) applyI18n(n);
          });
        }
      }
    } finally {
      busy = false;
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return observer;
}
