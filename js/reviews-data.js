/* =========================================================
   MODENA Advocatus — Avis Google (données réelles)
   Source : fiches Google Business Profile du cabinet et des avocats.
   Avis recopiés tels que publiés par leurs auteurs sur Google (verbatim,
   ponctuation normalisée). Aucune note ni aucun avis n'est inventé.
   Relevé le 23/06/2026 — à réactualiser si les notes évoluent.
   ========================================================= */
(function () {

  /* --- Fiches Google (note moyenne + nombre d'avis, réels) --- */
  window.MODENA_REVIEW_PROFILES = [
    {
      id: 'cabinet',
      who: 'Cabinet MODENA Advocatus',
      rating: 5.0,
      count: 10,
      url: 'https://www.google.com/search?q=Cabinet+d%27avocats+Modena+Advocatus+Avis#lkt=LocalPoiReviews'
    },
    {
      id: 'navennec',
      who: 'Me Lydie Navennec Normand',
      rating: 4.7,
      count: 75,
      url: 'https://www.google.com/search?q=Navennec+Normand+Lydie+Avis#lkt=LocalPoiReviews'
    },
    {
      id: 'sadaka',
      who: 'Me Elsa Sadaka',
      rating: 4.9,
      count: 16,
      url: 'https://www.google.com/search?q=Elsa+Sadaka+-+avocate+Avis#lkt=LocalPoiReviews'
    }
  ];

  /* --- Avis sélectionnés (verbatim) --- */
  window.MODENA_REVIEWS = [
    { author: 'Isabelle',        rating: 5, when: 'il y a 9 mois',  profile: 'cabinet',
      text: "Accueil et suivi efficace et bienveillant dans un moment difficile. Je recommande." },

    { author: 'Pascal Galteau',  rating: 5, when: 'il y a 4 mois',  profile: 'navennec',
      text: "J'ai été touché par la bienveillance de Maître Navennec Normand et son accompagnement tout au long de cette procédure. Son professionnalisme et la connaissance des dossiers d'indemnisations ont permis l'aboutissement positif de 18 mois de combats. Encore infiniment merci." },

    { author: 'Cécile Boiffard', rating: 5, when: 'il y a un an',   profile: 'sadaka',
      text: "Maître Sadaka allie une grande compétence professionnelle et une écoute attentive et bienveillante. Grâce à elle et à sa persévérance, j'ai obtenu gain de cause et l'en remercie chaleureusement." },

    { author: 'Julie Enderess',  rating: 5, when: 'il y a 10 mois', profile: 'cabinet',
      text: "Grâce à Lou Levy-Hadida et son cabinet, mon litige a été résolu en une semaine. Je les remercie pour leur professionnalisme !" },

    { author: 'Albert Gnae',     rating: 5, when: 'il y a 4 ans',   profile: 'navennec',
      text: "Maître Navennec Normand m'a énormément aidé pour la résolution d'un conflit entre mon bailleur et moi. Je la recommande vivement." },

    { author: 'Patrick Tanniou', rating: 5, when: 'il y a 4 mois',  profile: 'sadaka',
      text: "Maître Sadaka est sincèrement une excellente avocate. Elle est disponible, à l'écoute de son client, et ses conseils sont pertinents." }
  ];

  /* --- Rendu sobre : citations (pas de grille d'avatars, pas de badges dupliqués) --- */
  function profileOf(id) {
    var list = window.MODENA_REVIEW_PROFILES || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function stars(n) {
    var full = Math.round(n), s = '';
    for (var i = 0; i < 5; i++) s += (i < full ? '★' : '☆');
    return s;
  }

  /* Une citation (blockquote éditorial) */
  window.MODENA_renderQuote = function (r) {
    var p = profileOf(r.profile) || { who: '' };
    return '<figure class="quote">' +
      '<span class="stars" aria-label="' + r.rating + ' sur 5">' + stars(r.rating) + '</span>' +
      '<blockquote>« ' + r.text + ' »</blockquote>' +
      '<figcaption><b>' + r.author + '</b>' + p.who + ' · avis Google</figcaption>' +
    '</figure>';
  };

  /* Synthèse : les trois notes réelles + un seul lien Google */
  window.MODENA_reviewsSummary = function () {
    var l = window.MODENA_REVIEW_PROFILES || [];
    var url = (l[0] && l[0].url) || '#';
    var parts = l.map(function (p) {
      return p.who + ' <b>' + p.rating.toFixed(1).replace('.', ',') + '/5</b>';
    });
    return parts.join(' · ') + ' — <a href="' + url + '" target="_blank" rel="noopener nofollow">voir les avis sur Google</a>';
  };

})();
