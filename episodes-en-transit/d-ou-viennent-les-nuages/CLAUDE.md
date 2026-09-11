# CLAUDE.md — D'où viennent les nuages ?

**Petit labo de météorologie** (le premier épisode de la série). Site statique
d'une page, en français, qui explique d'où viennent les nuages à un enfant
d'environ 5 ans. Le parent lit à voix haute ; l'enfant attrape une goutte
d'eau et la promène dans son grand voyage (mer → vapeur → nuage → pluie →
rivière → mer). En ligne : <https://petit-labo.fr/d-ou-viennent-les-nuages/>
(tous les liens croisés de la famille vivent sur ce domaine, jamais `github.io`).

La charte commune de la famille (contraintes, anatomie de page, invariants,
note aux parents, livraison) vit dans le skill `petit-labo`
(`references/conventions.md`) et dans `docs/charte.md` du dépôt du portail
(`davidb-prog.github.io`). Ce fichier ne redit que ce qui est propre à
l'épisode et à la série.

## Contraintes (non négociables)

- **Zéro dépendance, zéro build** : HTML + CSS + JS vanilla (modules ES),
  canvas 2D dessiné à la main. Aucune police tierce à l'exécution : titres en
  **Baloo 2 auto-hébergée** (`assets/fonts/`, OFL), corps en pile système.
  `python3 -m http.server` suffit ; déploiement tel quel sur GitHub Pages.
- **Compat mobiles anciens** : pas d'optional chaining `?.` ni de nullish `??`,
  pas de lookbehind regex, repli `@supports` pour `aspect-ratio`,
  `top/right/bottom/left` plutôt qu'`inset`. Tester à 390 px de large.
- **Blindage tactile** : `touch-action: none` sur la vue « dehors » (celle qu'on
  manipule) et sa jumelle du jeu, doublé du repli JS `touchstart`/`touchmove`
  non passifs ; la loupe laisse défiler la page. `user-select: none` sur `body`,
  `* { touch-action: pan-x pan-y }`, viewport `maximum-scale=1` + filet
  `gesturestart`.
- **`js/model.js` est pur** (aucun accès DOM) : toutes les constantes du récit
  (bornes des étapes, paysage, chemin de la goutte, altitude du froid, fondus,
  scénarios, défis, phrases, textes oraux) vivent dedans. `node test/model.test.mjs`.
- **Boucle rAF résiliente et sobre** : `requestAnimationFrame` dans un
  `try/finally` ; en pause rien ne se redessine (l'horloge des frémissements —
  vagues, chaleur, billes — ne tourne que pendant la lecture ou le glisser).
- **`prefers-reduced-motion` respecté** : pas de lecture auto au démarrage, les
  glissements de scénario et le recalage du jeu deviennent des sauts secs, le
  halo ne respire pas, rien ne frémit.
- **Public 5 ans** : phrases courtes, apostrophe typographique « ’ », zéro
  jargon côté enfant (« vapeur », « gouttelettes », jamais « évaporation » ni
  « condensation » — ces mots vivent dans la note aux parents).
- **Le code s'écrit en français** (identifiants, constantes, fichiers), sans
  accents ; les API navigateur restent en anglais.

## L'idée centrale (la vérité à préserver)

> Un nuage, c'est de l'eau de la mer montée dans le ciel sans qu'on la voie.
> L'eau ne disparaît jamais : elle tourne en rond, toujours la même.

Vérités verrouillées par `test/model.test.mjs` (à compléter, jamais supprimer) :

