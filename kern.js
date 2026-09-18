/* =====================================================================
   Kern — die Mechanik, geliehen aus kur-core

   Herkunft: `domaene/datum.js`, `domaene/lauf.js` (fibonacciBis, LEITER)
   und `domaene/vorsatz.js` (vorsatzStand) aus ~/projects/kur-core, das
   diese Stücke seinerseits aus dem lifetracker-Prototyp herausgelöst hat.

   Diese Datei kennt keine Zigarette, keinen Text und keine Farbe. Sie
   rechnet nur. Was hier steht, soll eines Tages unverändert nach
   kur-core zurückwandern können — deshalb steht hier auch nichts
   drin, was nur der Tuner braucht.
   ===================================================================== */

/** Ein Datum als YYYY-MM-DD, um `tage` verschoben. */
export function verschiebe(datum, tage) {
  const [j, m, t] = datum.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t + tage)).toISOString().slice(0, 10);
}

/** Heute in Ortszeit — nicht UTC, sonst springt der Tag um 1 Uhr nachts. */
export function heute(versatz) {
  const d = new Date();
  d.setDate(d.getDate() + (versatz || 0));
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

/** Wie viele Tage liegen zwischen zwei Datumsangaben? */
export function abstand(von, bis) {
  return Math.round((Date.parse(bis) - Date.parse(von)) / 86400000);
}

/* ---------------------------------------------------------------------
   Die Leiter

   Die Fibonacci-Folge ohne die doppelte 1: 1, 2, 3, 5, 8, 13, 21, 34.
   In kur-core trägt sie die Kette — wie viele Punkte ein Lauf zeigt.
   Hier trägt sie den Zählknopf: wie viele Plätze heute überhaupt
   nebeneinander stehen.

   Warum eine Leiter und keine glatte Zahl: eine Reihe, die Tag für Tag
   um eins wächst, hat keine Gestalt. Eine, die springt, hat Stufen, und
   Stufen kann man benennen — "heute Stufe 8" sagt etwas, "heute 9"
   sagt nur eine Zahl. Nach oben hin werden die Sprünge weiter, und das
   passt: der Unterschied zwischen 1 und 2 Zigaretten ist ein anderer
   als der zwischen 20 und 21.
   --------------------------------------------------------------------- */

export function fibonacciBis(max) {
  const out = [];
  let a = 1, b = 2;
  while (a <= max) { out.push(a); [a, b] = [b, a + b]; }
  return out;
}

/* 34 ist eine Stufe über den 21, die für starkes Rauchen als Tagesmaß
   gelten — die Leiter deckt damit auch den schlechtesten Tag ab, ohne
   dass die Reihe oben ausfranst. */
export const LEITER = fibonacciBis(34);

/** Die kleinste Stufe, die `n` noch fasst. Bei 0 ist es die erste. */
export function stufeFuer(n, leiter) {
  const L = leiter || LEITER;
  for (const s of L) if (s >= n) return s;
  return L[L.length - 1];
}

/** Die Stufe unter dieser. Unter der ersten liegt die Null. */
export function stufeUnter(stufe, leiter) {
  const L = leiter || LEITER;
  const i = L.indexOf(stufe);
  if (i < 0) return stufeFuer(stufe, L);
  return i === 0 ? 0 : L[i - 1];
}

/** Die Stufe über dieser. Über der letzten liegt wieder die letzte. */
export function stufeUeber(stufe, leiter) {
  const L = leiter || LEITER;
  const i = L.indexOf(stufe);
  return i < 0 || i === L.length - 1 ? L[L.length - 1] : L[i + 1];
}

/* ---------------------------------------------------------------------
   Der Vorsatz

   Wörtlich aus kur-core/domaene/vorsatz.js, nur mit einem allgemeineren
   Prüfer: dort entschied ein Häkchen oder ein Zähler, ob ein Tag als
   getan gilt. Hier kann es alles sein — beim Rauchen heißt "getan"
   meistens "unter einer Grenze geblieben", und das weiß nur der Aufrufer.

   Die eine Zusage, die der lifetracker daran knüpft und die hier nicht
   verhandelbar ist: **Bereitschaft genügt**.
   Wer nicht schafft, aber aufschreibt, hat den Tag und behält den
   Vorsatz. Erst das Schweigen lässt ihn auslaufen — und selbst dann ist
   nichts zerbrochen, der Tag zählt weiter.
   --------------------------------------------------------------------- */

/**
 * @param v        {ab, n}  — ab wann, über wie viele Tage
 * @param jetzt    YYYY-MM-DD
 * @param getanAm  (datum) → bool
 * @param bereitAm (datum) → bool  — an dem Tag wurde geschrieben
 */
export function vorsatzStand(v, jetzt, getanAm, bereitAm) {
  if (!v) return null;
  if (v.ab > jetzt) return { zustand: "morgen", getan: 0, v };
  let getan = 0;
  for (let d = v.ab; d < jetzt; d = verschiebe(d, 1)) {
    if (getanAm(d)) {
      if (++getan >= v.n) return { zustand: "erfuellt", getan, v };
    } else if (!bereitAm(d)) {
      return { zustand: "verfallen", getan, offen: d, v };
    }
  }
  if (getanAm(jetzt)) {
    getan++;
    return { zustand: getan >= v.n ? "erfuellt" : "laeuft", getan, heuteGetan: true, v };
  }
  return { zustand: "laeuft", getan, heuteGeschrieben: !!bereitAm(jetzt), v };
}
