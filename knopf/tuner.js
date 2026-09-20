/* =====================================================================
   Werkbank für den Zählknopf

   Der Knopf wird hier allein eingestellt, ohne App drumherum. Was hier
   gefunden wird, gilt danach überall, wo das Modul eingesetzt wird.

   Diese Datei gehört zur Werkbank, nicht zum Modul: sie darf Texte,
   Vorlagen und Meinungen haben. knopf.js darf das nicht.
   ===================================================================== */

import { zaehlknopf, gruppenAus, teilung, fibonacciBis, FORMEN, RICHTUNGEN } from "./knopf.js";

/* ---- Die Leitern, zwischen denen umgeschaltet wird ------------------ */

const LEITERN = {
  fibonacci: { t: "Fibonacci", werte: fibonacciBis(89),
    hilfe: "1 · 2 · 3 · 5 · 8 · 13 · 21 · 34 · 55 · 89. Die Sprünge werden nach oben weiter — der Unterschied zwischen 1 und 2 wiegt schwerer als der zwischen 20 und 21." },
  verdoppeln: { t: "Verdoppeln", werte: [1, 2, 4, 8, 16, 32, 64],
    hilfe: "Gleichmäßiger, aber härter: jede Stufe verlangt so viel wie alles davor zusammen." },
  glatt: { t: "Glatt", werte: [1, 5, 10, 20, 50, 100],
    hilfe: "Die Zahlen, in denen Menschen ohnehin denken. Dafür keine Dosierung — die Stufen sind willkürlich weit." },
  eng: { t: "Eng", werte: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20],
    hilfe: "Viele kleine Stufen. Der Knopf teilt sich oft neu; ob das aufmerksam macht oder nur zappelt, ist die Frage." },
};

/* ---- Vorlagen: derselbe Knopf, verschiedene Einsätze ---------------- */

const EINSAETZE = [
  {
    id: "rauchen", t: "Zigaretten",
    hilfe: "Bewusstsein über das eigene Verhalten, nicht Reduktion. Verbrauchen: die Zellen sind der Raum des Tages, jede Zigarette nimmt einen weg. Über den Rahmen hinaus ist kein Bruch — der Knopf teilt sich neu, und das war's.",
    stellung: { form: "teilung", richtung: "verbrauchen", leiter: "fibonacci", rahmen: 8 },
    wort: "heute", neben: (n, t) => t.ueber
      ? t.ueber + " über dem Rahmen. Der Knopf hat sich neu geteilt."
      : t.rest + " von " + (t.zellen) + " noch frei.",
  },
  {
    id: "morgen", t: "Morgenpraxis",
    hilfe: "Das Original: gezählt wird ein Tun, das erwünscht ist. Füllen — jeder Tag füllt eine Zelle, und wenn die Gruppe voll ist, teilt sich der Knopf feiner.",
    stellung: { form: "teilung", richtung: "fuellen", leiter: "fibonacci", rahmen: 8 },
    wort: "Tage", neben: (n, t) => "Stufe " + t.stufe + " · Zelle " + t.aktiv + " von " + t.zellen,
  },
  {
    id: "kaffee", t: "Kaffee",
    hilfe: "Etwas, das weder gut noch schlecht ist und einfach eine Menge hat. Enge Leiter, weil sich alles zwischen 1 und 6 abspielt.",
    stellung: { form: "teilung", richtung: "verbrauchen", leiter: "eng", rahmen: 3 },
    wort: "Tassen", neben: (n, t) => t.ueber ? "Über die üblichen " + (t.zellen - t.ueber) + "." : "",
  },
  {
    id: "bildschirm", t: "Bildschirmstunden",
    hilfe: "Größere Zahlen, gröbere Stufen. Zeigt, ob die Teilung bei vielen Zellen noch lesbar ist oder zu Grieß wird.",
    stellung: { form: "teilung", richtung: "verbrauchen", leiter: "glatt", rahmen: 5 },
    wort: "Stunden", neben: (n, t) => t.rest + " übrig",
  },
];

/* ---- Zustand -------------------------------------------------------- */

const SCHLUESSEL = "knopf.tuner.v1";
let Z = laden() || {
  stellung: { ...EINSAETZE[0].stellung },
  einsatz: "rauchen",
  n: 0,
  notizen: [],
};
Z.fbOffen = null;

function laden() {
  try { const r = localStorage.getItem(SCHLUESSEL); return r ? JSON.parse(r) : null; }
  catch (e) { return null; }
}
function sichern() {
  try {
    localStorage.setItem(SCHLUESSEL,
      JSON.stringify({ stellung: Z.stellung, einsatz: Z.einsatz, n: Z.n, notizen: Z.notizen }));
  } catch (e) { /* egal */ }
  schreibeDb();
}

