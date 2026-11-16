/**
 * tinyhandChrome - Content Script
 * Injects isolated Closed Shadow DOM overlay (in top frame) or lightweight coordinate bridge (in iframes),
 * with smooth bottom-edge stick mechanics, metallic ferrule, focus spotlight, and shape/freehand canvas ink.
 */

(function () {
  if (window.__TINYHAND_INITIALIZED__) return;
  window.__TINYHAND_INITIALIZED__ = true;

  const GEO = globalThis.__TINYHAND_GEO__;
  if (!GEO) return;

  const IS_TOP_FRAME = (function () {
    try {
      return window === window.top;
    } catch (_) {
      return false;
    }
  })();

  let settings = { ...GEO.DEFAULT_SETTINGS };

  // Drawing state (top frame)
  let drawing = false;
  let currentStroke = null;
  let strokes = [];

  // Physics & Animation state (top frame)
  let mouseX = -9999;
  let mouseY = -9999;
  let prevFrameX = -9999;
  let prevFrameY = -9999;
  let smoothedVx = 0;
  let smoothedVy = 0;
  let inertiaAngle = 0;
  let movePhase = 0;
  let isMouseInside = false;
  let hideExitTimer = null;
  let currentBaseX = -1;
  let currentBaseY = -1;
  let idlePhase = 0;
  let pressAmount = 0;
  let mainLoopId = null;
  let lastLoopTime = 0;

  // Cursor override element (used in top frame AND child frames)
  let cursorStyleEl = null;

  // Top-frame Shadow DOM references
  let hostEl = null;
  let shadowRoot = null;
  let containerEl = null;
  let spotlightEl = null;
  let canvasEl = null;
  let ctx = null;
  let armSvgEl = null;
  let rodEl = null;
  let ferruleEl = null;
  let rodGradCylEl = null;
  let ferruleGradCylEl = null;
  let pointerEl = null;
  let innerEl = null;
  let imgEl = null;
  let toastEl = null;
  let toastTimeout = null;

  function isExtensionValid() {
    try {
      return typeof chrome !== "undefined" && Boolean(chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  function t(key, substitutions, fallback) {
    try {
      const msg = chrome.i18n?.getMessage?.(key, substitutions);
      if (msg) return msg;
    } catch (_) {}
    return fallback;
  }

  function updateCursorVisibility() {
    const shouldHide = IS_TOP_FRAME
      ? (settings.enabled && settings.hideNativeCursor && isMouseInside)
      : (settings.enabled && settings.hideNativeCursor);

    if (shouldHide) {
      if (!cursorStyleEl || !cursorStyleEl.isConnected) {
        const stale = document.getElementById("tinyhand-cursor-override");
        if (stale) stale.remove();
        cursorStyleEl = document.createElement("style");
        cursorStyleEl.id = "tinyhand-cursor-override";
        cursorStyleEl.textContent = `
          *, *:hover, *:active, *::before, *::after {
            cursor: none !important;
          }
        `;
        (document.head || document.documentElement).appendChild(cursorStyleEl);
      }
    } else if (cursorStyleEl) {
      cursorStyleEl.remove();
      cursorStyleEl = null;
    }
  }

  function handleExtensionInvalidated() {
    settings.enabled = false;
    settings.spotlight = false;
    isMouseInside = false;
    if (hideExitTimer) {
      clearTimeout(hideExitTimer);
      hideExitTimer = null;
    }
    if (mainLoopId) {
      cancelAnimationFrame(mainLoopId);
      mainLoopId = null;
    }
    if (spotlightEl) spotlightEl.classList.remove("active");
    if (pointerEl) pointerEl.style.display = "none";
    if (rodEl) rodEl.style.display = "none";
    if (ferruleEl) ferruleEl.style.display = "none";
    if (hostEl) {
      hostEl.remove();
      hostEl = null;
    }
    updateCursorVisibility();
  }

  function findChildFrameElement(sourceWindow) {
    if (!sourceWindow) return null;
    const frames = document.querySelectorAll("iframe, frame");
    for (let i = 0; i < frames.length; i++) {
      try {
        if (frames[i].contentWindow === sourceWindow) {
          return frames[i];
        }
      } catch (_) {}
    }
    return null;
  }

  function translateFramePoint(frameEl, x, y) {
    const rect = frameEl.getBoundingClientRect();
    const cs = getComputedStyle(frameEl);
    const padLeft = parseFloat(cs.borderLeftWidth || "0") + parseFloat(cs.paddingLeft || "0");
    const padTop = parseFloat(cs.borderTopWidth || "0") + parseFloat(cs.paddingTop || "0");
    return {
      x: rect.left + padLeft + x,
      y: rect.top + padTop + y
    };
  }

  function shouldDrawWithState(shiftKey, altKey) {
    if (!settings.enabled) return false;
    if (settings.drawModifier === "shift") return Boolean(shiftKey);
    if (settings.drawModifier === "alt") return Boolean(altKey);
    if (settings.drawModifier === "always") return true;
    return Boolean(shiftKey);
  }

  // =========================================================================
  // CHILD FRAME LIGHTWEIGHT BRIDGE (!IS_TOP_FRAME)
  // =========================================================================
  if (!IS_TOP_FRAME) {
    function postToParent(payload) {
      if (!isExtensionValid()) {
        handleExtensionInvalidated();
        return;
      }
      if (!settings.enabled) return;
      try {
        window.parent.postMessage({ __tinyhandBridge: "v1", ...payload }, "*");
      } catch (_) {}
    }

    // Relay messages from deeper nested frames upward with cumulative rect offset
    window.addEventListener("message", (e) => {
      const data = e.data;
      if (!data || data.__tinyhandBridge !== "v1") return;
      if (!Number.isFinite(data.clientX) || !Number.isFinite(data.clientY)) return;
      const childEl = findChildFrameElement(e.source);
      if (!childEl) return;
      const mapped = translateFramePoint(childEl, data.clientX, data.clientY);
      postToParent({
        ...data,
        clientX: mapped.x,
        clientY: mapped.y
      });
    });

    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "touch") {
        postToParent({ kind: "move", clientX: e.clientX, clientY: e.clientY });
      }
    }, { capture: true, passive: true });

    document.addEventListener("mouseenter", (e) => {
      postToParent({ kind: "move", clientX: e.clientX, clientY: e.clientY });
    });

    document.addEventListener("mouseleave", () => {
      postToParent({ kind: "leave", clientX: 0, clientY: 0 });
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0 && shouldDrawWithState(e.shiftKey, e.altKey)) {
        e.preventDefault();
      }
      postToParent({
        kind: "down",
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
        shiftKey: e.shiftKey,
        altKey: e.altKey
      });
    }, true);

    window.addEventListener("mouseup", (e) => {
      postToParent({
        kind: "up",
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button
      });
    }, true);

    window.addEventListener("dblclick", (e) => {
      postToParent({
        kind: "dblclick",
        clientX: e.clientX,
        clientY: e.clientY
      });
    }, { capture: true, passive: true });

    window.addEventListener("keydown", (e) => {
      if (!settings.enabled) return;
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "c") {
        postToParent({ kind: "clear", clientX: 0, clientY: 0 });
      } else if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "z") {
        postToParent({ kind: "undo", clientX: 0, clientY: 0 });
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      for (const [key, change] of Object.entries(changes)) {
        settings[key] = change.newValue;
      }
      updateCursorVisibility();
    });

    (async function () {
      try {
        const stored = await chrome.storage.local.get(null);
        settings = { ...settings, ...stored };
      } catch (_) {}
      updateCursorVisibility();
    })();
    return;
  }

  // =========================================================================
  // TOP FRAME FULL OVERLAY (IS_TOP_FRAME === true)
  // =========================================================================

  function initDOM() {
    // Clean up any orphaned host/style elements left after an extension reload
    document.getElementById("tinyhand-host")?.remove();
    document.getElementById("tinyhand-cursor-override")?.remove();

    hostEl = document.createElement("div");
    hostEl.id = "tinyhand-host";
    hostEl.style.position = "fixed";
    hostEl.style.top = "0";
    hostEl.style.left = "0";
    hostEl.style.width = "0";
    hostEl.style.height = "0";
    hostEl.style.pointerEvents = "none";
    hostEl.style.zIndex = "2147483647";

    shadowRoot = hostEl.attachShadow({ mode: "closed" });

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      :host { all: initial; }
      #tinyhand-container {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        pointer-events: none !important; z-index: 2147483647 !important;
        overflow: hidden; user-select: none; -webkit-user-select: none;
      }
      #tinyhand-spotlight {
        position: fixed; inset: 0;
        pointer-events: none !important;
        opacity: 0;
        transition: opacity 0.2s ease-out;
        background: radial-gradient(
          circle at var(--spot-x, 50%) var(--spot-y, 50%),
          rgba(0, 0, 0, 0) calc(var(--spot-r, 150px) * 0.65),
          rgba(0, 0, 0, calc(var(--spot-dim, 0.5) * 0.48)) calc(var(--spot-r, 150px) * 0.88),
          rgba(0, 0, 0, var(--spot-dim, 0.5)) var(--spot-r, 150px)
        );
      }
      #tinyhand-spotlight.active {
        opacity: 1;
      }
      @media (prefers-reduced-motion: reduce) {
        #tinyhand-spotlight { transition: none; }
      }
      #tinyhand-canvas {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none !important;
      }
      #tinyhand-arm-svg {
        position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
        pointer-events: none !important; overflow: visible;
      }
      #tinyhand-pointer {
        position: absolute; pointer-events: none !important;
        will-change: left, top, transform; display: none;
        z-index: 2147483647 !important;
      }
      #tinyhand-inner {
        display: block; width: 100%; height: auto; pointer-events: none !important;
        will-change: transform;
      }
      #tinyhand-img {
        display: block; width: 100%; height: auto; pointer-events: none !important;
      }
      .tinyhand-ripple {
        position: absolute; border-radius: 50%; pointer-events: none !important;
        transform: translate(-50%, -50%); box-sizing: border-box;
        animation: tinyhand-ripple-anim 0.45s ease-out forwards;
      }
      .tinyhand-ripple.tinyhand-ripple-right {
        border-style: dashed !important;
        animation: tinyhand-ripple-right-anim 0.52s ease-out forwards;
      }
      .tinyhand-ripple.tinyhand-ripple-double {
        animation: tinyhand-ripple-double-anim 0.55s ease-out forwards;
      }
      @keyframes tinyhand-ripple-anim {
        0% { width: 8px; height: 8px; opacity: 0.92; border-width: 3px; border-style: solid; }
        100% { width: 66px; height: 66px; opacity: 0; border-width: 1.5px; border-style: solid; }
      }
      @keyframes tinyhand-ripple-right-anim {
        0% { width: 10px; height: 10px; opacity: 0.95; border-width: 3px; }
        100% { width: 72px; height: 72px; opacity: 0; border-width: 2px; }
      }
      @keyframes tinyhand-ripple-double-anim {
        0% { width: 10px; height: 10px; opacity: 0.95; border-width: 4px; border-style: double; }
        100% { width: 86px; height: 86px; opacity: 0; border-width: 4px; border-style: double; }
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

    containerEl = document.createElement("div");
    containerEl.id = "tinyhand-container";

    // Spotlight layer (lowest overlay layer so drawings and pointer stay luminous inside/outside)
    spotlightEl = document.createElement("div");
    spotlightEl.id = "tinyhand-spotlight";
    containerEl.appendChild(spotlightEl);

    // Canvas for drawing
    canvasEl = document.createElement("canvas");
    canvasEl.id = "tinyhand-canvas";
    ctx = canvasEl.getContext("2d");
    containerEl.appendChild(canvasEl);

    // SVG for stick/rod and machined metallic ferrule collar
    const svgNS = "http://www.w3.org/2000/svg";
    armSvgEl = document.createElementNS(svgNS, "svg");
    armSvgEl.id = "tinyhand-arm-svg";
    armSvgEl.innerHTML = `
      <defs>
        <linearGradient id="rod-grad-cylinder" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">
          <stop id="rod-stop-0" offset="0%" stop-color="#121214"/>
          <stop id="rod-stop-1" offset="25%" stop-color="#262629"/>
          <stop id="rod-stop-2" offset="48%" stop-color="#5C5C64"/>
          <stop id="rod-stop-3" offset="72%" stop-color="#262629"/>
          <stop id="rod-stop-4" offset="100%" stop-color="#060608"/>
        </linearGradient>
        <linearGradient id="ferrule-grad-cylinder" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">
          <stop id="ferrule-stop-0" offset="0%" stop-color="#505058"/>
          <stop id="ferrule-stop-1" offset="32%" stop-color="#DCDCE4"/>
          <stop id="ferrule-stop-2" offset="68%" stop-color="#8E8E96"/>
          <stop id="ferrule-stop-3" offset="100%" stop-color="#3A3A40"/>
        </linearGradient>
      </defs>
      <line id="tinyhand-rod" x1="0" y1="0" x2="0" y2="0" stroke="url(#rod-grad-cylinder)" stroke-width="7" stroke-linecap="round" />
      <line id="tinyhand-ferrule" x1="0" y1="0" x2="0" y2="0" stroke="url(#ferrule-grad-cylinder)" stroke-width="10" stroke-linecap="butt" />
    `;
    containerEl.appendChild(armSvgEl);

    rodEl = armSvgEl.querySelector("#tinyhand-rod");
    ferruleEl = armSvgEl.querySelector("#tinyhand-ferrule");
    rodGradCylEl = armSvgEl.querySelector("#rod-grad-cylinder");
    ferruleGradCylEl = armSvgEl.querySelector("#ferrule-grad-cylinder");

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

    toastEl = document.createElement("div");
    toastEl.id = "tinyhand-toast";
    containerEl.appendChild(toastEl);

    shadowRoot.appendChild(containerEl);
    document.documentElement.appendChild(hostEl);

    resizeCanvas();
    updatePointerVisuals();
  }

  function resizeCanvas() {
    if (!canvasEl || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvasEl.width = Math.floor(w * dpr);
    canvasEl.height = Math.floor(h * dpr);
    canvasEl.style.width = w + "px";
    canvasEl.style.height = h + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function updateShadowStyles() {
    if (!innerEl || !armSvgEl) return;

    const intensity = settings.shadowIntensity !== undefined ? Number(settings.shadowIntensity) : 50;
    const factor = intensity / 100;

    if (settings.style === "laser") {
      const laserGlow = Math.round(14 * (0.4 + 0.6 * factor));
      const laserOp = (0.5 + 0.45 * factor).toFixed(2);
      innerEl.style.filter = `drop-shadow(0 0 ${laserGlow}px rgba(255, 59, 48, ${laserOp}))`;
    } else if (intensity <= 0) {
      innerEl.style.filter = "none";
    } else {
      const dx = Math.round(1 * factor);
      const dy = Math.max(1, Math.round(7 * factor));
      const blur = Math.max(2, Math.round(14 * factor));
      const op = (0.15 + 0.50 * factor).toFixed(2);
      innerEl.style.filter = `drop-shadow(${dx}px ${dy}px ${blur}px rgba(0, 0, 0, ${op}))`;
    }

    if (intensity <= 0) {
      armSvgEl.style.filter = "none";
    } else {
      const rodDy = Math.max(1, Math.round(6 * factor));
      const rodBlur = Math.max(2, Math.round(7 * factor));
      const rodOp = (0.15 + 0.45 * factor).toFixed(2);
      armSvgEl.style.filter = `drop-shadow(2px ${rodDy}px ${rodBlur}px rgba(0, 0, 0, ${rodOp}))`;
    }
  }

  function updateRodTheme() {
    if (!armSvgEl) return;
    const { palette: p } = GEO.resolveRodPalette(settings);

    const s0 = armSvgEl.querySelector("#rod-stop-0");
    const s1 = armSvgEl.querySelector("#rod-stop-1");
    const s2 = armSvgEl.querySelector("#rod-stop-2");
    const s3 = armSvgEl.querySelector("#rod-stop-3");
    const s4 = armSvgEl.querySelector("#rod-stop-4");
    if (s0) s0.setAttribute("stop-color", p.shadow);
    if (s1) s1.setAttribute("stop-color", p.midtone);
    if (s2) s2.setAttribute("stop-color", p.highlight);
    if (s3) s3.setAttribute("stop-color", p.midtone);
    if (s4) s4.setAttribute("stop-color", p.deepShadow);

    const fColors = p.ferrule || ["#505058", "#DCDCE4", "#8E8E96", "#3A3A40"];
    const f0 = armSvgEl.querySelector("#ferrule-stop-0");
    const f1 = armSvgEl.querySelector("#ferrule-stop-1");
    const f2 = armSvgEl.querySelector("#ferrule-stop-2");
    const f3 = armSvgEl.querySelector("#ferrule-stop-3");
    if (f0) f0.setAttribute("stop-color", fColors[0]);
    if (f1) f1.setAttribute("stop-color", fColors[1]);
    if (f2) f2.setAttribute("stop-color", fColors[2]);
    if (f3) f3.setAttribute("stop-color", fColors[3]);
  }

  function updateSpotlightVisuals(renderActive) {
    if (!spotlightEl) return;
    const active = Boolean(renderActive && settings.spotlight);
    spotlightEl.classList.toggle("active", active);
    if (active) {
      const r = Number(settings.spotlightRadius ?? 150);
      const dim = Math.max(0.1, Math.min(0.9, Number(settings.spotlightOpacity ?? 50) / 100));
      spotlightEl.style.setProperty("--spot-r", `${r}px`);
      spotlightEl.style.setProperty("--spot-dim", dim.toFixed(2));
      spotlightEl.style.setProperty("--spot-x", `${mouseX}px`);
      spotlightEl.style.setProperty("--spot-y", `${mouseY}px`);
    }
  }

  function updatePointerVisuals() {
    if (!isExtensionValid()) {
      handleExtensionInvalidated();
      return;
    }

    if (!isMouseInside && document.documentElement && document.documentElement.matches(":hover")) {
      isMouseInside = true;
    }

    updateCursorVisibility();

    if (!pointerEl || !imgEl || !innerEl) return;

    if (!settings.enabled) {
      pointerEl.style.display = "none";
      if (rodEl) rodEl.style.display = "none";
      if (ferruleEl) ferruleEl.style.display = "none";
      updateSpotlightVisuals(false);
      return;
    }

    if (mouseX < 0 || mouseY < 0) {
      mouseX = Math.round(window.innerWidth / 2);
      mouseY = Math.round(window.innerHeight / 2);
    }

    pointerEl.style.display = isMouseInside ? "block" : "none";
    updateSpotlightVisuals(isMouseInside);

    try {
      if (settings.style === "custom" && settings.customImage) {
        imgEl.src = settings.customImage;
      } else if (settings.style === "laser") {
        imgEl.src = chrome.runtime.getURL("hands/laser-dot.svg");
      } else {
        imgEl.src = chrome.runtime.getURL(`hands/hand_${settings.style}.png`);
      }
    } catch (_) {
      handleExtensionInvalidated();
      return;
    }

    // Horizontal flip only mirrors custom image pixels; rotation/pivot stay clean in unmirrored parent space
    imgEl.style.transform = (settings.style === "custom" && settings.customFlipX) ? "scaleX(-1)" : "";

    pointerEl.style.width = settings.size + "px";
    pointerEl.className = `style-${settings.style}`;

    updateRodTheme();
    updateShadowStyles();
    startMainLoop();
  }

  function startMainLoop() {
    if (!mainLoopId) {
      lastLoopTime = 0;
      mainLoopId = requestAnimationFrame(mainLoop);
    }
  }

  function setCylinderGradient(gradEl, ax, ay, bx, by, nx, ny, halfWidth) {
    if (!gradEl) return;
    const midX = (ax + bx) / 2;
    const midY = (ay + by) / 2;
    gradEl.setAttribute("x1", midX - nx * halfWidth);
    gradEl.setAttribute("y1", midY - ny * halfWidth);
    gradEl.setAttribute("x2", midX + nx * halfWidth);
    gradEl.setAttribute("y2", midY + ny * halfWidth);
  }

  function mainLoop(timestamp) {
    if (!isExtensionValid()) {
      handleExtensionInvalidated();
      return;
    }

    const shouldRenderPointer = settings.enabled && isMouseInside;
    const hasPendingStrokes = settings.enabled && strokes.length > 0;

    if (!shouldRenderPointer && !hasPendingStrokes) {
      mainLoopId = null;
      lastLoopTime = 0;
      updateSpotlightVisuals(false);
      return;
    }

    if (!lastLoopTime) lastLoopTime = timestamp;
    const rawDt = timestamp - lastLoopTime;
    lastLoopTime = timestamp;
    const dtScale = Math.min(3.0, Math.max(0.15, (rawDt > 0 ? rawDt : 16.67) / 16.67));
    const smoothK = (rate60) => 1 - Math.pow(1 - rate60, dtScale);

    if (shouldRenderPointer) {
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (prevFrameX < 0 || prevFrameY < 0) {
        prevFrameX = mouseX;
        prevFrameY = mouseY;
      }
      const instVx = (mouseX - prevFrameX) / dtScale;
      const instVy = (mouseY - prevFrameY) / dtScale;
      prevFrameX = mouseX;
      prevFrameY = mouseY;

      const velK = smoothK(0.28);
      smoothedVx += (instVx - smoothedVx) * velK;
      smoothedVy += (instVy - smoothedVy) * velK;
      const currentSpeed = Math.hypot(smoothedVx, smoothedVy);

      const motionFactor = settings.idleAnimation !== false ? ((settings.animMotionStrength ?? 100) / 100) : 0;
      const breatheFactor = settings.idleAnimation !== false ? ((settings.animBreatheStrength ?? 100) / 100) : 0;

      const { targetBaseX, targetBaseY } = GEO.computeStickTargetBase(
        settings.stickOrigin,
        mouseX,
        w,
        h,
        settings.size
      );

      if (currentBaseX < 0 || currentBaseY < 0) {
        currentBaseX = targetBaseX;
        currentBaseY = targetBaseY;
      } else {
        const rate60 = motionFactor === 0 ? 0.9 : (settings.stickOrigin === "dynamic" ? 0.72 : 0.55);
        const followK = smoothK(rate60);
        currentBaseX += (targetBaseX - currentBaseX) * followK;
        currentBaseY += (targetBaseY - currentBaseY) * followK;
      }

      let swayAngle = 0;
      let breatheLift = 0;
      let idleBaseSway = 0;
      let moveTilt = 0;
      let moveLift = 0;
      let motionLag = 0;
      let inertiaBaseLag = 0;

      const idleWeight = Math.max(0, 1 - currentSpeed * 0.25);

      if (breatheFactor > 0) {
        idlePhase += 0.035 * dtScale;
        swayAngle = Math.sin(idlePhase) * (0.75 * idleWeight) * breatheFactor;
        breatheLift = Math.cos(idlePhase * 0.7) * (1.5 * idleWeight) * breatheFactor;
        idleBaseSway = Math.sin(idlePhase * 0.85) * (9 * idleWeight) * breatheFactor;
      }

      if (motionFactor > 0) {
        const targetInertia = Math.max(-4.0, Math.min(4.0, -smoothedVx * 0.15)) * motionFactor;
        inertiaAngle += (targetInertia - inertiaAngle) * smoothK(0.20);

        if (currentSpeed > 0.4) {
          movePhase += Math.min(currentSpeed * 0.04, 0.22) * dtScale;
        }
        moveTilt = Math.sin(movePhase) * Math.min(currentSpeed * 0.05, 1.2) * motionFactor;
        moveLift = Math.cos(movePhase * 0.8) * Math.min(currentSpeed * 0.04, 1.5) * motionFactor;
        motionLag = Math.min(3.5, currentSpeed * 0.06) * motionFactor;
        inertiaBaseLag = Math.max(-36, Math.min(36, -smoothedVx * 0.18)) * motionFactor;
      } else {
        inertiaAngle = 0;
      }

      pressAmount += (0 - pressAmount) * smoothK(0.18);
      if (pressAmount < 0.001) pressAmount = 0;
      const pressDip = pressAmount * 7;
      const pressScale = 1 - pressAmount * 0.05;

      // Update Spotlight position seamlessly without transition delay
      if (settings.spotlight && spotlightEl) {
        spotlightEl.classList.add("active");
        spotlightEl.style.setProperty("--spot-x", `${mouseX}px`);
        spotlightEl.style.setProperty("--spot-y", `${mouseY}px`);
      } else if (spotlightEl) {
        spotlightEl.classList.remove("active");
      }

      if (pointerEl && imgEl && innerEl) {
        const tipYTarget = mouseY + breatheLift + moveLift;
        const motionAngle = inertiaAngle + moveTilt;
        const totalExtraAngle = swayAngle + motionAngle;

        if (settings.style === "laser") {
          if (rodEl) rodEl.style.display = "none";
          if (ferruleEl) ferruleEl.style.display = "none";
          pointerEl.style.left = mouseX + "px";
          pointerEl.style.top = mouseY + "px";
          pointerEl.style.transformOrigin = "50% 50%";
          pointerEl.style.transform = "translate(-50%, -50%)";
          const laserScale = (1 + pressAmount * 0.35) * (1 + Math.min(0.2, currentSpeed * 0.008));
          innerEl.style.transform = `scale(${laserScale})`;
        } else if (settings.stickOrigin === "floating") {
          if (rodEl) rodEl.style.display = "none";
          if (ferruleEl) ferruleEl.style.display = "none";
          const m = GEO.getStyleMeasurements(settings);

          const baseAngle = Number(settings.floatingAngle ?? -15);
          let dynamicTilt = 0;
          if (settings.floatingDynamic !== false) {
            const screenTilt = ((mouseX / (w || 1)) - 0.5) * 20;
            const velocityTilt = Math.max(-8, Math.min(8, -smoothedVx * 0.16)) * (motionFactor || 1);
            dynamicTilt = screenTilt + velocityTilt;
          }

          const finalAngle = baseAngle + dynamicTilt + totalExtraAngle;

          pointerEl.style.transformOrigin = `${m.tipX * 100}% ${m.tipY * 100}%`;
          pointerEl.style.left = mouseX + "px";
          pointerEl.style.top = tipYTarget + "px";
          pointerEl.style.transform = `translate(-${m.tipX * 100}%, -${m.tipY * 100}%) rotate(${finalAngle}deg)`;
          innerEl.style.transformOrigin = `${m.tipX * 100}% ${m.tipY * 100}%`;
          innerEl.style.transform = `translate(0, ${pressDip + motionLag}px) scale(${pressScale}) rotate(${-pressAmount * 8 + motionAngle * 0.3}deg)`;
        } else {
          if (rodEl) rodEl.style.display = "block";
          if (ferruleEl) ferruleEl.style.display = "block";

          const m = GEO.getStyleMeasurements(settings);
          const renderBaseX = currentBaseX + idleBaseSway + inertiaBaseLag;
          const renderBaseY = currentBaseY;

          const geom = GEO.solveCollinearRodAlignment({
            mouseX,
            tipYTarget,
            renderBaseX,
            renderBaseY,
            size: settings.size,
            rodWidth: settings.rodWidth,
            pressScale,
            measurements: m
          });

          pointerEl.style.transformOrigin = `${m.tipX * 100}% ${m.tipY * 100}%`;
          pointerEl.style.left = mouseX + "px";
          pointerEl.style.top = tipYTarget + "px";
          pointerEl.style.transform = `translate(-${m.tipX * 100}%, -${m.tipY * 100}%) rotate(${geom.totalRotDeg}deg)`;
          innerEl.style.transformOrigin = `${m.tipX * 100}% ${m.tipY * 100}%`;
          innerEl.style.transform = `scale(${pressScale})`;

          rodEl.setAttribute("x1", renderBaseX);
          rodEl.setAttribute("y1", renderBaseY);
          rodEl.setAttribute("x2", geom.rodEndX);
          rodEl.setAttribute("y2", geom.rodEndY);
          rodEl.setAttribute("stroke-width", geom.rodW);

          if (ferruleEl) {
            ferruleEl.setAttribute("x1", geom.ferruleStartX);
            ferruleEl.setAttribute("y1", geom.ferruleStartY);
            ferruleEl.setAttribute("x2", geom.ferruleEndX);
            ferruleEl.setAttribute("y2", geom.ferruleEndY);
            ferruleEl.setAttribute("stroke-width", geom.ferruleW);
          }

          setCylinderGradient(rodGradCylEl, renderBaseX, renderBaseY, geom.rodEndX, geom.rodEndY, geom.nx, geom.ny, geom.rodW / 2);
          setCylinderGradient(ferruleGradCylEl, geom.ferruleStartX, geom.ferruleStartY, geom.ferruleEndX, geom.ferruleEndY, geom.nx, geom.ny, geom.ferruleW / 2);
        }
      }
    } else {
      updateSpotlightVisuals(false);
    }

    renderCanvasStrokes();
    mainLoopId = requestAnimationFrame(mainLoop);
  }

  function triggerClickFeedback(x, y, variant = "left") {
    if (!settings.enabled || !containerEl) return;

    pressAmount = variant === "right" ? 0.65 : 1.0;

    if (settings.clickRipple !== false) {
      const ripple = document.createElement("div");
      let cls = "tinyhand-ripple";
      let ringColor = settings.color || "#8E5AF7";

      if (variant === "right") {
        cls += " tinyhand-ripple-right";
        ringColor = "#FF9F0A";
      } else if (variant === "double") {
        cls += " tinyhand-ripple-double";
      }

      ripple.className = cls;
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";
      ripple.style.borderColor = ringColor;
      ripple.style.boxShadow = `0 0 10px ${ringColor}`;

      containerEl.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
      }, 600);
    }

    startMainLoop();
  }

  function showToast(msg) {
    if (!toastEl || !msg) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 1700);
  }

  function drawRoundedRect(ctx2d, x, y, w, h, r) {
    if (typeof ctx2d.roundRect === "function") {
      ctx2d.beginPath();
      ctx2d.roundRect(x, y, w, h, r);
      return;
    }
    ctx2d.beginPath();
    ctx2d.rect(x, y, w, h);
  }

  function renderCanvasStrokes() {
    if (!ctx || !canvasEl) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const now = performance.now();

    strokes = strokes.filter((stroke) => {
      if (drawing && stroke === currentStroke) {
        stroke.lastTime = now;
      }

      const age = now - (stroke.lastTime || 0);
      let alpha = 1.0;
      if (settings.fadeDuration > 0 && !(drawing && stroke === currentStroke)) {
        if (age >= settings.fadeDuration) {
          return false;
        }
        const fadeStart = settings.fadeDuration * 0.65;
        if (age > fadeStart) {
          const fadeProgress = (age - fadeStart) / (settings.fadeDuration - fadeStart);
          alpha = Math.max(0, 1.0 - fadeProgress);
        }
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "arrow") {
        const arrow = GEO.computeArrowGeometry(stroke.startX, stroke.startY, stroke.endX, stroke.endY, stroke.width);
        if (arrow.isDot) {
          ctx.beginPath();
          ctx.arc(arrow.tipX, arrow.tipY, stroke.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(stroke.startX, stroke.startY);
          ctx.lineTo(arrow.shaftEndX, arrow.shaftEndY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arrow.tipX, arrow.tipY);
          ctx.lineTo(arrow.leftX, arrow.leftY);
          ctx.lineTo(arrow.rightX, arrow.rightY);
          ctx.closePath();
          ctx.fill();
        }
      } else if (stroke.tool === "rect") {
        const rect = GEO.computeNormalizedRect(stroke.startX, stroke.startY, stroke.endX, stroke.endY, stroke.width);
        if (rect.width < 3 && rect.height < 3) {
          ctx.beginPath();
          ctx.arc(stroke.startX, stroke.startY, stroke.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.radius);
          ctx.save();
          ctx.globalAlpha = alpha * 0.09;
          ctx.fill();
          ctx.restore();
          ctx.stroke();
        }
      } else {
        const pts = stroke.points;
        if (!pts || pts.length === 0) {
          ctx.restore();
          return false;
        }
        ctx.beginPath();
        if (pts.length === 1) {
          ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
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
      }

      ctx.restore();
      return true;
    });
  }

  function clearDrawings(showFeedback = true) {
    strokes = [];
    drawing = false;
    currentStroke = null;
    if (ctx && canvasEl) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
    if (showFeedback) {
      showToast(t("toastCleared", null, "Zeichnungen gelöscht"));
    }
  }

  function undoLastDrawing(showFeedback = true) {
    if (strokes.length === 0) return false;
    if (drawing) {
      drawing = false;
      currentStroke = null;
    }
    strokes.pop();
    renderCanvasStrokes();
    if (showFeedback) {
      showToast(t("toastUndo", null, "Letzte Markierung rückgängig"));
    }
    startMainLoop();
    return true;
  }

  function beginDraw(x, y) {
    const now = performance.now();
    drawing = true;
    currentStroke = {
      tool: settings.inkTool || "freehand",
      color: settings.color || "#8E5AF7",
      width: settings.strokeWidth || 4,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      lastTime: now,
      points: [{ x, y, time: now }]
    };
    strokes.push(currentStroke);
    startMainLoop();
  }

  function continueDraw(x, y) {
    if (!drawing || !currentStroke) return;
    const now = performance.now();
    currentStroke.endX = x;
    currentStroke.endY = y;
    currentStroke.lastTime = now;

    if (currentStroke.tool === "freehand") {
      const pts = currentStroke.points;
      const lastPt = pts[pts.length - 1];
      if (!lastPt || lastPt.x !== x || lastPt.y !== y) {
        pts.push({ x, y, time: now });
      }
    }
    startMainLoop();
  }

  function finishDraw(x, y) {
    if (!drawing) return;
    drawing = false;
    if (currentStroke) {
      const now = performance.now();
      currentStroke.endX = x;
      currentStroke.endY = y;
      currentStroke.lastTime = now;
      if (currentStroke.tool === "freehand") {
        currentStroke.points.push({ x, y, time: now });
      }
    }
    currentStroke = null;
    startMainLoop();
  }

  function cancelHideTimer() {
    if (hideExitTimer) {
      clearTimeout(hideExitTimer);
      hideExitTimer = null;
    }
  }

  function handleCursorMove(clientX, clientY) {
    if (!isExtensionValid()) {
      handleExtensionInvalidated();
      return;
    }
    cancelHideTimer();

    mouseX = clientX;
    mouseY = clientY;
    if (!isMouseInside) {
      isMouseInside = true;
      prevFrameX = clientX;
      prevFrameY = clientY;
      updateCursorVisibility();
    }

    if (settings.enabled) {
      if (pointerEl) pointerEl.style.display = "block";
      startMainLoop();
    }

    if (drawing) {
      continueDraw(clientX, clientY);
    }
  }

  function hidePointerOnExit() {
    cancelHideTimer();
    isMouseInside = false;
    if (pointerEl) pointerEl.style.display = "none";
    if (rodEl) rodEl.style.display = "none";
    if (ferruleEl) ferruleEl.style.display = "none";
    updateSpotlightVisuals(false);
    if (drawing) {
      drawing = false;
      currentStroke = null;
    }
    updateCursorVisibility();
  }

  function scheduleHidePointerOnExit() {
    cancelHideTimer();
    // 60ms grace prevents 1-frame flicker across out-of-process <iframe> transitions
    hideExitTimer = setTimeout(() => {
      hideExitTimer = null;
      hidePointerOnExit();
    }, 60);
  }

  // Receive coordinate events bridged from child <iframe> elements
  window.addEventListener("message", (e) => {
    const data = e.data;
    if (!data || data.__tinyhandBridge !== "v1") return;
    if (!settings.enabled) return;

    if (data.kind === "clear") {
      clearDrawings(true);
      return;
    }
    if (data.kind === "undo") {
      undoLastDrawing(true);
      return;
    }
    if (data.kind === "leave") {
      scheduleHidePointerOnExit();
      return;
    }

    if (!Number.isFinite(data.clientX) || !Number.isFinite(data.clientY)) return;
    const childEl = findChildFrameElement(e.source);
    if (!childEl) return;
    const { x, y } = translateFramePoint(childEl, data.clientX, data.clientY);

    if (data.kind === "move") {
      handleCursorMove(x, y);
    } else if (data.kind === "down") {
      handleCursorMove(x, y);
      if (data.button === 0) {
        if (shouldDrawWithState(data.shiftKey, data.altKey)) {
          beginDraw(x, y);
        } else {
          triggerClickFeedback(x, y, "left");
        }
      } else if (data.button === 2) {
        triggerClickFeedback(x, y, "right");
      }
    } else if (data.kind === "up") {
      if (data.button === 0 && drawing) {
        finishDraw(x, y);
      }
    } else if (data.kind === "dblclick") {
      triggerClickFeedback(x, y, "double");
    }
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    currentBaseY = -1;
  }, { passive: true });

  window.addEventListener("mousemove", (e) => {
    handleCursorMove(e.clientX, e.clientY);
  }, { capture: true, passive: true });

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch") {
      handleCursorMove(e.clientX, e.clientY);
    }
  }, { capture: true, passive: true });

  document.addEventListener("mouseleave", scheduleHidePointerOnExit);
  window.addEventListener("blur", () => {
    // Do not hide overlay merely because user clicked inside an embedded <iframe> on this page
    if (document.hasFocus() || document.activeElement?.tagName === "IFRAME") return;
    hidePointerOnExit();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hidePointerOnExit();
  });

  document.addEventListener("mouseenter", (e) => {
    cancelHideTimer();
    isMouseInside = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
    prevFrameX = e.clientX;
    prevFrameY = e.clientY;
    smoothedVx = 0;
    smoothedVy = 0;
    if (settings.enabled) {
      if (pointerEl) pointerEl.style.display = "block";
      startMainLoop();
    }
    updateCursorVisibility();
  });

  window.addEventListener("mousedown", (e) => {
    if (!settings.enabled) return;
    if (e.button === 0) {
      if (shouldDrawWithState(e.shiftKey, e.altKey)) {
        e.preventDefault();
        beginDraw(e.clientX, e.clientY);
      } else {
        triggerClickFeedback(e.clientX, e.clientY, "left");
      }
    } else if (e.button === 2) {
      triggerClickFeedback(e.clientX, e.clientY, "right");
    }
  }, true);

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0 && drawing) {
      finishDraw(e.clientX, e.clientY);
    }
  }, true);

  window.addEventListener("dblclick", (e) => {
    if (!settings.enabled) return;
    if (!shouldDrawWithState(e.shiftKey, e.altKey)) {
      triggerClickFeedback(e.clientX, e.clientY, "double");
    }
  }, { capture: true, passive: true });

  function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }

  window.addEventListener("keydown", (e) => {
    if (!settings.enabled) return;
    const k = e.key.toLowerCase();
    if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && k === "c") {
      clearDrawings(true);
    } else if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && k === "z") {
      if (strokes.length > 0) {
        e.preventDefault();
        undoLastDrawing(true);
      }
    } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && k === "z") {
      if (strokes.length > 0 && !isEditableTarget(e.target)) {
        e.preventDefault();
        undoLastDrawing(true);
      }
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg.type !== "string") return false;
    if (msg.type === "PING") {
      sendResponse({ ok: true });
    } else if (msg.type === "GET_HOST") {
      sendResponse({ host: window.location.hostname || "" });
    } else if (msg.type === "CLEAR_DRAWINGS") {
      clearDrawings(true);
      sendResponse({ success: true });
    } else if (msg.type === "UNDO_DRAWING") {
      const undone = undoLastDrawing(true);
      sendResponse({ success: undone });
    } else if (msg.type === "TINYHAND_TOAST") {
      showToast(msg.message);
      sendResponse({ success: true });
    }
    return false;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    for (const [key, change] of Object.entries(changes)) {
      settings[key] = change.newValue;
    }
    if (changes.stickOrigin) {
      currentBaseX = -1;
      currentBaseY = -1;
    } else if (changes.size) {
      currentBaseY = -1;
    }
    updatePointerVisuals();
    if (!settings.enabled) {
      clearDrawings(false);
    }
  });

  // Load initial settings, check domain auto-enable, and initialize overlay
  (async function () {
    try {
      const stored = await chrome.storage.local.get(null);
      settings = { ...settings, ...stored };

      const host = GEO.normalizeHostname(window.location.hostname);
      if (!settings.enabled && host && GEO.isHostnameMatch(host, settings.autoEnableDomains)) {
        try {
          const res = await chrome.runtime.sendMessage({ type: "AUTO_ENABLE_DOMAIN", host });
          if (res?.activated) {
            settings.enabled = true;
            setTimeout(() => showToast(res.message), 120);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error("TinyHand storage read error:", err);
    }
    initDOM();
  })();
})();
