const CLUE_LABEL = 'Final Clue' // small tag above the clue
const CLUE = 'Lauren did 9/11' // shown when the player wins

const W = 800, H = 450, GROUND = 370, SCALE = 2
const RUN_SECONDS = 132 // the length of the song, so the game ends when it does
const SONG_ID = '8Lyvv_bhzD0' // YouTube video that plays during the run
const SPEED = 280, GRAVITY = 1520, JUMP = 760
const GX = 170 // the Grinch's centre x
const CHAR_SCALE = 0.63 // character sprite px -> game px
const OBSTACLE_MAX = [105, 80] // widest and tallest an obstacle's art is drawn
const FINISH_HEIGHT = 150 // drawn height of the finish-line art
const HIT_MESSAGE = "Santa's gaining!"

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
canvas.width = W * SCALE
canvas.height = H * SCALE
ctx.scale(SCALE, SCALE)
ctx.imageSmoothingQuality = 'high'

const screen = document.getElementById('screen')
const [title, text, note, button] = ['h1', 'p', 'small', 'button'].map(s => screen.querySelector(s))

const clueCard = document.getElementById('clue')

// the game runs on its own clock, so it still works with the music muted, blocked or slow to load
let player
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('music', {
    width: 200, height: 200, videoId: SONG_ID,
    playerVars: { controls: 0, disablekb: 1, playsinline: 1, rel: 0, iv_load_policy: 3 },
  })
}
document.head.append(Object.assign(document.createElement('script'), { src: 'https://www.youtube.com/iframe_api' }))

const muteButton = document.getElementById('mute')
let muted = false
muteButton.addEventListener('click', () => {
  muted = !muted
  muted ? player?.mute?.() : player?.unMute?.()
  muteButton.textContent = muted ? '🔇' : '🔊'
})

const rand = (a, b) => a + Math.random() * (b - a)

// sprites come from img/manifest.json: contentBounds is [x, y, width, height] of the visible art
const sprites = {}
const finish = new Image()
async function loadSprites() {
  finish.src = 'img/american-dream.png'
  await finish.decode()
  const { assets } = await (await fetch('img/manifest.json')).json()
  await Promise.all(assets.map(async a => {
    const img = new Image()
    img.src = 'img/' + a.file
    await img.decode()
    const [bx, by, bw, bh] = a.contentBounds
    sprites[a.id] = { img, name: a.name, bx, bw, bh, w: a.width, feetY: a.feetY }
  }))
  grinchBox = box(sprites['grinch-run-01'], CHAR_SCALE, 0.2)
}

// hitbox relative to the sprite's centre, shrunk by inset on each side
const box = (s, k, inset) => ({
  l: (s.bx - s.w / 2 + inset * s.bw) * k,
  r: (s.bx + s.bw * (1 - inset) - s.w / 2) * k,
  h: s.bh * k * 0.9,
})

function drawSprite(s, cx, feet, k) {
  ctx.drawImage(s.img, cx - (s.w / 2) * k, feet - s.feetY * k, s.img.width * k, s.img.height * k)
}

let state, progress, y, vy, obstacles, spawnIn, lunge, invuln, shake, message, messageT, messageDuration, confetti, grinchBox
let clock = 0, dist = 0
const snow = Array.from({ length: 50 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(1, 3) }))

function reset() {
  progress = 0; y = 0; vy = 0; obstacles = []; spawnIn = 500
  lunge = 0; invuln = 0; shake = 0; messageT = 0; confetti = []
}

function showScreen(h, p, n, b, clue) {
  title.textContent = h; text.textContent = p; note.textContent = n; button.textContent = b
  text.hidden = !p
  clueCard.hidden = !clue
  if (clue) {
    clueCard.querySelector('span').textContent = CLUE_LABEL
    clueCard.querySelector('strong').textContent = clue
  }
  screen.hidden = false
}

function start() {
  reset()
  state = 'run'
  screen.hidden = true
  button.blur()
  player?.seekTo?.(0)
  player?.playVideo?.()
}

