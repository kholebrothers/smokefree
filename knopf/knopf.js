/* =====================================================================
   Der Zählknopf — ein Knopf, der seinen eigenen Zustand trägt

   Ein eigenständiges Modul. Es kennt keine Zigarette, keinen Kaffee und
   keine Meditation: es kennt eine Zahl, eine Leiter und eine Richtung.
   Was gezählt wird, weiß nur, wer es einsetzt.

   ## Die Idee

   Aus der Morgenpraxis: **es gibt keine Fortschrittsanzeige.** Das Ding,
   das man drückt, ist der Zustand. Kein Balken daneben, keine Punktreihe
   darunter. Der Knopf unterteilt sich in so viele Zellen, wie die
   aktuelle Stufe hergibt, und wenn die Stufe fällt, teilt er sich neu —
   wieder fast leer, nur feiner gerastert.

   Daraus folgt eine Dosierung, die niemand einstellen muss: auf Stufe 3
   verändert ein Tipp ein Drittel des Knopfes, auf Stufe 21 ein
   Dreizehntel. Je weiter man kommt, desto weniger Aufhebens macht der
   einzelne Tipp. Das ist der ganze Punkt.

   (Im Quelltext der Morgenpraxis heißt das "Fraktal". Selbstähnlich ist
   daran nichts — es ist eine Neu-Unterteilung, und so heißt es hier.)

   ## Die Gruppen

   Jede Gruppe **beginnt auf einer Stufe der Leiter und ist so lang wie
   die vorige Stufe**. Für 1,2,3,5,8,13,21,34 heißt das:

       Stufe    1   2   3     5     8      13      21       34
       Zellen   1   1   2     3     5       8      13       21
       deckt    1   2   3–4   5–7   8–12   13–20   21–33    34–54

   Bei der Fibonacci-Leiter fällt das mit ihr selbst zusammen, weil jede
   Zahl die Summe der beiden davor ist. Die Regel steht hier trotzdem
   allgemein: eine App darf eine eigene Leiter hereinreichen.

   ## Die zwei Richtungen

   `fuellen`       Jeder Tipp füllt eine Zelle. Die Morgenpraxis-Lesart —
                   passend, wo das Gezählte erwünscht ist.

   `verbrauchen`   Die Zellen sind der Raum, den es gibt, und jeder Tipp
                   nimmt einen weg. Passend, wo das Gezählte schlicht
                   geschieht und angesehen werden soll. Ist die letzte
                   Zelle weg, teilt sich der Knopf eine Stufe nach oben
                   neu — sichtbar, wortlos, ohne Urteil.

   Beides ist dieselbe Darstellung, nur eine andere Rechnung davor.

   ## Die Schnittstelle

   `zaehlknopf()` liefert einen DOM-Knoten und eine `setze()`-Funktion.
   Der Knoten wird einmal gebaut und danach nur noch aktualisiert —
   deshalb überleben Animationen und der Tastaturfokus jede Änderung.
   Texte, Farben, Speicherung und die Frage, was ein Tipp bedeutet,
   gehören der App.
   ===================================================================== */

export const FORMEN = ["teilung", "punkte", "ring", "taste"];
export const RICHTUNGEN = ["fuellen", "verbrauchen"];

/** Die Fibonacci-Leiter ohne die doppelte 1 — die übliche Voreinstellung. */
export function fibonacciBis(max) {
  const out = [];
  let a = 1, b = 2;
  while (a <= max) { out.push(a); [a, b] = [b, a + b]; }
  return out;
}

export const LEITER = fibonacciBis(89);

/**
 * Die Gruppen einer Leiter: je Stufe ein Abschnitt, der auf ihr beginnt
 * und so lang ist wie die vorige Stufe.
 * @returns [{stufe, start, groesse, ende}]
 */
export function gruppenAus(leiter) {
  const L = leiter && leiter.length ? leiter : LEITER;
  const out = [];
  let start = 1;
  for (let i = 0; i < L.length; i++) {
    const groesse = i === 0 ? 1 : L[i - 1];
    out.push({ stufe: L[i], start, groesse, ende: start + groesse - 1 });
    start += groesse;
  }
  return out;
}

/** In welcher Gruppe liegt der Stand `n`? Unter 1 ist es die erste. */
export function gruppeFuer(n, leiter) {
  const g = gruppenAus(leiter);
  const wert = Math.max(1, Math.floor(Number(n) || 0));
  for (const x of g) if (wert <= x.ende) return x;
  return g[g.length - 1];
}

/** Die kleinste Stufe, die `n` noch fasst. */
export function stufeFuer(n, leiter) {
  const L = leiter && leiter.length ? leiter : LEITER;
  for (const s of L) if (s >= n) return s;
  return L[L.length - 1];
}

/**
 * Was der Knopf gerade zeigt.
 *
 * @param n         der Stand
 * @param richtung  "fuellen" | "verbrauchen"
 * @param leiter    eigene Leiter, sonst Fibonacci
 * @param rahmen    nur bei "verbrauchen": der Raum, der für jetzt gilt.
 *                  Ohne Angabe die kleinste Stufe, die `n` fasst.
 * @returns {zellen, aktiv, stufe, gruppe, ueber, rest}
 *          `aktiv` ist die Zahl der Zellen, die anders aussehen als der
 *          Rest — gefüllt bzw. verbraucht. `rest` ist, was übrig ist.
 */
