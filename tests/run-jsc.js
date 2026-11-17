// Command-line runner for macOS JavaScriptCore (see tests/run.sh).
load('js/logic.js');
load('tests/logic.test.js');
const failed = TestResults.filter((r) => !r.ok);
for (const r of TestResults) print((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : '\n      ' + r.error));
print(`\n${TestResults.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) throw new Error('Some tests failed');
