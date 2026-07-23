(function () {
  "use strict";

  const DATA = window.EMBERBOUND_DATA;
  const SAVE_KEY = "emberbound_reborn_save_v1";
  const WIDTH = 480;
  const HEIGHT = 270;
  const TILE = 16;
  const PLAYER_RADIUS = 4.5;
  const LOCAL_SPEED = 68;
  const WORLD_SPEED = 42;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const chance = (probability) => Math.random() < probability;
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  const canvas = $("#game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const ui = {
    title: $("#titleScreen"),
    continue: $("#continueButton"),
    hud: $("#hud"),
    chapter: $("#chapter"),
    location: $("#location"),
    objective: $("#objective"),
    worldGuide: $("#worldGuide"),
    dialogue: $("#dialogue"),
    dialoguePortrait: $("#dialoguePortrait"),
    speaker: $("#speaker"),
    dialogueText: $("#dialogueText"),
    dialogueNext: $("#dialogueNext"),
    battleHud: $("#battleHud"),
    enemyNames: $("#enemyNames"),
    battleMessage: $("#battleMessage"),
    partyStatus: $("#partyStatus"),
    commandPanel: $("#commandPanel"),
    menu: $("#menu"),
    menuBody: $("#menuBody"),
    modal: $("#modal"),
    modalBody: $("#modalBody"),
    toast: $("#toast"),
    touch: $("#touchControls")
  };

  function loadImage(path) {
    const image = new Image();
    image.src = path;
    return image;
  }

  const images = {
    world: loadImage("assets/backgrounds/ember-march.png"),
    forestBattle: loadImage("assets/backgrounds/whisperwood-battle.png"),
    caveBattle: loadImage("assets/backgrounds/reliquary-battle.png"),
    hollow: loadImage("assets/backgrounds/kohlgrund-v3.png"),
    whisperwood: loadImage("assets/backgrounds/whisperwood-v3.png"),
    reliquary: loadImage("assets/backgrounds/reliquary-v3.png"),
    heroes: loadImage("assets/sprites/heroes-v3.png"),
    portraits: loadImage("assets/sprites/portraits-v3.png"),
    enemies: loadImage("assets/sprites/enemies.png")
  };

  let state = null;
  let mode = "title";
  let dialogue = null;
  let battle = null;
  let lastFrame = performance.now();
  let elapsed = 0;
  let toastTimer = null;
  let audioContext = null;
  let menuReturnMode = "local";
  let menuTab = "party";
  let transitionFlash = 0;
  const held = new Set();
  const trail = [];

  function characterState(id) {
    const equipment = { ...DATA.characters[id].equipment };
    const initialStats = characterStats(id, { level: 1, equipment });
    return {
      id,
      level: 1,
      xp: 0,
      hp: initialStats.hp,
      sp: initialStats.sp,
      dp: initialStats.dp,
      guard: 0,
      equipment
    };
  }

  function xpThreshold(level) {
    return 20 * level * level + 20;
  }

  function characterStats(id, memberOverride = null) {
    const character = DATA.characters[id];
    const member = memberOverride || state?.party?.[id] || { level: 1, equipment: character.equipment };
    const levelOffset = Math.max(0, (member.level || 1) - 1);
    const stats = {};
    ["hp", "sp", "dp", "atk", "mag", "def", "spd"].forEach((key) => {
      stats[key] = character.base[key] + (character.growth?.[key] || 0) * levelOffset;
    });
    Object.values(member.equipment || {}).filter(Boolean).forEach((itemId) => {
      const bonuses = DATA.items[itemId]?.bonuses || {};
      Object.entries(bonuses).forEach(([key, value]) => {
        stats[key] = (stats[key] || 0) + value;
      });
    });
    return stats;
  }

  function createState() {
    return {
      version: DATA.version,
      createdAt: Date.now(),
      savedAt: Date.now(),
      playTime: 0,
      scene: "hollow",
      player: {
        x: DATA.maps.hollow.spawn.x,
        y: DATA.maps.hollow.spawn.y,
        facing: "up",
        moving: false,
        distance: 0
      },
      worldPos: { ...DATA.world.start },
      party: { ryn: characterState("ryn") },
      activeParty: ["ryn"],
      inventory: {
        consumables: { herb: 4, etherSeed: 1, emberTonic: 1 },
        equipment: { mossCharm: 1 }
      },
      gold: 28,
      flags: {
        introSeen: false,
        elderTruth: false,
        worldOpen: false,
        forestEcho: false,
        reliquaryOpen: false,
        dragonUnlocked: false,
        glassHoundDefeated: false,
        chapterOneComplete: false
      },
      defeatedTriggers: {},
      battlesWon: 0,
      steps: 0
    };
  }

  function normalizeState(saved) {
    const fresh = createState();
    const normalized = { ...fresh, ...(saved || {}) };
    normalized.player = { ...fresh.player, ...(saved?.player || {}) };
    normalized.worldPos = { ...fresh.worldPos, ...(saved?.worldPos || {}) };
    normalized.flags = { ...fresh.flags, ...(saved?.flags || {}) };
    const oldInventory = saved?.inventory || {};
    normalized.inventory = {
      consumables: {
        ...fresh.inventory.consumables,
        ...(oldInventory.consumables || {}),
        ...(Number.isFinite(oldInventory.herb) ? { herb: oldInventory.herb } : {}),
        ...(Number.isFinite(oldInventory.etherSeed) ? { etherSeed: oldInventory.etherSeed } : {})
      },
      equipment: { ...fresh.inventory.equipment, ...(oldInventory.equipment || {}) }
    };
    normalized.party = saved?.party || fresh.party;
    Object.keys(normalized.party).forEach((id) => {
      if (!DATA.characters[id]) return;
      normalized.party[id] = {
        ...characterState(id),
        ...normalized.party[id],
        equipment: {
          ...DATA.characters[id].equipment,
          ...(normalized.party[id].equipment || {})
        }
      };
      const stats = characterStats(id, normalized.party[id]);
      normalized.party[id].hp = clamp(normalized.party[id].hp, 0, stats.hp);
      normalized.party[id].sp = clamp(normalized.party[id].sp, 0, stats.sp);
      normalized.party[id].dp = clamp(normalized.party[id].dp, 0, stats.dp);
    });
    normalized.activeParty = (saved?.activeParty || Object.keys(normalized.party))
      .filter((id) => normalized.party[id] && DATA.characters[id])
      .slice(0, 3);
    normalized.defeatedTriggers = saved?.defeatedTriggers || {};
    normalized.version = DATA.version;
    if (normalized.scene === "world") {
      if (worldPositionBlocked(normalized.worldPos.x, normalized.worldPos.y)) {
        normalized.worldPos = { ...DATA.world.start };
        normalized.player.x = normalized.worldPos.x;
        normalized.player.y = normalized.worldPos.y;
      }
    } else {
      const map = DATA.maps[normalized.scene] || DATA.maps.hollow;
      if (!DATA.maps[normalized.scene]) normalized.scene = "hollow";
      if (localPositionBlocked(map, normalized.player.x, normalized.player.y)) {
        normalized.player.x = map.spawn.x;
        normalized.player.y = map.spawn.y;
      }
    }
    return normalized;
  }

  function save(silent = true) {
    if (!state) return;
    state.savedAt = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      if (!silent) showToast("Spiel gespeichert");
    } catch (_) {
      showToast("Speichern fehlgeschlagen");
    }
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : null;
    } catch (_) {
      return null;
    }
  }

  function tone(frequency = 220, duration = 0.05, type = "square", gain = 0.018) {
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      volume.gain.value = gain;
      volume.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(volume).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {
      // Audio is optional.
    }
  }

  function showToast(message, duration = 1800) {
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.remove("hidden");
    toastTimer = setTimeout(() => ui.toast.classList.add("hidden"), duration);
  }

  function objectiveText() {
    const flags = state.flags;
    if (!flags.elderTruth) return "Sprich mit Mara am Brunnen.";
    if (!flags.forestEcho) return "Suche die Erinnerungsscherbe im Flüsterforst.";
    if (!flags.glassHoundDefeated) return "Öffne das Gläserne Reliquiar im Osten.";
    return "Kapitel I beendet · Die Knochenhöhe wartet.";
  }

  function updateHud() {
    if (!state) return;
    const location = state.scene === "world" ? DATA.world.name : DATA.maps[state.scene].name;
    const chapter = state.scene === "world" ? "Weltkarte · Glutmark" : DATA.maps[state.scene].chapter;
    ui.location.textContent = location;
    ui.chapter.textContent = chapter;
    ui.objective.textContent = objectiveText();
    ui.worldGuide.classList.toggle("hidden", mode !== "world");
  }

  function resetTrail() {
    trail.length = 0;
    if (!state) return;
    for (let index = 0; index < 64; index += 1) {
      trail.push({
        x: state.player.x,
        y: state.player.y,
        facing: state.player.facing
      });
    }
  }

  function rememberTrail() {
    const previous = trail[0];
    if (previous && Math.hypot(previous.x - state.player.x, previous.y - state.player.y) < 3) return;
    trail.unshift({
      x: state.player.x,
      y: state.player.y,
      facing: state.player.facing
    });
    trail.length = Math.min(80, trail.length);
  }

  function startNewGame() {
    state = createState();
    mode = "local";
    ui.title.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    ui.touch.classList.remove("hidden");
    ui.battleHud.classList.add("hidden");
    transitionFlash = 1;
    resetTrail();
    updateHud();
    save(true);
    showDialogue(DATA.dialogue.intro, () => {
      state.flags.introSeen = true;
      save(true);
    });
  }

  function continueGame() {
    const loaded = loadSave();
    if (!loaded) {
      showToast("Noch kein Spielstand vorhanden");
      return;
    }
    state = loaded;
    mode = state.scene === "world" ? "world" : "local";
    ui.title.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    ui.touch.classList.remove("hidden");
    transitionFlash = 1;
    resetTrail();
    updateHud();
    showToast(`Weiter in ${state.scene === "world" ? DATA.world.name : DATA.maps[state.scene].name}`);
  }

  function returnToTitle() {
    save(true);
    held.clear();
    state = null;
    battle = null;
    dialogue = null;
    mode = "title";
    ui.title.classList.remove("hidden");
    ui.hud.classList.add("hidden");
    ui.worldGuide.classList.add("hidden");
    ui.touch.classList.add("hidden");
    ui.battleHud.classList.add("hidden");
    ui.menu.classList.add("hidden");
    ui.dialogue.classList.add("hidden");
    ui.continue.disabled = !loadSave();
  }

  function showDialogue(pages, onClose = null) {
    held.clear();
    const previousMode = mode;
    mode = "dialogue";
    dialogue = {
      pages: Array.isArray(pages) ? pages : [pages],
      index: 0,
      onClose,
      previousMode
    };
    ui.dialogue.classList.remove("hidden");
    renderDialogue();
  }

  function renderDialogue() {
    if (!dialogue) return;
    const page = dialogue.pages[dialogue.index];
    ui.speaker.textContent = page.speaker || "Erzähler";
    ui.dialogueText.textContent = page.text || "";
    const portraitBySpeaker = {
      Ryn: 0,
      Liora: 1,
      Bram: 2,
      Mara: 3,
      "Stimme der Brut": 4
    };
    const portrait = portraitBySpeaker[page.speaker];
    ui.dialoguePortrait.classList.toggle("hidden", portrait === undefined);
    if (portrait !== undefined) {
      ui.dialoguePortrait.style.backgroundPosition = `${portrait * 25}% 0`;
    }
  }

  function nextDialogue() {
    if (!dialogue) return;
    dialogue.index += 1;
    if (dialogue.index < dialogue.pages.length) {
      renderDialogue();
      tone(360 + dialogue.index * 24, 0.035, "square", 0.009);
      return;
    }
    const callback = dialogue.onClose;
    const previousMode = dialogue.previousMode;
    dialogue = null;
    ui.dialogue.classList.add("hidden");
    mode = previousMode;
    callback?.();
  }

  function enterScene(sceneId, spawn = null) {
    held.clear();
    transitionFlash = 1;
    if (sceneId === "world") {
      state.scene = "world";
      mode = "world";
      state.player.x = state.worldPos.x;
      state.player.y = state.worldPos.y;
    } else {
      const map = DATA.maps[sceneId];
      state.scene = sceneId;
      mode = "local";
      const target = spawn || map.spawn;
      state.player.x = target.x;
      state.player.y = target.y;
    }
    state.player.distance = 0;
    state.player.moving = false;
    resetTrail();
    updateHud();
    save(true);
  }

  function tileAt(map, x, y) {
    const tileX = Math.floor(x / TILE);
    const tileY = Math.floor(y / TILE);
    return map.tiles[tileY]?.[tileX] || "#";
  }

  function blockedTile(character) {
    return "#B~^CX".includes(character);
  }

  function pointInShape(shape, x, y) {
    if (shape.kind === "rect") {
      return x >= shape.x && x <= shape.x + shape.w && y >= shape.y && y <= shape.y + shape.h;
    }
    if (shape.kind === "ellipse") {
      const dx = (x - shape.x) / shape.rx;
      const dy = (y - shape.y) / shape.ry;
      return dx * dx + dy * dy <= 1;
    }
    if (shape.kind === "capsule") {
      const dx = shape.bx - shape.ax;
      const dy = shape.by - shape.ay;
      const lengthSquared = dx * dx + dy * dy;
      const t = clamp(((x - shape.ax) * dx + (y - shape.ay) * dy) / lengthSquared, 0, 1);
      const nearestX = shape.ax + t * dx;
      const nearestY = shape.ay + t * dy;
      return Math.hypot(x - nearestX, y - nearestY) <= shape.r;
    }
    return false;
  }

  function localPositionBlocked(map, x, y) {
    const radius = PLAYER_RADIUS;
    const samples = [
      [x - radius, y], [x + radius, y],
      [x, y - radius], [x, y + radius],
      [x - radius * 0.7, y - radius * 0.7],
      [x + radius * 0.7, y - radius * 0.7],
      [x - radius * 0.7, y + radius * 0.7],
      [x + radius * 0.7, y + radius * 0.7]
    ];
    if (map.walkZones) {
      const outsideWalkableArea = samples.some(([sx, sy]) =>
        !map.walkZones.some((shape) => pointInShape(shape, sx, sy))
      );
      if (outsideWalkableArea) return true;
      const hitsObstacle = samples.some(([sx, sy]) =>
        (map.obstacles || []).some((shape) => pointInShape(shape, sx, sy))
      );
      if (hitsObstacle) return true;
    } else if (samples.some(([sx, sy]) => blockedTile(tileAt(map, sx, sy)))) {
      return true;
    }
    return map.npcs.some((npc) => Math.hypot(npc.x - x, npc.y - y) < 11);
  }

  function worldPositionBlocked(x, y) {
    const bounds = DATA.world.bounds;
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return true;
    if (DATA.world.nodes.some((node) => Math.hypot(node.x - x, node.y - y) < 20)) return false;
    const onRoad = DATA.world.paths.some((path) => path.some((point, index) => {
      if (index === path.length - 1) return false;
      const next = path[index + 1];
      const dx = next[0] - point[0];
      const dy = next[1] - point[1];
      const lengthSquared = dx * dx + dy * dy;
      const t = clamp(((x - point[0]) * dx + (y - point[1]) * dy) / lengthSquared, 0, 1);
      const nearestX = point[0] + t * dx;
      const nearestY = point[1] + t * dy;
      return Math.hypot(x - nearestX, y - nearestY) < 12;
    }));
    if (onRoad) return false;
    return DATA.world.blocked.some((shape) => {
      if (shape.kind === "rect") {
        return x > shape.x && x < shape.x + shape.w && y > shape.y && y < shape.y + shape.h;
      }
      const dx = (x - shape.x) / shape.rx;
      const dy = (y - shape.y) / shape.ry;
      return dx * dx + dy * dy < 1;
    });
  }

  function attemptMove(dx, dy) {
    if (!state || (mode !== "local" && mode !== "world")) return 0;
    const beforeX = state.player.x;
    const beforeY = state.player.y;
    const isBlocked = mode === "world"
      ? worldPositionBlocked
      : (x, y) => localPositionBlocked(DATA.maps[state.scene], x, y);

    if (!isBlocked(beforeX + dx, beforeY)) state.player.x += dx;
    if (!isBlocked(state.player.x, beforeY + dy)) state.player.y += dy;

    const distance = Math.hypot(state.player.x - beforeX, state.player.y - beforeY);
    if (distance <= 0.001) return 0;
    if (Math.abs(dx) > Math.abs(dy)) state.player.facing = dx > 0 ? "right" : "left";
    else state.player.facing = dy > 0 ? "down" : "up";
    state.player.distance += distance;
    state.steps += distance / TILE;
    if (mode === "local") rememberTrail();
    checkLocalTriggers(distance);
    return distance;
  }

  function updateMovement(dt) {
    if (!state || (mode !== "local" && mode !== "world")) return;
    const horizontal = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0);
    const vertical = (held.has("down") ? 1 : 0) - (held.has("up") ? 1 : 0);
    if (!horizontal && !vertical) {
      state.player.moving = false;
      return;
    }
    const length = Math.hypot(horizontal, vertical);
    const speed = mode === "world" ? WORLD_SPEED : LOCAL_SPEED;
    state.player.moving = attemptMove(
      horizontal / length * speed * dt,
      vertical / length * speed * dt
    ) > 0;
  }

  function checkLocalTriggers(distanceMoved) {
    if (mode !== "local") return;
    const map = DATA.maps[state.scene];
    const exit = map.exits.find((item) =>
      Math.hypot(item.x - state.player.x, item.y - state.player.y) <= item.radius
    );
    if (exit) {
      const node = DATA.world.nodes.find((item) => item.id === state.scene);
      if (node) state.worldPos = { x: node.x + 22, y: node.y + 8 };
      enterScene(exit.to);
      return;
    }

    const trigger = map.triggers.find((item) =>
      !state.defeatedTriggers[item.id] &&
      Math.hypot(item.x - state.player.x, item.y - state.player.y) <= item.radius
    );
    if (trigger) {
      triggerAction(trigger.action);
      return;
    }

    if (map.danger && state.player.distance > 80 && chance(map.danger * distanceMoved)) {
      state.player.distance = 0;
      const enemyId = map.encounters[randomInt(0, map.encounters.length - 1)];
      const enemies = [enemyId];
      if (chance(0.34)) {
        enemies.push(map.encounters[randomInt(0, map.encounters.length - 1)]);
      }
      startBattle(enemies, { background: state.scene === "reliquary" ? "cave" : "forest" });
    }
  }

  function nearestNpc() {
    if (mode !== "local") return null;
    const map = DATA.maps[state.scene];
    return map.npcs
      .map((npc) => ({ npc, distance: Math.hypot(npc.x - state.player.x, npc.y - state.player.y) }))
      .filter((entry) => entry.distance < 22)
      .sort((a, b) => a.distance - b.distance)[0]?.npc || null;
  }

  function nearestWorldNode() {
    return DATA.world.nodes
      .map((node) => ({ node, distance: Math.hypot(node.x - state.player.x, node.y - state.player.y) }))
      .filter((entry) => entry.distance < 25)
      .sort((a, b) => a.distance - b.distance)[0]?.node || null;
  }

  function interact() {
    if (mode === "dialogue") {
      nextDialogue();
      return;
    }
    if (mode === "world") {
      const node = nearestWorldNode();
      if (!node) {
        showToast("Hier zweigt kein bekannter Weg ab.");
        return;
      }
      if (node.unlock && !state.flags[node.unlock]) {
        showToast("Dieser Weg ist noch nicht zugänglich.");
        return;
      }
      if (node.future || !node.to) {
        showToast(`${node.name} · wird in einem späteren Kapitel geöffnet`);
        return;
      }
      state.worldPos = { x: node.x, y: node.y };
      enterScene(node.to);
      return;
    }
    if (mode !== "local") return;
    const npc = nearestNpc();
    if (npc) {
      npcAction(npc.action);
      return;
    }
    showToast("Nichts Auffälliges.");
  }

  function ensureCompanion(id) {
    if (!state.party[id]) state.party[id] = characterState(id);
    if (!state.activeParty.includes(id) && state.activeParty.length < 3) state.activeParty.push(id);
  }

  function inventoryCount(itemId) {
    const item = DATA.items[itemId];
    if (!item) return 0;
    const bag = item.type === "consumable"
      ? state.inventory.consumables
      : state.inventory.equipment;
    return bag[itemId] || 0;
  }

  function addInventoryItem(itemId, amount = 1) {
    const item = DATA.items[itemId];
    if (!item) return;
    const bag = item.type === "consumable"
      ? state.inventory.consumables
      : state.inventory.equipment;
    bag[itemId] = (bag[itemId] || 0) + amount;
  }

  function consumeInventoryItem(itemId) {
    const item = DATA.items[itemId];
    if (!item || inventoryCount(itemId) <= 0) return false;
    const bag = item.type === "consumable"
      ? state.inventory.consumables
      : state.inventory.equipment;
    bag[itemId] -= 1;
    return true;
  }

  function applyConsumable(itemId, targetId) {
    const item = DATA.items[itemId];
    const member = state.party[targetId];
    if (!item || item.type !== "consumable" || !member || inventoryCount(itemId) <= 0) return null;
    if (item.target && !item.target.includes(targetId)) return null;
    const stats = characterStats(targetId);
    const before = { hp: member.hp, sp: member.sp, dp: member.dp };
    if (item.effect.hp) member.hp = Math.min(stats.hp, member.hp + item.effect.hp);
    if (item.effect.sp) member.sp = Math.min(stats.sp, member.sp + item.effect.sp);
    if (item.effect.dp) member.dp = Math.min(stats.dp, member.dp + item.effect.dp);
    const restored = (member.hp - before.hp) + (member.sp - before.sp) + (member.dp - before.dp);
    if (restored <= 0) return null;
    consumeInventoryItem(itemId);
    return {
      hp: member.hp - before.hp,
      sp: member.sp - before.sp,
      dp: member.dp - before.dp
    };
  }

  function equipItem(itemId, targetId) {
    const item = DATA.items[itemId];
    const member = state.party[targetId];
    if (!item || item.type !== "equipment" || !member || inventoryCount(itemId) <= 0) return false;
    if (item.allowed && !item.allowed.includes(targetId)) return false;
    const oldStats = characterStats(targetId);
    const previous = member.equipment[item.slot];
    consumeInventoryItem(itemId);
    member.equipment[item.slot] = itemId;
    if (previous) addInventoryItem(previous, 1);
    const newStats = characterStats(targetId);
    member.hp = clamp(member.hp + (newStats.hp - oldStats.hp), 1, newStats.hp);
    member.sp = clamp(member.sp + (newStats.sp - oldStats.sp), 0, newStats.sp);
    member.dp = clamp(member.dp + (newStats.dp - oldStats.dp), 0, newStats.dp);
    save(true);
    return true;
  }

  function grantXp(id, amount) {
    const member = state.party[id];
    if (!member) return [];
    member.xp += amount;
    const levels = [];
    while (member.level < 30 && member.xp >= xpThreshold(member.level)) {
      const before = characterStats(id);
      member.level += 1;
      const after = characterStats(id);
      member.hp = Math.min(after.hp, member.hp + (after.hp - before.hp) + 12);
      member.sp = Math.min(after.sp, member.sp + (after.sp - before.sp) + 4);
      member.dp = Math.min(after.dp, member.dp + (after.dp - before.dp));
      levels.push(member.level);
    }
    return levels;
  }

  function npcAction(action) {
    if (action === "elder") {
      if (!state.flags.elderTruth) {
        showDialogue(DATA.dialogue.elderStart, () => {
          state.flags.elderTruth = true;
          state.flags.worldOpen = true;
          ensureCompanion("liora");
          showDialogue(DATA.dialogue.bramJoin, () => {
            ensureCompanion("bram");
            updateHud();
            save(false);
          });
        });
      } else {
        showDialogue([{ speaker: "Mara", text: objectiveText() }]);
      }
      return;
    }
    if (action === "liora") {
      showDialogue([{
        speaker: "Liora",
        text: state.flags.forestEcho
          ? "Der Splitter hat dich erkannt. Im Reliquiar finden wir heraus, welche Erinnerung der Orden so sehr fürchtet."
          : "Im Flüsterforst reagieren die Runen auf deinen Anhänger. Bleib auf den hellen Wegen."
      }]);
      return;
    }
    if (action === "bram") {
      showDialogue([{
        speaker: "Bram",
        text: state.flags.elderTruth
          ? "Meine Lanze gehört jetzt dir, Ryn. Nicht aus Gehorsam – aus freier Entscheidung."
          : "Mara wartet. Manche Wahrheiten werden schwerer, je länger man sie trägt."
      }]);
    }
  }

  function triggerAction(action) {
    if (action === "forestEcho") {
      if (state.flags.forestEcho) return;
      showDialogue(DATA.dialogue.forestEcho, () => {
        startBattle(["memoryShard"], {
          background: "forest",
          story: "forestEcho",
          title: "Stimme im Splitter"
        });
      });
      return;
    }
    if (action === "glassHound") {
      if (state.flags.glassHoundDefeated) return;
      showDialogue(DATA.dialogue.houndAwakening, () => {
        state.flags.dragonUnlocked = true;
        state.party.ryn.dp = characterStats("ryn").dp;
        showToast("Drachenform „Glutwyrmling“ erwacht!", 2700);
        startBattle(["glassHound"], {
          background: "cave",
          story: "glassHound",
          title: "Wächter des Reliquiars",
          boss: true
        });
      });
    }
  }

  function makeEnemy(id, index) {
    const base = DATA.enemies[id];
    return {
      ...base,
      baseId: id,
      uid: `${id}-${Date.now()}-${index}`,
      maxHp: base.hp,
      hp: base.hp,
      hitUntil: 0,
      defeatedAt: 0
    };
  }

  function startBattle(enemyIds, options = {}) {
    held.clear();
    mode = "battle";
    battle = {
      enemies: enemyIds.map(makeEnemy),
      options,
      actorIndex: 0,
      round: 1,
      busy: false,
      commandMode: "root",
      dragonTurns: 0,
      animation: null,
      particles: [],
      numbers: [],
      flash: 0,
      shake: 0,
      message: options.title || "Kampf beginnt!"
    };
    ui.hud.classList.add("hidden");
    ui.worldGuide.classList.add("hidden");
    ui.touch.classList.add("hidden");
    ui.battleHud.classList.remove("hidden");
    renderBattleUi();
    tone(104, 0.25, "sawtooth", 0.025);
  }

  function partyIds() {
    return state.activeParty.filter((id) => state.party[id]);
  }

  function livingParty() {
    return partyIds().filter((id) => state.party[id].hp > 0);
  }

  function livingEnemies() {
    return battle.enemies.filter((enemy) => enemy.hp > 0);
  }

  function currentActorId() {
    return partyIds()[battle.actorIndex];
  }

  function enemyTarget() {
    return livingEnemies()[0] || null;
  }

  function battleStats(id) {
    const base = characterStats(id);
    const dragon = id === "ryn" && battle?.dragonTurns > 0;
    return {
      ...base,
      atk: Math.floor(base.atk * (dragon ? 1.72 : 1)),
      mag: Math.floor(base.mag * (dragon ? 1.55 : 1)),
      def: Math.floor(base.def * (dragon ? 1.35 : 1))
    };
  }

  function renderBattleUi() {
    if (!battle) return;
    ui.enemyNames.innerHTML = livingEnemies().map((enemy) =>
      `<div class="enemy-row"><span>${escapeHtml(enemy.name)}</span><span>${enemy.hp}/${enemy.maxHp}</span></div>`
    ).join("") || "<div>Keine Gegner</div>";

    ui.battleMessage.textContent = battle.message;
    ui.partyStatus.innerHTML = partyIds().map((id) => {
      const member = state.party[id];
      const stats = characterStats(id);
      return `
        <div class="party-card">
          <header><strong>${DATA.characters[id].name}${id === "ryn" && battle.dragonTurns > 0 ? " ◆" : ""}</strong><span>St. ${member.level}</span></header>
          <div class="resource-line"><span>LP ${member.hp}/${stats.hp}</span><span>SP ${member.sp}/${stats.sp}</span>${id === "ryn" ? `<span>DP ${member.dp}/${stats.dp}</span>` : ""}</div>
          <div class="meter" style="--value:${clamp(member.hp / stats.hp * 100, 0, 100)}%"><i></i></div>
          <div class="meter sp" style="--value:${clamp(member.sp / stats.sp * 100, 0, 100)}%"><i></i></div>
          ${id === "ryn" ? `<div class="meter dp" style="--value:${clamp(member.dp / stats.dp * 100, 0, 100)}%"><i></i></div>` : ""}
        </div>
      `;
    }).join("");
    renderCommands();
  }

  function renderCommands() {
    if (!battle || battle.busy) {
      ui.commandPanel.innerHTML = "";
      return;
    }
    while (battle.actorIndex < partyIds().length && state.party[currentActorId()].hp <= 0) {
      battle.actorIndex += 1;
    }
    if (battle.actorIndex >= partyIds().length) {
      ui.commandPanel.innerHTML = "";
      enemyPhase();
      return;
    }
    const actorId = currentActorId();
    const member = state.party[actorId];
    if (battle.commandMode === "skills") {
      const skills = DATA.characters[actorId].skills;
      ui.commandPanel.innerHTML = skills.map((skill) =>
        `<button class="wide" data-skill="${skill.id}" ${member.sp < skill.cost ? "disabled" : ""}>${skill.name} · ${skill.cost} SP</button>`
      ).join("") + '<button class="wide" data-battle="back">← Zurück</button>';
      return;
    }
    if (battle.commandMode === "items") {
      ui.commandPanel.innerHTML = Object.entries(state.inventory.consumables)
        .filter(([, amount]) => amount > 0)
        .map(([itemId, amount]) => {
          const item = DATA.items[itemId];
          const compatible = !item.target || item.target.includes(actorId);
          return `<button class="wide" data-battle-item="${itemId}" ${compatible ? "" : "disabled"}>${item.name} · ${amount}</button>`;
        }).join("") + '<button class="wide" data-battle="back">← Zurück</button>';
      return;
    }
    if (battle.commandMode === "targets") {
      ui.commandPanel.innerHTML = livingEnemies().map((enemy) =>
        `<button class="wide" data-attack-target="${enemy.uid}">${enemy.name} · ${enemy.hp}/${enemy.maxHp} LP</button>`
      ).join("") + '<button class="wide" data-battle="back">← Zurück</button>';
      return;
    }
    ui.commandPanel.innerHTML = `
      <button data-battle="attack">Angriff</button>
      <button data-battle="skills">Technik</button>
      <button data-battle="guard">Abwehr</button>
      <button data-battle="items">Gegenstand</button>
      ${actorId === "ryn" && state.flags.dragonUnlocked
        ? `<button data-battle="dragon" ${member.dp < 10 || battle.dragonTurns > 0 ? "disabled" : ""}>Drache</button>`
        : '<button disabled>Drache</button>'}
      <button class="wide" data-battle="flee" ${battle.options.boss ? "disabled" : ""}>Fliehen</button>
    `;
  }

  function setBattleMessage(message) {
    if (!battle) return;
    battle.message = message;
    ui.battleMessage.textContent = message;
  }

  function heroBattlePosition(id) {
    const positions = [[92, 128], [126, 164], [74, 196]];
    return positions[Math.max(0, partyIds().indexOf(id))] || positions[0];
  }

  function enemyBattlePosition(enemy) {
    const positions = battle.enemies.length === 1
      ? [[365, 132]]
      : [[352, 94], [392, 145], [326, 182]];
    return positions[Math.max(0, battle.enemies.indexOf(enemy))] || positions[0];
  }

  function addParticles(x, y, color, amount = 14) {
    for (let index = 0; index < amount; index += 1) {
      battle.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 90,
        vy: -25 - Math.random() * 70,
        color,
        life: 0.35 + Math.random() * 0.35,
        age: 0
      });
    }
  }

  function addNumber(x, y, value, color = "#fff1b5") {
    battle.numbers.push({ x, y, value, color, age: 0, life: 0.8 });
  }

  function beginAnimation(side, id, kind, duration = 520) {
    battle.animation = { side, id, kind, start: performance.now(), duration };
  }

  function damageEnemy(enemy, amount, element = "physical") {
    const weak = enemy.weakness === element;
    const damage = Math.max(1, Math.floor(amount * (0.9 + Math.random() * 0.2) * (weak ? 1.45 : 1)));
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (enemy.hp === 0) enemy.defeatedAt = performance.now();
    enemy.hitUntil = performance.now() + 190;
    const [x, y] = enemyBattlePosition(enemy);
    addParticles(x, y - 25, weak ? "#70e0cb" : "#f5c66b", weak ? 24 : 15);
    addNumber(x, y - 48, weak ? `${damage}!` : damage, weak ? "#8ff1d9" : "#fff1b5");
    battle.shake = weak ? 8 : 4;
    battle.flash = weak ? 0.25 : 0.12;
    return { damage, weak };
  }

  function chooseAttack() {
    if (!battle || battle.busy) return;
    if (livingEnemies().length <= 1) {
      useAttack();
      return;
    }
    battle.commandMode = "targets";
    renderCommands();
  }

  async function useAttack(targetUid = null) {
    if (!battle || battle.busy) return;
    const actorId = currentActorId();
    const enemy = targetUid
      ? livingEnemies().find((candidate) => candidate.uid === targetUid)
      : enemyTarget();
    if (!enemy) return;
    battle.busy = true;
    beginAnimation("hero", actorId, "attack", 520);
    setBattleMessage(`${DATA.characters[actorId].name} greift an.`);
    renderBattleUi();
    await wait(245);
    const stats = battleStats(actorId);
    const result = damageEnemy(enemy, stats.atk * (actorId === "ryn" && battle.dragonTurns > 0 ? 1.25 : 1) - enemy.def * 0.35);
    setBattleMessage(`${enemy.name}: ${result.damage} Schaden${result.weak ? " · Schwäche!" : ""}`);
    tone(result.weak ? 520 : 150, 0.07, "square", 0.025);
    await wait(360);
    battle.animation = null;
    await finishActor();
  }

  async function useSkill(skillId) {
    if (!battle || battle.busy) return;
    const actorId = currentActorId();
    const skill = DATA.characters[actorId].skills.find((item) => item.id === skillId);
    const member = state.party[actorId];
    if (!skill || member.sp < skill.cost) return;
    battle.busy = true;
    member.sp -= skill.cost;
    beginAnimation("hero", actorId, "skill", 650);
    setBattleMessage(`${DATA.characters[actorId].name}: ${skill.name}`);
    renderBattleUi();
    await wait(300);
    if (skill.kind === "heal") {
      const targetId = livingParty().sort((a, b) =>
        state.party[a].hp / characterStats(a).hp - state.party[b].hp / characterStats(b).hp
      )[0];
      const target = state.party[targetId];
      const amount = Math.floor(battleStats(actorId).mag * skill.power + 12);
      target.hp = Math.min(characterStats(targetId).hp, target.hp + amount);
      const [x, y] = heroBattlePosition(targetId);
      addParticles(x, y - 26, "#80e9bc", 22);
      addNumber(x, y - 48, `+${amount}`, "#8ff1bc");
      setBattleMessage(`${DATA.characters[targetId].name} erhält ${amount} LP.`);
    } else {
      const enemy = enemyTarget();
      const power = (skill.element === "physical" ? battleStats(actorId).atk : battleStats(actorId).mag) * skill.power;
      const result = damageEnemy(enemy, power - enemy.def * 0.22, skill.element);
      setBattleMessage(`${enemy.name}: ${result.damage} Schaden${result.weak ? " · Schwäche!" : ""}`);
    }
    await wait(430);
    battle.animation = null;
    await finishActor();
  }

  async function useGuard() {
    if (!battle || battle.busy) return;
    const actorId = currentActorId();
    state.party[actorId].guard = 1;
    battle.busy = true;
    beginAnimation("hero", actorId, "guard", 360);
    setBattleMessage(`${DATA.characters[actorId].name} geht in Deckung.`);
    renderBattleUi();
    await wait(390);
    battle.animation = null;
    await finishActor();
  }

  async function useBattleItem(itemId) {
    if (!battle || battle.busy) return;
    const actorId = currentActorId();
    const result = applyConsumable(itemId, actorId);
    if (!result) {
      showToast("Dieser Gegenstand hat hier keine Wirkung.");
      return;
    }
    battle.busy = true;
    beginAnimation("hero", actorId, "skill", 520);
    const details = [
      result.hp ? `${result.hp} LP` : "",
      result.sp ? `${result.sp} SP` : "",
      result.dp ? `${result.dp} DP` : ""
    ].filter(Boolean).join(" · ");
    setBattleMessage(`${DATA.characters[actorId].name} benutzt ${DATA.items[itemId].name}: ${details}`);
    const [x, y] = heroBattlePosition(actorId);
    addParticles(x, y - 28, "#e9d472", 22);
    addNumber(x, y - 48, details, "#fff0a5");
    renderBattleUi();
    await wait(620);
    battle.animation = null;
    await finishActor();
  }

  async function useDragon() {
    if (!battle || battle.busy || currentActorId() !== "ryn") return;
    const ryn = state.party.ryn;
    if (!state.flags.dragonUnlocked || ryn.dp < 10 || battle.dragonTurns > 0) return;
    battle.busy = true;
    ryn.dp -= 10;
    battle.dragonTurns = 4;
    beginAnimation("hero", "ryn", "transform", 900);
    setBattleMessage("Ryn erinnert sich an die Form des Glutwyrmlings!");
    battle.flash = 0.9;
    addParticles(...heroBattlePosition("ryn"), "#e7844e", 42);
    renderBattleUi();
    tone(90, 0.5, "sawtooth", 0.03);
    await wait(950);
    battle.animation = null;
    await finishActor();
  }

  async function useFlee() {
    if (!battle || battle.busy || battle.options.boss) return;
    battle.busy = true;
    setBattleMessage("Die Gruppe sucht einen Fluchtweg ...");
    renderBattleUi();
    await wait(500);
    if (chance(0.72)) {
      finishBattle(false);
      showToast("Entkommen");
    } else {
      setBattleMessage("Flucht misslungen!");
      battle.actorIndex = partyIds().length;
      enemyPhase();
    }
  }

  async function finishActor() {
    if (!battle) return;
    if (livingEnemies().length === 0) {
      await victory();
      return;
    }
    battle.actorIndex += 1;
    battle.commandMode = "root";
    battle.busy = false;
    renderBattleUi();
  }

  async function enemyPhase() {
    if (!battle || battle.busy) return;
    battle.busy = true;
    renderBattleUi();
    await wait(280);
    for (const enemy of livingEnemies()) {
      if (!battle) return;
      const targets = livingParty();
      if (!targets.length) break;
      const targetId = targets[randomInt(0, targets.length - 1)];
      const target = state.party[targetId];
      beginAnimation("enemy", enemy.uid, "attack", 560);
      setBattleMessage(`${enemy.name} greift ${DATA.characters[targetId].name} an.`);
      await wait(260);
      const defense = battleStats(targetId).def;
      let damage = Math.max(1, Math.floor(enemy.atk - defense * 0.42 + randomInt(0, 5)));
      if (target.guard > 0) damage = Math.max(1, Math.floor(damage * 0.48));
      target.hp = Math.max(0, target.hp - damage);
      const [x, y] = heroBattlePosition(targetId);
      addParticles(x, y - 24, "#e56c58", 16);
      addNumber(x, y - 48, damage, "#ffb49a");
      battle.shake = enemy.boss ? 10 : 5;
      battle.flash = enemy.boss ? 0.28 : 0.13;
      setBattleMessage(`${DATA.characters[targetId].name} erleidet ${damage} Schaden.`);
      tone(82, 0.08, "square", 0.028);
      renderBattleUi();
      await wait(390);
      battle.animation = null;
      if (!livingParty().length) {
        defeat();
        return;
      }
    }
    partyIds().forEach((id) => {
      state.party[id].guard = 0;
      state.party[id].sp = Math.min(characterStats(id).sp, state.party[id].sp + 1);
    });
    if (battle.dragonTurns > 0) {
      battle.dragonTurns -= 1;
      if (battle.dragonTurns === 0) setBattleMessage("Ryn kehrt in seine menschliche Form zurück.");
    }
    battle.round += 1;
    battle.actorIndex = 0;
    battle.busy = false;
    battle.commandMode = "root";
    renderBattleUi();
  }

  async function victory() {
    const enemies = [...battle.enemies];
    const options = { ...battle.options };
    battle.busy = true;
    const xp = enemies.reduce((sum, enemy) => sum + enemy.xp, 0);
    const gold = enemies.reduce((sum, enemy) => sum + enemy.gold, 0);
    state.gold += gold;
    state.battlesWon += 1;
    const levelUps = [];
    partyIds().forEach((id) => {
      grantXp(id, xp).forEach((level) => levelUps.push(`${DATA.characters[id].name} St. ${level}`));
      state.party[id].hp = Math.min(characterStats(id).hp, state.party[id].hp + 8);
    });
    const loot = [];
    enemies.forEach((enemy) => {
      (enemy.drops || []).forEach((drop) => {
        if (chance(drop.chance)) {
          addInventoryItem(drop.id, 1);
          loot.push(DATA.items[drop.id].name);
        }
      });
    });
    const rewardDetails = [
      `${xp} EP`,
      `${gold} Kronen`,
      loot.length ? `Beute: ${loot.join(", ")}` : ""
    ].filter(Boolean).join(" · ");
    setBattleMessage(`Sieg! ${rewardDetails}`);
    renderBattleUi();
    tone(523, 0.13, "square", 0.025);
    await wait(180);
    tone(659, 0.2, "square", 0.025);
    await wait(750);
    finishBattle(true);
    if (levelUps.length) showToast(`Stufenanstieg! ${levelUps.join(" · ")}`, 2800);
    else if (loot.length) showToast(`Erhalten: ${loot.join(", ")}`, 2200);

    if (options.story === "forestEcho") {
      state.flags.forestEcho = true;
      state.flags.reliquaryOpen = true;
      state.defeatedTriggers.forestEcho = true;
      updateHud();
      save(true);
      showDialogue(DATA.dialogue.forestAfter, () => {
        showToast("Neuer Weg: Gläsernes Reliquiar", 2500);
        save(true);
      });
    }
    if (options.story === "glassHound") {
      state.flags.glassHoundDefeated = true;
      state.flags.chapterOneComplete = true;
      state.defeatedTriggers.glassHound = true;
      updateHud();
      save(true);
      showDialogue(DATA.dialogue.chapterEnd);
    }
  }

  function finishBattle(autosave = true) {
    battle = null;
    mode = state.scene === "world" ? "world" : "local";
    ui.battleHud.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    ui.touch.classList.remove("hidden");
    updateHud();
    transitionFlash = 0.45;
    if (autosave) save(true);
  }

  function defeat() {
    battle = null;
    partyIds().forEach((id) => {
      const stats = characterStats(id);
      state.party[id].hp = Math.max(1, Math.floor(stats.hp * 0.6));
      state.party[id].sp = Math.floor(stats.sp * 0.5);
    });
    state.gold = Math.floor(state.gold * 0.9);
    enterScene("hollow");
    ui.battleHud.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    ui.touch.classList.remove("hidden");
    showDialogue([{ speaker: "Mara", text: "Liora hat euch am Waldrand gefunden. Ruht euch aus – die Erinnerung läuft nicht davon." }]);
  }

  function openMenu() {
    if (!state || (mode !== "local" && mode !== "world")) return;
    held.clear();
    menuReturnMode = mode;
    menuTab = "party";
    mode = "menu";
    ui.menu.classList.remove("hidden");
    renderMenu();
  }

  function closeMenu() {
    if (mode !== "menu") return;
    ui.menu.classList.add("hidden");
    mode = menuReturnMode;
    save(true);
  }

  function renderMenu() {
    ui.menuBody.innerHTML = `
      <div class="menu-summary"><strong>${escapeHtml(objectiveText())}</strong><span>${state.gold} Kr</span></div>
      <div class="menu-tabs">
        <button data-menu-tab="party" class="${menuTab === "party" ? "active" : ""}">Gruppe</button>
        <button data-menu-tab="inventory" class="${menuTab === "inventory" ? "active" : ""}">Inventar</button>
        <button data-menu-tab="equipment" class="${menuTab === "equipment" ? "active" : ""}">Ausrüstung</button>
      </div>
      <div class="menu-content">
        ${menuTab === "inventory"
          ? renderInventoryMenu()
          : menuTab === "equipment"
            ? renderEquipmentMenu()
            : renderPartyMenu()}
      </div>
      <div class="menu-actions">
        <button data-menu="save">Speichern</button>
        <button data-menu="export">Spielstand exportieren</button>
        <button data-menu="controls">Steuerung</button>
        <button data-menu="title">Zum Titel</button>
      </div>
    `;
  }

  function renderPartyMenu() {
    return partyIds().map((id) => {
      const member = state.party[id];
      const stats = characterStats(id);
      const nextXp = xpThreshold(member.level);
      const equipment = ["weapon", "armor", "accessory"]
        .map((slot) => member.equipment[slot] ? DATA.items[member.equipment[slot]].name : "—")
        .join(" · ");
      return `
        <article class="character-sheet">
          <div class="mini-portrait" style="background-position:${DATA.characters[id].portrait * 25}% 0"></div>
          <div>
            <header><strong>${DATA.characters[id].name}</strong><span>Stufe ${member.level}</span></header>
            <small>${DATA.characters[id].role}</small>
            <div class="stat-grid">
              <span>LP <b>${member.hp}/${stats.hp}</b></span>
              <span>SP <b>${member.sp}/${stats.sp}</b></span>
              <span>ANG <b>${stats.atk}</b></span>
              <span>MAG <b>${stats.mag}</b></span>
              <span>ABW <b>${stats.def}</b></span>
              <span>TEM <b>${stats.spd}</b></span>
            </div>
            <div class="xp-line">EP ${member.xp}/${nextXp}<i style="--xp:${clamp(member.xp / nextXp * 100, 0, 100)}%"></i></div>
            <small>${equipment}</small>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderInventoryMenu() {
    const rows = Object.entries(state.inventory.consumables)
      .filter(([, amount]) => amount > 0)
      .map(([itemId, amount]) => {
        const item = DATA.items[itemId];
        const targets = partyIds()
          .filter((id) => !item.target || item.target.includes(id))
          .map((id) => `<button data-use-item="${itemId}" data-target="${id}">${DATA.characters[id].name}</button>`)
          .join("");
        return `
          <div class="inventory-row">
            <div><strong>${item.name} ×${amount}</strong><small>${item.description}</small></div>
            <div class="item-targets">${targets}</div>
          </div>
        `;
      }).join("");
    return rows || '<p class="empty-note">Keine nutzbaren Gegenstände.</p>';
  }

  function renderEquipmentMenu() {
    const equipped = partyIds().map((id) => {
      const member = state.party[id];
      return `
        <div class="equipment-card">
          <strong>${DATA.characters[id].name}</strong>
          <span>Waffe: ${DATA.items[member.equipment.weapon]?.name || "—"}</span>
          <span>Rüstung: ${DATA.items[member.equipment.armor]?.name || "—"}</span>
          <span>Zubehör: ${DATA.items[member.equipment.accessory]?.name || "—"}</span>
        </div>
      `;
    }).join("");
    const bag = Object.entries(state.inventory.equipment)
      .filter(([, amount]) => amount > 0)
      .map(([itemId, amount]) => {
        const item = DATA.items[itemId];
        const targets = partyIds()
          .filter((id) => !item.allowed || item.allowed.includes(id))
          .map((id) => `<button data-equip-item="${itemId}" data-target="${id}">${DATA.characters[id].name}</button>`)
          .join("");
        const bonuses = Object.entries(item.bonuses || {})
          .map(([key, value]) => `${key.toUpperCase()} ${value >= 0 ? "+" : ""}${value}`)
          .join(" · ");
        return `
          <div class="inventory-row">
            <div><strong>${item.name} ×${amount}</strong><small>${item.description}<br>${bonuses}</small></div>
            <div class="item-targets">${targets}</div>
          </div>
        `;
      }).join("");
    return `<div class="equipment-grid">${equipped}</div>${bag || '<p class="empty-note">Keine freie Ausrüstung im Beutel.</p>'}`;
  }

  function exportSave() {
    save(true);
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `emberbound-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function showControls() {
    ui.modalBody.innerHTML = `
      <h2>Steuerung</h2>
      <ul>
        <li><b>WASD / Pfeiltasten:</b> fließend bewegen</li>
        <li><b>E / Enter / Leertaste:</b> sprechen oder Ort betreten</li>
        <li><b>M / Escape:</b> Reisebuch öffnen</li>
        <li><b>Kampf:</b> Befehle anklicken; „Drache“ verbraucht 10 DP</li>
      </ul>
      <p>Das Spiel speichert automatisch nach Reisen und Kämpfen.</p>
    `;
    ui.modal.classList.remove("hidden");
  }

  function noise(x, y, seed = 0) {
    return Math.abs(Math.sin(x * 12.9898 + y * 78.233 + seed * 17.17)) % 1;
  }

  function drawLocalMap(now) {
    const map = DATA.maps[state.scene];
    const background = map.background ? images[map.background] : null;
    if (background?.complete && background.naturalWidth) {
      ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
    } else {
      for (let row = 0; row < map.tiles.length; row += 1) {
        for (let column = 0; column < map.tiles[row].length; column += 1) {
          drawTile(map.tiles[row][column], column * TILE, row * TILE, map.palette, now, column, row);
        }
      }
    }

    const actors = [];
    map.npcs.forEach((npc) => actors.push({ type: "npc", y: npc.y, npc }));
    const companions = state.activeParty.slice(1);
    companions.forEach((id, index) => {
      const point = trail[Math.min(trail.length - 1, 5 + index * 6)] || state.player;
      actors.push({
        type: "hero", id, x: point.x, y: point.y,
        facing: point.facing, scale: 0.9, moving: state.player.moving
      });
    });
    actors.push({
      type: "hero", id: "ryn",
      x: state.player.x, y: state.player.y,
      facing: state.player.facing, scale: 1, moving: state.player.moving
    });
    actors.sort((a, b) => a.y - b.y).forEach((actor) => {
      if (actor.type === "npc") drawNpc(actor.npc, now);
      else drawMapHero(actor.id, actor.x, actor.y, actor.facing, actor.scale, actor.moving);
    });

    const nearby = nearestNpc();
    if (nearby) drawInteractionMark(nearby.x, nearby.y - 27);
    if (window.__EMBERBOUND_DEBUG_COLLISION__) drawCollisionDebug(map);
  }

  function drawCollisionDebug(map) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#55e8a8";
    (map.walkZones || []).forEach((shape) => {
      ctx.beginPath();
      if (shape.kind === "ellipse") {
        ctx.ellipse(shape.x, shape.y, shape.rx, shape.ry, 0, 0, Math.PI * 2);
      } else if (shape.kind === "capsule") {
        ctx.lineWidth = shape.r * 2;
        ctx.strokeStyle = "#55e8a8";
        ctx.moveTo(shape.ax, shape.ay);
        ctx.lineTo(shape.bx, shape.by);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(shape.ax, shape.ay, shape.r, shape.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(shape.bx, shape.by, shape.r, shape.r, 0, 0, Math.PI * 2);
      } else if (shape.kind === "rect") {
        ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
        return;
      }
      ctx.fill();
    });
    ctx.fillStyle = "#ef5b65";
    (map.obstacles || []).forEach((shape) => {
      ctx.beginPath();
      if (shape.kind === "ellipse") {
        ctx.ellipse(shape.x, shape.y, shape.rx, shape.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape.kind === "rect") {
        ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
      }
    });
    ctx.restore();
  }

  function drawTile(character, x, y, palette, now, column, row) {
    const palettes = {
      village: { ground: "#6d7c48", dark: "#3f5638", path: "#a18a5a", water: "#416d70", wall: "#384737" },
      forest: { ground: "#4f6538", dark: "#253f2c", path: "#8a774e", water: "#315e64", wall: "#1f3929" },
      cave: { ground: "#615640", dark: "#2b2b30", path: "#88755a", water: "#314a52", wall: "#242733" }
    };
    const colors = palettes[palette];
    ctx.fillStyle = colors.ground;
    ctx.fillRect(x, y, TILE, TILE);
    const speck = noise(column, row, 1);
    ctx.fillStyle = speck > 0.5 ? "rgba(255,230,150,.10)" : "rgba(0,0,0,.12)";
    ctx.fillRect(x + ((column * 7 + row * 3) % 13), y + ((column * 5 + row * 11) % 13), 2, 2);

    if (character === "=" || character === "E") {
      ctx.fillStyle = colors.path;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "rgba(255,235,180,.13)";
      ctx.fillRect(x + 2 + ((row + column) % 7), y + 5 + ((column * 3) % 7), 4, 2);
    }
    if (character === "~") {
      ctx.fillStyle = colors.water;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "rgba(137,220,207,.35)";
      const wave = Math.floor((now / 180 + column * 3 + row) % 13);
      ctx.fillRect(x + wave, y + 4, 4, 1);
      ctx.fillRect(x + ((wave + 7) % 13), y + 11, 3, 1);
    }
    if (character === "#" || character === "C") {
      ctx.fillStyle = colors.wall;
      ctx.fillRect(x, y, TILE, TILE);
      if (character === "#") {
        ctx.fillStyle = palette === "cave" ? "#343543" : "#24472f";
        ctx.fillRect(x + 2, y + 1, 12, 11);
        ctx.fillStyle = palette === "cave" ? "#4a4b5a" : "#3f6740";
        ctx.fillRect(x + 4, y + 2, 5, 3);
      } else {
        ctx.fillStyle = "#5b7e7b";
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 1);
        ctx.lineTo(x + 13, y + 14);
        ctx.lineTo(x + 3, y + 14);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#94c8bd";
        ctx.fillRect(x + 7, y + 4, 2, 6);
      }
    }
    if (character === "B") {
      ctx.fillStyle = "#5c4637";
      ctx.fillRect(x, y + 5, TILE, 11);
      ctx.fillStyle = "#9a553c";
      ctx.fillRect(x - 1, y + 2, TILE + 2, 7);
      ctx.fillStyle = "#c48054";
      ctx.fillRect(x + 2, y + 3, 6, 2);
    }
    if (character === "^") {
      ctx.fillStyle = "#4a493f";
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 14);
      ctx.lineTo(x + 8, y + 2);
      ctx.lineTo(x + 15, y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#716b56";
      ctx.fillRect(x + 7, y + 5, 3, 4);
    }
    if (character === "X") {
      ctx.fillStyle = "#181a20";
      ctx.fillRect(x + 2, y + 2, 12, 12);
      ctx.fillStyle = "rgba(80,142,140,.3)";
      ctx.fillRect(x + 5, y + 5, 6, 6);
    }
  }

  function drawWorld() {
    if (images.world.complete && images.world.naturalWidth) {
      ctx.drawImage(images.world, 0, 0, WIDTH, HEIGHT);
    } else {
      ctx.fillStyle = "#52603b";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.fillStyle = "rgba(22,18,13,.12)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    DATA.world.nodes.forEach((node) => {
      const unlocked = !node.unlock || state.flags[node.unlock];
      const near = Math.hypot(node.x - state.player.x, node.y - state.player.y) < 25;
      if (near) {
        ctx.fillStyle = "rgba(20,16,18,.92)";
        const labelWidth = Math.max(80, ctx.measureText(node.name).width + 18);
        drawPixelPanel(node.x - labelWidth / 2, node.y + 16, labelWidth, 18);
        ctx.fillStyle = unlocked ? "#f1e6c7" : "#978d7d";
        ctx.font = "8px Monaco, monospace";
        ctx.textAlign = "center";
        ctx.fillText(unlocked ? node.name : `${node.name} · versiegelt`, node.x, node.y + 28);
      }
      ctx.strokeStyle = unlocked ? "#e7c06c" : "#766e65";
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.floor(node.x - 5), Math.floor(node.y - 5), 10, 10);
    });

    drawShadow(state.player.x, state.player.y + 5, 7, 3);
    drawHeroCell(0, state.player.x, state.player.y + 7, 26, state.player.facing === "left");
    const node = nearestWorldNode();
    if (node) drawInteractionMark(node.x, node.y - 13);
  }

  function drawMapHero(id, x, y, facing, scale = 1, moving = false) {
    const sprites = DATA.characters[id].sprite;
    let cell = facing === "up" ? sprites.up : facing === "down" ? sprites.down : sprites.side;
    if (moving && (facing === "left" || facing === "right") && Math.floor(elapsed * 7) % 2) {
      cell = sprites.walk;
    }
    drawShadow(x, y + 5, 7 * scale, 3 * scale);
    drawHeroCell(cell, x, y + 8, 36 * scale, facing === "left");
  }

  function drawNpc(npc, now) {
    if (npc.hero) {
      drawMapHero(npc.hero, npc.x, npc.y, "down", 0.92);
      return;
    }
    const x = Math.round(npc.x);
    const y = Math.round(npc.y);
    drawShadow(x, y + 4, 7, 3);
    ctx.fillStyle = "#6b8d7e";
    ctx.fillRect(x - 6, y - 17, 12, 17);
    ctx.fillStyle = "#d7ae7e";
    ctx.fillRect(x - 4, y - 24, 8, 8);
    ctx.fillStyle = "#d8d0b7";
    ctx.fillRect(x - 5, y - 25, 10, 3);
    ctx.fillRect(x - 6, y - 20, 2, 7);
    ctx.fillStyle = "#dbb96a";
    ctx.fillRect(x - 1, y - 15, 2, 11);
    if (Math.floor(now / 500) % 2) ctx.fillRect(x + 5, y - 12, 2, 4);
  }

  function drawInteractionMark(x, y) {
    ctx.fillStyle = "#171318";
    ctx.fillRect(Math.floor(x - 5), Math.floor(y - 8), 10, 9);
    ctx.strokeStyle = "#d8bd70";
    ctx.strokeRect(Math.floor(x - 5), Math.floor(y - 8), 10, 9);
    ctx.fillStyle = "#fff0a5";
    ctx.font = "7px Monaco, monospace";
    ctx.textAlign = "center";
    ctx.fillText("E", Math.floor(x), Math.floor(y - 1));
  }

  function drawPixelPanel(x, y, width, height) {
    ctx.fillStyle = "rgba(35,29,36,.94)";
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
    ctx.strokeStyle = "#8a795e";
    ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(width) - 1, Math.floor(height) - 1);
  }

  function drawShadow(x, y, radiusX, radiusY) {
    ctx.fillStyle = "rgba(10,8,8,.52)";
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y), radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHeroCell(cell, x, baselineY, targetHeight, flip = false, alpha = 1) {
    if (!images.heroes.complete || !images.heroes.naturalWidth) return;
    const sourceWidth = images.heroes.naturalWidth / 24;
    const sourceHeight = images.heroes.naturalHeight;
    const targetWidth = targetHeight * sourceWidth / sourceHeight;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(baselineY));
    ctx.scale(flip ? -1 : 1, 1);
    ctx.drawImage(
      images.heroes,
      Math.floor(cell * sourceWidth), 0, Math.ceil(sourceWidth), sourceHeight,
      Math.round(-targetWidth / 2), Math.round(-targetHeight), Math.round(targetWidth), Math.round(targetHeight)
    );
    ctx.restore();
  }

  function drawEnemyCell(cell, x, baselineY, targetHeight, flip = false, alpha = 1) {
    if (!images.enemies.complete || !images.enemies.naturalWidth) return;
    const sourceWidth = images.enemies.naturalWidth / 8;
    const sourceHeight = images.enemies.naturalHeight;
    const targetWidth = targetHeight * sourceWidth / sourceHeight;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(baselineY));
    ctx.scale(flip ? -1 : 1, 1);
    ctx.drawImage(
      images.enemies,
      Math.floor(cell * sourceWidth), 0, Math.ceil(sourceWidth), sourceHeight,
      Math.round(-targetWidth / 2), Math.round(-targetHeight), Math.round(targetWidth), Math.round(targetHeight)
    );
    ctx.restore();
  }

  function animationProgress(animation, now) {
    if (!animation) return 0;
    return clamp((now - animation.start) / animation.duration, 0, 1);
  }

  function drawBattle(now, dt) {
    const background = battle.options.background === "cave" ? images.caveBattle : images.forestBattle;
    if (background.complete && background.naturalWidth) ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
    else {
      ctx.fillStyle = "#5b5138";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.fillStyle = "rgba(15,12,13,.08)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const shakeX = battle.shake > 0 ? (Math.random() - 0.5) * battle.shake : 0;
    const shakeY = battle.shake > 0 ? (Math.random() - 0.5) * battle.shake * 0.5 : 0;
    battle.shake = Math.max(0, battle.shake - dt * 25);
    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));

    partyIds().forEach((id) => drawBattleHero(id, now));
    battle.enemies.forEach((enemy) => drawBattleEnemy(enemy, now));
    ctx.restore();

    battle.particles = battle.particles.filter((particle) => {
      particle.age += dt;
      if (particle.age >= particle.life) return false;
      const t = particle.age;
      const alpha = 1 - particle.age / particle.life;
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(
        Math.round(particle.x + particle.vx * t),
        Math.round(particle.y + particle.vy * t + 80 * t * t),
        2, 2
      );
      ctx.globalAlpha = 1;
      return true;
    });

    battle.numbers = battle.numbers.filter((number) => {
      number.age += dt;
      if (number.age >= number.life) return false;
      ctx.globalAlpha = 1 - number.age / number.life;
      ctx.fillStyle = number.color;
      ctx.font = "bold 10px Monaco, monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(number.value), number.x, number.y - number.age * 24);
      ctx.globalAlpha = 1;
      return true;
    });

    if (battle.flash > 0) {
      ctx.fillStyle = `rgba(255,238,190,${battle.flash * 0.35})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      battle.flash = Math.max(0, battle.flash - dt * 2.8);
    }
  }

  function drawBattleHero(id, now) {
    const [baseX, baseY] = heroBattlePosition(id);
    const action = battle.animation?.side === "hero" && battle.animation.id === id ? battle.animation : null;
    const progress = animationProgress(action, now);
    let x = baseX;
    let y = baseY;
    let cell = DATA.characters[id].sprite.idle;
    if (id === "ryn" && battle.dragonTurns > 0) cell = DATA.characters.ryn.sprite.dragonIdle;
    if (action) {
      if (action.kind === "attack") {
        x += Math.sin(progress * Math.PI) * 118;
        cell = id === "ryn" && battle.dragonTurns > 0
          ? DATA.characters.ryn.sprite.dragonAction
          : DATA.characters[id].sprite.action;
      } else if (action.kind === "skill") {
        cell = DATA.characters[id].sprite.action;
      } else if (action.kind === "transform") {
        const dragonCell = progress > 0.48 ? DATA.characters.ryn.sprite.dragonIdle : DATA.characters.ryn.sprite.idle;
        cell = dragonCell;
        y -= Math.sin(progress * Math.PI) * 8;
      }
    }
    const height = id === "bram" ? 62 : id === "ryn" && battle.dragonTurns > 0 ? 61 : 55;
    drawShadow(x, y + 3, id === "bram" ? 16 : 13, 4);
    if (action?.kind === "attack" && progress > 0.18 && progress < 0.78) {
      drawHeroCell(cell, x - 18, y + 5, height, false, 0.22);
    }
    drawHeroCell(cell, x, y + 5, height, false, state.party[id].hp > 0 ? 1 : 0.35);
  }

  function drawBattleEnemy(enemy, now) {
    if (enemy.hp <= 0 && now - enemy.defeatedAt > 520) return;
    const [baseX, baseY] = enemyBattlePosition(enemy);
    const action = battle.animation?.side === "enemy" && battle.animation.id === enemy.uid ? battle.animation : null;
    const progress = animationProgress(action, now);
    let x = baseX;
    let y = baseY;
    let cell = enemy.sprite.idle;
    if (action) {
      x -= Math.sin(progress * Math.PI) * 84;
      cell = enemy.sprite.action;
    }
    const deathAge = enemy.defeatedAt ? now - enemy.defeatedAt : 0;
    if (deathAge) y += deathAge * 0.025;
    const alpha = deathAge ? clamp(1 - deathAge / 520, 0, 1) : 1;
    const height = enemy.boss ? 78 : enemy.baseId === "memoryShard" ? 53 : 49;
    drawShadow(x, y + 4, enemy.boss ? 23 : 13, enemy.boss ? 6 : 4);
    if (action && progress > 0.15 && progress < 0.8) {
      drawEnemyCell(cell, x + 15, y + 5, height, false, 0.2);
    }
    ctx.save();
    if (enemy.hitUntil > now) ctx.filter = "brightness(2)";
    drawEnemyCell(cell, x, y + 5, height, false, alpha);
    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    elapsed += dt;
    updateMovement(dt);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.imageSmoothingEnabled = false;

    if (mode === "battle" && battle) drawBattle(now, dt);
    else if (state) {
      if (state.scene === "world") drawWorld();
      else drawLocalMap(now);
    } else if (images.world.complete) {
      ctx.drawImage(images.world, 0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "rgba(8,7,7,.55)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (transitionFlash > 0) {
      ctx.fillStyle = `rgba(245,231,198,${transitionFlash})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      transitionFlash = Math.max(0, transitionFlash - dt * 2.8);
    }
    requestAnimationFrame(loop);
  }

  function directionForKey(key) {
    const value = key.toLowerCase();
    if (key === "ArrowUp" || value === "w") return "up";
    if (key === "ArrowDown" || value === "s") return "down";
    if (key === "ArrowLeft" || value === "a") return "left";
    if (key === "ArrowRight" || value === "d") return "right";
    return null;
  }

  document.addEventListener("keydown", (event) => {
    const direction = directionForKey(event.key);
    if (direction || [" ", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
    }
    if (direction && (mode === "local" || mode === "world")) {
      held.add(direction);
      return;
    }
    if (event.repeat) return;
    if (mode === "dialogue" && [" ", "Enter", "e", "E"].includes(event.key)) {
      nextDialogue();
      return;
    }
    if ((mode === "local" || mode === "world") && [" ", "Enter", "e", "E"].includes(event.key)) {
      interact();
      return;
    }
    if ((mode === "local" || mode === "world") && (event.key === "Escape" || event.key.toLowerCase() === "m")) {
      openMenu();
      return;
    }
    if (mode === "menu" && (event.key === "Escape" || event.key.toLowerCase() === "m")) closeMenu();
  });

  document.addEventListener("keyup", (event) => {
    const direction = directionForKey(event.key);
    if (direction) held.delete(direction);
  });
  window.addEventListener("blur", () => held.clear());

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    tone(260, 0.025, "square", 0.008);
    if (target.dataset.title === "new") startNewGame();
    if (target.dataset.title === "continue") continueGame();
    if (target.dataset.title === "controls") showControls();
    if (target.id === "dialogueNext") nextDialogue();
    if (target.id === "menuButton") openMenu();
    if (target.id === "closeMenu") closeMenu();
    if (target.id === "closeModal") ui.modal.classList.add("hidden");
    if (target.id === "touchAction") interact();

    if (target.dataset.battle === "attack") chooseAttack();
    if (target.dataset.battle === "skills") {
      battle.commandMode = "skills";
      renderCommands();
    }
    if (target.dataset.battle === "items") {
      battle.commandMode = "items";
      renderCommands();
    }
    if (target.dataset.battle === "guard") useGuard();
    if (target.dataset.battle === "dragon") useDragon();
    if (target.dataset.battle === "flee") useFlee();
    if (target.dataset.battle === "back") {
      battle.commandMode = "root";
      renderCommands();
    }
    if (target.dataset.skill) useSkill(target.dataset.skill);
    if (target.dataset.battleItem) useBattleItem(target.dataset.battleItem);
    if (target.dataset.attackTarget) useAttack(target.dataset.attackTarget);

    if (target.dataset.menuTab) {
      menuTab = target.dataset.menuTab;
      renderMenu();
    }
    if (target.dataset.useItem) {
      const result = applyConsumable(target.dataset.useItem, target.dataset.target);
      showToast(result
        ? `${DATA.items[target.dataset.useItem].name} wurde benutzt.`
        : "Der Gegenstand hat keine Wirkung.");
      save(true);
      renderMenu();
    }
    if (target.dataset.equipItem) {
      const equipped = equipItem(target.dataset.equipItem, target.dataset.target);
      showToast(equipped
        ? `${DATA.items[target.dataset.equipItem].name} angelegt.`
        : "Kann nicht angelegt werden.");
      renderMenu();
    }

    if (target.dataset.menu === "save") {
      save(false);
      renderMenu();
    }
    if (target.dataset.menu === "export") exportSave();
    if (target.dataset.menu === "controls") showControls();
    if (target.dataset.menu === "title") returnToTitle();
  });

  $$("[data-move]").forEach((button) => {
    const direction = button.dataset.move;
    const stop = () => held.delete(direction);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      held.add(direction);
      button.setPointerCapture?.(event.pointerId);
    });
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
  });

  window.addEventListener("beforeunload", () => save(true));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save(true);
  });

  if (window.__EMBERBOUND_TEST_MODE__) {
    window.__EMBERBOUND_TEST_API__ = {
      createState,
      normalizeState,
      startNewGame,
      continueGame,
      enterScene,
      attemptMove,
      localPositionBlocked,
      worldPositionBlocked,
      startBattle,
      useAttack,
      useDragon,
      useBattleItem,
      characterStats,
      xpThreshold,
      grantXp,
      applyConsumable,
      equipItem,
      inventoryCount,
      save,
      loadSave,
      getState: () => state,
      getBattle: () => battle,
      getMode: () => mode,
      getData: () => DATA,
      renderNow: () => {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        if (mode === "battle" && battle) drawBattle(performance.now(), 0.016);
        else if (state?.scene === "world") drawWorld();
        else if (state) drawLocalMap(performance.now());
      }
    };
  }

  ui.continue.disabled = !loadSave();
  requestAnimationFrame(loop);
})();
