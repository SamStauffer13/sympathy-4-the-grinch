// ---- settings ----
const H = 450, GROUND = 370, SCALE = 2 // the game is always H tall; its width follows the screen (see fit)
const MAX_ASPECT = 2.2 // the widest screen shape the game stretches to
const RUN_SECONDS = 132 // the length of the song, so the game ends when it does
const SONG_ID = '8Lyvv_bhzD0' // YouTube video that plays during the run
const SPEED = 280, GRAVITY = 1520, JUMP = 760
const SPEED_RAMP = 0.2 // how much faster the run gets by the end
const GX = 170 // the Grinch's centre x
const CHAR_SCALE = 0.63 // character sprite px -> game px
const OBSTACLE_MAX = [105, 80] // widest and tallest an obstacle's art is drawn
const FINISH_HEIGHT = 150 // drawn height of the finish-line art
const GRINCH_INSET = 0.2, OBSTACLE_INSET = 0.15 // share of a sprite's visible width that is not a hit, each side
const HITBOX_HEIGHT = 0.9 // share of a sprite's visible height that is a hit
const CELEBRATION = 3.5 // seconds the finish plays before the clue card shows
const SKIP_AFTER = 1.5 // seconds before a tap skips ahead to the clue card
const HIT_MESSAGE = "Santa's gaining!"
const PINK = '#ff2bd6', GREEN = '#39ff14', CYAN = '#00f0ff', GOLD = '#ffd666'
const PARTY = [PINK, GREEN, CYAN, '#ffe600', '#ff2d2d']
const FONT = "'Arial Black', Impact, sans-serif"
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches // no screen shake or blinking

// ---- page ----
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
const overlay = document.getElementById('screen') // the start and win screens
const [title, text, note, button] = ['h1', 'p', 'small', '#go'].map(s => overlay.querySelector(s))
const clueCard = document.getElementById('clue')
const soundButton = document.getElementById('sound')
const rotateBanner = document.getElementById('rotate') // asks for the phone to be turned; shown on the start screen only

const rand = (a, b) => a + Math.random() * (b - a)

// wide phones get a wider game instead of side margins; the page sizes the frame from --aspect
let W = 0, snow = []
function fit() {
  const long = Math.max(innerWidth, innerHeight), short = Math.min(innerWidth, innerHeight)
  const width = Math.round(H * Math.min(Math.max(long / short, 16 / 9), MAX_ASPECT))
  if (width === W) return
  W = width
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  ctx.imageSmoothingQuality = 'high'
  document.documentElement.style.setProperty('--aspect', W / H)
  snow = Array.from({ length: Math.round(W / 16) }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(1, 3) }))
}
addEventListener('resize', fit)

// ---- music: the run never waits for the video, so it works with the song muted, blocked or slow ----
let player, muted = false
const applySound = () => muted ? player?.mute?.() : player?.unMute?.()
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('music', {
    width: 200, height: 200, videoId: SONG_ID,
    playerVars: { controls: 0, disablekb: 1, playsinline: 1, rel: 0, iv_load_policy: 3 },
    events: { onReady: applySound }, // a choice made while the player was still loading
  })
}
document.head.append(Object.assign(document.createElement('script'), { src: 'https://www.youtube.com/iframe_api' }))
soundButton.addEventListener('click', () => {
  muted = !muted
  applySound()
  soundButton.textContent = muted ? '🔇 Sound off' : '🔊 Sound on'
})

let wakeLock
const keepAwake = async () => { try { wakeLock = await navigator.wakeLock?.request('screen') } catch {} }

// ---- art: img/manifest.json lists every sprite; contentBounds is [x, y, width, height] of the visible art ----
const sprites = {}
const finish = new Image()
let obstacleIds = [], lastObstacle, grinchBox
const isCharacter = id => /^(grinch|santa)-/.test(id)

