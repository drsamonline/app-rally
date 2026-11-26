#!/usr/bin/env node
/* ui-tests — the Rally page in a real DOM (jsdom). SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin */
"use strict";
var fs = require("fs"), path = require("path"), { JSDOM } = require("jsdom");
var ROOT = path.join(__dirname, ".."), PLAY = path.join(ROOT, "docs", "play");
var passed = 0, failed = [];
function ok(n, c, d) { if (c) { passed++; return; } failed.push(n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function build(seed) {
  var dom = new JSDOM(fs.readFileSync(path.join(PLAY, "index.html"), "utf8"), { url: "https://example.test/play/index.html", runScripts: "outside-only", pretendToBeVisual: true });
  var w = dom.window;
  if (seed) Object.keys(seed).forEach(function (k) { w.localStorage.setItem(k, seed[k]); });
  w.URL.createObjectURL = function () { return "blob:x"; }; w.URL.revokeObjectURL = function () {};
  w.HTMLAnchorElement.prototype.click = function () {};
  ["web-kit.js", "export-kit.js", "rally-core.js", "app.js"].forEach(function (f) { w.eval(fs.readFileSync(path.join(PLAY, f), "utf8")); });
  return dom;
}
var dom = build(null), w = dom.window, d = w.document, $ = function (id) { return d.getElementById(id); };
ok("the engine loaded", !!w.RallyCore);
ok("the gaps are stated on the page", /The LAN transport is not built/.test(d.body.textContent) && /no QR scanner/.test(d.body.textContent));

$("hostBtn").click();
ok("a lobby is hosted", /is open/.test($("status").textContent), $("status").textContent);
ok("with a code on screen", /lobby \d{4}/.test($("lobbyCode").textContent), $("lobbyCode").textContent);

$("fillBtn").click();
eq("four players are listed", d.querySelectorAll("#playerList li").length, 4);
$("startBtn").click();
ok("a round opens", /is open for/.test($("status").textContent), $("status").textContent);
eq("the round says it is open", /Round 1 is open/.test($("roundSays").textContent), true);

$("playerName").value = "E"; $("joinBtn").click();
ok("a latecomer is a spectator", /SPECTATOR/.test($("status").textContent), $("status").textContent);
ok("and is marked on screen", /spectator/.test($("playerList").textContent), $("playerList").textContent);

$("allAnswer").click();
$("endBtn").click();
ok("the round closes", /closed/.test($("status").textContent), $("status").textContent);
ok("the leaderboard shows scores", /\d+ point\(s\)/.test($("boardList").textContent), $("boardList").textContent);
ok("and says the total equals the round points", /sum of the round points/.test($("boardSays").textContent), $("boardSays").textContent);

$("startBtn").click();
ok("the spectator is playing in the next round", !/spectator/.test($("playerList").textContent), $("playerList").textContent);
eq("five players now", d.querySelectorAll("#playerList li").length, 5);

$("exportBtn").click();
ok("the lobby exports", /Wrote rally-lobby-\d{4}-\d\d-\d\d\.json/.test($("ioNote").textContent), $("ioNote").textContent);
var saved = w.localStorage.getItem("rally:lobby");
var dom2 = build({ "rally:lobby": saved });
var d2 = dom2.window.document;
eq("the reload keeps five players", d2.querySelectorAll("#playerList li").length, 5);
ok("and the leaderboard", /\d+ point\(s\)/.test(d2.getElementById("boardList").textContent));

var dom3 = build({ "rally:lobby": "{ broken lobby" });
var d3 = dom3.window.document;
ok("a broken lobby is reported", /cannot be read/.test(d3.getElementById("status").textContent));
ok("and not replaced", /NOT replaced with an empty one/.test(d3.getElementById("status").textContent));

var dom4 = build(null), w4 = dom4.window, d4 = dom4.window.document;
Object.defineProperty(w4, "localStorage", { configurable: true, get: function () {
  return { getItem: function () { return null; }, setItem: function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; }, removeItem: function () {}, clear: function () {} }; } });
d4.getElementById("hostBtn").click();
ok("a failed save says NOT SAVED", /NOT SAVED:/.test(d4.getElementById("status").textContent), d4.getElementById("status").textContent);

var total = passed + failed.length;
if (!total) { console.error("ui-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("ui-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("ui-tests: " + passed + "/" + total + " assertions passed");
