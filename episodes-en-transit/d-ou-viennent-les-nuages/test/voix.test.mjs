// Tests de la voix du conteur — zéro dépendance : `node test/voix.test.mjs`
// Le corpus vocal (blocs id + texte oral) et, quand les fichiers enregistrés
// existent, la cohérence manifeste ↔ textes du site : la voix enregistrée ne
// doit JAMAIS dire autre chose que ce que le site affiche.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { corpus, empreinteBloc } from '../tools/voix-lib.mjs';
import { SCENARIOS, DEFIS, VOIX_TRANSITIONS, texteOral, EMOJI_RE } from '../js/model.js';

let failed = 0;
let passed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.error('  ✗ ' + name + (detail === undefined ? '' : ' — ' + detail)); }
}

console.log('Le texte oral (texteOral)');
check('les émojis disparaissent et le point se recolle',
  texteOral('Il pleut ☁️ .') === 'Il pleut.');
check('le point orphelin d’un émoji retiré après « ! » disparaît',
  texteOral('Un nuage ! 🌧️.') === 'Un nuage !');
check('l’espace française avant « ! » et « : » est préservée',
  texteOral('Regarde ! C’est un nuage : là-haut !') === 'Regarde ! C’est un nuage : là-haut !');
check('les guillemets français disparaissent (la synthèse trébuche dessus)',
  texteOral('On dit « vapeur »… en vrai') === 'On dit vapeur… en vrai');
check('le tiret cadratin devient une virgule',
  texteOral('la mer — et la rivière — pareil') === 'la mer, et la rivière, pareil');

console.log('Le corpus vocal');
const blocs = corpus();
{
  const groupes = {};
  for (const b of blocs) {
    const g = b.id.split('-')[0];
    groupes[g] = (groupes[g] || 0) + 1;
  }
  check('l’ossature y est : 12 blocs de scénarios, 1 transition, 8 blocs de jeu, 7 paragraphes d’histoire',
    groupes.scn === 12 && groupes.transition === 1 && groupes.defi === 8 && groupes.histoire === 7,
    JSON.stringify(groupes));
  check('le corpus reste petit (moins de 35 blocs : tout est écrit, rien de généré)',
    blocs.length < 35, blocs.length);
}
{
  const ids = {};
  const textes = {};
  let ok = true;
  let dup = false;
  for (const b of blocs) {
    if (ids[b.id]) ok = false;
    ids[b.id] = true;
    if (textes[b.texte]) dup = true;
    textes[b.texte] = true;
    if (!/^[a-z0-9-]+$/.test(b.id)) ok = false;
    if (!b.texte || b.texte.length < 5) ok = false;
  }
  check('identifiants uniques en kebab-case, textes non vides', ok);
  check('aucun texte enregistré deux fois sous deux ids (pas de crédits gâchés)', !dup);
}
check('les récits des scénarios portent leur amorce de prosodie (previous_text)',
  SCENARIOS.every((s) =>
    blocs.some((b) => b.id === 'scn-' + s.id + '-dehors' && b.precedent === texteOral(s.intro)) &&
    blocs.some((b) => b.id === 'scn-' + s.id + '-loupe' && b.precedent === texteOral(VOIX_TRANSITIONS.loupe))));
// EMOJI_RE porte le drapeau /g (stateful avec .test) : on le clone sans
const emojiUne = new RegExp(EMOJI_RE.source, 'u');
check('aucun émoji dans les textes oraux',
  blocs.every((b) => !emojiUne.test(b.texte)));
check('aucun nombre en chiffres : les nombres se disent en toutes lettres',
  blocs.every((b) => !/\d/.test(b.texte)),
  blocs.filter((b) => /\d/.test(b.texte)).map((b) => b.id).join(', '));
// Les jonctions que le conteur ne sait pas dire (leçons payées sur
// « la Terre est penchée ») : un verbe en « -ent » suivi d'une consonne se
// fait avaler ou bégayer. La liste reste ÉTROITE à dessein ; on y ajoute une
// entrée quand une nouvelle jonction se paie.
const JONCTIONS_FAUTIVES = [
  { forme: /\bpoussent dans\b/i, note: 'dire autrement' },
  { forme: /\bfêtent Noël\b/i, note: 'dire « c’est Noël »' },
];
for (const j of JONCTIONS_FAUTIVES) {
  const coupables = blocs.filter((b) => j.forme.test(b.texte));
  check('jonction que le conteur bute : ' + j.forme.source + ' — ' + j.note,
    coupables.length === 0,
    coupables.map((b) => b.id).join(', '));
}

