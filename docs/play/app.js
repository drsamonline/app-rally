/* app — the Rally page. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Wiring only: the lobby, the rounds and the scoring live in rally-core.js.
 * The LAN transport is NOT built; host and players run in one page. */
(function () {
  "use strict";
  var R = window.RallyCore;
  var $ = function (id) { return document.getElementById(id); };
  var K = "rally:lobby";
  var state = { lobby: null, unreadable: null, bus: R.makeBus() };

  var els = {
    status: $("status"), hostName: $("hostName"), hostBtn: $("hostBtn"), lobbyCode: $("lobbyCode"),
    playerName: $("playerName"), joinBtn: $("joinBtn"), fillBtn: $("fillBtn"), playerList: $("playerList"),
    startBtn: $("startBtn"), endBtn: $("endBtn"), roundSays: $("roundSays"), allAnswer: $("allAnswer"),
    boardSays: $("boardSays"), boardList: $("boardList"), exportBtn: $("exportBtn"), ioNote: $("ioNote")
  };

  function today() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function setStatus(k, m) { els.status.className = "status show " + k; els.status.textContent = m; }
  function node(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function persist() {
    if (!state.lobby) return true;
    try { window.localStorage.setItem(K, R.serialize(state.lobby)); return true; }
    catch (e) { setStatus("bad", "NOT SAVED: " + (e && e.name === "QuotaExceededError" ? "storage is full" : "storage is unavailable") + ". The lobby on screen is unchanged."); return false; }
  }

  function render() {
    var l = state.lobby;
    els.lobbyCode.textContent = l ? "lobby " + l.code : "";
    els.playerList.textContent = "";
    if (!l) els.playerList.appendChild(node("li", null, "No lobby yet."));
    if (l) {
      l.players.forEach(function (p) {
        var li = node("li");
        li.appendChild(node("div", null, p.name));
        li.appendChild(node("span", "meta", "playing \u00b7 " + (l.roundPoints[p.id] || 0) + " this round"));
        els.playerList.appendChild(li);
      });
      l.spectators.forEach(function (p) {
        var li = node("li", "spec");
        li.appendChild(node("div", null, p.name));
        li.appendChild(node("span", "meta", "spectator \u00b7 plays from the next round"));
        els.playerList.appendChild(li);
      });
    }
    var b = l ? R.leaderboard(l) : { rows: [], says: "Nobody has played yet.", agrees: true };
    els.boardSays.textContent = b.says + (l ? "  \u2014  total " + b.total + (b.agrees ? ", which is the sum of the round points." : ", WHICH DOES NOT MATCH the round points.") : "");
    els.boardList.textContent = "";
    b.rows.forEach(function (r) {
      var li = node("li", r.spectator ? "spec" : "");
      li.appendChild(node("div", null, r.name));
      li.appendChild(node("span", "meta", r.points + " point(s)" + (r.spectator ? " \u00b7 spectator" : "")));
      els.boardList.appendChild(li);
    });
    els.roundSays.textContent = l ? (l.open ? "Round " + l.round + " is open." : (l.round ? "Round " + l.round + " is closed." : "No round has run yet.")) : "";
  }

  function host() {
    var out = R.host({ hostName: els.hostName.value }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.lobby = out.lobby;
    var saved = persist(); render();
    if (saved) setStatus("ok", out.says);
  }

  function join(name) {
    if (!state.lobby) { setStatus("bad", "Host a lobby first."); return; }
    var out = R.join(state.lobby, { name: name }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.lobby = out.lobby;
    var savedJoin = persist(); render();
    if (savedJoin) setStatus(out.player.spectator ? "warn" : "ok", out.says);
  }

  function start() {
    if (!state.lobby) { setStatus("bad", "Host a lobby first."); return; }
    var out = R.startRound(state.lobby, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.lobby = out.lobby;
    var savedStart = persist(); render();
    if (savedStart) setStatus("ok", out.says);
  }

  function end() {
    if (!state.lobby) return;
    var out = R.endRound(state.lobby, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.lobby = out.lobby;
    var savedEnd = persist(); render();
    if (savedEnd) setStatus("ok", out.says);
  }

  function allAnswer() {
    if (!state.lobby || !state.lobby.open) { setStatus("bad", "No round is open."); return; }
    var l = state.lobby, last = null;
    l.players.forEach(function (p, i) {
      var out = R.answer(l, { playerId: p.id, correct: true, fast: i % 2 === 0 }, Date.now());
      if (out.ok) { l = out.lobby; last = out.says; }
    });
    state.lobby = l;
    var savedAll = persist(); render();
    if (last && savedAll) setStatus("ok", last);
  }

  function doExport() {
    if (!state.lobby) { setStatus("bad", "There is no lobby to export."); return; }
    var out = R.exportFile("lobby", { lobby: state.lobby }, { when: today() }, function (name, text, mime) {
      if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
      window.Export.save(name, text, mime); return true;
    });
    if (out.ok) { els.ioNote.textContent = "Wrote " + out.filename + "."; setStatus("ok", "Exported."); }
    else setStatus("bad", out.reason + ".");
  }

  els.hostBtn.addEventListener("click", host);
  els.joinBtn.addEventListener("click", function () { join(els.playerName.value); });
  els.fillBtn.addEventListener("click", function () { ["A", "B", "C", "D"].forEach(function (n) { join(n); }); });
  els.startBtn.addEventListener("click", start);
  els.endBtn.addEventListener("click", end);
  els.allAnswer.addEventListener("click", allAnswer);
  els.exportBtn.addEventListener("click", doExport);

  var raw = null;
  try { raw = window.localStorage.getItem(K); } catch (e) { raw = null; }
  if (raw) {
    var parsed = R.parseState(raw);
    if (parsed.ok) state.lobby = parsed.lobby;
    else {
      state.unreadable = parsed;
      setStatus("bad", parsed.reason);
      var keep = node("button", "small", "Export the unreadable lobby");
      keep.addEventListener("click", function () {
        var out = R.exportFile("raw", parsed, { when: today() }, function (name, text, mime) {
          if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
          window.Export.save(name, text, mime); return true;
        });
        setStatus(out.ok ? "ok" : "bad", out.ok ? "Wrote " + out.filename + "." : out.reason);
      });
      els.ioNote.parentNode.insertBefore(keep, els.ioNote);
    }
  }

  render();
  if (window.Loom && window.Loom.pwa) window.Loom.pwa.register("sw.js");
})();