function win() {
  state = 'win'
  player?.pauseVideo?.()
  const colors = ['#ff2bd6', '#39ff14', '#00f0ff', '#ffe600', '#ff2d2d']
  confetti = Array.from({ length: 90 }, () => ({
    x: rand(0, W), y: rand(-H, 0), vx: rand(-60, 60), vy: rand(150, 350), c: colors[Math.floor(rand(0, colors.length))],
  }))
  setTimeout(() => showScreen('You got away with it!', '', 'Show this to the grown-up', 'Rob Santa again', CLUE), 900)
}

function hit(o) {
  obstacles.splice(obstacles.indexOf(o), 1)
  lunge = 1; invuln = 1; shake = 0.35
  say(HIT_MESSAGE, 1.3)
}

function say(s, seconds) {
  message = s
  messageT = messageDuration = seconds
}

// bounce in, then drift up and fade out
function drawMessage() {
  const age = messageDuration - messageT
  const p = Math.min(age / 0.25, 1) - 1
  const popped = 1 + 2.70158 * p ** 3 + 1.70158 * p ** 2
  ctx.save()
  ctx.globalAlpha = Math.min(1, messageT / 0.4)
  ctx.translate(W * 0.4, 90 - age * 25) // left of centre, clear of the video
  ctx.scale(0.4 + 0.6 * popped, 0.4 + 0.6 * popped)
  glitchText(message, 0, 0, 36)
  ctx.restore()
}

function jump() {
  if (state === 'run' && y <= 0) vy = JUMP
}

const obstacleIds = () => Object.keys(sprites).filter(id => !/^(grinch|santa)-/.test(id))

function spawn() {
  const ids = obstacleIds()
  const s = sprites[ids[Math.floor(rand(0, ids.length))]]
  const k = Math.min(OBSTACLE_MAX[0] / s.bw, OBSTACLE_MAX[1] / s.bh)
  obstacles.push({ x: W + 100, s, k, box: box(s, k, 0.15) })
}

function update(dt) {
  progress += dt
  if (player?.getPlayerState?.() === 1) progress = player.getCurrentTime() // stay in step with the song
  dist += SPEED * dt
  vy -= GRAVITY * dt
  y += vy * dt
  if (y <= 0) { y = 0; vy = 0 }

  spawnIn -= SPEED * dt
  if (spawnIn <= 0 && progress < RUN_SECONDS - 3) {
    spawn()
    spawnIn = rand(450, 720)
  }
  obstacles.forEach(o => { o.x -= SPEED * dt })
  obstacles = obstacles.filter(o => o.x > -150)

  invuln -= dt; messageT -= dt; shake = Math.max(0, shake - dt); lunge = Math.max(0, lunge - dt / 4)
  if (invuln <= 0) {
    const o = obstacles.find(o => GX + grinchBox.r > o.x + o.box.l && GX + grinchBox.l < o.x + o.box.r && y < o.box.h)
    if (o) hit(o)
  }
  obstacles.forEach(o => {
    if (!o.cleared && GX + grinchBox.l > o.x + o.box.r) {
      o.cleared = true
      say(o.s.name, 1.2)
    }
  })
  if (progress >= RUN_SECONDS) win()
}

function updateFx(dt) {
  const drift = state === 'run' ? SPEED * dt * 0.3 : 0
  snow.forEach(f => {
    f.y = (f.y + 40 * dt) % H
    f.x = (f.x - drift + W) % W
  })
  confetti.forEach(c => {
    c.x += c.vx * dt
    c.y += c.vy * dt
  })
}

function emoji(e, x, yy, size) {
  ctx.font = `${size}px serif`
  ctx.textBaseline = 'bottom'
  ctx.fillText(e, x, yy)
}

