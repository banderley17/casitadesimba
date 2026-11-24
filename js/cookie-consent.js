/*
 * La Casita de Simba — gestor de consentimiento de cookies.
 *
 * Cumple el art. 22.2 LSSI y la Guía de cookies de la AEPD (actualización 2023):
 *  - Primera capa con Aceptar todas / Rechazar todas / Configurar al mismo nivel.
 *  - Ninguna categoría opcional activada por defecto ni por seguir navegando.
 *  - Los recursos que requieren consentimiento se cargan solo tras autorizarlos.
 *  - La decisión se recuerda y puede cambiarse o retirarse en cualquier momento
 *    desde cualquier elemento con el atributo [data-cookie-settings].
 *
 * Categorías realmente usadas por la web (auditoría 2026-11-24):
 *  - necesarias: guardar esta decisión y el idioma elegido (localStorage). Siempre activas.
 *  - funcionales: mapa de Google Maps integrado.
 *  - marketing: Meta Pixel y API de Conversiones de Meta.
 * No hay analítica: esa categoría no se muestra.
 *
 * API pública: window.CasitaConsent
 *   .has(cat)              -> boolean
 *   .get()                 -> objeto guardado o null
 *   .set(prefs)            -> guarda {funcionales, marketing}
 *   .grant(cat)            -> autoriza una categoría manteniendo las demás
 *   .open()                -> abre el panel de configuración
 *   .whenGranted(cat, fn)  -> ejecuta fn cuando la categoría quede autorizada
 */
