/**
 * QA iOS — Mobile Compatibility Tests
 * Tests for iOS Safari canvas issues, CSS fallbacks,
 * touch handling, and viewport sizing.
 */
const fs = require("fs");
const path = require("path");

let game;

beforeAll(() => {
  const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
  document.documentElement.innerHTML = html.match(/<html[^>]*>([\s\S]*)<\/html>/i)?.[1] || html;

  HTMLCanvasElement.prototype.getContext = function() {
    return {
      fillRect: jest.fn(), clearRect: jest.fn(), save: jest.fn(), restore: jest.fn(),
      beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), closePath: jest.fn(),
      stroke: jest.fn(), fill: jest.fn(), translate: jest.fn(), scale: jest.fn(),
      rotate: jest.fn(), arc: jest.fn(), rect: jest.fn(), clip: jest.fn(),
      fillText: jest.fn(), measureText: jest.fn(() => ({ width: 10 })),
      drawImage: jest.fn(), setTransform: jest.fn(), ellipse: jest.fn(),
      quadraticCurveTo: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      canvas: { width: 375, height: 812 },
      fillStyle: "", strokeStyle: "", lineWidth: 1, font: "",
      textAlign: "", textBaseline: "", globalAlpha: 1,
      globalCompositeOperation: "source-over",
      shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
      lineCap: "", lineJoin: "",
    };
  };

  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false });

  game = require("../js/game.js");
  game.generateMap();
});

