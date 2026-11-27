'use strict';
/* ==========================================================================
   AETHER DEFENSE: GACHA TD — 0.02 BETA  (game script)
   Companion file: aether_defense_0.02_beta.html  (keep both in the same folder)

   HOW TO EXTEND THE GAME
   - New unit      -> add an entry to UNIT_ROSTER (section 1). Add an EVOLUTIONS entry to make it evolvable.
   - New banner    -> add an entry to BANNERS.
   - New stage     -> add an entry to STAGES (axis-aligned waypoints on a 16x10 grid).
   - New trial     -> add an entry to TRIALS. New material -> add to MATERIALS.
   - New aura      -> add to AURAS and give a unit that passiveType.
   - New passive   -> add the logic to applyDamageToEnemy / fireTowerAttack.
   ========================================================================== */

/* ==========================================================================
   1. GAME DATABASE
   ========================================================================== */
const VERSION = '0.02 Beta';
const RARITIES = {
  common:    { name: 'Common',    rate: 55.00, color: '#94a3b8', mult: 1.0,  cap: 6 },
  rare:      { name: 'Rare',      rate: 27.00, color: '#38bdf8', mult: 1.35, cap: 5 },
  epic:      { name: 'Epic',      rate: 12.00, color: '#a855f7', mult: 1.85, cap: 4 },
  legendary: { name: 'Legendary', rate: 4.50,  color: '#f59e0b', mult: 2.65, cap: 3 },
  mythic:    { name: 'Mythic',    rate: 1.35,  color: '#f43f5e', mult: 3.9,  cap: 2 },
  secret:    { name: 'Secret',    rate: 0.15,  color: '#2dd4bf', mult: 6.2,  cap: 1 }
};
const RARITY_ORDER = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5, secret: 6 };
const MAX_LEVEL = 30;
const MAX_STARS = 10;
const FREE_GEMS_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const MATERIALS = {
  essence: { name: 'Aether Essence', icon: '✨', color: '#38bdf8', desc: 'Common evolution catalyst.', source: 'Trial of Echoes, and every expedition.' },
  alloy:   { name: 'Titan Alloy',    icon: '🔩', color: '#cbd5e1', desc: 'Reinforces evolved frames.', source: 'Trial of Iron.' },
  ember:   { name: 'Ember Core',     icon: '🔥', color: '#fb923c', desc: 'Burning heart of evolved units.', source: 'Trial of Cinders.' },
  void:    { name: 'Void Prism',     icon: '🔮', color: '#c084fc', desc: 'Rare crystal required by Mythic+ evolutions.', source: 'Trial of the Abyss (boss rush).' }
};

const UNIT_ROSTER = [
  /* ---------- COMMON ---------- */
  { id: 'c_scout', name: 'Aether Scout', rarity: 'common', icon: '🏹', cost: 60, dmg: 18, rng: 135, spa: 0.85, attackType: 'single', projColor: '#cbd5e1',
    passiveName: 'Eagle Eye', passiveDesc: '+10% Range and +15% DMG against Fast enemies.', passiveType: 'fast_slayer' },
  { id: 'c_militia', name: 'Iron Guard', rarity: 'common', icon: '🗡️', cost: 70, dmg: 28, rng: 95, spa: 1.05, attackType: 'single', projColor: '#e2e8f0',
    passiveName: 'Armor Breaker', passiveDesc: 'Ignores enemy armor and deals +25% DMG to Armored foes.', passiveType: 'armor_pierce' },
  { id: 'c_apprentice', name: 'Spark Novice', rarity: 'common', icon: '🪄', cost: 80, dmg: 16, rng: 125, spa: 1.15, attackType: 'splash', splashRadius: 48, projColor: '#60a5fa',
    passiveName: 'Static Pop', passiveDesc: 'Mini splash explosion hits clustered enemies.', passiveType: 'splash_boost' },
  { id: 'c_prospector', name: 'Copper Miner', rarity: 'common', icon: '⛏️', cost: 90, dmg: 10, rng: 90, spa: 1.6, attackType: 'farm', projColor: '#fbbf24', cap: 4,
    passiveName: 'Gold Vein', passiveDesc: 'Generates +$35 Cash at the end of every wave (+45%/tier).', passiveType: 'gold_rush', farmBase: 35 },

  /* ---------- RARE ---------- */
  { id: 'r_frost', name: 'Cryo Archer', rarity: 'rare', icon: '❄️', cost: 110, dmg: 24, rng: 145, spa: 0.95, attackType: 'slow', slowPct: 0.30, slowDur: 2.2, projColor: '#38bdf8',
    passiveName: 'Frostbite', passiveDesc: 'Chills targets, slowing movement speed by 30% for 2.2s.', passiveType: 'frostbite' },
  { id: 'r_pyro', name: 'Ember Gunner', rarity: 'rare', icon: '🔥', cost: 125, dmg: 26, rng: 130, spa: 1.0, attackType: 'burn', burnDps: 14, burnDur: 3.0, projColor: '#fb923c',
    passiveName: 'Ignite', passiveDesc: 'Sets enemies ablaze for 3s, dealing continuous burn damage.', passiveType: 'ignite' },
  { id: 'r_mortar', name: 'Siege Cannoneer', rarity: 'rare', icon: '💣', cost: 140, dmg: 44, rng: 165, spa: 1.65, attackType: 'splash', splashRadius: 68, projColor: '#f59e0b',
    passiveName: 'Concussion Shell', passiveDesc: 'Heavy explosive shells deal full AoE splash damage.', passiveType: 'splash_boost' },
  { id: 'r_merchant', name: 'Guild Broker', rarity: 'rare', icon: '💰', cost: 150, dmg: 18, rng: 110, spa: 1.4, attackType: 'farm', projColor: '#fcd34d', cap: 3,
    passiveName: 'Trade Dividend', passiveDesc: 'Generates +$65 Cash every wave (+45%/tier).', passiveType: 'gold_rush', farmBase: 65 },
  { id: 'r_bard', name: 'Rally Bard', rarity: 'rare', icon: '🎺', cost: 130, dmg: 20, rng: 125, spa: 1.1, attackType: 'single', projColor: '#fde68a', cap: 3,
    passiveName: 'Battle Hymn', passiveDesc: 'Allies in range deal +12% DMG.', passiveType: 'rally_aura' },
  { id: 'r_thorn', name: 'Thorn Ranger', rarity: 'rare', icon: '🌿', cost: 120, dmg: 22, rng: 150, spa: 1.0, attackType: 'burn', burnDps: 11, burnDur: 4.0, slowPct: 0.15, slowDur: 2.0, projColor: '#86efac',
    passiveName: 'Venom Thorns', passiveDesc: 'Poisons for 4s and slows targets by 15%.', passiveType: 'venom' },

  /* ---------- EPIC ---------- */
  { id: 'e_storm', name: 'Tempest Caller', rarity: 'epic', icon: '⚡', cost: 185, dmg: 52, rng: 155, spa: 1.1, attackType: 'chain', chainCount: 3, projColor: '#c084fc',
    passiveName: 'Chain Lightning', passiveDesc: 'Arcs lightning to up to 3 nearby enemies per shot.', passiveType: 'chain' },
  { id: 'e_sniper', name: 'Void Marksman', rarity: 'epic', icon: '🎯', cost: 200, dmg: 125, rng: 245, spa: 1.85, attackType: 'single', projColor: '#e879f9',
    passiveName: 'Executioner', passiveDesc: '+55% DMG to Bosses & enemies below 35% HP.', passiveType: 'executioner' },
  { id: 'e_chrono', name: 'Chrono Adept', rarity: 'epic', icon: '⏳', cost: 190, dmg: 35, rng: 140, spa: 1.0, attackType: 'slow', slowPct: 0.42, slowDur: 2.5, projColor: '#818cf8',
    passiveName: 'Chrono Aura', passiveDesc: 'Allies in range attack 12% faster; slows foes 42%.', passiveType: 'chrono_aura' },
  { id: 'e_venom', name: 'Plague Alchemist', rarity: 'epic', icon: '🧪', cost: 180, dmg: 38, rng: 145, spa: 1.15, attackType: 'splash_burn', splashRadius: 65, burnDps: 28, burnDur: 4.0, projColor: '#4ade80',
    passiveName: 'Corrosive Acid', passiveDesc: 'Toxic splash melts armor (ignored) and inflicts heavy 4s poison.', passiveType: 'acid' },
  { id: 'e_gale', name: 'Gale Dancer', rarity: 'epic', icon: '🌪️', cost: 175, dmg: 30, rng: 135, spa: 0.42, attackType: 'single', projColor: '#a7f3d0',
    passiveName: 'Cyclone Flurry', passiveDesc: 'Blindingly fast attacks. +10% Range and +15% DMG vs Fast enemies.', passiveType: 'fast_slayer' },

  /* ---------- LEGENDARY ---------- */
  { id: 'l_valkyrie', name: 'Solar Valkyrie', rarity: 'legendary', icon: '☀️', cost: 280, dmg: 115, rng: 175, spa: 0.85, attackType: 'splash', splashRadius: 80, projColor: '#fbbf24',
    critChance: 0.25, critMult: 3.0,
    passiveName: 'Radiant Wrath', passiveDesc: '25% Critical Strike chance for 3.0x Solar AoE Damage.', passiveType: 'crit_overload' },
  { id: 'l_glacial', name: 'Glacial Sovereign', rarity: 'legendary', icon: '🧊', cost: 270, dmg: 85, rng: 185, spa: 1.15, attackType: 'freeze', slowPct: 0.55, slowDur: 3.0, stunChance: 0.22, projColor: '#7dd3fc',
    passiveName: 'Absolute Zero', passiveDesc: 'Slows foes by 55% with a 22% chance to freeze solid for 1.1s.', passiveType: 'absolute_zero' },
  { id: 'l_midas', name: 'Archon of Midas', rarity: 'legendary', icon: '👑', cost: 300, dmg: 75, rng: 160, spa: 1.05, attackType: 'farm_attack', projColor: '#fde047', cap: 2,
    passiveName: 'Golden Decree', passiveDesc: 'Generates +$130 Cash every wave (+45%/tier) & +15% DMG aura.', passiveType: 'midas_aura', farmBase: 130 },
  { id: 'l_tide', name: 'Tidecaller', rarity: 'legendary', icon: '🌊', cost: 275, dmg: 70, rng: 170, spa: 1.1, attackType: 'chain', chainCount: 4, slowPct: 0.40, slowDur: 2.5, projColor: '#22d3ee',
    passiveName: 'Riptide', passiveDesc: 'Waves chain through 4 foes, slowing each by 40%.', passiveType: 'riptide' },
  { id: 'l_drake', name: 'Drake Rider', rarity: 'legendary', icon: '🐉', cost: 290, dmg: 95, rng: 170, spa: 1.0, attackType: 'splash_burn', splashRadius: 78, burnDps: 45, burnDur: 3.5, projColor: '#fb923c', exclusive: 'eclipse',
    passiveName: 'Dragonfire', passiveDesc: 'Fire breath splashes a wide area and leaves a scorching burn.', passiveType: 'dragonfire' },

  /* ---------- MYTHIC ---------- */
  { id: 'm_crimson', name: 'Crimson Reaper', rarity: 'mythic', icon: '🩸', cost: 420, dmg: 240, rng: 195, spa: 0.75, attackType: 'chain', chainCount: 5, projColor: '#fb7185',
    passiveName: 'Soul Harvest', passiveDesc: 'Slashes 5 targets at once; every kill permanently adds +1% DMG this run.', passiveType: 'soul_harvest' },
  { id: 'm_seraph', name: 'Astral Seraph', rarity: 'mythic', icon: '🪽', cost: 450, dmg: 210, rng: 230, spa: 0.9, attackType: 'splash_burn', splashRadius: 95, burnDps: 85, burnDur: 4.0, projColor: '#f43f5e',
    passiveName: 'Celestial Hymn', passiveDesc: "Boosts nearby allies' DMG by +20% and incinerates waves with starfire.", passiveType: 'seraph_aura' },
  { id: 'm_railgun', name: 'Hyperion Obliterator', rarity: 'mythic', icon: '☄️', cost: 460, dmg: 520, rng: 280, spa: 1.55, attackType: 'pierce', projColor: '#fda4af',
    passiveName: 'Orbital Beam', passiveDesc: 'Fires a piercing hyper-beam hitting all enemies in a line for +55% Boss DMG.', passiveType: 'orbital_pierce' },
  { id: 'm_titan', name: 'Stormforged Titan', rarity: 'mythic', icon: '🗿', cost: 430, dmg: 680, rng: 170, spa: 1.7, attackType: 'splash', splashRadius: 60, stunChance: 0.25, projColor: '#fbbf24',
    passiveName: 'Thunderfall', passiveDesc: 'Colossal slams stun 25% of the time (1.1s) and deal +40% DMG to Bosses.', passiveType: 'titan' },
  { id: 'm_eclipse', name: 'Eclipse Monarch', rarity: 'mythic', icon: '🌑', cost: 440, dmg: 230, rng: 215, spa: 0.85, attackType: 'splash_burn', splashRadius: 90, burnDps: 70, burnDur: 4.0, slowPct: 0.35, slowDur: 2.5, projColor: '#a78bfa', exclusive: 'eclipse',
    passiveName: 'Total Eclipse', passiveDesc: 'Umbral blasts slow foes 35% and burn; allies in range deal +18% DMG.', passiveType: 'eclipse_aura' },

  /* ---------- SECRET ---------- */
  { id: 's_chronos', name: 'OMEGA: Void Sovereign', rarity: 'secret', icon: '🌌', cost: 650, dmg: 480, rng: 260, spa: 0.55, attackType: 'chain_splash', chainCount: 6, splashRadius: 90, projColor: '#2dd4bf',
    critChance: 0.35, critMult: 3.5,
    passiveName: 'Singularity Collapse', passiveDesc: '35% chance for 3.5x Cosmic Crit, chains 6 AoE blasts, & slows all hit foes 50%.', passiveType: 'singularity' },
  { id: 's_architect', name: 'AEON: Genesis Prism', rarity: 'secret', icon: '💠', cost: 700, dmg: 420, rng: 250, spa: 0.65, attackType: 'prism', chainCount: 4, projColor: '#c084fc',
    passiveName: 'Reality Rewrite', passiveDesc: 'Generates +$220 Cash/wave, boosts nearby allies +25% DMG & 18% faster attacks, melts armor.', passiveType: 'genesis_aura', farmBase: 220 },
  { id: 's_dawn', name: 'ZENITH: Eternal Dawn', rarity: 'secret', icon: '🌅', cost: 680, dmg: 450, rng: 255, spa: 0.6, attackType: 'chain_splash', chainCount: 5, splashRadius: 85, projColor: '#fde68a', exclusive: 'eclipse',
    critChance: 0.30, critMult: 3.0, farmBase: 180,
    passiveName: 'Dawn Without End', passiveDesc: 'Chains 5 solar blasts, 30% crit for 3x, +$180 Cash/wave and allies deal +20% DMG.', passiveType: 'dawn_aura' }
];
UNIT_ROSTER.forEach(u => { u.color = RARITIES[u.rarity].color; });
const UNIT_MAP = Object.fromEntries(UNIT_ROSTER.map(u => [u.id, u]));

/* Aura passives: dmg = additive DMG bonus, spa = attack-interval multiplier (<1 = faster) */
const AURAS = {
  chrono_aura:  { spa: 0.88 },
  midas_aura:   { dmg: 0.15 },
  seraph_aura:  { dmg: 0.20 },
  genesis_aura: { dmg: 0.25, spa: 0.82 },
  rally_aura:   { dmg: 0.12 },
  eclipse_aura: { dmg: 0.18 },
  dawn_aura:    { dmg: 0.20 }
};

