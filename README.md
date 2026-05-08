# 📈 StockMaster Pro

StockMaster Pro ist eine hochperformante, modulare Web-Applikation zur Echtzeit-Analyse von Aktiendaten, Markt-Korrelationen und Sentiment-Trends. Das Projekt legt besonderen Wert auf **Clean Code Architecture**, **Separation of Concerns (SoC)** und eine robuste Anbindung an externe Finanz-Provider.

---

## ✨ Kernfunktionen

* **🔍 Dynamische Watchlist:** Verwalte deine Ticker-Symbole in einer persistenten, SQLite-gestützten Watchlist.
* **🧠 Intelligence Board:** Analysiere Markt-Zusammenhänge und Korrelationen zwischen verschiedenen Assets (z. B. BTC vs. NVIDIA).
* **📊 Echtzeit-Charts:** Visualisierung von historischen Daten und Trends mit optimierten Chart-Themes.
* **🛡️ Request-Management:** Ein intelligentes Backend-System schützt vor API-Rate-Limits (Alpha Vantage, Massive) durch automatisches Queueing und Priority-Handling.
* **🔔 Globales Error-Handling:** Ein zentralisiertes Notifikationssystem sorgt für klare Nutzer-Rückmeldungen bei API- oder Netzwerkproblemen.

---

## 🏗️ Technische Architektur

StockMaster Pro folgt modernen Software-Design-Patterns, um maximale Wartbarkeit zu garantieren:

### Frontend (Public/js)
* **Event-Driven UI:** Die Kommunikation zwischen Modulen (Watchlist, Chart, Intelligence) erfolgt entkoppelt über ein zentrales Event-System (`Events.js`).
* **Repository Pattern:** Datenzugriffe sind abstrahiert, sodass UI-Komponenten niemals direkt mit APIs kommunizieren.
* **Smart HttpClient:** Ein zentraler Client übernimmt das automatische Unwrapping von API-Antworten und das globale Fehler-Mapping.
* **IIFE-Modulkapselung:** Jedes UI-Modul arbeitet in seinem eigenen Namensraum, um globale Variablen-Konflikte zu vermeiden.

### Backend (Server)
* **Service-Oriented Architecture (SOA):** Die Geschäftslogik ist in dedizierten Services (`StockService`, `AnalysisService`) gekapselt.
* **DAO-Layer:** Datenbank-Operationen werden über spezialisierte Data Access Objects (`WatchlistDAO`, `HistoricalDataDAO`) abgewickelt.
* **Standardisierter API-Vertrag:** Jede Antwort folgt dem strikten Schema `{ success, data, error }`.

---

## 🛠️ Installation & Setup

1.  **Repository klonen:**
    ```bash
    git clone https://github.com/dein-profil/stockmaster-pro.git
    ```
2.  **Abhängigkeiten installieren:**
    ```bash
    npm install
    ```
3.  **Umgebungsvariablen:**
    Erstelle eine `.env` Datei im Wurzelverzeichnis und füge deine API-Keys hinzu:
    ```env
    ALPHA_VANTAGE_KEY=dein_key
    MASSIVE_API_KEY=dein_key
    ```
4.  **Server starten:**
    ```bash
    npm start
    ```

---

## 📜 Architektur-Regeln (Clean Code)

* **Zero Magic Values:** Alle Status-Codes und technischen Schlüssel werden über `AppConstants.js` verwaltet.
* **Centralized Messaging:** Nutzer-Texte und Fehlermeldungen sind in `Messages.js` zentralisiert (i18n-ready).
* **Regel 13 (API-Konsistenz):** Keine harten `success`-Prüfungen in den Modulen; der `HttpClient` liefert direkt die validierten Daten.

---

## 👨‍💻 Autor
Entwickelt mit Fokus auf Stabilität und Erweiterbarkeit.