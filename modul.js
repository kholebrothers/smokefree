/* =====================================================================
   Das Modul — Zigaretten zählen

   Das hier ist der Gegenstand, der vertestet wird. Er besteht aus drei
   Teilen, und jeder hat mehrere Varianten, zwischen denen der Tuner
   umschaltet:

     1. Der Knopf      — ein Tipp, eine Zigarette. Die Zähleinheit.
     2. Die Stufe      — was die Fibonacci-Leiter unter dem Knopf bedeutet.
     3. Die Nachfrage  — wann die App etwas wissen will, und wie sie fragt.

   Eine Haltung gilt dabei für jede Variante gleichermaßen: **Ein
   Konsumereignis ist ein Ereignis, kein Versagen.** Es gibt hier kein Ziel, das man verfehlen kann, keine
   Serie, die zerbricht, und keinen Fortschrittsring, der voll werden
   will. Der offene Kreis ist Raum, keine Aufgabe.

   Deshalb rechnet dieses Modul auch nie ein "geschafft/nicht
   geschafft" aus, ohne dass jemand ausdrücklich danach fragt.
   ===================================================================== */

import { LEITER, stufeFuer, stufeUnter, verschiebe } from "./kern.js";

/* ---------------------------------------------------------------------
   1 / Der Zählknopf

   Ein Tipp ist eine Zigarette. Nicht mehr, nicht weniger — es gibt kein
   Formular davor und keine Rückfrage danach, die den Tipp aufhält.
   Was die App wissen will, holt sie sich hinterher (siehe 3), und auch
   dann nur als Angebot.

   Rücknehmen geht, solange die letzte noch frisch ist. Das ist keine
   Korrektur eines Fehlers — Vertippen gehört zum Tippen.
   --------------------------------------------------------------------- */

export const RUECKNAHME_FENSTER = 120000;   // zwei Minuten

/** Eine Zigarette an die Zählung des Tages hängen. */
export function zaehle(tag, jetzt) {
  const n = (tag.zigaretten || []).length + 1;
  return {
    ...tag,
    zigaretten: [...(tag.zigaretten || []), { nr: n, zeit: jetzt || Date.now() }],
  };
}

/** Die letzte zurücknehmen, solange sie im Fenster liegt. */
export function nimmZurueck(tag, jetzt) {
  const liste = tag.zigaretten || [];
  const letzte = liste[liste.length - 1];
  if (!letzte) return tag;
  if ((jetzt || Date.now()) - letzte.zeit > RUECKNAHME_FENSTER) return tag;
  return { ...tag, zigaretten: liste.slice(0, -1) };
}

export function anzahl(tag) {
  return ((tag && tag.zigaretten) || []).length;
}

/* ---------------------------------------------------------------------
   2 / Die Stufe

   Drei Lesarten derselben Leiter. Sie unterscheiden sich nur darin,
   woher der Rahmen kommt, in dem die Punkte stehen — und ob es
   überhaupt einen gibt.

   `waechst`   Der Rahmen ist die kleinste Stufe, die den heutigen Stand
               fasst. Er wächst mit und sagt nichts über gestern. Rein
               beschreibend: die Reihe ist eine Zahl, die man ansehen
               kann, ohne sie zu bewerten.

   `korridor`  Der Rahmen ist eine Stufe unter der niedrigsten, die
               wirklich gestanden hat. Das ist die Vorsatz-Leiter aus
               dem lifetracker, nur andersherum: dort kam man immer
               genau einen Schritt weiter als das Geschaffte, hier
               immer genau eine Stufe tiefer. Darüber hinaus ist kein
               Bruch — der Korridor rückt dann eben wieder hoch.

   `budget`    Der Rahmen ist die Stufe, die für heute gesetzt wurde.
               Am nächsten dran an klassischem Tracking und deshalb der
               härteste Test der Haltung: wenn irgendetwas hier wie ein
               Scheitern aussieht, dann das.
   --------------------------------------------------------------------- */

export const STUFEN_ARTEN = ["waechst", "korridor", "budget"];

/**
 * Was unter dem Knopf steht.
 * @param n        Stand heute
 * @param art      eine von STUFEN_ARTEN
 * @param vorher   [{datum, n}] — die Tage davor, jüngster zuerst
 * @param budget   nur für art "budget": die gesetzte Stufe
 * @returns {rahmen, plaetze, ueber, korridor, wort}
 */