/* ---------- EVOLUTIONS (Mythic+ always, plus chosen Legendaries) ---------- */
const EVO_TIERS = {
  legendary: { reqLevel: 15, gold: 3000,  mats: { essence: 40,  alloy: 15, ember: 10 } },
  mythic:    { reqLevel: 20, gold: 8000,  mats: { essence: 80,  alloy: 30, ember: 25, void: 8 } },
  secret:    { reqLevel: 25, gold: 20000, mats: { essence: 150, alloy: 60, ember: 50, void: 25 } }
};
const EVOLUTIONS = {
  l_valkyrie: { name: 'Solar Empress Valkyrie', icon: '🌞', dmgMult: 1.7, rngMult: 1.1, spaMult: 0.9, splashMult: 1.25, capBonus: 1,
    set: { critChance: 0.35, critMult: 3.5 }, passiveName: 'Radiant Dominion', passiveDesc: '35% crit chance for 3.5x Solar AoE with a much wider blast.' },
  l_glacial:  { name: 'Cocytus Overlord', icon: '🏔️', dmgMult: 1.6, rngMult: 1.1, spaMult: 0.92, capBonus: 1,
    set: { slowPct: 0.65, stunChance: 0.35 }, passiveName: 'Eternal Winter', passiveDesc: 'Slows foes 65% with a 35% chance to freeze solid for 1.1s.' },
  l_drake:    { name: 'Elder Dragon Emperor', icon: '🐲', dmgMult: 1.7, rngMult: 1.1, spaMult: 0.9, splashMult: 1.3, burnMult: 1.6, capBonus: 1,
    passiveName: 'Apocalypse Breath', passiveDesc: 'Colossal fire breath with 60% stronger burn and a huge blast radius.' },

  m_crimson:  { name: 'Blood Moon Sovereign', icon: '🧛', dmgMult: 1.8, rngMult: 1.1, spaMult: 0.88, chainBonus: 3, capBonus: 1,
    set: { soulCap: 4.5 }, passiveName: 'Crimson Feast', passiveDesc: 'Slashes 8 targets at once; soul stacking cap raised to +450% DMG.' },
  m_seraph:   { name: 'Astral Archangel', icon: '🕊️', dmgMult: 1.75, rngMult: 1.12, spaMult: 0.9, splashMult: 1.2, burnMult: 1.5, auraMult: 1.6, capBonus: 1,
    passiveName: 'Heaven\'s Choir', passiveDesc: 'Ally DMG aura grows to +32% and starfire burns 50% hotter.' },
  m_railgun:  { name: 'Hyperion Annihilator Mk.II', icon: '🛰️', dmgMult: 1.9, rngMult: 1.15, spaMult: 0.85, capBonus: 1,
    passiveName: 'Orbital Lance', passiveDesc: 'Massively upgraded piercing beam with longer reach and faster recharge.' },
  m_titan:    { name: 'Worldbreaker Titan', icon: '🌋', dmgMult: 1.85, rngMult: 1.1, spaMult: 0.88, splashMult: 1.4, capBonus: 1,
    set: { stunChance: 0.40 }, passiveName: 'Cataclysm', passiveDesc: 'Slams stun 40% of the time over a huge radius.' },
  m_eclipse:  { name: 'Totality Monarch', icon: '🌘', dmgMult: 1.8, rngMult: 1.12, spaMult: 0.88, splashMult: 1.25, burnMult: 1.5, auraMult: 1.6, capBonus: 1,
    set: { slowPct: 0.5 }, passiveName: 'Endless Night', passiveDesc: 'Slows 50%, burns harder, and the ally DMG aura rises to +29%.' },

  s_chronos:  { name: 'OMEGA PRIME: Void Emperor', icon: '🕳️', dmgMult: 1.9, rngMult: 1.1, spaMult: 0.85, chainBonus: 3, splashMult: 1.25, capBonus: 1,
    set: { critChance: 0.45, critMult: 4.0 }, passiveName: 'Event Horizon', passiveDesc: '45% chance for 4x crit, chains 9 AoE blasts across the battlefield.' },
  s_architect:{ name: 'AEON PRIME: Genesis Throne', icon: '🔱', dmgMult: 1.9, rngMult: 1.1, spaMult: 0.85, chainBonus: 2, farmMult: 1.6, auraMult: 1.5,
    passiveName: 'Reality Sovereign', passiveDesc: 'Cash generation +60%, ally aura +50% stronger, chains 6 prism beams.' },
  s_dawn:     { name: 'ZENITH PRIME: Eternal Sunrise', icon: '🌄', dmgMult: 1.9, rngMult: 1.1, spaMult: 0.85, chainBonus: 3, splashMult: 1.25, farmMult: 1.6, auraMult: 1.5, capBonus: 1,
    set: { critChance: 0.4, critMult: 3.5 }, passiveName: 'Daybreak Eternal', passiveDesc: 'Chains 8 solar blasts, 40% crit for 3.5x, +60% cash and a stronger ally aura.' }
};
const evoCache = {};
function evoReq(id) { return EVO_TIERS[UNIT_MAP[id].rarity]; }
function getEvolvedDef(id) {
  if (evoCache[id]) return evoCache[id];
  const b = UNIT_MAP[id], e = EVOLUTIONS[id];
  const d = { ...b, baseId: id, evolved: true, baseName: b.name, name: e.name, icon: e.icon,
    passiveName: e.passiveName || b.passiveName, passiveDesc: e.passiveDesc || b.passiveDesc,
    dmg: Math.round(b.dmg * e.dmgMult), rng: Math.round(b.rng * e.rngMult), spa: Number((b.spa * e.spaMult).toFixed(2)),
    cost: Math.round(b.cost * (e.costMult || 1.15)), cap: (b.cap || RARITIES[b.rarity].cap) + (e.capBonus || 0) };
  if (e.chainBonus) d.chainCount = (b.chainCount || 0) + e.chainBonus;
  if (e.splashMult && b.splashRadius) d.splashRadius = Math.round(b.splashRadius * e.splashMult);
  if (e.burnMult && b.burnDps) d.burnDps = Math.round(b.burnDps * e.burnMult);
  if (e.farmMult && b.farmBase) d.farmBase = Math.round(b.farmBase * e.farmMult);
  if (e.auraMult) d.auraMult = e.auraMult;
  Object.assign(d, e.set || {});
  return (evoCache[id] = d);
}

/* ---------- BANNERS ---------- */
const BANNERS = {
  standard: { id: 'standard', icon: '🌠', short: 'Celestial Convergence', tag: 'STANDARD BANNER', theme: '',
    name: 'Celestial Convergence Summon', cost1: 100, cost10: 900,
    rates: { common: 55.00, rare: 27.00, epic: 12.00, legendary: 4.50, mythic: 1.35, secret: 0.15 },
    hardLeg: 50, hardMyth: 150, softStart: 35, featured: [], featuredRate: 0,
    desc: 'Summon heroes across 6 rarity tiers. Duplicates raise Star Rank. 10x Summons guarantee at least one Rare+, and Legendary odds climb after 35 pulls without one.' },
  eclipse: { id: 'eclipse', icon: '🌑', short: 'Eclipse Ascendant', tag: 'LIMITED ECLIPSE BANNER', theme: 'eclipse',
    name: 'Eclipse Ascendant Summon', cost1: 150, cost10: 1350,
    rates: { common: 50.00, rare: 27.00, epic: 13.00, legendary: 6.00, mythic: 3.20, secret: 0.80 },
    hardLeg: 40, hardMyth: 100, softStart: 30, featured: ['l_drake', 'm_eclipse', 's_dawn'], featuredRate: 0.5,
    desc: 'Higher Legendary+ rates and three EXCLUSIVE heroes found nowhere else. Each Legendary+ pull has a 50% chance to be a featured hero of that rarity. Faster pity.' }
};

/* ---------- STAGES ---------- */
const STAGES = [
  { id: 'valley', name: 'Emerald Valley', difficulty: 'Normal', diffColor: '#34d399', hpMult: 1.0, rewardMult: 1.0,
    bgTop: '#0d1b1e', bgBottom: '#091518', tileColor: '#132a2e', pathColor: '#233540', pathBorder: '#3f545e', accent: '#34d399', ambient: 'motes',
    desc: 'A winding river valley ideal for testing new squad synergies.',
    waypoints: [{x:0,y:2},{x:4,y:2},{x:4,y:7},{x:9,y:7},{x:9,y:2},{x:13,y:2},{x:13,y:6},{x:15,y:6}] },
  { id: 'ruins', name: 'Sunken Ruins', difficulty: 'Normal+', diffColor: '#2dd4bf', hpMult: 1.28, rewardMult: 1.25,
    bgTop: '#0a1d24', bgBottom: '#06121a', tileColor: '#0f2b35', pathColor: '#1c3f4a', pathBorder: '#3b7a85', accent: '#2dd4bf', ambient: 'bubbles',
    desc: 'Flooded temple halls with a long, looping road. (+25% rewards)',
    unlock: { stage: 'valley', wave: 12 },
    waypoints: [{x:0,y:1},{x:6,y:1},{x:6,y:4},{x:2,y:4},{x:2,y:8},{x:12,y:8},{x:12,y:5},{x:15,y:5}] },
  { id: 'canyon', name: 'Obsidian Canyon', difficulty: 'Hard', diffColor: '#f59e0b', hpMult: 1.55, rewardMult: 1.45,
    bgTop: '#1f1216', bgBottom: '#120a0d', tileColor: '#29171d', pathColor: '#3b2128', pathBorder: '#7f3f49', accent: '#fb923c', ambient: 'ember',
    desc: 'Volcanic switchbacks with tougher armored legions and +45% rewards.',
    unlock: { stage: 'valley', wave: 10 },
    waypoints: [{x:1,y:0},{x:1,y:8},{x:5,y:8},{x:5,y:1},{x:10,y:1},{x:10,y:8},{x:14,y:8},{x:14,y:3},{x:15,y:3}] },
  { id: 'astral', name: 'Astral Nexus', difficulty: 'Nightmare', diffColor: '#f43f5e', hpMult: 2.35, rewardMult: 2.1,
    bgTop: '#130f26', bgBottom: '#0a0817', tileColor: '#1b1636', pathColor: '#2a2050', pathBorder: '#6347b5', accent: '#a855f7', ambient: 'stars',
    desc: 'A short high-intensity dimensional rift. Bring Mythic/Secret firepower! (+110% Rewards)',
    unlock: { stage: 'canyon', wave: 15 },
    waypoints: [{x:0,y:5},{x:5,y:5},{x:5,y:2},{x:10,y:2},{x:10,y:7},{x:15,y:7}] },
  { id: 'tundra', name: 'Frozen Tundra', difficulty: 'Nightmare+', diffColor: '#7dd3fc', hpMult: 3.2, rewardMult: 2.8,
    bgTop: '#0e1a2b', bgBottom: '#08111e', tileColor: '#152a42', pathColor: '#294766', pathBorder: '#7db3de', accent: '#bae6fd', ambient: 'snow',
    desc: 'A blizzard-swept ice shelf. Brutal HP, generous rewards. (+180% Rewards)',
    unlock: { stage: 'astral', wave: 15 },
    waypoints: [{x:0,y:8},{x:3,y:8},{x:3,y:1},{x:7,y:1},{x:7,y:6},{x:11,y:6},{x:11,y:2},{x:15,y:2}] },
  { id: 'foundry', name: 'Crimson Foundry', difficulty: 'Inferno', diffColor: '#ef4444', hpMult: 4.4, rewardMult: 3.6,
    bgTop: '#220c0c', bgBottom: '#120505', tileColor: '#2e1212', pathColor: '#4a1c1a', pathBorder: '#c2410c', accent: '#f97316', ambient: 'ember',
    desc: 'A molten forge with a punishing zig-zag road. (+260% Rewards)',
    unlock: { stage: 'tundra', wave: 15 },
    waypoints: [{x:0,y:4},{x:2,y:4},{x:2,y:0},{x:6,y:0},{x:6,y:9},{x:9,y:9},{x:9,y:3},{x:13,y:3},{x:13,y:8},{x:15,y:8}] },
  { id: 'abyss', name: 'Void Abyss', difficulty: 'Abyssal', diffColor: '#c084fc', hpMult: 6.0, rewardMult: 5.0,
    bgTop: '#0a0414', bgBottom: '#030108', tileColor: '#150a26', pathColor: '#26124a', pathBorder: '#8b5cf6', accent: '#c084fc', ambient: 'void',
    desc: 'The end of the map. A long serpentine road and enormous HP. (+400% Rewards)',
    unlock: { stage: 'foundry', wave: 15 },
    waypoints: [{x:0,y:0},{x:14,y:0},{x:14,y:3},{x:1,y:3},{x:1,y:6},{x:14,y:6},{x:14,y:9},{x:15,y:9}] }
];

/* ---------- CHALLENGER TRIALS (materials for evolution) ---------- */
const TRIALS = [
  { id: 't_echo', name: 'Trial of Echoes', icon: '✨', stage: 'valley', mat: 'essence', waves: 10, lives: 15, startCash: 280,
    pool: ['normal', 'fast', 'swarm', 'fast', 'swarm', 'normal'], bossWaves: [10], speedMult: 1.12, hpTier: [1.4, 2.0, 2.9], tierMats: [16, 28, 44],
    mods: ['Fast swarms', '+12% enemy speed'], desc: 'Waves of runners and swarmlings test your crowd control.', unlock: null },
  { id: 't_iron', name: 'Trial of Iron', icon: '🔩', stage: 'canyon', mat: 'alloy', waves: 10, lives: 15, startCash: 320,
    pool: ['armored', 'normal', 'armored', 'shield', 'armored', 'splitter'], bossWaves: [10], speedMult: 1.0, hpTier: [1.5, 2.2, 3.1], tierMats: [8, 14, 22],
    mods: ['Heavily armored', 'Splitters'], desc: 'Armored legions. Armor-piercing and burn damage shine.', unlock: { stage: 'valley', wave: 10 } },
  { id: 't_ember', name: 'Trial of Cinders', icon: '🔥', stage: 'foundry', mat: 'ember', waves: 10, lives: 12, startCash: 340,
    pool: ['regen', 'normal', 'regen', 'shield', 'fast', 'regen'], bossWaves: [5, 10], speedMult: 1.0, hpTier: [1.6, 2.4, 3.4], tierMats: [6, 11, 18],
    mods: ['Regenerating foes', 'Two bosses'], desc: 'Self-healing enemies demand burst damage. Bosses on waves 5 and 10.', unlock: { stage: 'canyon', wave: 10 } },
  { id: 't_void', name: 'Trial of the Abyss', icon: '🌑', stage: 'abyss', mat: 'void', waves: 10, lives: 10, startCash: 400, bossRush: true,
    pool: ['normal', 'armored', 'fast'], bossWaves: [2, 4, 6, 8, 10], speedMult: 1.0, hpTier: [1.5, 2.2, 3.2], tierMats: [2, 4, 7],
    mods: ['Boss rush', 'Only 10 lives'], desc: 'A boss every other wave. The only source of Void Prisms.', unlock: { stage: 'astral', wave: 10 } }
];
const TRIAL_TICKETS = [{ standard: 1 }, { eclipse: 1 }, { eclipse: 2 }];
const TIER_NAMES = ['I', 'II', 'III'];

const ENEMY_META = {
  normal:   { label: 'Stalker',   icon: '👾' },
  fast:     { label: 'Runner',    icon: '🦇' },
  armored:  { label: 'Juggernaut',icon: '🛡️' },
  regen:    { label: 'Regen',     icon: '🐗' },
  shield:   { label: 'Striker',   icon: '🔮' },
  swarm:    { label: 'Swarm',     icon: '🐜' },
  splitter: { label: 'Splitter',  icon: '🥚' },
  boss:     { label: 'BOSS',      icon: '👹' }
};

const ACHIEVEMENTS = [
  { id: 'pull10',  name: 'Novice Summoner',   desc: 'Perform 10 summons', target: 10,   val: () => saveData.totalPulls, gems: 150 },
  { id: 'pull50',  name: 'Star Seeker',       desc: 'Perform 50 summons', target: 50,   val: () => saveData.totalPulls, gems: 300 },
  { id: 'pull150', name: 'Astral Gambler',    desc: 'Perform 150 summons', target: 150, val: () => saveData.totalPulls, gems: 600 },
  { id: 'pull400', name: 'Void Gambler',      desc: 'Perform 400 summons', target: 400, val: () => saveData.totalPulls, gems: 1200 },
  { id: 'kill100', name: 'Monster Hunter',    desc: 'Defeat 100 enemies', target: 100,  val: () => saveData.stats.kills, gold: 300 },
  { id: 'kill1000',name: 'Legion Breaker',    desc: 'Defeat 1,000 enemies', target: 1000, val: () => saveData.stats.kills, gems: 100, gold: 1000 },
  { id: 'kill5000',name: 'Annihilator',       desc: 'Defeat 5,000 enemies', target: 5000, val: () => saveData.stats.kills, gems: 400, gold: 2500 },
  { id: 'kill20000',name:'Extinction Event',  desc: 'Defeat 20,000 enemies', target: 20000, val: () => saveData.stats.kills, gems: 1000, gold: 8000 },
  { id: 'boss1',   name: 'Overlord Slayer',   desc: 'Defeat 1 boss', target: 1,         val: () => saveData.stats.bosses, gems: 120 },
  { id: 'boss10',  name: 'Boss Rush',         desc: 'Defeat 10 bosses', target: 10,     val: () => saveData.stats.bosses, gems: 400 },
  { id: 'boss50',  name: 'Overlord Bane',     desc: 'Defeat 50 bosses', target: 50,     val: () => saveData.stats.bosses, gems: 900 },
  { id: 'wave10',  name: 'Holding the Line',  desc: 'Reach wave 10 in any stage', target: 10, val: () => saveData.stats.maxWave, gold: 400 },
  { id: 'wave20',  name: 'Stage Conqueror',   desc: 'Clear 20 waves in any stage', target: 20, val: () => saveData.stats.maxWave, gems: 250 },
  { id: 'wave35',  name: 'Endless Warrior',   desc: 'Clear 35 waves in one run', target: 35, val: () => saveData.stats.maxWave, gems: 500 },
  { id: 'wave50',  name: 'Endless Legend',    desc: 'Clear 50 waves in one run', target: 50, val: () => saveData.stats.maxWave, gems: 900 },
  { id: 'owned10', name: 'Growing Roster',    desc: 'Own 10 different units', target: 10, val: () => Object.keys(saveData.owned).length, gems: 300 },
  { id: 'owned20', name: 'Seasoned Collector',desc: 'Own 20 different units', target: 20, val: () => Object.keys(saveData.owned).length, gems: 600 },
  { id: 'ownedall',name: 'Complete Codex',    desc: 'Own every unit', target: UNIT_ROSTER.length, val: () => Object.keys(saveData.owned).length, gems: 1500 },
  { id: 'legend',  name: 'Golden Pull',       desc: 'Own a Legendary unit', target: 1,  val: () => countOwnedRarity('legendary'), gems: 200 },
  { id: 'mythic',  name: 'Mythic Awakening',  desc: 'Own a Mythic unit', target: 1,     val: () => countOwnedRarity('mythic'), gems: 400 },
  { id: 'secret',  name: 'Beyond Reality',    desc: 'Own a Secret unit', target: 1,     val: () => countOwnedRarity('secret'), gems: 1000 },
  { id: 'star5',   name: 'Starbound',         desc: 'Raise any unit to 5★', target: 5, val: () => Math.max(0, ...Object.values(saveData.owned).map(o => o.stars)), gems: 300 },
  { id: 'trial1',  name: 'Challenger',        desc: 'Clear any Challenger Trial', target: 1, val: () => countTrialClears(), gems: 250 },
  { id: 'trial6',  name: 'Trial Veteran',     desc: 'Clear 6 trial tiers in total', target: 6, val: () => countTrialClears(), gems: 600 },
  { id: 'trial12', name: 'Trial Master',      desc: 'Clear all 12 trial tiers', target: 12, val: () => countTrialClears(), gems: 1500 },
  { id: 'evo1',    name: 'Ascended',          desc: 'Evolve a unit', target: 1,         val: () => countEvolved(), gems: 500 },
  { id: 'evo5',    name: 'Evolution Master',  desc: 'Evolve 5 units', target: 5,        val: () => countEvolved(), gems: 1200 }
];
function countOwnedRarity(r) { return Object.keys(saveData.owned).filter(id => UNIT_MAP[id] && UNIT_MAP[id].rarity === r).length; }
function countEvolved() { return Object.values(saveData.owned).filter(o => o.evolved).length; }
function countTrialClears() { return Object.values(saveData.trialProgress).reduce((a, b) => a + b, 0); }

/* ==========================================================================
   2. SAVE STATE
   ========================================================================== */
