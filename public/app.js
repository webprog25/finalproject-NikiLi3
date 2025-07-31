import { setupTimer } from './timer.js';
import { SolvesManager } from './solvesManager.js';
import { AuthManager } from './authentication.js';

const eventSelect = document.getElementById('eventSelect');
const overlay = document.getElementById('imageOverlay');
const overlaySvg = document.getElementById('overlaySvg');

// Time formatter
function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(2).padStart(4, '0');
  return m ? `${m}:${s.padStart(5, '0')}` : s;
}

// Format time from milliseconds
function formatTime(elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hundreds = Math.floor((elapsedMs % 1000) / 10);
  if (totalSeconds < 60) {
    return `${totalSeconds}.${hundreds.toString().padStart(2, '0')}`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${hundreds.toString().padStart(2, '0')}`;
}

// Fetch a new random scramble
async function fetchScramble(event) {
  const txt = document.querySelector('.scramble-text');
  const img = document.querySelector('.scramble-image');

  txt.textContent = 'Fetching a new scramble…';
  img.innerHTML = '';
  img.onclick = null;

  try {
    const kind = event === 'THREE_OH' ? 'THREE' : event;
    const response = await fetch(
      `https://od5tvdqc5i.execute-api.eu-central-1.amazonaws.com/dev/scramble?event=${kind}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
    const data = await response.json();

    txt.textContent = data.scramble;
    img.innerHTML = data.image;
    img.onclick = () => openOverlay(data.image);
  } 
  catch {
    txt.textContent = 'Error loading scramble. Retry with R key.';
  }
}

// Large Scramble Image Overlay helpers
function openOverlay(svg) {
  overlaySvg.innerHTML = svg;
  overlay.classList.remove('hidden');
}

function closeOverlay() {
  overlay.classList.add('hidden');
  overlaySvg.innerHTML = '';
}

document.getElementById('closeButton').onclick = () => closeOverlay();
overlay.onclick = e => {
  if (e.target === overlay) closeOverlay();
};

// Average helpers
function aoN(solves, n) {
  if (solves.length < n) {
    return null;
  }
  const t = solves.slice(0, n).map(s => s.timeMs / 1000).sort((a, b) => a - b);
  const avg = t.slice(1, n - 1).reduce((a, v) => a + v, 0) / (n - 2);
  return avg;
}

function mean3(solves) {
  if (solves.length < 3) return null;
  const t = solves.slice(0, 3).map(s => s.timeMs / 1000);
  return (t[0] + t[1] + t[2]) / 3;
}

// Events that use MO3 (Mean of 3) instead of Average of 5
function mo3Events(value) {
  return value === 'SIX' || value === 'SEVEN' || value.endsWith('_BLD');
}

// Update averages footer
function updateAverages(solves) {
  const data = solves ?? manager.getCachedSolves();

  // Get references to the average elements
  const mo3Item = document.getElementById('mo3Item');
  const avg5Item = document.getElementById('avg5Item');
  const avg12Item = document.getElementById('avg12Item');
  const avg50Item = document.getElementById('avg50Item');

  const mo3Time = document.getElementById('mo3Time');
  const avg5Time = document.getElementById('avg5Time');
  const avg12Time = document.getElementById('avg12Time');
  const avg50Time = document.getElementById('avg50Time');

  // Calculate averages
  console.log(`updateAverages called with ${data.length} solves`);
  const m3  = mo3Events(eventSelect.value) ? mean3(data) : null;
  const a5  = aoN(data, 5);
  const a12 = aoN(data, 12);
  const a50 = aoN(data, 50);

  if (m3 !== null) {
    mo3Item.classList.remove('hidden');
    mo3Time.textContent = fmt(m3);
  } else {
    mo3Item.classList.add('hidden');
  }
  if (a5 !== null) {
    avg5Item.classList.remove('hidden');
    avg5Time.textContent = fmt(a5);
  } else {
    avg5Item.classList.add('hidden');
  }
  if (a12 !== null) {
    avg12Item.classList.remove('hidden');
    avg12Time.textContent = fmt(a12);
  } else {
    avg12Item.classList.add('hidden');
  }
  if (a50 !== null) {
    avg50Item.classList.remove('hidden');
    avg50Time.textContent = fmt(a50);
  } else {
    avg50Item.classList.add('hidden');
  }
}

// Dropdown counts
const eventCounts = {};
const originalLabels = {};

function updateDropdown(ev) {
  const o = eventSelect.querySelector(`option[value="${ev}"]`);
  if (o) o.textContent = `${originalLabels[ev]} (${eventCounts[ev] || 0})`;
}

async function refreshCounts(events) {
  const c = await manager.getSolveCountsPerEvent(events);
  Object.assign(eventCounts, c);
  events.forEach(updateDropdown);
}

// On Solve complete actions
async function onSolve(timeMs) {
  const ev = eventSelect.value;
  const scr = document.querySelector('.scramble-text').textContent;
  const svg = document.querySelector('.scramble-image').innerHTML;

  const newSolve = { puzzleType: ev, timeMs, scramble: scr, scrambleImage: svg };
  await manager.addSolve(newSolve);

  eventCounts[ev] = (eventCounts[ev] || 0) + 1;
  updateDropdown(ev);
  // updateAverages will be called automatically by the real-time listener
}

// Init after authentication
async function initAfterAuth() {
  const events = Array.from(eventSelect.options).map(o => o.value);

  events.forEach(ev =>
  {
    originalLabels[ev] = eventSelect.querySelector(`option[value="${ev}"]`).textContent;
    eventCounts[ev] = 0;
  });

  const savedEvent = localStorage.getItem('lastEvent') || 'THREE_OH';

  eventSelect.value = savedEvent;
  fetchScramble(savedEvent);

  await refreshCounts(events);

  manager.initRealTimeListener(savedEvent, updateAverages);
  updateAverages();
}

// Setup
const manager = new SolvesManager();
const authMgr = new AuthManager(manager);

document.addEventListener('DOMContentLoaded', async () => {
  await authMgr.initAuth();
  await initAfterAuth();

  setupTimer(
    document.querySelector('.timer'),
    () => eventSelect.value,
    fetchScramble,
    onSolve
  );
});

// Delete last solve handler
async function handleDeleteLastSolveKeyPressed() {
  const currentSolves = manager.getCachedSolves();
  if (currentSolves.length === 0) {
    return;
  }

  const deleted = await manager.deleteLastSolve();
  if (deleted) {
    console.log('Successfully deleted last solve');

    // Update the event count
    const ev = eventSelect.value;
    eventCounts[ev] = Math.max(0, (eventCounts[ev] || 0) - 1);
    updateDropdown(ev);

    // Update timer
    const timerElement = document.querySelector('.timer');
    if (currentSolves.length > 1) {
      const newNewestSolve = currentSolves[1];
      timerElement.textContent = formatTime(newNewestSolve.timeMs);
    } else {
      timerElement.textContent = '0.00';
    }
  } else {
    console.log('Failed to delete solve');
  }
}

// Event change + keyboard
eventSelect.onchange = async e => {
  const ev = e.target.value;
  localStorage.setItem('lastEvent', ev);

  fetchScramble(ev);
  manager.initRealTimeListener(ev, updateAverages);
  await refreshCounts([ev]);
  e.target.blur();
};

document.addEventListener('keydown', async e => {
  if (e.key === 'Escape' && !overlay.classList.contains('hidden')) { closeOverlay(); }
  if (e.key.toLowerCase() === 'r') { fetchScramble(eventSelect.value); }
  if (e.key.toLowerCase() === 'o') { await handleDeleteLastSolveKeyPressed(); }
});
