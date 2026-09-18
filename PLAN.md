# Das Zigaretten-Modul — Plan und Prototypen

Ein Modul, drei Teile, sieben Regler. Der Tuner stellt sie ein; die Läufe
entscheiden.

## Die drei Teile

### 1 — Der Knopf: eine Zähleinheit pro Tipp

Aus dem lifetracker kommt die Zeile mit `type:"count"`: ein Ziel, eine Reihe
Punkte, ein Stepper, und ein Häkchen, sobald das Ziel steht. Übernommen wird
davon **nur die Hälfte** — die Punkte und das Tippen. Was wegbleibt, ist das
Ziel, denn hier gibt es nichts zu erreichen.

Der Tipp muss ohne jede Zwischenstufe durchgehen. Wer raucht, hat eine Hand
frei und zehn Sekunden Geduld. Alles, was die App wissen will, holt sie sich
danach — und auch dann nur als Angebot. Zurücknehmen geht zwei Minuten lang;
Vertippen gehört zum Tippen und ist kein Fehler, den man beichten muss.

**Drei Formen** (Regler `knopf`): Punktreihe · offener Kreis · große Taste.

### 2 — Die Stufe: die Fibonacci-Leiter unter dem Knopf

`LEITER = [1, 2, 3, 5, 8, 13, 21, 34]` — dieselbe Leiter, die in `kur-core` die
Kette trägt. Eine Reihe, die Tag für Tag um eins wächst, hat keine Gestalt;
eine, die springt, hat Stufen, und Stufen kann man benennen. „Heute Stufe 8"
sagt etwas, „heute 9" ist nur eine Zahl. Dass die Sprünge oben weiter werden,
passt zur Sache: zwischen 1 und 2 Zigaretten liegt etwas anderes als zwischen
20 und 21.

**Drei Lesarten** (Regler `stufe`):

| Lesart | Woher der Rahmen kommt | Was das über die Haltung sagt |
|---|---|---|
| `waechst` | die kleinste Stufe, die den heutigen Stand fasst | rein beschreibend, kein Gestern, kein Urteil |
| `korridor` | eine Stufe **unter** der niedrigsten, die wirklich gestanden hat | die Vorsatz-Leiter des lifetrackers, umgedreht |
| `budget` | die Stufe, die für heute gesetzt wurde | klassisches Tracking — der härteste Test |

Der Korridor ist die interessanteste der drei, weil er ohne Ziel auskommt und
trotzdem eine Richtung hat. Darüber hinaus ist kein Bruch: der Korridor rückt
dann eben wieder hoch. Genau das muss sich im Gebrauch beweisen — oder als
verkappte Bewertung entlarven.

### 3 — Die Nachfrage: „fragt ab und zu nach, oder bietet es an"

Das sind zwei verschiedene Dinge, und welches richtig ist, ist die eigentliche
Frage dieses Moduls. Deshalb drei unabhängige Regler statt eines:

- **`anlass`** — nie · Stichprobe · beim Stufensprung · bei jeder
- **`form`** — leises Angebot · ein Feld an Ort und Stelle · Bogen
- **`wann`** — sofort · gleich (nach 90 Sekunden) · am Abend

Die **Stichprobe** benutzt dieselbe Leiter wie der Knopf: gefragt wird bei der
1., 2., 3., 5., 8., 13. und 21. des Tages. Das wird über den Tag hinweg von
selbst seltener — vorne, wo jede einzelne noch ein Ereignis ist, steht die
Frage dicht; hinten, wo ohnehin nur noch gezählt wird, tritt sie zurück. Eine
Dosierung, die niemand einstellen muss und die niemandem sagt, dass er zu viel
raucht.

Die vier Fragen zur einzelnen Zigarette sind kurz, weil sie im Stehen
beantwortet werden: *Was war kurz davor? · Wie ist es jetzt? · Was hätte auch
gepasst? · Wolltest du die?*

## Das Vorhaben und der Rückmeldebogen

Beim Rauchen ist der Vorsatz eine **Unterlassung**, und die hat keinen Moment,
in dem man tippen könnte. Deshalb entscheidet nicht ein Häkchen, ob der Tag
stand, sondern die Zählung selbst.

