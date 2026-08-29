#!/usr/bin/env node
// Le réel Instagram d'un épisode : une journée entière balayée en quelques
// secondes, les deux vues synchronisées, en boucle parfaite — HORS site.
//
//   node tools/build-insta-reel.mjs               (le réel d'ou-va-le-soleil)
//   FFMPEG=/chemin node tools/build-insta-reel.mjs
//
// Deux prérequis de plus que les autres générateurs, assumés (le réel est
// occasionnel — un par épisode au plus, et seulement si GoatCounter montre
// que ça rapporte des visites) :
//   — Playwright : il faut un navigateur VIVANT pour pousser le curseur
//     image par image (npm i -g playwright, ou l'environnement de travail) ;
//   — un ffmpeg avec libx264 (Instagram veut du H.264) : variable FFMPEG,
//     ffmpeg-static, ou un ffmpeg système. Celui de Playwright ne sait faire
//     que du VP8, il est ignoré.
//
// La mécanique reste celle de la maison : l'épisode est servi depuis les
// dépôts voisins (sertLesDepots), et le temps avance PAR LE CURSEUR MAÎTRE,
// valeur par valeur — chaque image du film est un état que le doigt d'un
// parent peut vraiment produire. La lecture auto est mise en pause (barre
// espace, la commande officielle du site) pour que rien n'avance tout seul
// entre deux images.
//
// La boucle est parfaite : on balaie exactement 24 h, la dernière image
// précède d'un pas la première. Le départ à 5 h met l'aube dans les trois
// premières secondes — c'est elle qui retient l'œil.
//
// Sortie : tools/sorties-insta/reel-<episode>.mp4 (gitignoré, comme le reste
// du kit). Les images intermédiaires vivent dans tools/reel-frames/ (idem).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sertLesDepots } from './rendu-outils.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');

// ---------------------------------------------------------------- le réel
const REEL = {
  episode: 'ou-va-le-soleil',
  titre: 'Où va le Soleil la nuit ?',
  curseur: '#time-slider',
  depart: 5,      // 5 h : l'aube arrive dans les 3 premières secondes
  amplitude: 24,  // un tour complet — la boucle ne saute pas
  fps: 24,
  secondes: 15,
  vues: [
    // capture à l'échelle 2 : jardin 612×490 CSS → 1224×980 px de fichier
    { canvas: '#garden-view', nom: 'jardin', etiquette: 'Depuis le jardin' },
    { canvas: '#space-view', nom: 'espace', etiquette: 'Depuis l’espace' },
  ],
};

// ------------------------------------------------- la mise en page (1080×1920)
const L = {
  jardin: { x: 48, y: 240, l: 984, h: 788 },   // même rapport que le canvas
  espace: { x: 190, y: 1096, l: 700, h: 700 }, // carré, montré entier
};