export function stufenStand(n, art, vorher, budget) {
  const gewachsen = stufeFuer(n);

  if (art === "korridor") {
    const k = korridor(vorher);
    if (!k) return { rahmen: gewachsen, plaetze: gewachsen, ueber: 0, korridor: null,
                     wort: "Noch kein Korridor — der erste Tag beschreibt nur." };
    const rahmen = Math.max(k, gewachsen);
    return {
      rahmen, plaetze: rahmen, korridor: k, ueber: Math.max(0, n - k),
      wort: n <= k
        ? "Im Korridor: " + n + " von " + k + "."
        : (n - k) + " darüber. Der Korridor steht weiter bei " + k + ".",
    };
  }

  if (art === "budget") {
    const b = budget || stufeFuer(n);
    const rahmen = Math.max(b, gewachsen);
    return {
      rahmen, plaetze: rahmen, korridor: b, ueber: Math.max(0, n - b),
      wort: n <= b
        ? n + " von " + b + " für heute."
        : (n - b) + " über dem, was du dir für heute gesetzt hast. Das ist ein Ereignis.",
    };
  }

  return {
    rahmen: gewachsen, plaetze: gewachsen, korridor: null, ueber: 0,
    wort: n === 0 ? "Stufe " + gewachsen + ". Noch nichts drauf."
                  : "Stufe " + gewachsen + ".",
  };
}

/**
 * Eine Stufe unter der niedrigsten, die wirklich gestanden hat.
 *
 * "Gestanden" heißt: ein Tag mit Daten, nicht ein Tag ohne Eintrag —
 * sonst wäre der beste Korridor ein Tag, an dem niemand die App geöffnet
 * hat.
 *
 * Zwei Eigenschaften, die keine Nebensache sind:
 *
 * Er **steigt nicht, weil man heute darüber ist.** Ein Minimum kennt
 * kein Abrutschen. Der Aufrufer reicht ein Fenster von vierzehn Tagen
 * herein (`tageRueckwaerts`), und erst wenn der beste Tag aus diesem
 * Fenster herausfällt, lockert sich der Korridor von selbst. Damit ist
 * ein einzelner Tag nie eine Strafe und ein einzelner guter Tag nie eine
 * Fessel für immer.
 *
 * Und er **reicht nie bis null.** Unter der ersten Stufe liegt zwar die
 * Null, aber ein Korridor von null wäre die Forderung nach einem
 * makellosen Tag — genau das, was diese App nicht tut. Die engste Stufe
 * ist eins.
 */
export function korridor(vorher) {
  const tage = (vorher || []).filter((t) => t && typeof t.n === "number" && t.gezaehlt);
  if (!tage.length) return null;
  const niedrigste = Math.min(...tage.map((t) => stufeFuer(t.n)));
  return stufeUnter(niedrigste) || 1;
}

/* ---------------------------------------------------------------------
   3 / Die Nachfrage

   „Die App fragt beim Tracking ab und zu nach — oder bietet es an."
   Das sind zwei verschiedene Dinge, und welches von beiden sich richtig
   anfühlt, ist genau die Frage, die dieser Tuner beantworten soll.

   Drei Regler, unabhängig voneinander:

     anlass  wann überhaupt etwas kommt
     form    wie aufdringlich es kommt
     wann    ob sofort, gleich oder erst am Abend

   Der Anlass `stichprobe` benutzt dieselbe Leiter wie der Knopf: es
   fragt bei der 1., 2., 3., 5., 8., 13. und 21. Zigarette des Tages.
   Das wird über den Tag hinweg von selbst seltener — vorne, wo jede
   einzelne noch ein Ereignis ist, steht die Frage dicht; hinten, wo
   ohnehin nur noch gezählt wird, tritt sie zurück.
   --------------------------------------------------------------------- */

export const ANLAESSE = ["nie", "stichprobe", "stufenwechsel", "immer"];
export const FORMEN   = ["angebot", "zeile", "bogen"];
export const ZEITEN   = ["sofort", "gleich", "abends"];

export const GLEICH_NACH = 90000;   // anderthalb Minuten

/** Verlangt diese Zigarette eine Nachfrage? */
export function nachfrageFaellig(n, anlass) {
  if (anlass === "nie" || n < 1) return false;
  if (anlass === "immer") return true;
  if (anlass === "stichprobe") return LEITER.includes(n);
  if (anlass === "stufenwechsel") return stufeFuer(n) !== stufeFuer(n - 1);
  return false;
}

/** Wann die fällige Nachfrage sichtbar werden darf. */
export function faelligAb(zeit, jetzt) {
  if (zeit === "gleich") return jetzt + GLEICH_NACH;
  if (zeit === "abends") return null;          // erst am Tagesrand
  return jetzt;
}

/** Ab wann „abends" gilt. Kein Zwang, nur der Moment des Angebots. */
export function istAbend(datum, jetzt) {
  const d = new Date(jetzt);
  return d.getHours() >= 20;
}

/* ---------------------------------------------------------------------
   Die Fragen

   Zwei Sätze. Der eine gehört zur einzelnen Zigarette, der andere zum
   Tag, an dem ein Vorhaben nicht aufgegangen ist.

   Beide folgen derselben Regel für ihren Ton: nicht „Bleib
   stark!", sondern „Was ist geschehen?". Keine Frage enthält ein
   Sollen, keine fragt nach einer Begründung, und keine ist Pflicht.
   --------------------------------------------------------------------- */

