#!/bin/sh
# Runs the logic tests with the JavaScript engine built into macOS (no installs needed).
set -e
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
[ -x "$JSC" ] || JSC=$(command -v jsc || command -v node)
"$JSC" tests/run-jsc.js
