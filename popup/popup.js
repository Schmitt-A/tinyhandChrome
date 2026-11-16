/**
 * tinyhandChrome - Popup Logic (v1.5.0)
 * Real-time settings sync, searchable 36-pointer gallery, spotlight & shape controls,
 * custom image resizing + dual tip/cuff calibration + horizontal flip, live shortcuts & domain auto-start.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const GEO = globalThis.__TINYHAND_GEO__;

  function t(key, substitutions, fallback) {
    try {
      const msg = chrome.i18n?.getMessage?.(key, substitutions);
      if (msg) return msg;
    } catch (_) {}
    return fallback ?? key;
  }

  function applyI18n() {
    const uiLang = chrome.i18n?.getUILanguage?.() || "en";
    document.documentElement.lang = uiLang.startsWith("de") ? "de" : "en";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key, null, "");
      if (val) el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      const val = t(key, null, "");
      if (val) el.title = val;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const val = t(key, null, "");
      if (val) el.placeholder = val;
    });
  }

  applyI18n();

  // DOM References
  const toggleEnabled = document.getElementById("toggle-enabled");
  const styleCards = document.querySelectorAll(".style-card[data-style]");
  const activeStyleBadge = document.getElementById("active-style-badge");
  const btnToggleCatalog = document.getElementById("btn-toggle-catalog");
  const galleryDetails = document.getElementById("gallery-details");
  const gallerySearch = document.getElementById("gallery-search");
  const galleryFilters = document.querySelectorAll(".filter-chip");
  const galleryGrid = document.getElementById("gallery-grid");

  const customFileInput = document.getElementById("custom-file-input");
  const uploadErrorBanner = document.getElementById("upload-error-banner");
  const customPreviewWrapper = document.getElementById("custom-preview-wrapper");
  const customActions = document.getElementById("custom-actions");
  const btnReplaceCustom = document.getElementById("btn-replace-custom");
  const btnRemoveCustom = document.getElementById("btn-remove-custom");

  const customHotspotContainer = document.getElementById("custom-hotspot-container");
  const calTabs = document.querySelectorAll(".cal-tab");
  const calibrationArea = document.getElementById("calibration-area");
  const calibrationImg = document.getElementById("calibration-img");
  const crosshairTip = document.getElementById("calibration-crosshair-tip");
  const crosshairCuff = document.getElementById("calibration-crosshair-cuff");
  const hotspotCoordsText = document.getElementById("hotspot-coords-text");
  const calibrationHintText = document.getElementById("calibration-hint-text");
  const checkCustomFlip = document.getElementById("check-custom-flip");
  const btnResetHotspot = document.getElementById("btn-reset-hotspot");

  const rangeSize = document.getElementById("range-size");
  const sizeDisplay = document.getElementById("size-display");
  const rodWidthGroup = document.getElementById("rod-width-group");
  const rangeRodWidth = document.getElementById("range-rod-width");
  const rodWidthDisplay = document.getElementById("rod-width-display");
  const rodThemeGroup = document.getElementById("rod-theme-group");
  const selectRodTheme = document.getElementById("select-rod-theme");
  const rangeShadow = document.getElementById("range-shadow");
  const shadowDisplay = document.getElementById("shadow-display");
  const checkHideCursor = document.getElementById("check-hide-cursor");
  const checkClickRipple = document.getElementById("check-click-ripple");

  const checkSpotlight = document.getElementById("check-spotlight");
  const spotlightSliders = document.getElementById("spotlight-sliders");
  const rangeSpotlightRadius = document.getElementById("range-spotlight-radius");
  const spotlightRadiusDisplay = document.getElementById("spotlight-radius-display");
  const rangeSpotlightOpacity = document.getElementById("range-spotlight-opacity");
  const spotlightOpacityDisplay = document.getElementById("spotlight-opacity-display");

  const selectStickOrigin = document.getElementById("select-stick-origin");
  const floatingOptions = document.getElementById("floating-options");
  const rangeFloatingAngle = document.getElementById("range-floating-angle");
  const floatingAngleDisplay = document.getElementById("floating-angle-display");
  const checkFloatingDynamic = document.getElementById("check-floating-dynamic");

  const checkIdleAnimation = document.getElementById("check-idle-animation");
  const animSlidersGroup = document.getElementById("anim-sliders-group");
  const rangeAnimMotion = document.getElementById("range-anim-motion");
  const animMotionDisplay = document.getElementById("anim-motion-display");
  const rangeAnimBreathe = document.getElementById("range-anim-breathe");
  const animBreatheDisplay = document.getElementById("anim-breathe-display");

  const inkToolBtns = document.querySelectorAll("#ink-tool-group .seg-btn");
  const colorBtns = document.querySelectorAll(".color-btn");
  const pickerColor = document.getElementById("picker-color");
  const selectWidth = document.getElementById("select-width");
  const selectFade = document.getElementById("select-fade");
  const selectModifier = document.getElementById("select-modifier");
  const btnUndoDrawing = document.getElementById("btn-undo-drawing");
  const btnClearDrawings = document.getElementById("btn-clear-drawings");

  const checkAutoDomain = document.getElementById("check-auto-domain");
  const autoDomainLabel = document.getElementById("auto-domain-label");
  const autoDomainChips = document.getElementById("auto-domain-chips");

  const kbdDrawHint = document.getElementById("kbd-draw-hint");
  const btnConfigureShortcuts = document.getElementById("btn-configure-shortcuts");
  const btnResetDefaults = document.getElementById("btn-reset-defaults");
  const resetConfirmBox = document.getElementById("reset-confirm-box");
  const btnResetYes = document.getElementById("btn-reset-yes");
  const btnResetCancel = document.getElementById("btn-reset-cancel");

  // Categories for gallery filters
  const CATEGORY_MAP = {
    hands: new Set(["lavender", "glove", "coral", "plush", "robot", "pink", "blue", "mint", "lemon", "black", "pastel"]),
    material: new Set(["chrome", "holo", "fuzzy", "wood", "marble", "terrazzo", "glass", "jelly", "knit", "lowpoly"]),
    creative: new Set(["laser", "pixel", "skeleton", "astro", "space", "monster", "water", "lava", "grass", "cactus", "choco", "cloud", "mech", "neon", "leaf", "cookie"])
  };

  let styleCatalog = [];
  let activeFilter = "all";
  let activeSearch = "";
  let calibrationTarget = "tip"; // "tip" | "cuff"
  let activeHost = "";

  async function loadStyleCatalog() {
    try {
      const resp = await fetch(chrome.runtime.getURL("hands/tinyhand_styles.json"));
      const json = await resp.json();
      if (Array.isArray(json.styles)) {
        styleCatalog = json.styles.map((s) => ({
          id: s.id,
          title: s.title || s.id,
          src: s.id === "laser" ? "../hands/laser-dot.svg" : `../hands/hand_${s.id}.png`
        }));
        return;
      }
    } catch (_) {}

    styleCatalog = Object.keys(GEO.STYLE_MEASUREMENTS).map((id) => ({
      id,
      title: id.charAt(0).toUpperCase() + id.slice(1),
      src: id === "laser" ? "../hands/laser-dot.svg" : `../hands/hand_${id}.png`
    }));
  }

  function getStyleDisplayName(styleId) {
    if (styleId === "custom") return t("styleCustom", null, "Eigenes");
    const found = styleCatalog.find((s) => s.id === styleId);
    return found ? found.title : styleId;
  }

  let currentSettings = await chrome.storage.local.get({ ...GEO.DEFAULT_SETTINGS });
  await loadStyleCatalog();

  function renderGallery() {
    if (!galleryGrid) return;
    galleryGrid.replaceChildren();

    const favs = new Set(
      Array.isArray(currentSettings.favoriteStyles) && currentSettings.favoriteStyles.length > 0
        ? currentSettings.favoriteStyles
        : GEO.DEFAULT_FAVORITE_STYLES
    );
    const q = activeSearch.trim().toLowerCase();

    const filtered = styleCatalog.filter((item) => {
      if (activeFilter !== "all" && !CATEGORY_MAP[activeFilter]?.has(item.id)) {
        return false;
      }
      if (q && !item.title.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "gallery-empty";
      empty.textContent = t("galleryEmpty", null, "Kein Zeiger passt zur Suche.");
      galleryGrid.appendChild(empty);
      return;
    }

    for (const item of filtered) {
      const card = document.createElement("div");
      card.className = "gallery-card" + (currentSettings.style === item.id ? " active" : "");

      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.className = "gallery-select-btn";
      selectBtn.title = item.title;

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.title;
      img.loading = "lazy";
      img.width = 30;
      img.height = 30;

      const label = document.createElement("span");
      label.textContent = item.title;

      selectBtn.appendChild(img);
      selectBtn.appendChild(label);
      selectBtn.addEventListener("click", async () => {
        await chrome.storage.local.set({ style: item.id });
      });

      const starBtn = document.createElement("button");
      starBtn.type = "button";
      const isFav = favs.has(item.id);
      starBtn.className = "gallery-star-btn";
      starBtn.textContent = "★";
      starBtn.setAttribute("aria-pressed", String(isFav));
      starBtn.setAttribute("aria-label", `${item.title} Favorite`);
      starBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const nextFavs = new Set(
          Array.isArray(currentSettings.favoriteStyles) && currentSettings.favoriteStyles.length > 0
            ? currentSettings.favoriteStyles
            : GEO.DEFAULT_FAVORITE_STYLES
        );
        if (nextFavs.has(item.id)) {
          if (nextFavs.size <= 1) return; // Keep at least one favorite
          nextFavs.delete(item.id);
        } else {
          nextFavs.add(item.id);
        }
        await chrome.storage.local.set({ favoriteStyles: Array.from(nextFavs) });
      });

      card.appendChild(selectBtn);
      card.appendChild(starBtn);
      galleryGrid.appendChild(card);
    }
  }

  function renderCrosshairs(state) {
    const flipped = Boolean(state.customFlipX);
    if (calibrationImg) {
      calibrationImg.style.transform = flipped ? "scaleX(-1)" : "";
    }

    const tip = state.customHotspot || { x: 0.5, y: 0.2 };
    const cuff = state.customCuff || { x: 0.5, y: 1.0 };

    const visTipX = flipped ? 1 - tip.x : tip.x;
    const visCuffX = flipped ? 1 - cuff.x : cuff.x;

    if (crosshairTip) {
      crosshairTip.style.left = `${visTipX * 100}%`;
      crosshairTip.style.top = `${tip.y * 100}%`;
      crosshairTip.classList.toggle("active", calibrationTarget === "tip");
    }
    if (crosshairCuff) {
      crosshairCuff.style.left = `${visCuffX * 100}%`;
      crosshairCuff.style.top = `${cuff.y * 100}%`;
      crosshairCuff.classList.toggle("active", calibrationTarget === "cuff");
    }

    const activePt = calibrationTarget === "cuff" ? cuff : tip;
    if (hotspotCoordsText) {
      hotspotCoordsText.textContent = `${Math.round(activePt.x * 100)}% • ${Math.round(activePt.y * 100)}%`;
    }
  }

  function renderDomainChips(domains) {
    if (!autoDomainChips) return;
    autoDomainChips.replaceChildren();
    const list = Array.isArray(domains) ? domains : [];
    autoDomainChips.hidden = list.length === 0;

    for (const domain of list) {
      const chip = document.createElement("span");
      chip.className = "domain-chip";

      const txt = document.createElement("span");
      txt.textContent = domain;

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "domain-chip-remove";
      rm.textContent = "×";
      rm.setAttribute("aria-label", `${domain} entfernen`);
      rm.addEventListener("click", async () => {
        const next = (currentSettings.autoEnableDomains || []).filter((d) => d !== domain);
        await chrome.storage.local.set({ autoEnableDomains: next });
      });

      chip.appendChild(txt);
      chip.appendChild(rm);
      autoDomainChips.appendChild(chip);
    }
  }

  function updateDrawHintKbd(modifier) {
    if (!kbdDrawHint) return;
    if (modifier === "alt") {
      kbdDrawHint.textContent = "Alt/Opt + Drag";
    } else if (modifier === "always") {
      kbdDrawHint.textContent = "Drag";
    } else {
      kbdDrawHint.textContent = t("scDragHint", null, "Shift + Ziehen");
    }
  }

  function renderSettings(state) {
    currentSettings = { ...currentSettings, ...state };

    toggleEnabled.checked = Boolean(state.enabled);

    if (checkHideCursor) {
      checkHideCursor.checked = state.hideNativeCursor !== false;
    }
    if (checkClickRipple) {
      checkClickRipple.checked = state.clickRipple !== false;
    }

    // Spotlight
    const spotOn = Boolean(state.spotlight);
    if (checkSpotlight) checkSpotlight.checked = spotOn;
    if (spotlightSliders) spotlightSliders.hidden = !spotOn;
    if (rangeSpotlightRadius && spotlightRadiusDisplay) {
      const r = state.spotlightRadius ?? 150;
      rangeSpotlightRadius.value = r;
      spotlightRadiusDisplay.textContent = `${r} px`;
    }
    if (rangeSpotlightOpacity && spotlightOpacityDisplay) {
      const op = state.spotlightOpacity ?? 50;
      rangeSpotlightOpacity.value = op;
      spotlightOpacityDisplay.textContent = `${op}%`;
    }

    // Stick Origin & Rod Visibility
    if (selectStickOrigin && state.stickOrigin) {
      selectStickOrigin.value = state.stickOrigin;
    }
    const isFloating = state.stickOrigin === "floating";
    const isLaser = state.style === "laser";
    if (floatingOptions) floatingOptions.hidden = !isFloating;
    if (rodWidthGroup) rodWidthGroup.hidden = isFloating || isLaser;
    if (rodThemeGroup) rodThemeGroup.hidden = isFloating || isLaser;

    if (rangeRodWidth && rodWidthDisplay) {
      const rw = state.rodWidth ?? 7;
      rangeRodWidth.value = rw;
      rodWidthDisplay.textContent = `${rw} px`;
    }
    if (selectRodTheme) {
      selectRodTheme.value = state.rodTheme || "auto";
    }

    if (rangeShadow && shadowDisplay) {
      const si = state.shadowIntensity ?? 50;
      rangeShadow.value = si;
      shadowDisplay.textContent = `${si}%`;
    }

    if (rangeFloatingAngle && floatingAngleDisplay) {
      const fa = state.floatingAngle ?? -15;
      rangeFloatingAngle.value = fa;
      floatingAngleDisplay.textContent = `${fa}°`;
    }
    if (checkFloatingDynamic) {
      checkFloatingDynamic.checked = state.floatingDynamic !== false;
    }

    const hasIdleAnim = state.idleAnimation !== false;
    if (checkIdleAnimation) checkIdleAnimation.checked = hasIdleAnim;
    if (animSlidersGroup) animSlidersGroup.hidden = !hasIdleAnim;
    if (rangeAnimMotion && animMotionDisplay) {
      const ms = state.animMotionStrength ?? 100;
      rangeAnimMotion.value = ms;
      animMotionDisplay.textContent = `${ms}%`;
    }
    if (rangeAnimBreathe && animBreatheDisplay) {
      const bs = state.animBreatheStrength ?? 100;
      rangeAnimBreathe.value = bs;
      animBreatheDisplay.textContent = `${bs}%`;
    }

    // Active Style Cards & Catalog Highlight
    const activeStyle = state.style || "lavender";
    const pinnedIds = new Set(["lavender", "glove", "coral", "plush", "robot", "laser", "custom"]);
    styleCards.forEach((card) => {
      card.classList.toggle("active", card.getAttribute("data-style") === activeStyle);
    });
    if (btnToggleCatalog) {
      btnToggleCatalog.classList.toggle("active", !pinnedIds.has(activeStyle));
    }
    if (activeStyleBadge) {
      activeStyleBadge.textContent = getStyleDisplayName(activeStyle);
    }

    renderGallery();

    // Custom Image & Calibration
    if (state.customImage) {
      customPreviewWrapper.replaceChildren();
      const thumb = document.createElement("img");
      thumb.src = state.customImage;
      thumb.alt = "Custom";
      customPreviewWrapper.appendChild(thumb);
      customActions.hidden = false;

      if (state.style === "custom" && customHotspotContainer) {
        customHotspotContainer.hidden = false;
        if (calibrationImg) calibrationImg.src = state.customImage;
        if (checkCustomFlip) checkCustomFlip.checked = Boolean(state.customFlipX);
        renderCrosshairs(state);
      } else if (customHotspotContainer) {
        customHotspotContainer.hidden = true;
      }
    } else {
      customPreviewWrapper.replaceChildren();
      const plus = document.createElement("span");
      plus.className = "upload-icon";
      plus.textContent = "+";
      customPreviewWrapper.appendChild(plus);
      customActions.hidden = true;
      if (customHotspotContainer) customHotspotContainer.hidden = true;
    }

    // Size Slider
    rangeSize.value = state.size || 160;
    sizeDisplay.textContent = `${state.size || 160} px`;

    // Ink Tool Segmented Control
    const tool = state.inkTool || "freehand";
    inkToolBtns.forEach((btn) => {
      const isActive = btn.getAttribute("data-tool") === tool;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });

    // Color Swatches
    const currentColor = (state.color || "#8E5AF7").toUpperCase();
    pickerColor.value = currentColor;
    colorBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-color").toUpperCase() === currentColor);
    });

    if (state.strokeWidth) selectWidth.value = String(state.strokeWidth);
    if (state.fadeDuration !== undefined) selectFade.value = String(state.fadeDuration);
    if (state.drawModifier) {
      selectModifier.value = state.drawModifier;
      updateDrawHintKbd(state.drawModifier);
    }

    // Domain Auto-Start
    if (checkAutoDomain && activeHost) {
      checkAutoDomain.checked = GEO.isHostnameMatch(activeHost, state.autoEnableDomains);
    }
    renderDomainChips(state.autoEnableDomains);
  }

  // Query active tab hostname cleanly
  async function detectActiveTabHost() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      if (tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
        activeHost = new URL(tab.url).hostname.toLowerCase();
      } else {
        try {
          const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_HOST" });
          if (res?.host) activeHost = String(res.host).toLowerCase();
        } catch (_) {}
      }
    } catch (_) {}

    if (activeHost && autoDomainLabel && checkAutoDomain) {
      checkAutoDomain.disabled = false;
      autoDomainLabel.textContent = t("autoDomainToggle", [activeHost], `Auf ${activeHost} automatisch starten`);
      checkAutoDomain.checked = GEO.isHostnameMatch(activeHost, currentSettings.autoEnableDomains);
    } else if (checkAutoDomain && autoDomainLabel) {
      checkAutoDomain.disabled = true;
      checkAutoDomain.checked = false;
      autoDomainLabel.textContent = t("autoDomainUnavailable", null, "Auf internen Browser-Seiten nicht verfügbar");
    }
  }

  // Hydrate actual configured Chrome shortcuts
  async function loadLiveShortcuts() {
    try {
      const commands = await chrome.commands.getAll();
      const unassigned = t("scUnassigned", null, "Nicht belegt");
      const map = {
        "toggle-tinyhand": ["kbd-toggle-tinyhand"],
        "toggle-spotlight": ["kbd-toggle-spotlight", "badge-spotlight"],
        "clear-drawings": ["kbd-clear-drawings"],
        "switch-style": ["kbd-switch-style", "badge-switch-style"]
      };
      for (const cmd of commands) {
        const ids = map[cmd.name];
        if (!ids) continue;
        const shortcutText = cmd.shortcut || unassigned;
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el) el.textContent = shortcutText;
        }
      }
    } catch (_) {}
  }

  renderSettings(currentSettings);
  await Promise.all([detectActiveTabHost(), loadLiveShortcuts()]);

  // 1. Master Switch
  toggleEnabled.addEventListener("change", async () => {
    const enabled = toggleEnabled.checked;
    await chrome.storage.local.set({ enabled });
    if (enabled) {
      chrome.runtime.sendMessage({ type: "ENSURE_ACTIVE_TAB_INJECTED" }).catch(() => {});
    }
  });

  // 2. Favorite Style Selection & Catalog Toggle
  styleCards.forEach((card) => {
    card.addEventListener("click", async () => {
      const selectedStyle = card.getAttribute("data-style");
      if (selectedStyle === "custom") {
        const { customImage } = await chrome.storage.local.get("customImage");
        if (!customImage) {
          customFileInput.click();
          return;
        }
      }
      await chrome.storage.local.set({ style: selectedStyle });
    });
  });

  if (btnToggleCatalog && galleryDetails) {
    btnToggleCatalog.addEventListener("click", () => {
      galleryDetails.open = !galleryDetails.open;
      if (galleryDetails.open && gallerySearch) {
        gallerySearch.focus();
      }
    });
  }

  // Gallery Search & Filters
  if (gallerySearch) {
    gallerySearch.addEventListener("input", () => {
      activeSearch = gallerySearch.value;
      renderGallery();
    });
  }
  galleryFilters.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.getAttribute("data-filter") || "all";
      galleryFilters.forEach((c) => c.classList.toggle("active", c === chip));
      renderGallery();
    });
  });

  // 3. Custom Image Upload with Smart Resizing (>512px -> 512px PNG)
  function showUploadError(msg) {
    if (!uploadErrorBanner) return;
    if (msg) {
      uploadErrorBanner.textContent = msg;
      uploadErrorBanner.hidden = false;
    } else {
      uploadErrorBanner.hidden = true;
      uploadErrorBanner.textContent = "";
    }
  }

  function resizeDataUrlIfNeeded(dataUrl, mimeType, imgElLoaded) {
    const MAX_DIM = 512;
    const w = imgElLoaded.naturalWidth;
    const h = imgElLoaded.naturalHeight;
    if (mimeType === "image/svg+xml" || (w <= MAX_DIM && h <= MAX_DIM)) {
      return dataUrl;
    }
    const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const offscreen = document.createElement("canvas");
    offscreen.width = cw;
    offscreen.height = ch;
    const octx = offscreen.getContext("2d");
    octx.drawImage(imgElLoaded, 0, 0, cw, ch);
    return offscreen.toDataURL("image/png");
  }

  customFileInput.addEventListener("change", () => {
    const file = customFileInput.files?.[0];
    customFileInput.value = "";
    if (!file) return;

    showUploadError("");
    if (file.size > 2 * 1024 * 1024) {
      showUploadError(t("uploadSizeError", null, "Bitte wähle ein Bild unter 2 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target.result;
      const tempImg = new Image();
      tempImg.onload = async () => {
        const aspect = tempImg.naturalHeight > 0
          ? Math.round((tempImg.naturalWidth / tempImg.naturalHeight) * 1000) / 1000
          : 1.4;
        const optimizedUrl = resizeDataUrlIfNeeded(rawUrl, file.type, tempImg);
        await chrome.storage.local.set({
          customImage: optimizedUrl,
          customAspect: aspect,
          customHotspot: { x: 0.5, y: 0.2 },
          customCuff: { x: 0.5, y: 1.0 },
          customFlipX: false,
          style: "custom"
        });
      };
      tempImg.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });

  if (btnReplaceCustom) {
    btnReplaceCustom.addEventListener("click", () => customFileInput.click());
  }

  btnRemoveCustom.addEventListener("click", async (e) => {
    e.stopPropagation();
    showUploadError("");
    await chrome.storage.local.set({
      customImage: null,
      style: "lavender"
    });
  });

  // Calibration Mode Switch & Interactive Crosshair Drag
  calTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      calibrationTarget = tab.getAttribute("data-target") === "cuff" ? "cuff" : "tip";
      calTabs.forEach((tBtn) => {
        const active = tBtn === tab;
        tBtn.classList.toggle("active", active);
        tBtn.setAttribute("aria-pressed", String(active));
      });
      if (calibrationHintText) {
        calibrationHintText.textContent = calibrationTarget === "cuff"
          ? t("calibrationHintCuff", null, "Klicke oder ziehe auf das Bild, wo der Zeigestab ansetzen soll.")
          : t("calibrationHintTip", null, "Klicke oder ziehe auf das Bild, um den Klickpunkt zu kalibrieren.");
      }
      renderCrosshairs(currentSettings);
    });
  });

  if (checkCustomFlip) {
    checkCustomFlip.addEventListener("change", async () => {
      await chrome.storage.local.set({ customFlipX: checkCustomFlip.checked });
    });
  }

  let isCalibrating = false;

  function updateCalibrationPoint(e) {
    if (!calibrationImg) return;
    const rect = calibrationImg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const visX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const visY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const srcX = currentSettings.customFlipX ? 1 - visX : visX;

    const point = {
      x: Math.round(srcX * 1000) / 1000,
      y: Math.round(visY * 1000) / 1000
    };

    if (calibrationTarget === "cuff") {
      currentSettings.customCuff = point;
      renderCrosshairs(currentSettings);
      chrome.storage.local.set({ customCuff: point });
    } else {
      currentSettings.customHotspot = point;
      renderCrosshairs(currentSettings);
      chrome.storage.local.set({ customHotspot: point });
    }
  }

  if (calibrationArea) {
    calibrationArea.addEventListener("pointerdown", (e) => {
      isCalibrating = true;
      calibrationArea.setPointerCapture(e.pointerId);
      updateCalibrationPoint(e);
    });
    calibrationArea.addEventListener("pointermove", (e) => {
      if (isCalibrating) updateCalibrationPoint(e);
    });
    const finishCalibrating = (e) => {
      if (isCalibrating) {
        isCalibrating = false;
        try { calibrationArea.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };
    calibrationArea.addEventListener("pointerup", finishCalibrating);
    calibrationArea.addEventListener("pointercancel", finishCalibrating);
  }

  if (btnResetHotspot) {
    btnResetHotspot.addEventListener("click", async () => {
      await chrome.storage.local.set({
        customHotspot: { x: 0.5, y: 0.2 },
        customCuff: { x: 0.5, y: 1.0 },
        customFlipX: false
      });
    });
  }

  // 4. Size, Rod, Shadow & Spotlight Sliders
  rangeSize.addEventListener("input", async () => {
    const val = Number(rangeSize.value);
    sizeDisplay.textContent = `${val} px`;
    await chrome.storage.local.set({ size: val });
  });

  if (rangeRodWidth) {
    rangeRodWidth.addEventListener("input", async () => {
      const val = Number(rangeRodWidth.value);
      rodWidthDisplay.textContent = `${val} px`;
      await chrome.storage.local.set({ rodWidth: val });
    });
  }

  if (selectRodTheme) {
    selectRodTheme.addEventListener("change", async () => {
      await chrome.storage.local.set({ rodTheme: selectRodTheme.value });
    });
  }

  if (rangeShadow) {
    rangeShadow.addEventListener("input", async () => {
      const val = Number(rangeShadow.value);
      shadowDisplay.textContent = `${val}%`;
      await chrome.storage.local.set({ shadowIntensity: val });
    });
  }

  if (checkHideCursor) {
    checkHideCursor.addEventListener("change", async () => {
      await chrome.storage.local.set({ hideNativeCursor: checkHideCursor.checked });
    });
  }

  if (checkClickRipple) {
    checkClickRipple.addEventListener("change", async () => {
      await chrome.storage.local.set({ clickRipple: checkClickRipple.checked });
    });
  }

  if (checkSpotlight) {
    checkSpotlight.addEventListener("change", async () => {
      const spotOn = checkSpotlight.checked;
      const updates = { spotlight: spotOn };
      if (spotOn && !currentSettings.enabled) {
        updates.enabled = true;
      }
      await chrome.storage.local.set(updates);
      if (spotOn) {
        chrome.runtime.sendMessage({ type: "ENSURE_ACTIVE_TAB_INJECTED" }).catch(() => {});
      }
    });
  }

  if (rangeSpotlightRadius) {
    rangeSpotlightRadius.addEventListener("input", async () => {
      const val = Number(rangeSpotlightRadius.value);
      spotlightRadiusDisplay.textContent = `${val} px`;
      await chrome.storage.local.set({ spotlightRadius: val });
    });
  }

  if (rangeSpotlightOpacity) {
    rangeSpotlightOpacity.addEventListener("input", async () => {
      const val = Number(rangeSpotlightOpacity.value);
      spotlightOpacityDisplay.textContent = `${val}%`;
      await chrome.storage.local.set({ spotlightOpacity: val });
    });
  }

  // 5. Stick Origin & Animations
  if (selectStickOrigin) {
    selectStickOrigin.addEventListener("change", async () => {
      await chrome.storage.local.set({ stickOrigin: selectStickOrigin.value });
    });
  }

  if (rangeFloatingAngle) {
    rangeFloatingAngle.addEventListener("input", async () => {
      const angle = Number(rangeFloatingAngle.value);
      floatingAngleDisplay.textContent = `${angle}°`;
      await chrome.storage.local.set({ floatingAngle: angle });
    });
  }

  if (checkFloatingDynamic) {
    checkFloatingDynamic.addEventListener("change", async () => {
      await chrome.storage.local.set({ floatingDynamic: checkFloatingDynamic.checked });
    });
  }

  if (checkIdleAnimation) {
    checkIdleAnimation.addEventListener("change", async () => {
      await chrome.storage.local.set({ idleAnimation: checkIdleAnimation.checked });
    });
  }

  if (rangeAnimMotion) {
    rangeAnimMotion.addEventListener("input", async () => {
      const val = Number(rangeAnimMotion.value);
      animMotionDisplay.textContent = `${val}%`;
      await chrome.storage.local.set({ animMotionStrength: val });
    });
  }

  if (rangeAnimBreathe) {
    rangeAnimBreathe.addEventListener("input", async () => {
      const val = Number(rangeAnimBreathe.value);
      animBreatheDisplay.textContent = `${val}%`;
      await chrome.storage.local.set({ animBreatheStrength: val });
    });
  }

  // 6. Drawing Tool, Colors & Quick Actions
  inkToolBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tool = btn.getAttribute("data-tool") || "freehand";
      await chrome.storage.local.set({ inkTool: tool });
    });
  });

  colorBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const color = btn.getAttribute("data-color");
      await chrome.storage.local.set({ color });
    });
  });

  pickerColor.addEventListener("input", async () => {
    await chrome.storage.local.set({ color: pickerColor.value });
  });

  selectWidth.addEventListener("change", async () => {
    await chrome.storage.local.set({ strokeWidth: Number(selectWidth.value) });
  });

  selectFade.addEventListener("change", async () => {
    await chrome.storage.local.set({ fadeDuration: Number(selectFade.value) });
  });

  selectModifier.addEventListener("change", async () => {
    await chrome.storage.local.set({ drawModifier: selectModifier.value });
  });

  if (btnUndoDrawing) {
    btnUndoDrawing.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "RELAY_ACTIVE_TAB_ACTION",
        payload: { type: "UNDO_DRAWING" }
      }).catch(() => {});
    });
  }

  if (btnClearDrawings) {
    btnClearDrawings.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "RELAY_ACTIVE_TAB_ACTION",
        payload: { type: "CLEAR_DRAWINGS" }
      }).catch(() => {});
    });
  }

  // 7. Auto-Start Domain Toggle
  if (checkAutoDomain) {
    checkAutoDomain.addEventListener("change", async () => {
      if (!activeHost) return;
      const existing = Array.isArray(currentSettings.autoEnableDomains)
        ? currentSettings.autoEnableDomains
        : [];
      let next;
      if (checkAutoDomain.checked) {
        next = existing.includes(activeHost) ? existing : [...existing, activeHost];
      } else {
        next = existing.filter((d) => !GEO.isHostnameMatch(activeHost, [d]));
      }
      await chrome.storage.local.set({ autoEnableDomains: next });
    });
  }

  // 8. Shortcuts Manager & Inline Reset Defaults
  if (btnConfigureShortcuts) {
    btnConfigureShortcuts.addEventListener("click", () => {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    });
  }

  if (btnResetDefaults && resetConfirmBox) {
    btnResetDefaults.addEventListener("click", () => {
      resetConfirmBox.hidden = false;
      btnResetDefaults.hidden = true;
    });
  }
  if (btnResetCancel && resetConfirmBox) {
    btnResetCancel.addEventListener("click", () => {
      resetConfirmBox.hidden = true;
      btnResetDefaults.hidden = false;
    });
  }
  if (btnResetYes && resetConfirmBox) {
    btnResetYes.addEventListener("click", async () => {
      await chrome.storage.local.set({ ...GEO.DEFAULT_SETTINGS });
      resetConfirmBox.hidden = true;
      btnResetDefaults.hidden = false;
    });
  }

  // 9. Live Sync with External Storage Changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    const updated = {};
    for (const [key, change] of Object.entries(changes)) {
      updated[key] = change.newValue;
    }
    renderSettings({ ...currentSettings, ...updated });
  });
});