const SAVE_KEY = 'aether_defense_gacha_save_v3';
const OLD_SAVE_KEYS = ['aether_defense_gacha_save_v2', 'aether_defense_gacha_save_v1'];
const $ = id => document.getElementById(id);

const defaultSave = () => ({
  gems: 1500, gold: 500, totalPulls: 0, lastDailyClaim: 0,
  pity: { standard: { leg: 0, myth: 0 }, eclipse: { leg: 0, myth: 0 } },
  selectedStage: 'valley', selectedTrial: 't_echo', selectedTier: 1,
  materials: { essence: 0, alloy: 0, ember: 0, void: 0 },
  tickets: { standard: 0, eclipse: 0 },
  trialProgress: {},
  owned: {
    c_scout: { level: 1, stars: 0, copies: 1 },
    c_militia: { level: 1, stars: 0, copies: 1 },
    c_apprentice: { level: 1, stars: 0, copies: 1 },
    c_prospector: { level: 1, stars: 0, copies: 1 }
  },
  squad: ['c_scout', 'c_militia', 'c_apprentice', 'c_prospector', null, null],
  bestWave: {}, cleared: {}, achievements: {}, history: [],
  stats: { kills: 0, bosses: 0, waves: 0, matches: 0, wins: 0, maxWave: 0 },
  settings: { sound: true, dmgText: true, particles: true, shake: true, ambient: true, flash: true }
});

function sanitizeSave(p) {
  const base = defaultSave();
  const pp = p.pity || {};
  const m = { ...base, ...p,
    stats: { ...base.stats, ...(p.stats || {}) },
    settings: { ...base.settings, ...(p.settings || {}) },
    materials: { ...base.materials, ...(p.materials || {}) },
    tickets: { ...base.tickets, ...(p.tickets || {}) },
    pity: { standard: { ...base.pity.standard, ...(pp.standard || {}) }, eclipse: { ...base.pity.eclipse, ...(pp.eclipse || {}) } },
    trialProgress: { ...(p.trialProgress || {}) },
    bestWave: { ...(p.bestWave || {}) }, cleared: { ...(p.cleared || {}) },
    achievements: { ...(p.achievements || {}) },
    history: Array.isArray(p.history) ? p.history.slice(0, 20) : [],
    owned: { ...(p.owned || base.owned) }
  };
  if (p.pityLeg !== undefined && !p.pity) m.pity.standard = { leg: p.pityLeg || 0, myth: p.pityMyth || 0 };
  for (const id of Object.keys(m.owned)) {
    if (!UNIT_MAP[id]) { delete m.owned[id]; continue; }
    const o = m.owned[id] = { level: 1, stars: 0, copies: 1, ...m.owned[id] };
    if (o.evolved && !EVOLUTIONS[id]) delete o.evolved;
  }
  m.squad = Array.from({ length: 6 }, (_, i) => (Array.isArray(m.squad) && m.owned[m.squad[i]]) ? m.squad[i] : null);
  if (!STAGES.some(s => s.id === m.selectedStage)) m.selectedStage = 'valley';
  if (!TRIALS.some(t => t.id === m.selectedTrial)) m.selectedTrial = 't_echo';
  m.selectedTier = Math.min(3, Math.max(1, m.selectedTier | 0 || 1));
  return m;
}
function loadGame() {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    for (const k of OLD_SAVE_KEYS) if (!raw) raw = localStorage.getItem(k);
    if (!raw) return defaultSave();
    return sanitizeSave(JSON.parse(raw));
  } catch (e) { return defaultSave(); }
}
let saveData = loadGame();

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); } catch (e) { console.warn('Could not save:', e); }
  updateTopHUD();
}
window.addEventListener('beforeunload', () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); } catch (e) {} });

/* getUnitDef returns the EVOLVED definition if the player has evolved that unit */
function getUnitDef(id) {
  const base = UNIT_MAP[id];
  if (!base) return undefined;
  const inv = saveData.owned[id];
  return (inv && inv.evolved && EVOLUTIONS[id]) ? getEvolvedDef(id) : base;
}
function getUnitCap(def) { return def.cap || RARITIES[def.rarity].cap; }
function upgradeCost(level) { return level * 100 + level * level * 5; }

function getEffectiveUnitStats(unitId, defOverride) {
  const def = defOverride || getUnitDef(unitId);
  const inv = saveData.owned[unitId] || { level: 1, stars: 0 };
  const totalMult = (1 + (inv.level - 1) * 0.12) * (1 + inv.stars * 0.10);
  return {
    dmg: Math.round(def.dmg * totalMult),
    rng: Math.round(def.rng * (1 + inv.stars * 0.03 + (inv.level - 1) * 0.01)),
    spa: Number(Math.max(0.22, def.spa * Math.pow(0.985, inv.level - 1)).toFixed(2)),
    farmBase: def.farmBase ? Math.round(def.farmBase * totalMult) : 0,
    level: inv.level, stars: inv.stars
  };
}
function isStageUnlocked(st) { return !st.unlock || (saveData.bestWave[st.unlock.stage] || 0) >= st.unlock.wave; }
function isTrialUnlocked(tr) { return !tr.unlock || (saveData.bestWave[tr.unlock.stage] || 0) >= tr.unlock.wave; }
function isTierUnlocked(tr, tier) { return tier === 1 || (saveData.trialProgress[tr.id] || 0) >= tier - 1; }

/* ==========================================================================
   3. AUDIO
   ========================================================================== */
let audioCtx = null;
const sfxLast = {};
function tone(freq, dur = 0.1, type = 'sine', vol = 0.05, slideTo = 0, delay = 0) {
  if (!saveData.settings.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime + delay;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) {}
}
function sfx(name, extra) {
  const now = performance.now();
  const minGap = { hit: 70, kill: 55 }[name] || 0;
  if (minGap && now - (sfxLast[name] || 0) < minGap) return;
  sfxLast[name] = now;
  switch (name) {
    case 'place': tone(440, 0.08, 'triangle', 0.06); tone(660, 0.1, 'triangle', 0.05, 0, 0.07); break;
    case 'upgrade': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, 0, i * 0.06)); break;
    case 'sell': tone(420, 0.14, 'square', 0.04, 220); break;
    case 'error': tone(150, 0.16, 'sawtooth', 0.04, 100); break;
    case 'hit': tone(300 + Math.random() * 120, 0.04, 'square', 0.015); break;
    case 'kill': tone(620 + Math.random() * 200, 0.07, 'triangle', 0.03); break;
    case 'wave': [392, 523, 659].forEach((f, i) => tone(f, 0.16, 'sine', 0.05, 0, i * 0.09)); break;
    case 'boss': tone(80, 0.7, 'sawtooth', 0.07, 40); break;
    case 'pulse': tone(220, 0.45, 'sawtooth', 0.06, 900); break;
    case 'freeze': tone(1200, 0.5, 'sine', 0.06, 300); break;
    case 'leak': tone(180, 0.22, 'square', 0.05, 90); break;
    case 'evolve': [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, 0, i * 0.08)); break;
    case 'reveal': {
      const i = RARITY_ORDER[extra] || 1;
      for (let k = 0; k < Math.min(5, i); k++) tone(440 * Math.pow(1.26, k + i / 2), 0.16, 'triangle', 0.05, 0, k * 0.07);
      break;
    }
    case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.06, 0, i * 0.1)); break;
    case 'lose': [330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.05, 0, i * 0.18)); break;
  }
}

/* ==========================================================================
   4. UI HELPERS
   ========================================================================== */
function showToast(msg, borderColor = '#38bdf8') {
  const container = $('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderColor = borderColor;
  el.innerHTML = msg;
  container.appendChild(el);
  while (container.children.length > 4) container.firstChild.remove();
  setTimeout(() => {
    el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = '.25s';
    setTimeout(() => el.remove(), 260);
  }, 2800);
}
function flashScreen(color) {
  if (!saveData.settings.flash) return;
  const f = $('screenFlash');
  f.style.background = `radial-gradient(circle, ${color}, transparent 75%)`;
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
let lastGems = null, lastGold = null;
function bump(id) { const el = $(id); el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 160); }
function updateTopHUD() {
  $('gemCount').textContent = saveData.gems.toLocaleString();
  $('goldCount').textContent = saveData.gold.toLocaleString();
  if (lastGems !== null && saveData.gems !== lastGems) bump('gemPill');
  if (lastGold !== null && saveData.gold !== lastGold) bump('goldPill');
  lastGems = saveData.gems; lastGold = saveData.gold;
  $('squadReadyBadge').textContent = `Squad: ${saveData.squad.filter(Boolean).length}/6 Equipped`;
}
function openModal(title, html) {
  $('modalTitle').innerHTML = title;
  $('modalBody').innerHTML = html;
  $('summonModal').classList.add('open');
}
function closeModal() { $('summonModal').classList.remove('open'); }
$('btnCloseModal').addEventListener('click', closeModal);
$('summonModal').addEventListener('click', (e) => { if (e.target.id === 'summonModal') closeModal(); });

function tagHtml(def, extra) {
  return `<span class="rarity-tag badge-${def.rarity}">${extra || def.rarity}</span>${def.evolved ? '<span class="rarity-tag evo-tag">★ EVOLVED</span>' : ''}`;
}
function matChip(id, n, have) {
  const m = MATERIALS[id];
  return `<span class="mat-chip" style="border-color:${m.color};color:${m.color};" title="${m.name}">${m.icon} ${n}${have !== undefined ? ` <small class="muted">(${have})</small>` : ''}</span>`;
}

function refreshAll() {
  updateTopHUD(); renderStageSelect(); renderSquadAndInventory(); renderSummonTab(); renderEvolve(); renderInventory(); renderCodex(); renderGoals();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    if (game.active && target !== 'battle') setPaused(true);
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    $(`view-${target}`).classList.add('active');
    if (target === 'squad') renderSquadAndInventory();
    if (target === 'summon') renderSummonTab();
    if (target === 'evolve') renderEvolve();
    if (target === 'inventory') renderInventory();
    if (target === 'codex') renderCodex();
    if (target === 'goals') renderGoals();
    if (target === 'battle') { renderStageSelect(); if (game.active) resizeCanvas(); }
  });
});

