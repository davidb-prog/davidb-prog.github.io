/*
 * Le modèle pur de l'épisode « D'où viennent les nuages ? »
 * Aucun accès DOM : tout se teste avec `node test/model.test.mjs`.
 *
 * L'état de l'épisode tient en UN nombre : la position `p` de la goutte sur
 * son grand voyage, dans [0, 1[ — la boucle qu'elle refait sans fin :
 *
 *   mer → ça monte (vapeur, invisible) → nuage (en haut, dans le froid)
 *       → pluie (sur la montagne) → rivière → mer…
 *
 * Conventions géométriques de la scène « Dehors » :
 * - coordonnées normalisées : x de 0 (gauche) à 1 (droite), y de 0 (bas)
 *   à 1 (haut) — les vues font elles-mêmes la bascule vers le canvas ;
 * - le PAYSAGE est l'objet-repère de l'épisode : la mer à gauche, la
 *   montagne à droite, le Soleil en haut à gauche au-dessus de la mer qu'il
 *   chauffe. Rien de tout ça ne bouge jamais à l'écran ;
 * - la goutte avance dans le sens du voyage quand p augmente.
 */

export var TAU = Math.PI * 2;

/* Epsilon des seuils (les bords des étapes, les comparaisons de position). */
export var EPS = 1e-9;

/* ------------------------------------------------------------------ */
/* Les étapes du voyage                                                */
/* ------------------------------------------------------------------ */

/* Les bornes des étapes sur la boucle [0, 1[. Elles gouvernent tout :
 * la forme de la goutte, sa visibilité, le nuage, la pluie, les phrases,
 * la piste du curseur. */
export var P_MER_FIN = 0.10;
export var P_MONTEE_FIN = 0.34;
export var P_NUAGE_FIN = 0.58;
export var P_PLUIE_FIN = 0.76;
/* la rivière va jusqu'à 1, puis la boucle recommence à la mer */

export var ORDRE_ETAPES = ['mer', 'montee', 'nuage', 'pluie', 'riviere'];

export var ETAPES = {
  mer: { nom: 'dans la mer', emoji: '🌊', debut: 0, fin: P_MER_FIN },
  montee: { nom: 'ça monte', emoji: '☀️', debut: P_MER_FIN, fin: P_MONTEE_FIN },
  nuage: { nom: 'dans le nuage', emoji: '☁️', debut: P_MONTEE_FIN, fin: P_NUAGE_FIN },
  pluie: { nom: 'il pleut', emoji: '🌧️', debut: P_NUAGE_FIN, fin: P_PLUIE_FIN },
  riviere: { nom: 'dans la rivière', emoji: '🏞️', debut: P_PLUIE_FIN, fin: 1 }
};

/* Ramène une position dans [0, 1[. */
export function pNormalise(p) {
  var r = p % 1;
  if (r < 0) r += 1;
  /* -1e-17 % 1 donne -1e-17 → +1 = 1 exactement : on le ramène à 0 */
  if (r >= 1) r = 0;
  return r;
}

/* L'étape où se trouve la goutte. */
export function etape(p) {
  var q = pNormalise(p);
  if (q < P_MER_FIN) return 'mer';
  if (q < P_MONTEE_FIN) return 'montee';
  if (q < P_NUAGE_FIN) return 'nuage';
  if (q < P_PLUIE_FIN) return 'pluie';
  return 'riviere';
}

/* Avancement dans l'étape courante, de 0 (on y entre) à 1 (on en sort). */
export function avancementEtape(p) {
  var q = pNormalise(p);
  var e = ETAPES[etape(q)];
  return (q - e.debut) / (e.fin - e.debut);
}

/* ------------------------------------------------------------------ */
/* Le paysage (fixe) et le chemin de la goutte                          */
/* ------------------------------------------------------------------ */

/* Le Soleil : en haut à gauche, au-dessus de la mer. Il ne bouge jamais. */
export var SOLEIL = { x: 0.14, y: 0.86, r: 0.07 };

