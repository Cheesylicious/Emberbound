# iOS- und Android-Vorbereitung

Die Spiellogik arbeitet offline, verwendet keine externen Laufzeit-CDNs und
besitzt Touch-Steuerung, Safe-Area-Abstände sowie eine feste 16:9-Spielfläche.
Damit lässt sie sich später in native iOS- und Android-Projekte einbetten.

Vor dem Store-Release fehlen bewusst noch:

1. Apple- und Google-Entwicklerkonten sowie Signaturzertifikate
2. erzeugte Xcode- und Android-Studio-Projekte
3. Store-Icons, Screenshots, Datenschutztext und Altersfreigabe
4. native Speicher-Bridge und optionaler Cloud-Sync
5. Tests auf echten Telefonen und Tablets
6. vollständiger Audio-, Inhalts- und Lizenz-Audit

`capacitor.config.json` enthält die geplante App-ID und mobile Grundeinstellungen.
Es ist eine Vorbereitung, noch kein signierter Store-Build.

