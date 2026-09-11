/*
 * La vue « De tout près » : la même eau, vue à la loupe. Douze billes d'eau
 * qui se serrent (de l'eau qu'on voit), s'écartent et s'effacent (la vapeur),
 * se regroupent en gouttelettes (le nuage), se collent en une grosse goutte
 * (la pluie). Cette vue ne se manipule pas : elle suit l'état de la scène.
 */
import {
  TAU, pNormalise, forme, visibilite, ecartement, regroupement, agitation,
  temperature, altitude, faitFroid, soleilChauffe
} from './model.js';

var FOND = '#171f36';
var BILLE = '#7cc4ff';
var BILLE_CLAIR = '#d6f0ff';
var BILLE_SOMBRE = '#2f7fb8';
var LENTILLE = '#a98bff';

/* Les douze billes, rangées en petit bloc (hexagonal), coordonnées locales
 * dans le disque unité. */
var BLOC = [
  { x: 0, y: 0 }, { x: 0.36, y: 0 }, { x: -0.36, y: 0 },
  { x: 0.18, y: 0.31 }, { x: -0.18, y: 0.31 }, { x: 0.18, y: -0.31 }, { x: -0.18, y: -0.31 },
  { x: 0.54, y: 0.31 }, { x: -0.54, y: 0.31 }, { x: 0.54, y: -0.31 }, { x: -0.54, y: -0.31 },
  { x: 0, y: 0.62 }
];
/* Trois gouttelettes de nuage : chaque bille appartient à un amas. */
var AMAS = [0, 1, 2, 0, 2, 1, 0, 1, 2, 1, 0, 2];
var CENTRES_AMAS = [{ x: -0.42, y: 0.34 }, { x: 0.44, y: 0.2 }, { x: 0.02, y: -0.44 }];
/* La direction de fuite de chaque bille quand elle s'évapore. */
var FUITES = BLOC.map(function (b, i) {
  var a = Math.atan2(b.y || 0.001, b.x || 0.001) + (i % 2 ? 0.4 : -0.3);
  return { x: Math.cos(a), y: Math.sin(a) };
});

function melanger(a, b, t) {
  var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  var g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  var bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}

/* Les positions des billes pour une position p du voyage, en coordonnées
 * locales (disque unité). */
function positionsBilles(p, horloge) {
  var ec = ecartement(p);
  var reg = regroupement(p);
  var agi = agitation(p);
  var t = horloge ? horloge / 1000 : 0;
  return BLOC.map(function (b, i) {
    /* serrées ↔ éparses : les billes fuient du centre, et la vapeur monte */
    /* (facteur 0,75 : même en pleine vapeur, les billes restent dans la
     * lentille — à 1,6 elles fuyaient hors du disque et la loupe semblait vide) */
    var ex = b.x + FUITES[i].x * ec * 0.75;
    var ey = b.y + FUITES[i].y * ec * 0.75 - ec * 0.3 * ((i * 0.37 + t * 0.06) % 1);
    /* regroupées en trois gouttelettes */
    var c = CENTRES_AMAS[AMAS[i]];
    var gx = c.x + b.x * 0.42, gy = c.y + b.y * 0.42;
    var x = ex * (1 - reg) + gx * reg;
    var y = ey * (1 - reg) + gy * reg;
    /* l'agitation : les billes chaudes frémissent (seulement quand l'horloge tourne) */
    if (horloge) {
      x += Math.sin(t * (2.2 + 0.3 * i) + i) * 0.035 * agi;
      y += Math.cos(t * (1.9 + 0.2 * i) + i * 1.7) * 0.035 * agi;
    }
    return { x: x, y: y };
  });
}

