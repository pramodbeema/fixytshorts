// Fix YT Shorts Extension
// Created by: Pramod Beema (https://github.com/pramodbeema)
// 5 Powerful Features:
//   1. Audio Track Navigator - Press 'a' to cycle audio tracks directly, or open menu with full keyboard selection
//   2. Shorts Seeker - Arrow keys to seek forward/backward with custom seek duration
//   3. Shorts to Video Converter - Convert Shorts to regular videos (Button + Ctrl+Shift+F)
//   4. Caption Toggle - Press 'c' to toggle/cycle captions, or open menu with full keyboard selection
//   5. Restart from Beginning - Press '0' to restart Short from start

(function () {
    'use strict';

    // ========================================
    // SETTINGS & STORAGE
    // ========================================

    let seekSeconds = 5;

    function loadSeekSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get({ seekDuration: 5 }, (res) => {
                if (res && res.seekDuration) {
                    seekSeconds = parseInt(res.seekDuration, 10) || 5;
                }
            });
        } else {
            const stored = localStorage.getItem('seekDuration');
            if (stored) {
                seekSeconds = parseInt(stored, 10) || 5;
            }
        }
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.seekDuration) {
                seekSeconds = parseInt(changes.seekDuration.newValue, 10) || 5;
            }
        });
    }

    loadSeekSettings();

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    function isShorts() {
        return window.location.pathname.includes('/shorts/');
    }

    function getActiveReel() {
        const active = document.querySelector(
            'ytd-reel-video-renderer[is-active], ' +
            'ytd-shorts [is-active], ' +
            '.ytd-reel-video-renderer[is-active]'
        );
        if (active) return active;

        const reels = document.querySelectorAll('ytd-reel-video-renderer, ytd-shorts ytd-reel-video-renderer');
        if (reels.length > 0) {
            const centerY = window.innerHeight / 2;
            let closestReel = null;
            let minDistance = Infinity;

            for (const reel of reels) {
                const rect = reel.getBoundingClientRect();
                if (rect.height > 0) {
                    const dist = Math.abs((rect.top + rect.bottom) / 2 - centerY);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestReel = reel;
                    }
                }
            }
            if (closestReel) return closestReel;
        }

        return document.querySelector('ytd-reel-video-renderer') || null;
    }

    function getActiveVideo() {
        const activeReel = getActiveReel();
        if (activeReel) {
            const vid = activeReel.querySelector('video');
            if (vid) return vid;
        }

        const selectors = [
            'ytd-reel-video-renderer[is-active] video',
            'ytd-shorts video',
            '#shorts-player video',
            'video.html5-main-video'
        ];
        for (const selector of selectors) {
            const v = document.querySelector(selector);
            if (v && v.readyState >= 2) return v;
        }

        const vids = document.querySelectorAll('video');
        for (const v of vids) {
            if (!v.paused || v.currentTime > 0) return v;
        }
        return vids[0] || null;
    }

    // ========================================
    // MENU KEYBOARD TRAP & CONTROLLER
    // Intercepts ArrowUp / ArrowDown / Enter / 1-9 / Escape
    // when YouTube opens a sheet or popup menu.
    // GUARANTEES Up/Down arrows NEVER scroll the Short while a menu is open!
    // ========================================

    let activeMenuElements = [];
    let focusedMenuIndex = 0;

    function getOpenDropdownContainer() {
        const dropdown = document.querySelector('tp-yt-iron-dropdown:not([style*="display: none"])');
        if (dropdown && dropdown.offsetParent !== null) return dropdown;

        const popup = document.querySelector('ytd-popup-container');
        if (popup && popup.querySelector('yt-sheet-view-model, ytd-menu-popup-renderer')) {
            const inner = popup.querySelector('yt-sheet-view-model, ytd-menu-popup-renderer');
            if (inner && inner.offsetParent !== null) return inner;
        }
        return null;
    }

    function isMenuOpen() {
        return getOpenDropdownContainer() !== null;
    }

    function getMenuItems() {
        const container = getOpenDropdownContainer();
        if (!container) return [];

        const items = container.querySelectorAll(
            'button.ytListItemViewModelButtonOrAnchor, ' +
            'yt-list-item-view-model[role="menuitem"], ' +
            'yt-list-item-view-model, ' +
            'ytd-menu-service-item-renderer, ' +
            'tp-yt-paper-item'
        );

        // Filter out non-visible and header containers
        const valid = [];
        for (const el of items) {
            if (el.offsetParent !== null && el.textContent.trim().length > 0) {
                // Deduplicate if child button and parent container both caught
                if (!valid.some(existing => existing.contains(el) || el.contains(existing))) {
                    valid.push(el);
                }
            }
        }
        return valid;
    }

    function updateMenuHighlight() {
        // Clear previous highlight
        document.querySelectorAll('.fyt-item-focused').forEach(el => el.classList.remove('fyt-item-focused'));

        if (activeMenuElements.length === 0) return;
        if (focusedMenuIndex < 0) focusedMenuIndex = 0;
        if (focusedMenuIndex >= activeMenuElements.length) focusedMenuIndex = activeMenuElements.length - 1;

        const target = activeMenuElements[focusedMenuIndex];
        if (target) {
            // Apply highlight to the full item row
            const rowItem = target.closest('yt-list-item-view-model, ytd-menu-service-item-renderer, tp-yt-paper-item') || target;
            rowItem.classList.add('fyt-item-focused');
            rowItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            if (typeof target.focus === 'function') target.focus();
        }
    }

    function activateMenuItem(index) {
        if (index >= 0 && index < activeMenuElements.length) {
            const item = activeMenuElements[index];
            const btn = item.querySelector('button') || item;
            btn.click();
            closeMenu();
        }
    }

    function closeMenu() {
        document.querySelectorAll('.fyt-item-focused').forEach(el => el.classList.remove('fyt-item-focused'));
        activeMenuElements = [];
        focusedMenuIndex = 0;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    }

    async function setupKeyboardMenuNavigation() {
        // Wait for items to populate inside sheet
        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 60));
            activeMenuElements = getMenuItems();
            if (activeMenuElements.length > 0) break;
        }

        if (activeMenuElements.length > 0) {
            // Find current checked or active item if any
            let selectedIdx = activeMenuElements.findIndex(el =>
                el.getAttribute('aria-checked') === 'true' ||
                el.querySelector('[aria-checked="true"]') !== null ||
                el.textContent.toLowerCase().includes('(selected)')
            );
            focusedMenuIndex = selectedIdx >= 0 ? selectedIdx : 0;
            updateMenuHighlight();
        }
    }

    // ========================================
    // FEATURE 1: AUDIO TRACK NAVIGATOR
    // Press 'a' to open audio menu with keyboard navigation
    // Shift+'a' or pressing 'a' when open cycles tracks instantly!
    // ========================================

    async function navigateToAudioTrackVideo() {
        try {
            const settingsButton = document.querySelector('.ytp-settings-button, button[aria-label*="Settings" i]');
            if (!settingsButton) return;

            settingsButton.click();
            await new Promise(resolve => setTimeout(resolve, 150));

            const menuItems = document.querySelectorAll('.ytp-menuitem');
            let audioTrackItem = null;
            for (const item of menuItems) {
                const label = item.querySelector('.ytp-menuitem-label') || item;
                if (label && label.textContent.trim().toLowerCase().includes('audio')) {
                    audioTrackItem = item;
                    break;
                }
            }

            if (audioTrackItem) {
                audioTrackItem.click();
                await new Promise(resolve => setTimeout(resolve, 150));
                setupKeyboardMenuNavigation();
            }
        } catch (error) {
            console.error('Error navigating to audio track:', error);
        }
    }

    async function navigateToAudioTrackShorts(isCycleRequest = false) {
        try {
            // If already on the track list, cycle directly!
            if (isMenuOpen() && activeMenuElements.length > 0) {
                focusedMenuIndex = (focusedMenuIndex + 1) % activeMenuElements.length;
                activateMenuItem(focusedMenuIndex);
                return;
            }

            const activeReel = getActiveReel() || document;
            const moreButtonSelectors = [
                '#menu yt-icon-button button',
                '#menu button[aria-label*="More" i]',
                'ytd-menu-renderer yt-icon-button button',
                'ytd-menu-renderer button',
                'button[aria-label*="More actions" i]',
                'yt-icon-button[aria-label*="More actions" i] button',
                '#actions yt-icon-button button'
            ];

            let moreButton = null;
            for (const sel of moreButtonSelectors) {
                const btn = activeReel.querySelector(sel);
                if (btn && btn.offsetParent !== null) {
                    moreButton = btn;
                    break;
                }
            }

            if (!moreButton) return;

            moreButton.click();

            // Wait for menu sheet
            let audioTrackItem = null;
            const startTime = Date.now();
            while (Date.now() - startTime < 800) {
                await new Promise(resolve => setTimeout(resolve, 50));
                const items = document.querySelectorAll(
                    'ytd-popup-container yt-list-item-view-model, ' +
                    'ytd-popup-container button.ytListItemViewModelButtonOrAnchor, ' +
                    'tp-yt-iron-dropdown:not([style*="display: none"]) yt-list-item-view-model, ' +
                    'yt-sheet-view-model yt-list-item-view-model'
                );

                for (const item of items) {
                    if (item.textContent.trim().toLowerCase().includes('audio track')) {
                        audioTrackItem = item.querySelector('button') || item;
                        break;
                    }
                }
                if (audioTrackItem) break;
            }

            if (audioTrackItem) {
                audioTrackItem.click();
                await new Promise(resolve => setTimeout(resolve, 200));

                // Initialize keyboard control for the tracks list
                await setupKeyboardMenuNavigation();

                // If user specifically pressed Shift+A or quick cycle
                if (isCycleRequest && activeMenuElements.length > 0) {
                    focusedMenuIndex = (focusedMenuIndex + 1) % activeMenuElements.length;
                    activateMenuItem(focusedMenuIndex);
                }
            }
        } catch (error) {
            console.error('Error navigating to audio track in Shorts:', error);
        }
    }

    // ========================================
    // FEATURE 4: CAPTION TOGGLE (Shorts)
    // Press 'c' to open captions menu with keyboard navigation
    // Shift+'c' or pressing 'c' when open cycles captions instantly!
    // ========================================

    async function toggleCaptionsShorts(isCycleRequest = false) {
        try {
            // If already on the captions list, cycle directly!
            if (isMenuOpen() && activeMenuElements.length > 0) {
                focusedMenuIndex = (focusedMenuIndex + 1) % activeMenuElements.length;
                activateMenuItem(focusedMenuIndex);
                return;
            }

            const activeReel = getActiveReel() || document;

            // Direct on-screen CC button check (if available for single toggle)
            const ccSelectors = [
                '.ytp-subtitles-button',
                'button[aria-label*="Captions" i]',
                'button[aria-label*="Subtitles" i]',
                'yt-icon-button[aria-label*="Captions" i] button'
            ];

            for (const sel of ccSelectors) {
                const ccBtn = activeReel.querySelector(sel);
                if (ccBtn && ccBtn.offsetParent !== null) {
                    ccBtn.click();
                    return;
                }
            }

            // 3-dot menu -> Captions item
            const moreButton = activeReel.querySelector(
                '#menu yt-icon-button button, ' +
                'ytd-menu-renderer yt-icon-button button, ' +
                'button[aria-label*="More actions" i]'
            );

            if (moreButton) {
                moreButton.click();

                let captionItem = null;
                const startTime = Date.now();
                while (Date.now() - startTime < 800) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    const items = document.querySelectorAll(
                        'ytd-popup-container yt-list-item-view-model, ' +
                        'ytd-popup-container button.ytListItemViewModelButtonOrAnchor, ' +
                        'tp-yt-iron-dropdown:not([style*="display: none"]) yt-list-item-view-model, ' +
                        'yt-sheet-view-model yt-list-item-view-model'
                    );

                    for (const item of items) {
                        const text = item.textContent.toLowerCase();
                        if (text.includes('caption') || text.includes('subtitle')) {
                            captionItem = item.querySelector('button') || item;
                            break;
                        }
                    }
                    if (captionItem) break;
                }

                if (captionItem) {
                    captionItem.click();
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // Initialize keyboard control for the captions list
                    await setupKeyboardMenuNavigation();

                    if (isCycleRequest && activeMenuElements.length > 0) {
                        focusedMenuIndex = (focusedMenuIndex + 1) % activeMenuElements.length;
                        activateMenuItem(focusedMenuIndex);
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling captions in Shorts:', error);
        }
    }

    // ========================================
    // FEATURE 5: RESTART FROM BEGINNING
    // Press '0' to restart Short from start
    // ========================================

    function restartShort() {
        const video = getActiveVideo();
        if (video) {
            video.currentTime = 0;
            if (video.paused) {
                video.play().catch(() => {});
            }
            showSeekFeedback(false, '0:00');
        }
    }

    // ========================================
    // FEATURE 2: SHORTS SEEKER
    // Arrow keys to seek forward/backward with custom duration
    // ========================================

    function showSeekFeedback(isForward, customLabel) {
        const old = document.getElementById('shorts-seek-feedback');
        if (old) old.remove();

        const activeReel = getActiveReel();
        const video = getActiveVideo();
        if (!video) return;

        const referenceEl = (activeReel && activeReel.querySelector('#player-container, #player, .html5-video-player')) || video;
        const rect = referenceEl.getBoundingClientRect();

        const wrapper = document.createElement('div');
        wrapper.id = 'shorts-seek-feedback';

        const amtText = customLabel || (isForward ? `+${seekSeconds}s` : `-${seekSeconds}s`);

        const amt = document.createElement('span');
        amt.textContent = amtText;
        amt.style.cssText = `
            font-size: 24px;
            font-weight: 600;
            color: #ffffff;
            margin-right: ${isForward ? '6px' : '0px'};
            margin-left: ${isForward ? '0px' : '6px'};
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        `;

        const arrow = document.createElement('span');
        arrow.textContent = isForward ? '▶' : '◀';
        arrow.style.cssText = `
            font-size: 20px;
            font-weight: bold;
            color: #ffffff;
            display: inline-block;
            animation: ${isForward ? 'ytArrowRight' : 'ytArrowLeft'} 0.45s ease-out forwards;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        `;

        if (customLabel) {
            wrapper.appendChild(amt);
        } else {
            wrapper.appendChild(isForward ? amt : arrow);
            wrapper.appendChild(isForward ? arrow : amt);
        }

        let targetX;
        if (customLabel) {
            targetX = rect.left + rect.width * 0.5;
        } else if (isForward) {
            targetX = rect.left + rect.width * 0.75;
            if (targetX > rect.right - 60) targetX = rect.right - 60;
        } else {
            targetX = rect.left + rect.width * 0.25;
            if (targetX < rect.left + 60) targetX = rect.left + 60;
        }

        const targetY = rect.top + rect.height * 0.5;

        wrapper.style.cssText = `
            position: fixed;
            top: ${targetY}px;
            left: ${targetX}px;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(8px);
            padding: 10px 18px;
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            z-index: 9999999;
            pointer-events: none;
            opacity: 1;
            animation: ytFadeOut 0.5s ease-out forwards;
            font-family: 'YouTube Sans', Roboto, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;

        document.body.appendChild(wrapper);
        setTimeout(() => {
            if (wrapper.parentNode) wrapper.remove();
        }, 500);
    }

    const seekStyle = document.createElement('style');
    seekStyle.textContent = `
        @keyframes ytArrowRight {
            0% { transform: translateX(0px); opacity: 1; }
            100% { transform: translateX(12px); opacity: 0; }
        }
        @keyframes ytArrowLeft {
            0% { transform: translateX(0px); opacity: 1; }
            100% { transform: translateX(-12px); opacity: 0; }
        }
        @keyframes ytFadeOut {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            70% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.02); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        }
    `;
    document.head.appendChild(seekStyle);

    // ========================================
    // FEATURE 3: SHORTS TO VIDEO CONVERTER
    // Button + Ctrl+Shift+F to convert
    // ========================================

    function convertToRegularVideo() {
        if (!isShorts()) return;
        const videoId = window.location.pathname.replace('/shorts/', '').split('?')[0];
        if (videoId) {
            const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
            window.location.href = newUrl;
        }
    }

    function createConvertButton() {
        if (!isShorts()) return;

        const activeShortsPlayer = getActiveReel();
        if (!activeShortsPlayer) return;

        if (activeShortsPlayer.querySelector('#shorts-converter-wrapper')) {
            return;
        }

        const likeRenderer = activeShortsPlayer.querySelector('like-button-view-model, ytd-like-button-renderer');
        let actionPanel = likeRenderer ? likeRenderer.closest('#actions, #actions-inner, [id*="action"]') : null;

        if (!actionPanel && likeRenderer && likeRenderer.parentElement) {
            actionPanel = likeRenderer.parentElement;
        }

        if (!actionPanel) {
            actionPanel = activeShortsPlayer.querySelector(
                '#actions, ' +
                '#actions-inner, ' +
                '#side-actions, ' +
                'ytd-reel-player-overlay-renderer #actions, ' +
                '.ytd-reel-player-overlay-renderer #actions, ' +
                '.ytd-reel-player-overlay-renderer'
            );
        }

        if (!actionPanel) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'shorts-converter-wrapper';
        wrapper.className = 'style-scope ytd-reel-player-overlay-renderer';

        const button = document.createElement('button');
        button.id = 'shorts-converter-btn';
        button.className = 'shorts-converter-button';
        button.setAttribute('aria-label', 'Convert to regular video (Ctrl+Shift+F)');
        button.title = 'Convert to regular video (Ctrl+Shift+F)';

        button.innerHTML = `
            <div class="ytSpecTouchFeedbackShapeFill"></div>
            <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false">
                <g>
                    <path d="M10 10H8V8h2v2zm6 0h-2V8h2v2zm-2 2H8v-2h4v2zm6 0h-2v-2h2v2zM4 6v14h16V6H4zm14 12H6V8h12v10z"></path>
                </g>
            </svg>
        `;

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            convertToRegularVideo();
        });

        const label = document.createElement('div');
        label.className = 'label style-scope ytd-reel-player-overlay-renderer';
        label.textContent = 'Convert';

        wrapper.appendChild(button);
        wrapper.appendChild(label);

        if (likeRenderer && likeRenderer.parentElement === actionPanel) {
            actionPanel.insertBefore(wrapper, likeRenderer);
        } else if (actionPanel.firstChild) {
            actionPanel.insertBefore(wrapper, actionPanel.firstChild);
        } else {
            actionPanel.appendChild(wrapper);
        }
    }

    // ========================================
    // KEYBOARD EVENT HANDLERS (CAPTURING PHASE)
    // ========================================

    document.addEventListener('keydown', function (e) {
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable ||
            activeElement.getAttribute('role') === 'textbox'
        );

        if (isTyping) return;

        // ----------------------------------------------------
        // MENU KEYBOARD NAVIGATION (WHEN A MENU / SHEET IS OPEN)
        // ----------------------------------------------------
        if (isMenuOpen()) {
            // Keep menu elements synced
            if (activeMenuElements.length === 0) {
                activeMenuElements = getMenuItems();
            }

            // Up Arrow: Focus Previous Menu Item
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (activeMenuElements.length > 0) {
                    focusedMenuIndex = (focusedMenuIndex - 1 + activeMenuElements.length) % activeMenuElements.length;
                    updateMenuHighlight();
                }
                return;
            }

            // Down Arrow: Focus Next Menu Item
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (activeMenuElements.length > 0) {
                    focusedMenuIndex = (focusedMenuIndex + 1) % activeMenuElements.length;
                    updateMenuHighlight();
                }
                return;
            }

            // Enter / Space: Select Focused Item
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                activateMenuItem(focusedMenuIndex);
                return;
            }

            // Escape: Close Menu
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                closeMenu();
                return;
            }

            // Number keys (1-9): Direct Select Item
            if (e.key >= '1' && e.key <= '9') {
                const targetIdx = parseInt(e.key, 10) - 1;
                if (targetIdx < activeMenuElements.length) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    activateMenuItem(targetIdx);
                    return;
                }
            }

            // Pressing 'a' again while menu is open: Cycle directly to next audio track!
            if (e.key.toLowerCase() === 'a') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                focusedMenuIndex = (focusedMenuIndex + 1) % activeMenuElements.length;
                activateMenuItem(focusedMenuIndex);
                return;
            }

            // Pressing 'c' again while menu is open: Cycle directly to next caption!
            if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                focusedMenuIndex = (focusedMenuIndex + 1) % activeMenuElements.length;
                activateMenuItem(focusedMenuIndex);
                return;
            }
        }

        // ----------------------------------------------------
        // STANDARD SHORTCUTS (NORMAL PLAYBACK)
        // ----------------------------------------------------

        // Feature 1: Audio Track Navigator (press 'a' or Shift+'a')
        if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            if (isShorts()) {
                navigateToAudioTrackShorts(e.shiftKey);
            } else {
                navigateToAudioTrackVideo();
            }
            return;
        }

        // Feature 4: Caption Toggle (press 'c' or Shift+'c')
        if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (isShorts()) {
                e.preventDefault();
                e.stopPropagation();
                toggleCaptionsShorts(e.shiftKey);
            }
            return;
        }

        // Feature 5: Restart from Beginning (press '0')
        if (e.key === '0' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            if (isShorts()) {
                e.preventDefault();
                e.stopPropagation();
                restartShort();
            }
            return;
        }

        // Feature 2: Shorts Seeker (arrow keys)
        if (isShorts() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const video = getActiveVideo();
            if (!video || !isFinite(video.currentTime)) return;

            if (e.key === 'ArrowLeft') {
                video.currentTime = Math.max(0, video.currentTime - seekSeconds);
                showSeekFeedback(false);
            } else {
                const next = video.currentTime + seekSeconds;
                const max = video.duration && video.duration > 0 ? video.duration : next;
                video.currentTime = Math.min(max, next);
                showSeekFeedback(true);
            }
            return;
        }

        // Feature 3: Shorts to Video Converter (Ctrl+Shift+F)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
            e.preventDefault();
            e.stopPropagation();
            convertToRegularVideo();
            return;
        }
    }, true);

    // ========================================
    // INITIALIZATION & SPA NAVIGATION
    // ========================================

    function init() {
        createConvertButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            createConvertButton();
        }
    }).observe(document, { subtree: true, childList: true });

    const reelsList = document.querySelector('ytd-reels-web-player-page, ytd-shorts, #shorts-container');
    if (reelsList) {
        const shortsObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'is-active') {
                    createConvertButton();
                }
            });
        });

        shortsObserver.observe(reelsList, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['is-active']
        });
    }

    setInterval(createConvertButton, 500);

    console.log('Fix YT Shorts by Pramod Beema - All features active (v1.4)!');
})();
