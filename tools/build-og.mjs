#!/usr/bin/env node
// Génération des images de partage (og:image, 1200 × 630) — HORS site, même
// mécanique que build-icons : Chromium capture tools/og.html paramétré par URL.
//
//   node tools/build-og.mjs            (tout : portail + épisodes)
//   node tools/build-og.mjs la-lune-change-de-forme   (une seule carte)
//
// La carte du portail est commitée ICI (assets/og.png). Les cartes des épisodes
// sortent dans tools/sorties-og/ (gitignoré) : copier chacune dans SON dépôt
// (docs/og.png) et committer là-bas — le script rappelle les commandes.
// Le registre ci-dessous est la source des titres/sous-titres : le garder
// aligné avec les cartes du portail (index.html) et les pages des épisodes.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// lecture / rognage / écriture PNG, et la recherche de Chromium : la boîte à
// outils commune des générateurs d'images
import { rognePNG, trouveChrome } from './rendu-outils.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');
const page = pathToFileURL(resolve(ici, 'og.html')).href;

const CARTES = [
  {
    id: 'portail', fichier: 'assets/og.png', fiole: 'maitre', kicker: 'Petit labo',
    titre: 'De grandes questions d’enfants',
    sous: 'Des petits sites à toucher, à faire tourner, à écouter. Le parent lit, l’enfant explore.',
  },
  {
    id: 'eclipse-explorer', fichier: 'tools/sorties-og/eclipse-explorer.png',
    fiole: 'astro', kicker: 'Petit labo d’astronomie',
    titre: 'La mécanique des éclipses',
    sous: 'Trois astres bien alignés… et le jour devient nuit.',
  },
  {
    id: 'ou-va-le-soleil', fichier: 'tools/sorties-og/ou-va-le-soleil.png',
    fiole: 'astro', kicker: 'Petit labo d’astronomie',
    titre: 'Où va le Soleil la nuit ?',
    sous: 'Le Soleil ne bouge pas… c’est la Terre qui tourne !',
  },
  {
    id: 'la-terre-tourne', fichier: 'tools/sorties-og/la-terre-tourne.png',
    fiole: 'astro', kicker: 'Petit labo d’astronomie',
    titre: 'Quelle heure est-il là-bas ?',
    sous: 'Quand tu déjeunes, d’autres enfants dorment déjà.',
  },
  {
    id: 'la-lune-change-de-forme', fichier: 'tools/sorties-og/la-lune-change-de-forme.png',
    fiole: 'astro', kicker: 'Petit labo d’astronomie',
    titre: 'Pourquoi la Lune change de forme ?',
    sous: 'La Lune ne change pas — on la voit autrement chaque nuit.',
  },
];

const chrome = trouveChrome();
if (!chrome) {
  console.error('Chromium/Chrome introuvable. Indiquer le binaire : CHROME=/chemin node tools/build-og.mjs');
  process.exit(1);
}
console.log('Navigateur : ' + chrome);

const filtre = process.argv[2];
const cartes = filtre ? CARTES.filter(c => c.id === filtre) : CARTES;
if (!cartes.length) {
  console.error('Carte inconnue : ' + filtre + ' (ids : ' + CARTES.map(c => c.id).join(', ') + ')');
  process.exit(1);
}

mkdirSync(resolve(racine, 'tools/sorties-og'), { recursive: true });
let rate = false;
for (const c of cartes) {
  const sortie = resolve(racine, c.fichier);
  const url = page + '?' + new URLSearchParams({
    fiole: c.fiole, kicker: c.kicker, titre: c.titre, sous: c.sous,
  }).toString();
  const r = spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--screenshot=' + sortie,
    '--window-size=1360,820', // large : le viewport réel perd les bordures de fenêtre
    url,
  ], { encoding: 'utf8' });
  let ok = r.status === 0 && existsSync(sortie) && statSync(sortie).size > 0;
  if (ok) {
    try {
      writeFileSync(sortie, rognePNG(readFileSync(sortie), 1200, 630));
    } catch (e) {
      console.error(String(e && e.message ? e.message : e));
      ok = false;
    }
  }
  console.log((ok ? '  ✓ ' : '  ✗ ') + c.fichier);
  if (!ok) {
    rate = true;
    if (r.stderr) console.error(r.stderr.trim());
  }
}

if (!filtre && !rate) {
  console.log('\nCartes des épisodes à copier dans leurs dépôts (docs/og.png) :');
  for (const c of CARTES.filter(c => c.fichier.indexOf('tools/sorties-og/') === 0)) {
    console.log('  cp ' + c.fichier + ' ../' + c.id + '/docs/og.png');
  }
}
process.exit(rate ? 1 : 0);
