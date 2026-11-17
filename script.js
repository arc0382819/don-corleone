// Don Corleone: переключатель зала и запись в три шага.
// "d" — Дворцовый проспект, "f" — улица Федюнинского.

(function () {
  'use strict';

  // ---------- Настройки онлайн-записи ----------
  // Запись идёт через YClients: это та же форма, что открывается
  // по кнопке «Записаться онлайн» на Яндекс Картах.
  // Ссылка вида .../personal/select-time?o=m<мастер>s<услуга>
  // сразу открывает календарь выбранного мастера с выбранной услугой.
  // ID сверены с формами записи 16.11.2026.
  var BRANCHES = {
    d: {
      title: 'Дворцовый проспект, 14/9',
      form: 'https://n1348911.yclients.ru',
      company: 1226565
    },
    f: {
      title: 'улица Федюнинского, 14к1',
      form: 'https://n1378817.yclients.ru',
      company: 1252002
    }
  };

  // ID мастеров в YClients
  var STAFF = {
    farid: 3699373,
    feruz: 5718147,
    khurshid: 3762578,
    bos: 4201560
  };

  // ID услуг в YClients, одинаковые в обоих залах.
  // Ключи совпадают с data-svc в прайсе на странице.
  var SERVICES = {
    'classic': 18790750,
    'long': 18790754,
    'clipper': 18790752,
    'kids': 18790745,
    'kids-long': 29284761,
    'head-shave': 18790748,
    'shaver': 18790743,
    'beard': 18790761,
    'face-shave': 18790760,
    'father-son': 18790751,
    'cut-beard': 18790755,
    'cut-shave': 18790753,
    'face-care': 18790749,
    'camo-head': 18790735,
    'camo-beard': 18790734,
    'camo-full': 18790740,
    'wax-beard': 18790733,
    'wax-zone': 18790730,
    'wax-3': 18790732,
    'mask': 18790759,
    'scrub': 18790758
  };

  // Несколько услуг идут подряд, у каждой своя буква s:
  // o=m<мастер>s<услуга1>s<услуга2>s<услуга3> (проверено 16.11.2026)
  var SERVICE_SEPARATOR = 's';

  function bookingUrl(masterId, branch, serviceKeys) {
    var b = BRANCHES[branch];
    var base = b.form + '/company/' + b.company + '/personal/';
    var staff = STAFF[masterId];
    var ids = serviceKeys
      .map(function (key) { return SERVICES[key]; })
      .filter(Boolean);
    if (staff && ids.length) return base + 'select-time?o=m' + staff + 's' + ids.join(SERVICE_SEPARATOR);
    if (staff) return base + 'select-services?o=m' + staff;
    return base + 'menu?o=';
  }

  function toNumber(price) {
    return parseInt(price.replace(/\D/g, ''), 10) || 0;
  }

  function formatRub(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  }

  // ---------- Переключатель зала ----------
  var KEY = 'don-corleone-branch';
  var body = document.body;
  var switchButtons = document.querySelectorAll('.switch button');

  function setBranch(branch, animate) {
    body.setAttribute('data-branch', branch);

    switchButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-set') === branch ? 'true' : 'false');
    });

    // Выбрать можно только мастеров этого зала
    document.querySelectorAll('input[name="master"]').forEach(function (input) {
      input.disabled = input.getAttribute('data-branch') !== branch;
    });

    if (animate) {
      body.classList.remove('switched');
      void body.offsetWidth;
      body.classList.add('switched');
    }

    try { localStorage.setItem(KEY, branch); } catch (e) {}
  }

  // ---------- Услуги: читаем прямо из прайса на странице ----------
  function readServices() {
    var list = [];
    var group = '';
    document.querySelectorAll('.price > h3, .price > ul').forEach(function (el) {
      if (el.tagName === 'H3') {
        group = el.textContent.trim();
        return;
      }
      el.querySelectorAll('li').forEach(function (li) {
        var d = li.querySelector('.p b.d-only, .p b:not(.f-only)');
        var f = li.querySelector('.p b.f-only, .p b:not(.d-only)');
        list.push({
          id: li.getAttribute('data-svc'),
          group: group,
          name: li.querySelector('.n').textContent.replace(/\s+/g, ' ').trim(),
          price: { d: d.textContent.trim(), f: f.textContent.trim() }
        });
      });
    });
    return list;
  }

  var services = readServices();

  // ---------- Запись ----------
  var form = document.getElementById('book');
  var svcStep = document.getElementById('step-svc');
  var svcList = document.getElementById('svc-list');
  var summary = document.getElementById('summary');
  var go = document.getElementById('go');
  var pendingService = null;

  function checkedValue(name) {
    var input = form.querySelector('input[name="' + name + '"]:checked');
    return input ? input : null;
  }

  function checkedServices() {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="svc"]:checked'));
  }

  function renderServices(branch) {
    var keepIds = checkedServices().map(function (input) { return input.value; });
    if (pendingService) keepIds.push(pendingService);
    svcList.textContent = '';

    var lastGroup = '';
    services.forEach(function (s) {
      if (s.group !== lastGroup) {
        var g = document.createElement('p');
        g.className = 'svc-group';
        g.textContent = s.group;
        svcList.appendChild(g);
        lastGroup = s.group;
      }

      var label = document.createElement('label');
      label.className = 'pick svc';

      var input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'svc';
      input.value = s.id;
      if (keepIds.indexOf(s.id) !== -1) input.checked = true;

      var n = document.createElement('span');
      n.className = 'n';
      n.textContent = s.name;

      var dots = document.createElement('span');
      dots.className = 'dots';

      var p = document.createElement('span');
      p.className = 'p';
      p.textContent = s.price[branch] + ' ₽';

      label.append(input, n, dots, p);
      svcList.appendChild(label);
    });

    pendingService = null;
    svcStep.disabled = false;
  }

  function resetServices() {
    svcList.textContent = '';
    svcStep.disabled = true;
  }

  function update() {
    var m = checkedValue('master');
    var chosen = checkedServices();

    if (!m) {
      summary.textContent = 'Выберите мастера и услуги.';
    } else if (!chosen.length) {
      summary.textContent = 'Мастер: ' + m.parentNode.querySelector('.master-name').textContent + '. Теперь выберите одну или несколько услуг.';
    }

    if (m && chosen.length) {
      var branch = m.getAttribute('data-branch');
      var keys = chosen.map(function (input) { return input.value; });
      var picked = keys.map(function (key) {
        return services.find(function (x) { return x.id === key; });
      });
      var names = picked.map(function (svc) {
        return svc.name.charAt(0).toLowerCase() + svc.name.slice(1);
      });
      var total = picked.reduce(function (sum, svc) { return sum + toNumber(svc.price[branch]); }, 0);

      summary.textContent =
        m.parentNode.querySelector('.master-name').textContent + ': ' + names.join(', ') + '. ' +
        (picked.length > 1 ? 'Итого ' : '') + formatRub(total) + '. Зал: ' + BRANCHES[branch].title + '.';
      go.href = bookingUrl(m.value, branch, keys);
      go.removeAttribute('aria-disabled');
      setCta('Выбрать время · ' + formatRub(total), go.href, true);
    } else {
      go.href = '#zapis';
      go.setAttribute('aria-disabled', 'true');
      if (m) setCta('Выбрать услуги', '#step-svc', false);
      else setCta('Записаться', '#zapis', false);
    }

    var ready = !!(m && chosen.length);
    form.classList.toggle('ready', ready);
    body.classList.toggle('book-ready', ready);
  }

  // Кнопки «Записаться» в шапке и в нижней панели телефона следуют за выбором:
  // ничего не выбрано — ведут к записи, выбран мастер — к услугам,
  // выбрано всё — сразу в календарь онлайн-записи.
  var ctas = [document.getElementById('top-book'), document.getElementById('bar-book')];
  function setCta(text, href, external) {
    ctas.forEach(function (a) {
      if (!a) return;
      a.textContent = a.id === 'top-book' && external ? 'Выбрать время' : text;
      a.href = href;
      if (external) {
        a.target = '_blank';
        a.rel = 'noopener';
      } else {
        a.removeAttribute('target');
        a.removeAttribute('rel');
      }
    });
  }

  form.addEventListener('change', function (event) {
    var input = event.target;
    if (input.name === 'master') {
      var branch = input.getAttribute('data-branch');
      setBranch(branch, body.getAttribute('data-branch') !== branch);
      renderServices(branch);
    }
    update();
  });

  form.addEventListener('submit', function (event) { event.preventDefault(); });

  go.addEventListener('click', function (event) {
    if (go.getAttribute('aria-disabled') !== 'true') return;
    event.preventDefault();
    var target = checkedValue('master')
      ? svcList.querySelector('input')
      : form.querySelector('input[name="master"]');
    if (target) target.focus();
  });

  // «Записаться вдвоём» заранее выбирает услугу «Отец + сын»
  document.querySelectorAll('[data-pick]').forEach(function (link) {
    link.addEventListener('click', function () {
      var id = link.getAttribute('data-pick');
      var ready = svcList.querySelector('input[value="' + id + '"]');
      if (ready) {
        ready.checked = true;
        update();
      } else {
        pendingService = id;
      }
    });
  });

  // Переключатель зала в шапке и кнопки «Переключить зал» у мастеров.
  // Если был выбран мастер из другого зала, сбрасываем выбор.
  document.querySelectorAll('.switch button, .link-btn[data-set]').forEach(function (button) {
    button.addEventListener('click', function () {
      var branch = button.getAttribute('data-set');
      setBranch(branch, true);
      var m = checkedValue('master');
      if (m && m.getAttribute('data-branch') !== branch) {
        m.checked = false;
        resetServices();
        update();
      }
    });
  });

  // ---------- Светлая и тёмная тема ----------
  // Без выбора сайт следует теме системы. Кнопка переключает на противоположную
  // той, что сейчас на экране. Если выбор совпал с системой, просто снова
  // следуем системе и ничего не храним.
  var THEME_KEY = 'color-scheme';
  var schemeMeta = document.querySelector('meta[name="color-scheme"]');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  var themeButton = document.getElementById('theme-btn');

  function renderedScheme() {
    var c = schemeMeta.content;
    if (c === 'dark' || c === 'light') return c;
    return systemDark.matches ? 'dark' : 'light';
  }

  themeButton.addEventListener('click', function () {
    var target = renderedScheme() === 'dark' ? 'light' : 'dark';
    var system = systemDark.matches ? 'dark' : 'light';
    if (target === system) {
      try { localStorage.removeItem(THEME_KEY); } catch (e) {}
      schemeMeta.content = 'light dark';
    } else {
      try { localStorage.setItem(THEME_KEY, target); } catch (e) {}
      schemeMeta.content = target;
    }
  });

  // Если тему поменяли в другой вкладке
  window.addEventListener('storage', function (event) {
    if (event.key === THEME_KEY) schemeMeta.content = event.newValue || 'light dark';
  });

  // Вспоминаем зал, который гость выбрал в прошлый раз,
  // иначе включаем зал по умолчанию
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  setBranch(saved === 'f' ? 'f' : 'd', false);

  // ---------- Стартовый экран «Выберите зал» ----------
  // Показываем один раз за визит (пока открыта вкладка).
  var chooser = document.getElementById('choose');
  var CHOSEN = 'don-corleone-chosen';
  var seen = false;
  try { seen = sessionStorage.getItem(CHOSEN) === '1'; } catch (e) {}

  // Умеет ли браузер анимировать исчезновение диалога сам.
  // Firefox говорит «да», но не умеет, поэтому проверяем на деле.
  var displayTransition;
  function canTransitionDisplay() {
    if (displayTransition !== undefined) return displayTransition;
    if (!(window.CSS && CSS.supports && CSS.supports('transition-behavior', 'allow-discrete'))) {
      displayTransition = false;
      return false;
    }
    var probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.appendChild(probe);
    void getComputedStyle(probe).display;
    probe.style.display = 'none';
    displayTransition = getComputedStyle(probe).display === 'block';
    probe.remove();
    return displayTransition;
  }
  function supportsTopLayerExit() {
    return !!(window.CSS && CSS.supports && CSS.supports('overlay', 'auto')) && canTransitionDisplay();
  }

  function closeChooser() {
    try { sessionStorage.setItem(CHOSEN, '1'); } catch (e) {}
    body.classList.add('entered');
    chooser.classList.add('leaving');

    if (supportsTopLayerExit()) {
      chooser.close();
      return;
    }
    // Запасной путь: сначала проигрываем анимацию, потом закрываем
    chooser.setAttribute('data-closing', '');
    var finish = function () {
      if (!chooser.hasAttribute('data-closing')) return;
      chooser.removeAttribute('data-closing');
      chooser.close();
    };
    var anims = chooser.getAnimations ? chooser.getAnimations({ subtree: true }) : [];
    if (!anims.length) { finish(); return; }
    Promise.race([
      Promise.allSettled(anims.map(function (a) { return a.finished; })),
      new Promise(function (r) { setTimeout(r, 1500); })
    ]).then(finish);
  }

  if (chooser && typeof chooser.showModal === 'function') {
    chooser.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('click', function () {
        var branch = card.getAttribute('data-set');
        setBranch(branch, false);
        var m = checkedValue('master');
        if (m && m.getAttribute('data-branch') !== branch) {
          m.checked = false;
          resetServices();
          update();
        }
        card.classList.add('picked');
        closeChooser();
      });
    });

    // Esc: остаёмся в текущем зале, но экран уходит с той же анимацией
    chooser.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeChooser();
    });

    if (!seen) chooser.showModal();
  }

  update();
})();
