/*
 * Tests du modèle pur — `node test/model.test.mjs`.
 * Les « vérités à préserver » de l'épisode sont le contrat : ces tests ne se
 * suppriment pas, ils se complètent.
 */
import { strict as assert } from 'node:assert';
import {
  EPS, P_MER_FIN, P_MONTEE_FIN, P_NUAGE_FIN, P_PLUIE_FIN, ORDRE_ETAPES, ETAPES,
  pNormalise, etape, avancementEtape,
  SOLEIL, NIVEAU_SOL, MER_DROITE, MONTAGNE, ALTITUDE_FROID, hauteurMontagne,
  positionGoutte, altitude, temperature, TEMPERATURE_FROID, faitFroid, soleilChauffe, Y_FROID,
  FONDU, forme, visibilite, goutteToujoursLa,
  chargeNuage, positionNuage, ilPleut, forcePluie, debitRiviere,
  ecartement, regroupement, agitation,
  typographie, phraseDehors, phraseLoupe,
  LECTURE_TOUR_SEC, LECTURE_P_PAR_SEC, SCENARIOS, VOIX_TRANSITIONS,
  DEFI_ATTENTE_MS, DEFI_SORTIE_MARGE, DEFIS, dansFenetre, defiReussi, defiEncoreProche, deltaCourt,
  EMOJI_RE, texteOral
} from '../js/model.js';

var tests = [];
function test(nom, fn) { tests.push({ nom: nom, fn: fn }); }
function presque(a, b, tol) { assert.ok(Math.abs(a - b) <= (tol || 1e-9), a + ' ≉ ' + b); }
var PAS = 1 / 2000;

/* ------------------------------------------------------------------ */
/* Vérité n° 1 — après un tour complet, la goutte est revenue à la mer  */
/* ------------------------------------------------------------------ */

test('après un tour complet, la goutte est revenue exactement là d’où elle est partie', function () {
  var depart = positionGoutte(0);
  var arrivee = positionGoutte(1);
  presque(depart.x, arrivee.x);
  presque(depart.y, arrivee.y);
  assert.equal(etape(0), 'mer');
  assert.equal(etape(1), 'mer');
  assert.equal(etape(1 - 1e-6), 'riviere');
});

test('le chemin est continu : la goutte ne saute jamais, même aux frontières des étapes', function () {
  var precedent = positionGoutte(0);
  for (var p = PAS; p <= 1 + EPS; p += PAS) {
    var q = positionGoutte(p);
    var saut = Math.hypot(q.x - precedent.x, q.y - precedent.y);
    assert.ok(saut < 0.02, 'saut de ' + saut.toFixed(4) + ' à p = ' + p.toFixed(4));
    precedent = q;
  }
});

test('la goutte part de la mer et finit par la rivière : les étapes se suivent dans l’ordre du voyage', function () {
  var precedente = etape(0);
  assert.equal(precedente, 'mer');
  var vues = [precedente];
  for (var p = 0; p < 1; p += PAS) {
    var e = etape(p);
    if (e !== precedente) {
      var attendue = ORDRE_ETAPES[(ORDRE_ETAPES.indexOf(precedente) + 1) % ORDRE_ETAPES.length];
      assert.equal(e, attendue, 'à p = ' + p.toFixed(4) + ' : ' + precedente + ' → ' + e);
      precedente = e;
      vues.push(e);
    }
  }
  assert.deepEqual(vues, ORDRE_ETAPES);
});

test('la boucle se referme : p = 1 recommence comme p = 0, et les positions négatives reviennent par la fin', function () {
  presque(pNormalise(1), 0);
  presque(pNormalise(-0.1), 0.9);
  presque(pNormalise(1.25), 0.25);
  assert.equal(pNormalise(-1e-17) >= 0 && pNormalise(-1e-17) < 1, true);
});

/* ------------------------------------------------------------------ */
/* Vérité n° 2 — c'est le Soleil qui la fait monter                     */
/* ------------------------------------------------------------------ */

test('la goutte ne monte que pendant l’étape « ça monte », quand le Soleil la chauffe', function () {
  for (var p = 0; p < 1; p += PAS) {
    var dy = positionGoutte(p + PAS).y - positionGoutte(p).y;
    if (dy > 1e-6) {
      assert.equal(etape(p), 'montee', 'la goutte monte à p = ' + p.toFixed(4) + ' (' + etape(p) + ')');
      assert.ok(soleilChauffe(p), 'sans Soleil à p = ' + p.toFixed(4));
    }
  }
});

