/* =====================================================================
   Der Tuner — Regler, Läufe, Speicher

   Der Tuner ist nicht das Produkt. Er ist die Werkbank, auf der das
   Modul liegt: er schaltet Varianten um, hält fest, was dabei
   herauskam, und nimmt Rückmeldungen entgegen.

   Ein **Lauf** ist eine eingefrorene Reglerstellung plus alles, was
   darin geschehen ist. Zwei Läufe unterscheiden sich in der Stellung,
   nicht im Modul — deshalb lassen sie sich nebeneinanderlegen.
   ===================================================================== */

import { heute } from "./kern.js";
import { ANLAESSE, FORMEN, ZEITEN, STUFEN_ARTEN, BOGEN_FORMEN } from "./modul.js";

/* ---------------------------------------------------------------------
   Die Regler

   Jede Dimension ist eine Frage, auf die es mehrere vertretbare
   Antworten gibt. Wo ich schon eine Vermutung habe, steht sie in
   `ahnung` — sie ist kein Vorschlag an den Nutzer, sondern eine
   Notiz an uns, die wir am Ende gegen die Rückmeldungen halten.
   --------------------------------------------------------------------- */

export const REGLER = [
  {
    id: "knopf", name: "Knopfform", frage: "Womit zählt man eine Zigarette?",
    werte: [
      { v: "teilung", t: "Teilung", hilfe: "Der Knopf selbst ist die Anzeige: er teilt sich in die Zellen der Stufe, und jede Zigarette nimmt eine weg. Ist die letzte weg, teilt er sich neu. Aus der Morgenpraxis, Richtung umgedreht." },
      { v: "punkte", t: "Punktreihe", hilfe: "Eine Reihe Plätze neben dem Knopf — die count-Zeile aus dem lifetracker. Der Knopf bleibt ein Knopf." },
      { v: "ring",   t: "Offener Kreis", hilfe: "Ein Zeichen, das Raum meint statt Aufgabe — kein Fortschrittsring. Spuren kommen hinein und wieder heraus." },
      { v: "taste",  t: "Große Taste", hilfe: "Eine Fläche, eine Zahl. Am wenigsten Reibung, am wenigsten Bild." },
    ],
    ahnung: "teilung",
  },
  {
    id: "stufe", name: "Fibonacci-Stufe", frage: "Was bedeutet die Leiter unter dem Knopf?",
    werte: [
      { v: "waechst",  t: "Wächst mit", hilfe: "Rein beschreibend. Der Rahmen springt auf die nächste Stufe, wenn der Stand die alte sprengt." },
      { v: "korridor", t: "Korridor", hilfe: "Eine Stufe unter der niedrigsten, die wirklich gestanden hat. Darüber ist kein Bruch." },
      { v: "budget",   t: "Tagesbudget", hilfe: "Die Stufe wird für heute gesetzt. Härtester Test der Haltung." },
    ],
    ahnung: "korridor", vertritt: STUFEN_ARTEN,
  },
  {
    id: "anlass", name: "Nachfrage-Anlass", frage: "Wann will die App etwas wissen?",
    werte: [
      { v: "nie",           t: "Nie", hilfe: "Nur zählen. Der Vergleichsmaßstab." },
      { v: "stichprobe",    t: "Stichprobe", hilfe: "Bei der 1., 2., 3., 5., 8., 13., 21. — dieselbe Leiter, wird von selbst seltener." },
      { v: "stufenwechsel", t: "Beim Stufensprung", hilfe: "Nur wenn der Rahmen eine Stufe weiterrückt." },
      { v: "immer",         t: "Bei jeder", hilfe: "Vermutlich zu viel. Gehört trotzdem gemessen." },
    ],
    ahnung: "stichprobe", vertritt: ANLAESSE,
  },
  {
    id: "form", name: "Nachfrage-Form", frage: "Wie kommt sie?",
    werte: [
      { v: "angebot", t: "Leises Angebot", hilfe: "Eine Zeile unter dem Knopf. Verschwindet, wenn man sie ignoriert." },
      { v: "zeile",   t: "Ein Feld", hilfe: "Ein einzeiliges Feld, gleich an Ort und Stelle." },
      { v: "bogen",   t: "Bogen", hilfe: "Ein Blatt legt sich darüber. Am deutlichsten, am aufdringlichsten." },
    ],
    ahnung: "angebot", vertritt: FORMEN,
  },
  {
    id: "wann", name: "Nachfrage-Zeitpunkt", frage: "Sofort oder später?",
    werte: [
      { v: "sofort", t: "Sofort", hilfe: "Direkt nach dem Tipp." },
      { v: "gleich", t: "Gleich", hilfe: "Nach anderthalb Minuten — wenn die Zigarette geraucht ist, nicht währenddessen." },
      { v: "abends", t: "Am Abend", hilfe: "Gesammelt, ab 20 Uhr, als Angebot." },
    ],
    ahnung: "gleich", vertritt: ZEITEN,
  },
  {
    id: "vorhaben", name: "Vorhaben", frage: "Gibt es etwas, das man sich vornimmt?",
    werte: [
      { v: "aus", t: "Aus", hilfe: "Nur zählen, nichts vornehmen." },
      { v: "an",  t: "An", hilfe: "Eine Sache, für so viele Tage, wie man wählt. Vorsatz-Mechanik aus kur-core." },
    ],
    ahnung: "an",
  },
  {
    id: "bogen", name: "Rückmeldebogen", frage: "Wenn das Vorhaben nicht aufgeht — wie viel wird gefragt?",
    werte: [
      { v: "vier", t: "Vier Fragen", hilfe: "Der volle Bogen aus dem lifetracker." },
      { v: "eine", t: "Eine Frage", hilfe: "Eine, rotierend über die Tage. Am wenigsten Widerstand." },
      { v: "zwei", t: "Zwei + Töne", hilfe: "Was kam dazwischen, wie geht's morgen weiter — dazu Stimmungs-Chips." },
    ],
    ahnung: "zwei", vertritt: BOGEN_FORMEN,
  },
];

