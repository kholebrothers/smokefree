/* =====================================================================
   Die Verdrahtung

   Ein Zustand, ein render(), ein Klick-Handler mit data-act — dasselbe
   Muster wie im lifetracker. Kein Framework, kein Build: die Datei
   läuft so, wie sie hier steht.

   Textfelder überleben kein innerHTML. Deshalb wird vor jedem Neuzeichnen
   `sammle()` aufgerufen: es liest, was in offenen Feldern steht, und legt
   es in den Zustand. Danach darf gezeichnet werden.
   ===================================================================== */

import { heute, verschiebe, abstand, LEITER, stufeFuer, stufeUnter, vorsatzStand } from "./kern.js";
import {
  zaehle, nimmZurueck, anzahl, RUECKNAHME_FENSTER,
  stufenStand, nachfrageFaellig, faelligAb, istAbend,
  FRAGEN_ZIGARETTE, RUECK, TOENE, bogenFelder,
  VORHABEN, vorhabenGetan, tagGeschrieben, tageRueckwaerts,
} from "./modul.js";
import {
  REGLER, reglerById, PRESETS, BILANZ, RUECKMELDUNG_TOENE, ahnung,
  neuerLauf, leererTag, tagVon, ladeLokal, sichereLokal, stellungKurz,
  schreibeLauf, schreibeRueckmeldung, datenbank,
} from "./tuner.js";
import { zaehlknopf } from "./knopf/knopf.js";

/* ---- Zustand ------------------------------------------------------- */

var Z = ladeLokal() || null;
if (!Z || !Z.laeufe || !Z.laeufe.length) {
  var start = neuerLauf(PRESETS[1].name, PRESETS[1].stellung, PRESETS[1].these);
  Z = { laeufe: [start], aktiv: start.id, rueckmeldungen: [], ort: "tag", versatz: 0 };
}
Z.ort = Z.ort || "tag";
Z.versatz = 0;                 // Zeitreise gilt je Sitzung, nicht dauerhaft
Z.fbOffen = null;
Z.bogen = null;
Z.weggewischt = Z.weggewischt || {};

function lauf()  { return Z.laeufe.find(function(l){ return l.id === Z.aktiv; }) || Z.laeufe[0]; }
function datum() { return heute(Z.versatz); }
function tag()   { return tagVon(lauf(), datum()); }
function stellung(){ return lauf().stellung; }

function setzeTag(patch){
  var l = lauf(), d = datum();
  l.tage[d] = Object.assign({}, tagVon(l, d), patch);
  sichern();
}
function sichern(){
  sichereLokal({ laeufe: Z.laeufe, aktiv: Z.aktiv, rueckmeldungen: Z.rueckmeldungen, ort: Z.ort });
  schreibeLauf(lauf());
}

/* ---- Kleinkram ----------------------------------------------------- */

function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}
function uhr(ts){
  var d = new Date(ts), p = function(n){ return String(n).padStart(2,"0"); };
  return p(d.getHours()) + ":" + p(d.getMinutes());
}
function langesDatum(d){
  var t = new Date(d + "T12:00:00");
  return t.toLocaleDateString("de-DE", { weekday:"short", day:"numeric", month:"long" });
}
function wahl(act, werte, ist, extra){
  return '<div class="wahl">' + werte.map(function(w){
    return '<button data-act="' + act + '" data-v="' + esc(w.v) + '"' +
      (extra ? ' data-x="' + esc(extra) + '"' : "") +
      ' aria-pressed="' + (String(w.v) === String(ist)) + '">' + esc(w.t) + '</button>';
  }).join("") + '</div>';
}

/* ---- Die Nachfragen, die gerade anstehen --------------------------- */

function faellige(){
  var s = stellung(), t = tag(), jetzt = Date.now();
  return (t.offen || []).filter(function(o){
    if (s.wann === "abends") return istAbend(datum(), jetzt);
    return o.ab != null && o.ab <= jetzt;
  });
}
function wartende(){
  var t = tag(), jetzt = Date.now();
  return (t.offen || []).filter(function(o){ return o.ab != null && o.ab > jetzt; }).length;
}

/* =====================================================================
   Zeichnen
   ===================================================================== */

function render(){
  var l = lauf(), d = datum();
  document.getElementById("kopfreihe").innerHTML = kopfHtml(l, d);
  document.getElementById("orte").innerHTML = orteHtml();
  document.getElementById("blatt").innerHTML =
    Z.ort === "regler" ? reglerHtml() : Z.ort === "protokoll" ? protokollHtml() : tagHtml();
  document.getElementById("leiste").innerHTML = leisteHtml();
  document.getElementById("bogenraum").innerHTML = Z.bogen ? bogenHtml() : "";
  teilungEinhaengen();
}

/* ---- Die Teilung ----------------------------------------------------
   Der Zählknopf aus knopf/ ist ein DOM-Knoten, kein HTML-Schnipsel: er
   wird einmal gebaut und danach nur gesetzt, damit Übergänge und
   Tastaturfokus jede Änderung überleben. Deshalb steht im innerHTML nur
   ein leerer Halter, und der Knoten kommt danach hinein.

   Der Rahmen kommt nicht von Hand, sondern aus der Stufenlesart: beim
   Korridor die Stufe unter der niedrigsten gehaltenen, beim Budget die
   für heute gesetzte, sonst die kleinste, die den Stand fasst. */
var ZK = null;
function teilungEinhaengen(){
  var halter = document.getElementById("zk-halter");
  if (!halter) return;
  var t = tag(), n = anzahl(t);
  var st = stufenStand(n, stellung().stufe, tageRueckwaerts(lauf().tage, datum(), 14), t.budget);
  if (!ZK){
    ZK = zaehlknopf({
      form: "teilung", richtung: "verbrauchen", leiter: LEITER,
      beschriftung: function(x){ return x === 1 ? "Zigarette" : "Zigaretten"; },
      nebentext: function(){ return st.wort; },
      beiTipp: function(){ rauchen(); render(); },
    });
  }
  if (ZK.wurzel.parentNode !== halter) halter.replaceChildren(ZK.wurzel);
  ZK.setze({ n: n, rahmen: st.korridor || st.rahmen });
}