async function loadSprites() {
  finish.src = 'img/american-dream.png'
  await finish.decode()
  const { assets } = await (await fetch('img/manifest.json')).json()
  await Promise.all(assets.map(async a => {
    try {
      const img = new Image()
      img.src = 'img/' + a.file
      await img.decode()
      const [bx, , bw, bh] = a.contentBounds
      sprites[a.id] = { img, name: a.name, bx, bw, bh, w: a.width, feetY: a.feetY }
    } catch (e) {
      if (isCharacter(a.id)) throw e // the characters are required; a broken obstacle is just skipped
    }
  }))
  obstacleIds = Object.keys(sprites).filter(id => !isCharacter(id))
  if (!obstacleIds.length) throw new Error('no obstacles loaded')
  grinchBox = box(sprites['grinch-run-01'], CHAR_SCALE, GRINCH_INSET)
}

// hitbox relative to the sprite's centre, shrunk by inset on each side
const box = (s, k, inset) => ({
  l: (s.bx - s.w / 2 + inset * s.bw) * k,
  r: (s.bx + s.bw * (1 - inset) - s.w / 2) * k,
  h: s.bh * k * HITBOX_HEIGHT,
})

function drawSprite(s, cx, feet, k) {
  ctx.drawImage(s.img, cx - (s.w / 2) * k, feet - s.feetY * k, s.img.width * k, s.img.height * k)
}

// ---- game state ----
let state, progress, y, vy, obstacles, spawnIn, lunge, invuln, shake, message, messageT, messageDuration, particles, santaFall
let clock = 0, dist = 0, speed = SPEED, unlockT = 0, nextBurst = 0, winTimer, jumped = false

function reset() {
  progress = 0; y = 0; vy = 0; obstacles = []; spawnIn = 500; speed = SPEED
  lunge = 0; invuln = 0; shake = 0; messageT = 0; particles = []; santaFall = null
}

function showScreen(h, p, n, b, clue) {
  title.textContent = h; text.textContent = p; note.textContent = n; button.textContent = b
  button.disabled = false
  text.hidden = !p
  soundButton.hidden = rotateBanner.hidden = !!clue
  clueCard.hidden = !clue
  if (clue) {
    clueCard.querySelector('span').textContent = CLUE_LABEL
    clueCard.querySelector('strong').textContent = clue
  }
  overlay.hidden = false
}

// on a phone, fill the screen and turn to landscape where the browser allows it (Android does; iPhones ignore this)
async function goLandscape() {
  if (!matchMedia('(pointer: coarse)').matches) return
  try {
    await document.documentElement.requestFullscreen?.()
    await screen.orientation?.lock?.('landscape')
  } catch {}
}

function start() {
  goLandscape() // first, while the tap still counts as a user action
  reset()
  state = 'run'
  overlay.hidden = rotateBanner.hidden = true
  button.blur()
  player?.seekTo?.(0)
  player?.playVideo?.()
  keepAwake()
}

// where the finish line is: it slides in as the run ends
function finishRect() {
  return { x: GX + 60 + (RUN_SECONDS - progress) * speed, w: finish.width * FINISH_HEIGHT / finish.height }
}

const showWin = () => {
  clearTimeout(winTimer)
  showScreen('You got away with it!', '', 'Show this to the grown-up', 'Rob Santa again', CLUE)
}

// a round of sparks flying out from a point and falling
function burst(cx, cy, colors, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2), v = rand(speed * 0.4, speed)
    particles.push({ x: cx, y: cy, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 40, g: 260, life: 1.2, w: 5, h: 5, c: colors[Math.floor(rand(0, colors.length))] })
  }
}

// the finish: Santa wipes out, the globe unlocks, and the Grinch celebrates
function win() {
  state = 'win'
  invuln = 0
  player?.pauseVideo?.()
  wakeLock?.release?.()
  screen.orientation?.unlock?.()
  navigator.vibrate?.([80, 40, 80, 40, 240])
  shake = calm ? 0 : 0.5
  say('Santa wiped out!', 1.8)
  santaFall = { x: 60 + lunge * 70, h: 0, vx: 30, vy: 700, rot: 0, bounced: false, restRot: null }
  nextBurst = 0.5
  particles = Array.from({ length: 90 }, () => ({
    x: rand(0, W), y: rand(-H, 0), vx: rand(-60, 60), vy: rand(150, 350), c: PARTY[Math.floor(rand(0, PARTY.length))],
  }))
  const { x, w } = finishRect()
  burst(x + w / 2, GROUND - FINISH_HEIGHT / 2, [GOLD], 40, 220)
  winTimer = setTimeout(showWin, CELEBRATION * 1000)
}

