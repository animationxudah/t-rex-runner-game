import { Runner } from './resources/dino_game/offline.js';
Runner.prototype.loadSounds = function noopLoadSounds() {};

const STORAGE_KEY = 'dino-legends-save-v2';
const ENDING_SCORE = 40000000;
const FLIGHT_UNLOCK_SCORE = 250000;
const SKIN_ROLL_MIN_SCORE = 1000;
const HAZARDS = [
  { src: 'images/hazards/rock.svg', cls: '', w: 52, h: 34 },
  { src: 'images/hazards/spike.svg', cls: '', w: 60, h: 30 },
  { src: 'images/hazards/fire.svg', cls: '', w: 48, h: 40 },
  { src: 'images/hazards/drone.svg', cls: 'air', w: 66, h: 36 }
];

const SKINS = [
  {name:'Desert Scout', rarity:'Common', filter:'none', icon:'🦖', theme:['#dbeafe','#8b5a2b'], preview:'images/skins/skin-1.svg', gear:'bandana'},
  {name:'Mint Dash', rarity:'Common', filter:'hue-rotate(45deg)', icon:'🌿', theme:['#d1fae5','#10b981'], preview:'images/skins/skin-2.svg', gear:'visor'},
  {name:'Crimson Fang', rarity:'Uncommon', filter:'hue-rotate(140deg)', icon:'🔥', theme:['#fecaca','#dc2626'], preview:'images/skins/skin-3.svg', gear:'armor'},
  {name:'Night Byte', rarity:'Uncommon', filter:'invert(1)', icon:'🌙', theme:['#cbd5e1','#334155'], preview:'images/skins/skin-4.svg', gear:'cloak'},
  {name:'Neon Pop', rarity:'Rare', filter:'saturate(2) hue-rotate(220deg)', icon:'⚡', theme:['#e9d5ff','#7c3aed'], preview:'images/skins/skin-5.svg', gear:'jetpack'},
  {name:'Amber Volt', rarity:'Rare', filter:'sepia(1) saturate(2)', icon:'🌞', theme:['#fde68a','#f59e0b'], preview:'images/skins/skin-6.svg', gear:'crown'},
  {name:'Aqua Storm', rarity:'Epic', filter:'hue-rotate(280deg) saturate(1.7)', icon:'🌊', theme:['#bfdbfe','#2563eb'], preview:'images/skins/skin-7.svg', gear:'scarf'},
  {name:'Void Walker', rarity:'Epic', filter:'contrast(1.4) brightness(.8)', icon:'🕳️', theme:['#d1d5db','#111827'], preview:'images/skins/skin-8.svg', gear:'shadow'},
  {name:'Prism Nova', rarity:'Legendary', filter:'contrast(1.2) saturate(3)', icon:'💎', theme:['#ddd6fe','#4f46e5'], preview:'images/skins/skin-9.svg', gear:'halo'},
  {name:'Silver Lunar', rarity:'Legendary', filter:'grayscale(1) brightness(1.3)', icon:'🌕', theme:['#f3f4f6','#6b7280'], preview:'images/skins/skin-10.svg', gear:'suit'},
  {name:'Solar King', rarity:'Mythic', filter:'drop-shadow(0 0 8px #f59e0b) saturate(2.4)', icon:'👑', theme:['#fef08a','#d97706'], preview:'images/skins/skin-11.svg', gear:'royal'},
  {name:'Eternal Dragon', rarity:'Mythic', filter:'drop-shadow(0 0 10px #22d3ee) hue-rotate(320deg)', icon:'🐉', theme:['#a5f3fc','#0e7490'], preview:'images/skins/skin-12.svg', gear:'dragon'}
];
const RARITY_WEIGHT = { Common: 40, Uncommon: 25, Rare: 16, Epic: 11, Legendary: 6, Mythic: 2 };
const save = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
save.bestScore ??= 0; save.unlocked ??= [0]; save.selectedSkin ??= 0; save.endingUnlocked ??= false;