let DB = null, dbGeholt = false;
async function datenbank() {
  if (dbGeholt) return DB;
  dbGeholt = true;
  try { DB = (await globalThis.claude?.use?.("db")) || null; } catch (e) { DB = null; }
  return DB;
}
async function schreibeDb() {
  const db = await datenbank();
  if (!db) return;
  try {
    await db.doc("knopf/stand").set({
      stellung: Z.stellung, einsatz: Z.einsatz, n: Z.n,
      notizen: Z.notizen, zuletzt: new Date().toISOString(),
    });
  } catch (e) { /* die Oberfläche darf davon nichts merken */ }
}

const einsatz = () => EINSAETZE.find((e) => e.id === Z.einsatz) || EINSAETZE[0];
const leiter = () => (LEITERN[Z.stellung.leiter] || LEITERN.fibonacci).werte;

/* ---- Die Regler ----------------------------------------------------- */

const REGLER = [
  { id: "form", name: "Form", frage: "Wie zeigt der Knopf seinen Stand?",
    werte: [
      { v: "teilung", t: "Teilung", hilfe: "Der Knopf selbst ist die Anzeige und teilt sich in die Zellen der Stufe. Keine zweite Grafik daneben." },
      { v: "punkte",  t: "Punktreihe", hilfe: "Eine Reihe am Fuß des Knopfes. Der Knopf bleibt ein Knopf — genau darin liegt der Unterschied zur Teilung." },
      { v: "ring",    t: "Ring", hilfe: "Die Zellen stehen auf einem Kreis, die Mitte bleibt leer. Raum statt Fortschrittsring." },
      { v: "taste",   t: "Taste", hilfe: "Nur Fläche und Zahl. Der Vergleichsmaßstab: sieht man ohne Bild überhaupt etwas?" },
    ] },
  { id: "richtung", name: "Richtung", frage: "Füllt ein Tipp eine Zelle oder nimmt er eine weg?",
    werte: [
      { v: "fuellen",     t: "Füllen", hilfe: "Für Gezähltes, das erwünscht ist. Die Gruppe ergibt sich aus dem Stand." },
      { v: "verbrauchen", t: "Verbrauchen", hilfe: "Für Gezähltes, das schlicht geschieht. Die Zellen sind der Raum, den es gibt; darüber hinaus teilt sich der Knopf neu, statt etwas zu brechen." },
    ] },
  { id: "leiter", name: "Leiter", frage: "Auf welchen Stufen rastet er ein?",
    werte: Object.keys(LEITERN).map((k) => ({ v: k, t: LEITERN[k].t, hilfe: LEITERN[k].hilfe })) },
];

/* ---- Zeichnen ------------------------------------------------------- */

let knopfNode = null;

function bauKnopf() {
  const e = einsatz();
  const k = zaehlknopf({
    form: Z.stellung.form,
    richtung: Z.stellung.richtung,
    leiter: leiter(),
    beschriftung: e.wort,
    nebentext: e.neben,
    beiTipp: () => { Z.n++; sichern(); zeichne(); },
  });
  knopfNode = k;
  document.querySelector("#buehne").replaceChildren(k.wurzel);
}

function zeichne(neuBauen) {
  if (neuBauen || !knopfNode) bauKnopf();
  const L = leiter();
  const t = knopfNode.setze({ n: Z.n, rahmen: Z.stellung.rahmen });

  document.querySelector("#stufenstand").textContent =
    "Stufe " + t.stufe + " · " + t.zellen + (t.zellen === 1 ? " Zelle" : " Zellen");

  /* Sprünge: ein Knopf je Stufe, damit die Neu-Teilung ohne
     hundertfaches Tippen zu sehen ist. */
  document.querySelector("#spruenge").innerHTML =
    L.filter((s) => s <= 34).map((s) =>
      '<button data-act="spring" data-v="' + s + '"' +
      (Z.n === s ? ' class="stark"' : "") + ">" + s + "</button>").join("");

  document.querySelector("#einsaetze").innerHTML = EINSAETZE.map((e) =>
    '<button data-act="einsatz" data-v="' + e.id + '" aria-pressed="' +
    (e.id === Z.einsatz) + '">' + e.t + "</button>").join("");
  document.querySelector("#einsatzhilfe").textContent = einsatz().hilfe;

  document.querySelector("#regler").innerHTML = REGLER.map((r) => {
    const w = r.werte.find((x) => x.v === Z.stellung[r.id]);
    return '<div class="regler"><h3>' + r.name + "</h3>" +
      '<p class="frage">' + r.frage + "</p>" +
      '<div class="wahl">' + r.werte.map((x) =>
        '<button data-act="schraube" data-r="' + r.id + '" data-v="' + x.v +
        '" aria-pressed="' + (x.v === Z.stellung[r.id]) + '">' + x.t + "</button>").join("") +
      "</div>" + (w ? '<p class="hilfe">' + w.hilfe + "</p>" : "") + "</div>";
  }).join("") + rahmenReglerHtml();

  gruppenTabelle(L, t);
  notizenZeichnen();
}

