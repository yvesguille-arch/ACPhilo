# AC Wisdom Engine — Game Specs (Testable)

## 1. Canvas & Rendering

### 1.1 Canvas Setup
- Canvas fills full viewport (width = window.innerWidth, height = window.innerHeight)
- Canvas resizes on window resize
- Background color: `#1e1825` (visible, not pure black)

### 1.2 Camera
- Camera follows player position
- Camera clamped to world bounds (0,0) to (WORLD_W - canvas.width, WORLD_H - canvas.height)
- Player always visible at center of screen

### 1.3 Draw Order
1. Ground (full world rect)
2. Canals (water with ripple animation)
3. Bridges (over canals)
4. Buildings (with borders)
5. Locations (glow circle + icon + name)
6. NPCs (emoji + name)
7. Player (triangle with glow)
8. Vignette (dark edges)
9. Debug overlay (green text, bottom-left)

### 1.4 Visual Requirements
- All draw functions must reset `globalAlpha` to 1 after use
- Location icons must have explicit `fillStyle` before `fillText`
- Player must be visible (gold triangle, min 22px tall)
- Locations must show icon (24px) and name (11px)

---

## 2. World & Map

### 2.1 World
- Size: 2400 x 2400 pixels
- Tile size: 40px (used for grid calculations)

### 2.2 Map Elements
- **Canals**: Rectangle water zones, at least 4 (grand canal horizontal, vertical, 2 secondary)
- **Bridges**: Rectangles that override canal water (walkable over water)
- **Buildings**: Seed buildings around locations + 40 random buildings
- Random buildings must NOT overlap locations (radius + 40px margin)
- Random buildings must NOT overlap canals

### 2.3 Locations (7 total)
| ID | Name | Position | Radius | Guarded |
|----|------|----------|--------|---------|
| piazza | Piazza San Marco | center | 80 | no |
| palazzo | Palazzo Ducale | NE | 70 | yes |
| rialto | Rialto Market | W | 65 | no |
| arsenal | Arsenal | SE | 70 | no |
| church | San Giorgio | NW | 55 | no |
| porto | Porto | SW | 65 | no |
| murano | Murano | S | 55 | no |

---

## 3. Player

### 3.1 Spawn
- Initial position: (WORLD_W/2 + 80, WORLD_H/2 - 100) = (1280, 1100)
- **CRITICAL**: Spawn must NOT be inside a canal or building
- Safety check: if spawn is blocked, search nearby offsets for walkable position

### 3.2 Movement
- Speed: 2.8 * dt (normalized to ~60fps)
- Movement from joystick (dx, dy normalized -1 to 1) OR keyboard (WASD/ZQSD/arrows)
- Keyboard magnitude capped at 1 (diagonal normalization)
- X and Y movement tested independently (allows wall sliding)

### 3.3 Collision
- `canMove(px, py)` returns false if:
  - Out of bounds (< 10 or > WORLD_W/H - 10)
  - In water (inside canal AND not on bridge)
  - Inside a building
- Water check: point-in-rect for canals, bridge override
- Building check: point-in-rect for buildings

---

## 4. Touch Controls

### 4.1 Virtual Joystick
- Touch zone: left 60%, bottom 50% of screen (`#joystick-zone`)
- On touchstart in zone: record base position, show joystick visual
- On touchmove: calculate dx/dy relative to base, cap at maxDist (40px)
- On touchend: reset dx/dy to 0, hide joystick visual
- Must track touch identifier to avoid multi-touch conflicts
- Must call `e.preventDefault()` on all touch events (passive: false)
- Dialog active → joystick disabled

### 4.2 Tap Interaction
- Tap on canvas (not in joystick zone) → check NPC proximity
- NPC tap radius: 30px from NPC position (in world coords)
- Player must be within 80px of NPC to open dialog
- If too far: show "Approchez-vous" notification

### 4.3 Mouse Fallback
- mousedown → start joystick
- mousemove → update joystick
- mouseup → release joystick

### 4.4 Global Touch Prevention
- `document.touchmove` preventDefault to block page scrolling
- Exception: dialog choices, journal entries, radar details (allow scroll)

---

## 5. NPCs (6 total)

| ID | Name | Location | Faction | Emoji |
|----|------|----------|---------|-------|
| marco | Marco | rialto | merchants | 👨‍💼 |
| giovanni | Padre Giovanni | church | church | 👨‍⚕️ |
| rossi | Capitano Rossi | arsenal | military | 💂 |
| sofia | Sofia | piazza | people | 👩‍🌾 |
| corvo | Il Corvo | porto | thieves | 🦅 |
| artisan | Maestro Bellini | murano | people | 👨‍🎨 |

