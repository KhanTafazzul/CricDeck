/**
 * CricDeck Shared Overlay Bridge
 * Dynamically synchronizes match data, team contrast colors, logos, and countdown
 * across all 7 broadcast overlay variants without needing manual edits each match.
 */

window.CricDeckOverlay = (function () {
  const DEFAULT_DATA = {
    teamA: 'IND',
    teamAName: 'India',
    teamAColor: '#0047AB',
    teamALogo: '',
    teamB: 'AUS',
    teamBName: 'Australia',
    teamBColor: '#F5B800',
    teamBLogo: '',
    useTeamColors: true,
    title: 'ICC CRICKET WORLD CUP • MATCH',
    series: 'ICC MEN\'S CHAMPIONSHIP 2026',
    venue: 'INTERNATIONAL CRICKET STADIUM',
    toss: 'TOSS TO TAKE PLACE SHORTLY',
    minutes: 15
  };

  let currentData = { ...DEFAULT_DATA };
  let countdownTimer = null;
  let remainingSeconds = 15 * 60;

  function init(customHydrateCallback) {
    loadData();
    applyData(customHydrateCallback);
    setupSync(customHydrateCallback);
    setupKeybindings();
  }

  function loadData() {
    const params = new URLSearchParams(window.location.search);

    // 1. Try URL parameters
    const fromParams = {};
    if (params.has('teamA')) fromParams.teamA = params.get('teamA');
    if (params.has('teamAName')) fromParams.teamAName = params.get('teamAName');
    if (params.has('teamAColor')) fromParams.teamAColor = params.get('teamAColor');
    if (params.has('teamALogo')) fromParams.teamALogo = params.get('teamALogo');
    if (params.has('teamB')) fromParams.teamB = params.get('teamB');
    if (params.has('teamBName')) fromParams.teamBName = params.get('teamBName');
    if (params.has('teamBColor')) fromParams.teamBColor = params.get('teamBColor');
    if (params.has('teamBLogo')) fromParams.teamBLogo = params.get('teamBLogo');
    if (params.has('useTeamColors')) fromParams.useTeamColors = params.get('useTeamColors') !== '0';
    if (params.has('title')) fromParams.title = params.get('title');
    if (params.has('series')) fromParams.series = params.get('series');
    if (params.has('venue')) fromParams.venue = params.get('venue');
    if (params.has('toss')) fromParams.toss = params.get('toss');
    if (params.has('minutes')) fromParams.minutes = parseInt(params.get('minutes')) || 15;

    // 2. Fallback to LocalStorage shared overlay data if parameters not complete
    let fromStorage = {};
    try {
      const raw = localStorage.getItem('cricdeck_overlay_shared_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        fromStorage = {
          teamA: parsed.teamACode || parsed.teamA,
          teamAName: parsed.teamAName,
          teamAColor: parsed.teamAColor,
          teamALogo: parsed.teamALogo,
          teamB: parsed.teamBCode || parsed.teamB,
          teamBName: parsed.teamBName,
          teamBColor: parsed.teamBColor,
          teamBLogo: parsed.teamBLogo,
          useTeamColors: parsed.useTeamColors !== false,
          title: parsed.matchTitle || parsed.title,
          series: parsed.series,
          venue: parsed.venue,
          toss: parsed.tossInfo || parsed.toss,
          minutes: parsed.minutes || 15
        };
      }
    } catch (_) {}

    // 3. Fallback to active live match state in CricDeck
    let fromMatchState = {};
    try {
      const rawMatch = localStorage.getItem('cricdeck_match_state');
      if (rawMatch) {
        const ms = JSON.parse(rawMatch);
        fromMatchState = {
          teamA: (ms.team_a || 'TMA').substring(0, 3).toUpperCase(),
          teamAName: ms.team_a,
          teamB: (ms.team_b || 'TMB').substring(0, 3).toUpperCase(),
          teamBName: ms.team_b,
          title: ms.tournament_id ? 'TOURNAMENT LIVE MATCH' : 'ICC CRICKET LIVE',
          toss: ms.toss_winner ? `${ms.toss_winner.toUpperCase()} WON TOSS & ELECTED TO ${ms.elected_to.toUpperCase()} FIRST` : 'TOSS COMPLETED'
        };
      }
    } catch (_) {}

    // Merge in priority order: URL params > shared overlay storage > live match state > default
    currentData = {
      ...DEFAULT_DATA,
      ...fromMatchState,
      ...fromStorage,
      ...fromParams
    };
  }

  function applyData(customHydrateCallback) {
    // Apply Dynamic Theme Colors & Contrast
    const root = document.documentElement;
    if (currentData.useTeamColors) {
      root.style.setProperty('--team-a-color', currentData.teamAColor || '#0047AB');
      root.style.setProperty('--team-b-color', currentData.teamBColor || '#E63946');
    } else {
      // Unified neutral broadcast theme color
      root.style.setProperty('--team-a-color', '#00FF88');
      root.style.setProperty('--team-b-color', '#00C2A8');
    }

    // Auto-populate standard DOM element IDs if present
    setElementText('teamACode', currentData.teamA);
    setElementText('teamAName', currentData.teamAName);
    setElementText('teamBCode', currentData.teamB);
    setElementText('teamBName', currentData.teamBName);
    setElementText('matchTitle', currentData.title);
    setElementText('matchTitleText', currentData.title);
    setElementText('venueText', currentData.venue);
    setElementText('seriesText', currentData.series);
    setElementText('tossText', currentData.toss);
    setElementText('tossInfo', currentData.toss);

    // Team Logos / Fallback Badges
    renderLogo('teamALogoSlot', currentData.teamALogo, currentData.teamA);
    renderLogo('teamBLogoSlot', currentData.teamBLogo, currentData.teamB);
    renderLogo('logoSlotA', currentData.teamALogo, currentData.teamA);
    renderLogo('logoSlotB', currentData.teamBLogo, currentData.teamB);

    // Restart countdown
    remainingSeconds = (currentData.minutes || 15) * 60;
    startCountdown();

    if (typeof customHydrateCallback === 'function') {
      customHydrateCallback(currentData);
    }
  }

  function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el && text !== undefined) {
      el.textContent = text;
    }
  }

  function renderLogo(containerId, logoSrc, fallbackCode) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (logoSrc) {
      el.innerHTML = `<img src="${logoSrc}" alt="logo" style="width:100%;height:100%;object-fit:contain;" />`;
    } else {
      el.innerHTML = `<span style="font-weight:900;font-size:inherit;">${fallbackCode || 'T'}</span>`;
    }
  }

  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    updateCountdownDOM();
    countdownTimer = setInterval(() => {
      if (remainingSeconds <= 0) {
        clearInterval(countdownTimer);
        return;
      }
      remainingSeconds--;
      updateCountdownDOM();
    }, 1000);
  }

  function updateCountdownDOM() {
    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const secs = String(remainingSeconds % 60).padStart(2, '0');
    const formatted = `${mins}:${secs}`;

    const candidates = ['countdownVal', 'countdownDisplay', 'countdownText', 'countdownDigits'];
    candidates.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatted;
    });
  }

  function setupSync(customHydrateCallback) {
    try {
      const bc = new BroadcastChannel('cricdeck_overlay_sync');
      bc.onmessage = (e) => {
        if (!e.data) return;
        if (e.data.type === 'MATCH_UPDATE' && e.data.data) {
          const d = e.data.data;
          currentData = {
            ...currentData,
            teamA: d.teamACode || d.teamA || currentData.teamA,
            teamAName: d.teamAName || currentData.teamAName,
            teamAColor: d.teamAColor || currentData.teamAColor,
            teamALogo: d.teamALogo !== undefined ? d.teamALogo : currentData.teamALogo,
            teamB: d.teamBCode || d.teamB || currentData.teamB,
            teamBName: d.teamBName || currentData.teamBName,
            teamBColor: d.teamBColor || currentData.teamBColor,
            teamBLogo: d.teamBLogo !== undefined ? d.teamBLogo : currentData.teamBLogo,
            useTeamColors: d.useTeamColors !== undefined ? d.useTeamColors : currentData.useTeamColors,
            title: d.matchTitle || d.title || currentData.title,
            series: d.series || currentData.series,
            venue: d.venue || currentData.venue,
            toss: d.tossInfo || d.toss || currentData.toss,
            minutes: d.minutes || currentData.minutes
          };
          applyData(customHydrateCallback);
        } else if (e.data.type === 'GO_LIVE') {
          if (typeof window.goLive === 'function') {
            window.goLive();
          }
        }
      };
    } catch (_) {}
  }

  function setupKeybindings() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'b' || e.key === 'B') {
        document.body.classList.toggle('test-bg');
      }
      if (e.key === 'l' || e.key === 'L') {
        if (typeof window.goLive === 'function') {
          window.goLive();
        }
      }
    });
  }

  return {
    init,
    getData: () => currentData,
    reload: (cb) => { loadData(); applyData(cb); }
  };
})();