/* Le niveau de l'eau et du sol (la mer à gauche, jusqu'à x = 0,32). */
export var NIVEAU_SOL = 0.28;
export var MER_DROITE = 0.32;

/* La montagne : son pied à gauche, son sommet, son pied à droite. */
export var MONTAGNE = { piedGauche: 0.50, sommet: { x: 0.78, y: 0.72 }, piedDroit: 1.02 };

/* Au-dessus de cette altitude, il fait froid : la vapeur y redevient des
 * gouttelettes. C'est là que la goutte réapparaît. */
export var ALTITUDE_FROID = 0.55;

/* Les points-clés du chemin (coordonnées normalisées, y vers le haut). */
var CHEMIN = {
  merDebut: { x: 0.30, y: 0.235 },
  merFin: { x: 0.20, y: 0.235 },
  monteeControle: { x: 0.17, y: 0.60 },
  nuageDebut: { x: 0.34, y: 0.80 },
  nuageFin: { x: 0.60, y: 0.78 },
  solMontagne: { x: 0.62, y: 0.0 }, /* y calculé : le flanc de la montagne */
  piedMontagne: { x: 0.50, y: NIVEAU_SOL },
  meandre: { x: 0.42, y: 0.24 },
  embouchure: { x: 0.32, y: 0.235 }
};

/* Hauteur du flanc gauche de la montagne à l'abscisse x. */
export function hauteurMontagne(x) {
  var m = MONTAGNE;
  if (x <= m.piedGauche || x >= m.piedDroit) return NIVEAU_SOL;
  if (x <= m.sommet.x) {
    return NIVEAU_SOL + ((x - m.piedGauche) / (m.sommet.x - m.piedGauche)) * (m.sommet.y - NIVEAU_SOL);
  }
  return NIVEAU_SOL + ((m.piedDroit - x) / (m.piedDroit - m.sommet.x)) * (m.sommet.y - NIVEAU_SOL);
}
CHEMIN.solMontagne.y = hauteurMontagne(CHEMIN.solMontagne.x);

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpPoint(a, b, t) { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }; }
function bezier2(a, c, b, t) {
  var u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y
  };
}
function adoucir(t) { return t * t * (3 - 2 * t); }

/* Où est la goutte, pour une position p sur la boucle. Le chemin est
 * CONTINU et FERMÉ : la fin de la rivière est le début de la mer — après
 * un tour complet, la goutte est revenue exactement là d'où elle est
 * partie (vérité n° 1). */
export function positionGoutte(p) {
  var q = pNormalise(p);
  var s = avancementEtape(q);
  var e = etape(q);
  if (e === 'mer') return lerpPoint(CHEMIN.merDebut, CHEMIN.merFin, s);
  if (e === 'montee') return bezier2(CHEMIN.merFin, CHEMIN.monteeControle, CHEMIN.nuageDebut, adoucir(s));
  if (e === 'nuage') return lerpPoint(CHEMIN.nuageDebut, CHEMIN.nuageFin, s);
  if (e === 'pluie') {
    /* la chute accélère, comme une vraie goutte */
    return lerpPoint(CHEMIN.nuageFin, CHEMIN.solMontagne, s * s);
  }
  /* la rivière : le flanc, puis le méandre, puis l'embouchure — et la mer */
  if (s < 0.4) return lerpPoint(CHEMIN.solMontagne, CHEMIN.piedMontagne, s / 0.4);
  if (s < 0.75) return bezier2(CHEMIN.piedMontagne, CHEMIN.meandre, CHEMIN.embouchure, (s - 0.4) / 0.35);
  return lerpPoint(CHEMIN.embouchure, CHEMIN.merDebut, (s - 0.75) / 0.25);
}

/* L'altitude de la goutte : sa hauteur au-dessus du niveau de la mer,
 * de 0 (au sol) à 1 (tout en haut du ciel). */
export function altitude(p) {
  var y = positionGoutte(p).y;
  return Math.max(0, Math.min(1, (y - NIVEAU_SOL) / (1 - NIVEAU_SOL)));
}