1. après un tour complet, la goutte est revenue exactement là d'où elle est
   partie (chemin continu et fermé, étapes dans l'ordre du voyage) ;
2. la goutte ne monte que pendant « ça monte », quand le Soleil la chauffe ;
3. elle n'est jamais invisible ailleurs qu'en montant, et ne réapparaît que là
   où il fait froid (`ALTITUDE_FROID`) ;
4. elle est là à chaque instant du voyage, même quand on ne la voit pas
   (une forme définie, une position dans la scène) ;
5. plus on monte, plus il fait froid (`temperature` strictement décroissante) ;
   le sommet de la montagne dépasse l'altitude du froid (la neige) ;
6. il ne pleut jamais d'un ciel sans nuage : `ilPleut ⇒ chargeNuage > 0`, et le
   nuage naît dans le froid, grossit jusqu'à la pluie, se vide en pleuvant.

## Le modèle en bref

- **L'état tient en un nombre** : `p ∈ [0, 1[`, la position de la goutte sur
  sa boucle. Bornes des étapes : `P_MER_FIN 0,10`, `P_MONTEE_FIN 0,34`,
  `P_NUAGE_FIN 0,58`, `P_PLUIE_FIN 0,76`, rivière jusqu'à 1. Le curseur maître
  affiche `p × 100`.
- **Le paysage est l'objet-repère** (il ne bouge jamais) : mer à gauche
  (`MER_DROITE 0,32`), sol à `NIVEAU_SOL 0,28`, montagne à droite (sommet
  `(0,78 ; 0,72)`), Soleil fixe en haut à gauche `(0,14 ; 0,86)`. Ce n'est PAS la
  convention « Soleil à droite » de l'astronomie — elle appartient à cette
  série-là, pas à la famille. Coordonnées normalisées, y vers le haut ; les vues
  basculent vers le canvas.
- **Le chemin** (`positionGoutte`) : segments et Bézier quadratiques par étape,
  continu aux frontières (test « la goutte ne saute jamais »). La montée est
  adoucie, la chute de pluie accélère (`s²`), la rivière descend le flanc puis
  un méandre jusqu'à l'embouchure — x et y monotones (tests).
- **Visibilité** (`visibilite`) : 1 partout sauf en montée — fondu vers 0 sur
  `FONDU 0,04` au départ, 0 au cœur, fondu vers 1 sur les 0,04 derniers, quand
  l'altitude a déjà dépassé le froid. La forme : liquide / vapeur /
  gouttelette / goutte.
- **La loupe** lit trois lois pures : `ecartement` (serré ↔ épars),
  `regroupement` (un bloc ↔ trois gouttelettes), `agitation` (suit la
  température).
- **Scénarios** : quatre moments (`soleil 0,22`, `nuage 0,46`, `pluie 0,66`,
  `retour 0,88`), glissement toujours vers l'avant. **Défis** : quatre fenêtres
  disjointes `[debut, fin[` (celle de la mer chevauche le 0), `pBravo` pour le
  recalage doux par le chemin court (`deltaCourt`), hystérésis
  `DEFI_SORTIE_MARGE 0,03`, tempo `DEFI_ATTENTE_MS 350`.

## Invariants d'interaction

- **Le paysage ne bouge jamais** ; la goutte seule voyage. Sonde de pixels dans
  la suite navigateur : le Soleil doré à `(0,14 ; 0,14)` du canvas quel que
  soit `p`.
- **Un geste = un effet** : glisser la goutte fait avancer (ou reculer) le
  voyage — `pDepuisPointeur` cherche le point du chemin le plus proche du doigt
  dans une fenêtre de ±15 % autour de la position courante, la goutte suit le
  doigt sans jamais sauter d'une étape à l'autre. La goutte invisible s'attrape
  sur son fantôme (rayon généreux : `max(3,2 × rayon, 9 % de la largeur)`).
- **Un seul doigt tient la goutte** (`pointeurTenant`), un seul brancheur
  `brancherGesteGoutte` pour la grande vue ET la vue du jeu.
- **Les deux vues sont synchronisées en permanence** ; la loupe ne se manipule
  pas.
- **La lecture auto** (`LECTURE_TOUR_SEC 85`) ne se commande que par ⏸/▶ (ou la
  barre d'espace) ; attraper la goutte ou tirer le curseur la met en pause en
  douceur (l'histoire d'un scénario reste tant que la goutte reste dans son
  étape, la voix finit sa phrase).
- **Le jeu ne ment jamais** : tirage au panier sans remise, jamais un défi que
  l'état courant réussit déjà, jamais deux fois le même d'affilée
  (`dernierDefiId` survit au rangement), rien ne se gagne pendant une animation
  ni sur le point d'arrivée d'un scénario (`pFabrique`).
- **Sur mobile**, le médaillon flottant montre la loupe quand elle est hors
  écran, s'ancre dans l'en-tête du jeu pendant le jeu ; le jeu n'a qu'une vue.
- **Choisir ne dérègle pas** : sélectionner un moment ne déclenche la voix que si
  le bouton 🔇/🔊 est allumé.

## Le thème de la série (à reprendre pour les prochains épisodes météo)

```css
--bg: #232f47; --bg2: #1a2338; --surface: #2a3654; --surface-2: #344264;
--border: #435276; --text: #e9edf8; --muted: #9aa5c3;
--goutte: #7cc4ff;                 /* accent principal : l'eau */
--sun: #ffcf5c; --sun-deep: #ff9f1c; /* l'or de la famille : la chaleur */
--rose: #ff6b9d; --teal: #46c2a5; --violet: #a98bff;
/* fond des canvas : #171f36 ; ciel de la scène : #1c3a6e → #6aa6dd */
```

Emoji de série ⛅ (texte courant, pied de page) ; fiole de série : le nuage
d'orage et son éclair DEDANS. Signature de l'épisode : ☁️ (favicon, bio du
compte). Les fonctions de couleur des titres sont celles de la famille : teal
pour « Dehors » (la vue qu'on manipule, et le jeu), violet pour « De tout
près » (la seconde vue), or pour ce qui explique.

## Structure

```
index.html        la page (SEO + og: dans le <head>, note aux parents, pied de série)
css/style.css     le thème météo ; seuil mobile unique 880 px ; plafond de largeur
                  mesuré : scène = 295 px + 0,444 × largeur utile
js/model.js       le modèle pur
js/vue-dehors.js  creerVueDehors(canvas) → { rendre(p, halo, horloge), attrapeGoutte, pDepuisPointeur }
js/vue-loupe.js   creerVueLoupe(canvas) → { rendre(p, horloge) } ; dessinerMiniLoupe(ctx, w, h, p)
js/main.js        le câblage (copié-adapté de la-terre-est-penchee : conteur, jeu, médaillon)
test/             model.test.mjs (31 tests), voix.test.mjs
tools/            voix-lib.mjs (corpus : scn-*-intro/-dehors/-loupe, transition-loupe,
                  defi-*-consigne/-bravo, histoire-N), build-voix.mjs, controle-voix.mjs
assets/           fonts/ (Baloo 2), audio/manifest.json (vide : synthèse seule)
docs/             captures du README, og.png (à générer depuis le portail), voix-conteur.md
```

## Vérification navigateur

Suite Playwright hors dépôt (scratchpad de session, `test-site.js`) : desktop
1200 px, `reducedMotion: 'reduce'`, mobile 390 px (`hasTouch`, `isMobile`),
portable 1440 × 820. Vérifie la structure, la lecture auto, le curseur, le
geste (glisser la goutte de la mer vers le haut : le curseur avance dans la
montée), le scénario « nuage » (arrivée à 46 %), le jeu (douze ouvertures sans
bravo prématuré, un défi gagné en fabriquant le moment, les deux cadres au
même bas, la rangée de commandes sur une ligne), le budget mobile (titre de la
vue → bas du curseur ≤ 715 px, bulle repliée), le médaillon, la bascule 🔇/🔊,
les sondes de pixels du Soleil, zéro erreur console. Servir avant :
`python3 -m http.server 8123`.