export function teilung({ n, richtung, leiter, rahmen } = {}) {
  const stand = Math.max(0, Math.floor(Number(n) || 0));

  if (richtung === "verbrauchen") {
    const raum = Math.max(1, Math.floor(Number(rahmen) || 0) || stufeFuer(Math.max(1, stand), leiter));
    const zellen = stand > raum ? stufeFuer(stand, leiter) : raum;
    return {
      zellen, aktiv: Math.min(stand, zellen), stufe: zellen,
      gruppe: null, ueber: Math.max(0, stand - raum), rest: Math.max(0, raum - stand),
    };
  }

  const gruppe = gruppeFuer(stand, leiter);
  const aktiv = stand < gruppe.start ? 0 : Math.min(gruppe.groesse, stand - gruppe.start + 1);
  return {
    zellen: gruppe.groesse, aktiv, stufe: gruppe.stufe, gruppe,
    ueber: 0, rest: gruppe.groesse - aktiv,
  };
}

/**
 * Wie viele Spalten für `k` Zellen. Möglichst quadratisch, damit der
 * Knopf seine Form behält, statt bei jeder Stufe die Proportion zu
 * wechseln. Die Morgenpraxis führt dafür eine Tabelle bis zehn; hier
 * wird gerechnet, weil eine App auch eine ganz andere Leiter bringen darf.
 */
export function spalten(k) {
  return Math.max(1, Math.ceil(Math.sqrt(Math.max(1, k))));
}

/* =====================================================================
   Darstellung

   Einmal bauen, danach nur aktualisieren. Wer den Knoten hat, ruft
   `setze()` — das Element bleibt dasselbe, also bleiben Fokus,
   Übergänge und Scrollposition, wo sie waren.
   ===================================================================== */

/**
 * @param dokument    für Tests; sonst globalThis.document
 * @param form        eine aus FORMEN
 * @param richtung    eine aus RICHTUNGEN
 * @param leiter      eigene Leiter
 * @param beschriftung  Text auf dem Knopf (String oder (stand) => String)
 * @param nebentext     kleiner Text darunter, gleiche Form
 * @param beiTipp     () => void
 * @returns {wurzel, setze({n, rahmen}), knopf}
 */
export function zaehlknopf({
  dokument = globalThis.document,
  form = "teilung",
  richtung = "fuellen",
  leiter = null,
  beschriftung = "",
  nebentext = "",
  beiTipp = null,
} = {}) {
  const mach = (tag, klasse) => {
    const el = dokument.createElement(tag);
    if (klasse) el.className = klasse;
    return el;
  };

  const wurzel = mach("div", "zk");
  const knopf = mach("button", "zk-knopf");
  knopf.type = "button";

  const flaeche = mach("span", "zk-flaeche");   // die Zellen
  const mitte = mach("span", "zk-mitte");       // Zahl und Beschriftung
  const zahl = mach("strong", "zk-zahl");
  const wort = mach("span", "zk-wort");
  mitte.append(zahl, wort);
  knopf.append(flaeche, mitte);

  const unten = mach("p", "zk-neben");
  wurzel.append(knopf, unten);

  if (beiTipp) knopf.addEventListener("click", beiTipp);

  let zellen = [];
  function zellenSetzen(anzahl) {
    while (zellen.length < anzahl) {
      const z = mach("i", "zk-zelle");
      flaeche.append(z);
      zellen.push(z);
    }
    zellen.forEach((z, i) => { z.hidden = i >= anzahl; });
  }

  const text = (w, stand, t) => (typeof w === "function" ? w(stand, t) : w || "");

  function setze({ n = 0, rahmen = null } = {}) {
    const t = teilung({ n, richtung, leiter, rahmen });

    wurzel.dataset.form = form;
    wurzel.dataset.richtung = richtung;
    wurzel.dataset.stufe = String(t.stufe);
    wurzel.dataset.leer = String(n === 0);
    wurzel.dataset.ueber = String(t.ueber > 0);

    if (form === "taste") {
      flaeche.hidden = true;
    } else {
      zellenSetzen(t.zellen);
      flaeche.style.setProperty("--zk-spalten",
        String(form === "teilung" ? spalten(t.zellen) : Math.min(t.zellen, 8)));
      zellen.forEach((z, i) => {
        const an = i < t.aktiv;
        z.classList.toggle("an", an);
        // Bei "verbrauchen" ist das, was über den Rahmen hinausgeht, nicht
        // dasselbe wie das darin — es wird nicht versteckt, aber markiert.
        z.classList.toggle("ueber", an && t.ueber > 0 && i >= t.zellen - t.ueber);
        z.style.setProperty("--zk-kraft", t.zellen > 1 ? String((i + 1) / t.zellen) : "1");
        if (form === "ring") z.style.setProperty("--zk-winkel", (i / t.zellen) * 360 + "deg");
      });
      flaeche.hidden = false;
    }

    zahl.textContent = String(n);
    wort.textContent = text(beschriftung, n, t);
    unten.textContent = text(nebentext, n, t);
    unten.hidden = !unten.textContent;
    knopf.setAttribute("aria-label",
      (wort.textContent ? wort.textContent + ", " : "") + "Stand " + n +
      ", Stufe " + t.stufe);
    return t;
  }

  setze({ n: 0 });
  return { wurzel, knopf, setze };
}
