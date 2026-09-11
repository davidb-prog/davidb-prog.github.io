/*
 * Le câblage de la page : boucle de rendu résiliente, lecture automatique,
 * geste-signature (promener la goutte), curseur maître, scénarios racontés,
 * jeu des défis, conteur (voix enregistrée + repli synthèse) et médaillon
 * mobile. Toute la connaissance du phénomène vit dans js/model.js — ici on
 * ne fait que brancher.
 */
import {
  pNormalise, etape, phraseDehors, phraseLoupe, typographie, texteOral,
  LECTURE_P_PAR_SEC, SCENARIOS, VOIX_TRANSITIONS,
  DEFIS, DEFI_ATTENTE_MS, defiReussi, defiEncoreProche, deltaCourt
} from './model.js';
import { creerVueDehors } from './vue-dehors.js';
import { creerVueLoupe, dessinerMiniLoupe } from './vue-loupe.js';

var $ = function (id) { return document.getElementById(id); };

/* ------------------------------------------------------------------ */
/* L'état                                                              */
/* ------------------------------------------------------------------ */

var mouvementReduit = false;
if (window.matchMedia) {
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mouvementReduit = !!mq.matches;
  if (mq.addEventListener) mq.addEventListener('change', function (e) { mouvementReduit = !!e.matches; });
}

/* Le seuil mobile UNIQUE de l'épisode : 880 px — le même que la grille CSS. */
var estMobile = false;
var mqMobile = window.matchMedia ? window.matchMedia('(max-width: 879px)') : null;
if (mqMobile) {
  estMobile = !!mqMobile.matches;
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', function (e) { estMobile = !!e.matches; });
}

/* On ouvre juste avant la disparition : la goutte flotte dans la mer, le
 * Soleil chauffe — et la lecture la fait s'envoler sous les yeux. */
var P_DEPART = 0.04;

var etat = {
  p: P_DEPART,               /* la position de la goutte sur son voyage, [0, 1[ */
  lecture: !mouvementReduit, /* le voyage avance tout seul (un tour en ~85 s) */
  glissement: null,          /* { depart, delta, cible, t0, duree } pendant un scénario */
  scenarioActif: null,
  glisse: false,
  pFabrique: true            /* faux après un scénario, jusqu'au prochain geste de l'enfant */
};

/* ------------------------------------------------------------------ */
/* Les éléments et les vues                                            */
/* ------------------------------------------------------------------ */

var canvasDehors = $('canvas-dehors');
var canvasLoupe = $('canvas-loupe');
var canvasDehorsJeu = $('canvas-dehors-jeu');
var canvasLoupeJeu = $('canvas-loupe-jeu');
var curseur = $('curseur-voyage');
var phraseDehorsEl = $('phrase-dehors');
var phraseLoupeEl = $('phrase-loupe');
var bulleGeste = $('bulle-geste');
var boutonLecture = $('bouton-lecture');
var boutonEcouter = $('bouton-ecouter');
var conseilVoix = $('conseil-voix');
var texteExplication = $('texte-explication');
var explicationPli = $('explication-pli');
var medaillon = $('medaillon-loupe');
var canvasMedaillon = $('canvas-medaillon');
var zoneJeu = $('zone-jeu');

var vueDehors = creerVueDehors(canvasDehors);
var vueLoupe = creerVueLoupe(canvasLoupe);
var vueDehorsJeu = creerVueDehors(canvasDehorsJeu);
var vueLoupeJeu = creerVueLoupe(canvasLoupeJeu);

/* ------------------------------------------------------------------ */
/* Lecture automatique et reprise en main                              */
/* ------------------------------------------------------------------ */

function fixerLecture(enMarche) {
  etat.lecture = enMarche;
  boutonLecture.setAttribute('aria-pressed', enMarche ? 'true' : 'false');
  boutonLecture.setAttribute('aria-label', enMarche
    ? 'Mettre en pause (le voyage avance tout seul)'
    : 'Relancer le voyage qui avance tout seul');
}

/* L'utilisateur reprend la main : le glissement s'arrête, la lecture se met
 * en pause, l'histoire affichée s'efface et la voix se tait. */
function reprendreLaMain() {
  etat.glissement = null;
  if (etat.lecture) fixerLecture(false);
  effacerHistoire(true);
}

/* Reprendre la main EN DOUCEUR (promener la goutte, tirer le curseur) : le
 * glissement s'arrête et la lecture se met en pause, mais l'histoire du
 * scénario reste affichée tant que la goutte reste dans son étape, et la
 * voix finit ce qu'elle dit (l'enfant écoute ET joue). */
function reprendreLaMainDoucement() {
  etat.glissement = null;
  etat.pFabrique = true; /* la main de l'enfant : le jeu peut se gagner */
  if (etat.lecture) fixerLecture(false);
}

