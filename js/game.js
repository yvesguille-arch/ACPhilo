// ============================================================
// ASSASSIN'S CREED - THE WISDOM ENGINE
// Venice, 1486 - A Philosophical Game Prototype
// ============================================================

(function() {
"use strict";

// ============================================================
// CONSTANTS & CONFIGURATION
// ============================================================
const WORLD_W = 2400;
const WORLD_H = 2400;
const TILE = 40;
const PLAYER_SPEED = 2.8;
const GOLD = "#c9a84c";
const GOLD_DIM = "#8a7233";
const WATER_COLOR = "#1a4060";
const WATER_LIGHT = "#2a5a80";
const BUILDING_COLOR = "#3a2848";
const BUILDING_BORDER = "#5a4a6a";
const BRIDGE_COLOR = "#6a5a40";
const PATH_COLOR = "#2d2535";

// ============================================================
// DOM REFERENCES
// ============================================================
const $ = id => document.getElementById(id);
const canvas = $("map-canvas");
const ctx = canvas.getContext("2d");
const radarCanvas = $("radar-canvas");
const radarCtx = radarCanvas.getContext("2d");

const elTitleScreen = $("title-screen");
const elGameScreen = $("game-screen");
const elRadarScreen = $("radar-screen");
const elMenuScreen = $("menu-screen");
const elEndingScreen = $("ending-screen");

const elHudLocation = $("hud-location");
const elNotorietyFill = $("notoriety-fill");
const elInfluenceFill = $("influence-fill");
const elMissionTitle = $("mission-title");
const elMissionObj = $("mission-objective");
const elActionBar = $("action-bar");
const elActionButtons = $("action-buttons");
const elDialogBox = $("dialog-box");
const elDialogPortrait = $("dialog-portrait");
const elDialogName = $("dialog-name");
const elDialogText = $("dialog-text");
const elDialogChoices = $("dialog-choices");
const elNotification = $("notification");
const elNotifIcon = $("notif-icon");
const elNotifText = $("notif-text");
const elJoystickZone = $("joystick-zone");
const elJoystickBase = $("joystick-base");
const elJoystickThumb = $("joystick-thumb");
const elJournalEntries = $("journal-entries");
const elRadarDetails = $("radar-details");
const elEndingIcon = $("ending-icon");
const elEndingTitle = $("ending-title");
const elEndingText = $("ending-text");
const elEndingPhilo = $("ending-philosophy");
const elEndingRadar = $("ending-radar");


// ============================================================
// GAME STATE
// ============================================================
const state = {
  screen: "title",
  player: { x: WORLD_W / 2 + 80, y: WORLD_H / 2 - 100 },
  camera: { x: 0, y: 0 },
  notoriety: 0,
  influence: 10,
  factions: {
    merchants: 0,
    church: 0,
    military: -20,
    people: 10,
    thieves: 0
  },
  philosophy: {
    taoism: 0,
    stoicism: 0,
    confucianism: 0,
    existentialism: 0,
    zen: 0,
    jungian: 0
  },
  paths: {
    assassination: 0,
    economic: 0,
    revolution: 0,
    wuwei: 0
  },
  journal: [],
  visitedLocations: new Set(),
  dialogActive: false,
  currentNPC: null,
  currentDialogNode: null,
  gameTime: 0,
  dayPhase: 0,
  questStage: "explore",
  endingTriggered: false
};

// ============================================================
// JOYSTICK STATE
// ============================================================
const joystick = {
  active: false,
  touchId: null,
  baseX: 0, baseY: 0,
  dx: 0, dy: 0,
  angle: 0,
  magnitude: 0
};

// ============================================================
// WATER ANIMATION
// ============================================================
let waterTime = 0;


// ============================================================
// MAP DATA - VENICE LAYOUT
// ============================================================

// Buildings: arrays of rect {x, y, w, h}
const buildings = [];
const canals = [];
const bridges = [];

// Locations of interest
const locations = [
  {
    id: "piazza",
    name: "Piazza San Marco",
    x: WORLD_W / 2, y: WORLD_H / 2 - 100,
    radius: 80,
    icon: "\u2B50",
    color: GOLD,
    description: "Le coeur de Venise. La place grouille de marchands et de citoyens."
  },
  {
    id: "palazzo",
    name: "Palazzo Ducale",
    x: WORLD_W / 2 + 200, y: WORLD_H / 2 - 300,
    radius: 70,
    icon: "\uD83C\uDFF0",
    color: "#c43030",
    description: "Le palais du Doge Morosini. Fortement garde.",
    guarded: true
  },
  {
    id: "rialto",
    name: "Rialto Market",
    x: WORLD_W / 2 - 350, y: WORLD_H / 2 - 50,
    radius: 65,
    icon: "\uD83C\uDFEA",
    color: "#e8c84a",
    description: "Le marche du Rialto. L'economie de Venise bat ici."
  },
  {
    id: "arsenal",
    name: "Arsenal",
    x: WORLD_W / 2 + 350, y: WORLD_H / 2 + 200,
    radius: 70,
    icon: "\u2694\uFE0F",
    color: "#8b2020",
    description: "Le quartier militaire. Des soldats patrouillent les rues."
  },
  {
    id: "church",
    name: "San Giorgio",
    x: WORLD_W / 2 - 200, y: WORLD_H / 2 - 350,
    radius: 55,
    icon: "\u26EA",
    color: "#aaa088",
    description: "L'eglise de San Giorgio. Un lieu de paix et de secrets."
  },
  {
    id: "porto",
    name: "Porto",
    x: WORLD_W / 2 - 300, y: WORLD_H / 2 + 300,
    radius: 65,
    icon: "\u2693",
    color: "#2a4a7a",
    description: "Les docks. Contrebandiers et marins s'y retrouvent."
  },
  {
    id: "murano",
    name: "Murano",
    x: WORLD_W / 2 + 100, y: WORLD_H / 2 + 350,
    radius: 55,
    icon: "\uD83C\uDFA8",
    color: "#6a3a8a",
    description: "Le quartier des artisans verriers. Beaute et savoir-faire."
  }
];


// ============================================================
// NPC DATA
// ============================================================
const npcs = [
  {
    id: "marco",
    name: "Marco",
    emoji: "\uD83D\uDC68\u200D\uD83D\uDCBC",
    location: "rialto",
    faction: "merchants",
    description: "Un riche marchand du Rialto. Il connait les rouages du commerce venitien.",
    x: 0, y: 0
  },
  {
    id: "giovanni",
    name: "Padre Giovanni",
    emoji: "\uD83D\uDC68\u200D\u2695\uFE0F",
    location: "church",
    faction: "church",
    description: "Un pretre erudit qui garde les secrets de l'eglise.",
    x: 0, y: 0
  },
  {
    id: "rossi",
    name: "Capitano Rossi",
    emoji: "\uD83D\uDC82",
    location: "arsenal",
    faction: "military",
    description: "Le capitaine de la garde. Un homme d'honneur tiraille par sa loyaute.",
    x: 0, y: 0
  },
  {
    id: "sofia",
    name: "Sofia",
    emoji: "\uD83D\uDC69\u200D\uD83C\uDF3E",
    location: "piazza",
    faction: "people",
    description: "Une leader du peuple. Elle reve d'une Venise juste.",
    x: 0, y: 0
  },
  {
    id: "corvo",
    name: "Il Corvo",
    emoji: "\uD83E\uDD85",
    location: "porto",
    faction: "thieves",
    description: "Le maitre des voleurs. Rien n'echappe a son reseau d'informateurs.",
    x: 0, y: 0
  },
  {
    id: "artisan",
    name: "Maestro Bellini",
    emoji: "\uD83D\uDC68\u200D\uD83C\uDFA8",
    location: "murano",
    faction: "people",
    description: "Un maitre verrier. Son art cache des messages codes.",
    x: 0, y: 0
  }
];

// Position NPCs near their locations
npcs.forEach(npc => {
  const loc = locations.find(l => l.id === npc.location);
  if (loc) {
    npc.x = loc.x + (Math.random() - 0.5) * 60;
    npc.y = loc.y + (Math.random() - 0.5) * 60;
  }
});


// ============================================================
// DIALOG TREES
// ============================================================
const dialogs = {
  marco: {
    start: {
      text: "Bienvenue au Rialto, etranger. Le commerce est l'ame de Venise... mais ces temps-ci, l'ame est malade. Le Doge taxe sans merci.",
      choices: [
        {
          text: "Les taxes du Doge sont injustes. Aidez-moi a le destituer.",
          tag: "Confucianisme",
          next: "marco_ally",
          effects: { factions: { merchants: 20 }, philosophy: { confucianism: 10 }, paths: { economic: 1 } }
        },
        {
          text: "L'eau trouve toujours son chemin. Le marche se corrigera de lui-meme.",
          tag: "Taoisme",
          next: "marco_tao",
          effects: { philosophy: { taoism: 15 }, paths: { wuwei: 1 } }
        },
        {
          text: "Je n'ai pas besoin de votre aide. Je trouverai ma propre voie.",
          tag: "Existentialisme",
          next: "marco_lone",
          effects: { philosophy: { existentialism: 10 }, factions: { merchants: -5 } }
        }
      ]
    },
    marco_ally: {
      text: "Bien parle! Je peux couper l'approvisionnement du palais. Mais il me faut un contact aux docks. Parlez a Il Corvo au Porto.",
      choices: [
        { text: "J'irai le voir.", next: null, effects: { paths: { economic: 1 }, journal: "Marco propose de bloquer les approvisionnements du Doge. Il faut contacter Il Corvo aux docks." } }
      ]
    },
    marco_tao: {
      text: "Hmm... Vous etes philosophe? Peut-etre avez-vous raison. Mais le peuple souffre maintenant. Revenez si vous changez d'avis.",
      choices: [
        { text: "Le temps revelera la voie.", next: null, effects: { philosophy: { taoism: 5 } } }
      ]
    },
    marco_lone: {
      text: "Comme vous voulez. Mais a Venise, personne ne survit seul longtemps.",
      choices: [
        { text: "Nous verrons.", next: null, effects: {} }
      ]
    }
  },

  giovanni: {
    start: {
      text: "Mon enfant... L'eglise observe. Le Doge s'eloigne de Dieu. J'ai trouve des documents qui revelent ses crimes, caches dans les archives du palais.",
      choices: [
        {
          text: "Revelons ces crimes au peuple. La verite les liberera.",
          tag: "Stoicisme",
          next: "giovanni_truth",
          effects: { factions: { church: 20 }, philosophy: { stoicism: 15 }, paths: { revolution: 1 } }
        },
        {
          text: "Ces documents pourraient servir de levier... pour le faire chanter.",
          tag: "Jungien",
          next: "giovanni_shadow",
          effects: { philosophy: { jungian: 15 }, notoriety: 10, paths: { assassination: 1 } }
        },
        {
          text: "Laissez les choses suivre leur cours naturel, Padre.",
          tag: "Zen",
          next: "giovanni_zen",
          effects: { philosophy: { zen: 15 }, paths: { wuwei: 1 } }
        }
      ]
    },
    giovanni_truth: {
      text: "Courageux! Mais les gardes surveillent les archives. Il faut une diversion. Parlez a Sofia sur la Piazza, elle saura mobiliser le peuple.",
      choices: [
        { text: "J'irai la trouver.", next: null, effects: { paths: { revolution: 1 }, journal: "Padre Giovanni connait des documents compromettants sur le Doge. Sofia pourrait creer une diversion." } }
      ]
    },
    giovanni_shadow: {
      text: "L'ombre en vous parle... Prenez garde a ne pas devenir ce que vous combattez. Mais oui, ces documents sont une arme puissante.",
      choices: [
        { text: "Je sais ce que je fais.", next: null, effects: { paths: { assassination: 1 }, journal: "Des documents compromettants existent dans les archives du palais. Un outil de chantage potentiel." } }
      ]
    },
    giovanni_zen: {
      text: "Le moine zen dirait la meme chose. Mais l'inaction face a l'injustice... est-ce vraiment sagesse ou paresse spirituelle?",
      choices: [
        { text: "Le bambou plie mais ne rompt pas.", next: null, effects: { philosophy: { zen: 5 } } }
      ]
    }
  },

  rossi: {
    start: {
      text: "Halte! Vous n'avez rien a faire ici. ...A moins que vous n'ayez quelque chose a me dire sur le Doge?",
      choices: [
        {
          text: "Le Doge trahit Venise. Un homme d'honneur devrait defendre la cite, pas le tyran.",
          tag: "Confucianisme",
          next: "rossi_honor",
          effects: { factions: { military: 25 }, philosophy: { confucianism: 15 }, paths: { revolution: 1 } }
        },
        {
          text: "J'ai besoin de votre aide pour l'eliminer. Discretement.",
          tag: "Existentialisme",
          next: "rossi_assassin",
          effects: { philosophy: { existentialism: 10 }, notoriety: 15, paths: { assassination: 1 } }
        },
        {
          text: "Je ne fais qu'observer. Chaque systeme porte en lui les graines de sa propre fin.",
          tag: "Taoisme",
          next: "rossi_observe",
          effects: { philosophy: { taoism: 10 }, paths: { wuwei: 1 } }
        }
      ]
    },
    rossi_honor: {
      text: "Vous parlez avec sagesse. Je suis fatigue de servir un maitre corrompu. Donnez-moi une raison... des preuves... et mes hommes vous suivront.",
      choices: [
        { text: "Les preuves viendront.", next: null, effects: { paths: { revolution: 1 }, factions: { military: 10 }, journal: "Capitano Rossi est pret a retourner la garde contre le Doge, si on lui fournit des preuves." } }
      ]
    },
    rossi_assassin: {
      text: "Vous etes fou ou courageux. Les gardes du palais sont loyaux. Mais... il y a une entree secrete par les canaux. Je ne vous ai rien dit.",
      choices: [
        { text: "Merci, Capitano.", next: null, effects: { paths: { assassination: 1 }, notoriety: 5, journal: "Rossi a revele un passage secret vers le palais par les canaux." } }
      ]
    },
    rossi_observe: {
      text: "Philosophe, hein? Les philosophes ne durent pas longtemps dans l'Arsenal. Partez avant que je change d'avis.",
      choices: [
        { text: "*Partir calmement*", next: null, effects: { philosophy: { stoicism: 5 } } }
      ]
    }
  },

  sofia: {
    start: {
      text: "Tu es nouveau? Le peuple murmure contre le Doge. Mais les murmures ne suffisent pas. Il faut de l'action!",
      choices: [
        {
          text: "Organisons le peuple. Ensemble, nous sommes plus forts que n'importe quel tyran.",
          tag: "Confucianisme",
          next: "sofia_revolt",
          effects: { factions: { people: 25 }, philosophy: { confucianism: 10 }, paths: { revolution: 1 } }
        },
        {
          text: "La violence engendre la violence. Semons des idees, pas la revolte.",
          tag: "Stoicisme",
          next: "sofia_ideas",
          effects: { philosophy: { stoicism: 15 }, paths: { wuwei: 1 } }
        },
        {
          text: "Chacun doit choisir sa propre liberte. On ne peut pas la donner aux gens.",
          tag: "Existentialisme",
          next: "sofia_freedom",
          effects: { philosophy: { existentialism: 15 }, factions: { people: 5 } }
        }
      ]
    },
    sofia_revolt: {
      text: "Enfin quelqu'un qui comprend! Je connais des gens dans chaque quartier. Nous pouvons organiser une manifestation devant le palais. Mais il nous faut les marchands aussi - parlez a Marco au Rialto.",
      choices: [
        { text: "Le peuple se levera!", next: null, effects: { paths: { revolution: 1 }, journal: "Sofia peut mobiliser le peuple pour une manifestation. Il faut aussi le soutien des marchands." } }
      ]
    },
    sofia_ideas: {
      text: "Des idees... oui, peut-etre. Les pamphlets de Maestro Bellini a Murano circulent deja. Allez le voir, il cache des messages dans ses oeuvres de verre.",
      choices: [
        { text: "L'art comme resistance. Interessant.", next: null, effects: { paths: { wuwei: 1 }, journal: "Bellini a Murano diffuse des messages de resistance a travers son art." } }
      ]
    },
    sofia_freedom: {
      text: "Belle parole... mais difficile a entendre quand on a faim. Revenez quand vous aurez les pieds sur terre.",
      choices: [
        { text: "La liberte n'a pas de prix.", next: null, effects: { philosophy: { existentialism: 5 } } }
      ]
    }
  },

  corvo: {
    start: {
      text: "On m'a parle de toi. L'ombre qui pose des questions. Je vends des informations, pas des allegiances. Qu'est-ce que tu veux savoir?",
      choices: [
        {
          text: "Les faiblesses du Doge. Ses gardes, ses habitudes.",
          tag: "Jungien",
          next: "corvo_assassin",
          effects: { philosophy: { jungian: 10 }, notoriety: 10, paths: { assassination: 1 }, factions: { thieves: 15 } }
        },
        {
          text: "Les routes commerciales du Doge. Comment couper ses revenus.",
          tag: "Confucianisme",
          next: "corvo_economic",
          effects: { philosophy: { confucianism: 5 }, paths: { economic: 1 }, factions: { thieves: 15 } }
        },
        {
          text: "Rien de specifique. Je veux juste comprendre le reseau.",
          tag: "Zen",
          next: "corvo_zen",
          effects: { philosophy: { zen: 10 }, paths: { wuwei: 1 }, factions: { thieves: 10 } }
        }
      ]
    },
    corvo_assassin: {
      text: "Le Doge dort dans la tour est du palais. Deux gardes a la porte, un dans le couloir. Changement de garde a minuit. C'est tout ce que tu auras gratuitement.",
      choices: [
        { text: "C'est suffisant.", next: null, effects: { paths: { assassination: 1 }, journal: "Il Corvo a revele les details de la garde du palais. Changement de garde a minuit, tour est." } }
      ]
    },
    corvo_economic: {
      text: "Malin. Le Doge importe des epices par le Porto et les revend dix fois le prix. Sabote les cargaisons et il perd sa source de richesse. Marco au Rialto pourrait aider.",
      choices: [
        { text: "L'or est son point faible.", next: null, effects: { paths: { economic: 1 }, journal: "Les cargaisons d'epices du Doge transitent par le Porto. Saboter ses importations l'affaiblirait." } }
      ]
    },
    corvo_zen: {
      text: "Hmm... un esprit qui observe avant d'agir. Rare. Sache que chaque faction a ses propres raisons de detester le Doge. Le tissu se defait deja tout seul.",
      choices: [
        { text: "Le sage attend que le fruit tombe.", next: null, effects: { paths: { wuwei: 1 }, journal: "Il Corvo confirme que toutes les factions sont insatisfaites. Le systeme est fragile." } }
      ]
    }
  },

  artisan: {
    start: {
      text: "Admire mon art, ami! Chaque piece de verre raconte une histoire. En ce moment, mes histoires parlent de liberte... pour ceux qui savent regarder.",
      choices: [
        {
          text: "Votre art est une arme silencieuse. Continuez a inspirer le peuple.",
          tag: "Taoisme",
          next: "artisan_inspire",
          effects: { philosophy: { taoism: 10 }, factions: { people: 10 }, paths: { wuwei: 1 } }
        },
        {
          text: "L'art ne suffit pas. Il faut agir directement.",
          tag: "Existentialisme",
          next: "artisan_action",
          effects: { philosophy: { existentialism: 10 }, factions: { people: 5 } }
        },
        {
          text: "Enseignez votre art aux jeunes. Le savoir-faire est le vrai pouvoir.",
          tag: "Confucianisme",
          next: "artisan_teach",
          effects: { philosophy: { confucianism: 15 }, factions: { people: 15 }, paths: { revolution: 1 } }
        }
      ]
    },
    artisan_inspire: {
      text: "Le verre est comme le Tao - transparent, fragile, mais capable de capturer la lumiere. Mes oeuvres circulent dans toute Venise. Le changement arrive... doucement.",
      choices: [
        { text: "La beaute est revolution.", next: null, effects: { paths: { wuwei: 1 }, journal: "L'art de Bellini propage subtilement des idees de liberte a travers Venise." } }
      ]
    },
    artisan_action: {
      text: "L'action! Oui! J'ai cache des armes dans mes caisses de verre. Pour le jour ou le peuple se levera. Sofia le sait.",
      choices: [
        { text: "Bien joue, Maestro.", next: null, effects: { paths: { revolution: 1 }, notoriety: 5, journal: "Bellini cache des armes dans ses caisses de verre pour une future revolte." } }
      ]
    },
    artisan_teach: {
      text: "Sage parole! J'enseigne deja a vingt apprentis. Chacun d'eux est un messager. Le savoir se repand comme le verre en fusion - lentement, mais imparablement.",
      choices: [
        { text: "La connaissance est liberation.", next: null, effects: { paths: { revolution: 1 }, journal: "Bellini forme des apprentis qui deviennent des messagers de liberte." } }
      ]
    }
  }
};


// ============================================================
// MAP GENERATION
// ============================================================
function generateMap() {
  // Create canal network (water paths)
  // Main grand canal - S curve through the city
  canals.push({ x: 0, y: WORLD_H / 2 - 180, w: WORLD_W, h: 50 });
  canals.push({ x: WORLD_W / 2 - 25, y: 0, w: 50, h: WORLD_H });
  // Secondary canals
  canals.push({ x: WORLD_W / 4, y: WORLD_H / 4, w: 35, h: WORLD_H / 2 });
  canals.push({ x: WORLD_W * 3 / 4, y: WORLD_H / 4, w: 35, h: WORLD_H / 2 });
  canals.push({ x: WORLD_W / 4, y: WORLD_H / 4, w: WORLD_W / 2, h: 35 });
  canals.push({ x: WORLD_W / 4, y: WORLD_H * 3 / 4, w: WORLD_W / 2, h: 35 });
  // Small canals
  canals.push({ x: WORLD_W / 2 - 400, y: WORLD_H / 2 + 80, w: 30, h: 300 });
  canals.push({ x: WORLD_W / 2 + 300, y: WORLD_H / 2 - 250, w: 300, h: 30 });

  // Bridges over canals — each bridge fully spans the canal it crosses
  // A horizontal bridge (w > h) crosses a vertical canal
  // A vertical bridge (h > w) crosses a horizontal canal

  // === Bridges over VERTICAL grand canal (x=1175-1225, w=50) ===
  // Need horizontal bridges: w=70+, h=25
  bridges.push({ x: 1165, y: 900, w: 75, h: 25 });   // north of horizontal canal
  bridges.push({ x: 1165, y: 1150, w: 75, h: 25 });   // south of horizontal canal (near piazza)
  bridges.push({ x: 1165, y: 700, w: 75, h: 25 });    // far north (toward palazzo/church)
  bridges.push({ x: 1165, y: 1500, w: 75, h: 25 });   // far south (toward murano)

  // === Bridges over HORIZONTAL grand canal (y=1020-1070, h=50) ===
  // Need vertical bridges: w=25, h=70+
  bridges.push({ x: 850, y: 1010, w: 25, h: 70 });    // near rialto
  bridges.push({ x: 1350, y: 1010, w: 25, h: 70 });   // east of piazza (toward palazzo)
  bridges.push({ x: 400, y: 1010, w: 25, h: 70 });    // far west
  bridges.push({ x: 2000, y: 1010, w: 25, h: 70 });   // far east

  // === Grand canal intersection (x=1175-1225, y=1020-1070) ===
  bridges.push({ x: 1165, y: 1010, w: 75, h: 70 });   // large bridge at crossing

  // === Bridges over LEFT vertical canal (x=600-635, w=35) ===
  bridges.push({ x: 590, y: 800, w: 55, h: 25 });     // north section
  bridges.push({ x: 590, y: 1150, w: 55, h: 25 });    // south section
  bridges.push({ x: 590, y: 1400, w: 55, h: 25 });    // toward porto

  // === Bridges over RIGHT vertical canal (x=1800-1835, w=35) ===
  bridges.push({ x: 1790, y: 800, w: 55, h: 25 });    // north section
  bridges.push({ x: 1790, y: 1150, w: 55, h: 25 });   // south section
  bridges.push({ x: 1790, y: 1400, w: 55, h: 25 });   // south section

  // === Bridges over TOP horizontal canal (y=600-635, h=35) ===
  bridges.push({ x: 900, y: 590, w: 25, h: 55 });     // left section
  bridges.push({ x: 1400, y: 590, w: 25, h: 55 });    // right section

  // === Bridges over BOTTOM horizontal canal (y=1800-1835, h=35) ===
  bridges.push({ x: 900, y: 1790, w: 25, h: 55 });    // left section
  bridges.push({ x: 1400, y: 1790, w: 25, h: 55 });   // right section

  // === Bridges over SMALL vertical canal (x=800-830, w=30, y=1280-1580) ===
  bridges.push({ x: 790, y: 1350, w: 50, h: 25 });
  bridges.push({ x: 790, y: 1500, w: 50, h: 25 });

  // === Bridges over SMALL horizontal canal (x=1500-1800, y=950-980, h=30) ===
  bridges.push({ x: 1600, y: 940, w: 25, h: 50 });
  bridges.push({ x: 1700, y: 940, w: 25, h: 50 });

  // Generate buildings in blocks around locations
  const bldgSeed = [
    // Around Piazza San Marco
    { x: WORLD_W/2 - 120, y: WORLD_H/2 - 220, w: 80, h: 60 },
    { x: WORLD_W/2 + 40, y: WORLD_H/2 - 220, w: 70, h: 50 },
    { x: WORLD_W/2 - 140, y: WORLD_H/2 - 40, w: 60, h: 70 },
    { x: WORLD_W/2 + 80, y: WORLD_H/2 - 50, w: 50, h: 60 },
    // Around Palazzo
    { x: WORLD_W/2 + 140, y: WORLD_H/2 - 400, w: 120, h: 80 },
    { x: WORLD_W/2 + 280, y: WORLD_H/2 - 380, w: 60, h: 100 },
    { x: WORLD_W/2 + 140, y: WORLD_H/2 - 250, w: 90, h: 50 },
    // Around Rialto
    { x: WORLD_W/2 - 440, y: WORLD_H/2 - 120, w: 70, h: 80 },
    { x: WORLD_W/2 - 350, y: WORLD_H/2 - 130, w: 50, h: 60 },
    { x: WORLD_W/2 - 440, y: WORLD_H/2 + 10, w: 80, h: 50 },
    { x: WORLD_W/2 - 300, y: WORLD_H/2 + 20, w: 60, h: 70 },
    // Around Arsenal
    { x: WORLD_W/2 + 280, y: WORLD_H/2 + 130, w: 100, h: 60 },
    { x: WORLD_W/2 + 400, y: WORLD_H/2 + 140, w: 70, h: 80 },
    { x: WORLD_W/2 + 300, y: WORLD_H/2 + 260, w: 80, h: 50 },
    // Around Church
    { x: WORLD_W/2 - 270, y: WORLD_H/2 - 410, w: 60, h: 70 },
    { x: WORLD_W/2 - 180, y: WORLD_H/2 - 420, w: 50, h: 60 },
    { x: WORLD_W/2 - 250, y: WORLD_H/2 - 310, w: 70, h: 40 },
    // Around Porto
    { x: WORLD_W/2 - 380, y: WORLD_H/2 + 240, w: 70, h: 60 },
    { x: WORLD_W/2 - 280, y: WORLD_H/2 + 230, w: 50, h: 80 },
    { x: WORLD_W/2 - 360, y: WORLD_H/2 + 340, w: 80, h: 50 },
    // Around Murano
    { x: WORLD_W/2 + 40, y: WORLD_H/2 + 290, w: 50, h: 60 },
    { x: WORLD_W/2 + 140, y: WORLD_H/2 + 280, w: 60, h: 70 },
    { x: WORLD_W/2 + 60, y: WORLD_H/2 + 400, w: 80, h: 40 },
    // Scattered buildings
    { x: WORLD_W/2 - 100, y: WORLD_H/2 + 150, w: 60, h: 50 },
    { x: WORLD_W/2 + 180, y: WORLD_H/2 + 50, w: 50, h: 60 },
    { x: WORLD_W/2 - 500, y: WORLD_H/2 - 300, w: 70, h: 80 },
    { x: WORLD_W/2 + 450, y: WORLD_H/2 - 100, w: 60, h: 70 },
    { x: WORLD_W/2 - 150, y: WORLD_H/2 + 400, w: 80, h: 50 },
    { x: WORLD_W/2 + 250, y: WORLD_H/2 + 400, w: 50, h: 60 }
  ];
  buildings.push(...bldgSeed);

  // Add more random small buildings
  for (let i = 0; i < 40; i++) {
    const bx = 200 + Math.random() * (WORLD_W - 400);
    const by = 200 + Math.random() * (WORLD_H - 400);
    const bw = 30 + Math.random() * 50;
    const bh = 30 + Math.random() * 50;
    // Check it does not overlap locations
    let overlap = false;
    for (const loc of locations) {
      const dx = bx + bw/2 - loc.x;
      const dy = by + bh/2 - loc.y;
      if (Math.sqrt(dx*dx + dy*dy) < loc.radius + 40) { overlap = true; break; }
    }
    // Check it does not overlap canals too much
    for (const c of canals) {
      if (bx < c.x + c.w && bx + bw > c.x && by < c.y + c.h && by + bh > c.y) { overlap = true; break; }
    }
    if (!overlap) buildings.push({ x: bx, y: by, w: bw, h: bh });
  }
}


// ============================================================
// COLLISION DETECTION
// ============================================================
function isWater(px, py) {
  for (const c of canals) {
    if (px > c.x && px < c.x + c.w && py > c.y && py < c.y + c.h) {
      // Check if on a bridge
      for (const b of bridges) {
        if (px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) return false;
      }
      return true;
    }
  }
  return false;
}

function isBuilding(px, py) {
  for (const b of buildings) {
    if (px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) return true;
  }
  return false;
}

function canMove(px, py) {
  if (px < 10 || px > WORLD_W - 10 || py < 10 || py > WORLD_H - 10) return false;
  if (isWater(px, py)) return false;
  if (isBuilding(px, py)) return false;
  return true;
}

// ============================================================
// RENDERING - MAP
// ============================================================
function resizeCanvas() {
  // Use clientWidth/Height of parent for reliable sizing on iOS
  var w = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
  var h = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  // Fallback if parent reports 0
  if (!w || !h) { w = window.innerWidth; h = window.innerHeight; }
  if (!w || !h) { w = document.documentElement.clientWidth; h = document.documentElement.clientHeight; }
  if (!w || !h) { w = screen.width; h = screen.height; }
  canvas.width = w;
  canvas.height = h;
  // Also set CSS size explicitly (avoid CSS 100% scaling mismatch)
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
}

function drawWater() {
  // Fill background with water
  ctx.fillStyle = WATER_COLOR;
  ctx.fillRect(-state.camera.x, -state.camera.y, WORLD_W, WORLD_H);

  // Animated water shimmer on canals
  for (const c of canals) {
    const wx = c.x - state.camera.x;
    const wy = c.y - state.camera.y;
    ctx.fillStyle = WATER_COLOR;
    ctx.fillRect(wx, wy, c.w, c.h);

    // Water ripples
    ctx.strokeStyle = WATER_LIGHT;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    const rippleCount = Math.max(c.w, c.h) / 20;
    for (let i = 0; i < rippleCount; i++) {
      const rx = wx + (c.w > c.h ? i * 20 : c.w / 2);
      const ry = wy + (c.h > c.w ? i * 20 : c.h / 2);
      const offset = Math.sin(waterTime * 2 + i * 0.7) * 3;
      ctx.beginPath();
      if (c.w > c.h) {
        ctx.moveTo(rx, ry + offset);
        ctx.lineTo(rx + 15, ry + offset + 2);
      } else {
        ctx.moveTo(rx + offset, ry);
        ctx.lineTo(rx + offset + 2, ry + 15);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawGround() {
  // Ground (land) - dark paving
  ctx.fillStyle = PATH_COLOR;
  ctx.fillRect(-state.camera.x, -state.camera.y, WORLD_W, WORLD_H);
}

function drawBuildings() {
  for (const b of buildings) {
    const bx = b.x - state.camera.x;
    const by = b.y - state.camera.y;

    // Building body
    ctx.fillStyle = BUILDING_COLOR;
    ctx.fillRect(bx, by, b.w, b.h);

    // Border
    ctx.strokeStyle = BUILDING_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, b.w, b.h);

    // Windows (warm lights)
    ctx.fillStyle = "rgba(201, 168, 76, 0.3)";
    const cols = Math.floor(b.w / 16);
    const rows = Math.floor(b.h / 16);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.4) {
          const winBright = 0.2 + Math.random() * 0.4;
          ctx.fillStyle = `rgba(201, 168, 76, ${winBright})`;
          ctx.fillRect(bx + 6 + c * 16, by + 6 + r * 16, 6, 6);
        }
      }
    }
  }
}

function drawBridges() {
  for (const b of bridges) {
    const bx = b.x - state.camera.x;
    const by = b.y - state.camera.y;
    // Bridge base
    ctx.fillStyle = BRIDGE_COLOR;
    ctx.fillRect(bx, by, b.w, b.h);
    // Border
    ctx.strokeStyle = "#7a6a50";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, b.w, b.h);
    // Plank lines across the bridge
    ctx.strokeStyle = "#8a7a58";
    ctx.lineWidth = 0.5;
    if (b.w > b.h) {
      // Horizontal bridge — vertical planks
      for (let px = bx + 6; px < bx + b.w - 4; px += 8) {
        ctx.beginPath();
        ctx.moveTo(px, by + 2); ctx.lineTo(px, by + b.h - 2);
        ctx.stroke();
      }
      // Railings
      ctx.strokeStyle = "#9a8a60";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + b.w, by);
      ctx.moveTo(bx, by + b.h); ctx.lineTo(bx + b.w, by + b.h);
      ctx.stroke();
    } else {
      // Vertical bridge — horizontal planks
      for (let py = by + 6; py < by + b.h - 4; py += 8) {
        ctx.beginPath();
        ctx.moveTo(bx + 2, py); ctx.lineTo(bx + b.w - 2, py);
        ctx.stroke();
      }
      // Railings
      ctx.strokeStyle = "#9a8a60";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx, by + b.h);
      ctx.moveTo(bx + b.w, by); ctx.lineTo(bx + b.w, by + b.h);
      ctx.stroke();
    }
  }
}

