/**
 * tinyhandChrome - Background Service Worker (MV3)
 * Manages defaults, keyboard commands, live tab injection, auto-enable domains, and badge status.
 */

importScripts("content/geometry.js");

const GEO = globalThis.__TINYHAND_GEO__;
const DEFAULT_SETTINGS = GEO.DEFAULT_SETTINGS;

function t(key, substitutions, fallback) {
  try {
    const msg = chrome.i18n?.getMessage?.(key, substitutions);
    if (msg) return msg;
  } catch (_) {}
  return fallback;
}

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

function isInjectableUrl(url) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://");
}

async function injectIntoTab(tabId) {
  if (!tabId) return false;
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["content/geometry.js", "content/content.js"]
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function injectIntoOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
      if (tab.id && isInjectableUrl(tab.url)) {
        await injectIntoTab(tab.id);
      }
    }
  } catch (err) {
    console.warn("Open-tab injection skipped:", err);
  }
}

async function sendToActiveTabWithInject(tab, message) {
  if (!tab?.id) return false;
  try {
    await chrome.tabs.sendMessage(tab.id, message);
    return true;
  } catch (_) {
    if (tab.url && !isInjectableUrl(tab.url)) return false;
    const injected = await injectIntoTab(tab.id);
    if (!injected) return false;
    try {
      await chrome.tabs.sendMessage(tab.id, message);
      return true;
    } catch (_) {
      return false;
    }
  }
}

async function ensureActiveTabInjected() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "PING" });
    return tab;
  } catch (_) {
    if (tab.url && !isInjectableUrl(tab.url)) return null;
    const ok = await injectIntoTab(tab.id);
    return ok ? tab : null;
  }
}

async function markHostDismissed(host, dismissed) {
  if (!host || !chrome.storage.session) return;
  try {
    const { dismissedAutoHosts = {} } = await chrome.storage.session.get("dismissedAutoHosts");
    const next = { ...dismissedAutoHosts };
    if (dismissed) {
      next[host] = true;
    } else {
      delete next[host];
    }
    await chrome.storage.session.set({ dismissedAutoHosts: next });
  } catch (_) {}
}

async function getActiveTabHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  if (tab.url) {
    try {
      return new URL(tab.url).hostname.toLowerCase();
    } catch (_) {}
  }
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_HOST" });
    return res?.host || null;
  } catch (_) {
    return null;
  }
}

// Initialize missing default settings and inject into open tabs on install/update
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
  await injectIntoOpenTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await refreshIcon();
  const { enabled = false } = await chrome.storage.local.get("enabled");
  await updateBadge(enabled);
  await injectIntoOpenTabs();
});

refreshIcon();

// React to storage changes (e.g. from popup toggle or domain auto-enable)
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.enabled !== undefined) {
    const nextEnabled = Boolean(changes.enabled.newValue);
    await updateBadge(nextEnabled);
    if (nextEnabled) {
      await ensureActiveTabInjected();
    }
    const host = await getActiveTabHost();
    if (host) {
      await markHostDismissed(host, !nextEnabled);
    }
  }
  if (changes.spotlight?.newValue === true) {
    await ensureActiveTabInjected();
  }
});

// Messages from Popup or Content Script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== "string") return false;

  if (msg.type === "ENSURE_ACTIVE_TAB_INJECTED") {
    (async () => {
      const tab = await ensureActiveTabInjected();
      sendResponse({ ok: Boolean(tab), tabId: tab?.id || null });
    })();
    return true;
  }

  if (msg.type === "RELAY_ACTIVE_TAB_ACTION") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const ok = await sendToActiveTabWithInject(tab, msg.payload);
      sendResponse({ ok });
    })();
    return true;
  }

  if (msg.type === "AUTO_ENABLE_DOMAIN") {
    (async () => {
      const host = GEO.normalizeHostname(msg.host);
      if (!host) {
        sendResponse({ activated: false });
        return;
      }
      const { enabled = false, autoEnableDomains = [] } = await chrome.storage.local.get([
        "enabled",
        "autoEnableDomains"
      ]);
      if (enabled || !GEO.isHostnameMatch(host, autoEnableDomains)) {
        sendResponse({ activated: false });
        return;
      }
      let dismissed = false;
      try {
        const { dismissedAutoHosts = {} } = await chrome.storage.session.get("dismissedAutoHosts");
        dismissed = Boolean(dismissedAutoHosts[host]);
      } catch (_) {}

      if (dismissed) {
        sendResponse({ activated: false });
        return;
      }

      await chrome.storage.local.set({ enabled: true });
      await updateBadge(true);
      sendResponse({
        activated: true,
        message: t("toastAutoDomain", [host], `tinyhandChrome: Auto-Start für ${host}`)
      });
    })();
    return true;
  }

  return false;
});

// Handle keyboard shortcuts (Alt+H, Alt+C, Alt+S, Alt+F)
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (command === "toggle-tinyhand") {
    const { enabled = false } = await chrome.storage.local.get("enabled");
    const nextState = !enabled;
    await chrome.storage.local.set({ enabled: nextState });
    await updateBadge(nextState);
    if (tab?.id) {
      await sendToActiveTabWithInject(tab, {
        type: "TINYHAND_TOAST",
        message: nextState
          ? t("toastActivated", null, "tinyhandChrome: Aktiviert (Shift+Ziehen zum Zeichnen)")
          : t("toastDeactivated", null, "tinyhandChrome: Deaktiviert")
      });
    }
  } else if (command === "clear-drawings") {
    if (tab?.id) {
      await sendToActiveTabWithInject(tab, { type: "CLEAR_DRAWINGS" });
    }
  } else if (command === "switch-style") {
    const current = await chrome.storage.local.get(["style", "favoriteStyles", "customImage", "includeCustomInCycle"]);
    const cycleList = GEO.getCycleStyles(current);
    const currentIndex = cycleList.indexOf(current.style || "lavender");
    const nextIndex = (currentIndex + 1) % cycleList.length;
    const nextStyle = cycleList[nextIndex];
    await chrome.storage.local.set({ style: nextStyle });

    if (tab?.id) {
      await sendToActiveTabWithInject(tab, {
        type: "TINYHAND_TOAST",
        message: t("toastStyle", [nextStyle], `tinyhandChrome Stil: ${nextStyle}`)
      });
    }
  } else if (command === "toggle-spotlight") {
    const { enabled = false, spotlight = false } = await chrome.storage.local.get(["enabled", "spotlight"]);
    const nextSpotlight = !spotlight;
    const updates = { spotlight: nextSpotlight };
    if (nextSpotlight && !enabled) {
      updates.enabled = true;
    }
    await chrome.storage.local.set(updates);
    if (updates.enabled) {
      await updateBadge(true);
    }
    if (tab?.id) {
      await sendToActiveTabWithInject(tab, {
        type: "TINYHAND_TOAST",
        message: nextSpotlight
          ? t("toastSpotlightOn", null, "Fokus-Spotlight: Ein")
          : t("toastSpotlightOff", null, "Fokus-Spotlight: Aus")
      });
    }
  }
});
