(function () {
  "use strict";

  const rows = (list) => list.map((row) => row.padEnd(30, "#").slice(0, 30));

  window.EMBERBOUND_DATA = {
    version: "0.3.0",
    title: "EMBERBOUND",
    subtitle: "Erbe der ersten Flamme",

    characters: {
      ryn: {
        name: "Ryn",
        role: "Kind der Brut",
        portrait: 0,
        sprite: {
          down: 0, side: 1, up: 2, walk: 3, idle: 4, action: 5,
          dragonIdle: 22, dragonAction: 23
        },
        base: { hp: 108, sp: 28, dp: 30, atk: 18, mag: 12, def: 12, spd: 15 },
        growth: { hp: 13, sp: 4, dp: 2, atk: 3, mag: 2, def: 2, spd: 2 },
        equipment: { weapon: "emberKnife", armor: "travelCoat", accessory: null },
        skills: [
          { id: "emberCut", name: "Glutschnitt", cost: 5, kind: "damage", power: 1.55, element: "fire" }
        ]
      },
      liora: {
        name: "Liora",
        role: "Runenlauscherin",
        portrait: 1,
        sprite: { down: 6, side: 7, up: 8, walk: 9, idle: 10, action: 11 },
        base: { hp: 82, sp: 48, dp: 0, atk: 9, mag: 21, def: 9, spd: 17 },
        growth: { hp: 9, sp: 7, dp: 0, atk: 1, mag: 4, def: 2, spd: 3 },
        equipment: { weapon: "runeBranch", armor: "scholarMantle", accessory: null },
        skills: [
          { id: "mend", name: "Runenheilung", cost: 6, kind: "heal", power: 1.7, element: "light" },
          { id: "shard", name: "Echosplitter", cost: 7, kind: "damage", power: 1.7, element: "aether" }
        ]
      },
      bram: {
        name: "Bram",
        role: "Eidbrecher",
        portrait: 2,
        sprite: { down: 12, side: 13, up: 14, walk: 15, idle: 16, action: 17 },
        base: { hp: 142, sp: 22, dp: 0, atk: 23, mag: 6, def: 20, spd: 8 },
        growth: { hp: 17, sp: 3, dp: 0, atk: 4, mag: 1, def: 4, spd: 1 },
        equipment: { weapon: "oathSpear", armor: "wornPlate", accessory: null },
        skills: [
          { id: "breaker", name: "Wachtbrecher", cost: 5, kind: "damage", power: 1.8, element: "physical" }
        ]
      }
    },

    items: {
      herb: {
        name: "Glutkraut", type: "consumable",
        description: "Stellt 55 LP wieder her.", effect: { hp: 55 }
      },
      etherSeed: {
        name: "Äthersaat", type: "consumable",
        description: "Stellt 24 SP wieder her.", effect: { sp: 24 }
      },
      emberTonic: {
        name: "Brutessenz", type: "consumable",
        description: "Stellt Ryn 12 DP wieder her.", effect: { dp: 12 }, target: ["ryn"]
      },
      emberKnife: {
        name: "Glasmesser", type: "equipment", slot: "weapon", allowed: ["ryn"],
        description: "Kurze Klinge aus Ofenglas.", bonuses: { atk: 4, spd: 1 }
      },
      runeBranch: {
        name: "Runenzweig", type: "equipment", slot: "weapon", allowed: ["liora"],
        description: "Leitet flüsternde Runen.", bonuses: { mag: 5, sp: 4 }
      },
      oathSpear: {
        name: "Eidlanze", type: "equipment", slot: "weapon", allowed: ["bram"],
        description: "Brams einzige Erinnerung an seinen alten Eid.", bonuses: { atk: 6, def: 1 }
      },
      travelCoat: {
        name: "Reisemantel", type: "equipment", slot: "armor", allowed: ["ryn"],
        description: "Leicht und vertraut.", bonuses: { def: 3, hp: 8 }
      },
      scholarMantle: {
        name: "Lauschermantel", type: "equipment", slot: "armor", allowed: ["liora"],
        description: "Mit leisen Schutzrunen vernäht.", bonuses: { def: 3, sp: 6 }
      },
      wornPlate: {
        name: "Gekerbte Platte", type: "equipment", slot: "armor", allowed: ["bram"],
        description: "Schwer, aber zuverlässig.", bonuses: { def: 6, hp: 12, spd: -1 }
      },
      mossCharm: {
        name: "Moostalisman", type: "equipment", slot: "accessory",
        description: "Ein lebender Knoten aus Waldgarn.", bonuses: { hp: 18, def: 2 }
      },
      glassBand: {
        name: "Erinnerungsring", type: "equipment", slot: "accessory",
        description: "Pulsiert im Takt vergessener Stimmen.", bonuses: { mag: 4, sp: 8 }
      }
    },

    enemies: {
      mossHare: {
        name: "Mooshorn", sprite: { idle: 0, action: 1 },
        hp: 48, atk: 11, def: 6, spd: 12, xp: 13, gold: 7, weakness: "fire",
        drops: [{ id: "herb", chance: 0.38 }]
      },
      ashBandit: {
        name: "Aschenräuber", sprite: { idle: 2, action: 3 },
        hp: 72, atk: 16, def: 9, spd: 15, xp: 21, gold: 14, weakness: "aether",
        drops: [{ id: "etherSeed", chance: 0.18 }]
      },
      memoryShard: {
        name: "Erinnerungsscherbe", sprite: { idle: 4, action: 5 },
        hp: 96, atk: 19, def: 11, spd: 13, xp: 34, gold: 20, weakness: "physical",
        drops: [{ id: "mossCharm", chance: 0.45 }]
      },
      glassHound: {
        name: "Glashund", sprite: { idle: 6, action: 7 },
        hp: 410, atk: 24, def: 15, spd: 14, xp: 160, gold: 90, weakness: "fire", boss: true,
        drops: [{ id: "glassBand", chance: 1 }]
      }
    },

    maps: {
      hollow: {
        name: "Kohlgrund",
        chapter: "Kapitel I · Das Kind im Glas",
        palette: "village",
        background: "hollow",
        spawn: { x: 240, y: 246 },
        walkZones: [
          { kind: "ellipse", x: 230, y: 142, rx: 76, ry: 48 },
          { kind: "capsule", ax: 240, ay: 142, bx: 240, by: 272, r: 23 },
          { kind: "capsule", ax: 225, ay: 143, bx: 478, by: 112, r: 22 },
          { kind: "capsule", ax: 218, ay: 136, bx: 151, by: 91, r: 20 },
          { kind: "capsule", ax: 205, ay: 154, bx: 112, by: 190, r: 17 }
        ],
        obstacles: [
          { kind: "ellipse", x: 194, y: 147, rx: 14, ry: 10 }
        ],
        tiles: rows([
          "##############################",
          "#....BBBBBB........BBBBBBB...#",
          "#....BBBBBB........BBBBBBB...#",
          "#....BBBBBB..................#",
          "#............................#",
          "#..======.............=====..#",
          "#..=....=....~~~~~....=...=..#",
          "#..=....=====~~~======....=..#",
          "#..=......................===E",
          "#..======....====....======..#",
          "#......=.....=..=....=.......#",
          "#..BBBBBB....=..=....BBBBB...#",
          "#..BBBBBB....====....BBBBB...#",
          "#............................#",
          "#..........==========........#",
          "#............................#",
          "##############################"
        ]),
        exits: [
          { id: "world", x: 470, y: 112, radius: 15, to: "world", label: "Zur Glutmark" }
        ],
        npcs: [
          { id: "elder", name: "Mara", x: 216, y: 154, look: "elder", action: "elder" },
          { id: "liora", name: "Liora", x: 254, y: 126, hero: "liora", action: "liora" },
          { id: "bram", name: "Bram", x: 332, y: 151, hero: "bram", action: "bram" }
        ],
        triggers: []
      },

      whisperwood: {
        name: "Flüsterforst",
        chapter: "Kapitel I · Stimmen unter Rinde",
        palette: "forest",
        background: "whisperwood",
        spawn: { x: 24, y: 216 },
        walkZones: [
          { kind: "capsule", ax: -8, ay: 222, bx: 83, by: 192, r: 21 },
          { kind: "capsule", ax: 83, ay: 192, bx: 165, by: 173, r: 19 },
          { kind: "capsule", ax: 165, ay: 173, bx: 204, by: 153, r: 15 },
          { kind: "capsule", ax: 204, ay: 153, bx: 229, by: 132, r: 12 },
          { kind: "capsule", ax: 229, ay: 132, bx: 266, by: 91, r: 17 },
          { kind: "capsule", ax: 266, ay: 91, bx: 291, by: 47, r: 15 },
          { kind: "ellipse", x: 291, y: 47, rx: 31, ry: 24 }
        ],
        obstacles: [],
        danger: 0.018,
        encounters: ["mossHare", "mossHare", "ashBandit"],
        tiles: rows([
          "##############################",
          "##########....^^....##########",
          "######......======......######",
          "#####...^^..=....=..^^...#####",
          "####........=....=........####",
          "###..~~~~...=....=...~~~~..###",
          "##...~~~~...======...~~~~...##",
          "#....~~~..............~~~....#",
          "E============================#",
          "#....~~~......^^......~~~....#",
          "##...~~~~....^^^^....~~~~...##",
          "###..~~~~.....^^.....~~~~..###",
          "####........======........####",
          "#####..^^...=....=...^^..#####",
          "######......=....=......######",
          "##########..======..##########",
          "##############################"
        ]),
        exits: [
          { id: "world", x: 8, y: 220, radius: 15, to: "world", label: "Zur Glutmark" }
        ],
        npcs: [],
        triggers: [
          { id: "forestEcho", x: 291, y: 47, radius: 23, action: "forestEcho" }
        ]
      },

      reliquary: {
        name: "Gläsernes Reliquiar",
        chapter: "Kapitel I · Blut ohne Erinnerung",
        palette: "cave",
        background: "reliquary",
        spawn: { x: 17, y: 86 },
        walkZones: [
          { kind: "capsule", ax: -8, ay: 79, bx: 88, by: 123, r: 14 },
          { kind: "capsule", ax: 88, ay: 123, bx: 111, by: 151, r: 17 },
          { kind: "ellipse", x: 111, y: 151, rx: 45, ry: 34 },
          { kind: "capsule", ax: 111, ay: 151, bx: 190, by: 195, r: 14 },
          { kind: "ellipse", x: 190, y: 195, rx: 33, ry: 25 },
          { kind: "capsule", ax: 190, ay: 195, bx: 242, by: 154, r: 13 },
          { kind: "ellipse", x: 272, y: 139, rx: 49, ry: 35 },
          { kind: "capsule", ax: 242, ay: 154, bx: 272, by: 139, r: 17 },
          { kind: "capsule", ax: 272, ay: 139, bx: 361, by: 113, r: 14 },
          { kind: "capsule", ax: 361, ay: 113, bx: 420, by: 91, r: 17 },
          { kind: "ellipse", x: 402, y: 96, rx: 48, ry: 31 }
        ],
        obstacles: [],
        danger: 0.012,
        encounters: ["memoryShard", "ashBandit"],
        tiles: rows([
          "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
          "CCCCC....................CCCCC",
          "CCC....^^^^......^^^^......CCC",
          "CC...^^....======....^^.....CC",
          "CC.........=....=...........CC",
          "C..XXXX....=....=....XXXX....C",
          "C..XXXX....======....XXXX....C",
          "C............................C",
          "E============================C",
          "C............................C",
          "C..XXXX....======....XXXX....C",
          "C..XXXX....=....=....XXXX....C",
          "CC.........=....=...........CC",
          "CC...^^....======....^^.....CC",
          "CCC....^^^^......^^^^......CCC",
          "CCCCC....................CCCCC",
          "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
        ]),
        exits: [
          { id: "world", x: 7, y: 82, radius: 15, to: "world", label: "Zur Glutmark" }
        ],
        npcs: [],
        triggers: [
          { id: "glassHound", x: 420, y: 91, radius: 28, action: "glassHound" }
        ]
      }
    },

    world: {
      name: "Glutmark",
      start: { x: 105, y: 194 },
      bounds: { left: 18, top: 18, right: 462, bottom: 250 },
      nodes: [
        { id: "hollow", name: "Kohlgrund", x: 94, y: 189, to: "hollow", unlock: null },
        { id: "whisperwood", name: "Flüsterforst", x: 103, y: 68, to: "whisperwood", unlock: "worldOpen" },
        { id: "crystalShrine", name: "Scherbenschrein", x: 240, y: 44, to: null, unlock: "forestEcho", future: true },
        { id: "dragonHill", name: "Knochenhöhe", x: 368, y: 66, to: null, unlock: "chapterOneComplete", future: true },
        { id: "reliquary", name: "Gläsernes Reliquiar", x: 397, y: 143, to: "reliquary", unlock: "reliquaryOpen" }
      ],
      paths: [
        [[94, 189], [144, 171], [204, 155], [244, 149], [309, 150], [397, 143]],
        [[204, 155], [181, 119], [143, 94], [103, 68]],
        [[244, 149], [238, 99], [240, 44]],
        [[309, 150], [339, 118], [368, 66]]
      ],
      blocked: [
        { kind: "ellipse", x: 103, y: 65, rx: 72, ry: 50 },
        { kind: "ellipse", x: 369, y: 69, rx: 70, ry: 45 },
        { kind: "ellipse", x: 399, y: 143, rx: 42, ry: 34 },
        { kind: "rect", x: 185, y: 202, w: 112, h: 68 }
      ]
    },

    dialogue: {
      intro: [
        { speaker: "Erzähler", text: "Sechzehn Jahre zuvor fiel über Kohlgrund ein Regen aus schwarzem Glas. Kein Stück davon war heiß – bis auf eines." },
        { speaker: "Mara", text: "Im alten Ofen lag kein Drache. Dort lag ein Kind, umschlossen von einer Schale, die im Takt seines Herzens glühte." },
        { speaker: "Stimme der Brut", text: "Wir gaben ihm keine Erinnerung. Nur die Freiheit, selbst eine zu werden." },
        { speaker: "Ryn", text: "Wieder dieser Traum ... Flügel über einer Stadt, deren Namen ich nie gelernt habe." },
        { speaker: "Liora", text: "Ryn. Wach auf. Dein Anhänger glüht, und diesmal antworten die Runen im Wald darauf." },
        { speaker: "Ryn", text: "Mara hat mir sechzehn Jahre lang gesagt, er sei nur ein Stück Ofenglas." },
        { speaker: "Liora", text: "Dann wird es Zeit, dass sie dir sagt, warum Ofenglas deinen Namen kennt. Sie wartet am Brunnen." }
      ],
      elderStart: [
        { speaker: "Mara", text: "Vor sechzehn Jahren fanden wir dich im Glas unter dem alten Ofen. Kein Säugling – ein Funke, der einen Namen suchte." },
        { speaker: "Ryn", text: "Du hast gesagt, meine Eltern seien Reisende gewesen." },
        { speaker: "Mara", text: "Das war die freundlichste Lüge, die ich kannte. Du bist von der Brut, Ryn. Von jenen, die Menschen Drachen nannten." },
        { speaker: "Liora", text: "Im Flüsterforst ist eine Erinnerungsscherbe erwacht. Wenn sie auf dein Blut reagiert, wissen wir es sicher." },
        { speaker: "Mara", text: "Geht zusammen. Und nehmt Bram mit. Er kennt die Männer, die eure Art aus der Geschichte schneiden wollten." }
      ],
      bramJoin: [
        { speaker: "Bram", text: "Ich diente dem Orden der Stillen Krone. Wir jagten die Brut, weil man uns sagte, Drachen hätten keine Seele." },
        { speaker: "Bram", text: "Dann sah ich einen Drachen sterben, um ein Menschendorf zu retten. Seitdem schulde ich deiner Art mehr als mein Leben." }
      ],
      forestEcho: [
        { speaker: "Stimme im Splitter", text: "Kleines Herz. Fremder Name. Unser Blut schläft nicht – es erinnert sich." },
        { speaker: "Ryn", text: "Ich höre sie. Tausend Stimmen ... und eine Tür unter dem östlichen Berg." },
        { speaker: "Liora", text: "Das Gläserne Reliquiar. Dort hat der Orden die letzten Drachenerinnerungen eingeschlossen." }
      ],
      forestAfter: [
        { speaker: "Ryn", text: "Die Scherbe ist still, aber ihre Erinnerung steckt noch in mir. Ich sah Mara – jünger – und Männer mit weißen Kronen vor unserem Ofen." },
        { speaker: "Bram", text: "Die Stille Krone suchte damals kein Drachenkind. Wir suchten einen Schlüssel. Ich wusste nicht, dass beides dasselbe war." },
        { speaker: "Liora", text: "Du warst dort?" },
        { speaker: "Bram", text: "Vor der Tür. Mara log uns an und rettete damit Ryns Leben. Meine Lanze sorgte dafür, dass niemand ihre Stimme ein zweites Mal prüfte." },
        { speaker: "Ryn", text: "Du hast mich gerettet, ohne zu wissen, was ich bin." },
        { speaker: "Bram", text: "Nein. Ich habe einmal die richtige Entscheidung getroffen. Jetzt muss ich lernen, mehr als diese eine zu sein." },
        { speaker: "Liora", text: "Der Splitter hat im Osten einen Weg geöffnet. Im Reliquiar finden wir heraus, warum der Orden dich Schlüssel nennt." }
      ],
      houndAwakening: [
        { speaker: "Glashund", text: "BRUTSIGNATUR ERKANNT. ERINNERUNG WIRD GELÖSCHT." },
        { speaker: "Ryn", text: "Nein. Diesmal nehme ich meinen Namen zurück." },
        { speaker: "Stimme der Brut", text: "Dann öffne die Hand, Kind. Der Drache ist keine Maske. Er ist die Form deiner Wahrheit." }
      ],
      chapterEnd: [
        { speaker: "Liora", text: "Deine Augen ... sie sind wieder menschlich." },
        { speaker: "Ryn", text: "Beides ist menschlich. Beides ist Drache. Vielleicht war genau diese Trennung immer die Lüge." },
        { speaker: "Bram", text: "Dann finden wir heraus, wer von dieser Lüge noch profitiert. Die Knochenhöhe wartet." }
      ]
    }
  };
})();