function drawCanals() {
  // Draw canals as water over the ground
  for (const c of canals) {
    const cx = c.x - state.camera.x;
    const cy = c.y - state.camera.y;
    ctx.fillStyle = WATER_COLOR;
    ctx.fillRect(cx, cy, c.w, c.h);

    // Water animation
    ctx.strokeStyle = WATER_LIGHT;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    const count = Math.floor(Math.max(c.w, c.h) / 25);
    for (let i = 0; i < count; i++) {
      const offset = Math.sin(waterTime * 1.5 + i * 0.9) * 4;
      if (c.w > c.h) {
        const rx = cx + i * 25 + offset;
        const ry = cy + c.h / 2 + Math.cos(waterTime + i) * 5;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo(rx + 8, ry - 3, rx + 16, ry);
        ctx.stroke();
      } else {
        const rx = cx + c.w / 2 + Math.cos(waterTime + i) * 5;
        const ry = cy + i * 25 + offset;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo(rx - 3, ry + 8, rx, ry + 16);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Canal edges
    ctx.strokeStyle = "#0e2a40";
    ctx.lineWidth = 2;
    if (c.w > c.h) {
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx + c.w, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + c.h); ctx.lineTo(cx + c.w, cy + c.h);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + c.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + c.w, cy); ctx.lineTo(cx + c.w, cy + c.h);
      ctx.stroke();
    }
  }
}


