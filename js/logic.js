/*
 * UniPlanner core logic: GPA math, validation, dates, task ordering and backups.
 * Pure functions only (no DOM), so the same file runs in the app, the browser
 * test page, and the command-line test runner.
 */
(function (root) {
  'use strict';

  // ---------- Constants ----------

  /** Order within a calendar year. */
  const TERMS = ['Winter', 'Spring', 'Summer'];

  const IMPORTANCE = [
    { value: 0, label: 'None', symbol: '' },
    { value: 1, label: 'Important', symbol: '❗️' },
    { value: 2, label: 'Very Important', symbol: '‼️' },
  ];

  /** 0 means "Binary" (pass/fail, excluded from every GPA). Then 0.5 … 6. */
  const CREDIT_OPTIONS = Array.from({ length: 13 }, (_, i) => i / 2);

  const MAX_POINTS_DIGITS = 5;

  // ---------- Numbers ----------

  /** "4", "3.5", "88.25": at most two decimals, no trailing zeros, no grouping. */
  function clean(n) {
    return String(Math.round(n * 100) / 100);
  }

  // ---------- GPA ----------

  const isBinary = (course) => course.credits === 0;

  /** Credit-weighted average of all non-binary courses; null when there is nothing to average. */
  function average(courses) {
    let credits = 0;
    let sum = 0;
    for (const c of courses) {
      if (isBinary(c) || typeof c.grade !== 'number') continue;
      credits += c.credits;
      sum += c.credits * c.grade;
    }
    return credits > 0 ? sum / credits : null;
  }

  /**
   * Keeps two decimals and rounds up only when the third decimal is 8 or 9.
   * 88.293 → 88.29, 78.447 → 78.44, 91.549 → 91.55, 63.278 → 63.28
   */
  function adjusted(value) {
    const thousandths = Math.floor(value * 1000 + 1e-6);
    let hundredths = Math.floor(thousandths / 10);
    if (thousandths % 10 >= 8) hundredths += 1;
    return hundredths / 100;
  }

  function formatGPA(value) {
    return value == null ? '—' : adjusted(value).toFixed(2);
  }

  // ---------- Semesters & courses ----------

  const semesterTitle = (s) => `${s.year} - ${s.term}`;
  const courseTitle = (c) => `${c.name} - ${c.number}`;
  const semesterCredits = (s) => s.courses.reduce((sum, c) => sum + c.credits, 0);
  const semesterGPA = (s) => average(s.courses);
  const allCourses = (semesters) => semesters.flatMap((s) => s.courses);
  const totalCredits = (semesters) => semesters.reduce((sum, s) => sum + semesterCredits(s), 0);
  const totalGPA = (semesters) => average(allCourses(semesters));

  /** Newest first. */
  function sortSemesters(semesters) {
    return [...semesters].sort(
      (a, b) => b.year - a.year || TERMS.indexOf(b.term) - TERMS.indexOf(a.term)
    );
  }

  function semesterExists(semesters, year, term, excludingId) {
    return semesters.some((s) => s.year === year && s.term === term && s.id !== excludingId);
  }

  /** The semester that already holds a course with this number, if any. */
  function semesterContaining(semesters, courseNumber, excludingCourseId) {
    return (
      semesters.find((s) =>
        s.courses.some((c) => c.number === courseNumber && c.id !== excludingCourseId)
      ) || null
    );
  }

  const isValidCourseNumber = (text) => /^\d{8}$/.test(text);
  const sanitizeCourseNumber = (text) => String(text).replace(/\D/g, '').slice(0, 8);

  /** Numeric grade between 0 and 100 (accepts "," as decimal point); null if invalid. */
  function parseGrade(text) {
    const t = String(text).trim().replace(',', '.');
    if (!/^(\d+(\.\d+)?|\.\d+)$/.test(t)) return null;
    const value = Number(t);
    return value >= 0 && value <= 100 ? value : null;
  }

  const creditsText = (c) => (isBinary(c) ? 'Binary' : clean(c.credits));

  function gradeText(c) {
    if (isBinary(c)) return c.passed ? 'Pass' : 'Fail';
    return typeof c.grade === 'number' ? clean(c.grade) : '—';
  }

  // ---------- Dates ----------

  const pad = (n) => String(n).padStart(2, '0');

  /** Local calendar day as "YYYY-MM-DD". */
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function parseDayKey(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key));
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return dayKey(d) === key ? d : null;
  }

  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  /** Today plus the next six days (midnight, local time). */
  function upcomingDays(now = new Date()) {
    return Array.from({ length: 7 }, (_, i) => addDays(now, i));
  }

  function dayTitle(day, now = new Date(), locale) {
    const key = dayKey(day);
    if (key === dayKey(now)) return 'Today';
    if (key === dayKey(addDays(now, 1))) return 'Tomorrow';
    return day.toLocaleDateString(locale, { weekday: 'long' });
  }

  const isValidTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t));

  // ---------- Tasks ----------

  /** Most important first; equal importance sorted by points, highest first. */
  function tasksOn(tasks, key) {
    return tasks
      .filter((t) => t.day === key)
      .sort(
        (a, b) =>
          b.importance - a.importance || b.points - a.points || a.title.localeCompare(b.title)
      );
  }

  /** Points-based progress; counts tasks instead when no task that day has points. */
  function progress(items) {
    const total = items.reduce((sum, t) => sum + t.points, 0);
    if (total === 0) {
      return { done: items.filter((t) => t.isDone).length, total: items.length, countsTasks: true };
    }
    const done = items.filter((t) => t.isDone).reduce((sum, t) => sum + t.points, 0);
    return { done, total, countsTasks: false };
  }

  const progressFraction = (p) => (p.total === 0 ? 0 : p.done / p.total);
  const percentText = (p) => `${Math.round(progressFraction(p) * 100)}%`;
  const progressDetail = (p) =>
    p.countsTasks ? `${p.done} of ${p.total} tasks done` : `${p.done} of ${p.total} points earned`;

  const sanitizePoints = (text) => String(text).replace(/\D/g, '').slice(0, MAX_POINTS_DIGITS);

  // ---------- IDs ----------

  function newId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // ---------- Backups ----------

  function buildBackup(data, now = new Date()) {
    return {
      app: 'UniPlanner',
      version: 1,
      exportedAt: now.toISOString(),
      semesters: data.semesters,
      tasks: data.tasks,
    };
  }

  const nonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

  function normalizeCourse(c, where) {
    if (!c || typeof c !== 'object') throw new Error(`${where} is not a course.`);
    const number = String(c.number ?? '');
    if (!isValidCourseNumber(number)) throw new Error(`${where} has an invalid course number.`);
    if (!nonEmptyString(c.name)) throw new Error(`${where} has no name.`);
    const credits = Number(c.credits);
    if (!CREDIT_OPTIONS.includes(credits)) throw new Error(`${where} has invalid credit points.`);
    let grade = null;
    if (credits !== 0) {
      grade = typeof c.grade === 'number' ? c.grade : parseGrade(c.grade ?? '');
      if (grade == null || grade < 0 || grade > 100) throw new Error(`${where} has an invalid grade.`);
    }
    return {
      id: nonEmptyString(c.id) ? c.id : newId(),
      number,
      name: c.name.trim(),
      credits,
      grade,
      passed: c.passed !== false,
    };
  }

  function normalizeTask(t, where) {
    if (!t || typeof t !== 'object') throw new Error(`${where} is not a task.`);
    if (!nonEmptyString(t.title)) throw new Error(`${where} has no title.`);
    if (!parseDayKey(t.day)) throw new Error(`${where} has an invalid day.`);
    const finishBefore = t.finishBefore == null || t.finishBefore === '' ? null : String(t.finishBefore);
    if (finishBefore !== null && !isValidTime(finishBefore)) throw new Error(`${where} has an invalid time.`);
    const importance = Number(t.importance ?? 0);
    if (![0, 1, 2].includes(importance)) throw new Error(`${where} has an invalid importance.`);
    const points = Number(t.points ?? 0);
    if (!Number.isInteger(points) || points < 0 || points > 99999) throw new Error(`${where} has invalid points.`);
    return {
      id: nonEmptyString(t.id) ? t.id : newId(),
      title: t.title.trim(),
      day: t.day,
      finishBefore,
      importance,
      points,
      isDone: t.isDone === true,
    };
  }

  /** Validates backup/stored data and returns a clean copy. Throws a readable Error if invalid. */
  function normalizeBackup(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.semesters) || !Array.isArray(raw.tasks)) {
      throw new Error('This file is not a UniPlanner backup.');
    }
    const semesters = raw.semesters.map((s, i) => {
      const where = `Semester ${i + 1}`;
      if (!s || typeof s !== 'object') throw new Error(`${where} is invalid.`);
      const year = Number(s.year);
      if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error(`${where} has an invalid year.`);
      if (!TERMS.includes(s.term)) throw new Error(`${where} has an invalid term.`);
      if (!Array.isArray(s.courses)) throw new Error(`${where} has no course list.`);
      return {
        id: nonEmptyString(s.id) ? s.id : newId(),
        year,
        term: s.term,
        courses: s.courses.map((c, j) => normalizeCourse(c, `${where}, course ${j + 1}`)),
      };
    });

    const seenSemesters = new Set();
    const seenNumbers = new Set();
    for (const s of semesters) {
      const title = semesterTitle(s);
      if (seenSemesters.has(title)) throw new Error(`Semester ${title} appears twice.`);
      seenSemesters.add(title);
      for (const c of s.courses) {
        if (seenNumbers.has(c.number)) throw new Error(`Course number ${c.number} appears twice.`);
        seenNumbers.add(c.number);
      }
    }

    const tasks = raw.tasks.map((t, i) => normalizeTask(t, `Task ${i + 1}`));
    return { semesters, tasks };
  }

  root.Logic = {
    TERMS,
    IMPORTANCE,
    CREDIT_OPTIONS,
    clean,
    isBinary,
    average,
    adjusted,
    formatGPA,
    semesterTitle,
    courseTitle,
    semesterCredits,
    semesterGPA,
    allCourses,
    totalCredits,
    totalGPA,
    sortSemesters,
    semesterExists,
    semesterContaining,
    isValidCourseNumber,
    sanitizeCourseNumber,
    parseGrade,
    creditsText,
    gradeText,
    dayKey,
    parseDayKey,
    addDays,
    upcomingDays,
    dayTitle,
    isValidTime,
    tasksOn,
    progress,
    progressFraction,
    percentText,
    progressDetail,
    sanitizePoints,
    newId,
    buildBackup,
    normalizeBackup,
  };
})(typeof window !== 'undefined' ? window : globalThis);
