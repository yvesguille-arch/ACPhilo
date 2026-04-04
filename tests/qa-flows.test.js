/**
 * QA Agent 2 — Player Flow Tester
 * Tests: complete dialog flows, path simulations,
 * mission tracker, endings, actions, journal, reset
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

// Helper: save and restore state
function saveState() {
  return {
    factions: { ...game.state.factions },
    philosophy: { ...game.state.philosophy },
    paths: { ...game.state.paths },
    notoriety: game.state.notoriety,
    influence: game.state.influence,
    journalLen: game.state.journal.length,
    dialogActive: game.state.dialogActive,
    endingTriggered: game.state.endingTriggered,
  };
}
function restoreState(s) {
  Object.assign(game.state.factions, s.factions);
  Object.assign(game.state.philosophy, s.philosophy);
  Object.assign(game.state.paths, s.paths);
  game.state.notoriety = s.notoriety;
  game.state.influence = s.influence;
  game.state.dialogActive = s.dialogActive;
  game.state.endingTriggered = s.endingTriggered;
}

// ============================================================
// A. DIALOG TREES — COMPLETE FLOW PER NPC
// ============================================================
describe("A. Dialog Trees — Complete Flows", () => {
  const npcIds = ["marco", "giovanni", "rossi", "sofia", "corvo", "artisan"];

  npcIds.forEach(npcId => {
    describe(`NPC: ${npcId}`, () => {
      const npcObj = () => game.npcs.find(n => n.id === npcId);
      const tree = () => game.dialogs[npcId];

      test("has a dialog tree", () => {
        expect(tree()).toBeDefined();
      });

      test("has 'start' node with text and choices", () => {
        expect(tree().start).toBeDefined();
        expect(typeof tree().start.text).toBe("string");
        expect(tree().start.text.length).toBeGreaterThan(10);
        expect(tree().start.choices.length).toBeGreaterThanOrEqual(2);
      });

      test("openDialog works", () => {
        game.closeDialog();
        expect(() => game.openDialog(npcObj())).not.toThrow();
        expect(game.state.dialogActive).toBe(true);
        game.closeDialog();
      });

      test("each start choice has effects and valid next", () => {
        tree().start.choices.forEach((choice, i) => {
          expect(choice).toHaveProperty("text");
          expect(choice).toHaveProperty("effects");
          if (choice.next !== null && choice.next !== undefined) {
            expect(tree()).toHaveProperty(choice.next);
          }
        });
      });

      test("all nodes in tree are reachable from start", () => {
        const reachable = new Set(["start"]);
        const queue = ["start"];
        while (queue.length > 0) {
          const nodeId = queue.shift();
          const node = tree()[nodeId];
          if (!node) continue;
          node.choices.forEach(c => {
            if (c.next && !reachable.has(c.next)) {
              reachable.add(c.next);
              queue.push(c.next);
            }
          });
        }
        const allNodes = Object.keys(tree());
        allNodes.forEach(nodeId => {
          expect(reachable.has(nodeId)).toBe(true);
        });
      });

      test("following each start choice applies effects without error", () => {
        const saved = saveState();
        tree().start.choices.forEach((choice) => {
          restoreState(saved);
          game.closeDialog();
          expect(() => game.handleChoice(npcId, choice)).not.toThrow();
        });
        restoreState(saved);
        game.closeDialog();
      });
    });
  });
});

// ============================================================
// B. PATH SIMULATION — Full Playthroughs
// ============================================================
describe("B. Path Simulations", () => {
  beforeEach(() => {
    game.state.paths = { assassination: 0, economic: 0, revolution: 0, wuwei: 0 };
    game.state.factions = { merchants: 0, church: 0, military: -20, people: 10, thieves: 0 };
    game.state.philosophy = { taoism: 0, stoicism: 0, confucianism: 0, existentialism: 0, zen: 0, jungian: 0 };
    game.state.notoriety = 0;
    game.state.endingTriggered = false;
    game.closeDialog();
  });

  test("Assassination path: rossi + corvo + giovanni choices accumulate", () => {
    // Rossi: assassination choice (index 1)
    const rossiStart = game.dialogs.rossi.start.choices[1]; // "eliminer discretement"
    game.handleChoice("rossi", rossiStart);
    const rossiNext = game.dialogs.rossi[rossiStart.next];
    game.handleChoice("rossi", rossiNext.choices[0]);

    // Corvo: assassination choice (index 0)
    const corvoStart = game.dialogs.corvo.start.choices[0]; // "faiblesses du Doge"
    game.handleChoice("corvo", corvoStart);
    const corvoNext = game.dialogs.corvo[corvoStart.next];
    game.handleChoice("corvo", corvoNext.choices[0]);

    expect(game.state.paths.assassination).toBeGreaterThanOrEqual(3);
  });

  test("Economic path: marco + corvo choices accumulate", () => {
    const marcoStart = game.dialogs.marco.start.choices[0]; // ally
    game.handleChoice("marco", marcoStart);
    const marcoNext = game.dialogs.marco[marcoStart.next];
    game.handleChoice("marco", marcoNext.choices[0]);

    const corvoStart = game.dialogs.corvo.start.choices[1]; // economic
    game.handleChoice("corvo", corvoStart);
    const corvoNext = game.dialogs.corvo[corvoStart.next];
    game.handleChoice("corvo", corvoNext.choices[0]);

    expect(game.state.paths.economic).toBeGreaterThanOrEqual(3);
  });

  test("Revolution path: sofia + giovanni + rossi choices accumulate", () => {
    const sofiaStart = game.dialogs.sofia.start.choices[0]; // revolt
    game.handleChoice("sofia", sofiaStart);
    const sofiaNext = game.dialogs.sofia[sofiaStart.next];
    game.handleChoice("sofia", sofiaNext.choices[0]);

    const giovanniStart = game.dialogs.giovanni.start.choices[0]; // truth
    game.handleChoice("giovanni", giovanniStart);
    const giovanniNext = game.dialogs.giovanni[giovanniStart.next];
    game.handleChoice("giovanni", giovanniNext.choices[0]);

    const rossiStart = game.dialogs.rossi.start.choices[0]; // honor
    game.handleChoice("rossi", rossiStart);
    const rossiNext = game.dialogs.rossi[rossiStart.next];
    game.handleChoice("rossi", rossiNext.choices[0]);

    expect(game.state.paths.revolution).toBeGreaterThanOrEqual(3);
  });

  test("Wu Wei path: marco + corvo + artisan choices accumulate", () => {
    const marcoStart = game.dialogs.marco.start.choices[1]; // tao
    game.handleChoice("marco", marcoStart);
    const marcoNext = game.dialogs.marco[marcoStart.next];
    game.handleChoice("marco", marcoNext.choices[0]);

    const corvoStart = game.dialogs.corvo.start.choices[2]; // zen
    game.handleChoice("corvo", corvoStart);
    const corvoNext = game.dialogs.corvo[corvoStart.next];
    game.handleChoice("corvo", corvoNext.choices[0]);

    const artisanStart = game.dialogs.artisan.start.choices[0]; // inspire
    game.handleChoice("artisan", artisanStart);
    const artisanNext = game.dialogs.artisan[artisanStart.next];
    game.handleChoice("artisan", artisanNext.choices[0]);

    expect(game.state.paths.wuwei).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================
// C. MISSION TRACKER
// ============================================================
describe("C. Mission Tracker", () => {
  test("getMissionText returns text for each path at stage 1", () => {
    ["assassination", "economic", "revolution", "wuwei"].forEach(p => {
      const t = game.getMissionText(p, 1);
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(5);
    });
  });

  test("getMissionText returns different text per stage", () => {
    const t1 = game.getMissionText("assassination", 1);
    const t2 = game.getMissionText("assassination", 2);
    const t3 = game.getMissionText("assassination", 3);
    expect(t1).not.toBe(t2);
    expect(t2).not.toBe(t3);
  });

  test("getMissionText with stage 0 returns fallback", () => {
    const t = game.getMissionText("assassination", 0);
    expect(typeof t).toBe("string");
  });

  test("getMissionText with stage 99 returns fallback", () => {
    const t = game.getMissionText("assassination", 99);
    expect(t).toBe("Continuer l'enquete");
  });

  test("getLeadingPath returns correct path", () => {
    const saved = { ...game.state.paths };
    game.state.paths = { assassination: 1, economic: 5, revolution: 2, wuwei: 3 };
    const leading = game.getLeadingPath();
    expect(leading.key).toBe("economic");
    expect(leading.val).toBe(5);
    Object.assign(game.state.paths, saved);
  });

  test("getLeadingPath with all zero defaults to assassination", () => {
    const saved = { ...game.state.paths };
    game.state.paths = { assassination: 0, economic: 0, revolution: 0, wuwei: 0 };
    const leading = game.getLeadingPath();
    expect(leading.key).toBe("assassination");
    expect(leading.val).toBe(0);
    Object.assign(game.state.paths, saved);
  });
});

// ============================================================
// D. ENDING SYSTEM
// ============================================================
describe("D. Endings", () => {
  test("checkEnding does nothing when paths < 6", () => {
    const saved = saveState();
    game.state.paths = { assassination: 2, economic: 1, revolution: 0, wuwei: 3 };
    game.state.endingTriggered = false;
    const jLen = game.state.journal.length;
    game.checkEnding();
    expect(game.state.journal.length).toBe(jLen);
    restoreState(saved);
  });

  test("checkEnding adds journal when path >= 6", () => {
    const saved = saveState();
    game.state.paths = { assassination: 0, economic: 0, revolution: 0, wuwei: 7 };
    game.state.endingTriggered = false;
    const jLen = game.state.journal.length;
    game.checkEnding();
    expect(game.state.journal.length).toBeGreaterThan(jLen);
    restoreState(saved);
  });

  test("checkEnding skips if already triggered", () => {
    const saved = saveState();
    game.state.paths = { assassination: 0, economic: 0, revolution: 0, wuwei: 10 };
    game.state.endingTriggered = true;
    const jLen = game.state.journal.length;
    game.checkEnding();
    expect(game.state.journal.length).toBe(jLen);
    restoreState(saved);
  });
});

// ============================================================
// E. JOURNAL SYSTEM
// ============================================================
describe("E. Journal", () => {
  test("addJournal creates entry with time and text", () => {
    const before = game.state.journal.length;
    game.addJournal("Test journal entry");
    expect(game.state.journal.length).toBe(before + 1);
    const entry = game.state.journal[0]; // unshift = newest first
    expect(entry.text).toBe("Test journal entry");
    expect(entry.time).toContain("Jour");
  });

  test("journal entries from dialog effects", () => {
    const before = game.state.journal.length;
    game.handleChoice("marco", {
      text: "t", next: null,
      effects: { journal: "Found a secret passage" }
    });
    expect(game.state.journal.length).toBe(before + 1);
    expect(game.state.journal[0].text).toBe("Found a secret passage");
  });

  test("multiple entries accumulate in order", () => {
    game.addJournal("First");
    game.addJournal("Second");
    game.addJournal("Third");
    expect(game.state.journal[0].text).toBe("Third");
    expect(game.state.journal[1].text).toBe("Second");
    expect(game.state.journal[2].text).toBe("First");
  });
});

// ============================================================
// F. SCREEN NAVIGATION
// ============================================================
describe("F. Screens", () => {
  test("switchScreen updates state.screen", () => {
    ["title", "game", "radar", "menu", "ending"].forEach(s => {
      game.switchScreen(s);
      expect(game.state.screen).toBe(s);
    });
  });
});

// ============================================================
// G. RESET GAME
// ============================================================
describe("G. Reset", () => {
  test("resetGame restores initial state", () => {
    // Modify state
    game.state.paths.assassination = 10;
    game.state.factions.merchants = 80;
    game.state.philosophy.taoism = 50;
    game.state.notoriety = 75;
    game.state.endingTriggered = true;
    game.addJournal("Will be cleared");

    game.resetGame();

    expect(game.state.paths.assassination).toBe(0);
    expect(game.state.paths.economic).toBe(0);
    expect(game.state.factions.merchants).toBe(0);
    expect(game.state.factions.military).toBe(-20);
    expect(game.state.factions.people).toBe(10);
    expect(game.state.philosophy.taoism).toBe(0);
    expect(game.state.notoriety).toBe(0);
    expect(game.state.endingTriggered).toBe(false);
    // resetGame calls startGame which adds the intro journal entry
    expect(game.state.journal).toHaveLength(1);
    expect(game.state.journal[0].text).toContain("Venise");
  });

  test("resetGame resets player position", () => {
    game.state.player.x = 0;
    game.state.player.y = 0;
    game.resetGame();
    expect(game.state.player.x).toBe(game.WORLD_W / 2 + 80);
    expect(game.state.player.y).toBe(game.WORLD_H / 2 - 100);
  });
});

// ============================================================
// H. EDGE CASES
// ============================================================
describe("H. Edge Cases", () => {
  test("openDialog twice is ignored", () => {
    const npc = game.npcs[0];
    game.closeDialog();
    game.openDialog(npc);
    expect(game.state.dialogActive).toBe(true);
    // Try opening again — should be ignored
    expect(() => game.openDialog(game.npcs[1])).not.toThrow();
    // Should still be on first NPC
    expect(game.state.currentNPC).toBe(npc);
    game.closeDialog();
  });

  test("handleChoice with empty effects does not throw", () => {
    expect(() => {
      game.handleChoice("marco", { text: "t", next: null, effects: {} });
    }).not.toThrow();
  });

  test("handleChoice with undefined effects does not throw", () => {
    expect(() => {
      game.handleChoice("marco", { text: "t", next: null, effects: undefined });
    }).not.toThrow();
  });

  test("showDialogNode with invalid node closes dialog", () => {
    const npc = game.npcs[0];
    game.closeDialog();
    game.state.dialogActive = true;
    game.showDialogNode(npc, "nonexistent_node");
    expect(game.state.dialogActive).toBe(false);
  });

  test("closeDialog when not active is safe", () => {
    game.state.dialogActive = false;
    expect(() => game.closeDialog()).not.toThrow();
  });
});

// ============================================================
// I. PHILOSOPHICAL BALANCE
// ============================================================
describe("I. Philosophical Balance", () => {
  test("all 6 philosophy axes reachable from dialogs", () => {
    const axes = new Set();
    Object.values(game.dialogs).forEach(tree => {
      Object.values(tree).forEach(node => {
        node.choices.forEach(c => {
          if (c.effects?.philosophy) {
            Object.keys(c.effects.philosophy).forEach(k => axes.add(k));
          }
        });
      });
    });
    ["taoism", "stoicism", "confucianism", "existentialism", "zen", "jungian"].forEach(a => {
      expect(axes.has(a)).toBe(true);
    });
  });

  test("all 4 paths reachable from dialogs", () => {
    const paths = new Set();
    Object.values(game.dialogs).forEach(tree => {
      Object.values(tree).forEach(node => {
        node.choices.forEach(c => {
          if (c.effects?.paths) {
            Object.keys(c.effects.paths).forEach(k => paths.add(k));
          }
        });
      });
    });
    ["assassination", "economic", "revolution", "wuwei"].forEach(p => {
      expect(paths.has(p)).toBe(true);
    });
  });

  test("all 5 factions are affected by at least one dialog", () => {
    const factions = new Set();
    Object.values(game.dialogs).forEach(tree => {
      Object.values(tree).forEach(node => {
        node.choices.forEach(c => {
          if (c.effects?.factions) {
            Object.keys(c.effects.factions).forEach(k => factions.add(k));
          }
        });
      });
    });
    ["merchants", "church", "military", "people", "thieves"].forEach(f => {
      expect(factions.has(f)).toBe(true);
    });
  });
});
