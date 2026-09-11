/*
 * La vue « Dehors » : le paysage FIXE (la mer à gauche, la montagne à
 * droite, le Soleil en haut à gauche), et la goutte qui fait son grand
 * voyage. C'est ici que vit le geste-signature : attraper la goutte et la
 * promener le long de sa boucle.
 */
import {
  TAU, SOLEIL, NIVEAU_SOL, MER_DROITE, MONTAGNE, Y_FROID, hauteurMontagne,
  pNormalise, etape, avancementEtape, positionGoutte, visibilite, forme,
  soleilChauffe, chargeNuage, positionNuage, ilPleut, forcePluie, debitRiviere
} from './model.js';

var CIEL_HAUT = '#1c3a6e';
var CIEL_BAS = '#6aa6dd';
var GOUTTE = '#7cc4ff';
var GOUTTE_CLAIR = '#d6f0ff';
var GOUTTE_SOMBRE = '#2f7fb8';
var ENCRE = '#0b1020';

/* Le chemin, échantillonné une fois pour toutes (600 points sur la boucle) :
 * sert au tracé en pointillés et à la recherche du point le plus proche du
 * doigt. */
var N_ECHANTILLONS = 600;
var CHEMIN = [];
for (var i = 0; i < N_ECHANTILLONS; i++) {
  var q = i / N_ECHANTILLONS;
  var pt = positionGoutte(q);
  CHEMIN.push({ p: q, x: pt.x, y: pt.y });
}

/* Petit générateur déterministe (les décors ne clignotent pas d'une image
 * à l'autre). */
function fabriquerAleas(n, graine) {
  var aleas = [];
  var g = graine;
  for (var k = 0; k < n; k++) {
    g = (g * 1103515245 + 12345) % 2147483648;
    aleas.push(g / 2147483648);
  }
  return aleas;
}
var ALEAS = fabriquerAleas(240, 11);

/* La rivière : le tracé que suit la goutte de la montagne à la mer
 * (les points du chemin dans l'étape « rivière », jusqu'à l'embouchure). */
var RIVIERE = CHEMIN.filter(function (pt) { return etape(pt.p) === 'riviere' && pt.x >= MER_DROITE - 0.005; });

