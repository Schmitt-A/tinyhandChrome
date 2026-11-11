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

  // Load current settings from storage
  const settings = await chrome.storage.local.get({
    enabled: false,
    style: "lavender",
    size: 80,
    color: "#8E5AF7",
    strokeWidth: 4,
    fadeDuration: 3000,
    drawModifier: "shift",
    hideNativeCursor: true,
    customImage: null
  });

  // Apply settings to UI
  function renderSettings(state) {
    // Enabled Toggle
    toggleEnabled.checked = Boolean(state.enabled);

    // Hide native cursor checkbox
    if (checkHideCursor) {
      checkHideCursor.checked = state.hideNativeCursor !== false;
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

    // Custom Image Preview
    if (state.customImage) {
      customPreviewWrapper.innerHTML = `<img src="${state.customImage}" alt="Custom">`;
      customActions.style.display = "flex";
    } else {
      customPreviewWrapper.innerHTML = `<span class="upload-icon">+</span>`;
      customActions.style.display = "none";
    }

    // Size Slider
    rangeSize.value = state.size || 80;
    sizeDisplay.textContent = `${state.size || 80} px`;

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

  renderSettings(settings);

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
      await chrome.storage.local.set({
        customImage: dataUrl,
        style: "custom"
      });
      customPreviewWrapper.innerHTML = `<img src="${dataUrl}" alt="Custom">`;
      customActions.style.display = "flex";
      updateActiveCard("custom");
    };
    reader.readAsDataURL(file);
  });

  btnRemoveCustom.addEventListener("click", async (e) => {
    e.stopPropagation();
    await chrome.storage.local.set({
      customImage: null,
      style: "classic"
    });
    customPreviewWrapper.innerHTML = `<span class="upload-icon">+</span>`;
    customActions.style.display = "none";
    updateActiveCard("classic");
  });

  // 4. Size Slider
  rangeSize.addEventListener("input", async () => {
    const val = Number(rangeSize.value);
    sizeDisplay.textContent = `${val} px`;
    await chrome.storage.local.set({ size: val });
  });

  // 5. Color Swatches
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

  // 6. Select Controls
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

  // 7. Shortcuts Manager Button (opens chrome://extensions/shortcuts)
  if (btnConfigureShortcuts) {
    btnConfigureShortcuts.addEventListener("click", () => {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    });
  }

  // 8. Sync with external changes (e.g. keyboard shortcuts Alt+H, Alt+S while popup is open)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    const updated = {};
    for (const [key, change] of Object.entries(changes)) {
      updated[key] = change.newValue;
    }
    renderSettings({ ...settings, ...updated });
  });
});
