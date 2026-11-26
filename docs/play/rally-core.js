/* rally-core — the engine behind Rally.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * ONE JOB: party games for everyone in the room — phones as controllers, one screen as the board, no
 * accounts, no internet.
 *
 * THE LAN TRANSPORT IS NOT BUILT: the engine takes a bus with send/on and ships a same-device bus, so a
 * host and four players run in one page and the rules can be tested. A peer link over a hotspot would be
 * a runtime network call, which this fleet does not make. There is no QR scanner either: a lobby code is
 * typed.
 *
 * The games are turn-based questions with a hidden answer and a clock — small enough to be honest, and
 * the scoring is the part the spec's done-means can test.
 *
 * Pure functions plus one small stateful bus: no DOM, no network, no storage.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RallyCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  var GAMES = [
    { id: "quiz", name: "Quick quiz", rounds: 3 },
    { id: "guess", name: "Guess the number", rounds: 3 },
    { id: "word", name: "Word chain", rounds: 3 }
  ];
  var ROUND_SECONDS = 20;

  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function code(seed) { var n = Math.abs(seed || Date.now()) % 9000 + 1000; return String(n); }

  /* ------------------------------------------------------------------ lobby */

  function host(input, now) {
    var name = clean(input && input.hostName);
    if (!name) return { ok: false, field: "hostName", reason: "the host needs a name" };
    var at = now || Date.now();
    return {
      ok: true,
      lobby: { code: code(at), hostName: name, players: [], spectators: [], round: 0, game: GAMES[0].id, scores: {}, log: [] },
      says: "Lobby " + code(at) + " is open. Four can play; anyone after that watches and joins the next round."
    };
  }

  /* Four players join in one round. A fifth is a SPECTATOR, and is added to the next round's players —
   * a latecomer must not break a round in progress. */
  function join(lobby, input, now) {
    var name = clean(input && input.name);
    if (!name) return { ok: false, field: "name", reason: "a player needs a name" };
    var l = clone(lobby);
    if (l.players.concat(l.spectators).some(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })) {
      return { ok: false, field: "name", reason: "there is already a \u201c" + name + "\u201d in the lobby" };
    }
    var p = { id: "p" + (l.players.length + l.spectators.length + 1), name: name, points: 0, joinedRound: l.round, spectator: false };
    if (l.players.length < 4) { l.players.push(p); return { ok: true, lobby: l, player: p, says: name + " is playing." }; }
    p.spectator = true;
    l.spectators.push(p);
    return { ok: true, lobby: l, player: p, says: name + " joined as a SPECTATOR: the round is already at four, so they play from the next one." };
  }

  function startRound(lobby, now) {
    var l = clone(lobby);
    if (!l.players.length) return { ok: false, reason: "a round needs at least one player" };
    l.round++;
    /* a spectator becomes a player at the start of the NEXT round - every one of them, because the four
     * is a limit on who is in the round that is already running, not on the roster */
    while (l.spectators.length) {
      var s = l.spectators.shift();
      s.spectator = false;
      s.joinedRound = l.round;
      l.players.push(s);
    }
    l.roundPoints = {};
    l.players.forEach(function (p) { l.roundPoints[p.id] = 0; });
    l.startedAt = now || Date.now();
    l.open = true;
    l.log.push({ at: l.startedAt, what: "round " + l.round + " of " + l.game + " started with " + l.players.length + " player(s)" });
    return { ok: true, lobby: l, says: "Round " + l.round + " (" + l.game + ") is open for " + ROUND_SECONDS + " seconds." };
  }

  /* Points for a round: a correct answer earns 10, a fast one 3 more. Small on purpose — a party game
   * that rewards speed too much stops being fun for the slow half of the room. */
  function answer(lobby, input, now) {
    var l = clone(lobby);
    if (!l.open) return { ok: false, reason: "no round is open" };
    var p = l.players.filter(function (x) { return x.id === (input && input.playerId) || x.name === clean(input && input.name); })[0];
    if (!p) {
      var s = l.spectators.filter(function (x) { return x.id === (input && input.playerId) || x.name === clean(input && input.name); })[0];
      if (s) return { ok: false, field: "player", reason: s.name + " is a spectator this round: they play from the next one" };
      return { ok: false, field: "player", reason: "that player is not in this lobby" };
    }
    if (l.roundPoints[p.id] > 0) return { ok: false, field: "player", reason: p.name + " has already answered this round" };
    var correct = !!(input && input.correct);
    var fast = !!(input && input.fast);
    var pts = correct ? 10 + (fast ? 3 : 0) : 0;
    l.roundPoints[p.id] = pts;
    return { ok: true, lobby: l, points: pts, says: p.name + ": " + (correct ? "+" + pts : "0") + " this round." };
  }

  /* Closing a round adds every player's round points to their running total. The leaderboard is the
   * running total, and it equals the sum of the per-round points by construction. */
  function endRound(lobby, now) {
    var l = clone(lobby);
    if (!l.open) return { ok: false, reason: "no round is open" };
    l.players.forEach(function (p) { p.points += (l.roundPoints[p.id] || 0); });
    l.history = (l.history || []).concat([{ round: l.round, points: Object.assign({}, l.roundPoints) }]);
    l.open = false;
    l.log.push({ at: now || Date.now(), what: "round " + l.round + " closed" });
    return { ok: true, lobby: l, says: "Round " + l.round + " closed." };
  }

  function leaderboard(lobby) {
    var rows = (lobby.players || []).concat(lobby.spectators || []).map(function (p) {
      return { id: p.id, name: p.name, points: p.points, spectator: !!p.spectator };
    }).sort(function (a, b) { return b.points - a.points || a.name.localeCompare(b.name); });
    var sum = rows.reduce(function (s, r) { return s + r.points; }, 0);
    var historySum = (lobby.history || []).reduce(function (s, h) {
      return s + Object.keys(h.points).reduce(function (x, k) { return x + h.points[k]; }, 0);
    }, 0);
    return { rows: rows, total: sum, historySum: historySum, agrees: sum === historySum, says: rows.length ? rows.map(function (r) { return r.name + " " + r.points; }).join(" \u00b7 ") : "Nobody has played yet." };
  }

  function clone(l) {
    var x = l || { players: [], spectators: [], scores: {}, log: [], round: 0 };
    return {
      code: x.code, hostName: x.hostName, game: x.game, round: x.round || 0, open: !!x.open, startedAt: x.startedAt || 0,
      players: (x.players || []).map(function (p) { return { id: p.id, name: p.name, points: p.points || 0, joinedRound: p.joinedRound || 0, spectator: false }; }),
      spectators: (x.spectators || []).map(function (p) { return { id: p.id, name: p.name, points: p.points || 0, joinedRound: p.joinedRound || 0, spectator: true }; }),
      scores: Object.assign({}, x.scores || {}),
      roundPoints: Object.assign({}, x.roundPoints || {}),
      history: (x.history || []).map(function (h) { return { round: h.round, points: Object.assign({}, h.points) }; }),
      log: (x.log || []).slice()
    };
  }

  function makeBus() {
    var handlers = [], log = [];
    return {
      kind: "same-device",
      send: function (m) { var x = { payload: m, at: (m && m.at) || Date.now() }; log.push(x); handlers.forEach(function (h) { h(m.payload); }); return x; },
      on: function (h) { handlers.push(h); return function () { handlers = handlers.filter(function (y) { return y !== h; }); }; },
      log: function () { return log.slice(); }
    };
  }

  function serialize(lobby) { return JSON.stringify({ version: VERSION, format: "rally-lobby-1", lobby: clone(lobby) }, null, 2); }
  function parseState(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, empty: true, reason: "there is no lobby on this device yet", raw: raw };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) { return { ok: false, unreadable: true, reason: "The saved lobby cannot be read. It was NOT replaced with an empty one; export it to keep it.", raw: raw }; }
    if (!data || !data.lobby || !Array.isArray(data.lobby.players)) return { ok: false, unreadable: true, reason: "The saved file holds no lobby. Nothing was started over it; export it to keep it.", raw: raw };
    return { ok: true, lobby: clone(data.lobby), raw: raw };
  }
  function stamp(when) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(when || "")); return m ? m[3] + "-" + m[2] + "-" + m[1] : "undated"; }
  function exportFile(what, payload, meta, writer) {
    meta = meta || {};
    if (typeof writer !== "function") return { ok: false, reason: "the file was not written: no writer is available in this browser" };
    var name, body, mime = "application/json";
    if (what === "lobby") { name = "rally-lobby-" + stamp(meta.when) + ".json"; body = serialize(payload.lobby); }
    else if (what === "raw") { name = "rally-unreadable-" + stamp(meta.when) + ".txt"; body = String(payload.raw || ""); mime = "text/plain;charset=utf-8"; }
    else return { ok: false, reason: "nothing was written: unknown export \u201c" + what + "\u201d" };
    try {
      var wrote = writer(name, body, mime);
      if (wrote === false) return { ok: false, filename: name, reason: "the file was not written: the browser refused the save" };
      return { ok: true, filename: name, bytes: body.length };
    } catch (e) {
      var why = e && e.name === "QuotaExceededError" ? "storage is full" : (e && e.message ? e.message : "storage is unavailable");
      return { ok: false, filename: name, reason: "the file was not written: " + why };
    }
  }

  return { version: VERSION, GAMES: GAMES, ROUND_SECONDS: ROUND_SECONDS,
    host: host, join: join, startRound: startRound, answer: answer, endRound: endRound, leaderboard: leaderboard,
    makeBus: makeBus, serialize: serialize, parseState: parseState, exportFile: exportFile };
});
