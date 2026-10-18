# Sympathy 4 the Grinch

A tiny browser game for a Christmas scavenger hunt. The Grinch robs Santa and runs for the American Dream; kids tap to jump over the obstacles in the way.
Survive the whole song (about 2 minutes 12) and the globe unlocks and the clue appears.
Live at https://samstauffer.net/sympathy-4-the-grinch/, which is where the QR code points.

No backend and no build step: `index.html`, `clue.js`, `game.js` and the art in `img/`.

## Change the clue
Edit `clue.js`: `CLUE` is the text players win, and `CLUE_LABEL` is the small tag above it ("Final Clue"). It is the only file you need to touch.
Commit to `main`; the site redeploys in about a minute.

## Change the art
Everything lives in `img/`, listed in `img/manifest.json`: one line per sprite with its file, size, the visible bounds `[x, y, width, height]` and the y of its feet. Hitboxes come from those bounds.
- `img/characters/`: `grinch` has idle, jump, run-01 and run-02; `santa` has idle, run-01 and run-02.
- `img/obstacles/`: every obstacle has a `name` in the manifest, which pops up when a player jumps over it. The game picks them at random and never the same one twice in a row.
- `img/american-dream.png`: the finish line, also the icon at the end of the progress bar and the link-preview image, so it stays a PNG.

Sprites are transparent WebP (small to download on a phone). Replace an image keeping its name and size; a PNG can be converted at squoosh.app.
To add an obstacle, drop a WebP in `img/obstacles/` and add a line to the manifest with its `name`. A broken obstacle image is skipped instead of stopping the game; the characters are required.

## Music
The run plays the official "sympathy 4 the grinch" video through YouTube's embedded player (`SONG_ID` at the top of `game.js`).
The "Go!" tap starts the run and the song together. The 🔊 button on the start screen turns the music off and on (🔇); there is no control during the run, so use the phone's volume buttons.
The video never affects the game: the run uses its own clock and never waits for, or follows, the video. If the video is slow, stalls, shows an ad or fails to load, the game carries on and ends on time. The song pauses when the run ends or the page goes into the background. A slow start or an ad can leave the song a little behind the game, and the player streams video, which uses mobile data.
YouTube does not allow its player to be hidden or shrunk below 200x200, so it sits below the game in the page: the game fills the screen and the player is off screen until you scroll down. Do not move it off-screen with CSS or make it smaller; YouTube can then refuse to play the video.

## How it plays
- Tap anywhere on the page, click, Space or Up to jump. Until the first jump, a "TAP TO JUMP!" prompt shows as the first obstacle approaches.
- Hitting something never ends the game: it makes Santa lunge and the Grinch stumble (and buzzes the phone). Every kid wins at the end of the song.
- The run gets 20% faster by the end.
- The finish is a celebration (about 3.5 seconds, `CELEBRATION`): Santa wipes out (he tumbles, bounces and ends up flat on his back with stars circling his head), the globe's lock opens in a flash with golden rays, a shockwave ring and sparks, the Grinch hops and flips, and fireworks go off. A tap after 1.5 seconds skips ahead to the clue card, and the phone buzzes.
- With the phone's reduced-motion setting on there is no screen shake, flash, fireworks or flip, and the Grinch fades instead of blinking.
- The screen stays awake during a run, and pull-to-refresh is disabled so a swipe cannot reload the page.

## Phones
The game is meant to be played sideways, and a web page cannot force that. So the whole game, start and win screens included, is always laid out horizontally: held upright, it is turned on its side to fill the screen, and a pulsing "Turn sideways!" banner in upright writing shows on the start screen until the phone is turned. This also works if the phone's rotation is locked. On Android, tapping "Go!" also goes full screen and locks to landscape (released at the finish); iPhones do not allow that, so they rely on the prompt.

## Screens
The game is 450 tall and as wide as the screen's shape allows (up to 2.2:1), so a wide phone has no side margins and notches are left alone. Held sideways it fills the screen edge to edge; held upright it is turned on its side to fill the screen (turn the phone to read it), and the start and win screens stay upright.

## Tweak the game
Constants at the top of `game.js`: `RUN_SECONDS` (keep it equal to the song's length), `SPEED`, `SPEED_RAMP`, `JUMP`, `GRAVITY`, `CHAR_SCALE` and `OBSTACLE_MAX` (how big the sprites are drawn).

## Preview locally
`python -m http.server`, then open http://localhost:8000.

## Deploy
Push to `main`; the Pages workflow publishes the repo root. Pages source must be **GitHub Actions**.
Before publishing, the workflow checks that `game.js` and `clue.js` parse, that every sprite in the manifest exists, and that the characters are all there. If that fails, nothing is published and the live site stays as it was: open the **Actions** tab to see what to fix.
Never "Re-run" a failed deploy; use Run workflow.

## Pushing from Sam's machine
The default GitHub login there is the work account, so pushes use the deploy-key alias `github-grinch`
(key `~/.ssh/grinch_deploy`, remote `git@github-grinch:SamStauffer13/sympathy-4-the-grinch.git`).