function drawLocations() {
  for (const loc of locations) {
    const lx = loc.x - state.camera.x;
    const ly = loc.y - state.camera.y;

    // Glow circle
    const visited = state.visitedLocations.has(loc.id);
    const gradient = ctx.createRadialGradient(lx, ly, 0, lx, ly, loc.radius);
    if (visited) {
      gradient.addColorStop(0, "rgba(201, 168, 76, 0.08)");
      gradient.addColorStop(1, "rgba(201, 168, 76, 0)");
    } else {
      gradient.addColorStop(0, "rgba(201, 168, 76, 0.15)");
      gradient.addColorStop(0.7, "rgba(201, 168, 76, 0.05)");
      gradient.addColorStop(1, "rgba(201, 168, 76, 0)");
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(lx, ly, loc.radius, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.fillStyle = loc.color || GOLD;
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(loc.icon, lx, ly - 15);

    // Name
    ctx.font = "11px sans-serif";
    ctx.fillStyle = visited ? GOLD_DIM : GOLD;
    ctx.fillText(loc.name, lx, ly + 12);

    // Pulsing ring for unvisited
    if (!visited) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3 + Math.sin(waterTime * 3) * 0.2;
      ctx.beginPath();
      ctx.arc(lx, ly, loc.radius * (0.8 + Math.sin(waterTime * 2) * 0.1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawNPCs() {
  for (const npc of npcs) {
    const nx = npc.x - state.camera.x;
    const ny = npc.y - state.camera.y;

    // NPC body - small circle
    ctx.fillStyle = "rgba(201, 168, 76, 0.3)";
    ctx.beginPath();
    ctx.arc(nx, ny, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD_DIM;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Emoji
    ctx.font = "14px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(npc.emoji, nx, ny);

    // Name below
    ctx.font = "8px sans-serif";
    ctx.fillStyle = GOLD_DIM;
    ctx.fillText(npc.name, nx, ny + 18);

    // Interaction indicator when close
    const dx = state.player.x - npc.x;
    const dy = state.player.y - npc.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 60) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5 + Math.sin(waterTime * 4) * 0.3;
      ctx.beginPath();
      ctx.arc(nx, ny, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawPlayer() {
  const px = state.player.x - state.camera.x;
  const py = state.player.y - state.camera.y;

  // Outer glow
  ctx.fillStyle = "rgba(201, 168, 76, 0.12)";
  ctx.beginPath();
  ctx.arc(px, py, 25, 0, Math.PI * 2);
  ctx.fill();

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.ellipse(px, py + 10, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hooded figure - triangle (hood) + body
  ctx.fillStyle = "#2a2035";
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;

  // Body (bigger)
  ctx.beginPath();
  ctx.moveTo(px, py - 16);
  ctx.lineTo(px - 11, py + 8);
  ctx.lineTo(px + 11, py + 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hood peak highlight
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(px, py - 16, 3, 0, Math.PI * 2);
  ctx.fill();

  // Eagle vision glow when near something
  let nearSomething = false;
  for (const npc of npcs) {
    const dx = state.player.x - npc.x;
    const dy = state.player.y - npc.y;
    if (Math.sqrt(dx*dx + dy*dy) < 60) { nearSomething = true; break; }
  }
  if (nearSomething) {
    ctx.strokeStyle = "rgba(201, 168, 76, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 20 + Math.sin(waterTime * 3) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}


// ============================================================
// RENDERING - RADAR CHART
// ============================================================
function drawRadarChart(targetCanvas, size) {
  const rctx = targetCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  targetCanvas.width = size * dpr;
  targetCanvas.height = size * dpr;
  rctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const axes = Object.keys(state.philosophy);
  const labels = ["Taoisme", "Stoicisme", "Confucianisme", "Existentialisme", "Zen", "Jungien"];
  const n = axes.length;
  const maxVal = 100;

  // Background rings
  for (let ring = 1; ring <= 4; ring++) {
    const r = maxR * ring / 4;
    rctx.strokeStyle = "rgba(201, 168, 76, 0.1)";
    rctx.lineWidth = 0.5;
    rctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) rctx.moveTo(x, y); else rctx.lineTo(x, y);
    }
    rctx.stroke();
  }

  // Axis lines and labels
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const ex = cx + Math.cos(angle) * maxR;
    const ey = cy + Math.sin(angle) * maxR;
    rctx.strokeStyle = "rgba(201, 168, 76, 0.2)";
    rctx.lineWidth = 0.5;
    rctx.beginPath();
    rctx.moveTo(cx, cy);
    rctx.lineTo(ex, ey);
    rctx.stroke();

    // Labels
    const lx = cx + Math.cos(angle) * (maxR + 18);
    const ly = cy + Math.sin(angle) * (maxR + 18);
    rctx.font = "10px sans-serif";
    rctx.fillStyle = GOLD;
    rctx.textAlign = "center";
    rctx.textBaseline = "middle";
    rctx.fillText(labels[i], lx, ly);
  }

  // Data polygon
  rctx.fillStyle = "rgba(201, 168, 76, 0.15)";
  rctx.strokeStyle = GOLD;
  rctx.lineWidth = 2;
  rctx.beginPath();
  for (let i = 0; i < n; i++) {
    const val = Math.min(state.philosophy[axes[i]], maxVal);
    const r = (val / maxVal) * maxR;
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) rctx.moveTo(x, y); else rctx.lineTo(x, y);
  }
  rctx.closePath();
  rctx.fill();
  rctx.stroke();

  // Data points
  for (let i = 0; i < n; i++) {
    const val = Math.min(state.philosophy[axes[i]], maxVal);
    const r = (val / maxVal) * maxR;
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    rctx.fillStyle = GOLD;
    rctx.beginPath();
    rctx.arc(x, y, 3, 0, Math.PI * 2);
    rctx.fill();
  }
}

function updateRadarScreen() {
  drawRadarChart(radarCanvas, 300);

  // Details list
  const axes = Object.keys(state.philosophy);
  const labels = ["Taoisme", "Stoicisme", "Confucianisme", "Existentialisme", "Zen", "Jungien"];
  let html = "";
  axes.forEach((key, i) => {
    const val = state.philosophy[key];
    const pct = Math.min(val, 100);
    html += '<div class="radar-item">';
    html += '<span class="radar-item-name">' + labels[i] + ' (' + val + ')</span>';
    html += '<div class="radar-item-bar"><div class="radar-item-fill" style="width:' + pct + '%"></div></div>';
    html += '</div>';
  });

  // Faction reputations
  html += '<div style="margin-top:1rem;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.1)">';
  html += '<div class="radar-item"><span class="radar-item-name" style="color:#c9a84c">Factions</span><span></span></div>';
  const factionLabels = { merchants: "Marchands", church: "Eglise", military: "Militaire", people: "Peuple", thieves: "Voleurs" };
  Object.keys(state.factions).forEach(key => {
    const val = state.factions[key];
    const display = val > 0 ? "+" + val : "" + val;
    const color = val > 0 ? "#2a6a3a" : val < 0 ? "#8b2020" : "#555";
    html += '<div class="radar-item">';
    html += '<span class="radar-item-name">' + factionLabels[key] + '</span>';
    html += '<span style="color:' + color + ';font-size:0.8rem">' + display + '</span>';
    html += '</div>';
  });
  html += '</div>';

  // Path progress
  html += '<div style="margin-top:1rem;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.1)">';
  html += '<div class="radar-item"><span class="radar-item-name" style="color:#c9a84c">Voies</span><span></span></div>';
  const pathLabels = { assassination: "Assassinat", economic: "Economie", revolution: "Revolution", wuwei: "Wu Wei" };
  Object.keys(state.paths).forEach(key => {
    const val = state.paths[key];
    const pct = Math.min(val / 6 * 100, 100);
    html += '<div class="radar-item">';
    html += '<span class="radar-item-name">' + pathLabels[key] + ' (' + val + '/6)</span>';
    html += '<div class="radar-item-bar"><div class="radar-item-fill" style="width:' + pct + '%"></div></div>';
    html += '</div>';
  });
  html += '</div>';

  elRadarDetails.innerHTML = html;
}


// ============================================================
// NOTIFICATION SYSTEM
// ============================================================
let notifTimeout = null;

function showNotification(icon, text) {
  elNotifIcon.textContent = icon;
  elNotifText.textContent = text;
  elNotification.classList.remove("hidden");
  elNotification.style.animation = "none";
  void elNotification.offsetWidth;
  elNotification.style.animation = "notifSlide 0.3s ease-out";

  if (notifTimeout) clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => {
    elNotification.classList.add("hidden");
  }, 3000);
}

// ============================================================
// JOURNAL SYSTEM
// ============================================================
function addJournal(text) {
  const entry = {
    time: "Jour " + Math.floor(state.gameTime / 600 + 1),
    text: text
  };
  state.journal.unshift(entry);
  updateJournalDisplay();
  showNotification("\uD83D\uDCD6", text.substring(0, 60) + "...");
}

function updateJournalDisplay() {
  let html = "";
  state.journal.forEach(entry => {
    html += '<div class="journal-entry">';
    html += '<div class="journal-time">' + entry.time + '</div>';
    html += '<div class="journal-text">' + entry.text + '</div>';
    html += '</div>';
  });
  elJournalEntries.innerHTML = html;
}

// ============================================================
// HUD UPDATE
// ============================================================
function updateHUD() {
  // Notoriety bar
  elNotorietyFill.style.width = Math.min(state.notoriety, 100) + "%";
  // Influence bar
  elInfluenceFill.style.width = Math.min(state.influence, 100) + "%";

  // Current location
  let currentLoc = null;
  for (const loc of locations) {
    const dx = state.player.x - loc.x;
    const dy = state.player.y - loc.y;
    if (Math.sqrt(dx*dx + dy*dy) < loc.radius) {
      currentLoc = loc;
      break;
    }
  }
  if (currentLoc) {
    elHudLocation.textContent = currentLoc.name;
    if (!state.visitedLocations.has(currentLoc.id)) {
      state.visitedLocations.add(currentLoc.id);
      showNotification(currentLoc.icon, "Decouverte: " + currentLoc.name);
      addJournal(currentLoc.description);
    }
  } else {
    elHudLocation.textContent = "Venise";
  }

  // Mission objective
  updateMissionTracker();
}

function updateMissionTracker() {
  const maxPath = getLeadingPath();
  const stage = state.paths[maxPath.key];

  if (stage >= 6) {
    elMissionObj.textContent = "Declencher le denouement";
  } else if (stage >= 4) {
    elMissionObj.textContent = getMissionText(maxPath.key, 3);
  } else if (stage >= 2) {
    elMissionObj.textContent = getMissionText(maxPath.key, 2);
  } else if (stage >= 1) {
    elMissionObj.textContent = getMissionText(maxPath.key, 1);
  } else {
    elMissionObj.textContent = "Explorez Venise et parlez aux habitants";
  }
}

function getLeadingPath() {
  let maxKey = "assassination";
  let maxVal = 0;
  for (const key of Object.keys(state.paths)) {
    if (state.paths[key] > maxVal) {
      maxVal = state.paths[key];
      maxKey = key;
    }
  }
  return { key: maxKey, val: maxVal };
}

function getMissionText(path, stage) {
  const texts = {
    assassination: [
      "Trouver les faiblesses du Doge",
      "Obtenir l'acces au palais",
      "Preparer l'assaut final"
    ],
    economic: [
      "Nouer des alliances commerciales",
      "Saboter les routes du Doge",
      "Etrangler l'economie du palais"
    ],
    revolution: [
      "Rallier les mecontents",
      "Organiser la resistance",
      "Lancer le soulevement"
    ],
    wuwei: [
      "Observer les failles du systeme",
      "Semer les graines du changement",
      "Laisser le fruit murir"
    ]
  };
  return texts[path][stage - 1] || "Continuer l'enquete";
}


// ============================================================
// DIALOG SYSTEM
// ============================================================
function openDialog(npc) {
  if (state.dialogActive) return;
  state.dialogActive = true;
  state.currentNPC = npc;
  state.currentDialogNode = "start";

  showDialogNode(npc, "start");
}

function showDialogNode(npc, nodeId) {
  const tree = dialogs[npc.id];
  if (!tree || !tree[nodeId]) {
    closeDialog();
    return;
  }

  const node = tree[nodeId];
  state.currentDialogNode = nodeId;

  elDialogPortrait.textContent = npc.emoji;
  elDialogName.textContent = npc.name;
  elDialogText.textContent = node.text;

  // Build choices
  let choicesHtml = "";
  node.choices.forEach((choice, i) => {
    const tagHtml = choice.tag ? ' <span class="choice-tag">[' + choice.tag + ']</span>' : "";
    choicesHtml += '<button data-choice="' + i + '">' + choice.text + tagHtml + '</button>';
  });
  elDialogChoices.innerHTML = choicesHtml;

  // Bind choice buttons
  elDialogChoices.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", function() {
      const idx = parseInt(this.getAttribute("data-choice"));
      handleChoice(npc, node.choices[idx]);
    });
    btn.addEventListener("touchend", function(e) {
      e.preventDefault();
      const idx = parseInt(this.getAttribute("data-choice"));
      handleChoice(npc, node.choices[idx]);
    });
  });

  elDialogBox.classList.remove("hidden");
  elActionBar.classList.add("hidden");
}

function handleChoice(npc, choice) {
  // Apply effects
  if (choice.effects) {
    const eff = choice.effects;

    if (eff.factions) {
      for (const key of Object.keys(eff.factions)) {
        state.factions[key] = Math.max(-100, Math.min(100, state.factions[key] + eff.factions[key]));
        const val = eff.factions[key];
        if (val > 0) {
          const fLabels = { merchants: "Marchands", church: "Eglise", military: "Militaire", people: "Peuple", thieves: "Voleurs" };
          showNotification("\u2B50", fLabels[key] + " +" + val);
        } else if (val < 0) {
          const fLabels = { merchants: "Marchands", church: "Eglise", military: "Militaire", people: "Peuple", thieves: "Voleurs" };
          showNotification("\u26A0\uFE0F", fLabels[key] + " " + val);
        }
      }
    }

    if (eff.philosophy) {
      for (const key of Object.keys(eff.philosophy)) {
        state.philosophy[key] += eff.philosophy[key];
      }
    }

    if (eff.paths) {
      for (const key of Object.keys(eff.paths)) {
        state.paths[key] += eff.paths[key];
      }
    }

    if (eff.notoriety) {
      state.notoriety = Math.min(100, state.notoriety + eff.notoriety);
      showNotification("\uD83D\uDC41\uFE0F", "Notoriete +" + eff.notoriety);
    }

    if (eff.journal) {
      addJournal(eff.journal);
    }

    // Update influence based on total faction scores
    let totalFaction = 0;
    for (const key of Object.keys(state.factions)) {
      totalFaction += Math.max(0, state.factions[key]);
    }
    state.influence = Math.min(100, totalFaction / 3);
  }

  // Navigate to next node or close
  if (choice.next) {
    showDialogNode(npc, choice.next);
  } else {
    closeDialog();
    checkEnding();
  }
}

function closeDialog() {
  state.dialogActive = false;
  state.currentNPC = null;
  elDialogBox.classList.add("hidden");
}


// ============================================================
// ACTION BUTTONS (contextual)
// ============================================================
function updateActionBar() {
  if (state.dialogActive) return;

  let actions = [];

  // Check for nearby NPCs
  for (const npc of npcs) {
    const dx = state.player.x - npc.x;
    const dy = state.player.y - npc.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 60) {
      actions.push({
        label: "Parler a " + npc.name,
        special: true,
        action: () => openDialog(npc)
      });
    }
  }

  // Check for location-specific actions
  for (const loc of locations) {
    const dx = state.player.x - loc.x;
    const dy = state.player.y - loc.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < loc.radius) {
      if (loc.id === "palazzo" && getLeadingPath().val >= 6) {
        actions.push({
          label: "Entrer au Palais",
          special: true,
          action: () => triggerEnding()
        });
      }
      if (loc.id === "rialto" && state.paths.economic >= 3) {
        actions.push({
          label: "Organiser le boycott",
          special: false,
          action: () => {
            state.paths.economic += 1;
            showNotification("\uD83D\uDCB0", "Boycott organise! Les marchands suivent.");
            addJournal("Un boycott des produits du Doge est en cours au Rialto.");
          }
        });
      }
      if (loc.id === "piazza" && state.paths.revolution >= 3) {
        actions.push({
          label: "Lancer un discours",
          special: false,
          action: () => {
            state.paths.revolution += 1;
            state.notoriety = Math.min(100, state.notoriety + 10);
            showNotification("\uD83D\uDDE3\uFE0F", "Le peuple se rallie a votre cause!");
            addJournal("Un discours enflamme sur la Piazza a galvanise le peuple.");
          }
        });
      }
      if (loc.id === "arsenal" && state.paths.assassination >= 3 && state.factions.military >= 20) {
        actions.push({
          label: "Recruter des gardes",
          special: false,
          action: () => {
            state.paths.assassination += 1;
            state.factions.military += 10;
            showNotification("\u2694\uFE0F", "Des gardes loyaux vous rejoignent.");
            addJournal("Des soldats de l'Arsenal se rallient secretement a notre cause.");
          }
        });
      }
      if (loc.id === "church" && state.paths.wuwei >= 2) {
        actions.push({
          label: "Mediter",
          special: false,
          action: () => {
            state.paths.wuwei += 1;
            state.philosophy.zen += 5;
            state.philosophy.taoism += 5;
            showNotification("\uD83E\uDDD8", "La meditation revele la voie.");
            addJournal("Dans le silence de San Giorgio, la voie se clarifie.");
          }
        });
      }
      if (loc.id === "porto" && state.paths.economic >= 2) {
        actions.push({
          label: "Saboter une cargaison",
          special: false,
          action: () => {
            state.paths.economic += 1;
            state.notoriety = Math.min(100, state.notoriety + 8);
            showNotification("\u2693", "Cargaison sabotee!");
            addJournal("Une cargaison d'epices du Doge a ete detruite au Porto.");
          }
        });
      }
      if (loc.id === "murano") {
        actions.push({
          label: "Admirer l'art",
          special: false,
          action: () => {
            state.philosophy.zen += 3;
            showNotification("\uD83C\uDFA8", "La beaute nourrit l'ame.");
          }
        });
      }
    }
  }

  if (actions.length > 0) {
    let html = "";
    actions.forEach((a, i) => {
      html += '<button data-action="' + i + '"' + (a.special ? ' class="action-special"' : '') + '>' + a.label + '</button>';
    });
    elActionButtons.innerHTML = html;
    elActionBar.classList.remove("hidden");

    // Bind buttons
    elActionButtons.querySelectorAll("button").forEach(btn => {
      const handler = function(e) {
        e.preventDefault();
        const idx = parseInt(this.getAttribute("data-action"));
        if (actions[idx]) actions[idx].action();
      };
      btn.addEventListener("click", handler);
      btn.addEventListener("touchend", handler);
    });
  } else {
    elActionBar.classList.add("hidden");
  }
}


// ============================================================
// ENDING SYSTEM
// ============================================================
function checkEnding() {
  if (state.endingTriggered) return;
  const leading = getLeadingPath();
  if (leading.val >= 6) {
    showNotification("\u2728", "La voie est claire. Rendez-vous au Palazzo Ducale.");
    addJournal("Le moment decisif approche. Il est temps de se rendre au Palazzo Ducale.");
    elMissionObj.textContent = "Se rendre au Palazzo Ducale";
  }
}

function triggerEnding() {
  if (state.endingTriggered) return;
  state.endingTriggered = true;

  const leading = getLeadingPath();
  const endings = {
    assassination: {
      icon: "\uD83D\uDDE1\uFE0F",
      title: "La Lame dans l'Ombre",
      text: "Vous avez penetr\u00e9 le palais sous le couvert de la nuit. Le Doge Morosini est tomb\u00e9 par votre lame. Venise est libr\u00e9e... mais a quel prix ? La violence engendre la violence, et d\u00e9ja les factions se disputent le pouvoir vacant.",
      philosophy: "\"Celui qui combat les monstres doit prendre garde de ne pas devenir monstre lui-meme.\" - Nietzsche. Votre chemin jungien vous a conduit a confronter l'Ombre directement, mais l'Ombre vit en chacun de nous."
    },
    economic: {
      icon: "\uD83D\uDCB0",
      title: "La Main Invisible",
      text: "Sans un sou, le Doge n'est plus qu'un vieil homme dans un palais vide. Les marchands ont retir\u00e9 leur soutien, les gardes ne sont plus pay\u00e9s, et Morosini a fui Venise dans la nuit. Le commerce reprend, libre et juste.",
      philosophy: "\"L'eau est douce et accueillante, pourtant elle use la pierre.\" - Lao Tseu. Comme l'eau, vous avez trouv\u00e9 le chemin de moindre r\u00e9sistance pour transformer le monde."
    },
    revolution: {
      icon: "\u270A",
      title: "La Voix du Peuple",
      text: "Le peuple de Venise s'est lev\u00e9 comme une mar\u00e9e irr\u00e9sistible. Les portes du palais ont c\u00e9d\u00e9 sous le poids de la multitude. Le Doge a \u00e9t\u00e9 jug\u00e9 par ses pairs et exil\u00e9. Une nouvelle r\u00e9publique na\u00eet.",
      philosophy: "\"Quand le peuple ne craint plus le pouvoir, alors advient le grand pouvoir.\" - Tao Te King. L'harmonie confuc\u00e9enne et la force sto\u00efcienne du peuple ont triomph\u00e9."
    },
    wuwei: {
      icon: "\uD83C\uDF3F",
      title: "Le Bambou et le Vent",
      text: "Vous n'avez jamais lev\u00e9 la main. Pourtant, chaque graine que vous avez sem\u00e9e a germ\u00e9. Les factions se sont retourn\u00e9es d'elles-memes, le peuple a murmur\u00e9, l'argent s'est tari. Le Doge s'est r\u00e9veill\u00e9 un matin dans un monde qui n'avait plus besoin de lui.",
      philosophy: "\"Agir sans agir, et rien ne reste non-fait.\" - Lao Tseu. Le Wu Wei parfait: vous avez \u00e9t\u00e9 le catalyseur invisible, le sage qui laisse le Tao accomplir son oeuvre."
    }
  };

  const ending = endings[leading.key];

  // Show ending screen
  switchScreen("ending");
  elEndingIcon.textContent = ending.icon;
  elEndingTitle.textContent = ending.title;
  elEndingText.textContent = ending.text;
  elEndingPhilo.textContent = ending.philosophy;

  // Draw final radar
  setTimeout(() => {
    drawRadarChart(elEndingRadar, 200);
  }, 300);
}


// ============================================================
// TOUCH / JOYSTICK CONTROLS
// ============================================================
function initJoystick() {
  elJoystickZone.addEventListener("touchstart", onJoystickStart, { passive: false });
  window.addEventListener("touchmove", onJoystickMove, { passive: false });
  window.addEventListener("touchend", onJoystickEnd, { passive: false });
  window.addEventListener("touchcancel", onJoystickEnd, { passive: false });

  // Mouse fallback for desktop testing
  elJoystickZone.addEventListener("mousedown", onMouseJoystickStart);
  window.addEventListener("mousemove", onMouseJoystickMove);
  window.addEventListener("mouseup", onMouseJoystickEnd);

  // Keyboard for desktop
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
}

const keys = {};
function onKeyDown(e) { keys[e.key] = true; }
function onKeyUp(e) { keys[e.key] = false; }

function onJoystickStart(e) {
  e.preventDefault();
  if (state.dialogActive) return;
  const touch = e.changedTouches[0];
  joystick.active = true;
  joystick.touchId = touch.identifier;
  joystick.baseX = touch.clientX;
  joystick.baseY = touch.clientY;
  joystick.dx = 0;
  joystick.dy = 0;

  elJoystickBase.style.left = (touch.clientX - 50) + "px";
  elJoystickBase.style.top = (touch.clientY - 50) + "px";
  elJoystickBase.classList.remove("hidden");
  elJoystickThumb.style.transform = "translate(-50%, -50%)";
}

function onJoystickMove(e) {
  if (!joystick.active) return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (touch.identifier === joystick.touchId) {
      let dx = touch.clientX - joystick.baseX;
      let dy = touch.clientY - joystick.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 40;
      if (dist > maxDist) {
        dx = dx / dist * maxDist;
        dy = dy / dist * maxDist;
      }
      joystick.dx = dx / maxDist;
      joystick.dy = dy / maxDist;
      joystick.magnitude = Math.min(dist / maxDist, 1);
      joystick.angle = Math.atan2(dy, dx);

      elJoystickThumb.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
    }
  }
}

function onJoystickEnd(e) {
  for (const touch of e.changedTouches) {
    if (touch.identifier === joystick.touchId) {
      joystick.active = false;
      joystick.dx = 0;
      joystick.dy = 0;
      joystick.magnitude = 0;
      elJoystickBase.classList.add("hidden");
      elJoystickThumb.style.transform = "translate(-50%, -50%)";
    }
  }
}

// Mouse fallback
function onMouseJoystickStart(e) {
  if (state.dialogActive) return;
  joystick.active = true;
  joystick.baseX = e.clientX;
  joystick.baseY = e.clientY;
  joystick.dx = 0;
  joystick.dy = 0;
  elJoystickBase.style.left = (e.clientX - 50) + "px";
  elJoystickBase.style.top = (e.clientY - 50) + "px";
  elJoystickBase.classList.remove("hidden");
}

function onMouseJoystickMove(e) {
  if (!joystick.active) return;
  let dx = e.clientX - joystick.baseX;
  let dy = e.clientY - joystick.baseY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = 40;
  if (dist > maxDist) {
    dx = dx / dist * maxDist;
    dy = dy / dist * maxDist;
  }
  joystick.dx = dx / maxDist;
  joystick.dy = dy / maxDist;
  joystick.magnitude = Math.min(dist / maxDist, 1);
  elJoystickThumb.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
}

function onMouseJoystickEnd() {
  joystick.active = false;
  joystick.dx = 0;
  joystick.dy = 0;
  joystick.magnitude = 0;
  elJoystickBase.classList.add("hidden");
  elJoystickThumb.style.transform = "translate(-50%, -50%)";
}

// Tap on canvas to interact with nearby NPC
function initTapInteraction() {
  canvas.addEventListener("click", onCanvasTap);
  canvas.addEventListener("touchend", function(e) {
    // Only handle taps, not joystick releases
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      // Ignore if in joystick zone
      const rect = elJoystickZone.getBoundingClientRect();
      if (touch.clientX < rect.right && touch.clientY > rect.top) return;
      onCanvasTapAt(touch.clientX, touch.clientY);
    }
  });
}

