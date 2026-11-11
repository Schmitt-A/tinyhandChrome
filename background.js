/**
 * TinyHand for Chrome - Background Service Worker
 * Manages defaults, keyboard commands, and badge status.
 */

const DEFAULT_SETTINGS = {
  enabled: false,           // On-demand default
  style: "lavender",        // Authentic TinyHand signature default
  size: 160,                // px (authentic prominent TinyHand size)
  rodWidth: 7,              // px (width of pointer rod)
  shadowIntensity: 50,      // % (depth shadow under hand and rod)
  color: "#8E5AF7",         // Default purple matching Lavender hand
  strokeWidth: 4,           // px
  fadeDuration: 3000,       // 3 seconds auto-fade
  drawModifier: "shift",    // "shift" | "alt" | "always"
  hideNativeCursor: true,   // Hide standard mouse cursor behind hand
  stickOrigin: "bottom-right", // "bottom-right" | "bottom-left" | "dynamic" | "floating"
  floatingAngle: -15,       // deg (tilt angle for floating mode)
  floatingDynamic: true,    // dynamically tilt floating hand according to movement & position
  idleAnimation: true,      // Master switch for animations
  animMotionStrength: 100,  // % (movement inertia & tilt strength)
  animBreatheStrength: 100, // % (idle breathing & float strength)
  customImage: null,        // Data URL if uploaded
  customHotspot: { x: 0.5, y: 0.2 }, // Relative hotspot (0..1)
  customAspect: 1.4         // Aspect ratio width/height
};

// Pinned styles from nilbuild/tinyhand default toolbar
const STYLES = ["lavender", "glove", "coral", "plush", "robot", "laser"];

// Force Chrome to refresh action icon in toolbar and pinned menu
async function refreshIcon() {
  try {
    await chrome.action.setIcon({
      path: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      }
    });
  } catch (err) {
    console.warn("Icon refresh failed:", err);
  }
}

// Initialize settings on installation
chrome.runtime.onInstalled.addListener(async () => {
  await refreshIcon();
  const existing = await chrome.storage.local.get(null);
  const toSet = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (existing[key] === undefined) {
      toSet[key] = value;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
  await updateBadge(existing.enabled ?? DEFAULT_SETTINGS.enabled);
});

refreshIcon();

// Update extension icon badge
async function updateBadge(enabled) {
  try {
    if (enabled) {
      await chrome.action.setBadgeText({ text: "ON" });
      await chrome.action.setBadgeBackgroundColor({ color: "#34C759" });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch (err) {
    console.warn("Badge update failed:", err);
  }
}

// React to storage changes (e.g. from popup toggle)
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "local" && changes.enabled !== undefined) {
    await updateBadge(changes.enabled.newValue);
  }
});

// Handle keyboard shortcuts (Alt+H, Alt+C, Alt+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-tinyhand") {
    const { enabled = false } = await chrome.storage.local.get("enabled");
    const nextState = !enabled;
    await chrome.storage.local.set({ enabled: nextState });
    await updateBadge(nextState);

    // Send visual notification toast to active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TINYHAND_TOAST",
        message: nextState ? "tinyhandChrome: Aktiviert (Shift+Ziehen zum Zeichnen)" : "tinyhandChrome: Deaktiviert"
      }).catch(() => {});
    }
  } else if (command === "clear-drawings") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "CLEAR_DRAWINGS" }).catch(() => {});
    }
  } else if (command === "switch-style") {
    const { style = "classic" } = await chrome.storage.local.get("style");
    const currentIndex = STYLES.indexOf(style);
    const nextIndex = (currentIndex + 1) % STYLES.length;
    const nextStyle = STYLES[nextIndex];
    await chrome.storage.local.set({ style: nextStyle });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TINYHAND_TOAST",
        message: `tinyhandChrome Stil: ${nextStyle}`
      }).catch(() => {});
    }
  }
});
