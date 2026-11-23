# Bontgenoten Festival site-code

De eigen CSS en JavaScript van de Webflow-site van Bontgenoten Festival. Webflow laadt ze via jsDelivr, zodat de code niet in de custom-code-velden van Webflow staat (die hebben een limiet).

| Bestand | Wat | In Webflow |
|---|---|---|
| `site.css` | vloeiende root-fontgrootte, rich text, focus, en verder alleen wat Webflow niet zelf kan | site-head, als `<link>` |
| `site.js` | attribuutmodules (`data-bgf-*`) | site-footer, als `<script>` |
| `test/index.html` | lokale testpagina voor alle modules | niet |

De repository is publiek: zet er nooit sleutels, tokens of interne documentatie in.

## In Webflow

Site settings > Custom code. Staat er andere code in dezelfde blokken (bijvoorbeeld Google Tag Manager), dan blijft die staan.

```html
<!-- head -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/WEAREBORING/bontgenoten-festival@<tag>/site.min.css">
<!-- footer -->
<script src="https://cdn.jsdelivr.net/gh/WEAREBORING/bontgenoten-festival@<tag>/site.min.js"></script>
```

- Altijd een tag, nooit `@main`: jsDelivr bewaart een branch tot 7 dagen in de cache, een tag verandert nooit.
- Het script zonder `defer` of `async`: `data-bgf-form` moet draaien vóór webflow.js het formulier start.
- `.min.` maakt jsDelivr zelf.

## Een wijziging uitbrengen

1. Pas `site.js` of `site.css` aan en hoog het versienummer in de eerste commentaarregel op.
2. Test lokaal met `test/index.html`.
3. Commit, tag en push: `git tag vX.Y.Z && git push && git push --tags`. Eén tag per release, ook als maar één bestand wijzigt.
4. Controleer dat jsDelivr de nieuwe versie geeft: `curl -s https://cdn.jsdelivr.net/gh/WEAREBORING/bontgenoten-festival@vX.Y.Z/site.js | head -1`. Vraag daarna ook `site.min.js` en `site.min.css` op tot ze 200 geven: jsDelivr maakt de `.min`-bestanden pas bij het eerste verzoek, en dat eerste verzoek kan in de browser mislukken (dan draait site.js niet). Gaf de push een fout (GitHub gaf soms 500, soms alleen op de tag), controleer dan `main` en de tag met `git ls-remote origin`.
5. Lees het head- en footerblok in Webflow (`get_site_freeform_code`), vervang alleen de tag in de link en schrijf het blok terug (`set_site_freeform_code`).
6. Publiceer naar webflow.io en controleer de pagina in de browser.

Terugdraaien: zet de vorige tag terug in Webflow en publiceer.

## Pagina-code

Code die maar op één pagina hoort, komt in `pages/<slug>.js` en gaat als `<script>` in de custom code van die pagina, met dezelfde tag. Gebruik dit alleen als een `data-bgf-*`-module in `site.js` niet past.

## Oude hooks

De scripts van de site van 2025 staan als modules in site.js en gebruiken nog hun oude selectors: `.transition`, `.button_wrapper` / `.button_background-line`, `[words-slide-up]`, `[fade-up]`, `[cta-*]` met `.cta_wrapper`, `[hero-1]` t/m `[hero-4]`, `.loader*`, `.marquee-slide`, `.button-faq_wrapper` / `.cl-faqs_wrapper` met `faq-button-*` / `faq-item-*`, `[close-menu]` / `.menu_button`, `[data-lenis-start|stop|toggle]`, `.hero-home_logo-zongenoten`. Hernoem die niet. Bij de nieuwe secties van 2027 gaan ze over naar `data-bgf-*`; de Zongenoten-pagina's houden ze tot hun eigen update.

## Toegang

Wie code uitbrengt, heeft schrijfrechten op deze repository nodig. Lezen kan iedereen, want de repository is publiek.
