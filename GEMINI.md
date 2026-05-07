# 🛡️ StockMaster Code-Buddy Protokoll (V5.1)

Dieses Dokument ist die oberste Instanz für alle Code-Änderungen. Jede Anweisung des CLI muss gegen dieses Regelwerk validiert werden.

---

## 🏛️ Sektion I: Architektur & Modularität (Clean Code)

* **Regel 1 (Separation of Concerns - SoC):** Absolute funktionale Trennung. Logik-Module (Services, Repositories, HttpClient) dürfen keine Kenntnis über das DOM oder UI-Zustände haben. Kommunikation zur UI erfolgt ausschließlich asynchron über `window.StockMaster.Events`.
* **Regel 2 (Modularer Blueprint):** Jede UI-Komponente ist ein autarkes Modul in `js/modules/`. Struktur: IIFE-Pattern (analog zu `chart.js`) mit einem zentralen Export-Objekt, das eine `init()`-Funktion bereitstellt.
* **Regel 3 (Single Responsibility & Datei-Limit):** Ein Modul = Eine Aufgabe. Sobald eine Datei **250 Zeilen** überschreitet, muss das CLI proaktiv ein Refactoring/Splitting vorschlagen. "Monster-Klassen" sind untersagt.
* **Regel 4 (Explicit Dependency Injection):** Keine "Hidden Dependencies" durch globalen State-Zugriff innerhalb von Funktionen. Alle benötigten Instanzen oder Daten müssen via Konstruktor oder Funktionsparameter übergeben werden.
* **Regel 5 (UI-Hygiene & Selektoren):**
    * **Inline-Styles:** Streng verboten.
    * **IDs:** Dürfen nur als JS-Hooks (Selektoren) verwendet werden. Styling über IDs ist untersagt.
    * **Klassen:** Ausschließlich CSS-Klassen definieren das visuelle Design.

---

## 🎨 Sektion II: Naming, CSS & Formatierung

* **Regel 6 (Präzise Naming Convention):**
    * `PascalCase`: Klassen-Namen, Dateinamen (z. B. `Logger.js`) und `module.exports`.
    * `lowerCamelCase`: Variablen, Funktionen, Instanzen, Parameter.
    * `UPPER_SNAKE_CASE`: Konstanten (global oder modul-weit).
* **Regel 7 (BEM-Methodik):** CSS-Struktur folgt zwingend `.block__element--modifier`. 
    * Beispiel: `.btn` (Block), `.btn__icon` (Element), `.btn--error` (Zustand). 
    * Layout-Abstände (Gaps, Padding) werden ausschließlich über zentrale CSS-Variablen gesteuert.
* **Regel 18 (Format-Standard):**
    * Einrückung: **2 Leerzeichen**.
    * Semikolons: Pflicht an jedem Zeilenende.
    * Strings: **Single Quotes** ' ' (außer Template-Literals).
    * Klammern: **Egyptian-Style** (öffnende Klammer auf der Zeile des Statements).
    * Keine willkürlichen Whitespace-Änderungen ohne funktionalen Grund.

---

## 📝 Sektion III: In-Code Dokumentation (The Memory)

* **Regel 16 (Strikte JSDoc-Pflicht):** Jeder Konstruktor und jede Funktion benötigt einen JSDoc-Block:
    ```javascript
    /**
     * Kurzbeschreibung der Funktionalität.
     * @param {Type} name - Beschreibung des Parameters.
     * @returns {Type} - Beschreibung des Rückgabewerts.
     */
    ```
* **Regel 17 (Intent-Kommentare):** Innerhalb von Funktionen muss komplexe Logik kommentiert werden. Der Fokus liegt auf dem **"Warum"** (die Absicht hinter dem Code), nicht auf dem "Was" (was der Code tut, sollte lesbar sein).
* **Regel 19 (Dokumentations-Schutz):** Bestehende Kommentare dürfen niemals entfernt oder gekürzt werden. Bei Code-Änderungen müssen die betroffenen JSDoc-Blöcke zwingend aktualisiert werden.

---

## 🛡️ Sektion IV: Integrität & Schutz (The Guardrails)

* **Regel 0 (Konsens-Prinzip):** Das CLI darf niemals eigenmächtig Code ändern oder "optimieren". Jede Änderung erfordert eine vorherige Planung (Fahrplan) und deine explizite Freigabe.
* **Regel 8 (Bestandsschutz):** Funktionierender Code, HTML-Strukturen oder CSS-Regeln, die nicht Teil der aktuellen Aufgabe sind, bleiben physisch unangetastet. Refactoring "im Vorbeigehen" ist untersagt.
* **Regel 9 (Atomic-Change):** Maximal **3 Dateien** gleichzeitig ändern, um Kontext-Verlust zu vermeiden.
* **Regel 10 (Full-Body-Protocol):** Immer den vollständigen Dateiinhalt liefern. Platzhalter wie // ... restlicher Code sind verboten.

---

## 🔄 Sektion V: Full-Stack & Fehler-Management

* **Regel 11 (Impact-Analyse):** Bei Änderungen an Server-Routen (Pfad, Parameter) oder JSON-Strukturen muss das CLI proaktiv nach betroffenen Frontend-Stellen suchen und Korrekturen vorschlagen.
* **Regel 12 (Async Safety):** Alle asynchronen Prozesse (Promises/Async-Await) müssen in `try/catch/finally` eingebettet sein. Im `finally`-Block müssen UI-Zustände (z. B. Loader) zwingend zurückgesetzt werden.
* **Regel 13 (Standardisierter API-Vertrag):** Backend-Antworten folgen immer dem Schema: `{ success: boolean, data: any, error: string | null }`.
* **Regel 14 (Event-Registry):** Keine "Magic Strings" für Events. Alle Events müssen als Konstanten in `js/events.js` definiert und von dort bezogen werden.
* **Regel 20 (Persistent Logging):**
    * **Verbot:** Die Verwendung von `console.log`, `console.error` oder `console.warn` im Server-Code ist für produktive Logik untersagt.
    * **Pflicht:** Es muss zwingend das zentrale `Logger`-Modul verwendet werden.
    * **Struktur:** Logs müssen in `server/logs/` persistiert werden. Fehler-Logs müssen immer den Error-Stack und den Kontext enthalten.
    * **Rotation:** Dateien müssen durch das System (z. B. winston-daily-rotate-file) rotiert werden.
* **Regel 21 (Infrastruktur-Trennung):** Strikte physische Trennung von Programmlogik und persistenten Daten.
    * **Logik-Ort:** Code zur Datenbankanbindung liegt in `./server/db/Database.js`.
    * **Daten-Ort:** Persistente Datenspeicher (z. B. SQLite-Dateien) liegen im Verzeichnis `./server/data/`.
    * **Abstraktion:** Dateipfade für den Datenzugriff müssen zwingend über Umgebungsvariablen (z. B. `DB_STORAGE_PATH`) gesteuert werden.

---

## 📋 Sektion VI: Belegpflicht (Receipt)

* **Regel 15 (Receipt):** Jede Antwort muss den Beleg enthalten: 
    *Searching for 'X'... [Found in Y / Not found].*