function glitchText(s, x, yy, size) {
  ctx.font = `${size}px 'Arial Black', Impact, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#00f0ff'
  ctx.fillText(s, x + 3, yy + 3)
  ctx.fillStyle = '#ff2bd6'
  ctx.fillText(s, x, yy)
  ctx.textAlign = 'left'
}

function drawBar() {
  const px = p => 40 + (W - 80) * Math.min(p / RUN_SECONDS, 1)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath(); ctx.roundRect(40, 22, W - 80, 14, 7); ctx.fill()
  ctx.fillStyle = '#ff2bd6'
  ctx.beginPath(); ctx.roundRect(40, 22, px(progress) - 40 + 1, 14, 7); ctx.fill()
  ctx.fillStyle = '#39ff14'
  ctx.beginPath(); ctx.arc(px(progress), 29, 11, 0, Math.PI * 2); ctx.fill()
  emoji('🎅', px(Math.max(0, progress - 8 + 6 * lunge)) - 12, 44, 26)
  ctx.drawImage(finish, W - 54, 12, 28, 34)
}

function draw() {
  ctx.save()
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 20, rand(-1, 1) * shake * 20)
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#12001f')
  sky.addColorStop(1, '#5a0a6e')
  ctx.fillStyle = sky
  ctx.fillRect(-20, -20, W + 40, H + 40)

  ctx.fillStyle = '#fff'
  snow.forEach(f => { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill() })

  ctx.fillStyle = '#1b0a2e'
  ctx.fillRect(-20, GROUND, W + 40, H - GROUND + 20)
  ctx.fillStyle = '#39ff14'
  ctx.fillRect(-20, GROUND, W + 40, 4)
  for (let x = -(dist % 80); x < W; x += 80) ctx.fillRect(x, GROUND + 30, 36, 3)

  if (state === 'run' || state === 'win') {
    const finishX = GX + 60 + (RUN_SECONDS - progress) * SPEED
    const finishW = finish.width * FINISH_HEIGHT / finish.height
    if (finishX < W) ctx.drawImage(finish, finishX, GROUND + 4 - FINISH_HEIGHT, finishW, FINISH_HEIGHT)
  }
  obstacles.forEach(o => drawSprite(o.s, o.x, GROUND + 4, o.k))

  const running = state === 'run'
  const step = `run-0${Math.floor(clock * 8) % 2 + 1}`
  const santaX = 60 + lunge * 70
  drawSprite(sprites[`santa-${running ? step : 'idle'}`], santaX, GROUND + 4, CHAR_SCALE)
  if (lunge > 0.3) emoji('💢', santaX + 50, GROUND - 100, 36)

  if (!(invuln > 0 && Math.floor(invuln * 10) % 2)) {
    const pose = !running ? 'idle' : y > 0 ? 'jump' : step
    drawSprite(sprites[`grinch-${pose}`], GX, GROUND + 4 - y, CHAR_SCALE)
  }
  if (state !== 'start') drawBar()
  if (messageT > 0) drawMessage()

  confetti.forEach(c => { ctx.fillStyle = c.c; ctx.fillRect(c.x, c.y, 8, 12) })
  ctx.restore()
}

let last = 0
function frame(t) {
  const dt = Math.min((t - last) / 1000, 0.05)
  last = t
  clock += dt
  if (state === 'run') update(dt)
  updateFx(dt)
  draw()
  requestAnimationFrame(frame)
}

canvas.addEventListener('pointerdown', jump)
window.addEventListener('keydown', e => {
  if (state === 'run' && (e.code === 'Space' || e.code === 'ArrowUp')) {
    e.preventDefault()
    jump()
  }
})
button.addEventListener('click', start)

reset()
state = 'start'
showScreen('Sympathy 4 the Grinch', "Rob Santa. Don't get caught.\nTap to jump over stuff. Make it to Whoville with the loot!", 'Turn your sound on!', 'Loading...')
button.disabled = true
loadSprites().then(() => {
  button.disabled = false
  button.textContent = "Let's go"
  requestAnimationFrame(frame)
}).catch(() => { text.textContent = 'Could not load the game. Check your connection and refresh.' })
