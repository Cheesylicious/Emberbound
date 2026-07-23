# EMBERBOUND – mobile Grundlage

Die Spieloberfläche ist für eine spätere Capacitor-Verpackung vorbereitet:

- vollständig lokale Assets und Offline-Manifest
- Landscape-Orientierung
- Touch-Steuerung
- Safe-Area-Abstände für Notch und Home-Indikator
- persistente lokale Spielstände sowie Datei-Export/-Import
- keine externen Schriftarten, Tracker oder Laufzeit-CDNs
- skalierbare 16:9-Canvas-Darstellung

Vor einem echten Store-Release sind zusätzlich nötig:

1. Apple- und Google-Entwicklerkonten sowie Signaturzertifikate
2. Xcode-/Android-Studio-Projekte und Capacitor-Abhängigkeiten
3. Store-Icons, Screenshots, Datenschutztext und Altersfreigabe
4. Geräte-QA auf mehreren iPhone-, iPad- und Android-Größen
5. native Savegame-Bridge für iCloud/Google Play Games, falls Cloud-Sync gewünscht ist
6. Performance-, Akku- und Speicherprofiling

Die Datei `capacitor.config.json` definiert bereits App-ID, App-Name,
Web-Inhalt und mobile Grundeinstellungen. Sie ist eine Vorbereitung und noch
kein signierter Store-Build.
