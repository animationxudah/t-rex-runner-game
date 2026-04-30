import { Runner } from './resources/dino_game/offline.js';

const STORAGE_KEY = 'dino-legends-save-v1';
const ENDING_SCORE = 40000000;
const FLIGHT_UNLOCK_SCORE = 250000;
const SKIN_ROLL_MIN_SCORE = 1000;

const SKINS = [
  ['Desert Scout', 'Common', 'none'],
  ['Mint Dash', 'Common', 'hue-rotate(45deg)'],
  ['Crimson Fang', 'Uncommon', 'hue-rotate(140deg)'],
  ['Night Byte', 'Uncommon', 'invert(1)'],
  ['Neon Pop', 'Rare', 'saturate(2) hue-rotate(220deg)'],
  ['Amber Volt', 'Rare', 'sepia(1) saturate(2)'],
  ['Aqua Storm', 'Epic', 'hue-rotate(280deg) saturate(1.7)'],
  ['Void Walker', 'Epic', 'contrast(1.4) brightness(.8)'],
  ['Prism Nova', 'Legendary', 'contrast(1.2) saturate(3)'],
  ['Silver Lunar', 'Legendary', 'grayscale(1) brightness(1.3)'],
  ['Solar King', 'Mythic', 'drop-shadow(0 0 8px #f59e0b) saturate(2.4)'],
  ['Eternal Dragon', 'Mythic', 'drop-shadow(0 0 10px #22d3ee) hue-rotate(320deg)']
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
  let runner = new Runner(gameRoot);
  let lastCrashed = false;
  let skinRolledThisRun = false;

  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  const applySkin = () => {
    const canvas = gameRoot.querySelector('canvas');
    if (!canvas) return;
    canvas.style.filter = SKINS[save.selectedSkin][2];
  };

  const renderSkins = () => {
    grid.innerHTML = '';
    SKINS.forEach(([name, rarity], i) => {
      const unlocked = save.unlocked.includes(i);
      const btn = document.createElement('button');
      btn.className = `skin-btn ${unlocked ? '' : 'locked'} ${save.selectedSkin === i ? 'active' : ''}`;
      btn.disabled = !unlocked;
      btn.innerHTML = `<strong>${name}</strong><div class="rarity">${rarity}</div>`;
      btn.onclick = () => { save.selectedSkin = i; persist(); renderSkins(); applySkin(); };
      grid.appendChild(btn);
    });
  };

  const weightedRoll = () => {
    const locked = SKINS.map((_, i) => i).filter(i => !save.unlocked.includes(i));
    if (!locked.length) return null;
    const bag = [];
    locked.forEach(i => { for (let j = 0; j < RARITY_WEIGHT[SKINS[i][1]]; j++) bag.push(i); });
    return bag[Math.floor(Math.random() * bag.length)];
  };

  const activateFlight = () => {
    if (!runner?.tRex || Math.ceil(runner.distanceRan || 0) < FLIGHT_UNLOCK_SCORE) return;
    flightEl.textContent = 'Ready';
    if (!runner.tRex.jumping) runner.tRex.startJump(runner.currentSpeed);
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

    if (runner.crashed && !lastCrashed) {
      if (score >= SKIN_ROLL_MIN_SCORE && !skinRolledThisRun) {
        const won = weightedRoll();
        if (won !== null) {
          save.unlocked.push(won);
          save.selectedSkin = won;
          persist();
          renderSkins();
          applySkin();
        }
        skinRolledThisRun = true;
      }
    }
    if (!runner.crashed && lastCrashed) skinRolledThisRun = false;
    lastCrashed = runner.crashed;

    applySkin();
    requestAnimationFrame(tick);
  };

  renderSkins();
  applySkin();
  tick();
});