function effacerHistoire(couperLaVoix) {
  if (etat.scenarioActif === null) return;
  etat.scenarioActif = null;
  rafraichirBoutonsScenarios();
  afficherInvite();
  if (!narrateur) return;
  if (couperLaVoix) narrateur.stop(); else narrateur.finirDoucement('scn-');
}

function scenarioParId(id) {
  for (var i = 0; i < SCENARIOS.length; i++) if (SCENARIOS[i].id === id) return SCENARIOS[i];
  return null;
}

function surveillerHistoire() {
  if (etat.scenarioActif === null || etat.glissement) return;
  var scn = scenarioParId(etat.scenarioActif);
  if (scn && etape(etat.p) !== etape(scn.p)) effacerHistoire(false);
}

function basculerLecture() {
  etat.glissement = null;
  if (etat.scenarioActif !== null) {
    etat.scenarioActif = null;
    rafraichirBoutonsScenarios();
    afficherInvite();
  }
  fixerLecture(!etat.lecture);
}

boutonLecture.addEventListener('click', basculerLecture);
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space' && !e.target.closest('button, input, a, summary, select')) {
    e.preventDefault();
    basculerLecture();
  }
});

/* Safari iOS ignore user-scalable=no depuis iOS 10 : on neutralise aussi le
 * zoom pincé de la page par son événement propriétaire. */
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

/* ------------------------------------------------------------------ */
/* Changer de position sur le voyage                                   */
/* ------------------------------------------------------------------ */

var curseurTenu = false;

function fixerP(p) {
  etat.p = pNormalise(p);
}

curseur.addEventListener('input', function () {
  reprendreLaMainDoucement();
  fixerP(parseFloat(curseur.value) / 100);
  surveillerHistoire();
});
curseur.addEventListener('pointerdown', function () { curseurTenu = true; });
window.addEventListener('pointerup', function () { curseurTenu = false; });
window.addEventListener('pointercancel', function () { curseurTenu = false; });

/* ------------------------------------------------------------------ */
/* Le geste-signature : promener la goutte                              */
/* ------------------------------------------------------------------ */

function cacherBulleGeste() {
  if (bulleGeste) bulleGeste.classList.add('cachee');
}
window.setTimeout(cacherBulleGeste, 8000);

function coordonneesCanvas(canvas, e) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

/* UN SEUL brancheur pour la grande vue ET la vue du jeu. */
function brancherGesteGoutte(canvas, vue) {
  /* UN SEUL doigt tient la goutte : le pointeur qui l'a attrapée est mémorisé,
   * les autres sont ignorés jusqu'au relâcher (une main d'enfant posée à
   * plat ferait sauter la goutte sous le premier doigt). */
  var pointeurTenant = null;

  canvas.addEventListener('pointerdown', function (e) {
    if (pointeurTenant !== null) { e.preventDefault(); return; }
    var c = coordonneesCanvas(canvas, e);
    if (!vue.attrapeGoutte(c.x, c.y, etat.p)) return;
    pointeurTenant = e.pointerId;
    etat.glisse = true;
    reprendreLaMainDoucement();
    surveillerHistoire();
    cacherBulleGeste();
    canvas.classList.add('attrape');
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!etat.glisse || e.pointerId !== pointeurTenant) return;
    var c = coordonneesCanvas(canvas, e);
    /* la position courante guide la recherche : la goutte suit le doigt le
     * long de son chemin, sans jamais sauter d'une étape à une autre */
    fixerP(vue.pDepuisPointeur(c.x, c.y, etat.p));
    surveillerHistoire();
    e.preventDefault();
  });

  function lacherLaGoutte(e) {
    if (e && e.pointerId !== pointeurTenant) return;
    pointeurTenant = null;
    etat.glisse = false;
    canvas.classList.remove('attrape');
  }
  canvas.addEventListener('pointerup', lacherLaGoutte);
  canvas.addEventListener('pointercancel', lacherLaGoutte);

  /* Repli des vieux mobiles qui ignorent touch-action : le toucher posé sur
   * un canvas appartient au geste, jamais au défilement de la page. */
  canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
}

brancherGesteGoutte(canvasDehors, vueDehors);
brancherGesteGoutte(canvasDehorsJeu, vueDehorsJeu);

/* ------------------------------------------------------------------ */
/* Les boutons-scénarios et leurs micro-histoires                       */
/* ------------------------------------------------------------------ */

var boutonsScenarios = {};
var conteneurScenarios = $('boutons-scenarios');
var histoireScn = $('histoire-scn');

