// Dreamscape: a conversation between two people, painted as it happens.
//
//   speech ─► words ─► pictures (emoji spirits) that drift in from each speaker's side
//                   ─► feelings  (sky colour, rain, lightning, fireflies, petals)
//   voice  ─► loudness (speaker aura) and pitch (optional automatic speaker switching)
//   both people say the same thing ─► the two spirits fly together, fuse in a burst
//                   of light, and fall as a seed into the garden of shared things
//   optional: an AI painter repaints the whole sky from what the dream holds
//
// No words are ever drawn on the canvas.

(function () {
  const LEX = window.DreamLexicon
  const canvas = document.getElementById('dream')
  const ctx = canvas.getContext('2d')
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'

  let W = 0
  let H = 0
  let DPR = 1
  let now = performance.now()

  // ---------------------------------------------------------------- speakers
  const SPEAKERS = [
    { glyph: '☀️', rgb: [255, 178, 84], side: -1, aura: 0, trail: [] },
    { glyph: '🌙', rgb: [128, 196, 255], side: 1, aura: 0, trail: [] }
  ]
  let active = 0

  // ---------------------------------------------------------------- world
  const concepts = new Map() // emoji -> concept
  let sprites = [] // living pictures in the air
  let particles = [] // sparks, rain, rings, seeds, petals, fireflies
  const plants = [] // the garden of shared things
  let plantSlots = 0
  const memories = [] // faded pictures that became stars
  let stars = []

  const mood = {
    valence: 0, // -1 storm … +1 golden dawn
    valenceTarget: 0,
    energy: 0, // 0 still … 1 wild
    textEnergy: 0,
    aurora: 0.12,
    flash: 0,
    bolt: null,
    lastSpeech: -1e9
  }

  // ---------------------------------------------------------------- helpers
  const rand = (a, b) => a + Math.random() * (b - a)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const lerp = (a, b, t) => a + (b - a) * t
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
  const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]

  const emojiCache = new Map()
  function emojiImg (e) {
    let c = emojiCache.get(e)
    if (!c) {
      c = document.createElement('canvas')
      c.width = c.height = 128
      const x = c.getContext('2d')
      x.font = `96px ${EMOJI_FONT}`
      x.textAlign = 'center'
      x.textBaseline = 'middle'
      x.fillText(e, 64, 72)
      emojiCache.set(e, c)
    }
    return c
  }

  const glowCache = new Map()
  function glowImg (rgb) {
    const k = rgb.map(v => v | 0).join(',')
    let c = glowCache.get(k)
    if (!c) {
      c = document.createElement('canvas')
      c.width = c.height = 128
      const x = c.getContext('2d')
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
      g.addColorStop(0, rgba(rgb, 0.9))
      g.addColorStop(0.25, rgba(rgb, 0.35))
      g.addColorStop(1, rgba(rgb, 0))
      x.fillStyle = g
      x.fillRect(0, 0, 128, 128)
      glowCache.set(k, c)
    }
    return c
  }

  function drawGlow (rgb, x, y, r, a) {
    if (a <= 0.003 || r <= 0) return
    ctx.globalAlpha = Math.min(1, a)
    ctx.drawImage(glowImg(rgb), x - r, y - r, r * 2, r * 2)
  }

  function drawEmoji (e, x, y, size, a, rot) {
    if (a <= 0.003 || size <= 0.5) return
    ctx.globalAlpha = Math.min(1, a)
    if (rot) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.drawImage(emojiImg(e), -size / 2, -size / 2, size, size)
      ctx.restore()
    } else {
      ctx.drawImage(emojiImg(e), x - size / 2, y - size / 2, size, size)
    }
  }

  // ---------------------------------------------------------------- layout
  function resize () {
    DPR = Math.min(window.devicePixelRatio || 1, 2)
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * DPR
    canvas.height = H * DPR
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    stars = []
    const n = Math.round((W * H) / 6000)
    for (let i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.75, r: Math.random() * 1.4 + 0.2, p: Math.random() * 6.28, s: rand(0.5, 2) })
    }
    plants.forEach(p => placePlant(p))
    particles.forEach(p => { if (p.type === 'seed') { placePlant(p.plant); p.tx = p.plant.x; p.ty = p.plant.base } })
    memories.forEach(m => { m.x = clamp(m.x, 10, W - 10) })
  }
  const groundY = () => H * 0.86
  const scale = () => clamp(Math.min(W, H) / 800, 0.55, 1.4)

  // ---------------------------------------------------------------- understanding
  function tokenize (text) {
    return text.toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').split(/[\s-]+/).filter(Boolean)
  }

  function lookup (w) {
    const c = LEX.concepts
    if (c[w]) return c[w]
    if (w.length > 4 && w.endsWith('ies') && c[w.slice(0, -3) + 'y']) return c[w.slice(0, -3) + 'y']
    if (w.length > 3 && w.endsWith('es') && c[w.slice(0, -2)]) return c[w.slice(0, -2)]
    if (w.length > 3 && w.endsWith('s') && c[w.slice(0, -1)]) return c[w.slice(0, -1)]
    if (w.length > 5 && w.endsWith('ing')) {
      const s = w.slice(0, -3)
      if (c[s]) return c[s]
      if (c[s + 'e']) return c[s + 'e']
      if (s[s.length - 1] === s[s.length - 2] && c[s.slice(0, -1)]) return c[s.slice(0, -1)]
    }
    if (w.length > 4 && w.endsWith('ed') && c[w.slice(0, -2)]) return c[w.slice(0, -2)]
    return null
  }

  function extract (tokens) {
    const found = []
    for (let i = 0; i < tokens.length; i++) {
      const pair = i + 1 < tokens.length ? tokens[i] + ' ' + tokens[i + 1] : null
      if (pair && LEX.concepts[pair]) {
        found.push({ emoji: LEX.concepts[pair], word: pair })
        i++
        continue
      }
      const e = lookup(tokens[i])
      if (e) found.push({ emoji: e, word: tokens[i] })
    }
    return found
  }

  function feel (tokens) {
    let score = 0
    let hits = 0
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i]
      let s = LEX.positive.has(w) ? 1 : LEX.negative.has(w) ? -1 : 0
      if (!s) continue
      if (LEX.negators.has(tokens[i - 1]) || LEX.negators.has(tokens[i - 2])) s = -s * 0.7
      score += s
      hits++
    }
    return { score, hits }
  }

  let utteranceSeen = new Set()
  // The single entry point: every bit of heard speech comes through here.
  function hear (text, isFinal, speaker) {
    const sp = speaker == null ? active : speaker
    mood.lastSpeech = now
    const tokens = tokenize(text)
    for (const f of extract(tokens)) {
      if (utteranceSeen.has(f.emoji)) continue
      utteranceSeen.add(f.emoji)
      mention(f, sp)
    }
    if (isFinal) {
      const { score, hits } = feel(tokens)
      mood.valenceTarget = clamp(mood.valenceTarget + score * 0.16, -1, 1)
      mood.textEnergy = clamp(mood.textEnergy + hits * 0.08, 0, 1)
      utteranceSeen = new Set()
    }
  }

  // ---------------------------------------------------------------- concepts & spirits
  function getConcept (f) {
    let c = concepts.get(f.emoji)
    if (!c) {
      c = { emoji: f.emoji, word: f.word, mentions: [0, 0], last: now, sprites: [null, null], fusing: null, plant: null }
      concepts.set(f.emoji, c)
    }
    return c
  }

  function mention (f, sp) {
    const c = getConcept(f)
    c.mentions[sp]++
    c.last = now
    c.word = f.word
    paintDirty = true
    mood.textEnergy = clamp(mood.textEnergy + 0.05, 0, 1)

    const trail = SPEAKERS[sp].trail
    trail.push(c.emoji)
    if (trail.length > 9) trail.shift()

    if (c.plant) {
      // Already shared: the garden flower answers.
      c.plant.target = Math.min(c.plant.target + 14 * scale(), H * 0.42)
      c.plant.pulse = 1.6
      const tip = plantTip(c.plant)
      sparkBurst(tip.x, tip.y, SPEAKERS[sp].rgb, 14, 3)
      return
    }

    let s = c.sprites[sp]
    if (s && !s.dead) {
      s.pulse = 1.7
      s.last = now
      sparkBurst(s.x, s.y, SPEAKERS[sp].rgb, 8, 2.2)
    } else {
      s = spawnSprite(c, sp)
      c.sprites[sp] = s
    }

    const other = c.sprites[1 - sp]
    if (other && !other.dead && !c.fusing) beginFusion(c)
  }

  function spawnSprite (c, sp) {
    const S = SPEAKERS[sp]
    const k = scale()
    const left = S.side < 0
    const s = {
      concept: c,
      sp,
      emoji: c.emoji,
      x: left ? -30 : W + 30,
      y: H * rand(0.2, 0.65),
      vx: (left ? 1 : -1) * rand(7, 11) * k,
      vy: rand(-2, 2),
      homeX: left ? W * rand(0.08, 0.42) : W * rand(0.58, 0.92),
      homeY: H * rand(0.14, 0.66),
      size: 4,
      pulse: 1.4,
      born: now,
      last: now,
      phase: Math.random() * 6.28,
      alpha: 1,
      dead: false
    }
    sprites.push(s)
    sparkBurst(left ? 8 : W - 8, s.y, S.rgb, 10, 4)

    const mine = sprites.filter(o => o.sp === sp && !o.dead && !o.concept.fusing)
    if (mine.length > 22) {
      mine.sort((a, b) => a.last - b.last)
      retire(mine[0])
    }
    return s
  }

  function retire (s) {
    // A forgotten picture floats up and becomes a small star of memory.
    s.dead = true
    if (s.concept.sprites[s.sp] === s) s.concept.sprites[s.sp] = null
    memories.push({ emoji: s.emoji, x: s.x, y: s.y, tx: s.x + rand(-40, 40), ty: H * rand(0.03, 0.13), rgb: SPEAKERS[s.sp].rgb, p: Math.random() * 6.28 })
    if (memories.length > 60) memories.shift()
  }

  function beginFusion (c) {
    c.fusing = { x: W / 2 + rand(-0.05, 0.05) * W, y: H * rand(0.3, 0.5), start: now }
    for (const s of c.sprites) if (s) s.pulse = 2
    mood.aurora = Math.min(1, mood.aurora + 0.15)
  }

  function completeFusion (c) {
    const f = c.fusing
    const k = scale()
    for (const s of c.sprites) if (s) s.dead = true
    c.sprites = [null, null]
    c.fusing = null

    // A burst of both colours, a white ring, a flash, and the sky remembers.
    sparkBurst(f.x, f.y, SPEAKERS[0].rgb, 46, 7)
    sparkBurst(f.x, f.y, SPEAKERS[1].rgb, 46, 7)
    sparkBurst(f.x, f.y, [255, 255, 255], 24, 4)
    particles.push({ type: 'ring', x: f.x, y: f.y, r: 10, vr: 7 * k, life: 1, decay: 0.022, rgb: [255, 250, 235], w: 3 })
    particles.push({ type: 'ring', x: f.x, y: f.y, r: 4, vr: 4 * k, life: 1, decay: 0.016, rgb: mix(SPEAKERS[0].rgb, SPEAKERS[1].rgb, 0.5), w: 2 })
    mood.flash = Math.max(mood.flash, 0.35)
    mood.aurora = Math.min(1, mood.aurora + 0.45)
    mood.valenceTarget = clamp(mood.valenceTarget + 0.06, -1, 1)

    // The fused picture becomes a seed that falls into the garden.
    const plant = { concept: c, emoji: c.emoji, x: 0, base: 0, h: 0, target: (60 + rand(0, 40)) * k, bloom: 0, pulse: 2, phase: Math.random() * 6.28, row: 0 }
    plant.slot = plantSlots++
    placePlant(plant)
    particles.push({
      type: 'seed', x: f.x, y: f.y, vx: (plant.x - f.x) / 70, vy: -3, life: 1, decay: 0, emoji: c.emoji, plant,
      tx: plant.x, ty: plant.base
    })
  }

  function placePlant (p) {
    const i = p.slot
    const k = scale()
    const spacing = 58 * k
    const perRow = Math.max(4, Math.floor((W * 0.9) / spacing))
    const row = Math.floor(i / perRow)
    const j = i % perRow
    const off = (j % 2 ? 1 : -1) * Math.ceil(j / 2)
    p.row = row
    p.x = W / 2 + off * spacing + (row % 2 ? spacing / 2 : 0)
    p.base = groundY() + 8 + row * 16 * k
  }

  function plantTip (p) {
    const sway = Math.sin(now * 0.0012 + p.phase) * 6 * Math.min(1, p.h / 60)
    return { x: p.x + sway, y: p.base - p.h }
  }

  function sparkBurst (x, y, rgb, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const v = Math.random() * speed * scale()
      particles.push({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: rand(0.012, 0.03), rgb, size: rand(1.5, 4) })
    }
  }

  // ---------------------------------------------------------------- simulation
  function update (dt) {
    const t = now
    const k = scale()

    // Mood drifts back toward calm when nobody stirs it.
    mood.valenceTarget *= Math.pow(0.9993, dt)
    mood.valence = lerp(mood.valence, mood.valenceTarget, 0.02 * dt)
    mood.textEnergy *= Math.pow(0.996, dt)
    const voiceEnergy = audio.level * 6
    mood.energy = lerp(mood.energy, clamp(Math.max(mood.textEnergy, voiceEnergy), 0, 1), 0.05 * dt)
    mood.aurora = lerp(mood.aurora, 0.1 + Math.max(0, mood.valence) * 0.15, 0.004 * dt)
    mood.flash *= Math.pow(0.9, dt)

    SPEAKERS.forEach((S, i) => {
      const target = i === active ? 0.35 + audio.level * 10 : 0.06
      S.aura = lerp(S.aura, clamp(target, 0, 1.4), 0.12 * dt)
    })

    const silent = t - mood.lastSpeech > 7000

    // Spirits
    for (const s of sprites) {
      if (s.dead) continue
      const c = s.concept
      let tx, ty, spring
      if (c.fusing) {
        tx = c.fusing.x + (s.sp === 0 ? -1 : 1) * Math.max(0, 40 - (t - c.fusing.start) / 30)
        ty = c.fusing.y + Math.sin((t - c.fusing.start) * 0.01 + s.sp * 3.14) * 18
        spring = 0.012
      } else {
        const drift = silent ? 0.00018 : 0.0003
        tx = s.homeX + Math.sin(t * drift + s.phase) * 46 * k
        ty = s.homeY + Math.cos(t * drift * 1.3 + s.phase) * 32 * k
        spring = 0.0022
      }
      s.vx += (tx - s.x) * spring * dt
      s.vy += (ty - s.y) * spring * dt

      if (!c.fusing) {
        for (const o of sprites) {
          if (o === s || o.dead) continue
          const dx = s.x - o.x
          const dy = s.y - o.y
          const d2 = dx * dx + dy * dy
          const r = (s.size + o.size) * 0.75
          if (d2 < r * r && d2 > 0.01) {
            const d = Math.sqrt(d2)
            const f = ((r - d) / r) * 0.6 * dt
            s.vx += (dx / d) * f
            s.vy += (dy / d) * f
          }
        }
      }
      const damp = Math.pow(c.fusing ? 0.9 : 0.94, dt)
      s.vx *= damp
      s.vy *= damp
      s.x += s.vx * dt
      s.y += s.vy * dt

      const n = c.mentions[s.sp]
      const idle = t - s.last
      let target = (40 + 16 * Math.sqrt(n - 1)) * k
      if (idle > 45000 && !c.fusing) target *= 0.6
      s.size = lerp(s.size, Math.min(target, 120 * k) * s.pulse, 0.1 * dt)
      s.pulse = lerp(s.pulse, 1, 0.06 * dt)
      s.alpha = lerp(s.alpha, idle > 45000 && !c.fusing ? 0.55 : 1, 0.02 * dt)
      if (idle > 150000 && !c.fusing) retire(s)
    }

    // Fusions resolve when the two spirits meet.
    for (const c of concepts.values()) {
      if (!c.fusing) continue
      const [a, b] = c.sprites
      if (!a || !b) { c.fusing = null; continue }
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d < 26 * k || t - c.fusing.start > 4500) completeFusion(c)
    }
    sprites = sprites.filter(s => !s.dead)

    // Garden
    for (const p of plants) {
      p.h = lerp(p.h, p.target, 0.03 * dt)
      p.bloom = lerp(p.bloom, 1, 0.04 * dt)
      p.pulse = lerp(p.pulse, 1, 0.05 * dt)
    }

    // Memories float into the upper sky
    for (const m of memories) {
      m.x = lerp(m.x, m.tx, 0.01 * dt)
      m.y = lerp(m.y, m.ty, 0.01 * dt)
    }

    weather(dt)

    for (const p of particles) {
      switch (p.type) {
        case 'spark':
          p.x += p.vx * dt; p.y += p.vy * dt
          p.vx *= Math.pow(0.96, dt); p.vy = p.vy * Math.pow(0.96, dt) + 0.03 * dt
          break
        case 'ring':
          p.r += p.vr * dt; p.vr *= Math.pow(0.97, dt)
          break
        case 'rain':
          p.x += p.vx * dt; p.y += p.vy * dt
          if (p.y > groundY() + 10) {
            p.life = 0
            if (Math.random() < 0.3) particles.push({ type: 'spark', x: p.x, y: groundY() + rand(0, 20), vx: rand(-1, 1), vy: rand(-1.5, -0.5), life: 0.6, decay: 0.05, rgb: [170, 200, 255], size: 1.2 })
          }
          break
        case 'firefly':
          p.x += p.vx * dt + Math.sin(t * 0.003 + p.p) * 0.4
          p.y += p.vy * dt
          break
        case 'petal':
          p.x += p.vx * dt + Math.sin(t * 0.002 + p.p) * 0.8; p.y += p.vy * dt; p.rot += p.vr * dt
          if (p.y > groundY() + 30) p.life = 0
          break
        case 'seed':
          p.x = lerp(p.x, p.tx, 0.035 * dt)
          p.vy += 0.25 * dt
          p.y = Math.min(p.y + p.vy * dt, p.ty)
          if (Math.abs(p.y - p.ty) < 1 && Math.abs(p.x - p.tx) < 6) {
            p.life = 0
            plants.push(p.plant)
            p.plant.concept.plant = p.plant
            sparkBurst(p.tx, p.ty, [180, 255, 170], 24, 3)
          }
          break
      }
      p.life -= p.decay * dt
    }
    particles = particles.filter(p => p.life > 0 && p.y < H + 60 && p.x > -60 && p.x < W + 60)
    if (particles.length > 1600) particles.splice(0, particles.length - 1600)
  }

  function weather (dt) {
    const v = mood.valence
    const e = mood.energy
    const k = scale()
    // Rain when things turn heavy.
    const rain = clamp((-v - 0.22) * 1.6, 0, 1) * (0.4 + e)
    let n = rain * 5 * dt * (W / 1000)
    while (n > 0) {
      if (Math.random() < n) {
        particles.push({ type: 'rain', x: rand(-50, W), y: -10, vx: 2.2 + e * 3, vy: rand(13, 19) * k, life: 1, decay: 0, len: rand(10, 22) * k })
      }
      n -= 1
    }
    // Lightning when it's heavy and loud.
    if (v < -0.45 && Math.random() < 0.0025 * dt * (0.4 + e * 2)) {
      mood.flash = 0.7
      mood.bolt = makeBolt()
    }
    if (mood.bolt && now - mood.bolt.t > 220) mood.bolt = null

    // Fireflies when it's warm.
    const warm = clamp((v - 0.1) * 1.4, 0, 1)
    if (Math.random() < warm * 0.35 * dt) {
      particles.push({ type: 'firefly', x: rand(0, W), y: groundY() + rand(-10, 30), vx: rand(-0.3, 0.3), vy: rand(-0.9, -0.3), life: 1, decay: rand(0.002, 0.005), p: Math.random() * 6.28, rgb: [255, rand(200, 240), 120] })
    }
    // Petals when it's joyous.
    if (v > 0.55 && Math.random() < (v - 0.55) * 0.5 * dt) {
      particles.push({ type: 'petal', emoji: Math.random() < 0.7 ? '🌸' : '✨', x: rand(-40, W), y: -20, vx: rand(0.2, 1.2), vy: rand(0.6, 1.4), rot: 0, vr: rand(-0.03, 0.03), life: 1, decay: 0, p: Math.random() * 6.28, size: rand(12, 22) * k })
    }
  }

  function makeBolt () {
    const pts = []
    let x = rand(W * 0.15, W * 0.85)
    let y = 0
    while (y < groundY() * rand(0.6, 0.95)) {
      pts.push([x, y])
      x += rand(-40, 40)
      y += rand(20, 50)
    }
    pts.push([x, y])
    return { pts, t: now }
  }

  // ---------------------------------------------------------------- drawing
  const SKY = {
    storm: [[8, 10, 24], [36, 42, 64]],
    dusk: [[12, 9, 40], [70, 34, 92]],
    dawn: [[32, 22, 82], [246, 146, 98]]
  }

  function draw () {
    const t = now
    const v = mood.valence
    const k = scale()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    // Sky
    let top, bot
    if (v < 0) {
      top = mix(SKY.dusk[0], SKY.storm[0], -v)
      bot = mix(SKY.dusk[1], SKY.storm[1], -v)
    } else {
      top = mix(SKY.dusk[0], SKY.dawn[0], v)
      bot = mix(SKY.dusk[1], SKY.dawn[1], v)
    }
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, rgba(top, 1))
    g.addColorStop(0.85, rgba(bot, 1))
    g.addColorStop(1, rgba(mix(bot, [0, 0, 0], 0.5), 1))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    drawPainting()

    // Stars: brighter at night and in silence
    const silent = t - mood.lastSpeech > 7000
    const starA = clamp(0.85 - Math.max(0, v) * 0.75, 0.1, 1) * (silent ? 1 : 0.75)
    ctx.fillStyle = '#fff'
    for (const s of stars) {
      ctx.globalAlpha = starA * (0.45 + 0.55 * Math.sin(t * 0.001 * s.s + s.p))
      ctx.fillRect(s.x, s.y, s.r, s.r)
    }

    ctx.globalCompositeOperation = 'lighter'
    drawAurora(t)

    // Speaker auras glowing from each edge
    SPEAKERS.forEach(S => {
      const x = S.side < 0 ? 0 : W
      const r = H * (0.5 + S.aura * 0.35)
      drawGlow(S.rgb, x, H * 0.48, r, 0.25 + S.aura * 0.35)
    })

    // Memories (faded stars of things once said)
    for (const m of memories) {
      const tw = 0.6 + 0.4 * Math.sin(t * 0.0015 + m.p)
      drawGlow(m.rgb, m.x, m.y, 14 * k, 0.35 * tw)
    }
    ctx.globalCompositeOperation = 'source-over'
    for (const m of memories) drawEmoji(m.emoji, m.x, m.y, 15 * k, 0.4)

    // Constellations: each speaker's train of thought
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineWidth = 1.2
    ctx.setLineDash([2, 7])
    ctx.lineDashOffset = -t * 0.02
    SPEAKERS.forEach((S, sp) => {
      ctx.strokeStyle = rgba(S.rgb, 0.35)
      ctx.globalAlpha = 1
      ctx.beginPath()
      let prev = null
      for (const e of S.trail) {
        const c = concepts.get(e)
        const s = c && c.sprites[sp]
        if (!s) { prev = null; continue }
        if (prev) { ctx.moveTo(prev.x, prev.y); ctx.lineTo(s.x, s.y) }
        prev = s
      }
      ctx.stroke()
    })
    ctx.setLineDash([])

    // Fusion threads
    for (const c of concepts.values()) {
      if (!c.fusing) continue
      const [a, b] = c.sprites
      if (!a || !b) continue
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
      grad.addColorStop(0, rgba(SPEAKERS[0].rgb, 0.9))
      grad.addColorStop(1, rgba(SPEAKERS[1].rgb, 0.9))
      ctx.strokeStyle = grad
      ctx.lineWidth = 2.5
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.02)
      ctx.beginPath()
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2 - 30
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo(mx, my, b.x, b.y)
      ctx.stroke()
      drawGlow([255, 245, 220], c.fusing.x, c.fusing.y, 50 * k, 0.25 + 0.15 * Math.sin(t * 0.015))
    }

    // Spirit glows
    for (const s of sprites) {
      const rgb = SPEAKERS[s.sp].rgb
      drawGlow(rgb, s.x, s.y, s.size * (1.1 + (s.pulse - 1) * 1.5), 0.55 * s.alpha)
    }
    ctx.globalCompositeOperation = 'source-over'

    // Spirits
    for (const s of sprites) {
      const bob = Math.sin(t * 0.002 + s.phase) * 3
      const tilt = Math.sin(t * 0.0013 + s.phase) * 0.12
      drawEmoji(s.emoji, s.x, s.y + bob, s.size, s.alpha, tilt)
    }

    drawGround(t)
    drawGarden(t)
    drawParticles(t)
    drawSpeakers(t)

    // Lightning
    if (mood.bolt) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 1 - (t - mood.bolt.t) / 220
      ctx.strokeStyle = 'rgba(220,230,255,0.95)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      mood.bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
    }
    if (mood.flash > 0.01) {
      ctx.globalAlpha = mood.flash * 0.5
      ctx.fillStyle = '#eef2ff'
      ctx.fillRect(0, 0, W, H)
    }
    ctx.globalAlpha = 1
  }

  function drawAurora (t) {
    const a = mood.aurora
    if (a < 0.02) return
    const c1 = SPEAKERS[0].rgb
    const c2 = SPEAKERS[1].rgb
    for (let band = 0; band < 3; band++) {
      const base = H * (0.12 + band * 0.07)
      const col = band === 1 ? [140, 255, 190] : band === 0 ? c2 : c1
      const grad = ctx.createLinearGradient(0, base - 90, 0, base + 60)
      grad.addColorStop(0, rgba(col, 0))
      grad.addColorStop(0.6, rgba(col, 0.22 * a))
      grad.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = grad
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.moveTo(0, base + 60)
      for (let x = 0; x <= W + 20; x += 20) {
        const y = base + Math.sin(x * 0.004 + t * 0.00035 + band * 2) * 34 + Math.sin(x * 0.011 - t * 0.0006 + band) * 14
        ctx.lineTo(x, y - 70)
      }
      ctx.lineTo(W, base + 60)
      ctx.closePath()
      ctx.fill()
    }
  }

  function drawGround (t) {
    const gy = groundY()
    const v = mood.valence
    const far = mix([22, 16, 46], [60, 40, 70], Math.max(0, v))
    const near = mix([10, 8, 22], [34, 22, 40], Math.max(0, v))
    ;[[far, 0.0035, 18, -22], [near, 0.006, 10, 0]].forEach(([col, f, amp, lift]) => {
      ctx.globalAlpha = 1
      ctx.fillStyle = rgba(col, 1)
      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let x = 0; x <= W + 20; x += 20) {
        ctx.lineTo(x, gy + lift + Math.sin(x * f + 1.3) * amp + Math.sin(x * f * 2.7) * amp * 0.4)
      }
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fill()
    })
  }

  function drawGarden (t) {
    const k = scale()
    const sorted = plants.slice().sort((a, b) => a.row - b.row)
    for (const p of sorted) {
      const tip = plantTip(p)
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(120,220,140,0.85)'
      ctx.lineWidth = 2.5 * k
      ctx.beginPath()
      ctx.moveTo(p.x, p.base)
      ctx.quadraticCurveTo(p.x - 6, p.base - p.h * 0.5, tip.x, tip.y)
      ctx.stroke()
      // leaves
      ctx.fillStyle = 'rgba(110,210,130,0.85)'
      for (let i = 1; i <= 2; i++) {
        const ly = p.base - p.h * (0.3 * i)
        const dir = i % 2 ? 1 : -1
        ctx.beginPath()
        ctx.ellipse(p.x + dir * 7 * k, ly, 8 * k * Math.min(1, p.h / 40), 3.2 * k, dir * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
      const size = (34 + Math.min(30, p.h * 0.12)) * k * p.bloom * p.pulse
      ctx.globalCompositeOperation = 'lighter'
      drawGlow(mix(SPEAKERS[0].rgb, SPEAKERS[1].rgb, 0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)), tip.x, tip.y, size * 1.2, 0.5)
      ctx.globalCompositeOperation = 'source-over'
      drawEmoji(p.emoji, tip.x, tip.y, size, 1)
    }
  }

  function drawParticles (t) {
    const k = scale()
    ctx.globalCompositeOperation = 'lighter'
    for (const p of particles) {
      const a = clamp(p.life, 0, 1)
      switch (p.type) {
        case 'spark':
          drawGlow(p.rgb, p.x, p.y, p.size * 3, a)
          break
        case 'ring':
          ctx.globalAlpha = a
          ctx.strokeStyle = rgba(p.rgb, 0.9)
          ctx.lineWidth = p.w
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.stroke()
          break
        case 'rain':
          ctx.globalAlpha = 0.5
          ctx.strokeStyle = 'rgba(160,190,255,0.8)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x - p.vx * 1.2, p.y - p.len)
          ctx.stroke()
          break
        case 'firefly':
          drawGlow(p.rgb, p.x, p.y, 9 * k, a * (0.5 + 0.5 * Math.sin(t * 0.006 + p.p)))
          break
        case 'seed':
          drawGlow([255, 250, 220], p.x, p.y, 34 * k, 0.8)
          break
      }
    }
    ctx.globalCompositeOperation = 'source-over'
    for (const p of particles) {
      if (p.type === 'petal') drawEmoji(p.emoji, p.x, p.y, p.size, 0.85, p.rot)
      if (p.type === 'seed') drawEmoji(p.emoji, p.x, p.y, 26 * k, 1, now * 0.01)
    }
  }

  function drawSpeakers (t) {
    const k = scale()
    SPEAKERS.forEach((S, i) => {
      const x = S.side < 0 ? 44 * k : W - 44 * k
      const y = H - 46 * k
      const on = i === active
      const size = (on ? 44 : 28) * k * (1 + (on ? audio.level * 4 : 0))
      ctx.globalCompositeOperation = 'lighter'
      drawGlow(S.rgb, x, y, size * (on ? 1.8 : 1.1), on ? 0.9 : 0.3)
      ctx.globalCompositeOperation = 'source-over'
      drawEmoji(S.glyph, x, y, size, on ? 1 : 0.45)
    })
  }

  // ---------------------------------------------------------------- AI painter (opt-in)
  const paint = { enabled: false, cur: null, next: null, fade: 0, last: -1e9, loading: false, tainted: false }
  let paintDirty = false

  function paintPrompt () {
    const top = [...concepts.values()]
      .sort((a, b) => (b.mentions[0] + b.mentions[1] + (b.plant ? 3 : 0)) - (a.mentions[0] + a.mentions[1] + (a.plant ? 3 : 0)) || b.last - a.last)
      .slice(0, 6)
      .map(c => c.word)
    if (!top.length) return null
    const v = mood.valence
    const feeling = v < -0.3 ? 'stormy night, rain, deep indigo shadows' : v > 0.3 ? 'golden dawn light, warm glow, blossoms' : 'violet twilight, soft mist'
    return `ethereal dreamlike painting of ${top.join(', ')}, ${feeling}, luminous, magical, surreal, soft brush strokes, no people, no faces, no text`
  }

  function maybePaint () {
    if (!paint.enabled || paint.loading || !paintDirty || now - paint.last < 14000) return
    const prompt = paintPrompt()
    if (!prompt) return
    paintDirty = false
    paint.loading = true
    paint.last = now
    const w = Math.min(1280, Math.round(W))
    const h = Math.min(1280, Math.round(H))
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${(Math.random() * 1e6) | 0}`
    const load = (cors) => {
      const img = new Image()
      if (cors) img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (!cors) paint.tainted = true
        paint.next = img
        paint.fade = 0
        paint.loading = false
      }
      img.onerror = () => {
        if (cors) return load(false)
        paint.loading = false
      }
      img.src = url
    }
    load(true)
  }

  function drawPainting () {
    if (paint.next) {
      paint.fade = Math.min(1, paint.fade + 0.006)
      if (paint.fade >= 1) { paint.cur = paint.next; paint.next = null }
    }
    const blit = (img, a) => {
      if (!img || a <= 0) return
      const s = Math.max(W / img.width, H / img.height)
      const iw = img.width * s
      const ih = img.height * s
      const drift = Math.sin(now * 0.00005) * 20
      ctx.globalAlpha = a
      ctx.drawImage(img, (W - iw) / 2 + drift, (H - ih) / 2, iw, ih)
    }
    const A = 0.55
    blit(paint.cur, A * (paint.next ? 1 - paint.fade : 1))
    blit(paint.next, A * paint.fade)
    ctx.globalAlpha = 1
  }

  // ---------------------------------------------------------------- the voice: loudness and pitch
  const audio = { ctx: null, analyser: null, buf: null, level: 0, auto: false, pitches: [], recent: [], split: 0, votes: 0, frame: 0 }

  async function startAudio () {
    if (audio.ctx) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)()
      const src = audio.ctx.createMediaStreamSource(stream)
      audio.analyser = audio.ctx.createAnalyser()
      audio.analyser.fftSize = 2048
      audio.buf = new Float32Array(audio.analyser.fftSize)
      src.connect(audio.analyser)
      return true
    } catch (e) {
      console.warn('No microphone level available', e)
      audio.ctx = null
      return false
    }
  }

  function sampleAudio () {
    if (!audio.analyser) { audio.level = lerp(audio.level, 0, 0.1); return }
    audio.analyser.getFloatTimeDomainData(audio.buf)
    let sum = 0
    for (let i = 0; i < audio.buf.length; i++) sum += audio.buf[i] * audio.buf[i]
    const rms = Math.sqrt(sum / audio.buf.length)
    audio.level = lerp(audio.level, rms, 0.3)
    if (rms > 0.01) mood.lastSpeech = now
    if (!audio.auto || rms < 0.015 || (audio.frame++ % 2)) return
    const f0 = pitch(audio.buf, audio.ctx.sampleRate)
    if (f0) autoSpeaker(f0)
  }

  // Autocorrelation pitch estimate over the human voice range.
  function pitch (buf, sr) {
    const n = 1024
    const minLag = Math.floor(sr / 400)
    const maxLag = Math.floor(sr / 70)
    let best = 0
    let bestLag = 0
    let energy = 0
    for (let i = 0; i < n; i++) energy += buf[i] * buf[i]
    if (!energy) return 0
    for (let lag = minLag; lag <= maxLag; lag++) {
      let c = 0
      for (let i = 0; i < n; i++) c += buf[i] * buf[i + lag]
      if (c > best) { best = c; bestLag = lag }
    }
    return best / energy > 0.55 && bestLag ? sr / bestLag : 0
  }

  // Two voices usually sit at different pitches: split recent pitches into two
  // clusters and pass the voice to whichever cluster is speaking now.
  function autoSpeaker (f0) {
    audio.pitches.push(f0)
    if (audio.pitches.length > 500) audio.pitches.shift()
    audio.recent.push(f0)
    if (audio.recent.length > 10) audio.recent.shift()
    if (audio.pitches.length < 80) return
    if (audio.frame % 30 === 0) {
      const s = audio.pitches.slice().sort((a, b) => a - b)
      let bestCost = Infinity
      let split = 0
      let lo = 0, hi = 0
      for (let i = Math.floor(s.length * 0.15); i < s.length * 0.85; i += 2) {
        const a = s.slice(0, i)
        const b = s.slice(i)
        const ma = a.reduce((x, y) => x + y, 0) / a.length
        const mb = b.reduce((x, y) => x + y, 0) / b.length
        const cost = a.reduce((x, y) => x + (y - ma) ** 2, 0) + b.reduce((x, y) => x + (y - mb) ** 2, 0)
        if (cost < bestCost) { bestCost = cost; split = s[i]; lo = ma; hi = mb }
      }
      audio.split = hi - lo > 35 ? split : 0
    }
    if (!audio.split) return
    const r = audio.recent.slice().sort((a, b) => a - b)
    const med = r[r.length >> 1]
    const want = med >= audio.split ? 0 : 1
    if (want !== active) {
      audio.votes++
      if (audio.votes > 6) { setActive(want); audio.votes = 0 }
    } else {
      audio.votes = 0
    }
  }

  // ---------------------------------------------------------------- listening
  const rec = { r: null, on: false }
  function setupRecognition () {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return false
    rec.r = new SR()
    rec.r.continuous = true
    rec.r.interimResults = true
    rec.r.lang = navigator.language || 'en-US'
    rec.r.onresult = (ev) => {
      let interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const txt = ev.results[i][0].transcript
        if (ev.results[i].isFinal) hear(txt, true)
        else interim += txt
      }
      if (interim) hear(interim, false)
    }
    rec.r.onend = () => { if (rec.on) try { rec.r.start() } catch (e) {} }
    rec.r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        rec.on = false
        micBlocked()
        syncUI()
      }
    }
    return true
  }

  function micBlocked () {
    const framed = window.self !== window.top
    ui.toast(framed
      ? 'The microphone is blocked inside this frame. Download the file and open it in Chrome, or type below.'
      : 'Chrome blocked the microphone. Click the 🔒 next to the address, allow Microphone, and reload. Or type below.', 9000)
    openTyping()
  }

  function toggleListening () {
    if (!rec.r && !setupRecognition()) {
      ui.toast('Speech recognition needs Google Chrome. You can type instead.', 7000)
      openTyping()
      return
    }
    rec.on = !rec.on
    if (rec.on) {
      stopDemo()
      startAudio().then(ok => { if (ok === false && rec.on) { rec.on = false; try { rec.r.stop() } catch (e) {} micBlocked(); syncUI() } })
      try { rec.r.start() } catch (e) {}
    } else {
      rec.r.stop()
    }
    syncUI()
  }

  function setActive (i) {
    if (i === active) return
    active = i
    utteranceSeen = new Set()
    const S = SPEAKERS[i]
    sparkBurst(S.side < 0 ? 44 * scale() : W - 44 * scale(), H - 46 * scale(), S.rgb, 20, 3)
    syncUI()
  }

  // ---------------------------------------------------------------- demo: a dream to watch
  const SCRIPT = [
    [0, 'I had the strangest dream last night about the ocean and a tiny boat made of paper'],
    [1, 'A paper boat? I love that. Were there stars? I always dream about stars over the ocean'],
    [0, 'Yes so many stars, and a whale singing right under the boat'],
    [1, 'A whale! Okay we have to go to the ocean this summer, just pack the car and drive'],
    [0, "I want to, but honestly money is so tight and work has been a nightmare. I'm exhausted and angry all the time"],
    [1, 'I know. I hate that the job takes everything from you. It feels like a storm that never stops'],
    [0, "It is a storm. Bills, deadlines, the broken phone, and I can't sleep. It's awful"],
    [1, "Hey. We don't need money to be happy. We could take the train to the beach with the dog and a picnic"],
    [0, 'The dog would go crazy on the beach. Okay, that actually sounds wonderful'],
    [1, "Bring your guitar, I'll make sandwiches and strawberries and coffee"],
    [0, 'Coffee and music at sunrise by the ocean. Remember the first sunrise we watched together?'],
    [1, 'Of course. You played guitar and the dog stole my sandwich. I was so happy'],
    [0, "Let's do it. Saturday. Train, beach, dog, music. I feel lighter already. I love you"],
    [1, 'I love you too. Now tell me more about that whale and the stars']
  ]
  const demo = { timer: null, line: 0, word: 0, running: false }

  function startDemo () {
    if (rec.on) toggleListening()
    resetDream()
    demo.running = true
    demo.line = 0
    demo.word = 0
    stepDemo()
    syncUI()
  }
  function stopDemo () {
    demo.running = false
    clearTimeout(demo.timer)
    syncUI()
  }
  function stepDemo () {
    if (!demo.running) return
    if (demo.line >= SCRIPT.length) { stopDemo(); return }
    const [sp, text] = SCRIPT[demo.line]
    const words = text.split(' ')
    setActive(sp)
    demo.word++
    audio.level = 0.03 + Math.random() * 0.03
    if (demo.word < words.length) {
      hear(words.slice(0, demo.word).join(' '), false, sp)
      demo.timer = setTimeout(stepDemo, rand(150, 240))
    } else {
      hear(text, true, sp)
      demo.line++
      demo.word = 0
      demo.timer = setTimeout(stepDemo, 1300)
    }
  }

  function resetDream () {
    concepts.clear()
    sprites = []
    particles = []
    plants.length = 0
    plantSlots = 0
    memories.length = 0
    SPEAKERS.forEach(S => { S.trail = [] })
    Object.assign(mood, { valence: 0, valenceTarget: 0, energy: 0, textEnergy: 0, aurora: 0.12, flash: 0, bolt: null })
    paint.cur = paint.next = null
    paintDirty = false
    utteranceSeen = new Set()
  }

  function keepDream () {
    try {
      canvas.toBlob(b => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(b)
        a.download = `dream-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      })
    } catch (e) {
      ui.toast('The AI painting blocks saving this frame')
    }
  }

  // ---------------------------------------------------------------- UI
  const ui = {
    intro: document.getElementById('intro'),
    listen: document.getElementById('btn-listen'),
    speaker: document.getElementById('btn-speaker'),
    auto: document.getElementById('btn-auto'),
    paint: document.getElementById('btn-paint'),
    demo: document.getElementById('btn-demo'),
    keep: document.getElementById('btn-keep'),
    toastEl: document.getElementById('toast'),
    type: document.getElementById('btn-type'),
    typeForm: document.getElementById('type-form'),
    typeInput: document.getElementById('type-input'),
    toast (msg, ms) {
      this.toastEl.textContent = msg
      this.toastEl.classList.add('show')
      clearTimeout(this.toastT)
      this.toastT = setTimeout(() => this.toastEl.classList.remove('show'), ms || 2600)
    }
  }

  // Typing: a fallback for places the microphone can't reach.
  function openTyping () {
    ui.typeForm.classList.add('open')
    ui.type.classList.add('on')
    ui.typeInput.focus()
  }
  function closeTyping () {
    ui.typeForm.classList.remove('open')
    ui.type.classList.remove('on')
  }
  ui.type.onclick = () => { hideIntro(); ui.typeForm.classList.contains('open') ? closeTyping() : openTyping() }
  ui.typeForm.onsubmit = (e) => {
    e.preventDefault()
    const text = ui.typeInput.value.trim()
    if (!text) return
    stopDemo()
    hear(text, true)
    ui.typeInput.value = ''
    setActive(1 - active) // conversations alternate: pass the voice
  }
  ui.typeInput.addEventListener('keydown', e => e.stopPropagation())

  function syncUI () {
    ui.listen.classList.toggle('on', rec.on)
    ui.listen.setAttribute('aria-pressed', rec.on)
    ui.speaker.textContent = SPEAKERS[active].glyph
    ui.typeInput.placeholder = `${SPEAKERS[active].glyph}  type what was said, press Enter`
    ui.auto.classList.toggle('on', audio.auto)
    ui.auto.setAttribute('aria-pressed', audio.auto)
    ui.paint.classList.toggle('on', paint.enabled)
    ui.paint.setAttribute('aria-pressed', paint.enabled)
    ui.demo.classList.toggle('on', demo.running)
    ui.demo.textContent = demo.running ? '⏹' : '▶'
  }

  function hideIntro () { ui.intro.classList.add('gone') }

  document.getElementById('intro-listen').onclick = () => { hideIntro(); toggleListening() }
  document.getElementById('intro-demo').onclick = () => { hideIntro(); startDemo() }
  ui.listen.onclick = () => { hideIntro(); toggleListening() }
  ui.speaker.onclick = () => setActive(1 - active)
  ui.auto.onclick = () => {
    audio.auto = !audio.auto
    if (audio.auto) startAudio()
    ui.toast(audio.auto ? 'Listening for two different voices…' : 'Tap a side or press space to pass the voice')
    syncUI()
  }
  ui.paint.onclick = () => {
    paint.enabled = !paint.enabled
    if (paint.enabled) {
      paintDirty = true
      paint.last = -1e9
      ui.toast('The dream will be painted by pollinations.ai (keywords are sent there)')
    }
    syncUI()
  }
  ui.demo.onclick = () => { hideIntro(); demo.running ? stopDemo() : startDemo() }
  ui.keep.onclick = keepDream

  canvas.addEventListener('pointerdown', (e) => {
    setActive(e.clientX < W / 2 ? 0 : 1)
  })
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); setActive(1 - active) }
    if (e.key === 'ArrowLeft') setActive(0)
    if (e.key === 'ArrowRight') setActive(1)
  })
  window.addEventListener('resize', resize)

  // ---------------------------------------------------------------- loop
  let lastFrame = performance.now()
  function frame (t) {
    now = t
    const dt = clamp((t - lastFrame) / 16.67, 0.1, 3)
    lastFrame = t
    sampleAudio()
    update(dt)
    maybePaint()
    draw()
    requestAnimationFrame(frame)
  }

  resize()
  syncUI()
  requestAnimationFrame(frame)

  // Handy for tinkering from the console: dream.hear('a whale in the sky', true, 1)
  window.dream = { hear, setActive, startDemo, stopDemo, reset: resetDream, mood, concepts }
})()
