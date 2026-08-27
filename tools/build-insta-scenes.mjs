#!/usr/bin/env node
// Les scènes des épisodes qui illustrent les cartes Instagram — HORS site,
// zéro dépendance, même mécanique que build-captures.
//
//   node tools/build-insta-scenes.mjs                    (toutes)
//   node tools/build-insta-scenes.mjs lune-hublot         (une seule)
//   CHROME=/chemin node tools/build-insta-scenes.mjs
//
// Comme build-captures, les épisodes vivent dans des dépôts VOISINS
// (../ou-va-le-soleil…) et le script les sert lui-même en HTTP le temps de la
// capture (rendu-outils/sertLesDepots) : rien à lancer à la main.
//
// Ce que ce script a de particulier : il faut amener la scène AU BON MOMENT
// avant de la photographier. On le fait par le CURSEUR MAÎTRE du site, jamais en
// touchant à une variable interne — ce qui est capturé est donc exactement ce
// qu'un parent voit en faisant glisser le doigt. La page-cadre /__scene ci-
// dessous porte l'épisode dans un iframe DE MÊME ORIGINE : elle peut donc
// bouger son curseur, puis décaler l'iframe pour amener le canvas voulu au coin
// haut-gauche, là où le rognage l'attend.
//
// Deux pièges, tous deux payés ailleurs dans ce dépôt :
//   — surtout PAS de --virtual-time-budget : les épisodes tournent une boucle
//     rAF sans fin, le budget ne s'épuise jamais et Chromium ne rend pas la main ;
//   — la capture part à l'événement « load » de la page-cadre, or le canvas a
//     besoin de quelques images pour se redessiner après le geste. On retient
//     donc le « load » avec une image que le serveur met ATTENTE_MS à répondre.
//
// Sortie : tools/scenes-insta/ (gitignoré) — build-insta.mjs les reprend.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ecritPNG, lirePNG, lance, recadre, sertLesDepots, trouveChrome } from './rendu-outils.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');
const voisins = resolve(racine, '..');
const sorties = resolve(racine, 'tools/scenes-insta');

const ATTENTE_MS = 1600; // le temps laissé au canvas pour se redessiner

// Une scène est un dessin : elle porte forcément plusieurs teintes. Un cadrage
// qui rate (canvas hors de la fenêtre de l'iframe, mise en page qui a bougé)
// sort un aplat de fond — et Chromium ne s'en plaint jamais. On compte donc les
// teintes sur une grille d'échantillons : sous ce seuil, c'est un raté.
const TEINTES_MINIMUM = 24;

function assezDeTeintes(img) {
  const { largeur, hauteur, canaux, pixels } = img;
  const vues = new Set();
  const pas = Math.max(1, Math.floor(Math.min(largeur, hauteur) / 60));
  for (let y = 0; y < hauteur; y += pas) {
    for (let x = 0; x < largeur; x += pas) {
      const o = (y * largeur + x) * canaux;
      // quantifié par 8 : deux dégradés voisins ne comptent pas pour deux teintes
      vues.add(((pixels[o] >> 3) << 10) | ((pixels[o + 1] >> 3) << 5) | (pixels[o + 2] >> 3));
      if (vues.size >= TEINTES_MINIMUM) return true;
    }
  }
  return false;
}

// Chaque scène : l'épisode, le curseur maître et sa valeur, le canvas à
// photographier, et la taille du fichier. L'échelle 2 garde le dessin net une
// fois posé dans une carte de 1080 px de large.
const SCENES = [
  { id: 'soleil-jardin-coucher', episode: 'ou-va-le-soleil',
    curseur: '#time-slider', valeur: '17.6', canvas: '#garden-view', l: 1224, h: 980 },
  { id: 'soleil-jardin-nuit', episode: 'ou-va-le-soleil',
    curseur: '#time-slider', valeur: '0', canvas: '#garden-view', l: 1224, h: 980 },
  { id: 'soleil-espace-nuit', episode: 'ou-va-le-soleil',
    curseur: '#time-slider', valeur: '0', canvas: '#space-view', l: 980, h: 980 },
  { id: 'terre-pole-midi', episode: 'la-terre-tourne',
    curseur: '#time-slider', valeur: '12', canvas: '#pole-view', l: 1260, h: 1260 },
  { id: 'terre-globe', episode: 'la-terre-tourne',
    curseur: '#time-slider', valeur: '12', canvas: '#globe3d-view', l: 884, h: 884 },
  { id: 'lune-hublot', episode: 'la-lune-change-de-forme',
    curseur: '#curseur-jours', valeur: '4.2', canvas: '#canvas-hublot', l: 846, h: 782 },
  { id: 'lune-orbite', episode: 'la-lune-change-de-forme',
    curseur: '#curseur-jours', valeur: '7.4', canvas: '#canvas-orbite', l: 1078, h: 838 },
];