/* free gems */
function updateDailyButton() {
  const btn = $('btnDailyBonus');
  const left = saveData.lastDailyClaim + FREE_GEMS_COOLDOWN_MS - Date.now();
  if (left <= 0) { btn.textContent = '🎁 Claim +300💎'; btn.classList.add('ready'); }
  else {
    const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
    btn.textContent = `🎁 ${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    btn.classList.remove('ready');
  }
}
$('btnDailyBonus').addEventListener('click', () => {
  if (Date.now() < saveData.lastDailyClaim + FREE_GEMS_COOLDOWN_MS) { showToast('⏳ Free gems are still recharging.', '#fbbf24'); sfx('error'); return; }
  saveData.gems += 300; saveData.lastDailyClaim = Date.now();
  saveGame(); updateDailyButton(); sfx('upgrade');
  showToast('🎁 Claimed <b>+300 Gems</b>!', '#c084fc');
});
setInterval(updateDailyButton, 1000);

/* settings + save export/import */
$('btnSettings').addEventListener('click', () => {
  const s = saveData.settings;
  const rows = [['sound', '🔊 Sound effects'], ['dmgText', '💥 Floating damage numbers'], ['particles', '✨ Particles & trails'], ['ambient', '🌌 Ambient stage effects'], ['shake', '📳 Screen shake'], ['flash', '⚡ Screen flashes']];
  openModal('⚙️ Settings', `<div style="margin-top:10px;">${rows.map(([k, l]) =>
    `<label class="setting-row"><span>${l}</span><input type="checkbox" ${s[k] ? 'checked' : ''} onchange="toggleSetting('${k}', this.checked)"></label>`).join('')}</div>
    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
      <button class="btn btn-ghost" onclick="openSaveModal()">💾 Export / Import Save</button>
    </div>`);
});
function toggleSetting(k, v) { saveData.settings[k] = v; saveGame(); if (k === 'sound' && v) sfx('place'); }
function openSaveModal() {
  openModal('💾 Save Data', `
    <p class="text-xs muted" style="margin:10px 0 6px;">Copy this text to back up your progress. To restore, paste a backup below and press Import.</p>
    <textarea id="saveArea" class="save-area" spellcheck="false">${JSON.stringify(saveData)}</textarea>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap;">
      <button class="btn btn-ghost" onclick="copySave()">📋 Copy</button>
      <button class="btn btn-purple" onclick="importSave()">📥 Import From Box</button>
    </div>`);
}
function copySave() {
  const ta = $('saveArea'); ta.select();
  try { navigator.clipboard.writeText(ta.value); showToast('📋 Save copied to clipboard.'); } catch (e) { document.execCommand && document.execCommand('copy'); showToast('📋 Save copied.'); }
}
function importSave() {
  try {
    const p = JSON.parse($('saveArea').value.trim());
    if (!p || typeof p !== 'object') throw new Error('bad');
    saveData = sanitizeSave(p);
    if (game.active) endMatchSilently();
    saveGame(); refreshAll(); closeModal();
    showToast('📥 Save imported!', '#34d399');
  } catch (e) { showToast('❌ That is not a valid save.', '#f87171'); sfx('error'); }
}
function endMatchSilently() {
  game.active = false; game.paused = false;
  $('activeArenaPanel').style.display = 'none'; $('stageSelectPanel').style.display = 'block';
}

$('btnNotes').addEventListener('click', showPatchNotes);
function showPatchNotes() {
  openModal('📜 Patch Notes — 0.02 Beta', `
    <div class="notes">
      <h4>Big Systems</h4>
      <ul>
        <li><b>Evolution</b>: all Mythic and Secret units, plus selected Legendaries (Solar Valkyrie, Glacial Sovereign, Drake Rider), can evolve into stronger forms.</li>
        <li><b>Challenger Trials</b>: 4 trials × 3 tiers that drop evolution materials and summon tickets.</li>
        <li><b>Inventory</b>: materials, tickets and collection overview.</li>
        <li><b>Placement caps</b>: each unit has a deployment limit by rarity (economy units are capped lower). Evolving raises the cap.</li>
        <li><b>Second banner</b>: Eclipse Ascendant with 3 exclusive heroes, higher rates and faster pity. Tickets supported.</li>
      </ul>
      <h4>Content</h4>
      <ul>
        <li>8 new units (28 total) and 4 new stages: Sunken Ruins, Frozen Tundra, Crimson Foundry, Void Abyss.</li>
        <li>Ally-aura system rebuilt: Rally Bard, Eclipse Monarch and Eternal Dawn join the support roster.</li>
        <li>10 new goals including trials and evolution.</li>
      </ul>
      <h4>Visuals &amp; Quality of Life</h4>
      <ul>
        <li>Stage ambient effects (snow, embers, bubbles, void motes), vignette, glowing roads, tower cooldown rings, evolved crowns.</li>
        <li>Card sheens on high-rarity units, evolution animations, banner themes.</li>
        <li>Save export / import, new settings toggles, save format upgraded (old saves migrate automatically).</li>
      </ul>
    </div>`);
}

$('btnResetSave').addEventListener('click', () => {
  openModal('♻️ Reset Progress?', `
    <p class="text-sm muted" style="margin:12px 0;">Wipe all units, gems, upgrades, materials and records and restart with 1,500 starter Gems?</p>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" id="confirmWipeBtn">Yes, Reset Save</button>
    </div>`);
  $('confirmWipeBtn').onclick = () => {
    localStorage.removeItem(SAVE_KEY); OLD_SAVE_KEYS.forEach(k => localStorage.removeItem(k));
    saveData = defaultSave();
    if (game.active) endMatchSilently();
    saveGame(); closeModal(); refreshAll();
    showToast('♻️ Save data reset to starter state.');
  };
});

/* ==========================================================================
   5. ACHIEVEMENTS
   ========================================================================== */
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (saveData.achievements[a.id]) continue;
    if (a.val() >= a.target) {
      saveData.achievements[a.id] = true;
      if (a.gems) saveData.gems += a.gems;
      if (a.gold) saveData.gold += a.gold;
      showToast(`🏆 <b>${a.name}</b> complete! ${a.gems ? `+${a.gems}💎 ` : ''}${a.gold ? `+${a.gold}🪙` : ''}`, '#fbbf24');
    }
  }
}
function renderGoals() {
  const s = saveData.stats;
  const pills = [['Enemies Slain', s.kills.toLocaleString()], ['Bosses Slain', s.bosses], ['Waves Cleared', s.waves], ['Expeditions', s.matches], ['Victories', s.wins], ['Best Wave', s.maxWave], ['Total Summons', saveData.totalPulls], ['Trial Tiers', `${countTrialClears()}/12`], ['Evolved Units', countEvolved()]];
  $('lifetimeStats').innerHTML = pills.map(([l, v]) => `<div class="stat-pill"><div class="stat-label">${l}</div><div class="stat-val">${v}</div></div>`).join('');
  const done = ACHIEVEMENTS.filter(a => saveData.achievements[a.id]).length;
  $('goalsCompletion').textContent = `Completed: ${done} / ${ACHIEVEMENTS.length}`;
  $('goalList').innerHTML = ACHIEVEMENTS.map(a => {
    const cur = Math.min(a.target, a.val());
    const ok = !!saveData.achievements[a.id];
    return `<div class="goal-card ${ok ? 'done' : ''}">
      <div class="flex-between"><b class="text-sm">${ok ? '✅' : '🎯'} ${a.name}</b><span class="text-xs" style="color:#fbbf24;">${a.gems ? a.gems + '💎 ' : ''}${a.gold ? a.gold + '🪙' : ''}</span></div>
      <div class="text-xs muted" style="margin:3px 0 6px;">${a.desc}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${(cur / a.target) * 100}%;background:${ok ? '#34d399' : '#38bdf8'};"></div></div>
      <div class="text-xs muted" style="margin-top:3px;text-align:right;">${cur.toLocaleString()} / ${a.target.toLocaleString()}</div></div>`;
  }).join('');
}

/* ==========================================================================
   6. GACHA (multi-banner)
   ========================================================================== */
let currentBannerId = 'standard';
function setBanner(id) { currentBannerId = id; renderSummonTab(); }

function rollRarity(b, p) {
  const rates = { ...b.rates };
  const hi = rates.legendary + rates.mythic + rates.secret;
  if (p.myth >= b.hardMyth) return Math.random() < rates.secret / (rates.mythic + rates.secret) ? 'secret' : 'mythic';
  if (p.leg >= b.hardLeg) {
    const r = Math.random() * hi;
    return r < rates.secret ? 'secret' : (r < rates.secret + rates.mythic ? 'mythic' : 'legendary');
  }
  if (p.leg > b.softStart) {
    const boost = Math.min(rates.common - 1, (p.leg - b.softStart) * 3);
    rates.legendary += boost; rates.common -= boost;
  }
  const roll = Math.random() * 100; let acc = 0;
  for (const k in rates) { acc += rates[k]; if (roll <= acc) return k; }
  return 'common';
}
function pickUnit(b, rarity) {
  const feat = b.featured.filter(id => UNIT_MAP[id].rarity === rarity);
  if (feat.length && Math.random() < b.featuredRate) return UNIT_MAP[feat[Math.floor(Math.random() * feat.length)]];
  const pool = UNIT_ROSTER.filter(u => u.rarity === rarity && (!u.exclusive || u.exclusive === b.id));
  return pool[Math.floor(Math.random() * pool.length)];
}
function rollSinglePull(b, minRarity) {
  const p = saveData.pity[b.id];
  saveData.totalPulls++; p.leg++; p.myth++;
  let chosen = rollRarity(b, p);
  if (minRarity && RARITY_ORDER[chosen] < RARITY_ORDER[minRarity]) chosen = minRarity;
  if (RARITY_ORDER[chosen] >= 4) p.leg = 0;
  if (RARITY_ORDER[chosen] >= 5) p.myth = 0;
  const unit = pickUnit(b, chosen);
  let isNew = false, starUp = false;
  if (!saveData.owned[unit.id]) { saveData.owned[unit.id] = { level: 1, stars: 0, copies: 1 }; isNew = true; }
  else {
    const o = saveData.owned[unit.id];
    o.copies++;
    if (o.stars < MAX_STARS) { o.stars++; starUp = true; } else saveData.gold += 250;
  }
  saveData.history.unshift(unit.id);
  saveData.history = saveData.history.slice(0, 20);
  return { unit, isNew, starUp };
}

function executeSummon(count, useTicket = false) {
  const b = BANNERS[currentBannerId];
  if (useTicket) {
    if ((saveData.tickets[b.id] || 0) < 1) { showToast('❌ No tickets for this banner.', '#f87171'); sfx('error'); return; }
    saveData.tickets[b.id]--; count = 1;
  } else {
    const cost = count === 10 ? b.cost10 : b.cost1;
    if (saveData.gems < cost) { showToast('❌ Not enough Gems! Clear waves, run trials or claim free gems.', '#f87171'); sfx('error'); return; }
    saveData.gems -= cost;
  }
  const results = []; let rareSeen = false;
  for (let i = 0; i < count; i++) {
    const min = (count === 10 && i === 9 && !rareSeen) ? 'rare' : null;
    const r = rollSinglePull(b, min);
    if (RARITY_ORDER[r.unit.rarity] >= 2) rareSeen = true;
    results.push(r);
  }
  checkAchievements();
  saveGame(); renderSummonTab();

  const best = results.reduce((m, r) => Math.max(m, RARITY_ORDER[r.unit.rarity]), 1);
  const cardsHtml = results.map((res, idx) => {
    const u = res.unit, inv = saveData.owned[u.id];
    const feat = b.featured.includes(u.id);
    return `
      <div class="flip-card" data-rar="${u.rarity}" onclick="flipCard(this)" style="animation:popIn .35s backwards;animation-delay:${idx * 0.05}s;">
        <div class="flip-inner">
          <div class="flip-face flip-back" style="--glow:${RARITIES[u.rarity].color}">❔</div>
          <div class="flip-face flip-front rarity-${u.rarity}">
            <span class="rarity-tag badge-${u.rarity}">${u.rarity}</span>
            <div style="font-size:34px;margin:8px 0;">${u.icon}</div>
            <div class="font-bold text-sm">${u.name}</div>
            <div class="text-xs" style="color:#fbbf24;margin-top:3px;">${'★'.repeat(Math.min(5, inv.stars))}${inv.stars > 5 ? '+' + (inv.stars - 5) : ''}${inv.stars === 0 ? '0★' : ''}</div>
            <div class="text-xs" style="margin-top:4px;color:${res.isNew ? '#34d399' : '#38bdf8'};font-weight:700;">
              ${res.isNew ? '✨ NEW UNIT!' : (res.starUp ? '⬆ STAR ASCENDED!' : '+250 Gold')}
            </div>
            ${feat ? '<div class="text-xs" style="color:#c084fc;font-weight:800;margin-top:2px;">★ FEATURED</div>' : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  const tk = saveData.tickets[b.id] || 0;
  openModal(`${b.icon} Summon Manifestation (${count}x)`, `
    <div class="text-xs muted" style="margin-top:6px;">Tap a card to reveal it — or reveal everything at once.</div>
    <div class="summon-results-grid">${cardsHtml}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:12px;">
      <span class="text-xs muted">Gems: <b>${saveData.gems.toLocaleString()} 💎</b> · Tickets: <b>${tk} 🎫</b></span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost" onclick="revealAll()">👁 Reveal All</button>
        ${tk > 0 ? `<button class="btn btn-gold" onclick="executeSummon(1,true)">🎫 Ticket (${tk})</button>` : ''}
        <button class="btn btn-primary" onclick="executeSummon(1)">1x (${b.cost1}💎)</button>
        <button class="btn btn-purple" onclick="executeSummon(10)">10x (${b.cost10}💎)</button>
      </div>
    </div>`);
  if (count === 1) setTimeout(() => { const c = document.querySelector('#modalBody .flip-card'); if (c) flipCard(c); }, 350);
  else if (best >= 4) flashScreen(RARITIES[Object.keys(RARITY_ORDER).find(k => RARITY_ORDER[k] === best)].color);
}
function flipCard(el) {
  if (el.classList.contains('revealed')) return;
  el.classList.add('revealed');
  const r = el.dataset.rar;
  sfx('reveal', r);
  if (RARITY_ORDER[r] >= 4) flashScreen(RARITIES[r].color);
}
function revealAll() {
  [...document.querySelectorAll('#modalBody .flip-card:not(.revealed)')].forEach((c, i) => setTimeout(() => flipCard(c), i * 90));
}

function renderSummonTab() {
  const b = BANNERS[currentBannerId], p = saveData.pity[b.id], tk = saveData.tickets[b.id] || 0;
  $('bannerTabs').innerHTML = Object.values(BANNERS).map(x =>
    `<button class="seg-btn ${x.id === b.id ? 'active' : ''}" onclick="setBanner('${x.id}')">${x.icon} ${x.short}</button>`).join('');
  const feat = b.featured.length ? `
    <div class="feat-row">${b.featured.map(id => { const u = UNIT_MAP[id]; return `<div class="feat-chip rarity-${u.rarity}" title="${u.passiveDesc}"><span style="font-size:22px;">${u.icon}</span><div><div class="text-xs font-bold">${u.name}</div><div class="text-xs muted">${RARITIES[u.rarity].name} · Exclusive</div></div></div>`; }).join('')}</div>` : '';
  $('bannerHero').className = 'banner-hero ' + b.theme;
  $('bannerHero').innerHTML = `
    <div style="max-width:560px;">
      <span class="rarity-tag badge-secret" style="margin-bottom:8px;">${b.tag}</span>
      <h2 style="font-size:1.65rem;font-weight:900;margin-bottom:6px;">${b.name}</h2>
      <p class="text-sm muted" style="line-height:1.45;">${b.desc}</p>
      ${feat}
      <div class="pity-bars">
        <div class="pity-card">
          <div class="flex-between text-xs font-bold"><span style="color:var(--rar-legendary);">★ Legendary+ Pity</span><span>${p.leg} / ${b.hardLeg}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, p.leg / b.hardLeg * 100)}%;background:var(--rar-legendary);"></div></div>
        </div>
        <div class="pity-card">
          <div class="flex-between text-xs font-bold"><span style="color:var(--rar-mythic);">✦ Mythic+ Pity</span><span>${p.myth} / ${b.hardMyth}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, p.myth / b.hardMyth * 100)}%;background:var(--rar-mythic);"></div></div>
        </div>
      </div>
    </div>
    <div class="orb ${b.theme}"></div>
    <div style="display:flex;flex-direction:column;gap:10px;min-width:230px;">
      <button class="btn btn-primary" onclick="executeSummon(1)" style="padding:14px 20px;font-size:1rem;">${b.icon} Summon 1x &nbsp;(${b.cost1} 💎)</button>
      <button class="btn btn-purple" onclick="executeSummon(10)" style="padding:14px 20px;font-size:1rem;">🌌 Summon 10x &nbsp;(${b.cost10.toLocaleString()} 💎)</button>
      <button class="btn btn-gold" ${tk > 0 ? '' : 'disabled'} onclick="executeSummon(1,true)" style="padding:10px 20px;">🎫 Use Ticket (${tk})</button>
      <div class="text-xs muted" style="text-align:center;">10x saves ${b.cost1 * 10 - b.cost10} Gems + guaranteed Rare+</div>
    </div>`;
  $('totalPullsText').textContent = saveData.totalPulls;
  $('ratesGrid').innerHTML = Object.entries(b.rates).map(([key, rate]) => `
    <div class="rate-box rarity-${key}">
      <span class="rarity-tag badge-${key}">${RARITIES[key].name}</span>
      <div style="font-size:1.25rem;font-weight:900;margin-top:6px;color:${RARITIES[key].color};">${rate}%</div>
      <div class="text-xs muted" style="margin-top:2px;">${UNIT_ROSTER.filter(u => u.rarity === key && (!u.exclusive || u.exclusive === b.id)).length} Heroes</div>
    </div>`).join('');
  $('historyStrip').innerHTML = saveData.history.length
    ? saveData.history.map(id => { const u = UNIT_MAP[id]; return u ? `<div class="hist-chip" style="border-color:${RARITIES[u.rarity].color}" title="${u.name}">${u.icon}</div>` : ''; }).join('')
    : '<span class="text-xs muted">No summons yet — try your luck!</span>';
}

/* ==========================================================================
   7. SQUAD
   ========================================================================== */
let currentFilter = 'all';
document.querySelectorAll('#inventoryFilterBar .btn-small').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#inventoryFilterBar .btn-small').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderSquadAndInventory();
  });
});
$('sortSelect').addEventListener('change', renderSquadAndInventory);

$('btnAutoEquipBest').addEventListener('click', () => {
  const ids = Object.keys(saveData.owned).sort((a, b) => {
    const ua = getUnitDef(a), ub = getUnitDef(b);
    if (RARITY_ORDER[ub.rarity] !== RARITY_ORDER[ua.rarity]) return RARITY_ORDER[ub.rarity] - RARITY_ORDER[ua.rarity];
    return getEffectiveUnitStats(b).dmg - getEffectiveUnitStats(a).dmg;
  });
  saveData.squad = [null, null, null, null, null, null];
  for (let i = 0; i < Math.min(6, ids.length); i++) saveData.squad[i] = ids[i];
  saveGame(); renderSquadAndInventory();
  showToast('✨ Equipped your 6 strongest defenders!');
});
function toggleEquipUnit(unitId) {
  const idx = saveData.squad.indexOf(unitId);
  if (idx !== -1) { saveData.squad[idx] = null; saveGame(); renderSquadAndInventory(); return; }
  const emptyIdx = saveData.squad.indexOf(null);
  if (emptyIdx === -1) { showToast('⚠️ Squad is full (6/6)! Remove a unit first.', '#fbbf24'); return; }
  saveData.squad[emptyIdx] = unitId;
  saveGame(); renderSquadAndInventory();
}
function upgradeUnitLobby(unitId) {
  const inv = saveData.owned[unitId];
  if (!inv) return;
  if (inv.level >= MAX_LEVEL) { showToast('⭐ Already at max level!', '#fbbf24'); return; }
  const cost = upgradeCost(inv.level);
  if (saveData.gold < cost) { showToast(`❌ Need ${cost} Gold 🪙 to upgrade!`, '#f87171'); sfx('error'); return; }
  saveData.gold -= cost; inv.level++;
  sfx('upgrade'); saveGame(); renderSquadAndInventory();
  showToast(`⬆️ <b>${getUnitDef(unitId).name}</b> upgraded to <b>Lv.${inv.level}</b>!`, '#34d399');
}