test('le Soleil chauffe la mer et la montée, jamais le nuage ni la pluie', function () {
  assert.ok(soleilChauffe(0.05));
  assert.ok(soleilChauffe(0.2));
  assert.ok(!soleilChauffe(0.46));
  assert.ok(!soleilChauffe(0.66));
  assert.ok(!soleilChauffe(0.88));
});

test('le Soleil est fixe, en haut à gauche, au-dessus de la mer qu’il chauffe', function () {
  assert.ok(SOLEIL.x < MER_DROITE, 'le Soleil surplombe la mer');
  assert.ok(SOLEIL.y > 0.75, 'le Soleil est haut dans le ciel');
  assert.ok(SOLEIL.r > 0);
});

/* ------------------------------------------------------------------ */
/* Vérité n° 3 — invisible en montant, visible à nouveau dans le froid  */
/* ------------------------------------------------------------------ */

test('la goutte n’est jamais invisible ailleurs qu’en montant', function () {
  for (var p = 0; p < 1; p += PAS) {
    if (visibilite(p) < 1 - EPS) {
      assert.equal(etape(p), 'montee', 'invisible à p = ' + p.toFixed(4) + ' (' + etape(p) + ')');
    }
  }
});

test('au cœur de la montée, la goutte est complètement invisible : c’est de la vapeur', function () {
  var milieu = (P_MER_FIN + P_MONTEE_FIN) / 2;
  assert.equal(visibilite(milieu), 0);
  assert.equal(forme(milieu), 'vapeur');
  assert.equal(visibilite(P_MER_FIN + FONDU + 0.001), 0);
  assert.equal(visibilite(P_MONTEE_FIN - FONDU - 0.001), 0);
});

test('elle ne réapparaît que là où il fait froid, tout en haut', function () {
  var invisibleVue = false;
  for (var p = P_MER_FIN; p < P_MONTEE_FIN; p += PAS) {
    if (visibilite(p) === 0) invisibleVue = true;
    if (invisibleVue && visibilite(p) > 0) {
      assert.ok(faitFroid(p), 'réapparue au chaud à p = ' + p.toFixed(4) + ' (altitude ' + altitude(p).toFixed(3) + ')');
    }
  }
  assert.ok(invisibleVue);
  assert.ok(faitFroid(P_MONTEE_FIN), 'au début du nuage il fait froid');
});

test('la disparition et la réapparition sont douces (fondus) et complètes', function () {
  presque(visibilite(P_MER_FIN), 1);
  presque(visibilite(P_MER_FIN + FONDU), 0);
  presque(visibilite(P_MONTEE_FIN - FONDU), 0);
  presque(visibilite(P_MONTEE_FIN - 1e-9), 1, 1e-6);
  presque(visibilite(P_MONTEE_FIN), 1);
});

/* ------------------------------------------------------------------ */
/* Vérité n° 4 — l'eau ne disparaît jamais, c'est la même goutte        */
/* ------------------------------------------------------------------ */

test('la goutte est là à chaque instant du voyage, même quand on ne la voit pas', function () {
  var formes = { liquide: 0, vapeur: 0, gouttelette: 0, goutte: 0 };
  for (var p = 0; p < 1; p += PAS) {
    assert.ok(goutteToujoursLa(p));
    var f = forme(p);
    assert.ok(f in formes, 'forme inconnue : ' + f);
    formes[f]++;
    var pos = positionGoutte(p);
    assert.ok(pos.x >= 0 && pos.x <= 1 && pos.y >= 0 && pos.y <= 1, 'hors scène à p = ' + p.toFixed(4));
  }
  Object.keys(formes).forEach(function (f) { assert.ok(formes[f] > 0, 'forme jamais prise : ' + f); });
});

test('la forme suit l’étape : liquide dans la mer et la rivière, vapeur en montant, gouttelette dans le nuage, goutte de pluie', function () {
  assert.equal(forme(0.05), 'liquide');
  assert.equal(forme(0.2), 'vapeur');
  assert.equal(forme(0.46), 'gouttelette');
  assert.equal(forme(0.66), 'goutte');
  assert.equal(forme(0.88), 'liquide');
});

/* ------------------------------------------------------------------ */
/* Vérité n° 5 — plus on monte, plus il fait froid                      */
/* ------------------------------------------------------------------ */

test('la température ne fait que baisser quand on monte', function () {
  var precedente = temperature(0);
  presque(precedente, 1);
  for (var a = 0.01; a <= 1; a += 0.01) {
    var t = temperature(a);
    assert.ok(t < precedente, 'il fait plus chaud en montant à l’altitude ' + a.toFixed(2));
    precedente = t;
  }
  presque(temperature(1), 0);
});

