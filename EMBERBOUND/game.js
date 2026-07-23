(() => {
  "use strict";

  const VERSION = 2;
  const AUTOSAVE_KEY = "emberbound_autosave_v1";
  const SLOT_PREFIX = "emberbound_slot_";
  const TILE_W = 64;
  const TILE_H = 60;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const chance = (p) => Math.random() < p;
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  const canvas = $("#gameCanvas");
  const ctx = canvas.getContext("2d");
  const loadImage = (src) => {
    const image = new Image();
    image.src = src;
    return image;
  };
  const titleImage = loadImage("assets/title-world.png");
  const battleImage = loadImage("assets/battle-observatory.png");
  const mapImages = {
    dawnrest: loadImage("assets/maps/dawnrest.png"),
    verdant: loadImage("assets/maps/verdant.png"),
    emberCave: loadImage("assets/maps/ember-cave.png"),
    skyreach: loadImage("assets/maps/skyreach.png"),
    observatory: battleImage
  };
  const spriteImages = {
    soren: loadImage("assets/sprites/soren-sheet.png"),
    nyra: loadImage("assets/sprites/nyra-sheet.png"),
    torren: loadImage("assets/sprites/torren-sheet.png"),
    kite: loadImage("assets/sprites/kite-sheet.png"),
    commonEnemies: loadImage("assets/sprites/common-enemies.png"),
    midEnemies: loadImage("assets/sprites/mid-enemies.png"),
    bosses: loadImage("assets/sprites/bosses.png")
  };

  const ui = {
    title: $("#titleScreen"),
    continueButton: $("#continueButton"),
    hud: $("#hud"),
    chapter: $("#chapterLabel"),
    location: $("#locationLabel"),
    objective: $("#objectiveLabel"),
    dialogue: $("#dialogue"),
    portrait: $("#portrait"),
    speaker: $("#speakerName"),
    dialogueText: $("#dialogueText"),
    dialogueChoices: $("#dialogueChoices"),
    dialogueNext: $("#dialogueNext"),
    battle: $("#battleUI"),
    battleTitle: $("#battleTitle"),
    round: $("#roundLabel"),
    enemies: $("#enemyList"),
    battleLog: $("#battleLog"),
    partyBattle: $("#partyBattle"),
    activeActor: $("#activeActor"),
    actionHint: $("#actionHint"),
    commands: $("#commandButtons"),
    battleBack: $("#battleBack"),
    gameMenu: $("#gameMenu"),
    menuContent: $("#menuContent"),
    modal: $("#modal"),
    modalContent: $("#modalContent"),
    toast: $("#toast"),
    touch: $("#touchControls")
  };

  const ITEMS = {
    emberTonic: {
      name: "Gluttonikum", description: "Stellt 60 LP wieder her.", price: 24, kind: "heal", power: 60
    },
    moonDew: {
      name: "Mondtau", description: "Stellt 30 SP wieder her.", price: 42, kind: "sp", power: 30
    },
    phoenixAsh: {
      name: "Phönixasche", description: "Belebt einen Gefährten mit 45 % LP.", price: 110, kind: "revive", power: .45
    },
    clearleaf: {
      name: "Klarblatt", description: "Entfernt Brand, Gift und Schwäche.", price: 18, kind: "cleanse", power: 0
    },
    starElixir: {
      name: "Sternelixier", description: "Stellt LP und SP vollständig wieder her.", price: 300, kind: "full", power: 0
    }
  };

  const GEAR = {
    ashBlade: { name: "Aschenklinge", slot: "weapon", atk: 3, mag: 0, def: 0, spd: 0, price: 0 },
    sunsteel: { name: "Sonnenstahl", slot: "weapon", atk: 11, mag: 1, def: 0, spd: 0, price: 190 },
    cometEdge: { name: "Kometenschneide", slot: "weapon", atk: 19, mag: 3, def: 0, spd: 2, price: 0 },
    willowStaff: { name: "Weidenstab", slot: "weapon", atk: 1, mag: 5, def: 0, spd: 0, price: 0 },
    prismRod: { name: "Prismenrute", slot: "weapon", atk: 2, mag: 14, def: 0, spd: 0, price: 210 },
    worldBranch: { name: "Weltenzweig", slot: "weapon", atk: 4, mag: 22, def: 2, spd: 0, price: 0 },
    forgeHammer: { name: "Schmiedehammer", slot: "weapon", atk: 7, mag: 0, def: 2, spd: -1, price: 0 },
    quakeMaul: { name: "Bebenhammer", slot: "weapon", atk: 17, mag: 0, def: 5, spd: -2, price: 230 },
    twinKnives: { name: "Zwillingsmesser", slot: "weapon", atk: 9, mag: 0, def: 0, spd: 5, price: 0 },
    galeFangs: { name: "Sturmfänge", slot: "weapon", atk: 16, mag: 2, def: 0, spd: 8, price: 260 },
    travelerCoat: { name: "Reisemantel", slot: "armor", atk: 0, mag: 0, def: 3, spd: 1, price: 0 },
    copperMail: { name: "Kupferpanzer", slot: "armor", atk: 0, mag: 0, def: 9, spd: -1, price: 150 },
    aetherWeave: { name: "Aethergewebe", slot: "armor", atk: 0, mag: 7, def: 12, spd: 2, price: 260 },
    duskPlate: { name: "Dämmerplatte", slot: "armor", atk: 2, mag: 0, def: 19, spd: -2, price: 0 },
    emberLocket: { name: "Glutmedaillon", slot: "charm", atk: 2, mag: 2, def: 1, spd: 1, price: 0 },
    riverCharm: { name: "Flusstalisman", slot: "charm", atk: 0, mag: 4, def: 2, spd: 2, price: 95 },
    skyCompass: { name: "Himmelskompass", slot: "charm", atk: 3, mag: 3, def: 3, spd: 5, price: 0 }
  };

  const CHARACTERS = {
    soren: {
      name: "Soren", role: "Aetherträger", color: "#e98255", accent: "#ffd291",
      bio: "Ein junger Kartograf, in dessen Brust eine uralte Glut erwacht.",
      base: { hp: 112, sp: 38, atk: 17, mag: 11, def: 12, spd: 13 },
      growth: { hp: 14, sp: 4, atk: 3.2, mag: 2, def: 2.4, spd: 2 },
      skills: ["emberArc", "rally", "sunburst"]
    },
    nyra: {
      name: "Nyra", role: "Resonanzkundige", color: "#5db7bf", accent: "#c6fff4",
      bio: "Eine Gelehrte, die Erinnerungen im Klang des Aethers lesen kann.",
      base: { hp: 88, sp: 58, atk: 10, mag: 19, def: 9, spd: 14 },
      growth: { hp: 10, sp: 7, atk: 1.7, mag: 3.7, def: 1.8, spd: 2.2 },
      skills: ["mend", "frostLance", "prismWard", "returnLight"]
    },
    torren: {
      name: "Torren", role: "Eidwächter", color: "#b27945", accent: "#ffdea1",
      bio: "Der letzte Wächter von Dämmerhain – langsam, standhaft und herzlich.",
      base: { hp: 146, sp: 28, atk: 20, mag: 7, def: 20, spd: 8 },
      growth: { hp: 18, sp: 3, atk: 3.5, mag: 1.2, def: 3.8, spd: 1.1 },
      skills: ["breaker", "taunt", "earthwake"]
    },
    kite: {
      name: "Kite", role: "Wolkenläuferin", color: "#7f75c9", accent: "#dfd9ff",
      bio: "Eine verwegene Luftseglerin, die Aurex eine Schuld zurückzahlen will.",
      base: { hp: 101, sp: 42, atk: 18, mag: 12, def: 10, spd: 22 },
      growth: { hp: 12, sp: 4, atk: 3, mag: 2.1, def: 1.9, spd: 3.3 },
      skills: ["twinEdge", "venomFeint", "tailwind"]
    }
  };

  const SKILLS = {
    emberArc: {
      name: "Glutbogen", cost: 5, level: 1, description: "Feuerangriff; kann Brand verursachen.", target: "enemy"
    },
    rally: {
      name: "Feuereid", cost: 8, level: 3, description: "Erhöht den Angriff der Gruppe für 3 Runden.", target: "party"
    },
    sunburst: {
      name: "Sonnensturz", cost: 14, level: 7, description: "Starker Feuerangriff auf alle Gegner.", target: "allEnemies"
    },
    mend: {
      name: "Resonanzheilung", cost: 6, level: 1, description: "Heilt den am stärksten verletzten Gefährten.", target: "ally"
    },
    frostLance: {
      name: "Frostlanze", cost: 7, level: 2, description: "Eisschaden; stark gegen Feuerwesen.", target: "enemy"
    },
    prismWard: {
      name: "Prismenwall", cost: 10, level: 4, description: "Erhöht die Verteidigung der Gruppe.", target: "party"
    },
    returnLight: {
      name: "Rückkehrlicht", cost: 16, level: 8, description: "Belebt einen gefallenen Gefährten.", target: "ally"
    },
    breaker: {
      name: "Schildbrecher", cost: 5, level: 1, description: "Wuchtiger Hieb; senkt die Verteidigung.", target: "enemy"
    },
    taunt: {
      name: "Eisenruf", cost: 4, level: 3, description: "Zieht Angriffe an und stärkt die Abwehr.", target: "self"
    },
    earthwake: {
      name: "Erdbeben", cost: 13, level: 6, description: "Erdschaden an allen Gegnern.", target: "allEnemies"
    },
    twinEdge: {
      name: "Doppelklinge", cost: 5, level: 1, description: "Zwei schnelle Angriffe.", target: "enemy"
    },
    venomFeint: {
      name: "Giftschatten", cost: 8, level: 3, description: "Verursacht Schaden und oft Gift.", target: "enemy"
    },
    tailwind: {
      name: "Rückenwind", cost: 9, level: 5, description: "Erhöht Tempo und kritische Chance.", target: "party"
    }
  };

  const ENEMIES = {
    mossling: {
      name: "Moosling", hp: 48, atk: 12, mag: 5, def: 7, spd: 8,
      xp: 18, gold: 9, color: "#72a968", weakness: "fire", type: "beast"
    },
    thornbeak: {
      name: "Dornenkrähe", hp: 56, atk: 15, mag: 8, def: 6, spd: 17,
      xp: 22, gold: 11, color: "#626b8b", weakness: "ice", type: "wing"
    },
    aetherWisp: {
      name: "Aetherirrlicht", hp: 45, atk: 7, mag: 18, def: 5, spd: 15,
      xp: 25, gold: 14, color: "#65d8d1", weakness: "earth", type: "wisp"
    },
    cinderMaw: {
      name: "Glutrachen", hp: 88, atk: 19, mag: 14, def: 12, spd: 10,
      xp: 36, gold: 19, color: "#c85e43", weakness: "ice", type: "beast"
    },
    basaltShell: {
      name: "Basaltpanzer", hp: 128, atk: 22, mag: 6, def: 20, spd: 5,
      xp: 44, gold: 24, color: "#706d69", weakness: "water", type: "shell"
    },
    skyRaider: {
      name: "Himmelsräuber", hp: 104, atk: 25, mag: 11, def: 12, spd: 21,
      xp: 52, gold: 31, color: "#9982c6", weakness: "earth", type: "human"
    },
    brassSentinel: {
      name: "Messingwächter", hp: 148, atk: 27, mag: 16, def: 22, spd: 9,
      xp: 63, gold: 38, color: "#b88943", weakness: "ice", type: "construct"
    },
    rootWarden: {
      name: "Wurzelwächter", hp: 360, atk: 23, mag: 16, def: 14, spd: 9,
      xp: 180, gold: 85, color: "#496e45", weakness: "fire", type: "boss", boss: true
    },
    cinderColossus: {
      name: "Schlackenkoloss", hp: 620, atk: 34, mag: 27, def: 23, spd: 8,
      xp: 360, gold: 180, color: "#a94a35", weakness: "ice", type: "boss", boss: true
    },
    aurex: {
      name: "Aurex, der Leere Fürst", hp: 1120, atk: 42, mag: 44, def: 28, spd: 20,
      xp: 900, gold: 500, color: "#4b3a7a", weakness: "aether", type: "boss", boss: true
    }
  };

  const MAPS = {
    dawnrest: {
      name: "Dämmerhain", chapter: "Kapitel I · Die schlafende Glut", theme: "town",
      description: "Ein Dorf zwischen uralten Bögen und kupfernen Dächern.",
      spawn: { x: 7, y: 9 }, safe: true,
      obstacles: [
        { x: 1, y: 1, w: 5, h: 3, kind: "house" },
        { x: 12, y: 1, w: 6, h: 3, kind: "hall" },
        { x: 2, y: 8, w: 4, h: 3, kind: "inn" },
        { x: 13, y: 8, w: 5, h: 3, kind: "forge" },
        { x: 0, y: 0, w: 20, h: 1, kind: "edge" },
        { x: 0, y: 11, w: 20, h: 1, kind: "edge" },
        { x: 0, y: 0, w: 1, h: 12, kind: "edge" }
      ],
      exits: [{ x: 19, y: 6, to: "verdant", tx: 1, ty: 6, label: "Zum Smaragdpfad" }],
      npcs: [
        { id: "iona", x: 9, y: 4, name: "Älteste Iona", color: "#8eb4a5", action: "iona" },
        { id: "merrit", x: 15, y: 7, name: "Schmied Merrit", color: "#b8784e", action: "shop" },
        { id: "sela", x: 5, y: 7, name: "Wirtin Sela", color: "#bd8b9e", action: "inn" },
        { id: "pip", x: 11, y: 7, name: "Pip", color: "#d6b459", action: "hint" }
      ],
      chests: []
    },
    verdant: {
      name: "Smaragdpfad", chapter: "Kapitel I · Die schlafende Glut", theme: "forest",
      description: "Der Wald flüstert mit Stimmen, die älter als das Dorf sind.",
      spawn: { x: 1, y: 6 }, danger: .105, pool: ["mossling", "thornbeak", "aetherWisp"],
      obstacles: [
        { x: 0, y: 0, w: 20, h: 2, kind: "trees" },
        { x: 0, y: 10, w: 20, h: 2, kind: "trees" },
        { x: 5, y: 2, w: 2, h: 3, kind: "trees" },
        { x: 5, y: 7, w: 3, h: 3, kind: "trees" },
        { x: 10, y: 2, w: 2, h: 3, kind: "ruin" },
        { x: 13, y: 7, w: 2, h: 3, kind: "trees" },
        { x: 17, y: 1, w: 3, h: 2, kind: "rocks" },
        { x: 17, y: 9, w: 3, h: 3, kind: "rocks" }
      ],
      exits: [
        { x: 0, y: 6, to: "dawnrest", tx: 18, ty: 6, label: "Nach Dämmerhain" },
        { x: 19, y: 4, to: "emberCave", tx: 1, ty: 6, label: "Zu den Glutgrotten", requires: "seedReturned" }
      ],
      npcs: [
        { id: "hermit", x: 9, y: 7, name: "Waldhüterin Edda", color: "#688c60", action: "hermit" }
      ],
      chests: [
        { id: "verdant-tonics", x: 4, y: 5, item: "emberTonic", amount: 3 },
        { id: "verdant-charm", x: 16, y: 6, gear: "riverCharm" }
      ],
      triggers: [
        { id: "root-boss", x: 15, y: 4, radius: 1, action: "rootBoss", requires: "questStarted", unless: "rootDefeated" }
      ]
    },
    emberCave: {
      name: "Glutgrotten", chapter: "Kapitel II · Herz aus Schlacke", theme: "cave",
      description: "Unter dem Berg pulsiert ein Herz aus Feuer und Erinnerung.",
      spawn: { x: 1, y: 6 }, danger: .12, pool: ["cinderMaw", "basaltShell", "aetherWisp"],
      obstacles: [
        { x: 0, y: 0, w: 20, h: 2, kind: "cavewall" },
        { x: 0, y: 10, w: 20, h: 2, kind: "cavewall" },
        { x: 4, y: 2, w: 3, h: 3, kind: "lava" },
        { x: 4, y: 8, w: 4, h: 2, kind: "lava" },
        { x: 10, y: 2, w: 2, h: 4, kind: "cavewall" },
        { x: 10, y: 8, w: 3, h: 2, kind: "cavewall" },
        { x: 15, y: 1, w: 5, h: 3, kind: "lava" },
        { x: 18, y: 8, w: 2, h: 4, kind: "lava" }
      ],
      exits: [
        { x: 0, y: 6, to: "verdant", tx: 18, ty: 4, label: "Zum Smaragdpfad" },
        { x: 19, y: 6, to: "skyreach", tx: 1, ty: 6, label: "Zum Wolkensteg", requires: "caveBossDefeated" }
      ],
      npcs: [],
      chests: [
        { id: "cave-ash", x: 8, y: 7, item: "phoenixAsh", amount: 2 },
        { id: "cave-mail", x: 15, y: 7, gear: "copperMail" }
      ],
      triggers: [
        { id: "cave-boss", x: 17, y: 6, radius: 1, action: "caveBoss", unless: "caveBossDefeated" }
      ]
    },
    skyreach: {
      name: "Wolkensteg", chapter: "Kapitel III · Jenseits des Himmels", theme: "sky",
      description: "Ein zerbrochener Weg über dem Meer aus Wolken.",
      spawn: { x: 1, y: 6 }, danger: .13, pool: ["skyRaider", "brassSentinel", "aetherWisp"],
      obstacles: [
        { x: 0, y: 0, w: 20, h: 2, kind: "cloudedge" },
        { x: 0, y: 10, w: 20, h: 2, kind: "cloudedge" },
        { x: 4, y: 2, w: 2, h: 3, kind: "void" },
        { x: 4, y: 8, w: 3, h: 2, kind: "void" },
        { x: 9, y: 2, w: 3, h: 2, kind: "ruin" },
        { x: 9, y: 7, w: 2, h: 3, kind: "void" },
        { x: 14, y: 2, w: 2, h: 4, kind: "ruin" },
        { x: 16, y: 8, w: 4, h: 2, kind: "cloudedge" }
      ],
      exits: [
        { x: 0, y: 6, to: "emberCave", tx: 18, ty: 6, label: "Zu den Glutgrotten" },
        { x: 19, y: 5, to: "observatory", tx: 1, ty: 6, label: "Zum Aether-Observatorium", requires: "kiteJoined" }
      ],
      npcs: [
        { id: "kite", x: 7, y: 5, name: "Kite", color: "#8277c2", action: "kite" }
      ],
      chests: [
        { id: "sky-elixir", x: 8, y: 8, item: "starElixir", amount: 1 },
        { id: "sky-compass", x: 17, y: 6, gear: "skyCompass" }
      ]
    },
    observatory: {
      name: "Aether-Observatorium", chapter: "Finale · Der Name des Feuers", theme: "observatory",
      description: "Hier wurde der Himmel vermessen – und beinahe gebrochen.",
      spawn: { x: 1, y: 6 }, danger: .08, pool: ["brassSentinel", "skyRaider"],
      obstacles: [
        { x: 0, y: 0, w: 20, h: 2, kind: "obsedge" },
        { x: 0, y: 10, w: 20, h: 2, kind: "obsedge" },
        { x: 5, y: 2, w: 2, h: 3, kind: "machine" },
        { x: 5, y: 8, w: 2, h: 2, kind: "machine" },
        { x: 10, y: 2, w: 2, h: 3, kind: "machine" },
        { x: 10, y: 8, w: 2, h: 2, kind: "machine" },
        { x: 17, y: 1, w: 3, h: 4, kind: "void" },
        { x: 17, y: 8, w: 3, h: 4, kind: "void" }
      ],
      exits: [
        { x: 0, y: 6, to: "skyreach", tx: 18, ty: 5, label: "Zum Wolkensteg" }
      ],
      npcs: [],
      chests: [
        { id: "obs-gear", x: 13, y: 8, gear: "aetherWeave" },
        { id: "obs-recovery", x: 14, y: 3, item: "starElixir", amount: 2 }
      ],
      triggers: [
        { id: "final-boss", x: 16, y: 6, radius: 1, action: "finalBoss", unless: "finalDefeated" }
      ]
    }
  };

  let state = null;
  let mode = "title";
  let activeTab = "party";
  let dialogueState = null;
  let battle = null;
  let lastFrame = performance.now();
  let lastMoveAt = 0;
  let toastTimer = null;
  let playStartedAt = 0;
  let audioContext = null;
  let soundEnabled = true;
  let framePulse = 0;
  let mapEnteredAt = performance.now();

  function freshCharacter(id, level = 1) {
    const stats = baseStats(id, level, null);
    return {
      id, level, xp: 0, hp: stats.hp, sp: stats.sp,
      equipment: {
        weapon: id === "soren" ? "ashBlade" : id === "nyra" ? "willowStaff" : id === "torren" ? "forgeHammer" : "twinKnives",
        armor: "travelerCoat",
        charm: id === "soren" ? "emberLocket" : null
      }
    };
  }

  function createNewState() {
    const soren = freshCharacter("soren");
    const nyra = freshCharacter("nyra");
    return {
      version: VERSION,
      createdAt: Date.now(),
      savedAt: Date.now(),
      playTime: 0,
      map: "dawnrest",
      player: { x: 7, y: 9, drawX: 7, drawY: 9, facing: "up", steps: 0 },
      party: { soren, nyra },
      activeParty: ["soren", "nyra"],
      inventory: { emberTonic: 5, moonDew: 2, phoenixAsh: 1, clearleaf: 2 },
      gearOwned: ["ashBlade", "willowStaff", "travelerCoat", "travelerCoat", "emberLocket"],
      gold: 90,
      aether: 0,
      aetherLevel: 1,
      flags: {
        introSeen: false, questStarted: false, rootDefeated: false, seedReturned: false,
        caveBossDefeated: false, aetherUnlocked: false, kiteJoined: false,
        finalDefeated: false, endingSeen: false
      },
      chests: {},
      quests: {
        emberSeed: { name: "Die schlafende Glut", status: "inactive", description: "Finde die Ursache für das Verstummen des Aetherbaums." },
        mountainHeart: { name: "Herz aus Schlacke", status: "locked", description: "Folge dem Ruf unter den Berg." },
        brokenSky: { name: "Jenseits des Himmels", status: "locked", description: "Erreiche Aurex' Observatorium." }
      },
      discovered: ["dawnrest"],
      battlesWon: 0,
      enemiesDefeated: 0
    };
  }

  function normalizeState(loaded) {
    const base = createNewState();
    const result = { ...base, ...loaded };
    result.flags = { ...base.flags, ...(loaded.flags || {}) };
    result.quests = { ...base.quests, ...(loaded.quests || {}) };
    result.inventory = { ...base.inventory, ...(loaded.inventory || {}) };
    result.player = { ...base.player, ...(loaded.player || {}) };
    result.player.drawX = result.player.x;
    result.player.drawY = result.player.y;
    result.party = loaded.party || base.party;
    result.activeParty = loaded.activeParty || Object.keys(result.party).slice(0, 3);
    result.chests = loaded.chests || {};
    result.discovered = loaded.discovered || [result.map];
    return result;
  }

  function baseStats(id, level, member) {
    const data = CHARACTERS[id];
    const stats = {};
    Object.keys(data.base).forEach((key) => {
      stats[key] = Math.floor(data.base[key] + data.growth[key] * (level - 1));
    });
    if (member) {
      Object.values(member.equipment || {}).filter(Boolean).forEach((gearId) => {
        const gear = GEAR[gearId];
        if (!gear) return;
        stats.atk += gear.atk || 0;
        stats.mag += gear.mag || 0;
        stats.def += gear.def || 0;
        stats.spd += gear.spd || 0;
      });
    }
    return stats;
  }

  function getStats(id) {
    const member = state.party[id];
    return baseStats(id, member.level, member);
  }

  function expForNext(level) {
    return Math.floor(55 + level * level * 18);
  }

  function availableSkills(id) {
    const member = state.party[id];
    return CHARACTERS[id].skills.filter((skillId) => SKILLS[skillId].level <= member.level);
  }

  function objectiveInfo() {
    const f = state.flags;
    if (!f.questStarted) return { chapter: MAPS.dawnrest.chapter, text: "Sprich mit Ältesten Iona im Dorfzentrum." };
    if (!f.rootDefeated) return { chapter: MAPS.verdant.chapter, text: "Finde den Wurzelwächter tief im Smaragdpfad." };
    if (!f.seedReturned) return { chapter: MAPS.verdant.chapter, text: "Bringe den Glutsamen zu Iona zurück." };
    if (!f.caveBossDefeated) return { chapter: MAPS.emberCave.chapter, text: "Erwecke das schlummernde Herz der Glutgrotten." };
    if (!f.kiteJoined) return { chapter: MAPS.skyreach.chapter, text: "Finde einen Weg über den Wolkensteg." };
    if (!f.finalDefeated) return { chapter: MAPS.observatory.chapter, text: "Stelle Aurex im Aether-Observatorium." };
    return { chapter: "Epilog · Ein neuer Morgen", text: "Kehre nach Dämmerhain zurück – oder reise weiter." };
  }

  function updateHud() {
    if (!state) return;
    const map = MAPS[state.map];
    const objective = objectiveInfo();
    ui.location.textContent = map.name;
    ui.chapter.textContent = objective.chapter;
    ui.objective.textContent = objective.text;
  }

  function showToast(message, duration = 2400) {
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.remove("hidden");
    toastTimer = setTimeout(() => ui.toast.classList.add("hidden"), duration);
  }

  function tone(frequency = 440, duration = .08, type = "sine", gain = .04) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      volume.gain.value = gain;
      volume.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(volume).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {
      soundEnabled = false;
    }
  }

  function addItem(id, amount = 1) {
    state.inventory[id] = (state.inventory[id] || 0) + amount;
    showToast(`${ITEMS[id].name} ×${amount} erhalten`);
  }

  function addGear(id) {
    state.gearOwned.push(id);
    showToast(`${GEAR[id].name} erhalten`);
  }

  function spendGold(amount) {
    if (state.gold < amount) return false;
    state.gold -= amount;
    return true;
  }

  function updatePlayTime() {
    if (playStartedAt && state) {
      state.playTime += Math.max(0, Date.now() - playStartedAt);
      playStartedAt = Date.now();
    }
  }

  function saveData(key, silent = false) {
    if (!state) return;
    updatePlayTime();
    state.savedAt = Date.now();
    try {
      localStorage.setItem(key, JSON.stringify(state));
      if (!silent) {
        showToast(key === AUTOSAVE_KEY ? "Automatisch gespeichert" : "Spielstand gespeichert");
        tone(660, .07, "sine", .03);
      }
    } catch (_) {
      showToast("Speichern nicht möglich – nutze im Systemmenü den Export.", 4000);
    }
  }

  function autosave(silent = true) {
    saveData(AUTOSAVE_KEY, silent);
  }

  function readSave(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? normalizeState(JSON.parse(raw)) : null;
    } catch (_) {
      return null;
    }
  }

  function newestSave() {
    const saves = [AUTOSAVE_KEY, `${SLOT_PREFIX}1`, `${SLOT_PREFIX}2`, `${SLOT_PREFIX}3`]
      .map(readSave).filter(Boolean).sort((a, b) => b.savedAt - a.savedAt);
    return saves[0] || null;
  }

  function formatPlayTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }

  function startNewGame() {
    state = createNewState();
    playStartedAt = Date.now();
    mode = "explore";
    battle = null;
    mapEnteredAt = performance.now();
    ui.title.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    ui.touch.classList.remove("hidden");
    closeModal();
    updateHud();
    autosave(true);
    showDialogue("Nyra", [
      "Soren? Wach auf. Der Aetherbaum ist verstummt – und dein Medaillon brennt.",
      "Iona wartet am alten Brunnen. Wenn die Legenden stimmen, beginnt heute etwas, das wir nicht wieder schlafen legen können."
    ], () => {
      state.flags.introSeen = true;
      autosave();
    }, ["#d7aa84", "#4d8d91"]);
  }

  function continueGame(loaded = newestSave()) {
    if (!loaded) {
      showToast("Noch kein Spielstand vorhanden.");
      return;
    }
    state = normalizeState(loaded);
    playStartedAt = Date.now();
    mode = "explore";
    battle = null;
    mapEnteredAt = performance.now();
    ui.title.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    ui.touch.classList.remove("hidden");
    ui.gameMenu.classList.add("hidden");
    closeModal();
    updateHud();
    showToast(`Willkommen zurück in ${MAPS[state.map].name}`);
  }

  function returnToTitle() {
    if (state) autosave(true);
    state = null;
    battle = null;
    mode = "title";
    ui.title.classList.remove("hidden");
    ui.hud.classList.add("hidden");
    ui.touch.classList.add("hidden");
    ui.battle.classList.add("hidden");
    ui.gameMenu.classList.add("hidden");
    ui.dialogue.classList.add("hidden");
    ui.continueButton.disabled = !newestSave();
  }

  function openModal(html) {
    ui.modalContent.innerHTML = html;
    ui.modal.classList.remove("hidden");
  }

  function closeModal() {
    ui.modal.classList.add("hidden");
    ui.modalContent.innerHTML = "";
  }

  function showControls() {
    openModal(`
      <h2>Steuerung</h2>
      <p>EMBERBOUND lässt sich mit Tastatur, Trackpad/Maus oder Touch spielen.</p>
      <div class="control-grid">
        <div><strong>Bewegen</strong><span>WASD oder Pfeiltasten</span></div>
        <div><strong>Interagieren</strong><span>Enter, Leertaste oder E</span></div>
        <div><strong>Menü</strong><span>M oder Escape</span></div>
        <div><strong>Kampf</strong><span>Aktionen anklicken; Gegner durch Anklicken wählen</span></div>
      </div>
      <p><small>Das Spiel speichert automatisch bei Gebietswechseln und nach Kämpfen. Zusätzlich gibt es drei manuelle Speicherplätze und einen Datei-Export.</small></p>
    `);
  }

  function showSaveSlots(fromTitle = false) {
    const rows = [1, 2, 3].map((slot) => {
      const save = readSave(`${SLOT_PREFIX}${slot}`);
      return `
        <div class="save-row">
          <div>
            <strong>Speicherplatz ${slot}</strong>
            <small>${save ? `${MAPS[save.map]?.name || "Unbekannt"} · Stufe ${save.party.soren?.level || 1} · ${formatPlayTime(save.playTime)}` : "Leer"}</small>
          </div>
          <div>
            ${!fromTitle ? `<button data-save-slot="${slot}">Speichern</button>` : ""}
            ${save ? `<button data-load-slot="${slot}">Laden</button>` : ""}
          </div>
        </div>
      `;
    }).join("");
    openModal(`
      <h2>Spielstände</h2>
      <p>${fromTitle ? "Wähle einen vorhandenen Spielstand." : "Speichere deinen Fortschritt oder lade einen früheren Stand."}</p>
      ${rows}
    `);
  }

  function exportSave() {
    updatePlayTime();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `EMBERBOUND-Spielstand-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    showToast("Spielstand als Datei exportiert");
  }

  function importSave() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (!parsed.party || !parsed.map) throw new Error("invalid");
        state = normalizeState(parsed);
        playStartedAt = Date.now();
        autosave(false);
        closeModal();
        mode = "explore";
        ui.title.classList.add("hidden");
        ui.hud.classList.remove("hidden");
        updateHud();
        showToast("Spielstand erfolgreich importiert");
      } catch (_) {
        showToast("Diese Datei ist kein gültiger EMBERBOUND-Spielstand.", 4000);
      }
    });
    input.click();
  }

  function isBlocked(map, x, y) {
    if (x < 0 || y < 0 || x >= 20 || y >= 12) return true;
    if (map.obstacles.some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h)) return true;
    if (map.npcs.some((npc) => npc.x === x && npc.y === y)) return true;
    return false;
  }

  function movePlayer(dx, dy) {
    if (mode !== "explore" || !state || Date.now() - lastMoveAt < 112) return;
    lastMoveAt = Date.now();
    const map = MAPS[state.map];
    const nx = state.player.x + dx;
    const ny = state.player.y + dy;
    state.player.facing = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
    if (isBlocked(map, nx, ny)) {
      tone(110, .04, "square", .012);
      return;
    }
    state.player.x = nx;
    state.player.y = ny;
    state.player.steps += 1;
    tone(90 + (state.player.steps % 2) * 15, .025, "triangle", .009);
    checkTile();
  }

  function checkTile() {
    const map = MAPS[state.map];
    const { x, y } = state.player;
    const exit = map.exits.find((item) => item.x === x && item.y === y);
    if (exit) {
      if (exit.requires && !state.flags[exit.requires]) {
        showToast("Der Weg ist noch versiegelt.");
        return;
      }
      changeMap(exit.to, exit.tx, exit.ty);
      return;
    }
    const trigger = (map.triggers || []).find((item) => {
      const near = Math.abs(item.x - x) + Math.abs(item.y - y) <= item.radius;
      return near && (!item.requires || state.flags[item.requires]) && (!item.unless || !state.flags[item.unless]);
    });
    if (trigger) {
      triggerAction(trigger.action);
      return;
    }
    if (map.danger && state.player.steps > 4 && chance(map.danger)) {
      state.player.steps = 0;
      const count = chance(.52) ? 2 : 1;
      const group = Array.from({ length: count }, () => map.pool[rand(0, map.pool.length - 1)]);
      startBattle(group, { title: `Begegnung · ${map.name}` });
    }
  }

  function changeMap(mapId, x, y) {
    state.map = mapId;
    state.player.x = x;
    state.player.y = y;
    state.player.drawX = x;
    state.player.drawY = y;
    state.player.steps = 0;
    mapEnteredAt = performance.now();
    if (!state.discovered.includes(mapId)) {
      state.discovered.push(mapId);
      showToast(`${MAPS[mapId].name} entdeckt`);
    } else {
      showToast(MAPS[mapId].name, 1300);
    }
    updateHud();
    autosave(true);
    tone(420, .16, "sine", .025);
  }

  function getFacingTile() {
    const offsets = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = offsets[state.player.facing] || [0, -1];
    return { x: state.player.x + dx, y: state.player.y + dy };
  }

  function interact() {
    if (mode === "dialogue") {
      nextDialogue();
      return;
    }
    if (mode !== "explore" || !state) return;
    const map = MAPS[state.map];
    const target = getFacingTile();
    const nearbyNpc = map.npcs.find((npc) => Math.abs(npc.x - state.player.x) + Math.abs(npc.y - state.player.y) <= 1);
    const nearbyChest = map.chests.find((chest) => Math.abs(chest.x - state.player.x) + Math.abs(chest.y - state.player.y) <= 1);
    const nearbyExit = map.exits.find((exit) => Math.abs(exit.x - state.player.x) + Math.abs(exit.y - state.player.y) <= 1);
    if (nearbyNpc && (nearbyNpc.x === target.x && nearbyNpc.y === target.y || !map.npcs.some((n) => n.x === target.x && n.y === target.y))) {
      npcAction(nearbyNpc.action);
      return;
    }
    if (nearbyChest) {
      openChest(nearbyChest);
      return;
    }
    if (nearbyExit) {
      showToast(nearbyExit.label);
      return;
    }
    showToast("Hier ist nichts Auffälliges.", 1000);
  }

  function openChest(chest) {
    if (state.chests[chest.id]) {
      showToast("Die Truhe ist leer.");
      return;
    }
    state.chests[chest.id] = true;
    if (chest.item) addItem(chest.item, chest.amount || 1);
    if (chest.gear) addGear(chest.gear);
    tone(780, .15, "triangle", .04);
    autosave(true);
  }

  function showDialogue(speaker, pages, onClose, colors = ["#d5a67b", "#436b67"]) {
    mode = "dialogue";
    dialogueState = { speaker, pages: Array.isArray(pages) ? pages : [pages], index: 0, onClose };
    ui.speaker.textContent = speaker;
    ui.portrait.style.setProperty("--portrait-skin", colors[0]);
    ui.portrait.style.setProperty("--portrait-cloth", colors[1]);
    const portraitId = Object.keys(CHARACTERS).find((id) => CHARACTERS[id].name === speaker);
    if (portraitId) {
      ui.portrait.style.backgroundImage = `linear-gradient(180deg, rgba(8,25,30,.08), rgba(4,13,17,.76)), url("assets/sprites/${portraitId}-sheet.png")`;
      ui.portrait.style.backgroundSize = "100% 100%, 600% auto";
      ui.portrait.style.backgroundPosition = "center, left 18%";
      ui.portrait.style.backgroundRepeat = "no-repeat";
    } else {
      ui.portrait.style.backgroundImage = "";
      ui.portrait.style.backgroundSize = "";
      ui.portrait.style.backgroundPosition = "";
      ui.portrait.style.backgroundRepeat = "";
    }
    ui.dialogue.classList.remove("hidden");
    renderDialoguePage();
    tone(330, .055, "sine", .018);
  }

  function renderDialoguePage() {
    const page = dialogueState.pages[dialogueState.index];
    ui.dialogueChoices.innerHTML = "";
    if (typeof page === "string") {
      ui.dialogueText.textContent = page;
      ui.dialogueNext.classList.remove("hidden");
    } else {
      ui.dialogueText.textContent = page.text;
      if (page.choices) {
        ui.dialogueNext.classList.add("hidden");
        page.choices.forEach((choice, index) => {
          const button = document.createElement("button");
          button.textContent = choice.label;
          button.dataset.choice = index;
          ui.dialogueChoices.appendChild(button);
        });
      } else {
        ui.dialogueNext.classList.remove("hidden");
      }
    }
  }

  function nextDialogue() {
    if (!dialogueState || ui.dialogueNext.classList.contains("hidden")) return;
    dialogueState.index += 1;
    if (dialogueState.index < dialogueState.pages.length) {
      renderDialoguePage();
      tone(360 + dialogueState.index * 25, .045, "sine", .012);
      return;
    }
    const callback = dialogueState.onClose;
    dialogueState = null;
    ui.dialogue.classList.add("hidden");
    mode = "explore";
    callback?.();
  }

  function npcAction(action) {
    const f = state.flags;
    if (action === "iona") {
      if (!f.questStarted) {
        showDialogue("Älteste Iona", [
          "Das Feuer unter Dämmerhain ist nicht erloschen, Soren. Es hält den Atem an.",
          "Im Smaragdpfad wacht ein Wesen über den letzten Glutsamen. Bringe ihn zu mir – aber höre zuerst, was der Wald dir sagen will.",
          "Nyra wird dich begleiten. Und nimm diese Vorräte. Eine Legende ist nur ein schlechter Trost auf leeren Magen."
        ], () => {
          f.questStarted = true;
          state.quests.emberSeed.status = "active";
          addItem("emberTonic", 2);
          updateHud();
          autosave();
        }, ["#b68d70", "#6e788b"]);
      } else if (f.rootDefeated && !f.seedReturned) {
        showDialogue("Älteste Iona", [
          "Der Samen schlägt im Takt deines Herzens. Also hat er dich erkannt.",
          "Unter den Glutgrotten liegt der erste Aetherkern. Aurex sucht ihn, um den Himmel von seinen Erinnerungen zu trennen.",
          "Torren! Dein Eid ist nicht an dieses Dorf gebunden. Geh mit ihnen."
        ], () => {
          f.seedReturned = true;
          state.quests.emberSeed.status = "complete";
          state.quests.mountainHeart.status = "active";
          const torren = freshCharacter("torren", Math.max(3, state.party.soren.level));
          state.party.torren = torren;
          state.activeParty = ["soren", "nyra", "torren"];
          state.gearOwned.push("forgeHammer", "travelerCoat");
          updateHud();
          showToast("Torren schließt sich der Gruppe an!", 3300);
          autosave();
        }, ["#b68d70", "#6e788b"]);
      } else if (f.finalDefeated) {
        showDialogue("Älteste Iona", [
          "Der Aetherbaum singt wieder. Nicht wie früher – besser. Er kennt nun auch eure Stimmen.",
          "Die Wege bleiben offen, Soren. Eine gerettete Welt ist kein Ende. Sie ist eine Einladung."
        ], null, ["#b68d70", "#6e788b"]);
      } else {
        showDialogue("Älteste Iona", objectiveInfo().text, null, ["#b68d70", "#6e788b"]);
      }
      return;
    }
    if (action === "shop") {
      openShop();
      return;
    }
    if (action === "inn") {
      showDialogue("Wirtin Sela", {
        text: "Ein warmes Bett, heißer Eintopf und kein einziges Monster unter der Decke. 20 Kronen?",
        choices: [
          { label: "Ausruhen · 20 Kronen", action: () => restAtInn() },
          { label: "Vielleicht später", action: () => closeDialogueChoice() }
        ]
      }, null, ["#d6aa8b", "#895c6e"]);
      return;
    }
    if (action === "hint") {
      showDialogue("Pip", state.flags.aetherUnlocked
        ? "Wenn du im Kampf violett leuchtest, drück auf Aether! Ich würde ja auch, aber bei mir passiert nur Niesen."
        : "Merrit sagt, gute Ausrüstung macht Helden. Iona sagt, gute Entscheidungen. Ich nehme beides!", null, ["#d6ad72", "#a27b3d"]);
      return;
    }
    if (action === "hermit") {
      showDialogue("Waldhüterin Edda", state.flags.rootDefeated
        ? "Der Wächter ist frei. Was du besiegt hast, war nicht sein Zorn – es war seine Angst."
        : "Feuer ist nicht der Feind des Waldes. Vergessen ist es. Nutze Sorens Glutbogen gegen Wurzeln und Moos.", null, ["#a88061", "#557350"]);
      return;
    }
    if (action === "kite") {
      if (!f.kiteJoined) {
        showDialogue("Kite", [
          "Ihr seid spät. Aurex' Wächter haben mein Segel zerlegt und meinen Stolz angekratzt.",
          "Das erste kann man reparieren. Für das zweite brauche ich einen Platz in eurer Gruppe.",
          "Ich kenne den Weg zum Observatorium. Ihr habt offenbar die angenehme Angewohnheit, unmögliche Dinge zu überleben."
        ], () => {
          f.kiteJoined = true;
          state.quests.mountainHeart.status = "complete";
          state.quests.brokenSky.status = "active";
          const kite = freshCharacter("kite", Math.max(6, state.party.soren.level));
          state.party.kite = kite;
          state.gearOwned.push("twinKnives", "travelerCoat");
          if (state.activeParty.length < 3) state.activeParty.push("kite");
          else state.activeParty[2] = "kite";
          showToast("Kite schließt sich der Gruppe an!", 3300);
          updateHud();
          autosave();
        }, ["#c39a77", "#5e5693"]);
      } else {
        showDialogue("Kite", "Im Observatorium zuerst die Messingwächter, dann Aurex. Und falls wir fallen: bitte in einer dramatischen Pose.", null, ["#c39a77", "#5e5693"]);
      }
    }
  }

  function closeDialogueChoice() {
    dialogueState = null;
    ui.dialogue.classList.add("hidden");
    mode = "explore";
  }

  function restAtInn() {
    if (!spendGold(20)) {
      showToast("Nicht genug Kronen.");
      return;
    }
    Object.keys(state.party).forEach((id) => {
      const stats = getStats(id);
      state.party[id].hp = stats.hp;
      state.party[id].sp = stats.sp;
    });
    state.aether = Math.max(state.aether, 25);
    closeDialogueChoice();
    tone(523, .25, "sine", .03);
    showToast("Die Gruppe ist vollständig erholt.");
    autosave();
  }

  function openShop() {
    mode = "menu";
    const stock = ["emberTonic", "moonDew", "phoenixAsh", "clearleaf"];
    const gear = ["sunsteel", "prismRod", "copperMail", "riverCharm"];
    openModal(`
      <h2>Merrits Schmiede</h2>
      <p>„Was ich nicht reparieren kann, war vermutlich nie richtig kaputt.“</p>
      <div class="panel-card"><strong>${state.gold} Kronen</strong></div>
      <h3>Vorräte</h3>
      ${stock.map((id) => `<div class="inventory-row"><div><strong>${ITEMS[id].name}</strong><small>${ITEMS[id].description}</small></div><button data-buy-item="${id}">${ITEMS[id].price} Kr</button></div>`).join("")}
      <h3>Ausrüstung</h3>
      ${gear.map((id) => `<div class="gear-row"><div><strong>${GEAR[id].name}</strong><small>${gearStatsText(GEAR[id])}</small></div><button data-buy-gear="${id}" ${state.gearOwned.includes(id) ? "disabled" : ""}>${state.gearOwned.includes(id) ? "Besitzt" : `${GEAR[id].price} Kr`}</button></div>`).join("")}
    `);
  }

  function gearStatsText(gear) {
    return [["ATK", gear.atk], ["MAG", gear.mag], ["ABW", gear.def], ["TEM", gear.spd]]
      .filter(([, value]) => value).map(([label, value]) => `${label} ${value > 0 ? "+" : ""}${value}`).join(" · ") || "Keine Werte";
  }

  function triggerAction(action) {
    if (action === "rootBoss") {
      showDialogue("Wurzelwächter", [
        "Eindringling ... in dir brennt derselbe Name, der uns einst vergaß.",
        "Beweise, dass dein Feuer wärmt – und nicht nur verschlingt."
      ], () => startBattle(["rootWarden"], { title: "Hüter des Glutsamens", boss: "rootWarden" }), ["#93805f", "#3c613f"]);
    }
    if (action === "caveBoss") {
      showDialogue("Stimme der Tiefe", [
        "Der erste Funke wurde in Ketten gelegt. Berühre ihn – und trage seine Erinnerung.",
        "Doch jede Glut wirft einen Schatten."
      ], () => startBattle(["cinderColossus"], { title: "Herz aus Schlacke", boss: "cinderColossus" }), ["#c77b54", "#5d3028"]);
    }
    if (action === "finalBoss") {
      showDialogue("Aurex", [
        "Erinnerungen sind Wunden, Soren. Ich schenke dieser Welt den Frieden des Vergessens.",
        "Du nennst deine Fesseln Geschichte. Ich nenne sie Ballast.",
        "Komm. Zeig mir, ob dein Feuer einen Namen verdient."
      ], () => startBattle(["aurex"], { title: "Die letzte Resonanz", boss: "aurex" }), ["#b9988d", "#40335f"]);
    }
  }

  function makeEnemy(id, index) {
    const data = ENEMIES[id];
    const progress = Math.max(0, Math.floor((state.party.soren.level - 1) * .12));
    return {
      ...data, id: `${id}-${Date.now()}-${index}`, baseId: id,
      maxHp: Math.floor(data.hp * (1 + progress)),
      currentHp: Math.floor(data.hp * (1 + progress)),
      defDown: 0, burn: 0, poison: 0, analyzed: false
    };
  }

  function startBattle(enemyIds, options = {}) {
    if (mode === "battle") return;
    mode = "battle";
    const enemies = enemyIds.map(makeEnemy);
    battle = {
      enemies,
      options,
      round: 1,
      actorCursor: 0,
      selectedEnemy: 0,
      commandMode: "root",
      busy: false,
      logs: [`${enemies.map((enemy) => enemy.name).join(" & ")} stellen sich euch entgegen.`],
      buffs: {},
      enemyTaunt: null,
      form: null,
      formTurns: 0,
      visual: {
        action: null,
        particles: [],
        numbers: [],
        shakeUntil: 0,
        shakeAmount: 0,
        flashUntil: 0,
        flashColor: "255,255,255"
      }
    };
    state.activeParty = state.activeParty.filter((id) => state.party[id]).slice(0, 3);
    if (!state.activeParty.length) state.activeParty = Object.keys(state.party).slice(0, 3);
    ui.hud.classList.add("hidden");
    ui.touch.classList.add("hidden");
    ui.dialogue.classList.add("hidden");
    ui.battle.classList.remove("hidden");
    ui.battleTitle.textContent = options.title || "Kampf";
    tone(130, .32, "sawtooth", .035);
    renderBattleUI();
    beginNextActor();
  }

  function livingEnemies() {
    return battle.enemies.filter((enemy) => enemy.currentHp > 0);
  }

  function livingParty() {
    return state.activeParty.filter((id) => state.party[id].hp > 0);
  }

  function currentActorId() {
    return state.activeParty[battle.actorCursor];
  }

  function addBattleLog(message) {
    battle.logs.unshift(message);
    battle.logs = battle.logs.slice(0, 3);
    ui.battleLog.innerHTML = battle.logs.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  }

  function renderBattleUI() {
    if (!battle) return;
    ui.round.textContent = battle.round;
    ui.enemies.innerHTML = battle.enemies.map((enemy, index) => {
      const hp = clamp(enemy.currentHp / enemy.maxHp * 100, 0, 100);
      return `
        <div class="enemy-card ${index === battle.selectedEnemy ? "selected" : ""} ${enemy.currentHp <= 0 ? "dead" : ""}" data-enemy-index="${index}">
          <strong>${escapeHtml(enemy.name)}${enemy.analyzed ? ` · ${enemy.weakness === "aether" ? "Aether" : enemy.weakness}` : ""}</strong>
          <div class="bar" style="--value:${hp}%"><i></i></div>
        </div>
      `;
    }).join("");
    ui.partyBattle.innerHTML = state.activeParty.map((id, index) => {
      const member = state.party[id];
      const stats = getStats(id);
      const hp = clamp(member.hp / stats.hp * 100, 0, 100);
      const sp = clamp(member.sp / stats.sp * 100, 0, 100);
      return `
        <div class="battle-member ${index === battle.actorCursor && !battle.busy ? "active" : ""} ${member.hp <= 0 ? "ko" : ""}">
          <header><strong>${CHARACTERS[id].name}</strong><small>St. ${member.level}</small></header>
          <div class="bar" style="--value:${hp}%"><i></i></div>
          <div class="bar sp" style="--value:${sp}%"><i></i></div>
          <div class="stats-line">LP ${Math.max(0, member.hp)}/${stats.hp} · SP ${member.sp}/${stats.sp}</div>
        </div>
      `;
    }).join("");
    ui.battleLog.innerHTML = battle.logs.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
    const actorId = currentActorId();
    ui.activeActor.textContent = actorId ? CHARACTERS[actorId].name : "Gegnerzug";
    ui.actionHint.textContent = battle.busy ? "Aktion läuft …" : "Wähle eine Aktion";
    renderCommands();
  }

  function renderCommands() {
    if (!battle || battle.busy) {
      ui.commands.innerHTML = "";
      return;
    }
    const actorId = currentActorId();
    if (!actorId) return;
    const member = state.party[actorId];
    const root = [
      ["attack", "Angriff", "Normaler Hieb"],
      ["skills", "Fähigkeiten", `${member.sp} SP`],
      ["guard", "Verteidigen", "Schaden halbieren"],
      ["items", "Gegenstand", "Vorräte nutzen"],
      ["analyze", "Analysieren", "Schwäche erkennen"]
    ];
    if (actorId === "soren" && state.flags.aetherUnlocked) {
      root.splice(4, 0, ["aether", battle.form ? "Aetherstoß" : "Aetherform", `${state.aether}/100`]);
    }
    if (battle.commandMode === "root") {
      ui.commands.innerHTML = root.map(([action, label, hint]) => `<button data-command="${action}">${label}<small>${hint}</small></button>`).join("");
      ui.battleBack.classList.add("hidden");
      return;
    }
    if (battle.commandMode === "skills") {
      ui.commands.innerHTML = availableSkills(actorId).map((id) => {
        const skill = SKILLS[id];
        return `<button data-skill="${id}" ${member.sp < skill.cost ? "disabled" : ""}>${skill.name}<small>${skill.cost} SP · ${skill.description}</small></button>`;
      }).join("");
    }
    if (battle.commandMode === "items") {
      ui.commands.innerHTML = Object.entries(state.inventory).filter(([, amount]) => amount > 0).map(([id, amount]) =>
        `<button data-battle-item="${id}">${ITEMS[id].name}<small>×${amount} · ${ITEMS[id].description}</small></button>`
      ).join("") || "<small>Keine Gegenstände verfügbar.</small>";
    }
    ui.battleBack.classList.remove("hidden");
  }

  function beginNextActor() {
    if (!battle) return;
    while (battle.actorCursor < state.activeParty.length && state.party[currentActorId()].hp <= 0) {
      battle.actorCursor += 1;
    }
    if (battle.actorCursor >= state.activeParty.length) {
      enemyPhase();
      return;
    }
    battle.commandMode = "root";
    battle.busy = false;
    renderBattleUI();
  }

  function selectedEnemy() {
    let enemy = battle.enemies[battle.selectedEnemy];
    if (!enemy || enemy.currentHp <= 0) {
      const next = battle.enemies.findIndex((item) => item.currentHp > 0);
      battle.selectedEnemy = Math.max(0, next);
      enemy = battle.enemies[battle.selectedEnemy];
    }
    return enemy;
  }

  const PARTY_BATTLE_POSITIONS = [[300, 315], [205, 435], [350, 525]];
  const ENEMY_SOLO_POSITION = [[930, 390]];
  const ENEMY_GROUP_POSITIONS = [[925, 285], [1030, 455], [835, 500]];

  function partyBattlePosition(id) {
    return PARTY_BATTLE_POSITIONS[Math.max(0, state.activeParty.indexOf(id))] || PARTY_BATTLE_POSITIONS[0];
  }

  function enemyBattlePosition(enemy) {
    const positions = battle.enemies.length === 1 ? ENEMY_SOLO_POSITION : ENEMY_GROUP_POSITIONS;
    return positions[Math.max(0, battle.enemies.indexOf(enemy))] || positions[0];
  }

  function beginVisualAction(side, id, kind, element = "physical", duration = 720, targetId = null) {
    if (!battle) return;
    battle.visual.action = {
      side, id, kind, element, targetId,
      start: performance.now(),
      duration
    };
  }

  function visualProgress(action, now = performance.now()) {
    if (!action) return 0;
    return clamp((now - action.start) / action.duration, 0, 1);
  }

  function effectColor(element) {
    return {
      fire: "#ff8b4d", ice: "#83e4ff", earth: "#d6ad68", aether: "#b989ff",
      wind: "#d9c4ff", heal: "#8fffd0", guard: "#8ad9e8", physical: "#ffe1a1",
      poison: "#9ce76f"
    }[element] || "#ffe1a1";
  }

  function addBattleBurst(x, y, element = "physical", count = 20, force = 1) {
    if (!battle) return;
    const color = effectColor(element);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (70 + Math.random() * 210) * force;
      battle.visual.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: 2 + Math.random() * 7,
        color,
        born: performance.now(),
        life: 420 + Math.random() * 460,
        streak: chance(.42)
      });
    }
  }

  function addDamageNumber(x, y, value, color = "#fff1c8", label = "") {
    if (!battle) return;
    battle.visual.numbers.push({
      x, y, value, label, color,
      born: performance.now(), life: 920
    });
  }

  function impactCamera(amount = 12, flashColor = "255,255,255") {
    if (!battle) return;
    battle.visual.shakeAmount = Math.max(battle.visual.shakeAmount, amount);
    battle.visual.shakeUntil = performance.now() + 230;
    battle.visual.flashUntil = performance.now() + 110;
    battle.visual.flashColor = flashColor;
  }

  function actorPower(id, type = "physical") {
    const stats = getStats(id);
    const buff = battle.buffs[id] || {};
    const base = type === "magic" ? stats.mag : stats.atk;
    const formBonus = id === "soren" && battle.form ? 1.42 : 1;
    return base * (buff.atk > 0 ? 1.3 : 1) * formBonus;
  }

  function enemyDefense(enemy) {
    return Math.max(1, enemy.def * (enemy.defDown > 0 ? .7 : 1));
  }

  function dealToEnemy(enemy, amount, element = "physical", criticalChance = .08) {
    const weak = enemy.weakness === element;
    const critical = chance(criticalChance + (battle.buffs[currentActorId()]?.speed > 0 ? .12 : 0));
    const variance = .9 + Math.random() * .2;
    const damage = Math.max(1, Math.floor(amount * variance * (weak ? 1.45 : 1) * (critical ? 1.6 : 1)));
    enemy.currentHp = Math.max(0, enemy.currentHp - damage);
    if (enemy.currentHp <= 0 && !enemy.defeatedAt) enemy.defeatedAt = performance.now();
    enemy.hitUntil = performance.now() + 260;
    const [x, y] = enemyBattlePosition(enemy);
    addBattleBurst(x, y - (enemy.boss ? 80 : 35), element, critical ? 34 : weak ? 28 : 19, critical ? 1.35 : 1);
    addDamageNumber(x, y - (enemy.boss ? 145 : 100), damage, weak ? "#8fffe0" : critical ? "#ffd46f" : "#fff1c8", weak ? "SCHWÄCHE" : critical ? "KRITISCH" : "");
    impactCamera(weak || critical ? 17 : 10, element === "fire" ? "255,135,76" : element === "ice" ? "125,222,255" : "255,255,255");
    addBattleLog(`${enemy.name} erleidet ${damage} Schaden${weak ? " – Schwäche!" : ""}${critical ? " – Kritisch!" : ""}`);
    tone(weak ? 520 : 180, .07, "square", .025);
    return damage;
  }

  function healMember(id, amount) {
    const member = state.party[id];
    const stats = getStats(id);
    const healed = Math.min(amount, stats.hp - member.hp);
    member.hp += healed;
    const [x, y] = partyBattlePosition(id);
    addBattleBurst(x, y - 45, "heal", 22, .7);
    addDamageNumber(x, y - 118, healed, "#8fffd0", "HEILUNG");
    addBattleLog(`${CHARACTERS[id].name} erhält ${healed} LP.`);
    tone(620, .12, "sine", .03);
  }

  async function useBasicAttack() {
    const actor = currentActorId();
    const enemy = selectedEnemy();
    if (!enemy) return;
    battle.busy = true;
    beginVisualAction("hero", actor, "attack", "physical", 660, enemy.id);
    renderBattleUI();
    await wait(285);
    const damageBase = actorPower(actor) * 1.3 - enemyDefense(enemy) * .45 + rand(2, 7);
    dealToEnemy(enemy, damageBase);
    state.aether = clamp(state.aether + 7, 0, 100);
    await wait(285);
    await finishAction(120);
  }

  async function useGuard() {
    const actor = currentActorId();
    battle.busy = true;
    beginVisualAction("hero", actor, "guard", "guard", 560);
    renderBattleUI();
    await wait(210);
    battle.buffs[actor] = { ...(battle.buffs[actor] || {}), guard: 1 };
    addBattleLog(`${CHARACTERS[actor].name} geht in Verteidigungsstellung.`);
    state.aether = clamp(state.aether + 4, 0, 100);
    tone(240, .1, "triangle", .025);
    const [x, y] = partyBattlePosition(actor);
    addBattleBurst(x, y - 35, "guard", 18, .55);
    await finishAction(300);
  }

  async function useAnalyze() {
    const enemy = selectedEnemy();
    if (!enemy) return;
    battle.busy = true;
    beginVisualAction("hero", currentActorId(), "cast", "aether", 620, enemy.id);
    renderBattleUI();
    await wait(260);
    enemy.analyzed = true;
    addBattleLog(`${enemy.name}: ${enemy.currentHp}/${enemy.maxHp} LP · Schwäche: ${enemy.weakness}.`);
    const [x, y] = enemyBattlePosition(enemy);
    addBattleBurst(x, y - 45, "aether", 14, .45);
    await finishAction(320);
  }

  async function useAether() {
    const actor = currentActorId();
    if (actor !== "soren") return;
    if (battle.form) {
      if (state.aether < 25) {
        showToast("Nicht genug Aether.");
        return;
      }
      battle.busy = true;
      state.aether -= 25;
      const enemy = selectedEnemy();
      beginVisualAction("hero", actor, "aether", "aether", 880, enemy.id);
      renderBattleUI();
      await wait(390);
      dealToEnemy(enemy, actorPower(actor, "magic") * 2.25 - enemyDefense(enemy) * .25, "aether", .18);
      addBattleLog("Cinderwyrms Resonanz zerreißt die Leere.");
      await wait(330);
      await finishAction(120);
      return;
    }
    if (state.aether < 50) {
      showToast("Für die Verwandlung werden 50 Aether benötigt.");
      return;
    }
    battle.busy = true;
    state.aether -= 50;
    beginVisualAction("hero", actor, "transform", "aether", 1100);
    battle.visual.flashUntil = performance.now() + 720;
    battle.visual.flashColor = "134,101,255";
    renderBattleUI();
    await wait(520);
    battle.form = "Cinderwyrm";
    battle.formTurns = 4 + state.aetherLevel;
    addBattleLog(`Soren verwandelt sich in ${battle.form}!`);
    tone(110, .5, "sawtooth", .045);
    const [x, y] = partyBattlePosition(actor);
    addBattleBurst(x, y - 65, "aether", 46, 1.35);
    impactCamera(15, "145,115,255");
    await finishAction(520);
  }

  async function useSkill(skillId) {
    const actor = currentActorId();
    const member = state.party[actor];
    const skill = SKILLS[skillId];
    if (!skill || member.sp < skill.cost) return;
    battle.busy = true;
    member.sp -= skill.cost;
    const enemy = selectedEnemy();
    const magic = actorPower(actor, "magic");
    const physical = actorPower(actor);
    const skillElements = {
      emberArc: "fire", rally: "fire", sunburst: "fire",
      mend: "heal", frostLance: "ice", prismWard: "guard", returnLight: "heal",
      breaker: "physical", taunt: "guard", earthwake: "earth",
      twinEdge: "physical", venomFeint: "poison", tailwind: "wind"
    };
    const element = skillElements[skillId] || "aether";
    const actionKind = ["emberArc", "breaker", "twinEdge", "venomFeint"].includes(skillId) ? "attack" : "cast";
    beginVisualAction("hero", actor, actionKind, element, skillId === "sunburst" || skillId === "earthwake" ? 980 : 780, enemy?.id);
    renderBattleUI();
    await wait(actionKind === "attack" ? 290 : 350);
    if (skillId === "emberArc") {
      dealToEnemy(enemy, physical * 1.55 + magic * .5 - enemyDefense(enemy) * .35, "fire");
      if (chance(.55)) {
        enemy.burn = 3;
        addBattleLog(`${enemy.name} brennt.`);
      }
    } else if (skillId === "rally") {
      livingParty().forEach((id) => battle.buffs[id] = { ...(battle.buffs[id] || {}), atk: 3 });
      addBattleLog("Der Feuereid stärkt die ganze Gruppe.");
      livingParty().forEach((id) => {
        const [x, y] = partyBattlePosition(id);
        addBattleBurst(x, y - 45, "fire", 15, .55);
      });
    } else if (skillId === "sunburst") {
      livingEnemies().forEach((target) => dealToEnemy(target, physical * .8 + magic * 1.55 - enemyDefense(target) * .2, "fire"));
    } else if (skillId === "mend") {
      const target = livingParty().sort((a, b) => state.party[a].hp / getStats(a).hp - state.party[b].hp / getStats(b).hp)[0];
      healMember(target, Math.floor(magic * 2.2 + 28));
    } else if (skillId === "frostLance") {
      dealToEnemy(enemy, magic * 1.9 - enemyDefense(enemy) * .2 + 9, "ice");
    } else if (skillId === "prismWard") {
      livingParty().forEach((id) => battle.buffs[id] = { ...(battle.buffs[id] || {}), def: 3 });
      addBattleLog("Ein Prismenwall umgibt die Gruppe.");
      livingParty().forEach((id) => {
        const [x, y] = partyBattlePosition(id);
        addBattleBurst(x, y - 45, "guard", 17, .55);
      });
    } else if (skillId === "returnLight") {
      const fallen = state.activeParty.find((id) => state.party[id].hp <= 0);
      if (fallen) {
        state.party[fallen].hp = Math.floor(getStats(fallen).hp * .42);
        addBattleLog(`${CHARACTERS[fallen].name} kehrt ins Licht zurück.`);
      } else {
        healMember(livingParty().sort((a, b) => state.party[a].hp - state.party[b].hp)[0], Math.floor(magic * 1.7));
      }
    } else if (skillId === "breaker") {
      dealToEnemy(enemy, physical * 1.65 - enemyDefense(enemy) * .35);
      enemy.defDown = 3;
      addBattleLog(`${enemy.name}s Verteidigung sinkt.`);
    } else if (skillId === "taunt") {
      battle.enemyTaunt = actor;
      battle.buffs[actor] = { ...(battle.buffs[actor] || {}), guard: 2, def: 2 };
      addBattleLog("Torren zieht den Zorn der Gegner auf sich.");
    } else if (skillId === "earthwake") {
      livingEnemies().forEach((target) => dealToEnemy(target, physical * 1.45 - enemyDefense(target) * .25, "earth"));
    } else if (skillId === "twinEdge") {
      dealToEnemy(enemy, physical * .95 - enemyDefense(enemy) * .25, "physical", .16);
      if (enemy.currentHp > 0) {
        await wait(115);
        dealToEnemy(enemy, physical * .95 - enemyDefense(enemy) * .25, "physical", .16);
      }
    } else if (skillId === "venomFeint") {
      dealToEnemy(enemy, physical * 1.2 - enemyDefense(enemy) * .3);
      enemy.poison = 4;
      addBattleLog(`${enemy.name} wurde vergiftet.`);
    } else if (skillId === "tailwind") {
      livingParty().forEach((id) => battle.buffs[id] = { ...(battle.buffs[id] || {}), speed: 3 });
      addBattleLog("Rückenwind beschleunigt die Gruppe.");
      livingParty().forEach((id) => {
        const [x, y] = partyBattlePosition(id);
        addBattleBurst(x, y - 40, "wind", 14, .65);
      });
    }
    state.aether = clamp(state.aether + 10, 0, 100);
    tone(skill.target === "party" || skill.target === "ally" ? 650 : 260, .14, "triangle", .035);
    await wait(260);
    await finishAction(140);
  }

  async function useBattleItem(itemId) {
    const item = ITEMS[itemId];
    if (!item || !state.inventory[itemId]) return;
    let target = null;
    if (item.kind === "revive") target = state.activeParty.find((id) => state.party[id].hp <= 0);
    else target = livingParty().sort((a, b) => state.party[a].hp / getStats(a).hp - state.party[b].hp / getStats(b).hp)[0];
    if (!target) {
      showToast("Dafür gibt es kein gültiges Ziel.");
      return;
    }
    battle.busy = true;
    beginVisualAction("hero", currentActorId(), "item", "heal", 620, target);
    renderBattleUI();
    await wait(250);
    state.inventory[itemId] -= 1;
    const member = state.party[target];
    const stats = getStats(target);
    if (item.kind === "heal") healMember(target, item.power);
    if (item.kind === "sp") {
      member.sp = Math.min(stats.sp, member.sp + item.power);
      addBattleLog(`${CHARACTERS[target].name} erhält ${item.power} SP.`);
    }
    if (item.kind === "revive") {
      member.hp = Math.floor(stats.hp * item.power);
      addBattleLog(`${CHARACTERS[target].name} wurde wiederbelebt.`);
    }
    if (item.kind === "cleanse") addBattleLog(`${CHARACTERS[target].name} ist von negativen Effekten befreit.`);
    if (item.kind === "full") {
      member.hp = stats.hp;
      member.sp = stats.sp;
      addBattleLog(`${CHARACTERS[target].name} ist vollständig erholt.`);
    }
    tone(720, .12, "sine", .035);
    const [x, y] = partyBattlePosition(target);
    addBattleBurst(x, y - 45, "heal", 20, .6);
    await finishAction(300);
  }

  async function finishAction(delay = 430) {
    renderBattleUI();
    await wait(delay);
    if (battle) battle.visual.action = null;
    if (livingEnemies().length === 0) {
      await victory();
      return;
    }
    battle.actorCursor += 1;
    beginNextActor();
  }

  async function enemyPhase() {
    battle.busy = true;
    renderBattleUI();
    addBattleLog("Die Gegner greifen an.");
    await wait(420);
    for (const enemy of livingEnemies()) {
      if (!battle || mode !== "battle") return;
      let targetId = battle.enemyTaunt && state.party[battle.enemyTaunt]?.hp > 0
        ? battle.enemyTaunt
        : livingParty()[rand(0, livingParty().length - 1)];
      if (!targetId) break;
      const target = state.party[targetId];
      const stats = getStats(targetId);
      const buff = battle.buffs[targetId] || {};
      const special = enemy.boss && chance(.32);
      beginVisualAction("enemy", enemy.id, special ? "special" : "attack", special ? (enemy.baseId === "aurex" ? "aether" : "fire") : "physical", special ? 900 : 680, targetId);
      renderBattleUI();
      await wait(special ? 390 : 280);
      let power = special ? Math.max(enemy.atk, enemy.mag) * 1.42 : enemy.atk;
      if (enemy.baseId === "aetherWisp" || enemy.baseId === "aurex") power = special ? enemy.mag * 1.55 : enemy.mag;
      let damage = Math.max(1, Math.floor(power - stats.def * (buff.def > 0 ? .72 : .48) + rand(1, 7)));
      if (buff.guard > 0) damage = Math.floor(damage * .48);
      target.hp = Math.max(0, target.hp - damage);
      target.hitUntil = performance.now() + 260;
      const [tx, ty] = partyBattlePosition(targetId);
      addBattleBurst(tx, ty - 55, special ? (enemy.baseId === "aurex" ? "aether" : "fire") : "physical", special ? 30 : 20, special ? 1.25 : .9);
      addDamageNumber(tx, ty - 126, damage, buff.guard > 0 ? "#8ad9e8" : "#ffb49f", buff.guard > 0 ? "GEBLOCKT" : "");
      impactCamera(special ? 18 : 11, special ? "161,111,255" : "255,160,128");
      addBattleLog(`${enemy.name}${special ? " entfesselt Resonanz" : " greift an"}: ${damage} Schaden an ${CHARACTERS[targetId].name}.`);
      tone(95, .08, "square", .03);
      renderBattleUI();
      await wait(special ? 520 : 380);
      if (battle) battle.visual.action = null;
      if (livingParty().length === 0) {
        defeat();
        return;
      }
    }
    endRound();
  }

  function tickCounters(object, keys) {
    keys.forEach((key) => {
      if (object[key] > 0) object[key] -= 1;
    });
  }

  function endRound() {
    livingEnemies().forEach((enemy) => {
      if (enemy.burn > 0) {
        const damage = Math.max(4, Math.floor(enemy.maxHp * .035));
        enemy.currentHp = Math.max(0, enemy.currentHp - damage);
        addBattleLog(`${enemy.name} erleidet ${damage} Brandschaden.`);
      }
      if (enemy.poison > 0) {
        const damage = Math.max(5, Math.floor(enemy.maxHp * .045));
        enemy.currentHp = Math.max(0, enemy.currentHp - damage);
        addBattleLog(`${enemy.name} erleidet ${damage} Giftschaden.`);
      }
      tickCounters(enemy, ["burn", "poison", "defDown"]);
    });
    Object.values(battle.buffs).forEach((buff) => tickCounters(buff, ["atk", "def", "guard", "speed"]));
    livingParty().forEach((id) => {
      const stats = getStats(id);
      state.party[id].sp = Math.min(stats.sp, state.party[id].sp + 2);
    });
    if (battle.form) {
      battle.formTurns -= 1;
      if (battle.formTurns <= 0) {
        addBattleLog("Sorens Aetherform löst sich.");
        battle.form = null;
      }
    }
    if (livingEnemies().length === 0) {
      victory();
      return;
    }
    battle.round += 1;
    battle.actorCursor = 0;
    battle.enemyTaunt = null;
    beginNextActor();
  }

  async function victory() {
    battle.busy = true;
    const rewards = battle.enemies.reduce((sum, enemy) => ({
      xp: sum.xp + enemy.xp, gold: sum.gold + enemy.gold
    }), { xp: 0, gold: 0 });
    state.gold += rewards.gold;
    state.battlesWon += 1;
    state.enemiesDefeated += battle.enemies.length;
    state.aether = clamp(state.aether + 16, 0, 100);
    addBattleLog(`Sieg! ${rewards.xp} EP und ${rewards.gold} Kronen.`);
    tone(523, .15, "sine", .04);
    await wait(220);
    tone(659, .2, "sine", .04);
    const levelMessages = [];
    Object.keys(state.party).forEach((id) => {
      const member = state.party[id];
      member.xp += rewards.xp;
      while (member.xp >= expForNext(member.level)) {
        member.xp -= expForNext(member.level);
        const oldStats = getStats(id);
        member.level += 1;
        const newStats = getStats(id);
        member.hp = Math.min(newStats.hp, member.hp + (newStats.hp - oldStats.hp) + 24);
        member.sp = Math.min(newStats.sp, member.sp + (newStats.sp - oldStats.sp) + 8);
        levelMessages.push(`${CHARACTERS[id].name} erreicht Stufe ${member.level}!`);
      }
    });
    await wait(600);
    const boss = battle.options.boss;
    battle = null;
    mode = "explore";
    ui.battle.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    ui.touch.classList.remove("hidden");
    levelMessages.forEach((message, index) => setTimeout(() => showToast(message, 2100), index * 2200));
    if (boss === "rootWarden") {
      state.flags.rootDefeated = true;
      state.quests.emberSeed.description = "Der Glutsamen wurde geborgen. Bringe ihn zu Iona.";
      setTimeout(() => showDialogue("Nyra", [
        "Der Wächter ist nicht tot. Sieh – die Wurzeln atmen wieder.",
        "Und der Samen ... Soren, er trägt deinen Namen im Aether. Wir müssen zu Iona."
      ], () => {
        updateHud();
        autosave();
      }, ["#d7aa84", "#4d8d91"]), 300);
    } else if (boss === "cinderColossus") {
      state.flags.caveBossDefeated = true;
      state.flags.aetherUnlocked = true;
      state.aether = 100;
      state.aetherLevel = 1;
      state.quests.mountainHeart.description = "Der Cinderwyrm-Aether ist erwacht. Erreiche den Wolkensteg.";
      addGear("cometEdge");
      setTimeout(() => showDialogue("Cinderwyrm", [
        "Ich bin kein Tier in deinem Blut. Ich bin die Erinnerung des ersten Feuers.",
        "Rufe mich, wenn der Aether in dir anschwillt. Gemeinsam tragen wir den Namen Cinderwyrm."
      ], () => {
        showToast("Aetherform „Cinderwyrm“ freigeschaltet!", 3600);
        updateHud();
        autosave();
      }, ["#efb078", "#7a3f31"]), 300);
    } else if (boss === "aurex") {
      state.flags.finalDefeated = true;
      state.flags.endingSeen = true;
      state.quests.brokenSky.status = "complete";
      state.quests.brokenSky.description = "Aurex wurde besiegt. Die Erinnerungen des Aethers sind frei.";
      state.aetherLevel = 2;
      updateHud();
      autosave(true);
      setTimeout(showEnding, 350);
    } else {
      if (chance(.3)) addItem(chance(.6) ? "emberTonic" : "moonDew", 1);
      autosave(true);
    }
  }

  function defeat() {
    tone(90, .8, "sine", .045);
    state.gold = Math.floor(state.gold * .9);
    state.map = "dawnrest";
    state.player = { ...state.player, x: 7, y: 9, drawX: 7, drawY: 9, steps: 0 };
    Object.keys(state.party).forEach((id) => {
      const stats = getStats(id);
      state.party[id].hp = Math.max(1, Math.floor(stats.hp * .65));
      state.party[id].sp = Math.floor(stats.sp * .5);
    });
    battle = null;
    mode = "explore";
    ui.battle.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    ui.touch.classList.remove("hidden");
    updateHud();
    autosave(true);
    showDialogue("Wirtin Sela", "Nyra hat euch vor der Tür gefunden. Zehn Prozent eurer Kronen fehlen – ich schiebe es auf die dramatische Rettung.", null, ["#d6aa8b", "#895c6e"]);
  }

  function showEnding() {
    mode = "menu";
    openModal(`
      <span class="eyebrow">Epilog</span>
      <h2>Der Name des Feuers</h2>
      <p>Als Aurex' Maschine verstummt, fallen keine Sterne vom Himmel. Stattdessen kehren Millionen kleiner Erinnerungen zurück: ein Kinderlied, der Geruch von Regen auf Kupfer, Namen, die niemand mehr aussprechen konnte.</p>
      <p>Soren öffnet die Hand. Der Cinderwyrm steigt als warmer Lichtfaden in den Morgen. Er ist nicht fort. Er ist überall, wo jemand beschließt, sich zu erinnern.</p>
      <div class="panel-card">
        <strong>EMBERBOUND abgeschlossen</strong>
        <p>${state.battlesWon} Kämpfe gewonnen · ${state.enemiesDefeated} Gegner besiegt · Spielzeit ${formatPlayTime(state.playTime)}</p>
      </div>
      <div class="title-actions">
        <button class="primary" data-ending="continue">Die Welt weiter erkunden</button>
        <button data-ending="title">Zum Titelbildschirm</button>
      </div>
    `);
  }

  function openGameMenu(tab = activeTab) {
    if (mode !== "explore") return;
    mode = "menu";
    activeTab = tab;
    ui.gameMenu.classList.remove("hidden");
    renderMenu();
  }

  function closeGameMenu() {
    if (mode !== "menu" || ui.gameMenu.classList.contains("hidden")) return;
    ui.gameMenu.classList.add("hidden");
    mode = "explore";
    autosave(true);
  }

  function renderMenu() {
    $$("#menuTabs button").forEach((button) => button.classList.toggle("active", button.dataset.tab === activeTab));
    if (activeTab === "party") renderPartyMenu();
    if (activeTab === "items") renderItemsMenu();
    if (activeTab === "gear") renderGearMenu();
    if (activeTab === "aether") renderAetherMenu();
    if (activeTab === "quests") renderQuestsMenu();
    if (activeTab === "system") renderSystemMenu();
  }

  function renderPartyMenu() {
    ui.menuContent.innerHTML = `
      <div class="panel-card" style="margin-bottom:13px"><strong>${state.gold} Kronen</strong> · <span>${formatPlayTime(state.playTime + (Date.now() - playStartedAt))} Spielzeit</span></div>
      <div class="cards">${Object.keys(state.party).map((id) => {
        const member = state.party[id];
        const data = CHARACTERS[id];
        const stats = getStats(id);
        const active = state.activeParty.includes(id);
        return `<article class="panel-card">
          <span class="eyebrow">${data.role} · ${active ? "Aktiv" : "Reserve"}</span>
          <h3>${data.name} · Stufe ${member.level}</h3>
          <p>${data.bio}</p>
          <div class="bar" style="--value:${member.hp / stats.hp * 100}%"><i></i></div>
          <div class="bar sp" style="--value:${member.sp / stats.sp * 100}%"><i></i></div>
          <div class="stat-grid">
            <span>LP <b>${member.hp}/${stats.hp}</b></span><span>SP <b>${member.sp}/${stats.sp}</b></span>
            <span>ATK <b>${stats.atk}</b></span><span>MAG <b>${stats.mag}</b></span>
            <span>ABW <b>${stats.def}</b></span><span>TEM <b>${stats.spd}</b></span>
          </div>
          <button data-toggle-party="${id}" ${state.activeParty.length <= 2 && active ? "disabled" : ""}>${active ? "In Reserve" : "In aktive Gruppe"}</button>
        </article>`;
      }).join("")}</div>
    `;
  }

  function renderItemsMenu() {
    ui.menuContent.innerHTML = `
      <div class="panel-card"><strong>${Object.values(state.inventory).reduce((a, b) => a + b, 0)} Gegenstände</strong><p>Außerhalb des Kampfes werden Heilmittel automatisch beim am stärksten verletzten Gruppenmitglied eingesetzt.</p></div>
      ${Object.entries(ITEMS).map(([id, item]) => `
        <div class="inventory-row">
          <div><strong>${item.name} ×${state.inventory[id] || 0}</strong><small>${item.description}</small></div>
          <button data-menu-item="${id}" ${(state.inventory[id] || 0) <= 0 ? "disabled" : ""}>Benutzen</button>
        </div>`).join("")}
    `;
  }

  function gearOptionsFor(id, slot) {
    const current = state.party[id].equipment[slot];
    const owned = [...new Set(state.gearOwned.filter((gearId) => GEAR[gearId]?.slot === slot))];
    return owned.map((gearId) => `<option value="${gearId}" ${gearId === current ? "selected" : ""}>${GEAR[gearId].name}</option>`).join("");
  }

  function renderGearMenu() {
    ui.menuContent.innerHTML = `<div class="cards">${Object.keys(state.party).map((id) => {
      const member = state.party[id];
      return `<article class="panel-card">
        <span class="eyebrow">${CHARACTERS[id].role}</span>
        <h3>${CHARACTERS[id].name}</h3>
        ${["weapon", "armor", "charm"].map((slot) => `
          <div class="gear-row">
            <div><strong>${slot === "weapon" ? "Waffe" : slot === "armor" ? "Rüstung" : "Talisman"}</strong><small>${member.equipment[slot] ? gearStatsText(GEAR[member.equipment[slot]]) : "Nicht ausgerüstet"}</small></div>
            <select data-equip-id="${id}" data-equip-slot="${slot}">
              ${slot === "charm" ? `<option value="">Keiner</option>` : ""}
              ${gearOptionsFor(id, slot)}
            </select>
          </div>`).join("")}
      </article>`;
    }).join("")}</div>`;
  }

  function renderAetherMenu() {
    ui.menuContent.innerHTML = `
      <div class="cards">
        <article class="panel-card">
          <span class="eyebrow">Resonanzkern</span>
          <h3>${state.flags.aetherUnlocked ? "Cinderwyrm" : "Noch versiegelt"}</h3>
          <div class="big-stat">${state.aether}/100</div>
          <div class="bar aether" style="--value:${state.aether}%"><i></i></div>
          <p>${state.flags.aetherUnlocked
            ? "Soren kann sich im Kampf für 50 Aether verwandeln. Die Form steigert Angriff und Magie; Aetherstoß ignoriert einen Teil der gegnerischen Abwehr."
            : "Der Aether in Sorens Medaillon reagiert auf einen Ruf tief unter den Glutgrotten."}</p>
        </article>
        <article class="panel-card">
          <span class="eyebrow">Aether-Rang</span>
          <h3>Resonanz ${state.aetherLevel}</h3>
          <p>${state.aetherLevel >= 2 ? "Die Form hält länger und der Cinderwyrm erkennt Sorens Namen vollständig." : "Besiege mächtige Hüter, um die Resonanz zu vertiefen."}</p>
        </article>
      </div>
    `;
  }

  function renderQuestsMenu() {
    const statusNames = { inactive: "Nicht begonnen", locked: "Verborgen", active: "Aktiv", complete: "Abgeschlossen" };
    ui.menuContent.innerHTML = `
      <div class="panel-card"><span class="eyebrow">Aktuelles Ziel</span><h3>${objectiveInfo().text}</h3></div>
      ${Object.values(state.quests).map((quest) => `
        <div class="quest-row">
          <div><strong>${quest.name}</strong><small>${quest.description}</small></div>
          <span class="quest-state">${statusNames[quest.status]}</span>
        </div>`).join("")}
      <h3>Entdeckte Orte</h3>
      <div class="cards">${state.discovered.map((id) => `<div class="panel-card"><strong>${MAPS[id].name}</strong><p>${MAPS[id].description}</p></div>`).join("")}</div>
    `;
  }

  function renderSystemMenu() {
    ui.menuContent.innerHTML = `
      <div class="cards">
        <div class="panel-card">
          <span class="eyebrow">Fortschritt</span>
          <h3>${MAPS[state.map].name}</h3>
          <p>Spielzeit ${formatPlayTime(state.playTime + (Date.now() - playStartedAt))} · ${state.battlesWon} Siege · ${state.enemiesDefeated} Gegner</p>
        </div>
        <div class="panel-card">
          <span class="eyebrow">Sicherheit</span>
          <h3>Autosave aktiv</h3>
          <p>Gebietswechsel, Storyfortschritt und gewonnene Kämpfe werden automatisch gesichert.</p>
        </div>
      </div>
      <div class="system-actions" style="margin-top:18px">
        <button class="primary" data-system="slots">Manuell speichern / laden</button>
        <button data-system="export">Spielstand als Datei exportieren</button>
        <button data-system="import">Spielstand aus Datei importieren</button>
        <button data-system="controls">Steuerung anzeigen</button>
        <button data-system="title">Speichern und zum Titel</button>
      </div>
    `;
  }

  function useMenuItem(id) {
    const item = ITEMS[id];
    if (!item || !state.inventory[id]) return;
    const ids = Object.keys(state.party);
    let target = item.kind === "revive"
      ? ids.find((memberId) => state.party[memberId].hp <= 0)
      : ids.sort((a, b) => state.party[a].hp / getStats(a).hp - state.party[b].hp / getStats(b).hp)[0];
    if (!target) {
      showToast("Kein gültiges Ziel.");
      return;
    }
    const member = state.party[target];
    const stats = getStats(target);
    if (item.kind === "heal" && member.hp >= stats.hp) {
      showToast("Die Gruppe hat bereits volle LP.");
      return;
    }
    if (item.kind === "sp" && member.sp >= stats.sp) {
      showToast("Die Gruppe hat bereits volle SP.");
      return;
    }
    state.inventory[id] -= 1;
    if (item.kind === "heal") member.hp = Math.min(stats.hp, member.hp + item.power);
    if (item.kind === "sp") member.sp = Math.min(stats.sp, member.sp + item.power);
    if (item.kind === "revive") member.hp = Math.floor(stats.hp * item.power);
    if (item.kind === "full") { member.hp = stats.hp; member.sp = stats.sp; }
    showToast(`${ITEMS[id].name} auf ${CHARACTERS[target].name} angewendet`);
    tone(620, .1, "sine", .03);
    renderItemsMenu();
  }

  function drawRoundedRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  }

  function tileNoise(x, y) {
    return ((x * 37 + y * 71 + x * y * 13) % 17) / 17;
  }

  function drawMap() {
    const map = MAPS[state.map];
    const background = mapImages[state.map];
    if (background?.complete && background.naturalWidth) {
      ctx.drawImage(background, 0, 0, 1280, 720);
    } else {
      const fallback = ctx.createLinearGradient(0, 0, 1280, 720);
      fallback.addColorStop(0, map.theme === "cave" ? "#241915" : "#163c35");
      fallback.addColorStop(1, map.theme === "sky" ? "#8bb6c2" : "#50715e");
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 0, 1280, 720);
    }

    const entry = clamp((performance.now() - mapEnteredAt) / 850, 0, 1);
    const vignette = ctx.createRadialGradient(640, 360, 180, 640, 360, 760);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,10,14,.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 24; i++) {
      const seed = i * 97.31;
      const x = (seed * 17 + framePulse * (8 + i % 5)) % 1320 - 20;
      const y = (seed * 29 + Math.sin(framePulse * .7 + i) * 34) % 680 + 20;
      const alpha = .08 + (i % 4) * .025;
      ctx.fillStyle = map.theme === "cave" ? `rgba(255,133,67,${alpha})` : `rgba(128,239,210,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    map.exits.forEach((exit) => drawExit(exit));
    map.chests.forEach((chest) => drawChest(chest));
    map.npcs.forEach((npc) => drawCharacter(npc.x, npc.y, npc.color, npc.name, false));
    drawPlayer();

    if (entry < 1) {
      ctx.fillStyle = `rgba(2,8,10,${1 - entry})`;
      ctx.fillRect(0, 0, 1280, 720);
    }

    const nearby = [...map.npcs, ...map.chests].find((object) => Math.abs(object.x - state.player.x) + Math.abs(object.y - state.player.y) <= 1);
    if (nearby) {
      const x = nearby.x * TILE_W + TILE_W / 2;
      const y = nearby.y * TILE_H - 5 + Math.sin(framePulse * 3) * 3;
      ctx.fillStyle = "#ffd490";
      ctx.font = "700 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("E", x, y);
    }
  }

  function drawObstacle(o, theme) {
    const x = o.x * TILE_W, y = o.y * TILE_H, w = o.w * TILE_W, h = o.h * TILE_H;
    if (["house", "hall", "inn", "forge"].includes(o.kind)) {
      ctx.fillStyle = o.kind === "forge" ? "#4e3730" : "#33534e";
      drawRoundedRect(x + 6, y + 8, w - 12, h - 10, 12);
      ctx.fill();
      ctx.fillStyle = o.kind === "forge" ? "#b26d48" : "#b07b50";
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 35);
      ctx.lineTo(x + w / 2, y - 12);
      ctx.lineTo(x + w + 4, y + 35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,211,135,.75)";
      ctx.fillRect(x + w / 2 - 17, y + h - 51, 34, 43);
      return;
    }
    if (["trees", "edge"].includes(o.kind)) {
      ctx.fillStyle = "#17372e";
      ctx.fillRect(x, y + 24, w, h - 24);
      for (let tx = x + 20; tx < x + w; tx += 42) {
        for (let ty = y + 12; ty < y + h; ty += 46) {
          ctx.fillStyle = `hsl(${130 + ((tx + ty) % 20)}, 35%, ${22 + ((tx * ty) % 9)}%)`;
          ctx.beginPath();
          ctx.arc(tx, ty, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(145,211,140,.15)";
          ctx.beginPath();
          ctx.arc(tx - 7, ty - 8, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }
    if (["lava"].includes(o.kind)) {
      const lava = ctx.createLinearGradient(x, y, x + w, y + h);
      lava.addColorStop(0, "#792f24");
      lava.addColorStop(.5, "#ef7544");
      lava.addColorStop(1, "#75291f");
      ctx.fillStyle = lava;
      drawRoundedRect(x + 4, y + 8, w - 8, h - 10, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,211,120,.58)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + h * .5);
      ctx.bezierCurveTo(x + w * .25, y + 12, x + w * .66, y + h - 10, x + w - 8, y + h * .45);
      ctx.stroke();
      return;
    }
    if (["cavewall", "rocks", "ruin", "machine"].includes(o.kind)) {
      ctx.fillStyle = o.kind === "machine" ? "#5a554b" : theme === "cave" ? "#241e21" : "#314943";
      drawRoundedRect(x + 3, y + 4, w - 6, h - 4, 10);
      ctx.fill();
      ctx.strokeStyle = o.kind === "machine" ? "#b78b53" : "rgba(159,195,171,.18)";
      ctx.lineWidth = 3;
      for (let i = 14; i < w; i += 32) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + 8);
        ctx.lineTo(x + i - 12, y + h - 6);
        ctx.stroke();
      }
      return;
    }
    if (["cloudedge", "void", "obsedge"].includes(o.kind)) {
      const voidGradient = ctx.createLinearGradient(x, y, x, y + h);
      voidGradient.addColorStop(0, o.kind === "obsedge" ? "#18242c" : "#9ac2ca");
      voidGradient.addColorStop(1, "#182e3b");
      ctx.fillStyle = voidGradient;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(226,246,243,.25)";
      for (let i = 0; i < w; i += 55) {
        ctx.beginPath();
        ctx.arc(x + i + 20, y + 20 + (i % 40), 28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawExit(exit) {
    const x = exit.x * TILE_W + TILE_W / 2;
    const y = exit.y * TILE_H + TILE_H / 2;
    const locked = exit.requires && !state.flags[exit.requires];
    ctx.strokeStyle = locked ? "rgba(160,170,168,.42)" : `rgba(112,232,202,${.52 + Math.sin(framePulse * 2) * .18})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 20 + Math.sin(framePulse * 3) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = locked ? "rgba(100,110,108,.18)" : "rgba(104,226,198,.11)";
    ctx.fill();
  }

  function drawChest(chest) {
    if (state.chests[chest.id]) return;
    const x = chest.x * TILE_W + 17;
    const y = chest.y * TILE_H + 21;
    ctx.fillStyle = "#5a3928";
    drawRoundedRect(x, y, 32, 25, 4);
    ctx.fill();
    ctx.fillStyle = "#d2a258";
    ctx.fillRect(x, y + 8, 32, 5);
    ctx.fillRect(x + 14, y + 5, 5, 13);
  }

  function drawSpriteCell(image, cell, x, baselineY, height, flip = false, alpha = 1, rotation = 0) {
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return false;
    const sourceWidth = image.naturalWidth / 6;
    const targetWidth = height * (sourceWidth / image.naturalHeight);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, baselineY);
    ctx.rotate(rotation);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.drawImage(
      image,
      sourceWidth * cell, 0, sourceWidth, image.naturalHeight,
      -targetWidth / 2, -height, targetWidth, height
    );
    ctx.restore();
    return true;
  }

  function drawPlayer() {
    state.player.drawX += (state.player.x - state.player.drawX) * .24;
    state.player.drawY += (state.player.y - state.player.drawY) * .24;
    drawCharacter(state.player.drawX, state.player.drawY, CHARACTERS.soren.color, "Soren", true);
    state.activeParty.slice(1).forEach((id, index) => {
      const lag = .55 + index * .45;
      const px = state.player.drawX - (state.player.facing === "right" ? lag : state.player.facing === "left" ? -lag : 0);
      const py = state.player.drawY - (state.player.facing === "down" ? lag : state.player.facing === "up" ? -lag : 0);
      drawCharacter(px, py, CHARACTERS[id].color, CHARACTERS[id].name, false, .78 - index * .06);
    });
  }

  function drawCharacter(gridX, gridY, color, name, player = false, scale = 1) {
    const x = gridX * TILE_W + TILE_W / 2;
    const y = gridY * TILE_H + TILE_H / 2 + 28 + Math.sin(framePulse * 4 + gridX) * 1.8;
    const heroId = Object.keys(CHARACTERS).find((id) => CHARACTERS[id].name === name);
    if (heroId) {
      const flip = state.player.facing === "left";
      const height = (player ? 114 : 104) * scale;
      const moving = player && (Math.abs(state.player.drawX - state.player.x) > .03 || Math.abs(state.player.drawY - state.player.y) > .03);
      const frame = moving ? (Math.floor(framePulse * 10) % 2 ? 1 : 2) : 0;
      ctx.save();
      ctx.globalAlpha = .42;
      ctx.fillStyle = "#02080a";
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 24 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (player && state.flags.aetherUnlocked) {
        ctx.strokeStyle = `rgba(165,130,255,${.35 + Math.sin(framePulse * 4) * .16})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y - 7, 30, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (drawSpriteCell(spriteImages[heroId], frame, x, y, height, flip)) return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(0,0,0,.38)";
    ctx.beginPath();
    ctx.ellipse(0, 5, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-17, 2);
    ctx.lineTo(-11, -42);
    ctx.quadraticCurveTo(0, -53, 11, -42);
    ctx.lineTo(18, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,222,163,.35)";
    ctx.fillRect(-4, -37, 8, 32);
    ctx.fillStyle = "#d6aa82";
    ctx.beginPath();
    ctx.arc(0, -55, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#342d31";
    ctx.beginPath();
    ctx.arc(-2, -60, 13, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBattle() {
    const now = performance.now();
    const shaking = battle.visual.shakeUntil > now;
    const shake = shaking ? battle.visual.shakeAmount * ((battle.visual.shakeUntil - now) / 230) : 0;
    const shakeX = shaking ? (Math.random() - .5) * shake : 0;
    const shakeY = shaking ? (Math.random() - .5) * shake * .55 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    if (battleImage.complete && battleImage.naturalWidth) ctx.drawImage(battleImage, -8, -5, 1296, 730);
    else {
      ctx.fillStyle = "#152b38";
      ctx.fillRect(0, 0, 1280, 720);
    }
    const tint = ctx.createLinearGradient(0, 0, 1280, 720);
    tint.addColorStop(0, "rgba(5,22,31,.22)");
    tint.addColorStop(1, "rgba(12,8,28,.28)");
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 1280, 720);

    state.activeParty.forEach((id, index) => {
      const member = state.party[id];
      const [x, y] = PARTY_BATTLE_POSITIONS[index];
      drawBattleHero(x, y, id, member.hp <= 0, index === battle.actorCursor && !battle.busy);
    });
    const enemyPositions = battle.enemies.length === 1 ? ENEMY_SOLO_POSITION : ENEMY_GROUP_POSITIONS;
    battle.enemies.forEach((enemy, index) => drawBattleEnemy(enemyPositions[index][0], enemyPositions[index][1], enemy));
    drawBattleEffects(now);
    ctx.restore();

    if (battle.visual.flashUntil > now) {
      const alpha = (battle.visual.flashUntil - now) / 720;
      ctx.fillStyle = `rgba(${battle.visual.flashColor},${clamp(alpha, 0, .34)})`;
      ctx.fillRect(0, 0, 1280, 720);
    }
  }

  function drawBattleHero(x, y, id, ko, active) {
    const now = performance.now();
    const action = battle.visual.action?.side === "hero" && battle.visual.action.id === id ? battle.visual.action : null;
    const progress = visualProgress(action, now);
    let frame = 0;
    let offsetX = 0;
    let offsetY = Math.sin(framePulse * 3 + x) * (ko ? 0 : 3);
    let scale = 1;
    if (action) {
      if (action.kind === "attack") {
        frame = progress < .16 ? 1 : progress < .34 ? 2 : progress < .67 ? 3 : progress < .88 ? 4 : 1;
        offsetX = Math.sin(Math.PI * progress) * 290;
        offsetY -= Math.sin(Math.PI * progress) * 24;
      } else if (action.kind === "cast") {
        frame = progress < .22 ? 1 : progress < .48 ? 2 : progress < .76 ? 3 : 5;
        scale = 1 + Math.sin(Math.PI * progress) * .045;
      } else if (action.kind === "transform") {
        frame = 5;
        scale = 1 + Math.sin(progress * Math.PI * 6) * .035 + Math.sin(Math.PI * progress) * .12;
        offsetY -= Math.sin(Math.PI * progress) * 18;
      } else if (action.kind === "aether") {
        frame = progress < .38 ? 5 : progress < .72 ? 3 : 4;
        offsetX = Math.sin(Math.PI * progress) * 250;
      } else if (action.kind === "guard" || action.kind === "item") {
        frame = action.kind === "guard" ? 1 : 5;
      }
    } else if (id === "soren" && battle.form) {
      frame = 5;
    }

    ctx.save();
    ctx.translate(x + offsetX, y + offsetY);
    ctx.scale(scale, scale);
    if (active) {
      ctx.fillStyle = "rgba(116,229,202,.16)";
      ctx.beginPath();
      ctx.ellipse(0, 16, 70, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(142,255,224,.48)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (id === "soren" && battle.form) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = `rgba(145,190,255,${.5 + Math.sin(framePulse * 5) * .22})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, -95, 82 + Math.sin(framePulse * 4) * 8, -.8, 4.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-35, -70);
      ctx.quadraticCurveTo(-118, -180, -135, -55);
      ctx.quadraticCurveTo(-76, -102, -24, -16);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.ellipse(0, 14, id === "torren" ? 52 : 40, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state.party[id].hitUntil > now) ctx.filter = "brightness(2.2) saturate(.3)";
    const rotation = ko ? Math.PI / 2 : 0;
    const alpha = ko ? .48 : 1;
    const rendered = drawSpriteCell(spriteImages[id], frame, 0, 20, id === "torren" ? 305 : 290, false, alpha, rotation);
    ctx.filter = "none";
    if (!rendered) drawFallbackHero(id, ko);
    ctx.restore();
  }

  function drawBattleEnemy(x, y, enemy) {
    const now = performance.now();
    const deathAge = enemy.defeatedAt ? now - enemy.defeatedAt : 0;
    if (enemy.currentHp <= 0 && deathAge > 560) return;
    const action = battle.visual.action?.side === "enemy" && battle.visual.action.id === enemy.id ? battle.visual.action : null;
    const progress = visualProgress(action, now);
    let offsetX = 0;
    let offsetY = Math.sin(framePulse * 2.5 + x) * 4;
    if (action) {
      offsetX = -Math.sin(Math.PI * progress) * (action.kind === "special" ? 125 : 85);
      offsetY -= Math.sin(Math.PI * progress) * 18;
    }
    if (enemy.defeatedAt) offsetY += deathAge * .08;
    const alpha = enemy.defeatedAt ? clamp(1 - deathAge / 560, 0, 1) : 1;
    const descriptor = enemySpriteDescriptor(enemy);
    ctx.save();
    ctx.translate(x + offsetX, y + offsetY);
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.beginPath();
    ctx.ellipse(0, 18, enemy.boss ? 88 : 58, enemy.boss ? 20 : 14, 0, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.hitUntil > now) ctx.filter = "brightness(2.5) saturate(.2)";
    if (descriptor) {
      const cell = action && progress > .18 && progress < .82 ? descriptor.attack : descriptor.idle;
      drawSpriteCell(descriptor.image, cell, 0, 23, descriptor.height, false, alpha, enemy.defeatedAt ? -.18 : 0);
    } else {
      ctx.globalAlpha = alpha;
      drawFallbackEnemy(enemy);
    }
    ctx.filter = "none";
    if (enemy.burn || enemy.poison) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = enemy.burn ? "rgba(255,129,70,.8)" : "rgba(126,224,106,.8)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, -65, enemy.boss ? 105 : 75, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function enemySpriteDescriptor(enemy) {
    const common = {
      mossling: [0, 1, 190],
      thornbeak: [2, 3, 205],
      aetherWisp: [4, 5, 190]
    };
    const bosses = {
      rootWarden: [0, 1, 370],
      cinderColossus: [2, 3, 370],
      aurex: [4, 5, 345]
    };
    if (common[enemy.baseId]) {
      const [idle, attack, height] = common[enemy.baseId];
      return { image: spriteImages.commonEnemies, idle, attack, height };
    }
    const mid = {
      cinderMaw: [0, 1, 215],
      basaltShell: [2, 3, 220],
      skyRaider: [4, 5, 235]
    };
    if (mid[enemy.baseId]) {
      const [idle, attack, height] = mid[enemy.baseId];
      return { image: spriteImages.midEnemies, idle, attack, height };
    }
    if (bosses[enemy.baseId]) {
      const [idle, attack, height] = bosses[enemy.baseId];
      return { image: spriteImages.bosses, idle, attack, height };
    }
    if (enemy.baseId === "brassSentinel") {
      return { image: spriteImages.bosses, idle: 2, attack: 3, height: 255 };
    }
    return null;
  }

  function drawFallbackHero(id, ko) {
    const data = CHARACTERS[id];
    ctx.fillStyle = data.color;
    ctx.beginPath();
    ctx.moveTo(-30, 12);
    ctx.lineTo(-22, -96);
    ctx.quadraticCurveTo(0, -126, 24, -94);
    ctx.lineTo(34, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ko ? "#886c59" : "#d8aa82";
    ctx.beginPath();
    ctx.arc(0, -128, 21, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFallbackEnemy(enemy) {
    ctx.fillStyle = enemy.color;
    if (enemy.type === "wisp") {
      ctx.beginPath();
      ctx.moveTo(0, -135);
      ctx.bezierCurveTo(72, -85, 38, -10, 0, 5);
      ctx.bezierCurveTo(-45, -20, -72, -84, 0, -135);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, -55, enemy.boss ? 92 : 64, enemy.boss ? 116 : 72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8d99f";
      ctx.beginPath();
      ctx.arc(-20, -75, 6, 0, Math.PI * 2);
      ctx.arc(20, -75, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBattleEffects(now) {
    const action = battle.visual.action;
    if (action) {
      const p = visualProgress(action, now);
      const color = effectColor(action.element);
      if (action.side === "hero") {
        const [hx, hy] = partyBattlePosition(action.id);
        const target = battle.enemies.find((enemy) => enemy.id === action.targetId) || selectedEnemy();
        const [tx, ty] = target ? enemyBattlePosition(target) : [880, 360];
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        if (action.kind === "attack" || action.kind === "aether") {
          if (p > .28 && p < .75) {
            ctx.strokeStyle = color;
            ctx.lineWidth = action.kind === "aether" ? 18 : 10;
            ctx.globalAlpha = Math.sin((p - .28) / .47 * Math.PI) * .8;
            ctx.beginPath();
            ctx.arc(tx - 12, ty - 62, action.kind === "aether" ? 105 : 82, -2.3, .65);
            ctx.stroke();
          }
        } else if (action.kind === "cast" || action.kind === "transform") {
          const radius = 34 + p * (action.kind === "transform" ? 150 : 85);
          ctx.strokeStyle = color;
          ctx.lineWidth = action.kind === "transform" ? 8 : 5;
          ctx.globalAlpha = (1 - p) * .75;
          ctx.beginPath();
          ctx.arc(hx, hy - 82, radius, framePulse, framePulse + Math.PI * 1.55);
          ctx.stroke();
          if (action.targetId && p > .35) {
            const travel = clamp((p - .35) / .4, 0, 1);
            const px = hx + (tx - hx) * travel;
            const py = hy - 85 + (ty - 50 - (hy - 85)) * travel - Math.sin(Math.PI * travel) * 90;
            const glow = ctx.createRadialGradient(px, py, 2, px, py, 28);
            glow.addColorStop(0, "#ffffff");
            glow.addColorStop(.25, color);
            glow.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(px, py, 30, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
      if (action.side === "enemy" && action.kind === "special") {
        const enemy = battle.enemies.find((item) => item.id === action.id);
        if (enemy) {
          const [x, y] = enemyBattlePosition(enemy);
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.strokeStyle = color;
          ctx.lineWidth = 9;
          ctx.globalAlpha = Math.sin(Math.PI * p) * .75;
          ctx.beginPath();
          ctx.arc(x, y - 80, 80 + p * 75, -1.2, 3.9);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    battle.visual.particles = battle.visual.particles.filter((particle) => {
      const age = now - particle.born;
      if (age >= particle.life) return false;
      const t = age / 1000;
      const alpha = 1 - age / particle.life;
      const x = particle.x + particle.vx * t;
      const y = particle.y + particle.vy * t + 160 * t * t;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = particle.color;
      ctx.fillStyle = particle.color;
      if (particle.streak) {
        ctx.lineWidth = Math.max(1, particle.size * .45);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - particle.vx * .035, y - particle.vy * .035);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    });

    battle.visual.numbers = battle.visual.numbers.filter((number) => {
      const age = now - number.born;
      if (age >= number.life) return false;
      const t = age / number.life;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,.9)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = number.color;
      ctx.font = `900 ${number.label ? 28 : 34}px "Avenir Next", system-ui`;
      ctx.fillText(String(number.value), number.x, number.y - t * 70);
      if (number.label) {
        ctx.font = '800 11px "Avenir Next", system-ui';
        ctx.fillText(number.label, number.x, number.y + 18 - t * 70);
      }
      ctx.restore();
      return true;
    });
  }

  function loop(now) {
    const dt = Math.min(.05, (now - lastFrame) / 1000);
    lastFrame = now;
    framePulse += dt;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode === "battle" && battle) drawBattle();
    else if (state && mode !== "title") drawMap();
    requestAnimationFrame(loop);
  }

  function handleKey(event) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(event.key)) event.preventDefault();
    if (ui.modal.classList.contains("hidden") === false) {
      if (event.key === "Escape") closeModal();
      return;
    }
    if (mode === "dialogue" && ["Enter", " ", "e", "E"].includes(event.key)) {
      nextDialogue();
      return;
    }
    if (mode === "menu") {
      if (event.key === "Escape" || event.key.toLowerCase() === "m") closeGameMenu();
      return;
    }
    if (mode === "explore") {
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") movePlayer(0, -1);
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") movePlayer(0, 1);
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") movePlayer(-1, 0);
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") movePlayer(1, 0);
      if (["Enter", " ", "e", "E"].includes(event.key)) interact();
      if (event.key === "Escape" || event.key.toLowerCase() === "m") openGameMenu();
    }
  }

  document.addEventListener("keydown", handleKey);
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, [data-enemy-index]");
    if (!target) return;
    tone(310, .035, "sine", .012);

    if (target.dataset.titleAction === "new") startNewGame();
    if (target.dataset.titleAction === "continue") continueGame();
    if (target.dataset.titleAction === "slots") showSaveSlots(true);
    if (target.dataset.titleAction === "controls") showControls();
    if (target.id === "closeModal") {
      closeModal();
      if (mode === "menu" && ui.gameMenu.classList.contains("hidden")) mode = state ? "explore" : "title";
    }
    if (target.id === "menuButton" || target.id === "touchMenu") openGameMenu();
    if (target.id === "closeMenu") closeGameMenu();
    if (target.id === "dialogueNext") nextDialogue();
    if (target.id === "touchInteract") interact();
    if (target.id === "soundButton") {
      soundEnabled = !soundEnabled;
      target.textContent = soundEnabled ? "♪" : "×";
      showToast(soundEnabled ? "Ton an" : "Ton aus", 900);
    }
    if (target.dataset.move) {
      const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      movePlayer(...dirs[target.dataset.move]);
    }
    if (target.dataset.choice !== undefined && dialogueState) {
      const page = dialogueState.pages[dialogueState.index];
      page.choices[Number(target.dataset.choice)]?.action();
    }
    if (target.dataset.tab) {
      activeTab = target.dataset.tab;
      renderMenu();
    }
    if (target.dataset.toggleParty) {
      const id = target.dataset.toggleParty;
      if (state.activeParty.includes(id)) {
        if (state.activeParty.length > 2) state.activeParty = state.activeParty.filter((memberId) => memberId !== id);
      } else if (state.activeParty.length < 3) state.activeParty.push(id);
      else state.activeParty[2] = id;
      renderPartyMenu();
    }
    if (target.dataset.menuItem) useMenuItem(target.dataset.menuItem);
    if (target.dataset.system === "slots") showSaveSlots(false);
    if (target.dataset.system === "export") exportSave();
    if (target.dataset.system === "import") importSave();
    if (target.dataset.system === "controls") showControls();
    if (target.dataset.system === "title") returnToTitle();
    if (target.dataset.saveSlot) {
      saveData(`${SLOT_PREFIX}${target.dataset.saveSlot}`, false);
      showSaveSlots(false);
    }
    if (target.dataset.loadSlot) {
      const loaded = readSave(`${SLOT_PREFIX}${target.dataset.loadSlot}`);
      if (loaded) continueGame(loaded);
    }
    if (target.dataset.buyItem) {
      const id = target.dataset.buyItem;
      if (spendGold(ITEMS[id].price)) {
        state.inventory[id] = (state.inventory[id] || 0) + 1;
        showToast(`${ITEMS[id].name} gekauft`);
        openShop();
      } else showToast("Nicht genug Kronen.");
    }
    if (target.dataset.buyGear) {
      const id = target.dataset.buyGear;
      if (spendGold(GEAR[id].price)) {
        state.gearOwned.push(id);
        showToast(`${GEAR[id].name} gekauft`);
        openShop();
      } else showToast("Nicht genug Kronen.");
    }
    if (target.dataset.enemyIndex !== undefined && battle) {
      const index = Number(target.dataset.enemyIndex);
      if (battle.enemies[index].currentHp > 0) {
        battle.selectedEnemy = index;
        renderBattleUI();
      }
    }
    if (target.dataset.command && battle && !battle.busy) {
      const command = target.dataset.command;
      if (command === "attack") useBasicAttack();
      if (command === "guard") useGuard();
      if (command === "analyze") useAnalyze();
      if (command === "aether") useAether();
      if (command === "skills" || command === "items") {
        battle.commandMode = command;
        renderCommands();
      }
    }
    if (target.dataset.skill) useSkill(target.dataset.skill);
    if (target.dataset.battleItem) useBattleItem(target.dataset.battleItem);
    if (target.id === "battleBack") {
      battle.commandMode = "root";
      renderCommands();
    }
    if (target.dataset.ending === "continue") {
      closeModal();
      mode = "explore";
      state.map = "dawnrest";
      state.player.x = 7;
      state.player.y = 9;
      state.player.drawX = 7;
      state.player.drawY = 9;
      ui.hud.classList.remove("hidden");
      updateHud();
    }
    if (target.dataset.ending === "title") returnToTitle();
  });

  document.addEventListener("change", (event) => {
    const select = event.target.closest("select[data-equip-id]");
    if (!select) return;
    state.party[select.dataset.equipId].equipment[select.dataset.equipSlot] = select.value || null;
    const stats = getStats(select.dataset.equipId);
    state.party[select.dataset.equipId].hp = Math.min(state.party[select.dataset.equipId].hp, stats.hp);
    state.party[select.dataset.equipId].sp = Math.min(state.party[select.dataset.equipId].sp, stats.sp);
    tone(440, .07, "triangle", .02);
    renderGearMenu();
  });

  window.addEventListener("beforeunload", () => {
    if (state) saveData(AUTOSAVE_KEY, true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state) saveData(AUTOSAVE_KEY, true);
  });

  if (window.__EMBERBOUND_TEST_MODE__) {
    window.__EMBERBOUND_TEST_API__ = {
      getState: () => state,
      getBattle: () => battle,
      startNewGame,
      startBattle,
      useBasicAttack,
      saveData,
      readSave,
      renderNow: () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (mode === "battle" && battle) drawBattle();
        else if (state && mode !== "title") drawMap();
      }
    };
  }

  ui.continueButton.disabled = !newestSave();
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  requestAnimationFrame(loop);
})();
