async function fetchScramble(eventType) {
    const scrambleText = document.querySelector('.scramble-text');
    const scrambleImage = document.querySelector('.scramble-image');
    scrambleText.textContent = 'Fetching a new scramble...';
    scrambleImage.innerHTML = '';
    scrambleImage.onclick = null;

    try {
        const response = await fetch(`https://od5tvdqc5i.execute-api.eu-central-1.amazonaws.com/dev/scramble?event=${eventType}`, {
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

export function openOverlay(svg) {
    overlaySvg.innerHTML = svg;
    overlay.classList.remove('hidden');
}

function closeOverlay() {
    overlay.classList.add('hidden');
    overlaySvg.innerHTML = '';
}

// Close overlay on Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
        closeOverlay();
    }
});

// Dropdown interaction
document.getElementById('eventSelect').addEventListener('change', e => fetchScramble(e.target.value));

// Initial scramble load
fetchScramble(document.getElementById('eventSelect').value);