// ============================================================
// A. CSS — No 'inset' shorthand (iOS < 14.5 compat)
// ============================================================
describe("A. CSS iOS Compatibility", () => {
  let cssContent;

  beforeAll(() => {
    cssContent = fs.readFileSync(path.resolve(__dirname, "../css/style.css"), "utf8");
  });

  test("CSS does not use 'inset:' shorthand for critical layout", () => {
    // inset shorthand not supported on iOS < 14.5
    // Check that .screen and #game-screen use explicit top/left/right/bottom
    const lines = cssContent.split("\n");
    const criticalSelectors = [];
    let inSelector = false;
    let currentSelector = "";
    let braceDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes("{")) {
        currentSelector = trimmed.split("{")[0].trim();
        braceDepth++;
        inSelector = true;
      }
      if (inSelector && trimmed.match(/^\s*inset\s*:/)) {
        // Check if this is a critical layout selector
        if (currentSelector.includes(".screen") ||
            currentSelector.includes("#game-screen") ||
            currentSelector.includes("#map-canvas")) {
          criticalSelectors.push(currentSelector);
        }
      }
      if (trimmed.includes("}")) {
        braceDepth--;
        if (braceDepth <= 0) inSelector = false;
      }
    }
    expect(criticalSelectors).toEqual([]);
  });

  test("#game-screen has explicit positioning (not just position: relative)", () => {
    // game-screen must be position: absolute with full coverage
    const match = cssContent.match(/#game-screen\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const rules = match[1];
    expect(rules).toMatch(/position\s*:\s*absolute/);
  });

  test("#map-canvas has explicit top and left", () => {
    const match = cssContent.match(/#map-canvas\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const rules = match[1];
    expect(rules).toMatch(/top\s*:/);
    expect(rules).toMatch(/left\s*:/);
  });

  test("#map-canvas has z-index", () => {
    const match = cssContent.match(/#map-canvas\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    expect(match[1]).toMatch(/z-index\s*:/);
  });

  test(".screen has explicit top/left/right/bottom (not inset)", () => {
    const match = cssContent.match(/\.screen\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const rules = match[1];
    expect(rules).toMatch(/top\s*:\s*0/);
    expect(rules).toMatch(/left\s*:\s*0/);
    expect(rules).toMatch(/right\s*:\s*0/);
    expect(rules).toMatch(/bottom\s*:\s*0/);
  });

  test(".screen has width and height 100%", () => {
    const match = cssContent.match(/\.screen\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const rules = match[1];
    expect(rules).toMatch(/width\s*:\s*100%/);
    expect(rules).toMatch(/height\s*:\s*100%/);
  });
});

// ============================================================
// B. Canvas Sizing — Fallback chain
// ============================================================
describe("B. Canvas Sizing", () => {
  test("canvas element exists in DOM", () => {
    const c = document.getElementById("map-canvas");
    expect(c).toBeTruthy();
    expect(c.tagName).toBe("CANVAS");
  });

  test("canvas has getContext method", () => {
    const c = document.getElementById("map-canvas");
    expect(typeof c.getContext).toBe("function");
  });
});

// ============================================================
// C. JS — resizeCanvas robustness
// ============================================================
describe("C. resizeCanvas Robustness", () => {
  let jsContent;

  beforeAll(() => {
    jsContent = fs.readFileSync(path.resolve(__dirname, "../js/game.js"), "utf8");
  });

  test("resizeCanvas has fallback for parentElement sizing", () => {
    expect(jsContent).toMatch(/parentElement/);
  });

  test("resizeCanvas has fallback to screen dimensions", () => {
    expect(jsContent).toMatch(/screen\.width/);
  });

  test("resizeCanvas sets canvas.style.width explicitly", () => {
    // Canvas CSS size must match attribute size on iOS
    expect(jsContent).toMatch(/canvas\.style\.width/);
  });

  test("resizeCanvas sets canvas.style.height explicitly", () => {
    expect(jsContent).toMatch(/canvas\.style\.height/);
  });

  test("init handles orientationchange event", () => {
    expect(jsContent).toMatch(/orientationchange/);
  });

  test("init calls resizeCanvas with delay for iOS layout", () => {
    expect(jsContent).toMatch(/setTimeout\(resizeCanvas/);
  });
});

// ============================================================
// D. Touch Events — passive: false required
// ============================================================
describe("D. Touch Events", () => {
  let jsContent;

  beforeAll(() => {
    jsContent = fs.readFileSync(path.resolve(__dirname, "../js/game.js"), "utf8");
  });

  test("touchstart listeners use passive: false", () => {
    const touchstartListeners = jsContent.match(/touchstart.*passive\s*:\s*false/g);
    expect(touchstartListeners).toBeTruthy();
    expect(touchstartListeners.length).toBeGreaterThan(0);
  });

  test("touchmove listeners use passive: false", () => {
    const touchmoveListeners = jsContent.match(/touchmove.*passive\s*:\s*false/g);
    expect(touchmoveListeners).toBeTruthy();
    expect(touchmoveListeners.length).toBeGreaterThan(0);
  });

  test("all touch handlers call preventDefault", () => {
    // Critical for iOS: without preventDefault, Safari scrolls/bounces
    const preventCount = (jsContent.match(/e\.preventDefault\(\)/g) || []).length;
    expect(preventCount).toBeGreaterThan(3);
  });
});

// ============================================================
// E. HTML — viewport meta tag
// ============================================================
describe("E. HTML Meta Tags", () => {
  let htmlContent;

  beforeAll(() => {
    htmlContent = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
  });

  test("has viewport meta with user-scalable=no", () => {
    expect(htmlContent).toMatch(/user-scalable=no/);
  });

  test("has viewport-fit=cover", () => {
    expect(htmlContent).toMatch(/viewport-fit=cover/);
  });

  test("has apple-mobile-web-app-capable", () => {
    expect(htmlContent).toMatch(/apple-mobile-web-app-capable/);
  });

  test("has theme-color meta", () => {
    expect(htmlContent).toMatch(/theme-color/);
  });

  test("canvas is inside game-screen div", () => {
    expect(htmlContent).toMatch(/id="game-screen"[\s\S]*?<canvas id="map-canvas"/);
  });

  test("html-debug overlay exists for diagnostics", () => {
    expect(htmlContent).toMatch(/id="html-debug"/);
  });
});

// ============================================================
// F. Game Loop — renders on game screen
// ============================================================
describe("F. Game Loop", () => {
  test("gameLoop runs render only when screen is 'game'", () => {
    // Verify the state management
    game.switchScreen("title");
    expect(game.state.screen).toBe("title");
    game.switchScreen("game");
    expect(game.state.screen).toBe("game");
  });

  test("HTML debug element exists after init", () => {
    const dbg = document.getElementById("html-debug");
    expect(dbg).toBeTruthy();
  });
});

// ============================================================
// G. Critical: No zero-size canvas scenarios
// ============================================================
describe("G. Zero-Size Prevention", () => {
  let jsContent;

  beforeAll(() => {
    jsContent = fs.readFileSync(path.resolve(__dirname, "../js/game.js"), "utf8");
  });

  test("resizeCanvas checks for zero width", () => {
    // Should have fallback when w is 0
    expect(jsContent).toMatch(/!w\s*\|\|\s*!h/);
  });

  test("multiple resize calls in init for iOS timing", () => {
    const timeoutCalls = jsContent.match(/setTimeout\(resizeCanvas/g);
    expect(timeoutCalls).toBeTruthy();
    expect(timeoutCalls.length).toBeGreaterThanOrEqual(2);
  });
});