test('il fait chaud dans la mer, froid dans le nuage', function () {
  assert.ok(!faitFroid(0.05));
  assert.ok(faitFroid(0.46));
  assert.ok(temperature(altitude(0.05)) > TEMPERATURE_FROID);
  assert.ok(temperature(altitude(0.46)) <= TEMPERATURE_FROID + EPS);
  for (var p = P_MONTEE_FIN; p < P_NUAGE_FIN; p += PAS) {
    assert.ok(faitFroid(p), 'le nuage vit dans le froid (p = ' + p.toFixed(4) + ')');
  }
});

test('le sommet de la montagne est au-dessus de l’altitude du froid : il y a de la neige là-haut', function () {
  var altSommet = (MONTAGNE.sommet.y - NIVEAU_SOL) / (1 - NIVEAU_SOL);
  assert.ok(altSommet < 1);
  assert.ok(altSommet > ALTITUDE_FROID, 'le sommet dépasse l’altitude du froid');
  assert.ok(MONTAGNE.sommet.y > Y_FROID && Y_FROID > NIVEAU_SOL);
  assert.ok(hauteurMontagne(MONTAGNE.sommet.x) === MONTAGNE.sommet.y);
  assert.equal(hauteurMontagne(0.1), NIVEAU_SOL);
  assert.ok(hauteurMontagne(0.66) > NIVEAU_SOL && hauteurMontagne(0.66) < MONTAGNE.sommet.y);
});

/* ------------------------------------------------------------------ */
/* Vérité n° 6 — il ne pleut jamais depuis un ciel sans nuage           */
/* ------------------------------------------------------------------ */

test('il ne pleut que d’un nuage chargé', function () {
  var aPlu = false;
  for (var p = 0; p < 1; p += PAS) {
    if (ilPleut(p)) {
      aPlu = true;
      assert.ok(chargeNuage(p) > 0, 'pluie sans nuage à p = ' + p.toFixed(4));
    }
  }
  assert.ok(aPlu);
});

test('le nuage naît dans le froid, grossit jusqu’à la pluie, se vide en pleuvant, puis disparaît', function () {
  assert.equal(chargeNuage(0.05), 0);
  assert.equal(chargeNuage(0.2), 0);
  assert.ok(chargeNuage(P_MONTEE_FIN) > 0);
  var precedente = chargeNuage(P_MONTEE_FIN);
  for (var p = P_MONTEE_FIN + PAS; p < P_NUAGE_FIN; p += PAS) {
    assert.ok(chargeNuage(p) >= precedente, 'le nuage maigrit avant la pluie à p = ' + p.toFixed(4));
    precedente = chargeNuage(p);
  }
  presque(chargeNuage(P_NUAGE_FIN - 1e-9), 1, 1e-6);
  for (p = P_NUAGE_FIN + PAS; p < P_PLUIE_FIN; p += PAS) {
    assert.ok(chargeNuage(p) <= precedente + EPS, 'le nuage grossit en pleuvant à p = ' + p.toFixed(4));
    precedente = chargeNuage(p);
  }
  assert.equal(chargeNuage(0.95), 0);
});

test('la pluie tombe sur la montagne, et la rivière ramène l’eau du pied de la montagne à la mer', function () {
  var atterrissage = positionGoutte(P_PLUIE_FIN - 1e-9);
  assert.ok(atterrissage.x > MONTAGNE.piedGauche && atterrissage.x < MONTAGNE.sommet.x);
  presque(atterrissage.y, hauteurMontagne(atterrissage.x), 1e-3);
  var precedente = atterrissage.x;
  for (var p = P_PLUIE_FIN; p < 1; p += PAS) {
    var x = positionGoutte(p).x;
    assert.ok(x <= precedente + 1e-9, 'la rivière remonte vers la montagne à p = ' + p.toFixed(4));
    precedente = x;
  }
  assert.ok(positionGoutte(1 - 1e-9).x <= MER_DROITE, 'la goutte finit dans la mer');
  assert.equal(forcePluie(0.5), 0);
  assert.equal(forcePluie(0.6), 1);
  assert.ok(debitRiviere(0.88) > debitRiviere(0.05));
});

test('le nuage pleut au-dessus de la montagne, là où la goutte tombe', function () {
  var n = positionNuage(0.66);
  var chute = positionGoutte(P_NUAGE_FIN);
  presque(n.x, chute.x, 0.02);
  assert.ok(n.y > chute.y - 0.05);
});

