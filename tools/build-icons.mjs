#!/usr/bin/env node
// Génération des icônes du Petit labo — HORS site, comme les outils voix des épisodes.
// Zéro dépendance : Chromium « headless » capture tools/icone.html en 512×512 (sa
// fenêtre ne descend pas plus bas : ~500 px de minimum), puis le script décode le
// PNG lui-même (zlib intégré à Node) et le rééchantillonne en 192 et 180.
//
//   node tools/build-icons.mjs
//   CHROME=/chemin/vers/chrome node tools/build-icons.mjs   (si non trouvé tout seul)
//
// La source du dessin est assets/marque/fiole.svg, recopiée dans tools/icone.html
// (le gabarit ajoute la tuile de nuit étoilée) : toute retouche du logo se fait
// dans les DEUX fichiers, puis on relance ce script avant de committer.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// lecture / rognage / rééchantillonnage / écriture PNG, et la recherche de
// Chromium : la boîte à outils commune des générateurs d'images
import { ecritPNG, lirePNG, recadre, reduit, trouveChrome } from './rendu-outils.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');
const page = pathToFileURL(resolve(ici, 'icone.html')).href;

/* ---------- la fabrication ---------- */

const chrome = trouveChrome();
if (!chrome) {
  console.error('Chromium/Chrome introuvable. Indiquer le binaire : CHROME=/chemin node tools/build-icons.mjs');
  process.exit(1);
}
console.log('Navigateur : ' + chrome);

const maitre = resolve(racine, 'icons/icon-512.png');
const r = spawnSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--screenshot=' + maitre,
  '--window-size=700,700', // large exprès : le viewport réel perd les bordures de fenêtre
  page,
], { encoding: 'utf8' });
if (r.status !== 0 || !existsSync(maitre) || statSync(maitre).size === 0) {
  console.error('  ✗ icons/icon-512.png — la capture Chromium a échoué');
  if (r.stderr) console.error(r.stderr.trim());
  process.exit(1);
}
const source = recadre(lirePNG(readFileSync(maitre)), 512, 512);
writeFileSync(maitre, ecritPNG(source));
console.log('  ✓ icons/icon-512.png (512×512, capture Chromium rognée)');
for (const s of [
  { taille: 192, fichier: 'icons/icon-192.png' },
  { taille: 180, fichier: 'apple-touch-icon.png' },
]) {
  writeFileSync(resolve(racine, s.fichier), ecritPNG(reduit(source, s.taille, s.taille)));
  console.log('  ✓ ' + s.fichier + ' (' + s.taille + '×' + s.taille + ', rééchantillonné)');
}