function hit(o) {
  obstacles.splice(obstacles.indexOf(o), 1)
  lunge = 1; invuln = 1; shake = calm ? 0 : 0.35
  navigator.vibrate?.(80)
  say(HIT_MESSAGE, 1.3)
}

function say(s, seconds) {
  message = s
  messageT = messageDuration = seconds
}

function jump() {
  if (state === 'run' && y <= 0) {
    vy = JUMP
    jumped = true
  }
}

function spawn() {
  const ids = obstacleIds.filter(id => id !== lastObstacle) // never the same obstacle twice in a row
  lastObstacle = ids[Math.floor(rand(0, ids.length))] ?? lastObstacle
  const s = sprites[lastObstacle]
  const k = Math.min(OBSTACLE_MAX[0] / s.bw, OBSTACLE_MAX[1] / s.bh)
  obstacles.push({ x: W + 100, s, k, box: box(s, k, OBSTACLE_INSET) })
}

function update(dt) {
  progress += dt
  speed = SPEED * (1 + SPEED_RAMP * Math.min(progress / RUN_SECONDS, 1))
  dist += speed * dt
  vy -= GRAVITY * dt
  y += vy * dt
  if (y <= 0) { y = 0; vy = 0 }

  spawnIn -= speed * dt
  if (spawnIn <= 0 && progress < RUN_SECONDS - 3) {
    spawn()
    spawnIn = rand(450, 720)
  }
  obstacles.forEach(o => { o.x -= speed * dt })
  obstacles = obstacles.filter(o => o.x > -150)

  invuln -= dt; lunge = Math.max(0, lunge - dt / 4)
  if (invuln <= 0) {
    const o = obstacles.find(o => GX + grinchBox.r > o.x + o.box.l && GX + grinchBox.l < o.x + o.box.r && y < o.box.h)
    if (o) hit(o)
  }
  obstacles.forEach(o => {
    if (!o.cleared && GX + grinchBox.l > o.x + o.box.r) {
      o.cleared = true
      say(o.s.name, 1.2) // the obstacle's name pops up as you clear it
    }
  })
  if (progress >= RUN_SECONDS) win()
}

// everything that keeps moving whatever the state: snow, popups, shake and the finish celebration
function updateFx(dt) {
  const drift = state === 'run' ? speed * dt * 0.3 : 0
  snow.forEach(f => {
    f.y = (f.y + 40 * dt) % H
    f.x = (f.x - drift + W) % W
  })
  messageT -= dt
  shake = Math.max(0, shake - dt)

  unlockT = state === 'win' ? unlockT + dt : 0
  if (state === 'win' && !calm && unlockT > nextBurst && unlockT < 6) { // fireworks
    nextBurst += 0.45
    burst(rand(W * 0.3, W * 0.9), rand(60, 200), PARTY, 28, 200)
  }
  particles.forEach(c => {
    c.vy += (c.g ?? 0) * dt
    c.x += c.vx * dt
    c.y += c.vy * dt
    if (c.life !== undefined) c.life -= dt
  })
  particles = particles.filter(c => c.life === undefined || c.life > 0)

  if (santaFall) { // Santa tumbles, bounces once and ends up flat on his back
    const s = santaFall
    s.vy -= 1800 * dt
    s.h += s.vy * dt
    s.x += s.vx * dt
    if (s.restRot === null) s.rot -= 7 * dt
    else s.rot += (s.restRot - s.rot) * Math.min(1, dt * 8)
    if (s.h < 0) {
      s.h = 0
      if (!s.bounced) s.vy = 320
      else {
        s.vy = s.vx = 0
        s.restRot ??= Math.round((s.rot + Math.PI / 2) / (2 * Math.PI)) * 2 * Math.PI - Math.PI / 2 // nearest "lying down"
      }
      s.bounced = true
    }
  }
}