function onCanvasTap(e) {
  onCanvasTapAt(e.clientX, e.clientY);
}

function onCanvasTapAt(clientX, clientY) {
  if (state.dialogActive) return;
  const worldX = clientX + state.camera.x;
  const worldY = clientY + state.camera.y;

  // Check NPC taps
  for (const npc of npcs) {
    const dx = worldX - npc.x;
    const dy = worldY - npc.y;
    if (Math.sqrt(dx*dx + dy*dy) < 30) {
      // Check player is close enough
      const pdx = state.player.x - npc.x;
      const pdy = state.player.y - npc.y;
      if (Math.sqrt(pdx*pdx + pdy*pdy) < 80) {
        openDialog(npc);
        return;
      } else {
        showNotification("\uD83D\uDC63", "Approchez-vous de " + npc.name);
        return;
      }
    }
  }
}


// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function switchScreen(screenName) {
  state.screen = screenName;
  [elTitleScreen, elGameScreen, elRadarScreen, elMenuScreen, elEndingScreen].forEach(el => {
    el.classList.remove("active");
  });
  switch (screenName) {
    case "title": elTitleScreen.classList.add("active"); break;
    case "game": elGameScreen.classList.add("active"); resizeCanvas(); break;
    case "radar": elRadarScreen.classList.add("active"); updateRadarScreen(); break;
    case "menu": elMenuScreen.classList.add("active"); updateJournalDisplay(); break;
    case "ending": elEndingScreen.classList.add("active"); break;
  }
}