window.addEventListener('load', () => {
  const gameRoot = document.getElementById('trex-game');
  const hazardLayer = document.getElementById('hazard-layer');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const flightEl = document.getElementById('flight-status');
  const endingBanner = document.getElementById('ending-banner');
  const grid = document.getElementById('skin-grid');
  const resetBtn = document.getElementById('reset-data');
  const arena = document.querySelector('.trex-game-wrap');

  const mobileControls = document.getElementById('mobile-controls');
  const btnJump = document.getElementById('btn-jump');
  const btnFly = document.getElementById('btn-fly');
  const isMobile = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) mobileControls.classList.remove('hidden');

  const runner = new Runner(gameRoot);
  let score = 0, aliveTicker = 0, lastFrame = performance.now(), lastCrashed = false, skinRolledThisRun = false;
  let hazards = [], hazardTimer = 0;

  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  const applySkin = () => {
    const canvas = gameRoot.querySelector('canvas'); if (!canvas) return;
    const skin = SKINS[save.selectedSkin]; canvas.style.filter = skin.filter;
    arena.style.background = `linear-gradient(180deg, ${skin.theme[0]}, #ffffff)`;
  };

  const renderSkins = () => {
    grid.innerHTML = '';
    SKINS.forEach((skin, i) => {
      const unlocked = save.unlocked.includes(i);
      const btn = document.createElement('button');
      btn.className = `skin-btn ${unlocked ? '' : 'locked'} ${save.selectedSkin === i ? 'active' : ''}`;
      btn.disabled = !unlocked;
      btn.innerHTML = `<img class='skin-preview' src='${skin.preview}' alt='${skin.name}'><div class='skin-icon'>${skin.icon}</div><strong>${skin.name}</strong><div class='rarity'>${skin.rarity}</div>`;
      btn.style.background = `linear-gradient(135deg, ${skin.theme[0]}, ${skin.theme[1]})`;
      btn.onclick = () => { save.selectedSkin = i; persist(); renderSkins(); applySkin(); };
      grid.appendChild(btn);
    });
  };

  const weightedRoll = () => {
    const locked = SKINS.map((_, i) => i).filter(i => !save.unlocked.includes(i)); if (!locked.length) return null;
    const bag = []; locked.forEach(i => { for (let j=0;j<RARITY_WEIGHT[SKINS[i].rarity];j++) bag.push(i); });
    return bag[Math.floor(Math.random() * bag.length)];
  };

  const spawnHazard = () => {
    if (runner.crashed || !runner.playing) return;
    const data = HAZARDS[Math.floor(Math.random() * HAZARDS.length)];
    const el = document.createElement('img');
    el.src = data.src; el.className = `hazard ${data.cls}`; el.style.width = `${data.w}px`; el.style.height = `${data.h}px`; el.style.left = '760px';
    hazardLayer.appendChild(el);
    hazards.push({ el, x: 760, w: data.w, air: data.cls === 'air', passed: false });
  };

  const activateFlight = () => {
    if (!runner?.tRex || score < FLIGHT_UNLOCK_SCORE || runner.crashed) return;
    document.body.classList.add('flying');
    setTimeout(() => document.body.classList.remove('flying'), 260);
    if (!runner.tRex.jumping) runner.tRex.startJump(runner.currentSpeed);
  };
  document.addEventListener('keydown', e => { if (e.code === 'ArrowUp' || e.code === 'Space') activateFlight(); });
  document.addEventListener('touchstart', activateFlight, { passive: true });
  if (btnJump) btnJump.onclick = () => runner?.onKeyDown?.({ keyCode: 32, target: document.body, preventDefault(){} });
  if (btnFly) btnFly.onclick = activateFlight;

  resetBtn.onclick = () => { localStorage.removeItem(STORAGE_KEY); location.reload(); };

  const drawGear = () => {
    if (!runner?.canvasCtx || !runner?.tRex || runner.crashed) return;
    const skin = SKINS[save.selectedSkin], ctx = runner.canvasCtx, x = runner.tRex.xPos + 14, y = runner.tRex.yPos + 12;
    ctx.save(); ctx.fillStyle = skin.theme[1];
    if (skin.gear === 'armor') ctx.fillRect(x - 6, y + 8, 20, 8); else if (skin.gear === 'visor') ctx.fillRect(x + 2, y + 1, 12, 4);
    else if (skin.gear === 'cloak') ctx.fillRect(x - 8, y + 3, 6, 15); else if (skin.gear === 'jetpack') ctx.fillRect(x - 10, y + 6, 6, 10);
    else if (skin.gear === 'crown') ctx.fillRect(x + 2, y - 2, 12, 3); else if (skin.gear === 'scarf') ctx.fillRect(x - 1, y + 7, 14, 3);
    else if (skin.gear === 'shadow') ctx.fillRect(x - 10, y + 15, 22, 2); else if (skin.gear === 'halo') { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 5, y - 1, 8, 0, Math.PI * 2); ctx.stroke(); }
    else if (skin.gear === 'suit') ctx.fillRect(x, y + 6, 12, 9); else if (skin.gear === 'royal') ctx.fillRect(x + 1, y - 1, 14, 3);
    else if (skin.gear === 'dragon') ctx.fillRect(x - 8, y + 2, 6, 12); else ctx.fillRect(x - 4, y + 2, 8, 2);
    ctx.restore();
  };

  const tick = () => {
    const now = performance.now(); const dt = now - lastFrame; lastFrame = now;
    if (!runner.crashed && runner.playing) { aliveTicker += dt; while (aliveTicker >= 300) { score += 1; aliveTicker -= 300; } }
    scoreEl.textContent = score.toLocaleString('en-US');
    bestEl.textContent = save.bestScore.toLocaleString('en-US');
    flightEl.textContent = score >= FLIGHT_UNLOCK_SCORE ? 'Ready ✈️' : `Unlock ${FLIGHT_UNLOCK_SCORE.toLocaleString('en-US')}`;

    if (!runner.crashed && runner.playing) {
      hazardTimer += dt;
      if (hazardTimer > 1200 + Math.random() * 900) { spawnHazard(); hazardTimer = 0; }
      hazards.forEach(h => {
        h.x -= Math.max(4, (runner.currentSpeed || 6) * 0.9);
        h.el.style.left = `${h.x}px`;
        const dinoX = runner.tRex?.xPos || 0; const dinoY = runner.tRex?.yPos || 90;
        const hitX = h.x < dinoX + 32 && h.x + h.w > dinoX + 4;
        const hitY = h.air ? dinoY < 88 : dinoY > 84;
        if (hitX && hitY) { if (runner.gameOver) runner.gameOver(); runner.crashed = true; hazards.forEach(z=>z.el.remove()); hazards=[]; }
        if (!h.passed && h.x + h.w < dinoX) { h.passed = true; score += 1; }
      });
      hazards = hazards.filter(h => { if (h.x < -120) { h.el.remove(); return false; } return true; });
    }

    if (score > save.bestScore) { save.bestScore = score; persist(); }
    if (score >= ENDING_SCORE && !save.endingUnlocked) { save.endingUnlocked = true; persist(); }
    endingBanner.classList.toggle('hidden', !save.endingUnlocked);

    if (runner.crashed && !lastCrashed && score >= SKIN_ROLL_MIN_SCORE && !skinRolledThisRun) {
      const won = weightedRoll(); if (won !== null) { save.unlocked.push(won); save.selectedSkin = won; persist(); renderSkins(); applySkin(); }
      skinRolledThisRun = true;
    }
    if (!runner.crashed && lastCrashed) { skinRolledThisRun = false; score = 0; hazards.forEach(h => h.el.remove()); hazards = []; }
    lastCrashed = runner.crashed;

    applySkin(); drawGear(); requestAnimationFrame(tick);
  };

  renderSkins(); applySkin(); tick();
});
