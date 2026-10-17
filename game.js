const CLUE = 'Replace this text with the real clue.' // shown when the player wins

const W = 800, H = 450, GROUND = 370, SCALE = 2
const RUN_SECONDS = 45 // seconds of running needed to win
const PENALTY = 5 // seconds lost when the Grinch hits something
const SPEED = 330, GRAVITY = 2400, JUMP = 880
const GX = 140 // the Grinch's x position
const OBSTACLES = ['🎄', '⛄', '🎁', '🍭']

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
canvas.width = W * SCALE
canvas.height = H * SCALE
ctx.scale(SCALE, SCALE)

const screen = document.getElementById('screen')
const [title, text, note, button] = ['h1', 'p', 'small', 'button'].map(s => screen.querySelector(s))

const rand = (a, b) => a + Math.random() * (b - a)

let state, progress, y, vy, obstacles, spawnIn, lunge, invuln, shake, message, messageT, confetti
let clock = 0, dist = 0
const snow = Array.from({ length: 50 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(1, 3) }))

function reset() {
  progress = 0; y = 0; vy = 0; obstacles = []; spawnIn = 600
  lunge = 0; invuln = 0; shake = 0; messageT = 0; confetti = []
}

function showScreen(h, p, n, b) {
  title.textContent = h; text.textContent = p; note.textContent = n; button.textContent = b
  screen.hidden = false
}

function start() {
  reset()
  state = 'run'
  screen.hidden = true
  button.blur()
}

function win() {
  state = 'win'
  const colors = ['#ff2bd6', '#39ff14', '#00f0ff', '#ffe600', '#ff2d2d']
  confetti = Array.from({ length: 90 }, () => ({
    x: rand(0, W), y: rand(-H, 0), vx: rand(-60, 60), vy: rand(150, 350), c: colors[Math.floor(rand(0, colors.length))],
  }))
  setTimeout(() => showScreen('You got away with it!', CLUE,'Show this to the grown-up', 'Rob Santa again'), 900)
}

function hit(o) {
  obstacles.splice(obstacles.indexOf(o), 1)
  progress = Math.max(0, progress - PENALTY)
  lunge = 1; invuln = 1; shake = 0.35
  message = "Santa's gaining!"; messageT = 1.3
}

function jump() {
  if (state === 'run' && y <= 0) vy = JUMP
}

function update(dt) {
  progress += dt
  dist += SPEED * dt
  vy -= GRAVITY * dt
  y += vy * dt
  if (y <= 0) { y = 0; vy = 0 }

  spawnIn -= SPEED * dt
  if (spawnIn <= 0 && progress < RUN_SECONDS - 3) {
    obstacles.push({ x: W + 40, e: OBSTACLES[Math.floor(rand(0, OBSTACLES.length))] })
    spawnIn = rand(520, 840)
  }
  obstacles.forEach(o => { o.x -= SPEED * dt })
  obstacles = obstacles.filter(o => o.x > -80)

  invuln -= dt; messageT -= dt; shake = Math.max(0, shake - dt); lunge = Math.max(0, lunge - dt / 4)
  if (invuln <= 0) {
    const o = obstacles.find(o => o.x + 10 < GX + 42 && o.x + 46 > GX + 8 && y < 44)
    if (o) hit(o)
  }
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

function drawGrinch() {
  if (invuln > 0 && Math.floor(invuln * 10) % 2) return
  const b = GROUND - y
  const swing = y > 0 ? 0 : Math.sin(clock * 18) * 10
  emoji('🎁', GX - 26, b - 28, 36)
  ctx.fillStyle = '#1f9d3a'
  ctx.fillRect(GX + 10 + swing, b - 14, 8, 14)
  ctx.fillRect(GX + 26 - swing, b - 14, 8, 14)
  ctx.fillStyle = '#39ff14'
  ctx.beginPath(); ctx.roundRect(GX, b - 62, 44, 52, 14); ctx.fill()
  ctx.fillStyle = '#ffe600'
  ctx.fillRect(GX + 24, b - 50, 8, 8)
  ctx.fillRect(GX + 34, b - 50, 8, 8)
  ctx.fillStyle = '#ff2d2d'
  ctx.beginPath(); ctx.moveTo(GX + 2, b - 60); ctx.lineTo(GX + 22, b - 92); ctx.lineTo(GX + 42, b - 60); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(GX + 22, b - 94, 5, 0, Math.PI * 2); ctx.fill()
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
  emoji('🏠', W - 56, 52, 32)
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
    const houseX = GX + 60 + (RUN_SECONDS - progress) * SPEED
    if (houseX < W + 80) emoji('🏠', houseX, GROUND, 110)
  }
  obstacles.forEach(o => emoji(o.e, o.x, GROUND + 4, 56))

  const santaX = 10 + lunge * 70
  emoji('🎅', santaX, GROUND - Math.abs(Math.sin(clock * 10)) * 12, 76)
  if (lunge > 0.3) emoji('💢', santaX + 60, GROUND - 60, 36)

  drawGrinch()
  if (state !== 'start') drawBar()
  if (messageT > 0) glitchText(message, W / 2, 90, 36)

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
showScreen('Sympathy 4 the Grinch', "Rob Santa. Don't get caught.\nTap to jump over stuff. Make it to Whoville with the loot!", '', "Let's go")
requestAnimationFrame(frame)