/* ------------------------------------------------------------------ */
/* Ce qu'on voit à la loupe                                              */
/* ------------------------------------------------------------------ */

test('à la loupe, les billes sont serrées dans l’eau, éparses dans la vapeur, en petits amas dans le nuage', function () {
  assert.ok(ecartement(0.05) < 0.3);
  presque(ecartement((P_MER_FIN + P_MONTEE_FIN) / 2), 1);
  assert.ok(ecartement(0.5) > 0.3 && ecartement(0.5) < 0.7);
  assert.ok(ecartement(0.66) < 0.1);
  assert.equal(regroupement(0.05), 0);
  assert.equal(regroupement(0.5), 1);
  assert.ok(regroupement(0.7) < 0.1);
  for (var p = 0; p < 1; p += PAS) {
    assert.ok(ecartement(p) >= 0 && ecartement(p) <= 1);
    assert.ok(regroupement(p) >= 0 && regroupement(p) <= 1);
    assert.ok(agitation(p) > 0 && agitation(p) <= 1);
  }
  assert.ok(agitation(0.05) > agitation(0.46), 'les billes chaudes s’agitent plus que les froides');
});

/* ------------------------------------------------------------------ */
/* Les phrases, les scénarios, le jeu                                    */
/* ------------------------------------------------------------------ */

test('chaque instant a ses deux phrases, et elles racontent l’étape', function () {
  var attendus = { mer: /mer/i, montee: /disparaît|voit plus|réapparaît/i, nuage: /nuage/i, pluie: /pleut|tombe/i, riviere: /rivière|mer/i };
  for (var p = 0; p < 1; p += 0.005) {
    var d = phraseDehors(p);
    var l = phraseLoupe(p);
    assert.ok(d.length > 10 && l.length > 10);
    assert.ok(attendus[etape(p)].test(d), 'phrase hors sujet à p = ' + p.toFixed(3) + ' : ' + d);
    assert.ok(d.indexOf("'") === -1 && l.indexOf("'") === -1, 'apostrophe droite dans ' + d + l);
  }
});

test('la typographie française pose des insécables devant ! ? :', function () {
  assert.equal(typographie('Il pleut ! Regarde : là ?'), 'Il pleut\u202f! Regarde\u00a0: là\u202f?');
});

test('la lecture automatique fait un tour en ~85 s', function () {
  assert.equal(LECTURE_TOUR_SEC, 85);
  presque(LECTURE_P_PAR_SEC * LECTURE_TOUR_SEC, 1);
});

test('quatre scénarios, un par étape-clé, chacun posé au bon endroit du voyage et dans l’ordre', function () {
  assert.equal(SCENARIOS.length, 4);
  var etapesVoulues = ['montee', 'nuage', 'pluie', 'riviere'];
  var teintes = {};
  SCENARIOS.forEach(function (s, i) {
    assert.equal(etape(s.p), etapesVoulues[i], s.id);
    assert.ok(s.intro && s.dehors && s.loupe && s.label && s.sub && s.emoji);
    assert.ok(s.intro.indexOf('…') !== -1, 'l’intro est une amorce en suspens : ' + s.id);
    assert.ok(!teintes[s.teinte], 'teinte en double : ' + s.teinte);
    teintes[s.teinte] = true;
    if (i > 0) assert.ok(s.p > SCENARIOS[i - 1].p);
  });
  assert.equal(etape(SCENARIOS[0].p), 'montee');
  assert.equal(visibilite(SCENARIOS[0].p), 0, 'le premier scénario montre la goutte invisible');
  assert.ok(VOIX_TRANSITIONS.loupe.length > 5);
});