/* Eine Zigarette zählen. Steht hier für sich, weil sie aus zwei
   Richtungen gerufen wird: aus dem Klick-Handler und aus dem Knopf. */
function rauchen(){
  var t = tag(), jetzt = Date.now();
  var neuTag = zaehle(t, jetzt);
  neuTag.gezaehlt = true;
  var n = anzahl(neuTag), s = stellung();
  if (nachfrageFaellig(n, s.anlass)){
    neuTag.offen = (neuTag.offen || []).concat([{ nr:n, ab: faelligAb(s.wann, jetzt) }]);
    if (s.wann === "sofort" && s.form === "bogen"){ Z.bogen = { art:"nachfrage", nr:n }; Z.bogenWerte = {}; }
  }
  setzeTag(neuTag);
  if (navigator.vibrate) try { navigator.vibrate(12); } catch(e){}
}

function kopfHtml(l, d){
  var zurueck = Z.versatz !== 0;
  return '<span class="marke">Rauch-Tuner</span>' +
    '<button class="laufknopf" data-act="laufsheet">' +
      '<span aria-hidden="true">○</span><b>' + esc(l.name) + '</b>' +
    '</button>' +
    '<span class="datum">' +
      '<button data-act="tag-zurueck" aria-label="Ein Tag zurück">‹</button>' +
      '<button class="heute' + (zurueck ? " zurueck" : "") + '" data-act="tag-heute">' +
        (zurueck ? esc(langesDatum(d)) : "heute") + '</button>' +
      '<button data-act="tag-vor" aria-label="Ein Tag vor"' + (Z.versatz >= 0 ? " disabled" : "") +
        '>›</button>' +
    '</span>';
}

function orteHtml(){
  var l = lauf();
  var fbAnzahl = Z.rueckmeldungen.filter(function(r){ return r.lauf === l.id; }).length;
  return [["tag","Tag",""],["regler","Regler",""],["protokoll","Protokoll", fbAnzahl ? String(fbAnzahl) : ""]]
    .map(function(o){
      return '<button data-act="ort" data-v="' + o[0] + '"' +
        (Z.ort === o[0] ? ' aria-current="page"' : "") + '>' + o[1] +
        (o[2] ? '<span class="zahl">' + o[2] + '</span>' : "") + '</button>';
    }).join("");
}

/* ---- Ort: Tag ------------------------------------------------------ */

function tagHtml(){
  var h = [];
  if (stellung().vorhaben === "an") h.push(vorhabenKarte());
  h.push(zaehlerKarte());
  h.push(spurKarte());
  return h.join("");
}

function fbKnopf(ort){
  return '<button class="fb-auf" data-act="fb" data-v="' + ort + '" ' +
    'aria-expanded="' + (Z.fbOffen === ort) + '" ' +
    'aria-label="Rückmeldung zu diesem Teil">○</button>';
}
function fbPanel(ort){
  if (Z.fbOffen !== ort) return "";
  return '<div class="angebot" style="border-top-style:solid">' +
    '<div style="flex:1 1 100%">' +
      '<div class="chips">' + RUECKMELDUNG_TOENE.map(function(t){
        return '<button class="chip ton-' + t.v + '" data-act="fb-ton" data-v="' + t.v + '" ' +
          'aria-pressed="' + (Z.fbTon === t.v) + '">' + esc(t.t) + '</button>';
      }).join("") + '</div>' +
      '<label class="feld"><span class="sr">Was fällt dir auf?</span>' +
        '<textarea data-feld="fbtext" rows="2" placeholder="Was fällt dir auf?">' +
        esc(Z.fbText || "") + '</textarea></label>' +
      '<button class="merken" data-act="fb-merken" data-v="' + ort + '">Merken</button>' +
    '</div></div>';
}

function zaehlerKarte(){
  var s = stellung(), t = tag(), n = anzahl(t), d = datum();
  var vorher = tageRueckwaerts(lauf().tage, d, 14);
  var st = stufenStand(n, s.stufe, vorher, t.budget);
  var h = ['<section class="karte">'];

  h.push('<div class="karte-kopf"><h2 class="rubrik">Heute</h2>' + fbKnopf("zaehler") + '</div>');
  h.push(fbPanel("zaehler"));

  h.push('<div class="zaehler">');
  /* Bei der Teilung trägt der Knopf die Zahl selbst — darüber stünde
     dieselbe Auskunft ein zweites Mal. */
  if (s.knopf !== "teilung"){
    h.push('<span class="zahl-gross' + (n ? "" : " null") + '">' + n + '</span>');
    h.push('<span class="einheit">' + (n === 1 ? "Zigarette" : "Zigaretten") + '</span>');
  }

  if (s.knopf === "teilung") h.push('<div id="zk-halter"></div>');
  else if (s.knopf === "punkte") h.push(punkteHtml(n, st));
  else if (s.knopf === "ring") h.push(ringHtml(n, st));

  if (s.knopf !== "teilung")
    h.push('<p class="stufenwort' + (st.ueber ? " ueber" : "") + '">' + esc(st.wort) + '</p>');
  h.push('</div>');

  if (s.knopf !== "teilung"){
    h.push('<div class="' + (s.knopf === "taste" ? "tastefeld" : "") + '" style="margin-top:14px">');
    h.push('<button class="tippen' + (s.knopf === "taste" ? " taste" : "") + '" data-act="rauch">' +
      (s.knopf === "taste" ? "Eine" : "+ Eine") +
      '<span class="sub">' + (s.knopf === "taste" ? "antippen" : "") + '</span></button>');
    h.push('</div>');
  }

  h.push('<div class="unterknoepfe">');
  var letzte = (t.zigaretten || [])[n - 1];
  if (letzte && Date.now() - letzte.zeit <= RUECKNAHME_FENSTER)
    h.push('<button class="leise-knopf" data-act="zurueck">Vertippt — zurück</button>');
  else if (!n)
    h.push('<button class="leise-knopf' + (t.gezaehlt ? " an" : "") + '" data-act="keine">' +
      (t.gezaehlt ? "Bisher keine. Steht." : "Bisher keine") + '</button>');
  if (s.stufe === "budget")
    h.push('<button class="leise-knopf" data-act="budget-sheet">Stufe für heute: ' +
      (t.budget || stufeFuer(n)) + '</button>');
  h.push('</div>');

  h.push(nachfrageHtml());
  h.push('</section>');
  return h.join("");
}

