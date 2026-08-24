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
import { deflateSync, inflateSync } from 'node:zlib';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');
const page = pathToFileURL(resolve(ici, 'icone.html')).href;

function trouveChrome() {
  const candidats = [
    process.env.CHROME,
    '/opt/pw-browsers/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  for (const c of candidats) {
    if (existsSync(c)) return c;
  }
  for (const nom of ['chromium', 'chromium-browser', 'google-chrome', 'chrome']) {
    const r = spawnSync('which', [nom], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

/* ---------- PNG maison (lecture, rééchantillonnage, écriture) ---------- */

function lirePNG(octets) {
  if (octets.readUInt32BE(0) !== 0x89504e47) throw new Error('pas un PNG');
  let pos = 8, largeur = 0, hauteur = 0, profondeur = 0, typeCouleur = 0;
  const idat = [];
  while (pos < octets.length) {
    const taille = octets.readUInt32BE(pos);
    const type = octets.toString('ascii', pos + 4, pos + 8);
    const corps = octets.subarray(pos + 8, pos + 8 + taille);
    if (type === 'IHDR') {
      largeur = corps.readUInt32BE(0);
      hauteur = corps.readUInt32BE(4);
      profondeur = corps[8];
      typeCouleur = corps[9];
      if (profondeur !== 8 || (typeCouleur !== 6 && typeCouleur !== 2) || corps[12] !== 0) {
        throw new Error('PNG inattendu (8 bits RGB/RGBA non entrelacé requis)');
      }
    } else if (type === 'IDAT') {
      idat.push(corps);
    }
    pos += 12 + taille;
  }
  const canaux = typeCouleur === 6 ? 4 : 3;
  const brut = inflateSync(Buffer.concat(idat));
  const ligne = largeur * canaux;
  const pixels = Buffer.alloc(hauteur * ligne);
  // défiltrage (spec PNG : none, sub, up, average, paeth)
  for (let y = 0; y < hauteur; y++) {
    const filtre = brut[y * (ligne + 1)];
    const src = y * (ligne + 1) + 1;
    const dst = y * ligne;
    for (let i = 0; i < ligne; i++) {
      const x = brut[src + i];
      const a = i >= canaux ? pixels[dst + i - canaux] : 0;
      const b = y > 0 ? pixels[dst - ligne + i] : 0;
      const c = (y > 0 && i >= canaux) ? pixels[dst - ligne + i - canaux] : 0;
      let v;
      if (filtre === 0) v = x;
      else if (filtre === 1) v = x + a;
      else if (filtre === 2) v = x + b;
      else if (filtre === 3) v = x + ((a + b) >> 1);
      else if (filtre === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = x + (pa <= pb && pa <= pc ? a : (pb <= pc ? b : c));
      } else throw new Error('filtre PNG inconnu : ' + filtre);
      pixels[dst + i] = v & 0xff;
    }
  }
  return { largeur, hauteur, canaux, pixels };
}

// rognage en haut à gauche : la capture est plus grande que la tuile (le
// « headless » de Chromium ampute le viewport de ses bordures de fenêtre,
// d'un montant qui varie selon les versions — on capture large, on rogne exact)
function recadre(img, cibleL, cibleH) {
  const { largeur, hauteur, canaux, pixels } = img;
  if (largeur < cibleL || hauteur < cibleH) {
    throw new Error('capture trop petite (' + largeur + '×' + hauteur + ') pour rogner à ' + cibleL + '×' + cibleH);
  }
  const sortie = Buffer.alloc(cibleL * cibleH * canaux);
  for (let y = 0; y < cibleH; y++) {
    pixels.copy(sortie, y * cibleL * canaux, y * largeur * canaux, y * largeur * canaux + cibleL * canaux);
  }
  return { largeur: cibleL, hauteur: cibleH, canaux, pixels: sortie };
}

// moyenne de zones (chaque pixel cible = moyenne pondérée de la zone source qu'il
// recouvre, poids fractionnaires aux bords) — le bon filtre pour réduire une icône
function reduit(img, cibleL, cibleH) {
  const { largeur, hauteur, canaux, pixels } = img;
  const sortie = Buffer.alloc(cibleL * cibleH * canaux);
  for (let dy = 0; dy < cibleH; dy++) {
    const y0 = dy * hauteur / cibleH, y1 = (dy + 1) * hauteur / cibleH;
    for (let dx = 0; dx < cibleL; dx++) {
      const x0 = dx * largeur / cibleL, x1 = (dx + 1) * largeur / cibleL;
      const somme = new Float64Array(canaux);
      let aire = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const py = Math.min(y1, sy + 1) - Math.max(y0, sy);
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const px = Math.min(x1, sx + 1) - Math.max(x0, sx);
          const poids = px * py;
          const o = (sy * largeur + sx) * canaux;
          for (let k = 0; k < canaux; k++) somme[k] += pixels[o + k] * poids;
          aire += poids;
        }
      }
      const o = (dy * cibleL + dx) * canaux;
      for (let k = 0; k < canaux; k++) sortie[o + k] = Math.round(somme[k] / aire);
    }
  }
  return { largeur: cibleL, hauteur: cibleH, canaux, pixels: sortie };
}

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function morceau(type, corps) {
  const m = Buffer.alloc(12 + corps.length);
  m.writeUInt32BE(corps.length, 0);
  m.write(type, 4, 'ascii');
  corps.copy(m, 8);
  m.writeUInt32BE(crc32(m.subarray(4, 8 + corps.length)), 8 + corps.length);
  return m;
}
function ecritPNG(img) {
  const { largeur, hauteur, canaux, pixels } = img;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;
  ihdr[9] = canaux === 4 ? 6 : 2;
  const ligne = largeur * canaux;
  const brut = Buffer.alloc(hauteur * (ligne + 1));
  for (let y = 0; y < hauteur; y++) {
    brut[y * (ligne + 1)] = 0; // filtre « none » : l'icône est petite, inutile de raffiner
    pixels.copy(brut, y * (ligne + 1) + 1, y * ligne, (y + 1) * ligne);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', ihdr),
    morceau('IDAT', deflateSync(brut, { level: 9 })),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}

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
