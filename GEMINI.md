# 🛡️ StockMaster Code-Buddy Protokoll (V2.0)

Dieses Dokument definiert die verbindlichen architektonischen und prozeduralen Regeln für die Zusammenarbeit. Jede Aktion des CLI muss diese Regeln strikt befolgen.

---

## 🏛️ Sektion I: Architektur & Design (The Clean Code Pillar)

* **Regel 1 (Separation of Concerns - SoC):** Absolute Trennung von Logik und UI. Logik-Module (Services, Repositories, HttpClient) dürfen keine DOM-Elemente kennen oder manipulieren. Kommunikation erfolgt ausschließlich über das Event-System (`window.StockMaster.Events`).
* **Regel 2 (Modularer Blueprint):** Neue UI-Einheiten müssen als autarke Module in `js/modules/` erstellt werden (IIFE-Pattern analog zu `chart.js`) und eine standardisierte `init()`-Schnittstelle besitzen.
* **Regel 3 (Monster-Klassen Verbot):** Klassen/Module dürfen nur eine Verantwortlichkeit haben (Single Responsibility). Dateien mit mehr als 250 Zeilen müssen zwingend auf Refactoring-Potential geprüft werden.
* **Regel 4 (Dependency Injection):** Keine "Hidden Dependencies". Alle Abhängigkeiten müssen explizit über Konstruktoren oder Funktionsparameter übergeben werden. Kein Zugriff auf globalen State innerhalb geschlossener Funktionen.
* **Regel 5 (UI-Hygiene):** Absolutes Verbot von Inline-Styles. Styling erfolgt zu 100% über CSS-Klassen. IDs dienen ausschließlich als JavaScript-Selektoren und dürfen keine CSS-Regeln enthalten.

---

## 🎨 Sektion II: Naming & CSS Standard (The Identity Pillar)

* **Regel 6 (Naming Convention):**
    * `PascalCase`: Klassen-Namen, Dateinamen (`.js`), `module.exports`.
    * `lowerCamelCase`: Variablen, Funktionen, Instanzen, Parameter.
    * `UPPER_SNAKE_CASE`: Konstanten (global oder modul-weit).
* **Regel 7 (BEM-Methodik):** CSS folgt strikt dem BEM-Muster:
    * `.block {}` (Modul)
    * `.block__element {}` (Kind-Element)
    * `.block--modifier {}` (Zustand/Variante, z. B. `--error`, `--active`).
    * `.u-utility {}` (Layout-Helfer mit Präfix `u-`).

---

## 🛡️ Sektion III: Integrität & Schutz (The Safety Pillar)

* **Regel 0 (Konsens & Roadmap):** Code darf niemals eigenmächtig verändert werden. Jede Änderung erfordert eine vorherige Planung (Fahrplan) und explizite Freigabe.
* **Regel 8 (Bestandsschutz):** Funktionierender Code, HTML oder CSS, der nicht direkt Teil der aktuellen Aufgabe ist, bleibt physisch unangetastet. Refactoring "nebenbei" ist untersagt.
* **Regel 9 (Atomic Change):** Maximal 3 Dateien gleichzeitig ändern. Größere Aufgaben müssen in Teil-Roadmaps unterteilt werden.
* **Regel 10 (Full-Body):** Immer den vollständigen Dateiinhalt liefern. Keine Abkürzungen (`// ...`).

---

## 🔄 Sektion IV: Full-Stack & Fehler-Management (The Impact Pillar)

* **Regel 11 (Impact-Analyse):** Bei Änderungen an Server-Routen (Pfad, Parameter) oder JSON-Outputs muss das CLI proaktiv alle betroffenen Frontend-Stellen suchen und Anpassungen vorschlagen.
* **Regel 12 (Async Safety):** Jeder asynchrone Prozess muss einen `try/catch/finally`-Block besitzen. Im `finally` müssen UI-Zustände (Loader etc.) zwingend zurückgesetzt werden.
* **Regel 13 (Standardisierte API):** Alle Backend-Routen müssen das Format `{ success: boolean, data: any, error: string | null }` liefern.
* **Regel 14 (Event-Registry):** Keine "Magic Strings". Alle Events müssen in `js/events.js` registriert sein.

---

## 📋 Sektion V: Belegpflicht (The Audit Pillar)

* **Regel 15 (Receipt):** Jede Antwort muss den Beleg enthalten: 
    *Searching for 'X'... [Found in Y / Not found].*