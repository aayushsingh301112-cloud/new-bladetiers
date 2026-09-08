// Blade Tiers API Client
// Connected to REAL API: https://api.ticknodes.dpdns.org/api/players

const BladeTiersAPI = (() => {
  const BASE_URL = 'https://api.ticknodes.dpdns.org';
  let cachedPlayers = null;
  let lastFetchTime = 0;
  const CACHE_DURATION = 30000; // 30 seconds

  // Tier points lookup
  const TIER_POINTS = {
    'HT1': 60, 'LT1': 45,
    'HT2': 30, 'LT2': 20,
    'HT3': 10, 'LT3': 6,
    'HT4': 4, 'LT4': 3,
    'HT5': 2,  'LT5': 1
  };

  // Gamemodes metadata
  const GAMEMODES = {
    'overall': { id: 'overall', name: 'Overall', icon: 'assets/tier_icons/overall.svg' },
    'mace':    { id: 'mace',    name: 'Mace',    icon: 'assets/tier_icons/mace.svg' },
    'sword':   { id: 'sword',   name: 'Sword',   icon: 'assets/tier_icons/sword.svg' },
    'nethop':  { id: 'nethop',  name: 'NethOP',  icon: 'assets/tier_icons/nethop.svg' },
    'nethpot': { id: 'nethpot', name: 'NethPot', icon: 'assets/tier_icons/pot.svg' },
    'axe':     { id: 'axe',     name: 'Axe',     icon: 'assets/tier_icons/axe.svg' },
    'uhc':     { id: 'uhc',     name: 'UHC',     icon: 'assets/tier_icons/uhc.svg' },
    'smp':     { id: 'smp',     name: 'SMP',     icon: 'assets/tier_icons/smp.svg' },
    'vanilla': { id: 'vanilla', name: 'Vanilla', icon: 'assets/tier_icons/vanilla.svg' },
    'pot':     { id: 'pot',     name: 'Pot',     icon: 'assets/tier_icons/pot.svg' },
    'ltm':     { id: 'ltm',     name: 'LTMs',    icon: 'assets/tier_icons/2v2.svg' }
  };

  function calculatePlayerPoints(tiers = {}) {
    let total = 0;
    Object.values(tiers).forEach(tierCode => {
      if (typeof tierCode === 'string') {
        const code = tierCode.toUpperCase().trim();
        if (TIER_POINTS[code]) {
          total += TIER_POINTS[code];
        }
      }
    });
    return total;
  }

  function getCombatTitle(points) {
    if (points >= 300) return 'Combat Grandmaster';
    if (points >= 150) return 'Combat Master';
    if (points >= 70)  return 'Combat Ace';
    if (points >= 30)  return 'Combat Veteran';
    if (points >= 1)   return 'Combatant';
    return 'Unranked';
  }

  function getTierLevel(tierCode) {
    if (!tierCode || typeof tierCode !== 'string') return 99;
    const match = tierCode.match(/([HL]T)?(\d)/i);
    if (!match) return 99;
    const pos = (match[1] || '').toUpperCase() === 'HT' ? 0 : 1;
    const num = parseInt(match[2], 10);
    return num * 10 + pos;
  }

  return {
    GAMEMODES,
    TIER_POINTS,

    getCombatTitle,
    calculatePlayerPoints,
    getTierLevel,

    getSkinUrl(skinPath) {
      if (!skinPath) return null;
      if (skinPath.startsWith('http://') || skinPath.startsWith('https://')) {
        return skinPath;
      }
      const clean = skinPath.startsWith('/') ? skinPath : `/${skinPath}`;
      return `${BASE_URL}${clean}`;
    },

    getOriginalSkinUrl(origPath) {
      if (!origPath) return null;
      if (origPath.startsWith('http://') || origPath.startsWith('https://')) {
        return origPath;
      }
      const clean = origPath.startsWith('/') ? origPath : `/${origPath}`;
      return `${BASE_URL}${clean}`;
    },

    async getPlayers(forceRefresh = false) {
      const now = Date.now();
      if (!forceRefresh && cachedPlayers && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedPlayers;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch(`${BASE_URL}/api/players`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`API returned status ${res.status}`);
        }

        const rawPlayers = await res.json();
        if (!Array.isArray(rawPlayers)) {
          throw new Error('API response is not an array');
        }

        // Process players: calculate points and sort
        const processed = rawPlayers.map(p => {
          const points = calculatePlayerPoints(p.tiers || {});
          return {
            ...p,
            points,
            title: getCombatTitle(points)
          };
        });

        // Sort descending by points
        processed.sort((a, b) => b.points - a.points);

        cachedPlayers = processed;
        lastFetchTime = now;
        return processed;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }
  };
})();

window.BladeTiersAPI = BladeTiersAPI;
