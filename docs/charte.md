# La charte graphique du Petit labo

La page unique de la marque : le logo, les couleurs, le registre des séries et les
règles qui tiennent le tout. Elle vit ici, dans le dépôt du portail (qui possède le
domaine, la PWA et les icônes) ; le skill `petit-labo` reste la marche à suivre pour
construire un épisode et pointe vers cette page pour tout ce qui est identité.

## Le logo : la fiole à la question

Une fiole d'expérience d'où s'échappe un point d'interrogation doré, penché comme
une vapeur ; dedans, trois éclats aux couleurs des accents de la famille — les
séries qui mijotent. L'histoire qu'il raconte : **l'expérience fait naître la
question.**

Les fichiers (le SVG est LA source ; les PNG sont générés, jamais retouchés) :

| Fichier | Rôle |
|---|---|
| `assets/marque/fiole.svg` | Le maître, pour fonds sombres — la référence |
| `assets/marque/fiole-fond-clair.svg` | Fonds clairs (README, impression) : traits à l'or profond `#ff9f1c`, la nuit reste DANS la fiole |
| `assets/marque/fiole-petite.svg` | 48 px et moins (favicon) : éclats retirés, traits épaissis |
| `tools/icone.html` | Le gabarit d'icône (tuile de nuit étoilée + fiole) |
| `tools/build-icons.mjs` | Génère `icons/icon-512.png`, `icons/icon-192.png`, `apple-touch-icon.png` |

