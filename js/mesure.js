/* Mesure d'audience du portail — GoatCounter.
   Pourquoi celui-ci : gratuit, libre, sans cookie et sans donnée personnelle.
   Rien à déclarer, aucun bandeau de consentement à afficher (la CNIL exempte
   les mesures d'audience strictement anonymes), et surtout : on ne paie pas
   110 €/an pour compter des visiteurs avant de savoir s'il y en a.

   POUR L'ACTIVER — une seule ligne à remplir :
   1. créer un compte sur https://www.goatcounter.com/ (gratuit, 30 secondes)
   2. noter le code choisi (l'app s'appellera <code>.goatcounter.com)
   3. le recopier dans CODE ci-dessous, puis committer

   Tant que CODE est vide, ce fichier ne charge rien du tout : aucune requête
   vers un tiers, aucune trace. C'est l'état par défaut.

   Compat mobiles anciens : pas d'optional chaining ni de nullish. */
(function () {
  'use strict';

  var CODE = '';

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
