/* Bouton « Installer le Petit labo ».
   Android/Chrome expose beforeinstallprompt : un bouton du site peut déclencher
   l'installation. Apple ne le permet pas : sur iPhone/iPad, seules les consignes
   Partager → « Sur l'écran d'accueil » s'affichent.
   Compat mobiles anciens : pas d'optional chaining ni de nullish. */
(function () {
  'use strict';

  var blocInstaller = document.getElementById('bloc-installer');
  var btn = document.getElementById('btn-installer');
  var dejaInstalle = document.getElementById('deja-installe');
  var conseilIos = document.getElementById('conseil-ios');
  var conseilAndroid = document.getElementById('conseil-android');
  if (!blocInstaller || !btn || !dejaInstalle) { return; }

  function estEnPleinEcran() {
    if (window.navigator.standalone === true) { return true; } /* iOS */
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) { return true; }
    return false;
  }

  function marqueInstalle() {
    dejaInstalle.hidden = false;
    blocInstaller.hidden = true;
    if (conseilIos) { conseilIos.hidden = true; }
    if (conseilAndroid) { conseilAndroid.hidden = true; }
  }

  if (estEnPleinEcran()) { marqueInstalle(); return; }

  var promptDiffere = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    promptDiffere = e;
    blocInstaller.hidden = false;
    /* le bouton remplace la manip manuelle Android */
    if (conseilAndroid) { conseilAndroid.hidden = true; }
  });

  btn.addEventListener('click', function () {
    if (!promptDiffere) { return; }
    promptDiffere.prompt();
    promptDiffere = null;
  });

  window.addEventListener('appinstalled', marqueInstalle);
})();
