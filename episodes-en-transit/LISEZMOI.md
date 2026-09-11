# Épisodes en transit

Ce dossier n'a pas vocation à rester dans le dépôt du portail, ni à être
déployé : il héberge un épisode **construit avant que son dépôt GitHub
existe** (la session qui l'a écrit ne pouvait pas créer de dépôt). Chaque
sous-dossier est le contenu complet d'un futur dépôt d'épisode
(`index.html`, `js/`, `css/`, `test/`, `tools/`, `assets/`, `docs/`,
`README.md`, `CLAUDE.md`, workflow Pages).

Marche à suivre pour l'en sortir :

1. créer le dépôt GitHub `davidb-prog/<nom-du-dossier>` (public, vide) ;
2. y copier le contenu du sous-dossier (ou `git subtree split` pour garder
   l'historique), committer sur `main`, régler Settings → Pages → GitHub
   Actions ;
3. supprimer le sous-dossier ici, dans le même mouvement.

Tant qu'un sous-dossier est présent, **ne pas merger cette branche dans
`main`** : GitHub Pages le servirait sous `petit-labo.fr/episodes-en-transit/`.
