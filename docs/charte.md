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
- Le logotype « Petit labo » accompagne la fiole en rondeur type « Baloo » ;
  pour l'usage en image il se vectorise en tracés (aucune police téléchargée
  côté site — les pages restent en pile système).

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
joueuses. Typographie : pile système, kicker en capitales espacées couleur accent,
titres-questions, apostrophe typographique « ' ». Le détail (planchers mobiles,
compat anciens navigateurs) est dans le skill `petit-labo`.

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

## Où la marque s'applique

- **Portail** : fiole en tête de page (SVG inline), favicon SVG (fiole-petite en
  data-URI), icônes PWA générées par `tools/build-icons.mjs`.
- **Épisodes** : gardent leur favicon-emoji (c'est une force, pas une dette) et le
  pied de page série avec l'emoji de série.
- **À outiller ensuite** : les images de partage `og:image` (1200 × 630 — fond de
  la série, fiole, titre-question), aujourd'hui absentes de tous les épisodes.

## La liste de propagation

À répercuter hors de ce dépôt (fait au fil des chantiers) :

- Le skill `petit-labo` (`references/series.md`) : 🔭 pour l'astronomie, le test
  du kicker, les rayons 2–4 ci-dessus, et un pointeur vers cette charte.
- `la-lune-change-de-forme` : pied de page « Petit labo d'astronomie 🌌 » → 🔭.
- Les épisodes : balises `og:image` quand le gabarit existera.