// ---- drawing ----
function emoji(e, x, yy, size) {
  ctx.font = `${size}px serif`
  ctx.textBaseline = 'bottom'
  ctx.fillText(e, x, yy)
}

function glitchText(s, x, yy, size) {
  ctx.font = `${size}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = CYAN
  ctx.fillText(s, x + 3, yy + 3)
  ctx.fillStyle = PINK
  ctx.fillText(s, x, yy)
  ctx.textAlign = 'left'
}

// the name pops in with a bounce, drifts up and fades; long names shrink to fit the screen
function drawMessage() {
  const age = messageDuration - messageT
  const p = Math.min(age / 0.25, 1) - 1
  const popped = 0.4 + 0.6 * (1 + 2.70158 * p ** 3 + 1.70158 * p ** 2)
  ctx.font = `36px ${FONT}`
  const fits = Math.min(1, (W - 120) / ctx.measureText(message).width)
  ctx.save()
  ctx.globalAlpha = Math.min(1, messageT / 0.4)
  ctx.translate(W / 2, 90 - age * 25)
  ctx.scale(popped * fits, popped * fits)
  glitchText(message, 0, 0, 36)
  ctx.restore()
}

function drawBar() {
  const px = p => 40 + (W - 80) * Math.min(p / RUN_SECONDS, 1)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath(); ctx.roundRect(40, 22, W - 80, 14, 7); ctx.fill()
  ctx.fillStyle = PINK
  ctx.beginPath(); ctx.roundRect(40, 22, px(progress) - 40 + 1, 14, 7); ctx.fill()
  ctx.fillStyle = GREEN
  ctx.beginPath(); ctx.arc(px(progress), 29, 11, 0, Math.PI * 2); ctx.fill()
  emoji('🎅', px(Math.max(0, progress - 8 + 6 * lunge)) - 12, 44, 26)
  ctx.drawImage(finish, W - 54, 12, 28, 34)
}

// a sprite turned about the middle of its visible art, for tumbles and flips
function drawSpun(s, cx, feet, k, rotation) {
  const half = (s.bh * k) / 2
  ctx.save()
  ctx.translate(cx, feet - half)
  ctx.rotate(rotation)
  drawSprite(s, 0, half, k)
  ctx.restore()
}

function drawRays(cx, cy) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = Math.min(unlockT / 0.5, 1) * 0.2
  ctx.fillStyle = GOLD
  ctx.translate(cx, cy)
  ctx.rotate(unlockT * 0.5)
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, -260); ctx.lineTo(18, -260); ctx.fill()
  }
  ctx.restore()
}

function drawFinish() {
  const { x, w } = finishRect()
  if (x >= W) return
  const winning = state === 'win'
  const cx = x + w / 2, cy = GROUND - FINISH_HEIGHT / 2
  if (winning) drawRays(cx, cy)
  ctx.drawImage(finish, x, GROUND + 4 - FINISH_HEIGHT, w, FINISH_HEIGHT)
  if (!winning) return

  // unlocked: the globe lights up, a ring rushes out of it and the news pops above it
  const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 120)
  glow.addColorStop(0, 'rgba(255, 214, 102, 0.9)')
  glow.addColorStop(1, 'rgba(255, 214, 102, 0)')
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = Math.min(unlockT / 0.5, 1) * (0.55 + 0.15 * Math.sin(clock * 6))
  ctx.fillStyle = glow
  ctx.fillRect(cx - 120, cy - 120, 240, 240)
  ctx.restore()
  const ring = Math.min(unlockT / 0.7, 1)
  ctx.save()
  ctx.globalAlpha = 1 - ring
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 6
  ctx.beginPath(); ctx.arc(cx, cy, 20 + 160 * ring, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
  if (unlockT < CELEBRATION - 0.1) glitchText('UNLOCKED!', cx, GROUND - FINISH_HEIGHT - 24, 30 + Math.sin(clock * 10) * 2)
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
  ctx.fillStyle = GREEN
  ctx.fillRect(-20, GROUND, W + 40, 4)
  for (let x = -(dist % 80); x < W; x += 80) ctx.fillRect(x, GROUND + 30, 36, 3)

  if (state !== 'start') drawFinish()
  obstacles.forEach(o => drawSprite(o.s, o.x, GROUND + 4, o.k))

  const running = state === 'run', winning = state === 'win'
  const step = `run-0${Math.floor(clock * 8) % 2 + 1}`
  if (winning && santaFall) {
    drawSpun(sprites['santa-run-01'], santaFall.x, GROUND + 4 - santaFall.h, CHAR_SCALE, santaFall.rot)
    if (santaFall.restRot !== null) { // dizzy stars circle his head
      for (let i = 0; i < 3; i++) {
        const a = clock * 5 + i * 2.09
        emoji('⭐', santaFall.x + Math.cos(a) * 36 - 10, GROUND - 58 + Math.sin(a) * 10, 20)
      }
    }
  } else {
    const santaX = 60 + lunge * 70
    drawSprite(sprites[`santa-${running ? step : 'idle'}`], santaX, GROUND + 4, CHAR_SCALE)
    if (lunge > 0.3) emoji('💢', santaX + 50, GROUND - 100, 36)
  }

  // after a hit the Grinch blinks three times a second (or just fades, with reduced motion)
  if (!(invuln > 0 && !calm && Math.floor(invuln * 6) % 2)) {
    // at the finish he hops for joy and does a flip on the way up
    const hop = winning ? Math.abs(Math.sin(unlockT * 5)) * 80 : y
    const flip = winning && !calm && unlockT > 0.3 && unlockT < 1 ? ((unlockT - 0.3) / 0.7) * Math.PI * 2 : 0
    const pose = running ? (y > 0 ? 'jump' : step) : winning && hop > 4 ? 'jump' : 'idle'
    ctx.globalAlpha = invuln > 0 && calm ? 0.5 : 1
    drawSpun(sprites[`grinch-${pose}`], GX, GROUND + 4 - hop, CHAR_SCALE, flip)
    ctx.globalAlpha = 1
  }
  if (state !== 'start') drawBar()
  // until the first jump, tell the player what to do as the first obstacle closes in
  if (running && !jumped && obstacles.some(o => o.x > GX && o.x < GX + 420)) {
    glitchText('TAP TO JUMP!', W / 2, 200, 44 + Math.sin(clock * 10) * 3)
  }
  if (messageT > 0) drawMessage()

  particles.forEach(c => {
    ctx.globalAlpha = c.life === undefined ? 1 : Math.min(1, c.life)
    ctx.fillStyle = c.c
    ctx.fillRect(c.x, c.y, c.w ?? 8, c.h ?? 12)
  })
  ctx.globalAlpha = 1
  if (winning && !calm && unlockT < 0.25) { // a camera flash as the lock opens
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * (1 - unlockT / 0.25)})`
    ctx.fillRect(-20, -20, W + 40, H + 40)
  }
  ctx.restore()
}

// ---- loop and input ----
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

canvas.addEventListener('pointerdown', () => state === 'win' && unlockT > SKIP_AFTER ? showWin() : jump())
addEventListener('keydown', e => {
  if (state === 'run' && (e.code === 'Space' || e.code === 'ArrowUp')) {
    e.preventDefault()
    jump()
  }
})
button.addEventListener('click', start)

// the game stops drawing while the page is hidden, so the song waits with it
document.addEventListener('visibilitychange', () => {
  if (state !== 'run') return
  if (document.hidden) player?.pauseVideo?.()
  else {
    player?.playVideo?.()
    keepAwake()
  }
})

fit()
reset()
state = 'start'
showScreen('Sympathy 4 the Grinch', "Rob Santa. Tap to Jump. Don't get caught.", 'Survive the song to get your clue', 'Loading...')
button.disabled = true
loadSprites().then(() => {
  button.disabled = false
  button.textContent = "Let's go"
  requestAnimationFrame(frame)
}).catch(() => { text.textContent = 'Could not load the game. Check your connection and refresh.' })
