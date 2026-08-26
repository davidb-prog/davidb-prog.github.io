/* Le bouton « Partager » du portail — le geste du parent convaincu.
   Partage natif (navigator.share) quand le navigateur le propose : la feuille
   de partage du téléphone s'ouvre avec le texte d'aperçu et le lien. Sinon,
   repli en copie du lien dans le presse-papiers, avec un « Lien copié ! »
   visible. Aucun échec silencieux : si même la copie échoue, on affiche
   l'adresse à recopier à la main.
   Compat mobiles anciens : pas d'optional chaining ni de nullish. */
(function () {
  'use strict';

  var LIEN = 'https://petit-labo.fr';
  var TEXTE = 'Où va le Soleil la nuit ? De petits sites gratuits à toucher, à faire tourner, à écouter.';

  var btn = document.getElementById('btn-partager');
  var etat = document.getElementById('partage-etat');
  if (!btn || !etat) { return; }

  var minuterie = null;

  /* durable = true : le message reste affiché (cas de l'adresse à recopier) */
  function montre(message, durable) {
    etat.textContent = message;
    etat.hidden = false;
    if (minuterie) { clearTimeout(minuterie); minuterie = null; }
    if (!durable) {
      minuterie = setTimeout(function () { etat.hidden = true; }, 4000);
    }
  }

  /* repli du repli : le presse-papiers des navigateurs plus anciens */
  function copieAncienne() {
    var champ = document.createElement('textarea');
    champ.value = LIEN;
    champ.setAttribute('readonly', '');
    champ.style.position = 'absolute';
    champ.style.left = '-9999px';
    document.body.appendChild(champ);
    champ.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(champ);
    return ok;
  }

  function copieLeLien() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(LIEN).then(function () {
        montre('Lien copié !');
      }, function () {
        if (copieAncienne()) { montre('Lien copié !'); }
        else { montre('La copie n’a pas marché — l’adresse : petit-labo.fr', true); }
      });
      return;
    }
    if (copieAncienne()) { montre('Lien copié !'); }
    else { montre('La copie n’a pas marché — l’adresse : petit-labo.fr', true); }
  }

  btn.addEventListener('click', function () {
    if (navigator.share) {
      navigator.share({ text: TEXTE, url: LIEN }).then(null, function (erreur) {
        /* le parent a refermé la feuille de partage : ce n'est pas un échec */
        if (erreur && erreur.name === 'AbortError') { return; }
        copieLeLien();
      });
      return;
    }
    copieLeLien();
  });
})();