// ============================================================
// MAIN GAME LOOP
// ============================================================
let lastTime = 0;

let _frameCount = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 16.67, 3);
  lastTime = timestamp;
  _frameCount++;

  if (state.screen === "game") {
    update(dt);
    render();
  }

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  waterTime += 0.016 * dt;
  state.gameTime += dt;

  if (state.dialogActive) return;

  // Player movement from joystick
  let moveX = joystick.dx * joystick.magnitude;
  let moveY = joystick.dy * joystick.magnitude;

  // Keyboard movement
  if (keys["ArrowUp"] || keys["w"] || keys["z"]) moveY -= 1;
  if (keys["ArrowDown"] || keys["s"]) moveY += 1;
  if (keys["ArrowLeft"] || keys["a"] || keys["q"]) moveX -= 1;
  if (keys["ArrowRight"] || keys["d"]) moveX += 1;

  // Normalize keyboard
  const kMag = Math.sqrt(moveX * moveX + moveY * moveY);
  if (kMag > 1) { moveX /= kMag; moveY /= kMag; }

  const speed = PLAYER_SPEED * dt;
  const newX = state.player.x + moveX * speed;
  const newY = state.player.y + moveY * speed;

  // Try X, then Y separately for sliding along walls
  if (canMove(newX, state.player.y)) {
    state.player.x = newX;
  }
  if (canMove(state.player.x, newY)) {
    state.player.y = newY;
  }

  // Camera follows player
  state.camera.x = state.player.x - canvas.width / 2;
  state.camera.y = state.player.y - canvas.height / 2;

  // Clamp camera
  state.camera.x = Math.max(0, Math.min(WORLD_W - canvas.width, state.camera.x));
  state.camera.y = Math.max(0, Math.min(WORLD_H - canvas.height, state.camera.y));

  // Update HUD periodically
  if (Math.floor(state.gameTime) % 15 === 0) {
    updateHUD();
    updateActionBar();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();

  // Draw everything relative to camera
  drawGround();
  drawCanals();
  drawBridges();
  drawBuildings();
  drawLocations();
  drawNPCs();
  drawPlayer();

  // Fog/vignette around edges
  drawVignette();

  ctx.restore();
}