function cheminArrondi(x, y, l, h, r) {
  return `M ${x + r} ${y} H ${x + l - r} A ${r} ${r} 0 0 1 ${x + l} ${y + r} `
    + `V ${y + h - r} A ${r} ${r} 0 0 1 ${x + l - r} ${y + h} H ${x + r} `
    + `A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

// L'habillage : le fond de nuit de la charte percé de deux fenêtres (un SVG en
// evenodd — deux box-shadows se reboucheraient l'un l'autre), les cadres or,
// le titre, les étiquettes, le pied. Capturé une seule fois, AVEC alpha.
function pageHabillage() {
  const j = L.jardin, e = L.espace, r = 28;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  @font-face { font-family: "Baloo 2";
    src: url("/davidb-prog.github.io/assets/fonts/baloo2-latin.woff2") format("woff2");
    font-weight: 400 800; }
  html, body { margin: 0; background: transparent; width: 1080px; height: 1920px;
    overflow: hidden; font-family: "Baloo 2", system-ui, sans-serif; }
  .texte { position: absolute; left: 0; width: 1080px; }
  .kicker { top: 64px; padding-left: 130px; color: #ffcf5c; font-weight: 700;
    font-size: 27px; letter-spacing: .15em; text-transform: uppercase; }
  .fiole { position: absolute; left: 64px; top: 52px; width: 52px; height: 52px; }
  h1 { position: absolute; left: 64px; top: 108px; margin: 0; color: #e9edf8;
    font-weight: 800; font-size: 60px; }
  .etiquette { color: #ffcf5c; font-size: 25px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; }
  .cadre { position: absolute; border: 2px solid rgba(255,207,92,.28);
    border-radius: ${r}px; box-shadow: 0 0 0 10px rgba(255,207,92,.05); }
  .pied { position: absolute; bottom: 40px; left: 64px; right: 64px;
    display: flex; justify-content: space-between; align-items: baseline; }
  .pied b { color: #ffcf5c; font-weight: 700; font-size: 34px; }
  .pied span { color: #9aa5c3; font-weight: 600; font-size: 30px; }
  .etoile { position: absolute; border-radius: 50%; }
  </style></head><body>
  <svg width="1080" height="1920" style="position:absolute;top:0;left:0">
    <defs>
      <radialGradient id="g" cx="80%" cy="4%" r="60%">
        <stop offset="0%" stop-color="#182450"/><stop offset="100%" stop-color="#0b1020"/>
      </radialGradient>
    </defs>
    <path fill="url(#g)" fill-rule="evenodd" d="M0 0 H1080 V1920 H0 Z
      ${cheminArrondi(j.x, j.y, j.l, j.h, r)} ${cheminArrondi(e.x, e.y, e.l, e.h, r)}"/>
  </svg>
  <span class="etoile" style="width:6px;height:6px;background:#e9edf8;top:170px;left:900px"></span>
  <span class="etoile" style="width:5px;height:5px;background:#a98bff;top:76px;left:560px"></span>
  <span class="etoile" style="width:6px;height:6px;background:#46c2a5;top:1064px;left:960px"></span>
  <span class="etoile" style="width:5px;height:5px;background:#ff6b9d;top:1856px;left:540px"></span>
  <svg class="fiole" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M43 22 L43 42 L28 68 A9 9 0 0 0 36 81 L64 81 A9 9 0 0 0 72 68 L57 42 L57 22 Z"
          fill="#0e1530" stroke="#ffcf5c" stroke-width="5" stroke-linejoin="round"/>
    <path d="M50 51 L52 57 L58 59 L52 61 L50 67 L48 61 L42 59 L48 57 Z" fill="#ffcf5c"/>
    <circle cx="39" cy="70" r="2.2" fill="#a98bff"/>
    <circle cx="60" cy="72" r="2" fill="#ff6b9d"/>
    <rect x="38" y="15" width="24" height="7" rx="3.5" fill="#ffcf5c"/>
  </svg>
  <div class="texte kicker">Petit labo d’astronomie</div>
  <h1>${REEL.titre}</h1>
  <div class="etiquette" style="position:absolute;left:${j.x}px;top:${j.y - 40}px">${REEL.vues[0].etiquette}</div>
  <div class="cadre" style="left:${j.x - 2}px;top:${j.y - 2}px;width:${j.l}px;height:${j.h}px"></div>
  <div class="etiquette" style="position:absolute;left:${j.x}px;top:${e.y - 40}px">${REEL.vues[1].etiquette}</div>
  <div class="cadre" style="left:${e.x - 2}px;top:${e.y - 2}px;width:${e.l}px;height:${e.h}px"></div>
  <div class="pied"><b>petit-labo.fr</b><span>gratuit, sans publicité</span></div>
  </body></html>`;
}

// ------------------------------------------------------------- les outils
function trouveFfmpeg() {
  if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  // ffmpeg-static, s'il est installé quelque part d'accessible
  for (const base of [racine, resolve(racine, '..'), process.cwd()]) {
    const p = resolve(base, 'node_modules/ffmpeg-static/ffmpeg');
    if (existsSync(p)) return p;
  }
  try {
    const r = execFileSync('which', ['ffmpeg'], { encoding: 'utf8' }).trim();
    if (r) return r;
  } catch (e) { /* rien */ }
  return null;
}

