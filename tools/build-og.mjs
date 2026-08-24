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
import { deflateSync, inflateSync } from 'node:zlib';

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

/* ---------- PNG maison : rogner la capture à 1200 × 630 exactement ----------
   Le « headless » de Chromium compte ses bordures de fenêtre dans --window-size :
   le viewport réel fait ~85 px de moins que demandé (et ça varie selon les
   versions). On capture donc PLUS HAUT que nécessaire, la carte ancrée en haut
   à gauche, puis on rogne mécaniquement — même lecture/écriture PNG maison que
   build-icons (zlib intégré à Node, zéro dépendance). */

function lirePNG(octets) {
  if (octets.readUInt32BE(0) !== 0x89504e47) throw new Error('pas un PNG');
  let pos = 8, largeur = 0, hauteur = 0, typeCouleur = 0;
  const idat = [];
  while (pos < octets.length) {
    const taille = octets.readUInt32BE(pos);
    const type = octets.toString('ascii', pos + 4, pos + 8);
    const corps = octets.subarray(pos + 8, pos + 8 + taille);
    if (type === 'IHDR') {
      largeur = corps.readUInt32BE(0);
      hauteur = corps.readUInt32BE(4);
      typeCouleur = corps[9];
      if (corps[8] !== 8 || (typeCouleur !== 6 && typeCouleur !== 2) || corps[12] !== 0) {
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
function rognePNG(octets, cibleL, cibleH) {
  const img = lirePNG(octets);
  if (img.largeur < cibleL || img.hauteur < cibleH) {
    throw new Error('capture trop petite (' + img.largeur + '×' + img.hauteur + ') pour rogner à ' + cibleL + '×' + cibleH);
  }
  const ligneSrc = img.largeur * img.canaux;
  const ligneDst = cibleL * img.canaux;
  const brut = Buffer.alloc(cibleH * (ligneDst + 1));
  for (let y = 0; y < cibleH; y++) {
    brut[y * (ligneDst + 1)] = 0;
    img.pixels.copy(brut, y * (ligneDst + 1) + 1, y * ligneSrc, y * ligneSrc + ligneDst);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cibleL, 0);
  ihdr.writeUInt32BE(cibleH, 4);
  ihdr[8] = 8;
  ihdr[9] = img.canaux === 4 ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', ihdr),
    morceau('IDAT', deflateSync(brut, { level: 9 })),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}

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
