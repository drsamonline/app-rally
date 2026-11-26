BUILD PROMPT — Rally   (plan row #25 of 37)

## Inputs

```
APP:        Rally
SPEC:       QUEUE/app-rally.md
REPO:       https://github.com/drsamonline/app-rally   (empty)
            the plan also matches: party, rally, app-rally
PLAN_ROW:   #25
MERGED:     rally, choir, antiphon, blind-rank, hotseat, same-picture, hex
```

This build absorbs 7 specs into one app. Their must-nots still bind, and all of them are quoted below.

Needs before it can ship: on-device model/OCR, LAN transport (room-kit), hardware access

**Note before starting:** Hex fits only if Rally is more than phones-as-controllers; decide before building.

---

## What you are building

One app, from its spec, into that repo. Nothing else. Not a second app, not a kit unless the
spec needs one, not a refactor of a neighbour.

### The house rules (they are not preferences)

- **Offline-first, always.** No server, no account, no telemetry, no network call at runtime.
  If the app needs a model, it ships in the app or the app says what it cannot do.
- **Single-file where possible.** One `docs/play/index.html` with its kits beside it. The
  build kit (`app-builder`) turns that into a Windows EXE and an Android APK — so the same
  bytes must work as a file:// page, an installed PWA and an APK.
- **The spec's "what it must NOT do" are test assertions, not prose.** Each one becomes a
  named test that fails if the app ever does it.
- **The spec's "what it does when things go wrong" is four cases**, and all four ship:
  bad input, no network, storage full or unavailable, corrupt saved state. An app that
  silently treats "no data" as "no matches" is not done.
- **Nothing is fabricated.** No invented data, no placeholder screenshot presented as a live
  capture, no badge nobody measures, no sample corpus passed off as the real thing. If an
  asset must be supplied by the owner, say so and leave the slot visibly empty.
- **India is the default audience**: ₹, lakh/crore, metric, dd/mm/yyyy, IST, and the local
  examples before the international ones.
- **Licence:** PolyForm Noncommercial 1.0.0 unless the spec says otherwise; SPDX headers on
  every source file; `data/SOURCE.md` recording the source, the licence of the **data**, and
  the fetch date for anything not written by us.

### Step 0 — Preflight (before you claim anything is missing)

1. Read the spec. Read its master-list row. Read its `PLAN.json` row, including `members` —
   a merged build's other specs are in `QUEUE/archive/` and their must-nots still apply.
2. **Rule 0: check the estate first.** Search the org for an app that already does this job.
   If one does, stop and report the collision with the repo name. Building the second version
   of a shipped app is the most expensive mistake available here.
3. Ask which credential you are holding. A `gh` 404 is a wrong credential, never proof of
   absence. Any finding of "impossible" must name the credential it was attempted with.
4. **You cannot create repositories.** If the repo does not exist, that is the owner's step —
   say so and stop. An empty repo that exists is yours to fill.

### Step 1 — Scope it in writing, before code

Produce a short block and keep it for the final report:

- the job, in one sentence;
- the mechanic that makes it not-generic, in one sentence;
- every **must-not**, as a test name;
- the four failure cases, as behaviour;
- the kits it needs (from the spec) and whether each already exists;
- what the app will **not** do in v1, explicitly.

If the app needs a capability no kit has: create the kit first, with its own test, and say so.

### Step 2 — Scaffold, do not hand-roll

`python3 scripts/new-app.py <app-id>` writes the shape:

```
docs/index.html          landing page (what it is, honest status, how to run it)
docs/play/index.html     the app itself
docs/play/*.js           the kits it vendors, next to the page that loads them
tests/self-tests.js      assertions, no framework
PAGES.json               the page manifest
README.md                what it does, how to run, what is not built
```

**Then prove the shape before you fill it:** every `<script src>` in the page must resolve to
a file that exists beside it. A scaffold has shipped here before with the kits in the wrong
folder, and the page 404'd its own runtime while the build stayed green.

If the repo is empty and `scripts/` is not available to you, build the same shape by hand —
the file list above is the contract, not the script.

### Step 3 — Build to the spec

Work the spec top to bottom. Where the spec is silent, choose the smaller behaviour and say
so in the report. Where the spec and the master-list one-liner disagree, **the spec body
wins** and the disagreement goes in the report (five such contradictions are already known).

### Step 4 — Tests that could fail

- `node tests/self-tests.js` — every must-not is an assertion; every failure case is a case.
- Print the count. A suite of 0 assertions is a failure, not a pass.
- **Mutation-test it**: break three things on purpose (remove a guard, make a refused input
  succeed, report a failed save as saved) and confirm the suite goes red each time. Restore.
- If the suite cannot go red, it is documentation, not a test.

### Step 5 — Deliver

- Pages on, demo live at `https://drsamonline.github.io/<repo>/`, and the demo **is** the app
  (no separate build of the page).
- A release with the EXE and APK from `app-builder`, built from the same source.
- Topics set (they are the discovery surface), licence headers, `CHANGELOG.md`, `NOTICE`.
- README states the real status: what works, what does not, what is untested.

### Step 6 — Record it

- Append one line to `PROGRESS.log`: what was built, the test counts, the demo URL, what was
  **not** built and why.
- **Do not edit `QUEUE/PLAN.json`.** `tools/queue-sync.py` flips the row to `built` when the
  repo and its Pages answer. Writing `built` by hand is how a plan starts lying.
- Do not edit `ACTIONS.md` — its build order is generated.

### Step 7 — Report in this shape

```
APP      <name>  (plan row #<order>, <n> specs merged)
REPO     <url>   commit <sha>
DEMO     <url>
TESTS    <n>/<n> assertions, mutation-tested <n> ways
BUILT    <the features that exist>
NOT BUILT <the features the spec asks for that do not, and why>
MUST-NOT <each one, and the test that holds it>
NEEDS    <what only the owner can supply: assets, keys, data, a decision>
NEXT     <the smallest honest next step for this app, or "done">
```

Never write "done" for a feature you did not prove. `unverified` with the reason is a better
line than a green claim.

---

## Definition of done (the owner's, not yours)

> A working app, with a working release, a landing page, and a live demo where the app is a
> web app — and the tests that prove the must-nots, run in CI.

Anything less is `partial`, and the report says which of the three is missing.

---

## When you are blocked

Say which of these it is, in one line, and stop:

- **no spec** → the spec is the next step, not the code;
- **the app already exists** → name the repo and the overlapping features;
- **the repo does not exist** → the owner creates it; you cannot;
- **a capability no kit has** → the kit is the next step;
- **an asset only the owner has** (a photo, a UPI ID, a licensed corpus, a key) → build the
  slot, leave it visibly empty, name what is needed;
- **a credential that cannot see the thing** → name the credential, not a verdict.

---

## The five ways this has gone wrong before

1. **Built the second version of a shipped app** — Rule 0 exists because of it.
2. **Shipped a scaffold whose page could not load its own kits** — prove every `src` resolves.
3. **Claimed a badge or a status nobody measures** — a green shield that lies is worse than none.
4. **Logged "done" from an exit code** — the verdict is the artifact on the branch, not git's
   exit status.
5. **Reported the system blocked on the strength of the wrong credential** — a 404 is a
   credential, not a fact.

---

# THE SPEC — Rally (`app-rally`)

# Rally

- **id:** app-rally
- **category:** LAN / local-network
- **tier:** —
- **source:** the app master list, #63
- **status:** READY - spec written from the idea's own build prompt

## Pitch

party games for everyone in the room

## The spec

**Prompt:**
Build a LAN app called **Rally**: a set of **multiplayer party games** where each
person's phone is a controller and one screen (a laptop or TV) is the shared board
— all over the local network, no internet, no accounts.

Implement:
- **Host/lobby:** one screen hosts; players join by QR with a name and avatar.
- **Game pack:** a few fast, funny games (trivia, drawing-and-guessing, a bidding
  game, a word game) that use phones as buzzers/pads and the shared screen for the
  board.
- **Scoring & brackets:** live leaderboards across rounds.
- **Spectator mode:** latecomers can join and watch between rounds.

LAN architecture: host runs a WebSocket server; phones connect over the LAN. No
internet — works on a hotspot at a house party or a hostel common room.

Novelty: **a game console made of phones you already have**, requiring nothing but
a local network — a full social game night with zero downloads of a service or
internet.

---

## What it must NOT do

- grow a second job. If a request needs "and", it is two apps.

## What it does when things go wrong

- **Bad input** — a game that needs more players than the room has is refused with the count needed.
  A round with no prompt is refused rather than played blank.
- **No network** — the room's network is the network: with no peers the app says nobody else has joined
  and will not start a game alone. It needs no internet and says so.
- **Storage full or unavailable** — the round continues; the scores are not saved and the app says the
  results will not be kept.
- **Corrupt saved state** — an unreadable score file is reported and cleared with the room told, so a
  broken file cannot award points nobody earned.

## The data

- everything on the device; nothing leaves it unless the user exports it.

## Done means

- **Four** phones join a hosted lobby by QR in one round, each bundled game completes a round, and the leaderboard shows a score for all four that equals the sum of their per-round points. A latecomer joining between rounds appears as a spectator and is added to the next round's players. It all runs on a hotspot with the internet disconnected.

---

# SPECS THIS BUILD ABSORBS (6)

## `app-choir` — Choir

**Pitch**

a jukebox the whole room controls

**What it must NOT do**

- grow a second job. If a request needs "and", it is two apps.

**What it does when things go wrong**

- **Bad input** — a track that cannot be decoded is removed from the queue with the reason shown to the
  whole room, rather than silently skipped.
- **No network** — the room's network is the network: with no peers the app plays locally and says the
  room queue is unavailable, and it does not accept control from a device that is not there.
- **Storage full or unavailable** — the queue is not persisted and the app says the room will lose it on
  restart; playback continues.
- **Corrupt saved state** — an unreadable queue is cleared with a notice shown to the room, so a broken
  file cannot make the jukebox play something nobody queued.

**The spec (the prompt it was written from)**

**Prompt:**
Build a LAN app called **Choir** that turns a party or a hostel common room into a
**shared jukebox**: everyone on the local network adds songs to one queue, and the
host device plays them.

Implement:
- **Host mode:** a device (phone/laptop/speaker) plays the music and shows the
  current queue and now-playing.
- **Guest mode:** anyone on the LAN scans a QR, searches the host's local music
  library, and adds tracks or votes up/down; skips need enough votes.
- **Fairness:** per-person add limits and a "no queue-jumping" rule keep one
  person from dominating.
- **Reactions:** quick emoji/votes on the current track, tallied live.

LAN architecture: host serves the library index and streams audio over the LAN
(HTTP range requests or a WebSocket stream). No streaming service, no internet —
the music lives on the host.

Novelty: **social music without a subscription or a cloud** — the room owns the
music and the queue, and it works on a hotspot at a picnic.

---

## `app-antiphon` — Antiphon

**Pitch**

a duet where each turn must oppose the last (pass-and-play)

**What it must NOT do**

- grow a second job. If a request needs "and", it is two apps.

**What it does when things go wrong**

- **Bad input** — a turn that does not oppose the last one is refused with the reason, and the turn
  stays open. An empty or one-word reply is refused rather than counted as opposition.
- **No network** — nothing changes. Pass-and-play needs one device and no server.
- **Storage full or unavailable** — the round continues in memory; the app says the session will not be
  kept when it ends, rather than pretending it was saved.
- **Corrupt saved state** — an unreadable saved session is reported and offered for export, and a new
  round starts only when the user chooses one.

**The spec (the prompt it was written from)**

**Prompt:**
Build an offline collaborative writing app called **Antiphon** where two or more
people co-write a story under a constraint: **each contribution must take the
opposite stance, tone, or direction of the one before it.** No server — writers
share a device, or exchange drafts as files/QR.

Implement:
- Turn-based writing where the app checks that a new passage contrasts the prior
  one (sentiment flip, tonal reversal, plot about-face).
- A "tension meter" that tracks how strongly the alternation holds.
- **Solo AI opponent mode** using an **on-device LLM** (small model via
  llama.cpp/ML Kit) so one writer can play both sides offline.
- A read-back view rendering the two voices in contrasting styles.

Offline architecture: single-device pass-and-play, or exchange the story as a
file/QR between devices. Contrast scoring uses a local sentiment/embedding model;
the AI opponent is an on-device model.

Novelty: structure the *content* through a **dialectical constraint** — the
back-and-forth is the creative engine.

Stack: mobile/desktop front end; local NLP check; on-device LLM for AI mode.

Deliverable: a working prototype where two writers alternate and the tension
meter responds to genuine opposition.

---

## `app-blind-rank` — Blind Rank

**Pitch**

Rank your friends on fun categories anonymously; they see only their own placement.

**The job**

- Rank things without seeing the running result, then reveal it.

**The mechanic**

- It hides the SCORE while you rank, so the order is your judgement rather than an anchor.

**What it must NOT do**

- show a leaderboard mid-game. The reveal is the moment.

**What it does when things go wrong**

- **Bad input** — a ranking with a missing position or a duplicate name is refused with the offending
  entry named. Fewer than three people is refused, because a ranking of two reveals both.
- **No network** — the LAN is the network: with no peers the session opens and says the others have not
  joined, and no placements are shown as final.
- **Storage full or unavailable** — the session continues in memory; the app says the results will not
  be kept when it ends.
- **Corrupt saved state** — an unreadable session is discarded with a notice; it is never merged, because
  a merged ranking would show one person another person's placement.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- web-kit, export-kit

## `app-hotseat` — Hotseat

**Pitch**

Friends send you anonymous questions; you answer on camera; it auto-cuts a shareable clip.

**The job**

- A pass-and-play game where the group asks and one answers.

**The mechanic**

- It is BUILT FOR A ROOM: one device passes around, and the questions are drawn from what the group supplies.

**What it must NOT do**

- need a network or accounts. It is one device and one room.

**What it does when things go wrong**

- **Bad input** — a question that is empty or duplicated is refused, and a round with no question
  cannot be recorded. A recording where no face is detected is kept and flagged, not presented as
  answerable footage.
- **No network** — nothing changes. Questions arrive by whatever channel the user shares them through;
  recording and cutting are local.
- **Storage full or unavailable** — recording stops at the frame it could not write and the app says how
  much was kept, rather than producing a clip that ends without explanation.
- **Corrupt saved state** — an unreadable round is reported and offered for export; the clip is kept
  even when its question cannot be read, and the app says which rounds are unlabelled.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- web-kit, game-kit

## `app-same-picture` — Same Picture

**Pitch**

Everyone draws the same prompt on their own phone; results revealed as a grid.

**The job**

- Everyone gets the same prompt, and the pictures are compared.

**The mechanic**

- It compares the DRAWINGS: what four people made of one sentence is the whole game.

**What it must NOT do**

- score the art. It shows the difference.

**What it does when things go wrong**

- **Bad input** — an empty drawing is not submitted and the round does not complete; the app says who
  has not finished, by name, so the grid is never shown with a blank tile that looks like a joke.
- **No network** — the room's network is the network: with no peers the app opens and says nobody else
  has joined. It needs no internet.
- **Storage full or unavailable** — the drawing is not kept and the app says so before the canvas
  closes, because a missing tile ruins the reveal for everyone.
- **Corrupt saved state** — an unreadable round is reported and the grid shows the tiles that can be
  read, with the unreadable ones named rather than blanked.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- web-kit, art-kit

## `app-hex` — Hex

**Pitch**

An abstract strategy game with a tiny rule set and deep play.

**The job**

- A short, sharp strategy game on a hex grid, offline.

**The mechanic**

- It generates the BOARD from a seed, so a match is reproducible and shareable as a seed.

**What it must NOT do**

- need an account or an opponent online. Local play, seed-shareable.

**What it does when things go wrong**

- **Bad input** — a move onto an occupied cell is refused with the cell named, and the turn stays with
  the player. A match started from a seed that does not parse is refused rather than silently reseeded.
- **No network** — nothing changes. Hotseat play needs one device.
- **Storage full or unavailable** — the match continues in memory and the app says it will not be saved;
  it does not resume an older position and present it as the current one.
- **Corrupt saved state** — an unreadable match is reported with its move count and offered for export;
  a new match starts only when the user chooses one.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- web-kit, game-kit

---

## After the build

- Append one line to `PROGRESS.log`. Do **not** edit `QUEUE/PLAN.json` — `tools/queue-sync.py` moves row #25 to `built` when the repo and its Pages answer.
- Report in the shape the brief asks for. Anything you did not prove is `unverified`, not done.
