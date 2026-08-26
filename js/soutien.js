/* Le bloc « Offrir une fiole » — soutien libre du parent.
   Pourquoi Ko-fi : le donateur n'a pas besoin de créer un compte, le don
   ponctuel est le geste par défaut (pas l'abonnement), et le plan gratuit
   ne prend aucune commission. Un lien sortant, aucun script tiers, aucune
   iframe : la page reste sans cookie et sans pisteur.

   POUR L'ACTIVER — une seule ligne à remplir :
   1. créer une page sur https://ko-fi.com/ (gratuit)
   2. noter le pseudo choisi (la page sera ko-fi.com/<pseudo>)
   3. le recopier dans PSEUDO ci-dessous, puis committer

   Tant que PSEUDO est vide, le bloc reste masqué : on ne montre pas au parent
   un bouton qui ne mène nulle part. C'est l'état par défaut.

   Pour changer de plateforme (Tipeee, Liberapay…), il suffit de remplacer
   l'URL construite plus bas — le reste de la page ne bouge pas.

   Compat mobiles anciens : pas d'optional chaining ni de nullish. */
(function () {
  'use strict';

  var PSEUDO = '';

  var bloc = document.getElementById('soutien');
  var lien = document.getElementById('lien-soutien');
  if (!bloc || !lien) { return; }
  if (!PSEUDO) { return; }

  lien.href = 'https://ko-fi.com/' + PSEUDO;
  bloc.hidden = false;
})();
