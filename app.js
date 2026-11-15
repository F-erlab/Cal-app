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
    return 0;
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
  var INDEX = (window.FOODS || []).map(function (f) {
    return { f: f, phrases: [f.n].concat(f.a || []).map(tokens) };
  });
  function searchLocal(name) {
    var qt = tokens(name);
    return INDEX.map(function (it) {
      var best = 0;
      it.phrases.forEach(function (p) { best = Math.max(best, phraseScore(qt, p)); });
      return { f: it.f, s: best };
    }).filter(function (r) { return r.s >= 0.5; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 6)
      .map(function (r) { return r.f; });
  }

  // Convierte cantidad + unidad en gramos para un alimento dado.
  function gramsFor(food, qty, unit) {
    var m = food.m || {};
    var q = qty == null ? 1 : qty;
    switch (unit) {
      case 'g': case 'ml': return q;
      case 'kg': case 'l': return q * 1000;
      case 'taza': return q * (m.taza || (food.liq ? 240 : 150));
      case 'vaso': return q * 200;
      case 'cucharada': return q * (m.cucharada || 15);
      case 'cucharadita': return q * (m.cucharadita || 5);
      case 'plato': return q * 250;
      case 'u': return q * (food.u || 100);
      default:
        if (food.u) return q * food.u;
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
          return '<div class="entry"><div class="entry-main"><b>' + esc(e.name) + '</b><small>' +
            (e.g ? fmt(e.g) + ' g · ' : '') + 'P ' + fmt1(e.p) + ' · C ' + fmt1(e.c) + ' · G ' + fmt1(e.f) + '</small></div>' +
            '<span class="entry-k">' + fmt(e.k) + ' <small>kcal</small></span>' +
            '<button class="del" type="button" data-del="' + e.id + '" aria-label="Quitar ' + esc(e.name) + '">×</button></div>';
        }).join('') + '</div>';
    }).join('');
  }
  $('log').addEventListener('click', function (ev) {
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
    results = { parsed: parsed, local: searchLocal(parsed.name), online: [], state: 'loading' };
    sel = null;
    if (results.local.length) select(results.local[0]); else renderResults();
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
      '<span class="res-k">' + fmt(g) + (food.liq ? ' ml · ' : ' g · ') + fmt(food.k * g / 100) + ' kcal</span></button>';
  }
  function renderResults() {
    var html = '', n = results.local.length;
    if (n) html += '<h3>Alimentos comunes</h3>' + results.local.map(function (f, i) { return resRow(f, i); }).join('');
    if (results.state === 'loading') html += '<p class="hint"><span class="spinner"></span>Buscando en internet…</p>';
    else if (results.state === 'error') html += '<p class="hint">No se pudo consultar internet en este momento.' + (n ? '' : ' Podés cargar las calorías a mano.') + '</p>';
    else if (results.state === 'done') {
      if (results.online.length) html += '<h3>De internet · Open Food Facts</h3>' + results.online.map(function (f, i) { return resRow(f, n + i); }).join('');
      else if (!n) html += '<p class="hint">No encontramos ese alimento. Probá con otro nombre o cargá las calorías a mano.</p>';
    }
    $('results').innerHTML = html;
    if (!sel) $('editor').hidden = true;
  }
  $('results').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-i]');
    if (b) select(all()[+b.dataset.i]);
  });

  function renderEditor() {
    var ed = $('editor'), food = sel.food;
    ed.hidden = false;
    var meal = ed.querySelector('select') ? ed.querySelector('select').value : defaultMeal();
    ed.innerHTML = '<p class="editor-title">' + esc(food.n) + '</p>' +
      '<div class="editor-row">' +
      '<label class="field"><span>Cantidad</span><div class="input-unit"><input id="edGrams" type="number" inputmode="decimal" min="1" step="1" value="' + sel.grams + '"><em>' + (food.liq ? 'ml' : 'g') + '</em></div></label>' +
      '<label class="field"><span>Comida</span><select id="edMeal">' + MEALS.map(function (m) {
        return '<option value="' + m[0] + '"' + (m[0] === meal ? ' selected' : '') + '>' + m[1] + '</option>';
      }).join('') + '</select></label>' +
      '<button id="edAdd" class="btn primary" type="button">Agregar</button></div>' +
      '<div class="editor-macros" id="edMacros"></div>';
    updateEditorMacros();
  }
  function updateEditorMacros() {
    var m = macrosFor(sel.food, sel.grams || 0), food = sel.food;
    var unit = food.u ? '<span>1 ' + esc(food.un || 'porción') + ' ≈ ' + fmt(food.u) + ' g</span>' : '';
    $('edMacros').innerHTML = '<span><strong>' + fmt(m.k) + '</strong> kcal</span>' +
      '<span>Proteína ' + fmt1(m.p) + ' g</span><span>Carbohidratos ' + fmt1(m.c) + ' g</span><span>Grasas ' + fmt1(m.f) + ' g</span>' + unit;
  }
  $('editor').addEventListener('input', function (ev) {
    if (ev.target.id !== 'edGrams') return;
    sel.grams = parseFloat(ev.target.value) || 0;
    updateEditorMacros();
  });
  function commitSelected() {
    if (!sel || !(sel.grams > 0)) { toast('Ingresá una cantidad válida'); return; }
    var m = macrosFor(sel.food, sel.grams);
    addEntry({
      name: sel.food.n + (sel.food.brand ? ' (' + sel.food.brand + ')' : ''), g: sel.grams, meal: $('edMeal').value,
      k: Math.round(m.k), p: +m.p.toFixed(1), c: +m.c.toFixed(1), f: +m.f.toFixed(1), src: sel.food.online ? 'off' : 'local'
    });
    searchSeq++; sel = null; results = { local: [], online: [], state: 'idle', parsed: null };
    $('q').value = ''; renderResults(); $('q').focus();
  }
  $('editor').addEventListener('click', function (ev) { if (ev.target.id === 'edAdd') commitSelected(); });
  $('editor').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.id === 'edGrams') { ev.preventDefault(); commitSelected(); }
  });

  $('btnManual').addEventListener('click', function () {
    var f = $('formManual'); f.hidden = !f.hidden;
    if (!f.hidden) { f.elements.name.value = $('q').value.trim(); f.elements.name.focus(); }
  });
  $('formManual').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target, name = f.elements.name.value.trim(), k = parseFloat(f.elements.k.value);
    if (!name || !(k >= 0)) { toast('Completá el nombre y las calorías'); return; }
    addEntry({
      name: name, g: 0, meal: defaultMeal(), k: Math.round(k), src: 'manual',
      p: parseFloat(f.elements.p.value) || 0, c: parseFloat(f.elements.c.value) || 0, f: parseFloat(f.elements.f.value) || 0
    });
    f.reset(); f.hidden = true;
  });

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
    resizeTimer = setTimeout(function () { if (profile && !$('viewDay').hidden) renderChart(calc(profile)); }, 150);
  });

  /* ---------- Inicio ---------- */
  if (profile && !validate(profile)) showDay(); else { profile = null; showSetup(); }
})();
