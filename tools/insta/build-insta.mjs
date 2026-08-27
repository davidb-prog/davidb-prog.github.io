#!/usr/bin/env node
// Génération du kit d'images du compte Instagram vitrine — HORS site, même
// mécanique que tools/build-og.mjs : Chromium capture tools/insta/carte.html
// paramétré par URL, puis on rogne au pixel près en pur Node (zéro dépendance).
//
//   node tools/insta/build-insta.mjs             (tout le kit)
//   node tools/insta/build-insta.mjs 02-soleil   (une seule carte)
//
// Les SCÈNES (les dessins des trois épisodes) ne se dessinent pas ici : elles
// sont capturées sur les sites eux-mêmes par tools/insta/captures.mjs, qui les
// dépose dans tools/insta/scenes/. Lancer captures.mjs AVANT ce script.
//
// Sortie : tools/sorties-insta/ (gitignoré, comme sorties-og) — les fichiers
// se déposent tels quels dans Instagram.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '../..');
const page = pathToFileURL(resolve(ici, 'carte.html')).href;

const POST = { largeur: 1080, hauteur: 1350 };  // publication (4:5, le plus grand format du fil)
const CARRE = { largeur: 1080, hauteur: 1080 }; // avatar

// Le registre des cartes. L'ordre est celui du kit livré : la carte 01 est
// l'épinglée, les 02–04 sont les trois épisodes, le reste tourne autour.
const CARTES = [
  {
    id: '00-avatar', taille: CARRE,
    p: { type: 'avatar', format: 'carre', fiole: 'maitre' },
  },
  {
    id: '01-ouverture', taille: POST,
    p: {
      type: 'marque', fiole: 'maitre',
      titre: 'De grandes questions\nd’enfants',
      sous: 'Des petits sites à toucher,\nà faire tourner, à écouter.',
    },
  },
  {
    id: '02-ou-va-le-soleil', taille: POST,
    p: {
      type: 'scene', kicker: 'Petit labo d’astronomie',
      titre: 'Où va le Soleil la nuit ?',
      image: 'scenes/soleil-jardin-coucher.png', rogne: '1', pos: '100%',
      sous: 'Il ne va _nulle part_. C’est la Terre qui tourne — et le soir, votre maison lui tourne le dos.',
    },
  },
  {
    id: '03-quelle-heure-la-bas', taille: POST,
    p: {
      type: 'scene', kicker: 'Petit labo d’astronomie',
      titre: 'Quelle heure est-il là-bas ?',
      // le cadre monte à 790 px et la coupe se cale en haut : sinon le cartouche
      // des deux heures — tout le propos de l'épisode — sort de l'image
      image: 'scenes/terre-pole-midi.png', rogne: '1', hauteur: '790', pos: '0%',
      sous: 'Il est midi chez vous. _Sept heures du matin_ en Guadeloupe. La Terre vue de tout en haut, et tout s’explique.',
    },
  },
  {
    id: '04-pourquoi-la-lune', taille: POST,
    p: {
      type: 'scene', kicker: 'Petit labo d’astronomie',
      titre: 'Pourquoi la Lune\nchange de forme ?',
      image: 'scenes/lune-hublot-croissant.png', rogne: '1', pos: '42%',
      sous: 'Elle ne change pas. Elle est _toujours à moitié éclairée_ — c’est nous qui la voyons d’un autre côté chaque nuit.',
    },
  },
  {
    id: '05-deux-regards', taille: POST,
    p: {
      type: 'duo',
      kicker: 'Le principe du Petit labo',
      titre: 'Le même moment,\ndeux regards',
      etiquette1: 'Depuis le jardin',
      etiquette2: 'Depuis l’espace',
      image: 'scenes/soleil-jardin-nuit.png', pos: '60%',
      image2: 'scenes/soleil-espace-nuit.png', pos2: '50%',
      sous: 'Les deux vues bougent ensemble. C’est là que l’enfant comprend.',
    },
  },
  {
    id: '06-citation-simplifier', taille: POST,
    p: {
      type: 'citation', fiole: 'maitre', kicker: 'Règle d’écriture',
      titre: 'On simplifie\nfranchement.\n*On ne ment jamais.*',
      sous: 'Chaque site dit aussi ce qu’il simplifie — dans une note aux parents, en bas de page.',
      pied: 'à explorer en famille dès 5 ans',
    },
  },
  {
    id: '07-a-deux', taille: POST,
    p: {
      type: 'scene', kicker: 'Comment ça se joue',
      titre: 'Vous lisez.\nL’enfant explore.',
      image: 'scenes/terre-globe.png', rogne: '1',
      sous: 'Peu de texte, de gros dessins, et une voix qui raconte si vous préférez écouter. Dès 5 ans, avant de savoir lire.',
    },
  },
  {
    id: '08-promesses', taille: POST,
    p: {
      type: 'liste', fiole: 'maitre', kicker: 'Ce qu’il y a — et pas',
      titre: 'Ce que vous ouvrez\nquand vous cliquez',
      liste: [
        'Gratuit, sans publicité~Aucune bannière, aucune vidéo à regarder pour continuer.',
        'Sans compte, sans inscription~Une adresse, une page. Rien à créer, rien à donner.',
        'Sans pisteur ni cookie~La mesure d’audience ne pose aucun cookie et ne suit personne.',
      ].join('|'),
      pied: 'à explorer en famille dès 5 ans',
    },
  },
  {
    id: '09-la-lune-ne-change-pas', taille: POST,
    p: {
      type: 'scene', kicker: 'La vérité derrière l’épisode',
      titre: 'La Lune ne change\npas de forme',
      image: 'scenes/lune-orbite.png', rogne: '1', pos: '50%',
      sous: 'Vue de l’espace, sa moitié éclairée fait _toujours_ face au Soleil. Ce qui change, c’est notre point de vue.',
    },
  },
  {
    id: '10-la-fiole', taille: POST,
    p: {
      type: 'fioles', fiole: 'maitre', kicker: 'La marque',
      titre: 'L’expérience fait\nnaître la question',
      sous: 'Le logo raconte ça : une fiole d’où s’échappe un point d’interrogation.',
      pied: 'à explorer en famille dès 5 ans',
    },
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
  for (const c of candidats) if (existsSync(c)) return c;
  for (const nom of ['chromium', 'chromium-browser', 'google-chrome', 'chrome']) {
    const r = spawnSync('which', [nom], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

/* ---------- PNG maison : rogner la capture au format exact ----------
   Repris tel quel de tools/build-og.mjs — le « headless » de Chromium compte
   ses bordures de fenêtre dans --window-size, donc on capture plus grand, la
   carte ancrée en haut à gauche, puis on rogne mécaniquement. */

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
  console.error('Chromium/Chrome introuvable. Indiquer le binaire : CHROME=/chemin node tools/insta/build-insta.mjs');
  process.exit(1);
}
console.log('Navigateur : ' + chrome);

if (!existsSync(resolve(ici, 'scenes'))) {
  console.error('tools/insta/scenes/ est vide : lancer d’abord les serveurs des sites puis');
  console.error('  node tools/insta/captures.mjs');
  process.exit(1);
}

const filtre = process.argv[2];
const cartes = filtre ? CARTES.filter(c => c.id === filtre) : CARTES;
if (!cartes.length) {
  console.error('Carte inconnue : ' + filtre + ' (ids : ' + CARTES.map(c => c.id).join(', ') + ')');
  process.exit(1);
}

const sorties = resolve(racine, 'tools/sorties-insta');
mkdirSync(sorties, { recursive: true });
let rate = false;
for (const c of cartes) {
  const sortie = resolve(sorties, c.id + '.png');
  const url = page + '?' + new URLSearchParams(c.p).toString();
  const r = spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--screenshot=' + sortie,
    // large : le viewport réel perd les bordures de fenêtre, on rogne après
    '--window-size=' + (c.taille.largeur + 160) + ',' + (c.taille.hauteur + 220),
    '--virtual-time-budget=3000', // laisse la woff2 et les PNG des scènes arriver
    url,
  ], { encoding: 'utf8' });
  let ok = r.status === 0 && existsSync(sortie) && statSync(sortie).size > 0;
  if (ok) {
    try {
      writeFileSync(sortie, rognePNG(readFileSync(sortie), c.taille.largeur, c.taille.hauteur));
    } catch (e) {
      console.error(String(e && e.message ? e.message : e));
      ok = false;
    }
  }
  console.log((ok ? '  ✓ ' : '  ✗ ') + c.id + '.png  ' + c.taille.largeur + '×' + c.taille.hauteur);
  if (!ok) {
    rate = true;
    if (r.stderr) console.error(r.stderr.trim());
  }
}

if (!rate) console.log('\nKit prêt : tools/sorties-insta/ — les fichiers se déposent tels quels.');
process.exit(rate ? 1 : 0);