function drawVignette() {
  const w = canvas.width;
  const h = canvas.height;
  const gradient = ctx.createRadialGradient(w/2, h/2, Math.min(w, h) * 0.3, w/2, h/2, Math.max(w, h) * 0.7);
  gradient.addColorStop(0, "rgba(10, 10, 15, 0)");
  gradient.addColorStop(1, "rgba(10, 10, 15, 0.5)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}


// ============================================================
// INITIALIZATION
// ============================================================
function init() {
  resizeCanvas();
  // iOS needs a second resize after layout settles
  setTimeout(resizeCanvas, 100);
  setTimeout(resizeCanvas, 500);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", function() { setTimeout(resizeCanvas, 200); });

  generateMap();
  initJoystick();
  initTapInteraction();

  // Button handlers
  $("btn-start").addEventListener("click", startGame);
  $("btn-start").addEventListener("touchend", function(e) { e.preventDefault(); startGame(); });

  $("btn-menu").addEventListener("click", function() { switchScreen("menu"); });
  $("btn-menu").addEventListener("touchend", function(e) { e.preventDefault(); switchScreen("menu"); });

  $("btn-radar").addEventListener("click", function() { switchScreen("radar"); });
  $("btn-radar").addEventListener("touchend", function(e) { e.preventDefault(); switchScreen("radar"); });

  $("btn-radar-close").addEventListener("click", function() { switchScreen("game"); });
  $("btn-radar-close").addEventListener("touchend", function(e) { e.preventDefault(); switchScreen("game"); });

  $("btn-resume").addEventListener("click", function() { switchScreen("game"); });
  $("btn-resume").addEventListener("touchend", function(e) { e.preventDefault(); switchScreen("game"); });

  $("btn-replay").addEventListener("click", function() { resetGame(); });
  $("btn-replay").addEventListener("touchend", function(e) { e.preventDefault(); resetGame(); });

  // Prevent default touch behaviors
  document.addEventListener("touchmove", function(e) {
    if (e.target.closest("#dialog-choices") || e.target.closest("#journal-entries") || e.target.closest("#radar-details")) return;
    e.preventDefault();
  }, { passive: false });

  // Start loop
  switchScreen("title");
  requestAnimationFrame(gameLoop);
}

function startGame() {
  switchScreen("game");

  // Safety: ensure player is not stuck in water/building
  if (!canMove(state.player.x, state.player.y)) {
    // Try offsets to find a walkable spot nearby
    var offsets = [
      [80,0],[-80,0],[0,80],[0,-80],[80,80],[-80,-80],[120,0],[0,120],
      [-120,0],[0,-120],[160,0],[0,160],[-160,0],[0,-160]
    ];
    for (var i = 0; i < offsets.length; i++) {
      var tx = state.player.x + offsets[i][0];
      var ty = state.player.y + offsets[i][1];
      if (canMove(tx, ty)) {
        state.player.x = tx;
        state.player.y = ty;
        break;
      }
    }
  }

  addJournal("Arrive a Venise. La cite des masques cache bien des secrets. Le Doge Morosini gouverne d'une main de fer.");
  showNotification("\uD83C\uDFAD", "Bienvenue a Venise, 1486");

  // Initial HUD update
  setTimeout(() => {
    updateHUD();
    updateActionBar();
  }, 500);
}

function resetGame() {
  state.player.x = WORLD_W / 2 + 80;
  state.player.y = WORLD_H / 2 - 100;
  state.notoriety = 0;
  state.influence = 10;
  state.factions = { merchants: 0, church: 0, military: -20, people: 10, thieves: 0 };
  state.philosophy = { taoism: 0, stoicism: 0, confucianism: 0, existentialism: 0, zen: 0, jungian: 0 };
  state.paths = { assassination: 0, economic: 0, revolution: 0, wuwei: 0 };
  state.journal = [];
  state.visitedLocations = new Set();
  state.dialogActive = false;
  state.currentNPC = null;
  state.currentDialogNode = null;
  state.gameTime = 0;
  state.questStage = "explore";
  state.endingTriggered = false;

  // Re-position NPCs
  npcs.forEach(npc => {
    const loc = locations.find(l => l.id === npc.location);
    if (loc) {
      npc.x = loc.x + (Math.random() - 0.5) * 60;
      npc.y = loc.y + (Math.random() - 0.5) * 60;
    }
  });

  closeDialog();
  elActionBar.classList.add("hidden");
  startGame();
}

// ============================================================
// PWA INSTALL HINT
// ============================================================
if (typeof window.matchMedia === "function" && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone)) {
  const hint = $("install-hint");
  if (hint) hint.style.display = "none";
}

// ============================================================
// EXPORT FOR TESTING
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    state, locations, npcs, dialogs, buildings, canals, bridges,
    isWater, isBuilding, canMove, generateMap,
    getLeadingPath, getMissionText,
    handleChoice, addJournal, checkEnding,
    showNotification, updateHUD, updateMissionTracker,
    openDialog, closeDialog, showDialogNode,
    drawRadarChart, updateRadarScreen,
    resetGame, switchScreen,
    WORLD_W, WORLD_H, TILE, PLAYER_SPEED
  };
} else {
  // Browser: auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

})();
