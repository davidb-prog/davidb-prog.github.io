/* Le bloc « Soutenir le Petit labo » — soutien libre du parent.
   Pourquoi Ko-fi : le donateur n'a pas besoin de créer un compte, le don
   ponctuel est le geste par défaut (pas l'abonnement), et le plan gratuit
   ne prend aucune commission. Un lien sortant, aucun script tiers, aucune
   iframe : la page reste sans cookie et sans pisteur.

   PSEUDO est le nom de la page Ko-fi : ko-fi.com/<pseudo>. Le vider suffit à
   remasquer le bloc — on ne montre jamais au parent un bouton qui ne mène
   nulle part, et c'est aussi la porte de sortie si la page ferme un jour.

   Pour changer de plateforme (Tipeee, Liberapay…), il suffit de remplacer
   l'URL construite plus bas — le reste de la page ne bouge pas.

   Compat mobiles anciens : pas d'optional chaining ni de nullish. */
(function () {
  'use strict';

  var PSEUDO = 'petitlabo';

  var bloc = document.getElementById('soutien');
  var lien = document.getElementById('lien-soutien');
  if (!bloc || !lien) { return; }
  if (!PSEUDO) { return; }

  lien.href = 'https://ko-fi.com/' + PSEUDO;
  bloc.hidden = false;
})();