// La page-cadre : un iframe large (le site s'y déploie comme sur un ordinateur),
// le curseur poussé à sa valeur, puis l'iframe décalé pour que le canvas visé
// arrive exactement au coin haut-gauche de la fenêtre.
function cadre(url) {
  const p = url.searchParams;
  const attr = n => JSON.stringify(p.get(n) || '');
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>'
    + 'html,body{margin:0;background:#070b17;overflow:hidden}'
    + '#vue{position:absolute;top:0;left:0;width:1500px;height:1500px;border:0}'
    + '</style></head><body>'
    + '<iframe id="vue" src="/' + (p.get('episode') || '').replace(/[^a-z0-9-]/g, '') + '/"></iframe>'
    + '<img src="/__attente" alt="" width="1" height="1">'
    + '<script>'
    + 'var f=document.getElementById("vue");'
    + 'f.addEventListener("load",function(){'
    + '  var d=f.contentDocument;'
    // le curseur maître, bougé comme un doigt le ferait
    + '  var c=d.querySelector(' + attr('curseur') + ');'
    + '  if(c){c.value=' + attr('valeur') + ';'
    + '    c.dispatchEvent(new Event("input",{bubbles:true}));'
    + '    c.dispatchEvent(new Event("change",{bubbles:true}));}'
    // le canvas visé remonte au coin : FAIRE DÉFILER l'épisode jusqu'à lui (un
    // canvas au-delà de la fenêtre de l'iframe — le globe 3D vit dans la
    // section du jeu, loin dans la page — sortirait en noir), puis décaler
    // l'iframe du reste. Et RECALER en continu jusqu'à la capture : la mise en
    // page bouge encore après le chargement (la boîte-explication s'ouvre sur
    // ordinateur, la police arrive) et un cadrage fait une seule fois se
    // retrouve décalé d'autant (leçon payée : deux cartes vides livrées).
    + '  var v=d.querySelector(' + attr('canvas') + ');'
    + '  if(v){var cale=function(){'
    + '    v.scrollIntoView({block:"start",inline:"start",behavior:"instant"});'
    + '    var b=v.getBoundingClientRect();'
    + '    f.style.left=(-b.left)+"px";f.style.top=(-b.top)+"px";};'
    + '    cale();setInterval(cale,200);}'
    + '});'
    + '<\/script></body></html>';
}

const chrome = trouveChrome();
if (!chrome) {
  console.error('Chromium/Chrome introuvable. Indiquer le binaire : CHROME=/chemin node tools/build-insta-scenes.mjs');
  process.exit(1);
}
console.log('Navigateur : ' + chrome);

const filtre = process.argv[2];
const scenes = filtre ? SCENES.filter(s => s.id === filtre) : SCENES;
if (!scenes.length) {
  console.error('Scène inconnue : ' + filtre + ' (ids : ' + SCENES.map(s => s.id).join(', ') + ')');
  process.exit(1);
}

const manquants = [...new Set(scenes.map(s => s.episode))]
  .filter(id => !existsSync(join(voisins, id, 'index.html')));
if (manquants.length) {
  console.error('Dépôt(s) voisin(s) introuvable(s) : ' + manquants.map(id => '../' + id).join(', '));
  console.error('Cloner les épisodes à côté du portail, puis relancer.');
  process.exit(1);
}

mkdirSync(sorties, { recursive: true });

const serveur = await sertLesDepots({
  '/__scene': url => cadre(url),
  // la retenue du « load » : le navigateur attend cette image, donc il attend
  // que le canvas ait eu le temps de se redessiner après le geste
  '/__attente': () => new Promise(ok => setTimeout(() => ok({
    type: 'image/gif',
    corps: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
  }), ATTENTE_MS)),
});

let rate = false;
for (const s of scenes) {
  const sortie = resolve(sorties, s.id + '.png');
  const params = new URLSearchParams({
    episode: s.episode, curseur: s.curseur, valeur: s.valeur, canvas: s.canvas,
  });
  const r = await lance(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    '--screenshot=' + sortie,
    // large : le « headless » ampute la fenêtre de ses bordures, on rogne après
    '--window-size=' + (s.l / 2 + 200) + ',' + (s.h / 2 + 260),
    'http://127.0.0.1:' + serveur.port + '/__scene?' + params.toString(),
  ]);
  let ok = r.code === 0 && existsSync(sortie) && statSync(sortie).size > 0;
  let plat = false;
  if (ok) {
    try {
      const img = recadre(lirePNG(readFileSync(sortie)), s.l, s.h);
      plat = !assezDeTeintes(img);
      writeFileSync(sortie, ecritPNG(img));
      if (plat) ok = false;
    } catch (e) {
      console.error(String(e && e.message ? e.message : e));
      ok = false;
    }
  }
  console.log((ok ? '  ✓ ' : '  ✗ ') + s.id + '.png (' + s.l + '×' + s.h + ')'
    + (plat ? '  — image presque unie : le canvas n’était pas dans le cadre' : ''));
  if (!ok) {
    rate = true;
    if (r.err) console.error(r.err.trim());
  }
}

serveur.close();
process.exit(rate ? 1 : 0);
