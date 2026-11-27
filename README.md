# Rally

Party games for everyone in the room — phones as controllers, one screen as the board. **No accounts, no
internet.**

- **Demo:** https://drsamonline.github.io/app-rally/play/index.html
- **Landing page:** https://drsamonline.github.io/app-rally/
- **Release:** https://github.com/drsamonline/app-rally/releases/tag/app-latest
- **Plan row:** #25 of 37 in `drsamonline/forge` → `QUEUE/PLAN.json`
- **Specs absorbed:** `app-rally` (lead) + 6 absorbed specs
- **Licence:** PolyForm Noncommercial 1.0.0
- **Sponsor:** [github.com/sponsors/drsamonline](https://github.com/sponsors/drsamonline) — free, offline, no account

## Status

| | |
|---|---|
| **Built** | Hosted lobby with a code; four to a round; three games; rounds open/close; leaderboard total equal to the sum of round points; latecomer as spectator then player; scoring that does not punish slowness. |
| **Release** | Windows EXE, Android APK and Linux binary, built from this source by `app-builder` in CI. |
| **Not built** | **The LAN transport and QR joining** — host and players run in one page. Also the games beyond turn-based questions: the lobby, the rounds and the scoring are the real parts. |
| **Untested** | A room full of people on a hotspot. The rules are exact and tested; whether a party keeps playing after round three is not something a test can see. |

## The spec's "done means", counted

| The spec says | The test |
|---|---|
| four phones join a hosted lobby in one round | 4 players, 0 spectators, a four-digit code |
| each bundled game completes a round | all three games run a full round with points for four players |
| the leaderboard shows a score for all four equal to the sum of per-round points | 4 rows; `total === historySum`; `agrees === true` |
| a latecomer joins as a spectator and plays the next round | spectator during the round, cannot answer, player in round 2 |

## The one rule that took two attempts

My first `startRound` promoted spectators only *while the roster was under four* — so a fifth player could
never join, which is the exact case the spec names. The four is a limit on **the round in progress**, not on
the roster, so every spectator is promoted at the next round start. There is a test for the sequence the
spec describes: four play round 1, a fifth joins mid-round as a spectator, and plays round 2.

## What it will not do

- **Require an account.**
- **Break a round for a latecomer.**
- **Let a spectator score** in the round they missed.
- **Reward speed too much** — 13 for a fast correct answer, 10 for a slow one.
- **Use the internet.**

## When things go wrong

| Case | Behaviour |
|---|---|
| **Bad input** | Every refusal names the field: host name, player name, duplicates, an answer with no round, closing a closed round. |
| **No network** | Nothing changes; there is no network code. |
| **Storage full or unavailable** | **NOT SAVED**, lobby unchanged on screen. |
| **Corrupt saved state** | Reported and offered for export, never replaced with an empty lobby. |

## Tests

```bash
npm test                      # all three suites
node tests/self-tests.js      # engine — 55 assertions
node tests/ui-tests.js        # the page in jsdom — 20 assertions
node tests/page-smoke.js      # every local src/href resolves, nothing off-origin
```

Mutation-tested six ways on 26/11/2026, all red: a spectator promoted immediately (4 failures), round
points not added to the total (4), a spectator able to score (2), answering twice allowed (1), a broken
lobby starting empty (3), and the leaderboard ignoring its own history (2).

## The bug that appeared for the fifth time

`persist()` then `setStatus("ok", …)` — the **NOT SAVED** warning overwritten by a cheerful line. Rows #11,
#14, #15, #22 and now #25. Four call sites fixed at once this time, and the UI test throws from
`localStorage` to prove it. This is the most repetitive defect in the fleet and it is worth naming as
such: the fix is never the test that caught it, it is every call site.

## Layout

```
docs/index.html            landing page
docs/play/index.html       the app — host, join, the round, the leaderboard
docs/play/app.js           DOM wiring: host, join, start/close, answers, export, save guard
docs/play/rally-core.js    the engine — lobby, rounds, scoring, leaderboard, bus, storage
docs/play/web-kit.js       vendored kit (unmodified)
docs/play/export-kit.js    vendored kit (unmodified)
tests/self-tests.js        engine suite (55)
tests/ui-tests.js          page suite (20, jsdom)
tests/page-smoke.js        shape on disk
PAGES.json                 landing = docs/index.html, app = docs/play/index.html
```

## Where the spec was silent, and what was chosen

- **Four is a limit on the round, not the roster.** The spec's latecomer case only works that way.
- **A spectator is marked, not hidden** — they can see the board and cannot score.
- **10 and 13, not 10 and 25.** A party game that rewards speed hard stops being fun for half the room.
- **One answer per player per round**, refused on the second attempt rather than overwriting.
- **The leaderboard asserts its own arithmetic** (`agrees`), because a scoreboard that quietly disagrees with its own history is worse than no scoreboard.

## What is not built, and why

**The LAN transport and QR joining.** Both need a runtime network call or a camera, neither of which this
fleet provides. The demo runs the host and the players in one page so the lobby rules are real and tested;
the page says so above the fold.
