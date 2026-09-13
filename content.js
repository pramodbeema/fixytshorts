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
    let autoScrollEnabled = false;

    function loadExtensionSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get({ seekDuration: 5, autoScroll: false }, (res) => {
                if (res) {
                    if (res.seekDuration) seekSeconds = parseInt(res.seekDuration, 10) || 5;
                    autoScrollEnabled = Boolean(res.autoScroll);
                }
            });
        } else {
            const stored = localStorage.getItem('seekDuration');
            if (stored) seekSeconds = parseInt(stored, 10) || 5;
            autoScrollEnabled = localStorage.getItem('autoScroll') === 'true';
        }
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
                if (changes.seekDuration) {
                    seekSeconds = parseInt(changes.seekDuration.newValue, 10) || 5;
                }
                if (changes.autoScroll !== undefined) {
                    autoScrollEnabled = Boolean(changes.autoScroll.newValue);
                }
            }
        });
    }

    loadExtensionSettings();

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

    function showCenterHUD(text) {
        const old = document.getElementById('shorts-center-hud');
        if (old) old.remove();

        const activeReel = getActiveReel();
        const video = getActiveVideo();
        const ref = (activeReel && activeReel.querySelector('#player-container, #player, .html5-video-player')) || video;
        if (!ref) return;

        const rect = ref.getBoundingClientRect();
        const wrapper = document.createElement('div');
        wrapper.id = 'shorts-center-hud';
        wrapper.textContent = text;
        wrapper.style.cssText = `
            position: fixed;
            top: ${rect.top + rect.height * 0.5}px;
            left: ${rect.left + rect.width * 0.5}px;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            padding: 12px 24px;
            border-radius: 28px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #ffffff;
            font-size: 22px;
            font-weight: 600;
            font-family: 'YouTube Sans', Roboto, Arial, sans-serif;
            z-index: 9999999;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 16px rgba(0,0,0,0.6);
            animation: ytFadeOut 0.65s ease-out forwards;
        `;

        document.body.appendChild(wrapper);
        setTimeout(() => {
            if (wrapper.parentNode) wrapper.remove();
        }, 650);
    }

    // ========================================
    // FEATURE 8: AUTO-SCROLL (HANDS-FREE MODE)
    // ========================================
    function scrollToNextShort() {
        if (!isShorts() || !autoScrollEnabled) return;
        const nextButton = document.querySelector(
            '#navigation-button-down button, ' +
            'ytd-shorts [aria-label*="Next video" i], ' +
            'button[aria-label*="Next video" i]'
        );
        if (nextButton) {
            nextButton.click();
            return;
        }

        // Fallback: keyboard down dispatch
        window.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true
        }));
    }

    let lastVideoAttached = null;
    function checkAutoScroll() {
        if (!isShorts()) return;
        const video = getActiveVideo();
        if (!video) return;

        if (video !== lastVideoAttached) {
            lastVideoAttached = video;
            // Attach end-of-video listener to scroll when enabled
            video.addEventListener('ended', () => {
                if (autoScrollEnabled) scrollToNextShort();
            });
            video.addEventListener('timeupdate', () => {
                if (autoScrollEnabled && video.duration > 1 && video.currentTime >= video.duration - 0.3) {
                    scrollToNextShort();
                }
            });
        }
    }

    setInterval(checkAutoScroll, 500);

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
    // SHARED: BUILD CLONED NATIVE-STYLE BUTTON
    // ========================================

    function buildClonedButton(nativeHolder, id, ariaLabel, svgPath, labelText, onClickFn) {
        let wrapper;
        if (nativeHolder) {
            wrapper = nativeHolder.cloneNode(true);
            wrapper.id = id;

            const button = wrapper.querySelector('button');
            if (button) {
                button.id = id + '-btn';
                button.setAttribute('aria-label', ariaLabel);
                button.title = ariaLabel;
                button.removeAttribute('disabled');
                // Ensure our CSS background selector matches
                button.classList.add('shorts-fyt-button');

                const iconWrapper = button.querySelector('.ytSpecButtonShapeNextIcon') || button.querySelector('yt-icon') || button;
                if (iconWrapper) {
                    if (typeof iconWrapper.replaceChildren === 'function') {
                        iconWrapper.replaceChildren();
                    } else {
                        while (iconWrapper.firstChild) iconWrapper.removeChild(iconWrapper.firstChild);
                    }
                    iconWrapper.style.cssText = 'position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;';

                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 24 24');
                    svg.setAttribute('width', '24');
                    svg.setAttribute('height', '24');
                    svg.style.cssText = 'display: block; width: 24px; height: 24px; fill: rgb(241, 241, 241); pointer-events: none;';
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', svgPath);
                    path.setAttribute('fill', 'rgb(241, 241, 241)');
                    svg.appendChild(path);
                    iconWrapper.appendChild(svg);
                }
                button.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClickFn(wrapper, button); });
            }

            // Update label
            const labelEl = wrapper.querySelector('label, [class*="label"], .ytSpecButtonShapeWithLabelHost') || wrapper;
            const walker = document.createTreeWalker(labelEl, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while ((node = walker.nextNode())) {
                if (node.textContent.trim().length > 0) { node.textContent = labelText; break; }
            }
        } else {
            // Standalone fallback
            wrapper = document.createElement('div');
            wrapper.id = id;
            wrapper.className = 'style-scope ytd-reel-player-overlay-renderer';

            const button = document.createElement('button');
            button.id = id + '-btn';
            button.className = 'shorts-fyt-button ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeL ytSpecButtonShapeNextIconButton ytSpecButtonShapeNextEnableBackdropFilterExperiment ytSpecButtonShapeNextMainstageIconSize ytSpecButtonShapeNextMainstagePadding';
            button.setAttribute('aria-label', ariaLabel);
            button.title = ariaLabel;

            const iconDiv = document.createElement('div');
            iconDiv.className = 'ytSpecButtonShapeNextIcon ytSpecButtonShapeNextElevatedContent';
            iconDiv.style.cssText = 'position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;';

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '24');
            svg.style.cssText = 'display: block; width: 24px; height: 24px; fill: rgb(241, 241, 241); pointer-events: none;';
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', svgPath);
            path.setAttribute('fill', 'rgb(241, 241, 241)');
            svg.appendChild(path);
            iconDiv.appendChild(svg);
            button.appendChild(iconDiv);
            button.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClickFn(wrapper, button); });

            const label = document.createElement('div');
            label.className = 'label style-scope ytd-reel-player-overlay-renderer';
            label.textContent = labelText;
            wrapper.appendChild(button);
            wrapper.appendChild(label);
        }
        return wrapper;
    }

    // ========================================
    // FEATURE 8: AUTO-SCROLL BUTTON (in action bar)
    // ========================================

    // Auto-scroll repeat icon SVG path
    const AUTO_SCROLL_SVG = 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z';
    // Convert icon SVG path
    const CONVERT_SVG = 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z';

    function updateAutoScrollButtonState(wrapper) {
        if (!wrapper) return;
        if (autoScrollEnabled) {
            wrapper.classList.add('fyt-autoscroll-active');
            wrapper.setAttribute('data-autoscroll', 'on');
        } else {
            wrapper.classList.remove('fyt-autoscroll-active');
            wrapper.setAttribute('data-autoscroll', 'off');
        }
    }

    function createAutoScrollButton(retryCount = 0) {
        if (!isShorts()) return;

        const activeShortsPlayer = getActiveReel();
        if (!activeShortsPlayer) return;

        if (activeShortsPlayer.querySelector('#shorts-autoscroll-wrapper')) return;

        const likeRenderer = activeShortsPlayer.querySelector('like-button-view-model, ytd-like-button-renderer');
        let actionPanel = likeRenderer ? likeRenderer.closest('#actions, #actions-inner, [id*="action"]') : null;
        if (!actionPanel && likeRenderer && likeRenderer.parentElement) actionPanel = likeRenderer.parentElement;
        if (!actionPanel) {
            actionPanel = activeShortsPlayer.querySelector(
                '#actions, #actions-inner, #side-actions, ' +
                'ytd-reel-player-overlay-renderer #actions, .ytd-reel-player-overlay-renderer #actions'
            );
        }
        if (!actionPanel) return;

        const nativeHolder = (likeRenderer && likeRenderer.querySelector('button'))
            ? likeRenderer
            : actionPanel.querySelector('like-button-view-model, share-button-view-model, ytd-like-button-renderer, ytd-share-button-renderer');

        if (!nativeHolder && retryCount < 10) {
            setTimeout(() => createAutoScrollButton(retryCount + 1), 100);
            return;
        }

        const wrapper = buildClonedButton(
            nativeHolder,
            'shorts-autoscroll-wrapper',
            'Toggle Auto-Scroll',
            AUTO_SCROLL_SVG,
            'Auto',
            (wrapperEl) => {
                autoScrollEnabled = !autoScrollEnabled;
                updateAutoScrollButtonState(wrapperEl);
                // Persist
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ autoScroll: autoScrollEnabled });
                } else {
                    localStorage.setItem('autoScroll', autoScrollEnabled ? 'true' : 'false');
                }
                if (autoScrollEnabled) {
                    // Go to next short immediately — no need to replay from beginning
                    showCenterHUD('\uD83D\uDD01 Auto-Scroll ON');
                    setTimeout(() => scrollToNextShort(), 500);
                } else {
                    showCenterHUD('\u23F9 Auto-Scroll OFF');
                }
            }
        );

        // Position above the Convert button wrapper if it exists, else above likeRenderer
        const convertWrapper = actionPanel.querySelector('#shorts-converter-wrapper');
        if (convertWrapper) {
            actionPanel.insertBefore(wrapper, convertWrapper);
        } else if (likeRenderer && likeRenderer.parentElement === actionPanel) {
            actionPanel.insertBefore(wrapper, likeRenderer);
        } else if (actionPanel.firstChild) {
            actionPanel.insertBefore(wrapper, actionPanel.firstChild);
        } else {
            actionPanel.appendChild(wrapper);
        }

        updateAutoScrollButtonState(wrapper);
    }

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

    function createConvertButton(retryCount = 0) {
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

        // Try cloning native button template for 100% authentic 3D light & wash effect
        // If native buttons haven't rendered yet (common right after navigation), retry up to 10x
        const nativeHolder = (likeRenderer && likeRenderer.querySelector('button'))
            ? likeRenderer
            : actionPanel.querySelector('like-button-view-model, share-button-view-model, ytd-like-button-renderer, ytd-share-button-renderer');

        if (!nativeHolder && retryCount < 10) {
            setTimeout(() => createConvertButton(retryCount + 1), 100);
            return;
        }

        const wrapper = buildClonedButton(
            nativeHolder,
            'shorts-converter-wrapper',
            'Convert to regular video (Ctrl+Shift+F)',
            CONVERT_SVG,
            'Convert',
            () => convertToRegularVideo()
        );

        // Insert: above likeRenderer (auto-scroll button goes above this)
        if (likeRenderer && likeRenderer.parentElement === actionPanel) {
            actionPanel.insertBefore(wrapper, likeRenderer);
        } else if (actionPanel.firstChild) {
            actionPanel.insertBefore(wrapper, actionPanel.firstChild);
        } else {
            actionPanel.appendChild(wrapper);
        }

        // Now ensure auto-scroll button is above convert (create if not present)
        if (!actionPanel.querySelector('#shorts-autoscroll-wrapper')) {
            createAutoScrollButton();
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
            if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
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
            if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
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


        // Feature 7: Playback Speed Controls for Shorts (Shift + > / Shift + < or > / <)
        if (isShorts() && (e.key === '>' || e.key === '<' || (e.shiftKey && (e.key === '.' || e.key === ',')))) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const activeVid = getActiveVideo();
            if (activeVid) {
                const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
                const current = Math.round(activeVid.playbackRate * 100) / 100;
                let newRate;

                if (e.key === '>' || e.key === '.') {
                    newRate = speeds.find(s => s > current + 0.01) || 2.0;
                } else {
                    const reverse = [...speeds].reverse();
                    newRate = reverse.find(s => s < current - 0.01) || 0.25;
                }

                document.querySelectorAll('video').forEach(v => { v.playbackRate = newRate; });
                showCenterHUD(`⚡ ${newRate}x`);
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
        createAutoScrollButton();
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
            createAutoScrollButton();
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

    function createBothButtons() {
        createConvertButton();
        createAutoScrollButton();
        // Re-sync auto-scroll button visual state after navigation
        const activeReel = getActiveReel();
        if (activeReel) {
            const asw = activeReel.querySelector('#shorts-autoscroll-wrapper');
            updateAutoScrollButtonState(asw);
        }
    }

    setInterval(createBothButtons, 500);

    console.log('Fix YT Shorts by Pramod Beema - All features active (v1.6)!');
})();