/** Zur einzelnen Zigarette. Kurz — sie wird im Stehen beantwortet. */
export const FRAGEN_ZIGARETTE = [
  { id: "z-davor", frage: "Was war kurz davor?",      platz: "Telefonat, Feierabend, Warten …" },
  { id: "z-jetzt", frage: "Wie ist es jetzt?",        platz: "Ehrlich, nicht richtig." },
  { id: "z-statt", frage: "Was hätte auch gepasst?",  platz: "Oder: nichts." },
  { id: "z-wollt", frage: "Wolltest du die?",         platz: "Ja, nein, weiß nicht …" },
];

/**
 * Der Rückmeldebogen — wenn ein Vorhaben nicht aufgegangen ist.
 * Wörtlich die vier Fragen aus lifetracker/public/app.js (RUECK), auf
 * das Weglassen umgestellt. Die letzte schaut nach vorn und steht am
 * nächsten Morgen wieder oben.
 */
export const RUECK = [
  { id: "v-was",   frage: "Was ist dazwischengekommen?",
                   platz: "Ein Anlass, eine Runde, schlicht Gewohnheit …" },
  { id: "v-statt", frage: "Was hat den Platz bekommen?",
                   platz: "Was war stattdessen da?" },
  { id: "v-wie",   frage: "Wie fühlst du dich damit?",
                   platz: "Ehrlich, nicht richtig." },
  { id: "v-plan",  frage: "Wie möchtest du morgen an die Sache gehen?",
                   platz: "Der nächste Anlauf …" },
];

/** Die Stimmungs-Chips für die kurze Form des Bogens. */
export const TOENE = ["erleichtert", "gleichgültig", "genervt", "traurig", "wütend", "ruhig", "stolz"];

export const BOGEN_FORMEN = ["vier", "eine", "zwei"];

/** Welche Felder der Bogen in dieser Form zeigt. */
export function bogenFelder(form, tagIndex) {
  if (form === "eine") return [RUECK[(tagIndex || 0) % RUECK.length]];
  if (form === "zwei") return [RUECK[0], RUECK[3]];
  return RUECK;
}

/* ---------------------------------------------------------------------
   Das Vorhaben

   Beim Rauchen ist der Vorsatz eine Unterlassung, und die ist schwer
   abzuhaken — „nicht geraucht" hat keinen Moment, in dem man tippen
   könnte. Deshalb entscheidet nicht ein Häkchen, ob der Tag stand,
   sondern die Zählung selbst: unter der Grenze geblieben heißt getan.

   Damit ist der Vorsatz das einzige Stück dieses Moduls, in dem es
   überhaupt ein „erfüllt" gibt — und selbst das entwertet keinen Tag,
   wenn es ausbleibt. Wer schreibt, behält ihn.
   --------------------------------------------------------------------- */

export const VORHABEN = [
  { id: "unter",  name: "Unter einer Stufe bleiben", braucht: "stufe",
    satz: (v) => "Heute höchstens " + v.grenze + "." },
  { id: "spaeter", name: "Erst ab einer Uhrzeit",     braucht: "uhr",
    satz: (v) => "Vor " + v.grenze + " Uhr keine." },
  { id: "keine",  name: "Einen ganzen Tag keine",     braucht: null,
    satz: () => "Heute keine." },
];

export function vorhabenById(id) {
  return VORHABEN.find((v) => v.id === id) || null;
}

/** Stand der Tag? Das entscheidet die Zählung, nicht ein Häkchen. */
export function vorhabenGetan(vorhaben, tag) {
  if (!vorhaben || !tag) return false;
  const liste = tag.zigaretten || [];
  if (vorhaben.art === "keine")   return !!tag.gezaehlt && liste.length === 0;
  if (vorhaben.art === "unter")   return !!tag.gezaehlt && liste.length <= vorhaben.grenze;
  if (vorhaben.art === "spaeter") {
    if (!tag.gezaehlt) return false;
    const grenze = Number(String(vorhaben.grenze).split(":")[0]);
    return liste.every((z) => new Date(z.zeit).getHours() >= grenze);
  }
  return false;
}

/** Aufgeschrieben heißt bereit — und bereit genügt. */
export function tagGeschrieben(tag) {
  if (!tag) return false;
  const b = tag.bogen || {};
  return RUECK.some((f) => typeof b[f.id] === "string" && b[f.id].trim());
}

/** Die Tage davor, wie `stufenStand` und `vorsatzStand` sie brauchen. */
export function tageRueckwaerts(tage, bis, wieviele) {
  const out = [];
  for (let i = 1; i <= (wieviele || 14); i++) {
    const d = verschiebe(bis, -i);
    const t = tage[d];
    out.push({ datum: d, n: anzahl(t), gezaehlt: !!(t && t.gezaehlt) });
  }
  return out;
}
