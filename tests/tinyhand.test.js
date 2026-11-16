"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const GEO = require("../content/geometry.js");

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"));
}

describe("Manifest, Locales & Assets Integrity", () => {
  it("manifest.json is valid MV3 with all referenced files present", () => {
    const manifest = readJson("manifest.json");
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.version, "1.5.0");
    assert.equal(manifest.default_locale, "en");
    assert.ok(manifest.permissions.includes("storage"));
    assert.ok(manifest.permissions.includes("scripting"));
    assert.equal(manifest.content_scripts[0].all_frames, true);
    assert.deepEqual(manifest.content_scripts[0].js, ["content/geometry.js", "content/content.js"]);

    for (const iconPath of Object.values(manifest.icons)) {
      assert.ok(fs.existsSync(path.join(ROOT, iconPath)), `Missing icon: ${iconPath}`);
    }
    assert.ok(fs.existsSync(path.join(ROOT, manifest.background.service_worker)));
    assert.ok(fs.existsSync(path.join(ROOT, manifest.action.default_popup)));
    for (const jsFile of manifest.content_scripts[0].js) {
      assert.ok(fs.existsSync(path.join(ROOT, jsFile)), `Missing content script: ${jsFile}`);
    }

    assert.equal(fs.existsSync(path.join(ROOT, "content/overlay.css")), false, "Unused overlay.css should be removed");
    assert.ok(
      !manifest.web_accessible_resources[0].resources.includes("content/overlay.css"),
      "overlay.css must not linger in web_accessible_resources"
    );
  });

  it("DE and EN locale catalogs match keys 1:1 and cover manifest & popup keys", () => {
    const de = readJson("_locales/de/messages.json");
    const en = readJson("_locales/en/messages.json");
    const deKeys = Object.keys(de).sort();
    const enKeys = Object.keys(en).sort();
    assert.deepEqual(deKeys, enKeys, "Locale key sets must be identical");

    const manifestRaw = fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8");
    const msgMatches = [...manifestRaw.matchAll(/__MSG_([A-Za-z0-9_]+)__/g)].map((m) => m[1]);
    for (const key of msgMatches) {
      assert.ok(en[key]?.message, `Missing EN locale key for manifest: ${key}`);
      assert.ok(de[key]?.message, `Missing DE locale key for manifest: ${key}`);
    }

    const popupHtml = fs.readFileSync(path.join(ROOT, "popup/popup.html"), "utf8");
    const dataKeys = [...popupHtml.matchAll(/data-i18n(?:-[a-z]+)?="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(dataKeys.length > 20, "Expected localized elements in popup.html");
    for (const key of dataKeys) {
      assert.ok(en[key]?.message, `Missing EN locale key for popup.html: ${key}`);
      assert.ok(de[key]?.message, `Missing DE locale key for popup.html: ${key}`);
    }
  });

  it("every built-in pointer style has valid measurements and an image file on disk", () => {
    const stylesMeta = readJson("hands/tinyhand_styles.json");
    assert.equal(stylesMeta.styles.length, 37);

    for (const entry of stylesMeta.styles) {
      assert.ok(GEO.STYLE_MEASUREMENTS[entry.id], `Missing STYLE_MEASUREMENTS for ${entry.id}`);
      const relAsset = entry.id === "laser" ? "hands/laser-dot.svg" : `hands/hand_${entry.id}.png`;
      assert.ok(fs.existsSync(path.join(ROOT, relAsset)), `Missing asset file: ${relAsset}`);
    }
  });
});

describe("Geometry, Stick Mechanics & Shapes", () => {
  it("getStyleMeasurements mirrors custom tipX and cuffX accurately when customFlipX is true", () => {
    const unflipped = GEO.getStyleMeasurements({
      style: "custom",
      customHotspot: { x: 0.25, y: 0.15 },
      customCuff: { x: 0.6, y: 0.95 },
      customFlipX: false,
      customAspect: 1.25
    });
    assert.deepEqual(unflipped, { tipX: 0.25, tipY: 0.15, cuffX: 0.6, cuffY: 0.95, aspect: 1.25 });

    const flipped = GEO.getStyleMeasurements({
      style: "custom",
      customHotspot: { x: 0.25, y: 0.15 },
      customCuff: { x: 0.6, y: 0.95 },
      customFlipX: true,
      customAspect: 1.25
    });
    assert.ok(Math.abs(flipped.tipX - 0.75) < 1e-9);
    assert.ok(Math.abs(flipped.cuffX - 0.4) < 1e-9);
    assert.equal(flipped.tipY, 0.15);
    assert.equal(flipped.cuffY, 0.95);
    assert.equal(flipped.aspect, 1.25);
  });

  it("resolveRodPalette supports auto matching and manual overrides with ferrule colors", () => {
    const autoRobot = GEO.resolveRodPalette({ style: "robot", rodTheme: "auto" });
    assert.equal(autoRobot.key, "steel");
    assert.equal(autoRobot.palette.ferrule.length, 4);

    const overrideWood = GEO.resolveRodPalette({ style: "lavender", rodTheme: "wood" });
    assert.equal(overrideWood.key, "wood");
    assert.deepEqual(overrideWood.palette, GEO.ROD_PALETTES.wood);
  });

  it("computeStickTargetBase preserves smooth bottom-edge wandering and flip-proof clearance", () => {
    const brLeft = GEO.computeStickTargetBase("bottom-right", 0, 1440, 900, 160);
    const brRight = GEO.computeStickTargetBase("bottom-right", 1440, 1440, 900, 160);
    assert.ok(brRight.targetBaseX > brLeft.targetBaseX + 700, "bottom-right base should travel across bottom edge");
    assert.ok(brLeft.targetBaseY - 900 >= 140, "vertical pivot clearance must prevent bottom flips");

    const fixedLeft = GEO.computeStickTargetBase("bottom-left-fixed", 100, 1440, 900, 160);
    const fixedRight = GEO.computeStickTargetBase("bottom-left-fixed", 1300, 1440, 900, 160);
    assert.equal(fixedLeft.targetBaseX, fixedRight.targetBaseX);
  });

  it("solveCollinearRodAlignment keeps rod, ferrule, cuff and perpendicular normal strictly aligned", () => {
    const m = GEO.getStyleMeasurements({ style: "lavender" });
    const geom = GEO.solveCollinearRodAlignment({
      mouseX: 720,
      tipYTarget: 420,
      renderBaseX: 980,
      renderBaseY: 1100,
      size: 160,
      rodWidth: 7,
      pressScale: 1,
      measurements: m
    });

    // Normal vector must be unit-length and perpendicular to rod axis
    const rodDx = geom.rodEndX - 980;
    const rodDy = geom.rodEndY - 1100;
    const rodLen = Math.hypot(rodDx, rodDy);
    const dot = (rodDx / rodLen) * geom.nx + (rodDy / rodLen) * geom.ny;
    assert.ok(Math.abs(dot) < 1e-6, `Expected perpendicular normal, got dot=${dot}`);
    assert.ok(Math.abs(Math.hypot(geom.nx, geom.ny) - 1) < 1e-6);

    // Ferrule must sit colinearly on rod axis and wider than rod
    const ferruleDx = geom.ferruleEndX - geom.ferruleStartX;
    const ferruleDy = geom.ferruleEndY - geom.ferruleStartY;
    const cross = (rodDx * ferruleDy - rodDy * ferruleDx) / (rodLen * Math.hypot(ferruleDx, ferruleDy));
    assert.ok(Math.abs(cross) < 1e-6, `Ferrule must be collinear with rod, cross=${cross}`);
    assert.ok(geom.ferruleW > geom.rodW);
  });

  it("computeArrowGeometry and computeNormalizedRect produce valid shape bounds", () => {
    const dotArrow = GEO.computeArrowGeometry(100, 100, 101, 101, 4);
    assert.equal(dotArrow.isDot, true);

    const arrow = GEO.computeArrowGeometry(100, 200, 300, 200, 4);
    assert.equal(arrow.isDot, false);
    assert.equal(arrow.tipX, 300);
    assert.equal(arrow.tipY, 200);
    assert.ok(arrow.shaftEndX < arrow.tipX && arrow.shaftEndX > 100);
    const lenL = Math.hypot(arrow.tipX - arrow.leftX, arrow.tipY - arrow.leftY);
    const lenR = Math.hypot(arrow.tipX - arrow.rightX, arrow.tipY - arrow.rightY);
    assert.ok(Math.abs(lenL - lenR) < 1e-6, "Arrow wings must be symmetric");

    const rect = GEO.computeNormalizedRect(400, 300, 150, 120, 4);
    assert.equal(rect.x, 150);
    assert.equal(rect.y, 120);
    assert.equal(rect.width, 250);
    assert.equal(rect.height, 180);
    assert.ok(rect.radius > 0 && rect.radius <= Math.min(rect.width, rect.height) * 0.25);
  });

  it("getCycleStyles and isHostnameMatch behave deterministically", () => {
    const cycle = GEO.getCycleStyles({
      favoriteStyles: ["astro", "robot", "astro"],
      customImage: "data:image/png;base64,AAA",
      includeCustomInCycle: true
    });
    assert.deepEqual(cycle, ["astro", "robot", "custom"]);

    assert.equal(GEO.isHostnameMatch("meet.google.com", ["meet.google.com"]), true);
    assert.equal(GEO.isHostnameMatch("bbb.campus.example.edu", ["campus.example.edu"]), true);
    assert.equal(GEO.isHostnameMatch("evilmeet.google.com", ["meet.google.com"]), false);
    assert.equal(GEO.isHostnameMatch("", ["meet.google.com"]), false);
  });
});