/* Die Punktreihe: so viele Plätze, wie die Stufe hergibt. Was darüber
   hinausgeht, steht trotzdem da — nur mit einem Hof, damit sichtbar ist,
   dass der Rahmen überschritten wurde. Verschwinden lassen wäre gelogen. */
function punkteHtml(n, st){
  var p = [];
  for (var i = 0; i < Math.max(st.plaetze, n); i++){
    var an = i < n, ueber = an && st.korridor != null && i >= st.korridor;
    p.push('<span class="p' + (ueber ? " ueber" : an ? " an" : " rand") + '"></span>');
  }
  return '<div class="punkte" aria-hidden="true">' + p.join("") + '</div>';
}

/* Der offene Kreis: kein Ring, der voll werden will,
   sondern Raum, in den Spuren hineinkommen. */
function ringHtml(n, st){
  var plaetze = Math.max(st.plaetze, n, 1), r = 66, mitte = 86, teile = [];
  for (var i = 0; i < plaetze; i++){
    var w = (i / plaetze) * Math.PI * 2 - Math.PI / 2;
    var x = mitte + Math.cos(w) * r, y = mitte + Math.sin(w) * r;
    var an = i < n, ueber = an && st.korridor != null && i >= st.korridor;
    teile.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' +
      (an ? 6 : 3.4) + '" fill="' + (an ? "var(--clay)" : "none") +
      '" stroke="' + (an ? "var(--clay)" : "var(--mist)") + '" stroke-width="1.2"' +
      (ueber ? ' opacity="0.72"' : "") + '/>');
  }
  return '<div class="ringfeld"><svg viewBox="0 0 172 172" aria-hidden="true">' +
    '<circle cx="86" cy="86" r="66" fill="none" stroke="var(--linie)" stroke-width="1"/>' +
    teile.join("") + '</svg></div>';
}

/* ---- Die Nachfrage in ihren drei Formen ---------------------------- */

function nachfrageHtml(){
  var s = stellung();
  if (s.anlass === "nie") return "";
  var dran = faellige(), warten = wartende();

  if (!dran.length){
    if (!warten) return "";
    return '<div class="offen-zahl">' + fbKnopfZeile("nachfrage") +
      '<span>' + warten + (warten === 1 ? " Nachfrage wartet" : " Nachfragen warten") +
      (s.wann === "abends" ? " — ab 20 Uhr." : " — gleich.") + '</span></div>' +
      fbPanel("nachfrage");
  }

  var o = dran[0], nr = o.nr;
  if (Z.weggewischt[datum() + "/" + nr]) return fbPanel("nachfrage");

  if (s.form === "bogen"){
    return '<div class="angebot">' + fbKnopfZeile("nachfrage") +
      '<p>Zur ' + nr + '. — magst du kurz hinschauen?</p>' +
      '<button class="hin" data-act="nf-bogen" data-v="' + nr + '">Öffnen</button>' +
      '<button class="weg" data-act="nf-weg" data-v="' + nr + '">Nicht jetzt</button>' +
      '</div>' + fbPanel("nachfrage");
  }

  if (s.form === "zeile"){
    var f = FRAGEN_ZIGARETTE[(nr - 1) % FRAGEN_ZIGARETTE.length];
    return '<div class="angebot" style="border-top-style:solid">' +
      fbKnopfZeile("nachfrage") +
      '<div style="flex:1 1 100%">' +
        '<label class="feld"><span>' + esc(f.frage) + '</span>' +
        '<input type="text" data-feld="nf" placeholder="' + esc(f.platz) + '" value="' +
        esc(Z.nfText || "") + '"></label>' +
        '<div class="unterknoepfe">' +
          '<button class="merken" data-act="nf-merken" data-v="' + nr + '" ' +
            'data-f="' + f.id + '" style="flex:1">Merken</button>' +
          '<button class="leise-knopf" data-act="nf-weg" data-v="' + nr + '">Später</button>' +
        '</div>' +
      '</div></div>' + fbPanel("nachfrage");
  }

  return '<div class="angebot">' + fbKnopfZeile("nachfrage") +
    '<p>Zur ' + nr + '. etwas notieren?</p>' +
    '<button class="hin" data-act="nf-bogen" data-v="' + nr + '">Kurz notieren</button>' +
    '<button class="weg" data-act="nf-weg" data-v="' + nr + '">Später</button>' +
    '</div>' + fbPanel("nachfrage");
}
function fbKnopfZeile(ort){
  return '<button class="fb-auf" style="margin:0 0 0 0;order:9" data-act="fb" data-v="' + ort +
    '" aria-expanded="' + (Z.fbOffen === ort) + '" aria-label="Rückmeldung zur Nachfrage">○</button>';
}

/* ---- Das Vorhaben -------------------------------------------------- */

