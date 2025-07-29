import { setupTimer } from './timer.js';
import { SolvesManager } from './solvesManager.js';

async function fetchScramble(eventType) {
    const scrambleText = document.querySelector('.scramble-text');
    const scrambleImage = document.querySelector('.scramble-image');
    scrambleText.textContent = 'Fetching a new scramble...';
    scrambleImage.innerHTML = '';
    scrambleImage.onclick = null;

    try {
        // 3x3 One-Handed uses same scrambles as regular 3x3
        const scrambleType = eventType === 'THREE_OH' ? 'THREE' : eventType;
        const response = await fetch(`https://od5tvdqc5i.execute-api.eu-central-1.amazonaws.com/dev/scramble?event=${scrambleType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const payload = await response.json();
        if (!payload.scramble) {
            throw new Error('Invalid API response: missing scramble');
        }
        scrambleText.textContent = payload.scramble;
        scrambleImage.innerHTML = payload.image;
        scrambleImage.onclick = () => openOverlay(payload.image);
    } catch (error) {
        console.error('Error fetching scramble:', error.message);
        scrambleText.textContent = 'Error loading scramble';
        scrambleImage.innerHTML = '';
    }
}

// Large scramble image overlay
const overlay = document.getElementById('imageOverlay');
const overlaySvg = document.getElementById('overlaySvg');
const closeButton = document.getElementById('closeButton');
closeButton.addEventListener('click', closeOverlay);

// Close overlay when clicking outside the popup
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
        closeOverlay();
    }
});

export function openOverlay(svg) {
    overlaySvg.innerHTML = svg;
    overlay.classList.remove('hidden');
}

function closeOverlay() {
    overlay.classList.add('hidden');
    overlaySvg.innerHTML = '';
}

// Close overlay on "ESC" key or fetch new scramble on "R"
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
        closeOverlay();
    } else if (event.key === 'r' || event.key === 'R') {
        const eventType = document.getElementById('eventSelect').value;
        fetchScramble(eventType);
    }
});

const manager = new SolvesManager();

// Save selected event to localStorage on change and fetch new scramble
const eventSelect = document.getElementById('eventSelect');
eventSelect.addEventListener('change', (e) => {
    const value = e.target.value;
    localStorage.setItem('lastEvent', value);
    fetchScramble(value);
    manager.initRealTimeListener(value, updateAverages);
    updateAverages(); // Immediate update

    // Unfocus the dropdown to prevent space bar interference with timer
    e.target.blur();
});

// Load saved event from localStorage on page load
const savedEvent = localStorage.getItem('lastEvent') || eventSelect.value;
eventSelect.value = savedEvent;
fetchScramble(savedEvent);

// Init timer with onSolveComplete callback to persist solves and update count
setupTimer(
    document.querySelector('.timer'),
    () => eventSelect.value,
    fetchScramble,
    async (timeMs) => {
        const eventType = eventSelect.value;
        const scramble = document.querySelector('.scramble-text').textContent;
        const scrambleImage = document.querySelector('.scramble-image').innerHTML;
        await manager.addSolve({
            puzzleType: eventType,
            timeMs,
            scramble,
            scrambleImage
        });
        // Locally update count for current event
        eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
        updateDropdownCount(eventType);
    }
);

// Function to calculate AoN (trimmed average for cubing: exclude best/worst, mean of rest)
function calculateAoN(solves, n) {
    if (solves.length < n) return null;
    const lastNSolves = solves.slice(0, n); // Last n (cache is desc timestamp)
    const times = lastNSolves.map(s => s.timeMs / 1000); // To seconds
    times.sort((a, b) => a - b); // Ascending
    const trimmedTimes = times.slice(1, n - 1); // Exclude best (0) and worst (n-1)
    const sum = trimmedTimes.reduce((acc, t) => acc + t, 0);
    return (sum / (n - 2)).toFixed(2); // Mean, 2 decimals
}

// Function to update averages UI
function updateAverages(solves = manager.getCachedSolves()) {
    const footer = document.getElementById('averagesFooter');
    footer.innerHTML = '';

    console.log('Updating averages:', {
        solveCount: solves.length,
        event: eventSelect.value,
        solves: solves.map(s => ({ puzzleType: s.puzzleType, timeMs: s.timeMs }))
    });

    const averages = [];

    const ao5 = calculateAoN(solves, 5);
    if (ao5) averages.push(`<div class="avg-item"><span class="avg-label">AVG5: </span><span class="avg-time">${ao5}</span></div>`);

    const ao12 = calculateAoN(solves, 12);
    if (ao12) averages.push(`<div class="avg-item"><span class="avg-label">AVG12: </span><span class="avg-time">${ao12}</span></div>`);

    const ao50 = calculateAoN(solves, 50);
    if (ao50) averages.push(`<div class="avg-item"><span class="avg-label">AVG50: </span><span class="avg-time">${ao50}</span></div>`);

    footer.innerHTML = averages.join('');
    console.log('Footer HTML set:', footer.innerHTML);
}

const eventCounts = {};
const originalLabels = {};

function updateDropdownCount(eventValue) {
    const option = eventSelect.querySelector(`option[value="${eventValue}"]`);
    if (option) {
        option.textContent = `${originalLabels[eventValue]} (${eventCounts[eventValue] || 0})`;
    }
}

// Initial setup: Fetch counts, update dropdown, set listener, and update averages
(async () => {
    await manager.authReady; // Wait for auth

    // Store original labels and initialize counts to 0
    Array.from(eventSelect.options).forEach(option => {
        originalLabels[option.value] = option.textContent;
        eventCounts[option.value] = 0;
    });

    // Fetch counts from DB for each event
    const eventValues = [...new Set(Array.from(eventSelect.options).map(opt => opt.value))]; // Unique values
    const countPromises = eventValues.map(async (value) => {
        eventCounts[value] = await manager.getSolveCountForEvent(value);
    });
    await Promise.all(countPromises);

    // Update all dropdown options with counts
    eventValues.forEach(updateDropdownCount);

    // Set listener for loaded event and update averages
    manager.initRealTimeListener(savedEvent, updateAverages);
    updateAverages();
})();