(function () {
  'use strict';

  var KEY = 'casita-consent';
  // Subir la versión obliga a volver a pedir el consentimiento (p. ej. si se
  // añade un proveedor nuevo o cambia la finalidad).
  var VERSION = 1;
  // La AEPD considera razonable renovar el consentimiento como máximo cada 24
  // meses; usamos 12 para ir sobre seguro.
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
  var OPTIONAL = ['funcionales', 'marketing'];
  var POLICY_URL = 'politica-cookies.html';

  var TEXT = {
    es: {
      title: 'Tu privacidad, a tu elección',
      body: 'Usamos solo lo imprescindible para que la web funcione. Con tu permiso, también cargaremos el mapa de Google y la medición publicitaria de Meta (Facebook e Instagram). Puedes aceptar, rechazar o elegir, y cambiar de opinión cuando quieras desde «Configurar cookies» al pie de la página.',
      more: 'Política de cookies',
      accept: 'Aceptar todas',
      reject: 'Rechazar todas',
      config: 'Configurar cookies',
      panelTitle: 'Configurar cookies',
      panelIntro: 'Elige qué categorías permites. Las opcionales están desactivadas hasta que las actives tú.',
      save: 'Guardar mis preferencias',
      close: 'Cerrar',
      always: 'Siempre activas',
      cats: {
        necesarias: ['Técnicas o necesarias', 'Recuerdan tu decisión sobre cookies y el idioma que eliges. Se guardan solo en tu navegador y no se comparten con nadie.'],
        funcionales: ['Funcionales (mapa)', 'Cargan el mapa interactivo de Google Maps en la sección de contacto. Google puede instalar sus propias cookies y recibir tu dirección IP.'],
        marketing: ['Publicidad', 'Activan el Meta Pixel y la API de Conversiones de Meta para medir qué anuncios de Facebook e Instagram funcionan. Meta instala cookies como _fbp y puede relacionar tu visita con tu cuenta.']
      }
    },
    en: {
      title: 'Your privacy, your choice',
      body: 'We only use what is strictly needed for the site to work. With your permission, we will also load Google Maps and Meta advertising measurement (Facebook and Instagram). You can accept, reject or choose, and change your mind at any time from “Cookie settings” in the footer.',
      more: 'Cookie policy',
      accept: 'Accept all',
      reject: 'Reject all',
      config: 'Cookie settings',
      panelTitle: 'Cookie settings',
      panelIntro: 'Choose which categories you allow. Optional ones stay off until you turn them on.',
      save: 'Save my preferences',
      close: 'Close',
      always: 'Always on',
      cats: {
        necesarias: ['Strictly necessary', 'Remember your cookie choice and selected language. Stored only in your browser and never shared.'],
        funcionales: ['Functional (map)', 'Load the interactive Google Maps map in the contact section. Google may set its own cookies and receive your IP address.'],
        marketing: ['Advertising', 'Enable the Meta Pixel and Meta Conversions API to measure which Facebook and Instagram ads work. Meta sets cookies such as _fbp and may link your visit to your account.']
      }
    }
  };

  var listeners = {};
  var state = read();
  var banner = null;
  var panel = null;
  var lastFocus = null;

  function lang() {
    try { return localStorage.getItem('casita-lang') === 'en' ? 'en' : 'es'; } catch (_) { return 'es'; }
  }
  function t() { return TEXT[lang()]; }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== VERSION || !data.ts || (Date.now() - data.ts) > MAX_AGE_MS) return null;
      return data;
    } catch (_) { return null; }
  }

  function write(prefs) {
    var data = { v: VERSION, ts: Date.now(), funcionales: !!prefs.funcionales, marketing: !!prefs.marketing };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
    return data;
  }

  function has(cat) {
    if (cat === 'necesarias') return true;
    return !!(state && state[cat] === true);
  }

  function emit(cat) {
    (listeners[cat] || []).forEach(function (fn) { try { fn(); } catch (_) {} });
    listeners[cat] = [];
  }

  function whenGranted(cat, fn) {
    if (has(cat)) { try { fn(); } catch (_) {} return; }
    (listeners[cat] = listeners[cat] || []).push(fn);
  }

  /* ---------- Limpieza al retirar el consentimiento ---------- */
  function deleteCookie(name) {
    var host = location.hostname;
    var parts = host.split('.');
    var domains = ['', host, '.' + host];
    for (var i = 1; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
    domains.forEach(function (d) {
      document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
    });
  }

  function cleanupMarketing() {
    ['_fbp', '_fbc'].forEach(deleteCookie);
    try {
      localStorage.removeItem('lastExternalReferrer');
      localStorage.removeItem('lastExternalReferrerTime');
    } catch (_) {}
    if (typeof window.fbq === 'function') { try { window.fbq('consent', 'revoke'); } catch (_) {} }
  }

  function set(prefs) {
    var prev = state;
    state = write(prefs);
    hideBanner();
    closePanel();
    applyEmbeds();
    var revoked = OPTIONAL.filter(function (c) { return prev && prev[c] && !state[c]; });
    if (revoked.indexOf('marketing') !== -1) cleanupMarketing();
    document.dispatchEvent(new CustomEvent('casita:consent', { detail: { previous: prev, current: state } }));
    if (revoked.length) {
      // Los scripts de terceros ya cargados no pueden "descargarse": recargamos
      // para que la página vuelva a funcionar sin ellos.
      location.reload();
      return;
    }
    OPTIONAL.forEach(function (c) { if (state[c]) emit(c); });
  }

  function grant(cat) {
    var next = { funcionales: has('funcionales'), marketing: has('marketing') };
    next[cat] = true;
    set(next);
  }

  /* ---------- Contenido incrustado bloqueado (iframes) ---------- */
  function applyEmbeds() {
    var nodes = document.querySelectorAll('[data-consent-src]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var cat = el.getAttribute('data-consent-category') || 'funcionales';
      var ph = el.parentNode && el.parentNode.querySelector('.consent-placeholder[data-consent-for="' + cat + '"]');
      if (has(cat)) {
        if (el.getAttribute('src') !== el.getAttribute('data-consent-src')) el.setAttribute('src', el.getAttribute('data-consent-src'));
        el.hidden = false;
        if (ph) ph.hidden = true;
      } else {
        el.removeAttribute('src');
        el.hidden = true;
        if (ph) ph.hidden = false;
      }
    }
  }

  /* ---------- Interfaz ---------- */
  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (html != null) node.innerHTML = html;
    return node;
  }

  function showBanner() {
    if (banner) return;
    var tx = t();
    banner = el('div', { 'class': 'cc-banner', role: 'region', 'aria-label': tx.title, lang: lang() });
    banner.innerHTML =
      '<div class="cc-banner-inner">' +
        '<div class="cc-banner-text">' +
          '<p class="cc-title">🐾 ' + tx.title + '</p>' +
          '<p>' + tx.body + ' <a href="' + POLICY_URL + '">' + tx.more + '</a></p>' +
        '</div>' +
        '<div class="cc-actions">' +
          '<button type="button" class="cc-btn" data-cc="accept">' + tx.accept + '</button>' +
          '<button type="button" class="cc-btn" data-cc="reject">' + tx.reject + '</button>' +
          '<button type="button" class="cc-btn cc-btn-ghost" data-cc="config">' + tx.config + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    document.documentElement.classList.add('cc-banner-open');
  }

  function hideBanner() {
    if (!banner) return;
    banner.remove();
    banner = null;
    document.documentElement.classList.remove('cc-banner-open');
  }

  function catRow(key, locked) {
    var tx = t();
    var c = tx.cats[key];
    var id = 'cc-' + key;
    var checked = locked || has(key);
    return '<div class="cc-cat">' +
      '<div class="cc-cat-head">' +
        '<label for="' + id + '" class="cc-cat-name">' + c[0] + '</label>' +
        (locked
          ? '<span class="cc-always">' + tx.always + '</span>'
          : '<span class="cc-switch"><input type="checkbox" role="switch" id="' + id + '" data-cat="' + key + '"' + (checked ? ' checked' : '') + '><span aria-hidden="true"></span></span>') +
      '</div>' +
      '<p>' + c[1] + '</p>' +
    '</div>';
  }

  function openPanel() {
    closePanel();
    lastFocus = document.activeElement;
    var tx = t();
    panel = el('div', { 'class': 'cc-overlay', lang: lang() });
    panel.innerHTML =
      '<div class="cc-panel" role="dialog" aria-modal="true" aria-labelledby="cc-panel-title">' +
        '<button type="button" class="cc-close" data-cc="close" aria-label="' + tx.close + '">✕</button>' +
        '<h2 id="cc-panel-title">' + tx.panelTitle + '</h2>' +
        '<p class="cc-intro">' + tx.panelIntro + ' <a href="' + POLICY_URL + '">' + tx.more + '</a></p>' +
        catRow('necesarias', true) + catRow('funcionales') + catRow('marketing') +
        '<div class="cc-actions cc-actions-panel">' +
          '<button type="button" class="cc-btn" data-cc="reject">' + tx.reject + '</button>' +
          '<button type="button" class="cc-btn" data-cc="accept">' + tx.accept + '</button>' +
          '<button type="button" class="cc-btn cc-btn-ghost" data-cc="save">' + tx.save + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);
    document.documentElement.classList.add('cc-panel-open');
    var first = panel.querySelector('input[data-cat]');
    (first || panel.querySelector('.cc-close')).focus();
  }

  function closePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
    document.documentElement.classList.remove('cc-panel-open');
    if (lastFocus && typeof lastFocus.focus === 'function') { try { lastFocus.focus(); } catch (_) {} }
  }

  function onClick(e) {
    var opener = e.target.closest('[data-cookie-settings]');
    if (opener) { e.preventDefault(); openPanel(); return; }
    var enable = e.target.closest('[data-consent-enable]');
    if (enable) { e.preventDefault(); grant(enable.getAttribute('data-consent-enable')); return; }
    var btn = e.target.closest('[data-cc]');
    if (!btn) {
      if (panel && e.target === panel) closePanel();
      return;
    }
    var action = btn.getAttribute('data-cc');
    if (action === 'accept') set({ funcionales: true, marketing: true });
    else if (action === 'reject') set({ funcionales: false, marketing: false });
    else if (action === 'config') openPanel();
    else if (action === 'close') closePanel();
    else if (action === 'save') {
      var prefs = {};
      panel.querySelectorAll('input[data-cat]').forEach(function (i) { prefs[i.getAttribute('data-cat')] = i.checked; });
      set(prefs);
    }
  }

  function onKey(e) {
    if (!panel) return;
    if (e.key === 'Escape') { closePanel(); return; }
    if (e.key === 'Tab') {
      var f = panel.querySelectorAll('button, input, a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  window.CasitaConsent = {
    has: has,
    get: function () { return state; },
    set: set,
    grant: grant,
    open: openPanel,
    whenGranted: whenGranted
  };

  function init() {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    applyEmbeds();
    if (!state) showBanner();
    else OPTIONAL.forEach(function (c) { if (state[c]) emit(c); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