SCENARIOS.forEach(function (scn) {
  var bouton = document.createElement('button');
  bouton.className = 'scn scn-' + scn.teinte;
  bouton.setAttribute('aria-pressed', 'false');
  var emoji = document.createElement('span');
  emoji.className = 'scn-emoji';
  emoji.textContent = scn.emoji;
  var label = document.createElement('span');
  label.textContent = typographie(scn.label);
  var sub = document.createElement('span');
  sub.className = 'scn-sub';
  sub.textContent = scn.sub;
  bouton.appendChild(emoji); bouton.appendChild(label); bouton.appendChild(sub);
  bouton.addEventListener('click', function () { jouerScenario(scn); });
  conteneurScenarios.appendChild(bouton);
  boutonsScenarios[scn.id] = bouton;
});

function rafraichirBoutonsScenarios() {
  for (var id in boutonsScenarios) {
    var actif = etat.scenarioActif === id;
    boutonsScenarios[id].classList.toggle('actif', actif);
    boutonsScenarios[id].setAttribute('aria-pressed', actif ? 'true' : 'false');
  }
}

function afficherInvite() {
  histoireScn.innerHTML = '';
  var p = document.createElement('p');
  p.className = 'invite-scn';
  p.textContent = typographie('Appuie sur un moment : la goutte glisse jusque-là, puis on raconte le même instant deux fois — dehors, et à la loupe.');
  histoireScn.appendChild(p);
}

function afficherHistoire(scn) {
  histoireScn.innerHTML = '';
  var lignes = [
    { cls: 'puce-histoire-dehors', puce: '🏔️ dehors', texte: scn.dehors },
    { cls: 'puce-histoire-loupe', puce: '🔍 à la loupe', texte: scn.loupe }
  ];
  lignes.forEach(function (ligne) {
    var rangee = document.createElement('div');
    rangee.className = 'ligne-histoire';
    var puce = document.createElement('span');
    puce.className = 'puce-histoire ' + ligne.cls;
    puce.textContent = ligne.puce;
    var texte = document.createElement('p');
    texte.className = 'texte-histoire';
    texte.textContent = typographie(ligne.texte); /* insécables à l'affichage seulement : la voix lit le texte du corpus */
    rangee.appendChild(puce); rangee.appendChild(texte);
    histoireScn.appendChild(rangee);
  });
}

/* La goutte glisse en douceur jusqu'au moment choisi — toujours vers
 * l'avant, le vrai sens du voyage de l'eau. */
function jouerScenario(scn) {
  fixerLecture(false);
  /* le scénario finit dans la fenêtre d'un défi : jeu ouvert, il le gagnait
   * sans que l'enfant fabrique rien. Le jeu ne se regagne qu'après un geste. */
  etat.pFabrique = false;
  etat.scenarioActif = scn.id;
  rafraichirBoutonsScenarios();
  afficherHistoire(scn);
  raconterScenario();
  /* Les vues sont plus haut dans la page : on les ramène à l'écran pour que
   * l'enfant VOIE la goutte voyager. */
  var grille = document.querySelector('.grille-vues');
  var cadre = grille.getBoundingClientRect();
  var blocs = grille.children;
  var empilees = blocs.length > 1 &&
    blocs[1].getBoundingClientRect().top >= blocs[0].getBoundingClientRect().bottom - 1;
  if (empilees) {
    var cible = Math.max(0, window.scrollY + cadre.top - 8);
    if (Math.abs(window.scrollY - cible) > 30) {
      if (!mouvementReduit && 'scrollBehavior' in document.documentElement.style) {
        window.scrollTo({ top: cible, behavior: 'smooth' });
      } else {
        window.scrollTo(0, cible);
      }
    }
  } else if (cadre.bottom < 120 || cadre.top > window.innerHeight - 120) {
    /* Remonter juste assez pour voir les vues, SANS perdre de vue le bouton
     * qu'on vient de presser : entre « les vues en haut de l'écran » et « la
     * rangée des boutons encore visible en bas », la position la plus basse. */
    var scene = $('panneau-scene').getBoundingClientRect();
    var rangBoutons = document.querySelector('.boutons-scenarios').getBoundingClientRect();
    var cibleVues = window.scrollY + scene.top - 8;
    var cibleBoutons = window.scrollY + rangBoutons.bottom - window.innerHeight + 16;
    var cibleScene = Math.max(0, Math.max(cibleVues, cibleBoutons));
    if (!mouvementReduit && 'scrollBehavior' in document.documentElement.style) {
      window.scrollTo({ top: cibleScene, behavior: 'smooth' });
    } else {
      window.scrollTo(0, cibleScene);
    }
  }
  var delta = pNormalise(scn.p - etat.p);
  if (mouvementReduit || delta < 0.002 || delta > 0.998) {
    etat.glissement = null;
    fixerP(scn.p);
    return;
  }
  etat.glissement = {
    depart: etat.p, delta: delta, cible: scn.p,
    t0: performance.now(), duree: Math.min(3200, 700 + delta * 3000)
  };
}