function renderSquadAndInventory() {
  let power = 0;
  $('squadSlotsContainer').innerHTML = saveData.squad.map((unitId, slotIdx) => {
    if (!unitId) return `<div class="squad-slot-card"><div class="text-xs muted font-bold">SLOT ${slotIdx + 1}</div><div style="font-size:24px;opacity:.35;">➕</div><div class="text-xs muted">Empty</div></div>`;
    const def = getUnitDef(unitId), stats = getEffectiveUnitStats(unitId);
    power += Math.round(stats.dmg / stats.spa);
    return `
      <div class="squad-slot-card filled rarity-${def.rarity} ${def.evolved ? 'is-evolved' : ''}" onclick="toggleEquipUnit('${unitId}')" title="Click to unequip">
        ${tagHtml(def, `SLOT ${slotIdx + 1} • Lv.${stats.level}`)}
        <div style="font-size:30px;">${def.icon}</div>
        <div class="font-bold text-xs">${def.name}</div>
        <div class="text-xs" style="color:#fbbf24;">${stats.stars > 0 ? '★'.repeat(Math.min(5, stats.stars)) : '0★'}</div>
        <div class="text-xs muted">DMG ${stats.dmg} • $${def.cost} • Cap ${getUnitCap(def)}</div>
      </div>`;
  }).join('');
  $('squadPower').textContent = `⚔ Power ${power.toLocaleString()}`;

  const sortBy = $('sortSelect').value;
  const sorters = {
    rarity: (a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || getEffectiveUnitStats(b.id).dmg - getEffectiveUnitStats(a.id).dmg,
    dmg: (a, b) => getEffectiveUnitStats(b.id).dmg - getEffectiveUnitStats(a.id).dmg,
    level: (a, b) => saveData.owned[b.id].level - saveData.owned[a.id].level,
    cost: (a, b) => a.cost - b.cost
  };
  const list = Object.keys(saveData.owned).map(getUnitDef).filter(u => u && (currentFilter === 'all' || u.rarity === currentFilter)).sort(sorters[sortBy]);
  $('ownedUnitsGrid').innerHTML = list.map(u => {
    const id = u.baseId || u.id;
    const stats = getEffectiveUnitStats(id), isEq = saveData.squad.includes(id), maxed = stats.level >= MAX_LEVEL;
    return `
      <div class="unit-card rarity-${u.rarity} ${u.evolved ? 'is-evolved' : ''}">
        <div class="flex-center">
          <div class="unit-avatar">${u.icon}</div>
          <div>
            ${tagHtml(u)}
            <div class="font-bold text-sm" style="margin-top:2px;">${u.name}</div>
            <div class="text-xs muted">Lv.${stats.level} • <span style="color:#fbbf24;">${stats.stars}★</span> • $${u.cost} • Cap ${getUnitCap(u)}</div>
          </div>
        </div>
        <div class="stat-grid">
          <div class="stat-pill"><div class="stat-label">DMG</div><div class="stat-val">${stats.dmg}</div></div>
          <div class="stat-pill"><div class="stat-label">RNG</div><div class="stat-val">${stats.rng}</div></div>
          <div class="stat-pill"><div class="stat-label">SPA</div><div class="stat-val">${stats.spa}s</div></div>
        </div>
        <div class="passive-box"><b style="color:#38bdf8;">${u.passiveName}:</b> <span class="muted">${u.passiveDesc}</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto;">
          <button class="btn ${isEq ? 'btn-danger' : 'btn-primary'}" style="padding:8px;" onclick="toggleEquipUnit('${id}')">${isEq ? '✕ Unequip' : '＋ Equip'}</button>
          <button class="btn btn-gold" style="padding:8px;" ${maxed ? 'disabled' : ''} onclick="upgradeUnitLobby('${id}')">${maxed ? '★ MAX' : `⬆ Lv.+1 (${upgradeCost(stats.level)}🪙)`}</button>
        </div>
      </div>`;
  }).join('') || '<div class="text-sm muted">No units of this rarity yet.</div>';
}

function renderCodex() {
  $('codexCompletion').textContent = `Discovered: ${Object.keys(saveData.owned).length} / ${UNIT_ROSTER.length}`;
  $('codexGrid').innerHTML = UNIT_ROSTER.map(u => {
    const owned = saveData.owned[u.id];
    const evo = EVOLUTIONS[u.id];
    return `
      <div class="unit-card rarity-${u.rarity} ${owned ? '' : 'locked'}" style="opacity:${owned ? 1 : 0.7};">
        <div class="flex-center">
          <div class="unit-avatar">${u.icon}</div>
          <div>
            <span class="rarity-tag badge-${u.rarity}">${u.rarity}</span>${u.exclusive ? '<span class="rarity-tag badge-secret" style="margin-left:4px;">ECLIPSE</span>' : ''}
            <div class="font-bold text-sm" style="margin-top:2px;">${u.name}</div>
            <div class="text-xs" style="color:${owned ? '#34d399' : '#94a3b8'};">${owned ? `✔ Unlocked • ${owned.copies} copies` : '🔒 Unsummoned'} • $${u.cost}</div>
          </div>
        </div>
        <div class="stat-grid">
          <div class="stat-pill"><div class="stat-label">Base DMG</div><div class="stat-val">${u.dmg}</div></div>
          <div class="stat-pill"><div class="stat-label">Base RNG</div><div class="stat-val">${u.rng}</div></div>
          <div class="stat-pill"><div class="stat-label">Base SPA</div><div class="stat-val">${u.spa}s</div></div>
        </div>
        <div class="passive-box"><b style="color:#38bdf8;">${u.passiveName}:</b> <span class="muted">${u.passiveDesc}</span></div>
        <div class="text-xs muted">Placement cap: <b style="color:#f1f5f9;">${getUnitCap(u)}</b>${evo ? ` · Evolves → <b style="color:#fde047;">${evo.icon} ${evo.name}</b>` : ''}</div>
      </div>`;
  }).join('');
}

/* ==========================================================================
   8. EVOLUTION
   ========================================================================== */
function checkEvolve(id) {
  const inv = saveData.owned[id], req = evoReq(id);
  if (!inv) return { owned: false, ok: false, checks: [] };
  const checks = [{ label: `Unit Level ${req.reqLevel}`, have: inv.level, need: req.reqLevel, ok: inv.level >= req.reqLevel }];
  for (const [m, n] of Object.entries(req.mats)) checks.push({ label: `${MATERIALS[m].icon} ${MATERIALS[m].name}`, have: saveData.materials[m] || 0, need: n, ok: (saveData.materials[m] || 0) >= n });
  checks.push({ label: '🪙 Gold', have: saveData.gold, need: req.gold, ok: saveData.gold >= req.gold });
  return { owned: true, evolved: !!inv.evolved, ok: !inv.evolved && checks.every(c => c.ok), checks };
}
function evolveUnit(id) {
  if (game.active) { showToast('⚠️ Finish or exit your current run before evolving.', '#fbbf24'); sfx('error'); return; }
  const st = checkEvolve(id);
  if (!st.ok) { showToast('❌ Requirements not met.', '#f87171'); sfx('error'); return; }
  const req = evoReq(id);
  for (const [m, n] of Object.entries(req.mats)) saveData.materials[m] -= n;
  saveData.gold -= req.gold;
  saveData.owned[id].evolved = true;
  checkAchievements(); saveGame();
  sfx('evolve'); flashScreen('rgba(253,224,71,.6)');
  const d = getEvolvedDef(id);
  renderEvolve(); renderSquadAndInventory(); renderInventory();
  openModal('★ EVOLUTION COMPLETE', `
    <div style="text-align:center;padding:20px 0;">
      <div class="evo-burst"><span style="font-size:70px;">${UNIT_MAP[id].icon}</span><span style="font-size:36px;">➜</span><span style="font-size:80px;">${d.icon}</span></div>
      <h2 style="margin-top:14px;color:#fde047;">${d.name}</h2>
      <p class="text-sm muted" style="margin-top:6px;">${d.passiveName}: ${d.passiveDesc}</p>
      <p class="text-sm" style="margin-top:8px;color:#34d399;">Placement cap is now ${getUnitCap(d)}.</p>
      <button class="btn btn-gold" style="margin-top:16px;" onclick="closeModal()">Magnificent</button>
    </div>`);
}
function renderEvolve() {
  const ids = Object.keys(EVOLUTIONS).sort((a, b) => RARITY_ORDER[UNIT_MAP[a].rarity] - RARITY_ORDER[UNIT_MAP[b].rarity]);
  const evolvedCount = ids.filter(id => saveData.owned[id] && saveData.owned[id].evolved).length;
  $('evolveSummary').textContent = `Evolved: ${evolvedCount} / ${ids.length}`;
  $('evolveMats').innerHTML = Object.keys(MATERIALS).map(m => matChip(m, saveData.materials[m] || 0)).join('') + `<span class="mat-chip" style="border-color:#fbbf24;color:#fbbf24;">🪙 ${saveData.gold.toLocaleString()}</span>`;
  $('evolveGrid').innerHTML = ids.map(id => {
    const base = UNIT_MAP[id], evo = EVOLUTIONS[id], inv = saveData.owned[id];
    const st = checkEvolve(id), ed = getEvolvedDef(id);
    const bs = getEffectiveUnitStats(id, base), es = getEffectiveUnitStats(id, ed);
    const cmp = (l, a, b, unit = '') => `<div class="stat-pill"><div class="stat-label">${l}</div><div class="stat-val">${a}${unit} <span style="color:#34d399;">➜ ${b}${unit}</span></div></div>`;
    let body;
    if (!inv) body = `<div class="text-xs muted" style="text-align:center;padding:10px;">🔒 Summon <b>${base.name}</b> to unlock its evolution.${base.exclusive ? ' (Eclipse banner exclusive)' : ''}</div>`;
    else if (inv.evolved) body = `<div class="text-xs" style="color:#fde047;text-align:center;padding:10px;font-weight:800;">★ Already evolved — equip it in your Squad!</div>`;
    else body = `<div class="req-list">${st.checks.map(c => `<div class="req-row ${c.ok ? 'ok' : 'no'}"><span>${c.ok ? '✔' : '✖'} ${c.label}</span><span>${c.have.toLocaleString()} / ${c.need.toLocaleString()}</span></div>`).join('')}</div>
      <button class="btn btn-gold" style="width:100%;margin-top:8px;" ${st.ok ? '' : 'disabled'} onclick="evolveUnit('${id}')">★ Evolve</button>`;
    return `
      <div class="unit-card evo-card rarity-${base.rarity} ${inv && inv.evolved ? 'is-evolved' : ''}" style="${inv ? '' : 'opacity:.75;'}">
        <div class="evo-head">
          <div class="unit-avatar">${base.icon}</div><div class="evo-arrow">➜</div><div class="unit-avatar evo-avatar">${evo.icon}</div>
        </div>
        <div>
          <span class="rarity-tag badge-${base.rarity}">${base.rarity}</span>${inv ? `<span class="text-xs muted"> Lv.${inv.level}</span>` : ''}
          <div class="font-bold text-sm" style="margin-top:2px;">${base.name}</div>
          <div class="font-bold text-sm" style="color:#fde047;">➜ ${evo.name}</div>
        </div>
        <div class="stat-grid" style="grid-template-columns:1fr;">
          ${cmp('DMG', bs.dmg, es.dmg)}${cmp('RNG', bs.rng, es.rng)}${cmp('SPA', bs.spa, es.spa, 's')}
          ${cmp('Cap', getUnitCap(base), getUnitCap(ed))}
        </div>
        <div class="passive-box" style="border-color:rgba(253,224,71,.4);background:rgba(253,224,71,.07);"><b style="color:#fde047;">${evo.passiveName}:</b> <span class="muted">${evo.passiveDesc}</span></div>
        ${body}
      </div>`;
  }).join('');
}

/* ==========================================================================
   9. INVENTORY
   ========================================================================== */
function renderInventory() {
  $('invMaterials').innerHTML = Object.entries(MATERIALS).map(([id, m]) => `
    <div class="mat-card" style="border-color:${m.color};">
      <div class="mat-icon" style="color:${m.color};">${m.icon}</div>
      <div class="mat-count" style="color:${m.color};">${(saveData.materials[id] || 0).toLocaleString()}</div>
      <div class="font-bold text-sm">${m.name}</div>
      <div class="text-xs muted">${m.desc}</div>
      <div class="text-xs" style="margin-top:4px;color:#94a3b8;">Source: ${m.source}</div>
    </div>`).join('');
  $('invTickets').innerHTML = Object.values(BANNERS).map(b => `
    <div class="mat-card" style="border-color:#fbbf24;">
      <div class="mat-icon">🎫</div>
      <div class="mat-count" style="color:#fbbf24;">${saveData.tickets[b.id] || 0}</div>
      <div class="font-bold text-sm">${b.short} Ticket</div>
      <div class="text-xs muted">Free 1x summon on the ${b.short} banner.</div>
      <button class="btn btn-ghost" style="margin-top:8px;padding:6px 10px;font-size:.78rem;" onclick="currentBannerId='${b.id}';document.querySelector('[data-tab=summon]').click();">Go to banner</button>
    </div>`).join('');
  const owned = Object.keys(saveData.owned);
  const totalStars = owned.reduce((a, id) => a + saveData.owned[id].stars, 0);
  const rows = [['Units Owned', `${owned.length} / ${UNIT_ROSTER.length}`], ['Total Stars', totalStars], ['Evolved Units', countEvolved()], ['Highest Level', Math.max(1, ...owned.map(id => saveData.owned[id].level))],
    ['Gems', saveData.gems.toLocaleString()], ['Gold', saveData.gold.toLocaleString()], ['Trial Tiers', `${countTrialClears()} / 12`]];
  $('invSummary').innerHTML = rows.map(([l, v]) => `<div class="stat-pill"><div class="stat-label">${l}</div><div class="stat-val">${v}</div></div>`).join('');
  const ready = Object.keys(EVOLUTIONS).filter(id => checkEvolve(id).ok);
  $('invReady').innerHTML = ready.length
    ? `<b style="color:#fde047;">★ Ready to evolve:</b> ${ready.map(id => `${UNIT_MAP[id].icon} ${UNIT_MAP[id].name}`).join(', ')}`
    : '<span class="muted">No unit is ready to evolve yet — run Challenger Trials for materials.</span>';
}

/* ==========================================================================
   10. STAGE / TRIAL SELECT
   ========================================================================== */
let battleMode = 'expedition';
function setBattleMode(m) {
  battleMode = m;
  $('expeditionPane').style.display = m === 'expedition' ? 'block' : 'none';
  $('trialPane').style.display = m === 'trial' ? 'block' : 'none';
  $('modeExpedition').classList.toggle('active', m === 'expedition');
  $('modeTrial').classList.toggle('active', m === 'trial');
  renderStageSelect();
}
function renderStageSelect() {
  $('stageGrid').innerHTML = STAGES.map(st => {
    const unlocked = isStageUnlocked(st);
    const best = saveData.bestWave[st.id] || 0;
    const lockText = st.unlock ? `Reach wave ${st.unlock.wave} in ${STAGES.find(s => s.id === st.unlock.stage).name}` : '';
    return `
      <div class="stage-card ${saveData.selectedStage === st.id ? 'selected' : ''} ${unlocked ? '' : 'locked'}" style="--stage:${st.accent};" onclick="selectStage('${st.id}')">
        <div class="stage-glow"></div>
        <div class="flex-between" style="margin-bottom:6px;">
          <span class="font-bold" style="font-size:1.05rem;">${unlocked ? '' : '🔒 '}${st.name}</span>
          <span class="rarity-tag" style="color:${st.diffColor};border:1px solid ${st.diffColor};">${st.difficulty}</span>
        </div>
        <p class="text-xs muted" style="margin-bottom:10px;line-height:1.4;">${unlocked ? st.desc : '🔒 ' + lockText}</p>
        <div class="flex-between text-xs font-bold">
          <span>Enemy HP: ${st.hpMult}x</span>
          <span style="color:#c084fc;">Rewards: ${st.rewardMult}x</span>
        </div>
        <div class="flex-between text-xs" style="margin-top:6px;">
          <span class="muted">Best: <b style="color:#38bdf8;">Wave ${best}</b></span>
          <span>${saveData.cleared[st.id] ? '<span style="color:#34d399;">✔ Cleared</span>' : '<span class="muted">First clear: +' + Math.round(250 * st.rewardMult) + '💎</span>'}</span>
        </div>
      </div>`;
  }).join('');

  $('trialGrid').innerHTML = TRIALS.map(tr => {
    const unlocked = isTrialUnlocked(tr), prog = saveData.trialProgress[tr.id] || 0;
    const sel = saveData.selectedTrial === tr.id, mat = MATERIALS[tr.mat];
    const lockText = tr.unlock ? `Reach wave ${tr.unlock.wave} in ${STAGES.find(s => s.id === tr.unlock.stage).name}` : '';
    const tier = sel ? saveData.selectedTier : 1;
    const tiers = [1, 2, 3].map(n => {
      const ok = unlocked && isTierUnlocked(tr, n);
      return `<button class="tier-btn ${sel && saveData.selectedTier === n ? 'active' : ''} ${ok ? '' : 'locked'}" onclick="event.stopPropagation();selectTrial('${tr.id}',${n})">${ok ? '' : '🔒'} ${TIER_NAMES[n - 1]}${prog >= n ? ' ✔' : ''}</button>`;
    }).join('');
    return `
      <div class="stage-card trial-card ${sel ? 'selected' : ''} ${unlocked ? '' : 'locked'}" style="--stage:${mat.color};" onclick="selectTrial('${tr.id}',0)">
        <div class="stage-glow"></div>
        <div class="flex-between" style="margin-bottom:6px;">
          <span class="font-bold" style="font-size:1.05rem;">${unlocked ? tr.icon : '🔒'} ${tr.name}</span>
          <span class="rarity-tag" style="color:${mat.color};border:1px solid ${mat.color};">${mat.icon} ${mat.name}</span>
        </div>
        <p class="text-xs muted" style="margin-bottom:8px;line-height:1.4;">${unlocked ? tr.desc : '🔒 ' + lockText}</p>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">${tr.mods.map(m => `<span class="chip">${m}</span>`).join('')}<span class="chip">${tr.waves} waves</span><span class="chip">❤️ ${tr.lives}</span></div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">${tiers}</div>
        <div class="text-xs"><span class="muted">Tier ${TIER_NAMES[tier - 1]} reward:</span> ${matChip(tr.mat, tr.tierMats[tier - 1])} <span class="muted">(+25% on full clear)</span></div>
      </div>`;
  }).join('');
}
function selectStage(id) {
  const st = STAGES.find(s => s.id === id);
  if (!isStageUnlocked(st)) { showToast(`🔒 Reach wave ${st.unlock.wave} in ${STAGES.find(s => s.id === st.unlock.stage).name} first.`, '#fbbf24'); sfx('error'); return; }
  saveData.selectedStage = id; saveGame(); renderStageSelect();
}
function selectTrial(id, tier) {
  const tr = TRIALS.find(t => t.id === id);
  if (!isTrialUnlocked(tr)) { showToast(`🔒 Reach wave ${tr.unlock.wave} in ${STAGES.find(s => s.id === tr.unlock.stage).name} first.`, '#fbbf24'); sfx('error'); return; }
  if (tier === 0) tier = saveData.selectedTrial === id ? saveData.selectedTier : 1;
  if (!isTierUnlocked(tr, tier)) { showToast(`🔒 Clear Tier ${TIER_NAMES[tier - 2]} first.`, '#fbbf24'); sfx('error'); return; }
  saveData.selectedTrial = id; saveData.selectedTier = tier; saveGame(); renderStageSelect();
}

/* ==========================================================================
   11. MATCH STATE
   ========================================================================== */
const GRID_COLS = 16, GRID_ROWS = 10;
const PULSE_CD = 45, FREEZE_CD = 60;
const BG_STARS = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, p: Math.random() * 6.28 }));
const AMBIENT = Array.from({ length: 64 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + 0.6, s: Math.random(), f: Math.random() * 1.2 + 0.4, p: Math.random() * 6.28 }));
const AMBIENT_COLORS = { snow: '#e0f2fe', ember: '#fb923c', bubbles: '#99f6e4', void: '#c084fc', motes: '#bef264', stars: '#e9d5ff' };

function newGame(stage, active, opts = {}) {
  const trial = opts.trial || null, tier = opts.tier || 1;
  return {
    active, paused: false, speed: 1, autoWave: false, stage, trial, tier,
    hpMult: trial ? trial.hpTier[tier - 1] : stage.hpMult,
    rewardMult: trial ? 0.8 : stage.rewardMult,
    lives: trial ? trial.lives : 20, cash: trial ? trial.startCash : 260, wave: 0, maxWave: trial ? trial.waves : 20, endless: false,
    earnedGems: 0, earnedGold: 0,
    pathCells: buildPathCellSet(stage.waypoints), pixelWaypoints: [],
    towers: [], enemies: [], pending: [], projectiles: [], effects: [], particles: [], floatingTexts: [],
    spawnQueue: [], spawnTimer: 0, waveInProgress: false,
    selectedHotbarIndex: 0, selectedTower: null, hoverCell: null,
    time: 0, shake: 0, skills: { pulse: 0, freeze: 0 }, _pv: -1
  };
}
function buildPathCellSet(waypoints) {
  const set = new Set();
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
    let cx = a.x, cy = a.y;
    set.add(`${cx},${cy}`);
    while (cx !== b.x || cy !== b.y) { cx += dx; cy += dy; set.add(`${cx},${cy}`); }
  }
  return set;
}

let game = newGame(STAGES[0], false);
const canvas = $('gameCanvas');
const ctx = canvas.getContext('2d');

function getLogicalDimensions() {
  const rect = canvas.parentElement.getBoundingClientRect();
  return { w: rect.width || 800, h: rect.height || 500 };
}
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(320, Math.floor(rect.width * dpr));
  canvas.height = Math.max(200, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  recomputeWaypoints();
}
window.addEventListener('resize', () => { if (game.active) resizeCanvas(); });
function recomputeWaypoints() {
  const { w, h } = getLogicalDimensions();
  const cw = w / GRID_COLS, ch = h / GRID_ROWS;
  game.pixelWaypoints = game.stage.waypoints.map(pt => ({ x: (pt.x + 0.5) * cw, y: (pt.y + 0.5) * ch }));
  game.towers.forEach(t => { t.x = (t.gx + 0.5) * cw; t.y = (t.gy + 0.5) * ch; });
}

$('btnLaunchStage').addEventListener('click', () => {
  if (saveData.squad.filter(Boolean).length === 0) { showToast('⚠️ Equip at least 1 unit in the Squad tab first!', '#fbbf24'); sfx('error'); return; }
  let opts = {}, stage;
  if (battleMode === 'trial') {
    const tr = TRIALS.find(t => t.id === saveData.selectedTrial) || TRIALS[0];
    if (!isTrialUnlocked(tr)) { showToast('🔒 That trial is still locked.', '#fbbf24'); sfx('error'); return; }
    const tier = isTierUnlocked(tr, saveData.selectedTier) ? saveData.selectedTier : 1;
    stage = STAGES.find(s => s.id === tr.stage) || STAGES[0];
    opts = { trial: tr, tier };
  } else {
    stage = STAGES.find(s => s.id === saveData.selectedStage) || STAGES[0];
    if (!isStageUnlocked(stage)) stage = STAGES[0];
  }
  game = newGame(stage, true, opts);
  $('stageSelectPanel').style.display = 'none';
  $('activeArenaPanel').style.display = 'block';
  $('btnAutoWave').textContent = '🔁 Auto: OFF';
  $('btnSpeed').textContent = '⏩ 1x';
  $('btnPause').textContent = '⏸️';
  resizeCanvas(); renderBattleHotbar(); updateBattleHUD(); updateInspector();
  showToast(game.trial ? `🔥 <b>${game.trial.name}</b> — Tier ${TIER_NAMES[game.tier - 1]}! Place defenders, then press <b>Space</b>.`
    : `⚔️ Deployed to <b>${stage.name}</b>! Place your defenders, then press <b>Space</b>.`);
});
$('btnRetreat').addEventListener('click', () => endMatch(false, true));