export function reglerById(id) {
  return REGLER.find((r) => r.id === id) || null;
}

/** Die Stellung, mit der jeder neue Lauf anfängt: meine Vermutung. */
export function ahnung() {
  const s = {};
  for (const r of REGLER) s[r.id] = r.ahnung;
  return s;
}

/* ---------------------------------------------------------------------
   Die Voreinstellungen

   Drei Läufe, die sich nicht in einer Schraube unterscheiden, sondern
   in einer Haltung. So kommt man schneller zu einem Urteil als über
   sieben einzelne Regler.
   --------------------------------------------------------------------- */

export const PRESETS = [
  {
    id: "still", name: "Still",
    these: "Zählen genügt. Jede Frage ist eine Zumutung, die sich erst rechtfertigen muss.",
    stellung: { knopf: "punkte", stufe: "waechst", anlass: "nie", form: "angebot",
                wann: "sofort", vorhaben: "aus", bogen: "eine" },
  },
  {
    id: "leiter", name: "Leiter runter",
    these: "Die Leiter trägt das Ganze: sie beschreibt, sie rahmt, und sie taktet die Fragen.",
    stellung: { knopf: "teilung", stufe: "korridor", anlass: "stichprobe", form: "angebot",
                wann: "gleich", vorhaben: "an", bogen: "zwei" },
  },
  {
    id: "wach", name: "Wach",
    these: "Jede einzelne ist ein Ereignis, und ein Ereignis darf angesehen werden.",
    stellung: { knopf: "ring", stufe: "budget", anlass: "immer", form: "zeile",
                wann: "sofort", vorhaben: "an", bogen: "vier" },
  },
];

/* ---------------------------------------------------------------------
   Die Laufbilanz — drei Fragen am Ende, nicht mehr.
   --------------------------------------------------------------------- */