/* ------------------------------------------------------------------ */
/* Chaud en bas, froid en haut                                          */
/* ------------------------------------------------------------------ */

/* La température de l'air selon l'altitude : 1 tout en bas (chaud, au
 * soleil), 0 tout en haut (froid). Elle ne fait que baisser quand on
 * monte — vérité n° 5. */
export function temperature(alt) {
  var a = Math.max(0, Math.min(1, alt));
  return 1 - a;
}

/* Il fait froid là où la température passe sous ce seuil — c'est
 * exactement l'altitude du froid. */
export var TEMPERATURE_FROID = temperature(ALTITUDE_FROID);

export function faitFroid(p) {
  return altitude(p) >= ALTITUDE_FROID - EPS;
}

/* La hauteur (en y de scène) où commence le froid : au-dessus, la neige
 * tient sur la montagne et la vapeur redevient des gouttelettes. */
export var Y_FROID = NIVEAU_SOL + ALTITUDE_FROID * (1 - NIVEAU_SOL);

/* Le Soleil chauffe la goutte tant qu'elle est en bas, du côté de la mer :
 * dans la mer et pendant toute la montée. C'est lui, et lui seul, qui la
 * fait s'envoler (vérité n° 2). */
export function soleilChauffe(p) {
  var e = etape(p);
  return e === 'mer' || e === 'montee';
}

/* ------------------------------------------------------------------ */
/* La forme de la goutte et sa visibilité                               */
/* ------------------------------------------------------------------ */

/* Largeur des fondus (en fraction de la boucle) : la goutte s'efface en
 * s'envolant, réapparaît en arrivant dans le froid. */
export var FONDU = 0.04;

/* La forme de l'eau : liquide (dans la mer, la rivière), vapeur (invisible,
 * en montant), gouttelette (dans le nuage), goutte (la pluie). */
export function forme(p) {
  var e = etape(p);
  if (e === 'mer' || e === 'riviere') return 'liquide';
  if (e === 'montee') return 'vapeur';
  if (e === 'nuage') return 'gouttelette';
  return 'goutte';
}

/* La visibilité de la goutte, de 0 (invisible : c'est de la vapeur) à 1.
 * Elle s'efface au début de la montée, et ne réapparaît qu'à la fin —
 * quand elle atteint l'altitude du froid (vérité n° 3). Partout ailleurs,
 * on la voit entière. */
export function visibilite(p) {
  var q = pNormalise(p);
  if (etape(q) !== 'montee') return 1;
  var debut = P_MER_FIN;
  var fin = P_MONTEE_FIN;
  if (q < debut + FONDU) return 1 - adoucir((q - debut) / FONDU);
  if (q > fin - FONDU) return adoucir((q - (fin - FONDU)) / FONDU);
  return 0;
}

/* Elle est toujours là, même quand on ne la voit pas : la quantité d'eau
 * du voyage ne change jamais (vérité n° 4). */
export function goutteToujoursLa(p) {
  return forme(p) !== null && positionGoutte(p) !== null;
}

/* ------------------------------------------------------------------ */
/* Le nuage et la pluie                                                 */
/* ------------------------------------------------------------------ */

/* Combien le nuage est chargé d'eau, de 0 (pas de nuage) à 1 (il va
 * pleuvoir). Il naît quand la goutte arrive dans le froid, grossit en
 * dérivant vers la montagne, se vide en pleuvant. */
export function chargeNuage(p) {
  var e = etape(p);
  var s = avancementEtape(p);
  if (e === 'nuage') return 0.3 + 0.7 * s;
  if (e === 'pluie') return 1 - 0.85 * s;
  if (e === 'riviere') return Math.max(0, 0.15 - 0.15 * (s / 0.25));
  return 0;
}

/* Où est le nuage (son centre). Il suit la goutte pendant qu'elle y est,
 * puis reste au-dessus de la montagne le temps de pleuvoir. */