test('chaque défi se gagne dans une fenêtre où son moment est vraiment fabriqué', function () {
  assert.equal(DEFIS.length, 4);
  DEFIS.forEach(function (d) {
    assert.ok(defiReussi(d, d.pBravo), 'le point de bravo gagne le défi ' + d.id);
    assert.ok(d.consigne && d.bravo && d.emoji);
  });
  /* invisible : partout dans la fenêtre, la goutte est bien invisible */
  var inv = DEFIS[0];
  for (var p = inv.debut; p < inv.fin; p += PAS) assert.equal(visibilite(p), 0, 'visible dans la fenêtre « invisible » à p = ' + p.toFixed(4));
  /* nuage : un nuage chargé, pas de pluie */
  var nuage = DEFIS[1];
  for (p = nuage.debut; p < nuage.fin; p += PAS) { assert.ok(chargeNuage(p) > 0); assert.ok(!ilPleut(p)); }
  /* pluie : il pleut */
  var pluie = DEFIS[2];
  for (p = pluie.debut; p < pluie.fin; p += PAS) assert.ok(ilPleut(p));
  /* mer : la goutte est liquide et dans la mer, de part et d'autre du 0 */
  var mer = DEFIS[3];
  assert.ok(mer.debut > mer.fin, 'la fenêtre de la mer chevauche le début de la boucle');
  assert.ok(defiReussi(mer, 0.98) && defiReussi(mer, 0.02) && !defiReussi(mer, 0.5));
  assert.equal(forme(0.98), 'liquide');
  assert.ok(positionGoutte(0.98).x <= MER_DROITE + 1e-9);
});

test('les fenêtres des défis ne se recouvrent pas, et aucun état n’en gagne deux à la fois', function () {
  for (var p = 0; p < 1; p += PAS) {
    var gagnes = DEFIS.filter(function (d) { return defiReussi(d, p); }).length;
    assert.ok(gagnes <= 1, gagnes + ' défis gagnés à p = ' + p.toFixed(4));
  }
});

test('l’hystérésis : le bravo se range plus loin qu’il ne se gagne', function () {
  DEFIS.forEach(function (d) {
    var juste = pNormalise(d.fin + DEFI_SORTIE_MARGE / 2);
    assert.ok(!defiReussi(d, juste), d.id);
    assert.ok(defiEncoreProche(d, juste), d.id);
    assert.ok(!defiEncoreProche(d, pNormalise(d.fin + DEFI_SORTIE_MARGE * 2)), d.id);
  });
  assert.ok(DEFI_ATTENTE_MS >= 200);
});

test('la fenêtre chevauchant le 0 et le plus court chemin sur la boucle', function () {
  assert.ok(dansFenetre(0.99, 0.97, 0.05));
  assert.ok(dansFenetre(0.02, 0.97, 0.05));
  assert.ok(!dansFenetre(0.5, 0.97, 0.05));
  presque(deltaCourt(0.9, 0.1), 0.2);
  presque(deltaCourt(0.1, 0.9), -0.2);
  presque(deltaCourt(0.2, 0.6), 0.4);
});

/* ------------------------------------------------------------------ */
/* Le texte oral                                                         */
/* ------------------------------------------------------------------ */

test('la voix ne lit ni les émojis, ni les guillemets, et recolle la ponctuation', function () {
  assert.equal(texteOral('Il pleut ☁️ .'), 'Il pleut.');
  assert.equal(texteOral('Un nuage ! 🌧️.'), 'Un nuage !');
  assert.equal(texteOral('On dit « vapeur »… en vrai'), 'On dit vapeur… en vrai');
  assert.equal(texteOral('la mer — et la rivière — pareil'), 'la mer, et la rivière, pareil');
  SCENARIOS.forEach(function (s) {
    [s.intro, s.dehors, s.loupe].forEach(function (t) {
      assert.ok(!EMOJI_RE.test(texteOral(t)));
      EMOJI_RE.lastIndex = 0;
    });
  });
  DEFIS.forEach(function (d) {
    assert.ok(!EMOJI_RE.test(texteOral(d.consigne)));
    EMOJI_RE.lastIndex = 0;
    assert.ok(!EMOJI_RE.test(texteOral(d.bravo)));
    EMOJI_RE.lastIndex = 0;
  });
});

test('les étapes du registre couvrent toute la boucle, sans trou ni recouvrement', function () {
  var fin = 0;
  ORDRE_ETAPES.forEach(function (id) {
    var e = ETAPES[id];
    presque(e.debut, fin);
    assert.ok(e.fin > e.debut);
    assert.ok(e.nom && e.emoji);
    fin = e.fin;
  });
  presque(fin, 1);
  presque(avancementEtape(P_MER_FIN), 0);
  presque(avancementEtape(P_MONTEE_FIN - 1e-9), 1, 1e-6);
});

/* ------------------------------------------------------------------ */

var echecs = 0;
tests.forEach(function (t) {
  try {
    t.fn();
    console.log('  ✓ ' + t.nom);
  } catch (e) {
    echecs++;
    console.error('  ✗ ' + t.nom + '\n      ' + (e && e.message ? e.message : e));
  }
});
console.log('\n' + (tests.length - echecs) + '/' + tests.length + ' tests verts');
if (echecs) process.exit(1);
