# TrackFIT — Natural Bodybuilding Contest Prep Tracker

A single-page, browser-stored daily logbook for contest prep: diet, training,
body weight, cardio, and reel/content status. Built for fast one-handed daily
entry (under 2 min/day) on mobile and desktop. Single user, no backend, no login.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

## What's here

- **Today** — body weight & cardio, diet (live macro totals vs targets, food-library
  autocomplete with proportional scaling, save-to-library, skin/breakout toggle),
  training (day type, per-exercise muscle group, set rows with live volume, inline
  "last time" for progressive overload, complete toggle), reel status + streak.
- **Dashboard** — 7-day rolling averages for body weight and calories with
  week-over-week trend, body-weight line chart (daily dots + 7-day average line,
  via recharts), weekly volume by muscle group (weak points starred), and a
  breakout-correlation panel listing foods eaten in the 48 h before each breakout.
- **Settings** — calorie/macro targets, phase, target weight, and food-library
  management.

## Storage

The brief specifies `window.storage` (the Claude Artifacts runtime API). The
adapter in `src/lib/storage.js` uses `window.storage` when present and otherwise
falls back to `localStorage` with the same `get/set/delete/list` interface — so it
runs both as a Claude artifact and as a standalone local app. Data is per-user
(`shared: false`). Keys: `entry:YYYY-MM-DD`, `food:<slug>`, `exercise:<slug>`,
`settings`.

## By design (non-goals)

No external food API (manual macros only), no multi-user/login, and no automated
calorie-adjustment logic — the app surfaces weekly averages; the raise/lower
decision stays a conversation, not a rule baked into the app.
