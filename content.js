// Fix YT Shorts Extension
// Created by: Pramod Beema (https://github.com/pramodbeema)
// Combines: Audio Track Navigator + Shorts Seeker + Shorts to Video Converter
//
// IMPORTANT: For Audio Track Navigation, use mouse/trackpad to select the desired
// audio track from the menu. Keyboard navigation is not supported for track selection.

(function () {
    'use strict';

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    function isShorts() {
        return window.location.pathname.includes('/shorts/');
    }

    function getActiveVideo() {
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
        for (const v of vids) if (!v.paused || v.currentTime > 0) return v;
        return vids[0];
    }

    // ========================================
    // FEATURE 1: AUDIO TRACK NAVIGATOR (by Pramod Beema)
    // Press 'a' to open audio track menu
    // NOTE: Use mouse/trackpad to select tracks - keyboard selection not supported
    // ========================================

    async function navigateToAudioTrackVideo() {
        try {
            const settingsButton = document.querySelector('.ytp-settings-button');
            if (!settingsButton) return;

            settingsButton.click();
            await new Promise(resolve => setTimeout(resolve, 100));

            const menuItems = document.querySelectorAll('.ytp-menuitem');
            let audioTrackItem = null;
            for (const item of menuItems) {
                const label = item.querySelector('.ytp-menuitem-label');
                if (label && label.textContent.trim().toLowerCase().includes('audio')) {
                    audioTrackItem = item;
                    break;
                }
            }

            if (audioTrackItem) {
                audioTrackItem.click();
            } else {
                settingsButton.click();
            }
        } catch (error) {
            console.error('Error navigating to audio track:', error);
        }
    }

    async function navigateToAudioTrackShorts() {
        try {
            const activeReel = document.querySelector('ytd-reel-video-renderer[is-active]');
            if (!activeReel) return;

            const moreButton = activeReel.querySelector('ytd-menu-renderer button');
            if (!moreButton) return;

            moreButton.click();
            await new Promise(resolve => setTimeout(resolve, 300));

            const allPossibleSelectors = [
                'ytd-menu-popup-renderer ytd-menu-service-item-renderer',
                'ytd-menu-popup-renderer tp-yt-paper-listbox > *',
                'tp-yt-paper-listbox ytd-menu-service-item-renderer',
                'ytd-menu-service-item-renderer'
            ];

            let allMenuItems = [];
            for (const selector of allPossibleSelectors) {
                const items = document.querySelectorAll(selector);
                if (items.length > 0) {
                    allMenuItems = items;
                    if (items.length > 3) break;
                }
            }

            let audioTrackItem = null;
            for (const item of allMenuItems) {
                const text = item.textContent.trim();
                if (text.toLowerCase().includes('audio track')) {
                    audioTrackItem = item;
                    break;
                }
            }

            if (audioTrackItem) {
                audioTrackItem.click();
            } else {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
            }
        } catch (error) {
            console.error('Error navigating to audio track in Shorts:', error);
        }
    }

    // ========================================
    // FEATURE 4: CAPTION TOGGLE (Shorts)
    // Press 'c' to toggle captions
    // ========================================

    async function toggleCaptionsShorts() {
        try {
            const activeReel = document.querySelector('ytd-reel-video-renderer[is-active]');
            if (!activeReel) return;

            // Try finding the CC button directly in the player controls
            // The selector might vary, looking for common attributes
            const buttons = activeReel.querySelectorAll('button');
            let ccButton = null;

            for (const btn of buttons) {
                const label = btn.getAttribute('aria-label') || btn.title || '';
                if (label.toLowerCase().includes('caption') || label.toLowerCase().includes('subtitles')) {
                    ccButton = btn;
                    break;
                }
            }

            if (ccButton) {
                ccButton.click();
                return;
            }

            // If not found directly, it might be in the "More actions" menu
            // But usually, for Shorts, it's either on the overlay or in the 3-dot menu.
            // Let's try the 3-dot menu approach if direct button fails.

            const moreButton = activeReel.querySelector('ytd-menu-renderer button');
            if (moreButton) {
                moreButton.click();
                await new Promise(resolve => setTimeout(resolve, 100));

                // Look for "Captions" in the menu
                const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item');
                let captionItem = null;

                for (const item of menuItems) {
                    if (item.textContent.toLowerCase().includes('caption') || item.textContent.toLowerCase().includes('subtitles')) {
                        captionItem = item;
                        break;
                    }
                }

                if (captionItem) {
                    captionItem.click();
                } else {
                    // Close menu if not found
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
                }
            }

        } catch (error) {
            console.error('Error toggling captions in Shorts:', error);
        }
    }

    // ========================================
    // FEATURE 2: SHORTS SEEKER
    // Arrow keys to seek forward/backward
    // ========================================

    const SEEK_SECONDS = 5;

    function showSeekFeedback(isForward) {
        const old = document.getElementById('shorts-seek-feedback');
        if (old) old.remove();

        const video = getActiveVideo();
        if (!video) return;

        const rect = video.getBoundingClientRect();
        const wrapper = document.createElement('div');
        wrapper.id = 'shorts-seek-feedback';

        const amt = document.createElement('span');
        amt.textContent = isForward ? `+${SEEK_SECONDS}` : `-${SEEK_SECONDS}`;
        amt.style.cssText = `
      font-size: 27px;
      font-weight: 360;
      color: white;
      margin-right: ${isForward ? '6px' : '0px'};
      margin-left: ${isForward ? '0px' : '6px'};
    `;

        const arrow = document.createElement('span');
        arrow.textContent = isForward ? '>' : '<';
        arrow.style.cssText = `
      font-size: 27px;
      font-weight: 360;
      color: white;
      display: inline-block;
      animation: ${isForward ? 'ytArrowRight' : 'ytArrowLeft'} 0.50s ease-out forwards;
    `;

        wrapper.appendChild(isForward ? amt : arrow);
        wrapper.appendChild(isForward ? arrow : amt);

        const xPos = isForward
            ? rect.left + rect.width * 0.81
            : rect.left + rect.width * 0.18;

        wrapper.style.cssText = `
      position: fixed;
      top: ${rect.top + rect.height * 0.50}px;
      left: ${xPos}px;
      transform: translate(-50%, -50%);
      z-index: 999999;
      pointer-events: none;
      opacity: 1;
      animation: ytFadeOut 0.45s ease-out forwards;
      font-family: Roboto, Arial, sans-serif;
    `;

        document.body.appendChild(wrapper);
        setTimeout(() => wrapper.remove(), 500);
    }

    // Add seek animations
    const seekStyle = document.createElement('style');
    seekStyle.textContent = `
    @keyframes ytArrowRight {
      0% { transform: translateX(0px); opacity: 1; }
      100% { transform: translateX(22px); opacity: 0; }
    }
    @keyframes ytArrowLeft {
      0% { transform: translateX(0px); opacity: 1; }
      100% { transform: translateX(-22px); opacity: 0; }
    }
    @keyframes ytFadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; }
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
        const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
        window.location.href = newUrl;
    }

    function createConvertButton() {
        if (!isShorts()) return;

        const activeShortsPlayer = document.querySelector('ytd-reel-video-renderer[is-active]');
        if (activeShortsPlayer && activeShortsPlayer.querySelector('#shorts-converter-wrapper')) {
            return;
        }

        const actionPanel = activeShortsPlayer ? activeShortsPlayer.querySelector('#actions') : null;
        if (!actionPanel) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'shorts-converter-wrapper';
        wrapper.className = 'style-scope ytd-reel-player-overlay-renderer';

        const button = document.createElement('button');
        button.id = 'shorts-converter-btn';
        button.className = 'shorts-converter-button';
        button.setAttribute('aria-label', 'Convert to regular video');
        button.title = 'Convert to regular video (Ctrl+Shift+F)';

        button.innerHTML = `
      <div class="style-scope ytd-reel-player-overlay-renderer">
        <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="fill: white;">
          <g>
            <path d="M10 10H8V8h2v2zm6 0h-2V8h2v2zm-2 2H8v-2h4v2zm6 0h-2v-2h2v2zM4 6v14h16V6H4zm14 12H6V8h12v10z"></path>
          </g>
        </svg>
      </div>
    `;

        button.addEventListener('click', convertToRegularVideo);

        const label = document.createElement('div');
        label.className = 'label style-scope ytd-reel-player-overlay-renderer';
        label.textContent = 'Convert';

        wrapper.appendChild(button);
        wrapper.appendChild(label);
        actionPanel.insertBefore(wrapper, actionPanel.firstChild);
    }

    // ========================================
    // KEYBOARD EVENT HANDLERS
    // ========================================

    document.addEventListener('keydown', function (e) {
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );

        // Feature 1: Audio Track Navigator (press 'a')
        if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !isTyping) {
            e.preventDefault();
            e.stopPropagation();
            if (isShorts()) {
                navigateToAudioTrackShorts();
            } else {
                navigateToAudioTrackVideo();
            }
            return;
        }

        // Feature 4: Caption Toggle (press 'c')
        if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !isTyping) {
            if (isShorts()) {
                e.preventDefault();
                e.stopPropagation();
                toggleCaptionsShorts();
            }
            // For regular videos, let native YouTube behavior handle 'c'
            return;
        }

        // Feature 2: Shorts Seeker (arrow keys)
        if (isShorts() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isTyping) {
            e.preventDefault();
            e.stopPropagation();

            const video = getActiveVideo();
            if (!video || !isFinite(video.currentTime)) return;

            if (e.key === 'ArrowLeft') {
                video.currentTime = Math.max(0, video.currentTime - SEEK_SECONDS);
                showSeekFeedback(false);
            } else {
                const next = video.currentTime + SEEK_SECONDS;
                const max = video.duration && video.duration > 0 ? video.duration : next;
                video.currentTime = Math.min(max, next);
                showSeekFeedback(true);
            }
            return;
        }

        // Feature 3: Shorts to Video Converter (Ctrl+Shift+F)
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
            e.preventDefault();
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

    // URL change observer
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            createConvertButton();
        }
    }).observe(document, { subtree: true, childList: true });

    // Shorts player observer
    const reelsList = document.querySelector('ytd-reels-web-player-page, ytd-shorts');
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

    // Fallback interval check
    setInterval(createConvertButton, 500);

    console.log('Fix YT Shorts by Pramod Beema - All features active!');
})();
