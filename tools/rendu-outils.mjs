#!/usr/bin/env node
// La boîte à outils commune des générateurs d'images du portail (build-icons,
// build-og, build-marque, build-captures, build-insta) : trouver Chromium, le
// lancer, servir les dépôts d'épisodes, et lire / rogner / rééchantillonner /
// écrire un PNG à la main. Zéro dépendance : seul zlib, intégré à Node, est
// utilisé.
//
// Pourquoi maison : Chromium « headless » ampute le viewport de ses bordures de
// fenêtre, d'un montant qui varie selon les versions. On capture donc PLUS GRAND
// que nécessaire, le dessin ancré en haut à gauche, puis on rogne au pixel près
// — et on rééchantillonne quand il faut plusieurs tailles.
//
// Contraintes assumées du décodeur : 8 bits par canal, RGB ou RGBA, non
// entrelacé. C'est exactement ce que produit Chromium.

import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

// Chromium/Chrome, où qu'il soit — même liste pour tous les générateurs
// (variable CHROME=/chemin pour forcer)
export function trouveChrome() {
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

// Chromium en ASYNCHRONE, jamais en spawnSync : quand un serveur statique vit
// dans CE processus (voir sertLesDepots), un spawnSync bloquerait la boucle
// d'événements — le navigateur attendrait indéfiniment une page que Node ne
// servirait jamais (leçon payée).
export function lance(commande, args) {
  return new Promise(ok => {
    const p = spawn(commande, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('close', code => ok({ code: code, err: err }));
  });
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

/* Le petit serveur statique des générateurs qui photographient les épisodes.
   Les épisodes vivent dans des dépôts VOISINS (../ou-va-le-soleil…) : un
   file:// ne marcherait pas, ce sont des modules ES et le navigateur les
   refuserait. La racine servie est le DOSSIER DES DÉPÔTS, donc /ou-va-le-soleil/
   tombe pile sur le chemin qu'aura le site en production.

   `pages` ajoute des routes fabriquées à la volée — les pages-cadres dont les
   générateurs ont besoin (un iframe aux dimensions d'un téléphone, un iframe
   piloté au curseur…) : { '/__x/': (url) => '<!doctype html>…' }, la première
   route dont le chemin est un préfixe gagne. Une route peut renvoyer du HTML,
   un { type, corps } pour choisir son type MIME, ou une promesse de l'un des
   deux — c'est ce qui permet de faire ATTENDRE le navigateur (une route lente
   retient l'événement « load » de la page qui la référence).

   Renvoie { port, close } ; l'appelant ferme quand il a fini. */
export async function sertLesDepots(pages) {
  const ici = dirname(fileURLToPath(import.meta.url));
  const voisins = resolve(ici, '../..'); // le dossier qui contient tous les dépôts
  const routes = Object.keys(pages || {});
  const serveur = createServer((req, rep) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let chemin = decodeURIComponent(url.pathname);
    for (const prefixe of routes) {
      if (chemin.indexOf(prefixe) === 0) {
        Promise.resolve(pages[prefixe](url)).then(reponse => {
          const r = typeof reponse === 'string' ? { corps: reponse } : reponse;
          rep.writeHead(200, { 'Content-Type': r.type || 'text/html; charset=utf-8' });
          rep.end(r.corps);
        });
        return;
      }
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
  return { port: serveur.address().port, close: () => serveur.close() };
}

export function lirePNG(octets) {
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

// rognage en haut à gauche : la capture est plus grande que la cible, le dessin
// est ancré au coin — on garde le rectangle utile
export function recadre(img, cibleL, cibleH) {
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
// recouvre, poids fractionnaires aux bords) — le bon filtre pour réduire une image
export function reduit(img, cibleL, cibleH) {
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

export function ecritPNG(img) {
  const { largeur, hauteur, canaux, pixels } = img;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;
  ihdr[9] = canaux === 4 ? 6 : 2;
  const ligne = largeur * canaux;
  const brut = Buffer.alloc(hauteur * (ligne + 1));
  for (let y = 0; y < hauteur; y++) {
    brut[y * (ligne + 1)] = 0; // filtre « none » : inutile de raffiner, zlib fait le reste
    pixels.copy(brut, y * (ligne + 1) + 1, y * ligne, (y + 1) * ligne);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', ihdr),
    morceau('IDAT', deflateSync(brut, { level: 9 })),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}

// le raccourci le plus courant : octets d'une capture → octets d'un PNG rogné
export function rognePNG(octets, cibleL, cibleH) {
  return ecritPNG(recadre(lirePNG(octets), cibleL, cibleH));
}
