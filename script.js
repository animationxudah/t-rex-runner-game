import { Runner } from './resources/dino_game/offline.js';

// Prevent crash when audio template is unavailable/incomplete.
Runner.prototype.loadSounds = function noopLoadSounds() {};

const STORAGE_KEY = 'dino-legends-save-v1';
const ENDING_SCORE = 40000000;
const FLIGHT_UNLOCK_SCORE = 250000;
const SKIN_ROLL_MIN_SCORE = 1000;

const SKINS = [
  {name:'Desert Scout', rarity:'Common', filter:'none', icon:'🦖', theme:['#f5d0a9','#8b5a2b'], preview:'images/skins/skin-1.svg', gear:'bandana'},
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
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const flightEl = document.getElementById('flight-status');
  const endingBanner = document.getElementById('ending-banner');
  const grid = document.getElementById('skin-grid');
  const runner = new Runner(gameRoot);
  let lastCrashed = false;
  let skinRolledThisRun = false;

  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  const applySkin = () => {
    const canvas = gameRoot.querySelector('canvas');
    if (!canvas) return;
    const skin = SKINS[save.selectedSkin];
    canvas.style.filter = skin.filter;
    document.documentElement.style.setProperty('--theme-top', skin.theme[0]);
    document.documentElement.style.setProperty('--theme-main', skin.theme[1]);
  };

  const renderSkins = () => {
    grid.innerHTML = '';
    SKINS.forEach((skin, i) => {
      const unlocked = save.unlocked.includes(i);
      const btn = document.createElement('button');
      btn.className = `skin-btn ${unlocked ? '' : 'locked'} ${save.selectedSkin === i ? 'active' : ''}`;
      btn.disabled = !unlocked;
      btn.innerHTML = `<img class="skin-preview" src="${skin.preview}" alt="${skin.name}" /><div class="skin-icon">${skin.icon}</div><strong>${skin.name}</strong><div class="rarity">${skin.rarity}</div>`;
      btn.style.background = `linear-gradient(135deg, ${skin.theme[0]}, ${skin.theme[1]})`;
      btn.onclick = () => { save.selectedSkin = i; persist(); renderSkins(); applySkin(); };
      grid.appendChild(btn);
    });
  };


  const drawGear = () => {
    if (!runner?.canvasCtx || !runner?.tRex || runner.crashed) return;
    const skin = SKINS[save.selectedSkin];
    const ctx = runner.canvasCtx;
    const x = runner.tRex.xPos + 14;
    const y = runner.tRex.yPos + 12;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = skin.theme[1];
    if (skin.gear === 'armor') { ctx.fillRect(x - 6, y + 8, 20, 8); }
    else if (skin.gear === 'visor') { ctx.fillRect(x + 2, y + 1, 12, 4); }
    else if (skin.gear === 'cloak') { ctx.fillRect(x - 8, y + 3, 6, 15); }
    else if (skin.gear === 'jetpack') { ctx.fillRect(x - 10, y + 6, 6, 10); }
    else if (skin.gear === 'crown') { ctx.fillRect(x + 2, y - 2, 12, 3); }
    else if (skin.gear === 'scarf') { ctx.fillRect(x - 1, y + 7, 14, 3); }
    else if (skin.gear === 'shadow') { ctx.fillRect(x - 10, y + 15, 22, 2); }
    else if (skin.gear === 'halo') { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 5, y - 1, 8, 0, Math.PI*2); ctx.stroke(); }
    else if (skin.gear === 'suit') { ctx.fillRect(x, y + 6, 12, 9); }
    else if (skin.gear === 'royal') { ctx.fillRect(x + 1, y - 1, 14, 3); }
    else if (skin.gear === 'dragon') { ctx.fillRect(x - 8, y + 2, 6, 12); }
    else { ctx.fillRect(x - 4, y + 2, 8, 2); }
    ctx.restore();
  };

  const weightedRoll = () => {
    const locked = SKINS.map((_, i) => i).filter(i => !save.unlocked.includes(i));
    if (!locked.length) return null;
    const bag = [];
    locked.forEach(i => { for (let j = 0; j < RARITY_WEIGHT[SKINS[i].rarity]; j++) bag.push(i); });
    return bag[Math.floor(Math.random() * bag.length)];
  };

  const activateFlight = () => {
    if (!runner?.tRex || Math.ceil(runner.distanceRan || 0) < FLIGHT_UNLOCK_SCORE) return;
    if (!runner.crashed && !runner.tRex.jumping) runner.tRex.startJump(runner.currentSpeed);
  };
  document.addEventListener('keydown', e => { if (e.code === 'ArrowUp' || e.code === 'Space') activateFlight(); });
  document.addEventListener('touchstart', activateFlight, { passive: true });

  const tick = () => {
    const score = Math.ceil(runner.distanceRan || 0);
    scoreEl.textContent = score.toLocaleString('en-US');
    bestEl.textContent = save.bestScore.toLocaleString('en-US');
    flightEl.textContent = score >= FLIGHT_UNLOCK_SCORE ? 'Ready' : `Unlock ${FLIGHT_UNLOCK_SCORE.toLocaleString('en-US')}`;

    if (score > save.bestScore) { save.bestScore = score; persist(); }
    if (score >= ENDING_SCORE && !save.endingUnlocked) { save.endingUnlocked = true; persist(); }
    endingBanner.classList.toggle('hidden', !save.endingUnlocked);

    if (runner.crashed && !lastCrashed && score >= SKIN_ROLL_MIN_SCORE && !skinRolledThisRun) {
      const won = weightedRoll();
      if (won !== null) { save.unlocked.push(won); save.selectedSkin = won; persist(); renderSkins(); applySkin(); }
      skinRolledThisRun = true;
    }
    if (!runner.crashed && lastCrashed) skinRolledThisRun = false;
    lastCrashed = runner.crashed;

    applySkin();
    drawGear();
    requestAnimationFrame(tick);
  };

  renderSkins();
  tick();
});
