# Fix YT Shorts (v1.6)

**A powerful Chrome extension to fix and enhance the YouTube Shorts experience with 7 essential features: hands-free auto-scroll, playback speed controls, audio navigation, seeking controls, caption toggle, restart from beginning, and video conversion.**

Created by **Pramod Beema**

## 🎯 7 Essential Features

### 1. 🔁 Hands-Free Auto-Scroll
Click the on-screen **Auto** button in YouTube Shorts to automatically scroll to the next Short when the current one finishes. If toggled mid-video, it smoothly transitions to the next Short.

### 2. ⚡ Playback Speed Controls
Adjust playback speed using **>** (speed up) and **<** (slow down) from 0.25x up to 2.0x with on-screen speed feedback.

### 3. 🎧 Audio Track Navigator
Press **'a'** to instantly open the audio track selection menu with **full keyboard navigation** (`↑` / `↓` + `Enter`, number keys `1`–`9`, or press **'a'** again to cycle through tracks). Arrow navigation is strictly isolated so it will never scroll your Short!

### 4. ⏩ Shorts Seeker (Customizable Duration)
Use **arrow keys** (← →) to seek in YouTube Shorts with native-style visual feedback. Set your desired seek duration in seconds directly in the extension popup (slider or 2s, 5s, 10s, 15s quick chips).

### 5. 🔄 Shorts to Video Converter
Convert YouTube Shorts to regular video format with a click on the YouTube-native on-screen button or the **Ctrl+Shift+F** keyboard shortcut.

### 6. 💬 Caption Toggle
Press **'c'** to toggle or select captions in YouTube Shorts with full keyboard support (`↑` / `↓` + `Enter` or press **'c'** again to cycle).

### 7. ⏮️ Restart from Beginning
Press **'0'** to restart the current Short from the beginning (`0:00`), matching YouTube's native behavior for regular videos.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **&gt;** / **&lt;** (or Shift + . / ,) | Speed Up / Slow Down playback (0.25x – 2.0x) |
| **a** | Open audio track menu / cycle audio tracks |
| **c** | Toggle / cycle Captions in Shorts |
| **0** | Restart Short from beginning (`0:00`) |
| **← →** | Seek in Shorts (custom duration from settings) |
| **Ctrl+Shift+F** | Convert Short to regular video |
| **↑ ↓** | Navigate menu items when Audio/Captions menu is open |
| **Enter** / **Space** | Select focused menu item |
| **1 – 9** | Directly select track / caption item by index |
| **Escape** | Dismiss menu without changing |

## 📥 Installation
### Chrome Web Store
[**Install Fix YT Shorts from the Chrome Web Store**](https://chromewebstore.google.com/detail/fix-yt-shorts-by-pramod-b/kcnepcpcdokdicblglohbfnokiddgjla)
### Manual installation:
1. Download or clone this repository
2. Open Chrome/Edge/Brave/Opera → `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select this folder
6. Done! 🎉

## 🆕 What's New in v1.6
- **Hands-Free Auto-Scroll**: Dedicated on-screen toggle button above Convert button. Seamlessly moves to next video upon finish or immediately when enabled.
- **Speed Adjustment**: `>` and `<` hotkeys to fine-tune playback rate with center HUD indicator.
- **Synced Popup & On-Screen UI**: Cleaned popup with complete shortcut guide.

## 🆕 What's New in v1.5
- **Native Action Button Integration**: Completely aligned the Convert button with YouTube's authentic Shorts action button architecture. It now inherits YouTube's genuine 3D specular rim light, ambient wash layers, and smooth non-scaling hover transitions.
- **Symmetric Convert Icon**: Replaced the previous blocky tile icon with YouTube's clean, symmetric video convert cycle icon (`viewBox="0 0 24 24"`).
- **Pixel-Perfect Spacing**: Calibrated action bar vertical spacing to exactly 9px, ensuring consistent alignment with native Like, Comment, and Share buttons.
- **Strict Trusted Types Compliance**: Refactored DOM injection to fully respect YouTube's Trusted Types policy without innerHTML violations.

## 🆕 What's New in v1.4
- **Full Keyboard Menu Navigation**: Audio Track and Caption menus now support arrow keys (`↑` / `↓`) and `Enter`, number keys (`1`–`9`), or quick cycling with `a` / `c` without requiring a mouse.
- **Playback Protection**: Arrow navigation inside menus strictly traps keyboard events so the background Short never scrolls or changes video.
- **Customizable Seek Duration**: Configure your preferred seek duration in the extension popup with instant sync.
- **Clamped Seek Overlay**: Visual feedback is kept strictly inside the Shorts player viewport.
- **Modern YouTube Action Button**: The on-screen Convert button matches YouTube's latest UI layout, typography, and contrast.

## 🔧 Technical Details

- **Manifest Version**: 3
- **Permissions**: activeTab, storage, YouTube host permissions
- **Works on**: All Chromium-based browsers, including but not limited to:
  - Google Chrome
  - Microsoft Edge
  - Brave
  - Opera
  - Vivaldi

## 👤 Author

**Pramod Beema**  
GitHub: [@pramodbeema](https://github.com/pramodbeema)

## 📝 License

MIT License - feel free to use and modify!

---

⭐ If you find this extension useful, please star this repository!
