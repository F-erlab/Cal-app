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
  var toastTimer;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------- Cálculos ---------- */
  function calc(p) {
    var bmr = 10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === 'm' ? 5 : -161);
    var act = ACTIVIDAD.filter(function (a) { return a.id === p.actividad; })[0] || ACTIVIDAD[0];
    var def = DEFICIT.filter(function (d) { return d.id === p.deficit; })[0] || DEFICIT[0];
    var maint = Math.round(bmr * act.f);
    var h = p.altura / 100;
    var imc = p.peso / (h * h);
    var cat = imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad';
    return { bmr: Math.round(bmr), maint: maint, def: def, target: Math.max(0, maint - def.k), imc: imc, cat: cat, min: p.sexo === 'm' ? 1500 : 1200 };
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
  function addEntry(e) {
    e.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    (log[day] = log[day] || []).push(e);
    save('log', log);
    renderDay();
    toast('Agregado: ' + e.name);
  }
  function defaultMeal() {
    var h = new Date().getHours();
    return h < 11 ? 'desayuno' : h < 15 ? 'almuerzo' : h < 19 ? 'merienda' : 'cena';
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
  });

  /* ---------- Datos iniciales ---------- */
  var form = $('formSetup');
  $('optActividad').innerHTML = ACTIVIDAD.map(function (a) {
    return '<label><input type="radio" name="actividad" value="' + a.id + '"><span class="opt"><b>' + a.t + '</b><small>' + a.d + '</small></span></label>';
  }).join('');
  $('optDeficit').innerHTML = DEFICIT.map(function (d) {
    return '<label><input type="radio" name="deficit" value="' + d.id + '"><span class="opt"><b>' + d.t + '</b><small>' + d.d + '</small></span></label>';
  }).join('');

  function readForm() {
    var fd = new FormData(form);
    return {
      sexo: fd.get('sexo'), edad: parseFloat(fd.get('edad')), peso: parseFloat(fd.get('peso')),
      altura: parseFloat(fd.get('altura')), actividad: fd.get('actividad'), deficit: fd.get('deficit')
    };
  }
  function validate(p) {
    if (!p.sexo) return 'Elegí el sexo.';
    if (!(p.edad >= 14 && p.edad <= 100)) return 'Ingresá una edad entre 14 y 100 años.';
    if (!(p.peso >= 30 && p.peso <= 300)) return 'Ingresá un peso entre 30 y 300 kg.';
    if (!(p.altura >= 120 && p.altura <= 230)) return 'Ingresá la altura en centímetros (entre 120 y 230).';
    if (!p.actividad) return 'Elegí tu nivel de actividad física.';
    if (!p.deficit) return 'Elegí el déficit calórico.';
    return '';
  }
  function renderPreview() {
    var p = readForm();
    var box = $('setupPreview');
    $('setupError').hidden = true;
    if (!(p.peso >= 30 && p.altura >= 120)) { box.innerHTML = ''; return; }
    var h = p.altura / 100, imc = p.peso / (h * h);
    var html = '<div><dt>IMC</dt><dd>' + fmt1(imc) + '<small>' +
      (imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad') + '</small></dd></div>';
    if (p.sexo && p.edad >= 14 && p.actividad) {
      var c = calc({ sexo: p.sexo, edad: p.edad, peso: p.peso, altura: p.altura, actividad: p.actividad, deficit: p.deficit || 'leve' });
      html += '<div><dt>Mantenimiento</dt><dd>' + fmt(c.maint) + '<small>kcal por día</small></dd></div>';
      if (p.deficit) html += '<div><dt>Tu objetivo</dt><dd>' + fmt(c.target) + '<small>kcal por día</small></dd></div>';
    }
    box.innerHTML = html;
  }
  form.addEventListener('input', renderPreview);
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var p = readForm(), err = validate(p);
    if (err) { $('setupError').textContent = err; $('setupError').hidden = false; return; }
    profile = p; save('profile', p);
    weights[today()] = p.peso; save('weights', weights);
    showDay();
  });
  $('btnCancelSetup').addEventListener('click', showDay);
  $('btnProfile').addEventListener('click', showSetup);

  function showSetup() {
    $('viewDay').hidden = true; $('viewSetup').hidden = false;
    $('btnProfile').hidden = true;
    $('btnCancelSetup').hidden = !profile;
    $('setupTitle').textContent = profile ? 'Tus datos' : 'Contanos sobre vos';
    if (profile) {
      ['edad', 'peso', 'altura'].forEach(function (k) { form.elements[k].value = profile[k]; });
      ['sexo', 'actividad', 'deficit'].forEach(function (k) {
        var r = form.querySelector('input[name="' + k + '"][value="' + profile[k] + '"]');
        if (r) r.checked = true;
      });
    }
    renderPreview();
    window.scrollTo(0, 0);
  }
  function showDay() {
    $('viewSetup').hidden = true; $('viewDay').hidden = false;
    $('btnProfile').hidden = false;
    renderDay();
    window.scrollTo(0, 0);
  }

  /* ---------- Panel del día ---------- */
  var RING = 2 * Math.PI * 84;
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
    document.querySelector('.summary').classList.toggle('is-over', over);
    $('kcalNow').textContent = fmt(t.k);
    $('kcalOf').textContent = 'de ' + fmt(c.target) + ' kcal';
    $('ringLabel').textContent = fmt(t.k) + ' de ' + fmt(c.target) + ' kilocalorías consumidas';
    $('statusLine').innerHTML = over
      ? 'Te pasaste por <b>' + fmt(-left) + ' kcal</b> del objetivo' +
        (t.k <= c.maint ? ', pero seguís por debajo del mantenimiento.' : '.')
      : t.k === 0 ? 'Tenés <b>' + fmt(left) + ' kcal</b> disponibles ' + (isToday ? 'para hoy.' : 'este día.')
      : 'Te quedan <b>' + fmt(left) + ' kcal</b> para llegar a tu objetivo.';
    $('stMaint').innerHTML = fmt(c.maint) + '<small>kcal por día</small>';
    $('stDef').innerHTML = '−' + fmt(c.def.k) + '<small>' + c.def.t + '</small>';
    $('stImc').innerHTML = fmt1(c.imc) + '<small>' + c.cat + '</small>';

    var mk = t.p * 4 + t.c * 4 + t.f * 9 || 1;
    $('macros').innerHTML = [['Proteína', t.p, 4, '--p'], ['Carbohidratos', t.c, 4, '--c'], ['Grasas', t.f, 9, '--f']].map(function (m) {
      return '<div class="macro" style="--col:var(' + m[3] + ');--w:' + Math.round(m[1] * m[2] / mk * 100) + '%">' +
        '<span class="dot"></span>' + m[0] + '<br><strong>' + fmt(m[1]) + ' g</strong><i></i></div>';
    }).join('');

    var warn = $('lowWarn');
    warn.hidden = c.target >= c.min;
    if (!warn.hidden) {
      warn.textContent = 'Tu objetivo de ' + fmt(c.target) + ' kcal queda por debajo de las ' + fmt(c.min) +
        ' kcal diarias que suelen recomendarse como mínimo. Considerá un déficit menor o consultá con un profesional.';
    }
    renderLog();
    renderQuick();
    renderWeight();
    renderChart(c);
  }

  function renderLog() {
    var list = entries(day);
    if (!list.length) {
      $('log').innerHTML = '<p class="empty"><b>Todavía no registraste nada</b>Escribí arriba lo que comiste para empezar.</p>';
      return;
    }
    $('log').innerHTML = MEALS.map(function (m) {
      var items = list.filter(function (e) { return e.meal === m[0]; });
      if (!items.length) return '';
      var sum = items.reduce(function (s, e) { return s + e.k; }, 0);
      return '<div class="meal"><div class="meal-head"><h3>' + m[1] + '</h3><span>' + fmt(sum) + ' kcal</span></div>' +
        items.map(function (e) {
          return '<div class="entry"><div class="entry-main"><b>' + esc(e.name) + '</b>' + (e.det ? '<small class="det">' + esc(e.det) + '</small>' : '') + '<small>' +
            (e.g ? fmt(e.g) + ' g · ' : '') + 'P ' + fmt1(e.p) + ' · C ' + fmt1(e.c) + ' · G ' + fmt1(e.f) + '</small></div>' +
            '<span class="entry-k">' + fmt(e.k) + ' <small>kcal</small></span>' +
            starBtn(e) +
            '<button class="del" type="button" data-del="' + e.id + '" aria-label="Quitar ' + esc(e.name) + '">×</button></div>';
        }).join('') + '</div>';
    }).join('');
  }
  $('log').addEventListener('click', function (ev) {
    var s = ev.target.closest('[data-fav]');
    if (s) {
      var item = entries(day).filter(function (e) { return e.id === s.dataset.fav; })[0];
      if (item) toggleFav(item);
      return;
    }
    var b = ev.target.closest('[data-del]');
    if (!b) return;
    log[day] = entries(day).filter(function (e) { return e.id !== b.dataset.del; });
    if (!log[day].length) delete log[day];
    save('log', log);
    renderDay();
  });
  $('btnPrev').addEventListener('click', function () { day = addDays(day, -1); renderDay(); });
  $('btnNext').addEventListener('click', function () { if (day < today()) { day = addDays(day, 1); renderDay(); } });

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

  function mealSelect(meal) {
    return '<label class="field"><span>Comida</span><select id="edMeal">' + MEALS.map(function (m) {
      return '<option value="' + m[0] + '"' + (m[0] === meal ? ' selected' : '') + '>' + m[1] + '</option>';
    }).join('') + '</select></label>';
  }
  function renderComboEditor(meal) {
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
      '<div class="editor-row">' + mealSelect(meal) + '<button id="edAdd" class="btn primary" type="button">Agregar</button></div>' +
      '<div class="editor-macros" id="edMacros"></div>';
    updateEditorMacros();
  }
  function renderEditor() {
    var ed = $('editor'), food = sel.food;
    ed.hidden = false;
    var meal = ed.querySelector('#edMeal') ? ed.querySelector('#edMeal').value : defaultMeal();
    if (sel.combo) { renderComboEditor(meal); return; }
    ed.innerHTML = '<p class="editor-title">' + esc(food.n) + '</p>' +
      '<div class="editor-row">' +
      (food.po
        ? '<label class="field"><span>Porciones</span><input id="edGrams" type="number" inputmode="decimal" min="0.25" step="0.25" value="' + sel.grams / 100 + '"></label>'
        : '<label class="field"><span>Cantidad</span><div class="input-unit"><input id="edGrams" type="number" inputmode="decimal" min="1" step="1" value="' + sel.grams + '"><em>' + (food.liq ? 'ml' : 'g') + '</em></div></label>') +
      mealSelect(meal) +
      '<button id="edAdd" class="btn primary" type="button">Agregar</button></div>' +
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
    $('q').value = ''; renderResults(); $('q').focus();
  }
  function commitCombo() {
    var cb = sel.combo, t = comboTotals(cb);
    var used = cb.parts.filter(function (pt) { return pt.grams > 0; });
    if (!used.length) { toast('Ingresá una cantidad válida'); return; }
    addEntry({
      name: cb.n, meal: $('edMeal').value, src: 'combo',
      g: used.reduce(function (s, pt) { return s + (pt.cands[pt.i].po ? 0 : pt.grams); }, 0),
      det: used.map(function (pt) { var f = pt.cands[pt.i]; return f.n + ' ' + amountText(f, pt.grams); }).join(' + '),
      k: Math.round(t.k), p: +t.p.toFixed(1), c: +t.c.toFixed(1), f: +t.f.toFixed(1)
    });
    resetSearch();
  }
  function commitSelected() {
    if (sel && sel.combo) { commitCombo(); return; }
    if (!sel || !(sel.grams > 0)) { toast('Ingresá una cantidad válida'); return; }
    var m = macrosFor(sel.food, sel.grams);
    var por = sel.grams / 100;
    addEntry({
      name: sel.food.n + (sel.food.brand ? ' (' + sel.food.brand + ')' : '') + (sel.food.po && por !== 1 ? ' × ' + fmt1(por) : ''),
      g: sel.food.po ? 0 : sel.grams, meal: $('edMeal').value,
      k: Math.round(m.k), p: +m.p.toFixed(1), c: +m.c.toFixed(1), f: +m.f.toFixed(1), src: sel.food.online ? 'off' : 'local'
    });
    resetSearch();
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
    addEntry({ name: name, g: g, meal: defaultMeal(), k: Math.round(k), p: p, c: c, f: fat, src: 'manual' });
    f.reset(); f.elements.keep.checked = true; f.hidden = true;
    searchSeq++; sel = null; results = { local: [], online: [], state: 'idle', parsed: null };
    $('q').value = ''; renderResults();
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
      (on ? 'Quitar de favoritos: ' : 'Guardar en favoritos: ') + esc(e.name) + '">' + (on ? '★' : '☆') + '</button>';
  }
  function recents() {
    var seen = {}, out = [];
    favs.forEach(function (f) { seen[itemKey(f)] = 1; });
    Object.keys(log).sort().reverse().some(function (k) {
      log[k].slice().reverse().forEach(function (e) {
        var key = itemKey(e);
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
      (on ? 'Quitar de favoritos: ' : 'Guardar en favoritos: ') + esc(e.name) + '">' + (on ? '★' : '☆') + '</button></span>';
  }
  function renderQuick() {
    quickItems = [];
    var rec = recents(), html = '';
    if (favs.length) html += '<h3>Favoritos</h3><div class="chips">' + favs.map(function (f) { return chip(f, true); }).join('') + '</div>';
    if (rec.length) html += '<h3>Recientes</h3><div class="chips">' + rec.map(function (e) { return chip(e, false); }).join('') + '</div>';
    if (myFoods.length) {
      var open = $('myFoods') && $('myFoods').open;
      html += '<details id="myFoods" class="myfoods"' + (open ? ' open' : '') + '><summary>Mis alimentos (' + myFoods.length + ')</summary><ul>' +
        myFoods.map(function (m) {
          var portion = m.po ? '1 porción' : fmt(m.u) + ' g';
          return '<li><span>' + esc(m.n) + '<small>' + portion + ' · ' + fmt(m.k * m.u / 100) + ' kcal</small></span>' +
            '<button type="button" class="del" data-myfood="' + m.id + '" aria-label="Borrar ' + esc(m.n) + ' de mis alimentos">×</button></li>';
        }).join('') + '</ul><p class="fine">Aparecen primero al buscar. Para cambiar uno, crealo de nuevo con el mismo nombre.</p></details>';
    }
    $('quick').innerHTML = html;
  }
  $('quick').addEventListener('click', function (ev) {
    var d = ev.target.closest('[data-myfood]');
    if (d) {
      myFoods = myFoods.filter(function (m) { return m.id !== d.dataset.myfood; });
      save('myfoods', myFoods); renderQuick(); toast('Borrado de mis alimentos');
      return;
    }
    var s = ev.target.closest('[data-qfav]');
    if (s) { toggleFav(quickItems[+s.dataset.qfav]); return; }
    var b = ev.target.closest('[data-q]');
    if (!b) return;
    var e = quickItems[+b.dataset.q];
    addEntry({ name: e.name, g: e.g || 0, meal: defaultMeal(), k: e.k, p: e.p, c: e.c, f: e.f, det: e.det, src: 'rapido' });
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
    renderDay();
    toast(changed ? 'Peso guardado. Nuevo objetivo: ' + fmt(calc(profile).target) + ' kcal' : 'Peso guardado');
  });
  $('wTable').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-wdel]');
    if (!b) return;
    delete weights[b.dataset.wdel]; save('weights', weights);
    syncProfileWeight();
    renderDay();
  });
  function shortDate(k) { return fromKey(k).toLocaleDateString('es-PY', { day: 'numeric', month: 'short' }); }
  function renderWeight() {
    var list = weightList().slice(-60), n = list.length;
    var isToday = day === today();
    $('wInput').value = weights[day] != null ? weights[day] : '';
    $('wInput').placeholder = isToday ? 'Tu peso de hoy' : 'Tu peso del ' + shortDate(day);
    $('wDetails').hidden = !n;
    if (!n) {
      $('wDelta').textContent = ''; $('wChart').innerHTML = ''; $('wTable').innerHTML = '';
      $('wHint').textContent = 'Anotá tu peso cada tanto para ver tu evolución. El objetivo de calorías se recalcula con el último peso.';
      return;
    }
    var first = list[0], last = list[n - 1], diff = last.v - first.v;
    $('wHint').textContent = n === 1 ? 'Con el próximo registro vas a ver tu evolución. El objetivo de calorías se recalcula con el último peso.' : '';
    $('wDelta').textContent = n === 1 ? '' :
      (Math.abs(diff) < 0.05 ? 'Sin cambios' : (diff < 0 ? '−' : '+') + fmt1(Math.abs(diff)) + ' kg') + ' desde el ' + shortDate(first.k);

    var W = Math.max(260, Math.min(840, $('wChart').clientWidth || 640)), H = 190, L = 34, R = 34, T = 26, B = 26;
    var vals = list.map(function (d) { return d.v; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = Math.max(0.5, (hi - lo) * 0.15); lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad);
    var t0 = fromKey(first.k).getTime(), t1 = fromKey(last.k).getTime(), span = t1 - t0;
    var x = function (k) { return span ? L + (fromKey(k).getTime() - t0) / span * (W - L - R) : W / 2; };
    var y = function (v) { return T + (hi - v) / (hi - lo) * (H - T - B); };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolución del peso. Último registro: ' + fmt1(last.v) + ' kg.">';
    [hi, (hi + lo) / 2, lo].forEach(function (v) {
      svg += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmt1(v) + '</text>';
    });
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
          '<td><button class="del" type="button" data-wdel="' + d.k + '" aria-label="Quitar el peso del ' + shortDate(d.k) + '">×</button></td></tr>';
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

  /* ---------- Historial ---------- */
  function renderChart(c) {
    var N = 14, days = [], t0 = today();
    for (var i = N - 1; i >= 0; i--) { var k = addDays(t0, -i); days.push({ k: k, v: totals(k).k }); }
    var logged = days.filter(function (d) { return d.v > 0; });
    $('histAvg').textContent = logged.length
      ? 'Promedio: ' + fmt(logged.reduce(function (s, d) { return s + d.v; }, 0) / logged.length) + ' kcal en ' + logged.length + (logged.length === 1 ? ' día' : ' días')
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
      var dt = fromKey(d.k), isSel = d.k === day;
      svg += '<g class="col" tabindex="0" role="button" data-day="' + d.k + '" data-v="' + d.v + '" aria-label="' +
        dt.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' }) + ': ' + fmt(d.v) + ' kcal">' +
        '<rect class="hit" x="' + (L + i * pw) + '" y="0" width="' + pw + '" height="' + H + '"/>' +
        (h ? '<path class="bar' + (isSel ? ' sel' : '') + '" d="M' + x + ' ' + (T + ph) + 'V' + (top + r) + 'q0 ' + -r + ' ' + r + ' ' + -r + 'h' + (bw - 2 * r) + 'q' + r + ' 0 ' + r + ' ' + r + 'V' + (T + ph) + 'z"/>' : '') +
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
    day = g.dataset.day; renderDay();
    $('dayTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  chart.addEventListener('click', goDay);
  chart.addEventListener('keydown', goDay);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (profile && !$('viewDay').hidden) { renderChart(calc(profile)); renderWeight(); } }, 150);
  });

  /* ---------- Inicio ---------- */
  if (profile && !validate(profile)) showDay(); else { profile = null; showSetup(); }
})();