function setPaused(v) {
  if (!game.active) return;
  game.paused = v;
  $('btnPause').textContent = v ? '▶️' : '⏸️';
}

function endMatch(victory, retreated = false) {
  if (!game.active) return;
  game.active = false; game.paused = false;
  const cleared = Math.max(0, game.wave - (game.waveInProgress ? 1 : 0));
  const trial = game.trial;
  const stagesBefore = STAGES.filter(isStageUnlocked).map(s => s.id);
  const trialsBefore = TRIALS.filter(isTrialUnlocked).map(s => s.id);

  saveData.stats.matches++;
  if (victory) saveData.stats.wins++;
  let bonusGems = 0, firstTier = false;
  const mats = {}, tickets = {};

  if (trial) {
    const frac = Math.min(1, cleared / trial.waves);
    const main = Math.round(trial.tierMats[game.tier - 1] * frac * (victory ? 1.25 : 1));
    if (main > 0) mats[trial.mat] = main;
    if (trial.mat !== 'essence') { const e = Math.round(6 * game.tier * frac); if (e > 0) mats.essence = e; }
    if (victory && game.tier > (saveData.trialProgress[trial.id] || 0)) {
      saveData.trialProgress[trial.id] = game.tier; firstTier = true;
      Object.assign(tickets, TRIAL_TICKETS[game.tier - 1]);
    }
  } else {
    const sid = game.stage.id;
    saveData.stats.maxWave = Math.max(saveData.stats.maxWave, cleared);
    saveData.bestWave[sid] = Math.max(saveData.bestWave[sid] || 0, cleared);
    if (cleared >= 20 && !saveData.cleared[sid]) { saveData.cleared[sid] = true; bonusGems = Math.round(250 * game.stage.rewardMult); }
    const e = Math.floor(cleared * 0.8 * game.rewardMult);
    if (e > 0) mats.essence = e;
  }
  for (const [k, v] of Object.entries(mats)) saveData.materials[k] = (saveData.materials[k] || 0) + v;
  for (const [k, v] of Object.entries(tickets)) saveData.tickets[k] = (saveData.tickets[k] || 0) + v;
  saveData.gems += game.earnedGems + bonusGems;
  saveData.gold += game.earnedGold;
  const newStages = STAGES.filter(s => isStageUnlocked(s) && !stagesBefore.includes(s.id));
  const newTrials = TRIALS.filter(s => isTrialUnlocked(s) && !trialsBefore.includes(s.id));
  checkAchievements(); saveGame();
  sfx(victory ? 'win' : (retreated ? 'place' : 'lose'));

  $('activeArenaPanel').style.display = 'none';
  $('stageSelectPanel').style.display = 'block';
  renderStageSelect();

  const where = trial ? `${trial.name} (Tier ${TIER_NAMES[game.tier - 1]})` : game.stage.name;
  const matHtml = Object.entries(mats).map(([k, v]) => matChip(k, '+' + v)).join(' ');
  const tkHtml = Object.entries(tickets).map(([k, v]) => `<span class="mat-chip" style="border-color:#fbbf24;color:#fbbf24;">🎫 +${v} ${BANNERS[k].short}</span>`).join(' ');
  openModal(victory ? '🏆 Expedition Complete!' : (retreated ? '🏳️ Expedition Ended' : '💀 Defeated!'), `
    <p class="text-sm muted" style="margin:10px 0;">Cleared <b>${cleared} waves</b> in <b>${where}</b>${trial ? '' : ` (best: ${saveData.bestWave[game.stage.id]})`}.</p>
    <div class="stat-grid" style="margin:14px 0;">
      <div class="stat-pill"><div class="stat-label">Gems Earned</div><div class="stat-val" style="color:#c084fc;">+${game.earnedGems + bonusGems} 💎</div></div>
      <div class="stat-pill"><div class="stat-label">Gold Earned</div><div class="stat-val" style="color:#fbbf24;">+${game.earnedGold} 🪙</div></div>
      <div class="stat-pill"><div class="stat-label">Waves Cleared</div><div class="stat-val">${cleared}</div></div>
    </div>
    ${matHtml ? `<p class="text-sm" style="margin-bottom:8px;"><b>Materials:</b> ${matHtml}</p>` : ''}
    ${tkHtml ? `<p class="text-sm" style="margin-bottom:8px;"><b>First-clear tickets:</b> ${tkHtml}</p>` : ''}
    ${firstTier ? `<p class="text-sm" style="color:#34d399;margin-bottom:8px;">🎉 First clear of Tier ${TIER_NAMES[game.tier - 1]}!</p>` : ''}
    ${bonusGems ? `<p class="text-sm" style="color:#34d399;margin-bottom:8px;">🎉 First-clear bonus included: +${bonusGems}💎</p>` : ''}
    ${newStages.length ? `<p class="text-sm" style="color:#fbbf24;margin-bottom:8px;">🔓 New stage unlocked: <b>${newStages.map(s => s.name).join(', ')}</b></p>` : ''}
    ${newTrials.length ? `<p class="text-sm" style="color:#fbbf24;margin-bottom:8px;">🔓 New trial unlocked: <b>${newTrials.map(s => s.name).join(', ')}</b></p>` : ''}
    <div style="text-align:right;"><button class="btn btn-primary" onclick="closeModal()">Continue</button></div>`);
}

/* ==========================================================================
   12. WAVES & ENEMIES
   ========================================================================== */
function buildTrialWave(tr, w) {
  const count = tr.bossRush ? 5 + Math.floor(w * 1.1) : 8 + Math.floor(w * 1.5), list = [];
  for (let i = 0; i < count; i++) list.push(tr.pool[(i + w) % tr.pool.length]);
  if (tr.bossWaves.includes(w)) list.push('boss');
  return list;
}
function buildWaveList(w, trial) {
  if (trial === undefined) trial = game && game.trial;
  if (trial) return buildTrialWave(trial, w);
  const count = 7 + Math.floor(w * 1.4), list = [];
  for (let i = 0; i < count; i++) {
    let k = 'normal';
    if (w >= 2 && i % 4 === 1) k = 'fast';
    if (w >= 3 && i % 5 === 2) k = 'armored';
    if (w >= 4 && i % 8 === 5) k = 'swarm';
    if (w >= 6 && i % 6 === 3) k = 'regen';
    if (w >= 8 && i % 9 === 6) k = 'splitter';
    if (w >= 9 && i % 7 === 4) k = 'shield';
    list.push(k);
  }
  if (w % 5 === 0) list.push('boss');
  return list;
}
function createEnemyBlueprint(kind, diffMult, wave) {
  const base = 65 * diffMult, sm = (game.trial && game.trial.speedMult) || 1;
  const bp = { kind, diffMult };
  switch (kind) {
    case 'fast': return { ...bp, type: 'Fast Runner', color: '#38bdf8', radius: 10, maxHp: Math.round(base * 0.65), speed: 88 * sm, armor: 0, regen: 0, reward: 14 + wave };
    case 'armored': return { ...bp, type: 'Iron Juggernaut', color: '#94a3b8', radius: 14, maxHp: Math.round(base * 1.75), speed: 42 * sm, armor: 0.35, regen: 0, reward: 20 + wave * 2 };
    case 'regen': return { ...bp, type: 'Troll Regenerator', color: '#34d399', radius: 13, maxHp: Math.round(base * 1.35), speed: 54 * sm, armor: 0.1, regen: base * 0.04, reward: 22 + wave * 2 };
    case 'shield': return { ...bp, type: 'Aegis Striker', color: '#a855f7', radius: 13, maxHp: Math.round(base * 1.5), speed: 62 * sm, armor: 0.25, regen: 0, reward: 25 + wave * 2 };
    case 'swarm': return { ...bp, type: 'Swarmling', color: '#fb923c', radius: 8, maxHp: Math.round(base * 0.32), speed: 80 * sm, armor: 0, regen: 0, reward: 4 + Math.floor(wave / 2) };
    case 'splitter': return { ...bp, type: 'Brood Splitter', color: '#facc15', radius: 14, maxHp: Math.round(base * 1.6), speed: 50 * sm, armor: 0, regen: 0, reward: 24 + wave * 2 };
    case 'boss': return { ...bp, type: 'ABYSSAL OVERLORD', color: '#f43f5e', radius: 20, isBoss: true, maxHp: Math.round(base * 6.5), speed: 34 * sm, armor: 0.3, regen: base * 0.02, reward: 110 + wave * 8 };
    default: return { ...bp, type: 'Void Stalker', color: '#f87171', radius: 12, maxHp: Math.round(base), speed: 58 * sm, armor: 0, regen: 0, reward: 15 + wave };
  }
}
function spawnEnemy(bp, extra = {}) {
  const start = game.pixelWaypoints[0];
  game.enemies.push({ ...bp, hp: bp.maxHp, x: start.x, y: start.y, wpIndex: 1, travel: 0,
    slowTimer: 0, slowFactor: 0, stunTimer: 0, burnTimer: 0, burnDps: 0, burnSrc: null, ...extra });
}
function startNextWave() {
  if (!game.active || game.waveInProgress) return;
  game.wave++;
  game.waveInProgress = true;
  game.spawnTimer = 0.2;
  const w = game.wave;
  const diffMult = game.hpMult * Math.pow(1.16, w - 1);
  const list = buildWaveList(w);
  game.spawnQueue = list.map(k => createEnemyBlueprint(k, diffMult, w));
  if (list.includes('boss')) { showToast(`⚠️ <b>WAVE ${w} BOSS INCOMING!</b>`, '#f43f5e'); sfx('boss'); game.shake = Math.max(game.shake, 0.5); }
  else sfx('wave');
  updateBattleHUD();
}
$('btnStartWave').addEventListener('click', startNextWave);
$('btnAutoWave').addEventListener('click', () => {
  game.autoWave = !game.autoWave;
  $('btnAutoWave').textContent = `🔁 Auto: ${game.autoWave ? 'ON' : 'OFF'}`;
  if (game.autoWave && !game.waveInProgress) startNextWave();
});
$('btnSpeed').addEventListener('click', () => {
  game.speed = game.speed === 1 ? 2 : (game.speed === 2 ? 3 : 1);
  $('btnSpeed').textContent = `⏩ ${game.speed}x`;
});
$('btnPause').addEventListener('click', () => setPaused(!game.paused));

/* ==========================================================================
   13. SKILLS
   ========================================================================== */
function useSkill(kind) {
  if (!game.active || game.paused) return;
  const { w, h } = getLogicalDimensions();
  if (kind === 'pulse') {
    if (game.skills.pulse > 0) { sfx('error'); return; }
    if (game.enemies.length === 0) { showToast('⚡ No enemies to hit!', '#fbbf24'); return; }
    game.skills.pulse = PULSE_CD;
    sfx('pulse');
    game.shake = Math.max(game.shake, 0.45);
    addFx({ type: 'ring', x: w / 2, y: h / 2, maxR: Math.hypot(w, h) / 1.6, color: '#c084fc', life: 0.7, lw: 6 });
    for (const e of [...game.enemies]) {
      if (e.dead) continue;
      e.hp -= e.maxHp * (e.isBoss ? 0.12 : 0.28);
      addFloatingText(e.x, e.y - 16, 'PULSE', '#c084fc', 12);
      burst(e.x, e.y, '#c084fc', 6, 110, 0.5);
      if (e.hp <= 0) killEnemy(e, null);
    }
    game.enemies = game.enemies.filter(e => !e.dead);
    flashScreen('rgba(192,132,252,.55)');
  } else {
    if (game.skills.freeze > 0) { sfx('error'); return; }
    if (game.enemies.length === 0) { showToast('❄️ No enemies to freeze!', '#fbbf24'); return; }
    game.skills.freeze = FREEZE_CD;
    sfx('freeze');
    addFx({ type: 'ring', x: w / 2, y: h / 2, maxR: Math.hypot(w, h) / 1.6, color: '#7dd3fc', life: 0.7, lw: 6 });
    for (const e of game.enemies) { e.stunTimer = Math.max(e.stunTimer, e.isBoss ? 2.0 : 3.5); burst(e.x, e.y, '#7dd3fc', 6, 80, 0.5); }
    flashScreen('rgba(125,211,252,.5)');
  }
}
$('btnSkillPulse').addEventListener('click', () => useSkill('pulse'));
$('btnSkillFreeze').addEventListener('click', () => useSkill('freeze'));
function updateSkillUI() {
  for (const [key, cd, id, fill, btn] of [['pulse', PULSE_CD, 'cdPulse', 'fillPulse', 'btnSkillPulse'], ['freeze', FREEZE_CD, 'cdFreeze', 'fillFreeze', 'btnSkillFreeze']]) {
    const left = game.skills[key], el = $(id);
    const txt = left > 0 ? `${Math.ceil(left)}s` : 'Ready';
    if (el.textContent !== txt) { el.textContent = txt; $(btn).classList.toggle('ready', left <= 0); }
    $(fill).style.width = `${left > 0 ? (1 - left / cd) * 100 : 100}%`;
  }
}

/* ==========================================================================
   14. TOWERS, PLACEMENT, INSPECTOR
   ========================================================================== */
function placedCount(unitId) { return game.towers.filter(t => t.unitId === unitId).length; }

function renderBattleHotbar() {
  $('battleHotbar').innerHTML = saveData.squad.map((unitId, idx) => {
    if (!unitId) return `<div class="hotbar-slot empty"><span class="hotkey-badge">${idx + 1}</span><div style="font-size:20px;margin-top:4px;">—</div><div class="text-xs muted">Empty</div></div>`;
    const def = getUnitDef(unitId), sel = game.selectedHotbarIndex === idx;
    const cap = getUnitCap(def), n = placedCount(unitId);
    return `
      <div class="hotbar-slot rarity-${def.rarity} ${sel ? 'selected-build' : ''} ${def.evolved ? 'is-evolved' : ''} ${n >= cap ? 'capped' : ''}" data-cost="${def.cost}" data-unit="${unitId}" onclick="selectHotbarSlot(${idx})">
        <span class="hotkey-badge">${idx + 1}</span>
        <span class="cap-badge">${n}/${cap}</span>
        <div style="font-size:24px;margin-top:2px;">${def.icon}</div>
        <div class="font-bold text-xs" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${def.name}</div>
        <div class="text-xs font-bold" style="color:#34d399;">$${def.cost}</div>
      </div>`;
  }).join('');
  refreshHotbarAfford();
}
function refreshHotbarAfford() {
  document.querySelectorAll('#battleHotbar .hotbar-slot[data-cost]').forEach(el => el.classList.toggle('poor', game.cash < Number(el.dataset.cost)));
}
function selectHotbarSlot(idx) {
  if (!saveData.squad[idx]) return;
  game.selectedHotbarIndex = idx; game.selectedTower = null;
  renderBattleHotbar(); updateInspector();
}
function clearSelection() {
  game.selectedHotbarIndex = null; game.selectedTower = null;
  renderBattleHotbar(); updateInspector();
}
window.addEventListener('keydown', (e) => {
  if (!game.active || $('summonModal').classList.contains('open')) return;
  const k = e.key.toLowerCase();
  if (k >= '1' && k <= '6') selectHotbarSlot(parseInt(k, 10) - 1);
  else if (k === 'escape') clearSelection();
  else if (k === ' ') { e.preventDefault(); startNextWave(); }
  else if (k === 'p') setPaused(!game.paused);
  else if (k === 'q') useSkill('pulse');
  else if (k === 'e') useSkill('freeze');
  else if (k === 'u' && game.selectedTower) upgradeTowerInMatch(game.selectedTower.uid);
  else if (k === 'x' && game.selectedTower) sellTower(game.selectedTower.uid);
  else if (k === 't' && game.selectedTower) cycleTowerPriority(game.selectedTower.uid);
});

function getCellFromPointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const gx = Math.floor(((clientX - rect.left) / rect.width) * GRID_COLS);
  const gy = Math.floor(((clientY - rect.top) / rect.height) * GRID_ROWS);
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return null;
  return { gx, gy };
}
function isCellBuildable(gx, gy) {
  return !game.pathCells.has(`${gx},${gy}`) && !game.towers.some(t => t.gx === gx && t.gy === gy);
}
canvas.addEventListener('mousemove', (e) => { if (game.active) game.hoverCell = getCellFromPointer(e.clientX, e.clientY); });
canvas.addEventListener('mouseleave', () => { game.hoverCell = null; });
canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (game.active) clearSelection(); });

canvas.addEventListener('click', (e) => {
  if (!game.active) return;
  const cell = getCellFromPointer(e.clientX, e.clientY);
  if (!cell) return;
  game.hoverCell = cell;
  const existing = game.towers.find(t => t.gx === cell.gx && t.gy === cell.gy);
  if (existing) {
    game.selectedTower = existing; game.selectedHotbarIndex = null;
    renderBattleHotbar(); updateInspector();
    return;
  }
  if (game.selectedHotbarIndex === null || !saveData.squad[game.selectedHotbarIndex]) {
    if (game.selectedTower) { game.selectedTower = null; updateInspector(); }
    return;
  }
  const unitId = saveData.squad[game.selectedHotbarIndex];
  const def = getUnitDef(unitId);
  if (!isCellBuildable(cell.gx, cell.gy)) { showToast('🚫 Cannot deploy on the enemy path!', '#f87171'); sfx('error'); return; }
  if (placedCount(unitId) >= getUnitCap(def)) { showToast(`🔒 Placement cap reached for ${def.name} (${getUnitCap(def)}).`, '#fbbf24'); sfx('error'); return; }
  if (game.cash < def.cost) { showToast(`💸 Need $${def.cost} Cash to deploy ${def.name}!`, '#f87171'); sfx('error'); return; }

  game.cash -= def.cost;
  const st = getEffectiveUnitStats(unitId);
  const { w, h } = getLogicalDimensions();
  const tower = {
    uid: Math.random().toString(36).slice(2), unitId, def, gx: cell.gx, gy: cell.gy,
    x: (cell.gx + 0.5) * (w / GRID_COLS), y: (cell.gy + 0.5) * (h / GRID_ROWS),
    tier: 1, maxTier: 5, totalInvested: def.cost,
    baseDmg: st.dmg, baseRng: st.rng, baseSpa: st.spa, farmBase: st.farmBase,
    dmg: st.dmg, rng: st.rng, spa: st.spa, cooldown: 0.2, cdMax: st.spa, targetPriority: 'first', kills: 0, soulBonus: 0, flash: 0, born: game.time
  };
  game.towers.push(tower);
  game.selectedTower = tower;
  addFx({ type: 'ring', x: tower.x, y: tower.y, maxR: 46, color: RARITIES[def.rarity].color, life: 0.4, lw: 3 });
  burst(tower.x, tower.y, def.evolved ? '#fde047' : RARITIES[def.rarity].color, 10, 90, 0.5);
  sfx('place');
  renderBattleHotbar(); updateBattleHUD(); updateInspector();
});

