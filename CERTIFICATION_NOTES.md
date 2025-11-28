This extension enhances the YouTube Shorts and Video experience and does not require any user accounts or login credentials. It works on publicly available YouTube content.

**Testing Instructions:**

1.  **Audio Track Navigator:**
    *   Navigate to any YouTube video (regular or Short) that has multiple audio tracks (e.g., many "MrBeast" videos).
    *   Press the **'a'** key on your keyboard.
    *   **Expected Result:** The native YouTube audio track selection menu should open, allowing you to select a track with your mouse.

2.  **Shorts Seeker:**
    *   Navigate to any YouTube Short (e.g., `youtube.com/shorts/...`).
    *   Press the **Left Arrow** or **Right Arrow** keys.
    *   **Expected Result:** The video should seek backward or forward by 5 seconds, and a visual indicator (e.g., "« 5s" or "5s »") should appear briefly on the screen.

3.  **Shorts to Video Converter:**
    *   Navigate to any YouTube Short.
    *   Press **Ctrl+Shift+F** (or **Command+Shift+F** on macOS).
    *   **Expected Result:** The page should reload/redirect to the standard YouTube video player interface (`youtube.com/watch?v=...`) for that same video.

4.  **Caption Toggle:**
    *   Navigate to any YouTube Short.
    *   Press the **'c'** key.
    *   **Expected Result:** Captions/Subtitles should toggle on or off. You should see the caption text appear/disappear or the "CC" button state change.

**Dependencies:**
*   This extension depends on the YouTube website structure to function. It interacts with the DOM to trigger native menus and controls.
