const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const listeners = new Map();
const storage = new Map();

class ClassList {
  constructor() {
    this.values = new Set();
  }
  add(...names) {
    names.forEach((name) => this.values.add(name));
  }
  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }
  toggle(name, force) {
    if (force === undefined) {
      if (this.values.has(name)) this.values.delete(name);
      else this.values.add(name);
      return this.values.has(name);
    }
    if (force) this.values.add(name);
    else this.values.delete(name);
    return force;
  }
  contains(name) {
    return this.values.has(name);
  }
}

function element(id = "") {
  return {
    id,
    classList: new ClassList(),
    dataset: {},
    style: {},
    textContent: "",
    innerHTML: "",
    disabled: false,
    addEventListener() {},
    setPointerCapture() {},
    click() {},
    closest(selector) {
      return selector === "button" ? this : null;
    }
  };
}

const selectors = [
  "#game", "#titleScreen", "#continueButton", "#hud", "#chapter", "#location",
  "#objective", "#worldGuide", "#dialogue", "#speaker", "#dialogueText",
  "#dialogueNext", "#battleHud", "#enemyNames", "#battleMessage", "#partyStatus",
  "#commandPanel", "#menu", "#menuBody", "#modal", "#modalBody", "#toast",
  "#touchControls"
];
const elements = Object.fromEntries(selectors.map((selector) => [selector, element(selector.slice(1))]));
const context2d = new Proxy({
  measureText(value) {
    return { width: String(value).length * 6 };
  }
}, {
  get(target, property) {
    if (property in target) return target[property];
    return () => {};
  },
  set(target, property, value) {
    target[property] = value;
    return true;
  }
});
elements["#game"].getContext = () => context2d;

const documentMock = {
  hidden: false,
  querySelector(selector) {
    return elements[selector] || element(selector);
  },
  querySelectorAll() {
    return [];
  },
  createElement(tag) {
    return element(tag);
  },
  addEventListener(type, callback) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(callback);
  }
};

const windowMock = {
  __EMBERBOUND_TEST_MODE__: true,
  addEventListener() {}
};
windowMock.window = windowMock;

class MockImage {
  constructor() {
    this.complete = true;
    this.naturalWidth = 480;
    this.naturalHeight = 270;
    this.src = "";
  }
}

let clock = 1_000;
const sandbox = {
  window: windowMock,
  document: documentMock,
  localStorage: {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    }
  },
  Image: MockImage,
  performance: {
    now() {
      clock += 16;
      return clock;
    }
  },
  requestAnimationFrame() {},
  setTimeout(callback) {
    return global.setTimeout(callback, 1);
  },
  clearTimeout,
  URL: {
    createObjectURL() {
      return "blob:test";
    },
    revokeObjectURL() {}
  },
  Blob,
  console,
  Math,
  JSON,
  Date,
  Set,
  Promise
};

function evaluate(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInNewContext(source, sandbox, { filename: relativePath });
}

function click(target) {
  for (const listener of listeners.get("click") || []) {
    listener({ target });
  }
}

async function settle(milliseconds = 40) {
  await new Promise((resolve) => global.setTimeout(resolve, milliseconds));
}

function routeExists(api, map, start, goal, radius) {
  const step = 5;
  const startNode = {
    x: Math.round(start.x / step) * step,
    y: Math.round(start.y / step) * step
  };
  const queue = [startNode];
  const visited = new Set([`${startNode.x},${startNode.y}`]);
  const directions = [
    [step, 0], [-step, 0], [0, step], [0, -step],
    [step, step], [step, -step], [-step, step], [-step, -step]
  ];

  while (queue.length) {
    const point = queue.shift();
    if (Math.hypot(point.x - goal.x, point.y - goal.y) <= radius) return true;
    for (const [dx, dy] of directions) {
      const x = point.x + dx;
      const y = point.y + dy;
      const key = `${x},${y}`;
      if (x < -8 || x > 488 || y < -8 || y > 278 || visited.has(key)) continue;
      visited.add(key);
      if (!api.localPositionBlocked(map, x, y)) queue.push({ x, y });
    }
  }
  return false;
}

