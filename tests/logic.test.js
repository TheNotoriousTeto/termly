/*
 * Tests for js/logic.js. Runs in the browser (tests/index.html) and in the
 * terminal (tests/run.sh, using macOS's built-in JavaScriptCore).
 */
(function (root) {
  'use strict';
  const L = root.Logic;
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, error: err && err.message ? err.message : String(err) });
    }
  }

  /** JSON with object keys sorted, so key order doesn't affect equality. */
  function stable(value) {
    return JSON.stringify(value, (key, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
        : v
    );
  }

  function eq(actual, expected, label) {
    const a = stable(actual);
    const e = stable(expected);
    if (a !== e) throw new Error(`${label ? label + ': ' : ''}expected ${e}, got ${a}`);
  }

  function throws(fn, pattern, label) {
    try {
      fn();
    } catch (err) {
      if (pattern && !pattern.test(err.message)) {
        throw new Error(`${label || 'error'}: message "${err.message}" does not match ${pattern}`);
      }
      return;
    }
    throw new Error(`${label || 'call'}: expected an error, none thrown`);
  }

  const course = (number, name, credits, grade, passed = true) => ({
    id: 'c-' + number, number, name, credits, grade: credits === 0 ? null : grade, passed,
  });
  const task = (title, day, importance, points, isDone = false, finishBefore = null) => ({
    id: 't-' + title, title, day, importance, points, isDone, finishBefore,
  });

  // Same sample data used to check the native app.
  const sample = [
    { id: 's1', year: 2025, term: 'Winter', courses: [
      course('01040012', 'Calculus 1', 5, 88),
      course('01140051', 'Physics 1', 4, 79.5),
      course('03940800', 'Physical Education', 0, null),
    ] },
    { id: 's2', year: 2025, term: 'Spring', courses: [
      course('02340114', 'Intro to CS', 3, 91),
      course('01040016', 'Linear Algebra', 3.5, 76),
    ] },
  ];

  // ---------- GPA rounding (ported from the Swift checks) ----------

  test('GPA rule: the spec examples', () => {
    eq(L.formatGPA(88.293), '88.29');
    eq(L.formatGPA(78.447), '78.44');
    eq(L.formatGPA(91.549), '91.55');
    eq(L.formatGPA(63.278), '63.28');
  });

  test('GPA rule: carry into the next whole number', () => {
    eq(L.formatGPA(89.998), '90.00');
  });

  test('GPA rule: always two decimals', () => {
    eq(L.formatGPA(90), '90.00');
    eq(L.formatGPA(85.1), '85.10');
    eq(L.formatGPA(100), '100.00');
    eq(L.formatGPA(0), '0.00');
  });

  test('GPA rule: third decimal 7 truncates, 8 rounds up', () => {
    eq(L.formatGPA(70.997), '70.99');
    eq(L.formatGPA(70.998), '71.00');
  });

  test('GPA rule: values that look exact survive floating point', () => {
    eq(L.formatGPA(82.28), '82.28');
    eq(L.formatGPA(0.29), '0.29');
    eq(L.formatGPA(64.1), '64.10');
  });

  test('GPA: shows a dash when there is nothing to average', () => {
    eq(L.formatGPA(null), '—');
    eq(L.average([]), null);
    eq(L.average([course('11111111', 'PE', 0, null)]), null);
  });

  test('GPA: credit-weighted and excludes binary (ported Swift check)', () => {
    const cs = [course('1', 'a', 3, 90), course('2', 'b', 2, 80), course('3', 'c', 0, null)];
    eq(L.formatGPA(L.average(cs)), '86.00');
  });

  test('GPA: sample semesters match the native app', () => {
    eq(L.formatGPA(L.semesterGPA(sample[0])), '84.22');
    eq(L.formatGPA(L.semesterGPA(sample[1])), '82.92');
    eq(L.formatGPA(L.totalGPA(sample)), '83.67');
    eq(L.clean(L.totalCredits(sample)), '15.5');
    eq(L.clean(L.semesterCredits(sample[0])), '9');
  });

  // ---------- Formatting ----------

  test('Numbers: no trailing zeros and no thousands separator', () => {
    eq(L.clean(4), '4');
    eq(L.clean(3.5), '3.5');
    eq(L.clean(79.5), '79.5');
    eq(L.clean(2026), '2026');
  });

  test('Titles use "Name - Number" and "Year - Term"', () => {
    eq(L.courseTitle(sample[0].courses[0]), 'Calculus 1 - 01040012');
    eq(L.semesterTitle({ year: 2026, term: 'Winter' }), '2026 - Winter');
  });

  test('Course card text: credits and grade', () => {
    eq(L.creditsText(sample[0].courses[0]), '5');
    eq(L.creditsText(sample[0].courses[2]), 'Binary');
    eq(L.gradeText(sample[0].courses[1]), '79.5');
    eq(L.gradeText(sample[0].courses[2]), 'Pass');
    eq(L.gradeText(course('22222222', 'Swim', 0, null, false)), 'Fail');
  });

  test('Credit options: Binary, then 0.5 steps up to 6', () => {
    eq(L.CREDIT_OPTIONS.length, 13);
    eq(L.CREDIT_OPTIONS[0], 0);
    eq(L.CREDIT_OPTIONS[1], 0.5);
    eq(L.CREDIT_OPTIONS[12], 6);
  });

  // ---------- Validation ----------

  test('Course number: exactly 8 digits', () => {
    eq(L.isValidCourseNumber('01040012'), true);
    eq(L.isValidCourseNumber('0104001'), false);
    eq(L.isValidCourseNumber('010400123'), false);
    eq(L.isValidCourseNumber('0104001a'), false);
  });

  test('Course number input keeps digits only, max 8', () => {
    eq(L.sanitizeCourseNumber('0234011499'), '02340114');
    eq(L.sanitizeCourseNumber('02-34 01a14'), '02340114');
  });

  test('Grade: 0 to 100, decimals, comma accepted', () => {
    eq(L.parseGrade('90'), 90);
    eq(L.parseGrade('79.5'), 79.5);
    eq(L.parseGrade('79,5'), 79.5);
    eq(L.parseGrade('0'), 0);
    eq(L.parseGrade('100'), 100);
    eq(L.parseGrade('100.5'), null);
    eq(L.parseGrade('-1'), null);
    eq(L.parseGrade('abc'), null);
    eq(L.parseGrade(''), null);
    eq(L.parseGrade('1e2'), null);
  });

  test('Points input keeps digits only, max 5', () => {
    eq(L.sanitizePoints('12a3'), '123');
    eq(L.sanitizePoints('1234567'), '12345');
  });

  // ---------- Duplicates ----------

  test('Duplicate semester is detected, but not against itself', () => {
    eq(L.semesterExists(sample, 2025, 'Winter', undefined), true);
    eq(L.semesterExists(sample, 2025, 'Summer', undefined), false);
    eq(L.semesterExists(sample, 2025, 'Winter', 's1'), false);
  });

  test('Same course twice in one semester is blocked; other semesters are fine', () => {
    eq(L.courseInSemester(sample[1], '02340114', undefined), true);
    eq(L.courseInSemester(sample[0], '02340114', undefined), false, 'retake in another semester');
    eq(L.courseInSemester(sample[1], '02340114', 'c-02340114'), false, 'editing the same course');
  });

  // ---------- Retaken courses ----------

  // Calculus 1 failed in 2025 Winter (5 points, 55), retaken in 2026 Winter (4 points, 85).
  const firstTry = { ...course('01040012', 'Calculus 1', 5, 55), id: 'calc-1st' };
  const retake = { ...course('01040012', 'Calculus 1', 4, 85), id: 'calc-2nd' };
  const withRetake = [
    { id: 'w25', year: 2025, term: 'Winter', courses: [firstTry, course('01140051', 'Physics 1', 4, 79.5)] },
    { id: 'w26', year: 2026, term: 'Winter', courses: [retake] },
  ];

  test('Retake: totals use only the latest attempt, with its credit points', () => {
    eq(L.clean(L.totalCredits(withRetake)), '8', '4 (Physics) + 4 (retake), old 5 dropped');
    eq(L.formatGPA(L.totalGPA(withRetake)), '82.25', '(4×79.5 + 4×85) / 8');
  });

  test('Retake: each semester still shows its own attempt', () => {
    eq(L.clean(L.semesterCredits(withRetake[0])), '9');
    eq(L.formatGPA(L.semesterGPA(withRetake[0])), '65.89', '(5×55 + 4×79.5) / 9 = 65.888…');
    eq(L.clean(L.semesterCredits(withRetake[1])), '4');
    eq(L.formatGPA(L.semesterGPA(withRetake[1])), '85.00');
  });

  test('Retake: "latest" means latest semester, not the order entered', () => {
    const reversed = [withRetake[1], withRetake[0]];
    eq(L.formatGPA(L.totalGPA(reversed)), '82.25');
    eq(L.clean(L.totalCredits(reversed)), '8');
  });

  test('Retake: a lower grade on the latest attempt still replaces the old one', () => {
    const worse = [withRetake[0], { ...withRetake[1], courses: [{ ...retake, grade: 50 }] }];
    eq(L.formatGPA(L.totalGPA(worse)), '64.75', '(4×79.5 + 4×50) / 8');
  });

  test('Retake: three attempts, only the last counts and each older one points to the next', () => {
    const third = { ...course('01040012', 'Calculus 1', 5, 92), id: 'calc-3rd' };
    const sems = [...withRetake, { id: 's26', year: 2026, term: 'Spring', courses: [third] }];
    eq(L.countedCourses(sems).map((c) => c.id).sort(), ['c-01140051', 'calc-3rd']);
    eq(L.clean(L.totalCredits(sems)), '9');
    eq(L.semesterTitle(L.retakenIn(sems, sems[0], '01040012')), '2026 - Winter');
    eq(L.semesterTitle(L.retakenIn(sems, sems[1], '01040012')), '2026 - Spring');
    eq(L.retakenIn(sems, sems[2], '01040012'), null, 'latest attempt is not marked');
  });

  test('Retake: Spring follows Winter in the same year', () => {
    const sems = [
      { id: 'sp', year: 2025, term: 'Spring', courses: [{ ...retake, id: 'sp-c' }] },
      { id: 'wi', year: 2025, term: 'Winter', courses: [{ ...firstTry, id: 'wi-c' }] },
    ];
    eq(L.countedCourses(sems).map((c) => c.id), ['sp-c']);
    eq(L.semesterTitle(L.retakenIn(sems, sems[1], '01040012')), '2025 - Spring');
  });

  test('Retake: courses taken once are never marked', () => {
    eq(L.retakenIn(withRetake, withRetake[0], '01140051'), null);
  });

  test('Semesters sort newest first', () => {
    const list = [
      { id: 'a', year: 2024, term: 'Summer', courses: [] },
      { id: 'b', year: 2025, term: 'Winter', courses: [] },
      { id: 'c', year: 2025, term: 'Spring', courses: [] },
    ];
    eq(L.sortSemesters(list).map((s) => s.id), ['c', 'b', 'a']);
  });

  // ---------- Days ----------

  test('Upcoming days: today plus six', () => {
    const days = L.upcomingDays(new Date(2026, 9, 20, 14, 40));
    eq(days.length, 7);
    eq(L.dayKey(days[0]), '2026-10-20');
    eq(L.dayKey(days[6]), '2026-10-26');
  });

  test('Upcoming days: across month and year ends', () => {
    eq(L.dayKey(L.upcomingDays(new Date(2026, 11, 29))[6]), '2027-01-04');
    eq(L.dayKey(L.upcomingDays(new Date(2028, 1, 27))[2]), '2028-02-29');
  });

  test('Day titles: Today, Tomorrow, then weekday', () => {
    const now = new Date(2026, 9, 20, 9, 0);
    const days = L.upcomingDays(now);
    eq(L.dayTitle(days[0], now, 'en-US'), 'Today');
    eq(L.dayTitle(days[1], now, 'en-US'), 'Tomorrow');
    eq(L.dayTitle(days[2], now, 'en-US'), 'Thursday');
    eq(L.dayTitle(days[6], now, 'en-US'), 'Monday');
  });

  test('Day keys round-trip and reject impossible dates', () => {
    eq(L.dayKey(L.parseDayKey('2026-10-20')), '2026-10-20');
    eq(L.parseDayKey('2026-02-30'), null);
    eq(L.parseDayKey('nope'), null);
  });

  // ---------- Tasks ----------

  const day = '2026-10-20';
  const todays = [
    task('Buy groceries', day, 0, 5),
    task("Doctor's appointment", day, 1, 10, true, '14:00'),
    task('Calc 1 homework', day, 2, 30, false, '23:00'),
    task('Lab report', day, 2, 20),
    task('Read chapter 3', '2026-10-21', 1, 10),
  ];

  test('Tasks: importance first, then points, only for that day', () => {
    eq(L.tasksOn(todays, day).map((t) => t.title), [
      'Calc 1 homework', 'Lab report', "Doctor's appointment", 'Buy groceries',
    ]);
  });

  test('Progress: share of points earned', () => {
    const items = L.tasksOn(todays, day);
    const p = L.progress(items);
    eq([p.done, p.total, L.percentText(p)], [10, 65, '15%']);
    eq(L.progressDetail(p), '10 of 65 points earned');
    const ticked = items.map((t) => (t.title === 'Calc 1 homework' ? { ...t, isDone: true } : t));
    eq(L.percentText(L.progress(ticked)), '62%');
  });

  test('Progress: counts tasks when nobody set points', () => {
    const p = L.progress([task('a', day, 0, 0, true), task('b', day, 0, 0), task('c', day, 0, 0)]);
    eq([p.done, p.total, p.countsTasks, L.percentText(p)], [1, 3, true, '33%']);
    eq(L.progressDetail(p), '1 of 3 tasks done');
    eq(L.percentText(L.progress([])), '0%');
  });

  // ---------- Backups ----------

  test('Backup: round trip keeps everything', () => {
    const backup = L.buildBackup({ semesters: sample, tasks: todays }, new Date(Date.UTC(2026, 9, 20)));
    eq(backup.app, 'Termly');
    eq(backup.exportedAt, '2026-10-20T00:00:00.000Z');
    const restored = L.normalizeBackup(JSON.parse(JSON.stringify(backup)));
    eq(restored, { semesters: sample, tasks: todays });
  });

  test('Backup: rejects files that are not backups', () => {
    throws(() => L.normalizeBackup(null), /not a Termly backup/);
    throws(() => L.normalizeBackup({ hello: 1 }), /not a Termly backup/);
    throws(() => L.normalizeBackup([]), /not a Termly backup/);
  });

  test('Backup: rejects bad values with a readable reason', () => {
    const bad = (patch) => ({ semesters: [{ id: 's', year: 2025, term: 'Winter', courses: [patch] }], tasks: [] });
    throws(() => L.normalizeBackup(bad(course('123', 'X', 3, 90))), /invalid course number/);
    throws(() => L.normalizeBackup(bad(course('12345678', 'X', 2.6, 90))), /invalid credit points/);
    throws(() => L.normalizeBackup(bad(course('12345678', 'X', 3, 101))), /invalid grade/);
    throws(() => L.normalizeBackup({ semesters: [{ year: 2025, term: 'Fall', courses: [] }], tasks: [] }), /invalid term/);
    throws(() => L.normalizeBackup({ semesters: [], tasks: [task('x', '2026-13-01', 0, 0)] }), /invalid day/);
    throws(() => L.normalizeBackup({ semesters: [], tasks: [task('x', day, 5, 0)] }), /invalid importance/);
    throws(() => L.normalizeBackup({ semesters: [], tasks: [task('x', day, 0, 0, false, '25:00')] }), /invalid time/);
  });

  test('Backup: rejects duplicate semesters and same course twice in one semester', () => {
    const s = (id, term, courses) => ({ id, year: 2025, term, courses });
    throws(() => L.normalizeBackup({ semesters: [s('a', 'Winter', []), s('b', 'Winter', [])], tasks: [] }), /appears twice/);
    throws(() => L.normalizeBackup({
      semesters: [s('a', 'Winter', [course('12345678', 'A', 3, 90), { ...course('12345678', 'A', 3, 80), id: 'x' }])],
      tasks: [],
    }), /12345678 appears twice in 2025 - Winter/);
  });

  test('Backup: keeps retaken courses across semesters', () => {
    const out = L.normalizeBackup(JSON.parse(JSON.stringify({ semesters: withRetake, tasks: [] })));
    eq(out.semesters.map((s) => s.courses.length), [2, 1]);
    eq(L.formatGPA(L.totalGPA(out.semesters)), '82.25');
  });

  test('Backup: fills in missing ids and defaults', () => {
    const out = L.normalizeBackup({
      semesters: [{ year: 2025, term: 'Summer', courses: [{ number: '12345678', name: ' Art ', credits: 0 }] }],
      tasks: [{ title: 'x', day }],
    });
    eq(typeof out.semesters[0].id, 'string');
    eq(out.semesters[0].courses[0].name, 'Art');
    eq(out.semesters[0].courses[0].passed, true);
    eq([out.tasks[0].importance, out.tasks[0].points, out.tasks[0].isDone, out.tasks[0].finishBefore], [0, 0, false, null]);
  });

  root.TestResults = results;
})(typeof window !== 'undefined' ? window : globalThis);
