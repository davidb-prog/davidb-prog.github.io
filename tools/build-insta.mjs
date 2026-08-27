#!/usr/bin/env node
// Génération des publications du compte Instagram vitrine — HORS site, même
// mécanique que build-og / build-marque : Chromium capture tools/insta.html
// paramétré par URL, rendu-outils rogne au pixel près.
//
//   node tools/build-insta.mjs                      (tout le kit)
//   node tools/build-insta.mjs 02-ou-va-le-soleil   (une seule carte)
//   CHROME=/chemin node tools/build-insta.mjs
//
// Les SCÈNES (les dessins des trois épisodes) ne se dessinent pas ici : elles
// sont photographiées sur les sites par tools/build-insta-scenes.mjs, qui les
// dépose dans tools/scenes-insta/. Lancer ce script-là AVANT celui-ci.
//
// L'AVATAR du compte n'est pas produit ici non plus : c'est
// assets/marque/avatar-512.png (build-marque.mjs), le fichier que la page
// presse propose déjà au téléchargement — la charte veut une seule source.
//
// Sortie : tools/sorties-insta/ (gitignoré, comme sorties-og) — les fichiers
// se déposent tels quels dans Instagram.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { rognePNG, trouveChrome } from './rendu-outils.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');
const page = pathToFileURL(resolve(ici, 'insta.html')).href;

const POST = { largeur: 1080, hauteur: 1350 }; // publication (4:5, le plus grand format du fil)

// Le registre des cartes. L'ordre est celui du kit livré : la carte 01 est
// l'épinglée, les 02–04 sont les trois épisodes, le reste tourne autour.
const CARTES = [
  {
    id: '01-ouverture', taille: POST,
    p: {
      type: 'marque', fiole: 'maitre',
      titre: 'De grandes questions\nd’enfants',
      sous: 'Des petits sites à toucher,\nà faire tourner, à écouter.',
      pied: 'à explorer en famille dès 5 ans',
    },
  },
  {
    id: '02-ou-va-le-soleil', taille: POST,
    p: {
      type: 'scene', kicker: 'Petit labo d’astronomie',
      titre: 'Où va le Soleil la nuit ?',
      image: 'scenes-insta/soleil-jardin-coucher.png', rogne: '1', pos: '100%',
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
      image: 'scenes-insta/terre-pole-midi.png', rogne: '1', hauteur: '790', pos: '0%',
      sous: 'Il est midi chez vous. _Sept heures du matin_ en Guadeloupe. La Terre vue de tout en haut, et tout s’explique.',
    },
  },
  {
    id: '04-pourquoi-la-lune', taille: POST,
    p: {
      type: 'scene', kicker: 'Petit labo d’astronomie',
      titre: 'Pourquoi la Lune\nchange de forme ?',
      image: 'scenes-insta/lune-hublot.png', rogne: '1', pos: '42%',
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
      image: 'scenes-insta/soleil-jardin-nuit.png', pos: '60%',
      image2: 'scenes-insta/soleil-espace-nuit.png', pos2: '50%',
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
      image: 'scenes-insta/terre-globe.png', rogne: '1',
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
        'Sans pisteur ni cookie~La mesure d’audience compte les visites, jamais les visiteurs.',
      ].join('|'),
      pied: 'à explorer en famille dès 5 ans',
    },
  },
  {
    id: '09-la-lune-ne-change-pas', taille: POST,
    p: {
      type: 'scene', kicker: 'La vérité derrière l’épisode',
      titre: 'La Lune ne change\npas de forme',
      image: 'scenes-insta/lune-orbite.png', rogne: '1', pos: '50%',
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

const chrome = trouveChrome();
if (!chrome) {
  console.error('Chromium/Chrome introuvable. Indiquer le binaire : CHROME=/chemin node tools/build-insta.mjs');
  process.exit(1);
}
console.log('Navigateur : ' + chrome);

if (!existsSync(resolve(racine, 'tools/scenes-insta'))) {
  console.error('tools/scenes-insta/ est vide — photographier d’abord les épisodes :');
  console.error('  node tools/build-insta-scenes.mjs');
  process.exit(1);
}

const filtre = process.argv[2];
const cartes = filtre ? CARTES.filter(c => c.id === filtre) : CARTES;
if (!cartes.length) {
  console.error('Carte inconnue : ' + filtre + ' (ids : ' + CARTES.map(c => c.id).join(', ') + ')');
  process.exit(1);
}

// chaque scène référencée doit exister À CÔTÉ du gabarit avant de capturer
const absentes = [];
for (const c of cartes) {
  for (const champ of ['image', 'image2']) {
    if (c.p[champ] && !existsSync(resolve(ici, c.p[champ]))) {
      absentes.push(c.id + ' → ' + c.p[champ]);
    }
  }
}
if (absentes.length) {
  console.error('Scène(s) introuvable(s) — le rendu ferait des cadres vides :');
  for (const a of absentes) console.error('  ✗ ' + a);
  console.error('Relancer node tools/build-insta-scenes.mjs, ou corriger le chemin.');
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

if (!rate) {
  console.log('\nPublications prêtes : tools/sorties-insta/ — à déposer telles quelles.');
  console.log('Avatar du compte : assets/marque/avatar-512.png (node tools/build-marque.mjs).');
}
process.exit(rate ? 1 : 0);
