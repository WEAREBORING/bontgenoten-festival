/* Bontgenoten Festival site.js v1.16.0: attribuutmodules. Bron: site.js in WEAREBORING/bontgenoten-festival. Elke module start alleen als zijn attribuut of class op de pagina staat. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var path = window.location.pathname;
  // De pagina met de loader (de oude homepage met split header) herken je aan een zichtbare .loader, niet aan de URL
  var loaderEl = document.querySelector('.loader');
  var hasLoader = !!loaderEl && window.getComputedStyle(loaderEl).display !== 'none';
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  function num(el, attr, fallback) { var v = parseFloat(el.getAttribute(attr)); return isNaN(v) ? fallback : v; }
  // gradient.js staat naast site.js (zelfde versie op jsDelivr, of lokaal in de test); alleen geladen waar data-bgf-gradient staat
  var gradientSrc = document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/site(\.min)?\.js/, 'gradient$1.js') : null;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  // plek op de pagina zonder transforms (offsetTop); de scheve kaarten (data-bgf-card) zouden getBoundingClientRect verschuiven
  function docTop(n) { var y = 0; for (; n; n = n.offsetParent) y += n.offsetTop; return y; }
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

  /* Een Button (component) in een formulier verstuurt het formulier (Global - Footer, nieuwsbrief): een component kan in Webflow
     geen submitknop zijn. De eigen submitknop blijft verborgen in het formulier staan, zodat Enter in het veld ook werkt. */
  document.addEventListener('click', function (e) {
    var button = e.target instanceof Element && e.target.closest('form .button_wrapper');
    if (!button) return;
    e.preventDefault();
    var form = button.closest('form');
    if (form.requestSubmit) form.requestSubmit(); else form.submit();
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

  /* .button_wrapper: de lijnen (.button_background-line) vullen de knop bij hover. Alleen desktop met muis.
     Zelfde hover voor andere knoppen met lijnen [data-bgf-fill-line] (twee niveaus diep, zoals de FAQ-tabs); niet op de actieve tab.
     Alles beweegt omhoog (BORING 2026-11-26): een lijn is altijd vol hoog en schuift door de knop (yPercent, de achtergrond knipt):
     erin = van onder naar het midden, eruit = van het midden naar boven; daarna staat hij weer onder klaar.
     Button "Creme hover-rand" andersom: daar zijn de lijnen in rust vol (ze vormen de achtergrond), bij hover gaan ze eruit
     (omhoog weg, de knop wordt doorzichtig met alleen de rand) en bij verlaten komen ze er van onder weer in.
     Snel in en uit of halverwege terug: een lijn die nog boven weg aan het gaan is, keert om; nooit een sprong. */
  if (document.querySelector('.button_background-line, [data-bgf-fill-line]')) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 992px)');
    var hosts = [].slice.call(document.querySelectorAll('.button_wrapper'));
    each('[data-bgf-fill-line]', function (line) {
      var host = line.parentNode.parentNode;
      if (hosts.indexOf(host) < 0) hosts.push(host);
    });
    var stagger = { amount: 0.15, from: 'random' };
    function fillIn(lines) {
      // wat boven weg is (of bijna), begint weer onder; wat nog onderweg is, keert vanaf waar het is
      [].forEach.call(lines, function (l) { if (gsap.getProperty(l, 'yPercent') <= -100) gsap.set(l, { yPercent: 101 }); });
      gsap.to(lines, { yPercent: 0, duration: 0.4, ease: 'expo.out', stagger: stagger, overwrite: true });
    }
    function fillOut(lines) {
      gsap.to(lines, { yPercent: -101, duration: 0.4, ease: 'expo.out', stagger: stagger, overwrite: true,
        onComplete: function () { gsap.set(lines, { yPercent: 101 }); } });
    }
    hosts.forEach(function (button) {
      var lines = button.querySelectorAll('.button_background-line, [data-bgf-fill-line]');
      if (!lines.length) return;
      var full = parseFloat(window.getComputedStyle(lines[0]).height) > 0;   // lijnen in rust vol = omgekeerde hover
      gsap.set(lines, { height: '101%', yPercent: full ? 0 : 101 });
      var on = false;
      function enter() {
        if (on || !desktop.matches || reduce.matches || button.getAttribute('aria-selected') === 'true') return;
        on = true;
        if (full) fillOut(lines); else fillIn(lines);
      }
      function leave() {
        if (!on) return;
        on = false;
        if (full) fillIn(lines); else fillOut(lines);
      }
      button.addEventListener('mouseenter', enter);
      button.addEventListener('mouseleave', leave);
      // naar tablet of touch terwijl de muis erop staat: terug naar rust
      desktop.addEventListener('change', leave);
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

  /* data-bgf-words (koppen van 2027): woorden schuiven per stuk omhoog in beeld, zoals [words-slide-up], maar het masker houdt
     de regelhoogte van de kop (.bgf-word-mask in site.css). [words-slide-up] blijft voor Zongenoten (.mask met line-height 1.6). */
  if (document.querySelector('[data-bgf-words]') && !reduce.matches) withGsap(function (gsap) {
    document.fonts.ready.then(function () {
      each('[data-bgf-words]', function (el) {
        var words = window.SplitText.create(el, { type: 'words', wordsClass: 'bgf-word', tag: 'span' }).words;
        words.forEach(function (word) {
          var mask = document.createElement('span');
          mask.className = 'bgf-word-mask';
          word.parentNode.insertBefore(mask, word);
          mask.appendChild(word);
        });
        var tl = gsap.timeline({ paused: true }).from(words, { yPercent: 110, opacity: 0, duration: 1, ease: 'expo.out', stagger: { each: 0.04 } });
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
     1 = gewoon mee, kleiner = trager (zakt, zoals de titel), groter = sneller (stijgt, zoals de foto's). De waarde van
     data-bgf-parallax is de afstand in px per 1 snelheidsverschil (standaard 250). Alleen vanaf 992px en zonder reduced motion. */
  if (document.querySelector('[data-bgf-parallax]') && !reduce.matches) withGsap(function (gsap) {
    gsap.matchMedia().add('(min-width: 992px)', function () {
      each('[data-bgf-parallax]', function (wrap) {
        var distance = num(wrap, 'data-bgf-parallax', 250);
        wrap.querySelectorAll('[data-bgf-speed]').forEach(function (el) {
          var shift = ((parseFloat(el.getAttribute('data-bgf-speed')) || 1) - 1) * distance;
          gsap.fromTo(el, { y: shift }, { y: -shift, ease: 'none',
            scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });
    });
  }, ['ScrollTrigger']);

  /* data-bgf-gradient (Section - Hero): ODB's jubileumverloop live met WebGL2 (gradient.js, alleen hier geladen). Waarde = preset
     (standaard bgf-hero: stilstaande 10, stroken volgen de muis, lens rond de cursor). Alleen met muis, zonder reduced motion en met WebGL2;
     anders blijft de afbeelding (de still) staan. De canvas komt over de afbeelding en faded in na het eerste beeld; buiten beeld
     staat hij stil. el.bgfGradient = de engine, voor data-bgf-hero. */
  function hasWebgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } }
  var liveGradient = gradientSrc && finePointer.matches && !reduce.matches &&
    document.querySelector('[data-bgf-gradient], [data-bgf-gradient-text]') && hasWebgl2();
  // engine op een canvas in el: muis stuurt de stroken (en de lens), tenzij opts.pointer === false; buiten beeld staat hij stil
  function startGradient(el, canvas, preset, onReady, opts) {
    opts = opts || {};
    canvas.className = 'bgf-gradient';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.addEventListener('bgf:rendered', function () { canvas.setAttribute('data-bgf-ready', ''); if (onReady) onReady(); }, { once: true });
    var g = window.BGFGradient.create(canvas, { preset: preset, maxDpr: opts.maxDpr || 2, below: opts.below || null });
    el.bgfGradient = g;
    if (opts.pointer === false) g.setState({ pointerStrips: false, lens: false });
    else {
      el.addEventListener('pointermove', function (e) {
        var r = canvas.getBoundingClientRect();
        g.setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      });
      el.addEventListener('pointerleave', function () { g.setPointer(null); });
    }
    new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) g.play(); else g.pause(); }).observe(el);
    return g;
  }
  if (liveGradient) load(gradientSrc).then(function () {
    each('[data-bgf-gradient]', function (el) {
      var canvas = document.createElement('canvas');
      var still = el.querySelector(':scope > img');
      el.insertBefore(canvas, still ? still.nextSibling : el.firstChild);
      // smalle band (marquee): de canvas krijgt de verhouding van een scherm (16:9) en de band toont daar een strook uit, zodat het
      // verloop eruitziet als in de hero in plaats van alle kleuren in een paar centimeter; resolutie 1x is daar genoeg;
      // de muis doet daar niets (de stroken schuiven met de marquee mee, zie data-bgf-marquee)
      var band = el.clientWidth > el.clientHeight * 3;
      if (band) canvas.setAttribute('data-bgf-crop', '');
      // de hero krijgt LINE-UP een scherm lager in het glas zodra er een line-up-sectie op de pagina staat (zie data-bgf-hero)
      startGradient(el, canvas, el.getAttribute('data-bgf-gradient') || 'bgf-hero', null,
        { maxDpr: band ? 1 : el.hasAttribute('data-bgf-hero') ? 2 : 1.5, pointer: !band, below: el.hasAttribute('data-bgf-hero') && document.querySelector('[data-bgf-lineup]') ? 'LINE-UP' : null });
    });

    /* data-bgf-gradient-text (Section - Gallery, titelregels): de letters gevuld met het live verloop. De canvas ligt in de regel en
       wordt geknipt met een SVG-clipPath met dezelfde tekst, op de basislijn en de beginpositie van de echte tekst (gemeten met een
       markering); de echte tekst blijft staan voor schermlezers en selectie en wordt doorzichtig zodra de canvas tekent.
       Strookbreedte zoals in de hero: zeven stroken per schermbreedte. Reageert niet op de muis. */
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    document.body.appendChild(svg);
    each('[data-bgf-gradient-text]', function (el, n) {
      var text = el.textContent.replace(/\s+/g, ' ').trim();
      var marker = document.createElement('span');
      marker.setAttribute('data-bgf-baseline', '');
      el.insertBefore(marker, el.firstChild);
      var clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      clip.id = 'bgf-text-clip-' + n;
      clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.textContent = text;
      clip.appendChild(t);
      svg.appendChild(clip);
      var canvas = document.createElement('canvas');
      canvas.style.clipPath = 'url(#' + clip.id + ')';
      el.appendChild(canvas);
      var g = startGradient(el, canvas, el.getAttribute('data-bgf-gradient-text') || 'bgf-glass', function () { el.setAttribute('data-bgf-live', ''); }, { pointer: false, maxDpr: 1 });   // letterranden komen uit de SVG-clip, 1x is scherp genoeg
      var fit = function () {
        var cs = getComputedStyle(el), c = canvas.getBoundingClientRect(), m = marker.getBoundingClientRect();
        t.setAttribute('x', m.left - c.left);
        t.setAttribute('y', m.top - c.top);
        t.setAttribute('font-family', cs.fontFamily);
        t.setAttribute('font-size', cs.fontSize);
        t.setAttribute('font-weight', cs.fontWeight);
        t.setAttribute('letter-spacing', cs.letterSpacing === 'normal' ? '0' : cs.letterSpacing);
        var strips = Math.max(2, Math.round(7 * c.width / window.innerWidth));
        g.setState({ stripsMin: strips, stripsMax: strips + 1 });
      };
      document.fonts.ready.then(fit);
      new ResizeObserver(fit).observe(el);
    });
  }).catch(function (e) { console.error('site.js:', e); });

  /* data-bgf-hero (Section - Hero): [data-bgf-hero-item] komen om de beurt omhoog in beeld na de paginaovergang, [data-bgf-hero-fade]
     faden in. Vanaf 992px met muis blijft de hero daarna staan (pin) terwijl de volgende secties eroverheen schuiven, en gaat
     [data-bgf-hero-out] scrolt mee weg. Twee standen, vanzelf gekozen:
     - zonder line-up (geen [data-bgf-lineup] op de pagina): pin van één schermhoogte; de 10 lost op in het verloop (meer blur)
     - met line-up: pin tot het eind van de line-up; in het glas schuift de 10 weg en komt LINE-UP in beeld (de engine krijgt
       below: 'LINE-UP', zie data-bgf-gradient); geen blur
     De stroken blijven in beide standen staan. Reduced motion: niets. */
  var lineupSection = document.querySelector('[data-bgf-lineup]');
  if (document.querySelector('[data-bgf-hero]') && !reduce.matches) withGsap(function (gsap) {
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    each('[data-bgf-hero]', function (hero) {
      var delay = document.querySelector('.transition') && !hasLoader ? 0.6 : 0.1;
      gsap.from(hero.querySelectorAll('[data-bgf-hero-item]'), { y: '2rem', opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: delay });
      // zijteksten alleen faden: ze staan met transform (translateY(-50%), rotate) in het midden
      gsap.from(hero.querySelectorAll('[data-bgf-hero-fade]'), { opacity: 0, duration: 1.2, ease: 'power1.out', delay: delay + 0.3 });
      if (!finePointer.matches) return;
      gsap.matchMedia().add('(min-width: 992px)', function () {
        var last = -1;
        // p = 0..1 over de eerste schermhoogte scrollen
        var update = function (p) {
          var g = hero.bgfGradient;
          p = Math.round(p * 100) / 100;
          if (!g || p === last) return;
          last = p;
          if (lineupSection) g.setScroll(p);
          else g.setState({ blurMin: lerp(0.006, 0.09, p), blurMax: lerp(0.075, 0.12, p) });
        };
        // eerst de tekst-trigger, dan de pin: een trigger op hetzelfde element ná een pin begint pas na die pin
        // de inhoud in het midden scrolt gewoon weg (1:1 met de pagina, geen fade), ook al staat de hero vast (BORING 2026-11-26)
        var outRange = function () { return { trigger: hero, start: 'top top', end: function () { return '+=' + hero.offsetHeight; }, scrub: true, invalidateOnRefresh: true }; };
        gsap.to(hero.querySelectorAll('[data-bgf-hero-out]'), { y: function () { return -hero.offsetHeight; }, ease: 'none', scrollTrigger: outRange() });
        // de zijteksten (locaties) scrollen mee weg (BORING 2026-11-26). Ze staan met transform (translateY(-50%), rotate) in het midden;
        // daarom schuift een eigen variabele de losse translate (site.css), zodat die transform blijft staan
        gsap.fromTo(hero, { '--bgf-hero-out': '0px' }, { '--bgf-hero-out': function () { return -hero.offsetHeight + 'px'; }, ease: 'none', scrollTrigger: outRange() });
        // tot de eerste kaart (galerij) de hero bedekt: hero + line-up + de ruimte boven de kaart (site.css, BORING 2026-11-26)
        var firstCard = document.querySelector('[data-bgf-card]');
        var pinLength = function () {
          var gap = firstCard ? parseFloat(getComputedStyle(firstCard).marginTop) || 0 : 0;
          return hero.offsetHeight + (lineupSection ? lineupSection.offsetHeight : 0) + Math.max(0, gap);
        };
        window.ScrollTrigger.create({ trigger: hero, start: 'top top', end: function () { return '+=' + pinLength(); },
          pin: true, pinSpacing: false, invalidateOnRefresh: true,
          onUpdate: function (self) { update(Math.min(1, self.progress * pinLength() / hero.offsetHeight)); } });
        return function () { update(0); hero.style.removeProperty('--bgf-hero-out'); };
      });
    });
  }, ['ScrollTrigger']);

  /* data-bgf-card: harde sectie-overgang. De sectie komt als scheve, kleinere kaart omhoog en trekt recht naar volle breedte zodra
     haar bovenkant de bovenkant van het scherm bereikt. De kanteling wisselt per kaart links/rechts (designer 2026-11-26). Sinds BORING
     2026-11-26 alleen op galerij, video, quote (festival) en footer; naast de kaart zie je de creme pagina. Achter de eerste kaart staat de vastgepinde hero: die wordt donkerder met een zwarte
     laag (.bgf-dim; goedkoper dan filter: brightness) en tekent niet meer zodra de kaart hem helemaal bedekt.
     Vanaf 768px, zonder reduced motion. Bij het opnieuw meten (refreshInit) gaat de transform eraf, zodat alles goed meet. */
  if (document.querySelector('[data-bgf-card]') && !reduce.matches) withGsap(function (gsap) {
    gsap.matchMedia().add('(min-width: 768px)', function () {
      var hero = document.querySelector('[data-bgf-hero]');
      var panels = [].slice.call(document.querySelectorAll('[data-bgf-card]'));
      var clear = function () { gsap.set(panels, { clearProps: 'transform' }); };
      window.ScrollTrigger.addEventListener('refreshInit', clear);
      var dim = null;
      if (hero) { dim = document.createElement('div'); dim.className = 'bgf-dim'; dim.setAttribute('aria-hidden', 'true'); hero.appendChild(dim); }
      panels.forEach(function (panel, i) {
        // clamp: de laatste sectie (footer) haalt de bovenkant van het scherm niet; dan eindigt de overgang onderaan de pagina
        var range = { trigger: panel, start: function () { return docTop(panel) - window.innerHeight; },
          end: function () { return Math.min(docTop(panel), window.ScrollTrigger.maxScroll(window)); }, scrub: true };
        gsap.fromTo(panel, { scale: 0.8, rotate: i % 2 ? 4 : -4, transformOrigin: '50% 0%' },
          { scale: 1, rotate: 0, ease: 'none', scrollTrigger: range });
        if (i === 0 && dim) {
          gsap.fromTo(dim, { opacity: 0 }, { opacity: 0.45, ease: 'none', scrollTrigger: range });
          window.ScrollTrigger.create({ trigger: panel, start: function () { return docTop(panel); },
            onEnter: function () { if (hero.bgfGradient) hero.bgfGradient.pause(); },
            onLeaveBack: function () { if (hero.bgfGradient) hero.bgfGradient.play(); } });
        }
      });
      return function () { window.ScrollTrigger.removeEventListener('refreshInit', clear); if (dim) dim.remove(); };
    });
  }, ['ScrollTrigger']);

  /* data-bgf-lock (Section - Video): de sectie klikt zacht vast bovenaan het scherm en blijft staan terwijl de volgende sectie
     eroverheen schuift (zoals de "smooth sticky" van extrema.be). Zacht: over de laatste 40% schermhoogte loopt de sectie eerst iets
     voor en remt dan af tot stilstand bovenaan (losse translate, de kaart-transform blijft van data-bgf-card); daarna een pin tot de
     bovenkant van de volgende sectie bovenaan is. Vanaf 768px, zonder reduced motion. */
  if (document.querySelector('[data-bgf-lock]') && !reduce.matches) withGsap(function (gsap) {
    gsap.matchMedia().add('(min-width: 768px)', function () {
      var locks = [].slice.call(document.querySelectorAll('[data-bgf-lock]')).filter(function (el) { return el.nextElementSibling; });
      var clear = function () { locks.forEach(function (el) { el.style.translate = ''; }); };
      window.ScrollTrigger.addEventListener('refreshInit', clear);
      locks.forEach(function (el) {
        // u = 1 → 0 over de aanloop; stand t.o.v. normaal scrollen: -D·u·(1-u)², dus bovenaan snelheid 0 en aan het begin gewoon mee
        var ease = function (self) {
          var u = 1 - self.progress, D = window.innerHeight * 0.4, y = -D * u * (1 - u) * (1 - u);
          el.style.translate = Math.abs(y) < 0.5 ? '' : '0 ' + y.toFixed(1) + 'px';
        };
        var next = el.nextElementSibling;
        window.ScrollTrigger.create({ trigger: el, start: function () { return docTop(el) - window.innerHeight * 0.4; }, end: function () { return docTop(el); },
          onUpdate: ease, onLeave: clear, onLeaveBack: clear });
        window.ScrollTrigger.create({ trigger: el, start: function () { return docTop(el); }, end: function () { return docTop(next); }, pin: true, pinSpacing: false });
      });
      return function () { window.ScrollTrigger.removeEventListener('refreshInit', clear); clear(); };
    });
  }, ['ScrollTrigger']);

  /* data-bgf-scroll-text (Section - Quote): de tekst komt woord voor woord binnen terwijl je scrolt, met kleur zoals de Cultuur-sectie
     van Afix (data-a-fill), maar zonder gloed of blur (BORING 2026-11-26): de letters komen op in een jubileumkleur en worden
     dan de eigen kleur. De gloed loopt in de volgorde van het verloop door de tekst (honey, sunset, cayenne, pine, lagoon,
     flamingo), zodat het verloop over de quote schuift. Woorden die nog moeten komen staan op 15%. Vanaf 768px staat de sectie daarbij
     even vast (pin, één schermhoogte), daaronder loopt het mee met de sectie. Reduced motion: gewone tekst. */
  if (document.querySelector('[data-bgf-scroll-text]') && !reduce.matches) withGsap(function (gsap) {
    var BRAND = [[253, 174, 4], [245, 117, 19], [255, 42, 0], [3, 53, 9], [5, 128, 205], [236, 124, 238]];
    var clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
    var mix = function (a, b, t) { return a.map(function (v, k) { return Math.round(v + (b[k] - v) * t); }); };
    // kleur op plek u (0..1) van het verloop
    var brandAt = function (u) { var x = clamp01(u) * (BRAND.length - 1), i = Math.min(BRAND.length - 2, Math.floor(x)); return mix(BRAND[i], BRAND[i + 1], x - i); };
    document.fonts.ready.then(function () {
      each('[data-bgf-scroll-text]', function (el) {
        var section = el.closest('section') || el;
        var words = window.SplitText.create(el, { type: 'words', wordsClass: 'bgf-scroll-word' }).words;
        var ink = (getComputedStyle(el).color.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
        var glows = words.map(function (w, i) { return brandAt(words.length > 1 ? i / (words.length - 1) : 0); });
        var soft = 8, last = [];   // soft = over hoeveel woorden één woord binnenkomt
        // t = 0..1 per woord: eerst gloed (letters doorzichtig), dan scherp in de eigen kleur
        function draw(n) {
          words.forEach(function (w, i) {
            var t = Math.round((1 - Math.pow(1 - clamp01((n - i) / soft), 3)) * 40) / 40;
            if (last[i] === t) return;
            last[i] = t;
            if (t === 0) { w.style.opacity = 0.15; w.style.color = ''; return; }
            if (t === 1) { w.style.opacity = ''; w.style.color = ''; return; }
            // c = van kleur naar eigen kleur (pas in de tweede helft); de letters gaan van doorzichtig naar dekkend in de jubileumkleur
            var c = clamp01((t - 0.5) / 0.5);
            w.style.opacity = Math.max(0.15, clamp01(t / 0.35));
            w.style.color = 'rgba(' + mix(glows[i], ink, c).join(', ') + ', ' + clamp01((t - 0.1) / 0.4).toFixed(3) + ')';
          });
        }
        draw(0);
        gsap.matchMedia().add({ wide: '(min-width: 768px)', narrow: '(max-width: 767px)' }, function (ctx) {
          var st = ctx.conditions.wide
            ? { trigger: section, start: function () { return docTop(section); }, end: '+=100%', pin: true, pinSpacing: true }   // pinSpacing expliciet: .main-wrapper is flex (dan staat het standaard uit)
            : { trigger: el, start: 'top 80%', end: 'bottom 45%' };
          st.onUpdate = function (self) { draw(self.progress * (words.length + soft)); };
          st.onRefresh = st.onUpdate;
          window.ScrollTrigger.create(st);
        });
        // de pin komt pas na het laden van de fonts: triggers verderop opnieuw meten
        window.ScrollTrigger.sort(); window.ScrollTrigger.refresh();
      });
    });
  }, ['ScrollTrigger', 'SplitText']);

  /* Bunny-videospeler (Section - Video), naar Osmo's "Custom Bunny HLS Player (Basic)" met dezelfde attributen, alleen het deel
     dat we gebruiken: [data-bunny-player-init] met data-player-src (HLS .m3u8 van Bunny Stream) en data-player-autoplay="true"
     speelt stil en in een lus zodra hij in beeld is en pauzeert erbuiten. De <video> maakt site.js (class video_media).
     [data-player-control="mute"] (een <button> over de hele video) zet het geluid aan en weer uit; site.js houdt aria-label,
     aria-pressed, data-bgf-cursor-label (de cursortekst) en [data-player-hint] (de tekst op touch) bij.
     Status voor de css: data-player-status idle/loading/playing/paused, data-player-activated, data-player-muted.
     Reduced motion: geen autoplay; de knop speelt de video met geluid af en pauzeert hem weer.
     HLS: Safari speelt .m3u8 zelf, andere browsers via hls.js (alleen geladen als het nodig is). */
  each('[data-bunny-player-init]', function (player) {
    var src = player.getAttribute('data-player-src');
    if (!src) return;
    var video = player.querySelector('video');
    if (!video) {
      video = document.createElement('video');
      video.className = 'video_media';
      player.insertBefore(video, player.firstChild);
    }
    var toggle = player.querySelector('[data-player-control="mute"]');
    var hint = player.querySelector('[data-player-hint]');
    var autoplay = player.getAttribute('data-player-autoplay') === 'true' && !reduce.matches;
    video.muted = autoplay;
    video.loop = autoplay;
    video.playsInline = true;
    video.preload = 'none';
    video.disablePictureInPicture = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');   // de knop erboven is het bedienbare element
    if (autoplay) video.setAttribute('muted', '');
    if ('disableRemotePlayback' in video) video.disableRemotePlayback = true;
    function set(name, value) { if (player.getAttribute(name) !== String(value)) player.setAttribute(name, String(value)); }

    // Osmo: native HLS waar de browser het goed kan (Safari met ManagedMediaSource), anders hls.js, anders toch native
    var nativeHls = !!video.canPlayType('application/vnd.apple.mpegurl') && 'ManagedMediaSource' in window;
    var attached = null;
    function attach() {
      if (!attached) attached = (nativeHls || !window.MediaSource ? Promise.resolve(false)
        : load('https://cdn.jsdelivr.net/npm/hls.js@1.6.11').then(function () { return window.Hls.isSupported(); }, function () { return false; })
      ).then(function (useHls) {
        if (!useHls) { video.src = src; return; }
        var hls = new window.Hls({ maxBufferLength: 10, capLevelToPlayerSize: true });
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MEDIA_ATTACHED, function () { hls.loadSource(src); });
      });
      return attached;
    }
    var wantPlay = false;
    function play() {
      wantPlay = true;
      if (player.getAttribute('data-player-status') !== 'playing') set('data-player-status', 'loading');
      attach().then(function () {
        if (!wantPlay) return;
        var p = video.play();
        if (p && p.catch) p.catch(function () { set('data-player-status', 'paused'); });
      });
    }
    function pause() { wantPlay = false; video.pause(); }

    function sync() {
      var text = autoplay ? (video.muted ? 'Geluid aan' : 'Geluid uit') : (video.paused ? 'Afspelen' : 'Pauzeren');
      set('data-player-muted', video.muted);
      if (toggle) {
        toggle.setAttribute('aria-label', text);
        toggle.setAttribute('data-bgf-cursor-label', text);
        if (autoplay) toggle.setAttribute('aria-pressed', String(!video.muted));
        if (autoplay) toggle.setAttribute('data-bgf-cursor-icon', video.muted ? 'mute' : 'sound');   // cursor: kruis of equalizer
        else toggle.removeAttribute('aria-pressed');   // zonder autoplay is het een afspeelknop
      }
      if (hint) hint.textContent = text;
    }
    video.addEventListener('playing', function () { set('data-player-activated', true); set('data-player-status', 'playing'); sync(); });
    video.addEventListener('pause', function () { set('data-player-status', 'paused'); sync(); });
    video.addEventListener('waiting', function () { set('data-player-status', 'loading'); });
    video.addEventListener('volumechange', sync);
    sync();

    if (toggle) toggle.addEventListener('click', function () {
      if (autoplay) { video.muted = !video.muted; if (video.paused) play(); }
      else if (video.paused) { video.muted = false; play(); }
      else pause();
    });

    // in beeld: laden en (autoplay) spelen; uit beeld: pauzeren. Het geluid blijft zoals de bezoeker het zette.
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { if (autoplay) play(); else attach(); }
      else if (!video.paused || wantPlay) pause();
    }, { threshold: 0.1 }).observe(player);
  });

  /* data-bgf-lineup (Section Line-up, optie 2 "cilinder", Figma 642:1806 met meer lucht; gekozen door de klant 2026-11-26).
     De kaarten zijn de items van de Collection List (CMS Line-up): [data-bgf-lineup-item] = Dag, met daarin [data-bgf-lineup-name],
     [data-bgf-lineup-tag] (Toevoeging) en [data-bgf-lineup-genre]. Zonder site.js blijft het de gewone scrollrij uit Webflow.
     Met site.js: een vaste baan van 1440 x 680 die meeschaalt (--k), elke kaart op een plek van de cilinder; tussen de plekken
     loopt alles vloeiend (Catmull-Rom). Slepen (met inertie), pijltjes, toetsen en klikken op een zijkaart draaien de cilinder;
     hij loopt rond (korte lijsten worden herhaald tot er minstens 10 kaarten zijn). De naam van de artiest in het midden staat in
     [data-bgf-lineup-info] (creme blok met naam, toevoeging en genre). Dagknoppen [data-bgf-lineup-day] filteren.
     Reduced motion: geen inertie en geen animaties, wel alles bedienbaar. De maten staan in site.css ([data-bgf-lineup-ready]). */
  each('[data-bgf-lineup]', function (section) {
    var slider = section.querySelector('[data-bgf-lineup-slider]');
    var list = slider && slider.querySelector('.w-dyn-items');
    var sources = list ? [].slice.call(list.querySelectorAll('[data-bgf-lineup-item]')) : [];
    if (!sources.length) return;   // lege collectie: de lege staat van Webflow blijft
    withGsap(function (gsap) {
      var txt = function (el, sel) { var n = el.querySelector(sel); return n ? n.textContent.trim() : ''; };
      var artists = sources.map(function (item) {
        return { node: item, name: txt(item, '[data-bgf-lineup-name]'), tag: txt(item, '[data-bgf-lineup-tag]'),
          genre: txt(item, '[data-bgf-lineup-genre]'), day: (item.getAttribute('data-bgf-lineup-item') || '').toLowerCase() };
      });
      var info = section.querySelector('[data-bgf-lineup-info]');
      var infoBox = section.querySelector('[data-bgf-lineup-info-box]');
      var infoName = section.querySelector('[data-bgf-lineup-info-name]');
      var infoTag = section.querySelector('[data-bgf-lineup-info-tag]');
      var infoGenre = section.querySelector('[data-bgf-lineup-info-genre]');
      var counter = section.querySelector('[data-bgf-lineup-counter]');
      var days = [].slice.call(section.querySelectorAll('[data-bgf-lineup-day]'));
      var live = document.createElement('p');
      live.className = 'bgf-sr';
      live.setAttribute('aria-live', 'polite');
      slider.appendChild(live);
      if (counter) { counter.removeAttribute('aria-live'); counter.setAttribute('aria-hidden', 'true'); }
      slider.setAttribute('role', 'region');
      slider.setAttribute('aria-roledescription', 'carrousel');
      slider.setAttribute('aria-label', 'Line-up');
      list.setAttribute('data-bgf-cursor-drag', '');
      section.setAttribute('data-bgf-lineup-ready', '');

      // ---- cilinder: elke plek opgelost uit de Figma-trapezia (buiten- en binnenrand: x en hoogte; horizon op het kaartmidden) ----
      var P = 2400;   // CSS-perspectief (ook in site.css)
      var GAP = 96;   // extra ruimte per plek (BORING/klant: "meer lucht"), in baan-px
      var FIGMA = [
        { xo: 1162, ho: 425, xi: 972, hi: 380, opacity: 1, dim: 0.15 },
        { xo: 1314, ho: 490, xi: 1174, hi: 435, opacity: 1, dim: 0.3 },
        { xo: 1426, ho: 570, xi: 1326, hi: 500, opacity: 1, dim: 0.45 }
      ];
      var right = [{ tx: 0, tz: 0, ry: 0, w: 480, opacity: 1, dim: 0 }];
      FIGMA.forEach(function (f) {
        var ko = f.ho / 600, ki = f.hi / 600, zo = P * (1 - 1 / ko), zi = P * (1 - 1 / ki), xo = (f.xo - 720) / ko, xi = (f.xi - 720) / ki;
        right.push({ tx: (xo + xi) / 2, tz: (zo + zi) / 2, ry: Math.atan2(-(zo - zi), xo - xi) * 180 / Math.PI, w: Math.hypot(xo - xi, zo - zi), opacity: f.opacity, dim: f.dim });
      });
      right.push(Object.assign({}, right[3], { tx: right[3].tx + 90, opacity: 0, dim: 0.6 }));   // plek 4: schuift van de rand en verdwijnt
      right.forEach(function (slot, i) { slot.tx += i * GAP; });
      var CYL = {};
      Object.keys(right[0]).forEach(function (key) {
        var odd = key === 'tx' || key === 'ry';
        CYL[key] = [4, 3, 2, 1].map(function (i) { return odd ? -right[i][key] : right[i][key]; }).concat(right.map(function (r) { return r[key]; }));
      });
      // Catmull-Rom door de plekwaarden op een gebroken plek d (-4..4); daarbuiten de rand
      function cr(v, d) {
        var x = Math.max(0, Math.min(8, d + 4)), i = Math.min(7, Math.floor(x)), u = x - i;
        var p0 = v[Math.max(0, i - 1)], p1 = v[i], p2 = v[i + 1], p3 = v[Math.min(8, i + 2)];
        return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
      }
      // ---- TIJDELIJK (BORING kiest een slider, 2026-11-26): ?lineup=<variant> op staging toont een andere beweging met een keuzebalk
      // rechtsonder (toetsen 1-7). Zonder ?lineup= blijft het de cilinder. Haal dit weg zodra er gekozen is. ----
      var clampV = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
      var cyl = function (d) { return { tx: cr(CYL.tx, d), ty: 0, tz: cr(CYL.tz, d), ry: cr(CYL.ry, d), rz: 0, w: cr(CYL.w, d), opacity: cr(CYL.opacity, d), dim: cr(CYL.dim, d) }; };
      var VARIANTS = {
        cilinder: { name: 'Cilinder (nu live)', at: cyl },
        binnenkant: { name: 'Cilinder binnenkant (hol, andersom gedraaid)', at: function (d) {
          var c = cyl(d), a = Math.min(Math.abs(d), 3.2);
          return Object.assign(c, { tz: 140 * Math.pow(a, 1.1), tx: c.tx * 0.95, ry: -c.ry * 0.85, dim: c.dim * 0.8 }); } },
        coverflow: { name: 'Coverflow', at: function (d) {
          var a = Math.abs(d), s = d < 0 ? -1 : 1, near = clampV(a, 0, 1);
          return { tx: s * (near * 430 + Math.max(0, a - 1) * 150), ty: 0, tz: -near * 260 - Math.max(0, a - 1) * 40, ry: -s * near * 62, rz: 0, w: 480,
            opacity: clampV(4.3 - a, 0, 1), dim: clampV(near * 0.25 + Math.max(0, a - 1) * 0.12, 0, 0.7) }; } },
        vlak: { name: 'Vlakke rij (kleiner naar de zijkant)', at: function (d) {
          var a = Math.abs(d), s = d < 0 ? -1 : 1;
          return { tx: s * (a * 470 - Math.max(0, a - 1) * 80), ty: 0, tz: -Math.min(a, 1) * 520 - Math.max(0, a - 1) * 200, ry: 0, rz: 0, w: 480,
            opacity: clampV(4 - a, 0, 1), dim: clampV(a * 0.25, 0, 0.7) }; } },
        golf: { name: 'Golf', at: function (d) {
          var a = Math.abs(d), s = d < 0 ? -1 : 1;
          return { tx: d * 400, ty: Math.sin(d * 1.1) * 70 + a * 30, tz: -a * 330, ry: 0, rz: d * 4, w: 480,
            opacity: clampV(4.2 - a, 0, 1), dim: clampV(a * 0.2, 0, 0.6) }; } },
        stapel: { name: 'Stapel (kaarten op elkaar)', at: function (d) {
          if (d < 0) { var o = clampV(-d, 0, 1); return { tx: -o * 900, ty: o * 40, tz: 0, ry: 0, rz: -o * 14, w: 480, opacity: 1 - clampV(-d * 1.2, 0, 1), dim: 0 }; }
          return { tx: d * 70, ty: -d * 18, tz: -d * 160, ry: 0, rz: d * 3, w: 480, opacity: clampV(4.5 - d, 0, 1), dim: clampV(d * 0.18, 0, 0.7) }; } },
        spiraal: { name: 'Draaiende schijf (zijkanten zakken weg)', at: function (d) {
          var ang = clampV(d, -3.5, 3.5) * 24 * Math.PI / 180, R = 1500;
          return { tx: Math.sin(ang) * R * 0.75, ty: (1 - Math.cos(ang)) * R * 0.55, tz: -(1 - Math.cos(ang)) * 300, ry: 0, rz: ang * 180 / Math.PI * 0.9, w: 480,
            opacity: clampV(4 - Math.abs(d), 0, 1), dim: clampV(Math.abs(d) * 0.15, 0, 0.6) }; } }
      };
      var variantKey = new URLSearchParams(location.search).get('lineup') || 'cilinder', showBar = new URLSearchParams(location.search).has('lineup');
      if (!VARIANTS[variantKey]) variantKey = 'cilinder';
      var VAR = VARIANTS[variantKey];
      if (showBar) (function () {   // keuzebalk rechtsonder
        var bar = document.createElement('div');
        bar.setAttribute('style', 'position:fixed;z-index:99999;right:16px;bottom:16px;display:flex;flex-wrap:wrap;gap:6px;max-width:560px;justify-content:flex-end;font:600 12px/1 system-ui,sans-serif');
        Object.keys(VARIANTS).forEach(function (key, i) {
          var b = document.createElement('a');
          b.textContent = (i + 1) + ' ' + VARIANTS[key].name;
          var u = new URL(location.href); u.searchParams.set('lineup', key); u.hash = 'lineup';
          b.href = u.toString();
          b.setAttribute('style', 'padding:8px 10px;border-radius:99px;text-decoration:none;' + (key === variantKey ? 'background:#f4eae1;color:#0c0c0c' : 'background:rgba(12,12,12,.75);color:#f4eae1'));
          bar.appendChild(b);
        });
        document.body.appendChild(bar);
        document.addEventListener('keydown', function (e) {
          var n = parseInt(e.key, 10), keys = Object.keys(VARIANTS);
          if (n >= 1 && n <= keys.length && !e.metaKey && !e.ctrlKey && !(e.target.closest && e.target.closest('input,textarea'))) location.href = bar.children[n - 1].href;
        });
      })();
      var s1 = VAR.at(1);
      var s1 = VAR.at(1);
      var stepTrack = Math.max(260, Math.abs(s1.tx) * P / (P - s1.tz));   // baan-px van het midden tot plek 1 (minimaal 260, anders slepen te gevoelig)

      // ---- ring: de kaarten van de gekozen dag, herhaald tot minstens 10 (kopieën zijn verborgen voor schermlezers) ----
      var ring = [], cards = [], pos = 0, lastPos = NaN, active = -1, tween = null, target = 0, settled = true, k = 1;
      var wrap = function (d, n) { return ((d % n) + n + n / 2) % n - n / 2; };
      var stepPx = function () { return stepTrack * k; };
      var proxy = document.createElement('div');
      var cur = function () { return -gsap.getProperty(proxy, 'x') / stepPx(); };
      function build(day) {
        cards.forEach(function (c) { if (c.hasAttribute('data-bgf-lineup-clone')) c.remove(); });
        var pick = artists.filter(function (a) { return day === 'all' || a.day === day; });
        artists.forEach(function (a) { a.node.hidden = pick.indexOf(a) < 0; if (a.node.hidden) a.node.removeAttribute('data-bgf-slot'); });
        ring = []; cards = [];
        while (ring.length < 10) pick.forEach(function (a) { ring.push(a); });
        ring.forEach(function (a, slot) {
          var card = cards.indexOf(a.node) < 0 ? a.node : a.node.cloneNode(true);
          if (card !== a.node) { card.setAttribute('data-bgf-lineup-clone', ''); list.appendChild(card); }
          card.setAttribute('data-bgf-slot', slot);
          var face = card.querySelector('.lineup_card') || card;
          face.setAttribute('role', 'button');
          face.setAttribute('tabindex', '-1');
          face.setAttribute('aria-label', a.name + (a.tag ? ' (' + a.tag + ')' : '') + (a.genre ? ', ' + a.genre : ''));
          var img = card.querySelector('img');
          if (img) { img.setAttribute('draggable', 'false'); img.loading = 'eager'; if (img.decode) img.decode().catch(function () {}); }
          cards.push(card);
        });
        setPos(0); target = 0; active = -1; lastPos = NaN; settle();
      }
      function setPos(p) { pos = p; gsap.set(proxy, { x: -p * stepPx() }); if (drag) drag.update(); }
      function render(force) {
        if (!force && Math.abs(pos - lastPos) < 1e-4) return;
        lastPos = pos;
        var n = cards.length;
        cards.forEach(function (c, i) {
          var d = wrap(i - pos, n), a = Math.abs(d), S = VAR.at(d), op = Math.max(0, Math.min(1, S.opacity)), st = c.style;
          st.visibility = op <= 0 ? 'hidden' : '';
          if (op <= 0) return;
          st.transform = 'translate3d(' + S.tx + 'px, ' + S.ty + 'px, ' + S.tz + 'px) rotateY(' + S.ry + 'deg)' + (S.rz ? ' rotateZ(' + S.rz + 'deg)' : '');
          st.opacity = op;
          st.clipPath = 'inset(0 ' + Math.max(0, 480 - S.w) / 2 + 'px round 16px)';
          st.zIndex = 100 - Math.round(a * 10);
          st.setProperty('--bgf-dim', Math.max(0, Math.min(1, S.dim)).toFixed(3));
          // de foto schuift binnen de kaart iets tegen de draairichting in (individuele translate: de hover-schaal blijft transform)
          if (!reduce.matches) st.setProperty('--bgf-shift', (Math.max(-3, Math.min(3, d)) * -2).toFixed(2) + '%');
        });
        var slot = ((Math.round(pos) % n) + n) % n, now = ring[slot];
        if (now !== active && counter) {
          active = now;
          var uniq = ring.filter(function (x, i) { return ring.indexOf(x) === i; });
          var pad = function (v) { return (v < 10 ? '0' : '') + v; };
          counter.innerHTML = '<b>' + pad(uniq.indexOf(now) + 1) + '</b> <span>/ ' + pad(uniq.length) + '</span>';
        }
      }
      // de getekende stand loopt zacht achter de echte aan (gedempt, zoals smooothy); de naam komt zodra de doelkaart bijna in het midden staat
      var pressed = false;
      gsap.ticker.add(function (time, deltaMs) {
        var c = cur(), dt = Math.min(deltaMs, 50) / 1000;
        pos = reduce.matches ? c : pos + (c - pos) * (1 - Math.exp(-dt * 14));
        if (Math.abs(c - pos) < 1e-4) pos = c;
        render();
        if (!settled && !pressed && Math.abs(pos - target) < 0.35) nameIn(target);
      });

      // ---- naam in het creme blok: tekens komen omhoog (SplitText), blok schuift open ----
      var split = null, nameTl = null, shown = null;
      function nameOut() {
        if (!shown) return; shown = null;
        if (nameTl) nameTl.kill();
        nameTl = gsap.to(info, { opacity: 0, y: reduce.matches ? 0 : 8, duration: 0.2, ease: 'power2.in' });
      }
      function nameIn(at) {
        var n = cards.length, p = at === undefined ? Math.round(pos) : at, a = ring[((p % n) + n) % n];
        if (shown === a && gsap.getProperty(info, 'opacity') === 1) return;
        shown = a;
        if (split) { split.revert(); split = null; }
        infoName.textContent = a.name; infoTag.textContent = a.tag ? '(' + a.tag + ')' : ''; infoGenre.textContent = a.genre;
        if (nameTl) nameTl.kill();
        if (reduce.matches) { nameTl = gsap.fromTo(info, { opacity: 0 }, { opacity: 1, y: 0, duration: 0.3 }); return; }
        split = window.SplitText.create(infoName, { type: 'words,chars', mask: 'chars' });   // words: een lange naam breekt tussen woorden, niet midden in een woord
        nameTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
          .set(info, { opacity: 1, y: 0 })
          .fromTo(infoBox, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'expo.out' })
          .fromTo(split.chars, { yPercent: 105 }, { yPercent: 0, duration: 0.5, stagger: 0.012 }, 0.05)
          .fromTo([infoTag, infoGenre], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 }, 0.15);
      }
      function settle() {
        settled = true; tween = null; target = Math.round(cur());
        var n = cards.length, slot = ((target % n) + n) % n, hadFocus = false;
        cards.forEach(function (c, i) {
          var face = c.querySelector('.lineup_card') || c;
          if (face === document.activeElement) hadFocus = true;
          face.setAttribute('tabindex', i === slot ? '0' : '-1');
          c.toggleAttribute('data-bgf-active', i === slot);
          // kopieën zijn onzichtbaar voor schermlezers, behalve als ze in het midden staan
          if (c.hasAttribute('data-bgf-lineup-clone')) c.setAttribute('aria-hidden', String(i !== slot));
        });
        var face = cards[slot].querySelector('.lineup_card') || cards[slot];
        if (hadFocus) face.focus({ preventScroll: true });   // toetsenbord blijft op de kaart in het midden
        var a = ring[slot], uniq = ring.filter(function (x, i) { return ring.indexOf(x) === i; });
        live.textContent = a.name + ', ' + (uniq.indexOf(a) + 1) + ' van ' + uniq.length;
        render(true); nameIn(target);
      }
      function goTo(t) {
        target = t; settled = false; nameOut();
        if (tween) tween.kill();
        if (reduce.matches) { setPos(t); settle(); return; }
        tween = gsap.to(proxy, { x: -t * stepPx(), duration: 0.8, ease: 'expo.out', onComplete: function () { drag.update(); settle(); } });
      }
      function step(dir) { goTo((settled ? Math.round(cur()) : target) + dir); }
      function goToSlot(slot) { var p = Math.round(cur()); goTo(p + wrap(slot - p, cards.length)); }

      var drag = window.Draggable.create(proxy, {
        trigger: list, type: 'x', inertia: !reduce.matches, dragClickables: true, minimumMovement: 6, allowContextMenu: true,
        snap: { x: function (v) { return Math.round(v / stepPx()) * stepPx(); } },
        onPress: function () { pressed = true; if (tween) tween.kill(); tween = null; },
        onRelease: function () { pressed = false; },
        onDragStart: function () { settled = false; nameOut(); },
        onThrowUpdate: function () { if (this.tween) target = Math.round(-this.endX / stepPx()); },
        onDragEnd: function () { if (reduce.matches) { setPos(Math.round(cur())); settle(); } },
        onThrowComplete: settle,
        onClick: function (e) {
          var c = e.target.closest && e.target.closest('[data-bgf-slot]');
          if (c && !c.hasAttribute('data-bgf-active')) goToSlot(+c.getAttribute('data-bgf-slot'));
        }
      })[0];

      var prev = section.querySelector('[data-bgf-lineup-prev]'), next = section.querySelector('[data-bgf-lineup-next]');
      if (prev) prev.addEventListener('click', function () { step(-1); });
      if (next) next.addEventListener('click', function () { step(1); });
      slider.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        else if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-bgf-slot]') && !e.target.closest('[data-bgf-active]')) {
          e.preventDefault(); goToSlot(+e.target.closest('[data-bgf-slot]').getAttribute('data-bgf-slot'));
        }
      });

      /* dagknoppen, zoals de Kennis-tabs van Afix (data-a-tabs): een creme pil (.bgf-day-pill, site.js maakt hem) schuift naar de
         gekozen dag; de kaarten gaan na elkaar weg naar de kant tegengesteld aan de pil (pil naar rechts = kaarten naar links) en de
         nieuwe komen na elkaar binnen van de kant waar de pil heen gaat. De kaart beweegt met --bgf-out-x (losse translate in site.css,
         want render() zet de transform van elk item) en .lineup_card krijgt de opacity (die van het item zet render() ook). */
      var bar = days.length ? days[0].parentNode : null, pill = null;
      if (bar) {
        pill = document.createElement('span');
        pill.className = 'bgf-day-pill';
        pill.setAttribute('aria-hidden', 'true');
        bar.insertBefore(pill, bar.firstChild);
        bar.setAttribute('data-bgf-day-pill', '');
      }
      function movePill(animate) {
        var on = days.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
        if (!pill || !on) return;
        var to = { x: on.offsetLeft, y: on.offsetTop, width: on.offsetWidth, height: on.offsetHeight };
        if (animate && !reduce.matches) gsap.to(pill, Object.assign({ duration: 0.45, ease: 'power3.out', overwrite: true }, to));
        else gsap.set(pill, Object.assign({ overwrite: true }, to));
      }
      // zichtbare kaarten van links naar rechts op het scherm
      function visibleCards() {
        return cards.filter(function (c) { return c.style.visibility !== 'hidden'; }).map(function (c) {
          return { item: c, face: c.querySelector('.lineup_card') || c, x: c.getBoundingClientRect().left };
        }).sort(function (a, b) { return a.x - b.x; });
      }
      var swap = null;
      function swapTo(day, dir) {
        if (swap) swap.kill();
        gsap.set(cards, { '--bgf-out-x': '0px' });
        gsap.set(cards.map(function (c) { return c.querySelector('.lineup_card') || c; }), { opacity: 1 });
        nameOut();
        var r = parseFloat(getComputedStyle(document.documentElement).fontSize) / k;   // rem in baan-px (de baan schaalt met --k)
        var lead = function (set) { return dir > 0 ? set : set.slice().reverse(); };   // de kaarten aan de kant waar het heen gaat eerst
        var out = lead(visibleCards()), slow = reduce.matches;
        swap = gsap.timeline({ onComplete: function () { swap = null; } })
          .to(out.map(function (o) { return o.face; }), { opacity: 0, duration: slow ? 0.15 : 0.2, stagger: slow ? 0 : 0.03, ease: 'power2.in' }, 0)
          .to(out.map(function (o) { return o.item; }), { '--bgf-out-x': (slow ? 0 : -dir * 6 * r) + 'px', duration: 0.2, stagger: slow ? 0 : 0.03, ease: 'power2.in' }, 0)
          .add(function () {
            gsap.set(cards, { '--bgf-out-x': '0px' });
            build(day);
            var inn = lead(visibleCards());
            gsap.set(inn.map(function (o) { return o.face; }), { opacity: 0 });
            swap.fromTo(inn.map(function (o) { return o.item; }), { '--bgf-out-x': (slow ? 0 : dir * 8 * r) + 'px' }, { '--bgf-out-x': '0px', duration: 0.5, stagger: slow ? 0 : 0.08, ease: 'power3.out' }, '>')
              .to(inn.map(function (o) { return o.face; }), { opacity: 1, duration: slow ? 0.15 : 0.5, stagger: slow ? 0 : 0.08, ease: 'power3.out' }, '<');
          });
      }
      days.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button === days[0]));
        button.addEventListener('click', function () {
          var was = days.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
          if (button === was) return;
          days.forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
          movePill(true);
          swapTo(button.getAttribute('data-bgf-lineup-day'), days.indexOf(button) < days.indexOf(was) ? -1 : 1);
        });
      });
      movePill(false);

      // schaal: 1:1 op 1440, breder = de Figma-baan over de hele breedte; telefoons houden de middelste kaart op schermbreedte - 90
      function fit() {
        var vw = document.documentElement.clientWidth, p = cur();
        k = vw > 1440 ? vw / 1440 : Math.max(vw / 1440, Math.min(1, (vw - 90) / 480));
        if (!(k > 0)) k = 1;   // verborgen frame zonder breedte: geen deling door 0
        section.style.setProperty('--k', k);
        if (info) info.style.maxWidth = (vw / 2 + 216 * k - 16) + 'px';   // het blok begint 216 baan-px links van het midden
        setPos(p); render(true); movePill(false);
      }
      window.addEventListener('resize', fit);
      fit();
      document.fonts.ready.then(function () {   // SplitText meet met het echte lettertype
        build('all'); movePill(false);
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();   // de sectie is nu anders hoog (pin van de hero)
      });
    }, ['Draggable', 'InertiaPlugin', 'SplitText']);
  });

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

  /* data-bgf-curve (Section - Marquee): de band hangt als slinger door (BORING 2026-11-26, naar de marquee onder de hero van
     two26.studio). De sectie wordt geknipt tot een dikke gebogen band (clip-path: path(), opnieuw bij resize), de tekst loopt over
     dezelfde lijn in een SVG-textPath. De gewone rij (data-bgf-marquee) blijft voor schermlezers (.bgf-sr) en levert tekst, lettertype
     en tussenruimte. data-bgf-marquee laat de tekst lopen met section.bgfCurve.offset(pos); bij reduced motion staat hij stil. */
  each('[data-bgf-curve]', function (section) {
    var track = section.querySelector('[data-bgf-marquee]');
    var group = track && track.querySelector('[data-bgf-marquee-item]');
    if (!group) return;
    var NS = 'http://www.w3.org/2000/svg', id = 'bgf-curve-path-' + (document.querySelectorAll('.bgf-curve').length + 1);
    var parts = [].map.call(group.children, function (c) { return c.textContent.trim(); }).filter(Boolean);
    var svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
    var text = document.createElementNS(NS, 'text'), tp = document.createElementNS(NS, 'textPath');
    svg.setAttribute('class', 'bgf-curve');
    svg.setAttribute('aria-hidden', 'true');
    path.id = id;
    path.setAttribute('fill', 'none');
    tp.setAttribute('href', '#' + id);
    text.setAttribute('dominant-baseline', 'central');
    text.appendChild(tp); svg.appendChild(path); svg.appendChild(text);
    section.appendChild(svg);
    var cs = getComputedStyle(group), groupLen = 0, pos = 0;
    track.classList.add('bgf-sr');
    function fill(reps) {
      tp.textContent = '';
      var gap = parseFloat(cs.columnGap) || 0;
      for (var r = 0; r < reps; r++) parts.forEach(function (t) {
        var span = document.createElementNS(NS, 'tspan');
        span.setAttribute('dx', gap);
        span.textContent = t;
        tp.appendChild(span);
      });
    }
    function build() {
      ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform'].forEach(function (k) { text.style[k] = cs[k]; });
      text.setAttribute('fill', cs.color);
      var fs = parseFloat(cs.fontSize), W = section.clientWidth;
      var T = fs * 2.9;                         // dikte van de band (zoals de rechte band: 120px bij 41px tekst)
      var sag = Math.max(T * 0.7, W * 0.08);    // zo ver hangt het midden door
      var y0 = T * 0.62, H = y0 + sag + T * 0.62;
      section.style.height = H + 'px';
      var c = y0 + sag * 4 / 3;
      path.setAttribute('d', 'M' + (-0.06 * W) + ',' + y0 + ' C' + (0.28 * W) + ',' + c + ' ' + (0.72 * W) + ',' + c + ' ' + (1.06 * W) + ',' + y0);
      // band = de lijn met dikte T: punten links en rechts van de lijn (loodrecht), heen langs de bovenrand en terug langs de onderrand
      var len = path.getTotalLength(), n = 64, top = [], bottom = [];
      for (var i = 0; i <= n; i++) {
        var l = len * i / n, p = path.getPointAtLength(l), q = path.getPointAtLength(Math.min(len, l + 1)), o = path.getPointAtLength(Math.max(0, l - 1));
        var dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * T / 2, ny = dx / d * T / 2;
        top.push((p.x + nx).toFixed(1) + ',' + (p.y + ny).toFixed(1));
        bottom.unshift((p.x - nx).toFixed(1) + ',' + (p.y - ny).toFixed(1));
      }
      section.style.clipPath = "path('M" + top.concat(bottom).join(' L') + " Z')";
      fill(1);
      groupLen = text.getComputedTextLength() || 1;
      fill(Math.ceil(len / groupLen) + 2);
      section.bgfCurve.offset(pos);
    }
    section.bgfCurve = {
      offset: function (p) { pos = p; tp.setAttribute('startOffset', (-(p + 1) * groupLen).toFixed(1)); },
      get groupLen() { return groupLen; }
    };
    build();
    document.fonts.ready.then(build);
    var raf = 0;
    window.addEventListener('resize', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(build); });
  });

  /* data-bgf-marquee (Section - Marquee, 2027): eindeloze rij die per frame soepel bijgestuurd wordt: snel scrollen geeft vaart,
     omhoog scrollen draait de richting om, daarna zakt hij rustig terug naar zijn tempo. De glasstroken van het verloop eronder
     (data-bgf-gradient op de sectie) schuiven dezelfde kant op maar trager (35%): parallax. Reduced motion: stil. */
  if (document.querySelector('[data-bgf-marquee]') && !reduce.matches) withGsap(function (gsap) {
    each('[data-bgf-marquee]', function (track) {
      var items = track.querySelectorAll('[data-bgf-marquee-item]');
      if (!items.length) return;
      var band = track.closest('[data-bgf-gradient]') || track;
      var period = 40; // seconden per groep bij rust
      var pos = 0, speed = 1, dir = 1, boost = 0, shift = 0, lastY = window.scrollY, visible = true, itemW = 0, canvasW = 0;
      var curve = band.bgfCurve || null;   // gebogen band (data-bgf-curve): de tekst loopt over de lijn in plaats van de rij te schuiven
      var measure = function () { var c = band.querySelector('canvas.bgf-gradient'); itemW = curve ? curve.groupLen : items[0].offsetWidth; canvasW = c ? c.clientWidth : 0; };
      measure(); window.addEventListener('resize', measure);
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(track);
      gsap.ticker.add(function (time, deltaMs) {
        var dt = Math.min(deltaMs, 100) / 1000;
        var y = window.scrollY, dy = y - lastY;
        lastY = y;
        if (dy) dir = dy > 0 ? 1 : -1;
        boost += (Math.min(Math.abs(dy) / Math.max(dt, 0.004) / 400, 4) - boost) * (1 - Math.exp(-dt * 3));
        speed += (dir * (1 + boost) - speed) * (1 - Math.exp(-dt * 4));
        if (!visible) return;
        var step = speed * dt / period;
        pos = ((pos + step) % 1 + 1) % 1;
        if (curve) curve.offset(pos); else gsap.set(items, { xPercent: -pos * 100, force3D: true });
        var g = band.bgfGradient;
        if (g && !canvasW) measure();   // de canvas komt pas na het laden van gradient.js
        if (g && canvasW) {
          var strips = (g.state.stripsMin + g.state.stripsMax) / 2;
          shift += step * (curve ? curve.groupLen : itemW) * 0.35 / (canvasW / strips);
          g.setStripShift(shift);
        }
      });
    });
  });

  /* Marquee (Zongenoten, 2025): .marquee-slide, eindeloze rij; scrollen versnelt hem en draait de richting om.
     Bij reduced motion staat hij stil. */
  var marqueeItems = '.marquee-slide';
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

  /* data-bgf-tabs (Section - FAQ): knoppen [data-bgf-tab="naam"] tonen het paneel [data-bgf-tab-panel="naam"]; ARIA-tabs met
     pijltjestoetsen, Home en End; de lijst animeert uit en in bij wisselen. Begint op ?faq=<naam> (tickets, vervoer, info, safe, zoals de oude FAQ), anders op de eerste tab.
     Zonder JS staan alle panelen onder elkaar. */
  each('[data-bgf-tabs]', function (root, n) {
    var tabs = [].slice.call(root.querySelectorAll('[data-bgf-tab]'));
    var panels = [].slice.call(root.querySelectorAll('[data-bgf-tab-panel]'));
    if (!tabs.length) return;
    tabs[0].parentNode.setAttribute('role', 'tablist');
    var panelFor = function (tab) {
      return panels.filter(function (p) { return p.getAttribute('data-bgf-tab-panel') === tab.getAttribute('data-bgf-tab'); })[0];
    };
    tabs.forEach(function (tab, i) {
      var panel = panelFor(tab);
      tab.id = 'bgf-tab-' + n + '-' + i;
      tab.setAttribute('role', 'tab');
      if (!panel) return;
      panel.id = 'bgf-tabpanel-' + n + '-' + i;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      tab.setAttribute('aria-controls', panel.id);
    });
    // Wisselen: de rijen van de oude lijst gaan omhoog weg, die van de nieuwe komen van onder in beeld (GSAP; zonder GSAP of
    // bij reduced motion direct). Een nieuwe klik midden in de wissel maakt de vorige eerst af.
    var current = null, switching = null;
    var rows = function (panel) {
      var r = panel.querySelectorAll('[role="listitem"]');
      return r.length ? r : [panel];
    };
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      if (switching) switching.progress(1).kill();
      var prev = current, next = panelFor(tab);
      current = next;
      var gsap = window.gsap;
      if (!gsap || reduce.matches || !prev || !next || prev === next) {
        panels.forEach(function (p) { p.hidden = p !== next; });
        return;
      }
      switching = gsap.timeline({ onComplete: function () { switching = null; } })
        .to(rows(prev), { opacity: 0, y: '-0.75rem', duration: 0.2, ease: 'power2.in', stagger: 0.02 })
        .add(function () {
          prev.hidden = true;
          gsap.set(rows(prev), { clearProps: 'opacity,transform' });
          next.hidden = false;
        })
        .fromTo(rows(next), { opacity: 0, y: '1rem' },
          { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.04, clearProps: 'opacity,transform' });
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { if (tab.getAttribute('aria-selected') !== 'true') select(tab); });
      tab.addEventListener('keydown', function (e) {
        var to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select(tabs[(to + tabs.length) % tabs.length], true);
      });
    });
    var requested = new URLSearchParams(window.location.search).get('faq');
    select(tabs.filter(function (t) { return t.getAttribute('data-bgf-tab') === requested; })[0] || tabs[0]);
  });

  /* data-bgf-accordion (de lijst) met data-bgf-accordion-item > data-bgf-accordion-trigger (button) + data-bgf-accordion-panel:
     één vraag tegelijk open, de eerste staat open. Het in- en uitklappen is css (site.css); zonder JS staat alles open. */
  each('[data-bgf-accordion]', function (list, n) {
    var items = [].slice.call(list.querySelectorAll('[data-bgf-accordion-item]'));
    var parts = items.map(function (item, i) {
      var trigger = item.querySelector('[data-bgf-accordion-trigger]');
      var panel = item.querySelector('[data-bgf-accordion-panel]');
      if (!trigger || !panel) return null;
      // antwoord = de vraag (huisregels bij Celebrate safe): een uitspraak, geen knop en geen plusje (data-bgf-statement, site.css)
      var norm = function (el) { return el.textContent.replace(/\s+/g, ' ').trim().toLowerCase(); };
      if (norm(panel) === norm(trigger)) {
        item.setAttribute('data-bgf-statement', '');
        trigger.disabled = true;
        trigger.removeAttribute('aria-expanded');
        panel.hidden = true;
        return null;
      }
      panel.id = 'bgf-accordion-' + n + '-' + i;
      trigger.setAttribute('aria-controls', panel.id);
      return { trigger: trigger, panel: panel };
    }).filter(Boolean);
    var open = function (part) {
      parts.forEach(function (p) {
        var on = p === part && p.trigger.getAttribute('aria-expanded') !== 'true';
        p.trigger.setAttribute('aria-expanded', on);
        p.panel.setAttribute('aria-hidden', !on);
      });
    };
    parts.forEach(function (p) { p.trigger.addEventListener('click', function () { open(p); }); });
    if (parts.length) open(parts[0]);
    list.setAttribute('data-bgf-ready', '');
    // pas na de eerste paint animeren, anders klappen alle antwoorden zichtbaar dicht bij het laden
    requestAnimationFrame(function () { requestAnimationFrame(function () { list.setAttribute('data-bgf-animate', ''); }); });
  });

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
     [data-bgf-cursor-label="tekst"]: hover-stand met de tekst naast de ovalen (Section - Video: "Geluid aan" / "Geluid uit"; de
     module van het element mag de tekst wisselen, de cursor leest hem bij elke beweging en klik opnieuw).
     [data-bgf-cursor-icon]: de ovalen vormen een teken, ook bij elke beweging en klik opnieuw gelezen (Section - Video):
     "mute" = dunne ovalen 45 graden gedraaid tot een kruis (geluid uit), "sound" = twee staande ovalen naast elkaar die op en neer
     gaan als een equalizer (geluid aan).
     De css staat in site.css (.bgf-cursor, .bgf-cursor-label). */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (document.querySelector('[data-bgf-cursor]') && fine.matches && !reduce.matches) withGsap(function (gsap) {
    // [breedte, hoogte] van het liggende ovaal; het staande ovaal is gespiegeld, behalve bij slepen
    var sizes = { base: [26, 14, 14, 26], hover: [40, 18, 18, 40], press: [20, 10, 10, 20], drag: [80, 24, 24, 40],
      mute: [30, 7, 7, 30], sound: [9, 26, 9, 26] };
    // per stand: draaiing en zijwaartse verschuiving (px) van het liggende en het staande ovaal; overal elders 0
    var poses = { mute: { rotation: 45, left: [0, 0] }, sound: { rotation: 0, left: [-6, 6] } };
    var ovals = ['is-horizontal', 'is-vertical'].map(function (mod) {
      var o = document.createElement('span');
      o.className = 'bgf-cursor ' + mod;
      o.setAttribute('aria-hidden', 'true');
      document.body.appendChild(o);
      gsap.set(o, { xPercent: -50, yPercent: -50, opacity: 0 });
      return o;
    });
    var label = document.createElement('span');
    label.className = 'bgf-cursor-label';
    label.setAttribute('aria-hidden', 'true');
    document.body.appendChild(label);
    gsap.set(label, { opacity: 0 });
    ovals.push(label);   // beweegt en verdwijnt mee met de ovalen; zijn plek naast de ovalen staat in site.css
    document.documentElement.classList.add('bgf-cursor-on');
    // direct op de muis, zonder naloop
    var labelled = null;
    function setLabel() {
      var text = labelled ? labelled.getAttribute('data-bgf-cursor-label') : '';
      icon = labelled && labelled.getAttribute('data-bgf-cursor-icon') || '';
      if (label.textContent !== text) label.textContent = text;
      label.style.visibility = text ? '' : 'hidden';
    }
    var moveX = ovals.map(function (o) { return gsap.quickSetter(o, 'x', 'px'); });
    var moveY = ovals.map(function (o) { return gsap.quickSetter(o, 'y', 'px'); });
    var current = '', hovering = false, pressed = false, dragging = false, icon = '', bounce = null;
    function setState() {
      var next = dragging ? 'drag' : pressed && !icon ? 'press' : icon || (hovering ? 'hover' : 'base');
      if (next === current) return;
      current = next;
      var d = sizes[next], pose = poses[next] || { rotation: 0, left: [0, 0] };
      [0, 1].forEach(function (i) {
        gsap.to(ovals[i], { width: d[i * 2], height: d[i * 2 + 1], rotation: pose.rotation, left: pose.left[i], duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
      });
      // equalizer: de twee staande ovalen gaan om de beurt op en neer zolang het geluid aan staat
      if (bounce) { bounce.kill(); bounce = null; gsap.to(ovals.slice(0, 2), { scaleY: 1, duration: 0.2 }); }
      if (next === 'sound') bounce = gsap.timeline({ repeat: -1 })
        .to(ovals[0], { scaleY: 0.45, duration: 0.32, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
        .to(ovals[1], { scaleY: 0.45, duration: 0.24, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0.08);
    }
    setState();
    var hoverSel = 'a, button, [role="button"], input[type="submit"], label, select, [data-bgf-cursor-hover]';
    document.addEventListener('mousemove', function (e) {
      moveX.forEach(function (f) { f(e.clientX); });
      moveY.forEach(function (f) { f(e.clientY); });
      gsap.to(ovals, { opacity: 1, duration: 0.2, overwrite: 'auto' });
      lastX = e.clientX; lastY = e.clientY;
      under(e.target instanceof Element ? e.target : null);
    });
    // bij scrollen zonder muisbeweging schuift er iets anders onder de cursor: opnieuw kijken wat er onder de muis ligt
    var lastX = -1, lastY = -1;
    window.addEventListener('scroll', function () { if (lastX >= 0) under(document.elementFromPoint(lastX, lastY)); }, { passive: true });
    function under(t) {
      labelled = t && t.closest('[data-bgf-cursor-label]');
      hovering = !!(t && (labelled || t.closest(hoverSel)));
      setLabel();
      setState();
    }
    document.addEventListener('mousedown', function (e) {
      pressed = true;
      dragging = !!(e.target instanceof Element && e.target.closest('[data-bgf-cursor-drag]'));
      setState();
    });
    document.addEventListener('mouseup', function () { pressed = false; dragging = false; setState(); setTimeout(function () { setLabel(); setState(); }); });   // na de klik: nieuwe tekst en teken
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
    // Gekeken wordt naar wat er echt onder de knop zichtbaar is (de hero kan vastgepind onder de galerij liggen)
    var ticking = false;
    function checkDark() {
      ticking = false;
      var x = window.innerWidth - 80, y = 38; // bij de Tickets-knop: midden van de knoppenbalk (1rem boven + 2.75rem hoog)
      var under = document.elementsFromPoint(x, y).filter(function (el) { return !el.closest('[data-bgf-nav], .transition'); })[0];
      nav.toggleAttribute('data-bgf-nav-on-dark', !!(under && under.closest('[data-bgf-nav-dark]')));
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