/* ------------------------------------------------------------------ */
/* La boucle de rendu (résiliente, et sobre : rien ne se redessine      */
/* quand rien ne change — en pause, zéro travail par frame)             */
/* ------------------------------------------------------------------ */

function ajusterCanvas(canvas) {
  var rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return;
  var dpr = window.devicePixelRatio || 1;
  var w = Math.round(rect.width * dpr);
  var h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function adoucir(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

var texteCache = {};
function fixerTexte(cle, el, valeur) {
  if (texteCache[cle] === valeur) return;
  texteCache[cle] = valeur;
  el.textContent = valeur;
}

function rafraichirTextes() {
  fixerTexte('dehors', phraseDehorsEl, typographie(phraseDehors(etat.p)));
  fixerTexte('loupe', phraseLoupeEl, typographie(phraseLoupe(etat.p)));
  if (!curseurTenu) curseur.value = String(Math.round(etat.p * 1000) / 10);
}

var dessine = { p: -1, halo: -1, horloge: false, tailles: '' };
function cleTailles() {
  return canvasDehors.clientWidth + 'x' + canvasDehors.clientHeight +
    '|' + canvasLoupe.clientWidth + 'x' + canvasLoupe.clientHeight +
    '|' + (zoneJeu.hidden ? 'jeu-ferme' : canvasDehorsJeu.clientWidth) +
    '|' + (medaillon.hidden ? 'sans-medaillon' : canvasMedaillon.clientWidth);
}

var msPrecedent = performance.now();
function boucle(maintenant) {
  try {
    var dt = Math.min((maintenant - msPrecedent) / 1000, 0.1);
    msPrecedent = maintenant;
    if (etat.glissement) {
      var g = etat.glissement;
      var prog = Math.min(1, (maintenant - g.t0) / g.duree);
      etat.p = prog >= 1 ? g.cible : pNormalise(g.depart + g.delta * adoucir(prog));
      if (prog >= 1) etat.glissement = null;
    } else if (etat.lecture) {
      etat.p = pNormalise(etat.p + LECTURE_P_PAR_SEC * dt);
    }
    /* Le halo « attrape-moi » : plein pendant le glisser, respirant pendant
     * la lecture (la vue se redessine déjà à chaque image), sage en pause. */
    var halo = etat.glisse ? 1
      : (etat.lecture && !mouvementReduit ? 0.4 + 0.35 * Math.sin(maintenant / 550) : 0.45);
    /* L'horloge des frémissements (vagues, chaleur, billes) ne tourne que
     * pendant la lecture ou le glisser — en pause, la scène est figée. */
    var animer = (etat.lecture || etat.glisse || !!etat.glissement) && !mouvementReduit;
    var tailles = cleTailles();
    if (etat.p !== dessine.p || halo !== dessine.halo || animer || dessine.horloge || tailles !== dessine.tailles) {
      dessine.p = etat.p; dessine.halo = halo; dessine.horloge = animer; dessine.tailles = tailles;
      var horloge = animer ? maintenant : null;
      ajusterCanvas(canvasDehors);
      ajusterCanvas(canvasLoupe);
      vueDehors.rendre(etat.p, halo, horloge);
      vueLoupe.rendre(etat.p, horloge);
      if (!zoneJeu.hidden) {
        ajusterCanvas(canvasDehorsJeu);
        vueDehorsJeu.rendre(etat.p, halo, horloge);
        /* Sur mobile, le jeu n'a qu'une vue : la loupe est masquée par la
         * feuille de style, c'est le médaillon flottant qui la remplace. */
        if (canvasLoupeJeu.offsetWidth > 0) {
          ajusterCanvas(canvasLoupeJeu);
          vueLoupeJeu.rendre(etat.p, horloge);
        }
      }
      dessinerMedaillon();
      rafraichirTextes();
    }
    gererMedaillon();
    surveillerDefi(maintenant);
  } finally {
    /* la boucle survit à un raté de rendu ponctuel */
    window.requestAnimationFrame(boucle);
  }
}

/* ------------------------------------------------------------------ */
/* Le médaillon flottant (mobile) : la loupe, toujours visible          */
/* ------------------------------------------------------------------ */

function canvasHorsEcran(canvas) {
  var rect = canvas.getBoundingClientRect();
  var hauteur = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom < 80 || rect.top > hauteur - 80;
}

/* La place d'origine du médaillon (avant le pied de page) : le jeu l'ancre
 * dans son en-tête à l'ouverture, et l'y reprend au rangement. */
var placeMedaillon = medaillon.parentNode;
var suivantMedaillon = medaillon.nextSibling;
var enteteJeu = document.querySelector('.entete-jeu');
var panneauJeu = document.querySelector('.panneau-jeu');

function medaillonAncre() {
  return medaillon.parentNode === enteteJeu;
}

function placerMedaillon() {
  var ancrer = false;
  if (!zoneJeu.hidden) {
    var rect = enteteJeu.getBoundingClientRect();
    var hauteur = window.innerHeight || document.documentElement.clientHeight;
    ancrer = rect.bottom > 0 && rect.top < hauteur;
  }
  if (ancrer && !medaillonAncre()) enteteJeu.appendChild(medaillon);
  else if (!ancrer && medaillonAncre()) placeMedaillon.insertBefore(medaillon, suivantMedaillon);
}

function gererMedaillon() {
  placerMedaillon();
  var visible = estMobile && (medaillonAncre() || canvasHorsEcran(canvasLoupe));
  if (medaillon.hidden === !visible) return;
  medaillon.hidden = !visible;
  if (visible) dessinerMedaillon();
}

function dessinerMedaillon() {
  if (medaillon.hidden) return;
  ajusterCanvas(canvasMedaillon);
  var ctx = canvasMedaillon.getContext('2d');
  dessinerMiniLoupe(ctx, canvasMedaillon.width, canvasMedaillon.height, etat.p);
}

medaillon.addEventListener('click', function () {
  try {
    canvasLoupe.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'center' });
  } catch (e) {
    canvasLoupe.scrollIntoView(true);
  }
});

