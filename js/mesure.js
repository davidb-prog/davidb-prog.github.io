/* Mesure d'audience du portail — GoatCounter.
   Pourquoi celui-ci : gratuit, libre, sans cookie et sans donnée personnelle.
   Rien à déclarer, aucun bandeau de consentement à afficher (la CNIL exempte
   les mesures d'audience strictement anonymes), et surtout : on ne paie pas
   110 €/an pour compter des visiteurs avant de savoir s'il y en a.

   CODE est le nom du compte GoatCounter : les statistiques se lisent sur
   <code>.goatcounter.com. Le vider suffit à tout couper — le fichier ne
   charge alors plus rien, aucune requête vers un tiers, aucune trace.

   Attention si une app payante voit le jour : le palier gratuit de
   GoatCounter est réservé à l'usage non commercial. Le site vitrine d'une
   app vendue ne l'est plus, et il faudra basculer sur un plan payant (ou
   Plausible, ou l'auto-hébergement).

   Compat mobiles anciens : pas d'optional chaining ni de nullish. */
(function () {
  'use strict';

  var CODE = 'davidb-prog';

  if (!CODE) { return; }

  /* GoatCounter ignore déjà localhost ; on écarte aussi les ouvertures
     depuis le système de fichiers (file://) pendant le développement. */
  if (window.location.protocol === 'file:') { return; }

  var s = document.createElement('script');
  s.src = 'https://gc.zgo.at/count.js';
  s.async = true;
  s.setAttribute('data-goatcounter', 'https://' + CODE + '.goatcounter.com/count');
  document.head.appendChild(s);
})();
