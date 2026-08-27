#!/usr/bin/env node
// Captures des scènes des trois épisodes, pour les cartes Instagram.
//
// C'est le SEUL script du kit qui demande Playwright — comme les suites de
// vérification navigateur de la famille, il pilote un vrai navigateur : il faut
// bouger le curseur du site pour amener la scène au bon moment, ce que le
// Chromium en ligne de commande (utilisé par build-insta.mjs) ne sait pas faire.
// Playwright est installé globalement dans l'environnement de travail ; sinon :
//   npm i -g playwright   puis   ln -s "$(npm root -g)" tools/insta/node_modules
//
// Servir les quatre sites AVANT (un port par dépôt, voisins l'un de l'autre) :
//   (cd ../ou-va-le-soleil        && python3 -m http.server 8101 &)
//   (cd ../la-terre-tourne        && python3 -m http.server 8102 &)
//   (cd ../la-lune-change-de-forme && python3 -m http.server 8103 &)
//   node tools/insta/captures.mjs
//
// Sortie : tools/insta/scenes/ (gitignoré) — build-insta.mjs les reprend.
//
// Règle : on amène la scène au bon moment PAR LE CURSEUR MAÎTRE du site, jamais
// en touchant à des variables internes. Ce qui est capturé est donc exactement
// ce qu'un parent voit en faisant glisser le curseur.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const SORTIE = resolve(ici, 'scenes');
mkdirSync(SORTIE, { recursive: true });

const SOLEIL = 'http://localhost:8101/';
const TERRE = 'http://localhost:8102/';
const LUNE = 'http://localhost:8103/';

const SCENES = [
  { id: 'soleil-jardin-coucher', url: SOLEIL, canvas: '#garden-view',
    curseur: '#time-slider', valeur: '17.6', vp: { width: 1500, height: 1000 } },
  { id: 'soleil-jardin-nuit', url: SOLEIL, canvas: '#garden-view',
    curseur: '#time-slider', valeur: '0', vp: { width: 1500, height: 1000 } },
  { id: 'soleil-espace-nuit', url: SOLEIL, canvas: '#space-view',
    curseur: '#time-slider', valeur: '0', vp: { width: 1500, height: 1000 } },
  { id: 'terre-pole-midi', url: TERRE, canvas: '#pole-view',
    curseur: '#time-slider', valeur: '12', vp: { width: 1500, height: 1100 } },
  { id: 'terre-globe', url: TERRE, canvas: '#globe3d-view',
    curseur: '#time-slider', valeur: '12', vp: { width: 1500, height: 1400 } },
  { id: 'lune-hublot-croissant', url: LUNE, canvas: '#canvas-hublot',
    curseur: '#curseur-jours', valeur: '4.2', vp: { width: 1500, height: 1000 } },
  { id: 'lune-orbite', url: LUNE, canvas: '#canvas-orbite',
    curseur: '#curseur-jours', valeur: '7.4', vp: { width: 1500, height: 1000 } },
];

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  .catch(() => chromium.launch());

let rate = false;
for (const s of SCENES) {
  // deviceScaleFactor 2 : les canvas sont redessinés en haute densité, la carte
  // Instagram (1080 de large) ne montre donc aucun escalier
  const ctx = await nav.newContext({ viewport: s.vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  await page.goto(s.url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const trouve = await page.$(s.curseur);
  if (!trouve) { console.log('  ✗ ' + s.id + ' — curseur introuvable'); rate = true; await ctx.close(); continue; }
  await page.$eval(s.curseur, (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, s.valeur);
  await page.waitForTimeout(1400); // les scénarios vont au moment choisi en douceur
  const el = await page.$(s.canvas);
  if (!el) { console.log('  ✗ ' + s.id + ' — canvas introuvable'); rate = true; await ctx.close(); continue; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const boite = await el.boundingBox();
  await el.screenshot({ path: resolve(SORTIE, s.id + '.png') });
  console.log('  ✓ ' + s.id + '  ' + Math.round(boite.width) + '×' + Math.round(boite.height)
    + (erreurs.length ? '  ⚠ ' + erreurs.length + ' erreur(s) console' : ''));
  await ctx.close();
}
await nav.close();
process.exit(rate ? 1 : 0);