function vorhabenKarte(){
  var l = lauf(), d = datum(), v = l.vorhaben;
  var h = ['<section class="karte">'];
  h.push('<div class="karte-kopf"><h2 class="rubrik">Vorhaben</h2>' + fbKnopf("vorhaben") + '</div>');
  h.push(fbPanel("vorhaben"));

  if (!v){
    h.push('<p class="leerzeile">Nichts vorgenommen. Das ist eine vollständige Antwort.</p>');
    h.push('<button class="merken leise" data-act="vorhaben-sheet" style="margin-top:12px">' +
      'Etwas vornehmen</button>');
    h.push('</section>');
    return h.join("");
  }

  var s = vorsatzStand(v, d,
    function(x){ return vorhabenGetan(v, l.tage[x]); },
    function(x){ return tagGeschrieben(l.tage[x]); });

  var gestern = l.tage[verschiebe(d, -1)];
  var anlauf = gestern && gestern.bogen && gestern.bogen["v-plan"];
  if (anlauf && s.zustand === "laeuft" && !s.heuteGetan)
    h.push('<p class="notiz-gestern">Gestern notiert: „' + esc(anlauf) + '“</p>');

  h.push('<p class="vorhaben-satz">' + esc(satzVon(v)) + '</p>');
  h.push('<p class="vorhaben-stand">' + esc(standWort(s, v)) + '</p>');

  if (s.zustand === "verfallen"){
    h.push('<div class="credo">Am ' + esc(langesDatum(s.offen)) +
      ' ist er offen geblieben — ohne Zeile. <b>Das ist in Ordnung.</b></div>');
    h.push('<div class="unterknoepfe">');
    if (s.offen === verschiebe(d, -1))
      h.push('<button class="merken" data-act="rueck-sheet" data-v="' + s.offen +
        '" style="flex:2">Noch kurz aufschreiben</button>');
    h.push('<button class="leise-knopf" data-act="vorhaben-nochmal">Nochmal ab morgen</button>');
    h.push('</div>');
  } else if (s.zustand === "erfuellt"){
    h.push('<div class="credo">' + (v.n === 1 ? "Gehalten." : v.n + " Tage in Folge. Gehalten.") +
      ' Wie soll es weitergehen?</div>');
    h.push('<div class="unterknoepfe">' +
      '<button class="merken" data-act="vorhaben-weiter" data-v="' + v.n + '" style="flex:2">' +
        (v.n === 1 ? "Nochmal einen Tag" : "Nochmal " + v.n + " Tage") + '</button>' +
      '<button class="leise-knopf" data-act="vorhaben-weiter" data-v="' + (v.n + 1) + '">' +
        (v.n + 1) + ' Tage</button>' +
      '<button class="leise-knopf" data-act="vorhaben-sheet">Etwas anderes</button></div>');
  } else if (s.zustand === "morgen"){
    h.push('<div class="unterknoepfe"><button class="leise-knopf" data-act="vorhaben-sheet">' +
      'Ändern</button></div>');
  } else if (s.heuteGetan){
    h.push('<div class="credo">Steht für heute.</div>');
  } else if (s.heuteGeschrieben){
    var erste = RUECK.map(function(f){ return (tag().bogen || {})[f.id]; })
      .filter(function(x){ return x && x.trim(); })[0];
    h.push('<div class="credo">„' + esc(erste) + '“</div>');
    h.push('<div class="unterknoepfe"><button class="leise-knopf" data-act="rueck-sheet" data-v="' +
      d + '">Ändern</button></div>');
  } else {
    h.push('<div class="credo"><b>Bereitschaft genügt.</b> Wenn es heute nicht aufgeht, ' +
      'schreib kurz auf, was dazwischenkam — der Tag zählt genauso.</div>');
    h.push('<div class="unterknoepfe"><button class="merken" data-act="rueck-sheet" data-v="' +
      d + '" style="flex:1">Aufschreiben</button></div>');
  }

  h.push('</section>');
  return h.join("");
}

function satzVon(v){
  if (v.art === "keine")   return v.n > 1 ? v.n + " Tage lang keine." : "Heute keine.";
  if (v.art === "unter")   return "Höchstens " + v.grenze + (v.n > 1 ? " — " + v.n + " Tage lang." : " heute.");
  if (v.art === "spaeter") return "Vor " + v.grenze + " Uhr keine" + (v.n > 1 ? ", " + v.n + " Tage lang." : ".");
  return "";
}
function standWort(s, v){
  if (s.zustand === "morgen")   return "Ab morgen.";
  if (s.zustand === "erfuellt") return "Gehalten.";
  if (s.zustand === "verfallen")return "Ausgelaufen — die Tage zählen weiter.";
  return v.n > 1 ? "Tag " + Math.min(v.n, s.getan + 1) + " von " + v.n : "Heute ist er dran.";
}

/* ---- Die Tagesspur ------------------------------------------------- */

function spurKarte(){
  var t = tag(), liste = t.zigaretten || [];
  var h = ['<section class="karte">'];
  h.push('<div class="karte-kopf"><h2 class="rubrik">Spur</h2>' +
    '<span class="stand">' + esc(langesDatum(datum())) + '</span></div>');
  if (!liste.length){
    h.push('<p class="leerzeile">' + (t.gezaehlt
      ? "Nichts eingetragen. Ein leerer Tag ist auch ein Tag."
      : "Noch nichts. Ein leerer Kreis heißt unbekannt, nicht misslungen.") + '</p>');
  } else {
    h.push('<ul class="spur">' + liste.slice().reverse().map(function(z){
      var a = (t.antworten || {})[z.nr];
      return '<li><span class="uhr">' + uhr(z.zeit) + '</span>' +
        '<span class="nr">' + z.nr + '</span>' +
        '<span class="was">' + (a && a.text
          ? '<em>' + esc(a.frage) + '</em>' + esc(a.text)
          : '<em style="color:var(--mist)">nichts notiert</em>') + '</span></li>';
    }).join("") + '</ul>');
  }
  h.push('</section>');
  return h.join("");
}

/* ---- Ort: Regler --------------------------------------------------- */

