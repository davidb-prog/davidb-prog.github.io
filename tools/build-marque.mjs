#!/usr/bin/env node
// Génération des images de marque téléchargeables — HORS site, même mécanique
// que build-icons / build-og : Chromium capture tools/marque.html, Node rogne.
//
//   node tools/build-marque.mjs             (les deux)
//   node tools/build-marque.mjs avatar      (un seul)
//   CHROME=/chemin node tools/build-marque.mjs
//
// Ces deux fichiers sont commités dans assets/marque/ : ils sont proposés au
// téléchargement sur /presse/ et servent aux profils sociaux. Toute retouche du
// logo se fait dans assets/marque/fiole.svg ET dans tools/marque.html (qui en
// recopie le dessin), puis on relance ce script avant de committer.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { rognePNG, trouveChrome } from './rendu-outils.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');
const page = pathToFileURL(resolve(ici, 'marque.html')).href;

const IMAGES = [
  { id: 'banniere', fichier: 'assets/marque/banniere-1600x512.png', largeur: 1600, hauteur: 512 },
  { id: 'avatar', fichier: 'assets/marque/avatar-512.png', largeur: 512, hauteur: 512 },
];

const chrome = trouveChrome();
if (!chrome) {
  console.error('Chromium/Chrome introuvable. Indiquer le binaire : CHROME=/chemin node tools/build-marque.mjs');
  process.exit(1);
}
console.log('Navigateur : ' + chrome);

const filtre = process.argv[2];
const images = filtre ? IMAGES.filter(i => i.id === filtre) : IMAGES;
if (!images.length) {
  console.error('Image inconnue : ' + filtre + ' (ids : ' + IMAGES.map(i => i.id).join(', ') + ')');
  process.exit(1);
}

let rate = false;
for (const img of images) {
  const sortie = resolve(racine, img.fichier);
  const r = spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--screenshot=' + sortie,
    // large exprès : le viewport réel perd les bordures de fenêtre
    '--window-size=' + (img.largeur + 200) + ',' + (img.hauteur + 260),
    page + '?format=' + img.id,
  ], { encoding: 'utf8' });
  let ok = r.status === 0 && existsSync(sortie) && statSync(sortie).size > 0;
  if (ok) {
    try {
      writeFileSync(sortie, rognePNG(readFileSync(sortie), img.largeur, img.hauteur));
    } catch (e) {
      console.error(String(e && e.message ? e.message : e));
      ok = false;
    }
  }
  console.log((ok ? '  ✓ ' : '  ✗ ') + img.fichier + ' (' + img.largeur + '×' + img.hauteur + ')');
  if (!ok) {
    rate = true;
    if (r.stderr) console.error(r.stderr.trim());
  }
}

process.exit(rate ? 1 : 0);
