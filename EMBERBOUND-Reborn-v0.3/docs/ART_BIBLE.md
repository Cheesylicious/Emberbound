# Art Bible

## Zielbild

EMBERBOUND sieht aus wie ein sorgfältig restauriertes 32‑Bit-Konsolen-JRPG:
bewusst kleine Pixel, detaillierte Umgebungen, gedeckte Naturfarben und
leuchtende Magie. Das Spiel rendert intern mit 480×270 Pixeln und skaliert nur
ganzzahlig beziehungsweise pixelgenau.

Die gestalterische Inspiration stammt aus der Epoche und dem Genre, nicht aus
einzelnen geschützten Figuren, Monstern, Orten oder UI-Layouts.

## Verbindliche Regeln

- Keine geglätteten Kanten. `image-rendering: pixelated` bleibt aktiv.
- Figuren berühren mit den Füßen ihre Bodenschatten. Schweben ist nur bei
  ausdrücklich fliegenden Gegnern erlaubt.
- Erkundungsfiguren bleiben klein genug, dass die Welt groß wirkt.
- Jede Aktion besitzt mindestens Ruhepose, Ausholbewegung, Trefferphase und
  Rückkehr.
- Kampfarenen sind eigenständige Szenen, keine leeren Farbflächen.
- Erkundungskarten sind vollständige pseudo-isometrische Szenen. Ein sichtbares
  Tile-Raster oder wiederholte quadratische Baumblöcke ist nicht zulässig.
- Schatten sind dunkel, flach und transparent; nie als schwarzer Vollkreis.
- Magie darf heller und farbiger sein als die Umgebung, muss aber gepixelt
  bleiben.
- UI-Flächen nutzen dunkles Aubergine, warme Messingkanten und elfenbeinfarbene
  Schrift. Moderne Glaseffekte, runde Karten und App-Optik sind zu vermeiden.

## Maßsystem

| Element | Richtwert |
| --- | --- |
| Interne Auflösung | 480×270 |
| Umgebungskachel | 16×16 |
| Erkundungsfigur | 30–36 px hoch |
| Kampffigur | 50–64 px hoch |
| normaler Gegner | 45–58 px hoch |
| Boss | 72–96 px hoch |
| UI-Grundschrift | 8–10 px |

## Farbwelten

- Kohlgrund: Moosgrün, Lehm, warmes Holz, fahles Wasser.
- Flüsterforst: Oliv, Petrol, Bernsteinlicht und alte graue Runen.
- Gläsernes Reliquiar: Ockerstein, kaltes Türkis, Bronze, glutrote Risse.
- Brutmagie: Kupferorange, Scharlach und helles Gold.
- Erinnerungsscherben: Aquamarin, blasses Violett und Weiß.

## Sprite-Sheets

`assets/sprites/heroes-v3.png` enthält 24 gleich breite Zellen in vier
Figurenblöcken: Ryn, Liora, Bram und Glutwyrmling. Jeder Block besitzt sechs
Posen in derselben Reihenfolge:

1. Erkundung nach unten
2. Erkundung seitlich
3. Erkundung nach oben
4. seitliche Laufphase
5. Kampfhaltung
6. Kampfaktion

`assets/sprites/portraits-v3.png` enthält Ryn, Liora, Bram, Mara und den
Glutwyrmling in dieser Reihenfolge.

`assets/sprites/enemies.png` enthält:

1. Mooshorn Ruhe
2. Mooshorn Angriff
3. Aschenräuber Ruhe
4. Aschenräuber Angriff
5. Erinnerungsscherbe Ruhe
6. Erinnerungsscherbe Angriff
7. Glashund Ruhe
8. Glashund Angriff

Für neue Figuren zuerst ein separates Blatt erzeugen. Erst nach sauberem
Freistellen und Sichtprüfung in ein endgültiges Sheet aufnehmen.

## Erkundungskarten

- `kohlgrund-v3.png`: Dorfplatz, Glasofen, Brunnen und Ostausgang
- `whisperwood-v3.png`: organischer Waldweg, Bachbrücke und Erinnerungsschrein
- `reliquary-v3.png`: schwebende Steinplattformen, Maschinen und Erinnerungstor

Die Karten zeigen nur die Welt. Figuren, NPCs, UI, Interaktionsmarken und
Kollisionen werden zur Laufzeit darübergelegt.
