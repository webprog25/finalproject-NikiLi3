export function setupTimer(timerDisplayElement, getCurrentEventType, fetchScrambleFn, onSolveComplete) {
    // Timer states
    const TimerState = {
        IDLE: 'IDLE',
        HOLDING: 'HOLDING',
        READY: 'READY',
        RUNNING: 'RUNNING'
    };

    // CSS classes for visual states
    const TimerClass = {
        IDLE: 'idle',
        HOLDING: 'holding',
        READY: 'ready'
    };

    let currentState = TimerState.IDLE;
    let timerInterval = null;
    let startTime = null;
    let spaceHeld = false;
    let spacePressTime = null;
    let holdTimeout = null;

    // Touch handling variables
    let touchHeld = false;
    let touchStartTime = null;
    let touchHoldTimeout = null;

    /**
     * Formats elapsed time in milliseconds to a display string
     * @param {number} elapsedMs - Time in milliseconds
     * @returns {string} Formatted time string
     */
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

    function updateTimerCSSClass() {
        timerDisplayElement.classList.remove(TimerClass.IDLE, TimerClass.HOLDING, TimerClass.READY);
        switch (currentState) {
            case TimerState.IDLE:
                timerDisplayElement.classList.add(TimerClass.IDLE);
                break;
            case TimerState.HOLDING:
                timerDisplayElement.classList.add(TimerClass.HOLDING);
                break;
            case TimerState.READY:
                timerDisplayElement.classList.add(TimerClass.READY);
                break;
            case TimerState.RUNNING:
                timerDisplayElement.classList.add(TimerClass.IDLE);
                break;
        }
    }

    function setTimerState(newState) {
        currentState = newState;
        updateTimerCSSClass();
    }

    function startTimer() {
        startTime = Date.now();
        setTimerState(TimerState.RUNNING);
        timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            timerDisplayElement.textContent = formatTime(elapsed);
        }, 10);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        const elapsed = Date.now() - startTime;
        timerDisplayElement.textContent = formatTime(elapsed);
        setTimerState(TimerState.IDLE);

        // Invoke callback to persist solve (if provided)
        if (onSolveComplete) {
            onSolveComplete(elapsed);
        }

        // Fetch new scramble for next solve
        const eventType = getCurrentEventType();
        if (eventType && fetchScrambleFn) {
            fetchScrambleFn(eventType);
        }
    }

    function handleSpacebarKeyDown(event) {
        if (event.code !== 'Space' || event.repeat) return;

        event.preventDefault();

        if (currentState === TimerState.RUNNING) {
            stopTimer();
            return;
        }

        if (!spaceHeld) {
            spaceHeld = true;
            spacePressTime = Date.now();
            setTimerState(TimerState.HOLDING);

            holdTimeout = setTimeout(() => {
                if (spaceHeld && currentState === TimerState.HOLDING) {
                    setTimerState(TimerState.READY);
                }
            }, 500);
        }
    }

    function handleSpacebarKeyUp(event) {
        if (event.code !== 'Space') return;

        event.preventDefault();

        clearTimeout(holdTimeout);
        holdTimeout = null;

        if (!spaceHeld) return;

        if (currentState === TimerState.READY) {
            startTimer();
        } else {
            setTimerState(TimerState.IDLE);
        }

        spaceHeld = false;
        spacePressTime = null;
    }

    function handleTouchStart(event) {
        // Prevent default to avoid triggering mouse events
        event.preventDefault();

        if (currentState === TimerState.RUNNING) {
            stopTimer();
            return;
        }

        if (!touchHeld) {
            touchHeld = true;
            touchStartTime = Date.now();
            setTimerState(TimerState.HOLDING);

            touchHoldTimeout = setTimeout(() => {
                if (touchHeld && currentState === TimerState.HOLDING) {
                    setTimerState(TimerState.READY);
                }
            }, 500);
        }
    }

    function handleTouchEnd(event) {
        event.preventDefault();

        clearTimeout(touchHoldTimeout);
        touchHoldTimeout = null;

        if (!touchHeld) return;

        if (currentState === TimerState.READY) {
            startTimer();
        } else {
            setTimerState(TimerState.IDLE);
        }

        touchHeld = false;
        touchStartTime = null;
    }

    // Initialize timer
    timerDisplayElement.textContent = '0.00';
    setTimerState(TimerState.IDLE);

    // Add event listeners
    document.addEventListener('keydown', handleSpacebarKeyDown);
    document.addEventListener('keyup', handleSpacebarKeyUp);

    // Add touch event listeners to the timer element
    timerDisplayElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    timerDisplayElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    timerDisplayElement.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', handleSpacebarKeyDown);
        document.removeEventListener('keyup', handleSpacebarKeyUp);
        timerDisplayElement.removeEventListener('touchstart', handleTouchStart);
        timerDisplayElement.removeEventListener('touchend', handleTouchEnd);
        timerDisplayElement.removeEventListener('touchcancel', handleTouchEnd);
        clearInterval(timerInterval);
        clearTimeout(holdTimeout);
        clearTimeout(touchHoldTimeout);
    };
}