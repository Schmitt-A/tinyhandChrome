# tinyhandChrome 👆✨

> **Virtueller Präsentations-Zeiger & verblassende Freihand-Tinte für Chrome-Tab Bildschirmfreigaben (BigBlueButton, Google Meet, Zoom, MS Teams)**  
> Inspiriert vom genialen macOS Open-Source-Projekt [nilbuild/tinyhand](https://github.com/nilbuild/tinyhand).

---

## 📌 Über das Projekt (About)

| GitHub-Feld | Empfohlener Inhalt (zum Kopieren) |
| :--- | :--- |
| **Description** | *Virtueller Zeigestock & verblassende Freihand-Tinte für Tab-Bildschirmfreigaben in BigBlueButton, Google Meet und Zoom.* |
| **Description (EN)** | *Virtual presenter pointer & ephemeral drawing ink for Chrome tab screen-sharing in BigBlueButton, Google Meet, and Zoom.* |
| **Website** | `https://github.com/Schmitt-A/TinyHandChrome` |
| **Topics / Tags** | `chrome-extension`, `manifest-v3`, `screen-sharing`, `presentation-tool`, `virtual-pointer`, `bigbluebutton`, `google-meet`, `zoom`, `teams`, `tinyhand`, `drawing-tool`, `education`, `remote-work` |

### Warum tinyhandChrome für Tab-Sharing?

Wenn du in **BigBlueButton (BBB)**, **Google Meet**, **Microsoft Teams** oder **Zoom** nicht deinen gesamten Bildschirm teilst, sondern aus Datenschutz- oder Performancegründen **nur einen einzelnen Chrome-Tab**, werden native Desktop-Overlay-Apps (wie die originale TinyHand macOS-App) von der Browser-Aufnahme ignoriert.

**tinyhandChrome löst dieses Problem elegant:**  
Die Erweiterung injiziert einen virtuellen Zeiger und eine transparente Zeichenebene direkt in den DOM-Baum der Webseite – gekapselt in einem vollständig isolierten **Shadow DOM** ohne CSS-Interferenzen mit der besuchten Seite. Dadurch wird der Zeiger **1:1 in den Video-Stream des geteilten Tabs übertragen** – deine Teilnehmer sehen die Hand und alle Markierungen flüssig, gestochen scharf und ohne Verzögerung!

---

## ✨ Features im Überblick

- 👆 **Alle 36 originalen Zeigerstile von nilbuild/tinyhand integriert:**
  - **Direkte Favoriten:** Lavender Toy (Standard), Cartoon Glove, Coral Vinyl, Plush, Robot, Laser Dot.
  - **30 weitere Stile per Dropdown:** Astronaut, Midnight, Sky, Cactus, Chocolate, Chrome, Cloud, Gingerbread, Fuzzy, Glass, Grass, Holo, Jelly, Knit, Lava, Leaf, Lemon, Low poly, Marble, Mech, Mint, Monster, Neon, Pastel, Bubblegum, Pixel, Skeleton, Space, Terrazzo, Water, Wood.
- 📏 **Stufenlose Größen- & Stabbreiten-Regelung:**
  - **Zeigergröße (60 – 320 px):** Von dezent bis weithin sichtbar für große Hörsäle oder mobile Zuschauer.
  - **Stabbreite (2 – 24 px):** Passe die Dicke des Zeigestabes an deine Bildschirmauflösung an. Die Breite bleibt in jeder Richtung und bei jeder Stablänge absolut konstant.
  - **Schatten & 3D-Tiefe (0% – 100%):** Realistischer Drop-Shadow unter Hand und Stab für spürbare räumliche Tiefe über dem Web-Inhalt (oder flach bei 0%).
- 🪄 **Vier Verankerungs-Modi für den Stab:**
  - **Unten rechts (Ecke):** Stab ragt fest aus der unteren rechten Bildschirmecke heran (wie ein echter Referenten-Zeigestock).
  - **Unten links (Ecke):** Stab ragt fest aus der linken unteren Ecke heran.
  - **Dynamisch von unten:** Basis wandert am unteren Bildschirmrand direkt unter dem Cursor mit und neigt sich organisch in Bewegungsrichtung.
  - **Frei schwebend (ohne langen Stab):** Hand ohne Stab – mit **stufenloser Zeiger-Neigung (-60° bis +60°)** sowie optionaler dynamischer Neigung.
- 📐 **Exakte 90°-Rechtwinkligkeit zwischen Stab und Hand:**
  - Der Stab tritt immer absolut senkrecht (90°) mittig in die Handmanschette ein – kein schiefes Bündchen oder krummes Aufsitzen mehr.
  - Trotz Handdrehung bleibt die Fingerspitze dank iterativer Offset-Berechnung stets pixelgenau auf dem Mauszeiger.
- 🫁 **Dezente Animationen getrennt steuerbar (0% – 200%):**
  - **Bewegungs-Dynamik & Trägheit:** Regelbare Trägheits-Neigung (Inertia Tilt) und sanfte Federung beim Bewegen der Maus.
  - **Atmen & Schweben im Stillstand:** Organisches, sanftes Heben und Atmen im Ruhezustand (beides separat dosierbar oder abschaltbar).
- 🎯 **Eigene Zeiger hochladen & Klickpunkt kalibrieren:**
  - Lade beliebige PNG- oder SVG-Bilder hoch.
  - Kalibriere den Klickpunkt (z. B. Fingerspitze) interaktiv per Klick oder Ziehen des Fadenkreuzes direkt auf der Vorschau.
- ✍️ **Verblassende Freihand-Tinte (Ephemeral Ink):**
  - Zeichne mit gedrückter <kbd>Shift</kbd>-Taste freihändig Kreise, Pfeile oder Notizen auf jede Webseite.
  - Linien blenden sich nach ca. 3 Sekunden sanft von selbst aus – die Folien bleiben stets aufgeräumt.
  - 6 Farb-Presets oder individueller Color-Picker, Linienstärke und Verblassungsdauer anpassbar.
- 💥 **Authentisches Klick-Feedback:**
  - Beim normalen Klicken führt die Hand einen kurzen visuellen „Tap“ aus und an der Spitze pulsiert ein dezenter Ripple-Ring.
- 🛡️ **Keine Störung des Arbeitsflusses:**
  - Normale Klicks bedienen Links, Buttons und Eingabefelder völlig ungestört.
  - Die <kbd>Escape</kbd>-Taste wird bewusst nicht abgefangen, damit Präsentations-Vollbildmodi stabil bleiben.
  - Auf Wunsch wird der native Systemmauszeiger hinter der Hand verborgen.

---

## 🚀 Installation (macOS, Windows, Linux)

Die Erweiterung funktioniert plattformunabhängig auf allen Betriebssystemen (**macOS**, **Windows**, **Linux**) in Google Chrome sowie allen Chromium-basierten Browsern (z. B. **Brave**, **Microsoft Edge**, **Vivaldi**, **Opera**).

### Schritt 1: Projekt herunterladen

**Option A – Mit Git (Empfohlen):**
```bash
git clone https://github.com/Schmitt-A/TinyHandChrome.git tinyhandChrome
```

**Option B – Als ZIP-Archiv:**
1. Klicke oben auf GitHub auf den grünen Button **Code** ➔ **Download ZIP**.
2. Entpacke die ZIP-Datei in einen beliebigen Ordner auf deinem Computer (z. B. in deinen `Dokumente`- oder `Projekte`-Ordner).

---

### Schritt 2: In Google Chrome laden

1. Öffne Google Chrome (oder Brave, Edge, etc.).
2. Gib in die Adresszeile ein:
   ```text
   chrome://extensions
   ```
   *(in Microsoft Edge: `edge://extensions`)*
3. Aktiviere oben rechts den Schalter **„Entwicklermodus“** (*Developer mode*).
4. Klicke oben links auf **„Entpackte Erweiterung laden“** (*Load unpacked*).
5. Wähle im Dateidialog den heruntergeladenen bzw. geklonten Projektordner `tinyhandChrome` aus (der Ordner, der die `manifest.json` enthält).
6. **Fertig!** Klicke in der Chrome-Menüleiste auf das **Puzzleteil-Symbol** (Erweiterungen) und pinne **tinyhandChrome** für schnellen Zugriff an deine Toolbar.

> [!TIP]
> **Aktualisierung bei neuen Versionen:**  
> Wenn du eine neue Version herunterlädst oder `git pull` ausführst, öffne einfach `chrome://extensions` und klicke bei tinyhandChrome auf das **Aktualisieren-Symbol (Kreispfeil)**.

---

## ⌨️ Tastenkürzel (Shortcuts)

| Tastenkürzel (macOS) | Tastenkürzel (Windows / Linux) | Aktion |
| :--- | :--- | :--- |
| <kbd>⌥ Option</kbd> + <kbd>H</kbd> | <kbd>Alt</kbd> + <kbd>H</kbd> | **tinyhandChrome Ein / Aus** (Zeiger aktivieren oder verbergen) |
| <kbd>⌥ Option</kbd> + <kbd>C</kbd> | <kbd>Alt</kbd> + <kbd>C</kbd> | **Zeichnungen leeren** (Löscht sofort alle Tintenstriche) |
| <kbd>⌥ Option</kbd> + <kbd>S</kbd> | <kbd>Alt</kbd> + <kbd>S</kbd> | **Schnell-Stilwechsel** (wechselt durch die Favoriten) |
| <kbd>⇧ Shift</kbd> + **Maus ziehen** | <kbd>Shift</kbd> + **Maus ziehen** | **Freihand zeichnen** (verblasst nach ca. 3s) |
| **Normaler Linksklick** | **Normaler Linksklick** | Webseite normal bedienen + Klick-Tap & Ripple |

### Tastenkombinationen anpassen
Möchtest du eigene Tastenkürzel (z. B. `Ctrl+H` oder `F8`) vergeben?
1. Öffne das tinyhandChrome-Popup und klicke unten auf **„Tastenkombinationen anpassen ⚙️“**.
2. Alternativ öffne direkt `chrome://extensions/shortcuts` in deinem Browser.
3. Klicke auf das Stiftsymbol neben der gewünschten Aktion und drücke deine bevorzugte Tastenkombination.

---

## 📦 Releases & Versionsverlauf (Changelog)

### [v1.3.2] – 11. November 2026 *(Aktuelle Version)*
- 📐 **Perfekt rechtwinklige Stab-Verbindung (90°):** Bei allen Zeigern (insbesondere *Plush*) tritt der Stab nun exakt senkrecht mittig in die Handmanschette ein – kein krummes Aufsitzen mehr bei schräger Fingerhaltung.
- 📏 **Konstante Stabbreite:** Einheitliche, saubere Linienführung ohne Verzerrungen oder sichtbare Dicke-Änderungen bei unterschiedlichen Stablängen oder Drehungen.
- 🎯 **Ecken-Verankerung wiederhergestellt:** „Unten rechts“ und „Unten links“ sind wieder stabil in den Ecken verankert und springen beim Umschalten im Popup sofort an die gewünschte Position.

### [v1.3.1] – 11. November 2026
- 🏷️ Versionsanzeige direkt im Popup-Kopfbereich integriert.
- 🔄 Manifest V3 Versionsabgleich.

### [v1.3.0] – 11. November 2026
- 🎯 **Interaktive Klickpunkt-Kalibrierung (Hotspot Picker):** Fadenkreuz per Klick & Drag auf benutzerdefinierten Zeigergrafiken verschiebbar.
- 📏 **Stabbreite frei einstellbar:** Neuer Schieberegler von 2 bis 24 px.
- 🌓 **Schatten & 3D-Tiefe stufenlos regelbar:** Einstellbarer Drop-Shadow (0% bis 100%) für Hand und Stab.
- 🪄 **Dynamischer Stab-Verlauf:** Neuer Verankerungsmodus, bei dem der Stabfuß horizontal mit dem Cursor mitwandert und sich neigt.
- 🪶 **Frei schwebender Modus:** Einstellbare Neigung (-60° bis +60°) und dynamische Neigung nach Mausbewegung.
- 🫁 **Separates Animations-Tuning:** Unabhängige Regler für Bewegungs-Trägheit und Ruhe-Atmung (0% – 200%).

### [v1.2.2] – November 2026
- 🪄 Durchgehender Zeigestab direkt in den Ärmel der Hand.
- 🎯 100% exakte Fingerspitzen-Ausrichtung auf den Cursor.

### [v1.2.0] – November 2026
- 📏 Zeigergröße bis zu 320 px vergrößerbar.
- 🫁 Dezente Atembewegung im Stillstand.
- 📐 Stabverlauf wählbar (Unten rechts, Unten links, Dynamisch).

### [v1.1.0] – November 2026
- 🎨 Vollständige 1:1 Integration aller 36 authentischen Zeigerstile aus `nilbuild/tinyhand`.

### [v1.0.0] – November 2026
- 🎉 Initiales Release von TinyHand for Chrome.
- ✍️ Verblassende Freihand-Tinte auf High-DPI Canvas.
- 💥 Klick-Tap Animation und Leucht-Ripple.
- 🛡️ Isoliertes Shadow DOM zum Schutz vor CSS-Konflikten.

---

## 🎨 Eigene Zeigergrafiken verwenden

1. Klicke auf das **tinyhandChrome-Icon** in deiner Chrome-Menüleiste.
2. Wähle die Kachel **„Eigenes (+)”**.
3. Wähle ein beliebiges transparentes PNG- oder SVG-Bild von deiner Festplatte aus.
4. **Klickpunkt kalibrieren:** Klicke oder ziehe im Kalibrierungsbereich das Fadenkreuz direkt auf die Spitze deines Zeigers.
5. Der Zeiger ist sofort auf allen Webseiten aktiv und trifft pixelgenau!

---

## 💡 Best Practices für Videokonferenzen

1. **Konferenz starten:** Starte deinen Anruf in BigBlueButton, Google Meet, Zoom oder MS Teams.
2. **Nur den Tab teilen:** Wähle bei der Bildschirmfreigabe den Reiter **„Chrome-Tab“** (schont Bandbreite und schützt private Benachrichtigungen auf deinem Desktop).
3. **tinyhandChrome zuschalten:** Drücke <kbd>Alt</kbd> + <kbd>H</kbd> (Mac: <kbd>Option</kbd> + <kbd>H</kbd>) im geteilten Tab.
4. **Auf Details hinweisen:** Bewege die Hand auf Codezeilen, Tabellen oder Diagramme.
5. **Wichtiges hervorheben:** Halte <kbd>Shift</kbd> gedrückt und umkreise einen Begriff. Nach 3 Sekunden verschwindet die Markierung rückstandslos.
6. **Beenden:** Ein erneutes <kbd>Alt</kbd> + <kbd>H</kbd> schaltet den Zeiger wieder unsichtbar.

---

## 📁 Projektstruktur

```text
tinyhandChrome/
├── manifest.json              # Chrome Manifest V3 Konfiguration
├── background.js              # Service Worker (Tastenkürzel, Badge & State)
├── content/
│   ├── content.js             # Hauptlogik: Shadow DOM, SVG-Stab, Canvas-Tinte, Physik-Loop
│   └── overlay.css            # Isolierte Styles für Zeiger & Animationen
├── popup/
│   ├── popup.html             # Benutzeroberfläche des Einstellungs-Menüs
│   ├── popup.css              # Modernes macOS/Apple-inspiriertes Interface-Design
│   └── popup.js               # Event-Handling, Speicherverwaltung & Hotspot-Kalibrierung
├── hands/                     # Asset-Katalog: Alle 36 Hand-Grafiken (PNG & SVG)
├── icons/                     # Erweiterungs-Icons (16px, 48px, 128px)
├── tools/                     # Hilfsskripte & Asset-Generatoren
└── README.md                  # Diese Dokumentation
```

---

## 📄 Lizenz & Danksagung

- **Idee & Zeiger-Assets:** Inspiriert vom herausragenden Open-Source-Projekt [TinyHand für macOS von nilbuild](https://github.com/nilbuild/tinyhand).
- Entwickelt als eigenständige, plattformunabhängige Browser-Erweiterung für Web-Screen-Sharing auf **macOS**, **Windows** und **Linux**.
- Veröffentlicht unter der [MIT License](LICENSE).
