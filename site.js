/* Bontgenoten Festival site.js v1.26.2: attribuutmodules. Bron: site.js in WEAREBORING/bontgenoten-festival. Elke module start alleen als zijn attribuut of class op de pagina staat. */
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
  /* Zachte sticky (BORING 2026-11-27): sticky.js = @alpacka/sticky 0.2.1 uit de skill jesperlandberg/alpacka@sticky (.claude/skills/sticky),
     alleen de types eruit; staat naast site.js en wordt alleen geladen waar een sticky of pin is. Zonder muis of met reduced motion
     doet hij niets (gewone sticky). */
  var stickyMod = null;
  function loadSticky() {
    if (!stickyMod) stickyMod = gradientSrc ? import(gradientSrc.replace(/gradient(\.min)?\.js/, 'sticky$1.js')) : Promise.reject(new Error('geen pad naar sticky.js'));
    return stickyMod;
  }
  // Voor een pin van ScrollTrigger (geen echte sticky): dezelfde curve als de skill ("virtual scroll"), als losse translate op el.
  // start() = scrollstand waar de pin begint, travel() = hoe lang hij duurt; landOnly: alleen het afremmen, niet het vertrek.
  // Geeft een belofte met de ScrollTrigger (om op te ruimen).
  function easePin(el, start, travel, landOnly) {
    if (!finePointer.matches) return Promise.reject(new Error('touch: gewone pin'));   // zoals de skill: op touch loopt het niet gelijk op
    return loadSticky().then(function (m) {
      var c = null, s0 = 0, clear = function () { el.style.translate = ''; };
      var write = function (self) {
        var x = self.scroll() - s0, y = c && !(landOnly && x > c.into[1]) ? c.at(x) : 0;
        el.style.translate = Math.abs(y) < 0.05 ? '' : '0 ' + y.toFixed(2) + 'px';
      };
      window.ScrollTrigger.addEventListener('refreshInit', clear);
      var st = window.ScrollTrigger.create({ trigger: el,
        start: function () { s0 = start(); c = m.curve({ travel: travel(), span: window.innerHeight * 0.4, ease: 'power2', lead: s0 }); return s0 + c.into[0]; },
        end: function () { return s0 + (landOnly ? c.into[1] : c.outof[1]); },
        onUpdate: write, onRefresh: write, onLeave: clear, onLeaveBack: clear });
      var kill = st.kill.bind(st);
      st.kill = function () { window.ScrollTrigger.removeEventListener('refreshInit', clear); clear(); kill(); };
      return st;
    });
  }

  /* Filterbalk (line-up dagen, FAQ-tabs; BORING 2026-11-27): een pil (.bgf-day-pill) schuift onder de knoppen naar de gekozen knop; de tekst
     van de twee knoppen die van kleur wisselen gaat zoals de link-hover: elk teken schuift in zijn masker opzij en een kopie in de nieuwe
     kleur (text-shadow, één tekenbreedte ernaast) schuift erin, in de richting van de pil. Tekens alleen met muis en zonder reduced motion
     (anders de kleurfade uit site.css). isOn(knop) = gekozen. change(oud, nieuw, zet) zet de stand (zet) en animeert; geeft de richting. */
  function pillBar(gsap, buttons, isOn) {
    var bar = buttons[0].parentNode, pill = document.createElement('span');
    pill.className = 'bgf-day-pill';
    pill.setAttribute('aria-hidden', 'true');
    bar.insertBefore(pill, bar.firstChild);
    bar.setAttribute('data-bgf-day-pill', '');
    if (finePointer.matches && !reduce.matches) document.fonts.ready.then(function () {
      buttons.forEach(function (b) {
        b.bgfChars = window.SplitText.create(b.querySelector('div') || b, { type: 'chars', mask: 'chars' }).chars;
        b.style.transition = 'none';
      });
    });
    function move(animate) {
      var on = buttons.filter(isOn)[0];
      if (!on) return;
      var to = { x: on.offsetLeft, y: on.offsetTop, width: on.offsetWidth, height: on.offsetHeight };
      if (animate && !reduce.matches) gsap.to(pill, Object.assign({ duration: 0.45, ease: 'power3.out', overwrite: true }, to));
      else gsap.set(pill, Object.assign({ overwrite: true }, to));
    }
    function change(was, now, apply) {
      var dir = buttons.indexOf(now) < buttons.indexOf(was) ? -1 : 1, pair = [was, now].filter(Boolean);
      var olds = pair.map(function (b) { return getComputedStyle(b).color; });
      apply();
      pair.forEach(function (b, i) {
        var chars = b.bgfChars, ink = getComputedStyle(b).color;
        if (!chars) return;
        // de vorige wissel stoppen via zijn eigen tween (killTweensOf liet de stagger-timeline met onComplete leven: tekst onzichtbaar bij snel klikken)
        if (b.bgfInk) b.bgfInk.kill();
        chars.forEach(function (c) { c.style.color = olds[i]; c.style.textShadow = (-dir * c.offsetWidth) + 'px 0 0 ' + ink; });
        b.bgfInk = gsap.fromTo(chars, { xPercent: 0 }, { xPercent: 100 * dir, duration: 0.7, ease: 'expo.out', stagger: Math.min(0.03, 0.3 / Math.max(1, chars.length - 1)),
          onComplete: function () { b.bgfInk = null; chars.forEach(function (c) { c.style.color = c.style.textShadow = ''; }); gsap.set(chars, { xPercent: 0 }); } });
      });
      move(true);
      return dir;
    }
    window.addEventListener('resize', function () { move(false); });
    move(false);
    return { move: move, change: change };
  }

  /* Tekst wisselen zoals de link-hover (BORING 2026-11-27: teller en genre van de line-up): de oude tekens schuiven in hun masker opzij weg, de
     nieuwe schuiven erin (dir 1 = naar links, nieuw komt van rechts). Zonder muis, met reduced motion of de eerste keer: direct. */
  function swapText(el, html, dir) {
    if (!el) return;
    var gsap = window.gsap;
    if (el.bgfSwap) el.bgfSwap.progress(1);
    if (!gsap || !window.SplitText || !finePointer.matches || reduce.matches || !el.textContent.trim() || !html) { el.innerHTML = html; return; }
    var out = document.createElement('div'), inn = document.createElement('div'), cs = getComputedStyle(el);
    while (el.firstChild) out.appendChild(el.firstChild);
    inn.innerHTML = html;
    if (cs.position === 'static') el.style.position = 'relative';
    out.style.cssText = 'display:inline-block;white-space:nowrap';
    inn.style.cssText = 'display:inline-block;white-space:nowrap;position:absolute;top:0;' + (/right|end/.test(cs.textAlign) ? 'right:0' : 'left:0');
    el.appendChild(out);
    el.appendChild(inn);
    var a = window.SplitText.create(out, { type: 'chars', mask: 'chars' }).chars, b = window.SplitText.create(inn, { type: 'chars', mask: 'chars' }).chars;
    var st = function (n) { return { each: Math.min(0.03, 0.3 / Math.max(1, n - 1)), from: dir > 0 ? 'start' : 'end' }; };
    el.bgfSwap = gsap.timeline({ onComplete: function () { el.bgfSwap = null; el.innerHTML = html; } })
      .to(a, { xPercent: -100 * dir, duration: 0.5, ease: 'expo.out', stagger: st(a.length) }, 0)
      .fromTo(b, { xPercent: 100 * dir }, { xPercent: 0, duration: 0.7, ease: 'expo.out', stagger: st(b.length) }, 0);
  }

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
     Snel in en uit of halverwege terug: een lijn die nog boven weg aan het gaan is, keert om; nooit een sprong.
     Tekst per teken (BORING 2026-11-27, zoals de link-hover): de tekst (.button_text) wordt in tekens gesplitst en elk teken
     schuift naar zijn kopie (de text-shadow 1em lager, die erft per teken), met een kleine stagger; het masker is de text-wrapper.
     Alleen met muis en zonder reduced motion; anders (en zonder JS) blijft de CSS-slide van de hele tekst. [data-bgf-chars] zet die
     CSS-transform uit (site.css). button.bgfChars = de tekens, ook voor de kleurwissel van Tickets in de nav. */
  if (document.querySelector('.button_background-line, [data-bgf-fill-line]')) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 992px)');
    var hosts = [].slice.call(document.querySelectorAll('.button_wrapper'));
    each('[data-bgf-fill-line]', function (line) {
      var host = line.parentNode.parentNode;
      if (hosts.indexOf(host) < 0) hosts.push(host);
    });
    var stagger = { amount: 0.15, from: 'random' };
    // per knop één lijnen-tween (button.bgfLineTw), die de volgende stopt: overwrite liet de stagger-timeline van een fillOut leven en zijn
    // onComplete (lijnen onder klaarzetten) kwam dan midden in de volgende beweging
    function fillIn(button, lines) {
      if (button.bgfLineTw) button.bgfLineTw.kill();
      // wat boven weg is (of bijna), begint weer onder; wat nog onderweg is, keert vanaf waar het is
      [].forEach.call(lines, function (l) { if (gsap.getProperty(l, 'yPercent') <= -100) gsap.set(l, { yPercent: 101 }); });
      button.bgfLineTw = gsap.to(lines, { yPercent: 0, duration: 0.4, ease: 'expo.out', stagger: stagger });
    }
    function fillOut(button, lines) {
      if (button.bgfLineTw) button.bgfLineTw.kill();
      button.bgfLineTw = gsap.to(lines, { yPercent: -101, duration: 0.4, ease: 'expo.out', stagger: stagger,
        onComplete: function () { gsap.set(lines, { yPercent: 101 }); } });
    }
    // tekens naar y (-100 = de kopie in beeld, 0 = rust); de hele golf hoogstens 0.7 s
    function textTo(button, y) {
      var chars = button.bgfChars;
      if (chars) gsap.to(chars, { yPercent: y, duration: 0.5, ease: 'expo.out', stagger: Math.min(0.02, 0.2 / Math.max(1, chars.length - 1)), overwrite: true });
    }
    hosts.forEach(function (button) {
      var lines = button.querySelectorAll('.button_background-line, [data-bgf-fill-line]');
      if (!lines.length) return;
      var full = parseFloat(window.getComputedStyle(lines[0]).height) > 0;   // lijnen in rust vol = omgekeerde hover
      gsap.set(lines, { height: '101%', yPercent: full ? 0 : 101 });
      var text = button.querySelector('.button_text');
      if (text && finePointer.matches && !reduce.matches) document.fonts.ready.then(function () {
        button.bgfChars = window.SplitText.create(text, { type: 'chars' }).chars;   // SplitText zet aria-label op de tekst, de tekens aria-hidden
        text.setAttribute('data-bgf-chars', '');
      });
      var on = false;
      function enter() {
        if (on || !desktop.matches || reduce.matches) return;
        on = true;
        if (button.bgfSwap) button.bgfSwap.progress(1);   // kleurwissel van de nav-knop eerst af
        if (full) fillOut(button, lines); else fillIn(button, lines);
        textTo(button, -100);
      }
      function leave() {
        if (!on) return;
        on = false;
        if (full) fillIn(button, lines); else fillOut(button, lines);
        textTo(button, 0);
      }
      button.addEventListener('mouseenter', enter);
      button.addEventListener('mouseleave', leave);
      // naar tablet of touch terwijl de muis erop staat: terug naar rust
      desktop.addEventListener('change', leave);
    });
  }, ['SplitText']);

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

  /* data-bgf-collage (Section - Gallery, gallery_list met het slot "Foto's"): elke foto (gallery_item) krijgt een plek uit het patroon
     van Figma (galerij optie 2, 642:2786: 7 plekken in een blok van 1440 x 1104, staand 204 x 272 of liggend 318 x 212, snelheid 0.6/1/1.3).
     Foto 8 begint het patroon opnieuw een blok lager, gespiegeld, dus de klant kan foto's toevoegen of weghalen zonder iets in te stellen;
     de lijst wordt zo hoog als nodig en de titel blijft ondertussen in het midden staan (sticky, Webflow). Snelheid gaat als
     data-bgf-speed naar data-bgf-parallax. Vanaf 992px; daaronder het raster van 2 kolommen uit Webflow. */
  var COLLAGE = [
    { x: 1188, y: 80, w: 204, s: 1 }, { x: 162, y: 150, w: 318, s: 0.6 }, { x: 846, y: 210, w: 204, s: 0.6 }, { x: 276, y: 600, w: 204, s: 1.3 },
    { x: 1074, y: 680, w: 318, s: 0.6 }, { x: 48, y: 760, w: 204, s: 1 }, { x: 618, y: 850, w: 318, s: 1 }
  ];
  each('[data-bgf-collage]', function (list) {
    var wide = window.matchMedia('(min-width: 992px)');
    function layout() {
      // het slot van Webflow zet de foto's in een kale <div> (site.css: display contents)
      var root = list.children.length === 1 && !list.children[0].className ? list.children[0] : list;
      var items = [].slice.call(root.children), k = list.clientWidth / 1440, bottom = 0, spread = 0, lift = 0;
      var host = list.closest('[data-bgf-parallax]'), distance = host && !reduce.matches ? num(host, 'data-bgf-parallax', 250) : 0;
      // ruimte boven: een trage foto begint (1 - s) × distance boven zijn plek; staat hij hoog in het eerste blok, dan zakt alles zoveel
      // dat de bovenkant van de kaart hem niet afknipt (BORING 2026-11-27, sterkere parallax)
      items.forEach(function (el, i) { var p = COLLAGE[i % 7]; if (i < 7) lift = Math.max(lift, (1 - p.s) * distance - p.y * k); });
      items.forEach(function (el, i) {
        if (!wide.matches) { el.style.left = el.style.top = el.style.width = el.style.aspectRatio = ''; el.removeAttribute('data-bgf-speed'); return; }
        var p = COLLAGE[i % 7], block = Math.floor(i / 7), portrait = p.w < 300, h = portrait ? p.w * 4 / 3 : p.w * 2 / 3;
        var x = block % 2 ? 1440 - p.x - p.w : p.x, y = block * 1104 + p.y;   // elk tweede blok gespiegeld
        el.style.left = (x / 14.4) + '%';
        el.style.top = (y * k + lift) + 'px';
        el.style.width = (p.w / 14.4) + '%';
        el.style.aspectRatio = portrait ? '3 / 4' : '3 / 2';
        el.setAttribute('data-bgf-speed', p.s);
        bottom = Math.max(bottom, y + h);
        spread = Math.max(spread, Math.abs(p.s - 1) * distance);
      });
      // ruimte voor de parallax: een trage foto zakt tot `spread` px onder zijn plek (data-bgf-parallax), anders knipt de sectie hem af
      // + 1.25 titelhoogte (BORING 2026-11-27): de foto's zijn uit beeld voordat de titel (sticky, schermhoog) vertrekt, ook zijn zachte vertrek
      var title = list.parentNode.querySelector('.gallery_title');
      list.style.height = wide.matches && items.length ? ((bottom + 80) * k + lift + spread + (title ? title.offsetHeight * 1.25 : 0)) + 'px' : '';
    }
    layout();
    window.addEventListener('resize', layout);
    // de titel (CSS sticky in Webflow) landt en vertrekt zacht: sticky-skill, alleen met muis en zonder reduced motion (doet de module zelf)
    var title = list.parentNode.querySelector('.gallery_title');
    if (title && finePointer.matches && !reduce.matches) withGsap(function (gsap) {
      loadSticky().then(function (m) {
        m.sticky(title, { ticker: function (fn) { gsap.ticker.add(fn); return function () { gsap.ticker.remove(fn); }; } });
      }).catch(function (e) { console.error('site.js:', e); });
    });
  });

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
        // offsets, niet getBoundingClientRect: die rekent de scheve kaart (scale 0.8, rotate) en de sticky-translate mee en dan
        // staat de clip verschoven als er tijdens de overgang gemeten wordt (BORING 2026-11-27: "jaar" weg, titel niet in het midden)
        var cs = getComputedStyle(el), c = { width: canvas.offsetWidth };
        t.setAttribute('x', marker.offsetLeft - canvas.offsetLeft);
        t.setAttribute('y', marker.offsetTop - canvas.offsetTop);
        t.setAttribute('font-family', cs.fontFamily);
        t.setAttribute('font-size', cs.fontSize);
        t.setAttribute('font-weight', cs.fontWeight);
        t.setAttribute('letter-spacing', cs.letterSpacing === 'normal' ? '0' : cs.letterSpacing);
        var strips = Math.max(2, Math.round(7 * c.width / window.innerWidth));
        g.setState({ stripsMin: strips, stripsMax: strips + 1 });
      };
      document.fonts.ready.then(fit);
      document.fonts.addEventListener('loadingdone', fit);   // een lettertype dat later binnenkomt verschuift de basislijn
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
    // de pagina wordt later korter of langer (FAQ-tab met minder vragen, accordeon, afbeeldingen): dan alles opnieuw meten, anders
    // eindigt de footerkaart op de oude hoogte en staat hij onderaan nog scheef (BORING 2026-11-27)
    var height = 0, wait = 0;
    window.ScrollTrigger.addEventListener('refresh', function () { height = document.documentElement.scrollHeight; });
    new ResizeObserver(function () {
      clearTimeout(wait);
      wait = setTimeout(function () { if (Math.abs(document.documentElement.scrollHeight - height) > 1) window.ScrollTrigger.refresh(); }, 200);
    }).observe(document.body);
  }, ['ScrollTrigger']);

  /* data-bgf-lock (Section - Video): de sectie klikt zacht vast bovenaan het scherm en blijft staan terwijl de volgende sectie
     eroverheen schuift (zoals de "smooth sticky" van extrema.be). Zacht: de curve van de sticky-skill (easePin) laat de sectie over 40%
     schermhoogte afremmen tot stilstand bovenaan (losse translate, de kaart-transform blijft van data-bgf-card); daarna een pin tot de
     bovenkant van de volgende sectie bovenaan is. Vanaf 768px, zonder reduced motion; het afremmen alleen met muis. */
  if (document.querySelector('[data-bgf-lock]') && !reduce.matches) withGsap(function (gsap) {
    gsap.matchMedia().add('(min-width: 768px)', function () {
      var locks = [].slice.call(document.querySelectorAll('[data-bgf-lock]')).filter(function (el) { return el.nextElementSibling; });
      var eased = [];
      locks.forEach(function (el) {
        var next = el.nextElementSibling;
        // afremmen naar de bovenkant met de curve van de sticky-skill (landing over 40% schermhoogte, begint op scrollsnelheid)
        eased.push(easePin(el, function () { return docTop(el); }, function () { return docTop(next) - docTop(el); }, true));
        window.ScrollTrigger.create({ trigger: el, start: function () { return docTop(el); }, end: function () { return docTop(next); }, pin: true, pinSpacing: false });
      });
      return function () { eased.forEach(function (p) { p.then(function (st) { st.kill(); }, function () {}); }); };
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
            // van het vage grijs meteen naar de jubileumkleur (dekking 15% → 100%), daarna naar de eigen kleur; nooit doorzichtiger dan 15% (BORING 2026-11-27)
            var a = clamp01(t / 0.35), c = clamp01((t - 0.5) / 0.5);
            w.style.opacity = (0.15 + 0.85 * a).toFixed(3);
            w.style.color = 'rgb(' + mix(mix(ink, glows[i], a), ink, c).join(', ') + ')';
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
          // de pin landt en vertrekt zacht (sticky-skill), alleen met muis
          if (ctx.conditions.wide) {
            var eased = easePin(section, function () { return docTop(section); }, function () { return window.innerHeight; }, false);
            eased.catch(function () {});
            return function () { eased.then(function (t) { t.kill(); }, function () {}); };
          }
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
      document.dispatchEvent(new CustomEvent('bgf:cursor'));   // cursortekst en -teken direct mee, niet pas bij de volgende muisbeweging
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
      sync();   // knop, schermlezer en cursor meteen bij, niet pas na volumechange (BORING 2026-11-27: reageerde niet altijd op de eerste klik)
    });

    // in beeld: laden en (autoplay) spelen; uit beeld: pauzeren. Het geluid blijft zoals de bezoeker het zette.
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { if (autoplay) play(); else attach(); }
      else if (!video.paused || wantPlay) pause();
    }, { threshold: 0.1 }).observe(player);
  });

  /* data-bgf-lineup (Section Line-up): coverflow (BORING 2026-11-27, uit de varianten op staging; was optie 2 "cilinder", Figma 642:1806).
     De kaarten zijn de items van de Collection List (CMS Line-up): [data-bgf-lineup-item] = Dag, met daarin [data-bgf-lineup-name],
     [data-bgf-lineup-tag] (Toevoeging) en [data-bgf-lineup-genre]. Zonder site.js blijft het de gewone scrollrij uit Webflow.
     Met site.js: een vaste baan van 1440 x 680 die meeschaalt (--k), elke kaart op zijn plek in de coverflow (vloeiend tussen de
     plekken). Slepen (met inertie), pijltjes, toetsen en klikken op een zijkaart draaien de rij;
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
      if (infoGenre) infoGenre.setAttribute('aria-hidden', 'true');   // het genre staat sinds 2026-11-27 rechts in de navigatiebalk; de kaart noemt het al
      slider.setAttribute('role', 'region');
      slider.setAttribute('aria-roledescription', 'carrousel');
      slider.setAttribute('aria-label', 'Line-up');
      list.setAttribute('data-bgf-cursor-drag', '');
      section.setAttribute('data-bgf-lineup-ready', '');

      // ---- coverflow (BORING koos hem 2026-11-27 uit de varianten): de middelste kaart recht, de buren gedraaid (62°) en naar achter,
      // verdere kaarten dicht ertegenaan geschoven. d = gebroken plek (0 = midden, -1 links, 1 rechts), in baan-px van 1440 x 680 ----
      var P = 2400;   // CSS-perspectief (ook in site.css)
      var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
      function at(d) {
        var a = Math.abs(d), s = d < 0 ? -1 : 1, near = clamp(a, 0, 1), far = Math.max(0, a - 1);
        return { tx: s * (near * 430 + far * 150), tz: -near * 260 - far * 40, ry: -s * near * 62,
          opacity: clamp(4.3 - a, 0, 1), dim: clamp(near * 0.25 + far * 0.12, 0, 0.7) };
      }
      var s1 = at(1), stepTrack = s1.tx * P / (P - s1.tz);   // baan-px van het midden tot plek 1 (sleepafstand per kaart)

      // ---- ring: de kaarten van de gekozen dag, herhaald tot minstens 10 (kopieën zijn verborgen voor schermlezers) ----
      var ring = [], cards = [], pos = 0, lastPos = NaN, active = -1, tween = null, target = 0, settled = true, k = 1;
      var wrap = function (d, n) { return ((d % n) + n + n / 2) % n - n / 2; };
      var stepPx = function () { return stepTrack * k; };
      var proxy = document.createElement('div');
      var cur = function () { return -gsap.getProperty(proxy, 'x') / stepPx(); };
      function build(day) {
        // een lopende draai of worp stopt; elke kaart begint schoon (een uitgefade kaart van de vorige dag bleef anders
        // onzichtbaar, en kopieën namen die inline stijl over: gaten in de lus na filteren)
        if (tween) { tween.kill(); tween = null; }
        if (drag && drag.tween) drag.tween.kill();
        artists.forEach(function (a) {
          gsap.killTweensOf(a.node); gsap.set(a.node, { '--bgf-out-x': '0px' });
          a.node.removeAttribute('data-bgf-active');
          var f = a.node.querySelector('.lineup_card') || a.node;
          gsap.killTweensOf(f); gsap.set(f, { opacity: 1 });
        });
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
          var d = wrap(i - pos, n), a = Math.abs(d), S = at(d), op = S.opacity, st = c.style;
          st.visibility = op <= 0 ? 'hidden' : '';
          if (op <= 0) return;
          st.transform = 'translate3d(' + S.tx + 'px, 0, ' + S.tz + 'px) rotateY(' + S.ry + 'deg)';
          st.opacity = op;
          st.zIndex = 100 - Math.round(a * 10);
          st.setProperty('--bgf-dim', S.dim.toFixed(3));
          // de foto schuift binnen de kaart iets tegen de draairichting in (individuele translate: de hover-schaal blijft transform)
          if (!reduce.matches) st.setProperty('--bgf-shift', (Math.max(-3, Math.min(3, d)) * -2).toFixed(2) + '%');
        });
        var slot = ((Math.round(pos) % n) + n) % n, now = ring[slot];
        if (now !== active && counter) {
          active = now;
          var uniq = ring.filter(function (x, i) { return ring.indexOf(x) === i; });
          var pad = function (v) { return (v < 10 ? '0' : '') + v; };
          // teller links en genre rechts wisselen zoals de link-hover, in de richting van het schuiven (BORING 2026-11-27)
          var slotPos = Math.round(pos), dir = lastSlotPos === null || slotPos >= lastSlotPos ? 1 : -1;
          lastSlotPos = slotPos;
          swapText(counter, '<b>' + pad(uniq.indexOf(now) + 1) + '</b> <span>/ ' + pad(uniq.length) + '</span>', dir);
          swapText(infoGenre, (now && now.genre) || '', dir);
        }
      }
      // de getekende stand loopt zacht achter de echte aan (gedempt, zoals smooothy); de naam komt zodra de doelkaart bijna in het midden staat
      var pressed = false, lastSlotPos = null;
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
        infoName.textContent = a.name; infoTag.textContent = a.tag ? '(' + a.tag + ')' : '';
        if (nameTl) nameTl.kill();
        if (reduce.matches) { nameTl = gsap.fromTo(info, { opacity: 0 }, { opacity: 1, y: 0, duration: 0.3 }); return; }
        split = window.SplitText.create(infoName, { type: 'words,chars', mask: 'chars' });   // words: een lange naam breekt tussen woorden, niet midden in een woord
        nameTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
          .set(info, { opacity: 1, y: 0 })
          .fromTo(infoBox, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'expo.out' })
          .fromTo(split.chars, { yPercent: 105 }, { yPercent: 0, duration: 0.5, stagger: 0.012 }, 0.05)
          .fromTo(infoTag, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 }, 0.15);
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
      var dayBar = days.length ? pillBar(gsap, days, function (b) { return b.getAttribute('aria-pressed') === 'true'; }) : null;
      function movePill(animate) { if (dayBar) dayBar.move(animate); }
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
          var dir = dayBar.change(was, button, function () { days.forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); }); });
          swapTo(button.getAttribute('data-bgf-lineup-day'), dir);
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

  /* data-bgf-curve (Section - Marquee): de band loopt als S-bocht (BORING 2026-11-27; eerst een slinger naar de marquee onder de hero
     van two26.studio). De sectie wordt geknipt tot een dikke gebogen band (clip-path: path(), opnieuw bij resize), de tekst loopt over
     dezelfde lijn in een SVG-textPath. De gewone rij (data-bgf-marquee) blijft voor schermlezers (.bgf-sr) en levert tekst, lettertype
     en tussenruimte. data-bgf-marquee laat de tekst lopen met section.bgfCurve.offset(pos); bij reduced motion staat hij stil. */
  /* Vorm: S-bocht (BORING koos hem 2026-11-27 uit zes vormen op staging). y(u) over de breedte (u 0..1, de lijn loopt 6% buiten beeld
     door), geschaald met A; de band volgt de lijn. */
  function curveShape(W, T) {
    var A = Math.max(T * 0.7, W * 0.08), pts = [], min = Infinity, max = -Infinity;
    for (var i = 0; i <= 96; i++) { var u = i / 96, y = A * Math.sin(2 * Math.PI * u) / 2; pts.push([-0.06 * W + 1.12 * W * u, y]); min = Math.min(min, y); max = Math.max(max, y); }
    var top = T * 0.62 - min;
    return { H: max - min + T * 1.24, d: 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + (p[1] + top).toFixed(1); }).join(' L') };
  }
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
      var shape = curveShape(W, T);
      section.style.height = shape.H + 'px';
      path.setAttribute('d', shape.d);
      // band = de lijn met dikte T: punten links en rechts van de lijn (loodrecht), heen langs de bovenrand en terug langs de onderrand
      var len = path.getTotalLength(), n = 64, top = [], bottom = [];
      for (var i = 0; i <= n; i++) {
        var l = len * i / n, p = path.getPointAtLength(l), q = path.getPointAtLength(Math.min(len, l + 1)), o = path.getPointAtLength(Math.max(0, l - 1));
        var dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * T / 2, ny = dx / d * T / 2;
        top.push((p.x + nx).toFixed(1) + ',' + (p.y + ny).toFixed(1));
        bottom.unshift((p.x - nx).toFixed(1) + ',' + (p.y - ny).toFixed(1));
      }
      section.style.clipPath = "path('M" + top.concat(bottom).join(' L') + " Z')";
      // lengte van één groep = waar de tweede groep begint, gemeten op een rechte regel: getComputedTextLength telt de dx-tussenruimtes
      // niet (altijd) mee, dan sprong de tekst bij het rondgaan (BORING 2026-11-27)
      fill(2);
      var probe = text.cloneNode(true), n1 = parts.join('').length;
      probe.textContent = '';
      [].forEach.call(tp.childNodes, function (s) { probe.appendChild(s.cloneNode(true)); });
      svg.appendChild(probe);
      groupLen = (probe.getStartPositionOfChar(n1).x - probe.getStartPositionOfChar(0).x) || 1;
      svg.removeChild(probe);
      fill(Math.ceil(len / groupLen) + 2);
      section.bgfCurve.offset(pos);
    }
    section.bgfCurve = {
      offset: function (p) { pos = p; tp.setAttribute('startOffset', (-(p + 1) * groupLen).toFixed(2)); },
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
      var was = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      var apply = function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on);
          t.tabIndex = on ? 0 : -1;
        });
      };
      // filterbalk zoals de line-up dagen (BORING 2026-11-27): pil schuift, tekst wisselt zoals de link-hover
      if (root.bgfPills && was && was !== tab) root.bgfPills.change(was, tab, apply); else { apply(); if (root.bgfPills) root.bgfPills.move(false); }
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
    withGsap(function (gsap) { root.bgfPills = pillBar(gsap, tabs, function (t) { return t.getAttribute('aria-selected') === 'true'; }); }, ['SplitText']);
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
    // slepen en geluid uit naar Figma "updated sound off and drag cursor" (646:182, BORING 2026-11-27)
    var sizes = { base: [26, 14, 14, 26], hover: [40, 18, 18, 40], press: [20, 10, 10, 20], drag: [74, 18, 20, 40],
      mute: [26, 8, 8, 26], sound: [9, 26, 9, 26] };
    // per stand: draaiing en zijwaartse verschuiving (px) van het liggende en het staande ovaal; overal elders 0
    var poses = { mute: { rotation: -45, left: [0, 0] }, sound: { rotation: 0, left: [-6, 6] } };
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
    // een module die tekst of teken wisselt (de video bij een klik) meldt dat meteen; mouseup komt vóór de click, dus daar is het te vroeg
    document.addEventListener('bgf:cursor', function () { setLabel(); setState(); });
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
    /* Kleurwissel met de lijnen van de knop-hover (BORING 2026-11-27): de nieuwe kleur schuift in stroken over de oude, in de
       richting van het scrollen (naar beneden = de stroken komen van onder, zoals de sectie zelf; omhoog = van boven).
       Alleen met muis en zonder reduced motion; niet terwijl de muis op de knop staat (dan is de hover bezig). */
    var ticking = false, lastY = window.scrollY, scrollDir = 1, swapTl = null;
    var tickets = nav.querySelector('.nav_actions .button_wrapper');
    var ticketBg = tickets && tickets.querySelector('.button_background');
    var ticketLines = tickets ? [].slice.call(tickets.querySelectorAll('.button_background-line')) : [];
    var ticketText = tickets && tickets.querySelector('.button_text');
    function checkDark() {
      ticking = false;
      var y0 = window.scrollY;
      if (y0 !== lastY) { scrollDir = y0 > lastY ? 1 : -1; lastY = y0; }
      var x = window.innerWidth - 80, y = 38; // bij de Tickets-knop: midden van de knoppenbalk (1rem boven + 2.75rem hoog)
      var under = document.elementsFromPoint(x, y).filter(function (el) { return !el.closest('[data-bgf-nav], .transition'); })[0];
      var dark = !!(under && under.closest('[data-bgf-nav-dark]'));
      if (dark === nav.hasAttribute('data-bgf-nav-on-dark')) return;
      var g = window.gsap, strips = g && ticketBg && ticketText && ticketLines.length && finePointer.matches && !reduce.matches && !tickets.matches(':hover');
      var oldInk = null;
      if (strips) {
        if (swapTl) swapTl.progress(1);
        ticketBg.style.backgroundColor = getComputedStyle(ticketLines[0]).backgroundColor;   // oude kleur blijft eronder staan
        ticketText.style.transition = 'none';   // de kleur niet laten faden: de tekst schuift (hieronder)
        oldInk = getComputedStyle(ticketText).color;
      }
      nav.toggleAttribute('data-bgf-nav-on-dark', dark);
      if (!strips) return;
      // tekst zoals de hover (BORING 2026-11-27): de tekens schuiven naar een kopie in de nieuwe kleur, in de scrollrichting
      // (naar beneden = kopie van onder, omhoog = kopie van boven); daarna de rust van de nieuwe kleur (CSS), zonder sprong
      var dir = scrollDir, chars = tickets.bgfChars || [ticketText];
      ticketText.style.textShadow = '0 ' + dir + 'em 0 ' + getComputedStyle(ticketText).color;
      ticketText.style.color = oldInk;
      // één veeg (BORING 2026-11-27; eerst stroken met willekeurige vertraging en tekens op een eigen klok: losse stukjes, tekst even zwart op zwart):
      // alle stroken samen als één rand door de knop, en de tekst wisselt precies waar die rand langs de tekst gaat
      var H = tickets.offsetHeight, tr = ticketText.parentNode.getBoundingClientRect(), br = tickets.getBoundingClientRect();
      var t0 = tr.top - br.top, L = tr.height || 1, s = { e: 0 };
      if (tickets.bgfLineTw) tickets.bgfLineTw.kill();
      var wipe = function () {
        var b = dir > 0 ? H * (1 - s.e) : H * s.e;
        var p = Math.max(0, Math.min(1, dir > 0 ? (t0 + L - b) / L : (b - t0) / L));
        g.set(ticketLines, { yPercent: (dir > 0 ? 101 : -101) * (1 - s.e) });
        g.set(chars, { yPercent: -100 * dir * p });
      };
      wipe();   // meteen: de lijnen hebben de nieuwe kleur al
      swapTl = g.to(s, { e: 1, duration: 0.55, ease: 'power3.inOut', onUpdate: wipe, onComplete: function () {
        ticketBg.style.backgroundColor = ticketText.style.color = ticketText.style.textShadow = '';
        g.set(ticketLines, { yPercent: 0 }); g.set(chars, { clearProps: 'transform' });
        getComputedStyle(ticketText).color;   // eerst de nieuwe kleur vastzetten, dan pas de CSS-fade terug (anders faded hij van de oude kleur: zwart op zwart)
        ticketText.style.transition = '';
        swapTl = tickets.bgfSwap = null; } });
      tickets.bgfSwap = swapTl;
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

  /* Link-hover (BORING koos 2026-11-27 versie 2 van drie): elk teken schuift binnen zijn masker naar rechts en zijn kopie (text-shadow,
     zelfde kleur, één tekenbreedte links) schuift erin, als een langzame golf; bij verlaten terug naar links. Alleen echte links (a[href])
     in de nav en de footer, niet de gewone teksten van de footer. De golf duurt hoogstens 1 s: bij lange links worden de tekens dichter
     op elkaar gezet. Alleen met muis en zonder reduced motion. */
  if (finePointer.matches && !reduce.matches && document.querySelector('a.nav_link[href], a.footer_detail[href], a.footer_legal-link[href]')) withGsap(function (gsap) {
    var DUR = 0.7, MAX = 1;
    document.fonts.ready.then(function () {
      each('a.nav_link[href], a.footer_detail[href], a.footer_legal-link[href]', function (link) {
        var chars = window.SplitText.create(link, { type: 'chars', mask: 'chars' }).chars;
        var staggerOf = function (list) { return Math.min(0.03, (MAX - DUR) / Math.max(1, list.length - 1)); };
        var alt = link.getAttribute('data-bgf-hover-text');
        if (alt) {
          // data-bgf-hover-text (Web Credits, BORING 2026-11-27): de tekst schuift weg en een andere tekst schuift erin, terug bij verlaten
          if (getComputedStyle(link).position === 'static') link.style.position = 'relative';
          var layer = document.createElement('span');
          layer.setAttribute('aria-hidden', 'true');
          layer.textContent = alt;
          layer.style.cssText = 'position:absolute;top:0;left:0;white-space:nowrap';
          link.appendChild(layer);
          var altChars = window.SplitText.create(layer, { type: 'chars', mask: 'chars' }).chars;
          gsap.set(altChars, { xPercent: -100 });
          var swap = function (on) {
            // eerst gaat de ene tekst weg, net daarna komt de andere: de twee teksten liggen op dezelfde plek
            gsap.to(chars, { xPercent: on ? 100 : 0, duration: DUR, ease: 'expo.out', stagger: staggerOf(chars), overwrite: true, delay: on ? 0 : 0.2 });
            gsap.to(altChars, { xPercent: on ? 0 : -100, duration: DUR, ease: 'expo.out', stagger: staggerOf(altChars), overwrite: true, delay: on ? 0.2 : 0 });
          };
          link.addEventListener('mouseenter', function () { swap(true); });
          link.addEventListener('mouseleave', function () { swap(false); });
          return;
        }
        chars.forEach(function (c) { c.style.textShadow = (-c.offsetWidth) + 'px 0 0 currentColor'; });
        var go = function (x) { gsap.to(chars, { xPercent: x, duration: DUR, ease: 'expo.out', stagger: staggerOf(chars), overwrite: true }); };
        link.addEventListener('mouseenter', function () { go(100); });
        link.addEventListener('mouseleave', function () { go(0); });
      });
    });
  }, ['SplitText']);

  /* Logo-wall (BORING 2026-11-27): alle logo's even zwaar. Elk SVG-logo wordt op een klein canvas getekend; de viewBox wordt bijgesneden tot de
     inkt (geen lege rand meer in het bestand) en de maat volgt uit gelijke oppervlakte (breedte ~ √verhouding: een breed logo wordt lager, een
     rond logo groter), bijgestuurd naar de inktdichtheid (dunne lijnen iets groter, √, tussen 0.85 en 1.3). Alles past in het vak van
     .logo-wall_item; opnieuw bij een andere maat. Zonder site.js of als het meten niet lukt: de vakken van Webflow. */
  function measureLogo(svg) {
    return new Promise(function (resolve) {
      var vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      if (vb.length !== 4 || !(vb[2] > 0) || !(vb[3] > 0)) return resolve(null);
      var S = 300 / Math.max(vb[2], vb[3]), cw = Math.ceil(vb[2] * S), ch = Math.ceil(vb[3] * S);
      var clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', cw);
      clone.setAttribute('height', ch);
      clone.removeAttribute('class');
      clone.style.color = '#000';
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true }), d;
        cv.width = cw; cv.height = ch;
        ctx.drawImage(img, 0, 0);
        try { d = ctx.getImageData(0, 0, cw, ch).data; } catch (e) { return resolve(null); }
        var x0 = cw, y0 = ch, x1 = -1, y1 = -1, ink = 0;
        for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) {
          if (d[(y * cw + x) * 4 + 3] < 128) continue;
          ink++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (x1 < 0) return resolve(null);
        var bw = x1 - x0 + 1, bh = y1 - y0 + 1;
        resolve({ a: bw / bh, d: ink / (bw * bh), vb: [vb[0] + x0 / S, vb[1] + y0 / S, bw / S, bh / S].map(function (v) { return +v.toFixed(2); }).join(' ') });
      };
      img.onerror = function () { resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    });
  }
  each('.logo-wall_list', function (list) {
    var logos = [].slice.call(list.querySelectorAll('svg.logo-wall_logo'));
    if (!logos.length || !window.ResizeObserver) return;
    Promise.all(logos.map(measureLogo)).then(function (m) {
      var dens = m.filter(Boolean).map(function (x) { return x.d; }).sort(function (a, b) { return a - b; });
      if (!dens.length) return;
      var med = dens[Math.floor(dens.length / 2)];
      m.forEach(function (x, i) {
        if (!x) return;
        x.f = Math.max(0.85, Math.min(1.3, Math.sqrt(med / x.d)));
        logos[i].setAttribute('viewBox', x.vb);
      });
      var size = function () {
        var box = logos[0].parentNode, cs = getComputedStyle(box), c = Infinity;
        var W = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), H = box.clientHeight - (parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) / 2;   // de helft van de verticale padding mag gebruikt worden
        m.forEach(function (x) { if (x) { var k = Math.sqrt(x.a) * x.f; c = Math.min(c, W / k, H * x.a / k); } });
        m.forEach(function (x, i) {
          if (!x) return;
          var w = c * Math.sqrt(x.a) * x.f;
          logos[i].style.width = w.toFixed(1) + 'px';
          logos[i].style.height = (w / x.a).toFixed(1) + 'px';
        });
      };
      size();
      new ResizeObserver(size).observe(list);
    });
  });

  /* data-bgf-video="mp4-url" op een afbeelding (Section - About): de afbeelding wordt een stille, herhalende video met de afbeelding als
     poster; hij speelt alleen in beeld. Reduced motion: de afbeelding blijft. */
  if (!reduce.matches) each('img[data-bgf-video]', function (img) {
    var v = document.createElement('video');
    v.className = img.className;
    v.src = img.getAttribute('data-bgf-video'); v.poster = img.currentSrc || img.src;
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    img.replaceWith(v);
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) v.play().catch(function () {}); else v.pause();
    }).observe(v);
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
