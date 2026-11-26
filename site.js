/* Bontgenoten Festival site.js v1.12.0: attribuutmodules. Bron: site.js in WEAREBORING/bontgenoten-festival. Elke module start alleen als zijn attribuut of class op de pagina staat. */
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
     Andersom bij Button "Creme hover-rand": daar zijn de lijnen in rust vol (ze vormen de achtergrond) en zakken ze bij hover weg,
     zodat de knop doorzichtig wordt met alleen de rand. */
  if (document.querySelector('.button_background-line, [data-bgf-fill-line]')) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
    var hosts = [].slice.call(document.querySelectorAll('.button_wrapper'));
    each('[data-bgf-fill-line]', function (line) {
      var host = line.parentNode.parentNode;
      if (hosts.indexOf(host) < 0) hosts.push(host);
    });
    hosts.forEach(function (button) {
      var lines = button.querySelectorAll('.button_background-line, [data-bgf-fill-line]');
      if (!lines.length) return;
      var full = parseFloat(window.getComputedStyle(lines[0]).height) > 0;   // lijnen in rust vol = omgekeerde hover
      function fill(height) {
        gsap.to(lines, { height: height, duration: 0.4, ease: 'expo.out', stagger: { amount: 0.15, from: 'random' }, overwrite: true });
      }
      button.addEventListener('mouseenter', function () {
        if (desktop.matches && !reduce.matches && button.getAttribute('aria-selected') !== 'true') fill(full ? '0%' : '101%');
      });
      button.addEventListener('mouseleave', function () { fill(full ? '100%' : '0%'); });
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
      var still = el.querySelector('img');
      el.insertBefore(canvas, still ? still.nextSibling : el.firstChild);
      // smalle band (marquee): de canvas krijgt de verhouding van een scherm (16:9) en de band toont daar een strook uit, zodat het
      // verloop eruitziet als in de hero in plaats van alle kleuren in een paar centimeter; resolutie 1x is daar genoeg;
      // de muis doet daar niets (de stroken schuiven met de marquee mee, zie data-bgf-marquee)
      var band = el.clientWidth > el.clientHeight * 3;
      if (band) canvas.setAttribute('data-bgf-crop', '');
      // de hero krijgt LINE-UP een scherm lager in het glas zodra er een line-up-sectie op de pagina staat (zie data-bgf-hero)
      startGradient(el, canvas, el.getAttribute('data-bgf-gradient') || 'bgf-hero', null,
        { maxDpr: band ? 1 : 2, pointer: !band, below: el.hasAttribute('data-bgf-hero') && document.querySelector('[data-bgf-lineup]') ? 'LINE-UP' : null });
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
      var g = startGradient(el, canvas, el.getAttribute('data-bgf-gradient-text') || 'bgf-glass', function () { el.setAttribute('data-bgf-live', ''); }, { pointer: false });
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
        gsap.to(hero.querySelectorAll('[data-bgf-hero-out]'), { y: function () { return -hero.offsetHeight; }, ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: function () { return '+=' + hero.offsetHeight; }, scrub: true, invalidateOnRefresh: true } });
        // zijteksten mee weg (de hero blijft staan onder de line-up); alleen opacity, ze staan met transform in het midden
        gsap.fromTo(hero.querySelectorAll('[data-bgf-hero-fade]'), { opacity: 1 }, { opacity: 0, ease: 'none', immediateRender: false,
          scrollTrigger: { trigger: hero, start: 'top top', end: function () { return '+=' + hero.offsetHeight * 0.4; }, scrub: true } });
        var pinLength = function () { return hero.offsetHeight + (lineupSection ? lineupSection.offsetHeight : 0); };
        window.ScrollTrigger.create({ trigger: hero, start: 'top top', end: function () { return '+=' + pinLength(); },
          pin: true, pinSpacing: false, invalidateOnRefresh: true,
          onUpdate: function (self) { update(Math.min(1, self.progress * pinLength() / hero.offsetHeight)); } });
        return function () { update(0); };
      });
    });
  }, ['ScrollTrigger']);

  /* data-bgf-card (Section - Gallery): sectie-overgang van het bewegende verloop naar creme. Het creme paneel komt als scheve,
     kleinere kaart omhoog en trekt recht naar volle breedte zodra zijn bovenkant de bovenkant van het scherm bereikt; de hero
     erachter ([data-bgf-hero], vastgepind) wordt donkerder (niet kleiner). Vanaf 768px, zonder reduced motion.
     Bij het opnieuw meten (refreshInit) gaat de transform van het paneel eraf, zodat de parallax erin goed meet. */
  if (document.querySelector('[data-bgf-card]') && !reduce.matches) withGsap(function (gsap) {
    gsap.matchMedia().add('(min-width: 768px)', function () {
      var behind = document.querySelector('[data-bgf-hero]');
      var panels = [].slice.call(document.querySelectorAll('[data-bgf-card]'));
      var clear = function () { gsap.set(panels, { clearProps: 'transform' }); };
      window.ScrollTrigger.addEventListener('refreshInit', clear);
      panels.forEach(function (panel) {
        var range = { trigger: panel, start: 'top bottom', end: 'top top', scrub: true };
        gsap.fromTo(panel, { scale: 0.8, rotate: -4, transformOrigin: '50% 0%' },
          { scale: 1, rotate: 0, ease: 'none', scrollTrigger: range });
        if (behind) gsap.fromTo(behind, { filter: 'brightness(1)' }, { filter: 'brightness(0.55)', ease: 'none',
          scrollTrigger: { trigger: panel, start: 'top bottom', end: 'top top', scrub: true } });
      });
      return function () { window.ScrollTrigger.removeEventListener('refreshInit', clear); };
    });
  }, ['ScrollTrigger']);

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
      video.setAttribute('data-bgf-video-zoom', '');   // zoomt mee met de poster (data-bgf-video)
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
        var hls = new window.Hls({ maxBufferLength: 10 });
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

  /* data-bgf-video (Section - Video): de video komt binnen als afgeronde kaart met creme rand (zoals de galerij-kaart) en opent
     naar volledig beeld terwijl de bovenkant van de sectie van onder naar boven door het scherm gaat; het beeld zoomt daarbij
     iets uit. Vanaf 768px, zonder reduced motion. Kaart en beeld: [data-bgf-video-frame], [data-bgf-video-zoom]. */
  if (document.querySelector('[data-bgf-video]') && !reduce.matches) withGsap(function (gsap) {
    gsap.matchMedia().add('(min-width: 768px)', function () {
      each('[data-bgf-video]', function (section) {
        var range = { trigger: section, start: 'top bottom', end: 'top top', scrub: true };
        // radius 40px = radius/l (2.5rem), als de galerij-kaart
        gsap.fromTo(section.querySelector('[data-bgf-video-frame]'), { clipPath: 'inset(9% 6% 9% 6% round 40px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: range });
        gsap.fromTo(section.querySelectorAll('[data-bgf-video-zoom]'), { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: range });
      });
    });
  }, ['ScrollTrigger']);

  /* data-bgf-lineup (line-up, basis tot het slider-prototype gekozen is): dagfilter ([data-bgf-lineup-day] = all, zaterdag of
     zondag; de kaarten hebben data-bgf-lineup-item = de Dag uit het CMS), pijltjes schuiven één kaart, teller "01 / 12".
     De rij zelf is een gewone horizontale scroll met snap (sleep, trackpad, swipe). */
  each('[data-bgf-lineup]', function (section) {
    var list = section.querySelector('[data-bgf-lineup-slider] [role="list"], [data-bgf-lineup-slider] .w-dyn-items');
    var items = [].slice.call(section.querySelectorAll('[data-bgf-lineup-item]'));
    var days = [].slice.call(section.querySelectorAll('[data-bgf-lineup-day]'));
    var counter = section.querySelector('[data-bgf-lineup-counter]');
    var visible = function () { return items.filter(function (i) { return !i.hidden; }); };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var current = function () {
      if (!list) return 0;
      var mid = list.getBoundingClientRect().left + list.clientWidth / 2, best = 0, dist = Infinity;
      visible().forEach(function (item, i) {
        var r = item.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid);
        if (d < dist) { dist = d; best = i; }
      });
      return best;
    };
    var count = function () {
      var n = visible().length;
      if (counter) counter.textContent = n ? pad(current() + 1) + ' / ' + pad(n) : '';
    };
    var go = function (step) {
      var v = visible(), i = Math.max(0, Math.min(v.length - 1, current() + step));
      if (v[i]) v[i].scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    };
    days.forEach(function (button) {
      button.addEventListener('click', function () {
        var day = button.getAttribute('data-bgf-lineup-day');
        days.forEach(function (b) { b.setAttribute('aria-pressed', b === button); });
        items.forEach(function (item) { item.hidden = day !== 'all' && (item.getAttribute('data-bgf-lineup-item') || '').toLowerCase() !== day; });
        if (list) list.scrollLeft = 0;
        count();
      });
    });
    if (days[0]) days[0].setAttribute('aria-pressed', 'true');
    days.slice(1).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    var prev = section.querySelector('[data-bgf-lineup-prev]'), next = section.querySelector('[data-bgf-lineup-next]');
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    if (list) list.addEventListener('scroll', function () { window.requestAnimationFrame(count); }, { passive: true });
    count();
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

  /* data-bgf-marquee (Section - Marquee, 2027): eindeloze rij die per frame soepel bijgestuurd wordt: snel scrollen geeft vaart,
     omhoog scrollen draait de richting om, daarna zakt hij rustig terug naar zijn tempo. De glasstroken van het verloop eronder
     (data-bgf-gradient op de sectie) schuiven dezelfde kant op maar trager (35%): parallax. Reduced motion: stil. */
  if (document.querySelector('[data-bgf-marquee]') && !reduce.matches) withGsap(function (gsap) {
    each('[data-bgf-marquee]', function (track) {
      var items = track.querySelectorAll('[data-bgf-marquee-item]');
      if (!items.length) return;
      var band = track.closest('[data-bgf-gradient]') || track;
      var period = 40; // seconden per groep bij rust
      var pos = 0, speed = 1, dir = 1, boost = 0, shift = 0, lastY = window.scrollY, visible = true;
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
        gsap.set(items, { xPercent: -pos * 100, force3D: true });
        var g = band.bgfGradient, canvas = g && band.querySelector('canvas.bgf-gradient');
        if (canvas) {
          var strips = (g.state.stripsMin + g.state.stripsMax) / 2;
          shift += step * items[0].offsetWidth * 0.35 / (canvas.clientWidth / strips);
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
    open(parts[0]);
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