export function positionNuage(p) {
  var e = etape(p);
  if (e === 'nuage') {
    var g = positionGoutte(p);
    return { x: g.x, y: g.y - 0.02 };
  }
  return { x: CHEMIN.nuageFin.x, y: CHEMIN.nuageFin.y - 0.02 };
}

export function ilPleut(p) {
  return etape(p) === 'pluie';
}

/* La force de la pluie (0 à 1) : drue au début, elle s'éteint quand le
 * nuage est vidé. */
export function forcePluie(p) {
  if (!ilPleut(p)) return 0;
  var s = avancementEtape(p);
  return s < 0.7 ? 1 : 1 - (s - 0.7) / 0.3;
}

/* La rivière coule dès qu'il a plu, et jusqu'à ce que la goutte soit à la mer. */
export function debitRiviere(p) {
  var e = etape(p);
  if (e === 'pluie') return avancementEtape(p);
  if (e === 'riviere') return 1;
  return 0.25; /* un filet permanent : la rivière ne se vide jamais tout à fait */
}

/* ------------------------------------------------------------------ */
/* Ce qu'on voit à la loupe : les billes d'eau                          */
/* ------------------------------------------------------------------ */

/* L'écartement des billes d'eau, de 0 (serrées : de l'eau qu'on voit) à 1
 * (éparses : de la vapeur, invisible). Il suit la visibilité en montant,
 * et redescend d'un cran dans le nuage. */
export function ecartement(p) {
  var e = etape(p);
  if (e === 'montee') return 1 - visibilite(p);
  if (e === 'nuage') return 0.55 - 0.15 * adoucir(Math.min(1, avancementEtape(p) * 2));
  if (e === 'pluie') return 0.05;
  return 0.18;
}

/* Le regroupement des billes en petits amas (les gouttelettes du nuage) :
 * 0 = un seul bloc, 1 = trois gouttelettes bien séparées. */
export function regroupement(p) {
  var e = etape(p);
  if (e === 'nuage') return adoucir(Math.min(1, avancementEtape(p) * 3));
  if (e === 'pluie') return 1 - adoucir(Math.min(1, avancementEtape(p) * 2.5));
  return 0;
}

/* L'agitation des billes : les billes chaudes bougent, les froides sont
 * plus calmes. Suit la température de l'air. */
export function agitation(p) {
  return 0.3 + 0.7 * temperature(altitude(p));
}

/* ------------------------------------------------------------------ */
/* Les phrases du moment (une par vue)                                   */
/* ------------------------------------------------------------------ */

/* Typographie française à l'affichage : espaces insécables avant ! ? ; :
 * (les textes du modèle s'écrivent avec des espaces simples ; la voix lit
 * ceux-là, l'écran reçoit ceux-ci). */
export function typographie(t) {
  return t
    .replace(/ ([!?;])/g, '\u202f$1')
    .replace(/ :/g, '\u00a0:');
}

/* La phrase sous « Dehors » : ce qui arrive à la goutte. */
export function phraseDehors(p) {
  var e = etape(p);
  var s = avancementEtape(p);
  if (e === 'mer') return 'La goutte flotte dans la mer. Le Soleil chauffe l’eau, doucement…';
  if (e === 'montee') {
    if (s < 0.2) return 'Il fait chaud ! La goutte s’envole… et disparaît !';
    if (s < 0.8) return 'Elle monte, monte… On ne la voit plus. Mais elle est toujours là !';
    return 'Tout en haut, il fait froid… Et la goutte réapparaît !';
  }
  if (e === 'nuage') {
    if (s < 0.5) return 'Dans le froid, la goutte retrouve des milliers de copines : un nuage !';
    return 'Le nuage grossit et glisse vers la montagne. Il devient lourd, très lourd…';
  }
  if (e === 'pluie') return 'Trop lourd ! La goutte tombe. Il pleut sur la montagne !';
  if (s < 0.75) return 'La rivière ramène la goutte vers la mer…';
  return 'Et voilà la mer ! Le Soleil chauffe l’eau… Ça recommence !';
}

