#!/usr/bin/env node
// Captures d'écran des épisodes pour la page presse — HORS site, zéro dépendance.
//
//   node tools/build-captures.mjs                     (les trois)
//   node tools/build-captures.mjs la-terre-tourne     (un seul)
//   CHROME=/chemin node tools/build-captures.mjs
//
// Les épisodes vivent dans des dépôts VOISINS (../ou-va-le-soleil…) : le script
// les sert lui-même en HTTP le temps de la capture — un file:// ne marcherait
// pas, les épisodes sont des modules ES et le navigateur les refuserait.
// Chromium capture large, Node rogne exactement. Deux formats par épisode :
// ordinateur (1280 × 1000, la hauteur qui tient les deux vues sans couper un
// canvas) et téléphone (visuel 390 × 844 — un iPhone —, capturé à l'échelle 2
// pour rester net dans une mise en page : fichier 780 × 1688).
//
// Les images sortent dans assets/presse/ et sont COMMITÉES : ce sont les
// visuels proposés au téléchargement sur /presse/. À régénérer après toute
// évolution visuelle d'un épisode.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rognePNG, trouveChrome } from './rendu-outils.mjs';

// Chromium est lancé en ASYNCHRONE, jamais en spawnSync : le serveur statique
// ci-dessous vit dans CE processus, et un spawnSync bloquerait la boucle
// d'événements — le navigateur attendrait indéfiniment une page que Node ne
// servirait jamais (leçon payée).
function lance(commande, args) {
  return new Promise(ok => {
    const p = spawn(commande, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('close', code => ok({ code: code, err: err }));
  });
}

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');
const voisins = resolve(racine, '..'); // le dossier qui contient tous les dépôts

// fenêtre : le viewport demandé à Chromium (plus grand que la cible, le
// « headless » ampute la fenêtre de ses bordures) ; echelle : le
// device-scale-factor ; largeur/hauteur : le rognage final, en pixels de fichier
const ORDINATEUR = { largeur: 1280, hauteur: 1000, fenetre: [1320, 1220], echelle: 1 };
// téléphone : la fenêtre du « headless » ne descend pas sous ~500 px (même
// leçon que build-icons) — demander 390 rend la page à ~500 et la capture n'en
// montre que les 390 premiers, côté droit coupé (leçon payée : trois captures
// amputées). Le viewport de 390 vient donc d'un IFRAME de 390 × 844 exactement
// (un iframe n'a pas de largeur minimale), servi par la page-cadre
// /__telephone/<id> du serveur ci-dessous, dans une fenêtre assez large.
const TELEPHONE = { largeur: 780, hauteur: 1688, fenetre: [520, 900], echelle: 2, cadre: true };

const IDS = ['ou-va-le-soleil', 'la-terre-tourne', 'la-lune-change-de-forme'];
const EPISODES = [];
for (const id of IDS) {
  EPISODES.push({ id: id, fichier: 'assets/presse/capture-' + id + '.png', format: ORDINATEUR });
  EPISODES.push({ id: id, fichier: 'assets/presse/capture-' + id + '-telephone.png', format: TELEPHONE });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

const chrome = trouveChrome();
if (!chrome) {
  console.error('Chromium/Chrome introuvable. Indiquer le binaire : CHROME=/chemin node tools/build-captures.mjs');
  process.exit(1);
}
console.log('Navigateur : ' + chrome);

const filtre = process.argv[2];
const episodes = filtre ? EPISODES.filter(e => e.id === filtre) : EPISODES;
if (!episodes.length) {
  console.error('Épisode inconnu : ' + filtre + ' (ids : ' + EPISODES.map(e => e.id).join(', ') + ')');
  process.exit(1);
}

const manquants = episodes.filter(e => !existsSync(join(voisins, e.id, 'index.html')));
if (manquants.length) {
  console.error('Dépôt(s) voisin(s) introuvable(s) : ' + manquants.map(e => '../' + e.id).join(', '));
  console.error('Cloner les épisodes à côté du portail, puis relancer.');
  process.exit(1);
}

// petit serveur statique : la racine sert le DOSSIER DES DÉPÔTS, donc
// /ou-va-le-soleil/ tombe pile sur le chemin qu'aura le site en production.
// /__telephone/<id> sert la page-cadre du format téléphone (l'iframe ancré en
// haut à gauche, aux dimensions CSS d'un iPhone).
const serveur = createServer((req, rep) => {
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  const tel = chemin.match(/^\/__telephone\/([a-z0-9-]+)$/);
  if (tel) {
    rep.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    rep.end('<!doctype html><html><head><meta charset="utf-8"><style>' +
      'html,body{margin:0;background:#0b1020}' +
      'iframe{display:block;width:390px;height:844px;border:0}' +
      '</style></head><body><iframe src="/' + tel[1] + '/"></iframe></body></html>');
    return;
  }
  if (chemin.endsWith('/')) chemin += 'index.html';
  const fichier = join(voisins, normalize(chemin).replace(/^(\.\.[/\\])+/, ''));
  if (fichier.indexOf(voisins) !== 0 || !existsSync(fichier) || statSync(fichier).isDirectory()) {
    rep.writeHead(404).end('introuvable');
    return;
  }
  rep.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream' });
  createReadStream(fichier).pipe(rep);
});

await new Promise(ok => serveur.listen(0, '127.0.0.1', ok));
const port = serveur.address().port;

let rate = false;
for (const e of episodes) {
  const sortie = resolve(racine, e.fichier);
  const r = await lance(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=' + e.format.echelle,
    '--screenshot=' + sortie,
    // Surtout PAS de --virtual-time-budget ici : les épisodes tournent une
    // boucle rAF sans fin, le budget de temps virtuel ne s'épuise jamais et
    // Chromium ne rend jamais la main (leçon payée). La capture après
    // l'événement « load » suffit : les canvas sont déjà dessinés.
    '--window-size=' + e.format.fenetre[0] + ',' + e.format.fenetre[1],
    'http://127.0.0.1:' + port + (e.format.cadre ? '/__telephone/' + e.id : '/' + e.id + '/'),
  ]);
  let ok = r.code === 0 && existsSync(sortie) && statSync(sortie).size > 0;
  if (ok) {
    try {
      writeFileSync(sortie, rognePNG(readFileSync(sortie), e.format.largeur, e.format.hauteur));
    } catch (err) {
      console.error(String(err && err.message ? err.message : err));
      ok = false;
    }
  }
  console.log((ok ? '  ✓ ' : '  ✗ ') + e.fichier + ' (' + e.format.largeur + '×' + e.format.hauteur + ')');
  if (!ok) {
    rate = true;
    if (r.err) console.error(r.err.trim());
  }
}

serveur.close();
process.exit(rate ? 1 : 0);
