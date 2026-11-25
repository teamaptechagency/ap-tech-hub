
(function () {
  document.querySelectorAll('.apx').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.apx-tab'));
    var ind = root.querySelector('.apx-ind');
    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        var panel = root.querySelector('#' + t.getAttribute('aria-controls'));
        if (on) {
          panel.hidden = false;
          // replay entrance animations
          panel.querySelectorAll('.apx-msg').forEach(function (m) {
            m.style.animation = 'none'; void m.offsetWidth; m.style.animation = '';
          });
        } else { panel.hidden = true; }
      });
      ind.style.transform = 'translateX(' + (i * 100) + '%)';
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') select((i + 1) % tabs.length, true);
        if (e.key === 'ArrowLeft') select((i + tabs.length - 1) % tabs.length, true);
      });
    });
  });
})();
