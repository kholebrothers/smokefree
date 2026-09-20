# smokefree — Rauch-Tuner

Eine Werkbank für **ein** Modul: das Zählen von Zigaretten. Der Tuner ist nicht
das Modul. Er ist das Ding, an dem man es einstellt, benutzt und bewertet,
bevor es gebaut wird.

    idee → tuner → urteil → modul

Was hier vertestet wird, steht in [PLAN.md](PLAN.md): sieben Regler, drei
Voreinstellungen, und die Fragen, die jeder Lauf beantworten soll.

## Wo es herkommt

**Mechanik** aus [`kur-core`](../kur-core): `fibonacciBis`, `LEITER` und
`vorsatzStand` stehen in [`kern.js`](kern.js) — absichtlich unverändert in
Verhalten und Benennung, damit sie eines Tages dorthin zurückwandern können.
Der Kern kennt keine Zigarette.

**Knopf-Logik** aus [`lifetracker`](../lifetracker): die Zeile mit `type:"count"`
(Punkte plus Stepper), der Rückmeldebogen `RUECK` mit seinen vier Fragen, und
die Vorsatz-Leiter, die immer genau einen Schritt weiter freigibt als das, was
schon gestanden hat. Hier läuft sie andersherum — eine Stufe **tiefer** als die
niedrigste, die gehalten hat.

**Haltung**, ebenfalls aus dem `lifetracker`: Bereitschaft genügt. Ein
Konsumereignis ist ein Ereignis, kein Versagen. Ein leerer Kreis heißt
*unbekannt*, nicht *nicht geschafft*. Diese drei Sätze sind keine Deko — sie
entscheiden, was das Modul rechnet und was es nie rechnet, und jede Variante
im Tuner hält sie gleichermaßen ein.

Die Oberfläche folgt einer gedämpften warmen Palette und paart Inter fürs
Interface mit Source Serif 4 für das, was die App selbst sagt. Absicht dahinter:
Messwerte sollen nicht wissenschaftlich wichtiger aussehen als eine subjektive
Bemerkung.

## Aufbau

    index.html   Blatt, Palette, alle Stile
    kern.js      Mechanik — Datum, Fibonacci-Leiter, Vorsatz-Zustand
    modul.js     Das Modul selbst — Zähler, Stufen, Nachfrage, Fragen
    tuner.js     Regler, Voreinstellungen, Läufe, Speicher
    app.js       Verdrahtung: ein Zustand, ein render(), ein Klick-Handler

    knopf/       Der Zählknopf — eigenständiges Modul, siehe unten

## `knopf/` — der Zählknopf

Ein wiederverwendbares Bedienelement mit eigener Werkbank. Es kennt keine
Zigarette: es kennt eine Zahl, eine Leiter und eine Richtung. Was gezählt
wird, weiß nur, wer es einsetzt.

    knopf/knopf.js    Mechanik und Darstellung — ohne Texte, ohne Fachbegriffe
    knopf/knopf.css   Farben über Merkmale, die die App setzt
    knopf/index.html  Eigener Tuner: der Knopf allein auf dem Tisch
    knopf/tuner.js    dessen Regler, Einsatz-Vorlagen und Rückmeldungen

**Die Idee:** es gibt keine Fortschrittsanzeige. Das Ding, das man drückt,
*ist* der Zustand. Der Knopf teilt sich in so viele Zellen, wie die aktuelle
Stufe hergibt, und teilt sich neu, sobald sie fällt — wieder fast leer, nur
feiner gerastert. Daraus folgt eine Dosierung, die niemand einstellen muss:
auf Stufe 3 verändert ein Tipp ein Drittel, auf Stufe 21 ein Dreizehntel.

Jede Gruppe beginnt auf einer Stufe und ist so lang wie die vorige:

    Stufe    1   2   3     5     8      13      21       34
    Zellen   1   1   2     3     5       8      13       21
    deckt    1   2   3–4   5–7   8–12   13–20   21–33    34–54

Zwei Richtungen, dieselbe Darstellung: `fuellen` (jeder Tipp füllt eine Zelle —
für Gezähltes, das erwünscht ist) und `verbrauchen` (die Zellen sind der Raum,
jeder Tipp nimmt einen weg — für Gezähltes, das schlicht geschieht). smokefree
benutzt `verbrauchen`: es geht um Bewusstsein über das eigene Verhalten, nicht
um Reduktion, und über den Rahmen hinaus bricht nichts — der Knopf teilt sich
neu, und das war's.

Die Mechanik stammt aus **Morgenpraxis** (`static/app.js`, `fibGroupSizes` und
`renderFractalButton`), einem eigenen Projekt. Dort heißt sie „Fraktal";
selbstähnlich ist daran nichts, deshalb hier `teilung`.

`knopf.js` bringt `fibonacciBis` und `stufeFuer` noch einmal mit, obwohl beide
auch in `kern.js` stehen. Das ist kein Versehen: das Modul soll ohne diesen
Ordner lauffähig sein. Wer beides ändert, ändert es an zwei Stellen.

Kein Bundler, kein Build-Schritt — dieselbe Regel wie in `kur-core`. Native
ES-Module, `<script type="module">`, fertig.

## Lokal starten

    python3 -m http.server 8765
    # http://localhost:8765/

Ohne Artifact-Umgebung läuft der Tuner auf `localStorage`. Alles bleibt im
Browser, nichts geht hinaus.

## Regeln für dieses Repo

Das Repo ist **öffentlich**. Der Tuner erzeugt echte Konsum- und
Gesundheitsdaten, deshalb gelten hier festere Regeln als in einem gewöhnlichen
Prototyp-Repo. Sie hängen nicht an Disziplin, sondern an einem Haken:

    git config core.hooksPath .githooks     # nach jedem frischen clone einmal

[`.githooks/pre-commit`](.githooks/pre-commit) blockiert — nicht warnt —

1. Geheimnisdateien (`.env`, `*.pem`, `*.key`, `.dev.vars`, `secrets.*`),
2. persönliche Tracking-Daten (`daten/`, `export/`, `*.export.json`),
3. Dateien über 1 MB,
4. Schlüsselmuster im Inhalt (private keys, `sk-ant-…`, `ghp_…`, AWS, Slack, Google),
5. **Artifact-Links** — ein `claude.ai/artifact/…`-Link ist ein Zugriffsschlüssel,
   keine Adresse. Er gehört nach `LINK.local`, und das ist ignoriert,
6. echte Zählungen: ein eingecheckter Zustand mit `"zigaretten": [{…}]` ist ein
   Gesundheitsdatensatz, kein Testfixture.

Bewusst darüber hinweg geht `git commit --no-verify`. Dann aber bewusst.

**Was hier nie hineingehört**, auch nicht in einem Beispiel: echte Uhrzeiten
eigener Zigaretten, echte Rückmeldungstexte, der Artifact-Link, irgendeine
Kennung einer realen Person. Beispieldaten werden erfunden und als solche
benannt.
