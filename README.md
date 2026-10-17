# Sympathy 4 the Grinch

A tiny browser game for a Christmas scavenger hunt. The Grinch robs Santa and runs for Whoville; kids tap to jump over stuff.
Win (about 45 seconds of running) and the clue appears. Live at https://samstauffer.net/sympathy-4-the-grinch/ , which is where the QR code points.

No backend and no build step: `index.html`, `game.js` and the sprites in `img/`.

## Change the art
Sprites are transparent PNGs in `img/characters/` (`grinch` has idle, jump, run-01 and run-02; `santa` has idle, run-01 and run-02) and `img/obstacles/`.
`img/manifest.json` lists every sprite with its visible bounds `[x, y, width, height]` and the y of its feet; hitboxes come from it.
The finish-line art (the American Dream) is `img/american-dream.png`; it also shows as the icon at the end of the progress bar.
Replace a PNG keeping its name and size. To add an obstacle, drop a PNG in `img/obstacles/` and add an entry to the manifest, including a `name`; that name is shown when a player jumps over it. The game picks obstacles at random from every non-character entry.

## Change the clue
Edit the `CLUE` line at the top of `game.js` (and `CLUE_LABEL`, the small tag above it, if you want it to say something other than "Final Clue"). Commit to `main`; the site redeploys in about a minute.

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
