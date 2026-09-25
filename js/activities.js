/* Le glissement tactile fonctionne avec le défilement natif, même sans ce script. */
(function () {
  'use strict';
  document.querySelectorAll('[data-activities]').forEach(function (root) {
    var track = root.querySelector('.activities__track');
    var items = Array.from(track.children);
    var navigation = root.querySelector('.activities__navigation');
    var previous = root.querySelector('[data-activities-prev]');
    var next = root.querySelector('[data-activities-next]');
    var position = root.querySelector('.activities__position');
    var preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    var pending = false;
    function offsets() {
      var first = items[0].getBoundingClientRect().left;
      return items.map(function (item) { return item.getBoundingClientRect().left - first; });
    }
    function firstVisible() {
      var bounds = track.getBoundingClientRect();
      var complete = items.findIndex(function (item) {
        var box = item.getBoundingClientRect();
        return box.left >= bounds.left - 2 && box.right <= bounds.right + 2;
      });
      if (complete >= 0) return complete;
      return Math.max(0, items.findIndex(function (item) { return item.getBoundingClientRect().right > bounds.left + 5; }));
    }
    function update() {
      var bounds = track.getBoundingClientRect();
      var visible = items.map(function (item, index) {
        var box = item.getBoundingClientRect();
        return box.left >= bounds.left - 2 && box.right <= bounds.right + 2 ? index : -1;
      }).filter(function (index) { return index >= 0; });
      var start = visible.length ? visible[0] : firstVisible();
      var end = visible.length ? visible[visible.length - 1] : start;
      var label = String(start + 1).padStart(2, '0');
      if (end !== start) label += '–' + String(end + 1).padStart(2, '0');
      label += ' / ' + items.length;
      if (position.textContent !== label) position.textContent = label;
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
      pending = false;
    }
    function go(index) {
      track.scrollTo({ left: offsets()[Math.max(0, Math.min(items.length - 1, index))], behavior: preference.matches ? 'auto' : 'smooth' });
    }
    function step(direction) {
      var width = items[0].getBoundingClientRect().width;
      var count = Math.max(1, Math.floor((track.clientWidth + 1) / width));
      go(firstVisible() + count * direction);
    }
    previous.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    track.addEventListener('keydown', function (event) {
      if (event.target !== track) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); go(firstVisible() + 1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); go(firstVisible() - 1); }
      else if (event.key === 'Home') { event.preventDefault(); go(0); }
      else if (event.key === 'End') { event.preventDefault(); go(items.length - 1); }
    });
    track.addEventListener('scroll', function () {
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    else window.addEventListener('resize', update);
    navigation.hidden = false;
    update();
  });
})();
