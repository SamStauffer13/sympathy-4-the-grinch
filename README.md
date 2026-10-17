# Sympathy 4 the Grinch

A tiny browser game for a Christmas scavenger hunt. The Grinch robs Santa and runs for Whoville; kids tap to jump over stuff.
Win (about 45 seconds of running) and the clue appears. Live at https://samstauffer.net/sympathy-4-the-grinch/ , which is where the QR code points.

No backend and no build step: `index.html` plus `game.js`.

## Change the clue
Edit the `CLUE` line at the top of `game.js`. Commit to `main`; the site redeploys in about a minute.

## Tweak the game
Constants at the top of `game.js`: `RUN_SECONDS` (how long to win), `PENALTY` (seconds lost per hit), `SPEED`.
Hitting something never ends the game; it sets progress back, so every kid eventually wins.

## Preview locally
`python -m http.server`, then open http://localhost:8000.

## Deploy
Push to `main`; the Pages workflow publishes the repo root. Pages source must be **GitHub Actions**.
Never "Re-run" a failed deploy; use Run workflow.

## Pushing from Sam's machine
The default GitHub login there is the work account, so pushes use the deploy-key alias `github-grinch`
(key `~/.ssh/grinch_deploy`, remote `git@github-grinch:SamStauffer13/sympathy-4-the-grinch.git`).
