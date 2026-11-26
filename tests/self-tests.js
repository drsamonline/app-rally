#!/usr/bin/env node
/* self-tests — Rally. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Done-means: four phones join a hosted lobby in one round, each bundled game completes a round, and the
 * leaderboard shows a score for all four that equals the sum of their per-round points. A latecomer
 * joining between rounds appears as a spectator and is added to the next round's players. */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var R = require(path.join(ROOT, "docs", "play", "rally-core.js"));
var passed = 0, failed = [], group = "";
function section(n) { group = n; }
function ok(n, c, d) { if (c) { passed++; return; } failed.push(group + " :: " + n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
function strip(s) { return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); }

function four() {
  var l = R.host({ hostName: "Sohil" }, 1000).lobby;
  ["A", "B", "C", "D"].forEach(function (n, i) { l = R.join(l, { name: n }, 1001 + i).lobby; });
  return l;
}

section("done means — four phones join a hosted lobby in one round");
var lobby = four();
eq("four players", lobby.players.length, 4);
eq("no spectators", lobby.spectators.length, 0);
ok("the lobby has a code to type", /^\d{4}$/.test(lobby.code), lobby.code);
var started = R.startRound(lobby, 2000);
eq("the round opens", started.ok, true);
eq("with the same four", started.lobby.players.length, 4);
eq("and nobody watching", started.lobby.spectators.length, 0);

section("done means — each bundled game completes a round");
R.GAMES.forEach(function (g) {
  var l = R.host({ hostName: "S" }, 1000).lobby;
  l.game = g.id;
  ["A", "B", "C", "D"].forEach(function (n, i) { l = R.join(l, { name: n }, 1001 + i).lobby; });
  l = R.startRound(l, 2000).lobby;
  l.players.forEach(function (p, i) { l = R.answer(l, { playerId: p.id, correct: true, fast: i % 2 === 0 }, 3000 + i).lobby; });
  var done = R.endRound(l, 4000);
  ok(g.name + " completes a round", done.ok, done.reason);
  eq(g.name + " has points for all four", Object.keys(done.lobby.roundPoints).length, 4);
});

section("done means — the leaderboard equals the sum of the per-round points");
var l = R.startRound(lobby, 2000).lobby;
l.players.forEach(function (p, i) { l = R.answer(l, { playerId: p.id, correct: true, fast: i % 2 === 0 }, 3000 + i).lobby; });
l = R.endRound(l, 4000).lobby;
l = R.startRound(l, 5000).lobby;
l.players.forEach(function (p, i) { l = R.answer(l, { playerId: p.id, correct: i === 0, fast: false }, 6000 + i).lobby; });
l = R.endRound(l, 7000).lobby;
var board = R.leaderboard(l);
eq("four rows on the leaderboard", board.rows.length, 4);
ok("every player has a score", board.rows.every(function (r) { return typeof r.points === "number"; }));
eq("the total equals the sum of the round points", board.total, board.historySum);
eq("and the app says it agrees", board.agrees, true);
eq("the fast player leads: 13 in round 1 plus 10 in round 2", board.rows[0].points, 23);
eq("a wrong answer scores nothing", board.rows[3].points, 10);

section("done means — a latecomer is a spectator, then plays the next round");
/* the latecomer joins WHILE a round is running, which is what "between rounds" means for the roster */
var running = R.startRound(l, 7500).lobby;
var during = R.join(running, { name: "E" }, 7510);
eq("the latecomer is a spectator", during.player.spectator, true);
ok("and is told why", /SPECTATOR/.test(during.says), during.says);
var refused = R.answer(during.lobby, { name: "E", correct: true }, 7600);
eq("a spectator cannot score this round", refused.ok, false);
ok("and is told when they play", /from the next one/.test(refused.reason), refused.reason);
var next = R.startRound(during.lobby, 8000).lobby;
ok("the spectator is a player in the next round", next.players.some(function (p) { return p.name === "E"; }));
eq("and nobody is left watching", next.spectators.length, 0);
eq("five players now", next.players.length, 5);

section("scoring is small on purpose");
var solo = R.startRound(four(), 9000).lobby;
eq("a correct fast answer is 13", R.answer(solo, { name: "A", correct: true, fast: true }, 9001).points, 13);
eq("a correct slow answer is 10", R.answer(solo, { name: "B", correct: true, fast: false }, 9002).points, 10);
eq("a wrong answer is 0", R.answer(solo, { name: "C", correct: false }, 9003).points, 0);
eq("answering twice is refused", R.answer(R.answer(solo, { name: "A", correct: true }, 9004).lobby, { name: "A", correct: true }, 9005).ok, false);

section("bad input");
eq("a host with no name is refused", R.host({}, 1).field, "hostName");
eq("a player with no name is refused", R.join(four(), {}, 1).field, "name");
eq("a duplicate name is refused", R.join(four(), { name: "A" }, 1).field, "name");
eq("an answer with no round open is refused", R.answer(four(), { name: "A", correct: true }, 1).ok, false);
eq("closing a round that is not open is refused", R.endRound(four(), 1).ok, false);
eq("a round with no players is refused", R.startRound(R.host({ hostName: "S" }, 1).lobby, 2).ok, false);

section("must-not — no accounts, no internet");
var core = read("docs/play/rally-core.js");
ok("no password, login or account field", !/\b(password|login|accountId|token)\s*[:=]/i.test(strip(core)));
ok("no network code", !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(strip(core + read("docs/play/app.js"))));
ok("the page forbids connections", /connect-src 'none'/.test(read("docs/play/index.html")));
ok("the engine says the transport is not built", /TRANSPORT IS NOT BUILT/.test(core));
ok("and that there is no QR scanner", /no QR scanner/.test(core));
eq("the demo bus is same-device", R.makeBus().kind, "same-device");

section("storage");
var bad = R.parseState("{ broken lobby");
eq("a broken lobby is reported", bad.ok, false);
eq("it is marked unreadable", bad.unreadable, true);
ok("it was not replaced", /NOT replaced with an empty one/.test(bad.reason), bad.reason);
eq("nothing saved yet is distinguished", R.parseState("").empty, true);
var round2 = R.parseState(R.serialize(l));
eq("a lobby round-trips", round2.lobby.players.length, 4);
eq("with its history", R.leaderboard(round2.lobby).total, R.leaderboard(l).total);
var thrown = R.exportFile("lobby", { lobby: l }, { when: "26/11/2026" }, function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; });
eq("a failed write is reported", thrown.ok, false);

section("shape — every script the page loads exists beside it");
var page = read("docs/play/index.html");
var srcs = (page.match(/<script[^>]+src="([^"]+)"/g) || []).map(function (t) { return t.replace(/.*src="([^"]+)"/, "$1"); });
srcs.forEach(function (x) { ok("script src resolves: " + x, fs.existsSync(path.join(ROOT, "docs", "play", x.replace(/^\.\//, "")))); });
ok("the landing page exists", fs.existsSync(path.join(ROOT, "docs", "index.html")));
ok("the page manifest exists", fs.existsSync(path.join(ROOT, "PAGES.json")));
ok("the web manifest exists", fs.existsSync(path.join(ROOT, "docs", "play", "manifest.webmanifest")));

var total = passed + failed.length;
if (!total) { console.error("self-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("self-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.slice(0, 12).forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("self-tests: " + passed + "/" + total + " assertions passed");
