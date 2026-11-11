/**
 * TinyHand for Chrome - Content Script
 * Injects isolated Shadow DOM overlay with pointing hand, stick from screen corner/bottom,
 * subtle breathing animation, click ripple, and ephemeral canvas ink.
 */

(function () {
  // Prevent multiple injections
  if (window.__TINYHAND_INITIALIZED__) return;
  window.__TINYHAND_INITIALIZED__ = true;

  // Settings state
  let settings = {
    enabled: false,
    style: "lavender",
    size: 160,
    color: "#8E5AF7",
    strokeWidth: 4,
    fadeDuration: 3000,
    drawModifier: "shift",
    hideNativeCursor: true,
    stickOrigin: "bottom-right",
    idleAnimation: true,
    customImage: null
  };

  // Drawing state
  let drawing = false;
  let currentStroke = null;
  let strokes = []; // Array of { color, width, points: [{x, y, time}] }

  // Physics & Animation state
  let mouseX = -9999;
  let mouseY = -9999;
  let isMouseInside = false;
  let currentBaseX = -1;
  let currentBaseY = -1;
  let idlePhase = 0;
  let pressAmount = 0;
  let mainLoopId = null;

  // Elements inside Shadow DOM
  let hostEl = null;
  let shadowRoot = null;
  let containerEl = null;
  let canvasEl = null;
  let ctx = null;
  let armSvgEl = null;
  let rodEl = null;
  let ferruleEl = null;
  let pointerEl = null;
  let innerEl = null;
  let imgEl = null;
  let toastEl = null;
  let toastTimeout = null;

  // Exact fingertip measurements for all 36 authentic hands from nilbuild/tinyhand
  const STYLE_MEASUREMENTS = {
    "lavender": {"tipX": 0.4644, "tipY": 0.0775},
    "glove": {"tipX": 0.46, "tipY": 0.0944},
    "coral": {"tipX": 0.4131, "tipY": 0.112},
    "plush": {"tipX": 0.4409, "tipY": 0.0931},
    "robot": {"tipX": 0.3975, "tipY": 0.1315},
    "pink": {"tipX": 0.4629, "tipY": 0.1126},
    "blue": {"tipX": 0.46, "tipY": 0.1159},
    "mint": {"tipX": 0.4614, "tipY": 0.0938},
    "lemon": {"tipX": 0.4624, "tipY": 0.0911},
    "black": {"tipX": 0.4546, "tipY": 0.112},
    "chrome": {"tipX": 0.4575, "tipY": 0.0944},
    "holo": {"tipX": 0.4683, "tipY": 0.0983},
    "fuzzy": {"tipX": 0.4604, "tipY": 0.0938},
    "wood": {"tipX": 0.4585, "tipY": 0.0911},
    "marble": {"tipX": 0.4575, "tipY": 0.0931},
    "terrazzo": {"tipX": 0.4619, "tipY": 0.1263},
    "glass": {"tipX": 0.4609, "tipY": 0.1276},
    "jelly": {"tipX": 0.4678, "tipY": 0.1198},
    "pastel": {"tipX": 0.459, "tipY": 0.0931},
    "pixel": {"tipX": 0.4898, "tipY": 0.127},
    "lowpoly": {"tipX": 0.457, "tipY": 0.0931},
    "knit": {"tipX": 0.4731, "tipY": 0.1139},
    "skeleton": {"tipX": 0.459, "tipY": 0.11},
    "astro": {"tipX": 0.4614, "tipY": 0.0892},
    "space": {"tipX": 0.4585, "tipY": 0.0905},
    "monster": {"tipX": 0.4717, "tipY": 0.1152},
    "water": {"tipX": 0.4561, "tipY": 0.1081},
    "lava": {"tipX": 0.4585, "tipY": 0.1048},
    "grass": {"tipX": 0.4568, "tipY": 0.1035},
    "cactus": {"tipX": 0.4692, "tipY": 0.1152},
    "choco": {"tipX": 0.4702, "tipY": 0.1152},
    "cloud": {"tipX": 0.4517, "tipY": 0.1302},
    "mech": {"tipX": 0.396, "tipY": 0.0977},
    "neon": {"tipX": 0.4253, "tipY": 0.0977},
    "leaf": {"tipX": 0.4067, "tipY": 0.0977},
    "cookie": {"tipX": 0.4136, "tipY": 0.0977}
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

    // Inline styles directly into Shadow Root for 100% reliable, zero-latency rendering
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      :host { all: initial; }
      #tinyhand-container {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        pointer-events: none !important; z-index: 2147483647 !important;
        overflow: hidden; user-select: none; -webkit-user-select: none;
      }
      #tinyhand-arm-svg {
        position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
        pointer-events: none !important; overflow: visible;
      }
      #tinyhand-canvas {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none !important;
      }
      #tinyhand-pointer {
        position: absolute; pointer-events: none !important;
        will-change: left, top, transform; display: none;
        z-index: 2147483647 !important;
      }
      #tinyhand-inner {
        display: block; width: 100%; height: auto; pointer-events: none !important;
        transition: transform 0.08s cubic-bezier(0.2, 0.9, 0.3, 1.2);
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.38));
      }
      #tinyhand-img {
        display: block; width: 100%; height: auto; pointer-events: none !important;
      }
      .style-laser #tinyhand-inner {
        filter: drop-shadow(0 0 14px rgba(255, 59, 48, 0.95)) !important;
      }
      .tinyhand-ripple {
        position: absolute; border-radius: 50%; pointer-events: none !important;
        transform: translate(-50%, -50%); box-sizing: border-box;
        animation: tinyhand-ripple-anim 0.45s ease-out forwards;
      }
      @keyframes tinyhand-ripple-anim {
        0% { width: 8px; height: 8px; opacity: 0.9; border: 3px solid rgba(255, 59, 48, 0.9); box-shadow: 0 0 6px rgba(255, 59, 48, 0.8); }
        100% { width: 65px; height: 65px; opacity: 0; border: 1.5px solid rgba(255, 59, 48, 0.2); box-shadow: 0 0 16px rgba(255, 59, 48, 0); }
      }
      #tinyhand-toast {
        position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-20px);
        background: rgba(28, 28, 30, 0.92); color: #FFFFFF; padding: 8px 18px; border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px; font-weight: 500; letter-spacing: -0.1px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        pointer-events: none; opacity: 0;
        transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 2147483647;
      }
      #tinyhand-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    `;
    shadowRoot.appendChild(styleEl);

    // Container
    containerEl = document.createElement("div");
    containerEl.id = "tinyhand-container";

    // SVG for stick/rod coming from screen corner or bottom
    const svgNS = "http://www.w3.org/2000/svg";
    armSvgEl = document.createElementNS(svgNS, "svg");
    armSvgEl.id = "tinyhand-arm-svg";
    armSvgEl.innerHTML = `
      <defs>
        <filter id="rod-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.38"/>
        </filter>
        <linearGradient id="rod-grad-carbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#141416"/>
          <stop offset="30%" stop-color="#3A3A3C"/>
          <stop offset="70%" stop-color="#545458"/>
          <stop offset="100%" stop-color="#111113"/>
        </linearGradient>
        <linearGradient id="rod-grad-wood" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#5C3A21"/>
          <stop offset="40%" stop-color="#8B5A2B"/>
          <stop offset="70%" stop-color="#CD853F"/>
          <stop offset="100%" stop-color="#4A2E1B"/>
        </linearGradient>
      </defs>
      <line id="tinyhand-rod" x1="0" y1="0" x2="0" y2="0" stroke="url(#rod-grad-carbon)" stroke-width="7" stroke-linecap="round" filter="url(#rod-shadow)" />
      <circle id="tinyhand-ferrule" cx="0" cy="0" r="5" fill="#D4AF37" stroke="#8C7320" stroke-width="1.5" filter="url(#rod-shadow)" />
    `;
    containerEl.appendChild(armSvgEl);

    rodEl = armSvgEl.querySelector("#tinyhand-rod");
    ferruleEl = armSvgEl.querySelector("#tinyhand-ferrule");

    // Canvas for drawing
    canvasEl = document.createElement("canvas");
    canvasEl.id = "tinyhand-canvas";
    ctx = canvasEl.getContext("2d");
    containerEl.appendChild(canvasEl);

    // Pointer wrapper
    pointerEl = document.createElement("div");
    pointerEl.id = "tinyhand-pointer";

    innerEl = document.createElement("div");
    innerEl.id = "tinyhand-inner";
    pointerEl.appendChild(innerEl);

    imgEl = document.createElement("img");
    imgEl.id = "tinyhand-img";
    imgEl.draggable = false;
    innerEl.appendChild(imgEl);

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

  // 3. Update Cursor Override (Hide native cursor behind hand)
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

  // 4. Update Visual Appearance based on Settings
  function updatePointerVisuals() {
    updateCursorVisibility();

    if (!pointerEl || !imgEl || !innerEl) return;

    if (!settings.enabled) {
      pointerEl.style.display = "none";
      if (rodEl) rodEl.style.display = "none";
      if (ferruleEl) ferruleEl.style.display = "none";
      return;
    }

    // Default center if cursor coordinates not yet available
    if (mouseX < 0 || mouseY < 0) {
      mouseX = Math.round(window.innerWidth / 2);
      mouseY = Math.round(window.innerHeight / 2);
    }

    pointerEl.style.display = "block";

    // Set Image Source
    if (settings.style === "custom" && settings.customImage) {
      imgEl.src = settings.customImage;
    } else if (settings.style === "laser") {
      imgEl.src = chrome.runtime.getURL("hands/laser-dot.svg");
    } else {
      imgEl.src = chrome.runtime.getURL(`hands/hand_${settings.style}.png`);
    }

    // Set Size
    pointerEl.style.width = settings.size + "px";
    pointerEl.className = `style-${settings.style}`;

    startMainLoop();
  }

  // 5. Main Animation & Physics Loop (Stick geometry, idle breathing, click tap)
  function startMainLoop() {
    if (!mainLoopId) {
      mainLoopId = requestAnimationFrame(mainLoop);
    }
  }

  function mainLoop(timestamp) {
    if (!settings.enabled || !isMouseInside) {
      mainLoopId = null;
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;

    // A) Calculate Target Base Point for the Stick
    let targetBaseX = w * 0.95;
    let targetBaseY = h + 20;

    if (settings.stickOrigin === "bottom-left") {
      targetBaseX = w * 0.05;
      targetBaseY = h + 20;
    } else if (settings.stickOrigin === "dynamic") {
      // Base follows cursor horizontally with a natural offset
      targetBaseX = Math.min(Math.max(mouseX + w * 0.22, w * 0.15), w * 0.95);
      targetBaseY = h + 20;
    }

    if (currentBaseX < 0 || currentBaseY < 0) {
      currentBaseX = targetBaseX;
      currentBaseY = targetBaseY;
    } else {
      // Fluid spring interpolation for base
      currentBaseX += (targetBaseX - currentBaseX) * 0.08;
      currentBaseY += (targetBaseY - currentBaseY) * 0.08;
    }

    // B) Idle Breathing Sway Animation ("Dezente Animation im Stillstand")
    let swayAngle = 0;
    let breatheLift = 0;
    if (settings.idleAnimation) {
      idlePhase += 0.035;
      swayAngle = Math.sin(idlePhase) * 0.75; // 0.75 deg gentle rocking
      breatheLift = Math.cos(idlePhase * 0.7) * 1.5; // 1.5px subtle float
    }

    // C) Click Tap Spring Damping
    pressAmount += (0 - pressAmount) * 0.18;
    const pressDip = pressAmount * 7;
    const pressScale = 1 - pressAmount * 0.05;

    // D) Position Hand and Stick
    if (pointerEl && imgEl && innerEl) {
      const tipYTarget = mouseY + breatheLift;

      if (settings.style === "laser") {
        // Laser dot pointer
        if (rodEl) rodEl.style.display = "none";
        if (ferruleEl) ferruleEl.style.display = "none";
        pointerEl.style.left = mouseX + "px";
        pointerEl.style.top = mouseY + "px";
        pointerEl.style.transform = "translate(-50%, -50%)";
        innerEl.style.transform = `scale(${1 + pressAmount * 0.35})`;
      } else if (settings.stickOrigin === "floating") {
        // Free-floating pointer without stick to screen edge
        if (rodEl) rodEl.style.display = "none";
        if (ferruleEl) ferruleEl.style.display = "none";
        const m = STYLE_MEASUREMENTS[settings.style] || { tipX: 0.4644, tipY: 0.0775 };
        pointerEl.style.left = mouseX + "px";
        pointerEl.style.top = tipYTarget + "px";
        pointerEl.style.transform = `translate(-${m.tipX * 100}%, -${m.tipY * 100}%) rotate(${swayAngle}deg)`;
        innerEl.style.transformOrigin = `${m.tipX * 100}% ${m.tipY * 100}%`;
        innerEl.style.transform = `scale(${pressScale}) rotate(${-pressAmount * 8}deg)`;
      } else {
        // Stick mode: stick extending from corner / bottom to hand!
        if (rodEl) rodEl.style.display = "block";
        if (ferruleEl) ferruleEl.style.display = "block";

        const dx = mouseX - currentBaseX;
        const dy = tipYTarget - currentBaseY;
        const aimAngle = Math.atan2(dy, dx); // radians
        const aimDeg = (aimAngle * 180) / Math.PI + 90;
        const totalRot = aimDeg + swayAngle;

        const m = STYLE_MEASUREMENTS[settings.style] || { tipX: 0.4644, tipY: 0.0775 };
        pointerEl.style.left = mouseX + "px";
        pointerEl.style.top = tipYTarget + "px";
        pointerEl.style.transform = `translate(-${m.tipX * 100}%, -${m.tipY * 100}%) rotate(${totalRot}deg)`;
        innerEl.style.transformOrigin = `${m.tipX * 100}% ${m.tipY * 100}%`;
        innerEl.style.transform = `translate(0, ${pressDip}px) scale(${pressScale}) rotate(${-pressAmount * 4}deg)`;

        // Calculate wrist connection point along the stick
        const wristOffset = settings.size * 1.5 * 0.27;
        const wristX = mouseX - Math.cos(aimAngle) * wristOffset;
        const wristY = tipYTarget - Math.sin(aimAngle) * wristOffset;

        if (rodEl) {
          rodEl.setAttribute("x1", currentBaseX);
          rodEl.setAttribute("y1", currentBaseY);
          rodEl.setAttribute("x2", wristX);
          rodEl.setAttribute("y2", wristY);

          const rodW = Math.max(5, Math.round(settings.size * 0.042));
          rodEl.setAttribute("stroke-width", rodW);
          rodEl.setAttribute("stroke", settings.style === "wood" ? "url(#rod-grad-wood)" : "url(#rod-grad-carbon)");

          if (ferruleEl) {
            ferruleEl.setAttribute("cx", wristX);
            ferruleEl.setAttribute("cy", wristY);
            ferruleEl.setAttribute("r", Math.round(rodW * 0.65));
          }
        }
      }
    }

    // E) Render fading ink drawings on canvas
    renderCanvasStrokes();

    mainLoopId = requestAnimationFrame(mainLoop);
  }

  // 6. Click Feedback (Tap Dip Animation + Expanding Ripple)
  function triggerClickFeedback(x, y) {
    if (!settings.enabled) return;

    // A) Tap impulse on hand
    pressAmount = 1.0;

    // B) Glowing Ripple at fingertip
    const ripple = document.createElement("div");
    ripple.className = "tinyhand-ripple";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";

    // Ripple color matching drawing ink or vibrant purple/red
    const rippleColor = settings.color || "#8E5AF7";
    ripple.style.borderColor = rippleColor;
    ripple.style.boxShadow = `0 0 10px ${rippleColor}`;

    containerEl.appendChild(ripple);
    setTimeout(() => {
      ripple.remove();
    }, 500);

    startMainLoop();
  }

  // 7. Toast Feedback
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 1600);
  }

  // 8. Ephemeral Canvas Ink Renderer
  function renderCanvasStrokes() {
    if (!ctx || !canvasEl) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const now = performance.now();

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
  }

  function shouldDraw(e) {
    if (!settings.enabled) return false;
    if (settings.drawModifier === "shift") return e.shiftKey;
    if (settings.drawModifier === "alt") return e.altKey;
    if (settings.drawModifier === "always") return true;
    return e.shiftKey;
  }

  // 9. Event Listeners
  window.addEventListener("resize", resizeCanvas, { passive: true });

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isMouseInside) {
      isMouseInside = true;
      updateCursorVisibility();
    }

    if (settings.enabled) {
      if (pointerEl) pointerEl.style.display = "block";
      startMainLoop();
    }

    if (drawing && currentStroke) {
      currentStroke.points.push({ x: e.clientX, y: e.clientY, time: performance.now() });
      startMainLoop();
    }
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    isMouseInside = false;
    if (pointerEl) pointerEl.style.display = "none";
    if (rodEl) rodEl.style.display = "none";
    if (ferruleEl) ferruleEl.style.display = "none";
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
    if (settings.enabled) {
      if (pointerEl) pointerEl.style.display = "block";
      startMainLoop();
    }
    updateCursorVisibility();
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
      startMainLoop();
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
      startMainLoop();
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

  // 10. Chrome Runtime & Storage Integration
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
