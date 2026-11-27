(function () {
  'use strict';

  /* ---------- Constantes ---------- */
  var ACTIVIDAD = [
    { id: 'sedentario', f: 1.2, t: 'Sedentario', d: 'Poco o nada de ejercicio, trabajo sentado' },
    { id: 'ligero', f: 1.375, t: 'Ligero', d: 'Ejercicio suave 1 a 3 días por semana' },
    { id: 'moderado', f: 1.55, t: 'Moderado', d: 'Ejercicio 3 a 5 días por semana' },
    { id: 'alto', f: 1.725, t: 'Alto', d: 'Ejercicio intenso 6 a 7 días por semana' },
    { id: 'muy_alto', f: 1.9, t: 'Muy alto', d: 'Entrenamiento doble o trabajo físico exigente' }
  ];
  var DEFICIT = [
    { id: 'leve', k: 200, t: 'Leve', d: '200 kcal por debajo' },
    { id: 'moderado', k: 600, t: 'Moderado', d: '600 kcal por debajo' },
    { id: 'alto', k: 1000, t: 'Alto', d: '1000 kcal por debajo' }
  ];
  var MEALS = [['desayuno', 'Desayuno'], ['almuerzo', 'Almuerzo'], ['merienda', 'Merienda'], ['cena', 'Cena'], ['snack', 'Snack']];
  var MEAL_ICONS = {
    desayuno: '<path d="M4 9h12v4.5A5.5 5.5 0 0 1 10.5 19h-1A5.5 5.5 0 0 1 4 13.5V9z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H15.5"/><path d="M8 3.5c-.8 1 .8 2-.1 3M12 3.5c-.8 1 .8 2-.1 3"/>',
    almuerzo: '<path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v7a2 2 0 0 1-2 2M8 3v5"/><path d="M18 21V3c-2.2 1.2-3.5 4-3.5 7.5V14H18"/>',
    merienda: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9h.01M14.5 8.5h.01M15 14h.01M9.5 14.5h.01M12 11.5h.01"/>',
    cena: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    snack: '<path d="M12 7.5c-2-1.5-6.5-1.4-7.3 2.6-.8 4 1.3 9 4.3 9.9 1.2.3 2-.1 3-.6 1 .5 1.8.9 3 .6 3-.9 5.1-5.9 4.3-9.9C18.5 6.1 14 6 12 7.5z"/><path d="M12 7.5c0-2 .9-3.4 2.8-4"/>'
  };
  var ICON = {
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
    del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.6 3.2 2.4 4.8 4 6.6 1.5 1.7 2.5 3.4 2.5 5.6a6.5 6.5 0 0 1-13 0c0-2.3 1.1-4 2.4-5.3.2 1.6.9 2.8 2.1 3.4-.3-3.6.8-7.4 2-10.3z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>'
  };
  // Gramos de proteína por kg según actividad (se suma 0,2 por estar en déficit).
  var PROT_F = { sedentario: 1.2, ligero: 1.4, moderado: 1.6, alto: 1.8, muy_alto: 2.0 };
  var OFF_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

  /* ---------- Utilidades ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function fmt(n) { return Math.round(n).toLocaleString('es-PY'); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString('es-PY'); }
  function load(key, def) {
    try { var v = localStorage.getItem('calapp.' + key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem('calapp.' + key, JSON.stringify(val)); } catch (e) { toast('No se pudo guardar en este navegador'); }
  }
  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fromKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(k, n) { var d = fromKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
  function today() { return dateKey(new Date()); }
  var toastTimer, toastUndo = null;
  // Aviso breve; si recibe una función, muestra el botón «Deshacer».
  function toast(msg, undo) {
    var t = $('toast'), a = $('toastAct');
    $('toastMsg').textContent = msg;
    toastUndo = undo || null;
    a.hidden = !undo; a.textContent = 'Deshacer';
    t.classList.toggle('has-act', !!undo);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show', 'has-act'); toastUndo = null; }, undo ? 6000 : 2400);
  }
  $('toastAct').addEventListener('click', function () {
    var fn = toastUndo;
    toastUndo = null;
    $('toast').classList.remove('show', 'has-act');
    if (fn) { fn(); setTimeout(function () { toast('Listo, se deshizo'); }, 50); }
  });

  /* ---------- Cálculos ---------- */
  function calc(p) {
    var bmr = 10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === 'm' ? 5 : -161);
    var act = ACTIVIDAD.filter(function (a) { return a.id === p.actividad; })[0] || ACTIVIDAD[0];
    var def = DEFICIT.filter(function (d) { return d.id === p.deficit; })[0] || DEFICIT[0];
    var maint = Math.round(bmr * act.f);
    var h = p.altura / 100;
    var imc = p.peso / (h * h);
    var cat = imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad';
    var target = Math.max(0, maint - def.k);
    // Con sobrepeso se usa un peso de referencia ajustado (IMC 25 + 40 % del exceso) para no sobreestimar la proteína.
    var ideal = 25 * h * h;
    var ref = p.peso > ideal ? ideal + 0.4 * (p.peso - ideal) : p.peso;
    var pf = Math.min(2.2, (PROT_F[act.id] || 1.4) + 0.2);
    var protRec = Math.round(ref * pf / 5) * 5;
    var prot = p.protManual || protRec;
    var fatG = Math.round(target * 0.27 / 9);
    var carbG = Math.max(0, Math.round((target - prot * 4 - fatG * 9) / 4));
    return {
      bmr: Math.round(bmr), maint: maint, def: def, target: target, imc: imc, cat: cat, min: p.sexo === 'm' ? 1500 : 1200,
      ref: Math.round(ref), pf: pf, protRec: protRec, prot: prot, fatG: fatG, carbG: carbG
    };
  }

  /* ---------- Interpretar el texto ("3 huevos revueltos") ---------- */
  var NUM_WORDS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, medio: 0.5, media: 0.5 };
  var UNITS = {
    g: 'g', gr: 'g', grs: 'g', gramo: 'g', gramos: 'g', kg: 'kg', kilo: 'kg', kilos: 'kg',
    ml: 'ml', cc: 'ml', l: 'l', litro: 'l', litros: 'l',
    taza: 'taza', tazas: 'taza', vaso: 'vaso', vasos: 'vaso',
    cucharada: 'cucharada', cucharadas: 'cucharada', cda: 'cucharada', cdas: 'cucharada',
    cucharadita: 'cucharadita', cucharaditas: 'cucharadita', cdta: 'cucharadita', cdtas: 'cucharadita',
    unidad: 'u', unidades: 'u', porcion: 'u', porciones: 'u', rebanada: 'u', rebanadas: 'u', feta: 'u', fetas: 'u',
    rodaja: 'u', rodajas: 'u', lata: 'u', latas: 'u', pote: 'u', potes: 'u', plato: 'plato', platos: 'plato'
  };
  var STOP = { de: 1, del: 1, con: 1, la: 1, el: 1, los: 1, las: 1, al: 1, a: 1, en: 1, y: 1, un: 1, una: 1 };

  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.,\/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function tokens(s) {
    return norm(s).replace(/[.,\/]/g, ' ').split(' ').filter(function (w) { return w && !STOP[w]; });
  }
  function parseNum(w) {
    if (NUM_WORDS[w] != null) return NUM_WORDS[w];
    var m = /^(\d+)\/(\d+)$/.exec(w);
    if (m && +m[2]) return +m[1] / +m[2];
    if (/^\d+([.,]\d+)?$/.test(w)) return parseFloat(w.replace(',', '.'));
    return null;
  }
  function parseQuery(text) {
    var words = norm(text).replace(/(\d)([a-z])/g, '$1 $2').split(' ').filter(Boolean);
    var qty = null, unit = null, i = 0;
    if (words.length > 1) {
      var n = parseNum(words[0]);
      if (n != null && n > 0) {
        qty = n; i = 1;
        // "1 y media", "2 y medio"
        if (words[1] === 'y' && (words[2] === 'media' || words[2] === 'medio')) { qty += 0.5; i = 3; }
      }
    }
    if (words.length > i + 1 && UNITS[words[i]]) { unit = UNITS[words[i]]; i++; if (qty == null) qty = 1; }
    if (words[i] === 'de' && words.length > i + 1) i++;
    return { qty: qty, unit: unit, name: words.slice(i).join(' ') };
  }

  function wordScore(a, b) {
    if (a === b) return 1;
    var s = a.length < b.length ? a : b, l = a.length < b.length ? b : a;
    if (s.length >= 3 && l.indexOf(s) === 0 && l.length - s.length <= 2) return 0.9; // plurales
    if (s.length >= 4 && l.indexOf(s) === 0) return 0.5;
    if (s.length >= 4) { // errores de tipeo
      var d = editDist(a, b, 2);
      if (d === 1) return 0.8;
      if (d === 2 && s.length >= 7) return 0.65;
    }
    return 0;
  }
  function editDist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, k;
    for (k = 0; k <= b.length; k++) prev[k] = k;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      var rowMin = i;
      for (k = 1; k <= b.length; k++) {
        cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
        if (i > 1 && k > 1 && a[i - 1] === b[k - 2] && a[i - 2] === b[k - 1]) cur[k] = Math.min(cur[k], prev2[k - 2] + 1);
        rowMin = Math.min(rowMin, cur[k]);
      }
      if (rowMin > max) return max + 1;
      var prev2 = prev; prev = cur;
    }
    return prev[b.length];
  }
  function phraseScore(qt, pt) {
    if (!qt.length || !pt.length) return 0;
    var sum = 0;
    qt.forEach(function (q) {
      var best = 0;
      pt.forEach(function (w) { best = Math.max(best, wordScore(q, w)); });
      sum += best;
    });
    return (sum / qt.length) * 0.7 + (sum / Math.max(pt.length, qt.length)) * 0.3;
  }
  function indexOf(list) {
    return list.map(function (f) { return { f: f, phrases: [f.n].concat(f.a || []).map(tokens) }; });
  }
  var INDEX = indexOf(window.FOODS || []);
  function rankScored(index, qt, limit, min) {
    return index.map(function (it) {
      var best = 0;
      it.phrases.forEach(function (p) { best = Math.max(best, phraseScore(qt, p)); });
      return { f: it.f, s: best };
    }).filter(function (r) { return r.s >= min; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, limit);
  }
  function foodsOf(list) { return list.map(function (r) { return r.f; }); }
  function searchLocal(name) {
    var qt = tokens(name);
    return foodsOf(rankScored(indexOf(myFoods), qt, 4, 0.5)).concat(foodsOf(rankScored(INDEX, qt, 6, 0.5)));
  }
  function bestScore(name) {
    var qt = tokens(name);
    var r = rankScored(indexOf(myFoods), qt, 1, 0).concat(rankScored(INDEX, qt, 1, 0));
    return r.reduce(function (m, x) { return Math.max(m, x.s); }, 0);
  }

  /* Combinaciones: "pan con queso", "arroz, pollo y ensalada" */
  var SPLIT_RE = /\s*(?:,|\bcon\b|\bmas\b|\by\b(?!\s+medi[oa]\b))\s*/;
  function buildCombo(text) {
    var pieces = norm(String(text).replace(/\+/g, ',')).split(SPLIT_RE).map(function (s) { return s.trim(); }).filter(Boolean);
    if (pieces.length < 2) return null;
    var parts = [], missing = [], myIndex = indexOf(myFoods);
    pieces.forEach(function (piece) {
      var pq = parseQuery(piece);
      if (!pq.name) pq = { qty: null, unit: null, name: piece };
      var qt = tokens(pq.name);
      var cands = foodsOf(rankScored(myIndex, qt, 2, 0.6).concat(rankScored(INDEX, qt, 4, 0.6)));
      if (!cands.length) { missing.push(pq.name); return; }
      parts.push({ cands: cands, i: 0, qty: pq.qty, unit: pq.unit, grams: Math.max(1, Math.round(gramsFor(cands[0], pq.qty, pq.unit))) });
    });
    if (!parts.length) return null;
    var title = String(text).trim();
    return { combo: 1, n: title.charAt(0).toUpperCase() + title.slice(1), parts: parts, missing: missing };
  }
  function comboTotals(cb) {
    return cb.parts.reduce(function (t, pt) {
      var m = macrosFor(pt.cands[pt.i], pt.grams || 0);
      t.k += m.k; t.p += m.p; t.c += m.c; t.f += m.f; return t;
    }, { k: 0, p: 0, c: 0, f: 0 });
  }

  // Convierte cantidad + unidad en gramos para un alimento dado.
  function gramsFor(food, qty, unit) {
    var m = food.m || {};
    var q = qty == null ? 1 : qty;
    if (food.po) return (unit && unit !== 'u' && unit !== 'plato' ? 1 : q) * 100; // 100 = 1 porción
    switch (unit) {
      case 'g': case 'ml': return q;
      case 'kg': case 'l': return q * 1000;
      case 'taza': return q * (m.taza || (food.liq ? 240 : 150));
      case 'vaso': return q * 200;
      case 'cucharada': return q * (m.cucharada || 15);
      case 'cucharadita': return q * (m.cucharadita || 5);
      case 'plato': return q * (food.un === 'plato' ? food.u : 250);
      case 'u': return q * (food.u || 100);
      default:
        if (food.u) return q * food.u;
        // Untables y condimentos densos: por defecto, una cucharada
        if (m.cucharada && !m.taza && food.k >= 250 && (qty == null || qty < 15)) return q * m.cucharada;
        if (qty == null) return food.liq ? 200 : 100;
        return qty >= 15 ? qty : qty * 100; // "150 arroz" se toma como gramos
    }
  }

  /* ---------- Búsqueda en internet (Open Food Facts) ---------- */
  var searchSeq = 0;
  function searchOnline(name) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 20000);
    var url = OFF_URL + '?search_terms=' + encodeURIComponent(name) +
      '&search_simple=1&action=process&json=1&page_size=12&lc=es' +
      '&fields=product_name,product_name_es,brands,nutriments,serving_quantity';
    return fetch(url, { signal: ctrl.signal }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      clearTimeout(timer);
      var seen = {};
      return (data.products || []).map(function (p) {
        var n = p.nutriments || {};
        var k = n['energy-kcal_100g'];
        if (k == null && n['energy_100g'] != null) k = n['energy_100g'] / 4.184;
        var title = (p.product_name_es || p.product_name || '').trim();
        if (!title || k == null || isNaN(+k)) return null;
        var key = norm(title + '|' + (p.brands || ''));
        if (seen[key]) return null;
        seen[key] = 1;
        var serving = parseFloat(p.serving_quantity);
        return {
          n: title, brand: (p.brands || '').split(',')[0].trim(), online: 1,
          k: +k, p: +n.proteins_100g || 0, c: +n.carbohydrates_100g || 0, f: +n.fat_100g || 0,
          u: serving > 0 && serving < 2000 ? serving : 0
        };
      }).filter(Boolean).slice(0, 8);
    }, function (err) { clearTimeout(timer); throw err; });
  }

  /* ---------- Estado ---------- */
  var profile = load('profile', null);
  var log = load('log', {});
  var weights = load('weights', {});
  var favs = load('favs', []);
  var myFoods = load('myfoods', []);
  var day = today();
  var view = 'day';
  var curMeal = defaultMeal();
  var editingId = null;
  var fresh = {};           // ids recién agregados, para resaltarlos
  var ringMode = load('ring', 'left');
  var summaryVisible = true;
  var results = { local: [], online: [], state: 'idle', parsed: null };
  var sel = null; // { food, grams }

  function entries(k) { return log[k] || []; }
  function totals(k) {
    return entries(k).reduce(function (t, e) {
      t.k += e.k; t.p += e.p; t.c += e.c; t.f += e.f; return t;
    }, { k: 0, p: 0, c: 0, f: 0 });
  }
  function macrosFor(food, grams) {
    var r = grams / 100;
    return { k: food.k * r, p: food.p * r, c: food.c * r, f: food.f * r };
  }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function mealName(id) { var m = MEALS.filter(function (x) { return x[0] === id; })[0]; return m ? m[1] : id; }
  function mealIcon(id) { return '<svg class="mi" viewBox="0 0 24 24" aria-hidden="true">' + (MEAL_ICONS[id] || '') + '</svg>'; }
  function addEntry(e) {
    e.id = newId();
    if (!e.meal) e.meal = curMeal;
    var k = day;
    (log[k] = log[k] || []).push(e);
    save('log', log);
    fresh = {}; fresh[e.id] = 1;
    renderDay();
    toast('Agregado a ' + mealName(e.meal).toLowerCase() + ': ' + e.name, function () { removeEntries(k, [e.id]); });
  }
  function removeEntries(k, ids) {
    log[k] = entries(k).filter(function (e) { return ids.indexOf(e.id) < 0; });
    if (!log[k].length) delete log[k];
    save('log', log);
    refresh();
  }
  function defaultMeal() {
    var h = new Date().getHours();
    return h < 11 ? 'desayuno' : h < 15 ? 'almuerzo' : h < 19 ? 'merienda' : 'cena';
  }
  function refresh() {
    if (!profile) return;
    if (view === 'day') renderDay(); else if (view === 'progress') renderProgress();
  }

  /* ---------- Tema ---------- */
  function currentTheme() {
    return document.documentElement.dataset.theme ||
      (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  $('btnTheme').addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('calapp.theme', next); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = next === 'dark' ? '#121311' : '#f6f3ee';
    refresh();
  });

  /* ---------- Navegación entre secciones ---------- */
  function setView(v) {
    view = v;
    $('viewSetup').hidden = v !== 'profile';
    $('viewDay').hidden = v !== 'day';
    $('viewProgress').hidden = v !== 'progress';
    var hasTabs = !!profile;
    $('tabs').hidden = !hasTabs;
    document.body.classList.toggle('has-tabs', hasTabs);
    [].forEach.call(document.querySelectorAll('.tab'), function (b) {
      if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (v === 'day') summaryVisible = true;
    if (v === 'profile') fillSetup();
    else if (v === 'day') renderDay();
    else renderProgress();
    updateMini();
    window.scrollTo(0, 0);
  }
  $('tabs').addEventListener('click', function (ev) {
    var b = ev.target.closest('.tab');
    if (b && profile) setView(b.dataset.view);
  });

  /* ---------- Datos iniciales / Perfil ---------- */
  var form = $('formSetup');
  $('optActividad').innerHTML = ACTIVIDAD.map(function (a) {
    return '<label><input type="radio" name="actividad" value="' + a.id + '"><span class="opt"><b>' + a.t + '</b><small>' + a.d + '</small></span></label>';
  }).join('');
  $('optDeficit').innerHTML = DEFICIT.map(function (d) {
    return '<label><input type="radio" name="deficit" value="' + d.id + '"><span class="opt"><b>' + d.t + '</b><small>' + d.d + '</small></span></label>';
  }).join('');

  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function readForm() {
    var fd = new FormData(form);
    return {
      sexo: fd.get('sexo'), edad: parseFloat(fd.get('edad')), peso: parseFloat(fd.get('peso')),
      altura: parseFloat(fd.get('altura')), actividad: fd.get('actividad'), deficit: fd.get('deficit'),
      pesoMeta: num(fd.get('pesoMeta')), protManual: num(fd.get('protManual'))
    };
  }
  function validate(p) {
    if (!p.sexo) return 'Elegí el sexo.';
    if (!(p.edad >= 14 && p.edad <= 100)) return 'Ingresá una edad entre 14 y 100 años.';
    if (!(p.peso >= 30 && p.peso <= 300)) return 'Ingresá un peso entre 30 y 300 kg.';
    if (!(p.altura >= 120 && p.altura <= 230)) return 'Ingresá la altura en centímetros (entre 120 y 230).';
    if (!p.actividad) return 'Elegí tu nivel de actividad física.';
    if (!p.deficit) return 'Elegí el déficit calórico.';
    if (p.pesoMeta != null && !(p.pesoMeta >= 30 && p.pesoMeta <= 300)) return 'El peso meta tiene que estar entre 30 y 300 kg.';
    if (p.protManual != null && !(p.protManual >= 20 && p.protManual <= 400)) return 'La proteína por día tiene que estar entre 20 y 400 g.';
    return '';
  }
  function renderPreview() {
    var p = readForm();
    var box = $('setupPreview');
    $('setupError').hidden = true;
    $('protHelp').textContent = '';
    if (!(p.peso >= 30 && p.altura >= 120)) { box.innerHTML = ''; return; }
    var h = p.altura / 100, imc = p.peso / (h * h);
    var html = '<div><dt>IMC</dt><dd>' + fmt1(imc) + '<small>' +
      (imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad') + '</small></dd></div>';
    if (p.sexo && p.edad >= 14 && p.actividad) {
      var c = calc({ sexo: p.sexo, edad: p.edad, peso: p.peso, altura: p.altura, actividad: p.actividad, deficit: p.deficit || 'leve' });
      html += '<div><dt>Mantenimiento</dt><dd>' + fmt(c.maint) + '<small>kcal por día</small></dd></div>';
      if (p.deficit) html += '<div><dt>Tu objetivo</dt><dd>' + fmt(c.target) + '<small>kcal por día</small></dd></div>';
      $('protHelp').textContent = 'Proteína recomendada para vos: ' + fmt(c.protRec) + ' g por día (' + fmt1(c.pf) + ' g por kg' +
        (c.ref < p.peso - 0.5 ? ' de un peso de referencia de ' + fmt(c.ref) + ' kg' : '') +
        '), según tu actividad y el déficit. Dejá el campo vacío para usar este valor.';
    }
    box.innerHTML = html;
  }
  form.addEventListener('input', renderPreview);
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var p = readForm(), err = validate(p);
    if (err) { $('setupError').textContent = err; $('setupError').hidden = false; return; }
    profile = p; save('profile', p);
    var wl = weightList();
    if (!wl.length || wl[wl.length - 1].v !== p.peso) { weights[today()] = p.peso; save('weights', weights); }
    setView('day');
  });
  $('btnCancelSetup').addEventListener('click', function () { setView('day'); });

  function fillSetup() {
    $('btnCancelSetup').hidden = !profile;
    $('setupEyebrow').textContent = profile ? 'Perfil' : 'Primer paso';
    $('setupTitle').textContent = profile ? 'Tus datos' : 'Contanos sobre vos';
    $('setupLead').textContent = profile
      ? 'Si cambian tus datos o tus metas, actualizalos acá. El objetivo de calorías se recalcula solo.'
      : 'Con estos datos calculamos tu IMC, tus calorías de mantenimiento y tu objetivo diario.';
    if (profile) {
      ['edad', 'peso', 'altura'].forEach(function (k) { form.elements[k].value = profile[k]; });
      ['pesoMeta', 'protManual'].forEach(function (k) { form.elements[k].value = profile[k] != null ? profile[k] : ''; });
      ['sexo', 'actividad', 'deficit'].forEach(function (k) {
        var r = form.querySelector('input[name="' + k + '"][value="' + profile[k] + '"]');
        if (r) r.checked = true;
      });
    }
    renderPreview();
    renderBackup();
  }

  /* ---------- Copia de seguridad ---------- */
  function plural(n, a, b) { return fmt(n) + ' ' + (n === 1 ? a : b); }
  function renderBackup() {
    var days = Object.keys(log).length, nw = Object.keys(weights).length;
    var last = load('lastBackup', null);
    $('bkInfo').textContent = (days || nw || myFoods.length)
      ? 'Tenés ' + plural(days, 'día', 'días') + ' con comidas, ' + plural(nw, 'registro', 'registros') + ' de peso y ' +
        plural(myFoods.length, 'alimento propio', 'alimentos propios') + '. ' +
        (last ? 'Última copia descargada: ' + fromKey(last).toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric' }) + '.'
          : 'Todavía no descargaste ninguna copia.')
      : 'Si ya usabas Cal en otro dispositivo, restaurá tu copia desde acá.';
    $('btnExport').disabled = !profile;
  }
  $('btnExport').addEventListener('click', function () {
    var data = { app: 'calapp', version: 2, exported: new Date().toISOString(), profile: profile, log: log, weights: weights, favs: favs, myfoods: myFoods };
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cal-copia-' + today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    save('lastBackup', today());
    renderBackup();
    toast('Copia descargada');
  });
  $('btnImport').addEventListener('click', function () { $('fileImport').click(); });
  $('fileImport').addEventListener('change', function () {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var d;
      try {
        d = JSON.parse(reader.result);
        if (!d || d.app !== 'calapp' || typeof d.log !== 'object' || (d.profile && validate(d.profile))) throw new Error('formato');
      } catch (e) { toast('Ese archivo no es una copia válida de Cal'); return; }
      var n = Object.keys(d.log || {}).length;
      var when = d.exported ? new Date(d.exported).toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      if (!window.confirm('¿Restaurar la copia' + (when ? ' del ' + when : '') + ' con ' + plural(n, 'día registrado', 'días registrados') +
        '?\n\nReemplaza todos los datos actuales de este navegador.')) return;
      profile = d.profile || null; log = d.log || {}; weights = d.weights || {};
      favs = Array.isArray(d.favs) ? d.favs : []; myFoods = Array.isArray(d.myfoods) ? d.myfoods : [];
      save('profile', profile); save('log', log); save('weights', weights); save('favs', favs); save('myfoods', myFoods);
      day = today(); editingId = null;
      if (profile) { syncProfileWeight(); setView('day'); } else setView('profile');
      toast('Copia restaurada');
    };
    reader.readAsText(file);
  });

  /* ---------- Panel del día ---------- */
  var RING = 2 * Math.PI * 84, RING2 = 2 * Math.PI * 66;
  function renderDay() {
    var c = calc(profile), t = totals(day), isToday = day === today();
    var d = fromKey(day);
    $('dayTitle').textContent = isToday ? 'Hoy' : day === addDays(today(), -1) ? 'Ayer' :
      d.toLocaleDateString('es-PY', { day: 'numeric', month: 'long' });
    $('daySub').textContent = d.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('btnNext').disabled = isToday;

    var over = t.k > c.target, left = c.target - t.k;
    var pct = c.target ? Math.min(1, t.k / c.target) : 0;
    var arc = $('ringArc');
    arc.style.strokeDasharray = RING;
    arc.style.strokeDashoffset = RING * (1 - pct);
    arc.style.visibility = t.k > 0 ? 'visible' : 'hidden';
    var pr = $('ringProt'), pp = c.prot ? Math.min(1, t.p / c.prot) : 0;
    pr.style.strokeDasharray = RING2;
    pr.style.strokeDashoffset = RING2 * (1 - pp);
    pr.style.visibility = t.p > 0 ? 'visible' : 'hidden';
    $('summary').classList.toggle('is-over', over);
    if (ringMode === 'left') {
      $('kcalNow').textContent = fmt(Math.abs(left));
      $('kcalOf').textContent = over ? 'kcal de más' : 'kcal restantes';
      $('kcalSub').textContent = fmt(t.k) + ' de ' + fmt(c.target) + ' consumidas';
    } else {
      $('kcalNow').textContent = fmt(t.k);
      $('kcalOf').textContent = 'de ' + fmt(c.target) + ' kcal';
      $('kcalSub').textContent = over ? fmt(-left) + ' de más' : fmt(left) + ' restantes';
    }
    $('ringLabel').textContent = fmt(t.k) + ' de ' + fmt(c.target) + ' kilocalorías consumidas. Anillo interior: proteína, ' +
      fmt(t.p) + ' de ' + fmt(c.prot) + ' gramos.';
    $('statusLine').innerHTML = over
      ? 'Te pasaste por <b>' + fmt(-left) + ' kcal</b> del objetivo' +
        (t.k <= c.maint ? ', pero seguís por debajo del mantenimiento.' : '.')
      : t.k === 0 ? 'Tenés <b>' + fmt(left) + ' kcal</b> disponibles ' + (isToday ? 'para hoy.' : 'este día.')
      : 'Te quedan <b>' + fmt(left) + ' kcal</b> para llegar a tu objetivo.';
    $('stMaint').innerHTML = fmt(c.maint) + '<small>kcal por día</small>';
    $('stDef').innerHTML = '−' + fmt(c.def.k) + '<small>' + c.def.t + '</small>';
    $('stImc').innerHTML = fmt1(c.imc) + '<small>' + c.cat + '</small>';

    $('macros').innerHTML = [['Proteína', t.p, c.prot, '--p'], ['Carbohidratos', t.c, c.carbG, '--c'], ['Grasas', t.f, c.fatG, '--f']].map(function (m, i) {
      var w = m[2] ? Math.min(100, Math.round(m[1] / m[2] * 100)) : 0;
      return '<div class="macro' + (i === 0 && m[2] && m[1] >= m[2] * 0.95 ? ' done' : '') + '" style="--col:var(' + m[3] + ');--w:' + w + '%">' +
        '<span class="dot"></span>' + m[0] + '<br><strong>' + fmt(m[1]) + ' <span class="goal-g">/ ' + fmt(m[2]) + ' g</span></strong><i></i></div>';
    }).join('');

    var warn = $('lowWarn');
    warn.hidden = c.target >= c.min;
    if (!warn.hidden) {
      warn.textContent = 'Tu objetivo de ' + fmt(c.target) + ' kcal queda por debajo de las ' + fmt(c.min) +
        ' kcal diarias que suelen recomendarse como mínimo. Considerá un déficit menor o consultá con un profesional.';
    }
    renderMealPick();
    renderLog();
    renderQuick();
    updateMini();
  }
  $('ringCenter').addEventListener('click', function () {
    ringMode = ringMode === 'left' ? 'eaten' : 'left';
    save('ring', ringMode);
    renderDay();
  });

  /* Barra compacta en el encabezado */
  function updateMini() {
    var show = view === 'day' && !!profile && !summaryVisible;
    $('top').classList.toggle('show-mini', show);
    $('mini').tabIndex = show ? 0 : -1;
    if (!profile) return;
    var c = calc(profile), t = totals(day), left = c.target - t.k, over = left < 0;
    $('miniDay').textContent = $('dayTitle').textContent;
    $('miniText').innerHTML = over ? '<b>' + fmt(-left) + '</b> kcal de más' : '<b>' + fmt(left) + '</b> kcal restantes';
    $('miniFill').style.width = (c.target ? Math.min(100, t.k / c.target * 100) : 0) + '%';
    $('mini').classList.toggle('is-over', over);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      summaryVisible = es[0].isIntersecting;
      updateMini();
    }, { rootMargin: '-72px 0px 0px 0px' }).observe($('summary'));
  }
  window.addEventListener('scroll', function () { $('top').classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
  $('mini').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* Elegir en qué comida se agrega */
  function renderMealPick() {
    $('mealPick').innerHTML = MEALS.map(function (m) {
      return '<button type="button" role="radio" aria-checked="' + (m[0] === curMeal) + '" data-meal="' + m[0] + '">' + mealIcon(m[0]) + m[1] + '</button>';
    }).join('');
    var add = $('edAdd');
    if (add) add.textContent = 'Agregar a ' + mealName(curMeal).toLowerCase();
  }
  $('mealPick').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-meal]');
    if (!b) return;
    curMeal = b.dataset.meal;
    renderMealPick();
  });

  /* Comidas del día */
  function renderLog() {
    var list = entries(day), isToday = day === today();
    renderCopyBar(isToday);
    $('logHint').textContent = list.length ? 'Tocá una comida para editarla' : '';
    if (!list.length) {
      $('log').innerHTML = '<p class="empty"><b>Todavía no registraste nada</b>Escribí arriba lo que comiste para empezar.</p>';
      return;
    }
    $('log').innerHTML = MEALS.map(function (m) {
      var items = list.filter(function (e) { return e.meal === m[0]; });
      if (!items.length) return '';
      var sum = items.reduce(function (s, e) { return s + e.k; }, 0);
      return '<div class="meal"><div class="meal-head"><h3>' + mealIcon(m[0]) + m[1] + '</h3><span class="meal-head-r">' +
        (isToday ? '' : '<button type="button" class="pill" data-copy-meal="' + m[0] + '">' + ICON.copy + 'Copiar a hoy</button>') +
        '<span>' + fmt(sum) + ' kcal</span></span></div>' + items.map(entryRow).join('') + '</div>';
    }).join('');
    fresh = {};
  }
  function entryRow(e) {
    var open = editingId === e.id;
    return '<div class="entry' + (fresh[e.id] ? ' is-new' : '') + '">' +
      '<button type="button" class="entry-main editable" data-edit="' + e.id + '" aria-expanded="' + open + '" title="Editar">' +
      '<b>' + esc(e.name) + '</b>' + (e.det ? '<small class="det">' + esc(e.det) + '</small>' : '') + '<small>' +
      (e.x && e.x !== 1 && !e.g ? '× ' + fmt1(e.x) + ' · ' : '') +
      (e.g ? fmt(e.g) + ' g · ' : '') + 'P ' + fmt1(e.p) + ' · C ' + fmt1(e.c) + ' · G ' + fmt1(e.f) + '</small></button>' +
      '<span class="entry-k">' + fmt(e.k) + ' <small>kcal</small></span>' +
      starBtn(e) +
      '<button class="del" type="button" data-del="' + e.id + '" aria-label="Quitar ' + esc(e.name) + '">' + ICON.del + '</button></div>' +
      (open ? editForm(e) : '');
  }
  function editForm(e) {
    var byG = e.g > 0;
    return '<div class="entry-edit">' +
      '<label class="field"><span>' + (byG ? 'Cantidad' : 'Cantidad (× lo registrado)') + '</span><div class="input-unit">' +
      '<input id="eeAmt" type="number" inputmode="decimal" min="0" step="' + (byG ? '1' : '0.25') + '" value="' + (byG ? Math.round(e.g) : 1) + '">' +
      '<em>' + (byG ? (e.src === 'combo' ? 'g' : 'g') : '×') + '</em></div></label>' +
      '<label class="field"><span>Comida</span><select id="eeMeal">' + MEALS.map(function (m) {
        return '<option value="' + m[0] + '"' + (m[0] === e.meal ? ' selected' : '') + '>' + m[1] + '</option>';
      }).join('') + '</select></label>' +
      '<button type="button" class="btn ghost" data-ecancel>Cancelar</button>' +
      '<button type="button" class="btn primary" data-esave="' + e.id + '">Guardar</button>' +
      '<p class="preview-k" id="eePrev">' + previewText(e, 1) + '</p></div>';
  }
  function findEntry(id) { return entries(day).filter(function (e) { return e.id === id; })[0]; }
  function editFactor(e) {
    var v = parseFloat($('eeAmt').value);
    if (!(v > 0)) return 0;
    return e.g > 0 ? v / e.g : v;
  }
  function previewText(e, f) {
    return f > 0 ? 'Queda en ' + fmt(e.k * f) + ' kcal · P ' + fmt1(e.p * f) + ' · C ' + fmt1(e.c * f) + ' · G ' + fmt1(e.f * f) : 'Ingresá una cantidad válida';
  }
  function saveEdit(id) {
    var e = findEntry(id);
    if (!e) return;
    var f = editFactor(e);
    if (!(f > 0)) { toast('Ingresá una cantidad válida'); return; }
    var before = JSON.parse(JSON.stringify(e)), k = day;
    if (Math.abs(f - 1) > 1e-9) {
      e.k = Math.round(e.k * f); e.p = +(e.p * f).toFixed(1); e.c = +(e.c * f).toFixed(1); e.f = +(e.f * f).toFixed(1);
      if (e.g) e.g = Math.round(e.g * f); else e.x = +((e.x || 1) * f).toFixed(2);
    }
    e.meal = $('eeMeal').value;
    save('log', log);
    editingId = null; fresh = {}; fresh[e.id] = 1;
    renderDay();
    toast('Comida actualizada', function () {
      log[k] = entries(k).map(function (x) { return x.id === before.id ? before : x; });
      save('log', log); refresh();
    });
  }
  function deleteEntry(id) {
    var k = day, list = entries(k), idx = -1;
    list.forEach(function (e, i) { if (e.id === id) idx = i; });
    if (idx < 0) return;
    var e = list.splice(idx, 1)[0];
    if (!list.length) delete log[k];
    save('log', log);
    if (editingId === id) editingId = null;
    renderDay();
    toast('Quitado: ' + e.name, function () {
      var l = log[k] = log[k] || [];
      l.splice(Math.min(idx, l.length), 0, e);
      save('log', log); refresh();
    });
  }
  $('log').addEventListener('click', function (ev) {
    var s = ev.target.closest('[data-fav]');
    if (s) {
      var item = findEntry(s.dataset.fav);
      if (item) toggleFav(item);
      return;
    }
    var ed = ev.target.closest('[data-edit]');
    if (ed) {
      editingId = editingId === ed.dataset.edit ? null : ed.dataset.edit;
      renderLog();
      var inp = $('eeAmt');
      if (inp) { inp.focus(); inp.select(); }
      return;
    }
    if (ev.target.closest('[data-ecancel]')) { editingId = null; renderLog(); return; }
    var sv = ev.target.closest('[data-esave]');
    if (sv) { saveEdit(sv.dataset.esave); return; }
    var cm = ev.target.closest('[data-copy-meal]');
    if (cm) { copyEntries(day, cm.dataset.copyMeal, today()); return; }
    var b = ev.target.closest('[data-del]');
    if (b) deleteEntry(b.dataset.del);
  });
  $('log').addEventListener('input', function (ev) {
    if (ev.target.id !== 'eeAmt') return;
    var e = findEntry(editingId);
    if (e) $('eePrev').textContent = previewText(e, editFactor(e));
  });
  $('log').addEventListener('keydown', function (ev) {
    if (!editingId || !ev.target.closest('.entry-edit')) return;
    if (ev.key === 'Enter' && ev.target.id === 'eeAmt') { ev.preventDefault(); saveEdit(editingId); }
    if (ev.key === 'Escape') { editingId = null; renderLog(); }
  });
  $('btnPrev').addEventListener('click', function () { day = addDays(day, -1); editingId = null; renderDay(); });
  $('btnNext').addEventListener('click', function () { if (day < today()) { day = addDays(day, 1); editingId = null; renderDay(); } });

  /* Repetir comidas */
  function copyEntries(from, meal, to) {
    var src = entries(from).filter(function (e) { return !meal || e.meal === meal; });
    if (!src.length) return;
    var dest = log[to] = log[to] || [], ids = [];
    fresh = {};
    src.forEach(function (e) {
      var c = JSON.parse(JSON.stringify(e));
      c.id = newId(); c.src = 'copia';
      ids.push(c.id); fresh[c.id] = 1; dest.push(c);
    });
    save('log', log);
    day = to; editingId = null;
    renderDay();
    if (from !== to) window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Copiado a hoy: ' + (meal ? mealName(meal).toLowerCase() : 'todo el día') + ' (' + plural(ids.length, 'comida', 'comidas') + ')',
      function () { removeEntries(to, ids); });
  }
  function renderCopyBar(isToday) {
    var bar = $('copyBar'), html = '';
    if (isToday) {
      var y = addDays(day, -1), ye = entries(y);
      var meals = MEALS.filter(function (m) { return ye.some(function (e) { return e.meal === m[0]; }); });
      if (meals.length) {
        html = '<span>Repetir de ayer:</span>' + meals.map(function (m) {
          return '<button type="button" class="pill" data-copy-from="' + y + '" data-copy-m="' + m[0] + '">' + mealIcon(m[0]) + m[1] + '</button>';
        }).join('') + (meals.length > 1 ? '<button type="button" class="pill" data-copy-from="' + y + '">' + ICON.copy + 'Todo el día</button>' : '');
      }
    } else if (entries(day).length) {
      html = '<span>¿Comiste lo mismo hoy?</span><button type="button" class="pill" data-copy-from="' + day + '">' + ICON.copy + 'Copiar todo el día a hoy</button>';
    }
    bar.innerHTML = html;
    bar.hidden = !html;
  }
  $('copyBar').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-copy-from]');
    if (b) copyEntries(b.dataset.copyFrom, b.dataset.copyM || null, today());
  });

  /* ---------- Buscar y agregar ---------- */
  $('formSearch').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var text = $('q').value.trim();
    if (!text) return;
    var parsed = parseQuery(text);
    if (!parsed.name) { parsed = { qty: null, unit: null, name: norm(text) }; }
    var seq = ++searchSeq;
    results = { parsed: parsed, local: searchLocal(parsed.name), online: [], state: 'loading', combo: null };
    // Si no hay un alimento que coincida con todo el texto, se calcula sumando sus partes.
    if (bestScore(parsed.name) < 0.9) results.combo = buildCombo(text);
    sel = null;
    if (results.combo) selectCombo(); else if (results.local.length) select(results.local[0]); else renderResults();
    searchOnline(parsed.name).then(function (items) {
      if (seq !== searchSeq) return;
      results.online = items; results.state = 'done';
      if (!sel && items.length) select(items[0]); else renderResults();
    }, function () {
      if (seq !== searchSeq) return;
      results.state = 'error'; renderResults();
    });
  });

  function all() { return results.local.concat(results.online); }
  function selectCombo() {
    sel = { combo: results.combo };
    renderResults();
    renderEditor();
  }
  function select(food) {
    var pq = results.parsed;
    sel = { food: food, grams: Math.max(1, Math.round(gramsFor(food, pq.qty, pq.unit))) };
    renderResults();
    renderEditor();
  }
  function resRow(food, i) {
    var pq = results.parsed;
    var g = Math.max(1, Math.round(gramsFor(food, pq.qty, pq.unit)));
    return '<button type="button" class="res" data-i="' + i + '" aria-pressed="' + (sel && sel.food === food) + '">' +
      '<span class="res-name">' + esc(food.n) + (food.brand ? '<small>' + esc(food.brand) + '</small>' : '') + '</span>' +
      '<span class="res-k">' + amountText(food, g) + ' · ' + fmt(food.k * g / 100) + ' kcal</span></button>';
  }
  function amountText(food, g) {
    if (food.po) { var n = g / 100; return fmt1(n) + (n === 1 ? ' porción' : ' porciones'); }
    return fmt(g) + (food.liq ? ' ml' : ' g');
  }
  function renderResults() {
    var html = '', n = results.local.length, mine = '', common = '', cb = results.combo;
    if (cb) {
      html += '<h3>Calculado sumando sus partes</h3><button type="button" class="res" data-combo aria-pressed="' + !!(sel && sel.combo) + '">' +
        '<span class="res-name">' + esc(cb.n) + '<small>' + cb.parts.map(function (pt) { return esc(pt.cands[pt.i].n); }).join(' + ') + '</small></span>' +
        '<span class="res-k">' + fmt(comboTotals(cb).k) + ' kcal</span></button>';
    }
    results.local.forEach(function (f, i) { if (f.mine) mine += resRow(f, i); else common += resRow(f, i); });
    if (mine) html += '<h3>Mis alimentos</h3>' + mine;
    if (common) html += '<h3>Alimentos comunes</h3>' + common;
    if (results.state === 'loading') html += '<p class="hint"><span class="spinner"></span>Buscando en internet…</p>';
    else if (results.state === 'error') html += '<p class="hint">No se pudo consultar internet en este momento.' + (n ? '' : ' Podés cargar las calorías a mano.') + '</p>';
    else if (results.state === 'done') {
      if (results.online.length) html += '<h3>De internet · Open Food Facts</h3>' + results.online.map(function (f, i) { return resRow(f, n + i); }).join('');
      else if (!n && !cb) html += '<p class="hint">No encontramos ese alimento. Probá con otro nombre o crealo vos con sus calorías.</p>';
    }
    if (results.state !== 'loading' && results.parsed) {
      html += '<button type="button" class="link" data-create>¿No está? Crear «' + esc(results.parsed.name) + '»</button>';
    }
    $('results').innerHTML = html;
    if (!sel) $('editor').hidden = true;
  }
  $('results').addEventListener('click', function (ev) {
    if (ev.target.closest('[data-create]')) { openManual(results.parsed.name); return; }
    if (ev.target.closest('[data-combo]')) { selectCombo(); return; }
    var b = ev.target.closest('[data-i]');
    if (b) select(all()[+b.dataset.i]);
  });

  function addBtn() { return '<button id="edAdd" class="btn primary" type="button">Agregar a ' + mealName(curMeal).toLowerCase() + '</button>'; }
  function renderComboEditor() {
    var cb = sel.combo;
    $('editor').innerHTML = '<p class="editor-title">' + esc(cb.n) + '</p>' +
      '<div class="combo">' + cb.parts.map(function (pt, i) {
        var f = pt.cands[pt.i];
        return '<div class="combo-row">' +
          '<label class="field"><span>Ingrediente ' + (i + 1) + '</span><select data-part="' + i + '">' + pt.cands.map(function (c, k) {
            return '<option value="' + k + '"' + (k === pt.i ? ' selected' : '') + '>' + esc(c.n) + (c.mine ? ' (mío)' : '') + '</option>';
          }).join('') + '</select></label>' +
          '<label class="field"><span>' + (f.po ? 'Porciones' : 'Cantidad') + '</span><div class="input-unit"><input data-pg="' + i + '" type="number" inputmode="decimal" min="0" step="' + (f.po ? '0.25' : '1') + '" value="' + (f.po ? pt.grams / 100 : pt.grams) + '"><em>' + (f.po ? '' : f.liq ? 'ml' : 'g') + '</em></div></label>' +
          '<span class="combo-k" data-pk="' + i + '"></span></div>';
      }).join('') + '</div>' +
      (cb.missing.length ? '<p class="hint">No encontramos ' + cb.missing.map(function (m) { return '«' + esc(m) + '»'; }).join(', ') +
        ', así que no está sumado. <button type="button" class="link inline" data-create-part="' + esc(cb.missing[0]) + '">Crear «' + esc(cb.missing[0]) + '»</button></p>' : '') +
      '<div class="editor-macros" id="edMacros"></div>' +
      '<div class="form-actions">' + addBtn() + '</div>';
    updateEditorMacros();
  }
  function renderEditor() {
    var ed = $('editor'), food = sel.food;
    ed.hidden = false;
    if (sel.combo) { renderComboEditor(); return; }
    ed.innerHTML = '<p class="editor-title">' + esc(food.n) + '</p>' +
      '<div class="editor-row">' +
      (food.po
        ? '<label class="field"><span>Porciones</span><input id="edGrams" type="number" inputmode="decimal" min="0.25" step="0.25" value="' + sel.grams / 100 + '"></label>'
        : '<label class="field"><span>Cantidad</span><div class="input-unit"><input id="edGrams" type="number" inputmode="decimal" min="1" step="1" value="' + sel.grams + '"><em>' + (food.liq ? 'ml' : 'g') + '</em></div></label>') +
      addBtn() + '</div>' +
      '<div class="editor-macros" id="edMacros"></div>';
    updateEditorMacros();
  }
  function updateEditorMacros() {
    if (sel.combo) {
      sel.combo.parts.forEach(function (pt, i) {
        var el = document.querySelector('[data-pk="' + i + '"]');
        if (el) el.textContent = fmt(macrosFor(pt.cands[pt.i], pt.grams || 0).k) + ' kcal';
      });
      var t = comboTotals(sel.combo);
      $('edMacros').innerHTML = '<span><strong>' + fmt(t.k) + '</strong> kcal en total</span>' +
        '<span>Proteína ' + fmt1(t.p) + ' g</span><span>Carbohidratos ' + fmt1(t.c) + ' g</span><span>Grasas ' + fmt1(t.f) + ' g</span>';
      var row = document.querySelector('.res[data-combo] .res-k');
      if (row) row.textContent = fmt(t.k) + ' kcal';
      return;
    }
    var m = macrosFor(sel.food, sel.grams || 0), food = sel.food;
    var unit = food.u && !food.po ? '<span>1 ' + esc(food.un || 'porción') + ' ≈ ' + fmt(food.u) + ' g</span>' : '';
    $('edMacros').innerHTML = '<span><strong>' + fmt(m.k) + '</strong> kcal</span>' +
      '<span>Proteína ' + fmt1(m.p) + ' g</span><span>Carbohidratos ' + fmt1(m.c) + ' g</span><span>Grasas ' + fmt1(m.f) + ' g</span>' + unit;
  }
  $('editor').addEventListener('input', function (ev) {
    var pg = ev.target.dataset && ev.target.dataset.pg;
    if (pg != null && sel && sel.combo) {
      var pt = sel.combo.parts[+pg];
      pt.grams = (parseFloat(ev.target.value) || 0) * (pt.cands[pt.i].po ? 100 : 1);
      updateEditorMacros();
      return;
    }
    if (ev.target.id !== 'edGrams') return;
    sel.grams = (parseFloat(ev.target.value) || 0) * (sel.food.po ? 100 : 1);
    updateEditorMacros();
  });
  $('editor').addEventListener('change', function (ev) {
    var pi = ev.target.dataset && ev.target.dataset.part;
    if (pi == null || !sel || !sel.combo) return;
    var pt = sel.combo.parts[+pi];
    pt.i = +ev.target.value;
    pt.grams = Math.max(1, Math.round(gramsFor(pt.cands[pt.i], pt.qty, pt.unit)));
    renderEditor(); renderResults();
  });
  function resetSearch() {
    searchSeq++; sel = null; results = { local: [], online: [], state: 'idle', parsed: null, combo: null };
    $('q').value = ''; renderResults();
  }
  function commitCombo() {
    var cb = sel.combo, t = comboTotals(cb);
    var used = cb.parts.filter(function (pt) { return pt.grams > 0; });
    if (!used.length) { toast('Ingresá una cantidad válida'); return; }
    resetSearch();
    addEntry({
      name: cb.n, meal: curMeal, src: 'combo',
      g: used.reduce(function (s, pt) { return s + (pt.cands[pt.i].po ? 0 : pt.grams); }, 0),
      det: used.map(function (pt) { var f = pt.cands[pt.i]; return f.n + ' ' + amountText(f, pt.grams); }).join(' + '),
      k: Math.round(t.k), p: +t.p.toFixed(1), c: +t.c.toFixed(1), f: +t.f.toFixed(1)
    });
  }
  function commitSelected() {
    if (sel && sel.combo) { commitCombo(); return; }
    if (!sel || !(sel.grams > 0)) { toast('Ingresá una cantidad válida'); return; }
    var m = macrosFor(sel.food, sel.grams);
    var por = sel.grams / 100, food = sel.food, grams = sel.grams;
    resetSearch();
    addEntry({
      name: food.n + (food.brand ? ' (' + food.brand + ')' : '') + (food.po && por !== 1 ? ' × ' + fmt1(por) : ''),
      g: food.po ? 0 : grams, meal: curMeal,
      k: Math.round(m.k), p: +m.p.toFixed(1), c: +m.c.toFixed(1), f: +m.f.toFixed(1), src: food.online ? 'off' : 'local'
    });
  }
  $('editor').addEventListener('click', function (ev) {
    if (ev.target.id === 'edAdd') commitSelected();
    var cp = ev.target.closest('[data-create-part]');
    if (cp) openManual(cp.dataset.createPart);
  });
  $('editor').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && (ev.target.id === 'edGrams' || ev.target.dataset.pg != null)) { ev.preventDefault(); commitSelected(); }
  });

  function openManual(name) {
    var f = $('formManual');
    f.hidden = false;
    f.elements.name.value = name ? name.charAt(0).toUpperCase() + name.slice(1) : $('q').value.trim();
    f.elements.name.focus();
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('btnManual').addEventListener('click', function () {
    var f = $('formManual');
    if (f.hidden) openManual(); else f.hidden = true;
  });
  $('formManual').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target, name = f.elements.name.value.trim(), k = parseFloat(f.elements.k.value);
    var g = parseFloat(f.elements.g.value) || 0;
    var p = parseFloat(f.elements.p.value) || 0, c = parseFloat(f.elements.c.value) || 0, fat = parseFloat(f.elements.f.value) || 0;
    if (!name || !(k >= 0)) { toast('Completá el nombre y las calorías'); return; }
    if (f.elements.keep.checked) {
      var r = g > 0 ? 100 / g : 1;
      var food = { id: Date.now().toString(36), n: name, mine: 1, k: k * r, p: p * r, c: c * r, f: fat * r };
      if (g > 0) { food.u = g; food.un = 'porción'; } else { food.po = 1; food.u = 100; food.un = 'porción'; }
      myFoods = myFoods.filter(function (m) { return norm(m.n) !== norm(name); });
      myFoods.push(food); save('myfoods', myFoods);
    }
    f.reset(); f.elements.keep.checked = true; f.hidden = true;
    resetSearch();
    addEntry({ name: name, g: g, meal: curMeal, k: Math.round(k), p: p, c: c, f: fat, src: 'manual' });
  });

  /* ---------- Favoritos y recientes ---------- */
  function itemKey(e) { return norm(e.name) + '|' + (e.g || 0) + '|' + e.k; }
  function isFav(e) { var k = itemKey(e); return favs.some(function (f) { return itemKey(f) === k; }); }
  function toggleFav(e) {
    var k = itemKey(e), was = isFav(e);
    if (was) favs = favs.filter(function (f) { return itemKey(f) !== k; });
    else favs.push({ name: e.name, g: e.g || 0, k: e.k, p: e.p, c: e.c, f: e.f, det: e.det });
    save('favs', favs);
    renderLog(); renderQuick();
    toast(was ? 'Quitado de favoritos' : 'Guardado en favoritos');
  }
  function starBtn(e) {
    var on = isFav(e);
    return '<button class="star" type="button" data-fav="' + e.id + '" aria-pressed="' + on + '" aria-label="' +
      (on ? 'Quitar de favoritos: ' : 'Guardar en favoritos: ') + esc(e.name) + '">' + ICON.star + '</button>';
  }
  // Recientes: un solo chip por alimento (el último registrado), sin repetir los favoritos.
  function recents() {
    var seen = {}, out = [];
    favs.forEach(function (f) { seen[norm(f.name)] = 1; });
    Object.keys(log).sort().reverse().some(function (k) {
      log[k].slice().reverse().forEach(function (e) {
        var key = norm(e.name);
        if (!seen[key] && out.length < 8) { seen[key] = 1; out.push(e); }
      });
      return out.length >= 8;
    });
    return out;
  }
  var quickItems = [];
  function chip(e, on) {
    var i = quickItems.push(e) - 1;
    return '<span class="chip"><button type="button" class="chip-add" data-q="' + i + '" aria-label="Agregar ' + esc(e.name) + '">' + esc(e.name) +
      '<small>' + (e.g ? fmt(e.g) + ' g · ' : '') + fmt(e.k) + ' kcal</small></button>' +
      '<button type="button" class="star" data-qfav="' + i + '" aria-pressed="' + on + '" aria-label="' +
      (on ? 'Quitar de favoritos: ' : 'Guardar en favoritos: ') + esc(e.name) + '">' + ICON.star + '</button></span>';
  }
  function renderQuick() {
    quickItems = [];
    var rec = recents(), html = '';
    if (favs.length) html += '<h3>Favoritos</h3><div class="chips">' + favs.map(function (f) { return chip(f, true); }).join('') + '</div>';
    if (rec.length) html += '<h3>Recientes</h3><div class="chips">' + rec.map(function (e) { return chip(e, isFav(e)); }).join('') + '</div>';
    if (myFoods.length) {
      var open = $('myFoods') && $('myFoods').open;
      html += '<details id="myFoods" class="myfoods"' + (open ? ' open' : '') + '><summary>Mis alimentos (' + myFoods.length + ')</summary><ul>' +
        myFoods.map(function (m) {
          var portion = m.po ? '1 porción' : fmt(m.u) + ' g';
          return '<li><span>' + esc(m.n) + '<small>' + portion + ' · ' + fmt(m.k * m.u / 100) + ' kcal</small></span>' +
            '<button type="button" class="del" data-myfood="' + m.id + '" aria-label="Borrar ' + esc(m.n) + ' de mis alimentos">' + ICON.del + '</button></li>';
        }).join('') + '</ul><p class="fine">Aparecen primero al buscar. Para cambiar uno, crealo de nuevo con el mismo nombre.</p></details>';
    }
    $('quick').innerHTML = html;
  }
  $('quick').addEventListener('click', function (ev) {
    var d = ev.target.closest('[data-myfood]');
    if (d) {
      var idx = -1;
      myFoods.forEach(function (m, i) { if (m.id === d.dataset.myfood) idx = i; });
      if (idx < 0) return;
      var gone = myFoods.splice(idx, 1)[0];
      save('myfoods', myFoods); renderQuick();
      toast('Borrado de mis alimentos: ' + gone.n, function () {
        myFoods.splice(Math.min(idx, myFoods.length), 0, gone); save('myfoods', myFoods); renderQuick();
      });
      return;
    }
    var s = ev.target.closest('[data-qfav]');
    if (s) { toggleFav(quickItems[+s.dataset.qfav]); return; }
    var b = ev.target.closest('[data-q]');
    if (!b) return;
    var e = quickItems[+b.dataset.q];
    addEntry({ name: e.name, g: e.g || 0, meal: curMeal, k: e.k, p: e.p, c: e.c, f: e.f, det: e.det, src: 'rapido' });
  });

  /* ---------- Progreso ---------- */
  function renderProgress() {
    var c = calc(profile);
    renderWeek(c);
    renderWeight(c);
    renderChart(c);
  }

  /* Racha y resumen semanal */
  function streakCount() {
    var k = today(), n = 0;
    if (!entries(k).length) k = addDays(k, -1); // la racha sigue viva si hoy todavía no registraste
    while (entries(k).length) { n++; k = addDays(k, -1); }
    return n;
  }
  function renderWeek(c) {
    var s = streakCount();
    $('streak').className = 'streak' + (s ? '' : ' off');
    $('streak').innerHTML = s ? ICON.flame + plural(s, 'día seguido', 'días seguidos') : 'Sin racha activa';
    var days = [], t0 = today();
    for (var i = 6; i >= 0; i--) { var k = addDays(t0, -i); days.push({ k: k, t: totals(k), n: entries(k).length }); }
    var logged = days.filter(function (d) { return d.n; }), n = logged.length;
    var sum = function (f) { return logged.reduce(function (s, d) { return s + f(d); }, 0); };
    var avg = n ? sum(function (d) { return d.t.k; }) / n : 0;
    var protAvg = n ? sum(function (d) { return d.t.p; }) / n : 0;
    var inTarget = logged.filter(function (d) { return d.t.k <= c.target; }).length;
    var deficit = sum(function (d) { return c.maint - d.t.k; });
    var stat = function (t, v, small) { return '<div><dt>' + t + '</dt><dd>' + v + '<small>' + small + '</small></dd></div>'; };
    var html = '<dl class="week-stats">' +
      stat('Promedio', n ? fmt(avg) : '–', n ? (avg <= c.target ? fmt(c.target - avg) + ' kcal bajo el objetivo' : fmt(avg - c.target) + ' kcal sobre el objetivo') : 'kcal por día') +
      stat('En objetivo', n ? inTarget + ' de ' + n : '–', n ? (n === 1 ? 'día registrado' : 'días registrados') : 'días') +
      stat('Proteína', n ? fmt(protAvg) + ' g' : '–', 'promedio · meta ' + fmt(c.prot) + ' g') +
      stat(deficit >= 0 ? 'Déficit total' : 'Superávit total', n ? fmt(Math.abs(deficit)) : '–',
        n ? '≈ ' + (deficit >= 0 ? '−' : '+') + fmt1(Math.abs(deficit) / 7700) + ' kg estimados' : 'kcal') +
      '</dl><div class="week-days">' + days.map(function (d) {
        var dt = fromKey(d.k), cls = !d.n ? '' : d.t.k <= c.target ? 'ok' : 'over';
        return '<button type="button" class="wd ' + cls + (d.k === t0 ? ' today' : '') + '" data-day="' + d.k + '" aria-label="' +
          dt.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric' }) + ': ' +
          (!d.n ? 'sin registro' : fmt(d.t.k) + ' kcal, ' + (cls === 'ok' ? 'dentro del objetivo' : 'por encima del objetivo')) + '">' +
          dt.toLocaleDateString('es-PY', { weekday: 'short' }).replace('.', '').slice(0, 2) +
          '<i>' + (cls === 'ok' ? ICON.check : cls === 'over' ? ICON.up : dt.getDate()) + '</i></button>';
      }).join('') + '</div>';
    $('week').innerHTML = html;
  }
  $('week').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-day]');
    if (b) { day = b.dataset.day; setView('day'); }
  });

  /* ---------- Peso ---------- */
  function weightList() {
    return Object.keys(weights).sort().map(function (k) { return { k: k, v: weights[k] }; });
  }
  function syncProfileWeight() {
    var list = weightList();
    if (!list.length) return false;
    var last = list[list.length - 1].v;
    if (last === profile.peso) return false;
    profile.peso = last; save('profile', profile);
    return true;
  }
  $('formWeight').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = parseFloat($('wInput').value);
    if (!(v >= 30 && v <= 300)) { toast('Ingresá un peso entre 30 y 300 kg'); return; }
    weights[day] = Math.round(v * 10) / 10; save('weights', weights);
    var changed = syncProfileWeight();
    refresh();
    toast(changed ? 'Peso guardado. Nuevo objetivo: ' + fmt(calc(profile).target) + ' kcal' : 'Peso guardado');
  });
  $('wTable').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-wdel]');
    if (!b) return;
    var k = b.dataset.wdel, v = weights[k];
    delete weights[k]; save('weights', weights);
    syncProfileWeight();
    refresh();
    toast('Peso del ' + shortDate(k) + ' quitado', function () {
      weights[k] = v; save('weights', weights); syncProfileWeight(); refresh();
    });
  });
  function shortDate(k) { return fromKey(k).toLocaleDateString('es-PY', { day: 'numeric', month: 'short' }); }
  function longDate(d) { return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric' }); }

  // Tendencia: recta de mínimos cuadrados sobre las últimas 4 semanas de registros.
  function weightTrend(list) {
    if (list.length < 2) return null;
    var last = list[list.length - 1], lastT = fromKey(last.k).getTime();
    var pts = list.filter(function (d) { return lastT - fromKey(d.k).getTime() <= 28 * 864e5; });
    if (pts.length < 2) return null;
    var xs = pts.map(function (d) { return (fromKey(d.k).getTime() - lastT) / 864e5; });
    if (-xs[0] < 6) return null; // hacen falta al menos ~una semana de datos
    var ys = pts.map(function (d) { return d.v; });
    var mx = xs.reduce(function (s, x) { return s + x; }, 0) / xs.length;
    var my = ys.reduce(function (s, y) { return s + y; }, 0) / ys.length;
    var nu = 0, de = 0;
    xs.forEach(function (x, i) { nu += (x - mx) * (ys[i] - my); de += (x - mx) * (x - mx); });
    var slope = de ? nu / de : 0;
    return { slope: slope, from: pts[0].k, to: last.k, at: function (x) { return my + slope * (x - mx); }, x0: xs[0] };
  }
  function renderGoal(c, list, trend) {
    var box = $('wGoal'), goal = profile.pesoMeta;
    if (!goal || !list.length) { box.hidden = true; return; }
    box.hidden = false;
    var cur = list[list.length - 1].v, start = list[0].v, diff = cur - goal;
    if (Math.abs(diff) < 0.1) {
      box.innerHTML = '<div class="gb-top"><span>Meta: ' + fmt1(goal) + ' kg</span><span>¡Llegaste!</span></div><div class="gb-bar"><i style="width:100%"></i></div>' +
        '<p>Llegaste a tu peso meta. Podés fijar una nueva meta o pasar a calorías de mantenimiento desde el perfil.</p>';
      return;
    }
    var dir = diff > 0 ? -1 : 1; // -1: hay que bajar
    var pct = start === goal ? 0 : Math.max(0, Math.min(1, (start - cur) / (start - goal)));
    var rate, src;
    if (trend) { rate = trend.slope * 7; src = 'según tus registros de peso'; }
    else if (dir < 0) { rate = -c.def.k * 7 / 7700; src = 'estimado con tu déficit de ' + fmt(c.def.k) + ' kcal por día'; }
    var msg;
    if (rate == null) msg = 'Tu objetivo de calorías está pensado para bajar de peso. Para subir, conviene consultar con un profesional.';
    else if (rate * dir > 0.02) {
      var weeks = Math.abs(diff) / Math.abs(rate);
      var eta = new Date(); eta.setDate(eta.getDate() + Math.round(weeks * 7));
      msg = 'A este ritmo (' + (rate < 0 ? '−' : '+') + fmt1(Math.abs(rate)) + ' kg por semana, ' + src + ') ' +
        (weeks > 156 ? 'te llevaría más de 3 años.' : 'llegarías cerca del <b>' + longDate(eta) + '</b>.');
    } else {
      msg = 'Según tus registros de las últimas semanas, el peso ' + (Math.abs(rate) <= 0.02 ? 'se mantiene estable' :
        'va en sentido contrario a la meta (' + (rate < 0 ? '−' : '+') + fmt1(Math.abs(rate)) + ' kg por semana)') + '.';
    }
    box.innerHTML = '<div class="gb-top"><span>Meta: ' + fmt1(goal) + ' kg</span><span>Faltan ' + fmt1(Math.abs(diff)) + ' kg</span></div>' +
      '<div class="gb-bar" role="img" aria-label="' + Math.round(pct * 100) + '% del camino hacia la meta"><i style="width:' + Math.round(pct * 100) + '%"></i></div>' +
      '<p>' + msg + '</p>';
  }
  function renderWeight(c) {
    var all = weightList(), list = all.slice(-60), n = list.length;
    var isToday = day === today();
    $('wInput').value = weights[day] != null ? weights[day] : '';
    $('wInput').placeholder = isToday ? 'Tu peso de hoy' : 'Tu peso del ' + shortDate(day);
    $('wDetails').hidden = !n;
    var trend = weightTrend(all);
    renderGoal(c, all, trend);
    if (!n) {
      $('wDelta').textContent = ''; $('wChart').innerHTML = ''; $('wTable').innerHTML = '';
      $('wHint').textContent = 'Anotá tu peso cada tanto para ver tu evolución. El objetivo de calorías se recalcula con el último peso.';
      return;
    }
    var first = list[0], last = list[n - 1], diff = last.v - first.v;
    $('wHint').textContent = n === 1 ? 'Con el próximo registro vas a ver tu evolución. El objetivo de calorías se recalcula con el último peso.' : '';
    $('wDelta').textContent = n === 1 ? '' :
      (Math.abs(diff) < 0.05 ? 'Sin cambios' : (diff < 0 ? '−' : '+') + fmt1(Math.abs(diff)) + ' kg') + ' desde el ' + shortDate(first.k);

    var goal = profile.pesoMeta;
    var W = Math.max(260, Math.min(840, $('wChart').clientWidth || 640)), H = 200, L = 34, R = 34, T = 26, B = 26;
    var vals = list.map(function (d) { return d.v; });
    if (goal) vals.push(goal);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = Math.max(0.5, (hi - lo) * 0.12); lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad);
    var t0 = fromKey(first.k).getTime(), t1 = fromKey(last.k).getTime(), span = t1 - t0;
    var x = function (k) { return span ? L + (fromKey(k).getTime() - t0) / span * (W - L - R) : W / 2; };
    var y = function (v) { return T + (hi - v) / (hi - lo) * (H - T - B); };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolución del peso. Último registro: ' + fmt1(last.v) + ' kg.' +
      (goal ? ' Meta: ' + fmt1(goal) + ' kg.' : '') + '">';
    [hi, (hi + lo) / 2, lo].forEach(function (v) {
      svg += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmt1(v) + '</text>';
    });
    if (goal) {
      svg += '<line class="wgoal" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(goal) + '" y2="' + y(goal) + '"/>' +
        '<text class="wgoal-label" x="' + (L + 4) + '" y="' + (y(goal) + (goal < lo + (hi - lo) * 0.2 ? -6 : 14)) + '">Meta ' + fmt1(goal) + ' kg</text>';
    }
    if (trend && span && trend.from >= first.k) {
      var tx0 = trend.x0;
      svg += '<path class="wtrend" d="M' + x(trend.from).toFixed(1) + ' ' + y(trend.at(tx0)).toFixed(1) + 'L' + x(trend.to).toFixed(1) + ' ' + y(trend.at(0)).toFixed(1) + '"/>';
    }
    if (n > 1) svg += '<path class="wline" d="M' + list.map(function (d) { return x(d.k).toFixed(1) + ' ' + y(d.v).toFixed(1); }).join('L') + '"/>';
    list.forEach(function (d) {
      svg += '<g class="wpt" tabindex="0" data-k="' + d.k + '" data-v="' + d.v + '" aria-label="' + shortDate(d.k) + ': ' + fmt1(d.v) + ' kg">' +
        '<circle class="hit" cx="' + x(d.k) + '" cy="' + y(d.v) + '" r="14"/>' +
        '<circle class="wdot" cx="' + x(d.k) + '" cy="' + y(d.v) + '" r="5"/></g>';
    });
    svg += '<text class="wlabel" x="' + x(last.k) + '" y="' + (y(last.v) - 11) + '" text-anchor="' + (n > 1 ? 'end' : 'middle') + '">' + fmt1(last.v) + ' kg</text>';
    svg += '<text x="' + (n > 1 ? L : W / 2) + '" y="' + (H - 6) + '" text-anchor="' + (n > 1 ? 'start' : 'middle') + '">' + shortDate(first.k) + '</text>';
    if (n > 1) svg += '<text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + shortDate(last.k) + '</text>';
    $('wChart').innerHTML = svg + '</svg>';

    $('wTable').innerHTML = '<table><thead><tr><th>Día</th><th>Cambio</th><th>Peso</th><th><span hidden>Quitar</span></th></tr></thead><tbody>' +
      list.slice().reverse().map(function (d, i, arr) {
        var prev = arr[i + 1], ch = prev ? d.v - prev.v : null;
        return '<tr><td>' + fromKey(d.k).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' }) + '</td><td>' +
          (ch == null ? '–' : Math.abs(ch) < 0.05 ? '0' : (ch < 0 ? '−' : '+') + fmt1(Math.abs(ch)) + ' kg') + '</td><td>' + fmt1(d.v) + ' kg</td>' +
          '<td><button class="del" type="button" data-wdel="' + d.k + '" aria-label="Quitar el peso del ' + shortDate(d.k) + '">' + ICON.del + '</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  var wChart = $('wChart');
  function showWTip(g) {
    var r = g.querySelector('.wdot').getBoundingClientRect();
    $('tip').innerHTML = '<b>' + fmt1(+g.dataset.v) + ' kg</b>' + fromKey(g.dataset.k).toLocaleDateString('es-PY', { weekday: 'short', day: 'numeric', month: 'short' });
    $('tip').hidden = false;
    var half = $('tip').offsetWidth / 2;
    $('tip').style.left = Math.min(window.innerWidth - half - 8, Math.max(half + 8, r.left + r.width / 2)) + 'px';
    $('tip').style.top = (r.top - 8) + 'px';
  }
  wChart.addEventListener('pointermove', function (ev) { var g = ev.target.closest('.wpt'); if (g) showWTip(g); else $('tip').hidden = true; });
  wChart.addEventListener('pointerleave', function () { $('tip').hidden = true; });
  wChart.addEventListener('focusin', function (ev) { var g = ev.target.closest('.wpt'); if (g) showWTip(g); });
  wChart.addEventListener('focusout', function () { $('tip').hidden = true; });

  /* ---------- Historial de 14 días ---------- */
  function renderChart(c) {
    var N = 14, days = [], t0 = today();
    for (var i = N - 1; i >= 0; i--) { var k = addDays(t0, -i); days.push({ k: k, v: totals(k).k }); }
    var logged = days.filter(function (d) { return d.v > 0; });
    var over = logged.filter(function (d) { return d.v > c.target; }).length;
    $('histAvg').textContent = logged.length
      ? 'Promedio: ' + fmt(logged.reduce(function (s, d) { return s + d.v; }, 0) / logged.length) + ' kcal en ' + plural(logged.length, 'día', 'días') +
        (over ? ' · ' + over + ' por encima' : '')
      : 'Sin registros todavía';

    var W = Math.max(260, Math.min(840, $('chart').clientWidth || 640)), H = 220, L = 2, R = 2, T = 22, B = 26;
    var max = Math.max(c.target, Math.max.apply(null, days.map(function (d) { return d.v; }))) * 1.12 || 1;
    var pw = (W - L - R) / N, bw = Math.min(26, pw - 4), ph = H - T - B;
    var y = function (v) { return T + ph - (v / max) * ph; };
    var gy = y(c.target);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Calorías consumidas por día en los últimos 14 días. Objetivo: ' + fmt(c.target) + ' kcal.">' +
      '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '"/>';
    days.forEach(function (d, i) {
      var x = L + i * pw + (pw - bw) / 2, h = d.v > 0 ? Math.max(3, T + ph - y(d.v)) : 0, top = T + ph - h, r = Math.min(4, h);
      var dt = fromKey(d.k), isSel = d.k === day, cls = 'bar' + (d.v > c.target ? ' over' : '') + (isSel ? ' sel' : '');
      svg += '<g class="col" tabindex="0" role="button" data-day="' + d.k + '" data-v="' + d.v + '" aria-label="' +
        dt.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' }) + ': ' + (d.v ? fmt(d.v) + ' kcal' : 'sin registro') + '">' +
        '<rect class="hit" x="' + (L + i * pw) + '" y="0" width="' + pw + '" height="' + H + '"/>' +
        (h ? '<path class="' + cls + '" d="M' + x + ' ' + (T + ph) + 'V' + (top + r) + 'q0 ' + -r + ' ' + r + ' ' + -r + 'h' + (bw - 2 * r) + 'q' + r + ' 0 ' + r + ' ' + r + 'V' + (T + ph) + 'z"/>'
          : '<circle class="nodata" cx="' + (x + bw / 2) + '" cy="' + (T + ph - 5) + '" r="3"/>') +
        '<text class="' + (isSel ? 'day-sel' : '') + '" x="' + (L + i * pw + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + dt.getDate() + '</text></g>';
    });
    svg += '<line class="goal" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/>' +
      '<text class="goal-label" x="' + L + '" y="' + (gy - 6) + '">Objetivo ' + fmt(c.target) + ' kcal</text></svg>';
    $('chart').innerHTML = svg;

    $('histTable').innerHTML = '<table><thead><tr><th>Día</th><th>Diferencia con el objetivo</th><th>Consumido</th></tr></thead><tbody>' +
      days.slice().reverse().map(function (d) {
        var diff = d.v - c.target;
        return '<tr><td>' + fromKey(d.k).toLocaleDateString('es-PY', { weekday: 'short', day: 'numeric', month: 'short' }) + '</td><td>' +
          (d.v ? (diff > 0 ? '+' : '−') + fmt(Math.abs(diff)) + ' kcal' : 'Sin registro') + '</td><td>' + (d.v ? fmt(d.v) + ' kcal' : '–') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  var tip = $('tip');
  function showTip(g) {
    var r = g.querySelector('.hit').getBoundingClientRect(), v = +g.dataset.v, c = calc(profile), diff = v - c.target;
    tip.innerHTML = '<b>' + (v ? fmt(v) + ' kcal' : 'Sin registro') + '</b>' +
      fromKey(g.dataset.day).toLocaleDateString('es-PY', { weekday: 'short', day: 'numeric', month: 'short' }) +
      (v ? ' · ' + (diff > 0 ? fmt(diff) + ' sobre el objetivo' : fmt(-diff) + ' bajo el objetivo') : '');
    tip.hidden = false;
    var half = tip.offsetWidth / 2;
    tip.style.left = Math.min(window.innerWidth - half - 8, Math.max(half + 8, r.left + r.width / 2)) + 'px';
    tip.style.top = (r.top + 14) + 'px';
  }
  var chart = $('chart');
  chart.addEventListener('pointermove', function (ev) { var g = ev.target.closest('.col'); if (g) showTip(g); else tip.hidden = true; });
  chart.addEventListener('pointerleave', function () { tip.hidden = true; });
  chart.addEventListener('focusin', function (ev) { var g = ev.target.closest('.col'); if (g) showTip(g); });
  chart.addEventListener('focusout', function () { tip.hidden = true; });
  function goDay(ev) {
    var g = ev.target.closest('.col');
    if (!g || (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ')) return;
    ev.preventDefault(); tip.hidden = true;
    day = g.dataset.day; editingId = null;
    setView('day');
  }
  chart.addEventListener('click', goDay);
  chart.addEventListener('keydown', goDay);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (profile && view === 'progress') renderProgress(); }, 150);
  });

  /* ---------- Inicio ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (profile && !validate(profile)) setView('day'); else { profile = null; setView('profile'); }
})();