async function main() {
  evaluate("src/data.js");
  evaluate("src/game.js");

  const api = windowMock.__EMBERBOUND_TEST_API__;
  assert.ok(api, "Test-API wurde nicht initialisiert");
  assert.equal(api.getData().world.name, "Glutmark");
  const migrated = api.normalizeState({
    version: "0.1.0",
    scene: "hollow",
    player: { x: 112, y: 216 }
  });
  assert.equal(migrated.version, "0.3.0");
  assert.equal(migrated.player.x, api.getData().maps.hollow.spawn.x, "Alter Spielstand muss auf sicheren Boden migrieren");

  const newButton = element("new");
  newButton.dataset.title = "new";
  click(newButton);
  assert.equal(api.getMode(), "dialogue");
  assert.ok(storage.has("emberbound_reborn_save_v1"), "Neues Spiel wird nicht gespeichert");

  for (let page = 0; page < 12 && api.getMode() === "dialogue"; page += 1) {
    click(elements["#dialogueNext"]);
  }
  assert.equal(api.getMode(), "local");
  assert.equal(api.getState().scene, "hollow");

  const rynStatsAtOne = api.characterStats("ryn");
  assert.equal(api.getState().party.ryn.hp, rynStatsAtOne.hp, "Startausrüstung muss in Maximal-LP einfließen");
  api.getState().party.ryn.hp -= 40;
  const herbsBefore = api.inventoryCount("herb");
  const itemResult = api.applyConsumable("herb", "ryn");
  assert.ok(itemResult.hp > 0, "Heilgegenstand muss LP wiederherstellen");
  assert.equal(api.inventoryCount("herb"), herbsBefore - 1, "Benutzter Gegenstand muss verbraucht werden");

  const hpBeforeCharm = api.characterStats("ryn").hp;
  assert.equal(api.equipItem("mossCharm", "ryn"), true, "Kompatibles Zubehör muss ausrüstbar sein");
  assert.equal(api.characterStats("ryn").hp, hpBeforeCharm + 18, "Ausrüstung muss Werte tatsächlich verändern");
  const levels = api.grantXp("ryn", api.xpThreshold(1));
  assert.deepEqual(Array.from(levels), [2], "Genügend EP müssen einen Stufenanstieg auslösen");
  assert.equal(api.getState().party.ryn.level, 2);

  const hollow = api.getData().maps.hollow;
  assert.equal(api.localPositionBlocked(hollow, 8, 8), true, "Landschaft außerhalb der Laufzonen muss blockieren");
  assert.equal(api.localPositionBlocked(hollow, 240, 246), false, "Startpunkt muss begehbar sein");
  assert.equal(api.localPositionBlocked(hollow, 183, 143), true, "Der Dorfbrunnen muss blockieren");
  assert.equal(
    routeExists(api, hollow, hollow.spawn, hollow.npcs.find((npc) => npc.id === "elder"), 21),
    true,
    "Mara muss vom Startpunkt erreichbar sein"
  );
  assert.equal(
    routeExists(api, hollow, hollow.spawn, hollow.exits[0], hollow.exits[0].radius),
    true,
    "Der Dorfausgang muss erreichbar sein"
  );
  const before = api.getState().player.x;
  const moved = api.attemptMove(2.5, 0);
  assert.ok(moved > 0 && moved < 16, "Bewegung muss fließend statt kachelweise sein");
  assert.notEqual(api.getState().player.x, before);

  api.enterScene("world");
  assert.equal(api.getMode(), "world");
  assert.equal(api.worldPositionBlocked(5, 5), true, "Weltgrenze muss blockieren");
  assert.equal(api.worldPositionBlocked(94, 189), false, "Ortsknoten muss betretbar sein");
  assert.equal(api.worldPositionBlocked(143, 94), false, "Wege durch Landschaftshindernisse müssen begehbar sein");

  api.enterScene("whisperwood");
  assert.equal(
    api.localPositionBlocked(api.getData().maps.whisperwood, 204, 153),
    false,
    "Die Waldbrücke muss begehbar sein"
  );
  assert.equal(
    api.localPositionBlocked(api.getData().maps.whisperwood, 390, 220),
    true,
    "Bach und dichter Wald müssen blockieren"
  );
  assert.equal(
    routeExists(
      api,
      api.getData().maps.whisperwood,
      api.getData().maps.whisperwood.spawn,
      api.getData().maps.whisperwood.triggers[0],
      api.getData().maps.whisperwood.triggers[0].radius
    ),
    true,
    "Der Erinnerungsschrein muss über den sichtbaren Waldweg erreichbar sein"
  );
  api.startBattle(["mossHare"], { background: "forest" });
  api.getBattle().enemies[0].hp = 1;
  await api.useAttack();
  await settle();
  assert.equal(api.getBattle(), null, "Sieg muss Kampf sauber beenden");
  assert.equal(api.getState().battlesWon, 1);

  api.getState().flags.dragonUnlocked = true;
  api.getState().party.ryn.dp = 30;
  api.startBattle(["glassHound"], { background: "cave", boss: true });
  await api.useDragon();
  await settle();
  assert.ok(api.getBattle(), "Drachenform darf den Bosskampf nicht beenden");
  assert.ok(api.getBattle().dragonTurns > 0, "Drachenform muss mehrere Runden aktiv sein");
  assert.equal(api.getState().party.ryn.dp, 20, "Transformation muss DP kosten");

  assert.equal(
    routeExists(
      api,
      api.getData().maps.reliquary,
      api.getData().maps.reliquary.spawn,
      api.getData().maps.reliquary.triggers[0],
      api.getData().maps.reliquary.triggers[0].radius
    ),
    true,
    "Der Reliquiar-Boss muss über die Plattformen erreichbar sein"
  );

  api.save();
  const restored = api.loadSave();
  assert.equal(restored.flags.dragonUnlocked, true);
  assert.equal(restored.scene, "whisperwood");

  api.renderNow();
  console.log("EMBERBOUND smoke test: OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
