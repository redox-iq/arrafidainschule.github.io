# Gemeinsame Seitenstruktur

Kopfbereich, Navigation und Footer werden auf allen Seiten gemeinsam verwendet.

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
`data-footer-variant` am Footer-Platzhalter ausgewählt und in
`site-config.json` zentral gepflegt.

## Übersetzte Seiten

Der Sprachumschalter erscheint nur für Seiten, die im Feld `translations`
konfiguriert sind. Dort werden die aktuelle Sprache und die jeweiligen
Sprachversionen der Seite hinterlegt.

## JetForm einbinden

Sobald das Formular fertig konfiguriert ist, muss seine HTTPS-Adresse nur im
Feld `registration.jetFormUrl` in `site-config.json` eingetragen werden. Beide
Anmeldeseiten verwenden automatisch dieselbe Formular-URL.
