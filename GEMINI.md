# 🛡️ StockMaster Code-Buddy Protokoll (V6.0)

Dieses Dokument ist die oberste Instanz für alle Code-Änderungen. Jede Anweisung des CLI muss gegen dieses Regelwerk validiert werden. **Verstöße führen zum sofortigen Abbruch der Aufgabe.**

---

## 🏛️ Sektion I: Architektur & Modularität (Clean Code)

* **Regel 1 (Separation of Concerns - SoC):** Absolute funktionale Trennung. Logik-Module (Services, Repositories, HttpClient) dürfen keine Kenntnis über das DOM oder UI-Zustände haben.
* **Regel 2 (Modularer Blueprint):** Jede UI-Komponente ist ein autarkes Modul in `js/modules/`.
* **Regel 3 (Single Responsibility & Datei-Limit):** Ein Modul = Eine Aufgabe. Max. **250 Zeilen** pro Datei. Bei Überschreitung muss proaktiv ein Refactoring vorgeschlagen werden.
* **Regel 4 (Explicit Dependency Injection):** Keine "Hidden Dependencies". Alle Instanzen (Datenbank, Logger, Services) werden via Konstruktor oder Parameter übergeben.

---

## 🚫 Sektion II: Die "Zero-Magic-Value" Policy

* **Regel 14 (Absolutes Literal-Verbot):** Funktionale Strings und Zahlen dürfen **niemals** hartkodiert in der Logik stehen.
    * **Verboten:** `if (score > 10)`, `res.status(200)`, `enqueue("P3", "AV")`, `url: '/query'`.
    * **Pflicht:** Alle Schwellenwerte, Prioritäten, Provider-Kürzel, Status-Codes und technischen Parameter **müssen** aus `AppConstants.js` bezogen werden.
    * **Ausnahme:** Nur `0` und `1` in Standard-Zählschleifen oder reine Logging-Texte sind erlaubt.
* **Regel 15 (Zentrales Messaging):** Alle Fehlermeldungen und User-Benachrichtigungen müssen in `server/utils/Messages.js` definiert sein. Hartkodierte Strings in `res.json({ error: '...' })` sind untersagt.

---

## 🌐 Sektion III: Infrastruktur & Konfigurations-Trennung

* **Regel 21 (Physische Trennung):** Logik in `./server/db/`, Daten in `./server/data/`.
* **Regel 22 (Secrets vs. Infrastructure):**
    * **`.env`:** Ausschließlich für **Geheimnisse** (API_KEYs, Passwörter) und **Umwelt-Variablen** (PORT, lokale Dateipfade wie `DB_STORAGE_PATH`).
    * **`AppConstants.js`:** Vollständige Basis-URLs, API-Versionen (z. B. `/v3`), Geschäftsregeln (Timeouts, Cache-Dauer) und Response-Keys.
    * **Verbot:** Infrastruktur-URLs dürfen niemals in der `.env` vorschlagen oder gespeichert werden.

---

## 🧠 Sektion IV: Der Architektur-Checkpoint

* **Regel 23 (Pattern-Explaining):** Vor der Implementierung neuer Logik oder komplexer Refactorings muss die KI:
    1. Das gewählte Entwurfsmuster benennen (z. B. Mapper, Strategy, Factory).
    2. Kurz begründen, warum dieses Muster gewählt wurde.
    3. Die explizite Zustimmung des Users abwarten.
* **Regel 24 (Struktur-Garantie):** Jede Antwort muss prüfen: "Existiert für diesen neuen Wert bereits eine Konstante?". Wenn nein, ist die Erweiterung von `AppConstants.js` zwingend der erste Schritt.

---

## 🛠️ Sektion V: CLI-Protokoll & Compliance

* **Regel 25 (Receipt-Pflicht):** Jede Antwort enthält den Beleg: `Searching for 'X'... [Found in Y / Not found]`.
* **Regel 26 (Atomic Change):** Maximal 3 Dateien gleichzeitig ändern. Bei größeren Aufgaben ist ein Step-by-Step-Fahrplan Pflicht.
* **Regel 27 (Full-Body):** Immer den vollständigen Dateiinhalt liefern. Keine Abkürzungen (`//...`) oder Teil-Code.
* **Regel 28 (Prettify):** Code-Ausgaben müssen sauber formatiert und konsistent eingerückt sein.