/**
 * TinyHand for Chrome - Popup Logic
 * Controls settings, real-time live synchronization, and custom pointer upload.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const toggleEnabled = document.getElementById("toggle-enabled");
  const styleCards = document.querySelectorAll(".style-card");
  const customFileInput = document.getElementById("custom-file-input");
  const customPreviewWrapper = document.getElementById("custom-preview-wrapper");
  const customActions = document.getElementById("custom-actions");
  const btnRemoveCustom = document.getElementById("btn-remove-custom");
  const rangeSize = document.getElementById("range-size");
  const sizeDisplay = document.getElementById("size-display");
  const colorBtns = document.querySelectorAll(".color-btn");
  const pickerColor = document.getElementById("picker-color");
  const selectWidth = document.getElementById("select-width");
  const selectFade = document.getElementById("select-fade");
  const selectModifier = document.getElementById("select-modifier");
  const checkHideCursor = document.getElementById("check-hide-cursor");
  const btnConfigureShortcuts = document.getElementById("btn-configure-shortcuts");
  const selectAllStyles = document.getElementById("select-all-styles");
  const selectStickOrigin = document.getElementById("select-stick-origin");
  const checkIdleAnimation = document.getElementById("check-idle-animation");

  // New DOM Elements for v1.3.0
  const rodWidthGroup = document.getElementById("rod-width-group");
  const rangeRodWidth = document.getElementById("range-rod-width");
  const rodWidthDisplay = document.getElementById("rod-width-display");
  const rangeShadow = document.getElementById("range-shadow");
  const shadowDisplay = document.getElementById("shadow-display");

  const floatingOptions = document.getElementById("floating-options");
  const rangeFloatingAngle = document.getElementById("range-floating-angle");
  const floatingAngleDisplay = document.getElementById("floating-angle-display");
  const checkFloatingDynamic = document.getElementById("check-floating-dynamic");

  const animSlidersGroup = document.getElementById("anim-sliders-group");
  const rangeAnimMotion = document.getElementById("range-anim-motion");
  const animMotionDisplay = document.getElementById("anim-motion-display");
  const rangeAnimBreathe = document.getElementById("range-anim-breathe");
  const animBreatheDisplay = document.getElementById("anim-breathe-display");

  const customHotspotContainer = document.getElementById("custom-hotspot-container");
  const calibrationArea = document.getElementById("calibration-area");
  const calibrationImg = document.getElementById("calibration-img");
  const calibrationCrosshair = document.getElementById("calibration-crosshair");
  const hotspotCoordsText = document.getElementById("hotspot-coords-text");
  const btnResetHotspot = document.getElementById("btn-reset-hotspot");

  // Load current settings from storage
  let currentSettings = await chrome.storage.local.get({
    enabled: false,
    style: "lavender",
    size: 160,
    rodWidth: 7,
    shadowIntensity: 50,
    color: "#8E5AF7",
    strokeWidth: 4,
    fadeDuration: 3000,
    drawModifier: "shift",
    hideNativeCursor: true,
    stickOrigin: "bottom-right",
    floatingAngle: -15,
    floatingDynamic: true,
    idleAnimation: true,
    animMotionStrength: 100,
    animBreatheStrength: 100,
    customImage: null,
    customHotspot: { x: 0.5, y: 0.2 },
    customAspect: 1.4
  });

  // Apply settings to UI
  function renderSettings(state) {
    currentSettings = { ...currentSettings, ...state };

    // Enabled Toggle
    toggleEnabled.checked = Boolean(state.enabled);

    // Hide native cursor checkbox
    if (checkHideCursor) {
      checkHideCursor.checked = state.hideNativeCursor !== false;
    }

    // Stick Origin & Sub-options
    if (selectStickOrigin && state.stickOrigin) {
      selectStickOrigin.value = state.stickOrigin;
    }
    const isFloating = state.stickOrigin === "floating";
    if (floatingOptions) {
      floatingOptions.style.display = isFloating ? "flex" : "none";
    }
    if (rodWidthGroup) {
      rodWidthGroup.style.display = isFloating ? "none" : "flex";
    }

    // Rod Width
    if (rangeRodWidth && rodWidthDisplay) {
      const rw = state.rodWidth ?? 7;
      rangeRodWidth.value = rw;
      rodWidthDisplay.textContent = `${rw} px`;
    }

    // Shadow / 3D Depth
    if (rangeShadow && shadowDisplay) {
      const si = state.shadowIntensity ?? 50;
      rangeShadow.value = si;
      shadowDisplay.textContent = `${si}%`;
    }

    // Floating Angle & Dynamic
    if (rangeFloatingAngle && floatingAngleDisplay) {
      const fa = state.floatingAngle ?? -15;
      rangeFloatingAngle.value = fa;
      floatingAngleDisplay.textContent = `${fa}°`;
    }
    if (checkFloatingDynamic) {
      checkFloatingDynamic.checked = state.floatingDynamic !== false;
    }

    // Idle Animation & Sliders
    const hasIdleAnim = state.idleAnimation !== false;
    if (checkIdleAnimation) {
      checkIdleAnimation.checked = hasIdleAnim;
    }
    if (animSlidersGroup) {
      animSlidersGroup.style.display = hasIdleAnim ? "flex" : "none";
    }
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

    // Style Selection Cards
    styleCards.forEach((card) => {
      const cardStyle = card.getAttribute("data-style");
      if (cardStyle === state.style) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    });

    // Dropdown Selection
    if (selectAllStyles) {
      selectAllStyles.value = state.style;
    }

    // Custom Image Preview & Hotspot Calibration
    if (state.customImage) {
      customPreviewWrapper.innerHTML = `<img src="${state.customImage}" alt="Custom">`;
      customActions.style.display = "flex";

      if (state.style === "custom" && customHotspotContainer) {
        customHotspotContainer.style.display = "flex";
        if (calibrationImg) calibrationImg.src = state.customImage;
        const hs = state.customHotspot || { x: 0.5, y: 0.2 };
        if (calibrationCrosshair) {
          calibrationCrosshair.style.left = `${hs.x * 100}%`;
          calibrationCrosshair.style.top = `${hs.y * 100}%`;
        }
        if (hotspotCoordsText) {
          hotspotCoordsText.textContent = `X: ${Math.round(hs.x * 100)}% • Y: ${Math.round(hs.y * 100)}%`;
        }
      } else if (customHotspotContainer) {
        customHotspotContainer.style.display = "none";
      }
    } else {
      customPreviewWrapper.innerHTML = `<span class="upload-icon">+</span>`;
      customActions.style.display = "none";
      if (customHotspotContainer) customHotspotContainer.style.display = "none";
    }

    // Size Slider
    rangeSize.value = state.size || 160;
    sizeDisplay.textContent = `${state.size || 160} px`;

    // Color Swatches
    const currentColor = (state.color || "#FF3B30").toUpperCase();
    pickerColor.value = currentColor;

    colorBtns.forEach((btn) => {
      const btnColor = btn.getAttribute("data-color").toUpperCase();
      if (btnColor === currentColor) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Selects
    if (state.strokeWidth) selectWidth.value = String(state.strokeWidth);
    if (state.fadeDuration !== undefined) selectFade.value = String(state.fadeDuration);
    if (state.drawModifier) selectModifier.value = state.drawModifier;
  }

  renderSettings(currentSettings);

  // 1. Toggle Master Switch
  toggleEnabled.addEventListener("change", async () => {
    await chrome.storage.local.set({ enabled: toggleEnabled.checked });
  });

  // 2. Style Selection
  styleCards.forEach((card) => {
    card.addEventListener("click", async () => {
      const selectedStyle = card.getAttribute("data-style");

      if (selectedStyle === "custom") {
        const { customImage } = await chrome.storage.local.get("customImage");
        if (!customImage) {
          // No image uploaded yet -> open file chooser
          customFileInput.click();
          return;
        }
      }

      await chrome.storage.local.set({ style: selectedStyle });
      updateActiveCard(selectedStyle);
    });
  });

  // Dropdown style selection (all 36 authentic hands)
  if (selectAllStyles) {
    selectAllStyles.addEventListener("change", async () => {
      const selected = selectAllStyles.value;
      if (selected === "custom") {
        const { customImage } = await chrome.storage.local.get("customImage");
        if (!customImage) {
          customFileInput.click();
          return;
        }
      }
      await chrome.storage.local.set({ style: selected });
      updateActiveCard(selected);
    });
  }

  function updateActiveCard(activeStyle) {
    if (selectAllStyles) {
      selectAllStyles.value = activeStyle;
    }
    styleCards.forEach((c) => {
      if (c.getAttribute("data-style") === activeStyle) {
        c.classList.add("active");
      } else {
        c.classList.remove("active");
      }
    });
    // Show/hide hotspot calibration card
    if (customHotspotContainer) {
      const hasCustom = Boolean(currentSettings.customImage);
      customHotspotContainer.style.display = (activeStyle === "custom" && hasCustom) ? "flex" : "none";
    }
  }

  // 3. Custom File Upload (PNG / SVG)
  customFileInput.addEventListener("change", () => {
    const file = customFileInput.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Bitte wähle ein Bild unter 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;

      // Measure natural aspect ratio
      const tempImg = new Image();
      tempImg.onload = async () => {
        const aspect = tempImg.naturalHeight > 0
          ? Math.round((tempImg.naturalWidth / tempImg.naturalHeight) * 1000) / 1000
          : 1.4;
        const initialHotspot = { x: 0.5, y: 0.2 };

        await chrome.storage.local.set({
          customImage: dataUrl,
          customAspect: aspect,
          customHotspot: initialHotspot,
          style: "custom"
        });

        customPreviewWrapper.innerHTML = `<img src="${dataUrl}" alt="Custom">`;
        customActions.style.display = "flex";
        if (calibrationImg) calibrationImg.src = dataUrl;
        if (customHotspotContainer) customHotspotContainer.style.display = "flex";
        if (calibrationCrosshair) {
          calibrationCrosshair.style.left = "50%";
          calibrationCrosshair.style.top = "20%";
        }
        if (hotspotCoordsText) {
          hotspotCoordsText.textContent = "X: 50% • Y: 20%";
        }
        updateActiveCard("custom");
      };
      tempImg.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });

  btnRemoveCustom.addEventListener("click", async (e) => {
    e.stopPropagation();
    await chrome.storage.local.set({
      customImage: null,
      style: "lavender"
    });
    customPreviewWrapper.innerHTML = `<span class="upload-icon">+</span>`;
    customActions.style.display = "none";
    if (customHotspotContainer) customHotspotContainer.style.display = "none";
    updateActiveCard("lavender");
  });

  // Hotspot Interactive Calibration (Click & Drag)
  let isCalibrating = false;

  function updateHotspotCoordinates(e) {
    if (!calibrationImg) return;
    const rect = calibrationImg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const roundedX = Math.round(relX * 1000) / 1000;
    const roundedY = Math.round(relY * 1000) / 1000;

    if (calibrationCrosshair) {
      calibrationCrosshair.style.left = `${roundedX * 100}%`;
      calibrationCrosshair.style.top = `${roundedY * 100}%`;
    }
    if (hotspotCoordsText) {
      hotspotCoordsText.textContent = `X: ${Math.round(roundedX * 100)}% • Y: ${Math.round(roundedY * 100)}%`;
    }

    currentSettings.customHotspot = { x: roundedX, y: roundedY };
    chrome.storage.local.set({ customHotspot: { x: roundedX, y: roundedY } });
  }

  if (calibrationArea) {
    calibrationArea.addEventListener("pointerdown", (e) => {
      isCalibrating = true;
      calibrationArea.setPointerCapture(e.pointerId);
      updateHotspotCoordinates(e);
    });

    calibrationArea.addEventListener("pointermove", (e) => {
      if (!isCalibrating) return;
      updateHotspotCoordinates(e);
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
      const resetPos = { x: 0.5, y: 0.2 };
      if (calibrationCrosshair) {
        calibrationCrosshair.style.left = "50%";
        calibrationCrosshair.style.top = "20%";
      }
      if (hotspotCoordsText) {
        hotspotCoordsText.textContent = "X: 50% • Y: 20%";
      }
      currentSettings.customHotspot = resetPos;
      await chrome.storage.local.set({ customHotspot: resetPos });
    });
  }

  // 4. Size & Rod Width Sliders
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

  if (rangeShadow) {
    rangeShadow.addEventListener("input", async () => {
      const val = Number(rangeShadow.value);
      shadowDisplay.textContent = `${val}%`;
      await chrome.storage.local.set({ shadowIntensity: val });
    });
  }

  // 5. Stick Origin & Floating Controls
  if (selectStickOrigin) {
    selectStickOrigin.addEventListener("change", async () => {
      const origin = selectStickOrigin.value;
      const isFloating = origin === "floating";
      if (floatingOptions) floatingOptions.style.display = isFloating ? "flex" : "none";
      if (rodWidthGroup) rodWidthGroup.style.display = isFloating ? "none" : "flex";
      await chrome.storage.local.set({ stickOrigin: origin });
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

  // 6. Idle Animation & Strength Sliders
  if (checkIdleAnimation) {
    checkIdleAnimation.addEventListener("change", async () => {
      const checked = checkIdleAnimation.checked;
      if (animSlidersGroup) animSlidersGroup.style.display = checked ? "flex" : "none";
      await chrome.storage.local.set({ idleAnimation: checked });
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

  // 7. Color Swatches
  colorBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const color = btn.getAttribute("data-color");
      pickerColor.value = color;

      colorBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      await chrome.storage.local.set({ color });
    });
  });

  // Native Color Picker
  pickerColor.addEventListener("input", async () => {
    const color = pickerColor.value;
    colorBtns.forEach((b) => {
      if (b.getAttribute("data-color").toUpperCase() === color.toUpperCase()) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });
    await chrome.storage.local.set({ color });
  });

  // 8. Select Controls & Checkboxes
  selectWidth.addEventListener("change", async () => {
    await chrome.storage.local.set({ strokeWidth: Number(selectWidth.value) });
  });

  selectFade.addEventListener("change", async () => {
    await chrome.storage.local.set({ fadeDuration: Number(selectFade.value) });
  });

  selectModifier.addEventListener("change", async () => {
    await chrome.storage.local.set({ drawModifier: selectModifier.value });
  });

  if (checkHideCursor) {
    checkHideCursor.addEventListener("change", async () => {
      await chrome.storage.local.set({ hideNativeCursor: checkHideCursor.checked });
    });
  }

  // 9. Shortcuts Manager Button (opens chrome://extensions/shortcuts)
  if (btnConfigureShortcuts) {
    btnConfigureShortcuts.addEventListener("click", () => {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    });
  }

  // 10. Sync with external changes (e.g. keyboard shortcuts Alt+H, Alt+S while popup is open)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    const updated = {};
    for (const [key, change] of Object.entries(changes)) {
      updated[key] = change.newValue;
    }
    renderSettings({ ...currentSettings, ...updated });
  });
});