function reglerHtml(){
  var l = lauf(), s = l.stellung;
  var h = [];

  h.push('<section class="karte"><div class="karte-kopf">' +
    '<h2 class="rubrik">Läufe</h2><span class="stand">Ein Tipp startet einen neuen</span></div>');
  h.push(PRESETS.map(function(p){
    var gleich = REGLER.every(function(r){ return s[r.id] === p.stellung[r.id]; });
    return '<button class="preset" data-act="preset" data-v="' + p.id + '" aria-pressed="' + gleich + '">' +
      '<h3>' + esc(p.name) + '</h3><p>' + esc(p.these) + '</p>' +
      '<div class="stellung">' + esc(stellungKurz(p.stellung)) + '</div></button>';
  }).join(""));
  h.push('<button class="merken leise" data-act="lauf-neu">Neuer Lauf mit der jetzigen Stellung</button>');
  h.push('</section>');

  h.push('<section class="karte"><div class="karte-kopf">' +
    '<h2 class="rubrik">Schrauben</h2>' + fbKnopf("regler") + '</div>');
  h.push(fbPanel("regler"));
  h.push('<p class="hilfe" style="margin-top:0">Eine Änderung hier gilt sofort und wird im ' +
    'Protokoll als Stellungswechsel festgehalten — der Lauf bleibt derselbe.</p>');
  h.push(REGLER.map(function(r){
    var w = r.werte.find(function(x){ return x.v === s[r.id]; });
    return '<div class="regler"><h3>' + esc(r.name) + '</h3>' +
      '<p class="frage">' + esc(r.frage) + '</p>' +
      wahl("schraube", r.werte, s[r.id], r.id) +
      (w ? '<p class="hilfe">' + esc(w.hilfe) + '</p>' : "") + '</div>';
  }).join(""));
  h.push('</section>');
  return h.join("");
}

/* ---- Ort: Protokoll ------------------------------------------------ */

function protokollHtml(){
  var h = [];

  h.push('<section class="karte"><div class="karte-kopf">' +
    '<h2 class="rubrik">Läufe im Vergleich</h2></div>');
  h.push(Z.laeufe.map(function(l){
    var tage = Object.keys(l.tage || {});
    var summe = tage.reduce(function(a,d){ return a + anzahl(l.tage[d]); }, 0);
    var fb = Z.rueckmeldungen.filter(function(r){ return r.lauf === l.id; }).length;
    return '<div class="laufzeile' + (l.id === Z.aktiv ? " jetzt" : "") + '">' +
      '<button class="name" data-act="lauf-waehlen" data-v="' + l.id +
        '" style="background:transparent;border:0;padding:0;text-align:left">' +
        esc(l.name) + '<span>' + esc(stellungKurz(l.stellung)) + '</span></button>' +
      '<span class="werte">' +
        '<div>' + tage.length + '<span>Tage</span></div>' +
        '<div>' + summe + '<span>Zig.</span></div>' +
        '<div>' + fb + '<span>Rückm.</span></div>' +
      '</span></div>';
  }).join(""));
  h.push('<div class="unterknoepfe">' +
    '<button class="leise-knopf" data-act="bilanz-sheet">Laufbilanz ziehen</button>' +
    '<button class="leise-knopf" data-act="lauf-neu">Neuer Lauf</button></div>');
  h.push('</section>');

  var meine = Z.rueckmeldungen.slice().reverse();
  h.push('<section class="karte"><div class="karte-kopf">' +
    '<h2 class="rubrik">Rückmeldungen</h2><span class="stand">' + meine.length + '</span></div>');
  if (!meine.length){
    h.push('<p class="leerzeile">Noch keine. Der offene Kreis ○ neben jedem Teil öffnet das Feld.</p>');
  } else {
    h.push(meine.map(function(r){
      var farbe = r.ton === "gut" ? "var(--ton-gut)" : r.ton === "stoert" ? "var(--ton-stoert)" : "var(--ton-mittel)";
      return '<div class="fbzeile"><div class="meta">' +
        '<span class="punkt" style="background:' + farbe + '"></span>' +
        esc(r.ort) + '<span>·</span>' + esc(r.laufName) + '<span>·</span>' + esc(r.zeit.slice(0,16).replace("T"," ")) +
        '</div><p>' + esc(r.text || "(ohne Text)") + '</p></div>';
    }).join(""));
  }
  h.push('</section>');

  var l0 = lauf();
  if (l0.bilanz){
    h.push('<section class="karte"><div class="karte-kopf"><h2 class="rubrik">Bilanz — ' +
      esc(l0.name) + '</h2></div>');
    h.push(BILANZ.map(function(f){
      return '<div class="fbzeile"><div class="meta">' + esc(f.frage) + '</div><p>' +
        esc(l0.bilanz[f.id] || "—") + '</p></div>';
    }).join(""));
    h.push('</section>');
  }

  h.push('<section class="karte"><div class="karte-kopf">' +
    '<h2 class="rubrik">Alles als JSON</h2>' +
    '<span class="stand" id="dbstand">' + (Z.dbDa ? "Datenbank verbunden" : "nur lokal") + '</span></div>');
  h.push('<textarea class="ausgabe" readonly>' +
    esc(JSON.stringify({ laeufe: Z.laeufe, rueckmeldungen: Z.rueckmeldungen }, null, 1)) +
    '</textarea>');
  h.push('</section>');
  return h.join("");
}

/* ---- Die Leiste unten ---------------------------------------------- */

function leisteHtml(){
  var l = lauf();
  var fb = Z.rueckmeldungen.filter(function(r){ return r.lauf === l.id; }).length;
  var tage = Object.keys(l.tage || {}).length;
  return '<button class="notiz" data-act="notiz-sheet">Notiz zum Lauf …</button>' +
    '<span class="zaehlung">' + tage + (tage === 1 ? " Tag" : " Tage") + '<br>' +
    fb + " Rückm." + '</span>';
}

/* =====================================================================
   Bögen
   ===================================================================== */

