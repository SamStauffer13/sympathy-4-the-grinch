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

## Music
The run plays the official "sympathy 4 the grinch" video through YouTube's embedded player (`SONG_ID` at the top of `game.js`).
The "Let's go" tap starts the run and the song at the same moment, and there is a mute button bottom left.
The video never affects the game: the run uses its own clock and never waits for, or follows, the video. If the video is slow, stalls, shows an ad or fails to load, the game carries on and ends on time; the song is paused when the run ends. YouTube requires the player to stay visible (200x200), so it sits beside the game (below it on a phone held upright) and never covers it; the game is scaled down a little to make room.
`RUN_SECONDS` is 132, the song's length, so winning means surviving the whole song. A slow start or a YouTube ad can leave the song a little behind the game. The player streams video, which uses mobile data.

## Tweak the game
Constants at the top of `game.js`: `RUN_SECONDS` (length of the run; keep it equal to the song), `SPEED` and `SPEED_RAMP` (the run gets 20% faster by the end), `CHAR_SCALE`.
The game is the same size in either orientation: held upright, it is turned on its side to fill the screen (turn the phone to read it), and the start and win screens stay upright.
Hitting something never ends the game; it makes Santa lunge and the Grinch stumble, so every kid wins at the end of the song.

## Preview locally
`python -m http.server`, then open http://localhost:8000.

## Deploy
Push to `main`; the Pages workflow publishes the repo root. Pages source must be **GitHub Actions**.
Never "Re-run" a failed deploy; use Run workflow.

## Pushing from Sam's machine
The default GitHub login there is the work account, so pushes use the deploy-key alias `github-grinch`
(key `~/.ssh/grinch_deploy`, remote `git@github-grinch:SamStauffer13/sympathy-4-the-grinch.git`).
