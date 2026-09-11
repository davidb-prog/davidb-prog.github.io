# La voix enregistrée du conteur

La référence de la famille vit dans le skill `petit-labo`
(`references/voix-enregistree.md` et `references/narrateur.md`) et la
production se déroule avec le skill compagnon `generer-voix-petit-labo`,
depuis une session sur la machine de l'utilisateur (la clé ElevenLabs vit
dans `.cle-elevenlabs`, gitignoré, jamais dans un environnement cloud).

Dans ce dépôt : `tools/voix-lib.mjs` décrit le corpus de l'épisode (la seule
partie qui lui est propre), `tools/build-voix.mjs` génère, `tools/controle-voix.mjs`
contrôle sans oreilles, `node test/voix.test.mjs` verrouille la cohérence
manifeste ↔ textes du site. Tant que `assets/audio/manifest.json` est vide,
le site parle à la synthèse du navigateur (le repli permanent).
