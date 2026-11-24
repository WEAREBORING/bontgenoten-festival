/* Bontgenoten Festival site.js v1.4.0: attribuutmodules. Bron: site.js in WEAREBORING/bontgenoten-festival. Elke module start alleen als zijn attribuut of class op de pagina staat. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var path = window.location.pathname;
  // De pagina met de loader (de oude homepage met split header) herken je aan een zichtbare .loader, niet aan de URL
  var loaderEl = document.querySelector('.loader');
  var hasLoader = !!loaderEl && window.getComputedStyle(loaderEl).display !== 'none';
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  function num(el, attr, fallback) { var v = parseFloat(el.getAttribute(attr)); return isNaN(v) ? fallback : v; }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  /* data-bgf-year: zet het huidige jaar (bijvoorbeeld het copyright in de footer) */
  each('[data-bgf-year]', function (el) { el.textContent = new Date().getFullYear(); });

  /* data-bgf-form: eigen formuliernaam en redirect per instantie. Naam en redirect van een
     formulier in een component zijn niet aan props te koppelen; webflow.js leest data-name bij verzenden en
     data-redirect bij het starten, dus dit moet vóór Webflow.ready draaien (site.js staat in de footer). */
  each('[data-bgf-form-name], [data-bgf-form-redirect]', function (wrap) {
    var form = wrap.querySelector('form');
    if (!form) return;
    var name = (wrap.getAttribute('data-bgf-form-name') || '').trim();
    var redirect = (wrap.getAttribute('data-bgf-form-redirect') || '').trim();
    if (name) form.setAttribute('data-name', name);
    // Alleen paden op deze site ("/..."), geen externe of protocol-relatieve URL's ("//" of "/\", dat browsers als "//" lezen)
    if (/^\/(?![\/\\])/.test(redirect)) { form.setAttribute('data-redirect', redirect); form.setAttribute('redirect', redirect); }
  });

  /* GSAP: Webflow laadt de core zelf (GSAP-integratie, 3.15). withGsap(fn, ['ScrollTrigger', ...]) laadt ontbrekende
     plugins van het Webflow-CDN in dezelfde versie, registreert ze en roept fn(gsap) aan. Zonder core laden we die ook. */
  var loading = {};
  function load(src) {
    if (!loading[src]) loading[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('laden mislukt: ' + src)); };
      document.head.appendChild(s);
    });
    return loading[src];
  }
  function withGsap(fn, plugins) {
    plugins = plugins || [];
    (window.gsap ? Promise.resolve() : load('https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js'))
      .then(function () {
        var base = 'https://cdn.prod.website-files.com/gsap/' + window.gsap.version + '/';
        return Promise.all(plugins.map(function (p) { return window[p] ? null : load(base + p + '.min.js'); }));
      })
      .then(function () {
        plugins.forEach(function (p) { window.gsap.registerPlugin(window[p]); });
        fn(window.gsap);
      })
      .catch(function (e) { console.error('site.js:', e); });
  }

  /* Ticketshop (Eventix via Slater-project 18724): de loader zelf laadt alleen iets op ticketpagina's */
  (function () {
    var s = document.createElement('script');
    s.type = 'module';
    s.src = window.location.host.indexOf('webflow.io') > -1 ? 'https://slater.app/18724.js' : 'https://assets.slater.app/slater/18724.js?v=1.0';
    document.body.appendChild(s);
  })();

  /* data-bgf-lenis (op body of page-wrapper): smooth scroll met Lenis. Niet bij touch (standaard van Lenis) en niet bij
     reduced motion. Loopt op de ticker van GSAP. De css staat in site.css. Een element met data-lenis-prevent scrolt zelf.
     [data-lenis-stop], [data-lenis-start] en [data-lenis-toggle] (in het menu) zetten het scrollen stil of weer aan. */
  if (document.querySelector('[data-bgf-lenis]') && !reduce.matches) withGsap(function (gsap) {
    load('https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js').then(function () {
      if (!window.Lenis) return;
      var lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.7, anchors: true, autoRaf: false });
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      document.addEventListener('click', function (e) {
        var el = e.target.closest('[data-lenis-start], [data-lenis-stop], [data-lenis-toggle]');
        if (!el) return;
        if (el.hasAttribute('data-lenis-start')) lenis.start();
        else if (el.hasAttribute('data-lenis-stop')) lenis.stop();
        else if (el.classList.toggle('stop-scroll')) lenis.stop();
        else lenis.start();
      });
    });
  });

  /* Paginaovergang (.transition met .transition_element, in het component transition): bij laden schuiven de balken weg,
     bij een klik op een interne link schuiven ze dicht en gaat de browser daarna naar de link. Niet op een pagina met een zichtbare
     loader (de oude homepage). Uitzonderingen: links met data-transition-prevent, in [data-tabs], target _blank, ankers op dezelfde pagina. */
  if (document.querySelector('.transition')) withGsap(function (gsap) {
    var stagger = { amount: 0.1, from: 'random' };
    if (hasLoader || reduce.matches) gsap.set('.transition', { display: 'none' });
    else gsap.to('.transition_element', { height: '0%', duration: 1, delay: 0.4, ease: 'expo.out', stagger: stagger,
      onComplete: function () { gsap.set('.transition', { display: 'none' }); } });
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (link.getAttribute('href').charAt(0) === '#' || link.target === '_blank' || link.hasAttribute('download') ||
        link.closest('[data-tabs]') || link.hasAttribute('data-transition-prevent')) return;
      var url = new URL(link.href, window.location.href);
      if (url.hostname !== window.location.hostname) return;
      if (url.pathname === path && url.search === window.location.search && url.hash) return;
      e.preventDefault();
      if (reduce.matches) { window.location.href = link.href; return; }
      gsap.set('.transition', { display: 'flex' });
      gsap.fromTo('.transition_element', { height: '0%' }, { height: '101%', duration: 1, ease: 'expo.out', stagger: stagger,
        onComplete: function () { window.location.href = link.href; } });
    });
    // Terug met de knop van de browser: de pagina uit de cache staat nog dicht
    window.addEventListener('pageshow', function (e) { if (e.persisted) window.location.reload(); });
  });

  /* .button_wrapper: de lijnen (.button_background-line) vullen de knop bij hover. Alleen desktop met muis. */
  if (document.querySelector('.button_background-line')) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
    each('.button_wrapper', function (button) {
      var lines = button.querySelectorAll('.button_background-line');
      if (!lines.length) return;
      function fill(height) {
        gsap.to(lines, { height: height, duration: 0.4, ease: 'expo.out', stagger: { amount: 0.15, from: 'random' }, overwrite: true });
      }
      button.addEventListener('mouseenter', function () { if (desktop.matches && !reduce.matches) fill('101%'); });
      button.addEventListener('mouseleave', function () { fill('0%'); });
    });
  });

  /* [words-slide-up]: woorden schuiven per stuk omhoog in beeld (masker .mask om elk .word, css in site.css) */
  if (document.querySelector('[words-slide-up]') && !reduce.matches) withGsap(function (gsap) {
    document.fonts.ready.then(function () {
      each('[words-slide-up]', function (el) {
        var words = window.SplitText.create(el, { type: 'words', wordsClass: 'word', tag: 'span' }).words;
        words.forEach(function (word) {
          var mask = document.createElement('div');
          mask.className = 'mask';
          word.parentNode.insertBefore(mask, word);
          mask.appendChild(word);
        });
        var tl = gsap.timeline({ paused: true }).from(words, { y: '100%', opacity: 0, duration: 1, ease: 'expo.out', stagger: { each: 0.04 } });
        window.ScrollTrigger.create({ trigger: el, start: 'top 80%', onEnter: function () { tl.play(); } });
      });
    });
  }, ['ScrollTrigger', 'SplitText']);

  /* [fade-up]: element komt omhoog in beeld als het 80% van het scherm bereikt */
  if (document.querySelector('[fade-up]') && !reduce.matches) withGsap(function (gsap) {
    each('[fade-up]', function (el) {
      var tl = gsap.timeline({ paused: true })
        .from(el, { opacity: 0, duration: 0.8, ease: 'power1.out' }, 0)
        .from(el, { y: '1rem', duration: 1, ease: 'expo.out' }, 0);
      window.ScrollTrigger.create({ trigger: el, start: 'top 80%', onEnter: function () { tl.play(); } });
    });
  }, ['ScrollTrigger']);

  /* data-bgf-parallax (Section - Gallery): kinderen met data-bgf-speed bewegen anders mee met scrollen.
     1 = gewoon mee, kleiner = trager (achter de titel), groter = sneller. Alleen vanaf 992px en zonder reduced motion. */
  if (document.querySelector('[data-bgf-parallax]') && !reduce.matches) withGsap(function (gsap) {
    gsap.matchMedia().add('(min-width: 992px)', function () {
      each('[data-bgf-parallax]', function (wrap) {
        wrap.querySelectorAll('[data-bgf-speed]').forEach(function (el) {
          var shift = ((parseFloat(el.getAttribute('data-bgf-speed')) || 1) - 1) * 250;
          gsap.fromTo(el, { y: shift }, { y: -shift, ease: 'none',
            scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });
    });
  }, ['ScrollTrigger']);

  /* Footer-CTA (.cta_wrapper): [cta-top|right|bottom|left] schuiven naar binnen. Beginstand staat in de head van de pagina. */
  var ctaParts = '[cta-top], [cta-right], [cta-bottom], [cta-left]';
  if (document.querySelector('.cta_wrapper')) withGsap(function (gsap) {
    if (reduce.matches) { if (document.querySelector(ctaParts)) gsap.set(ctaParts, { x: 0, y: 0 }); return; }
    var ease = { duration: 1, ease: 'expo.out' };
    var tl = gsap.timeline({ paused: true, delay: 1 });
    [['[cta-top]', 'y'], ['[cta-right]', 'x'], ['[cta-bottom]', 'y'], ['[cta-left]', 'x']].forEach(function (p) {
      if (!document.querySelector(p[0])) return;
      var vars = Object.assign({}, ease);
      vars[p[1]] = '0%';
      tl.to(p[0], vars, 0);
    });
    window.ScrollTrigger.create({ trigger: '.cta_wrapper', start: 'top 80%', once: true, onEnter: function () { tl.play(); } });
  }, ['ScrollTrigger']);

  /* Hero: [hero-1] t/m [hero-3] schuiven omhoog, [hero-4] van links. Beginstand staat in de head van de pagina.
     Pagina met zichtbare loader: eerst de loader (.loader, teller .loader_number, logo .loader_logo-icon); aan het eind klikt het script op
     .loader_trigger (de interactie die de loader weghaalt) en start de hero 1,2 s later. Andere pagina's: 0,6 s na laden. */
  var heroParts = '[hero-1], [hero-2], [hero-3], [hero-4]';
  var homeLoader = hasLoader;
  if (document.querySelector(heroParts) || homeLoader) withGsap(function (gsap) {
    function playHero() {
      if (!document.querySelector(heroParts)) return;
      if (reduce.matches) { gsap.set(heroParts, { x: 0, y: 0 }); return; }
      var tl = gsap.timeline();
      [['[hero-1]', 'y', 0], ['[hero-2]', 'y', 0.15], ['[hero-3]', 'y', 0.3], ['[hero-4]', 'x', 0.3]].forEach(function (p) {
        if (!document.querySelector(p[0])) return;
        var vars = { duration: 1, ease: 'expo.out' };
        vars[p[1]] = '0%';
        tl.to(p[0], vars, p[2]);
      });
    }
    if (!homeLoader) { ready(function () { setTimeout(playHero, 600); }); return; }
    var counter = { value: 0 };
    var duration = 1.5;
    try {
      // Tweede bezoek in dit tabblad: kortere loader
      if (sessionStorage.getItem('visited') !== null) { duration = 1; counter.value = 75; }
      sessionStorage.setItem('visited', 'true');
    } catch (e) { /* geen sessionStorage: gewone duur */ }
    var number = document.querySelector('.loader_number');
    gsap.timeline({ onComplete: function () {
      // Via jQuery, zoals de interactie op .loader_trigger altijd werd gestart
      if (window.jQuery) window.jQuery('.loader_trigger').click();
      else each('.loader_trigger', function (t) { t.click(); });
      setTimeout(playHero, 1200);
    } })
      .to(counter, { value: 100, duration: duration,
        ease: window.CustomEase.create('loader', 'M0,0,C0,0,0.13,0.34,0.238,0.442,0.305,0.506,0.322,0.514,0.396,0.54,0.478,0.568,0.468,0.56,0.522,0.584,0.572,0.606,0.61,0.719,0.714,0.826,0.798,0.912,1,1,1,1'),
        onUpdate: function () { if (number) number.textContent = Math.round(counter.value); } })
      .to('.loader_logo-icon', { yPercent: -110, ease: 'expo.out', duration: 0.6 }, 0.2);
  }, homeLoader ? ['CustomEase'] : []);

  /* Marquee: eindeloze rij; scrollen versnelt hem en draait de richting om. Bij reduced motion staat hij stil.
     [data-bgf-marquee-item] (Section - Marquee, 2027) en .marquee-slide (Zongenoten, 2025). */
  var marqueeItems = '[data-bgf-marquee-item], .marquee-slide';
  if (document.querySelector(marqueeItems) && !reduce.matches) withGsap(function (gsap) {
    var speed = { value: 1 };
    var tl = gsap.timeline({ repeat: -1, onReverseComplete: function () { tl.progress(1); } });
    tl.fromTo(marqueeItems, { xPercent: 0 }, { xPercent: -100, duration: 50, ease: 'none' });
    window.Observer.create({
      target: window,
      type: 'wheel,scroll,touch',
      onChangeY: function (self) {
        var v = gsap.utils.clamp(-100, 100, self.velocityY * 0.002);
        var resting = v < 0 ? -1 : 1;
        gsap.fromTo(speed, { value: v }, { value: resting, duration: 1,
          onUpdate: function () { tl.timeScale(Math.max(0.5, Math.abs(speed.value)) * Math.sign(speed.value)); } });
      }
    });
  }, ['Observer']);

  /* FAQ-tabs: .button-faq_wrapper met attribuut faq-button-<naam> toont .cl-faqs_wrapper met faq-item-<naam> (class is-active).
     Begint op ?faq=<naam> in de URL, anders op tickets. */
  var faqButtons = document.querySelectorAll('.button-faq_wrapper');
  if (faqButtons.length) {
    var faqItems = document.querySelectorAll('.cl-faqs_wrapper');
    var faqName = function (button) {
      var attr = [].filter.call(button.attributes, function (a) { return a.name.indexOf('faq-button-') === 0; })[0];
      return attr ? attr.name.slice('faq-button-'.length) : '';
    };
    var activateFaq = function (button) {
      [].forEach.call(faqButtons, function (b) { b.classList.remove('is-active'); });
      button.classList.add('is-active');
      [].forEach.call(faqItems, function (item) { item.classList.remove('is-active'); });
      var name = faqName(button);
      var item = name && document.querySelector('[faq-item-' + name + ']');
      if (item) item.classList.add('is-active');
    };
    [].forEach.call(faqButtons, function (b) { b.addEventListener('click', function () { activateFaq(b); }); });
    var requested = new URLSearchParams(window.location.search).get('faq');
    var start = (requested && /^[a-z0-9-]+$/.test(requested) && document.querySelector('[faq-button-' + requested + ']')) ||
      document.querySelector('[faq-button-tickets]');
    if (start) activateFaq(start);
  }

  /* [close-menu]: een klik sluit het menu (klikt op .menu_button, die de interactie van het menu start) */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[close-menu]')) each('.menu_button', function (b) { b.click(); });
  });

  /* Zongenoten: het logo in de hero zweeft zachtjes (alleen op /zongenoten) */
  if (path.indexOf('/zongenoten') === 0 && document.querySelector('.hero-home_logo-zongenoten') && !reduce.matches) withGsap(function (gsap) {
    var float = { ease: 'sine.inOut', repeat: -1, yoyo: true };
    gsap.to('.hero-home_logo-zongenoten', Object.assign({ y: -15, duration: 3 }, float));
    gsap.to('.hero-home_logo-zongenoten', Object.assign({ x: 8, duration: 4.5 }, float));
    gsap.to('.hero-home_logo-zongenoten', Object.assign({ rotation: 2, duration: 5 }, float));
  });

  /* data-bgf-cursor (op Global - Nav): jubileumcursor, twee gekruiste creme ovalen met mix-blend-mode difference, zodat het
     overlappende deel de pagina laat zien. Alleen met muis (hover + fijne pointer) en zonder reduced motion. Standen (Figma 642:2106):
     standaard 26 px, hover 40 px (links, knoppen, [data-bgf-cursor-hover]), ingedrukt 20 px, slepen 80 x 40 ([data-bgf-cursor-drag]).
     De css staat in site.css (.bgf-cursor). */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (document.querySelector('[data-bgf-cursor]') && fine.matches && !reduce.matches) withGsap(function (gsap) {
    // [breedte, hoogte] van het liggende ovaal; het staande ovaal is gespiegeld, behalve bij slepen
    var sizes = { base: [26, 14, 14, 26], hover: [40, 18, 18, 40], press: [20, 10, 10, 20], drag: [80, 24, 24, 40] };
    var ovals = ['is-horizontal', 'is-vertical'].map(function (mod) {
      var o = document.createElement('span');
      o.className = 'bgf-cursor ' + mod;
      o.setAttribute('aria-hidden', 'true');
      document.body.appendChild(o);
      gsap.set(o, { xPercent: -50, yPercent: -50, opacity: 0 });
      return o;
    });
    document.documentElement.classList.add('bgf-cursor-on');
    var moveX = ovals.map(function (o) { return gsap.quickTo(o, 'x', { duration: 0.15, ease: 'power3.out' }); });
    var moveY = ovals.map(function (o) { return gsap.quickTo(o, 'y', { duration: 0.15, ease: 'power3.out' }); });
    var current = '', hovering = false, pressed = false, dragging = false;
    function setState() {
      var next = dragging ? 'drag' : pressed ? 'press' : hovering ? 'hover' : 'base';
      if (next === current) return;
      current = next;
      var d = sizes[next];
      gsap.to(ovals[0], { width: d[0], height: d[1], duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
      gsap.to(ovals[1], { width: d[2], height: d[3], duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
    }
    setState();
    var hoverSel = 'a, button, [role="button"], input[type="submit"], label, select, [data-bgf-cursor-hover]';
    document.addEventListener('mousemove', function (e) {
      moveX.forEach(function (f) { f(e.clientX); });
      moveY.forEach(function (f) { f(e.clientY); });
      gsap.to(ovals, { opacity: 1, duration: 0.2, overwrite: 'auto' });
      var t = e.target instanceof Element ? e.target : null;
      hovering = !!(t && t.closest(hoverSel));
      setState();
    });
    document.addEventListener('mousedown', function (e) {
      pressed = true;
      dragging = !!(e.target instanceof Element && e.target.closest('[data-bgf-cursor-drag]'));
      setState();
    });
    document.addEventListener('mouseup', function () { pressed = false; dragging = false; setState(); });
    document.documentElement.addEventListener('mouseleave', function () { gsap.to(ovals, { opacity: 0, duration: 0.2, overwrite: 'auto' }); });
  });

  /* data-bgf-nav (Global - Nav): dropdowns en het mobiele menu, zonder Navbar of Dropdown van Webflow.
     data-bgf-dropdown om elk menu met daarin -toggle (button) en -panel; data-bgf-nav-toggle (hamburger, onder 992px) opent
     data-bgf-nav-menu. Klik opent en sluit, op desktop met muis ook hover; Escape en een klik buiten de nav sluiten.
     Panelen en het mobiele menu staan in Webflow op display none: site.js zet display flex inline. */
  each('[data-bgf-nav]', function (nav) {
    var hover = window.matchMedia('(hover: hover) and (min-width: 992px)');
    var drops = [].slice.call(nav.querySelectorAll('[data-bgf-dropdown]'));
    var navToggle = nav.querySelector('[data-bgf-nav-toggle]');
    var menu = nav.querySelector('[data-bgf-nav-menu]');
    var gsap = null;
    if (drops.length) withGsap(function (g) { gsap = g; });
    function toggleOf(dd) { return dd.querySelector('[data-bgf-dropdown-toggle]'); }
    function isOpen(dd) { var t = toggleOf(dd); return !!t && t.getAttribute('aria-expanded') === 'true'; }
    function setDrop(dd, open) {
      var toggle = toggleOf(dd), panel = dd.querySelector('[data-bgf-dropdown-panel]');
      if (!toggle || !panel) return;
      var caret = toggle.querySelector('svg');
      toggle.setAttribute('aria-expanded', open);
      panel.style.display = open ? 'flex' : '';
      // Pijltje draait mee; zolang GSAP nog laadt springt hij
      if (caret && gsap) gsap.to(caret, { rotation: open ? 180 : 0, duration: reduce.matches ? 0 : 0.2, ease: 'power2.out', overwrite: true });
      else if (caret) caret.style.transform = open ? 'rotate(180deg)' : '';
    }
    function closeDrops(except) { drops.forEach(function (dd) { if (dd !== except && isOpen(dd)) setDrop(dd, false); }); }
    function setMenu(open) {
      if (!navToggle || !menu) return;
      navToggle.setAttribute('aria-expanded', open);
      menu.style.display = open ? 'flex' : '';
      document.documentElement.classList.toggle('bgf-nav-open', open);
    }
    // Een link in het mobiele menu sluit het menu (ankers op dezelfde pagina laden niet opnieuw)
    if (menu) menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    drops.forEach(function (dd) {
      var toggle = toggleOf(dd), timer;
      if (!toggle) return;
      toggle.addEventListener('click', function (e) {
        // Een muisklik op desktop opent alleen (de hover had hem al open); toetsenbord en touch wisselen
        var open = (e.detail > 0 && hover.matches) || !isOpen(dd);
        closeDrops(dd);
        setDrop(dd, open);
      });
      dd.addEventListener('mouseenter', function () { if (!hover.matches) return; clearTimeout(timer); closeDrops(dd); setDrop(dd, true); });
      // Vertraging: tussen knop en paneel zit een marge waar de muis even buiten de dropdown is
      dd.addEventListener('mouseleave', function () { if (hover.matches) timer = setTimeout(function () { setDrop(dd, false); }, 200); });
      dd.addEventListener('focusout', function (e) { if (e.relatedTarget && !dd.contains(e.relatedTarget)) setDrop(dd, false); });
    });
    if (navToggle && menu) navToggle.addEventListener('click', function () { setMenu(navToggle.getAttribute('aria-expanded') !== 'true'); });
    // Over een donkere sectie (data-bgf-nav-dark: hero, footer) krijgt de nav data-bgf-nav-on-dark; site.css maakt de
    // Tickets-knop anders zwart, zodat hij ook op creme zichtbaar blijft
    var darks = [].slice.call(document.querySelectorAll('[data-bgf-nav-dark]'));
    var ticking = false;
    function checkDark() {
      ticking = false;
      var y = 38; // midden van de knoppenbalk (1rem boven + 2.75rem hoog)
      nav.toggleAttribute('data-bgf-nav-on-dark', darks.some(function (s) { var r = s.getBoundingClientRect(); return r.top <= y && r.bottom >= y; }));
    }
    function queueDark() { if (!ticking) { ticking = true; requestAnimationFrame(checkDark); } }
    window.addEventListener('scroll', queueDark, { passive: true });
    window.addEventListener('resize', queueDark);
    checkDark();
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = drops.filter(isOpen)[0];
      if (open) { setDrop(open, false); toggleOf(open).focus(); }
      else if (navToggle && navToggle.getAttribute('aria-expanded') === 'true') { setMenu(false); navToggle.focus(); }
    });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) { closeDrops(); setMenu(false); } });
  });

  /* data-bgf-hover: hover-animatie met GSAP, alleen op desktop met muis.
     data-bgf-hover op het element waar je overheen gaat; kinderen met data-bgf-hover-x en/of -y (rem, px of %) en/of
     data-bgf-hover-scale bewegen mee. Duur in seconden: data-bgf-hover-duration (standaard 0.6) en -duration-out (0.4).
     Na het teruggaan neemt de class de stijl weer over (clearProps). */
  var hovers = document.querySelectorAll('[data-bgf-hover]');
  if (hovers.length) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
    function axis(t, name, vars) {
      var v = t.getAttribute('data-bgf-hover-' + name);
      if (v === null) return;
      var pct = /%$/.test(v);
      vars[name] = pct ? 0 : v;
      vars[name + 'Percent'] = pct ? parseFloat(v) : 0;
    }
    [].forEach.call(hovers, function (trigger) {
      var targets = [].filter.call(trigger.querySelectorAll('[data-bgf-hover-x], [data-bgf-hover-y], [data-bgf-hover-scale]'), function (t) {
        return t.closest('[data-bgf-hover]') === trigger;
      });
      if (!targets.length) return;
      trigger.addEventListener('mouseenter', function () {
        if (!desktop.matches || reduce.matches) return;
        targets.forEach(function (t) {
          // Ruststand uit de class (ook een translate in %) onthouden, zodat het terugkeren klopt
          if (!t._hoverRest) t._hoverRest = { x: gsap.getProperty(t, 'x'), y: gsap.getProperty(t, 'y'), xPercent: gsap.getProperty(t, 'xPercent'), yPercent: gsap.getProperty(t, 'yPercent'), scale: gsap.getProperty(t, 'scale') };
          var vars = { duration: num(t, 'data-bgf-hover-duration', 0.6), ease: 'expo.out', overwrite: true };
          axis(t, 'x', vars);
          axis(t, 'y', vars);
          if (t.hasAttribute('data-bgf-hover-scale')) vars.scale = num(t, 'data-bgf-hover-scale', 1);
          gsap.to(t, vars);
        });
      });
      trigger.addEventListener('mouseleave', function () {
        targets.forEach(function (t) {
          var rest = t._hoverRest;
          if (!rest) return;
          gsap.to(t, { x: rest.x, y: rest.y, xPercent: rest.xPercent, yPercent: rest.yPercent, scale: rest.scale, duration: num(t, 'data-bgf-hover-duration-out', 0.4), ease: 'expo.out', overwrite: true,
            onComplete: function () { gsap.set(t, { clearProps: 'transform' }); t._hoverRest = null; } });
        });
      });
    });
  });
})();
