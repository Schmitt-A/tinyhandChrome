/**
 * TinyHand for Chrome - Content Script
 * Injects isolated Shadow DOM overlay with pointing hand, click ripple, and ephemeral canvas ink.
 */

(function () {
  // Prevent multiple injections
  if (window.__TINYHAND_INITIALIZED__) return;
  window.__TINYHAND_INITIALIZED__ = true;

  // Settings state
  let settings = {
    enabled: false,
    style: "classic",
    size: 80,
    color: "#FF3B30",
    strokeWidth: 4,
    fadeDuration: 3000,
    drawModifier: "shift",
    hideNativeCursor: true,
    customImage: null
  };

  // Drawing state
  let drawing = false;
  let currentStroke = null;
  let strokes = []; // Array of { color, width, points: [{x, y, time}] }
  let animFrameId = null;

  // Mouse coordinates
  let mouseX = -9999;
  let mouseY = -9999;
  let isMouseInside = false;

  // Elements inside Shadow DOM
  let hostEl = null;
  let shadowRoot = null;
  let containerEl = null;
  let canvasEl = null;
  let ctx = null;
  let pointerEl = null;
  let imgEl = null;
  let toastEl = null;
  let toastTimeout = null;

  // Asset paths
  const STYLE_ASSETS = {
    classic: chrome.runtime.getURL("hands/hand-classic.svg"),
    laser: chrome.runtime.getURL("hands/laser-dot.svg"),
    glove: chrome.runtime.getURL("hands/hand-glove.svg"),
    paw: chrome.runtime.getURL("hands/cat-paw.svg")
  };

  // 1. Initialize DOM & Shadow DOM
  function initDOM() {
    hostEl = document.createElement("div");
    hostEl.id = "tinyhand-host";
    hostEl.style.position = "fixed";
    hostEl.style.top = "0";
    hostEl.style.left = "0";
    hostEl.style.width = "0";
    hostEl.style.height = "0";
    hostEl.style.pointerEvents = "none";
    hostEl.style.zIndex = "2147483647";

    shadowRoot = hostEl.attachShadow({ mode: "open" });

    // Link overlay.css
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("content/overlay.css");
    shadowRoot.appendChild(link);

    // Container
    containerEl = document.createElement("div");
    containerEl.id = "tinyhand-container";

    // Canvas
    canvasEl = document.createElement("canvas");
    canvasEl.id = "tinyhand-canvas";
    ctx = canvasEl.getContext("2d");
    containerEl.appendChild(canvasEl);

    // Pointer wrapper
    pointerEl = document.createElement("div");
    pointerEl.id = "tinyhand-pointer";

    imgEl = document.createElement("img");
    imgEl.id = "tinyhand-img";
    imgEl.draggable = false;
    pointerEl.appendChild(imgEl);

    containerEl.appendChild(pointerEl);

    // Toast element for feedback
    toastEl = document.createElement("div");
    toastEl.id = "tinyhand-toast";
    containerEl.appendChild(toastEl);

    shadowRoot.appendChild(containerEl);
    document.documentElement.appendChild(hostEl);

    resizeCanvas();
    updatePointerVisuals();
  }

  // 2. High DPI Canvas Resize
  function resizeCanvas() {
    if (!canvasEl || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvasEl.width = Math.floor(w * dpr);
    canvasEl.height = Math.floor(h * dpr);
    canvasEl.style.width = w + "px";
    canvasEl.style.height = h + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(dpr, dpr);
  }

  // 3. Update Pointer Appearance based on Settings
  let cursorStyleEl = null;

  function updateCursorVisibility() {
    if (settings.enabled && settings.hideNativeCursor && isMouseInside) {
      if (!cursorStyleEl) {
        cursorStyleEl = document.createElement("style");
        cursorStyleEl.id = "tinyhand-cursor-override";
        cursorStyleEl.textContent = `
          *, *:hover, *:active, *::before, *::after {
            cursor: none !important;
          }
        `;
        (document.head || document.documentElement).appendChild(cursorStyleEl);
      }
    } else {
      if (cursorStyleEl) {
        cursorStyleEl.remove();
        cursorStyleEl = null;
      }
    }
  }

  function updatePointerVisuals() {
    updateCursorVisibility();

    if (!pointerEl || !imgEl) return;

    if (!settings.enabled) {
      pointerEl.style.display = "none";
      return;
    }

    if (isMouseInside && mouseX >= 0 && mouseY >= 0) {
      pointerEl.style.left = mouseX + "px";
      pointerEl.style.top = mouseY + "px";
      pointerEl.style.display = "block";
    }

    // Set Image Source
    if (settings.style === "custom" && settings.customImage) {
      imgEl.src = settings.customImage;
    } else {
      imgEl.src = STYLE_ASSETS[settings.style] || STYLE_ASSETS.classic;
    }

    // Set Size
    pointerEl.style.width = settings.size + "px";

    // Set Class for Hotspot Alignment
    pointerEl.className = "";
    pointerEl.classList.add(`style-${settings.style}`);
  }

  // 4. Click Feedback (Tap Animation + Expanding Ripple)
  function triggerClickFeedback(x, y) {
    if (!settings.enabled || !pointerEl) return;

    // A) Tap Animation on Pointer
    pointerEl.classList.add("tinyhand-tap");
    setTimeout(() => {
      pointerEl.classList.remove("tinyhand-tap");
    }, 140);

    // B) Glowing Ripple at fingertip
    const ripple = document.createElement("div");
    ripple.className = "tinyhand-ripple";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";

    // Ripple color matching drawing ink or vibrant red
    const rippleColor = settings.color || "#FF3B30";
    ripple.style.borderColor = rippleColor;
    ripple.style.boxShadow = `0 0 10px ${rippleColor}`;

    containerEl.appendChild(ripple);
    setTimeout(() => {
      ripple.remove();
    }, 500);
  }

  // 5. Toast Feedback
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 1600);
  }

  // 6. Smooth Canvas Drawing & Ephemeral Ink Loop
  function startRenderLoop() {
    if (!animFrameId) {
      animFrameId = requestAnimationFrame(renderLoop);
    }
  }

  function renderLoop(timestamp) {
    if (!ctx || !canvasEl) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const now = performance.now();
    let hasActiveStrokes = false;

    // Filter and render strokes
    strokes = strokes.filter((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return false;

      const lastPoint = stroke.points[stroke.points.length - 1];
      const age = now - lastPoint.time;

      let alpha = 1.0;
      if (settings.fadeDuration > 0) {
        if (age >= settings.fadeDuration) {
          return false; // Stroke has completely faded away
        }

        // Start fade after 65% of fade duration has elapsed
        const fadeStart = settings.fadeDuration * 0.65;
        if (age > fadeStart) {
          const fadeProgress = (age - fadeStart) / (settings.fadeDuration - fadeStart);
          alpha = Math.max(0, 1.0 - fadeProgress);
        }
      }

      hasActiveStrokes = true;

      // Draw stroke with smooth Bézier curves
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      const pts = stroke.points;
      if (pts.length === 1) {
        ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
      ctx.restore();

      return true;
    });

    if (hasActiveStrokes || drawing) {
      animFrameId = requestAnimationFrame(renderLoop);
    } else {
      animFrameId = null;
    }
  }

  function shouldDraw(e) {
    if (!settings.enabled) return false;
    if (settings.drawModifier === "shift") return e.shiftKey;
    if (settings.drawModifier === "alt") return e.altKey;
    if (settings.drawModifier === "always") return true;
    return e.shiftKey;
  }

  // 7. Event Listeners
  window.addEventListener("resize", resizeCanvas, { passive: true });

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    isMouseInside = true;

    if (settings.enabled && pointerEl) {
      pointerEl.style.display = "block";
      pointerEl.style.left = mouseX + "px";
      pointerEl.style.top = mouseY + "px";
    }

    if (drawing && currentStroke) {
      currentStroke.points.push({ x: e.clientX, y: e.clientY, time: performance.now() });
      startRenderLoop();
    }
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    isMouseInside = false;
    if (pointerEl) pointerEl.style.display = "none";
    if (drawing) {
      drawing = false;
      currentStroke = null;
    }
    updateCursorVisibility();
  });

  document.addEventListener("mouseenter", (e) => {
    isMouseInside = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (settings.enabled && pointerEl) {
      pointerEl.style.display = "block";
      pointerEl.style.left = mouseX + "px";
      pointerEl.style.top = mouseY + "px";
    }
    updateCursorVisibility();
  });
      pointerEl.style.top = mouseY + "px";
    }
  });

  window.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return; // Left mouse click only

    if (shouldDraw(e)) {
      drawing = true;
      currentStroke = {
        color: settings.color,
        width: settings.strokeWidth,
        points: [{ x: e.clientX, y: e.clientY, time: performance.now() }]
      };
      strokes.push(currentStroke);
      startRenderLoop();
    } else {
      // Normal click: trigger visual tap & ripple
      triggerClickFeedback(e.clientX, e.clientY);
    }
  }, true);

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0 && drawing) {
      drawing = false;
      if (currentStroke) {
        currentStroke.points.push({ x: e.clientX, y: e.clientY, time: performance.now() });
      }
      currentStroke = null;
      startRenderLoop();
    }
  }, true);

  // Keyboard shortcut fallback inside page (Alt+C to clear drawings)
  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "c" || e.key === "C")) {
      strokes = [];
      if (ctx && canvasEl) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
      showToast("Zeichnungen gelöscht (Alt+C)");
    }
  });

  // 8. Chrome Runtime & Storage Integration
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "CLEAR_DRAWINGS") {
      strokes = [];
      if (ctx && canvasEl) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
      showToast("Zeichnungen gelöscht");
      sendResponse({ success: true });
    } else if (msg.type === "TINYHAND_TOAST") {
      showToast(msg.message);
      sendResponse({ success: true });
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    for (const [key, change] of Object.entries(changes)) {
      settings[key] = change.newValue;
    }
    updatePointerVisuals();
    if (!settings.enabled) {
      strokes = [];
      if (ctx && canvasEl) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }
  });

  // Load initial settings
  (async function () {
    try {
      const stored = await chrome.storage.local.get(null);
      settings = { ...settings, ...stored };
    } catch (err) {
      console.error("TinyHand storage read error:", err);
    }
    initDOM();
  })();
})();
