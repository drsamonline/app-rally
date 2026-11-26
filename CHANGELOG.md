# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates: dd/mm/yyyy.

## [Unreleased]

## [1.0.0] — 26/11/2026

### Added
- A **hosted lobby** with a four-digit code, four players to a round, and three bundled games.
- **Rounds** that open and close, with per-round points and a running total.
- A **leaderboard** whose total equals the sum of the per-round points, asserted rather than assumed.
- A **latecomer** joins as a **spectator** and is a player from the next round — a round in progress is
  never broken, and a spectator cannot score in the round they missed.
- **Scoring that does not punish the slow half of the room**: a correct answer is 10, a fast one 13.
- Refusals: no host name, no player name, a duplicate name, an answer with no round open, closing a round
  that is not open, a round with no players.
- An unreadable lobby is reported and offered for export, never replaced with an empty one.
- A failed save says **NOT SAVED** and leaves the lobby on screen unchanged.
- A **same-device bus**, with the LAN transport and the QR scanner named as **not built** on the page, in
  the README and in NOTICE.
- PWA shell, CI (55 engine assertions + 20 in jsdom + page smoke), and the app-builder pipeline pinned to
  the canonical SHA for the EXE/APK/Linux release.

### Not built
- The LAN transport, QR joining, and the games beyond turn-based questions.
