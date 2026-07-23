# Gemeinsame Seitenstruktur

Kopfbereich, Navigation und Footer werden aus `site-config.json` statisch in
alle Hauptseiten geschrieben. Besucher erhalten dadurch sofort vollständiges
HTML; Header und Footer müssen nicht erst im Browser nachgeladen werden.

Nach einer Änderung an der Konfiguration wird die Ausgabe mit folgendem Befehl
neu erzeugt:

```powershell
node tools/render-shared-layout.mjs
```

Die Bereiche zwischen `shared-header:start/end` und
`shared-footer:start/end` sind generiert und sollten nicht von Hand bearbeitet
werden.

## Menü erweitern

Neue Menüpunkte werden nur in `site-config.json` im Feld `navigation` ergänzt:

```json
{
  "label": "Menüname",
  "href": "/neue-seite.html"
}
```

Untermenüs können beliebig tief über `children` verschachtelt werden:

```json
{
  "label": "Informationen",
  "href": "/informationen.html",
  "children": [
    {
      "label": "Termine",
      "href": "/termine.html"
    },
    {
      "label": "Dokumente",
      "href": "/dokumente.html"
    }
  ]
}
```

`href` ist bei einem Menüpunkt mit `children` optional. Ohne `href` dient der
Menüpunkt ausschließlich zum Öffnen des Untermenüs.

Die unterschiedlichen vorhandenen Footer-Ausführungen werden über
`data-footer-variant` am generierten Footer ausgewählt und in
`site-config.json` zentral gepflegt.

## Übersetzte Seiten

Der Sprachumschalter erscheint nur für Seiten, die im Feld `translations`
konfiguriert sind. Dort werden die aktuelle Sprache und die jeweiligen
Sprachversionen der Seite hinterlegt.

## JetForm einbinden

Sobald das Formular fertig konfiguriert ist, muss seine HTTPS-Adresse nur im
Feld `registration.jetFormUrl` in `site-config.json` eingetragen werden. Beide
Anmeldeseiten verwenden automatisch dieselbe Formular-URL.