### 5.1 NPC Positioning
- Each NPC spawns near their location: loc.x/y + random(-30, +30)
- NPCs are static (no pathfinding)

### 5.2 NPC Rendering
- Emoji (24px) centered on position
- Name label below (9px)
- Proximity indicator when player within 60px

---

## 6. Dialog System

### 6.1 Structure
- Each NPC has a dialog tree: `{ start: {text, choices}, node2: {text, choices}, ... }`
- Choices have: text, optional tag (philosophy name), next (node ID or null), effects
- next=null → close dialog after effects

### 6.2 Start Node Requirements
- Every NPC must have a "start" node
- Start nodes must have >= 2 choices
- Start choices should have philosophical tags

### 6.3 Choice Effects
- `factions: { key: delta }` → clamp to [-100, 100], show notification
- `philosophy: { key: delta }` → add to philosophy score
- `paths: { key: delta }` → add to path progress
- `notoriety: delta` → clamp to [0, 100], show notification
- `journal: string` → add journal entry

### 6.4 Dialog References
- All `choice.next` values must point to valid node IDs in same tree, or be null

---

## 7. Mission System

### 7.1 Four Paths
| Path | Theme | Philosophy |
|------|-------|------------|
| assassination | Kill the Doge | Jungian, Existentialism |
| economic | Strangle his economy | Confucianism |
| revolution | People's uprising | Confucianism, Stoicism |
| wuwei | Let the system collapse | Taoism, Zen |

### 7.2 Path Progression
- Points accumulated via dialog choices and location actions
- `getLeadingPath()` returns `{key, val}` of highest path
- Threshold for ending: leading path >= 6

### 7.3 Location Actions (contextual buttons)
- Rialto + economic >= 3 → "Organiser le boycott"
- Piazza + revolution >= 3 → "Lancer un discours"
- Arsenal + assassination >= 3 + military >= 20 → "Recruter des gardes"
- Church + wuwei >= 2 → "Mediter"
- Porto + economic >= 2 → "Saboter une cargaison"
- Murano → "Admirer l'art" (always available)
- Palazzo + leading path >= 6 → "Entrer au Palais" (triggers ending)

### 7.4 Mission Tracker
- Shows leading path name + stage text via `getMissionText(path, stage)`
- Stage = floor(path_value / 2), capped at index 2

---

## 8. Factions & Reputation

### 8.1 Five Factions
- merchants, church, military, people, thieves
- Range: -100 to +100
- Starting values: merchants=0, church=0, military=-20, people=10, thieves=0

### 8.2 Influence
- Derived from total positive faction scores / 3, capped at 100
- Updated after each dialog choice

### 8.3 Notoriety
- Range: 0 to 100, starts at 0
- Increased by aggressive/risky choices

---

## 9. Philosophical Progression

### 9.1 Six Axes
- taoism, stoicism, confucianism, existentialism, zen, jungian
- All start at 0, no cap

### 9.2 All Axes Reachable
- Every axis must be reachable from at least one dialog choice
- All 4 paths must be reachable from dialogs

### 9.3 Radar Chart
- Spider chart on radar screen (canvas-based)
- Shows all 6 axes with values
- Details list below chart

---

## 10. Ending System

### 10.1 Trigger
- `checkEnding()` called after each dialog close
- If leading path >= 6 → show notification + update mission text
- Player must go to Palazzo and press "Entrer au Palais" to trigger

### 10.2 Four Endings
| Path | Title | Icon |
|------|-------|------|
| assassination | La Lame dans l'Ombre | 🗡️ |
| economic | Le Marchand de Venise | 💰 |
| revolution | La Voix du Peuple | ✊ |
| wuwei | La Main Invisible | 🌊 |

### 10.3 Ending Screen
- Icon, title, narrative text, philosophical quote
- Final radar chart
- "Rejouer" button resets all state

---

## 11. UI/HUD

### 11.1 HUD Top
- Current location name (gold, uppercase)
- Notoriety bar (red fill, 0-100%)
- Influence bar (gold fill, 0-100%)

### 11.2 Mission Tracker
- Title: "The Invisible Hand"
- Objective text updates with leading path

### 11.3 Notifications
- Toast with icon + text, auto-dismiss after 3s
- Slide-in animation

### 11.4 Journal
- Entries with timestamp ("Jour N") and text
- Newest first (unshift)
- Viewable in menu screen

### 11.5 Screens
- title, game, radar, menu, ending
- Only one active at a time
- Transitions via switchScreen()

---

## 12. PWA

- Service worker caches core assets
- manifest.json with app name, icons, standalone display
- Install hint hidden in standalone mode
