(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = (selector) => document.querySelector(selector);
  const screen = $('#screen');
  const playButton = $('#playButton');
  const keys = new Set();
  const W = canvas.width, H = canvas.height;
  const bestKey = 'lecture-intruder-best';
  let state = 'ready', score = 0, lives = 3, timeLeft = 45, last = 0;
  let player, snacks = [], particles = [], warning = null, slapCooldown = 0;
  let soundOn = true, audio;
  let tick = 0;
  const desks = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 7; col++) desks.push({ x: 105 + col * 126 + (row % 2) * 15, y: 194 + row * 86, shade: (row + col) % 2 });
  const bestScore = () => Number(localStorage.getItem(bestKey) || 0);
  $('#best').textContent = String(bestScore()).padStart(3, '0');

  function start() {
    score = 0; lives = 3; timeLeft = 45; tick = 0; snacks = []; particles = []; warning = null; slapCooldown = 0;
    player = { x: W / 2, y: H - 80, r: 10, invuln: 0, vx: 0, vy: 0 };
    updateHud(); state = 'playing'; screen.classList.add('hidden'); last = performance.now(); requestAnimationFrame(loop); beep(520, .08);
  }
  function updateHud() { $('#score').textContent = String(score).padStart(3, '0'); $('#time').textContent = String(Math.ceil(timeLeft)).padStart(2, '0'); $('#lives').textContent = '♥'.repeat(lives) + '♡'.repeat(3 - lives); }
  function finish(won) {
    state = 'over';
    if (score > bestScore()) { localStorage.setItem(bestKey, score); $('#best').textContent = String(score).padStart(3, '0'); }
    $('#screenKicker').textContent = won ? '강의 종료 · 생존 성공' : '출석 체크 · 퇴장 조치';
    $('#screenTitle').innerHTML = won ? '강의실<br /><span>탈출!</span>' : '파리채에<br /><span>당했다!</span>';
    $('#screenCopy').innerHTML = `최종 점수 <b>${String(score).padStart(3, '0')}점</b><br />${won ? '이 정도면 명예 수강생!' : '다음엔 더 잽싸게 날아봐.'}`;
    playButton.innerHTML = '한 번 더 난입하기 <span>↗</span>';
    screen.classList.remove('hidden'); beep(won ? 760 : 180, .22);
  }
  function beep(freq, duration) {
    if (!soundOn) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = 'square'; osc.frequency.value = freq; gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration); } catch (_) { /* Audio unavailable */ }
  }
  function spawnSnack() { const types = ['🍪', '🍬', '🍿', '🧀']; snacks.push({ x: 55 + Math.random() * (W - 110), y: 114 + Math.random() * (H - 168), r: 11, life: 8, glyph: types[Math.floor(Math.random() * types.length)], phase: Math.random() * 6 }); }
  function pop(x, y, color) { for (let i = 0; i < 9; i++) particles.push({ x, y, vx: (Math.random() - .5) * 150, vy: (Math.random() - .8) * 140, life: .5, color }); }
  function update(dt) {
    tick += dt; timeLeft = Math.max(0, timeLeft - dt); slapCooldown -= dt;
    if (timeLeft === 0) { updateHud(); finish(true); return; }
    if (Math.random() < dt * 1.05 && snacks.length < 5) spawnSnack();
    const speed = 245, dx = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0), dy = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
    const norm = Math.hypot(dx, dy) || 1; player.x = Math.max(22, Math.min(W - 22, player.x + dx / norm * speed * dt)); player.y = Math.max(142, Math.min(H - 27, player.y + dy / norm * speed * dt));
    player.invuln = Math.max(0, player.invuln - dt);
    // Professor raises a hand, telegraphs the strike, then slaps the marked desk zone.
    if (!warning && slapCooldown <= 0 && Math.random() < dt * .22) warning = { x: 105 + Math.floor(Math.random() * 7) * 126, y: 215 + Math.floor(Math.random() * 4) * 86, r: 64, t: 1.35 };
    if (warning) {
      warning.t -= dt;
      if (warning.t <= 0) {
        const hit = Math.hypot(player.x - warning.x, player.y - warning.y) < warning.r * .77;
        pop(warning.x, warning.y, '#ff7356'); if (hit && player.invuln <= 0) { lives--; player.invuln = 1.25; pop(player.x, player.y, '#ffffff'); beep(140, .15); if (!lives) { updateHud(); finish(false); return; } }
        else beep(90, .12);
        warning = null; slapCooldown = 1.1;
      }
    }
    snacks = snacks.filter(s => { s.life -= dt; s.phase += dt * 3; if (Math.hypot(player.x - s.x, player.y - s.y) < 23) { score += 10; pop(s.x, s.y, '#d4fa54'); beep(740 + Math.random() * 250, .07); return false; } return s.life > 0; });
    particles = particles.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; return p.life > 0; });
    updateHud();
  }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function drawRoom() {
    rect(0, 0, W, H, '#293536'); rect(0, 0, W, 119, '#374347');
    // chalkboard, lesson notes and classroom trim
    rect(36, 18, 655, 76, '#21302f'); rect(43, 25, 641, 62, '#29403a');
    ctx.fillStyle = '#a7b29a'; ctx.font = '12px monospace'; ctx.fillText('오늘의 강의 : 곤충의 생존 전략', 65, 51); ctx.font = '8px monospace'; ctx.fillText('생존의 제 1원칙 — 들키지 말 것', 65, 70);
    rect(718, 18, 206, 76, '#d4c796'); rect(727, 26, 188, 59, '#f0dfa7');
    // professor at the lectern
    rect(797, 37, 25, 28, '#ca8761'); rect(793, 31, 33, 12, '#373333'); rect(791, 62, 38, 23, '#4b5960'); rect(776, 77, 69, 10, '#886a48');
    rect(0, 112, W, 10, '#bc9d64'); rect(0, 122, W, 7, '#8b704c');
    rect(0, 130, W, H - 130, '#554b3c');
    // tiled floor
    for (let y = 136; y < H; y += 52) { rect(0, y, W, 1, '#78664c'); for (let x = (y % 104 ? 50 : 0); x < W; x += 100) rect(x, y, 1, 52, '#78664c'); }
    // student silhouettes and desks
    desks.forEach((d, i) => {
      const body = d.shade ? '#56646a' : '#687274';
      rect(d.x + 20, d.y - 24, 35, 31, '#d6ad88'); rect(d.x + 17, d.y - 28, 41, 12, i % 4 === 0 ? '#b87952' : '#413d3b');
      rect(d.x + 11, d.y + 4, 54, 9, '#9b754b'); rect(d.x + 15, d.y + 13, 5, 22, '#574735'); rect(d.x + 57, d.y + 13, 5, 22, '#574735');
      rect(d.x + 19, d.y - 1, 39, 7, body); rect(d.x + 2, d.y + 8, 11, 29, '#716049');
    });
    // lectern lower edge
    rect(762, 104, 111, 19, '#886a48'); rect(774, 123, 87, 13, '#554631');
  }
  function draw() {
    ctx.clearRect(0, 0, W, H); drawRoom();
    if (warning) {
      const pulse = .24 + Math.sin(tick * 22) * .11;
      ctx.globalAlpha = pulse; ctx.fillStyle = '#ff4e42'; ctx.beginPath(); ctx.ellipse(warning.x, warning.y, warning.r, warning.r * .55, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ff644e'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(warning.x, warning.y, warning.r * (1.3 - warning.t * .25), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      if (warning.t < .4) { ctx.fillStyle = '#fff0df'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillText('위험!', warning.x, warning.y - 48); ctx.textAlign = 'left'; }
    }
    snacks.forEach(s => { ctx.font = '19px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.glyph, s.x, s.y + Math.sin(s.phase) * 3); ctx.textAlign = 'left'; });
    particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life * 2); rect(p.x, p.y, 4, 4, p.color); }); ctx.globalAlpha = 1;
    if (player && (player.invuln <= 0 || Math.floor(tick * 14) % 2 === 0)) {
      // tiny pixel fly with translucent wings
      ctx.fillStyle = '#d4fa54'; ctx.beginPath(); ctx.ellipse(player.x, player.y, 7, 4, -.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dfffff'; ctx.beginPath(); ctx.ellipse(player.x - 4, player.y - 6, 5, 2.5, -.55, 0, Math.PI * 2); ctx.ellipse(player.x + 4, player.y - 6, 5, 2.5, .55, 0, Math.PI * 2); ctx.fill();
      rect(player.x + 5, player.y - 2, 3, 3, '#182120');
      ctx.fillStyle = '#f3f0e8'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText('YOU', player.x, player.y - 15); ctx.textAlign = 'left';
    }
  }
  function loop(now) { if (state !== 'playing') return; const dt = Math.min((now - last) / 1000, .04); last = now; update(dt); draw(); if (state === 'playing') requestAnimationFrame(loop); }
  const keyMap = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', w: 'w', a: 'a', s: 's', d: 'd' };
  window.addEventListener('keydown', e => { const key = keyMap[e.key] || keyMap[e.key.toLowerCase()]; if (key) { keys.add(key); e.preventDefault(); } if (e.key === 'Enter' && state !== 'playing') start(); });
  window.addEventListener('keyup', e => { keys.delete(keyMap[e.key] || keyMap[e.key.toLowerCase()]); });
  document.querySelectorAll('[data-dir]').forEach(button => {
    const dir = button.dataset.dir, names = { up: ['ArrowUp', 'w'], down: ['ArrowDown', 's'], left: ['ArrowLeft', 'a'], right: ['ArrowRight', 'd'] };
    const press = e => { e.preventDefault(); names[dir].forEach(k => keys.add(k)); }, release = e => { e.preventDefault(); names[dir].forEach(k => keys.delete(k)); };
    button.addEventListener('pointerdown', press); ['pointerup', 'pointerleave', 'pointercancel'].forEach(event => button.addEventListener(event, release));
  });
  playButton.addEventListener('click', start);
  $('#soundButton').addEventListener('click', () => { soundOn = !soundOn; $('#soundLabel').textContent = soundOn ? '사운드 ON' : '사운드 OFF'; $('#soundButton').setAttribute('aria-label', soundOn ? '사운드 끄기' : '사운드 켜기'); if (soundOn) beep(600, .08); });
  draw();
})();
