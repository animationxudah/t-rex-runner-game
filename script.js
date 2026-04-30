import { Runner } from './resources/dino_game/offline.js';

// Prevent crash when audio template is unavailable/incomplete.
Runner.prototype.loadSounds = function noopLoadSounds() {};

const STORAGE_KEY = 'dino-legends-save-v1';
const ENDING_SCORE = 40000000;
const FLIGHT_UNLOCK_SCORE = 250000;
const SKIN_ROLL_MIN_SCORE = 1000;

const SKINS = [
  {name:'Desert Scout', rarity:'Common', filter:'none', icon:'🦖', theme:['#f5d0a9','#8b5a2b']},
  {name:'Mint Dash', rarity:'Common', filter:'hue-rotate(45deg)', icon:'🌿', theme:['#d1fae5','#10b981']},
  {name:'Crimson Fang', rarity:'Uncommon', filter:'hue-rotate(140deg)', icon:'🔥', theme:['#fecaca','#dc2626']},
  {name:'Night Byte', rarity:'Uncommon', filter:'invert(1)', icon:'🌙', theme:['#cbd5e1','#334155']},
  {name:'Neon Pop', rarity:'Rare', filter:'saturate(2) hue-rotate(220deg)', icon:'⚡', theme:['#e9d5ff','#7c3aed']},
  {name:'Amber Volt', rarity:'Rare', filter:'sepia(1) saturate(2)', icon:'🌞', theme:['#fde68a','#f59e0b']},
  {name:'Aqua Storm', rarity:'Epic', filter:'hue-rotate(280deg) saturate(1.7)', icon:'🌊', theme:['#bfdbfe','#2563eb']},
  {name:'Void Walker', rarity:'Epic', filter:'contrast(1.4) brightness(.8)', icon:'🕳️', theme:['#d1d5db','#111827']},
  {name:'Prism Nova', rarity:'Legendary', filter:'contrast(1.2) saturate(3)', icon:'💎', theme:['#ddd6fe','#4f46e5']},
  {name:'Silver Lunar', rarity:'Legendary', filter:'grayscale(1) brightness(1.3)', icon:'🌕', theme:['#f3f4f6','#6b7280']},
  {name:'Solar King', rarity:'Mythic', filter:'drop-shadow(0 0 8px #f59e0b) saturate(2.4)', icon:'👑', theme:['#fef08a','#d97706']},
  {name:'Eternal Dragon', rarity:'Mythic', filter:'drop-shadow(0 0 10px #22d3ee) hue-rotate(320deg)', icon:'🐉', theme:['#a5f3fc','#0e7490']}
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
      btn.innerHTML = `<div class="skin-icon">${skin.icon}</div><strong>${skin.name}</strong><div class="rarity">${skin.rarity}</div>`;
      btn.style.background = `linear-gradient(135deg, ${skin.theme[0]}, ${skin.theme[1]})`;
      btn.onclick = () => { save.selectedSkin = i; persist(); renderSkins(); applySkin(); };
      grid.appendChild(btn);
    });
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
    requestAnimationFrame(tick);
  };

  renderSkins();
  tick();
});