check('aucun guillemet ni tiret cadratin dans les textes oraux',
  blocs.every((b) => !/[«»—]/.test(b.texte)));
check('apostrophes typographiques « ’ » partout (jamais le « \' » droit)',
  blocs.every((b) => b.texte.indexOf("'") === -1));
check('chaque bloc finit par une vraie ponctuation',
  blocs.every((b) => /[.!?…]$/.test(b.texte)),
  blocs.filter((b) => !/[.!?…]$/.test(b.texte)).map((b) => b.id).join(', '));
// les paragraphes d'histoire, écrits main, gardent le droit au « … » de
// suspense — ils se valident à l'oreille
check('jamais de points de suspension en plein flux hors histoire',
  blocs.every((b) => b.id.indexOf('histoire-') === 0 || !/… [a-zà-öø-ÿ]/.test(b.texte)),
  blocs.filter((b) => b.id.indexOf('histoire-') !== 0 && /… [a-zà-öø-ÿ]/.test(b.texte))
    .map((b) => b.id).join(', '));
check('le corpus tient dans le plan Starter d’ElevenLabs (< 15 000 crédits)',
  blocs.reduce((n, b) => n + b.texte.length, 0) < 15000,
  blocs.reduce((n, b) => n + b.texte.length, 0));

console.log('La cohérence site ↔ corpus');
{
  const parId = {};
  for (const b of blocs) parId[b.id] = b.texte;
  check('chaque scénario du site a ses trois blocs, au texte exact',
    SCENARIOS.every((s) =>
      parId['scn-' + s.id + '-intro'] === texteOral(s.intro) &&
      parId['scn-' + s.id + '-dehors'] === texteOral(s.dehors) &&
      parId['scn-' + s.id + '-loupe'] === texteOral(s.loupe)));
  check('chaque défi du jeu a sa consigne et son bravo, au texte exact',
    DEFIS.every((d) =>
      parId['defi-' + d.id + '-consigne'] === texteOral(d.consigne) &&
      parId['defi-' + d.id + '-bravo'] === texteOral(d.bravo)));
}

console.log('Le manifeste des fichiers enregistrés');
const manifeste = JSON.parse(readFileSync(new URL('../assets/audio/manifest.json', import.meta.url), 'utf8'));
const enregistres = Object.keys(manifeste.blocs);
if (enregistres.length === 0) {
  check('pas encore de fichiers enregistrés : le site lit tout à la synthèse (repli)', true);
} else {
  check('chaque bloc du corpus a son fichier enregistré',
    blocs.every((b) => manifeste.blocs[b.id]),
    blocs.filter((b) => !manifeste.blocs[b.id]).map((b) => b.id).slice(0, 5).join(', '));
  check('chaque fichier dit ENCORE le texte du site (texte et empreinte à jour)',
    blocs.every((b) => {
      const m = manifeste.blocs[b.id];
      return m && m.texte === b.texte && m.hash === empreinteBloc(b);
    }),
    blocs.filter((b) => {
      const m = manifeste.blocs[b.id];
      return !m || m.texte !== b.texte || m.hash !== empreinteBloc(b);
    }).map((b) => b.id).slice(0, 5).join(', '));
  check('aucun bloc fantôme dans le manifeste',
    enregistres.every((id) => blocs.some((b) => b.id === id)));
  const dossier = new URL('../assets/audio/', import.meta.url);
  check('tous les mp3 du manifeste existent sur le disque',
    enregistres.every((id) => existsSync(new URL(manifeste.blocs[id].fichier, dossier))));
  check('aucun mp3 orphelin dans assets/audio/',
    readdirSync(dossier).filter((f) => f.endsWith('.mp3'))
      .every((f) => enregistres.some((id) => manifeste.blocs[id].fichier === f)));
  check('la voix et le modèle sont notés dans le manifeste',
    typeof manifeste.voix === 'string' && manifeste.voix.length > 0 &&
    manifeste.modele === 'eleven_multilingual_v2');
}

console.log('');
if (failed > 0) {
  console.error(failed + ' test(s) en échec, ' + passed + ' réussi(s).');
  process.exit(1);
}
console.log('Tous les tests de la voix passent (' + passed + ').');