function dessinerNuage(ctx, cx, cy, largeur, charge, alpha) {
  if (charge <= 0.01 || alpha <= 0.01) return;
  var t = Math.min(1, charge);
  /* blanc quand il est léger, gris quand il est plein */
  var r = Math.round(233 + (138 - 233) * t);
  var g = Math.round(237 + (148 - 237) * t);
  var b = Math.round(248 + (176 - 248) * t);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
  var boules = [
    [0, 0.05, 0.30], [-0.28, 0.12, 0.22], [0.27, 0.10, 0.24], [-0.12, -0.05, 0.26], [0.12, -0.08, 0.25], [0.42, 0.18, 0.16], [-0.44, 0.2, 0.15]
  ];
  ctx.beginPath();
  boules.forEach(function (bl) {
    ctx.moveTo(cx + bl[0] * largeur + bl[2] * largeur, cy + bl[1] * largeur);
    ctx.arc(cx + bl[0] * largeur, cy + bl[1] * largeur, bl[2] * largeur, 0, TAU);
  });
  ctx.fill();
  /* l'ombre du dessous : plus sombre quand il est plein */
  ctx.globalAlpha = alpha * (0.25 + 0.45 * t);
  ctx.fillStyle = 'rgb(' + Math.round(r * 0.7) + ',' + Math.round(g * 0.72) + ',' + Math.round(b * 0.8) + ')';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.2 * largeur, largeur * 0.62, largeur * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* La goutte-héroïne : une larme ronde avec un visage. Coordonnées locales,
 * la pointe en haut, le rond en bas ; `s` est le rayon du rond. */
function dessinerGoutte(ctx, x, y, s, alpha, forme_) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, -1.9 * s);
  ctx.bezierCurveTo(0.15 * s, -1.3 * s, s, -0.7 * s, s, 0.15 * s);
  ctx.arc(0, 0.15 * s, s, 0, Math.PI, false);
  ctx.bezierCurveTo(-s, -0.7 * s, -0.15 * s, -1.3 * s, 0, -1.9 * s);
  ctx.closePath();
  var degrade = ctx.createRadialGradient(-0.3 * s, -0.1 * s, s * 0.1, 0, 0.1 * s, 1.4 * s);
  degrade.addColorStop(0, GOUTTE_CLAIR);
  degrade.addColorStop(0.45, GOUTTE);
  degrade.addColorStop(1, GOUTTE_SOMBRE);
  ctx.fillStyle = degrade;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, s * 0.16);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  /* le visage : deux yeux, un sourire (une gouttelette de nuage a le même
   * visage en plus petit — c'est toujours elle) */
  ctx.fillStyle = ENCRE;
  ctx.beginPath();
  ctx.arc(-0.34 * s, 0.05 * s, s * 0.13, 0, TAU);
  ctx.arc(0.34 * s, 0.05 * s, s * 0.13, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.lineWidth = Math.max(1.2, s * 0.11);
  ctx.strokeStyle = ENCRE;
  ctx.lineCap = 'round';
  if (forme_ === 'goutte') {
    /* la bouche ronde de la chute : « ooooh ! » */
    ctx.arc(0, 0.5 * s, s * 0.16, 0, TAU);
  } else {
    ctx.arc(0, 0.32 * s, s * 0.34, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();
  /* le reflet */
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-0.45 * s, -0.55 * s, s * 0.14, s * 0.26, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* Le fantôme de la goutte quand elle est de la vapeur : un pointillé à sa
 * place — on ne la voit plus, mais elle est là (c'est aussi ce que le
 * doigt attrape). */
function dessinerFantome(ctx, x, y, s, alpha) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.setLineDash([Math.max(2, s * 0.35), Math.max(2, s * 0.3)]);
  ctx.lineWidth = Math.max(1.5, s * 0.14);
  ctx.strokeStyle = GOUTTE_CLAIR;
  ctx.beginPath();
  ctx.moveTo(0, -1.9 * s);
  ctx.bezierCurveTo(0.15 * s, -1.3 * s, s, -0.7 * s, s, 0.15 * s);
  ctx.arc(0, 0.15 * s, s, 0, Math.PI, false);
  ctx.bezierCurveTo(-s, -0.7 * s, -0.15 * s, -1.3 * s, 0, -1.9 * s);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function dessinerFlocon(ctx, x, y, r, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#e9f4ff';
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (var k = 0; k < 3; k++) {
    var a = (k / 3) * Math.PI;
    ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
}

export function creerVueDehors(canvas) {
  var ctx = canvas.getContext('2d');

  function geometrie() {
    var W = canvas.width, H = canvas.height;
    return {
      W: W, H: H,
      compact: W < 520 * (window.devicePixelRatio || 1),
      X: function (x) { return x * W; },
      Y: function (y) { return (1 - y) * H; }
    };
  }

  /* Le rayon du rond de la goutte selon sa forme (en pixels). */
  function rayonGoutte(g, forme_) {
    var base = Math.min(g.W, g.H) * (g.compact ? 0.062 : 0.05);
    if (forme_ === 'gouttelette') return base * 0.72;
    if (forme_ === 'goutte') return base * 1.08;
    return base;
  }

  function dessinerCiel(g, p) {
    var ciel = ctx.createLinearGradient(0, 0, 0, g.Y(NIVEAU_SOL));
    ciel.addColorStop(0, CIEL_HAUT);
    ciel.addColorStop(1, CIEL_BAS);
    ctx.fillStyle = ciel;
    ctx.fillRect(0, 0, g.W, g.H);
    /* la zone du froid, tout en haut : un voile plus pâle, et des flocons
     * (rien ne tombe : ce sont des repères — « là-haut, il fait froid ») */
    var yFroid = g.Y(Y_FROID);
    var voile = ctx.createLinearGradient(0, 0, 0, yFroid);
    voile.addColorStop(0, 'rgba(230, 242, 255, 0.22)');
    voile.addColorStop(1, 'rgba(230, 242, 255, 0)');
    ctx.fillStyle = voile;
    ctx.fillRect(0, 0, g.W, yFroid);
    var nFlocons = g.compact ? 5 : 9;
    for (var k = 0; k < nFlocons; k++) {
      var fx = (0.36 + 0.62 * ALEAS[k * 3]) * g.W;
      var fy = ALEAS[k * 3 + 1] * yFroid * 0.9 + yFroid * 0.05;
      dessinerFlocon(ctx, fx, fy, Math.max(4, g.W * (0.008 + 0.006 * ALEAS[k * 3 + 2])), 0.5);
    }
  }

  function dessinerSoleil(g, p, horloge) {
    var cx = g.X(SOLEIL.x), cy = g.Y(SOLEIL.y), r = SOLEIL.r * g.W;
    ctx.save();
    var halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.6);
    halo.addColorStop(0, 'rgba(255, 207, 92, 0.45)');
    halo.addColorStop(1, 'rgba(255, 207, 92, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.6, 0, TAU); ctx.fill();
    /* les rayons */
    ctx.strokeStyle = '#ffcf5c';
    ctx.lineWidth = Math.max(2, r * 0.13);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var k = 0; k < 10; k++) {
      var a = (k / 10) * TAU + (horloge ? horloge / 9000 : 0);
      ctx.moveTo(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25);
      ctx.lineTo(cx + Math.cos(a) * r * 1.62, cy + Math.sin(a) * r * 1.62);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffcf5c';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.55, 0, TAU); ctx.fill();
    ctx.restore();

    /* la chaleur : des ondes qui montent de la mer quand le Soleil la
     * chauffe (elles frémissent pendant la lecture, sages en pause) */
    if (soleilChauffe(p)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 207, 92, 0.55)';
      ctx.lineWidth = Math.max(1.5, g.W * 0.004);
      ctx.lineCap = 'round';
      var t = horloge ? horloge / 1000 : 0;
      for (var m = 0; m < (g.compact ? 3 : 5); m++) {
        var bx = g.X(0.06 + 0.05 * m);
        var by = g.Y(NIVEAU_SOL + 0.06 + 0.04 * ((m * 0.37 + t * 0.08) % 1));
        var l = g.W * 0.022;
        ctx.beginPath();
        ctx.moveTo(bx - l, by);
        ctx.bezierCurveTo(bx - l * 0.5, by - l * 0.8, bx + l * 0.5, by + l * 0.8, bx + l, by);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function dessinerPaysage(g, p, horloge) {
    var sol = g.Y(NIVEAU_SOL);
    /* la terre et l'herbe (à droite de la mer) */
    ctx.fillStyle = '#2f6b3f';
    ctx.fillRect(g.X(MER_DROITE) - 1, sol, g.W, g.H - sol);
    ctx.fillStyle = '#3b8a4d';
    ctx.fillRect(g.X(MER_DROITE) - 1, sol, g.W, Math.max(3, g.H * 0.018));
    /* la montagne : grise, et son sommet enneigé au-dessus du froid */
    var m = MONTAGNE;
    ctx.fillStyle = '#4a5a7e';
    ctx.beginPath();
    ctx.moveTo(g.X(m.piedGauche), sol + 2);
    ctx.lineTo(g.X(m.sommet.x), g.Y(m.sommet.y));
    ctx.lineTo(g.X(m.piedDroit), sol + 2);
    ctx.closePath();
    ctx.fill();
    /* l'ombre du versant droit */
    ctx.fillStyle = 'rgba(11, 16, 32, 0.22)';
    ctx.beginPath();
    ctx.moveTo(g.X(m.sommet.x), g.Y(m.sommet.y));
    ctx.lineTo(g.X(m.piedDroit), sol + 2);
    ctx.lineTo(g.X(m.sommet.x), sol + 2);
    ctx.closePath();
    ctx.fill();
    /* la neige : la partie de la montagne au-dessus de la ligne du froid */
    var yNeige = g.Y(Y_FROID);
    var xg = m.piedGauche + (Y_FROID - NIVEAU_SOL) / (m.sommet.y - NIVEAU_SOL) * (m.sommet.x - m.piedGauche);
    var xd = m.piedDroit - (Y_FROID - NIVEAU_SOL) / (m.sommet.y - NIVEAU_SOL) * (m.piedDroit - m.sommet.x);
    ctx.fillStyle = '#eef5ff';
    ctx.beginPath();
    ctx.moveTo(g.X(xg), yNeige);
    ctx.lineTo(g.X(m.sommet.x), g.Y(m.sommet.y));
    ctx.lineTo(g.X(xd), yNeige);
    ctx.quadraticCurveTo(g.X((xd + m.sommet.x) / 2), yNeige + g.H * 0.02, g.X(m.sommet.x), yNeige + g.H * 0.012);
    ctx.quadraticCurveTo(g.X((xg + m.sommet.x) / 2), yNeige + g.H * 0.022, g.X(xg), yNeige);
    ctx.closePath();
    ctx.fill();

    /* la rivière : de la montagne à la mer, plus large quand il a plu */
    var debit = debitRiviere(p);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2f7fb8';
    ctx.lineWidth = Math.max(3, g.W * (0.008 + 0.014 * debit));
    ctx.beginPath();
    RIVIERE.forEach(function (pt, i) {
      var x = g.X(pt.x), y = g.Y(pt.y);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214, 240, 255, 0.55)';
    ctx.lineWidth = Math.max(1, g.W * (0.002 + 0.005 * debit));
    ctx.stroke();
    ctx.restore();

    /* la mer */
    var mer = ctx.createLinearGradient(0, sol, 0, g.H);
    mer.addColorStop(0, '#3a8fcc');
    mer.addColorStop(1, '#1d4f7d');
    ctx.fillStyle = mer;
    ctx.beginPath();
    ctx.moveTo(0, sol);
    ctx.lineTo(g.X(MER_DROITE), sol);
    ctx.quadraticCurveTo(g.X(MER_DROITE + 0.03), sol + g.H * 0.05, g.X(MER_DROITE + 0.02), g.H);
    ctx.lineTo(0, g.H);
    ctx.closePath();
    ctx.fill();
    /* les vaguelettes */
    ctx.save();
    ctx.strokeStyle = 'rgba(214, 240, 255, 0.5)';
    ctx.lineWidth = Math.max(1.2, g.W * 0.003);
    ctx.lineCap = 'round';
    var t = horloge ? horloge / 1400 : 0;
    for (var k = 0; k < (g.compact ? 4 : 7); k++) {
      var vx = g.X(0.03 + 0.04 * k + 0.008 * Math.sin(t + k));
      var vy = sol + g.H * (0.03 + 0.035 * ((k * 0.61) % 1));
      var l = g.W * 0.018;
      ctx.beginPath();
      ctx.moveTo(vx - l, vy);
      ctx.quadraticCurveTo(vx - l / 2, vy - l * 0.45, vx, vy);
      ctx.quadraticCurveTo(vx + l / 2, vy + l * 0.45, vx + l, vy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function dessinerChemin(g) {
    ctx.save();
    ctx.strokeStyle = 'rgba(233, 237, 248, 0.28)';
    ctx.lineWidth = Math.max(1, g.W * 0.003);
    ctx.setLineDash([g.W * 0.012, g.W * 0.014]);
    ctx.beginPath();
    CHEMIN.forEach(function (pt, i) {
      var x = g.X(pt.x), y = g.Y(pt.y);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function dessinerPluie(g, p, horloge) {
    var force = forcePluie(p);
    if (force <= 0) return;
    var n = positionNuage(p);
    var cx = g.X(n.x), cy = g.Y(n.y);
    var largeur = g.W * 0.22;
    ctx.save();
    ctx.strokeStyle = 'rgba(124, 196, 255, ' + (0.85 * force) + ')';
    ctx.lineWidth = Math.max(2, g.W * 0.006);
    ctx.lineCap = 'round';
    var t = horloge ? horloge / 700 : 0;
    var nGouttes = g.compact ? 9 : 16;
    ctx.beginPath();
    for (var k = 0; k < nGouttes; k++) {
      var fx = cx + (ALEAS[40 + k] - 0.5) * largeur * 1.5;
      var solLocal = g.Y(hauteurMontagne(fx / g.W));
      var phase = (ALEAS[80 + k] + t * 0.9) % 1;
      var fy = cy + largeur * 0.25 + phase * (solLocal - cy - largeur * 0.3);
      var l = g.H * 0.03;
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx - l * 0.15, fy + l);
    }
    ctx.stroke();
    ctx.restore();
  }

  function rendre(p, halo, horloge) {
    var g = geometrie();
    if (g.W === 0 || g.H === 0) return;
    p = pNormalise(p);
    ctx.clearRect(0, 0, g.W, g.H);
    dessinerCiel(g, p);
    dessinerSoleil(g, p, horloge);
    dessinerPaysage(g, p, horloge);
    dessinerChemin(g);

    /* le nuage (derrière la goutte) */
    var n = positionNuage(p);
    var charge = chargeNuage(p);
    dessinerNuage(ctx, g.X(n.x), g.Y(n.y), g.W * (0.13 + 0.12 * charge), charge, Math.min(1, charge * 3));
    dessinerPluie(g, p, horloge);

    /* la goutte-héroïne : sa position, sa forme, sa visibilité */
    var pos = positionGoutte(p);
    var f = forme(p);
    var vis = visibilite(p);
    var r = rayonGoutte(g, f);
    var x = g.X(pos.x), y = g.Y(pos.y);

    /* le halo « attrape-moi » : respire pendant la lecture, plein sous le doigt */
    if (halo > 0) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.32 * halo;
      ctx.strokeStyle = '#ff6b9d';
      ctx.lineWidth = Math.max(2, r * 0.22);
      ctx.beginPath();
      ctx.arc(x, y - r * 0.3, r * (2.3 + 0.5 * halo), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    dessinerFantome(ctx, x, y, r, (1 - vis) * 0.55);
    dessinerGoutte(ctx, x, y, r, vis, f);
  }

  /* Le doigt attrape-t-il la goutte ? Généreux : une main d'enfant vise mal,
   * et la goutte invisible s'attrape sur son fantôme. */
  function attrapeGoutte(px, py, p) {
    var g = geometrie();
    var pos = positionGoutte(p);
    var r = rayonGoutte(g, forme(p));
    var d = Math.hypot(px - g.X(pos.x), py - (g.Y(pos.y) - r * 0.3));
    return d <= Math.max(r * 3.2, g.W * 0.09);
  }

  /* La position sur la boucle la plus proche du doigt, cherchée AUTOUR de la
   * position courante (fenêtre ±15 % du voyage) : la goutte suit le doigt le
   * long de son chemin sans jamais sauter de la mer au nuage. */
  function pDepuisPointeur(px, py, pCourant) {
    var g = geometrie();
    var iCourant = Math.round(pNormalise(pCourant) * N_ECHANTILLONS) % N_ECHANTILLONS;
    var fenetre = Math.round(N_ECHANTILLONS * 0.15);
    var meilleur = null, meilleureDistance = Infinity;
    for (var k = -fenetre; k <= fenetre; k++) {
      var i = (iCourant + k + N_ECHANTILLONS) % N_ECHANTILLONS;
      var pt = CHEMIN[i];
      var d = Math.hypot(px - g.X(pt.x), py - g.Y(pt.y));
      if (d < meilleureDistance) { meilleureDistance = d; meilleur = pt; }
    }
    return meilleur ? meilleur.p : pNormalise(pCourant);
  }

  return { rendre: rendre, attrapeGoutte: attrapeGoutte, pDepuisPointeur: pDepuisPointeur };
}