Régénération (hors site, zéro dépendance — Chromium fait la capture, Node fait le
reste) : `node tools/build-icons.mjs` (variable `CHROME=/chemin` si le navigateur
n'est pas trouvé tout seul). Toute retouche du dessin se fait dans `fiole.svg` ET
dans `tools/icone.html` (qui recopie le dessin dans sa tuile), puis on régénère
avant de committer.

Les règles du logo :

- **Le système est asymétrique exprès** : le maître pose la question DEHORS
  (le « ? » ne touche jamais la fiole) ; chaque série met sa réponse DEDANS
  (l'étoile, le nuage, le cœur…). C'est ce contraste qui rend la famille
  reconnaissable.
- **Jamais d'étoile dans la fiole générique** — c'est le contenu qui distingue le
  maître de la série d'astronomie, pas la couleur.
- **Un seul objet par fiole de série** : une scène chargée meurt à 48 px.
- En dessous de ~64 px : version `fiole-petite` (sans éclats, traits épaissis).
- Le logotype « Petit labo » s'écrit en **Baloo 2** graisse 800, « labo » en or,
  posé à droite de la fiole (jamais dessous : empilés, logo + nom + titre font
  une pyramide). Pour l'usage en image (og:image…) il se vectorise en tracés.

## Les couleurs de la famille

**L'or `#ffcf5c` et la nuit `#0b1020` sont les couleurs du Petit labo** — c'est la
série d'astronomie qui les emprunte à la famille, pas l'inverse. Au niveau famille,
la nuit se lit « le mystère avant la réponse » et l'or « l'étincelle de curiosité ».
Le gabarit commun de variables (rodé par l'astronomie, décliné par chaque série) :

```css
:root {
  --bg / --bg2        /* le fond, qui signe la série */
  --surface / --surface-2 / --border
  --text: #e9edf8;  --muted: #9aa5c3;   /* communs à toute la famille */
  /* + un accent principal et 2–3 accents secondaires par série */
  --radius: 14px;
}
/* fond des canvas de scène : plus sombre que --bg (astronomie : #070b17) */
```

Formes : rayons 14 px, panneaux en dégradé `--surface → --bg2`, formes rondes et
joueuses. Boutons : pilules (rayon 999 px), et **un seul bouton plein (or)
visible par page** — il revient à l'action principale de la page ; toute autre
action s'écrit en pilule contour (un bouton plein caché dans un panneau replié
ne compte pas, tant qu'il ne s'affiche pas en même temps qu'un autre plein).

**Typographie** : les titres (et le logotype) parlent en **Baloo 2** — la rondeur
du logo — auto-hébergée dans le dépôt (`assets/fonts/baloo2-latin.woff2`,
variable 400–800, ~33 Ko, licence OFL, repli
`"Arial Rounded MT Bold", "Trebuchet MS", system-ui`). Le corps du texte reste en
**pile système**, et c'est un choix assumé : le rendu varie un peu d'une machine à
l'autre (SF Pro sur iPhone/Mac, Roboto sur Android, Segoe UI sur Windows) mais
chaque OS sert sa meilleure police, optimisée pour ses écrans — « différent »
n'est pas « moche », et la signature de la page (titres, cartes, logotype) est
déjà identique partout grâce à la Baloo auto-hébergée. Option de réserve si
l'uniformité totale devenait souhaitée : **Nunito Sans** (rondeur cousine, OFL),
réversible en une ligne de CSS. Règle : **aucune police tierce à l'exécution**
(pas de CDN) — une police libre commitée et servie par le même GitHub Pages est
permise. Kicker en capitales espacées couleur accent, titres-questions,
apostrophe typographique « ' ». Le détail (planchers mobiles, compat anciens
navigateurs) est dans le skill `petit-labo`.

## Le registre des séries

**Le test du kicker** : un nom de série n'entre au registre que s'il s'énonce
« Petit labo de/d'X » — un vrai nom de matière, comme à l'école. Le mot savant a le
droit d'être savant (astronomie, anatomie…) : c'est le titre-question de l'épisode
qui parle enfant. Deux autres règles : **une question d'abord, la série ensuite**
(une série naît le jour où une vraie question d'enfant l'exige) ; **on classe par
le phénomène, pas par le mot** (volcans, plaques, séismes → géologie ; la surface
habitée et les cultures du monde → géographie ; la naissance d'une montagne →
géologie, ses paysages → géographie ; l'arc-en-ciel → météorologie ; les
dinosaures → biologie — en cas de litige, la série dont le geste raconte le mieux
la réponse gagne).

Rayon 1 — sur l'établi :

| Série | Emoji | Motif de fiole | Fond | Accents |
|---|---|---|---|---|
| Petit labo d'astronomie | 🔭 | étoile dorée | `#0b1020` | `#ffcf5c` `#a98bff` `#ff6b9d` `#46c2a5` |
| Petit labo de physique | ✈️ | nuage + trait d'avion | `#123a66` (à roder) | `#e9edf8` `#ffcf5c` |

Rayon 2 — les prochaines naturelles (un phénomène + un geste) :

| Série | Emoji | Motif de fiole | Fond | Accents |
|---|---|---|---|---|
| Petit labo de météorologie | ⛅ | nuage d'orage + éclair | `#232f47` | `#e9edf8` `#ffcf5c` |
| Petit labo de géologie | 🌋 | strates de terre, lueur de magma au fond, petit cristal | `#241210` | `#c99a63` `#ff7a3c` |
| Petit labo de chimie | 🧪 | liquide qui bulle | `#0d2320` | `#46c2a5` `#9ef0d9` |
| Petit labo de biologie | 🌱 | pousse à deux feuilles | `#142b18` | `#8fdd66` `#ff6b9d` |
| Petit labo d'anatomie | 🫀 | cœur | `#2e1128` | `#ff8b7b` `#ffcf5c` |

Rayon 3 — le monde des humains (le geste devient explorer, comparer, remonter) :

| Série | Emoji | Motif de fiole | Fond | Accents |
|---|---|---|---|---|
| Petit labo de géographie | 🗺️ | petit globe (la Terre ET ses habitants) | `#0e2836` | `#58b7d8` `#c99a63` |
| Petit labo d'histoire | 🏰 | sablier | `#2a1d12` | `#e0b36a` `#c96f4a` |

Rayon 4 — les langages, plus tard : Petit labo de musique 🎵, de mathématiques 🔢,
de langage 💬.

Les palettes des séries non lancées sont des points de départ : chacune se rode au
premier épisode, dans le même gabarit de variables. L'emoji de série apparaît sur
le portail et dans les pieds de page ; chaque **épisode** garde en plus son
emoji-signature à lui (☀️ 🌍 🌙…), qui sert de favicon à sa page.

## Quelle fiole, quel emoji, où ?

Trois niveaux, un usage chacun :

- **Le maître** (la fiole au « ? ») = la famille entière : portail (en-tête,
  favicon), icône PWA, et tout support qui parle du Petit labo en général.
- **L'emoji de série** (🔭 ✈️ ⛅…) = le texte courant : la ligne « un épisode
  du Petit labo de X » des pieds de page, les phrases. **Jamais d'emoji en
  illustration** : en grand, le rendu système (Apple, Google…) jure avec
  l'univers dessiné à la main — sur le portail, chaque carte d'épisode porte un
  **médaillon SVG maison** (tuile `#070b17` arrondie, traits or épais, un
  accent de la famille, une à deux étoiles), et le titre de rayon porte la
  fiole de sa série en petit. Les médaillons voyagent aussi dans les épisodes :
  dans le **pied de page**, chaque lien vers un autre épisode porte le
  médaillon de sa carte (tuile ~30 px, soulignement sur le titre seul), et le
  **pont** vers un épisode voisin porte le médaillon de l'épisode d'arrivée —
  plus d'emoji 🌍/🌙 devant ces liens. L'emoji-signature d'un épisode reste
  son favicon.
- **La fiole de série** = la série affichée en image :
  1. l'**en-tête des épisodes** — chaque épisode porte la fiole de sa série en
     petit (SVG inline, ~24 px) à côté de son kicker, comme le portail porte le
     maître à côté de son nom (déployé sur `ou-va-le-soleil`, la référence à
     copier). La fiole reste petite et le kicker centré : le grand logo posé
     en coin de page a été maquetté puis écarté — une fiole seule dans un
     coin, sans nom accroché, se lit moins comme une marque ;
  2. les **og:image** (fond de série + fiole de série + titre-question) ;
  3. les sections du portail quand plusieurs séries seront en ligne.

## Où la marque s'applique

- **Portail** : la marque d'un bloc en tête de page — fiole (SVG inline) et nom
  « Petit labo » côte à côte, titre-question dessous, étoiles de décor — favicon
  SVG (fiole-petite en data-URI), icônes PWA générées par `tools/build-icons.mjs`,
  Baloo 2 sur tous les titres, cartes d'épisodes à médaillon SVG (médaillon +
  texte côte à côte), fiole de série sur les titres de rayons.
- **Épisodes** : gardent leur favicon-emoji (c'est une force, pas une dette) et
  le pied de page série avec l'emoji de série dans la ligne-titre. Dans ce pied
  de page, les liens vers les autres épisodes portent leur **médaillon de
  carte**, et le bouton « Tous les épisodes du Petit labo » porte la **fiole
  maître au « ? »** en version petites tailles (il parle de la famille entière,
  c'est le territoire du maître) à la place de l'ancienne éprouvette 🧪.
  Patron déployé sur `ou-va-le-soleil`, à propager aux voisins.
- **Les images de partage `og:image`** (1200 × 630 — la carte que WhatsApp,
  iMessage ou les réseaux affichent sous un lien) : gabarit `tools/og.html`,
  génération `node tools/build-og.mjs` (le registre des titres/sous-titres vit
  dans le script ; capture large puis rognage exact en pur Node). La carte du
  portail (fiole **maître**) est commitée ici (`assets/og.png`) ; celle de chaque
  épisode (fiole de **série**) sort dans `tools/sorties-og/` et se copie dans son
  dépôt (`docs/og.png`) avec les balises `og:` dans le `<head>`.

## La liste de propagation

À répercuter hors de ce dépôt (fait au fil des chantiers) :

- Le skill `petit-labo` (`references/series.md` et `references/conventions.md`) :
  🔭 pour l'astronomie, le test du kicker, les rayons 2–4 ci-dessus, un pointeur
  vers cette charte, et l'amendement de la règle des polices (« aucune police
  téléchargée » → « aucune police tierce à l'exécution ; une police libre
  auto-hébergée est permise pour les titres »).
- `la-terre-tourne` et `la-lune-change-de-forme` : pied de page
  « Petit labo d'astronomie 🌌 » → 🔭 (`ou-va-le-soleil` est fait).
- Les épisodes : Baloo 2 sur les titres, la fiole de série en en-tête, et le
  pied de page à médaillons + fiole maître (au fil des chantiers, en copiant
  `assets/fonts/` et les SVG depuis le portail ou `ou-va-le-soleil`, qui a
  reçu l'ensemble le premier et sert de référence — restent `la-terre-tourne`
  et `la-lune-change-de-forme`). Les `og:image` et leurs balises
  sont livrées par le chantier og (une PR par épisode) — après tout changement
  de titre affiché, re-passer `node tools/build-og.mjs` et recopier la carte.