/* La phrase sous la loupe : ce que devient l'eau, de tout près. */
export function phraseLoupe(p) {
  var e = etape(p);
  var s = avancementEtape(p);
  if (e === 'mer') return 'Dans la mer, les billes d’eau sont serrées les unes contre les autres.';
  if (e === 'montee') {
    if (s < 0.8) return 'Chauffées, les billes s’écartent et s’envolent. Trop petites, trop loin les unes des autres : on ne les voit plus.';
    return 'Dans le froid, les billes se rapprochent…';
  }
  if (e === 'nuage') return 'Elles se collent en petites gouttelettes. Un nuage, c’est des milliards de gouttelettes !';
  if (e === 'pluie') return 'Les gouttelettes se collent en une grosse goutte, trop lourde pour rester en l’air.';
  return 'Dans la rivière, les billes sont de nouveau serrées : de l’eau qu’on voit.';
}

/* ------------------------------------------------------------------ */
/* La lecture automatique                                               */
/* ------------------------------------------------------------------ */

/* Un tour complet du voyage en ~85 s quand le site avance tout seul. */
export var LECTURE_TOUR_SEC = 85;
export var LECTURE_P_PAR_SEC = 1 / LECTURE_TOUR_SEC;

/* ------------------------------------------------------------------ */
/* Les scénarios racontés (les quatre moments-clés)                     */
/* ------------------------------------------------------------------ */

export var SCENARIOS = [
  {
    id: 'soleil',
    emoji: '☀️',
    p: 0.22,
    teinte: 'rose',
    label: 'Le Soleil chauffe la mer',
    sub: 'la goutte s’envole',
    intro: 'Le matin, le Soleil chauffe la mer…',
    dehors: 'Regarde bien la goutte : il fait chaud, elle s’envole, et elle disparaît ! On ne la voit plus du tout. Mais elle est toujours là, elle monte dans le ciel.',
    loupe: 'Chauffées par le Soleil, les billes d’eau s’écartent les unes des autres et s’envolent. Elles sont si petites et si loin les unes des autres qu’on ne peut plus les voir. C’est de la vapeur !'
  },
  {
    id: 'nuage',
    emoji: '☁️',
    p: 0.46,
    teinte: 'bleu',
    label: 'Le nuage se fabrique',
    sub: 'en haut, il fait froid',
    intro: 'Tout en haut du ciel, il fait froid…',
    dehors: 'Dans le froid, la goutte réapparaît ! Elle retrouve des milliers de copines, et toutes ensemble, elles font un nuage. Le nuage grossit, et il glisse vers la montagne.',
    loupe: 'Dans le froid, les billes d’eau se rapprochent et se collent en petites gouttelettes. Un nuage, c’est des milliards de gouttelettes, tellement serrées qu’on les voit de loin : tout blanc, ou tout gris !'
  },
  {
    id: 'pluie',
    emoji: '🌧️',
    p: 0.66,
    teinte: 'or',
    label: 'Il pleut !',
    sub: 'le nuage est trop lourd',
    intro: 'Le nuage est plein, plein, plein…',
    dehors: 'Il est devenu trop lourd ! Les gouttes tombent : il pleut sur la montagne. Notre goutte tombe avec les autres, et elle atterrit sur le flanc de la montagne.',
    loupe: 'Les gouttelettes se collent encore et encore, jusqu’à faire une grosse goutte. Trop lourde pour rester en l’air… Elle tombe !'
  },
  {
    id: 'retour',
    emoji: '🏞️',
    p: 0.88,
    teinte: 'violet',
    label: 'Retour à la mer',
    sub: 'et ça recommence',
    intro: 'La pluie coule, coule…',
    dehors: 'La rivière emporte la goutte, depuis la montagne jusqu’à la mer. La voilà revenue ! Et le Soleil se remet à chauffer l’eau… Le grand voyage recommence !',
    loupe: 'Dans la rivière, les billes d’eau sont de nouveau serrées les unes contre les autres : c’est de l’eau qu’on voit, qu’on peut toucher. La même eau qu’au début !'
  }
];

