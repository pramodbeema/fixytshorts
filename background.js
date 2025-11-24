// Fix YT Shorts - Background Service Worker
// Created by: Pramod Beema (https://github.com/pramodbeema)
// Listen for the keyboard command
chrome.commands.onCommand.addListener((command) => {
  if (command === 'convert-short') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('/shorts/')) {
        const videoId = tabs[0].url.split('/shorts/')[1].split('?')[0];
        const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
        chrome.tabs.update(tabs[0].id, { url: newUrl });
      }
    });
  }
});