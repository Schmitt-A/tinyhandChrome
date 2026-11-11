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
  };

  // Drawing state
  let drawing = false;
  let currentStroke = null;
  let strokes = []; // Array of { color, width, points: [{x, y, time}] }

  // Physics & Animation state
  let mouseX = -9999;
  let mouseY = -9999;
  let prevFrameX = -9999;
  let prevFrameY = -9999;
  let smoothedVx = 0;
  let smoothedVy = 0;
  let inertiaAngle = 0;
  let movePhase = 0;
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
  let rodGradCylEl = null;
  let pointerEl = null;
  let innerEl = null;
  let imgEl = null;
  let toastEl = null;
  let toastTimeout = null;

  // Exact fingertip and cuff measurements for all 36 authentic hands from nilbuild/tinyhand
  const STYLE_MEASUREMENTS = {
    "lavender": {"tipX": 0.4637, "tipY": 0.1754, "cuffX": 0.5125, "cuffY": 1.0, "aspect": 1.4925},
    "glove": {"tipX": 0.46, "tipY": 0.2103, "cuffX": 0.5138, "cuffY": 1.0, "aspect": 1.476},
    "coral": {"tipX": 0.4125, "tipY": 0.2241, "cuffX": 0.5225, "cuffY": 1.0, "aspect": 1.3378},
    "plush": {"tipX": 0.44, "tipY": 0.1879, "cuffX": 0.54, "cuffY": 1.0, "aspect": 1.3423},
    "robot": {"tipX": 0.3962, "tipY": 0.2599, "cuffX": 0.5, "cuffY": 1.0, "aspect": 1.3158},
    "pink": {"tipX": 0.4612, "tipY": 0.2429, "cuffX": 0.5188, "cuffY": 1.0, "aspect": 1.4286},
    "blue": {"tipX": 0.4587, "tipY": 0.2473, "cuffX": 0.5125, "cuffY": 1.0, "aspect": 1.4134},
    "mint": {"tipX": 0.4612, "tipY": 0.2066, "cuffX": 0.5125, "cuffY": 1.0, "aspect": 1.476},
    "lemon": {"tipX": 0.4612, "tipY": 0.2045, "cuffX": 0.5162, "cuffY": 1.0, "aspect": 1.487},
    "black": {"tipX": 0.4537, "tipY": 0.2376, "cuffX": 0.52, "cuffY": 1.0, "aspect": 1.4184},
    "chrome": {"tipX": 0.4562, "tipY": 0.2096, "cuffX": 0.515, "cuffY": 1.0, "aspect": 1.4706},
    "holo": {"tipX": 0.4688, "tipY": 0.2193, "cuffX": 0.5225, "cuffY": 1.0, "aspect": 1.487},
    "fuzzy": {"tipX": 0.4612, "tipY": 0.2059, "cuffX": 0.5238, "cuffY": 1.0, "aspect": 1.4706},
    "wood": {"tipX": 0.46, "tipY": 0.203, "cuffX": 0.5112, "cuffY": 1.0, "aspect": 1.476},
    "marble": {"tipX": 0.4575, "tipY": 0.209, "cuffX": 0.5175, "cuffY": 1.0, "aspect": 1.4925},
    "terrazzo": {"tipX": 0.4612, "tipY": 0.2648, "cuffX": 0.5212, "cuffY": 1.0, "aspect": 1.3937},
    "glass": {"tipX": 0.4587, "tipY": 0.2711, "cuffX": 0.5238, "cuffY": 1.0, "aspect": 1.4085},
    "jelly": {"tipX": 0.4662, "tipY": 0.2581, "cuffX": 0.52, "cuffY": 1.0, "aspect": 1.4337},
    "pastel": {"tipX": 0.4587, "tipY": 0.2066, "cuffX": 0.5138, "cuffY": 1.0, "aspect": 1.476},
    "pixel": {"tipX": 0.4888, "tipY": 0.2492, "cuffX": 0.5387, "cuffY": 1.0, "aspect": 1.3115},
    "lowpoly": {"tipX": 0.4562, "tipY": 0.2066, "cuffX": 0.5125, "cuffY": 1.0, "aspect": 1.476},
    "knit": {"tipX": 0.4713, "tipY": 0.2437, "cuffX": 0.5238, "cuffY": 1.0, "aspect": 1.4337},
    "skeleton": {"tipX": 0.4587, "tipY": 0.2548, "cuffX": 0.51, "cuffY": 1.0, "aspect": 1.5444},
    "astro": {"tipX": 0.46, "tipY": 0.1964, "cuffX": 0.5175, "cuffY": 1.0, "aspect": 1.4545},
    "space": {"tipX": 0.4575, "tipY": 0.2, "cuffX": 0.5275, "cuffY": 1.0, "aspect": 1.4815},
    "monster": {"tipX": 0.4688, "tipY": 0.23, "cuffX": 0.5238, "cuffY": 1.0, "aspect": 1.3333},
    "water": {"tipX": 0.4562, "tipY": 0.2381, "cuffX": 0.5112, "cuffY": 1.0, "aspect": 1.4652},
    "lava": {"tipX": 0.4575, "tipY": 0.2316, "cuffX": 0.5162, "cuffY": 1.0, "aspect": 1.4706},
    "grass": {"tipX": 0.4625, "tipY": 0.2175, "cuffX": 0.5199, "cuffY": 1.0, "aspect": 1.4035},
    "cactus": {"tipX": 0.4675, "tipY": 0.2482, "cuffX": 0.5188, "cuffY": 1.0, "aspect": 1.4388},
    "choco": {"tipX": 0.4688, "tipY": 0.2447, "cuffX": 0.5225, "cuffY": 1.0, "aspect": 1.4184},
    "cloud": {"tipX": 0.4562, "tipY": 0.2662, "cuffX": 0.5126, "cuffY": 1.0, "aspect": 1.3652},
    "mech": {"tipX": 0.395, "tipY": 0.213, "cuffX": 0.4975, "cuffY": 1.0, "aspect": 1.444},
    "neon": {"tipX": 0.4238, "tipY": 0.2138, "cuffX": 0.495, "cuffY": 1.0, "aspect": 1.4493},
    "leaf": {"tipX": 0.405, "tipY": 0.213, "cuffX": 0.4975, "cuffY": 1.0, "aspect": 1.444},
    "cookie": {"tipX": 0.4125, "tipY": 0.213, "cuffX": 0.4988, "cuffY": 1.0, "aspect": 1.444},
    "laser": {"tipX": 0.5, "tipY": 0.5, "cuffX": 0.5, "cuffY": 0.5, "aspect": 1.0}
  };

  function getStyleMeasurements() {
    if (settings.style === "custom") {
      return {
        tipX: settings.customHotspot?.x ?? 0.5,
        tipY: settings.customHotspot?.y ?? 0.2,
        cuffX: 0.5,
        cuffY: 1.0,
        aspect: settings.customAspect ?? 1.4
      };
    }
    return STYLE_MEASUREMENTS[settings.style] || { tipX: 0.46, tipY: 0.21, cuffX: 0.51, cuffY: 1.0, aspect: 1.47 };
  }

  // Authentic rod styling & material palettes inspired by nilbuild/tinyhand
  const STICK_THEMES = {
    // Warm turned hardwood with brass ferrule
    "plush": "wood", "wood": "wood", "choco": "wood", "cookie": "wood", "skeleton": "wood",
    // Pure white lacquered rod with silver ferrule
    "coral": "white", "neon": "white", "pink": "white", "blue": "white",
    // Brushed aircraft aluminum with polished chrome ferrule
    "robot": "steel", "mech": "steel", "chrome": "steel", "lowpoly": "steel", "marble": "steel", "glass": "steel",
    // Premium obsidian carbon rod with titanium ferrule
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
      ferrule: ["#A07830", "#FDE89C", "#D4A848", "#6E4E18"] // Warm jewelry brass/gold
    },
    "white": {
      highlight: "#FFFFFF",
      midtone: "#ECE9E5",
      shadow: "#C6C0B8",
      deepShadow: "#8C867E",
      specular: "rgba(255, 255, 255, 0.55)",
      ferrule: ["#A0A0A8", "#FFFFFF", "#B8B8C0", "#686870"] // Pure silver
    },
    "steel": {
      highlight: "#FFFFFF",
      midtone: "#C6CAD2",
      shadow: "#828892",
      deepShadow: "#4E545E",
      specular: "rgba(255, 255, 255, 0.45)",
      ferrule: ["#70757E", "#F0F2F6", "#A2A7B0", "#4A4E56"] // Aircraft chrome
    }
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
        <filter id="rod-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow id="rod-fe-shadow" dx="2" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.38"/>
        </filter>
        <linearGradient id="rod-grad-cylinder" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">
          <stop id="rod-stop-0" offset="0%" stop-color="#121214"/>
          <stop id="rod-stop-1" offset="25%" stop-color="#262629"/>
          <stop id="rod-stop-2" offset="48%" stop-color="#5C5C64"/>
          <stop id="rod-stop-3" offset="72%" stop-color="#262629"/>
          <stop id="rod-stop-4" offset="100%" stop-color="#060608"/>
        </linearGradient>
      </defs>
      <g id="tinyhand-rod-group" filter="url(#rod-shadow)">
        <line id="tinyhand-rod" x1="0" y1="0" x2="0" y2="0" stroke="url(#rod-grad-cylinder)" stroke-width="7" stroke-linecap="round" />
      </g>
    `;
    containerEl.appendChild(armSvgEl);

    rodEl = armSvgEl.querySelector("#tinyhand-rod");
    rodGradCylEl = armSvgEl.querySelector("#rod-grad-cylinder");

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

  // 4. Update Shadow & 3D Depth
  function updateShadowStyles() {
    if (!innerEl || !armSvgEl) return;

    const intensity = settings.shadowIntensity !== undefined ? Number(settings.shadowIntensity) : 50;
    const factor = intensity / 100;

    // A) Hand drop-shadow
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

    // B) Rod SVG drop-shadow filter
    const feShadow = armSvgEl.querySelector("#rod-fe-shadow");
    if (feShadow) {
      if (intensity <= 0) {
        feShadow.setAttribute("flood-opacity", "0");
      } else {
        const rodDy = Math.max(1, Math.round(6 * factor));
        const rodBlur = Math.max(2, Math.round(6 * factor));
        const rodOp = (0.15 + 0.45 * factor).toFixed(2);
        feShadow.setAttribute("dx", "2");
        feShadow.setAttribute("dy", String(rodDy));
        feShadow.setAttribute("stdDeviation", String(rodBlur));
        feShadow.setAttribute("flood-opacity", String(rodOp));
      }
    }
  }

  // 5. Update Rod Material & Theme (matches authentic nilbuild/tinyhand aesthetics)
  function updateRodTheme() {
    if (!armSvgEl) return;
    const themeKey = STICK_THEMES[settings.style] || STICK_THEMES["default"];
    const p = ROD_PALETTES[themeKey] || ROD_PALETTES["carbon"];

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
  }

  // 6. Update Visual Appearance based on Settings
  function updatePointerVisuals() {
    updateCursorVisibility();

    if (!pointerEl || !imgEl || !innerEl) return;

    if (!settings.enabled) {
      pointerEl.style.display = "none";
      if (rodEl) rodEl.style.display = "none";
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

    // Apply rod theme & 3D shadow depth
    updateRodTheme();
    updateShadowStyles();

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

    // Track frame velocity for smooth movement animation
    if (prevFrameX < 0 || prevFrameY < 0) {
      prevFrameX = mouseX;
      prevFrameY = mouseY;
    }
    const rawVx = mouseX - prevFrameX;
    const rawVy = mouseY - prevFrameY;
    prevFrameX = mouseX;
    prevFrameY = mouseY;

    smoothedVx += (rawVx - smoothedVx) * 0.28;
    smoothedVy += (rawVy - smoothedVy) * 0.28;
    const currentSpeed = Math.hypot(smoothedVx, smoothedVy);

    const motionFactor = settings.idleAnimation !== false ? ((settings.animMotionStrength ?? 100) / 100) : 0;
    const breatheFactor = settings.idleAnimation !== false ? ((settings.animBreatheStrength ?? 100) / 100) : 0;

    // A) Calculate Target Base Point for the Stick
    let targetBaseX = w * 0.95;
    let targetBaseY = h + 20;

    if (settings.stickOrigin === "bottom-right") {
      // Fest in der unteren rechten Ecke verankert (authentisch wie in TinyHand macOS)
      targetBaseX = w * 0.94;
      targetBaseY = h + 20;
    } else if (settings.stickOrigin === "bottom-left") {
      // Fest in der unteren linken Ecke verankert
      targetBaseX = w * 0.06;
      targetBaseY = h + 20;
    } else if (settings.stickOrigin === "dynamic") {
      // Dynamisch von unten: Basis folgt dem Cursor horizontal unterhalb des Bildschirms
      // Mit subtiler, natürlicher Schrägneigung (max ~5° an den Bildschirmrändern)
      const normX = Math.min(1, Math.max(0, mouseX / (w || 1)));
      const subtleTilt = (normX - 0.5) * Math.min(60, w * 0.05);
      targetBaseX = mouseX - subtleTilt;
      targetBaseY = h + 20;
    }

    if (currentBaseX < 0 || currentBaseY < 0) {
      currentBaseX = targetBaseX;
      currentBaseY = targetBaseY;
    } else {
      // Schnelle, stabile Verfolgung: Verhindert unnatürliches Hinterherhinken und Rotieren beim Bewegen
      const followSpeed = settings.stickOrigin === "dynamic" ? 0.35 : 0.25;
      currentBaseX += (targetBaseX - currentBaseX) * followSpeed;
      currentBaseY += (targetBaseY - currentBaseY) * followSpeed;
    }

    // B) Idle Breathing & Movement Animation ("Dezente Animation im Stillstand & beim Bewegen")
    let swayAngle = 0;
    let breatheLift = 0;
    let moveTilt = 0;
    let moveLift = 0;
    let motionLag = 0;

    if (breatheFactor > 0) {
      // 1. Idle Breathing: dominant when still, smoothly yields when in motion
      idlePhase += 0.035;
      const idleWeight = Math.max(0, 1 - currentSpeed * 0.25); // 1.0 when still, 0 when moving
      swayAngle = Math.sin(idlePhase) * (0.75 * idleWeight) * breatheFactor;
      breatheLift = Math.cos(idlePhase * 0.7) * (1.5 * idleWeight) * breatheFactor;
    }

    if (motionFactor > 0) {
      // 2. Movement Inertia Tilt (subtle rotational lag trailing mouse movement)
      const targetInertia = Math.max(-4.0, Math.min(4.0, -smoothedVx * 0.15)) * motionFactor;
      inertiaAngle += (targetInertia - inertiaAngle) * 0.20;

      // 3. Movement Sway / Bobbing & Lift (subtle organic motion rhythm)
      if (currentSpeed > 0.4) {
        movePhase += Math.min(currentSpeed * 0.04, 0.22);
      }
      moveTilt = Math.sin(movePhase) * Math.min(currentSpeed * 0.05, 1.2) * motionFactor;
      moveLift = Math.cos(movePhase * 0.8) * Math.min(currentSpeed * 0.04, 1.5) * motionFactor;

      // 4. Subtle elastic stretch along the stick (1-3.5px)
      motionLag = Math.min(3.5, currentSpeed * 0.06) * motionFactor;
    } else {
      inertiaAngle = 0;
    }

    // C) Click Tap Spring Damping
    pressAmount += (0 - pressAmount) * 0.18;
    const pressDip = pressAmount * 7;
    const pressScale = 1 - pressAmount * 0.05;

    // D) Position Hand and Stick
    if (pointerEl && imgEl && innerEl) {
      const tipYTarget = mouseY + breatheLift + moveLift;
      const motionAngle = inertiaAngle + moveTilt;
      const totalExtraAngle = swayAngle + motionAngle;

      if (settings.style === "laser") {
        // Laser dot pointer
        if (rodEl) rodEl.style.display = "none";
        pointerEl.style.left = mouseX + "px";
        pointerEl.style.top = mouseY + "px";
        pointerEl.style.transformOrigin = "50% 50%";
        pointerEl.style.transform = "translate(-50%, -50%)";
        const laserScale = (1 + pressAmount * 0.35) * (1 + Math.min(0.2, currentSpeed * 0.008));
        innerEl.style.transform = `scale(${laserScale})`;
      } else if (settings.stickOrigin === "floating") {
        // Free-floating pointer without stick to screen edge
        if (rodEl) rodEl.style.display = "none";
        const m = getStyleMeasurements();

        // User customizable tilt angle + dynamic motion/screen tilt
        const baseAngle = Number(settings.floatingAngle ?? -15);
        let dynamicTilt = 0;
        if (settings.floatingDynamic !== false) {
          // Subtle screen position tilt (-10° on left to +10° on right)
          const screenTilt = ((mouseX / w) - 0.5) * 20;
          // Movement velocity tilt
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
        // Stick mode: single continuous rigid stick extending from corner / bottom directly into hand cuff!
        if (rodEl) rodEl.style.display = "block";

        const m = getStyleMeasurements();
        const handH = settings.size / (m.aspect || 1.4);

        // Local vector from cuff to tip in unrotated image pixels
        const localDx = (m.tipX - m.cuffX) * settings.size;
        const localDy = (m.tipY - m.cuffY) * handH;

        // Iterative collinear alignment:
        // Ensures the rod enters the cuff at a true 90° perpendicular angle,
        // while the fingertip stays exactly at (mouseX, tipYTarget).
        let rodAngle = Math.atan2(tipYTarget - currentBaseY, mouseX - currentBaseX);
        let handRad = rodAngle + Math.PI / 2;
        let cuffScreenX = mouseX;
        let cuffScreenY = tipYTarget;

        for (let iter = 0; iter < 2; iter++) {
          const offX = localDx * Math.cos(handRad) - localDy * Math.sin(handRad);
          const offY = localDx * Math.sin(handRad) + localDy * Math.cos(handRad);
          cuffScreenX = mouseX - offX;
          cuffScreenY = tipYTarget - offY;
          rodAngle = Math.atan2(cuffScreenY - currentBaseY, cuffScreenX - currentBaseX);
          handRad = rodAngle + Math.PI / 2;
        }

        const totalRotDeg = (handRad * 180) / Math.PI;

        pointerEl.style.transformOrigin = `${m.tipX * 100}% ${m.tipY * 100}%`;
        pointerEl.style.left = mouseX + "px";
        pointerEl.style.top = tipYTarget + "px";
        pointerEl.style.transform = `translate(-${m.tipX * 100}%, -${m.tipY * 100}%) rotate(${totalRotDeg}deg)`;
        innerEl.style.transformOrigin = `${m.tipX * 100}% ${m.tipY * 100}%`;
        innerEl.style.transform = `scale(${pressScale})`;

        // Push 8px into the cuff opening so the rod seamlessly enters the sleeve behind the cuff
        const rodEndX = cuffScreenX + Math.cos(rodAngle) * 8;
        const rodEndY = cuffScreenY + Math.sin(rodAngle) * 8;

        const rodW = settings.rodWidth !== undefined ? Number(settings.rodWidth) : Math.max(5, Math.round(settings.size * 0.045));

        // 1. Position Main 3D Cylindrical Rod (uniform constant stroke-width)
        rodEl.setAttribute("x1", currentBaseX);
        rodEl.setAttribute("y1", currentBaseY);
        rodEl.setAttribute("x2", rodEndX);
        rodEl.setAttribute("y2", rodEndY);
        rodEl.setAttribute("stroke-width", rodW);

        // 2. Normal vector strictly perpendicular to the rod axis
        const nx = -Math.sin(rodAngle);
        const ny = Math.cos(rodAngle);

        // 3. Orient the 3D Cylindrical Gradient across the rod's diameter
        if (rodGradCylEl) {
          const midX = (currentBaseX + rodEndX) / 2;
          const midY = (currentBaseY + rodEndY) / 2;
          const halfW = rodW / 2;
          rodGradCylEl.setAttribute("x1", midX - nx * halfW);
          rodGradCylEl.setAttribute("y1", midY - ny * halfW);
          rodGradCylEl.setAttribute("x2", midX + nx * halfW);
          rodGradCylEl.setAttribute("y2", midY + ny * halfW);
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
    if (changes.stickOrigin) {
      currentBaseX = -1;
      currentBaseY = -1;
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
