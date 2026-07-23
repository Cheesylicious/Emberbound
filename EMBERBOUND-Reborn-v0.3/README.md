# EMBERBOUND

## Erbe der ersten Flamme

EMBERBOUND ist ein eigenständiges 32‑Bit-Pixel-JRPG im Geist der großen
Konsolen-Rollenspiele der späten 1990er. Es verwendet keine Figuren, Orte,
Dialoge oder Grafiken aus *Breath of Fire*. Die Referenzen bestimmen nur die
visuelle Richtung: kleine, geerdete Sprites, eine pseudo-isometrische
Oberwelt, szenische Kämpfe und klare Pixel-Menüs.

Diese Version enthält den vollständig spielbaren Prolog von Kapitel I:

- Kohlgrund als frei begehbares Dorf
- eine begehbare Weltkarte namens Glutmark
- Flüsterforst und Gläsernes Reliquiar
- fließende Bewegung und echte Kollisionen
- drei Gruppenmitglieder und vier Gegnertypen
- sichtbare Angriffs-, Zauber-, Treffer- und Transformationsanimationen
- Ryns erste Drachenform, den Glutwyrmling
- Zufallskämpfe mit mehreren Gegnern, Bosskampf, Gegenstände und Drachenform
- individuelle Erfahrungskurven, Stufenanstiege und Attributswachstum
- Charakterinventar mit nutzbaren Heilmitteln, Waffen, Rüstung und Zubehör
- Beute, Ausrüstungsboni und vollständige Charakterwerte im Reisebuch
- Richtungs-, Lauf-, Kampf- und Aktionsposen sowie Dialogporträts
- automatisches sowie manuelles Speichern und Laden
- Tastatur- und Touch-Steuerung

## Sofort spielen

Auf dem Mac ist die fertige `.app` die einfachste Variante. Im Quellprojekt
kann `index.html` außerdem direkt geöffnet werden.

Steuerung:

| Aktion | Tastatur | Touch |
| --- | --- | --- |
| Bewegen | Pfeile oder WASD | Steuerkreuz |
| Interagieren | E, Leertaste oder Enter | A |
| Menü | M oder Escape | Menüknopf |

## Projektaufbau

```text
assets/
  backgrounds/     Weltkarte und Kampfszenen
  sprites/         Figuren- und Gegner-Sprite-Sheets
docs/
  ART_BIBLE.md     verbindliche Grafikregeln
  GAME_DESIGN.md   Spielsysteme und Erweiterungspunkte
  STORY_BIBLE.md   Welt, Figuren und Kapitelplan
  ROADMAP.md       Weg zur Vollversion und zu Mobile
native/
  macos/           schlanke native Mac-Hülle
  mobile/          iOS-/Android-Vorbereitung
src/
  data.js          Inhalte: Werte, Karten, Dialoge
  game.js          Spielsysteme und Darstellung
tests/
  smoke.cjs        automatischer Kernablauf-Test
```

Neue Dialoge, Gegner, Werte, Karten und Weltknoten gehören in `src/data.js`.
Spielregeln und Darstellung liegen in `src/game.js`. Dadurch lassen sich
Inhalte erweitern, ohne alles miteinander zu vermischen.

## Entwicklung

Das Projekt hat zur Laufzeit keine externen Abhängigkeiten. Für die Tests wird
nur Node.js benötigt:

```sh
npm test
```

Für GitHub:

```sh
git add .
git commit -m "Initial playable prologue"
git remote add origin <DEIN-REPOSITORY>
git push -u origin main
```

## Status

Version `0.3.0` ist ein abgeschlossener, speicherbarer Prolog und zugleich die
technische Grundlage der Vollversion. Der weitere Kapitel-, Ausrüstungs-,
Fähigkeiten-, Meister- und Drachen-Gen-Ausbau ist in `docs/ROADMAP.md`
beschrieben.