Drei Vorhaben: unter einer Stufe bleiben · erst ab einer Uhrzeit · einen ganzen
Tag keine. Über 1, 2, 3 oder 5 Tage, ab heute oder ab morgen. Zustand und
Übergänge kommen wörtlich aus `kur-core/domaene/vorsatz.js`.

**Und hier sitzt der Teil, um den es eigentlich geht:** was passiert, wenn es
nicht aufgeht. Die Antwort des lifetrackers steht und wird übernommen —

> Bereitschaft genügt. Wer nicht schafft, aber aufschreibt, hat den Tag und
> behält den Vorsatz. Erst das Schweigen lässt ihn auslaufen. Und selbst dann
> zählt der Tag.

Die vier Fragen des Bogens sind die aus `RUECK`, auf das Weglassen umgestellt:
*Was ist dazwischengekommen? · Was hat den Platz bekommen? · Wie fühlst du dich
damit? · Wie möchtest du morgen an die Sache gehen?* Die letzte schaut nach
vorn und steht am nächsten Morgen wieder oben („Gestern notiert: …").

**Drei Längen** (Regler `bogen`): vier Fragen · eine, rotierend · zwei plus
Stimmungs-Chips. Die Vermutung ist, dass vier Fragen abends zu viel sind und
eine zu wenig hergibt — aber das ist eine Vermutung, und sie steht in
`tuner.js` als `ahnung` neben jedem Regler, damit sie am Ende widerlegbar ist.

## Die Läufe

Ein **Lauf** ist eine eingefrorene Reglerstellung plus alles, was darin geschah.
Drei Voreinstellungen, die sich nicht in einer Schraube unterscheiden, sondern
in einer Haltung:

| Lauf | These | Stellung |
|---|---|---|
| **Still** | Zählen genügt. Jede Frage ist eine Zumutung, die sich rechtfertigen muss. | Punkte · wächst · keine Nachfrage · kein Vorhaben |
| **Leiter runter** | Die Leiter trägt das Ganze: sie beschreibt, sie rahmt, sie taktet die Fragen. | Punkte · Korridor · Stichprobe · Angebot · gleich · Vorhaben an · zwei Fragen |
| **Wach** | Jede einzelne ist ein Ereignis, und ein Ereignis darf angesehen werden. | Ring · Budget · bei jeder · Feld · sofort · Vorhaben an · vier Fragen |

Ein Regler lässt sich auch mitten im Lauf drehen; das wird als
Stellungswechsel im Protokoll festgehalten, der Lauf bleibt derselbe.

## Was jeder Lauf beantworten soll

1. **Geht der Tipp durch?** Wie oft wird gezählt, und wie oft nicht — merkt man
   überhaupt, dass man tippen sollte?
2. **Sagt die Stufe etwas?** Liest man sie als Beschreibung oder als Note?
   Der Prüfstein ist der Tag, an dem der Korridor gesprengt wird: fühlt sich
   das an wie eine Beobachtung oder wie ein Versagen?
3. **Ist die Nachfrage ein Angebot?** Wie viele werden weggewischt, wie viele
   beantwortet — und ändert der Zeitpunkt das mehr als die Form?
4. **Trägt „Bereitschaft genügt"?** Wird an einem nicht gehaltenen Tag wirklich
   geschrieben, oder wird die App zugeklappt?
5. **Wie viel Bogen ist zu viel?** Bei welcher Länge bricht das Schreiben ab?

Die Rückmeldungen im Tuner (der offene Kreis ○ neben jedem Teil) hängen an
genau diesen Stellen und tragen die volle Reglerstellung mit sich — damit am
Ende ein Urteil pro Stellung möglich ist, nicht nur ein Gesamteindruck.

## Was der Tuner ausdrücklich nicht ist

Kein Streak, kein Score, kein Fortschrittsring, keine Gamification, keine
Erinnerung, die schimpft. Nichts davon kommt später dazu. Der Verzicht gilt
schon hier, sonst misst der Tuner am Ende etwas anderes als das, was gebaut
werden soll.

## Danach

Was sich bewährt, wandert in zwei Richtungen: die Mechanik aus `kern.js` zurück
nach `kur-core` (`domaene/leiter.js`), die Belegung weiter als Konsum-Modul.
Was durchfällt, bleibt hier stehen — mitsamt der Rückmeldung, an der es
gescheitert ist.
