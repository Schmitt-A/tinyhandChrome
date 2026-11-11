# TinyHand for Chrome 👆✨

> **Virtueller Präsentations-Zeiger & verblassende Freihand-Zeichnungen für Chrome-Tab Bildschirmfreigaben (BigBlueButton, Google Meet, Zoom)**  
> Inspiriert vom genialen Open-Source-Projekt [nilbuild/tinyhand](https://github.com/nilbuild/tinyhand).

---

## Warum eine Chrome-Erweiterung für Tab-Sharing?

Wenn du in **BigBlueButton (BBB)**, **Google Meet**, **MS Teams** oder **Zoom** nicht deinen gesamten Bildschirm teilst, sondern aus Datenschutz- oder Performancegründen **nur einen einzelnen Chrome-Tab**, werden native macOS-Overlay-Apps (wie die native TinyHand-Desktop-App) von der Browser-Aufnahme ignoriert.

**TinyHand for Chrome löst dieses Problem elegant:**  
Die Erweiterung injiziert einen virtuellen Zeiger und eine transparente Zeichenebene direkt in den DOM-Baum der Webseite (gekapselt in einem isolierten Shadow DOM). Dadurch wird der Zeiger **1:1 in den Video-Stream des geteilten Tabs übertragen** – deine Teilnehmer sehen die Hand und alle Markierungen flüssig und gestochen scharf!

---

## Features

- 👆 **Alle 36 originalen Zeigerstile von nilbuild/tinyhand 1:1 integriert:**
  - **Favoriten direkt als Kacheln:** Lavender toy (Standard), Cursor glove, Coral vinyl, Plush, Robot, Laser dot.
  - **30 weitere Stile per Dropdown wählbar:** Astronaut, Midnight, Sky, Cactus, Chocolate, Chrome, Cloud, Gingerbread, Fuzzy, Glass, Grass, Holo, Jelly, Knit, Lava, Leaf, Lemon, Low poly, Marble, Mech, Mint, Monster, Neon, Pastel, Bubblegum, Pixel, Skeleton, Space, Terrazzo, Water, Wood.
- 📏 **Echte TinyHand-Größe (60 – 320 px):** Präsentationszeiger in jeder gewünschten Größe – von dezent bis markant und weithin sichtbar für alle Teilnehmer.
- 🪄 **Stab-Verlauf aus der Bildschirmecke oder von unten:**
  - **Unten rechts (Ecke):** Der Stab reicht wie bei einem echten Referenten diagonal aus der rechten unteren Ecke zum Zeiger.
  - **Unten links (Ecke):** Für Linkshänder oder linke Bildschirmbereiche.
  - **Dynamisch von unten:** Der Stab folgt sanft gefedert von der unteren Bildschirmkante.
  - **Frei schwebend:** Nur die Hand ohne verlängerten Stab.
- 🫁 **Dezente Animation beim Bewegen & im Stillstand:** Organische Trägheits-Neigung (Inertia Tilt bis ±3,5°), geschmeidige Bewegungs-Federung und sanftes Atmen im Stillstand – für ein lebendiges, natürliches Präsentationsgefühl wie in der nativen macOS-App.
- 🖼️ **Eigene Zeiger:** Lade direkt im Popup-Menü beliebige eigene PNG- oder SVG-Grafiken (z. B. Maskottchen, Logo, Stift) hoch – sofort aktiv ohne Neuladen!
- ✍️ **Verblassende Freihand-Tinte (Ephemeral Ink):** Gezeichnete Linien blenden sich nach ca. 3 Sekunden sanft von selbst aus. Deine Präsentationsfolien bleiben immer aufgeräumt.
- 🎯 **Ungestörtes Webseiten-Surfen:** Normales Klicken bedient wie gewohnt Links, Buttons und Formulare. Mit gedrückter **`Shift`-Taste** schaltest du nahtlos auf Freihand-Zeichnen um.
- 💥 **Authentisches Klick-Feedback:** Beim Klicken führt die Hand einen kurzen visuellen „Tap“ (Neigung an der Fingerspitze) aus und an der Fingerspitze pulsiert ein dezenter Ring – exakt wie im nativen macOS TinyHand.
- ⚡ **Retina & High-DPI Support:** Glatte, gestochen scharfe Bézier-Kurven auf MacBook- und 4K-Displays.
- 🛡️ **Keine Escape-Interception:** Die `Escape`-Taste wird bewusst nicht blockiert, damit der Vollbildmodus in BigBlueButton oder Google Slides stabil bleibt.

---

## Installation in Google Chrome

1. Öffne Google Chrome und tippe in die Adresszeile:
   ```text
   chrome://extensions
   ```
2. Aktiviere oben rechts den Schalter **„Entwicklermodus“** (Developer mode).
3. Klicke oben links auf **„Entpackte Erweiterung laden“** (Load unpacked).
4. Wähle diesen Projektordner aus:
   ```text
   /Users/andreasschmitt/Desktop/TinyHandChrome
   ```
5. Die Erweiterung ist sofort installiert! Klicke in der Chrome-Toolbar auf das **Puzzleteil-Icon** und pinne **TinyHand** an deine Toolbar.

---

## Tastenkürzel (Shortcuts)

| Tastenkürzel (Mac) | Tastenkürzel (Win/Linux) | Funktion |
| :--- | :--- | :--- |
| <kbd>⌥ Option</kbd> + <kbd>H</kbd> | <kbd>Alt</kbd> + <kbd>H</kbd> | **TinyHand An / Aus** (Zeiger ein- oder ausblenden) |
| <kbd>⌥ Option</kbd> + <kbd>C</kbd> | <kbd>Alt</kbd> + <kbd>C</kbd> | **Zeichnungen leeren** (Löscht sofort alle Linien) |
| <kbd>⌥ Option</kbd> + <kbd>S</kbd> | <kbd>Alt</kbd> + <kbd>S</kbd> | **Zeigerstil wechseln** (Klassisch ➔ Laser ➔ Handschuh ➔ Pfote) |
| <kbd>⇧ Shift</kbd> + **Maus ziehen** | <kbd>Shift</kbd> + **Maus ziehen** | **Freihand zeichnen** |
| **Normaler Linksklick** | **Normaler Linksklick** | Webseite normal bedienen + Klick-Tap & Ripple-Effekt |

### Tastenkombinationen anpassen:
Du kannst die Tastenkürzel ganz nach deinen Wünschen ändern:
- Öffne das **TinyHand-Popup** und klicke ganz unten auf den Button **„Tastenkombinationen anpassen ⚙️“**.
- Alternativ kannst du direkt in Chrome `chrome://extensions/shortcuts` aufrufen.
- Klicke auf das Stift-Symbol neben *TinyHand Zeiger ein-/ausschalten* und drücke deine bevorzugte Tastenkombination (z. B. `Ctrl+H`, `Alt+T` etc.).

### Mauszeiger hinter der Hand verstecken:
Standardmäßig wird der schwarze/weiße System-Mauszeiger ausgeblendet (`cursor: none`), sobald TinyHand aktiv ist, sodass **nur die Hand** sichtbar ist und als Cursor fungiert. Im Popup kannst du dieses Verhalten über das Häkchen *„Mauszeiger hinter Hand verstecken“* jederzeit anpassen.

---

## Tipps für Präsentationen in BigBlueButton (BBB)

1. **Tab teilen:** Starte in BigBlueButton die Bildschirmfreigabe und wähle im Dialog den Reiter **„Chrome-Tab“** (statt Gesamter Bildschirm).
2. **TinyHand aktivieren:** Drücke <kbd>Option</kbd> + <kbd>H</kbd> im geteilten Tab. Die Hand folgt nun deinem Mauszeiger.
3. **Auf Dinge hinweisen:** Bewege die Hand auf Überschriften, Diagramme oder Codeblöcke.
4. **Wichtiges hervorheben:** Halte <kbd>Shift</kbd> gedrückt und umkreise einen Bereich mit der Maus. Die rote Markierung ist für alle Konferenzteilnehmer sichtbar und verschwindet nach 3 Sekunden von selbst.
5. **Präsentation beenden:** Nach dem Vortrag drückst du einfach erneut <kbd>Option</kbd> + <kbd>H</kbd>, um TinyHand wieder zu deaktivieren.

---

## Eigene Zeiger-Grafiken verwenden

Es gibt zwei einfache Wege, eigene Zeiger zu nutzen:

### Methode 1: Direkt im Popup-Menü (Empfohlen)
1. Klicke auf das TinyHand-Icon in der Chrome-Toolbar.
2. Klicke in der Stil-Auswahl auf die Kachel **„Eigenes (+)”**.
3. Wähle ein beliebiges PNG- oder SVG-Bild (z. B. mit transparentem Hintergrund) auf deiner Festplatte aus.
4. Das Bild wird sofort im Browser gespeichert und als aktiver Zeiger verwendet!

### Methode 2: Im Ordner `hands/`
1. Lege deine Datei (z. B. `mein-zeiger.svg` oder `mein-zeiger.png`) in den Ordner `hands/`.
2. Sie steht der Erweiterung über `chrome.runtime.getURL("hands/mein-zeiger.png")` zur Verfügung.

---

## Projektstruktur

```text
TinyHandChrome/
├── manifest.json              # Manifest V3 Konfiguration
├── background.js              # Service Worker (Shortcuts Alt+H, Alt+C, Alt+S, Badge)
├── content/
│   ├── content.js             # Hauptlogik: Shadow DOM, Canvas, Cursor-Tracking, 3s Fade-Loop
│   └── overlay.css            # Isolierte Styles für Zeiger, Animationen und Canvas
├── popup/
│   ├── popup.html             # Einstellungs-Menü
│   ├── popup.css              # Apple/macOS Design-Stile
│   └── popup.js               # Event-Handling & Bild-Upload
├── hands/                     # Mitgelieferte Zeiger (SVG & PNG)
│   ├── hand-classic.svg       # Klassische Hand am Holzstab
│   ├── hand-classic.png
│   ├── laser-dot.svg          # Laserpointer mit Leucht-Halo
│   ├── laser-dot.png
│   ├── hand-glove.svg         # Weißer Cartoon-Handschuh
│   ├── hand-glove.png
│   ├── cat-paw.svg            # Niedliche Katzenpfote
│   └── cat-paw.png
├── icons/                     # Chrome Extension Icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── tools/
│   └── generate_assets.py     # Reproduzierbarer Generator für Icons & Hand-Grafiken
└── README.md                  # Diese Dokumentation
```

---

## Lizenz & Credits

- Basiert auf der Idee von [TinyHand für macOS von nilbuild](https://github.com/nilbuild/tinyhand).
- Entwickelt als eigenständige Chrome-Erweiterung für Web-Screen-Sharing.
