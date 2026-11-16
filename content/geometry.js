/**
 * tinyhandChrome - Shared Settings, Palette & Geometry Math
 * Runs in both MV3 Extension contexts (Content Script + Service Worker) and Node unit tests.
 */
(function (root) {
  "use strict";

  const DEFAULT_FAVORITE_STYLES = ["lavender", "glove", "coral", "plush", "robot", "laser"];

  const DEFAULT_SETTINGS = {
    enabled: false,
    style: "lavender",
    favoriteStyles: [...DEFAULT_FAVORITE_STYLES],
    includeCustomInCycle: true,
    size: 160,
    rodWidth: 7,
    rodTheme: "auto",        // "auto" | "carbon" | "wood" | "white" | "steel"
    shadowIntensity: 50,
    color: "#8E5AF7",
    strokeWidth: 4,
    fadeDuration: 3000,
    drawModifier: "shift",   // "shift" | "alt" | "always"
    inkTool: "freehand",     // "freehand" | "arrow" | "rect"
    hideNativeCursor: true,
    clickRipple: true,
    spotlight: false,
    spotlightRadius: 150,
    spotlightOpacity: 50,
    stickOrigin: "bottom-right", // "bottom-right" | "bottom-left" | "dynamic" | "bottom-right-fixed" | "bottom-left-fixed" | "floating"
    floatingAngle: -15,
    floatingDynamic: true,
    idleAnimation: true,
    animMotionStrength: 100,
    animBreatheStrength: 100,
    customImage: null,
    customHotspot: { x: 0.5, y: 0.2 },
    customCuff: { x: 0.5, y: 1.0 },
    customFlipX: false,
    customAspect: 1.4,
    autoEnableDomains: []
  };

  // Exact fingertip and cuff measurements for all 36 authentic hands + laser dot
  const STYLE_MEASUREMENTS = {
    "lavender": { tipX: 0.4637, tipY: 0.1754, cuffX: 0.5125, cuffY: 1.0, aspect: 1.4925 },
    "glove": { tipX: 0.46, tipY: 0.2103, cuffX: 0.5138, cuffY: 1.0, aspect: 1.476 },
    "coral": { tipX: 0.4125, tipY: 0.2241, cuffX: 0.5225, cuffY: 1.0, aspect: 1.3378 },
    "plush": { tipX: 0.44, tipY: 0.1879, cuffX: 0.54, cuffY: 1.0, aspect: 1.3423 },
    "robot": { tipX: 0.3962, tipY: 0.2599, cuffX: 0.5, cuffY: 1.0, aspect: 1.3158 },
    "pink": { tipX: 0.4612, tipY: 0.2429, cuffX: 0.5188, cuffY: 1.0, aspect: 1.4286 },
    "blue": { tipX: 0.4587, tipY: 0.2473, cuffX: 0.5125, cuffY: 1.0, aspect: 1.4134 },
    "mint": { tipX: 0.4612, tipY: 0.2066, cuffX: 0.5125, cuffY: 1.0, aspect: 1.476 },
    "lemon": { tipX: 0.4612, tipY: 0.2045, cuffX: 0.5162, cuffY: 1.0, aspect: 1.487 },
    "black": { tipX: 0.4537, tipY: 0.2376, cuffX: 0.52, cuffY: 1.0, aspect: 1.4184 },
    "chrome": { tipX: 0.4562, tipY: 0.2096, cuffX: 0.515, cuffY: 1.0, aspect: 1.4706 },
    "holo": { tipX: 0.4688, tipY: 0.2193, cuffX: 0.5225, cuffY: 1.0, aspect: 1.487 },
    "fuzzy": { tipX: 0.4612, tipY: 0.2059, cuffX: 0.5238, cuffY: 1.0, aspect: 1.4706 },
    "wood": { tipX: 0.46, tipY: 0.203, cuffX: 0.5112, cuffY: 1.0, aspect: 1.476 },
    "marble": { tipX: 0.4575, tipY: 0.209, cuffX: 0.5175, cuffY: 1.0, aspect: 1.4925 },
    "terrazzo": { tipX: 0.4612, tipY: 0.2648, cuffX: 0.5212, cuffY: 1.0, aspect: 1.3937 },
    "glass": { tipX: 0.4587, tipY: 0.2711, cuffX: 0.5238, cuffY: 1.0, aspect: 1.4085 },
    "jelly": { tipX: 0.4662, tipY: 0.2581, cuffX: 0.52, cuffY: 1.0, aspect: 1.4337 },
    "pastel": { tipX: 0.4587, tipY: 0.2066, cuffX: 0.5138, cuffY: 1.0, aspect: 1.476 },
    "pixel": { tipX: 0.4888, tipY: 0.2492, cuffX: 0.5387, cuffY: 1.0, aspect: 1.3115 },
    "lowpoly": { tipX: 0.4562, tipY: 0.2066, cuffX: 0.5125, cuffY: 1.0, aspect: 1.476 },
    "knit": { tipX: 0.4713, tipY: 0.2437, cuffX: 0.5238, cuffY: 1.0, aspect: 1.4337 },
    "skeleton": { tipX: 0.4587, tipY: 0.2548, cuffX: 0.51, cuffY: 1.0, aspect: 1.5444 },
    "astro": { tipX: 0.46, tipY: 0.1964, cuffX: 0.5175, cuffY: 1.0, aspect: 1.4545 },
    "space": { tipX: 0.4575, tipY: 0.2, cuffX: 0.5275, cuffY: 1.0, aspect: 1.4815 },
    "monster": { tipX: 0.4688, tipY: 0.23, cuffX: 0.5238, cuffY: 1.0, aspect: 1.3333 },
    "water": { tipX: 0.4562, tipY: 0.2381, cuffX: 0.5112, cuffY: 1.0, aspect: 1.4652 },
    "lava": { tipX: 0.4575, tipY: 0.2316, cuffX: 0.5162, cuffY: 1.0, aspect: 1.4706 },
    "grass": { tipX: 0.4625, tipY: 0.2175, cuffX: 0.5199, cuffY: 1.0, aspect: 1.4035 },
    "cactus": { tipX: 0.4675, tipY: 0.2482, cuffX: 0.5188, cuffY: 1.0, aspect: 1.4388 },
    "choco": { tipX: 0.4688, tipY: 0.2447, cuffX: 0.5225, cuffY: 1.0, aspect: 1.4184 },
    "cloud": { tipX: 0.4562, tipY: 0.2662, cuffX: 0.5126, cuffY: 1.0, aspect: 1.3652 },
    "mech": { tipX: 0.395, tipY: 0.213, cuffX: 0.4975, cuffY: 1.0, aspect: 1.444 },
    "neon": { tipX: 0.4238, tipY: 0.2138, cuffX: 0.495, cuffY: 1.0, aspect: 1.4493 },
    "leaf": { tipX: 0.405, tipY: 0.213, cuffX: 0.4975, cuffY: 1.0, aspect: 1.444 },
    "cookie": { tipX: 0.4125, tipY: 0.213, cuffX: 0.4988, cuffY: 1.0, aspect: 1.444 },
    "laser": { tipX: 0.5, tipY: 0.5, cuffX: 0.5, cuffY: 0.5, aspect: 1.0 }
  };

  const STICK_THEMES = {
    "plush": "wood", "wood": "wood", "choco": "wood", "cookie": "wood", "skeleton": "wood",
    "coral": "white", "neon": "white", "pink": "white", "blue": "white",
    "robot": "steel", "mech": "steel", "chrome": "steel", "lowpoly": "steel", "marble": "steel", "glass": "steel",
    "default": "carbon"
  };

  const ROD_PALETTES = {
    "carbon": {
      highlight: "#5C5C64",
      midtone: "#262629",
      shadow: "#121214",
      deepShadow: "#060608",
      specular: "rgba(255, 255, 255, 0.28)",
      ferrule: ["#505058", "#DCDCE4", "#8E8E96", "#3A3A40"]
    },
    "wood": {
      highlight: "#F4DEBF",
      midtone: "#D4AD7A",
      shadow: "#9E7440",
      deepShadow: "#563A1A",
      specular: "rgba(255, 248, 235, 0.35)",
      ferrule: ["#A07830", "#FDE89C", "#D4A848", "#6E4E18"]
    },
    "white": {
      highlight: "#FFFFFF",
      midtone: "#ECE9E5",
      shadow: "#C6C0B8",
      deepShadow: "#8C867E",
      specular: "rgba(255, 255, 255, 0.55)",
      ferrule: ["#A0A0A8", "#FFFFFF", "#B8B8C0", "#686870"]
    },
    "steel": {
      highlight: "#FFFFFF",
      midtone: "#C6CAD2",
      shadow: "#828892",
      deepShadow: "#4E545E",
      specular: "rgba(255, 255, 255, 0.45)",
      ferrule: ["#70757E", "#F0F2F6", "#A2A7B0", "#4A4E56"]
    }
  };

  function clamp01(v, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(1, Math.max(0, n));
  }

  function getStyleMeasurements(settings) {
    if (settings && settings.style === "custom") {
      const rawTipX = clamp01(settings.customHotspot?.x, 0.5);
      const rawTipY = clamp01(settings.customHotspot?.y, 0.2);
      const rawCuffX = clamp01(settings.customCuff?.x, 0.5);
      const rawCuffY = clamp01(settings.customCuff?.y, 1.0);
      const flipped = Boolean(settings.customFlipX);
      const aspect = Number(settings.customAspect) > 0 ? Number(settings.customAspect) : 1.4;
      return {
        tipX: flipped ? 1 - rawTipX : rawTipX,
        tipY: rawTipY,
        cuffX: flipped ? 1 - rawCuffX : rawCuffX,
        cuffY: rawCuffY,
        aspect
      };
    }
    return STYLE_MEASUREMENTS[settings?.style] || { tipX: 0.46, tipY: 0.21, cuffX: 0.51, cuffY: 1.0, aspect: 1.47 };
  }

  function resolveRodPalette(settings) {
    const requested = settings?.rodTheme;
    if (requested && requested !== "auto" && ROD_PALETTES[requested]) {
      return { key: requested, palette: ROD_PALETTES[requested] };
    }
    const autoKey = STICK_THEMES[settings?.style] || STICK_THEMES.default;
    return { key: autoKey, palette: ROD_PALETTES[autoKey] || ROD_PALETTES.carbon };
  }

  function computeStickTargetBase(stickOrigin, mouseX, viewportW, viewportH, size) {
    const w = viewportW || 1;
    const h = viewportH || 1;
    const normX = Math.min(1, Math.max(0, mouseX / w));
    const baseClearance = Math.max(140, Math.round((size || 160) * 0.9 + 55));
    const targetBaseY = h + baseClearance;
    let targetBaseX = w * 0.36 + normX * (w * 0.58);

    if (stickOrigin === "bottom-right") {
      targetBaseX = w * 0.36 + normX * (w * 0.58);
    } else if (stickOrigin === "bottom-left") {
      targetBaseX = w * 0.06 + normX * (w * 0.58);
    } else if (stickOrigin === "bottom-right-fixed") {
      targetBaseX = w * 0.94;
    } else if (stickOrigin === "bottom-left-fixed") {
      targetBaseX = w * 0.06;
    } else if (stickOrigin === "dynamic") {
      const edgeTilt = (normX - 0.5) * Math.min(180, w * 0.14);
      targetBaseX = mouseX - edgeTilt;
    }

    return { targetBaseX, targetBaseY };
  }

  function solveCollinearRodAlignment({ mouseX, tipYTarget, renderBaseX, renderBaseY, size, rodWidth, pressScale, measurements }) {
    const m = measurements;
    const s = size || 160;
    const scale = pressScale || 1;
    const handH = s / (m.aspect || 1.4);

    const localDx = (m.tipX - m.cuffX) * s * scale;
    const localDy = (m.tipY - m.cuffY) * handH * scale;

    let rodAngle = Math.atan2(Math.min(-24, tipYTarget - renderBaseY), mouseX - renderBaseX);
    let handRad = rodAngle + Math.PI / 2;
    let cuffScreenX = mouseX;
    let cuffScreenY = tipYTarget;

    for (let iter = 0; iter < 4; iter++) {
      const offX = localDx * Math.cos(handRad) - localDy * Math.sin(handRad);
      const offY = localDx * Math.sin(handRad) + localDy * Math.cos(handRad);
      cuffScreenX = mouseX - offX;
      cuffScreenY = tipYTarget - offY;
      const safeDy = Math.min(-24, cuffScreenY - renderBaseY);
      rodAngle = Math.atan2(safeDy, cuffScreenX - renderBaseX);
      handRad = rodAngle + Math.PI / 2;
    }

    const insertDepth = Math.max(4, Math.min(12, s * 0.05));
    const cosA = Math.cos(rodAngle);
    const sinA = Math.sin(rodAngle);

    const rodEndX = cuffScreenX + cosA * insertDepth;
    const rodEndY = cuffScreenY + sinA * insertDepth;

    const rodW = rodWidth !== undefined ? Number(rodWidth) : Math.max(5, Math.round(s * 0.045));
    const ferruleLen = Math.max(7, Math.min(16, Math.round(s * 0.075)));
    const ferruleTopInsert = Math.min(4, insertDepth * 0.5);
    const ferruleEndX = cuffScreenX + cosA * ferruleTopInsert;
    const ferruleEndY = cuffScreenY + sinA * ferruleTopInsert;
    const ferruleStartX = cuffScreenX - cosA * ferruleLen;
    const ferruleStartY = cuffScreenY - sinA * ferruleLen;
    const ferruleW = Math.round(rodW * 1.42 * 10) / 10;

    return {
      rodAngle,
      handRad,
      totalRotDeg: (handRad * 180) / Math.PI,
      cuffScreenX,
      cuffScreenY,
      rodEndX,
      rodEndY,
      ferruleStartX,
      ferruleStartY,
      ferruleEndX,
      ferruleEndY,
      ferruleW,
      rodW,
      nx: -sinA,
      ny: cosA
    };
  }

  function computeArrowGeometry(startX, startY, endX, endY, strokeWidth) {
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    const w = strokeWidth || 4;
    if (len < 3) {
      return { isDot: true, tipX: startX, tipY: startY };
    }
    const angle = Math.atan2(dy, dx);
    const rawHead = Math.max(12, Math.min(28, w * 3.8));
    const headLen = Math.min(rawHead, len * 0.65);
    const headSpread = Math.PI / 6.5;

    const leftX = endX - headLen * Math.cos(angle - headSpread);
    const leftY = endY - headLen * Math.sin(angle - headSpread);
    const rightX = endX - headLen * Math.cos(angle + headSpread);
    const rightY = endY - headLen * Math.sin(angle + headSpread);

    // Pull shaft endpoint slightly behind the arrowhead base so rounded stroke never protrudes past the point
    const shaftPull = Math.min(len, headLen * 0.72);
    const shaftEndX = endX - shaftPull * Math.cos(angle);
    const shaftEndY = endY - shaftPull * Math.sin(angle);

    return {
      isDot: false,
      shaftEndX,
      shaftEndY,
      tipX: endX,
      tipY: endY,
      leftX,
      leftY,
      rightX,
      rightY
    };
  }

  function computeNormalizedRect(startX, startY, endX, endY, strokeWidth) {
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const minSide = Math.min(width, height);
    const radius = Math.min(Math.max(4, (strokeWidth || 4) * 1.5), minSide * 0.25);
    return { x, y, width, height, radius };
  }

  function getCycleStyles(settings) {
    const base = Array.isArray(settings?.favoriteStyles) && settings.favoriteStyles.length > 0
      ? settings.favoriteStyles.filter((id) => Boolean(STYLE_MEASUREMENTS[id]))
      : [...DEFAULT_FAVORITE_STYLES];
    const deduped = [];
    for (const id of base) {
      if (!deduped.includes(id)) deduped.push(id);
    }
    if (settings?.customImage && settings?.includeCustomInCycle !== false && !deduped.includes("custom")) {
      deduped.push("custom");
    }
    return deduped.length > 0 ? deduped : [...DEFAULT_FAVORITE_STYLES];
  }

  function normalizeHostname(host) {
    return String(host || "").trim().toLowerCase().replace(/^\*\./, "");
  }

  function isHostnameMatch(hostname, patterns) {
    const host = normalizeHostname(hostname);
    if (!host || !Array.isArray(patterns)) return false;
    for (const raw of patterns) {
      const pattern = normalizeHostname(raw);
      if (!pattern) continue;
      if (host === pattern || host.endsWith("." + pattern)) {
        return true;
      }
    }
    return false;
  }

  const exported = {
    DEFAULT_FAVORITE_STYLES,
    DEFAULT_SETTINGS,
    STYLE_MEASUREMENTS,
    STICK_THEMES,
    ROD_PALETTES,
    getStyleMeasurements,
    resolveRodPalette,
    computeStickTargetBase,
    solveCollinearRodAlignment,
    computeArrowGeometry,
    computeNormalizedRect,
    getCycleStyles,
    normalizeHostname,
    isHostnameMatch
  };

  if (root) {
    root.__TINYHAND_GEO__ = exported;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
