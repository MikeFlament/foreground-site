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
    var cards = all('[data-case]');
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
          if (window.fgUnlock) window.fgUnlock();
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

  // Hero button: cycle through industries, link to the one showing
  var rotBtn = $('rotBtn');
  if (rotBtn) {
    var words = all('#rotBtn .rot > span'), wi = 0;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var setHref = function () { rotBtn.setAttribute('href', 'use-cases.html#' + words[wi].getAttribute('data-id')); };
    setHref();
    var paused = false;
    rotBtn.addEventListener('mouseenter', function () { paused = true; });
    rotBtn.addEventListener('mouseleave', function () { paused = false; });
    setInterval(function () {
      if (paused || document.hidden) return;
      var cur = words[wi];
      wi = (wi + 1) % words.length;
      cur.classList.remove('on');
      if (!reduce) { cur.classList.add('out'); setTimeout(function () { cur.classList.remove('out'); }, 600); }
      words[wi].classList.add('on');
      setHref();
    }, 2200);
  }

  // ===== Example pages gate: blurred until a visitor leaves name + email =====
  var UNLOCK_KEY = 'fg-unlocked';
  function unlock() {
    root.classList.add('unlocked');
    try { localStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
  }
  window.fgUnlock = unlock;
  var dlg = null, pendingHref = null;
  function buildDialog() {
    dlg = document.createElement('dialog');
    dlg.className = 'unlock-dlg';
    dlg.setAttribute('aria-labelledby', 'unlockTitle');
    dlg.innerHTML =
      '<button class="unlock-x" type="button" aria-label="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>' +
      '<div class="unlock-body">' +
      '<span class="unlock-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="3"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg></span>' +
      '<h2 id="unlockTitle">See the example pages</h2>' +
      '<p>Leave your name and email to unlock every example, instantly.</p>' +
      '<form class="unlock-form" novalidate>' +
      '<label class="sr" for="ul-name">Name</label><input class="ufield" id="ul-name" name="name" type="text" autocomplete="name" placeholder="Your name">' +
      '<label class="sr" for="ul-email">Email</label><input class="ufield" id="ul-email" name="email" type="email" autocomplete="email" placeholder="you@company.com">' +
      '<input type="hidden" name="interest" value="Unlocked example pages">' +
      '<input type="hidden" name="_subject" value="Example pages unlocked">' +
      '<div class="hp" aria-hidden="true"><input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></div>' +
      '<p class="unlock-err" role="alert" hidden></p>' +
      '<button class="btn btn-primary" type="submit" style="min-height:52px">Unlock examples</button>' +
      '</form>' +
      '<p class="unlock-fine">We’ll only use this to follow up about your brand.</p>' +
      '</div>';
    (document.querySelector('.fg') || document.body).appendChild(dlg);
    var form = dlg.querySelector('form'), err = dlg.querySelector('.unlock-err'), sbtn = form.querySelector('button[type=submit]');
    dlg.querySelector('.unlock-x').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    form.addEventListener('input', function () { err.hidden = true; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim(), email = form.email.value.trim();
      var fail = function (m, el) { err.textContent = m; err.hidden = false; if (el) el.focus(); };
      if (!name) return fail('Please add your name.', form.name);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.', form.email);
      sbtn.disabled = true; sbtn.textContent = 'Unlocking…';
      fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('bad'); })
        .then(function () {
          unlock(); dlg.close();
          if (pendingHref) { location.href = pendingHref; return; }
          var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
          t.textContent = 'Unlocked. Enjoy the examples.'; (document.querySelector('.fg') || document.body).appendChild(t);
          setTimeout(function () { t.remove(); }, 3200);
        })
        .catch(function () { fail('Something went wrong. Please try again in a moment.'); })
        .then(function () { sbtn.disabled = false; sbtn.textContent = 'Unlock examples'; });
    });
  }
  function openUnlock(href) {
    if (!dlg) buildDialog();
    pendingHref = href || null;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(function () { dlg.querySelector('#ul-name').focus(); }, 50);
  }
  all('[data-unlock]').forEach(function (b) { b.addEventListener('click', function () { openUnlock(); }); });
  // Locked gallery cards on the home page ask for email first, then go to that example
  all('.gate .mini').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (root.classList.contains('unlocked')) return;
      e.preventDefault(); openUnlock(a.getAttribute('href'));
    });
  });

  var y = $('year'); if (y) y.textContent = new Date().getFullYear();
})();
