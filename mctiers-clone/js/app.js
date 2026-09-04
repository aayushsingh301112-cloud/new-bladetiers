// Blade Tiers Application Controller
// Source of truth: https://api.ticknodes.dpdns.org/api/players

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    currentMode: 'overall',
    regionFilter: 'ALL',
    players: [],
    loading: true,
    error: null
  };

  // DOM Elements
  const tabsContainer = document.getElementById('gamemode-tabs');
  const subheaderLeft = document.getElementById('subheader-left');
  const filtersContainer = document.getElementById('filters-bar');
  const contentArea = document.getElementById('main-content');
  const searchInput = document.getElementById('search-player-input');
  const searchResults = document.getElementById('search-results');
  const playerModal = document.getElementById('player-modal');
  const playerModalContent = document.getElementById('player-modal-body');
  const infoModal = document.getElementById('info-modal');
  const infoModalBody = document.getElementById('info-modal-body');
  const toastContainer = document.getElementById('toast-container');
  const discordsDropdownBtn = document.getElementById('discords-dropdown-btn');
  const discordsMenu = document.getElementById('discords-menu');

  // Helper: Toast
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Copy helper
  window.copyText = (text, label = 'Text') => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied ${label} to clipboard!`);
    }).catch(() => {
      showToast(`Failed to copy ${label}`);
    });
  };

  // Gamemodes list for top tabs
  const DISPLAY_GAMEMODES = [
    { id: 'overall', name: 'Overall', icon: 'assets/tier_icons/overall.svg' },
    { id: 'ltm',     name: 'LTMs',    icon: 'assets/tier_icons/2v2.svg' },
    { id: 'vanilla', name: 'Vanilla', icon: 'assets/tier_icons/vanilla.svg' },
    { id: 'uhc',     name: 'UHC',     icon: 'assets/tier_icons/uhc.svg' },
    { id: 'pot',     name: 'Pot',     icon: 'assets/tier_icons/pot.svg' },
    { id: 'nethop',  name: 'NethOP',  icon: 'assets/tier_icons/nethop.svg' },
    { id: 'smp',     name: 'SMP',     icon: 'assets/tier_icons/smp.svg' },
    { id: 'sword',   name: 'Sword',   icon: 'assets/tier_icons/sword.svg' },
    { id: 'axe',     name: 'Axe',     icon: 'assets/tier_icons/axe.svg' },
    { id: 'mace',    name: 'Mace',    icon: 'assets/tier_icons/mace.svg' }
  ];

  // Modes shown in the row's tiers matrix (Matching reference image)
  const MATRIX_GAMEMODES = [
    { id: 'mace',    name: 'Mace',    icon: 'assets/tier_icons/mace.svg' },
    { id: 'sword',   name: 'Sword',   icon: 'assets/tier_icons/sword.svg' },
    { id: 'nethop',  name: 'NethOP',  icon: 'assets/tier_icons/nethop.svg' },
    { id: 'nethpot', name: 'NethPot', icon: 'assets/tier_icons/pot.svg' },
    { id: 'axe',     name: 'Axe',     icon: 'assets/tier_icons/axe.svg' },
    { id: 'uhc',     name: 'UHC',     icon: 'assets/tier_icons/uhc.svg' },
    { id: 'smp',     name: 'SMP',     icon: 'assets/tier_icons/smp.svg' },
    { id: 'vanilla', name: 'Vanilla', icon: 'assets/tier_icons/vanilla.svg' }
  ];

  // Fetch API data
  async function loadData(forceRefresh = false) {
    state.loading = true;
    state.error = null;
    renderView();

    try {
      state.players = await BladeTiersAPI.getPlayers(forceRefresh);
      state.loading = false;
      renderView();
    } catch (err) {
      console.error('Blade Tiers API Error:', err);
      state.loading = false;
      state.error = 'Unable to load leaderboard.';
      renderView();
    }
  }

  // Router
  function handleRoute() {
    const hash = window.location.hash || '#/rankings/overall';
    if (hash.startsWith('#/docs')) {
      state.currentMode = 'docs';
    } else if (hash.startsWith('#/player/')) {
      const playerName = decodeURIComponent(hash.replace('#/player/', ''));
      openPlayerModal(playerName);
      return;
    } else {
      const match = hash.match(/#\/rankings\/([a-zA-Z0-9_-]+)/);
      state.currentMode = match ? match[1].toLowerCase() : 'overall';
    }
    renderView();
  }

  window.addEventListener('hashchange', handleRoute);

  // Render Tabs
  function renderTabs() {
    tabsContainer.innerHTML = '';
    DISPLAY_GAMEMODES.forEach(mode => {
      const tab = document.createElement('a');
      tab.className = `gamemode-tab ${state.currentMode === mode.id ? 'active' : ''}`;
      tab.href = `#/rankings/${mode.id}`;
      tab.innerHTML = `
        <img src="${mode.icon}" alt="${mode.name}" onerror="this.style.opacity='0.2'">
        <span>${mode.name}</span>
      `;
      tabsContainer.appendChild(tab);
    });
  }

  // Render Subheader controls
  function renderSubheader() {
    if (state.currentMode === 'docs') {
      subheaderLeft.innerHTML = `
        <h2 style="font-size: 1.3rem; font-weight: 800; color: #fff;">
          Blade Tiers Public API
        </h2>
      `;
      filtersContainer.innerHTML = '';
      return;
    }

    subheaderLeft.innerHTML = `
      <button class="btn-info" id="open-info-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        Information
      </button>
      <button class="btn-refresh" id="refresh-btn" title="Refresh from API">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
        Refresh
      </button>
    `;

    document.getElementById('open-info-btn').addEventListener('click', openInfoModal);
    document.getElementById('refresh-btn').addEventListener('click', () => {
      showToast('Refreshing Blade Tiers...');
      loadData(true);
    });

    filtersContainer.innerHTML = `
      <div class="server-ip-box">
        <img class="server-logo" src="assets/branding/blade_tier_icon.webp" alt="Blade Tiers Server" onerror="this.style.display='none'">
        <div class="server-details">
          <span class="server-label">Server IP</span>
          <div class="server-actions">
            <span class="server-ip-badge" onclick="copyText('chocomc.net', 'Server IP')">
              chocomc.net
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </span>
            <a class="server-discord-btn" href="https://discord.gg" target="_blank" title="Blade Tiers Discord">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
      <select class="region-select" id="region-filter">
        <option value="ALL" ${state.regionFilter === 'ALL' ? 'selected' : ''}>All Regions</option>
        <option value="AS" ${state.regionFilter === 'AS' ? 'selected' : ''}>Asia (AS)</option>
        <option value="NA" ${state.regionFilter === 'NA' ? 'selected' : ''}>North America (NA)</option>
        <option value="EU" ${state.regionFilter === 'EU' ? 'selected' : ''}>Europe (EU)</option>
        <option value="SA" ${state.regionFilter === 'SA' ? 'selected' : ''}>South America (SA)</option>
        <option value="AU" ${state.regionFilter === 'AU' ? 'selected' : ''}>Australia (AU)</option>
        <option value="ME" ${state.regionFilter === 'ME' ? 'selected' : ''}>Middle East (ME)</option>
      </select>
    `;

    const regionSelect = document.getElementById('region-filter');
    if (regionSelect) {
      regionSelect.addEventListener('change', (e) => {
        state.regionFilter = e.target.value;
        renderView();
      });
    }
  }

  // Render Ranking List (Exact Design Reference from user's attached screenshot)
  function renderRankingList(players) {
    if (players.length === 0) {
      return `
        <div class="state-box">
          <div style="font-size: 3.5rem;">⚔️</div>
          <h3 class="state-title">No players registered yet.</h3>
          <p class="state-subtitle">There are no players recorded for this selection.</p>
        </div>
      `;
    }

    let html = `
      <div class="leaderboard-header">
        <div class="col-rank">#</div>
        <div class="col-player">PLAYER</div>
        <div class="col-region">REGION</div>
        <div class="col-tiers">TIERS</div>
      </div>
      <div class="ranking-list">
    `;

    players.forEach((player, idx) => {
      const rankNum = idx + 1;
      
      // Rank Badge styling matching reference image
      let rankBadgeHtml = '';
      if (rankNum === 1) {
        rankBadgeHtml = `<div class="rank-badge-chevron rank-1"><span>1.</span></div>`;
      } else if (rankNum === 2) {
        rankBadgeHtml = `<div class="rank-badge-chevron rank-2"><span>2.</span></div>`;
      } else if (rankNum === 3) {
        rankBadgeHtml = `<div class="rank-badge-chevron rank-3"><span>3.</span></div>`;
      } else {
        rankBadgeHtml = `<div class="rank-badge-plain"><span>${rankNum}.</span></div>`;
      }

      const skinUrl = BladeTiersAPI.getSkinUrl(player.skin);
      const reg = player.region ? player.region.toUpperCase() : '??';
      const regClass = `reg-${reg}`;

      // Build right-side tiers matrix with colored circles and tier pill badges
      let tiersHtml = '';
      MATRIX_GAMEMODES.forEach(m => {
        const tierValue = player.tiers && (player.tiers[m.id] || (m.id === 'nethpot' && player.tiers['pot']));
        let tierLevel = null;
        if (tierValue) {
          const match = tierValue.match(/(\d)/);
          tierLevel = match ? match[1] : null;
        }

        const circleClass = tierLevel ? `circle-tier-${tierLevel}` : 'circle-unranked';
        const pillClass = tierLevel ? `pill-tier-${tierLevel}` : 'pill-unranked';
        const displayCode = tierValue ? tierValue.toUpperCase() : '-';

        tiersHtml += `
          <div class="gamemode-tier-col" title="${m.name}: ${displayCode}">
            <div class="gamemode-tier-circle ${circleClass}">
              ${tierValue ? `<img src="${m.icon}" alt="${m.name}" onerror="this.style.opacity='0.2'">` : ''}
            </div>
            <div class="gamemode-tier-pill ${pillClass}">
              ${displayCode}
            </div>
          </div>
        `;
      });

      html += `
        <div class="ranking-card-row" onclick="location.hash='#/player/${encodeURIComponent(player.name)}'">
          ${rankBadgeHtml}

          <div class="player-model-container">
            ${skinUrl ? `
              <img class="player-model-img" src="${skinUrl}" alt="${player.name}" loading="lazy" onerror="this.style.opacity='0.25'; this.src='assets/branding/blade_tier_icon.webp';">
            ` : `
              <img class="player-model-img" src="assets/branding/blade_tier_icon.webp" alt="${player.name}" style="opacity: 0.25;">
            `}
          </div>

          <div class="player-info-box">
            <span class="player-name-text">${player.name}</span>
            <div class="player-subtitle-row">
              <span class="combat-rank-symbol">◆</span>
              <span>${player.title} (${player.points} points)</span>
            </div>
          </div>

          <div class="region-pill-box">
            <span class="region-badge-pill ${regClass}">${reg}</span>
          </div>

          <div class="tiers-row-box">
            ${tiersHtml}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    return html;
  }

  // Render API Docs View
  function renderDocs() {
    contentArea.innerHTML = `
      <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-main); border-radius: 16px; padding: 2.25rem;">
        <div style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">Blade Tiers Public REST API</h2>
          <p style="color: var(--text-muted); font-size: 1rem;">
            Real-time player registration and competitive combat tier database. Base URL: 
            <code style="background: var(--bg-pill); color: var(--color-primary-gold); padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 700;">https://api.ticknodes.dpdns.org</code>
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="background: var(--bg-card-alt); border: 1px solid var(--border-card); border-radius: 12px; padding: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-weight: 800; color: #4ade80; font-size: 1.05rem;">GET /api/players</span>
              <button class="btn-info" onclick="testLiveApi()">Try Live</button>
            </div>
            <div style="color: var(--text-muted); font-size: 0.9rem;">Fetches all registered players, rendered 3D skin models, discord IDs, and active tiers.</div>
          </div>
        </div>

        <div id="api-output-box" style="margin-top: 2rem; display: none;">
          <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">Live API Response:</h3>
          <pre id="api-output" style="background: #090c13; border: 1px solid var(--border-main); padding: 1.25rem; border-radius: 10px; overflow-x: auto; max-height: 450px; font-size: 0.9rem; color: #38bdf8; line-height: 1.5;"></pre>
        </div>
      </div>
    `;
  }

  window.testLiveApi = async () => {
    const box = document.getElementById('api-output-box');
    const out = document.getElementById('api-output');
    box.style.display = 'block';
    out.textContent = 'Fetching GET https://api.ticknodes.dpdns.org/api/players...';
    try {
      const res = await fetch('https://api.ticknodes.dpdns.org/api/players');
      const json = await res.json();
      out.textContent = JSON.stringify(json, null, 2);
    } catch (e) {
      out.textContent = 'Error: ' + e.message;
    }
  };

  // Main View Switcher
  function renderView() {
    renderTabs();
    renderSubheader();

    if (state.loading) {
      contentArea.innerHTML = `
        <div class="state-box">
          <div class="spinner"></div>
          <h3 class="state-title">Loading Blade Tiers...</h3>
          <p class="state-subtitle">Connecting to live API at api.ticknodes.dpdns.org</p>
        </div>
      `;
      return;
    }

    if (state.error) {
      contentArea.innerHTML = `
        <div class="state-box">
          <div style="font-size: 3rem;">⚠️</div>
          <h3 class="state-title">${state.error}</h3>
          <p class="state-subtitle">Could not connect to the Blade Tiers server. Check connection.</p>
          <button class="btn-info" onclick="location.reload()" style="margin-top: 0.5rem;">Retry Connection</button>
        </div>
      `;
      return;
    }

    if (state.currentMode === 'docs') {
      renderDocs();
      return;
    }

    // Filter players by region
    let players = state.regionFilter === 'ALL'
      ? state.players
      : state.players.filter(p => p.region && p.region.toUpperCase() === state.regionFilter);

    // If specific gamemode selected
    if (state.currentMode !== 'overall' && state.currentMode !== 'ltm') {
      players = players.filter(p => p.tiers && (p.tiers[state.currentMode] || (state.currentMode === 'pot' && p.tiers['nethpot'])));
      // Sort by specific gamemode tier
      players.sort((a, b) => {
        const tA = BladeTiersAPI.getTierLevel(a.tiers[state.currentMode] || a.tiers['nethpot']);
        const tB = BladeTiersAPI.getTierLevel(b.tiers[state.currentMode] || b.tiers['nethpot']);
        return tA - tB;
      });
    }

    contentArea.innerHTML = renderRankingList(players);
  }

  // Player Profile Modal
  function openPlayerModal(identifier) {
    const player = state.players.find(p => p.name.toLowerCase() === identifier.toLowerCase());
    playerModal.classList.add('active');

    if (!player) {
      playerModalContent.innerHTML = `
        <div class="state-box">
          <h3 class="state-title">Player Not Found</h3>
          <p class="state-subtitle">Player "${identifier}" is not currently registered on Blade Tiers.</p>
        </div>
      `;
      return;
    }

    const skinUrl = BladeTiersAPI.getSkinUrl(player.skin);
    const reg = player.region ? player.region.toUpperCase() : '??';
    const rankIndex = state.players.findIndex(p => p.name === player.name) + 1;

    let tiersGridHtml = '';
    const allKnownModes = ['mace', 'sword', 'nethop', 'nethpot', 'axe', 'uhc', 'smp', 'vanilla', 'pot'];
    allKnownModes.forEach(m => {
      const tierValue = player.tiers && player.tiers[m];
      let tierLevel = null;
      if (tierValue) {
        const match = tierValue.match(/(\d)/);
        tierLevel = match ? match[1] : null;
      }
      const pillClass = tierLevel ? `pill-tier-${tierLevel}` : 'pill-unranked';
      const displayCode = tierValue ? tierValue.toUpperCase() : 'Unranked';
      const iconPath = `assets/tier_icons/${m === 'nethpot' ? 'pot' : m}.svg`;

      tiersGridHtml += `
        <div class="profile-mode-card">
          <div class="gamemode-tier-circle ${tierLevel ? 'circle-tier-' + tierLevel : 'circle-unranked'}" style="width: 36px; height: 36px;">
            <img src="${iconPath}" alt="${m}" style="width: 20px; height: 20px;" onerror="this.style.opacity='0.2'">
          </div>
          <span class="profile-mode-name">${m.toUpperCase()}</span>
          <span class="gamemode-tier-pill ${pillClass}" style="width: auto; padding: 0.25rem 0.65rem;">${displayCode}</span>
        </div>
      `;
    });

    playerModalContent.innerHTML = `
      <div class="profile-header">
        <img class="profile-skin-preview" src="${skinUrl}" alt="${player.name}" onerror="this.onerror=null; this.src='assets/branding/blade_tier_icon.webp'">
        <div class="profile-details">
          <div class="profile-title-row">
            <h2 class="profile-name">${player.name}</h2>
            <span class="region-badge-pill reg-${reg}">${reg}</span>
          </div>
          ${player.discord_id ? `
            <div style="font-size: 0.95rem; color: var(--text-muted); margin-top: 0.35rem;">
              Discord ID: <strong style="color: #fff;">${player.discord_id}</strong>
              <button style="background: none; border: none; color: var(--color-accent); cursor: pointer; margin-left: 0.5rem; font-weight: 700;" onclick="copyText('${player.discord_id}', 'Discord ID')">Copy</button>
            </div>
          ` : ''}
          <div class="profile-stats">
            <div class="stat-pill">
              <span class="stat-label">Rank Position</span>
              <span class="stat-value">#${rankIndex > 0 ? rankIndex : 'N/A'}</span>
            </div>
            <div class="stat-pill">
              <span class="stat-label">Total Points</span>
              <span class="stat-value">${player.points} pts</span>
            </div>
            <div class="stat-pill">
              <span class="stat-label">Rank Title</span>
              <span class="stat-value" style="color: var(--color-primary-gold);">${player.title}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-section-title">Combat Gamemode Tiers</div>
      <div class="profile-rankings-grid">
        ${tiersGridHtml}
      </div>
    `;
  }

  function closePlayerModal() {
    playerModal.classList.remove('active');
    if (window.location.hash.startsWith('#/player/')) {
      window.location.hash = `#/rankings/${state.currentMode}`;
    }
  }

  // Info Modal
  function openInfoModal() {
    infoModalBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <img src="assets/branding/blade_tier_logo.png" alt="Blade Tiers" style="height: 48px; margin: 0 auto 0.75rem auto;">
        <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff;">About Blade Tiers</h2>
      </div>
      <div style="color: var(--text-muted); line-height: 1.7; font-size: 0.98rem;">
        <p style="margin-bottom: 1rem;">
          <strong>Blade Tiers</strong> is the official competitive Minecraft PvP tier ranking platform for <strong>chocomc.net</strong>.
          Combatants are tested and ranked across Mace, Sword, Netherite OP, Netherite Pot, Axe, UHC, and SMP.
        </p>
        <p style="margin-bottom: 1.5rem;">
          Points are accumulated through official tier tests and tournament standings. High Tier (HT) and Low Tier (LT) determine your global standing on the leaderboard.
        </p>
      </div>
      <div style="background: var(--bg-card-alt); border: 1px solid var(--border-card); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase;">Official Server</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: #fff;">chocomc.net</div>
          </div>
          <button class="btn-info" onclick="copyText('chocomc.net', 'Server IP')">Copy Server IP</button>
        </div>
      </div>
      <a href="https://discord.gg" target="_blank" class="btn-info" style="display: flex; justify-content: center; width: 100%; background: #5865F2; color: #fff; border: none; font-size: 1rem; padding: 0.75rem;">
        Join Blade Tiers Discord Community
      </a>
    `;
    infoModal.classList.add('active');
  }

  function closeInfoModal() {
    infoModal.classList.remove('active');
  }

  // Modals event listeners
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePlayerModal();
      closeInfoModal();
      searchResults.classList.remove('active');
    }
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePlayerModal();
        closeInfoModal();
      }
    });
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      closePlayerModal();
      closeInfoModal();
    });
  });

  // Search input handler
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
      searchResults.classList.remove('active');
      return;
    }

    const matches = state.players.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.region && p.region.toLowerCase().includes(query))
    );

    searchResults.classList.add('active');
    if (matches.length > 0) {
      searchResults.innerHTML = matches.slice(0, 6).map(p => {
        const skinUrl = BladeTiersAPI.getSkinUrl(p.skin);
        return `
          <div class="search-item" onclick="location.hash='#/player/${encodeURIComponent(p.name)}'; document.getElementById('search-results').classList.remove('active');">
            <img src="${skinUrl}" alt="${p.name}" onerror="this.onerror=null; this.src='assets/branding/blade_tier_icon.webp';">
            <div class="search-item-info">
              <div class="search-item-name">${p.name}</div>
              <div class="search-item-meta">${p.points} pts • ${p.region || '??'} • ${p.title}</div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      searchResults.innerHTML = `<div style="padding: 0.75rem; color: var(--text-dim); font-size: 0.9rem;">No player registered as "${query}"</div>`;
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        searchResults.classList.remove('active');
        window.location.hash = `#/player/${encodeURIComponent(query)}`;
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search')) {
      searchResults.classList.remove('active');
    }
    if (!e.target.closest('.nav-dropdown')) {
      discordsMenu.classList.remove('show');
    }
  });

  discordsDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    discordsMenu.classList.toggle('show');
  });

  // Background auto-refresh (every 60 seconds)
  setInterval(() => {
    loadData(true);
  }, 60000);

  // Initial load
  loadData().then(() => {
    handleRoute();
  });
});