/* ------------------------------------------------------------------ */
/* Le conteur : la voix enregistrée (mp3 commités) + repli synthèse     */
/* ------------------------------------------------------------------ */

/* Le manifeste (assets/audio/manifest.json) liste les blocs enregistrés avec
 * leur texte oral exact. On ne joue un fichier que si son texte correspond
 * ENCORE au texte du site — la voix enregistrée ne ment jamais. Manifeste
 * vide ou absent : tout passe par la synthèse. */
var blocsAudio = {};
if (window.__VOIX_MANIFESTE && window.__VOIX_MANIFESTE.blocs) {
  blocsAudio = window.__VOIX_MANIFESTE.blocs;
} else if (window.fetch) {
  fetch('assets/audio/manifest.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) {
      if (m && m.blocs) blocsAudio = m.blocs;
      if (Object.keys(blocsAudio).length > 0 && conseilVoix) conseilVoix.hidden = true;
    })
    .catch(function () { /* hors ligne ou manifeste absent : synthèse seule */ });
}

function sourceAudio(id, texte) {
  var b = blocsAudio[id];
  if (!b || b.texte !== texte || !b.fichier) return null;
  return b.fichier.indexOf('data:') === 0 ? b.fichier : 'assets/audio/' + b.fichier;
}

/* une phrase par bulle (les longs textes d'une traite se font couper) */
function phrasesDe(texte, finDeBloc) {
  var bouts = texte.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*/g) || [];
  var morceaux = [];
  bouts.forEach(function (b) {
    if (b.trim()) morceaux.push({ texte: b.trim(), finDeBloc: false });
  });
  if (morceaux.length && finDeBloc) morceaux[morceaux.length - 1].finDeBloc = true;
  return morceaux;
}

var narrateur = null; /* { narrate(blocs, quandFini), stop(), finirDoucement(prefixe) } — null sans synthèse */

