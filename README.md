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

## Épisodes reliés

| Dépôt | Titre |
|---|---|
| [`ou-va-le-soleil`](https://github.com/davidb-prog/ou-va-le-soleil) | « Où va le Soleil la nuit ? » |
| [`la-terre-tourne`](https://github.com/davidb-prog/la-terre-tourne) | « Quelle heure est-il là-bas ? » |
| [`la-lune-change-de-forme`](https://github.com/davidb-prog/la-lune-change-de-forme) | « Pourquoi la Lune change de forme ? » |

(D’autres épisodes existent en chantier et rejoindront le portail à leur
publication.)

## Conventions

Zéro dépendance, zéro build : la page s’ouvre avec `python3 -m http.server` et se
déploie telle quelle sur GitHub Pages (workflow
`.github/workflows/deploy-pages.yml`, publication à chaque push sur `main`).
Thème sombre de la série d’astronomie. Les icônes PNG sont générées hors site
(canvas) et commitées.