export var VOIX_TRANSITIONS = {
  loupe: 'Et maintenant, à la loupe…'
};

/* ------------------------------------------------------------------ */
/* Le jeu : fabriquer le moment demandé en promenant la goutte          */
/* ------------------------------------------------------------------ */

/* Le tempo de maintien : traverser la bonne zone sans s'y arrêter ne gagne
 * pas « en passant ». */
export var DEFI_ATTENTE_MS = 350;
/* L'hystérésis de sortie : le bravo se range plus loin qu'il ne se gagne. */
export var DEFI_SORTIE_MARGE = 0.03;

/* Chaque défi : une fenêtre [debut, fin[ de la boucle, et le point où
 * l'animation recale doucement la goutte au bravo. */
export var DEFIS = [
  {
    id: 'invisible',
    emoji: '✨',
    debut: P_MER_FIN + FONDU + 0.01,
    fin: P_MONTEE_FIN - FONDU - 0.01,
    pBravo: 0.22,
    consigne: 'Fais disparaître la goutte !',
    bravo: 'Bravo ! Le Soleil l’a chauffée : elle s’est envolée… On ne la voit plus, mais elle est là !'
  },
  {
    id: 'nuage',
    emoji: '☁️',
    debut: P_MONTEE_FIN + 0.03,
    fin: P_NUAGE_FIN - 0.02,
    pBravo: 0.46,
    consigne: 'Fabrique un nuage !',
    bravo: 'Bravo ! En haut, il fait froid : la goutte a retrouvé ses copines, et voilà un nuage !'
  },
  {
    id: 'pluie',
    emoji: '🌧️',
    debut: P_NUAGE_FIN + 0.01,
    fin: P_PLUIE_FIN - 0.02,
    pBravo: 0.66,
    consigne: 'Fais pleuvoir sur la montagne !',
    bravo: 'Bravo ! Le nuage était trop lourd : il pleut sur la montagne !'
  },
  {
    id: 'mer',
    emoji: '🌊',
    debut: 0.97,
    fin: P_MER_FIN - 0.01,
    pBravo: 0.04,
    consigne: 'Ramène la goutte à la mer !',
    bravo: 'Bravo ! La goutte est revenue à la mer. Et le grand voyage peut recommencer !'
  }
];

/* p est-il dans la fenêtre [debut, fin[ — qui peut chevaucher le 0 (la mer). */
export function dansFenetre(p, debut, fin) {
  var q = pNormalise(p);
  if (debut <= fin) return q >= debut - EPS && q < fin + EPS;
  return q >= debut - EPS || q < fin + EPS;
}

export function defiReussi(defi, p) {
  return dansFenetre(p, defi.debut, defi.fin);
}

export function defiEncoreProche(defi, p) {
  return dansFenetre(p, defi.debut - DEFI_SORTIE_MARGE, defi.fin + DEFI_SORTIE_MARGE);
}

/* Le plus court chemin de a vers b sur la boucle, signé, dans ]-0,5, 0,5]. */
export function deltaCourt(a, b) {
  var d = pNormalise(b - a);
  if (d > 0.5) d -= 1;
  return d;
}

/* ------------------------------------------------------------------ */
/* Le texte oral (la voix ne lit pas les émojis)                         */
/* ------------------------------------------------------------------ */

export var EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

/* Prépare un texte du site pour la voix : émojis retirés, guillemets
 * français retirés (la synthèse trébuche dessus), tirets cadratins en
 * virgules, espaces recollés avant la ponctuation. */
export function texteOral(t) {
  return t.replace(EMOJI_RE, '')
    .replace(/[«»]/g, ' ')
    .replace(/\s+—\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,…])/g, '$1')
    .replace(/([!?…])\s*\./g, '$1') /* le point orphelin d'un émoji retiré */
    .trim();
}
