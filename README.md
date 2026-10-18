# Sympathy 4 the Grinch

A tiny browser game for a Christmas scavenger hunt. The Grinch robs Santa and runs for Whoville; kids tap to jump over stuff.
Survive the whole song (about 2 minutes 12) and the clue appears. Live at https://samstauffer.net/sympathy-4-the-grinch/ , which is where the QR code points.

No backend and no build step: `index.html`, `clue.js`, `game.js` and the sprites in `img/`.

## Change the art
Sprites are transparent WebP images (smaller to download on a phone) in `img/characters/` (`grinch` has idle, jump, run-01 and run-02; `santa` has idle, run-01 and run-02) and `img/obstacles/`.
`img/manifest.json` lists every sprite with its visible bounds `[x, y, width, height]` and the y of its feet; hitboxes come from it.
The finish-line art (the American Dream) is `img/american-dream.png`; it also shows as the icon at the end of the progress bar and as the link-preview image, so it stays a PNG.
Replace an image keeping its name and size (a PNG can be converted to WebP at squoosh.app). To add an obstacle, drop a WebP in `img/obstacles/` and add an entry to the manifest, including a `name`; that name is shown when a player jumps over it. The game picks obstacles at random from every non-character entry.

## Change the clue
Edit `clue.js`: the `CLUE` line is the text players win, and `CLUE_LABEL` is the small tag above it ("Final Clue"). It is the only file you need to touch. Commit to `main`; the site redeploys in about a minute.

## Music
The run plays the official "sympathy 4 the grinch" video through YouTube's embedded player (`SONG_ID` at the top of `game.js`).
The "Let's go" tap starts the run and the song at the same moment, and there is a mute button bottom left.
The video never affects the game: the run uses its own clock and never waits for, or follows, the video. If the video is slow, stalls, shows an ad or fails to load, the game carries on and ends on time; the song is paused when the run ends. YouTube requires the player to stay visible (200x200), so it sits beside the game (below it on a phone held upright) and never covers it; the game is scaled down a little to make room.
`RUN_SECONDS` is 132, the song's length, so winning means surviving the whole song. A slow start or a YouTube ad can leave the song a little behind the game. The player streams video, which uses mobile data.

## Tweak the game
Constants at the top of `game.js`: `RUN_SECONDS` (length of the run; keep it equal to the song), `SPEED` and `SPEED_RAMP` (the run gets 20% faster by the end), `CHAR_SCALE`.
The game is the same size in either orientation: held upright, it is turned on its side to fill the screen (turn the phone to read it), and the start and win screens stay upright.
Hitting something never ends the game; it makes Santa lunge and the Grinch stumble (and buzzes the phone), so every kid wins at the end of the song.
Until a player's first jump, a "TAP TO JUMP!" prompt shows as the first obstacle approaches. The screen stays awake during a run, and pull-to-refresh is disabled so a swipe cannot reload the page mid-game.

## Preview locally
`python -m http.server`, then open http://localhost:8000.

## Deploy
Push to `main`; the Pages workflow publishes the repo root. Pages source must be **GitHub Actions**.
Before publishing, the workflow checks that `game.js` and `clue.js` parse, that every sprite in the manifest exists, and that the characters are all there. If that fails, nothing is published and the live site stays as it was: open the **Actions** tab to see what to fix.
Never "Re-run" a failed deploy; use Run workflow.

## Pushing from Sam's machine
The default GitHub login there is the work account, so pushes use the deploy-key alias `github-grinch`
(key `~/.ssh/grinch_deploy`, remote `git@github-grinch:SamStauffer13/sympathy-4-the-grinch.git`).