function bogenHtml(){
  var b = Z.bogen, h = ['<button class="bogen-bg" data-act="bogen-zu" aria-label="Schließen"></button>',
    '<div class="bogen" role="dialog" aria-modal="true"><div class="bogen-in">'];

  if (b.art === "nachfrage"){
    var form = stellung().bogen;
    var felder = form === "eine" ? [FRAGEN_ZIGARETTE[(b.nr - 1) % FRAGEN_ZIGARETTE.length]]
               : form === "zwei" ? [FRAGEN_ZIGARETTE[0], FRAGEN_ZIGARETTE[1]]
               : FRAGEN_ZIGARETTE;
    h.push('<h2>Die ' + b.nr + '.</h2>');
    h.push('<p class="lead">Kein Feld muss. Was hier steht, ist eine Beobachtung — ' +
      'nichts wird daraus abgeleitet, was du nicht selbst sagst.</p>');
    h.push(felder.map(function(f){
      return '<label class="feld"><span>' + esc(f.frage) + '</span>' +
        '<textarea data-feld="nf-' + f.id + '" rows="2" placeholder="' + esc(f.platz) + '">' +
        esc((Z.bogenWerte || {})[f.id] || "") + '</textarea></label>';
    }).join(""));
    h.push('<button class="merken" data-act="nf-bogen-merken" data-v="' + b.nr + '">Merken</button>');
  }

  else if (b.art === "rueck"){
    var l = lauf(), t = tagVon(l, b.datum), form2 = stellung().bogen;
    var idx = abstand(l.vorhaben ? l.vorhaben.ab : b.datum, b.datum);
    h.push('<h2>Bereitschaft genügt.</h2>');
    h.push('<p class="lead">' + (l.vorhaben ? '<b>' + esc(satzVon(l.vorhaben)) + '</b> — nicht aufgegangen. ' : "") +
      'Hinzuschauen ist genauso viel wert wie das Halten; der Tag zählt danach. ' +
      'Ein Satz reicht, und kein Feld muss.</p>');
    h.push(bogenFelder(form2, idx).map(function(f){
      return '<label class="feld"><span>' + esc(f.frage) + '</span>' +
        '<textarea data-feld="rb-' + f.id + '" rows="2" placeholder="' + esc(f.platz) + '">' +
        esc((t.bogen || {})[f.id] || "") + '</textarea></label>';
    }).join(""));
    if (form2 === "zwei"){
      h.push('<div class="feld"><span>Und wie ist es gerade?</span><div class="chips">' +
        TOENE.map(function(x){
          return '<button class="chip" data-act="ton" data-v="' + esc(x) + '" aria-pressed="' +
            ((t.toene || []).indexOf(x) >= 0) + '">' + esc(x) + '</button>';
        }).join("") + '</div></div>');
    }
    h.push('<button class="merken" data-act="rueck-merken" data-v="' + b.datum + '">Merken</button>');
  }

  else if (b.art === "vorhaben"){
    var w = Z.vorhabenWahl || { art:"unter", grenze:5, n:1, ab:"heute" };
    h.push('<h2>Ein Vorhaben</h2>');
    h.push('<p class="lead">Eine Sache. Klein halten — es geht ums Hinschauen, nicht ums ' +
      'Durchhalten. Geht sie nicht auf, reicht ein Satz darüber, was dazwischenkam.</p>');
    h.push('<div class="feld"><span>Was nimmst du dir vor?</span>' +
      wahl("vw-art", VORHABEN.map(function(v){ return {v:v.id, t:v.name}; }), w.art) + '</div>');
    if (w.art === "unter")
      h.push('<div class="feld"><span>Höchstens wie viele?</span>' +
        wahl("vw-grenze", LEITER.slice(0,6).map(function(s){ return {v:s, t:String(s)}; }), w.grenze) + '</div>');
    if (w.art === "spaeter")
      h.push('<div class="feld"><span>Ab wann?</span>' +
        wahl("vw-grenze", [10,12,14,16,18].map(function(u){ return {v:u, t:u + " Uhr"}; }), w.grenze) + '</div>');
    h.push('<div class="feld"><span>Wie viele Tage?</span>' +
      wahl("vw-n", [1,2,3,5].map(function(n){ return {v:n, t:n === 1 ? "Ein Tag" : n + " Tage"}; }), w.n) + '</div>');
    h.push('<div class="feld"><span>Ab wann?</span>' +
      wahl("vw-ab", [{v:"heute",t:"Ab heute"},{v:"morgen",t:"Ab morgen"}], w.ab) + '</div>');
    h.push('<button class="merken" data-act="vorhaben-merken">Vornehmen</button>');
    if (lauf().vorhaben)
      h.push('<button class="merken leise" data-act="vorhaben-weg" style="margin-top:8px">Doch nichts</button>');
  }

  else if (b.art === "budget"){
    h.push('<h2>Stufe für heute</h2>');
    h.push('<p class="lead">Kein Ziel, ein Rahmen. Darüber hinaus ist kein Bruch — ' +
      'es ist ein Ereignis, und Ereignisse dürfen angesehen werden.</p>');
    h.push('<div class="feld">' + wahl("budget-v",
      LEITER.slice(0,7).map(function(s){ return {v:s, t:String(s)}; }),
      tag().budget || stufeFuer(anzahl(tag()))) + '</div>');
  }

  else if (b.art === "lauf"){
    h.push('<h2>Läufe</h2>');
    h.push('<p class="lead">Ein Lauf ist eine eingefrorene Reglerstellung plus alles, was ' +
      'darin geschah. Umschalten verliert nichts.</p>');
    h.push(Z.laeufe.map(function(l2){
      return '<button class="preset" data-act="lauf-waehlen" data-v="' + l2.id + '" aria-pressed="' +
        (l2.id === Z.aktiv) + '"><h3>' + esc(l2.name) + '</h3>' +
        (l2.these ? '<p>' + esc(l2.these) + '</p>' : "") +
        '<div class="stellung">' + esc(stellungKurz(l2.stellung)) + '</div></button>';
    }).join(""));
    h.push('<button class="merken leise" data-act="lauf-neu">Neuer Lauf</button>');
  }

  else if (b.art === "notiz"){
    h.push('<h2>Notiz zum Lauf</h2>');
    h.push('<p class="lead">Was dir auffällt, ohne dass es an einem einzelnen Teil hängt.</p>');
    h.push('<label class="feld"><span class="sr">Notiz</span>' +
      '<textarea data-feld="notiz" rows="4" placeholder="…"></textarea></label>');
    h.push('<button class="merken" data-act="notiz-merken">Merken</button>');
    var n = lauf().notizen || [];
    if (n.length) h.push(n.slice().reverse().map(function(x){
      return '<div class="fbzeile"><div class="meta">' + esc(x.zeit.slice(0,16).replace("T"," ")) +
        '</div><p>' + esc(x.text) + '</p></div>';
    }).join(""));
  }

  else if (b.art === "bilanz"){
    var bl = lauf().bilanz || {};
    h.push('<h2>Laufbilanz</h2>');
    h.push('<p class="lead">Drei Fragen, dann ist der Lauf abgelegt. Er bleibt im Protokoll stehen.</p>');
    h.push(BILANZ.map(function(f){
      return '<label class="feld"><span>' + esc(f.frage) + '</span>' +
        '<textarea data-feld="bl-' + f.id + '" rows="2" placeholder="' + esc(f.platz) + '">' +
        esc(bl[f.id] || "") + '</textarea></label>';
    }).join(""));
    h.push('<button class="merken" data-act="bilanz-merken">Merken</button>');
  }

  h.push('</div></div>');
  return h.join("");
}

