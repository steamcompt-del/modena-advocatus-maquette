/* =========================================================
   MODENA Advocatus — moteur partagé (en-tête, pied, menu, formulaire)
   Chaque page définit <body data-page="..."> et inclut ce script.
   Sobre : aucune animation « reveal », aucun compteur, aucune icône décorative.
   ========================================================= */
(function () {
  'use strict';

  var OFFICES = {
    creteil: { phone: '+33143999792', display: '01 43 99 97 92' },
    pontault: { phone: '+33170335016', display: '01 70 33 50 16' }
  };
  var EMAIL = 'contact@avocatsmodena.fr';

  var NAV = [
    { href: 'index.html', label: 'Accueil', key: 'accueil' },
    { href: 'domaines.html', label: 'Compétences', key: 'domaines' },
    { href: 'equipe.html', label: "L'équipe", key: 'equipe' },
    { href: 'honoraires.html', label: 'Honoraires', key: 'honoraires' },
    { href: 'faq.html', label: 'FAQ', key: 'faq' },
    { href: 'contact.html', label: 'Contact', key: 'contact' }
  ];

  function wordmark() {
    return '<a class="wordmark" href="index.html" aria-label="Accueil — MODENA Advocatus">' +
      '<img class="wordmark__logo" src="assets/img/logo-modena-fond-blanc.webp" alt="MODENA Advocatus" width="244" height="62"></a>';
  }

  function navLinks(page, cls) {
    return NAV.map(function (n) {
      return '<a href="' + n.href + '"' + (n.key === page ? ' class="is-active" aria-current="page"' : '') +
        (cls ? '' : '') + '>' + n.label + '</a>';
    }).join('');
  }

  function buildHeader(page) {
    return '<header class="site-header"><div class="wrap site-header__in">' +
        wordmark() +
        '<nav class="mainnav" aria-label="Navigation principale">' + navLinks(page) + '</nav>' +
        '<div class="header-actions">' +
          '<a class="header-tel" href="tel:' + OFFICES.creteil.phone + '">' + OFFICES.creteil.display + '</a>' +
          '<a class="btn" href="contact.html">Prendre rendez-vous</a>' +
          '<button class="menu-toggle" id="menuToggle" aria-expanded="false" aria-controls="menu">Menu</button>' +
        '</div>' +
      '</div></header>' +
      '<div class="menu" id="menu" aria-hidden="true">' +
        '<div class="menu__backdrop" data-close></div>' +
        '<div class="menu__panel" role="dialog" aria-modal="true" aria-label="Menu">' +
          '<div class="menu__top">' + wordmark() +
            '<button class="menu__close" id="menuClose" data-close aria-label="Fermer le menu">&times;</button>' +
          '</div>' +
          '<nav class="menu__nav" aria-label="Navigation">' + navLinks(page) + '</nav>' +
          '<div class="menu__foot">' +
            '<a class="btn" href="contact.html">Prendre rendez-vous</a>' +
            '<a class="tel-link" href="tel:' + OFFICES.creteil.phone + '">Créteil · ' + OFFICES.creteil.display + '</a>' +
            '<a class="tel-link" href="tel:' + OFFICES.pontault.phone + '">Pontault-Combault · ' + OFFICES.pontault.display + '</a>' +
            '<a class="mail-link" href="mailto:' + EMAIL + '">' + EMAIL + '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function buildFooter() {
    return '<footer class="site-footer"><div class="wrap">' +
      '<div class="site-footer__in">' +
        '<div class="site-footer__brand">' + wordmark() +
          '<p>Cabinet d\'avocats à Créteil et Pontault-Combault. Cabinet généraliste, aide aux victimes et spécialisation en droit du dommage corporel.</p>' +
        '</div>' +
        '<div class="site-footer__col"><h4>Cabinet</h4>' +
          '<a href="domaines.html">Compétences</a><a href="equipe.html">L\'équipe</a>' +
          '<a href="honoraires.html">Honoraires</a><a href="faq.html">FAQ</a><a href="contact.html">Contact</a></div>' +
        '<div class="site-footer__col"><h4>Créteil</h4><p>4, rue des Archives<br>94000 Créteil</p>' +
          '<a href="tel:' + OFFICES.creteil.phone + '">' + OFFICES.creteil.display + '</a></div>' +
        '<div class="site-footer__col"><h4>Pontault-Combault</h4><p>19, rue Lucien Brunet<br>77340 Pontault-Combault</p>' +
          '<a href="tel:' + OFFICES.pontault.phone + '">' + OFFICES.pontault.display + '</a></div>' +
      '</div>' +
      '<div class="site-footer__bottom">' +
        '<p>© <span id="year">2026</span> MODENA Advocatus (AARPI). Tous droits réservés.</p>' +
        '<p><a href="mentions-legales.html">Mentions légales</a> · <a href="politique-confidentialite.html">Politique de confidentialité</a></p>' +
      '</div>' +
    '</div></footer>';
  }

  /* ---------- Injection ---------- */
  var page = document.body.getAttribute('data-page') || '';
  var headerMount = document.getElementById('site-header');
  if (headerMount) headerMount.innerHTML = buildHeader(page);
  var footerMount = document.getElementById('site-footer');
  if (footerMount) footerMount.innerHTML = buildFooter();

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Menu mobile ---------- */
  var toggle = document.getElementById('menuToggle');
  var menu = document.getElementById('menu');
  if (toggle && menu) {
    var closeBtn = document.getElementById('menuClose');
    var open = function () {
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      toggle.setAttribute('aria-expanded', 'true');
      if (closeBtn) closeBtn.focus();
    };
    var close = function () {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    };
    toggle.addEventListener('click', open);
    menu.querySelectorAll('[data-close]').forEach(function (el) { el.addEventListener('click', close); });
    menu.querySelector('.menu__nav').addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) close(); });
  }

  /* ---------- Formulaire de contact ----------
     Aucun backend connecté : on n'affiche JAMAIS de faux « envoyé ».
     À la place, on compose un e-mail réel dans le logiciel de messagerie de l'utilisateur. */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var get = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
      var subject = 'Demande de contact — ' + (get('subject') || 'Site MODENA');
      var body =
        'Nom : ' + get('name') + '\n' +
        'E-mail : ' + get('email') + '\n' +
        'Téléphone : ' + get('phone') + '\n' +
        'Domaine : ' + get('subject') + '\n\n' +
        get('message') + '\n';
      window.location.href = 'mailto:' + EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    });
  }
})();