if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
  var voixFr = [];

  var scoreVoix = function (v) {
    var lang = (v.lang || '').replace('_', '-').toLowerCase();
    var nom = (v.name || '').toLowerCase();
    var score = 0;
    if (lang.indexOf('fr-fr') === 0) score += 60;
    else if (lang.indexOf('fr') === 0) score += 20;
    if (lang.indexOf('fr-ca') === 0) score -= 30;
    if (/natural|neural|online|premium|enhanced|am[ée]lior[ée]e|siri/.test(nom)) score += 30;
    if (nom.indexOf('google') !== -1) score += 24;
    if (/audrey|thomas|aur[ée]lie|marie|denise|henri|[ée]lo[ïi]se|vivienne|r[ée]my|jacqueline|charline|coralie|hortense/.test(nom)) score += 12;
    if (!v.localService) score += 6;
    if (/espeak|eloquence|compact|robot/.test(nom)) score -= 50;
    if (/eddy|\bflo\b|grandma|grandpa|\breed\b|rocko|sandy|shelley|jester|bells|organ|superstar|trinoids|whisper|zarvox|bad news|bahh|boing|bubbles|cellos|wobble/.test(nom)) score -= 40;
    return score;
  };

  var rafraichirVoix = function () {
    var toutes = window.speechSynthesis.getVoices();
    voixFr = [];
    for (var i = 0; i < toutes.length; i++) {
      if ((toutes[i].lang || '').replace('_', '-').toLowerCase().indexOf('fr') === 0) voixFr.push(toutes[i]);
    }
    voixFr.sort(function (a, b) { return scoreVoix(b) - scoreVoix(a); });
    if (conseilVoix) {
      var meilleure = voixFr.length ? scoreVoix(voixFr[0]) : -1;
      conseilVoix.hidden = meilleure >= 84 || Object.keys(blocsAudio).length > 0;
    }
  };
  rafraichirVoix();
  if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = rafraichirVoix;
  }

  var choisirVoix = function () { return voixFr.length ? voixFr[0] : null; };

  var generation = 0;
  var finEnCours = null;
  var lecteur = null;
  var obtenirLecteur = function () {
    if (!lecteur) lecteur = new Audio();
    return lecteur;
  };
  var prevenirFin = function () { var f = finEnCours; finEnCours = null; if (f) f(); };
  var finirApresLeBloc = false;
  var blocsEnCours = null;
  var finirDoucement = function (prefixe) {
    if (!blocsEnCours || blocsEnCours[0].id.indexOf(prefixe) !== 0) return;
    finirApresLeBloc = true;
  };
  var toutArreter = function () {
    generation++;
    finirApresLeBloc = false;
    window.speechSynthesis.cancel();
    if (lecteur) {
      try { lecteur.pause(); } catch (e) { /* déjà arrêté */ }
      lecteur.onended = null;
      lecteur.onerror = null;
    }
    prevenirFin();
  };

  /* le ton de conteur du repli synthèse : débit posé, relief sur ! ? … */
  var direLesPhrases = function (morceaux, maGen, fini) {
    var voix = choisirVoix();
    var indice = 0;
    var suivante = function () {
      if (maGen !== generation) return;
      if (indice >= morceaux.length || finirApresLeBloc) { fini(); return; }
      var m = morceaux[indice++];
      var u = new SpeechSynthesisUtterance(m.texte);
      u.lang = voix ? voix.lang : 'fr-FR';
      if (voix) u.voice = voix;
      u.rate = 0.92; u.pitch = 1.04;
      if (/!\s*$/.test(m.texte)) { u.rate = 0.96; u.pitch = 1.14; }
      else if (/\?\s*$/.test(m.texte)) { u.pitch = 1.12; }
      else if (m.texte.indexOf('…') !== -1) { u.rate = 0.87; }
      u.onend = function () {
        if (maGen !== generation) return;
        window.setTimeout(suivante, m.finDeBloc ? 620 : 300);
      };
      u.onerror = function () { if (maGen === generation) fini(); };
      window.speechSynthesis.speak(u);
    };
    suivante();
  };

  /* Les clips EN MÉMOIRE (Safari iOS ne réutilise pas le cache d'un fetch
   * pour un <audio>) : au départ d'une narration, tous ses clips se
   * téléchargent en parallèle en blobs ; le PREMIER part en src direct, dans
   * le geste de l'utilisateur. */
  var clipsEnMemoire = {};
  var chargerClip = function (src) {
    if (src.indexOf('data:') === 0 || !window.fetch || !window.URL || !URL.createObjectURL) {
      return Promise.resolve(src);
    }
    if (!clipsEnMemoire[src]) {
      clipsEnMemoire[src] = fetch(src)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then(function (b) { return URL.createObjectURL(b); })
        .catch(function () { delete clipsEnMemoire[src]; return src; });
    }
    return clipsEnMemoire[src];
  };

  var narrate = function (blocs, quandFini) {
    toutArreter();
    rafraichirVoix();
    var maGen = generation;
    blocsEnCours = blocs;
    finEnCours = quandFini || null;
    var indice = 0;
    if (window.Promise) {
      blocs.forEach(function (b) {
        var src = sourceAudio(b.id, b.texte);
        if (src) chargerClip(src);
      });
    }
    var suivant = function () {
      if (maGen !== generation) return;
      if (indice >= blocs.length || finirApresLeBloc) { prevenirFin(); return; }
      var premier = indice === 0;
      var bloc = blocs[indice++];
      var apres = function () { if (maGen === generation) window.setTimeout(suivant, 0); };
      var replie = false;
      var repli = function () {
        if (replie || maGen !== generation) return;
        replie = true;
        direLesPhrases(phrasesDe(bloc.texte, true), maGen, apres);
      };
      var src = sourceAudio(bloc.id, bloc.texte);
      if (!src) { repli(); return; }
      var a = obtenirLecteur();
      var pause = typeof bloc.pause === 'number' ? bloc.pause : 620;
      var jouer = function (url) {
        if (maGen !== generation) return;
        if (finirApresLeBloc) { prevenirFin(); return; }
        a.onended = function () { if (maGen === generation) window.setTimeout(apres, pause); };
        a.onerror = repli;
        a.src = url;
        var promesse = a.play();
        if (promesse && promesse.then) promesse.then(null, repli);
      };
      if (premier || !window.Promise) jouer(src);
      else chargerClip(src).then(jouer, function () { jouer(src); });
    };
    suivant();
  };
  narrateur = { narrate: narrate, stop: toutArreter, finirDoucement: finirDoucement };

  /* -- « 🔊 Écouter l'histoire » : la boîte d'explication, bloc par bloc -- */
  boutonEcouter.hidden = false;
  var lectureEnCours = false;
  var reposerBoutonEcouter = function () {
    lectureEnCours = false;
    boutonEcouter.textContent = '🔊 Écouter l’histoire';
    boutonEcouter.setAttribute('aria-pressed', 'false');
  };
  var lireExplication = function () {
    var blocs = [];
    var paragraphes = texteExplication.querySelectorAll('p');
    for (var i = 0; i < paragraphes.length; i++) {
      blocs.push({ id: 'histoire-' + (i + 1), texte: texteOral(paragraphes[i].textContent) });
    }
    narrateur.narrate(blocs, reposerBoutonEcouter);
    lectureEnCours = true;
    boutonEcouter.textContent = '⏹ Arrêter';
    boutonEcouter.setAttribute('aria-pressed', 'true');
  };
  boutonEcouter.addEventListener('click', function () {
    if (lectureEnCours) { narrateur.stop(); return; }
    lireExplication();
  });

  /* partir ailleurs coupe le conteur net — synthèse ET mp3 */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') narrateur.stop();
  });
  window.addEventListener('pagehide', function () { if (narrateur) narrateur.stop(); });
}

