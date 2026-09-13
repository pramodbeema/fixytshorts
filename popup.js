document.addEventListener('DOMContentLoaded', () => {
    const seekInput = document.getElementById('seek-duration');
    const seekDisplay = document.getElementById('seek-duration-val');
    const quickBtns = document.querySelectorAll('.seek-chip');

    // ── SEEK DURATION ──────────────────────────────────────────────────
    function updateValue(val) {
        let num = parseInt(val, 10);
        if (isNaN(num) || num < 1) num = 5;
        if (num > 60) num = 60;

        seekInput.value = num;
        if (seekDisplay) seekDisplay.textContent = num + 's';

        quickBtns.forEach(btn => {
            if (parseInt(btn.getAttribute('data-val'), 10) === num) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ seekDuration: num });
        } else {
            localStorage.setItem('seekDuration', num);
        }
    }

    // Load initial seek duration
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ seekDuration: 5 }, (res) => {
            updateValue(res.seekDuration || 5);
        });
    } else {
        const stored = localStorage.getItem('seekDuration') || 5;
        updateValue(stored);
    }

    seekInput.addEventListener('input', (e) => {
        updateValue(e.target.value);
    });

    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            updateValue(val);
        });
    });
});