/* Le dessin complet dans un disque (cx, cy, R). Sert à la vue et au médaillon. */
function dessinerLoupe(ctx, cx, cy, R, p, horloge, compact) {
  var temp = temperature(altitude(p));
  var vis = visibilite(p);
  var f = forme(p);
  var ec = ecartement(p);
  var reg = regroupement(p);

  /* l'intérieur de la lentille : chaud orangé en bas, bleu froid en haut */
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();
  var fond = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
  fond.addColorStop(0, melanger('#1b2a4d', '#4a3520', temp));
  fond.addColorStop(1, melanger('#243a66', '#7a5526', temp));
  ctx.fillStyle = fond;
  ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);

  /* les repères de température : rayons de chaleur ou flocons de froid */
  if (soleilChauffe(p)) {
    ctx.strokeStyle = 'rgba(255, 207, 92, 0.5)';
    ctx.lineWidth = Math.max(1.5, R * 0.03);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var k = 0; k < 4; k++) {
      var a = -0.9 - k * 0.28;
      ctx.moveTo(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72);
      ctx.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92);
    }
    ctx.stroke();
  }
  if (faitFroid(p)) {
    ctx.strokeStyle = 'rgba(233, 244, 255, 0.7)';
    ctx.lineWidth = Math.max(1.2, R * 0.025);
    ctx.lineCap = 'round';
    [[-0.62, -0.62], [0.66, -0.55], [0.7, 0.62]].forEach(function (pos) {
      var fx = cx + pos[0] * R, fy = cy + pos[1] * R, r = R * 0.08;
      ctx.beginPath();
      for (var q = 0; q < 3; q++) {
        var an = (q / 3) * Math.PI;
        ctx.moveTo(fx - Math.cos(an) * r, fy - Math.sin(an) * r);
        ctx.lineTo(fx + Math.cos(an) * r, fy + Math.sin(an) * r);
      }
      ctx.stroke();
    });
  }

  /* la grosse goutte de pluie : un contour autour du bloc serré */
  if (f === 'goutte') {
    var s = R * 0.5;
    ctx.save();
    ctx.translate(cx, cy + R * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -1.9 * s);
    ctx.bezierCurveTo(0.15 * s, -1.3 * s, s, -0.7 * s, s, 0.15 * s);
    ctx.arc(0, 0.15 * s, s, 0, Math.PI, false);
    ctx.bezierCurveTo(-s, -0.7 * s, -0.15 * s, -1.3 * s, 0, -1.9 * s);
    ctx.closePath();
    ctx.fillStyle = 'rgba(124, 196, 255, 0.22)';
    ctx.fill();
    ctx.lineWidth = Math.max(2, R * 0.04);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.stroke();
    ctx.restore();
  }

  /* les gouttelettes du nuage : un halo blanc autour de chaque amas */
  if (reg > 0.05) {
    ctx.fillStyle = 'rgba(233, 237, 248, ' + (0.18 * reg) + ')';
    CENTRES_AMAS.forEach(function (c) {
      ctx.beginPath();
      ctx.arc(cx + c.x * R * 0.9, cy + c.y * R * 0.9, R * 0.3, 0, TAU);
      ctx.fill();
    });
  }

  /* les billes */
  var billes = positionsBilles(p, horloge);
  var rBille = R * (f === 'goutte' ? 0.115 : 0.1) * (compact ? 1.1 : 1);
  var echelle = R * 0.62;
  billes.forEach(function (b, i) {
    var x = cx + b.x * echelle, y = cy + b.y * echelle;
    if (ec > 0.5) {
      /* de la vapeur : les billes s'effacent, il n'en reste qu'un pointillé */
      /* le pointillé reste bien lisible même en pleine vapeur : c'est
       * lui qui dit « elles sont là, on ne les voit plus » */
      var alpha = 0.95 - (ec - 0.5) * 0.9;
      if (alpha > 0.06) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.setLineDash([rBille * 0.5, rBille * 0.45]);
        ctx.strokeStyle = BILLE_CLAIR;
        ctx.lineWidth = Math.max(1, rBille * 0.18);
        ctx.beginPath(); ctx.arc(x, y, rBille * 0.85, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      if (ec < 0.85) {
        ctx.save();
        ctx.globalAlpha = (0.85 - ec) / 0.35;
        dessinerBille(ctx, x, y, rBille, i === 0);
        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.globalAlpha = 1 - ec * 0.6;
      dessinerBille(ctx, x, y, rBille, i === 0);
      ctx.restore();
    }
  });
  ctx.restore();

  /* la monture de la loupe, et son manche */
  ctx.save();
  ctx.lineWidth = Math.max(3, R * 0.06);
  ctx.strokeStyle = LENTILLE;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(5, R * 0.13);
  ctx.beginPath();
  ctx.moveTo(cx + R * 0.72, cy + R * 0.72);
  ctx.lineTo(cx + R * 1.08, cy + R * 1.08);
  ctx.stroke();
  /* le reflet de verre */
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(2, R * 0.035);
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, -2.4, -1.5); ctx.stroke();
  ctx.restore();
  return vis;
}

function dessinerBille(ctx, x, y, r, heroine) {
  var d = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  d.addColorStop(0, BILLE_CLAIR);
  d.addColorStop(0.5, BILLE);
  d.addColorStop(1, BILLE_SOMBRE);
  ctx.fillStyle = d;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  if (heroine) {
    /* la première bille, c'est elle : deux yeux et un sourire */
    ctx.fillStyle = '#0b1020';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.05, r * 0.13, 0, TAU);
    ctx.arc(x + r * 0.3, y - r * 0.05, r * 0.13, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#0b1020';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.32, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
}

export function creerVueLoupe(canvas) {
  var ctx = canvas.getContext('2d');
  return {
    rendre: function (p, horloge) {
      var W = canvas.width, H = canvas.height;
      if (W === 0 || H === 0) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = FOND;
      ctx.fillRect(0, 0, W, H);
      var R = Math.min(W, H) * 0.4;
      var compact = W < 520 * (window.devicePixelRatio || 1);
      dessinerLoupe(ctx, W / 2 - R * 0.06, H / 2 - R * 0.06, R, pNormalise(p), horloge, compact);
    }
  };
}

/* Le médaillon mobile : la loupe en miniature, sans manche. */
export function dessinerMiniLoupe(ctx, w, h, p) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, w, h);
  var R = Math.min(w, h) * 0.46;
  ctx.save();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, R, 0, TAU); ctx.clip();
  dessinerLoupe(ctx, w / 2, h / 2, R, pNormalise(p), null, true);
  ctx.restore();
}