/* =====================================================================
   Eingaben einsammeln, bevor gezeichnet wird
   ===================================================================== */

function sammle(){
  var felder = document.querySelectorAll("[data-feld]");
  Z.bogenWerte = Z.bogenWerte || {};
  for (var i = 0; i < felder.length; i++){
    var f = felder[i], k = f.getAttribute("data-feld"), v = f.value;
    if (k === "fbtext") Z.fbText = v;
    else if (k === "nf") Z.nfText = v;
    else if (k === "notiz") Z.notizText = v;
    else if (k.indexOf("nf-") === 0) Z.bogenWerte[k.slice(3)] = v;
    else if (k.indexOf("rb-") === 0) rbSetzen(k.slice(3), v);
    else if (k.indexOf("bl-") === 0){
      var l = lauf(); l.bilanz = l.bilanz || {}; l.bilanz[k.slice(3)] = v;
    }
  }
}
function rbSetzen(id, wert){
  var b = Z.bogen, l = lauf();
  var d = (b && b.datum) || datum();
  var t = Object.assign({}, tagVon(l, d));
  t.bogen = Object.assign({}, t.bogen); t.bogen[id] = wert;
  if (wert && wert.trim()) t.gezaehlt = true;
  l.tage[d] = t;
}

function neu(){ sammle(); render(); }

/* =====================================================================
   Klicks
   ===================================================================== */

