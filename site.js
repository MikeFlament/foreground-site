/* ===== Form setup ===== */
var FORM_ENDPOINT = "https://formspree.io/f/mkowebrv";

(function () {
  var root = document.documentElement;
  function $(id) { return document.getElementById(id); }
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  // Theme toggle (remembered per visitor)
  var tbtn = $('themeToggle');
  function syncLabel() { tbtn.setAttribute('aria-label', root.classList.contains('dark') ? 'Switch to light mode' : 'Switch to dark mode'); }
  if (tbtn) {
    syncLabel();
    tbtn.addEventListener('click', function () {
      root.classList.toggle('dark');
      try { localStorage.setItem('fg-theme', root.classList.contains('dark') ? 'dark' : 'light'); } catch (e) {}
      syncLabel();
    });
  }

  // FAQ accordion (one open at a time)
  var faqs = all('.faq');
  faqs.forEach(function (f) {
    var q = f.querySelector('.faq-q'), a = f.querySelector('.faq-a');
    q.addEventListener('click', function () {
      var willOpen = !f.classList.contains('open');
      faqs.forEach(function (o) { o.classList.remove('open'); o.querySelector('.faq-a').hidden = true; o.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
      if (willOpen) { f.classList.add('open'); a.hidden = false; q.setAttribute('aria-expanded', 'true'); }
    });
  });

  // Sign-up form + use-case interest tag (home page only)
  var form = $('signup');
  if (form) {
    var interest = $('su-interest'), chip = $('su-chip'), chipLabel = $('su-chip-label');
    var cards = all('.uc');
    var setInterest = function (id) {
      var label = 'General', found = false;
      cards.forEach(function (c) {
        var on = c.getAttribute('data-case') === id;
        c.classList.toggle('picked', on);
        if (on) { label = c.getAttribute('data-label'); found = true; }
      });
      interest.value = label;
      chip.hidden = !found;
      chipLabel.textContent = label;
    };
    all('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () { setInterest(a.getAttribute('data-pick')); });
    });
    $('su-chip-clear').addEventListener('click', function () { setInterest(null); });
    try {
      var fromUrl = new URLSearchParams(location.search).get('interest');
      if (fromUrl) setInterest(fromUrl);
    } catch (e) {}

    var err = $('su-error'), btn = $('su-btn'), btnLabel = $('su-btn-label');
    var showError = function (msg) { err.textContent = msg; err.hidden = !msg; };
    form.addEventListener('input', function () { showError(''); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim(), email = form.email.value.trim();
      if (!name) { showError('Please add your name.'); form.name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Please enter a valid email address.'); form.email.focus(); return; }
      btn.disabled = true; btnLabel.textContent = 'Sending…';
      fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('bad'); return r; })
        .then(function () {
          $('su-first').textContent = name.split(/\s+/)[0];
          $('su-mail').textContent = email;
          $('signupWrap').hidden = true;
          var done = $('signupDone'); done.hidden = false; done.style.display = 'flex';
        })
        .catch(function () { showError('Something went wrong. Please try again in a moment.'); })
        .then(function () { btn.disabled = false; btnLabel.textContent = 'I’m interested'; });
    });
  }

  // Use-cases page: highlight the chip for the section in view
  var chips = all('.ucchip');
  if (chips.length && 'IntersectionObserver' in window) {
    var byId = {};
    chips.forEach(function (c) { byId[c.getAttribute('href').slice(1)] = c; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        chips.forEach(function (c) { c.classList.remove('active'); });
        var c = byId[en.target.id];
        if (c) { c.classList.add('active'); if (c.scrollIntoView && window.innerWidth < 960) c.parentNode.scrollTo({ left: c.offsetLeft - 16, behavior: 'smooth' }); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    all('.uc-row').forEach(function (s) { spy.observe(s); });
  }

  // Scroll reveal fallback for browsers without scroll-driven animations
  var supportsView = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!supportsView && 'IntersectionObserver' in window) {
    root.classList.add('io');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    all('.reveal').forEach(function (el) { io.observe(el); });
  }

  var y = $('year'); if (y) y.textContent = new Date().getFullYear();
})();