export const BILANZ = [
  { id: "trug",  frage: "Was hat getragen?",  platz: "Was würdest du behalten?" },
  { id: "viel",  frage: "Was war zu viel?",   platz: "Was hat gestört oder genervt?" },
  { id: "fehlt", frage: "Was hat gefehlt?",   platz: "Woran hast du gedacht, das nicht da war?" },
];

/** Die Töne einer Rückmeldung — drei reichen, mehr wird nicht benutzt. */
export const RUECKMELDUNG_TOENE = [
  { v: "gut",   t: "trägt" },
  { v: "mittel", t: "geht so" },
  { v: "stoert", t: "stört" },
];

/* =====================================================================
   Speicher

   Erst die Artifact-Datenbank, damit die Rückmeldungen bei mir
   ankommen; wenn die nicht da ist, localStorage, damit der Tuner
   trotzdem läuft. Eine kaputte Verbindung darf keinen Tipp verlieren —
   deshalb steht der lokale Stand immer, und die Datenbank ist die
   Kopie nach draußen, nicht die Wahrheit im Gerät.
   ===================================================================== */

const SCHLUESSEL = "smokefree.tuner.v1";

export function ladeLokal() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    return roh ? JSON.parse(roh) : null;
  } catch (e) { return null; }
}

export function sichereLokal(zustand) {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(zustand)); } catch (e) { /* egal */ }
}

/** Ein frischer Lauf. */
export function neuerLauf(name, stellung, these) {
  const id = "l" + Date.now().toString(36);
  return {
    id, name: name || "Lauf", these: these || "",
    stellung: { ...stellung },
    begonnen: new Date().toISOString(),
    tage: {},                // datum → {zigaretten:[], bogen:{}, gezaehlt, ...}
    vorhaben: null,          // {art, grenze, ab, n}
    notizen: [],
    bilanz: null,
  };
}

export function leererTag() {
  return { zigaretten: [], bogen: {}, toene: [], antworten: {}, gezaehlt: false, offen: [] };
}

export function tagVon(lauf, datum) {
  return (lauf.tage && lauf.tage[datum]) || leererTag();
}

/* ---- Die Datenbank -------------------------------------------------
   Ein Dokument pro Lauf (mit allen Tagen darin — nicht ein Dokument
   pro Zigarette, das sprengt die Dokumentgrenze), und ein Dokument pro
   Rückmeldung, weil genau die einzeln gelesen werden sollen.
   -------------------------------------------------------------------- */

let DB = null, dbVersucht = false;

export async function datenbank() {
  if (dbVersucht) return DB;
  dbVersucht = true;
  try { DB = (await globalThis.claude?.use?.("db")) || null; } catch (e) { DB = null; }
  return DB;
}

/** Läuft in Ruhe im Hintergrund; ein Fehler darf die Oberfläche nicht stören. */
export async function schreibeLauf(lauf) {
  const db = await datenbank();
  if (!db) return false;
  try {
    await db.doc("laeufe/" + lauf.id).set({
      name: lauf.name, these: lauf.these, stellung: lauf.stellung,
      begonnen: lauf.begonnen, tage: lauf.tage, vorhaben: lauf.vorhaben,
      notizen: lauf.notizen, bilanz: lauf.bilanz,
      zuletzt: new Date().toISOString(),
    });
    return true;
  } catch (e) { return false; }
}

export async function schreibeRueckmeldung(eintrag) {
  const db = await datenbank();
  if (!db) return false;
  try {
    await db.collection("rueckmeldungen").add(eintrag);
    return true;
  } catch (e) { return false; }
}

export async function leseLaeufe() {
  const db = await datenbank();
  if (!db) return null;
  try {
    const snap = await db.collection("laeufe").limit(50).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) { return null; }
}

/** Kurzform der Stellung für Protokoll und Rückmeldung. */
export function stellungKurz(stellung) {
  return REGLER.map((r) => {
    const w = r.werte.find((x) => x.v === stellung[r.id]);
    return r.name + ": " + (w ? w.t : stellung[r.id]);
  }).join(" · ");
}

export { heute };
