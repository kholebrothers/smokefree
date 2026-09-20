# Stand

Was gebaut ist, steht in [README.md](README.md); was vertestet werden soll, in
[PLAN.md](PLAN.md). Hier steht nur das Dritte: was offen ist, was nicht
geprüft wurde, und woran die nächste Sitzung anknüpft.

Stand: 20.09.2026.

## Gebaut und veröffentlicht

Zwei Werkbänke, beide als privates Artifact, beide mit `db`-Fähigkeit — die
Rückmeldungen landen also dort, wo sie auch ohne dieses Gerät lesbar sind. Die
Links stehen in `LINK.local` und **nicht** im Repo: ein Artifact-Link ist ein
Zugriffsschlüssel, und der `pre-commit`-Haken hält ihn draußen.

1. **Rauch-Tuner** — das Zigaretten-Modul, sieben Regler, drei Läufe.
2. **Zählknopf-Tuner** (`knopf/`) — das Bedienelement allein, mit
   Einsatz-Vorlagen für verschiedene Zwecke.

## Ungeprüft

**Das Layout hat nie jemand gesehen.** Die Chrome-Erweiterung war in der
Bausitzung nicht verbunden, also ist kein einziges Bild beider Seiten
begutachtet worden. Geprüft sind: Syntax aller Module, die Mechanik von
`kern.js` und `modul.js` gegen erwartete Werte, und `knopf.js` gegen eine
DOM-Attrappe (Zellenzahl, aktive Zellen, Formwechsel, Ring-Winkel). Nicht
geprüft: wie das aussieht. Besonders wackelig sind der Ring (absolute
Positionierung mit `transform: rotate`) und die Teilung bei 21 Zellen auf
Telefonbreite.

**Die Teilung im Rauch-Tuner ist frisch eingehängt.** Sie ersetzt dort die
große Ziffer, den eigenen Tipp-Knopf und das Stufenwort. Ob die Karte ohne
diese drei noch vollständig wirkt, ist eine offene Frage.

## Offene Entscheidungen

**Der Rahmen beim Verbrauchen.** Er kommt derzeit aus `st.korridor || st.rahmen`
— also beim Korridor aus der Stufe unter der niedrigsten gehaltenen der letzten
vierzehn Tage, beim Budget aus der gesetzten, sonst aus der kleinsten, die den
Stand fasst. Bei `waechst` heißt das: der Rahmen ist immer genau erfüllt, die
Teilung zeigt also nie freien Raum. Vermutlich ist `waechst` mit `teilung`
schlicht keine sinnvolle Kombination — der Tuner lässt sie trotzdem zu, damit
sich das zeigen kann.

**Die Zeitregler hängen an der echten Uhr.** „Gleich" (90 Sekunden) und
„Am Abend" (ab 20 Uhr) richten sich nach `Date.now()`, nicht nach dem
Tagesregler im Kopf. Beim Zurückspringen sieht man also die Zustände des
Vorhabens, aber nicht das Auftauchen später Nachfragen. Wenn das im Weg steht,
braucht der Tuner eine eigene Uhr — `kur-core/dev/uhr.js` hat so etwas schon.

**Die Belohnungsinszenierung fehlt bewusst.** Morgenpraxis hat `playReward`,
Lichtwelle und Zünd-Animation. Auf einem gehaltenen Morgen ist das richtig, auf
einer Zigarette wäre es grotesk. Falls es doch vertestet werden soll: als
eigener Schalter, nie als Vorgabe.

**Doppelte Mechanik.** `knopf.js` bringt `fibonacciBis` und `stufeFuer` noch
einmal mit, damit das Modul ohne diesen Ordner läuft. Wer eines ändert, muss
ans andere denken. Wandert `knopf/` je nach `kur-core`, löst sich das von
selbst.

## Woran die nächste Sitzung anknüpft

1. **Beide Seiten ansehen** und das Layout richten — das ist der erste Schritt,
   bevor irgendetwas Neues dazukommt.
2. **Läufe tatsächlich fahren.** Der Tuner ist gebaut, aber noch nicht benutzt.
   Ohne echte Tage mit echten Tipps beantwortet er keine der fünf Fragen aus
   `PLAN.md`.
3. **Rückmeldungen auswerten** — sie tragen die vollständige Reglerstellung mit
   sich, es ist also ein Urteil je Stellung möglich, nicht nur ein
   Gesamteindruck.
4. **Was sich bewährt, wandert weiter:** die Mechanik aus `kern.js` zurück nach
   `kur-core` (`domaene/leiter.js`), `knopf/` als eigenes Modul dorthin.

## Einrichtung nach einem frischen `clone`

    git config core.hooksPath .githooks

Ohne das greift keine der Schutzregeln. Sie stehen in der README.