function getTowerUpgradeCost(t) { return Math.round(t.def.cost * (0.85 * Math.pow(1.45, t.tier - 1))); }
function upgradeTowerInMatch(uid) {
  const t = game.towers.find(tw => tw.uid === uid);
  if (!t || t.tier >= t.maxTier) return;
  const cost = getTowerUpgradeCost(t);
  if (game.cash < cost) { showToast(`💸 Need $${cost} Cash to upgrade!`, '#f87171'); sfx('error'); return; }
  game.cash -= cost; t.totalInvested += cost; t.tier++;
  t.dmg = Math.round(t.baseDmg * (1 + (t.tier - 1) * 0.42));
  t.rng = Math.round(t.baseRng * (1 + (t.tier - 1) * 0.08));
  t.spa = Number(Math.max(0.18, t.baseSpa * Math.pow(0.91, t.tier - 1)).toFixed(2));
  addFloatingText(t.x, t.y - 18, `TIER ${t.tier}!`, '#fbbf24', 14);
  addFx({ type: 'ring', x: t.x, y: t.y, maxR: 58, color: '#fbbf24', life: 0.45, lw: 3 });
  burst(t.x, t.y, '#fbbf24', 14, 110, 0.6);
  sfx('upgrade');
  updateBattleHUD(); updateInspector();
}
function cycleTowerPriority(uid) {
  const t = game.towers.find(tw => tw.uid === uid);
  if (!t) return;
  const modes = ['first', 'strongest', 'closest', 'last'];
  t.targetPriority = modes[(modes.indexOf(t.targetPriority) + 1) % modes.length];
  updateInspector();
}
function sellTower(uid) {
  const idx = game.towers.findIndex(tw => tw.uid === uid);
  if (idx === -1) return;
  const t = game.towers[idx], refund = Math.round(t.totalInvested * 0.7);
  game.cash += refund; game.towers.splice(idx, 1); game.selectedTower = null;
  addFloatingText(t.x, t.y, `+$${refund}`, '#34d399', 13);
  burst(t.x, t.y, '#34d399', 8, 80, 0.5);
  sfx('sell');
  renderBattleHotbar(); updateBattleHUD(); updateInspector();
}

function waveChipsHtml() {
  const w = game.wave + 1, counts = {};
  buildWaveList(w).forEach(k => { counts[k] = (counts[k] || 0) + 1; });
  const chips = Object.entries(counts).map(([k, n]) => `<span class="chip ${k === 'boss' ? 'boss' : ''}">${ENEMY_META[k].icon} ${ENEMY_META[k].label} ×${n}</span>`).join('');
  return `<b style="color:var(--text-main);">Next: Wave ${w}</b> ${chips}`;
}
function updateBattleHUD() {
  $('hudLives').textContent = Math.max(0, game.lives);
  $('hudCash').textContent = Math.floor(game.cash).toLocaleString();
  $('hudWave').textContent = game.wave;
  $('hudMaxWave').textContent = game.endless ? '∞' : game.maxWave;
  $('hudEarnedGems').textContent = game.earnedGems;
  $('hudEarnedGold').textContent = game.earnedGold;
  $('hudMode').textContent = game.trial ? `${game.trial.icon} ${TIER_NAMES[game.tier - 1]}` : `🗺️ ${game.stage.name}`;
  $('btnStartWave').disabled = game.waveInProgress;
  if (game._pv !== game.wave) { game._pv = game.wave; $('wavePreview').innerHTML = waveChipsHtml(); }
  refreshHotbarAfford();
}

function updateInspector() {
  const box = $('inspectorContent');
  if (game.selectedTower) {
    const t = game.selectedTower, upg = getTowerUpgradeCost(t), sellVal = Math.round(t.totalInvested * 0.7);
    const effDmg = Math.round(t.dmg * (1 + t.soulBonus));
    const dps = Math.round(effDmg / t.spa);
    const cap = getUnitCap(t.def);
    box.innerHTML = `
      <div class="flex-center">
        <div class="unit-avatar">${t.def.icon}</div>
        <div>
          ${tagHtml(t.def, `${t.def.rarity} • Tier ${t.tier}/${t.maxTier}`)}
          <div class="font-bold" style="margin-top:2px;">${t.def.name}</div>
          <div class="text-xs muted">Kills: ${t.kills} ${t.soulBonus > 0 ? `(+${Math.round(t.soulBonus * 100)}% Soul)` : ''} · Placed ${placedCount(t.unitId)}/${cap}</div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-pill"><div class="stat-label">DMG</div><div class="stat-val">${effDmg}</div></div>
        <div class="stat-pill"><div class="stat-label">RNG</div><div class="stat-val">${getRange(t)}</div></div>
        <div class="stat-pill"><div class="stat-label">SPA</div><div class="stat-val">${t.spa}s</div></div>
      </div>
      <div class="text-xs muted">≈ <b style="color:#f1f5f9;">${dps}</b> damage/sec per target${t.farmBase ? ` · +$${Math.round(t.farmBase * (1 + (t.tier - 1) * 0.45))} per wave` : ''}</div>
      <div class="passive-box"><b style="color:#38bdf8;">${t.def.passiveName}:</b> <span class="muted">${t.def.passiveDesc}</span></div>
      <button class="btn btn-ghost" style="width:100%;" onclick="cycleTowerPriority('${t.uid}')">🎯 Target: <span style="text-transform:uppercase;color:#38bdf8;">${t.targetPriority}</span> <span class="kbd">T</span></button>
      ${t.tier < t.maxTier
        ? `<button class="btn btn-gold" style="width:100%;" onclick="upgradeTowerInMatch('${t.uid}')">⬆ Upgrade Tier ${t.tier + 1} ($${upg}) <span class="kbd" style="color:#0f172a;border-color:rgba(0,0,0,.3);">U</span></button>`
        : `<button class="btn btn-ghost" disabled style="width:100%;">★ MAX TIER REACHED</button>`}
      <button class="btn btn-danger" style="width:100%;" onclick="sellTower('${t.uid}')">💸 Sell Tower (+$${sellVal}) <span class="kbd">X</span></button>`;
    return;
  }
  if (game.selectedHotbarIndex !== null && saveData.squad[game.selectedHotbarIndex]) {
    const unitId = saveData.squad[game.selectedHotbarIndex], def = getUnitDef(unitId), st = getEffectiveUnitStats(unitId);
    box.innerHTML = `
      <div class="flex-center">
        <div class="unit-avatar">${def.icon}</div>
        <div>
          ${tagHtml(def, `${def.rarity} • Deploy Preview`)}
          <div class="font-bold">${def.name}</div>
          <div class="text-xs font-bold" style="color:#34d399;">Cost: $${def.cost} · Placed ${placedCount(unitId)}/${getUnitCap(def)}</div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-pill"><div class="stat-label">DMG</div><div class="stat-val">${st.dmg}</div></div>
        <div class="stat-pill"><div class="stat-label">RNG</div><div class="stat-val">${st.rng}</div></div>
        <div class="stat-pill"><div class="stat-label">SPA</div><div class="stat-val">${st.spa}s</div></div>
      </div>
      <div class="passive-box"><b style="color:#38bdf8;">${def.passiveName}:</b> <span class="muted">${def.passiveDesc}</span></div>
      <div class="text-xs muted">Click any dark tile on the battlefield to deploy.</div>`;
    return;
  }
  box.innerHTML = `Select a unit from the bottom bar (keys <b>1-6</b>) and click a dark tile to deploy, or click a placed tower to upgrade it.<br><br>
    <b style="color:#f1f5f9;">Tips:</b> Each unit has a <b>placement cap</b> (shown as n/cap). Economy units (⛏️ 💰 👑) pay out after every wave — place them early. Use <span class="kbd">Q</span>/<span class="kbd">E</span> skills when bosses arrive.`;
}

/* ==========================================================================
   15. COMBAT HELPERS
   ========================================================================== */
function addFloatingText(x, y, text, color = '#fff', size = 12) {
  if (!saveData.settings.dmgText && size <= 12 && !text.startsWith('+$')) return;
  game.floatingTexts.push({ x, y, text, color, life: 0.85, size });
}
function addFx(fx) { fx.max = fx.life; game.effects.push(fx); }
function burst(x, y, color, n, speed = 90, life = 0.5, size = 3) {
  if (!saveData.settings.particles) return;
  if (game.particles.length > 500) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.8);
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.6), max: life, color, size: size * (0.6 + Math.random() * 0.8) });
  }
}
function getRange(t) { return Math.round(t.rng * (t.def.passiveType === 'fast_slayer' ? 1.1 : 1)); }

function getAllyAuraBonuses(tower) {
  let dmgMult = 1 + tower.soulBonus, spaMult = 1;
  for (const o of game.towers) {
    if (o.uid === tower.uid) continue;
    const a = AURAS[o.def.passiveType];
    if (!a) continue;
    if (Math.hypot(o.x - tower.x, o.y - tower.y) <= getRange(o)) {
      const am = o.def.auraMult || 1;
      if (a.dmg) dmgMult += a.dmg * am;
      if (a.spa) spaMult *= 1 - (1 - a.spa) * am;
    }
  }
  return { dmgMult, spaMult };
}
function selectTarget(tower) {
  const r = getRange(tower);
  const inRange = game.enemies.filter(e => !e.dead && Math.hypot(e.x - tower.x, e.y - tower.y) <= r);
  if (!inRange.length) return null;
  const dist = e => Math.hypot(e.x - tower.x, e.y - tower.y);
  switch (tower.targetPriority) {
    case 'strongest': return inRange.reduce((b, c) => c.hp > b.hp ? c : b, inRange[0]);
    case 'closest': return inRange.reduce((b, c) => dist(c) < dist(b) ? c : b, inRange[0]);
    case 'last': return inRange.reduce((b, c) => c.travel < b.travel ? c : b, inRange[0]);
    default: return inRange.reduce((b, c) => c.travel > b.travel ? c : b, inRange[0]);
  }
}
function killEnemy(e, src) {
  if (e.dead) return;
  e.dead = true;
  game.cash += e.reward;
  saveData.stats.kills++;
  if (e.isBoss) { saveData.stats.bosses++; game.earnedGems += 10; game.shake = Math.max(game.shake, 0.8); flashScreen('rgba(244,63,94,.45)'); }
  if (src) {
    src.kills++;
    if (src.def.passiveType === 'soul_harvest') src.soulBonus = Math.min(src.def.soulCap || 2.5, src.soulBonus + 0.01);
  }
  addFloatingText(e.x, e.y - 20, `+$${e.reward}`, '#34d399', 12);
  burst(e.x, e.y, e.color, e.isBoss ? 30 : 9, e.isBoss ? 200 : 95, e.isBoss ? 0.9 : 0.5, e.isBoss ? 4 : 3);
  sfx('kill');
  if (e.kind === 'splitter') {
    const bp = createEnemyBlueprint('swarm', e.diffMult, game.wave);
    for (let i = 0; i < 2; i++) game.pending.push({ bp, extra: { x: e.x + (i ? 8 : -8), y: e.y, wpIndex: e.wpIndex, travel: Math.max(0, e.travel - 4) } });
  }
  updateBattleHUD();
}
function applyDamageToEnemy(enemy, rawDmg, src) {
  if (enemy.dead) return;
  let dmg = rawDmg;
  const def = src.def, p = def.passiveType;
  if (p === 'fast_slayer' && enemy.kind === 'fast') dmg *= 1.15;
  if (enemy.armor > 0) {
    if (p === 'armor_pierce') dmg *= 1.25;
    else if (p === 'acid' || p === 'genesis_aura') { /* ignores armor */ }
    else dmg *= (1 - enemy.armor);
  }
  if ((p === 'executioner' || p === 'orbital_pierce') && (enemy.isBoss || enemy.hp / enemy.maxHp < 0.35)) dmg *= 1.55;
  if (p === 'titan' && enemy.isBoss) dmg *= 1.4;

  let crit = false;
  if (def.critChance && Math.random() < def.critChance) { dmg *= (def.critMult || 3); crit = true; }

  const final = Math.max(1, Math.round(dmg));
  enemy.hp -= final;

  if (def.slowPct) { enemy.slowFactor = Math.max(enemy.slowFactor, def.slowPct); enemy.slowTimer = Math.max(enemy.slowTimer, def.slowDur || 2.0); }
  if (p === 'singularity') { enemy.slowFactor = Math.max(enemy.slowFactor, 0.5); enemy.slowTimer = Math.max(enemy.slowTimer, 2.5); }
  if (def.stunChance && Math.random() < def.stunChance) enemy.stunTimer = Math.max(enemy.stunTimer, 1.1);
  if (def.burnDps) {
    enemy.burnDps = Math.max(enemy.burnDps, def.burnDps * (1 + (src.tier - 1) * 0.35));
    enemy.burnTimer = Math.max(enemy.burnTimer, def.burnDur || 3.0);
    enemy.burnSrc = src;
  }
  if (crit) { addFloatingText(enemy.x, enemy.y - 14, `CRIT ${final}!`, '#fbbf24', 16); burst(enemy.x, enemy.y, '#fbbf24', 8, 120, 0.4); }
  else if (Math.random() < 0.4) addFloatingText(enemy.x, enemy.y - 10, `-${final}`, '#f8fafc', 11);
  sfx('hit');
  if (enemy.hp <= 0) killEnemy(enemy, src);
}
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}
function explode(x, y, radius, dmg, color, tower) {
  addFx({ type: 'ring', x, y, maxR: radius, color, life: 0.3, lw: 2.5 });
  burst(x, y, color, 8, 100, 0.4);
  for (const e of game.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) <= radius) applyDamageToEnemy(e, dmg, tower);
}
function fireTowerAttack(tower, target, dmgMult) {
  const baseDmg = tower.dmg * dmgMult, type = tower.def.attackType;
  tower.flash = 1;
  if (type === 'pierce') {
    const ang = Math.atan2(target.y - tower.y, target.x - tower.x), r = getRange(tower);
    const ex = tower.x + Math.cos(ang) * r, ey = tower.y + Math.sin(ang) * r;
    addFx({ type: 'beam', x1: tower.x, y1: tower.y, x2: ex, y2: ey, color: tower.def.projColor, life: 0.25, lw: 6 });
    for (const e of game.enemies) if (!e.dead && pointToSegmentDistance(e.x, e.y, tower.x, tower.y, ex, ey) <= e.radius + 14) applyDamageToEnemy(e, baseDmg, tower);
    return;
  }
  if (type === 'chain' || type === 'chain_splash' || type === 'prism') {
    const maxChain = tower.def.chainCount || 3, hit = [target];
    let cur = target;
    while (hit.length < maxChain) {
      const next = game.enemies.find(e => !e.dead && !hit.includes(e) && Math.hypot(e.x - cur.x, e.y - cur.y) <= 115);
      if (!next) break;
      hit.push(next); cur = next;
    }
    let px = tower.x, py = tower.y;
    hit.forEach((en, idx) => {
      addFx({ type: 'beam', x1: px, y1: py, x2: en.x, y2: en.y, color: tower.def.projColor, life: 0.2, lw: 3 });
      px = en.x; py = en.y;
      const ex = en.x, ey = en.y;
      applyDamageToEnemy(en, baseDmg * Math.pow(0.88, idx), tower);
      if (type === 'chain_splash') explode(ex, ey, tower.def.splashRadius || 70, baseDmg * 0.45, tower.def.projColor, tower);
    });
    return;
  }
  game.projectiles.push({ x: tower.x, y: tower.y, target, tx: target.x, ty: target.y, speed: 440, dmg: baseDmg, tower, color: tower.def.projColor, splashRadius: tower.def.splashRadius || 0, trail: [] });
}

/* ==========================================================================
   16. SIMULATION
   ========================================================================== */