/* ------------------------------------------------------------------ */
/* La version sonore des scénarios et du jeu (bouton 🔇/🔊 jumeau)       */
/* ------------------------------------------------------------------ */

var boutonVoixScn = $('bouton-voix-scn');
var boutonVoixJeu = $('bouton-voix-jeu');
var voixActive = false;
/* clé de famille (même origine petit-labo.fr : le réglage suit l'enfant
 * d'un épisode à l'autre) */
try {
  voixActive = window.localStorage.getItem('petit-labo-son') === '1';
} catch (e) { /* mode privé */ }

function rafraichirBoutonsVoix() {
  boutonVoixScn.setAttribute('aria-pressed', voixActive ? 'true' : 'false');
  boutonVoixJeu.setAttribute('aria-pressed', voixActive ? 'true' : 'false');
}

function basculerVoix() {
  voixActive = !voixActive;
  try { window.localStorage.setItem('petit-labo-son', voixActive ? '1' : '0'); } catch (e) { /* tant pis */ }
  rafraichirBoutonsVoix();
  if (!narrateur) return;
  if (voixActive) raconterScenario(); else narrateur.stop();
}

if (narrateur) {
  boutonVoixJeu.hidden = false;
  rafraichirBoutonsVoix();
  boutonVoixScn.addEventListener('click', basculerVoix);
  boutonVoixJeu.addEventListener('click', basculerVoix);
} else {
  boutonVoixScn.hidden = true;
  boutonVoixJeu.hidden = true;
}

/* L'oral d'un scénario : la voix nomme le moment, puis raconte les deux
 * regards. Pause courte après les annonces : leurs mp3 finissent déjà sur
 * la suspension du « … ». */
function blocsScenario(scn) {
  return [
    { id: 'scn-' + scn.id + '-intro', texte: texteOral(scn.intro), pause: 120 },
    { id: 'scn-' + scn.id + '-dehors', texte: texteOral(scn.dehors) },
    { id: 'transition-loupe', texte: texteOral(VOIX_TRANSITIONS.loupe), pause: 120 },
    { id: 'scn-' + scn.id + '-loupe', texte: texteOral(scn.loupe) }
  ];
}

function raconterScenario() {
  if (!narrateur || !voixActive || etat.scenarioActif === null) return;
  var scn = scenarioParId(etat.scenarioActif);
  if (scn) narrateur.narrate(blocsScenario(scn));
}

/* ------------------------------------------------------------------ */
/* Le jeu « 🎯 Fabrique le moment ! »                                   */
/* ------------------------------------------------------------------ */

var boutonJouer = $('bouton-jouer');
var boutonEncore = $('bouton-encore');
var defiJeu = $('defi-jeu');
var bravoJeu = $('bravo-jeu');

var defi = null;        /* le défi en cours (null : jeu fermé) */
var panierDefis = [];   /* tirage SANS remise : chaque défi sort avant qu'on remélange */
var defiEntreeMs = null; /* entrée dans la fenêtre (tempo anti « gagné en passant ») */
var defiGagne = false;
var bravoVisible = false;

function raconterDefi(genre, texte) {
  if (narrateur && voixActive) {
    narrateur.narrate([{ id: 'defi-' + defi.id + '-' + genre, texte: texteOral(texte) }]);
  }
}

function remplirPanierDefis() {
  panierDefis = DEFIS.slice();
  for (var i = panierDefis.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var echange = panierDefis[i];
    panierDefis[i] = panierDefis[j];
    panierDefis[j] = echange;
  }
}

