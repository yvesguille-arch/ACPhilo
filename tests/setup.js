// Test setup — provides a minimal DOM matching index.html structure
// so game.js can initialize in jsdom environment

const fs = require('fs');
const path = require('path');

// Load index.html into jsdom before each test suite
beforeAll(() => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  document.documentElement.innerHTML = html.match(/<html[^>]*>([\s\S]*)<\/html>/i)?.[1] || html;

  // Mock canvas context since jsdom doesn't support Canvas
  HTMLCanvasElement.prototype.getContext = function (type) {
    if (type === '2d') {
      return {
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(() => ({ data: [] })),
        putImageData: jest.fn(),
        createImageData: jest.fn(() => []),
        setTransform: jest.fn(),
        drawImage: jest.fn(),
        save: jest.fn(),
        fillText: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        arc: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
        measureText: jest.fn(() => ({ width: 10 })),
        createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
        createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
        createPattern: jest.fn(),
        canvas: { width: 375, height: 812 },
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        lineCap: '',
        lineJoin: '',
      };
    }
    return null;
  };

  // Mock requestAnimationFrame
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);

  // Mock touch events
  global.TouchEvent = class TouchEvent extends Event {
    constructor(type, opts = {}) {
      super(type, opts);
      this.touches = opts.touches || [];
      this.changedTouches = opts.changedTouches || [];
    }
  };
});
