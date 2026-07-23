# Game Design

## Säulen

1. **Reisen mit Bedeutung** – Die Weltkarte ist begehbar und verbindet
   handgebaute Orte. Neue Erinnerungen öffnen neue Wege.
2. **Lesbare Kämpfe** – Jede Aktion ist sichtbar, kurz und wirkungsvoll.
   Schwächen und Rollen sind ohne Tabellenstudium verständlich.
3. **Die Brut in Ryn** – Drachenformen sind kein gewöhnlicher Zauber, sondern
   Teil von Geschichte, Erkundung und Charakterentwicklung.
4. **Entscheidbare Herkunft** – Mensch und Drache sind keine Gut/Böse-Achse.
   Spätere Entscheidungen verändern Formen, Beziehungen und Enden.

## Erkundung

Die Bewegung ist zeitbasiert und nicht kachelweise. Der Spieler gleitet nicht:
Füße und Schatten besitzen dieselbe Bodenlinie. Wasser, Wände, Gebäude, Berge,
Kristallblöcke, Abgründe und NPCs blockieren.

Ortskarten bestehen sichtbar aus vollständig gerenderten 480×270-Hintergründen.
Die frühere Kacheldarstellung bleibt nur als technischer Notfall-Fallback im
Code und wird im Spiel nicht mehr angezeigt.

Die begehbare Geometrie liegt getrennt in `walkZones`. Ellipsen beschreiben
Plätze und Plattformen, Kapseln organische Wege und Brücken. `obstacles`
schneidet einzelne Gegenstände wie den Dorfbrunnen wieder aus einer Laufzone
heraus. Diese Trennung erlaubt neue Grafiken, ohne Kollisionsdaten in das Bild
einzubrennen.

Für die Entwicklung kann `window.__EMBERBOUND_DEBUG_COLLISION__ = true`
gesetzt werden. Dann erscheinen Laufzonen grün und Hindernisse rot über der
Szene. Diese Ansicht gehört niemals in einen Release.

Auf der Weltkarte bilden `paths` begehbare Korridore und `blocked`
Landschaftshindernisse. Ortsknoten bleiben immer erreichbar.

## Kampf

Rundenfolge:

1. Gruppenmitglieder handeln in Gruppenreihenfolge.
2. Besiegte Mitglieder werden übersprungen.
3. Gegnerphase.
4. Abwehr endet, SP regeneriert leicht, Drachenzeit sinkt.

Kommandos:

- Angriff
- Technik
- Abwehr
- Drache
- Fliehen, außer in Bosskämpfen

Der Prolog benutzt ein bewusst kleines Zahlensystem. Die Vollversion soll
zusätzlich Zustände, Elemente, Formationen, Ausrüstung, Lerntechniken und
Charakterwechsel erhalten.

Seit Version 0.3 besitzen alle Figuren individuelle Wachstumswerte. EP bleiben
als Gesamtwert erhalten; jede Stufe verwendet eine ansteigende Schwelle.
Stufenanstiege erhöhen Maximalressourcen und Attribute und heilen einen Teil
der neu gewonnenen Kapazität.

Das Reisebuch enthält drei Ansichten:

- Gruppe: Level, EP, LP, SP, Attribute und angelegte Gegenstände
- Inventar: verbrauchbare LP-, SP- und DP-Gegenstände mit Zielauswahl
- Ausrüstung: Waffen, Rüstungen und Zubehör mit echten Attributsboni

Gegenstände können außerdem als vollständige Kampfaktion eingesetzt werden.
Gegner besitzen eigene Beutetabellen; Story-Bosse können garantierte
Ausrüstung hinterlassen.

## Drachenformen

Ryn besitzt DP. Der Glutwyrmling kostet 10 DP und hält vier Runden. In dieser
Form steigen Angriff, Magie und Verteidigung; das Sprite und die
Angriffsanimation wechseln sichtbar.

Geplanter Ausbau:

- Brut-Gene aus Erinnerungsorten
- Formkern plus zwei Modifikator-Gene
- Kosten pro Runde statt fester Dauer
- eigene Drachenfähigkeiten und Trefferzonen
- Formen außerhalb des Kampfes für bestimmte Hindernisse

## Speichern

Das Spiel speichert:

- Szene und Position
- Weltposition
- Gruppe, LP, SP, DP und Erfahrung
- Inventar und Geld
- Handlungsflags und besiegte Story-Gegner
- Spielzeit und Statistik

Automatisch gespeichert wird beim Start, Szenenwechsel, Sieg,
Storyfortschritt, Verlassen/Verbergen der App sowie im Menü. Das Reisebuch
bietet zusätzlich manuelles Speichern und einen Savegame-Export.