document.addEventListener("click", function(ev){
  var el = ev.target.closest && ev.target.closest("[data-act]");
  if (!el) return;
  var act = el.getAttribute("data-act"), v = el.getAttribute("data-v");
  sammle();

  /* ---- Navigation ---- */
  if (act === "ort"){ Z.ort = v; Z.fbOffen = null; sichern(); return render(); }
  if (act === "tag-zurueck"){ Z.versatz--; return render(); }
  if (act === "tag-vor"){ if (Z.versatz < 0) Z.versatz++; return render(); }
  if (act === "tag-heute"){ Z.versatz = 0; return render(); }
  if (act === "bogen-zu"){ Z.bogen = null; Z.bogenWerte = {}; sichern(); return render(); }

  /* ---- Zählen ---- */
  if (act === "rauch"){ rauchen(); return render(); }
  if (act === "zurueck"){ setzeTag(nimmZurueck(tag(), Date.now())); return render(); }
  if (act === "keine"){ setzeTag({ gezaehlt: !tag().gezaehlt }); return render(); }

  /* ---- Nachfrage ---- */
  if (act === "nf-weg"){
    Z.weggewischt[datum() + "/" + v] = true;
    setzeTag({ offen: (tag().offen || []).filter(function(o){ return String(o.nr) !== String(v); }) });
    return render();
  }
  if (act === "nf-bogen"){ Z.bogen = { art:"nachfrage", nr:Number(v) }; Z.bogenWerte = {}; return render(); }
  if (act === "nf-merken"){
    var frage = FRAGEN_ZIGARETTE.find(function(f){ return f.id === el.getAttribute("data-f"); });
    antwortSichern(Number(v), frage.frage, Z.nfText || "");
    Z.nfText = ""; return render();
  }
  if (act === "nf-bogen-merken"){
    var w = Z.bogenWerte || {};
    var erste = FRAGEN_ZIGARETTE.filter(function(f){ return w[f.id] && w[f.id].trim(); })[0];
    antwortSichern(Number(v), erste ? erste.frage : "", erste ? w[erste.id] : "", w);
    Z.bogen = null; Z.bogenWerte = {}; return render();
  }

  /* ---- Vorhaben ---- */
  if (act === "vorhaben-sheet"){
    var cur = lauf().vorhaben;
    Z.vorhabenWahl = cur ? { art:cur.art, grenze:cur.grenze, n:cur.n, ab:"heute" }
                         : { art:"unter", grenze:5, n:1, ab:"heute" };
    Z.bogen = { art:"vorhaben" }; return render();
  }
  if (act === "vw-art"){ Z.vorhabenWahl.art = v;
    Z.vorhabenWahl.grenze = v === "spaeter" ? 12 : 5; return render(); }
  if (act === "vw-grenze"){ Z.vorhabenWahl.grenze = Number(v); return render(); }
  if (act === "vw-n"){ Z.vorhabenWahl.n = Number(v); return render(); }
  if (act === "vw-ab"){ Z.vorhabenWahl.ab = v; return render(); }
  if (act === "vorhaben-merken"){
    var w2 = Z.vorhabenWahl;
    lauf().vorhaben = { art:w2.art, grenze:w2.grenze, n:w2.n,
      ab: w2.ab === "morgen" ? verschiebe(datum(), 1) : datum() };
    Z.bogen = null; sichern(); return render();
  }
  if (act === "vorhaben-weg"){ lauf().vorhaben = null; Z.bogen = null; sichern(); return render(); }
  if (act === "vorhaben-nochmal"){
    var alt = lauf().vorhaben;
    lauf().vorhaben = Object.assign({}, alt, { ab: verschiebe(datum(), 1) });
    sichern(); return render();
  }
  if (act === "vorhaben-weiter"){
    var alt2 = lauf().vorhaben;
    lauf().vorhaben = Object.assign({}, alt2, { n: Number(v), ab: verschiebe(datum(), 1) });
    sichern(); return render();
  }

  /* ---- Rückmeldebogen ---- */
  if (act === "rueck-sheet"){ Z.bogen = { art:"rueck", datum:v }; return render(); }
  if (act === "ton"){
    var l3 = lauf(), d3 = Z.bogen.datum, t3 = Object.assign({}, tagVon(l3, d3));
    var toene = (t3.toene || []).slice();
    var i3 = toene.indexOf(v);
    if (i3 >= 0) toene.splice(i3, 1); else toene.push(v);
    t3.toene = toene; l3.tage[d3] = t3; sichern(); return render();
  }
  if (act === "rueck-merken"){ Z.bogen = null; sichern(); return render(); }

  /* ---- Budget ---- */
  if (act === "budget-sheet"){ Z.bogen = { art:"budget" }; return render(); }
  if (act === "budget-v"){ setzeTag({ budget: Number(v), gezaehlt: true }); Z.bogen = null; return render(); }

  /* ---- Regler ---- */
  if (act === "schraube"){
    var rid = el.getAttribute("data-x"), l4 = lauf();
    if (l4.stellung[rid] === v) return;
    l4.notizen = (l4.notizen || []).concat([{ zeit:new Date().toISOString(),
      text: "Stellungswechsel — " + reglerById(rid).name + ": " + l4.stellung[rid] + " → " + v }]);
    l4.stellung[rid] = v; sichern(); return render();
  }
  if (act === "preset"){
    var p = PRESETS.find(function(x){ return x.id === v; });
    starteLauf(p.name, p.stellung, p.these); return render();
  }
  if (act === "lauf-neu"){
    starteLauf(naechsterName(), Object.assign({}, stellung()), ""); Z.bogen = null; return render();
  }
  if (act === "lauf-waehlen"){ Z.aktiv = v; Z.bogen = null; sichern(); return render(); }
  if (act === "laufsheet"){ Z.bogen = { art:"lauf" }; return render(); }

  /* ---- Rückmeldung ---- */
  if (act === "fb"){
    Z.fbOffen = Z.fbOffen === v ? null : v; Z.fbTon = null; Z.fbText = ""; return render();
  }
  if (act === "fb-ton"){ Z.fbTon = Z.fbTon === v ? null : v; return render(); }
  if (act === "fb-merken"){
    var eintrag = {
      lauf: lauf().id, laufName: lauf().name, ort: v,
      ton: Z.fbTon || "mittel", text: (Z.fbText || "").trim(),
      stellung: Object.assign({}, stellung()), datum: datum(),
      zeit: new Date().toISOString(),
    };
    Z.rueckmeldungen.push(eintrag);
    schreibeRueckmeldung(eintrag);
    Z.fbOffen = null; Z.fbTon = null; Z.fbText = "";
    sichern(); return render();
  }

  /* ---- Notiz und Bilanz ---- */
  if (act === "notiz-sheet"){ Z.bogen = { art:"notiz" }; Z.notizText = ""; return render(); }
  if (act === "notiz-merken"){
    var txt = (Z.notizText || "").trim();
    if (txt) lauf().notizen = (lauf().notizen || []).concat([{ zeit:new Date().toISOString(), text:txt }]);
    Z.notizText = ""; Z.bogen = null; sichern(); return render();
  }
  if (act === "bilanz-sheet"){ Z.bogen = { art:"bilanz" }; return render(); }
  if (act === "bilanz-merken"){ Z.bogen = null; sichern(); return render(); }
});

function antwortSichern(nr, frage, text, alle){
  var t = Object.assign({}, tag());
  t.antworten = Object.assign({}, t.antworten);
  t.antworten[nr] = { frage: frage, text: (text || "").trim(), alle: alle || null,
                      zeit: new Date().toISOString() };
  t.offen = (t.offen || []).filter(function(o){ return o.nr !== nr; });
  setzeTag(t);
}

function naechsterName(){
  return "Lauf " + String.fromCharCode(65 + (Z.laeufe.length % 26));
}
function starteLauf(name, stell, these){
  var l = neuerLauf(name, stell, these);
  Z.laeufe.push(l); Z.aktiv = l.id; Z.ort = "tag"; Z.fbOffen = null;
  sichern();
}

/* =====================================================================
   Der Takt

   Nur für „Gleich" und „Am Abend": wenn eine wartende Nachfrage fällig
   wird, soll sie auftauchen, ohne dass jemand die Seite neu lädt. Aber
   nie, während getippt wird — ein Neuzeichnen unter dem Cursor wäre
   genau die Sorte Unhöflichkeit, die dieses Modul vermeiden will.
   ===================================================================== */

var letzteFaellig = -1;
setInterval(function(){
  var aktiv = document.activeElement;
  if (aktiv && (aktiv.tagName === "TEXTAREA" || aktiv.tagName === "INPUT")) return;
  var n = faellige().length;
  if (n !== letzteFaellig){ letzteFaellig = n; render(); }
}, 8000);

/* Die Datenbank meldet sich später; wenn sie da ist, steht es im Protokoll. */
datenbank().then(function(db){
  Z.dbDa = !!db;
  if (db) schreibeLauf(lauf());
  var s = document.getElementById("dbstand");
  if (s) s.textContent = Z.dbDa ? "Datenbank verbunden" : "nur lokal";
});

render();
