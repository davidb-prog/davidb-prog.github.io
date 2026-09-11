// Corpus vocal de « D'où viennent les nuages ? » : la liste des blocs parlés
// (id stable + texte oral), partagée par tools/build-voix.mjs (génération
// ElevenLabs) et test/voix.test.mjs (cohérence manifeste ↔ textes du site).
//
// Tous les textes de cet épisode sont ÉCRITS (aucune phrase générée par
// combinaison) : le corpus est une simple énumération — les scénarios, la
// transition vers la loupe, les consignes et bravos du jeu, et les
// paragraphes de la grande histoire lus dans index.html (la source de vérité
// du site).

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SCENARIOS, VOIX_TRANSITIONS, DEFIS, texteOral } from '../js/model.js';

// Tous les blocs que le conteur peut dire, avec les MÊMES ids que js/main.js.
export function corpus() {
  const parId = {};
  const blocs = [];
  const ajouter = (id, texteBrut, precedent) => {
    const texte = texteOral(texteBrut);
    if (parId[id]) {
      if (parId[id] !== texte) throw new Error('collision d’id de bloc : ' + id);
      return;
    }
    parId[id] = texte;
    const bloc = { id: id, texte: texte };
    if (precedent) bloc.precedent = texteOral(precedent);
    blocs.push(bloc);
  };

  for (const scn of SCENARIOS) {
    ajouter('scn-' + scn.id + '-intro', scn.intro);
    // l'amorce de prosodie : le récit s'entend dans la foulée de son annonce
    ajouter('scn-' + scn.id + '-dehors', scn.dehors, scn.intro);
    ajouter('scn-' + scn.id + '-loupe', scn.loupe, VOIX_TRANSITIONS.loupe);
  }
  ajouter('transition-loupe', VOIX_TRANSITIONS.loupe);

  for (const defi of DEFIS) {
    ajouter('defi-' + defi.id + '-consigne', defi.consigne);
    ajouter('defi-' + defi.id + '-bravo', defi.bravo);
  }

  // la grande histoire : un bloc par paragraphe de la boîte d'explication
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const zone = html.match(/<div class="texte-explication" id="texte-explication">([\s\S]*?)<\/div>/);
  if (!zone) throw new Error('texte-explication introuvable dans index.html');
  const paras = zone[1].match(/<p>[\s\S]*?<\/p>/g) || [];
  paras.forEach((p, i) => {
    /* les entités d'espaces insécables (&nbsp;, &#8239;) redeviennent des
       espaces : la voix lit le même texte, texteOral ramène tout à l'espace
       simple */
    const texte = p.replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (m, c) => String.fromCharCode(Number(c))).replace(/&amp;/g, '&');
    ajouter('histoire-' + (i + 1), texte);
  });

  return blocs;
}

// Empreinte courte d'un texte : le manifeste s'en sert pour savoir quels
// blocs régénérer quand un texte du site change.
export function hashTexte(t) {
  return createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 12);
}

// L'empreinte d'un bloc couvre aussi son amorce de prosodie éventuelle
// (previous_text) : changer le contexte change le rendu, donc régénère.
export function empreinteBloc(b) {
  return hashTexte(b.texte + (b.precedent ? '\n@\n' + b.precedent : ''));
}