var dernierDefiId = null; /* survit au rangement du jeu (anti-répétition) */

function indiceDefiValide() {
  for (var i = 0; i < panierDefis.length; i++) {
    if (panierDefis[i].id === dernierDefiId) continue;
    if (!defiReussi(panierDefis[i], etat.p)) return i;
  }
  return -1;
}

function prochainDefi() {
  /* Tirage au panier, sans remise. Les fenêtres des quatre défis sont
   * disjointes : un état n'en gagne jamais plus d'un, il reste toujours au
   * moins deux candidats valides après remélange. */
  if (!panierDefis.length) remplirPanierDefis();
  var indice = indiceDefiValide();
  if (indice < 0) { remplirPanierDefis(); indice = indiceDefiValide(); }
  if (indice < 0) indice = 0; /* filet théorique */
  defi = panierDefis.splice(indice, 1)[0];
  dernierDefiId = defi.id;
  defiGagne = false;
  bravoVisible = false;
  defiEntreeMs = null;
  defiJeu.textContent = defi.emoji + ' ' + typographie(defi.consigne);
  bravoJeu.hidden = true;
  boutonEncore.hidden = true;
  raconterDefi('consigne', defi.consigne);
}

function gagnerDefi(maintenant) {
  var premiere = !defiGagne;
  defiGagne = true;
  bravoVisible = true;
  bravoJeu.textContent = '⭐ ' + typographie(defi.bravo);
  bravoJeu.hidden = false;
  boutonEncore.hidden = false;
  if (premiere) {
    raconterDefi('bravo', defi.bravo);
    /* Le recalage doux : la goutte glisse jusqu'au cœur du moment, par le
     * chemin court. Rien n'est verrouillé : un glisser annule aussitôt. */
    var delta = deltaCourt(etat.p, defi.pBravo);
    if (mouvementReduit || Math.abs(delta) < 0.002) {
      fixerP(defi.pBravo);
    } else {
      etat.glissement = { depart: etat.p, delta: delta, cible: defi.pBravo, t0: maintenant, duree: 700 };
    }
  }
}

/* La vérification vit dans la boucle : gagné quand la goutte RESTE un petit
 * instant dans la fenêtre — et le bravo ne ment jamais : il se range si
 * l'enfant repart loin (hystérésis), revient s'il refabrique le moment. */
function surveillerDefi(maintenant) {
  if (!defi || zoneJeu.hidden) return;
  if (bravoVisible) {
    if (!defiEncoreProche(defi, etat.p)) {
      bravoVisible = false;
      defiEntreeMs = null;
      bravoJeu.hidden = true;
    }
    return;
  }
  if (etat.glissement) return; /* rien ne se gagne pendant une animation */
  if (!etat.pFabrique) return; /* ni sur le point d'arrivée d'un scénario */
  if (defiReussi(defi, etat.p)) {
    if (defiEntreeMs === null) defiEntreeMs = maintenant;
    else if (maintenant - defiEntreeMs >= DEFI_ATTENTE_MS) gagnerDefi(maintenant);
  } else {
    defiEntreeMs = null;
  }
}

boutonJouer.addEventListener('click', function () {
  if (!zoneJeu.hidden) {
    zoneJeu.hidden = true;
    panneauJeu.classList.remove('jeu-ouvert');
    gererMedaillon();
    defi = null;
    boutonEncore.hidden = true;
    boutonJouer.textContent = '🎮 Jouer';
    boutonJouer.setAttribute('aria-expanded', 'false');
    return;
  }
  zoneJeu.hidden = false;
  panneauJeu.classList.add('jeu-ouvert');
  gererMedaillon();
  boutonJouer.textContent = '📦 Ranger le jeu';
  boutonJouer.setAttribute('aria-expanded', 'true');
  reprendreLaMain(); /* l'enfant prend la main : rien ne doit gagner tout seul */
  prochainDefi();
});
boutonEncore.addEventListener('click', prochainDefi);

/* ------------------------------------------------------------------ */
/* La boîte d'explication : repliée sur mobile, toujours ouverte sinon  */
/* ------------------------------------------------------------------ */

function surveillerPliExplication() {
  if (mqMobile && mqMobile.matches) return;
  explicationPli.open = true;
}
if (mqMobile && mqMobile.matches) explicationPli.open = false;
explicationPli.addEventListener('toggle', surveillerPliExplication);
if (mqMobile) {
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', surveillerPliExplication);
  else if (mqMobile.addListener) mqMobile.addListener(surveillerPliExplication);
}

/* ------------------------------------------------------------------ */
/* Démarrage : la goutte flotte dans la mer, et le voyage se met en     */
/* route tout seul.                                                     */
/* ------------------------------------------------------------------ */

afficherInvite();
fixerP(P_DEPART);
fixerLecture(etat.lecture);
window.requestAnimationFrame(boucle);