const ffmpeg = trouveFfmpeg();
if (!ffmpeg) {
  console.error('ffmpeg (avec libx264) introuvable. Indiquer : FFMPEG=/chemin node tools/build-insta-reel.mjs');
  console.error('(celui de Playwright ne sait faire que du VP8 — il ne convient pas)');
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (e) {
  console.error('Playwright introuvable : npm i -g playwright (le réel a besoin d’un navigateur vivant).');
  process.exit(1);
}

// ------------------------------------------------------------------ action
const cadres = resolve(racine, 'tools/reel-frames');
rmSync(cadres, { recursive: true, force: true });
mkdirSync(cadres, { recursive: true });
const sorties = resolve(racine, 'tools/sorties-insta');
mkdirSync(sorties, { recursive: true });

const serveur = await sertLesDepots({ '/__habillage': () => pageHabillage() });
const base = 'http://127.0.0.1:' + serveur.port;

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  .catch(() => chromium.launch());

// 1. l'habillage, une fois, avec alpha
{
  const ctx = await nav.newContext({ viewport: { width: 1080, height: 1920 } });
  const page = await ctx.newPage();
  await page.goto(base + '/__habillage', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(cadres, 'habillage.png'), omitBackground: true });
  await ctx.close();
  console.log('  ✓ habillage (1080×1920, alpha)');
}

// 2. les images, curseur maître image par image
const total = REEL.fps * REEL.secondes;
{
  const ctx = await nav.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(base + '/' + REEL.episode + '/', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.keyboard.press('Space'); // pause de la lecture auto — la commande du site
  await page.waitForTimeout(200);
  const poignees = [];
  for (const v of REEL.vues) {
    const h = await page.$(v.canvas);
    if (!h) { console.error('canvas introuvable : ' + v.canvas); process.exit(1); }
    poignees.push(h);
  }
  for (let i = 0; i < total; i++) {
    const heure = (REEL.depart + REEL.amplitude * i / total) % 24;
    await page.$eval(REEL.curseur, (el, val) => {
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(heure));
    // deux rAF : le canvas se redessine avant la photo
    await page.evaluate(() => new Promise(ok =>
      requestAnimationFrame(() => requestAnimationFrame(ok))));
    const n = String(i).padStart(4, '0');
    for (let k = 0; k < REEL.vues.length; k++) {
      await poignees[k].screenshot({ path: resolve(cadres, REEL.vues[k].nom + '_' + n + '.png') });
    }
    if (i % 60 === 0) console.log('  … image ' + i + '/' + total);
  }
  await ctx.close();
  console.log('  ✓ ' + total + ' pas de temps × ' + REEL.vues.length + ' vues');
}
await nav.close();
serveur.close();

// 3. l'assemblage
const sortie = resolve(sorties, 'reel-' + REEL.episode + '.mp4');
const j = L.jardin, e = L.espace;
execFileSync(ffmpeg, [
  '-y', '-loglevel', 'error',
  '-framerate', String(REEL.fps), '-i', resolve(cadres, 'jardin_%04d.png'),
  '-framerate', String(REEL.fps), '-i', resolve(cadres, 'espace_%04d.png'),
  '-loop', '1', '-i', resolve(cadres, 'habillage.png'),
  '-filter_complex',
  // le shortest vit sur le PREMIER overlay : le fond coloré et l'habillage
  // bouclé sont des sources infinies — arrêté seulement à la fin, le graphe
  // n'aurait plus aucun flux fini pour le borner et encoderait sans fin
  // (leçon payée : un mp4 de 250 Mo qui ne se terminait jamais)
  `color=c=0x0b1020:s=1080x1920:r=${REEL.fps}[fond];` +
  `[0:v]scale=${j.l}:${j.h}[jv];[1:v]scale=${e.l}:${e.h}[ev];` +
  `[fond][jv]overlay=${j.x}:${j.y}:shortest=1[t1];[t1][ev]overlay=${e.x}:${e.y}[t2];` +
  `[t2][2:v]overlay=0:0:shortest=1`,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'medium',
  '-movflags', '+faststart',
  sortie,
]);
console.log('  ✓ ' + sortie.replace(racine + '/', '') + ' (' + REEL.secondes + ' s, boucle parfaite)');
console.log('\nAu montage Instagram : couverture au choix — une image de l’aube, ou la carte 02.');
