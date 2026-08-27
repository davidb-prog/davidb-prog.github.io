# Petit labo — le portail

Page d’accueil de la famille « Petit labo » : des petits sites statiques, en
français, qui répondent aux grandes questions des enfants (~5 ans). Le parent lit
à voix haute, l’enfant touche, fait tourner, écoute.

En ligne : <https://petit-labo.fr> (et <https://davidb-prog.github.io>).

## Ce que fait ce dépôt

- **Le portail** (`index.html`) : une carte par épisode publié, et les conseils
  « prêter le téléphone à votre enfant » (installation sur l’écran d’accueil,
  Accès guidé iOS / épinglage Android).
- **La PWA « Petit labo »** (`manifest.json`, `icons/`) : installée depuis ce
  portail, elle s’ouvre en plein écran sans interface de navigateur ; sa portée
  (`scope: "/"`) couvre tout le domaine, donc tous les épisodes s’ouvrent dedans.
- **Le domaine** (`CNAME`) : `petit-labo.fr` est déclaré ici, sur le site
  utilisateur — les sites de projet (les épisodes) en héritent automatiquement
  (`petit-labo.fr/ou-va-le-soleil/`…).
- **La marque** (`assets/marque/`, `docs/charte.md`) : le logo de la famille —
  la fiole à la question — en SVG source, et la charte graphique (couleurs de la
  famille, registre des séries et leurs palettes, règles du logo). Les icônes de
  la PWA se régénèrent avec `node tools/build-icons.mjs` (Chromium fait la
  capture 512 px, le script rééchantillonne en 192 et 180 — zéro dépendance).
- **Le dossier de presse** (`presse/index.html`, `css/presse.css`) : une page
  sobre pour qui veut écrire sur le labo — l’histoire, les faits, les trois
  épisodes et les visuels à télécharger. Reliée discrètement depuis le pied du
  portail et listée au `sitemap.xml`.

## Épisodes reliés

| Dépôt | Titre |
|---|---|
| [`ou-va-le-soleil`](https://github.com/davidb-prog/ou-va-le-soleil) | « Où va le Soleil la nuit ? » |
| [`la-terre-tourne`](https://github.com/davidb-prog/la-terre-tourne) | « Quelle heure est-il là-bas ? » |
| [`la-lune-change-de-forme`](https://github.com/davidb-prog/la-lune-change-de-forme) | « Pourquoi la Lune change de forme ? » |

(D’autres épisodes existent en chantier et rejoindront le portail à leur
publication.)

## Mesure d’audience et soutien

Deux réglages du portail, **inactifs par défaut** : chacun tient dans une seule
ligne à remplir, et tant qu’elle est vide, rien ne se charge et rien ne s’affiche.

| Fichier | Ligne à remplir | Ce que ça active |
|---|---|---|
| `js/mesure.js` | `CODE` | La mesure d’audience [GoatCounter](https://www.goatcounter.com/) |
| `js/soutien.js` | `PSEUDO` | Le bloc « Offrir une fiole », vers [Ko-fi](https://ko-fi.com/) |

**GoatCounter** plutôt qu’une solution payée : gratuit, libre, sans cookie ni
donnée personnelle — donc aucun bandeau de consentement à afficher, et rien à
dépenser avant de savoir s’il y a du trafic à compter. Son palier gratuit est
réservé à l’usage non commercial : le jour où une app payante fait du portail
sa vitrine, il faudra un plan payant, Plausible ou l’auto-hébergement. **Ko-fi** plutôt que
Tipeee : le donateur n’a pas besoin de créer un compte, le don ponctuel est le
geste par défaut, et le plan gratuit ne prélève aucune commission. Le bloc de
soutien est un simple lien sortant — pas de script tiers, pas d’iframe : la
promesse « sans publicité ni cookies » du pied de page reste vraie.

Ces deux réglages ne concernent que le portail (page destinée au parent), jamais
les scènes des épisodes.

## Conventions

Zéro dépendance, zéro build : la page s’ouvre avec `python3 -m http.server` et se
déploie telle quelle sur GitHub Pages (workflow
`.github/workflows/deploy-pages.yml`, publication à chaque push sur `main`).
Thème sombre de la série d’astronomie — dont l’or et la nuit sont, par décision de
charte, les couleurs de la famille entière (voir `docs/charte.md`).

Toutes les images PNG du dépôt sont **générées hors site puis commitées**, jamais
retouchées à la main. Six générateurs, une seule boîte à outils
(`tools/rendu-outils.mjs` : trouver Chromium et le lancer, servir les dépôts
d’épisodes, lire / rogner / rééchantillonner / écrire un PNG — zéro dépendance,
zlib de Node) :

| Commande | Ce qu’elle produit |
|---|---|
| `node tools/build-icons.mjs` | `icons/icon-512.png`, `icons/icon-192.png`, `apple-touch-icon.png` |
| `node tools/build-og.mjs` | `assets/og.png` (portail) et les cartes des épisodes dans `tools/sorties-og/` |
| `node tools/build-marque.mjs` | `assets/marque/banniere-1600x512.png`, `assets/marque/avatar-512.png` |
| `node tools/build-captures.mjs` | `assets/presse/capture-*.png` — les copies d’écran des épisodes |
| `node tools/build-insta-scenes.mjs` | `tools/scenes-insta/` — les scènes des épisodes, amenées au bon moment par leur curseur maître |
| `node tools/build-insta.mjs` | `tools/sorties-insta/` — les publications du compte vitrine (1080 × 1350) |

`build-captures` et `build-insta-scenes` ont besoin des dépôts d’épisodes
**clonés à côté** du portail (`../ou-va-le-soleil`…) : ils les servent eux-mêmes
en HTTP le temps de la capture. À relancer après toute évolution visuelle d’un
épisode.

Les deux derniers produisent le **kit du compte vitrine** (tâche T7 du plan
d’acquisition) : leurs sorties sont gitignorées, comme celles des `og:image` —
elles se déposent dans Instagram, elles n’ont rien à faire dans l’historique.
L’avatar du compte, lui, est `assets/marque/avatar-512.png` : le fichier que la
page presse propose déjà, pas une seconde version.
