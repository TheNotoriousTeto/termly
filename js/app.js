/*
 * UniPlanner UI: screens, navigation, sheets, menus, alerts and storage.
 * All GPA/task rules live in logic.js (window.Logic).
 */
(function () {
  'use strict';

  const L = window.Logic;
  const STORAGE_KEY = 'uniplanner.v1';

  // ---------- Small helpers ----------

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  function formatTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const shortDate = (d) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const dayMonth = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  // ---------- Icons ----------

  const svg = (body, attrs = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" ${attrs}>${body}</svg>`;

  const ICON = {
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    back: svg('<path d="m15 5-7 7 7 7"/>', 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'),
    chevronRight: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    ellipsis: svg('<circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/>', 'fill="currentColor"'),
    pencil: svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>', 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'),
    trash: svg('<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6"/>', 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'),
    backup: svg('<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2"/>'),
    exportIcon: svg('<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'),
    importIcon: svg('<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'),
    upDown: svg('<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>', 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'),
    checkboxOff: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/>', 'fill="none" stroke="currentColor" stroke-width="1.8"'),
    checkboxOn: svg('<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.6" fill="currentColor"/><path d="m7.5 12.3 3 3 6-6.5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>', ''),
    capOutline: svg('<path d="M12 4 2 8.6l10 4.6 10-4.6L12 4Z"/><path d="M6 11v4.6c0 1.8 2.7 3.4 6 3.4s6-1.6 6-3.4V11"/><path d="M21 9.5v5.5"/>', 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'),
    book: svg('<path d="M6 3h11a1 1 0 0 1 1 1v14H7a2 2 0 0 0-2 2V5a2 2 0 0 1 1-2Z"/><path d="M5 20a2 2 0 0 0 2 1h11v-3M9 7h6"/>', 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'),
    checklist: svg('<path d="m3.5 6 1.6 1.6L8 4.6M3.5 13l1.6 1.6L8 11.6M12 6.5h8.5M12 13.5h8.5M4.5 19.5h.01M12 19.5h8.5"/>', 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'),
    folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M10 12h4"/>', 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'),
  };

  // ---------- Data ----------

  let data = { semesters: [], tasks: [] };

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      console.error('Storage unavailable', err);
      return;
    }
    if (!raw) return;
    try {
      data = L.normalizeBackup(JSON.parse(raw));
    } catch (err) {
      // Keep the unreadable copy instead of overwriting it on the next save.
      console.error('Stored data could not be read', err);
      try { localStorage.setItem(`${STORAGE_KEY}.unreadable-${Date.now()}`, raw); } catch (_) { /* ignore */ }
    }
  }

  /** Saves everything and redraws the current screen. */
  function commit() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, semesters: data.semesters, tasks: data.tasks }));
    } catch (err) {
      console.error(err);
      showAlert({
        title: "Couldn't Save",
        message: 'Your device storage may be full or blocked. Export a backup to keep your data safe.',
      });
    }
    render();
  }

  const findSemester = (id) => data.semesters.find((s) => s.id === id);

  const Store = {
    addSemester(year, term) {
      data.semesters.push({ id: L.newId(), year, term, courses: [] });
      commit();
    },
    updateSemester(id, year, term) {
      const s = findSemester(id);
      if (!s) return;
      s.year = year;
      s.term = term;
      commit();
    },
    deleteSemester(id) {
      data.semesters = data.semesters.filter((s) => s.id !== id);
      commit();
    },
    saveCourse(semesterId, course) {
      const s = findSemester(semesterId);
      if (!s) return;
      const i = s.courses.findIndex((c) => c.id === course.id);
      if (i >= 0) s.courses[i] = course;
      else s.courses.push(course);
      commit();
    },
    deleteCourse(semesterId, courseId) {
      const s = findSemester(semesterId);
      if (!s) return;
      s.courses = s.courses.filter((c) => c.id !== courseId);
      commit();
    },
    saveTask(task) {
      const i = data.tasks.findIndex((t) => t.id === task.id);
      if (i >= 0) data.tasks[i] = task;
      else data.tasks.push(task);
      commit();
    },
    deleteTask(id) {
      data.tasks = data.tasks.filter((t) => t.id !== id);
      commit();
    },
    toggleTask(id) {
      const t = data.tasks.find((x) => x.id === id);
      if (!t) return;
      t.isDone = !t.isDone;
      commit();
    },
    replaceAll(next) {
      data = next;
      commit();
    },
  };

  // ---------- Navigation ----------
  // Routes: #/gpa, #/gpa/<semesterId>, #/tasks, #/tasks/<YYYY-MM-DD>

  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'tasks') {
      return { tab: 'tasks', day: parts[1] && L.parseDayKey(parts[1]) ? parts[1] : null };
    }
    return { tab: 'gpa', semesterId: parts[0] === 'gpa' && parts[1] ? decodeURIComponent(parts[1]) : null };
  }

  const isRootHash = (hash) => hash === '#/gpa' || hash === '#/tasks';
  const lastHashForTab = { gpa: '#/gpa', tasks: '#/tasks' };
  const scrollMemory = {};
  let renderedHash = null;

  function currentHash() {
    return location.hash && location.hash !== '#' ? location.hash : '#/gpa';
  }

  function go(hash, { push = true } = {}) {
    if (hash !== location.hash) {
      if (push) history.pushState({ pushed: true }, '', hash);
      else history.replaceState(null, '', hash);
    }
    render();
  }

  /** Back button: pop history if we pushed this screen, otherwise jump to the tab's root. */
  function goBack(rootHash) {
    if (history.state && history.state.pushed) history.back();
    else go(rootHash, { push: false });
  }

  function switchTab(tab) {
    const route = parseRoute();
    if (route.tab === tab) {
      // Tapping the current tab pops to its first screen, like iOS.
      if (!isRootHash(currentHash())) go(`#/${tab}`, { push: false });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    lastHashForTab[route.tab] = currentHash();
    go(lastHashForTab[tab], { push: false });
  }

  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', render);

  // ---------- Rendering ----------

  const topbar = (left = '', right = '') =>
    `<header class="topbar"><div class="topbar-side">${left}</div><div class="topbar-side">${right}</div></header>`;

  const circleBtn = (action, label, icon) =>
    `<button type="button" class="circle-btn" data-action="${action}" aria-label="${esc(label)}">${icon}</button>`;

  const statTile = (label, value) =>
    `<div class="card stat"><div class="stat-label">${esc(label)}</div><div class="stat-value">${esc(value)}</div></div>`;

  const emptyState = (icon, title, text) =>
    `<div class="empty">${icon}<h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}</div>`;

  const menuButton = (kind, id, title) =>
    `<button type="button" class="menu-btn" data-action="menu" data-kind="${kind}" data-id="${esc(id)}" aria-label="Options for ${esc(title)}" aria-haspopup="menu">${ICON.ellipsis}</button>`;

  function infoCard({ kind, id, title, lines, openAction }) {
    return `<div class="card info-card">
      ${openAction ? `<button type="button" class="card-hit" data-action="${openAction}" data-id="${esc(id)}" aria-label="Open ${esc(title)}"></button>` : ''}
      <div class="info-title">${esc(title)}</div>
      <div class="info-lines">${lines.map((line) => `<div>${esc(line)}</div>`).join('')}</div>
      ${menuButton(kind, id, title)}
    </div>`;
  }

  function semestersScreen() {
    const semesters = L.sortSemesters(data.semesters);
    return `<div class="screen">
      ${topbar(circleBtn('backup', 'Backup', ICON.backup), circleBtn('add-semester', 'Add Semester', ICON.plus))}
      <h1 class="large-title">GPA</h1>
      <div class="content">
        <div class="stats">
          ${statTile('Total GPA:', L.formatGPA(L.totalGPA(data.semesters)))}
          ${statTile('Total Credit Points:', L.clean(L.totalCredits(data.semesters)))}
        </div>
        ${semesters.length
          ? `<div class="grid">${semesters.map((s) => infoCard({
              kind: 'semester',
              id: s.id,
              title: L.semesterTitle(s),
              lines: [`Credit Points: ${L.clean(L.semesterCredits(s))}`, `GPA: ${L.formatGPA(L.semesterGPA(s))}`],
              openAction: 'open-semester',
            })).join('')}</div>`
          : emptyState(ICON.capOutline, 'No Semesters Yet', 'Tap + to add your first semester.')}
      </div>
    </div>`;
  }

  function semesterScreen(id) {
    const s = findSemester(id);
    const back = circleBtn('back', 'Back', ICON.back);
    if (!s) {
      return `<div class="screen">${topbar(back)}<div class="content">${emptyState(ICON.folder, 'Semester Not Found', '')}</div></div>`;
    }
    return `<div class="screen">
      ${topbar(back, circleBtn('add-course', 'Add Course', ICON.plus))}
      <h1 class="large-title">${esc(L.semesterTitle(s))}</h1>
      <div class="content">
        <div class="stats">
          ${statTile("Semester's GPA:", L.formatGPA(L.semesterGPA(s)))}
          ${statTile("Semester's Credit Points:", L.clean(L.semesterCredits(s)))}
        </div>
        ${s.courses.length
          ? `<div class="grid">${s.courses.map((c) => infoCard({
              kind: 'course',
              id: c.id,
              title: L.courseTitle(c),
              lines: [`Credit Points: ${L.creditsText(c)}`, `Grade: ${L.gradeText(c)}`],
            })).join('')}</div>`
          : emptyState(ICON.book, 'No Courses Yet', 'Tap + to add a course to this semester.')}
      </div>
    </div>`;
  }

  function ring(fraction) {
    const r = 16;
    const circumference = 2 * Math.PI * r;
    return `<div class="ring" aria-hidden="true">
      <svg viewBox="0 0 38 38"><circle class="track" cx="19" cy="19" r="${r}"/>
      <circle class="value" cx="19" cy="19" r="${r}" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - fraction)}"${fraction === 0 ? ' stroke-opacity="0"' : ''}/></svg>
      <span>${Math.round(fraction * 100)}</span>
    </div>`;
  }

  function dayRow(day, now) {
    const key = L.dayKey(day);
    const items = L.tasksOn(data.tasks, key);
    const done = items.filter((t) => t.isDone).length;
    const urgent = items.some((t) => t.importance === 2 && !t.isDone);
    const p = L.progress(items);
    const title = L.dayTitle(day, now);
    const right = items.length
      ? `<div class="day-meta"><div>${done}/${items.length} done</div>${urgent ? '<div class="urgent">‼️</div>' : ''}</div>${ring(L.progressFraction(p))}`
      : '<span class="day-none">No tasks</span>';
    const label = items.length ? `${title}, ${done} of ${items.length} done, ${L.percentText(p)}` : `${title}, no tasks`;
    return `<button type="button" class="card day-row" data-action="open-day" data-id="${key}" aria-label="${esc(label)}">
      <div class="day-text"><div class="day-title">${esc(title)}</div><div class="day-sub">${esc(shortDate(day))}</div></div>
      ${right}
      ${ICON.chevronRight}
    </button>`;
  }

  function daysScreen() {
    const now = new Date();
    return `<div class="screen">
      ${topbar(circleBtn('backup', 'Backup', ICON.backup), circleBtn('add-task', 'Add Task', ICON.plus))}
      <h1 class="large-title">Tasks</h1>
      <div class="content" style="gap:12px">${L.upcomingDays(now).map((d) => dayRow(d, now)).join('')}</div>
    </div>`;
  }

  function taskRow(t) {
    const details = [];
    if (t.finishBefore) details.push(`Finish before ${formatTime(t.finishBefore)}`);
    if (t.points > 0) details.push(`${t.points} pt${t.points === 1 ? '' : 's'}`);
    const symbol = L.IMPORTANCE[t.importance].symbol;
    return `<div class="card task-row${t.isDone ? ' done' : ''}">
      <button type="button" class="check" role="checkbox" aria-checked="${t.isDone}" data-action="toggle-task" data-id="${esc(t.id)}"
        aria-label="${esc(t.title)}">${t.isDone ? ICON.checkboxOn : ICON.checkboxOff}</button>
      <div class="task-text">
        <div class="task-title">${symbol ? `${symbol} ` : ''}${esc(t.title)}</div>
        ${details.length ? `<div class="task-details">${esc(details.join('  ·  '))}</div>` : ''}
      </div>
      ${menuButton('task', t.id, t.title)}
    </div>`;
  }

  function dayScreen(key) {
    const day = L.parseDayKey(key);
    const items = L.tasksOn(data.tasks, key);
    const p = L.progress(items);
    const fraction = L.progressFraction(p);
    return `<div class="screen">
      ${topbar(circleBtn('back', 'Back', ICON.back), circleBtn('add-task', 'Add Task', ICON.plus))}
      <h1 class="large-title">${esc(L.dayTitle(day))}</h1>
      <div class="content" style="gap:12px">
        ${items.length
          ? `<div class="card progress-card" role="group" aria-label="Progress">
              <div class="progress-top"><span class="progress-label">Progress</span><span class="progress-percent">${L.percentText(p)}</span></div>
              <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fraction * 100)}"><span style="width:${fraction * 100}%"></span></div>
              <div class="progress-detail">${esc(L.progressDetail(p))}</div>
            </div>
            ${items.map(taskRow).join('')}`
          : emptyState(ICON.checklist, 'No Tasks', 'Tap + to plan something for this day.')}
      </div>
    </div>`;
  }

  function render() {
    const hash = currentHash();
    const route = parseRoute();
    const changed = hash !== renderedHash;
    if (changed && renderedHash && isRootHash(renderedHash)) scrollMemory[renderedHash] = window.scrollY;

    let html;
    if (route.tab === 'gpa') html = route.semesterId ? semesterScreen(route.semesterId) : semestersScreen();
    else html = route.day ? dayScreen(route.day) : daysScreen();
    document.getElementById('screen').innerHTML = html;

    document.querySelectorAll('.tab').forEach((tab) => {
      const active = tab.dataset.tab === route.tab;
      tab.classList.toggle('active', active);
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });

    document.title = route.tab === 'gpa' ? 'UniPlanner · GPA' : 'UniPlanner · Tasks';
    if (changed) {
      window.scrollTo(0, isRootHash(hash) ? scrollMemory[hash] || 0 : 0);
      renderedHash = hash;
    }
  }

  // ---------- Screen actions ----------

  document.getElementById('app').addEventListener('click', (e) => {
    const target = e.target.closest('[data-action], [data-tab]');
    if (!target) return;
    if (target.dataset.tab) return switchTab(target.dataset.tab);

    const { action, id, kind } = target.dataset;
    const route = parseRoute();
    switch (action) {
      case 'backup': return openBackupSheet();
      case 'add-semester': return openSemesterForm(null);
      case 'open-semester': return go(`#/gpa/${encodeURIComponent(id)}`);
      case 'add-course': return openCourseForm(route.semesterId, null);
      case 'add-task': return openTaskForm(null, route.day || L.dayKey(new Date()));
      case 'open-day': return go(`#/tasks/${id}`);
      case 'toggle-task': return Store.toggleTask(id);
      case 'back': return goBack(route.tab === 'gpa' ? '#/gpa' : '#/tasks');
      case 'menu': return openItemMenu(target, kind, id, route);
      default: return undefined;
    }
  });

  function openItemMenu(anchor, kind, id, route) {
    if (kind === 'semester') {
      const s = findSemester(id);
      if (!s) return;
      showMenu(anchor, [
        { label: 'Edit', icon: ICON.pencil, action: () => openSemesterForm(s) },
        { label: 'Delete', icon: ICON.trash, destructive: true, action: () => confirmDelete(
          'Delete Semester?',
          `Are you sure you want to delete ${L.semesterTitle(s)}? Its ${s.courses.length} course(s) will be deleted too.`,
          () => Store.deleteSemester(s.id)
        ) },
      ]);
    } else if (kind === 'course') {
      const s = findSemester(route.semesterId);
      const c = s && s.courses.find((x) => x.id === id);
      if (!c) return;
      showMenu(anchor, [
        { label: 'Edit', icon: ICON.pencil, action: () => openCourseForm(s.id, c) },
        { label: 'Delete', icon: ICON.trash, destructive: true, action: () => confirmDelete(
          'Delete Course?',
          `Are you sure you want to delete ${L.courseTitle(c)}?`,
          () => Store.deleteCourse(s.id, c.id)
        ) },
      ]);
    } else if (kind === 'task') {
      const t = data.tasks.find((x) => x.id === id);
      if (!t) return;
      showMenu(anchor, [
        { label: 'Edit', icon: ICON.pencil, action: () => openTaskForm(t, t.day) },
        { label: 'Delete', icon: ICON.trash, destructive: true, action: () => confirmDelete(
          'Delete Task?',
          `Are you sure you want to delete “${t.title}”?`,
          () => Store.deleteTask(t.id)
        ) },
      ]);
    }
  }

  function confirmDelete(title, message, onDelete) {
    showAlert({
      title,
      message,
      buttons: [
        { label: 'Cancel', role: 'cancel' },
        { label: 'Delete', role: 'destructive', action: onDelete },
      ],
    });
  }

  // ---------- Overlays: shared plumbing ----------

  const overlays = document.getElementById('overlays');
  let lockCount = 0;

  function lockScroll() {
    if (lockCount++ === 0) document.documentElement.classList.add('locked');
  }
  function unlockScroll() {
    if (--lockCount <= 0) {
      lockCount = 0;
      document.documentElement.classList.remove('locked');
    }
  }

  /** Keeps a fixed layer sized to the visible area, so sheets sit above the iPhone keyboard. */
  function fitToVisualViewport(node) {
    const vv = window.visualViewport;
    if (!vv) return () => {};
    // Keep the field being typed in visible after the sheet shrinks for the keyboard.
    const revealFocused = () => {
      const field = document.activeElement;
      if (field && node.contains(field) && field.matches('input, textarea')) {
        requestAnimationFrame(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      }
    };
    const update = () => {
      node.style.top = `${vv.offsetTop}px`;
      node.style.height = `${vv.height}px`;
      node.classList.toggle('keyboard', window.innerHeight - vv.height > 120);
    };
    const onResize = () => { update(); revealFocused(); };
    const onFocusIn = () => setTimeout(revealFocused, 350);
    update();
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', update);
    node.addEventListener('focusin', onFocusIn);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', update);
      node.removeEventListener('focusin', onFocusIn);
    };
  }

  const escapeStack = [];
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && escapeStack.length) {
      e.preventDefault();
      escapeStack[escapeStack.length - 1]();
    }
  });

  // ---------- Sheets ----------

  function openSheet(title, body) {
    const opener = document.activeElement;
    const layer = el(`<div class="sheet-backdrop">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="sheet-header">
          <button type="button" class="pill-btn" data-sheet-cancel>Cancel</button>
          <h2 class="sheet-title">${esc(title)}</h2>
          <span></span>
        </div>
        <div class="sheet-body"></div>
      </div>
    </div>`);
    layer.querySelector('.sheet-body').append(body);
    overlays.append(layer);
    lockScroll();
    const unfit = fitToVisualViewport(layer);

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      if (document.activeElement && layer.contains(document.activeElement)) document.activeElement.blur();
      escapeStack.splice(escapeStack.indexOf(close), 1);
      unfit();
      layer.style.pointerEvents = 'none'; // let taps through while it animates away
      layer.classList.remove('open');
      setTimeout(() => {
        layer.remove();
        unlockScroll();
        if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
      }, 320);
    }

    layer.addEventListener('click', (e) => { if (e.target === layer) close(); });
    layer.querySelector('[data-sheet-cancel]').addEventListener('click', close);
    escapeStack.push(close);
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('open')));
    return { close, root: layer };
  }

  // ---------- Menus ----------

  function showMenu(anchor, items) {
    const layer = el(`<div class="menu-layer"><div class="menu" role="menu">
      ${items.map((it, i) => `<button type="button" role="menuitem" class="menu-item${it.destructive ? ' destructive' : ''}" data-i="${i}">${it.icon}<span>${esc(it.label)}</span></button>`).join('')}
    </div></div>`);
    overlays.append(layer);
    const menu = layer.querySelector('.menu');
    const rect = anchor.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - rect.right);
    menu.style.right = `${right}px`;
    const height = menu.offsetHeight;
    if (rect.top + height > window.innerHeight - 100) {
      menu.style.top = `${Math.max(8, rect.bottom - height)}px`;
      menu.classList.add('from-bottom');
    } else {
      menu.style.top = `${rect.top}px`;
    }

    function close() {
      escapeStack.splice(escapeStack.indexOf(close), 1);
      layer.remove();
    }
    layer.addEventListener('click', (e) => {
      const item = e.target.closest('.menu-item');
      close();
      if (item) items[Number(item.dataset.i)].action();
      else anchor.focus({ preventScroll: true });
    });
    escapeStack.push(close);
    menu.querySelector('.menu-item').focus({ preventScroll: true });
  }

  // ---------- Alerts ----------

  function showAlert({ title, message = '', buttons = [{ label: 'OK', role: 'cancel' }] }) {
    const opener = document.activeElement;
    const layer = el(`<div class="alert-layer">
      <div class="alert" role="alertdialog" aria-modal="true" aria-labelledby="alert-title" aria-describedby="alert-message">
        <h2 class="alert-title" id="alert-title">${esc(title)}</h2>
        ${message ? `<p class="alert-message" id="alert-message">${esc(message)}</p>` : ''}
        <div class="alert-buttons${buttons.length === 2 ? ' pair' : ''}">
          ${buttons.map((b, i) => `<button type="button" class="alert-btn${b.role === 'destructive' ? ' destructive' : ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}
        </div>
      </div>
    </div>`);
    overlays.append(layer);
    lockScroll();

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      escapeStack.splice(escapeStack.indexOf(close), 1);
      layer.style.pointerEvents = 'none';
      layer.classList.remove('open');
      setTimeout(() => {
        layer.remove();
        unlockScroll();
        if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
      }, 200);
    }
    layer.addEventListener('click', (e) => {
      const btn = e.target.closest('.alert-btn');
      if (!btn) return;
      close();
      const chosen = buttons[Number(btn.dataset.i)];
      if (chosen.action) chosen.action();
    });
    escapeStack.push(close);
    requestAnimationFrame(() => layer.classList.add('open'));
    const cancel = buttons.findIndex((b) => b.role === 'cancel');
    layer.querySelectorAll('.alert-btn')[cancel >= 0 ? cancel : 0].focus({ preventScroll: true });
  }

  // ---------- Form building blocks ----------

  const section = (header, inner, footerId = '', footer = '') => `<section class="form-section">
      ${header ? `<h3 class="form-header">${esc(header)}</h3>` : ''}
      <div class="form-group">${inner}</div>
      <p class="form-footer"${footerId ? ` id="${footerId}"` : ''}>${footer}</p>
    </section>`;

  function selectRow(label, name, options, value) {
    const current = options.find((o) => String(o.value) === String(value)) || options[0];
    return `<label class="form-row select-row">
      <span>${esc(label)}</span>
      <span class="select-value"><span data-select-label="${name}">${esc(current.label)}</span>${ICON.upDown}</span>
      <select name="${name}" aria-label="${esc(label)}">${options.map((o) =>
        `<option value="${esc(o.value)}"${String(o.value) === String(current.value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>
    </label>`;
  }

  function wireSelect(form, name, onChange) {
    const select = form.querySelector(`select[name="${name}"]`);
    select.addEventListener('change', () => {
      form.querySelector(`[data-select-label="${name}"]`).textContent = select.options[select.selectedIndex].text;
      onChange(select.value);
    });
  }

  const segmented = (name, label, options, value) => `<div class="form-row seg-row">
      <div class="segmented" role="radiogroup" aria-label="${esc(label)}" data-seg="${name}">
        ${options.map((o) => `<button type="button" class="seg${o.value === value ? ' selected' : ''}" role="radio" aria-checked="${o.value === value}" data-value="${esc(o.value)}">${esc(o.label)}</button>`).join('')}
      </div>
    </div>`;

  function wireSegmented(form, name, onChange) {
    const group = form.querySelector(`[data-seg="${name}"]`);
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg');
      if (!btn) return;
      group.querySelectorAll('.seg').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-checked', String(on));
      });
      onChange(btn.dataset.value);
    });
  }

  const submitSection = (label) =>
    `<section class="form-section"><div class="form-group"><button type="submit" class="form-submit">${esc(label)}</button></div></section>`;

  // ---------- Semester form ----------

  function openSemesterForm(existing) {
    const thisYear = new Date().getFullYear();
    let year = existing ? existing.year : thisYear;
    let term = existing ? existing.term : 'Winter';
    const years = [];
    for (let y = thisYear + 5; y >= 1990; y--) years.push(y);
    if (!years.includes(year)) years.push(year);
    years.sort((a, b) => b - a);

    const form = el(`<form class="sheet-form" novalidate>
      ${section('Year', selectRow('Year', 'year', years.map((y) => ({ value: y, label: String(y) })), year))}
      ${section('Semester', segmented('term', 'Semester', L.TERMS.map((t) => ({ value: t, label: t })), term))}
      ${submitSection(existing ? 'Save' : 'Add Semester')}
    </form>`);
    const sheet = openSheet(existing ? 'Edit Semester' : 'New Semester', form);
    wireSelect(form, 'year', (v) => { year = Number(v); });
    wireSegmented(form, 'term', (v) => { term = v; });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (L.semesterExists(data.semesters, year, term, existing && existing.id)) {
        showAlert({ title: 'Semester Already Exists', message: `You already have ${year} - ${term}.` });
        return;
      }
      if (existing) Store.updateSemester(existing.id, year, term);
      else Store.addSemester(year, term);
      sheet.close();
    });
  }

  // ---------- Course form ----------

  function openCourseForm(semesterId, existing) {
    if (!findSemester(semesterId)) return;
    const state = {
      number: existing ? existing.number : '',
      name: existing ? existing.name : '',
      credits: existing ? existing.credits : 3,
      gradeText: existing && typeof existing.grade === 'number' ? L.clean(existing.grade) : '',
      passed: existing ? existing.passed : true,
    };
    const creditOptions = L.CREDIT_OPTIONS.map((v) => ({ value: v, label: v === 0 ? 'Binary' : L.clean(v) }));

    const form = el(`<form class="sheet-form" novalidate>
      ${section('Course Number', `<input class="form-input digits" name="number" type="text" inputmode="numeric" pattern="[0-9]*"
          autocomplete="off" enterkeyhint="next" placeholder="8 digits, e.g. 01040012" aria-label="Course Number" value="${esc(state.number)}">`, 'number-footer')}
      ${section('Course Name', `<input class="form-input" name="name" type="text" autocapitalize="words" autocomplete="off"
          enterkeyhint="next" placeholder="e.g. Calculus 1" aria-label="Course Name" value="${esc(state.name)}">`)}
      ${section('Credit Points', selectRow('Credit Points', 'credits', creditOptions, state.credits), 'credits-footer')}
      <section class="form-section">
        <h3 class="form-header">Grade</h3>
        <div class="form-group">
          <div data-grade="numeric"><input class="form-input digits" name="grade" type="text" inputmode="decimal" autocomplete="off"
            enterkeyhint="done" placeholder="0 – 100" aria-label="Grade" value="${esc(state.gradeText)}"></div>
          <div data-grade="binary">${segmented('passed', 'Grade', [{ value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }], state.passed ? 'pass' : 'fail')}</div>
        </div>
        <p class="form-footer" id="grade-footer"></p>
      </section>
      ${submitSection(existing ? 'Save' : 'Add Course')}
    </form>`);
    const sheet = openSheet(existing ? 'Edit Course' : 'New Course', form);

    const numberInput = form.elements.number;
    const nameInput = form.elements.name;
    const gradeInput = form.elements.grade;
    const submit = form.querySelector('.form-submit');

    const isBinary = () => state.credits === 0;
    const grade = () => L.parseGrade(state.gradeText);
    const canSubmit = () =>
      L.isValidCourseNumber(state.number) && state.name.trim() !== '' && (isBinary() || grade() != null);

    function update() {
      const numberFooter = form.querySelector('#number-footer');
      const badNumber = state.number !== '' && !L.isValidCourseNumber(state.number);
      numberFooter.textContent = badNumber ? `Course number must be exactly 8 digits (${state.number.length}/8).` : '';
      numberFooter.classList.toggle('error', badNumber);

      form.querySelector('#credits-footer').textContent = isBinary()
        ? "Binary courses are kept for tracking only and don't count toward any GPA."
        : '';

      form.querySelector('[data-grade="numeric"]').hidden = isBinary();
      form.querySelector('[data-grade="binary"]').hidden = !isBinary();
      const gradeFooter = form.querySelector('#grade-footer');
      const badGrade = !isBinary() && state.gradeText !== '' && grade() == null;
      gradeFooter.textContent = badGrade ? 'Grade must be a number between 0 and 100.' : '';
      gradeFooter.classList.toggle('error', badGrade);

      submit.disabled = !canSubmit();
    }

    numberInput.addEventListener('input', () => {
      const digits = L.sanitizeCourseNumber(numberInput.value);
      if (digits !== numberInput.value) numberInput.value = digits;
      state.number = digits;
      update();
    });
    nameInput.addEventListener('input', () => { state.name = nameInput.value; update(); });
    gradeInput.addEventListener('input', () => { state.gradeText = gradeInput.value; update(); });
    wireSelect(form, 'credits', (v) => { state.credits = Number(v); update(); });
    wireSegmented(form, 'passed', (v) => { state.passed = v === 'pass'; });
    numberInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); nameInput.focus(); } });
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (isBinary()) nameInput.blur(); else gradeInput.focus(); }
    });
    update();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!canSubmit()) {
        if (document.activeElement) document.activeElement.blur();
        return;
      }
      const owner = L.semesterContaining(data.semesters, state.number, existing && existing.id);
      if (owner) {
        const where = L.semesterTitle(owner);
        showAlert({
          title: `Course Already Exists in ${where}`,
          message: `Course number ${state.number} is already used in ${where}.`,
        });
        return;
      }
      Store.saveCourse(semesterId, {
        id: existing ? existing.id : L.newId(),
        number: state.number,
        name: state.name.trim(),
        credits: state.credits,
        grade: isBinary() ? null : grade(),
        passed: state.passed,
      });
      sheet.close();
    });
  }

  // ---------- Task form ----------

  function openTaskForm(existing, defaultDayKey) {
    const now = new Date();
    const options = L.upcomingDays(now).map(L.dayKey);
    const startKey = existing ? existing.day : defaultDayKey;
    if (!options.includes(startKey)) options.unshift(startKey);

    const state = {
      title: existing ? existing.title : '',
      day: startKey,
      hasTime: Boolean(existing && existing.finishBefore),
      time: (existing && existing.finishBefore) || '14:00',
      importance: existing ? existing.importance : 0,
      pointsText: existing && existing.points > 0 ? String(existing.points) : '',
    };
    const dayOptions = options.map((k) => {
      const d = L.parseDayKey(k);
      return { value: k, label: `${L.dayTitle(d, now)} · ${dayMonth(d)}` };
    });
    const importanceOptions = [
      { value: '0', label: 'None' },
      { value: '1', label: '❗️ Important' },
      { value: '2', label: '‼️ Very' },
    ];

    const form = el(`<form class="sheet-form" novalidate>
      ${section('Task', `<textarea class="form-input" name="title" rows="1" maxlength="500" autocapitalize="sentences"
          enterkeyhint="done" placeholder="e.g. Calc 1 homework" aria-label="Task">${esc(state.title)}</textarea>`)}
      ${section('Day', selectRow('Day', 'day', dayOptions, state.day))}
      ${section('Finish Before', `<label class="form-row"><span>Set a time</span>
          <input type="checkbox" class="switch" name="hasTime" role="switch"${state.hasTime ? ' checked' : ''}></label>
        <label class="form-row" data-time-row${state.hasTime ? '' : ' hidden'}><span>Time</span>
          <input type="time" class="time-input" name="time" value="${esc(state.time)}" aria-label="Finish before time"></label>`)}
      ${section('Importance', segmented('importance', 'Importance', importanceOptions, String(state.importance)))}
      ${section('Points', `<input class="form-input digits" name="points" type="text" inputmode="numeric" pattern="[0-9]*"
          autocomplete="off" enterkeyhint="done" placeholder="0" aria-label="Points" value="${esc(state.pointsText)}">`,
        '', "Finishing this task adds its share of the day's points to your progress.")}
      ${submitSection(existing ? 'Save' : 'Add Task')}
    </form>`);
    const sheet = openSheet(existing ? 'Edit Task' : 'New Task', form);

    const titleInput = form.elements.title;
    const pointsInput = form.elements.points;
    const timeInput = form.elements.time;
    const submit = form.querySelector('.form-submit');

    const autoGrow = () => {
      titleInput.style.height = 'auto';
      titleInput.style.height = `${Math.min(titleInput.scrollHeight, 4 * 22 + 30)}px`;
      titleInput.style.overflowY = titleInput.scrollHeight > 4 * 22 + 30 ? 'auto' : 'hidden';
    };
    const update = () => { submit.disabled = state.title.trim() === ''; };

    titleInput.addEventListener('input', () => { state.title = titleInput.value; autoGrow(); update(); });
    titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); } });
    wireSelect(form, 'day', (v) => { state.day = v; });
    form.elements.hasTime.addEventListener('change', (e) => {
      state.hasTime = e.target.checked;
      form.querySelector('[data-time-row]').hidden = !state.hasTime;
    });
    timeInput.addEventListener('change', () => { if (L.isValidTime(timeInput.value)) state.time = timeInput.value; });
    wireSegmented(form, 'importance', (v) => { state.importance = Number(v); });
    pointsInput.addEventListener('input', () => {
      const digits = L.sanitizePoints(pointsInput.value);
      if (digits !== pointsInput.value) pointsInput.value = digits;
      state.pointsText = digits;
    });
    requestAnimationFrame(autoGrow);
    update();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = state.title.trim();
      if (!title) return;
      Store.saveTask({
        id: existing ? existing.id : L.newId(),
        title,
        day: state.day,
        finishBefore: state.hasTime ? state.time : null,
        importance: state.importance,
        points: Number(state.pointsText) || 0,
        isDone: existing ? existing.isDone : false,
      });
      sheet.close();
    });
  }

  // ---------- Backup ----------

  const importInput = document.getElementById('import-file');
  let backupSheet = null;

  function dataSummary(d) {
    const courses = d.semesters.reduce((n, s) => n + s.courses.length, 0);
    return `${plural(d.semesters.length, 'semester')}, ${plural(courses, 'course')} and ${plural(d.tasks.length, 'task')}`;
  }

  function openBackupSheet() {
    const body = el(`<div>
      ${section('', `<button type="button" class="form-action" data-backup="export">${ICON.exportIcon}<span>Export Backup</span></button>`,
        '', 'Downloads a .json file with all your semesters, courses and tasks. Keep it somewhere safe, like Files or iCloud Drive.')}
      ${section('', `<button type="button" class="form-action" data-backup="import">${ICON.importIcon}<span>Import Backup</span></button>`,
        '', 'Replaces everything in the app with the contents of a backup file. You will be asked to confirm.')}
      <p class="form-footer" style="margin-top:22px">On this device: ${esc(dataSummary(data))}. Your data is stored only on this device and never uploaded.</p>
    </div>`);
    backupSheet = openSheet('Backup', body);
    body.querySelector('[data-backup="export"]').addEventListener('click', exportBackup);
    body.querySelector('[data-backup="import"]').addEventListener('click', () => importInput.click());
  }

  function exportBackup() {
    const json = JSON.stringify(L.buildBackup(data), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uniplanner-backup-${L.dayKey(new Date())}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  importInput.addEventListener('change', async () => {
    const file = importInput.files && importInput.files[0];
    importInput.value = '';
    if (!file) return;
    let next;
    try {
      next = L.normalizeBackup(JSON.parse(await file.text()));
    } catch (err) {
      showAlert({
        title: "Couldn't Import Backup",
        message: err instanceof SyntaxError ? 'This file is not valid JSON.' : err.message,
      });
      return;
    }
    showAlert({
      title: 'Replace All Data?',
      message: `This backup has ${dataSummary(next)}. Everything currently in the app will be replaced.`,
      buttons: [
        { label: 'Cancel', role: 'cancel' },
        { label: 'Replace', role: 'destructive', action: () => {
          Store.replaceAll(next);
          if (backupSheet) backupSheet.close();
          showAlert({ title: 'Backup Imported', message: `Restored ${dataSummary(next)}.` });
        } },
      ],
    });
  });

  // ---------- Start ----------

  load();
  if (!location.hash || location.hash === '#') history.replaceState(null, '', '#/gpa');
  render();

  // Redraw "Today"/"Tomorrow" when the app comes back after midnight.
  let lastDay = L.dayKey(new Date());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && L.dayKey(new Date()) !== lastDay) {
      lastDay = L.dayKey(new Date());
      render();
    }
  });

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker not registered', err));
    });
  }
})();
