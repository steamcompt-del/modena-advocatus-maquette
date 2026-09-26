(function () {
  'use strict';

  var article = document.querySelector('.detail > .article');
  var masthead = document.querySelector('.masthead');
  if (!article || !masthead) return;

  var headings = Array.from(article.querySelectorAll('h2'));
  if (headings.length < 4) return;

  var choices = [
    { heading: headings[0], label: 'Comprendre' },
    { heading: headings.find(function (h) { return /quand nous consulter/i.test(h.textContent); }), label: 'Quand consulter' },
    { heading: headings.find(function (h) { return /nos interventions/i.test(h.textContent); }), label: 'Nos interventions' },
    { heading: headings.find(function (h) { return /documents à préparer/i.test(h.textContent); }), label: 'Documents à préparer' }
  ].filter(function (item) { return item.heading; });

  if (choices.length < 2) return;

  var nav = document.createElement('nav');
  nav.className = 'page-jumps wrap';
  nav.setAttribute('aria-label', 'Dans cette page');
  var label = document.createElement('p');
  label.className = 'page-jumps__label';
  label.textContent = 'Dans cette page';
  nav.appendChild(label);
  var links = document.createElement('div');
  links.className = 'page-jumps__links';
  choices.forEach(function (item, index) {
    var id = 'partie-' + (index + 1);
    item.heading.id = id;
    var link = document.createElement('a');
    link.href = '#' + id;
    link.textContent = item.label;
    links.appendChild(link);
  });
  nav.appendChild(links);
  masthead.insertAdjacentElement('afterend', nav);
})();