function updateSimulation(dt) {
  if (!game.active || game.paused) return;
  game.time += dt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 1.6);
  if (game.skills.pulse > 0) game.skills.pulse = Math.max(0, game.skills.pulse - dt);
  if (game.skills.freeze > 0) game.skills.freeze = Math.max(0, game.skills.freeze - dt);

  for (const ps of game.pending.splice(0)) spawnEnemy(ps.bp, ps.extra);

  if (game.waveInProgress) {
    if (game.spawnQueue.length > 0) {
      game.spawnTimer -= dt;
      if (game.spawnTimer <= 0) {
        spawnEnemy(game.spawnQueue.shift());
        game.spawnTimer = Math.max(0.28, 0.72 - game.wave * 0.015);
      }
    } else if (game.enemies.length === 0 && game.pending.length === 0) {
      waveCleared();
      if (!game.active) return;
    }
  }

  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.regen > 0 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.regen * dt);
    if (e.isBoss && !e.enraged && e.hp / e.maxHp < 0.5) {
      e.enraged = true; e.speed *= 1.3;
      addFloatingText(e.x, e.y - 30, 'ENRAGED!', '#f43f5e', 16);
      addFx({ type: 'ring', x: e.x, y: e.y, maxR: 120, color: '#f43f5e', life: 0.6, lw: 5 });
      game.shake = Math.max(game.shake, 0.6); sfx('boss');
    }
    if (e.burnTimer > 0) {
      e.burnTimer -= dt; e.hp -= e.burnDps * dt;
      if (Math.random() < dt * 8) burst(e.x, e.y - 4, '#fb923c', 1, 40, 0.4, 2.5);
      if (e.hp <= 0) { killEnemy(e, e.burnSrc); continue; }
    }
    if (e.slowTimer > 0) e.slowTimer -= dt; else e.slowFactor = 0;
    if (e.stunTimer > 0) { e.stunTimer -= dt; continue; }

    const wp = game.pixelWaypoints[e.wpIndex];
    if (!wp) { e.dead = true; continue; }
    const dx = wp.x - e.x, dy = wp.y - e.y, dist = Math.hypot(dx, dy);
    const step = e.speed * (1 - e.slowFactor) * dt;
    if (dist <= step) {
      e.x = wp.x; e.y = wp.y; e.travel += dist; e.wpIndex++;
      if (e.wpIndex >= game.pixelWaypoints.length) {
        e.dead = true;
        game.lives -= e.isBoss ? 5 : 1;
        game.shake = Math.max(game.shake, 0.3); sfx('leak'); flashScreen('rgba(248,113,113,.4)');
        updateBattleHUD();
        if (game.lives <= 0) { endMatch(false); return; }
      }
    } else { e.x += (dx / dist) * step; e.y += (dy / dist) * step; e.travel += step; }
  }
  game.enemies = game.enemies.filter(e => !e.dead);

  for (const t of game.towers) {
    t.flash = Math.max(0, t.flash - dt * 6);
    const { dmgMult, spaMult } = getAllyAuraBonuses(t);
    t.cooldown -= dt;
    if (t.cooldown <= 0) {
      const target = selectTarget(t);
      if (target) { fireTowerAttack(t, target, dmgMult); t.cooldown = t.spa * spaMult; t.cdMax = t.cooldown; }
    }
  }

  for (const p of game.projectiles) {
    if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy);
    if (saveData.settings.particles) { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 6) p.trail.shift(); }
    if (dist <= p.speed * dt) {
      p.done = true;
      if (p.splashRadius > 0) explode(p.tx, p.ty, p.splashRadius, p.dmg, p.color, p.tower);
      else if (p.target && !p.target.dead) { applyDamageToEnemy(p.target, p.dmg, p.tower); burst(p.tx, p.ty, p.color, 3, 60, 0.25, 2); }
    } else { p.x += (dx / dist) * p.speed * dt; p.y += (dy / dist) * p.speed * dt; }
  }
  game.projectiles = game.projectiles.filter(p => !p.done);
  game.enemies = game.enemies.filter(e => !e.dead);

  for (const fx of game.effects) fx.life -= dt;
  game.effects = game.effects.filter(fx => fx.life > 0);
  for (const pt of game.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.93; pt.vy *= 0.93; pt.life -= dt; }
  game.particles = game.particles.filter(pt => pt.life > 0);
  for (const ft of game.floatingTexts) { ft.y -= 28 * dt; ft.life -= dt; }
  game.floatingTexts = game.floatingTexts.filter(ft => ft.life > 0);
}

function waveCleared() {
  game.waveInProgress = false;
  const waveGems = Math.round((15 + game.wave * 3) * game.rewardMult);
  const waveGold = Math.round((25 + game.wave * 6) * game.rewardMult);
  game.earnedGems += waveGems; game.earnedGold += waveGold;
  saveData.stats.waves++;
  if (!game.trial) {
    saveData.stats.maxWave = Math.max(saveData.stats.maxWave, game.wave);
    saveData.bestWave[game.stage.id] = Math.max(saveData.bestWave[game.stage.id] || 0, game.wave);
  }
  let farm = 0;
  for (const t of game.towers) {
    if (t.farmBase > 0) {
      const inc = Math.round(t.farmBase * (1 + (t.tier - 1) * 0.45));
      farm += inc;
      addFloatingText(t.x, t.y - 16, `+$${inc}`, '#fbbf24', 13);
      burst(t.x, t.y, '#fbbf24', 6, 70, 0.6);
    }
  }
  game.cash += farm;
  checkAchievements(); saveGame();
  updateBattleHUD();
  showToast(`🌊 Wave ${game.wave} Cleared! +${waveGems}💎 +${waveGold}🪙${farm ? ` +$${farm}` : ''}`, '#34d399');

  if (game.trial) {
    if (game.wave >= game.maxWave) { endMatch(true); return; }
  } else if (game.wave === game.maxWave && !game.endless) {
    game.earnedGems += Math.round(120 * game.rewardMult);
    game.earnedGold += Math.round(200 * game.rewardMult);
    game.endless = true;
    setPaused(true); game.autoWave = false;
    $('btnAutoWave').textContent = '🔁 Auto: OFF';
    sfx('win'); flashScreen('rgba(251,191,36,.5)');
    updateBattleHUD();
    openModal('🏆 Stage Cleared!', `
      <p class="text-sm muted" style="margin:10px 0;">You held the line for 20 waves on <b>${game.stage.name}</b>! A bonus payout has been added to your haul.</p>
      <p class="text-sm" style="margin-bottom:14px;">Claim your rewards now, or push into <b>Endless Mode</b> — enemies keep scaling, and your rewards keep growing.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
        <button class="btn btn-gold" onclick="closeModal();endMatch(true)">💰 Claim & Exit</button>
        <button class="btn btn-purple" onclick="closeModal();setPaused(false)">♾️ Continue Endless</button>
      </div>`);
    return;
  }
  if (game.autoWave) startNextWave();
}

/* ==========================================================================
   17. RENDERING
   ========================================================================== */
function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

function drawAmbient(w, h, T, st) {
  if (!saveData.settings.ambient) return;
  const kind = st.ambient;
  ctx.fillStyle = AMBIENT_COLORS[kind] || '#fff';
  for (const p of AMBIENT) {
    let x, y, a = 0.4, r = p.r;
    switch (kind) {
      case 'snow': y = (p.y * h + T * (16 + p.s * 26)) % h; x = p.x * w + Math.sin(T * p.f + p.p) * 14; a = 0.65; break;
      case 'ember': y = h - ((p.y * h + T * (20 + p.s * 34)) % h); x = p.x * w + Math.sin(T * p.f * 1.4 + p.p) * 10; a = Math.min(1, (y / h) * 1.4) * 0.8; break;
      case 'bubbles': y = h - ((p.y * h + T * (10 + p.s * 16)) % h); x = p.x * w + Math.sin(T * p.f + p.p) * 8; a = 0.3; r *= 1.7; break;
      case 'void': x = p.x * w + Math.cos(T * p.f * 0.6 + p.p) * 32; y = p.y * h + Math.sin(T * p.f * 0.6 + p.p) * 26; a = 0.3 + 0.35 * Math.sin(T * p.f * 2 + p.p); r *= 1.3; break;
      case 'stars': x = p.x * w; y = p.y * h; a = 0.3 + 0.4 * Math.sin(T * p.f * 2 + p.p); break;
      default: x = p.x * w + Math.sin(T * 0.4 * p.f + p.p) * 36; y = p.y * h + Math.cos(T * 0.5 * p.f + p.p) * 22; a = 0.25 + 0.3 * Math.sin(T * 1.6 * p.f + p.p); r *= 1.2;
    }
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    circle(((x % w) + w) % w, y, r); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function renderCanvas() {
  if (!game.active) return;
  const { w, h } = getLogicalDimensions();
  const cw = w / GRID_COLS, ch = h / GRID_ROWS, cmin = Math.min(cw, ch);
  const st = game.stage, T = game.time;

  ctx.save();
  if (game.shake > 0 && saveData.settings.shake) {
    const s = game.shake * 9;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  // Background
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, st.bgTop); g.addColorStop(1, st.bgBottom);
  ctx.fillStyle = g; ctx.fillRect(-10, -10, w + 20, h + 20);
  const glow = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
  glow.addColorStop(0, st.accent + '1c'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(-10, -10, w + 20, h + 20);
  for (const s of BG_STARS) {
    ctx.globalAlpha = 0.2 + 0.25 * Math.sin(T * 1.5 + s.p);
    ctx.fillStyle = '#fff';
    ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  // Tiles
  for (let gx = 0; gx < GRID_COLS; gx++) {
    for (let gy = 0; gy < GRID_ROWS; gy++) {
      const isPath = game.pathCells.has(`${gx},${gy}`);
      ctx.fillStyle = isPath ? st.pathColor : st.tileColor;
      rr(gx * cw + 1.5, gy * ch + 1.5, cw - 3, ch - 3, 5); ctx.fill();
      if (!isPath && (gx + gy) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fill(); }
    }
  }

  // Road
  if (game.pixelWaypoints.length > 1) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pts = game.pixelWaypoints;
    const trace = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); };
    ctx.strokeStyle = st.accent; ctx.globalAlpha = 0.09 + 0.03 * Math.sin(T * 2); ctx.lineWidth = cmin * 0.95; trace(); ctx.stroke();
    ctx.strokeStyle = st.pathBorder; ctx.globalAlpha = 0.9; ctx.lineWidth = cmin * 0.68; trace(); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = st.pathColor; ctx.lineWidth = cmin * 0.5; trace(); ctx.stroke();
    ctx.setLineDash([7, 15]); ctx.lineDashOffset = -T * 38;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; trace(); ctx.stroke();
    ctx.setLineDash([]);
    const a = pts[0], b = pts[pts.length - 1];
    const pulse = 1 + 0.12 * Math.sin(T * 3);
    circle(a.x, a.y, cmin * 0.42 * pulse); ctx.fillStyle = 'rgba(168,85,247,0.28)'; ctx.fill();
    circle(b.x, b.y, cmin * 0.45); ctx.fillStyle = 'rgba(56,189,248,0.22)'; ctx.fill();
    ctx.font = `${Math.round(cmin * 0.5)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌀', a.x, a.y); ctx.fillText('🏰', b.x, b.y);
    ctx.restore();
  }

  drawAmbient(w, h, T, st);

  // Placement preview
  if (game.hoverCell && game.selectedHotbarIndex !== null && saveData.squad[game.selectedHotbarIndex]) {
    const { gx, gy } = game.hoverCell;
    const unitId = saveData.squad[game.selectedHotbarIndex], udef = getUnitDef(unitId);
    const valid = isCellBuildable(gx, gy) && placedCount(unitId) < getUnitCap(udef);
    const stt = getEffectiveUnitStats(unitId);
    const cx = (gx + 0.5) * cw, cy = (gy + 0.5) * ch;
    ctx.fillStyle = valid ? 'rgba(52,211,153,0.28)' : 'rgba(248,113,113,0.32)';
    rr(gx * cw + 2, gy * ch + 2, cw - 4, ch - 4, 6); ctx.fill();
    circle(cx, cy, stt.rng * (udef.passiveType === 'fast_slayer' ? 1.1 : 1));
    ctx.fillStyle = valid ? 'rgba(56,189,248,0.10)' : 'rgba(248,113,113,0.10)'; ctx.fill();
    ctx.strokeStyle = valid ? 'rgba(56,189,248,0.6)' : 'rgba(248,113,113,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = 0.6; ctx.font = `${Math.round(cmin * 0.44)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(udef.icon, cx, cy); ctx.globalAlpha = 1;
  }

  // Range ring
  const hoverTower = game.hoverCell ? game.towers.find(t => t.gx === game.hoverCell.gx && t.gy === game.hoverCell.gy) : null;
  for (const rt of new Set([game.selectedTower, hoverTower].filter(Boolean))) {
    circle(rt.x, rt.y, getRange(rt));
    ctx.fillStyle = rt === game.selectedTower ? 'rgba(56,189,248,0.13)' : 'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.strokeStyle = rt === game.selectedTower ? '#38bdf8' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // Towers
  for (const t of game.towers) {
    const rc = RARITIES[t.def.rarity].color, r = cmin * 0.36, evo = !!t.def.evolved;
    const grow = Math.min(1, (T - t.born) * 5);
    const sc = (0.6 + 0.4 * grow) * (1 + t.flash * 0.18);
    if (AURAS[t.def.passiveType]) {
      circle(t.x, t.y, getRange(t)); ctx.fillStyle = rc + '0d'; ctx.fill();
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(T * 0.8);
      ctx.setLineDash([5, 7]); circle(0, 0, r * 1.45); ctx.strokeStyle = rc; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
    ctx.save();
    if (RARITY_ORDER[t.def.rarity] >= 4 || evo) { ctx.shadowColor = evo ? '#fde047' : rc; ctx.shadowBlur = 12 + 4 * Math.sin(T * 3); }
    const bg = ctx.createRadialGradient(t.x - r * 0.3, t.y - r * 0.3, 1, t.x, t.y, r * sc);
    bg.addColorStop(0, '#22335a'); bg.addColorStop(1, '#0a0f1d');
    circle(t.x, t.y, r * sc); ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = evo ? 3.2 : 2.5; ctx.strokeStyle = evo ? '#fde047' : rc; ctx.stroke();
    ctx.restore();
    if (evo) {
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(-T * 1.2);
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(r * 1.34, 0); ctx.lineTo(r * 1.14, -4); ctx.lineTo(r * 1.14, 4); ctx.closePath();
        ctx.fillStyle = '#fde047'; ctx.fill();
      }
      ctx.restore();
    }
    ctx.font = `${Math.round(cmin * 0.44 * sc)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(t.def.icon, t.x, t.y + 1);
    // cooldown arc
    const prog = t.cdMax > 0 ? 1 - Math.max(0, t.cooldown) / t.cdMax : 1;
    if (prog < 1) { ctx.beginPath(); ctx.arc(t.x, t.y, r * sc + 4, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2; ctx.stroke(); }
    for (let i = 0; i < t.tier; i++) {
      circle(t.x + (i - (t.tier - 1) / 2) * 7, t.y + r + 7, 2.4);
      ctx.fillStyle = '#fbbf24'; ctx.fill();
    }
    if (evo) { ctx.font = `${Math.round(cmin * 0.26)}px sans-serif`; ctx.fillText('👑', t.x, t.y - r - 6 + Math.sin(T * 3) * 1.5); }
  }

  // Enemies
  let boss = null;
  for (const e of game.enemies) {
    if (e.isBoss) boss = e;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.radius * 0.85, e.radius * 0.9, e.radius * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (e.enraged) { ctx.shadowColor = '#f43f5e'; ctx.shadowBlur = 16; }
    else if (e.burnTimer > 0) { ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 8; }
    circle(e.x, e.y, e.radius); ctx.fillStyle = e.color; ctx.fill();
    ctx.restore();
    const rg = ctx.createRadialGradient(e.x - e.radius * 0.35, e.y - e.radius * 0.35, 1, e.x, e.y, e.radius);
    rg.addColorStop(0, 'rgba(255,255,255,0.4)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    circle(e.x, e.y, e.radius); ctx.fillStyle = rg; ctx.fill();
    ctx.lineWidth = e.isBoss ? 3 : 2;
    ctx.strokeStyle = e.stunTimer > 0 ? '#bae6fd' : (e.slowTimer > 0 ? '#38bdf8' : '#0f172a'); ctx.stroke();
    ctx.font = `${Math.round(e.radius * 1.15)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(ENEMY_META[e.kind].icon, e.x, e.y + 1);
    if (e.stunTimer > 0) { circle(e.x, e.y, e.radius + 2); ctx.fillStyle = 'rgba(186,230,253,0.45)'; ctx.fill(); }
    if (e.isBoss) { circle(e.x, e.y, e.radius + 6 + Math.sin(T * 6) * 1.5); ctx.strokeStyle = 'rgba(244,63,94,0.6)'; ctx.lineWidth = 2; ctx.stroke(); }
    const bw = e.radius * 2.2, bh = 4, ratio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x - bw / 2, e.y - e.radius - 9, bw, bh);
    ctx.fillStyle = ratio > 0.5 ? '#34d399' : (ratio > 0.25 ? '#fbbf24' : '#f87171');
    ctx.fillRect(e.x - bw / 2, e.y - e.radius - 9, bw * ratio, bh);
  }

  // Projectiles
  for (const p of game.projectiles) {
    for (let i = 0; i < p.trail.length; i++) {
      ctx.globalAlpha = (i + 1) / (p.trail.length + 2) * 0.5;
      circle(p.trail[i].x, p.trail[i].y, 2 + i * 0.4); ctx.fillStyle = p.color; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    circle(p.x, p.y, 4.5); ctx.fillStyle = p.color; ctx.fill(); ctx.restore();
  }

  // Effects
  for (const fx of game.effects) {
    ctx.save(); ctx.globalAlpha = Math.max(0, fx.life / fx.max);
    ctx.strokeStyle = fx.color; ctx.lineWidth = fx.lw || 3;
    if (fx.type === 'beam') { ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke(); }
    else { circle(fx.x, fx.y, fx.maxR * (1 - fx.life / fx.max)); ctx.stroke(); }
    ctx.restore();
  }
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color; ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  for (const ft of game.floatingTexts) {
    ctx.save(); ctx.globalAlpha = Math.min(1, ft.life * 1.4);
    ctx.font = `bold ${ft.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
  ctx.restore();

  // Vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

  // HUD overlays
  if (T < 3.2) {
    ctx.save(); ctx.globalAlpha = Math.min(1, (3.2 - T)) * Math.min(1, T * 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 20px sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)';
    const title = game.trial ? `${game.trial.icon} ${game.trial.name} — Tier ${TIER_NAMES[game.tier - 1]}` : st.name;
    ctx.strokeText(title, 16, h - 18); ctx.fillStyle = '#fff'; ctx.fillText(title, 16, h - 18);
    ctx.restore();
  }
  if (boss) {
    const bw = w * 0.5, bx = (w - bw) / 2, ratio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(bx - 4, 6, bw + 8, 26, 8); ctx.fill();
    ctx.fillStyle = boss.enraged ? '#ef4444' : '#f43f5e'; rr(bx, 18, bw * ratio, 8, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${boss.type}${boss.enraged ? ' — ENRAGED' : ''}`, w / 2, 15);
  }
  if (game.wave === 0 && !game.waveInProgress) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(w / 2 - 190, h - 54, 380, 34, 10); ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Place your defenders, then press ▶ Start Wave (Space)', w / 2, h - 37);
  }
  if (game.paused) {
    ctx.fillStyle = 'rgba(4,7,15,0.55)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⏸ PAUSED', w / 2, h / 2);
  }
}

/* ==========================================================================
   18. MAIN LOOP & INIT
   ========================================================================== */
let lastTime = performance.now();
function gameLoop(now) {
  const rawDt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (game.active) {
    for (let s = 0; s < game.speed; s++) updateSimulation(rawDt);
    if (game.active) { renderCanvas(); updateSkillUI(); }
  }
  requestAnimationFrame(gameLoop);
}
window.onload = function () {
  updateTopHUD(); updateDailyButton();
  setBattleMode('expedition');
  renderSquadAndInventory(); renderSummonTab(); renderEvolve(); renderInventory(); renderCodex(); renderGoals();
  $('inspectorContent').innerHTML = '';
  checkAchievements(); saveGame();
  requestAnimationFrame(gameLoop);
};