/* Der Rahmen gilt nur beim Verbrauchen — beim Füllen ergibt sich die
   Gruppe aus dem Stand, da gibt es nichts einzustellen. */
function rahmenReglerHtml() {
  if (Z.stellung.richtung !== "verbrauchen") return "";
  return '<div class="regler"><h3>Rahmen</h3>' +
    '<p class="frage">Wie viel Raum gilt, bevor sich der Knopf neu teilt?</p>' +
    '<div class="wahl">' + leiter().filter((s) => s <= 34).map((s) =>
      '<button data-act="rahmen" data-v="' + s + '" aria-pressed="' +
      (Z.stellung.rahmen === s) + '">' + s + "</button>").join("") + "</div>" +
    '<p class="hilfe">In einer App kommt diese Zahl nicht von Hand, sondern aus ' +
    'dem Verlauf — etwa als niedrigste Stufe der letzten vierzehn Tage.</p></div>';
}

function gruppenTabelle(L, t) {
  const g = gruppenAus(L);
  document.querySelector("#gruppen").innerHTML =
    "<tr><th>Stufe</th><th>Zellen</th><th>deckt</th></tr>" +
    g.map((x) => {
      const drin = Z.stellung.richtung === "fuellen"
        ? Math.max(1, Z.n) >= x.start && Math.max(1, Z.n) <= x.ende
        : x.stufe === t.stufe;
      return "<tr" + (drin ? ' class="jetzt"' : "") + "><td>" + x.stufe +
        "</td><td>" + x.groesse + "</td><td>" +
        (x.start === x.ende ? x.start : x.start + "–" + x.ende) + "</td></tr>";
    }).join("");
}

function notizenZeichnen() {
  const liste = Z.notizen.slice().reverse();
  document.querySelector("#fbzahl").textContent = String(Z.notizen.length);
  document.querySelector("#notizen").innerHTML = liste.length
    ? liste.map((n) =>
        '<div class="notiz"><div class="meta">' + n.ort + " · " + n.form + " / " +
        n.richtung + " / " + n.leiter + " · " + n.zeit.slice(0, 16).replace("T", " ") +
        "</div><p>" + n.text.replace(/[<>&]/g, "") + "</p></div>").join("")
    : '<p class="leer">Noch keine. Der offene Kreis ○ neben einer Überschrift öffnet das Feld.</p>';
}

function fbFeld(ort) {
  const kasten = document.querySelector('[data-fbfeld="' + ort + '"]');
  const auf = Z.fbOffen === ort;
  document.querySelectorAll(".fb").forEach((k) => { k.hidden = true; });
  document.querySelectorAll(".fb-auf").forEach((b) =>
    b.setAttribute("aria-expanded", String(b.dataset.fb === ort && auf)));
  if (!auf || !kasten) return;
  kasten.hidden = false;
  kasten.innerHTML =
    '<textarea rows="2" placeholder="Was fällt dir auf?" id="fbtext"></textarea>' +
    '<button class="merken" data-act="fb-merken" data-v="' + ort + '">Merken</button>';
  kasten.querySelector("textarea").focus();
}

/* ---- Klicks --------------------------------------------------------- */

document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-act],[data-fb]");
  if (!el) return;

  if (el.dataset.fb) {
    Z.fbOffen = Z.fbOffen === el.dataset.fb ? null : el.dataset.fb;
    return fbFeld(Z.fbOffen);
  }

  const act = el.dataset.act, v = el.dataset.v;

  if (act === "minus") { Z.n = Math.max(0, Z.n - 1); sichern(); return zeichne(); }
  if (act === "null")  { Z.n = 0; sichern(); return zeichne(); }
  if (act === "spring"){ Z.n = Number(v); sichern(); return zeichne(); }
  if (act === "rahmen"){ Z.stellung.rahmen = Number(v); sichern(); return zeichne(); }

  if (act === "einsatz") {
    const e = EINSAETZE.find((x) => x.id === v);
    Z.einsatz = v; Z.stellung = { ...e.stellung }; Z.n = 0;
    sichern(); return zeichne(true);
  }
  if (act === "schraube") {
    Z.stellung[el.dataset.r] = v;
    sichern();
    // Form und Richtung stecken im Knoten selbst — der muss neu gebaut werden.
    return zeichne(el.dataset.r !== "leiter");
  }
  if (act === "fb-merken") {
    const feld = document.querySelector("#fbtext");
    const text = (feld && feld.value || "").trim();
    if (text) {
      Z.notizen.push({
        ort: v, text, einsatz: Z.einsatz,
        form: Z.stellung.form, richtung: Z.stellung.richtung, leiter: Z.stellung.leiter,
        rahmen: Z.stellung.rahmen, n: Z.n, zeit: new Date().toISOString(),
      });
      sichern();
    }
    Z.fbOffen = null; fbFeld(null); return zeichne();
  }
});

zeichne(true);
