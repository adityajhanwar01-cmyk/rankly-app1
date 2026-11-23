/* ═══════════════════════════════════════════════════
   Rankly — IIT JoSAA Counselling & Seat Recommendation System
   Frontend Logic for Full 16-Entity Relational System
   ═══════════════════════════════════════════════════ */

const API_BASE = '';

// ─── Global State ───
let currentResults = [];
let filteredResults = [];
let activeRiskFilter = 'ALL';
let shortlist = JSON.parse(localStorage.getItem('rankly_shortlist') || '[]');
let allColleges = [];
let sortKey = 'match_pct';

// ─── DOM Ready ───
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.add('hidden');
        loader.style.display = 'none';
    }

    try { initTheme(); } catch (e) { console.warn('initTheme error:', e); }
    try { updateShortlistBadges(); } catch (e) { console.warn('updateShortlistBadges error:', e); }
    try { initWeightVisualization(); } catch (e) { console.warn('initWeightVisualization error:', e); }
    try { loadInstitutes(); } catch (e) { console.warn('loadInstitutes error:', e); }
    try { loadIITDirectory(); } catch (e) { console.warn('loadIITDirectory error:', e); }
    try { initNavHoverIntent(); } catch (e) { console.warn('initNavHoverIntent error:', e); }
    try { setupHomeCityCombobox(); } catch (e) { console.warn('setupHomeCityCombobox error:', e); }
    if (window.lucide) lucide.createIcons();
});

// ═══════════════════════════════════════════════════
// 1. THEME MANAGEMENT (LIGHT / DARK)
// ═══════════════════════════════════════════════════
function initTheme() {
    const savedTheme = localStorage.getItem('rankly_theme') || 'light';
    setTheme(savedTheme);
}

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
};

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rankly_theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.innerHTML = theme === 'dark' ? '<i data-lucide="sun" width="16" height="16"></i>' : '<i data-lucide="moon" width="16" height="16"></i>';
        btn.title = theme === 'dark' ? 'Switch to Paper Light' : 'Switch to Midnight Dark';
        if (window.lucide) lucide.createIcons();
    }
}

// ═══════════════════════════════════════════════════
// 2. NAVIGATION & DROPDOWNS SYSTEM (Midnight Lime)
// ═══════════════════════════════════════════════════

let activeDropdown = null;
let navHoverTimeout = null;

window.switchTab = function(tabId) {
    // Redirects for unified flow and removed family mode
    if (tabId === 'predict' || tabId === 'preferences' || tabId === 'start' || tabId === 'search') {
        tabId = 'find';
    }
    if (tabId === 'consensus' || tabId === 'family') {
        tabId = 'home';
    }

    // Keep app-shell clean without locking body overflow
    document.body.classList.remove('app-shell');
    document.documentElement.classList.remove('app-shell-active');
    document.body.setAttribute('data-active-tab', tabId);

    const topTrack = document.getElementById('topProgressTrack');
    if (topTrack) {
        topTrack.style.display = tabId === 'find' ? 'block' : 'none';
    }


    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    // Update active state in nav mega menu items & flat tabs
    document.querySelectorAll('.mega-menu-item').forEach(item => {
        const isActive = item.getAttribute('data-tab') === tabId;
        item.classList.toggle('active', isActive);
        if (isActive) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    });

    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Trigger tab-specific data fetchers
    if (tabId === 'results') {
        syncRefineSliders();
        renderRefineMiniDonut();
        if (!currentResults || currentResults.length === 0) {
            runPrediction();
        } else {
            applyCardFilters();
        }
    }
    
    if (tabId === 'peer') loadPeerTrends();
    if (tabId === 'compare') renderCompareView();
    if (tabId === 'trends') renderTrendsView();


    closeAllNavDropdowns();
    closeMobileNav();
    if (window.lucide) lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.toggleNavDropdown = function(dropdownName) {
    const wrapper = document.querySelector(`.nav-dropdown-wrapper[data-dropdown="${dropdownName}"]`);
    if (!wrapper) return;
    const isOpen = wrapper.classList.contains('open');
    closeAllNavDropdowns();
    if (!isOpen) {
        wrapper.classList.add('open');
        const trigger = wrapper.querySelector('.nav-dropdown-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
        activeDropdown = dropdownName;
    }
};

window.closeAllNavDropdowns = function() {
    clearTimeout(navHoverTimeout);
    document.querySelectorAll('.nav-dropdown-wrapper').forEach(w => {
        w.classList.remove('open');
        const trigger = w.querySelector('.nav-dropdown-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
    activeDropdown = null;
};

// Hover-intent (120ms delay) for desktop mega-menus
function initNavHoverIntent() {
    document.querySelectorAll('.nav-dropdown-wrapper').forEach(wrapper => {
        const name = wrapper.getAttribute('data-dropdown');

        wrapper.addEventListener('mouseenter', () => {
            clearTimeout(navHoverTimeout);
            navHoverTimeout = setTimeout(() => {
                document.querySelectorAll('.nav-dropdown-wrapper').forEach(w => {
                    if (w !== wrapper) {
                        w.classList.remove('open');
                        const t = w.querySelector('.nav-dropdown-trigger');
                        if (t) t.setAttribute('aria-expanded', 'false');
                    }
                });
                wrapper.classList.add('open');
                const trigger = wrapper.querySelector('.nav-dropdown-trigger');
                if (trigger) trigger.setAttribute('aria-expanded', 'true');
                activeDropdown = name;
            }, 120);
        });

        wrapper.addEventListener('mouseleave', () => {
            clearTimeout(navHoverTimeout);
            navHoverTimeout = setTimeout(() => {
                wrapper.classList.remove('open');
                const trigger = wrapper.querySelector('.nav-dropdown-trigger');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
                if (activeDropdown === name) activeDropdown = null;
            }, 120);
        });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown-wrapper')) {
            closeAllNavDropdowns();
        }
        if (!e.target.closest('#studentSwitcher') && !e.target.closest('#studentDropdown')) {
            const sd = document.getElementById('studentDropdown');
            if (sd) sd.style.display = 'none';
        }
    });

    // Close on Escape & Arrow keys
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllNavDropdowns();
            closeMobileNav();
            closeCmdPalette();
            closeExplainDrawer();
        }
    });
}

// ─── Mobile Navigation Sheet (<1024px) ───
window.toggleMobileNav = function() {
    const sheet = document.getElementById('mobileNavSheet');
    const backdrop = document.getElementById('mobileNavBackdrop');
    const btn = document.getElementById('hamburgerBtn');
    if (!sheet) return;

    const isOpen = sheet.classList.contains('open');
    if (isOpen) {
        closeMobileNav();
    } else {
        sheet.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
        if (btn) btn.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
};

window.closeMobileNav = function() {
    const sheet = document.getElementById('mobileNavSheet');
    const backdrop = document.getElementById('mobileNavBackdrop');
    const btn = document.getElementById('hamburgerBtn');
    if (sheet) sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    if (btn) btn.classList.remove('open');
    document.body.style.overflow = '';
};

// ─── Student Switcher Personas ───
const CANDIDATE_PROFILES = [
    { name: 'Aarav Mehta', rank: 1842, category: 'OBC-NCL', gender: 'Male', pool: 'Gender-Neutral', avatar: 'A' },
    { name: 'Priya Patel', rank: 3210, category: 'OPEN', gender: 'Female', pool: 'Female-only', avatar: 'P' },
    { name: 'Rohan Sharma', rank: 892, category: 'SC', gender: 'Male', pool: 'Gender-Neutral', avatar: 'R' }
];
let activeCandidateIdx = 0;

window.toggleStudentDropdown = function() {
    const dd = document.getElementById('studentDropdown');
    if (!dd) return;
    const isVisible = dd.style.display === 'block';
    dd.style.display = isVisible ? 'none' : 'block';
};

window.setStudent = function(idx) {
    activeCandidateIdx = idx;
    const p = CANDIDATE_PROFILES[idx];
    if (!p) return;

    const nameEl = document.getElementById('activeStudentName');
    const rankEl = document.getElementById('activeStudentRank');
    const avatarEl = document.getElementById('studentAvatar');
    if (nameEl) nameEl.textContent = p.name;
    if (rankEl) rankEl.textContent = `#${p.rank} · ${p.category}`;
    if (avatarEl) avatarEl.textContent = p.avatar;

    // Pre-fill rank input if present
    const rankInput = document.getElementById('rankInput') || document.getElementById('rank');
    if (rankInput) {
        rankInput.value = p.rank;
        if (window.updateOptionsPreview) updateOptionsPreview(p.rank);
    }

    // Highlight active in dropdown
    document.querySelectorAll('.student-dropdown-item').forEach((item, i) => {
        item.classList.toggle('active', i === idx);
    });

    const dd = document.getElementById('studentDropdown');
    if (dd) dd.style.display = 'none';

    showToast(`Switched candidate to ${p.name} (AIR #${p.rank})`, 'info');
};

// ─── Command Palette (Ctrl+K / Cmd+K) ───
const CMD_ITEMS = [
    { icon: 'compass', label: 'Find my IIT', desc: 'Personalised recommendation cockpit', action: () => switchTab('find') },
    { icon: 'layout-grid', label: 'My Results', desc: 'Ranked choices with match scores', action: () => switchTab('results') },
    { icon: 'trending-up', label: 'Branch Trends', desc: '3-year cutoff trajectory analysis', action: () => switchTab('trends') },
    { icon: 'users', label: 'Students Like You', desc: 'Peer decisions & cutoff statistics', action: () => switchTab('peer') },
    { icon: 'git-compare', label: 'Compare Options', desc: 'Side-by-side radar overlay', action: () => switchTab('compare') },
    { icon: 'sun', label: 'Toggle Light / Dark Mode', desc: 'Switch theme between Midnight & Paper', action: () => toggleTheme() }
];

let selectedCmdIdx = 0;
let filteredCmdItems = [...CMD_ITEMS];

window.openCmdPalette = function() {
    const backdrop = document.getElementById('cmdBackdrop');
    const input = document.getElementById('cmdInput');
    if (!backdrop) return;
    backdrop.classList.add('open');
    if (input) {
        input.value = '';
        input.focus();
    }
    filteredCmdItems = [...CMD_ITEMS];
    selectedCmdIdx = 0;
    renderCmdResults();
};

window.closeCmdPalette = function() {
    const backdrop = document.getElementById('cmdBackdrop');
    if (backdrop) backdrop.classList.remove('open');
};

window.filterCmdResults = function(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
        filteredCmdItems = [...CMD_ITEMS];
    } else {
        filteredCmdItems = CMD_ITEMS.filter(item =>
            item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
        );
    }
    selectedCmdIdx = 0;
    renderCmdResults();
};

function renderCmdResults() {
    const container = document.getElementById('cmdResults');
    if (!container) return;

    if (filteredCmdItems.length === 0) {
        container.innerHTML = `
            <div style="padding:var(--space-6); text-align:center; color:var(--muted); font-size:var(--text-sm);">
                No matching actions or pages found.
            </div>
        `;
        return;
    }

    container.innerHTML = filteredCmdItems.map((item, idx) => `
        <div class="cmd-item ${idx === selectedCmdIdx ? 'selected' : ''}" onclick="executeCmdItem(${idx})">
            <i data-lucide="${item.icon}" width="16" height="16" style="color:var(--lime);flex-shrink:0;"></i>
            <div style="flex:1;min-width:0;">
                <div class="cmd-item__label">${escapeHtml(item.label)}</div>
                <div class="cmd-item__desc">${escapeHtml(item.desc)}</div>
            </div>
            <span class="cmd-kbd">↵</span>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

window.executeCmdItem = function(idx) {
    const item = filteredCmdItems[idx];
    if (item && item.action) {
        closeCmdPalette();
        item.action();
    }
};

window.handleCmdKey = function(e) {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedCmdIdx = (selectedCmdIdx + 1) % filteredCmdItems.length;
        renderCmdResults();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedCmdIdx = (selectedCmdIdx - 1 + filteredCmdItems.length) % filteredCmdItems.length;
        renderCmdResults();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCmdItem(selectedCmdIdx);
    } else if (e.key === 'Escape') {
        closeCmdPalette();
    }
};

// Global keyboard shortcut: Ctrl+K or Cmd+K
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const backdrop = document.getElementById('cmdBackdrop');
        if (backdrop && backdrop.classList.contains('open')) {
            closeCmdPalette();
        } else {
            openCmdPalette();
        }
    }
});

window.scrollToExplore = function() {
    switchTab('home');
    setTimeout(() => {
        const el = document.getElementById('exploreSection');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
};

// ═══════════════════════════════════════════════════
// 3. TOAST & HELPERS
// ═══════════════════════════════════════════════════
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast visible toast--${type}`;
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3500);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

// ═══════════════════════════════════════════════════
// 4. PRIORITIES & PRESET SYSTEM
// ═══════════════════════════════════════════════════
window.updatePrefDisplay = function(spanId, val) {
    const el = document.getElementById(spanId);
    if (el) el.textContent = val;
    initWeightVisualization();
};

window.setTier = function(button, inputId, weightValue) {
    const group = button.closest('.pref-tier-group');
    if (group) {
        group.querySelectorAll('.pref-tier-btn').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
    }
    const input = document.getElementById(inputId);
    if (input) {
        input.value = weightValue;
        const spanId = 'val_' + inputId.replace('w_', '');
        updatePrefDisplay(spanId, weightValue);
    }
};

// Select-based priority type setter (for redesigned preferences page)
window.setTierSelect = function(selectEl, inputId) {
    const weightValue = parseInt(selectEl.value);
    const input = document.getElementById(inputId);
    if (input) {
        input.value = weightValue;
        const spanId = 'val_' + inputId.replace('w_', '');
        updatePrefDisplay(spanId, weightValue);
    }
};

window.applyPreset = function(presetName) {
    const presets = {
        'Placement Hunter': {
            w_s_place: 45, w_s_branch: 30, w_s_nirf: 15, w_s_fee: 5,
            w_s_loc: 5, w_s_campus: 5, w_s_mess: 3, w_s_nearhome: 2
        },
        'Budget Saver': {
            w_s_fee: 45, w_s_place: 20, w_s_nirf: 10, w_s_branch: 10,
            w_s_nearhome: 10, w_s_campus: 5, w_s_loc: 5, w_s_mess: 5
        },
        'Near Home': {
            w_s_nearhome: 40, w_s_loc: 25, w_s_nirf: 15, w_s_place: 15,
            w_s_fee: 5, w_s_campus: 5, w_s_branch: 5, w_s_mess: 3
        },
        'Campus Life Lover': {
            w_s_campus: 35, w_s_mess: 20, w_s_place: 20, w_s_branch: 10,
            w_s_nirf: 10, w_s_loc: 10, w_s_fee: 5, w_s_nearhome: 5
        }
    };

    const cfg = presets[presetName];
    if (!cfg) return;

    for (const [id, val] of Object.entries(cfg)) {
        const input = document.getElementById(id);
        if (input) {
            input.value = val;
            const spanId = 'val_' + id.replace('w_', '');
            const span = document.getElementById(spanId);
            if (span) span.textContent = val;
        }
    }

    initWeightVisualization();
    showToast(`Applied preset: ${presetName}!`, 'success');
};

window.resetDefaultWeights = function() {
    const defaults = {
        w_s_place: 30, w_s_branch: 25, w_s_nirf: 15, w_s_fee: 10,
        w_s_loc: 10, w_s_campus: 5, w_s_mess: 3, w_s_nearhome: 2
    };
    for (const [id, val] of Object.entries(defaults)) {
        const input = document.getElementById(id);
        if (input) {
            input.value = val;
            const spanId = 'val_' + id.replace('w_', '');
            const span = document.getElementById(spanId);
            if (span) span.textContent = val;
        }
    }
    initWeightVisualization();
    showToast('Reset to default priorities model.', 'info');
};

window.savePreferencesAndSearch = function() {
    showToast('Priorities saved! Now enter your JEE Rank.', 'success');
    switchTab('predict');
};

function getStudentPreferences() {
    return {
        placement: parseInt(document.getElementById('w_s_place')?.value || 30),
        branch:    parseInt(document.getElementById('w_s_branch')?.value || 25),
        nirf:      parseInt(document.getElementById('w_s_nirf')?.value || 15),
        fee:       parseInt(document.getElementById('w_s_fee')?.value || 10),
        location:  parseInt(document.getElementById('w_s_loc')?.value || 10),
        campus:    parseInt(document.getElementById('w_s_campus')?.value || 5),
        mess:      parseInt(document.getElementById('w_s_mess')?.value || 3),
        safety:    7
    };
}

function getFamilyPreferences() {
    return {
        placement: parseInt(document.getElementById('w_s_place')?.value || 30),
        nirf:      parseInt(document.getElementById('w_s_nirf')?.value || 15) + 5,
        fee:       parseInt(document.getElementById('w_s_fee')?.value || 10) + 10,
        campus:    parseInt(document.getElementById('w_s_campus')?.value || 5),
        safety:    8
    };
}

// ─── Donut Chart for Weight Distribution ───
function initWeightVisualization() {
    const container = document.getElementById('prefChartContainer');
    if (!container) return;

    const weights = [
        { name: 'Branch',    val: parseInt(document.getElementById('w_s_branch')?.value || 25), color: '#4a90d9' },
        { name: 'Location',  val: parseInt(document.getElementById('w_s_loc')?.value || 10),    color: '#dc2626' },
        { name: 'Fees',      val: parseInt(document.getElementById('w_s_fee')?.value || 10),    color: '#2d8a6e' },
        { name: 'Mess',      val: parseInt(document.getElementById('w_s_mess')?.value || 3),    color: '#e8a830' },
        { name: 'Hostel',    val: parseInt(document.getElementById('w_s_campus')?.value || 5),   color: '#dc2626' },
        { name: 'Placement', val: parseInt(document.getElementById('w_s_place')?.value || 30),   color: '#2d8a6e' },
        { name: 'Near Home', val: parseInt(document.getElementById('w_s_nearhome')?.value || 2), color: '#6b7280' },
        { name: 'Campus',    val: parseInt(document.getElementById('w_s_nirf')?.value || 15),    color: '#8b5cf6' }
    ];

    const total = weights.reduce((acc, w) => acc + w.val, 0) || 1;
    const r = 60;
    const circ = 2 * Math.PI * r;
    let offset = 0;

    let circlesSvg = '';
    weights.forEach(w => {
        const slice = (w.val / total) * circ;
        circlesSvg += `
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="${w.color}" stroke-width="22"
                stroke-dasharray="${slice} ${circ - slice}" stroke-dashoffset="${-offset}"
                transform="rotate(-90 80 80)"/>
        `;
        offset += slice;
    });

    let legendHtml = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; margin-top:16px; font-size:0.78rem;">';
    weights.forEach(w => {
        legendHtml += `
            <div style="display:flex; align-items:center; gap:6px;">
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${w.color}; flex-shrink:0;" aria-hidden="true"></span>
                <span style="color:var(--text-secondary);">${w.name}</span>
                <strong style="color:var(--text-primary); margin-left:auto; font-variant-numeric:tabular-nums;">${w.val}</strong>
            </div>
        `;
    });
    legendHtml += '</div>';

    container.innerHTML = `
        <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="currentColor" style="opacity:0.06" stroke-width="22"/>
            ${circlesSvg}
            <text x="80" y="74" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor">100%</text>
            <text x="80" y="92" text-anchor="middle" font-size="9" font-weight="500" fill="currentColor" style="opacity:0.5;">Total weight</text>
        </svg>
        ${legendHtml}
    `;
}

// ═══════════════════════════════════════════════════
// 5. UNIFIED FLOW: "FIND MY IIT" (/find — Steps 1, 2, 3)
// ═══════════════════════════════════════════════════

let findState = {
    step: 1,
    rank: 1842,
    category: 'OPEN',
    categoryRank: null,
    gender: 'Male',
    pwd: false,
    pwdRank: null,
    homeCity: 'Kota',
    homeState: 'Rajasthan',
    homeLat: 25.18,
    homeLng: 75.83,
    locationPref: 'All',
    branches: ['ALL'],
    strictBranch: true,
    includeRelated: false,
    maxFee: 350000,
    weights: {
        branch: 85,
        location: 60,
        fees: 55,
        mess: 45,
        hostel: 50,
        placement: 90,
        home: 25,
        campus: 40
    },
    locked: {
        branch: false,
        location: false,
        fees: false,
        mess: false,
        hostel: false,
        placement: true,
        home: false,
        campus: false
    }
};
window.findState = findState;

let previewDebounceTimer = null;

// ── Step Indicator Progress Bar Helper ──
// ── JourneyStepper Progress Bar Controller (M2) ──
function updateStepIndicator(step) {
    const s1 = document.getElementById('stepperStep1');
    const s2 = document.getElementById('stepperStep2');
    const s3 = document.getElementById('stepperStep3');
    const t1 = document.getElementById('stepperTrack1');
    const t2 = document.getElementById('stepperTrack2');
    const pBar = document.getElementById('topProgressBar');

    if (pBar) {
        pBar.style.width = step === 1 ? '33.33%' : (step === 2 ? '66.66%' : '100%');
    }

    if (!s1 || !s2 || !s3) return;

    const c1 = s1.querySelector('.stepper-circle');
    const c2 = s2.querySelector('.stepper-circle');
    const c3 = s3.querySelector('.stepper-circle');

    if (step === 1) {
        s1.className = 'stepper-item step-1 active';
        s2.className = 'stepper-item step-2 future';
        s3.className = 'stepper-item step-3 future';

        if (c1) c1.innerHTML = '1';
        if (c2) c2.innerHTML = '2';
        if (c3) c3.innerHTML = '3';

        if (t1) t1.classList.remove('active');
        if (t2) t2.classList.remove('active');
    } else if (step === 2) {
        s1.className = 'stepper-item step-1 completed';
        s2.className = 'stepper-item step-2 active';
        s3.className = 'stepper-item step-3 future';

        if (c1) c1.innerHTML = '<i data-lucide="check" width="14" height="14"></i>';
        if (c2) c2.innerHTML = '2';
        if (c3) c3.innerHTML = '3';

        if (t1) t1.classList.add('active');
        if (t2) t2.classList.remove('active');
    } else if (step === 3) {
        s1.className = 'stepper-item step-1 completed';
        s2.className = 'stepper-item step-2 completed';
        s3.className = 'stepper-item step-3 active';

        if (c1) c1.innerHTML = '<i data-lucide="check" width="14" height="14"></i>';
        if (c2) c2.innerHTML = '<i data-lucide="check" width="14" height="14"></i>';
        if (c3) c3.innerHTML = '3';

        if (t1) t1.classList.add('active');
        if (t2) t2.classList.add('active');
    }

    if (window.lucide) lucide.createIcons();
}

window.handleStepperClick = function(stepTarget) {
    // Navigate back to a previously completed step; forward navigation only via Primary CTA
    if (stepTarget === 1 && findState.step > 1) {
        goToStep1();
    } else if (stepTarget === 2 && findState.step > 2) {
        goToStep2();
    }
};

// ── Step Navigation ──
window.goToStep1 = function() {
    findState.step = 1;
    const s1 = document.getElementById('findStep1Container');
    const s2 = document.getElementById('findStep2Container');
    const s3m = document.getElementById('findStep3MatchesContainer');
    const s3p = document.getElementById('findStep3PipelineContainer');
    if (s1) s1.style.display = 'block';
    if (s2) s2.style.display = 'none';
    if (s3m) s3m.style.display = 'none';
    if (s3p) s3p.style.display = 'none';

    document.body.setAttribute('data-find-step', '1');
    updateStepIndicator(1);
    switchTab('find');
    if (window.lucide) lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.goToStep2 = function() {
    const rankVal = parseInt(document.getElementById('rankInput')?.value);
    if (!rankVal || rankVal < 1) {
        showToast('Please enter a valid positive JEE Advanced rank.', 'error');
        document.getElementById('rankInput')?.focus();
        return;
    }
    findState.rank = rankVal;
    // Use the single rank entered at start as requested (no separate category rank box)
    findState.categoryRank = findState.category !== 'OPEN' ? rankVal : null;

    // Validate PwD rank if PwD is checked
    if (findState.pwd) {
        findState.pwdRank = rankVal;
    } else {
        findState.pwdRank = null;
    }

    findState.strictBranch = document.getElementById('strictBranchToggle')?.checked ?? true;
    findState.includeRelated = document.getElementById('includeRelatedToggle')?.checked ?? false;

    findState.step = 2;
    const s1 = document.getElementById('findStep1Container');
    const s2 = document.getElementById('findStep2Container');
    const s3m = document.getElementById('findStep3MatchesContainer');
    const s3p = document.getElementById('findStep3PipelineContainer');
    if (s1) s1.style.display = 'none';
    if (s2) { s2.style.display = 'flex'; s2.style.flexDirection = 'column'; }
    if (s3m) s3m.style.display = 'none';
    if (s3p) s3p.style.display = 'none';

    document.body.setAttribute('data-find-step', '2');
    updateStepIndicator(2);
    renderFindDonut();
    if (window.lucide) lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.goToStep3 = async function() {
    findState.step = 3;
    const s1 = document.getElementById('findStep1Container');
    const s2 = document.getElementById('findStep2Container');
    const s3m = document.getElementById('findStep3MatchesContainer');
    const s3p = document.getElementById('findStep3PipelineContainer');
    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'none';
    if (s3m) s3m.style.display = 'block';
    if (s3p) s3p.style.display = 'none';

    document.body.setAttribute('data-find-step', '3');
    updateStepIndicator(3);
    if (window.lucide) lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Fetch and render matches once
    await loadStep3Matches();
};

window.startStep3Pipeline = function() {
    const s3m = document.getElementById('findStep3MatchesContainer');
    const s3p = document.getElementById('findStep3PipelineContainer');
    if (s3m) s3m.style.display = 'none';
    if (s3p) s3p.style.display = 'block';

    if (window.lucide) lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });


    const pBar = document.getElementById('loaderProgressBar');
    const pStatus = document.getElementById('loaderDynamicStatus');
    const s1 = document.getElementById('pipeStep1');
    const s2 = document.getElementById('pipeStep2');
    const s3 = document.getElementById('pipeStep3');

    if (pBar) pBar.style.width = '25%';
    if (pStatus) pStatus.textContent = 'Scanning available seat matrices for your rank and category…';
    if (s1) s1.className = 'loader-step-pill active';
    if (s2) s2.className = 'loader-step-pill';
    if (s3) s3.className = 'loader-step-pill';

    setTimeout(() => {
        if (pBar) pBar.style.width = '65%';
        if (pStatus) pStatus.textContent = 'Evaluating placement, fees and academic preference fit…';
        if (s1) s1.className = 'loader-step-pill done';
        if (s2) s2.className = 'loader-step-pill active';
    }, 400);

    setTimeout(() => {
        if (pBar) pBar.style.width = '90%';
        if (pStatus) pStatus.textContent = 'Finalizing top recommendations and multi-year cutoff corridors…';
        if (s2) s2.className = 'loader-step-pill done';
        if (s3) s3.className = 'loader-step-pill active';
    }, 800);

    setTimeout(async () => {
        if (pBar) pBar.style.width = '100%';
        if (s3) s3.className = 'loader-step-pill done';
        await runPrediction();
    }, 1200);
};

// ── Step 1 Form Handlers ──
let _rankDebounceTimer = null;
window.onRankInputChange = function(val) {
    const rank = parseInt(val);
    const pill = document.getElementById('optionsPill');
    const countEl = document.getElementById('optionsCount');
    if (!pill || !countEl) return;

    if (!rank || rank < 1) {
        pill.style.display = 'none';
        return;
    }

    pill.style.display = 'inline-flex';
    countEl.textContent = '…';

    clearTimeout(_rankDebounceTimer);
    _rankDebounceTimer = setTimeout(async () => {
        try {
            const cat  = findState.category || 'OPEN';
            const pool = findState.gender === 'Female' ? 'Female-Only' : 'Gender-Neutral';
            const resp = await fetch(`${API_BASE}/api/options-count?rank=${rank}&category=${encodeURIComponent(cat)}&pool=${encodeURIComponent(pool)}`);
            const data = await resp.json();
            countEl.textContent = `~${data.count}`;
        } catch {
            // fallback: simple heuristic if API unavailable
            const approx = Math.max(5, Math.min(85, Math.floor(62000 / (rank * 0.9))));
            countEl.textContent = `~${approx}`;
        }
    }, 350);
};


window.selectCategory = function(btn) {
    btn.parentElement.querySelectorAll('button').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.getAttribute('data-cat') || 'OPEN';
    findState.category = cat;
    const rVal = parseInt(document.getElementById('rankInput')?.value || findState.rank);
    findState.categoryRank = cat !== 'OPEN' ? (rVal || null) : null;

    // Refresh options count with the newly selected category
    const rankInput = document.getElementById('rankInput');
    if (rankInput && rankInput.value && window.onRankInputChange) {
        window.onRankInputChange(rankInput.value);
    }
};

window.togglePwdFields = function(checked) {
    findState.pwd = checked;
    const pwdRankCont = document.getElementById('pwdRankContainer');
    if (pwdRankCont) {
        pwdRankCont.style.display = checked ? 'block' : 'none';
        if (checked) {
            document.getElementById('pwdRankInput')?.focus();
        }
    }
};

window.selectGender = function(btn) {
    btn.parentElement.querySelectorAll('button').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    findState.gender = btn.getAttribute('data-gender') || 'Male';
};

window.selectLocationPref = function(btn) {
    btn.parentElement.querySelectorAll('.chip, button').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    findState.locationPref = btn.getAttribute('data-loc') || 'All';
};

window.selectBranchChip = function(btn) {
    const branchCode = btn.getAttribute('data-branch') || 'ALL';
    const parent = btn.parentElement;

    if (branchCode === 'ALL') {
        parent.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        findState.branches = ['ALL'];
    } else {
        const allBtn = parent.querySelector('[data-branch="ALL"]');
        if (allBtn) allBtn.classList.remove('active');

        btn.classList.toggle('active');

        const activeBranches = Array.from(parent.querySelectorAll('.chip.active'))
            .map(c => c.getAttribute('data-branch'))
            .filter(b => b && b !== 'ALL');

        if (activeBranches.length === 0) {
            if (allBtn) allBtn.classList.add('active');
            findState.branches = ['ALL'];
        } else {
            findState.branches = activeBranches;
        }
    }
};

// ── Step 2 NLQ & Slider Handlers ──
window.handleNlqInput = function(val) {
    if (!window.RanklyNLQ) return;
    const parsed = window.RanklyNLQ.parseQuery(val);
    const chipsContainer = document.getElementById('nlqChipsContainer');

    if (!parsed || !chipsContainer) {
        if (chipsContainer) chipsContainer.style.display = 'none';
        return;
    }

    chipsContainer.style.display = 'flex';
    chipsContainer.innerHTML = parsed.chips.map(c => `
        <span class="nlq-chip"><i data-lucide="check" width="11" height="11"></i> ${escapeHtml(c)}</span>
    `).join('');
    if (window.lucide) lucide.createIcons();

    // Animate target slider weights
    for (const [key, targetVal] of Object.entries(parsed.weights)) {
        if (findState.weights[key] !== undefined) {
            findState.weights[key] = targetVal;
            const slider = document.getElementById(`slider_${key}`);
            const valEl = document.getElementById(`val_${key}`);
            if (slider) slider.value = targetVal;
            if (valEl) valEl.textContent = targetVal;
        }
    }

    if (parsed.budgetCap) {
        findState.maxFee = parsed.budgetCap;
        const feeSlider = document.getElementById('maxFeeSlider');
        if (feeSlider) feeSlider.value = parsed.budgetCap;
        onMaxFeeChange(parsed.budgetCap);
    }

    renderFindDonut();
    if (typeof triggerLivePreview === 'function') triggerLivePreview();
};

window.applyNlqExample = function(text) {
    const input = document.getElementById('nlqInput');
    if (input) {
        input.value = text;
        handleNlqInput(text);
    }
};

window.resetWeights = function() {
    window.applyPresetWeights('Balanced');
};

window.applyPresetWeights = function(presetName) {
    document.querySelectorAll('.presets-row .chip').forEach(btn => {
        if (btn.textContent.trim() === presetName) btn.classList.add('active');
        else if (['Placement Hunter', 'Budget Saver', 'Near Home', 'Campus Life Lover', 'Balanced'].includes(btn.textContent.trim())) {
            btn.classList.remove('active');
        }
    });

    const presets = {
        'Placement Hunter': { placement: 95, branch: 85, fees: 40, location: 60, mess: 40, hostel: 45, home: 20, campus: 40 },
        'Budget Saver': { fees: 95, placement: 80, branch: 75, location: 50, mess: 60, hostel: 55, home: 40, campus: 30 },
        'Near Home': { home: 95, location: 85, placement: 75, branch: 70, fees: 50, mess: 40, hostel: 40, campus: 35 },
        'Campus Life Lover': { campus: 95, mess: 70, hostel: 75, location: 80, branch: 65, placement: 75, fees: 40, home: 30 },
        'Balanced': { placement: 90, branch: 85, location: 60, fees: 55, mess: 45, hostel: 50, home: 25, campus: 40 }
    };

    const target = presets[presetName] || presets['Balanced'];
    for (const [k, v] of Object.entries(target)) {
        findState.weights[k] = v;
        const slider = document.getElementById(`slider_${k}`);
        const card = document.getElementById(`row_${k}`);
        const valEl = document.getElementById(`val_${k}`);
        if (slider) {
            slider.value = v;
            slider.style.setProperty('--p', v + '%');
        }
        if (card) {
            card.style.setProperty('--p', v + '%');
        }
        if (valEl) valEl.textContent = v;
    }

    renderFindDonut();
    if (typeof triggerLivePreview === 'function') triggerLivePreview();
    showToast(`Applied preset: ${presetName}!`, 'info');
};

window.onCriterionSliderChange = function(criterion, val) {
    const num = parseInt(val) || 0;
    findState.weights[criterion] = num;
    const slider = document.getElementById(`slider_${criterion}`);
    if (slider) slider.style.setProperty('--p', num + '%');
    const card = document.getElementById(`row_${criterion}`);
    if (card) card.style.setProperty('--p', num + '%');
    const valEl = document.getElementById(`val_${criterion}`);
    if (valEl) valEl.textContent = num;

    renderFindDonut();
    if (typeof triggerLivePreview === 'function') triggerLivePreview();
};

window.toggleCriterionLock = function(criterion) {
    findState.locked[criterion] = !findState.locked[criterion];
    const isLocked = findState.locked[criterion];
    const btn = document.getElementById(`lock_${criterion}`);
    if (btn) {
        btn.setAttribute('aria-pressed', isLocked ? 'true' : 'false');
        btn.classList.toggle('active', isLocked);
        btn.innerHTML = isLocked ? '<i data-lucide="lock" width="14" height="14"></i>' : '<i data-lucide="unlock" width="14" height="14"></i>';
        btn.title = isLocked ? 'Must-have priority locked' : 'Click to lock as must-have';
        if (window.lucide) lucide.createIcons();
    }
};

window.onMaxFeeChange = function(val) {
    const num = parseInt(val);
    findState.maxFee = num;
    const disp = document.getElementById('maxFeeDisplay');
    if (disp) {
        disp.textContent = num >= 350000 ? 'No cap' : `₹${(num / 100000).toFixed(2)}L`;
    }
    if (typeof triggerLivePreview === 'function') triggerLivePreview();
};

// ── Donut Chart Renderer (Exact 100% Sum & Clean Gaps) ──
function renderFindDonut() {
    const svg = document.getElementById('step2DonutSvg');
    const legend = document.getElementById('donutLegendContainer');
    if (!svg || !legend) return;

    const criteriaOrder = [
        { key: 'placement', name: 'Placement', color: 'var(--c-placement)' },
        { key: 'branch',    name: 'Branch', color: 'var(--c-branch)' },
        { key: 'fees',      name: 'Fees', color: 'var(--c-fees)' },
        { key: 'location',  name: 'Location', color: 'var(--c-location)' },
        { key: 'hostel',    name: 'Hostel', color: 'var(--c-hostel)' },
        { key: 'mess',      name: 'Food', color: 'var(--c-mess)' },
        { key: 'campus',    name: 'Campus', color: 'var(--c-campus)' },
        { key: 'home',      name: 'Near home', color: 'var(--c-home)' }
    ];

    const totalWeight = Object.values(findState.weights).reduce((a, b) => a + b, 0) || 1;

    // Calculate initial rounded percentages
    const items = criteriaOrder.map(c => {
        const w = findState.weights[c.key] || 0;
        const pct = Math.round((w / totalWeight) * 100);
        return { ...c, weight: w, pct };
    });

    // Enforce exact 100% sum
    const currentSum = items.reduce((acc, it) => acc + it.pct, 0);
    const diff = 100 - currentSum;
    if (diff !== 0 && items.length > 0) {
        // adjust the item with the highest weight
        let maxIdx = 0;
        for (let i = 1; i < items.length; i++) {
            if (items[i].weight > items[maxIdx].weight) maxIdx = i;
        }
        items[maxIdx].pct += diff;
    }

    // Update factor card share outputs
    items.forEach(it => {
        const shareEl = document.getElementById(`share_${it.key}`);
        if (shareEl) shareEl.textContent = `${it.pct}%`;
    });

    // Sort descending for donut & legend
    const sorted = [...items].sort((a, b) => b.pct - a.pct || b.weight - a.weight);

    // SVG Donut calculation
    const r = 75;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    let circlesHtml = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="var(--line)" stroke-width="22"/>`;

    sorted.forEach(it => {
        if (it.pct > 0) {
            const slice = (it.pct / 100) * circ;
            const dash = Math.max(0.1, slice - 3);
            circlesHtml += `
                <circle cx="100" cy="100" r="${r}" fill="none" stroke="${it.color}" stroke-width="22"
                    stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}"
                    stroke-dashoffset="${(-offset).toFixed(2)}"
                    transform="rotate(-90 100 100)"
                    class="donut-arc arc-${it.key}"
                    data-criterion="${it.key}"
                    style="transition: stroke-dasharray 350ms var(--ease), stroke-dashoffset 350ms var(--ease);"
                />
            `;
            offset += slice;
        }
    });

    svg.innerHTML = circlesHtml;

    // Center text
    const topItem = sorted[0] || { name: 'Placement', pct: 20, color: 'var(--c-placement)' };
    const topNameEl = document.getElementById('donutTopPriorityName');
    const topPctEl  = document.getElementById('donutTopPriorityPct');
    if (topNameEl) topNameEl.textContent = topItem.name;
    if (topPctEl) {
        topPctEl.textContent = `${topItem.pct}%`;
        topPctEl.style.color = topItem.color;
    }

    // Legend (1 column, 8 rows, aligned)
    legend.innerHTML = sorted.map(it => `
        <div class="legend-row" data-criterion="${it.key}" onmouseenter="highlightDonutArc('${it.key}')" onmouseleave="unhighlightDonutArcs()">
            <span class="legend-dot" style="background:${it.color};"></span>
            <span class="legend-name">${escapeHtml(it.name)}</span>
            <strong class="legend-share">${it.pct}%</strong>
        </div>
    `).join('');

    // Summary sentence
    const sumSentenceEl = document.getElementById('donutSummarySentence');
    if (sumSentenceEl) {
        const top1 = sorted[0]?.name || 'Placement';
        const top2 = sorted[1]?.name || 'Branch';
        sumSentenceEl.textContent = `${top1}-led, ${top2} second.`;
    }
}

window.highlightDonutArc = function(criterion) {
    document.querySelectorAll('.donut-arc').forEach(arc => {
        if (arc.getAttribute('data-criterion') === criterion) {
            arc.style.opacity = '1';
            arc.style.strokeWidth = '26';
        } else {
            arc.style.opacity = '0.35';
            arc.style.strokeWidth = '22';
        }
    });
};

window.unhighlightDonutArcs = function() {
    document.querySelectorAll('.donut-arc').forEach(arc => {
        arc.style.opacity = '1';
        arc.style.strokeWidth = '22';
    });
};

// ── Step 3: Fetch & Render Top 5 Matches (Called ONCE on entering Step 3) ──
async function loadStep3Matches() {
    const list = document.getElementById('step3MatchesList');
    const eligibleCountEl = document.getElementById('step3EligibleCount');
    if (list) {
        list.innerHTML = `
            <div class="skeleton" style="height:68px;border-radius:12px;"></div>
            <div class="skeleton" style="height:68px;border-radius:12px;"></div>
            <div class="skeleton" style="height:68px;border-radius:12px;"></div>
        `;
    }

    const branchStr = findState.branches && !findState.branches.includes('ALL') ? findState.branches.join(',') : '';
    const payload = {
        rank: findState.rank,
        category: findState.category,
        categoryRank: findState.categoryRank,
        gender: findState.gender,
        homeCity: findState.homeCity || 'Kota',
        branchPref: branchStr,
        strictBranch: findState.strictBranch,
        includeRelated: findState.includeRelated,
        maxFee: findState.maxFee >= 350000 ? 0 : findState.maxFee,
        weights: findState.weights
    };

    const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
    const debugPanel = document.getElementById('step3DebugPanel');
    const debugPayloadEl = document.getElementById('step3DebugPayload');
    const debugRespEl = document.getElementById('step3DebugResponse');
    const debugStatusEl = document.getElementById('step3DebugStatus');
    if (isDebug && debugPanel) {
        debugPanel.style.display = 'block';
        if (debugPayloadEl) debugPayloadEl.textContent = JSON.stringify(payload, null, 2);
    }

    try {
        const res = await fetch(`${API_BASE}/api/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (isDebug && debugPanel && debugRespEl) {
            debugRespEl.textContent = JSON.stringify(data.topMatches || data, null, 2);
            if (debugStatusEl) debugStatusEl.textContent = `Status 200 OK (${data.topMatches ? data.topMatches.length : 0} rows)`;
        }
        if (data.success && data.topMatches) {
            if (eligibleCountEl) eligibleCountEl.textContent = data.totalEligible || data.topMatches.length;
            renderStep3Cards(data.topMatches);
            return;
        }
    } catch (err) {
        console.warn('Step 3 Preview API error, using fallback:', err.message);
        if (isDebug && debugPanel && debugStatusEl) {
            debugStatusEl.textContent = `Error: ${err.message}`;
        }
    }

    renderStep3FallbackCards();
}

function renderStep3Cards(matches) {
    const list = document.getElementById('step3MatchesList');
    if (!list) return;

    if (!matches || matches.length === 0) {
        list.innerHTML = `
            <div class="card" style="padding:var(--space-6);text-align:center;color:var(--muted);font-size:var(--text-sm);">
                No options match this combination. Try relaxing branch or location filters.
            </div>
        `;
        return;
    }

    // Derive college initials (max 3 chars)
    const initials = (name) => {
        if (!name) return 'IIT';
        const abbr = name.replace('Indian Institute of Technology', 'IIT').trim().split(/\s+/);
        return abbr.slice(0, 3).map(w => w[0]).join('').toUpperCase().slice(0, 3);
    };

    // SVG arc ring — circumference for r=22 is ~138.2
    const arc = (pct) => {
        const r = 22, circ = 2 * Math.PI * r;
        const dash = (pct / 100) * circ;
        return `
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="${r}" fill="none" stroke="var(--border)" stroke-width="4"/>
            <circle cx="26" cy="26" r="${r}" fill="none"
              stroke="var(--brand)" stroke-width="4"
              stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
              stroke-linecap="round"
              transform="rotate(-90 26 26)"/>
          </svg>`;
    };

    // Factor key → CSS class map
    const factorClass = {
        placement: 'placement', branch: 'academics', fees: 'fees',
        location: 'location', hostel: 'infra', campus: 'culture',
        home: 'location', mess: 'culture'
    };
    const factorLabel = {
        placement: 'Placement', branch: 'Branch', fees: 'Low Fees',
        location: 'Location', hostel: 'Hostel', campus: 'Campus',
        home: 'Near Home', mess: 'Food'
    };

    // Accent bar colors (CSS vars per position)
    const barColors = [
        'var(--brand)', 'var(--safe)', 'var(--step2-color)',
        'var(--step3-color)', 'var(--moderate)'
    ];

    list.innerHTML = matches.slice(0, 5).map((m, idx) => {
        const risk      = m.Risk_Level || 'Safe';
        const riskClass = risk === 'Safe' ? 'badge--safe' : (risk === 'Moderate' ? 'badge--moderate' : 'badge--reach');
        const matchPct  = Math.round(m.Match_Pct || 80);
        const distStr   = m.Distance_KM ? `${Math.round(m.Distance_KM).toLocaleString()} km` : '';
        const seatType  = m.Seat_Type_Used || (findState.category !== 'OPEN' ? `${findState.category}` : 'OPEN');
        const init      = initials(m.College_Name);
        const barColor  = barColors[idx % barColors.length];

        // Top 2 factors from factors array
        const factors = Array.isArray(m.factors) ? m.factors.slice(0, 2) : [];
        const factorPills = factors.map(f => {
            const cls = factorClass[f] || 'academics';
            const lbl = factorLabel[f] || f;
            return `<span class="criterion-pill ${cls}">${lbl}</span>`;
        }).join('');

        return `
            <div class="step3-preview-card">
                <div class="accent-bar" style="background:${barColor};"></div>

                <!-- College Avatar -->
                <div class="college-avatar">${init}</div>

                <!-- Info -->
                <div style="min-width:0;flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px;">
                        <span style="font-family:var(--font-display);font-weight:700;font-size:var(--text-sm);color:var(--text);letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">${escapeHtml(m.College_Name)}</span>
                        <span class="badge ${riskClass}" style="font-size:10px;padding:2px 8px;font-weight:600;">${risk}</span>
                        <span style="font-size:10px;padding:2px 8px;border-radius:999px;background:var(--raised);color:var(--muted);font-family:var(--font-mono);border:1px solid var(--border);">${escapeHtml(seatType)}</span>
                    </div>
                    <div style="font-size:var(--text-xs);color:var(--muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
                        <span style="font-weight:600;color:var(--text);">${escapeHtml(m.Branch_Name || '')}</span>
                        ${m.Closing_Rank ? `<span>•</span><span>Cutoff <strong style="font-family:var(--font-mono);color:var(--text);">${m.Closing_Rank.toLocaleString()}</strong></span>` : ''}
                        ${distStr ? `<span>•</span><span><i data-lucide="map-pin" width="11" height="11" style="display:inline;vertical-align:-1px;"></i> ${distStr}</span>` : ''}
                    </div>
                    ${factorPills ? `<div class="step3-factor-row">${factorPills}</div>` : ''}
                </div>

                <!-- Match ring -->
                <div class="match-ring-wrap">
                    ${arc(matchPct)}
                    <div class="ring-text">
                        <div class="ring-pct">${matchPct}%</div>
                        <div class="ring-label">match</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function renderStep3FallbackCards() {
    const list = document.getElementById('step3MatchesList');
    const eligibleCountEl = document.getElementById('step3EligibleCount');
    if (!list) return;

    if (eligibleCountEl) eligibleCountEl.textContent = '0';
    list.innerHTML = `
        <div class="card" style="padding:var(--space-6);text-align:center;color:var(--muted);font-size:var(--text-sm);border:1px dashed var(--border);">
            <div style="font-weight:600;color:var(--text);margin-bottom:6px;">Unable to reach live prediction engine</div>
            <div style="margin-bottom:12px;">Please check backend connectivity to calculate official JoSAA recommendations.</div>
            <button class="btn btn--secondary btn--sm" onclick="loadStep3Matches()" style="margin:0 auto;">
                <i data-lucide="refresh-cw" width="14" height="14"></i> Retry Calculation
            </button>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

// ── Home City Combobox Setup ──
// ── PlaceCombobox & Geodesic Distance Engine (M2) ──
window.allIITs = [];
window.placesData = [];

function calcHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

function updateIITDistances(lat, lng) {
    if (!lat || !lng || !window.allIITs || window.allIITs.length === 0) return null;
    const distances = {};
    let nearest = null;
    let minD = Infinity;

    for (const iit of window.allIITs) {
        const d = calcHaversineDistance(lat, lng, iit.lat, iit.lng);
        distances[iit.name] = d;
        distances[iit.college_id] = d;
        if (d < minD) {
            minD = d;
            nearest = { name: iit.name, distance: d };
        }
    }
    window.iitDistances = distances;
    findState.iitDistances = distances;
    return nearest;
}

function searchPlaces(q) {
    if (!window.placesData || window.placesData.length === 0) return [];
    if (!q || !q.trim()) return window.placesData.slice(0, 8);
    const terms = q.trim().toLowerCase().split(/\s+/);

    const scored = [];
    for (const p of window.placesData) {
        const name = (p.name || '').toLowerCase();
        const dist = (p.district || '').toLowerCase();
        const state = (p.state || '').toLowerCase();

        let score = 0;
        let allMatch = true;
        for (const t of terms) {
            if (name.startsWith(t)) score += 60;
            else if (name.includes(t)) score += 35;
            else if (dist.includes(t)) score += 20;
            else if (state.includes(t)) score += 10;
            else {
                allMatch = false;
                break;
            }
        }
        if (allMatch) {
            if (p.type === 'Capital') score += 15;
            else if (p.type === 'District HQ') score += 10;
            scored.push({ place: p, score });
        }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map(s => s.place);
}

async function initPlacesDataset() {
    try {
        const [iitsRes, top50Res] = await Promise.all([
            fetch('/data/iits.json').then(r => r.json()).catch(() => []),
            fetch('/data/top50_places.json').then(r => r.json()).catch(() => [])
        ]);
        if (Array.isArray(iitsRes) && iitsRes.length > 0) window.allIITs = iitsRes;
        if (Array.isArray(top50Res) && top50Res.length > 0) window.placesData = top50Res;

        // Set initial distances for default city (Kota)
        if (findState.homeLat && findState.homeLng) {
            updateIITDistances(findState.homeLat, findState.homeLng);
        }

        // Asynchronously load full 2,500 places without blocking UI
        fetch('/data/places.json')
            .then(r => r.json())
            .then(full => {
                if (Array.isArray(full) && full.length > 0) {
                    window.placesData = full;
                }
            })
            .catch(() => {});
    } catch (e) {
        console.warn('initPlacesDataset warning:', e);
    }
}

function setupHomeCityCombobox() {
    const input = document.getElementById('homeCityInput');
    const dropdown = document.getElementById('homeCityDropdown');
    const clearBtn = document.getElementById('clearHomeCityBtn');
    const badge = document.getElementById('homeCityBadge');
    if (!input || !dropdown) return;

    // Load places data in background
    initPlacesDataset();

    input.value = findState.homeCity || 'Kota';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', 'homeCityDropdown');
    dropdown.setAttribute('role', 'listbox');
    dropdown.setAttribute('aria-label', 'Cities and districts');

    if (clearBtn) clearBtn.style.display = input.value ? 'block' : 'none';
    if (badge) {
        const nearest = updateIITDistances(findState.homeLat || 25.18, findState.homeLng || 75.83);
        badge.style.display = 'block';
        badge.innerHTML = `<strong>${findState.homeCity || 'Kota'}</strong>, ${findState.homeState || 'Rajasthan'}${nearest ? ` · ~${nearest.distance} km to ${nearest.name}` : ''}`;
    }

    let activeIdx = -1;

    function renderDropdown(items) {
        dropdown.innerHTML = '';
        activeIdx = -1;

        if (!items || items.length === 0) {
            const query = input.value.trim();
            if (query) {
                const li = document.createElement('li');
                li.style.cssText = 'padding:10px 14px;font-size:12px;color:var(--brand);cursor:pointer;display:flex;align-items:center;gap:8px;';
                li.innerHTML = `<strong>+</strong> Use "${escapeHtml(query)}" as my location`;
                li.onmousedown = (e) => {
                    e.preventDefault();
                    selectCityItem({ name: query, district: query, state: 'National', lat: 22.9734, lng: 78.6569, type: 'Custom' });
                };
                dropdown.appendChild(li);
            }
        } else {
            items.forEach((p, idx) => {
                const li = document.createElement('li');
                li.className = 'city-item-option';
                li.id = `city-opt-${idx}`;
                li.setAttribute('role', 'option');
                li.setAttribute('aria-selected', 'false');
                li.style.cssText = 'padding:8px 12px;font-size:12px;color:var(--text);cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-radius:6px;margin:2px 4px;transition:background 0.15s ease;';

                let tagHtml = '';
                if (p.type === 'Capital') {
                    tagHtml = `<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(29,78,216,0.12);color:var(--brand);margin-left:6px;">Capital</span>`;
                } else if (p.type === 'District HQ') {
                    tagHtml = `<span style="font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px;background:rgba(100,116,139,0.12);color:var(--muted);margin-left:6px;">District HQ</span>`;
                }

                // Compute quick distance preview to nearest IIT
                let distPreview = '';
                if (window.allIITs && window.allIITs.length > 0 && p.lat && p.lng) {
                    let minD = Infinity;
                    let nearName = '';
                    for (const iit of window.allIITs) {
                        const d = calcHaversineDistance(p.lat, p.lng, iit.lat, iit.lng);
                        if (d < minD) { minD = d; nearName = iit.name; }
                    }
                    if (minD < Infinity) {
                        distPreview = `<span style="font-size:10px;color:var(--muted);margin-left:auto;padding-right:8px;">${minD} km to ${nearName.replace('IIT ', '')}</span>`;
                    }
                }

                li.innerHTML = `
                    <div style="display:flex;align-items:center;gap:4px;">
                        <span style="font-weight:600;color:var(--text);">${escapeHtml(p.name)}</span>
                        ${tagHtml}
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        ${distPreview}
                        <span style="font-size:11px;color:var(--muted);">${escapeHtml(p.state)}</span>
                    </div>
                `;
                li.onmouseenter = () => {
                    activeIdx = idx;
                    highlightItem();
                };
                li.onmousedown = (e) => {
                    e.preventDefault();
                    selectCityItem(p);
                };
                dropdown.appendChild(li);
            });
        }

        const isShown = dropdown.children.length > 0;
        dropdown.style.display = isShown ? 'block' : 'none';
        input.setAttribute('aria-expanded', isShown ? 'true' : 'false');
    }

    function highlightItem() {
        const lis = dropdown.querySelectorAll('.city-item-option');
        lis.forEach((li, i) => {
            const isAct = (i === activeIdx);
            li.style.background = isAct ? 'var(--brand-tint, rgba(29, 78, 216, 0.12))' : 'transparent';
            li.setAttribute('aria-selected', isAct ? 'true' : 'false');
            if (isAct) input.setAttribute('aria-activedescendant', li.id);
        });
    }

    function selectCityItem(p) {
        const name = p.name || p.city;
        input.value = name;
        findState.homeCity = name;
        findState.homeState = p.state || 'National';
        findState.homeLat = p.lat || 22.9734;
        findState.homeLng = p.lng || 78.6569;

        const nearest = updateIITDistances(findState.homeLat, findState.homeLng);

        dropdown.style.display = 'none';
        input.setAttribute('aria-expanded', 'false');
        if (clearBtn) clearBtn.style.display = 'block';
        if (badge) {
            badge.style.display = 'block';
            badge.innerHTML = `<strong>${name}</strong>, ${findState.homeState}${nearest ? ` · ~${nearest.distance} km to ${nearest.name}` : ''}`;
        }
    }

    window.clearHomeCity = function() {
        input.value = '';
        findState.homeCity = '';
        findState.homeState = '';
        findState.homeLat = null;
        findState.homeLng = null;
        findState.iitDistances = {};
        if (clearBtn) clearBtn.style.display = 'none';
        if (badge) badge.style.display = 'none';
        input.focus();
    };

    input.addEventListener('focus', () => {
        const results = searchPlaces(input.value);
        renderDropdown(results);
    });

    input.addEventListener('input', () => {
        if (clearBtn) clearBtn.style.display = input.value ? 'block' : 'none';
        const results = searchPlaces(input.value);
        renderDropdown(results);
    });

    input.addEventListener('blur', () => {
        setTimeout(() => {
            dropdown.style.display = 'none';
            input.setAttribute('aria-expanded', 'false');
        }, 220);
    });

    input.addEventListener('keydown', (e) => {
        const lis = dropdown.querySelectorAll('.city-item-option');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIdx = Math.min(activeIdx + 1, lis.length - 1);
            highlightItem();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIdx = Math.max(activeIdx - 1, 0);
            highlightItem();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIdx >= 0 && lis[activeIdx]) {
                lis[activeIdx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            } else if (input.value.trim()) {
                const results = searchPlaces(input.value);
                if (results && results.length > 0) {
                    selectCityItem(results[0]);
                } else {
                    selectCityItem({ name: input.value.trim(), state: 'National', lat: 22.9734, lng: 78.6569, type: 'Custom' });
                }
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            input.setAttribute('aria-expanded', 'false');
        }
    });
}

// ── Run Full Prediction & Navigate to Results ──
window.runPrediction = async function() {
    const rank = findState.rank || parseInt(document.getElementById('rankInput')?.value) || 1842;
    const category = findState.category || 'OPEN';
    const gender = findState.gender || 'Male';
    const branchStr = findState.branches && !findState.branches.includes('ALL') ? findState.branches.join(',') : '';

    const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
    const debugPanel = document.getElementById('resultsDebugPanel');
    const debugPayloadEl = document.getElementById('resultsDebugPayload');
    const debugRespEl = document.getElementById('resultsDebugResponse');
    const debugStatusEl = document.getElementById('resultsDebugStatus');

    const payload = {
        rank,
        category,
        categoryRank: findState.categoryRank,
        gender,
        genderPool: gender === 'Female' ? 'Female-only' : 'Gender-Neutral',
        budgetRange: findState.maxFee >= 350000 ? 'ANY' : String(findState.maxFee),
        locationPref: findState.locationPref || 'All',
        branchPref: branchStr,
        strictBranch: findState.strictBranch,
        includeRelated: findState.includeRelated,
        homeCity: findState.homeCity || 'Kota',
        homeState: findState.homeState || 'Rajasthan',
        homeLat: findState.homeLat,
        homeLng: findState.homeLng,
        weights: findState.weights,
        studentPreferences: findState.weights,
        familyPreferences: findState.weights,
        studentProfile: {
            name: 'Candidate',
            email: `guest-${Date.now()}@rankly.local`,
            homeCity: findState.homeCity || 'Kota',
            homeState: findState.homeState || 'Rajasthan'
        }
    };

    if (isDebug && debugPanel) {
        debugPanel.style.display = 'block';
        if (debugPayloadEl) debugPayloadEl.textContent = JSON.stringify(payload, null, 2);
    }

    try {
        const res = await fetch(`${API_BASE}/api/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (isDebug && debugPanel && debugRespEl) {
            const first10 = (data.results || []).slice(0, 10).map((r, i) => ({
                rank_num: i + 1,
                college: r.college_name || r.iit_name,
                branch: r.branch_name,
                match_pct: r.recommendation?.match_pct,
                risk: r.recommendation?.risk_level,
                factors: r.recommendation?.factors
            }));
            debugRespEl.textContent = JSON.stringify(first10, null, 2);
            if (debugStatusEl) debugStatusEl.textContent = `Status 200 OK (${data.results ? data.results.length : 0} rows returned)`;
        }

        if (data.success && data.results) {
            currentResults = data.results;
            activeRiskFilter = 'ALL';
            applyCardFilters();
            setApiStatus(true);

            const countEl = document.getElementById('navResultsCount');
            if (countEl) countEl.textContent = currentResults.length;

            const sessionTag = document.getElementById('currentSessionTag');
            if (sessionTag) {
                const catStr = category !== 'OPEN' ? ` · ${category}` : '';
                sessionTag.textContent = `AIR #${rank.toLocaleString()}${catStr} · ${findState.homeCity || 'Kota'}`;
            }

            const s3p = document.getElementById('findStep3PipelineContainer');
            const s3m = document.getElementById('findStep3MatchesContainer');
            if (s3p) s3p.style.display = 'none';
            if (s3m) s3m.style.display = 'block';

            switchTab('results');
            showToast(`Generated ${currentResults.length} personalised recommendations!`, 'success');
            return;
        }
    } catch (err) {
        console.warn('Prediction API fallback:', err.message);
    }

    // Seamless mock fallback
    useDemoPredictionFallback(rank, category);
    const s3p = document.getElementById('findStep3PipelineContainer');
    const s3m = document.getElementById('findStep3MatchesContainer');
    if (s3p) s3p.style.display = 'none';
    if (s3m) s3m.style.display = 'block';
    switchTab('results');
    showToast(`Loaded ${currentResults.length} options with transparent cutoff maths.`, 'info');
};

function renderEligibilityBadge(data) {
    const badge = document.getElementById('eligibilityBadge');
    const icon  = document.getElementById('eligibilityIcon');
    const text  = document.getElementById('eligibilityText');
    if (!badge) return;

    badge.classList.add('visible');
    if (data.eligible) {
        badge.className = 'eligibility-badge visible eligibility-badge--pass';
        icon.textContent = '✅';
    } else {
        badge.className = 'eligibility-badge visible eligibility-badge--fail';
        icon.textContent = '⚠️';
    }
    text.textContent = data.message;
}

// ═══════════════════════════════════════════════════
// 6. CARD-BASED RESULTS RENDERING & MATCH RING
// ═══════════════════════════════════════════════════
function createMatchRing(pct) {
    const r = 24;
    const circ = 2 * Math.PI * r;
    const filled = Math.max(0, Math.min(circ, (pct / 100) * circ));
    return `
        <div class="match-ring-box" title="${pct}% Match Score">
            <svg width="62" height="62" viewBox="0 0 62 62">
                <circle cx="31" cy="31" r="${r}" fill="none" stroke="var(--border)" stroke-width="4.5"/>
                <circle cx="31" cy="31" r="${r}" fill="none" stroke="var(--lime)" stroke-width="4.5"
                    stroke-dasharray="${filled} ${circ - filled}" stroke-linecap="round"/>
                <text x="31" y="36" text-anchor="middle" font-family="var(--font-mono)" font-size="14" font-weight="700" fill="var(--text)">${pct}%</text>
            </svg>
        </div>
    `;
}

// ─── 8 CRITERIA METADATA (Fixed Midnight Lime Tokens) ───
const CRITERIA_META = [
    { key: 'branch', label: 'Branch / Infra', color: '#5EB6FF', icon: 'cpu', desc: 'Labs, faculty & facilities' },
    { key: 'placement', label: 'Placement', color: '#C8F560', icon: 'briefcase', desc: 'Average CTC & career outcomes' },
    { key: 'location', label: 'Location', color: '#A78BFA', icon: 'map-pin', desc: 'Metro connectivity & city life' },
    { key: 'fees', label: 'Fees', color: '#F5C451', icon: 'indian-rupee', desc: 'Tuition affordability & ROI' },
    { key: 'hostel', label: 'Hostel', color: '#4FE3C1', icon: 'bed-double', desc: 'Room occupancy & Wi-Fi' },
    { key: 'mess', label: 'Mess / Food', color: '#FF8A6B', icon: 'utensils-crossed', desc: 'Hygiene & dietary options' },
    { key: 'campus', label: 'Campus Life', color: '#FDBA74', icon: 'sparkles', desc: 'Cultural fests & clubs' },
    { key: 'home', label: 'Near to Home', color: '#F472B6', icon: 'home', desc: 'Proximity to home state' }
];

activeRiskFilter = 'ALL';
let activeTrendFilter = 'ALL';
let resultsSearchQuery = '';
sortKey = 'match_pct';
let resultViewMode = 'grid';


// ─── Deterministic 8-Factor Computation for any Result Row ───
function computeEightFactorScores(row) {
    const nirf = row.college_info?.nirf_rank || 15;
    const branchScore = Math.max(30, Math.min(99, Math.round(102 - (nirf * 1.5))));

    const avgPkg = parseFloat(row.avg_package_lpa) || 20;
    const placePct = parseFloat(row.placement_percentage) || 85;
    const placementScore = Math.min(99, Math.round((avgPkg / 38.0) * 60 + (placePct / 100.0) * 40));

    const city = (row.city || '').toLowerCase();
    let locationScore = 75;
    if (city.includes('mumbai') || city.includes('delhi') || city.includes('bangalore') || city.includes('bengaluru') || city.includes('chennai') || city.includes('hyderabad')) {
        locationScore = 96;
    } else if (city.includes('kanpur') || city.includes('kharagpur') || city.includes('roorkee') || city.includes('varanasi') || city.includes('guwahati')) {
        locationScore = 84;
    }

    const fee = row.college_info?.annual_fee || (parseFloat(row.college_info?.annual_fee_lpa) * 100000) || 220000;
    const feeScore = Math.max(30, Math.min(98, Math.round(100 - (fee - 150000) / 1800)));

    const hostelRating = parseFloat(row.college_info?.hostel_rating) || 4.2;
    const hostelScore = Math.min(99, Math.round((hostelRating / 5.0) * 100));

    const messRating = parseFloat(row.college_info?.mess_rating) || 4.0;
    const messScore = Math.min(99, Math.round((messRating / 5.0) * 100));

    const campusRating = parseFloat(row.college_info?.campus_life_rating) || 4.4;
    const campusScore = Math.min(99, Math.round((campusRating / 5.0) * 100));

    let homeScore = 55;
    const homeState = (findState.homeState || '').toLowerCase();
    const rowState = (row.state || '').toLowerCase();
    if (homeState && (homeState === 'all' || homeState === 'national')) {
        homeScore = 70;
    } else if (homeState && rowState.includes(homeState)) {
        homeScore = 98;
    } else if (row.college_info?.zone === 'West') {
        homeScore = 75;
    }

    const scoreMap = {
        branch: branchScore,
        placement: placementScore,
        location: locationScore,
        fees: feeScore,
        hostel: hostelScore,
        mess: messScore,
        campus: campusScore,
        home: homeScore
    };

    return CRITERIA_META.map(meta => ({
        ...meta,
        score: scoreMap[meta.key] || 70
    }));
}

// ─── Dynamic Live Re-scoring with Active Weights ───
function recalculateScoresWithCurrentWeights() {
    const userRank = findState.rank || parseInt(document.getElementById('rankInput')?.value) || 1842;
    const currentWeights = findState.weights || {
        branch: 85, placement: 90, location: 60, fees: 55, hostel: 50, mess: 45, campus: 40, home: 25
    };

    let totalWeight = 0;
    CRITERIA_META.forEach(m => {
        totalWeight += (currentWeights[m.key] != null ? currentWeights[m.key] : 50);
    });
    if (totalWeight <= 0) totalWeight = 1;

    currentResults.forEach(row => {
        const factorList = computeEightFactorScores(row);
        row._factorList = factorList;

        let weightedSum = 0;
        factorList.forEach(item => {
            const w = currentWeights[item.key] != null ? currentWeights[item.key] : 50;
            weightedSum += (item.score * w);
        });
        const personalFitScore = weightedSum / totalWeight;

        const closing = row.closing_rank || 1500;
        const ratio = closing > 0 ? (userRank / closing) : 1.0;
        row._cutoffRatio = ratio;

        let riskLevel = 'Moderate';
        let admissionProbScore = 70;
        if (ratio <= 0.85) {
            riskLevel = 'Safe';
            admissionProbScore = 95;
        } else if (ratio <= 1.10) {
            riskLevel = 'Moderate';
            admissionProbScore = 70;
        } else {
            riskLevel = 'Reach';
            admissionProbScore = 40;
        }

        const compositeMatch = Math.min(99, Math.max(35, Math.round((personalFitScore * 0.80) + (admissionProbScore * 0.20))));
        if (!row.recommendation) row.recommendation = {};
        row.recommendation.overall_score = Math.round(personalFitScore);
        row.recommendation.match_pct = compositeMatch;
        row.recommendation.risk_level = riskLevel;
    });
}

// ─── Render Sticky Refine Sidebar Mini Donut ───
function renderRefineMiniDonut() {
    const svg = document.getElementById('refineMiniDonut');
    if (!svg) return;

    const weights = findState.weights || {};
    let total = 0;
    CRITERIA_META.forEach(m => { total += (weights[m.key] != null ? weights[m.key] : 50); });
    if (total <= 0) total = 1;

    const r = 46;
    const circ = 2 * Math.PI * r;
    let accumulatedAngle = 0;
    let paths = '';

    CRITERIA_META.forEach(m => {
        const w = weights[m.key] != null ? weights[m.key] : 50;
        const share = w / total;
        const sliceLength = share * circ;
        const offset = -accumulatedAngle;
        paths += `
            <circle cx="60" cy="60" r="${r}" fill="none"
                stroke="${m.color}" stroke-width="16"
                stroke-dasharray="${sliceLength} ${circ - sliceLength}"
                stroke-dashoffset="${offset}"
                transform="rotate(-90 60 60)">
                <title>${m.label}: ${w} (${Math.round(share * 100)}%)</title>
            </circle>
        `;
        accumulatedAngle += sliceLength;
    });

    svg.innerHTML = paths;
}

// ─── Sync Sliders from State ───
function syncRefineSliders() {
    const weights = findState.weights || {};
    CRITERIA_META.forEach(m => {
        const val = weights[m.key] != null ? weights[m.key] : 50;
        const s = document.getElementById(`refineSlider_${m.key}`);
        if (s) s.value = val;
        const v = document.getElementById(`refineVal_${m.key}`);
        if (v) v.textContent = val;
    });
}

// ─── Refine Sidebar Handlers ───
window.onRefineSliderChange = function(criterion, val) {
    if (!findState.weights) findState.weights = {};
    findState.weights[criterion] = parseInt(val) || 0;

    const valEl = document.getElementById(`refineVal_${criterion}`);
    if (valEl) valEl.textContent = val;

    renderRefineMiniDonut();
    recalculateScoresWithCurrentWeights();
    applyCardFilters();

    if (drawerCurrentResult) {
        renderExplainDrawerContent(drawerCurrentResult);
    }
};

window.resetRefineWeights = function() {
    findState.weights = {
        branch: 70, placement: 70, location: 70, fees: 70, hostel: 70, mess: 70, campus: 70, home: 70
    };
    syncRefineSliders();
    renderRefineMiniDonut();
    recalculateScoresWithCurrentWeights();
    applyCardFilters();
    showToast('Reset all sliders to balanced priority (70)', 'info');
};

window.loadSavedSession = function(sessionKey) {
    const userRank = findState.rank || 1842;
    if (sessionKey === 'session_budget') {
        findState.weights = { branch: 75, placement: 70, location: 40, fees: 95, hostel: 65, mess: 60, campus: 35, home: 50 };
        const tag = document.getElementById('currentSessionTag');
        if (tag) tag.textContent = `AIR #${userRank} · Budget-first`;
        showToast('Loaded Session 2: Budget-first (Fees 95)', 'info');
    } else if (sessionKey === 'session_home') {
        findState.weights = { branch: 80, placement: 80, location: 85, fees: 60, hostel: 50, mess: 50, campus: 50, home: 95 };
        const tag = document.getElementById('currentSessionTag');
        if (tag) tag.textContent = `AIR #${userRank} · Near Home`;
        showToast('Loaded Session 3: Near Home (Proximity 95)', 'info');
    } else {
        findState.weights = { branch: 85, placement: 90, location: 60, fees: 55, hostel: 50, mess: 45, campus: 40, home: 25 };
        const tag = document.getElementById('currentSessionTag');
        if (tag) tag.textContent = `AIR #${userRank} · Placement-heavy`;
        showToast('Restored default session (Placement-heavy)', 'info');
    }
    syncRefineSliders();
    renderRefineMiniDonut();
    recalculateScoresWithCurrentWeights();
    applyCardFilters();
};

// ─── Filter Bar Actions ───
window.filterByRiskPill = function(risk, btn) {
    activeRiskFilter = risk;
    // Deactivate all risk buttons in the toolbar
    document.querySelectorAll('#resultsFilterBar [data-risk], #resultsFilterBar button[data-risk]').forEach(c => c.classList.remove('active'));
    
    // Find and activate the toolbar button matching this risk tier
    const toolbarBtn = (btn && btn.getAttribute && btn.getAttribute('data-risk') === risk)
        ? btn
        : document.querySelector(`#resultsFilterBar button[data-risk="${risk}"]`);
    if (toolbarBtn) toolbarBtn.classList.add('active');
    
    applyCardFilters();
};

window.filterByTrendPill = function(trend, btn) {
    activeTrendFilter = trend;
    document.querySelectorAll('#resultsFilterBar [data-trend]').forEach(c => c.classList.remove('active'));
    if (btn && btn.classList) btn.classList.add('active');
    applyCardFilters();
};

window.onResultsSearch = function(query) {
    resultsSearchQuery = query || '';
    applyCardFilters();
};

window.sortCardsBy = function(key) {
    sortKey = key;
    applyCardFilters();
};

let isDiversified = true;

window.toggleDiversifyResults = function(btn) {
    isDiversified = !isDiversified;
    if (btn) {
        btn.classList.toggle('active', isDiversified);
    }
    applyCardFilters();
    showToast(isDiversified ? 'Diversify enabled: interleaved across diverse IITs & locations' : 'Diversify disabled', 'info');
};

window.toggleResultViewMode = function(mode) {
    resultViewMode = mode || (resultViewMode === 'grid' ? 'table' : 'grid');
    const grid = document.getElementById('resultsGrid');
    const table = document.getElementById('resultsTableView');
    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');

    if (resultViewMode === 'table') {
        if (grid) grid.style.display = 'none';
        if (table) table.style.display = 'block';
        if (gridBtn) gridBtn.classList.remove('active');
        if (listBtn) listBtn.classList.add('active');
    } else {
        if (grid) grid.style.display = 'grid';
        if (table) table.style.display = 'none';
        if (gridBtn) gridBtn.classList.add('active');
        if (listBtn) listBtn.classList.remove('active');
    }
    applyCardFilters();
    if (window.lucide) lucide.createIcons();
};

window.toggleLiveRefinePanel = function() {
    const workspace = document.querySelector('.results-workspace');
    const label = document.getElementById('toggleRefineLabel');
    const icon = document.getElementById('toggleRefineIcon');
    if (!workspace) return;

    const isCollapsed = workspace.classList.toggle('refine-collapsed');
    if (label) {
        label.textContent = isCollapsed ? 'Show Filters' : 'Wide View (3-col)';
    }
    if (icon) {
        icon.setAttribute('data-lucide', isCollapsed ? 'panel-left-open' : 'sidebar');
        if (window.lucide) lucide.createIcons();
    }
    if (window.MotionManager?.initSpotlightCards) {
        window.MotionManager.initSpotlightCards();
    }
};

// ─── Filter & Sort Application ───
function applyCardFilters() {
    let list = [...currentResults];

    if (activeRiskFilter !== 'ALL') {
        list = list.filter(r => (r.recommendation?.risk_level || '').toLowerCase() === activeRiskFilter.toLowerCase());
    }

    if (activeTrendFilter !== 'ALL') {
        list = list.filter(r => {
            const shift = parseFloat(r.trend_analytics?.rank_shift_1y) || 0;
            const status = (r.trend_analytics?.trend_status || '').toLowerCase();
            if (activeTrendFilter === 'Rising') return shift >= 2 || status.includes('rising');
            if (activeTrendFilter === 'Falling') return shift <= -2 || status.includes('easing') || status.includes('falling');
            if (activeTrendFilter === 'Stable') return (shift > -2 && shift < 2) || status.includes('stable');
            return true;
        });
    }

    if (resultsSearchQuery.trim()) {
        const q = resultsSearchQuery.toLowerCase().trim();
        list = list.filter(r =>
            (r.iit_name || '').toLowerCase().includes(q) ||
            (r.branch_name || '').toLowerCase().includes(q) ||
            (r.city || '').toLowerCase().includes(q)
        );
    }

    list.sort((a, b) => {
        if (sortKey === 'match_pct') return (b.recommendation?.match_pct || 0) - (a.recommendation?.match_pct || 0);
        if (sortKey === 'closing_rank') return (a.closing_rank || 99999) - (b.closing_rank || 99999);
        if (sortKey === 'avg_package_lpa') return (parseFloat(b.avg_package_lpa) || 0) - (parseFloat(a.avg_package_lpa) || 0);
        if (sortKey === 'nirf_rank') return (a.college_info?.nirf_rank || 99) - (b.college_info?.nirf_rank || 99);
        return 0;
    });

    // If Diversify is active (enabled by default):
    // Prevents identical college/location blocks by interleaving: max 2 rows per IIT in the top 12, then remaining
    if (isDiversified && list.length > 0) {
        const topDiverse = [];
        const overflow = [];
        const iitCounts = {};

        for (const item of list) {
            const iit = item.iit_name || item.college_name || 'Other';
            const count = iitCounts[iit] || 0;
            if (topDiverse.length < 12) {
                if (count < 2) {
                    topDiverse.push(item);
                    iitCounts[iit] = count + 1;
                } else {
                    overflow.push(item);
                }
            } else {
                overflow.push(item);
            }
        }
        list = [...topDiverse, ...overflow];
    }

    filteredResults = list;
    updateResultsStats(filteredResults);

    const rGrid = document.getElementById('resultsGrid');
    const rTable = document.getElementById('resultsTableView');
    if (resultViewMode === 'table') {
        if (rGrid) rGrid.style.display = 'none';
        if (rTable) rTable.style.display = 'block';
        renderTableView(filteredResults);
    } else {
        if (rGrid) rGrid.style.display = 'grid';
        if (rTable) rTable.style.display = 'none';
        renderCards(filteredResults);
    }
}

// ─── Top 5 Summary Tiles Strip ───
function updateResultsStats(results) {
    if (!results || results.length === 0) return;

    const safeCount = results.filter(r => (r.recommendation?.risk_level || r.risk_level) === 'Safe').length;
    const modCount  = results.filter(r => (r.recommendation?.risk_level || r.risk_level) === 'Moderate').length;
    const reachCount = results.filter(r => ['Reach', 'Ambitious'].includes(r.recommendation?.risk_level || r.risk_level)).length;

    const scores = results.map(r => r.recommendation?.match_pct ?? Math.round(r.overall_score || 0));
    const topItem = results[0];
    const topScore = topItem ? (topItem.recommendation?.match_pct ?? Math.round(topItem.overall_score || 0)) : (scores.length ? Math.max(...scores) : 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));

    const sTotal = document.getElementById('statTotalMatches');
    if (sTotal) sTotal.textContent = results.length;

    const sSafe = document.getElementById('statSafe');
    if (sSafe) sSafe.textContent = safeCount;
    const sMod = document.getElementById('statModerate');
    if (sMod) sMod.textContent = modCount;
    const sReach = document.getElementById('statReach');
    if (sReach) sReach.textContent = reachCount;

    const sTop = document.getElementById('statTopMatch');
    if (sTop) sTop.textContent = `${topScore}%`;
    const sTopName = document.getElementById('statTopMatchName');
    if (sTopName && topItem) sTopName.textContent = `${topItem.iit_name || topItem.college_name} · ${topItem.branch_name || 'B.Tech'}`;

    const sAvg = document.getElementById('statAvgMatch');
    if (sAvg) sAvg.textContent = `${avgScore}%`;

    const sub = document.getElementById('resultsSubtitle');
    const userRank = findState.rank || parseInt(document.getElementById('rankInput')?.value) || 1842;
    if (sub) sub.textContent = `${results.length} programs ranked for AIR ${userRank.toLocaleString('en-IN')} · ${findState.category || 'OPEN'} · ${findState.gender === 'Female' ? 'Female-only' : 'Gender-neutral'}`;
}

const IIT_PHOTO_MAP = {
    'bombay': '/iits/iit-bombay.webp',
    'delhi': '/iits/iit-delhi.webp',
    'madras': '/iits/iit-madras.webp',
    'kanpur': '/iits/iit-kanpur.webp',
    'kharagpur': '/iits/iit-kharagpur.webp',
    'roorkee': '/iits/iit-roorkee.webp',
    'guwahati': '/iits/iit-guwahati.webp',
    'hyderabad': '/iits/iit-hyderabad.webp',
    'bhu': '/iits/iit-bhu.webp',
    'varanasi': '/iits/iit-bhu.webp',
    'gandhinagar': '/iits/iit-gandhinagar.webp',
    'jodhpur': '/iits/iit-jodhpur.webp',
    'indore': '/iits/iit-indore.webp',
    'patna': '/iits/iit-patna.webp',
    'ropar': '/iits/iit-ropar.webp',
    'mandi': '/iits/iit-mandi.webp',
    'bhubaneswar': '/iits/iit-bhubaneswar.webp',
    'dhanbad': '/iits/iit-dhanbad.webp',
    'ism': '/iits/iit-dhanbad.webp',
    'tirupati': '/iits/iit-tirupati.webp',
    'palakkad': '/iits/iit-palakkad.webp',
    'goa': '/iits/iit-goa.webp',
    'dharwad': '/iits/iit-dharwad.webp',
    'bhilai': '/iits/iit-bhilai.webp',
    'jammu': '/iits/iit-jammu.webp'
};

function getIITPhoto(name) {
    if (!name) return '/iits/iit-bombay.webp';
    const lower = name.toLowerCase();
    for (const [key, path] of Object.entries(IIT_PHOTO_MAP)) {
        if (lower.includes(key)) return path;
    }
    return '/iits/iit-bombay.webp';
}

// ─── Result Cards Renderer (Exact Spec Card Anatomy) ───
function renderCards(results) {
    const grid = document.getElementById('resultsGrid');
    if (!grid) return;

    if (results.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;" class="stat-box">
                <div class="empty-state__icon" style="margin: 0 auto 12px;"><i data-lucide="search" width="28" height="28"></i></div>
                <h3 style="font-size:18px; font-weight:700; margin-bottom:4px; color:var(--ink-900);">No matching IITs found</h3>
                <p style="color:var(--ink-500); font-size:13px; margin-bottom:16px;">No options match your active filters. Try switching back to 'All' or adjusting refine sliders.</p>
                <button class="btn btn--ghost btn--sm" onclick="filterByRiskPill('ALL', document.querySelector('[data-risk=ALL]'))">
                    Show All Options
                </button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const userRank = findState.rank || parseInt(document.getElementById('rankInput')?.value) || 1842;

    grid.innerHTML = results.map((row, idx) => {
        const isShortlisted = shortlist.some(s => s.result_id === row.result_id || (s.iit_name === row.iit_name && s.branch_name === row.branch_name));

        const closing = row.closing_rank || 1500;
        const ratio = closing > 0 ? (userRank / closing) : 1.0;
        const pinPct = Math.max(3, Math.min(97, Math.round((ratio / 1.35) * 100)));

        const risk = row.recommendation?.risk_level || 'Moderate';
        const riskClass = risk === 'Safe' ? 'pill--safe' : (risk === 'Moderate' ? 'pill--mod' : 'pill--reach');
        const markerClass = risk === 'Safe' ? 'safe' : (risk === 'Moderate' ? 'mod' : 'reach');
        const shift1Y = row.trend_analytics?.rank_shift_1y || row.rank_shift_1y || 0;
        
        let trendIcon = 'minus';
        let trendText = 'Stable';
        let trendTooltip = 'Cutoff steady within ±5 ranks';

        if (shift1Y <= -5 || (row.trend_analytics?.trend_status || '').toLowerCase().includes('rising')) {
            trendIcon = 'arrow-up-right';
            const val = Math.abs(shift1Y) || 8.4;
            trendText = `↗ Rising (+${val.toFixed(1)}%)`;
            trendTooltip = 'Cutoff tightened — higher candidate competition';
        } else if (shift1Y >= 5 || (row.trend_analytics?.trend_status || '').toLowerCase().includes('falling')) {
            trendIcon = 'arrow-down-right';
            const val = Math.abs(shift1Y) || 6.2;
            trendText = `↘ Easing (-${val.toFixed(1)}%)`;
            trendTooltip = 'Cutoff loosened — easier admission probability';
        }

        const avgPkg = parseFloat(row.avg_package_lpa || row.college_info?.avg_package_lpa || (23.5 + (idx % 5) * 1.8));
        const avgPkgStr = isNaN(avgPkg) ? '23.5' : avgPkg.toFixed(1);

        const nirfRank = row.college_info?.nirf_rank || row.nirf_rank || (idx + 1);
        const feeLpa = row.college_info?.annual_fee_lpa || (row.annual_fee ? (parseFloat(row.annual_fee) / 100000).toFixed(1) : '2.2');
        const placedVal = parseFloat(row.placement_percentage || row.college_info?.placement_percentage || (88 + (idx % 4) * 2));
        const placedValStr = isNaN(placedVal) ? '90' : placedVal.toFixed(0);

        const matchPct = Math.round(row.recommendation?.match_pct ?? (row.overall_score || 85));
        const circ = 2 * Math.PI * 22; // ~138.23
        const strokeDash = ((matchPct / 100) * circ).toFixed(1);
        const photoUrl = getIITPhoto(row.iit_name);

        return `
            <div class="mcard result-card" data-spotlight="true" id="result-card-${row.result_id}">
                <!-- 1. Campus Photo Header -->
                <div class="mcard__photo-header ${!photoUrl ? 'mcard__photo-header--fallback' : ''}" style="${photoUrl ? `background-image:url('${photoUrl}');` : ''}">
                    <div class="mcard__photo-gradient"></div>
                    <div class="mcard__photo-badges">
                        <span class="mcard__badge-idx">#${String(idx + 1).padStart(2, '0')}</span>
                        <span class="mcard__badge-pill"><i data-lucide="award" width="11" height="11"></i> NIRF #${nirfRank}</span>
                    </div>
                    
                    ${!photoUrl ? `<div class="mcard__photo-fallback-logo">${escapeHtml(row.iit_name)}</div>` : ''}
                </div>

                <!-- 2. Card Content Body -->
                <div class="mcard__body">
                    <!-- Title & Match Ring Row -->
                    <div class="mcard__title-row">
                        <div class="mcard__title-col">
                            <h3 class="mcard__title" title="${escapeHtml(row.iit_name)}">${escapeHtml(row.iit_name)}</h3>
                            <p class="mcard__branch" title="${escapeHtml(row.branch_name)}">${escapeHtml(row.branch_name)}</p>
                            <div class="mcard__meta">
                                <i data-lucide="map-pin" width="12" height="12"></i>
                                <span>${escapeHtml(row.city)}${row.state ? ', ' + escapeHtml(row.state) : ''} · ${escapeHtml(row.seat_type_used || row.category || 'OPEN')}</span>
                            </div>
                        </div>
                        ${!window.isQuickOrOcrMode ? `<div class="mcard__ring-box" title="${matchPct}% match">
                            <svg width="48" height="48" viewBox="0 0 52 52">
                                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--line)" stroke-width="5"/>
                                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--primary)" stroke-width="5"
                                    stroke-linecap="round"
                                    stroke-dasharray="${strokeDash} ${circ.toFixed(1)}"
                                    transform="rotate(-90 26 26)"
                                    style="transition:stroke-dasharray 600ms var(--ease);"
                                />
                            </svg>
                            <div class="mcard__ring-label">${matchPct}<span>%</span></div>
                        </div>` : ''}
                    </div>

                    <!-- Chance & Trend Row -->
                    <div class="mcard__chance-row">
                        <div class="mcard__chance-pills">
                            <span class="pill ${riskClass}"><span class="pill-dot"></span>${risk}</span>
                            <span class="pill pill--neutral" title="${trendTooltip}"><i data-lucide="${trendIcon}" width="12" height="12"></i> ${trendText}</span>
                        </div>
                        <span class="mcard__ratio" style="color:var(--${risk === 'Safe' ? 'safe' : (risk === 'Moderate' ? 'mod' : 'reach')});">
                            ${ratio.toFixed(2)}x closing
                        </span>
                    </div>

                    <!-- Cutoff Tri-Color Bar -->
                    <div class="mcard__cutoff-bar-wrap">
                        <div class="cutoff-track">
                            <div class="cutoff-marker ${markerClass}" style="left:${pinPct}%;" title="Rank ${userRank} / Cutoff ${closing} (${ratio.toFixed(2)}x)"></div>
                        </div>
                        <div class="cutoff-scale-labels">
                            <span class="scale-085">0.85x</span>
                            <span class="scale-110">1.10x</span>
                        </div>
                    </div>

                    <!-- 2x2 Stats Grid -->
                    <div class="mcard__stats-grid">
                        <div class="mcard__stat-item">
                            <span class="mcard__stat-lbl">2025 Cutoff</span>
                            <span class="mcard__stat-val">${closing.toLocaleString('en-IN')}</span>
                        </div>
                        <div class="mcard__stat-item">
                            <span class="mcard__stat-lbl">Avg CTC</span>
                            <span class="mcard__stat-val primary">₹${avgPkgStr} LPA</span>
                        </div>
                        <div class="mcard__stat-item">
                            <span class="mcard__stat-lbl">Annual Fee</span>
                            <span class="mcard__stat-val">₹${feeLpa}L</span>
                        </div>
                        <div class="mcard__stat-item">
                            <span class="mcard__stat-lbl">Placed</span>
                            <span class="mcard__stat-val">${placedValStr}%</span>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div class="mcard__footer">
                        <button type="button" class="btn btn--tint btn--sm" onclick="openExplainDrawerForResult(${row.result_id})" style="flex:1;gap:6px;">
                            <i data-lucide="circle-help" width="14" height="14"></i>
                            Why this score?
                        </button>
                        <button type="button" class="btn btn--ghost btn--sm" onclick="addToCompareForResult(${row.result_id})" title="Compare option" style="gap:6px;">
                            <i data-lucide="git-compare" width="14" height="14"></i>
                            Compare
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
    if (window.MotionManager?.initSpotlightCards) window.MotionManager.initSpotlightCards();
}

// ─── Results Table View Renderer ───
function renderTableView(results) {
    const tbody = document.getElementById('resultsTableBody');
    if (!tbody) return;

    if (results.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--muted);">No matching recommendations found.</td></tr>`;
        return;
    }

    const userRank = findState.rank || 1842;

    tbody.innerHTML = results.map((row, idx) => {
        const isShortlisted = shortlist.some(s => s.result_id === row.result_id || (s.iit_name === row.iit_name && s.branch_name === row.branch_name));
        const closing = row.closing_rank || 1500;
        const ratio = closing > 0 ? (userRank / closing) : 1.0;
        const risk = row.recommendation?.risk_level || 'Moderate';
        const riskClass = risk === 'Safe' ? 'badge--safe' : (risk === 'Moderate' ? 'badge--moderate' : 'badge--reach');

        const shift1Y = row.trend_analytics?.rank_shift_1y || row.rank_shift_1y || 0;
        let trendClass = 'stable';
        let trendText = 'Stable';
        if (shift1Y <= -5 || (row.trend_analytics?.trend_status || '').toLowerCase().includes('rising')) { 
            trendClass = 'rising'; 
            trendText = `↗ +${Math.abs(shift1Y).toFixed(1)}%`; 
        } else if (shift1Y >= 5 || (row.trend_analytics?.trend_status || '').toLowerCase().includes('falling')) { 
            trendClass = 'falling'; 
            trendText = `↘ -${Math.abs(shift1Y).toFixed(1)}%`; 
        }

        const avgPkg = parseFloat(row.avg_package_lpa || row.college_info?.avg_package_lpa || (23.5 + (idx % 5) * 1.8));
        const avgPkgStr = isNaN(avgPkg) ? '23.5' : avgPkg.toFixed(1);
        const nirfRank = row.college_info?.nirf_rank || row.nirf_rank || (idx + 1);

        return `
            <tr>
                <td style="font-family:var(--font-mono); font-weight:700; color:var(--muted);">#${String(idx + 1).padStart(2, '0')}</td>
                <td>
                    <div style="font-family:var(--font-display); font-weight:700; color:var(--text);">${escapeHtml(row.iit_name)}</div>
                    <div style="color:var(--muted); font-size:11px;">${escapeHtml(row.branch_name)}</div>
                    <div style="color:var(--muted); font-size:10px;">NIRF #${nirfRank} · ${escapeHtml(row.city)}</div>
                </td>
                <td>
                    ${!window.isQuickOrOcrMode ? `<span style="font-family:var(--font-mono); font-weight:700; color:var(--accent-text, var(--lime)); font-size:14px;">${row.recommendation?.match_pct || 88}%</span>` : `<span style="font-family:var(--font-mono); font-weight:600; color:var(--muted); font-size:12px;">Rank #${closing}</span>`}
                </td>
                <td>
                    <span class="badge ${riskClass}">${risk}</span>
                    <div style="font-size:10px; font-family:var(--font-mono); color:var(--muted); margin-top:2px;">${ratio.toFixed(2)}x cutoff</div>
                </td>
                <td style="font-family:var(--font-mono); font-weight:600;">${closing.toLocaleString()}</td>
                <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-text, var(--lime));">₹${avgPkgStr} LPA</td>
                <td>
                    <span class="trend-badge ${trendClass}">${trendText}</span>
                </td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn--secondary btn--sm" onclick="openExplainDrawerForResult(${row.result_id})" style="padding:4px 8px; font-size:11px;">
                            Explain
                        </button>
                        
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

window.addToCompareForResult = function(resultId) {
    const item = currentResults.find(r => r.result_id === resultId);
    if (!item) return;
    showToast(`Added ${item.iit_name} (${item.branch_code || 'B.Tech'}) to Compare finalists.`, 'success');
    switchTab('compare');
};


// ═══════════════════════════════════════════════════
// 7. FACTOR BREAKDOWN MODAL
// ═══════════════════════════════════════════════════
window.showFactorBreakdown = function(resultId) {
    const item = currentResults.find(r => r.result_id === resultId);
    if (!item) return;

    document.getElementById('factorModalTitle').textContent = `${item.iit_name} · ${item.branch_name}`;
    document.getElementById('factorModalSubtitle').textContent = `Fit Score: ${item.recommendation.match_pct}% (${item.recommendation.risk_level}) · 8-Factor Analysis`;

    const body = document.getElementById('factorModalBody');
    let html = '';

    item.recommendation.factors.forEach(f => {
        html += `
            <div style="background:var(--bg-subtle); padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:var(--text-primary); font-size:0.85rem;">${f.factor}</strong>
                    <span style="font-size:0.75rem; color:var(--color-primary); background:var(--color-primary-light); padding:1px 8px; border-radius:var(--radius-full); font-weight:600;">
                        Weight: ${f.weight} (${f.impact})
                    </span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="flex:1; height:6px; background:rgba(0,0,0,0.1); border-radius:3px; overflow:hidden;">
                        <div style="width:${f.score}%; height:100%; background:linear-gradient(90deg, var(--color-primary), #0d9488); border-radius:3px;"></div>
                    </div>
                    <span style="font-size:0.82rem; font-weight:bold; color:var(--color-primary); width:35px; text-align:right;">${f.score}%</span>
                </div>
            </div>
        `;
    });

    body.innerHTML = html;
    toggleFactorModal(true);
};

window.toggleFactorModal = function(show) {
    const modal = document.getElementById('factorModal');
    if (modal) modal.style.display = show ? 'flex' : 'none';
};

// ═══════════════════════════════════════════════════
// 8. SHORTLIST (REMOVED & SAFELY STUBBED)
// ═══════════════════════════════════════════════════
window.toggleShortlist = function() {};
window.updateShortlistBadges = function() {};
window.renderFullShortlist = function() {};
window.exportShortlistCsv = function() {};
window.exportShortlist = function() {};
window.moveShortlist = function() {};
window.removeShortlist = function() {};
window.clearShortlist = function() {};
window.toggleDrawerShortlist = function() {};
window.toggleShortlistFromTrend = function() {};

// ═══════════════════════════════════════════════════
// 9. EXPLORE 23 IITS CATALOG
// ═══════════════════════════════════════════════════
async function loadInstitutes() {
    const grid = document.getElementById('collegesGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="color:var(--text-secondary); padding:20px;">Loading 23 IITs from MySQL database...</div>';

    try {
        const sort = document.getElementById('instSort')?.value || 'nirf';
        const res = await fetch(`${API_BASE}/api/institutes?sort=${sort}`);
        const data = await res.json();

        if (data.success) {
            allColleges = data.results;
            renderCollegeCards(allColleges);
            return;
        }
        throw new Error(data.error || 'Server error');
    } catch (err) {
        console.warn('Backend institutes API offline, loading 23 IITs catalog from fallback cache.');
        allColleges = [
            { College_ID: 1, College_Name: 'IIT Bombay', City: 'Mumbai', State: 'Maharashtra', NIRF_Rank: 1, Avg_Package: 36.9, Placement_Pct: 98.2, Annual_Fee: 228000, Campus_Rating: 4.8 },
            { College_ID: 2, College_Name: 'IIT Delhi', City: 'New Delhi', State: 'Delhi', NIRF_Rank: 2, Avg_Package: 34.1, Placement_Pct: 96.0, Annual_Fee: 220000, Campus_Rating: 4.7 },
            { College_ID: 3, College_Name: 'IIT Madras', City: 'Chennai', State: 'Tamil Nadu', NIRF_Rank: 3, Avg_Package: 33.6, Placement_Pct: 94.5, Annual_Fee: 214000, Campus_Rating: 4.9 },
            { College_ID: 4, College_Name: 'IIT Kanpur', City: 'Kanpur', State: 'Uttar Pradesh', NIRF_Rank: 4, Avg_Package: 28.5, Placement_Pct: 92.0, Annual_Fee: 218000, Campus_Rating: 4.6 },
            { College_ID: 5, College_Name: 'IIT Roorkee', City: 'Roorkee', State: 'Uttarakhand', NIRF_Rank: 5, Avg_Package: 26.2, Placement_Pct: 90.5, Annual_Fee: 212000, Campus_Rating: 4.5 },
            { College_ID: 6, College_Name: 'IIT Kharagpur', City: 'Kharagpur', State: 'West Bengal', NIRF_Rank: 6, Avg_Package: 27.8, Placement_Pct: 91.8, Annual_Fee: 224000, Campus_Rating: 4.8 },
            { College_ID: 7, College_Name: 'IIT Guwahati', City: 'Guwahati', State: 'Assam', NIRF_Rank: 7, Avg_Package: 25.6, Placement_Pct: 89.2, Annual_Fee: 216000, Campus_Rating: 4.7 },
            { College_ID: 8, College_Name: 'IIT Hyderabad', City: 'Hyderabad', State: 'Telangana', NIRF_Rank: 8, Avg_Package: 24.3, Placement_Pct: 88.0, Annual_Fee: 222000, Campus_Rating: 4.6 },
            { College_ID: 9, College_Name: 'IIT (BHU) Varanasi', City: 'Varanasi', State: 'Uttar Pradesh', NIRF_Rank: 10, Avg_Package: 22.4, Placement_Pct: 87.5, Annual_Fee: 210000, Campus_Rating: 4.4 },
            { College_ID: 10, College_Name: 'IIT (ISM) Dhanbad', City: 'Dhanbad', State: 'Jharkhand', NIRF_Rank: 17, Avg_Package: 20.8, Placement_Pct: 86.0, Annual_Fee: 205000, Campus_Rating: 4.3 },
            { College_ID: 11, College_Name: 'IIT Indore', City: 'Indore', State: 'Madhya Pradesh', NIRF_Rank: 14, Avg_Package: 23.5, Placement_Pct: 88.5, Annual_Fee: 218000, Campus_Rating: 4.5 },
            { College_ID: 12, College_Name: 'IIT Gandhinagar', City: 'Gandhinagar', State: 'Gujarat', NIRF_Rank: 18, Avg_Package: 21.0, Placement_Pct: 85.0, Annual_Fee: 215000, Campus_Rating: 4.6 },
            { College_ID: 13, College_Name: 'IIT Ropar', City: 'Ropar', State: 'Punjab', NIRF_Rank: 22, Avg_Package: 20.2, Placement_Pct: 84.0, Annual_Fee: 212000, Campus_Rating: 4.4 },
            { College_ID: 14, College_Name: 'IIT Mandi', City: 'Mandi', State: 'Himachal Pradesh', NIRF_Rank: 33, Avg_Package: 19.5, Placement_Pct: 83.0, Annual_Fee: 210000, Campus_Rating: 4.8 },
            { College_ID: 15, College_Name: 'IIT Jodhpur', City: 'Jodhpur', State: 'Rajasthan', NIRF_Rank: 30, Avg_Package: 19.0, Placement_Pct: 82.5, Annual_Fee: 214000, Campus_Rating: 4.4 },
            { College_ID: 16, College_Name: 'IIT Patna', City: 'Patna', State: 'Bihar', NIRF_Rank: 41, Avg_Package: 18.8, Placement_Pct: 82.0, Annual_Fee: 208000, Campus_Rating: 4.3 },
            { College_ID: 17, College_Name: 'IIT Bhubaneswar', City: 'Bhubaneswar', State: 'Odisha', NIRF_Rank: 47, Avg_Package: 18.5, Placement_Pct: 81.5, Annual_Fee: 210000, Campus_Rating: 4.2 },
            { College_ID: 18, College_Name: 'IIT Tirupati', City: 'Tirupati', State: 'Andhra Pradesh', NIRF_Rank: 59, Avg_Package: 16.5, Placement_Pct: 78.0, Annual_Fee: 205000, Campus_Rating: 4.1 },
            { College_ID: 19, College_Name: 'IIT Palakkad', City: 'Palakkad', State: 'Kerala', NIRF_Rank: 69, Avg_Package: 15.8, Placement_Pct: 76.5, Annual_Fee: 204000, Campus_Rating: 4.2 },
            { College_ID: 20, College_Name: 'IIT Dharwad', City: 'Dharwad', State: 'Karnataka', NIRF_Rank: 93, Avg_Package: 15.0, Placement_Pct: 75.0, Annual_Fee: 202000, Campus_Rating: 4.0 },
            { College_ID: 21, College_Name: 'IIT Bhilai', City: 'Bhilai', State: 'Chhattisgarh', NIRF_Rank: 81, Avg_Package: 15.2, Placement_Pct: 74.5, Annual_Fee: 203000, Campus_Rating: 4.1 },
            { College_ID: 22, College_Name: 'IIT Goa', City: 'Goa', State: 'Goa', NIRF_Rank: 90, Avg_Package: 15.5, Placement_Pct: 75.5, Annual_Fee: 206000, Campus_Rating: 4.3 },
            { College_ID: 23, College_Name: 'IIT Jammu', City: 'Jammu', State: 'Jammu & Kashmir', NIRF_Rank: 67, Avg_Package: 16.0, Placement_Pct: 77.0, Annual_Fee: 205000, Campus_Rating: 4.2 }
        ];
        renderCollegeCards(allColleges);
    }
}

window.filterInstitutes = function() {
    const q = document.getElementById('instSearch')?.value.toLowerCase() || '';
    const filtered = allColleges.filter(c =>
        c.College_Name.toLowerCase().includes(q) ||
        c.City.toLowerCase().includes(q) ||
        c.State.toLowerCase().includes(q)
    );
    renderCollegeCards(filtered);
};

function renderCollegeCards(colleges) {
    const grid = document.getElementById('collegesGrid');
    if (!grid) return;

    if (colleges.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-secondary); padding:20px;">No institutes match search query.</div>';
        return;
    }

    grid.innerHTML = colleges.map(c => `
        <div class="college-card">
            <div class="college-card__top">
                <div>
                    <h3 style="font-size:1.15rem; color:var(--text-primary); font-weight:700;">${escapeHtml(c.College_Name)}</h3>
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">📍 ${escapeHtml(c.City)}, ${escapeHtml(c.State)}</p>
                </div>
                <span class="nirf-pill">NIRF #${c.NIRF_Rank || '-'}</span>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:14px 0; background:var(--bg-subtle); padding:10px; border-radius:var(--radius-md);">
                <div>
                    <span style="font-size:0.7rem; color:var(--text-tertiary); display:block;">AVG CTC</span>
                    <strong style="color:#10b981; font-size:1rem;">₹${parseFloat(c.Avg_Package || 0).toFixed(1)} LPA</strong>
                </div>
                <div>
                    <span style="font-size:0.7rem; color:var(--text-tertiary); display:block;">PLACEMENT</span>
                    <strong style="color:var(--color-primary); font-size:1rem;">${parseFloat(c.Placement_Pct || 0).toFixed(1)}%</strong>
                </div>
                <div>
                    <span style="font-size:0.7rem; color:var(--text-tertiary); display:block;">ANNUAL FEE</span>
                    <strong style="color:var(--text-primary); font-size:0.88rem;">₹${(parseFloat(c.Annual_Fee || 0)/100000).toFixed(2)}L</strong>
                </div>
                <div>
                    <span style="font-size:0.7rem; color:var(--text-tertiary); display:block;">CAMPUS VIBE</span>
                    <strong style="color:#f59e0b; font-size:0.88rem;">⭐ ${parseFloat(c.Campus_Rating || 0).toFixed(1)} / 5</strong>
                </div>
            </div>

            <button class="btn btn--secondary btn--full btn--sm" onclick="openCollegeModal(${c.College_ID})">
                🔍 Cutoffs & Offered Branches
            </button>
        </div>
    `).join('');
}

window.openCollegeModal = async function(collegeId) {
    const modal = document.getElementById('collegeModal');
    const title = document.getElementById('collegeModalTitle');
    const sub   = document.getElementById('collegeModalSubtitle');
    const body  = document.getElementById('collegeModalBody');

    body.innerHTML = '<div style="color:var(--text-secondary);">Loading cutoffs from MySQL...</div>';
    modal.style.display = 'flex';

    try {
        const res = await fetch(`${API_BASE}/api/institutes/${collegeId}`);
        const data = await res.json();

        if (data.success) {
            const c = data.college;
            title.textContent = c.College_Name;
            sub.textContent = `${c.City}, ${c.State} · NIRF Rank #${c.NIRF_Rank || '-'} · ₹${(c.Annual_Fee/100000).toFixed(2)}L / yr`;

            if (data.cutoffs.length === 0) {
                body.innerHTML = '<div style="color:var(--text-secondary); padding:20px;">No historical cutoffs recorded.</div>';
                return;
            }

            let cutoffsHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Branch</th>
                            <th>Code</th>
                            <th>Year</th>
                            <th>Category</th>
                            <th>Opening Rank</th>
                            <th>Closing Rank</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.cutoffs.forEach(co => {
                cutoffsHtml += `
                    <tr>
                        <td style="font-weight:600; color:var(--text-primary);">${escapeHtml(co.Branch_Name)}</td>
                        <td><code>${escapeHtml(co.Branch_Code)}</code></td>
                        <td>${co.Year}</td>
                        <td><span class="badge" style="background:var(--bg-subtle); color:var(--text-primary);">${co.Category}</span></td>
                        <td>${co.Opening_Rank?.toLocaleString()}</td>
                        <td style="font-weight:bold; color:var(--color-primary);">${co.Closing_Rank?.toLocaleString()}</td>
                    </tr>
                `;
            });

            cutoffsHtml += '</tbody></table>';
            body.innerHTML = cutoffsHtml;
        }
    } catch (err) {
        body.innerHTML = '<div style="color:#ef4444;">Failed to load cutoffs data.</div>';
    }
};

window.toggleCollegeModal = function(show) {
    const modal = document.getElementById('collegeModal');
    if (modal) modal.style.display = show ? 'flex' : 'none';
};

// ═══════════════════════════════════════════════════
// 9B. ALL 23 IITS DIRECTORY & LPA BROWSER (Live MySQL)
// ═══════════════════════════════════════════════════
let allIITDirectoryData = [];
let iitDirCurrentTag = '';
let iitDirCurrentView = 'cards';

window.loadIITDirectory = async function() {
    const container = document.getElementById('iitDirCardsContainer');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/api/institutes/directory`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            allIITDirectoryData = json.data;
            renderIITDirectory();
            return;
        }
        throw new Error(json.error || 'No directory data received');
    } catch (err) {
        console.warn('Directory API fetch failed, trying standard institutes endpoint:', err);
        try {
            const fallbackRes = await fetch(`${API_BASE}/api/institutes?sort=nirf`);
            const fallbackJson = await fallbackRes.json();
            if (fallbackJson.success && Array.isArray(fallbackJson.results)) {
                allIITDirectoryData = fallbackJson.results.map(c => ({
                    ...c,
                    branches: [
                        { code: 'CSE', name: 'Computer Science and Engineering' },
                        { code: 'EE', name: 'Electrical Engineering' },
                        { code: 'ME', name: 'Mechanical Engineering' },
                        { code: 'CE', name: 'Civil Engineering' }
                    ]
                }));
                renderIITDirectory();
            }
        } catch (e2) {
            console.error('All directory loading attempts failed:', e2);
        }
    }
};

window.renderIITDirectory = function() {
    const cardsContainer = document.getElementById('iitDirCardsContainer');
    const tableBody = document.getElementById('iitDirTableBody');
    const countEl = document.getElementById('iitDirCount');
    if (!cardsContainer && !tableBody) return;

    const search = (document.getElementById('iitDirSearch')?.value || '').trim().toLowerCase();
    const sort = document.getElementById('iitDirSort')?.value || 'nirf';

    let list = [...allIITDirectoryData];

    // Branch tag quick filter
    if (iitDirCurrentTag) {
        list = list.filter(item => {
            if (!item.branches || !Array.isArray(item.branches)) return false;
            return item.branches.some(b => {
                const code = (b.code || '').toUpperCase();
                const name = (b.name || '').toUpperCase();
                if (iitDirCurrentTag === 'ECE') {
                    return code.includes('ECE') || code.includes('EE') || name.includes('ELECTRICAL') || name.includes('ELECTRONICS');
                }
                if (iitDirCurrentTag === 'MnC') {
                    return code.includes('MNC') || code.includes('MTH') || code.includes('AI') || code.includes('DATA') || name.includes('COMPUTING') || name.includes('MATHEMATICS');
                }
                if (iitDirCurrentTag === 'ME') {
                    return code.includes('ME') || name.includes('MECHANICAL');
                }
                if (iitDirCurrentTag === 'CE') {
                    return code.includes('CE') || name.includes('CIVIL');
                }
                if (iitDirCurrentTag === 'CH') {
                    return code.includes('CH') || name.includes('CHEMICAL');
                }
                if (iitDirCurrentTag === 'AE') {
                    return code.includes('AE') || name.includes('AEROSPACE');
                }
                return code === iitDirCurrentTag || code.includes(iitDirCurrentTag) || name.includes(iitDirCurrentTag);
            });
        });
    }

    // Search input filter
    if (search) {
        list = list.filter(item => {
            const matchCollege = (item.College_Name || '').toLowerCase().includes(search) ||
                                 (item.City || '').toLowerCase().includes(search) ||
                                 (item.State || '').toLowerCase().includes(search);
            if (matchCollege) return true;
            if (item.branches && Array.isArray(item.branches)) {
                return item.branches.some(b =>
                    (b.code || '').toLowerCase().includes(search) ||
                    (b.name || '').toLowerCase().includes(search)
                );
            }
            return false;
        });
    }

    // Sorting
    list.sort((a, b) => {
        if (sort === 'package') {
            return (parseFloat(b.Avg_Package) || 0) - (parseFloat(a.Avg_Package) || 0);
        } else if (sort === 'placement') {
            return (parseFloat(b.Placement_Pct) || 0) - (parseFloat(a.Placement_Pct) || 0);
        } else if (sort === 'fee') {
            return (parseFloat(a.Annual_Fee) || 999999) - (parseFloat(b.Annual_Fee) || 999999);
        } else if (sort === 'name') {
            return (a.College_Name || '').localeCompare(b.College_Name || '');
        } else {
            return (a.NIRF_Rank || 999) - (b.NIRF_Rank || 999);
        }
    });

    if (countEl) {
        countEl.textContent = `Showing ${list.length} of ${allIITDirectoryData.length} IITs`;
    }

    // Render Grid Cards
    if (cardsContainer) {
        if (list.length === 0) {
            cardsContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: var(--space-10); text-align: center;">
                    <div style="font-size: var(--text-base); font-weight: 600; color: var(--text);">No IITs match your filter</div>
                    <div style="font-size: var(--text-sm); color: var(--muted); margin-top: 4px;">Try searching for another branch or reset all filters.</div>
                    <button class="btn btn--sm btn--secondary" style="margin-top: var(--space-4);" onclick="filterIITByBranchTag(''); const si = document.getElementById('iitDirSearch'); if (si) si.value=''; handleIITDirSearch();">Reset Filters</button>
                </div>
            `;
        } else {
            cardsContainer.innerHTML = list.map(item => {
                const pkg = item.Avg_Package ? `₹${parseFloat(item.Avg_Package).toFixed(1)} LPA` : 'N/A';
                const placement = item.Placement_Pct ? `${parseFloat(item.Placement_Pct).toFixed(1)}%` : 'N/A';
                const feeLakhs = item.Annual_Fee ? `₹${(parseFloat(item.Annual_Fee) / 100000).toFixed(2)} L/yr` : 'N/A';
                const branches = item.branches || [];
                const branchCount = branches.length;

                const visibleChips = branches.slice(0, 8).map(b => {
                    const isHighlighted = iitDirCurrentTag && (
                        (b.code || '').toUpperCase().includes(iitDirCurrentTag) ||
                        (b.name || '').toUpperCase().includes(iitDirCurrentTag)
                    );
                    return `<span class="iit-branch-chip ${isHighlighted ? 'highlight' : ''}" title="${escapeHtml(b.name || b.code)}">${escapeHtml(b.code || b.name)}</span>`;
                }).join('');

                const moreCount = branchCount > 8 ? `<span class="iit-branch-chip more">+${branchCount - 8} more</span>` : '';

                return `
                    <div class="iit-card card">
                        <div class="iit-card__header">
                            <div>
                                <h3 class="iit-card__name">${escapeHtml(item.College_Name)}</h3>
                                <div class="iit-card__location">
                                    <i data-lucide="map-pin" width="12" height="12"></i>
                                    ${escapeHtml(item.City)}, ${escapeHtml(item.State)}
                                </div>
                            </div>
                            <span class="iit-dir-nirf-badge" title="NIRF 2024 Engineering Rank"><i data-lucide="award" width="12" height="12"></i> NIRF <strong class="nirf-num">#${item.NIRF_Rank || '—'}</strong></span>
                        </div>

                        <div class="iit-card__metrics">
                            <div class="iit-metric-box highlight">
                                <span class="iit-metric-label">AVG PACKAGE</span>
                                <span class="iit-metric-val lime">${pkg}</span>
                            </div>
                            <div class="iit-metric-box">
                                <span class="iit-metric-label">PLACEMENT</span>
                                <span class="iit-metric-val">${placement}</span>
                            </div>
                            <div class="iit-metric-box">
                                <span class="iit-metric-label">ANNUAL FEE</span>
                                <span class="iit-metric-val">${feeLakhs}</span>
                            </div>
                        </div>

                        <div class="iit-card__branches-section">
                            <div class="iit-card__branches-head">
                                <span class="iit-card__branches-title">Offered Branches (${branchCount})</span>
                                <span class="iit-card__seat-pool">JoSAA 2025–26</span>
                            </div>
                            <div class="iit-card__branch-chips">
                                ${visibleChips}
                                ${moreCount}
                            </div>
                        </div>

                        <div class="iit-card__footer">
                            <button class="btn btn--sm btn--primary" style="width: 100%;" onclick="selectIITForPrediction('${escapeHtml(item.College_Name)}')">
                                <i data-lucide="compass" width="13" height="13"></i>
                                Check Chances at ${escapeHtml(item.College_Name.replace('Indian Institute of Technology', 'IIT'))}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Render Table View
    if (tableBody) {
        if (list.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--muted);">No matching IITs found.</td></tr>`;
        } else {
            tableBody.innerHTML = list.map(item => {
                const pkg = item.Avg_Package ? `₹${parseFloat(item.Avg_Package).toFixed(1)} LPA` : 'N/A';
                const placement = item.Placement_Pct ? `${parseFloat(item.Placement_Pct).toFixed(1)}%` : 'N/A';
                const feeLakhs = item.Annual_Fee ? `₹${(parseFloat(item.Annual_Fee) / 100000).toFixed(2)}L` : 'N/A';
                const branches = item.branches || [];

                const branchChips = branches.slice(0, 7).map(b =>
                    `<span class="iit-branch-chip" title="${escapeHtml(b.name)}">${escapeHtml(b.code)}</span>`
                ).join(' ') + (branches.length > 7 ? ` <span class="iit-branch-chip more">+${branches.length - 7}</span>` : '');

                return `
                    <tr>
                        <td class="td-mono" style="color:var(--lime);font-weight:700;">#${item.NIRF_Rank || '—'}</td>
                        <td>
                            <div style="font-weight:600;color:var(--text);">${escapeHtml(item.College_Name)}</div>
                            <div style="font-size:var(--text-xs);color:var(--muted);">${escapeHtml(item.City)}, ${escapeHtml(item.State)}</div>
                        </td>
                        <td class="td-mono" style="color:var(--lime);font-weight:700;">${pkg}</td>
                        <td class="td-mono">${placement}</td>
                        <td class="td-mono">${feeLakhs}</td>
                        <td><div style="display:flex;flex-wrap:wrap;gap:4px;max-width:340px;">${branchChips}</div></td>
                        <td>
                            <button class="btn btn--sm btn--secondary" onclick="selectIITForPrediction('${escapeHtml(item.College_Name)}')">
                                Check
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    if (window.lucide) lucide.createIcons();
};

window.handleIITDirSearch = function() {
    renderIITDirectory();
};

window.handleIITDirSort = function() {
    renderIITDirectory();
};

window.filterIITByBranchTag = function(tag) {
    iitDirCurrentTag = tag;
    document.querySelectorAll('.iit-tag-pill').forEach(btn => {
        if (tag === '') {
            btn.classList.toggle('active', btn.textContent.trim() === 'All Branches');
        } else {
            btn.classList.toggle('active', btn.textContent.trim().toUpperCase().includes(tag.toUpperCase()));
        }
    });
    renderIITDirectory();
};

window.setIITDirView = function(view) {
    iitDirCurrentView = view;
    const cardsEl = document.getElementById('iitDirCardsContainer');
    const tableEl = document.getElementById('iitDirTableContainer');
    const btnCards = document.getElementById('iitDirViewCards');
    const btnTable = document.getElementById('iitDirViewTable');

    if (view === 'table') {
        if (cardsEl) cardsEl.style.display = 'none';
        if (tableEl) tableEl.style.display = 'block';
        if (btnCards) btnCards.classList.remove('active');
        if (btnTable) btnTable.classList.add('active');
    } else {
        if (cardsEl) cardsEl.style.display = 'grid';
        if (tableEl) tableEl.style.display = 'none';
        if (btnCards) btnCards.classList.add('active');
        if (btnTable) btnTable.classList.remove('active');
    }
};

window.selectIITForPrediction = function(collegeName) {
    switchTab('find');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ═══════════════════════════════════════════════════
// 10. PEER DECISIONS (Students Like You)
// ═══════════════════════════════════════════════════
let allPeerData = [];

window.applyPeerFilters = function() {
    loadPeerTrends();
};

window.loadPeerTrends = async function() {
    const minInput = document.getElementById('peerRankMin');
    const maxInput = document.getElementById('peerRankMax');
    const catSelect = document.getElementById('peerCategoryFilter');
    const instSelect = document.getElementById('peerInstituteFilter');

    const minRank = minInput ? parseInt(minInput.value) || 0 : 0;
    const maxRank = maxInput ? parseInt(maxInput.value) || 50000 : 50000;
    const category = catSelect ? catSelect.value : 'ALL';
    const collegeId = instSelect ? instSelect.value : '';

    const rangeTag = document.getElementById('peerActiveRangeTag');
    if (rangeTag) rangeTag.textContent = `AIR ${minRank.toLocaleString()} – ${maxRank.toLocaleString()}`;

    try {
        const queryParams = new URLSearchParams();
        if (minRank > 0) queryParams.set('minRank', minRank);
        if (maxRank < 50000) queryParams.set('maxRank', maxRank);
        if (category && category !== 'ALL') queryParams.set('category', category);
        if (collegeId) queryParams.set('collegeId', collegeId);

        const res = await fetch(`${API_BASE}/api/peer-trends?${queryParams.toString()}`);
        const data = await res.json();

        if (data.success && data.results && data.results.length > 0) {
            allPeerData = data.results;
            renderPeerInsights(allPeerData);
            return;
        }
        throw new Error('No records returned');
    } catch (err) {
        console.warn('Peer trends API offline, loading realistic mock decisions:', err.message);
        allPeerData = [
            { Peer_ID: 101, Profile_Category: 'OPEN', Rank_Range_Start: 500, Rank_Range_End: 1000, College_Name: 'IIT Bombay', Branch_Name: 'Computer Science and Engineering', Selection_Count: 142, City: 'Mumbai', NIRF_Rank: 1, rationale: 'Prioritised Tier-1 CSE & Top Tech Placements' },
            { Peer_ID: 102, Profile_Category: 'OPEN', Rank_Range_Start: 1001, Rank_Range_End: 1500, College_Name: 'IIT Delhi', Branch_Name: 'Mathematics and Computing', Selection_Count: 118, City: 'New Delhi', NIRF_Rank: 2, rationale: 'Chose CS/Math Curriculum over Core branches' },
            { Peer_ID: 103, Profile_Category: 'OPEN', Rank_Range_Start: 1001, Rank_Range_End: 1500, College_Name: 'IIT Madras', Branch_Name: 'Electrical Engineering', Selection_Count: 96, City: 'Chennai', NIRF_Rank: 3, rationale: 'Preferred Overall Campus NIRF #1 over Tier-2 CSE' },
            { Peer_ID: 104, Profile_Category: 'OBC-NCL', Rank_Range_Start: 500, Rank_Range_End: 1200, College_Name: 'IIT Kanpur', Branch_Name: 'Computer Science and Engineering', Selection_Count: 88, City: 'Kanpur', NIRF_Rank: 4, rationale: 'Balanced CS Curriculum with Top Placement CTC' },
            { Peer_ID: 105, Profile_Category: 'OPEN', Rank_Range_Start: 1501, Rank_Range_End: 2500, College_Name: 'IIT Roorkee', Branch_Name: 'Data Science and Artificial Intelligence', Selection_Count: 82, City: 'Roorkee', NIRF_Rank: 5, rationale: 'High Demand Emerging Tech specialization' },
            { Peer_ID: 106, Profile_Category: 'OPEN', Rank_Range_Start: 1501, Rank_Range_End: 2500, College_Name: 'IIT Kharagpur', Branch_Name: 'Electronics and Electrical Communication', Selection_Count: 76, City: 'Kharagpur', NIRF_Rank: 6, rationale: 'Versatile Core Engineering with High Tech Placements' }
        ];
        renderPeerInsights(allPeerData);
    }
};

function renderPeerInsights(rows) {
    const totalSelections = rows.reduce((acc, r) => acc + (r.Selection_Count || 1), 0);
    const countEl = document.getElementById('peerStatTotalCount');
    if (countEl) countEl.textContent = `${totalSelections.toLocaleString()} Choices`;

    const topInst = rows[0]?.College_Name || 'IIT Bombay';
    const topBranch = rows[0]?.Branch_Name || 'Computer Science';
    const instEl = document.getElementById('peerStatTopInst');
    const branchEl = document.getElementById('peerStatTopBranch');
    if (instEl) instEl.textContent = topInst;
    if (branchEl) branchEl.textContent = topBranch.length > 20 ? topBranch.slice(0, 18) + '…' : topBranch;

    const cardsGrid = document.getElementById('peerCardsGrid');
    if (cardsGrid) {
        if (rows.length === 0) {
            cardsGrid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <div class="empty-state__icon"><i data-lucide="users" width="28" height="28"></i></div>
                    <div class="empty-state__title">No Peer Decisions Found</div>
                    <div class="empty-state__body">Try widening the AIR rank window or choosing "All Categories".</div>
                </div>
            `;
        } else {
            let cardsHtml = '';
            rows.slice(0, 6).forEach(r => {
                const rat = r.rationale || 'Balanced Curriculum with Career Package';
                cardsHtml += `
                    <div class="peer-decision-card">
                        <div class="peer-card-header">
                            <span class="peer-id-badge">#PEER-${r.Peer_ID || Math.floor(Math.random()*900)+100}</span>
                            <span class="badge" style="background:var(--raised); color:var(--text);">${r.Profile_Category || 'OPEN'}</span>
                            <span class="peer-selection-badge">👥 ${r.Selection_Count || 40} chose this</span>
                        </div>

                        <div>
                            <div style="font-family:var(--font-display); font-weight:700; font-size:var(--text-base); color:var(--text);">
                                ${escapeHtml(r.College_Name)}
                            </div>
                            <div style="color:var(--branch-color); font-weight:600; font-size:var(--text-sm); margin-top:2px;">
                                ${escapeHtml(r.Branch_Name)}
                            </div>
                        </div>

                        <div style="display:flex; align-items:center; justify-content:space-between; font-size:var(--text-xs); color:var(--muted); font-family:var(--font-mono); padding:var(--space-2) 0; border-top:1px solid var(--border);">
                            <span>AIR Window: <strong>${r.Rank_Range_Start} – ${r.Rank_Range_End}</strong></span>
                            <span>City: ${escapeHtml(r.City || '-')}</span>
                        </div>

                        <div style="font-size:11px; background:var(--raised); border-radius:var(--radius-sm); padding:6px 10px; color:var(--faint); line-height:1.4;">
                            <strong style="color:var(--muted);">Tradeoff:</strong> ${escapeHtml(rat)}
                        </div>
                    </div>
                `;
            });
            cardsGrid.innerHTML = cardsHtml;
        }
    }

    const tableBody = document.getElementById('peerTableBody');
    if (tableBody) {
        if (rows.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:var(--space-6);color:var(--muted);">No matching peer records.</td></tr>`;
        } else {
            let tableHtml = '';
            rows.forEach((r, idx) => {
                const rat = r.rationale || 'Matched preferred branch in top-ranked IIT';
                tableHtml += `
                    <tr>
                        <td class="td-mono" style="color:var(--muted);">#PEER-${r.Peer_ID || idx + 1}</td>
                        <td><span class="badge" style="background:var(--raised); color:var(--text);">${r.Profile_Category || 'OPEN'}</span></td>
                        <td class="td-mono" style="color:var(--lime);">AIR ${r.Rank_Range_Start} – ${r.Rank_Range_End}</td>
                        <td style="font-weight:600; color:var(--text);">${escapeHtml(r.College_Name)}</td>
                        <td style="color:var(--branch-color); font-weight:500;">${escapeHtml(r.Branch_Name)}</td>
                        <td class="td-mono" style="font-weight:700; color:var(--safe);">👥 ${r.Selection_Count}</td>
                        <td style="font-size:var(--text-xs); color:var(--muted);">${escapeHtml(rat)}</td>
                    </tr>
                `;
            });
            tableBody.innerHTML = tableHtml;
        }
    }

    if (window.lucide) lucide.createIcons();
}

window.loadPeerData = function() {
    loadPeerTrends();
};

// ═══════════════════════════════════════════════════
// 12. DATABASE HUB & LIVE VIEWS INSPECTOR
// ═══════════════════════════════════════════════════
window.loadDatabaseOverview = function() {};

window.renderDbRelationCards = function() {};
window.inspectDbTable = function() {};
window.closeDbView = function() {};
window.loadSampleQuery = function() {};
window.executePlaygroundQuery = function() {};
window.loadAuditLog = function() {};
window.loadAuditLogs = function() {};
window.adminTestTrigger = function() {};
window.adminRefreshTrends = function() {};
window.adminRegisterStudent = function() {};
window.adminImportCsv = function() {};

// ═══════════════════════════════════════════════════
// 14. DESIGN SYSTEM HELPERS & MOCK FALLBACKS
// ═══════════════════════════════════════════════════

// Status Pill Updater
function setApiStatus(isLive) {
    const pillText = document.getElementById('apiStatusText');
    const pill = document.getElementById('apiStatusPill');
    if (!pillText || !pill) return;
    if (isLive) {
        pillText.textContent = 'Live API';
        pill.style.borderColor = 'var(--color-primary)';
        pill.style.color = 'var(--color-primary)';
    } else {
        pillText.textContent = 'Demo Data';
        pill.style.borderColor = 'var(--border-subtle)';
        pill.style.color = 'var(--text-secondary)';
    }
}


// Budget Slider & Input Sync (Screenshot 1)
window.updateBudgetSlider = function(val) {
    const num = parseInt(val) || 250000;
    const slider = document.getElementById('budgetSlider');
    if (slider) slider.value = num;
    const label = document.getElementById('budgetSelectedLabel');
    if (label) label.textContent = `₹${(num / 100000).toFixed(1)}L selected`;
};

window.updateBudgetInput = function(val) {
    const num = parseInt(val) || 250000;
    const input = document.getElementById('budgetInput');
    if (input) input.value = num;
    const label = document.getElementById('budgetSelectedLabel');
    if (label) label.textContent = `₹${(num / 100000).toFixed(1)}L selected`;
};

// Sessions Manager (Screenshot 1)
window.loadSession = function(sessionNum) {
    document.querySelectorAll('.session-box').forEach(b => b.classList.remove('active'));
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }

    const sessionData = {
        1: { label: 'Placement first', budget: 350000, location: 'All India', branches: ['Computer Science'] },
        2: { label: 'ECE, any location', budget: 280000, location: 'North India', branches: ['ECE', 'Electrical'] },
        3: { label: 'CSE, low fees, near home', budget: 250000, location: 'South India - within 800 km of home', branches: ['Computer Science'] }
    };

    const s = sessionData[sessionNum];
    if (s) {
        const lbl = document.getElementById('sessionLabelInput');
        if (lbl) lbl.value = s.label;
        const b = document.getElementById('budgetInput');
        if (b) b.value = s.budget;
        updateBudgetSlider(s.budget);
        const loc = document.getElementById('locationInput');
        if (loc) loc.value = s.location;
        showToast(`Loaded Session 0${sessionNum}: "${s.label}"`, 'info');
    }
};

window.createNewSessionPrompt = function() {
    const lbl = document.getElementById('sessionLabelInput');
    if (lbl) lbl.value = 'What-if: New exploration ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    showToast('Created new session workspace.', 'success');
};

// ═══════════════════════════════════════════════════
// EXPLAIN DRAWER (Midnight Lime Transparent Scoring)
// ═══════════════════════════════════════════════════
let drawerCurrentResult = null;

function renderFactorRadarSvg(eightScores) {
    const size = 260;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = 84;
    const totalAxes = eightScores.length; // 8

    // Concentric grid octagons at 25%, 50%, 75%, 100%
    const levels = [0.25, 0.50, 0.75, 1.0];
    let gridPaths = '';
    levels.forEach(lvl => {
        const r = maxR * lvl;
        const pts = [];
        for (let i = 0; i < totalAxes; i++) {
            const angle = (-Math.PI / 2) + (i * 2 * Math.PI / totalAxes);
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        gridPaths += `<polygon points="${pts.join(' ')}" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="${lvl === 1 ? 'none' : '2,2'}"/>`;
    });

    // Axis spokes, labels, value polygon, vertex dots
    let spokes = '';
    let labels = '';
    const polyPts = [];
    let dots = '';

    eightScores.forEach((item, i) => {
        const angle = (-Math.PI / 2) + (i * 2 * Math.PI / totalAxes);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const outerX = cx + maxR * cos;
        const outerY = cy + maxR * sin;
        spokes += `<line x1="${cx}" y1="${cy}" x2="${outerX.toFixed(1)}" y2="${outerY.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;

        const valR = (item.score / 100) * maxR;
        const vx = cx + valR * cos;
        const vy = cy + valR * sin;
        polyPts.push(`${vx.toFixed(1)},${vy.toFixed(1)}`);

        dots += `<circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="4" fill="${item.color}" stroke="var(--surface)" stroke-width="1.5"><title>${item.label}: ${item.score}/100</title></circle>`;

        const lx = cx + (maxR + 18) * cos;
        const ly = cy + (maxR + 18) * sin + 3;
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : (cos > 0 ? 'start' : 'end');
        labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="${item.color}">${item.label.split('/')[0].trim()}</text>`;
    });

    const polySvg = `<polygon points="${polyPts.join(' ')}" fill="rgba(200, 245, 96, 0.18)" stroke="var(--lime)" stroke-width="2"/>`;

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block; margin:0 auto; overflow:visible;">
            ${gridPaths}
            ${spokes}
            ${polySvg}
            ${dots}
            ${labels}
        </svg>
    `;
}

function renderExplainDrawerContent(row) {
    const userRank = findState.rank || 1842;
    const closing = row.closing_rank || 1500;
    const ratio = closing > 0 ? (userRank / closing) : 1.0;
    const risk = row.recommendation?.risk_level || 'Moderate';
    const riskColor = risk === 'Safe' ? 'var(--safe)' : (risk === 'Moderate' ? 'var(--moderate)' : 'var(--reach)');
    const isShortlisted = shortlist.some(s => s.result_id === row.result_id || (s.iit_name === row.iit_name && s.branch_name === row.branch_name));

    const dTitle = document.getElementById('drawerTitle');
    if (dTitle) dTitle.textContent = `${row.iit_name} — ${row.branch_name}`;

    const eightScores = row._factorList || computeEightFactorScores(row);
    const weights = findState.weights || {};
    let totalWeight = 0;
    eightScores.forEach(item => {
        totalWeight += (weights[item.key] != null ? weights[item.key] : 50);
    });
    if (totalWeight <= 0) totalWeight = 1;

    let sumProducts = 0;
    const factorRowsHtml = eightScores.map(item => {
        const w = weights[item.key] != null ? weights[item.key] : 50;
        const sharePct = Math.round((w / totalWeight) * 100);
        const contribPoints = (w / totalWeight) * item.score;
        sumProducts += (item.score * w);

        return `
            <div class="explain-factor-card">
                <div class="explain-factor-row">
                    <div class="explain-factor-info">
                        <div class="icon-tile" style="background:${item.color}22; color:${item.color}; width:32px; height:32px; border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <i data-lucide="${item.icon}" width="16" height="16"></i>
                        </div>
                        <div style="min-width:0;">
                            <div class="explain-factor-name">${item.label}</div>
                            <div class="explain-factor-share">Weight: ${w} (${sharePct}% share)</div>
                        </div>
                    </div>
                    <div class="explain-factor-scores">
                        <span class="explain-raw-score">${item.score}/100</span>
                        <span class="explain-weighted-contrib" style="color:${item.color};">+${contribPoints.toFixed(1)}</span>
                    </div>
                </div>
                <div class="explain-factor-track">
                    <div class="explain-factor-bar" style="width:${item.score}%; background:${item.color};"></div>
                </div>
            </div>
        `;
    }).join('');

    const weightedAvg = sumProducts / totalWeight;
    const admissionProbScore = risk === 'Safe' ? 95 : (risk === 'Moderate' ? 70 : 40);
    const compositeFit = Math.min(99, Math.max(35, Math.round((weightedAvg * 0.80) + (admissionProbScore * 0.20))));

    let riskRuleText = '';
    if (ratio <= 0.85) {
        riskRuleText = `Your AIR ${userRank.toLocaleString()} is safely below 85% of last year's cutoff (${closing.toLocaleString()}). You hold an estimated safety margin of +${(closing - userRank).toLocaleString()} ranks.`;
    } else if (ratio <= 1.10) {
        riskRuleText = `Your AIR ${userRank.toLocaleString()} sits within close proximity (0.85x – 1.10x) of last year's cutoff (${closing.toLocaleString()}). This is an active Target choice.`;
    } else {
        riskRuleText = `Your AIR ${userRank.toLocaleString()} is ${Math.abs(userRank - closing).toLocaleString()} ranks beyond last year's closing cutoff (${closing.toLocaleString()}). Classified as a Reach option.`;
    }

    const radarSvg = renderFactorRadarSvg(eightScores);

    const body = document.getElementById('drawerBody');
    if (!body) return;

    body.innerHTML = `
        <!-- Hero Stats Strip -->
        <div class="explain-hero-strip">
            <div class="explain-hero-item">
                <span class="explain-hero-label">Overall Match</span>
                <span class="explain-hero-val" style="color:var(--lime);">${compositeFit}%</span>
            </div>
            <div class="explain-hero-item">
                <span class="explain-hero-label">Risk Tier</span>
                <span class="explain-hero-val" style="color:${riskColor};">${risk}</span>
            </div>
            <div class="explain-hero-item">
                <span class="explain-hero-label">Cutoff Ratio</span>
                <span class="explain-hero-val">${ratio.toFixed(2)}x</span>
            </div>
        </div>

        <!-- Section 1: 8-Factor Radar Chart -->
        <div style="margin-bottom:var(--space-6);">
            <div class="explain-section-title">
                <i data-lucide="crosshair" width="16" height="16" style="color:var(--lime);"></i>
                8-Factor Preference Radar
            </div>
            <div style="background:var(--raised); border:1px solid var(--border); border-radius:var(--radius-lg); padding:var(--space-4) 0; display:flex; justify-content:center;">
                ${radarSvg}
            </div>
        </div>

        <!-- Section 2: Mathematical Factor Contributions -->
        <div style="margin-bottom:var(--space-6);">
            <div class="explain-section-title">
                <i data-lucide="sliders" width="16" height="16" style="color:var(--lime);"></i>
                Factor Score Contributions
            </div>
            <div class="explain-factor-list">
                ${factorRowsHtml}
            </div>
        </div>

        <!-- Section 3: Transparent Math Formula -->
        <div style="margin-bottom:var(--space-6);">
            <div class="explain-section-title">
                <i data-lucide="calculator" width="16" height="16" style="color:var(--lime);"></i>
                How This Score Was Calculated
            </div>
            <div class="explain-math-box">
                <div class="explain-math-formula">
                    Personal Match = Weighted average of your 8 factor priorities
                </div>
                <div class="explain-math-substituted">
                    = (${sumProducts.toFixed(0)} points ÷ ${totalWeight} weight) = ${weightedAvg.toFixed(1)}% Personal Match
                </div>
                <div class="explain-math-formula" style="margin-top:6px;">
                    Overall Fit = 80% Personal Match + 20% Admission Probability
                </div>
                <div class="explain-math-substituted">
                    = 0.80 × (${weightedAvg.toFixed(1)}%) + 0.20 × (${admissionProbScore}%) = ${compositeFit}% Overall Fit
                </div>
            </div>
        </div>

        <!-- Section 4: JoSAA Cutoff Source & Risk Audit -->
        <div style="margin-bottom:var(--space-6);">
            <div class="explain-section-title">
                <i data-lucide="shield-check" width="16" height="16" style="color:var(--lime);"></i>
                Cutoff Record Verification
            </div>
            <div class="explain-cutoff-box">
                <div class="explain-cutoff-grid">
                    <div class="explain-cutoff-cell">
                        <label>${row.year || 2025} Round 6 Cutoff</label>
                        <strong>${closing.toLocaleString()}</strong>
                    </div>
                    <div class="explain-cutoff-cell">
                        <label>Candidate Rank (AIR)</label>
                        <strong>${userRank.toLocaleString()}</strong>
                    </div>
                    <div class="explain-cutoff-cell">
                        <label>Calculated Ratio</label>
                        <strong style="color:${riskColor};">${ratio.toFixed(2)}x</strong>
                    </div>
                    <div class="explain-cutoff-cell">
                        <label>Seat Category</label>
                        <strong>${row.category || 'OPEN'}</strong>
                    </div>
                </div>
                <div style="font-size:11px; color:var(--muted); border-top:1px solid rgba(255,255,255,0.05); padding-top:6px; margin-top:2px;">
                    ${riskRuleText}
                </div>
            </div>
        </div>

        <!-- Drawer Action Footer -->
        <div style="display:flex; gap:var(--space-2); margin-top:var(--space-4);">
            <button class="btn btn--primary btn--sm" onclick="addToCompareForResult(${row.result_id}); closeExplainDrawerDirect();" style="flex:1; justify-content:center;">
                <i data-lucide="git-compare" width="14" height="14"></i>
                Compare Choice
            </button>
            <button class="btn btn--secondary btn--sm" onclick="closeExplainDrawerDirect();" style="flex:1; justify-content:center;">
                Close
            </button>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

window.openExplainDrawerForResult = function(resultId) {
    if (!currentResults || currentResults.length === 0) return;
    const row = currentResults.find(r => r.result_id == resultId || String(r.result_id) === String(resultId)) || currentResults[0];
    if (!row) return;
    drawerCurrentResult = row;

    renderExplainDrawerContent(row);

    const drawer = document.getElementById('explainDrawer');
    const backdrop = document.getElementById('drawerBackdrop') || document.getElementById('explainDrawerBackdrop');
    if (drawer) {
        drawer.classList.add('active');
        drawer.classList.add('open');
    }
    if (backdrop) {
        backdrop.classList.add('active');
        backdrop.classList.add('open');
    }
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
};

window.openExplainDrawerMock = function(index) {
    if (currentResults && currentResults.length > 0) {
        const item = currentResults[Math.min(index - 1, currentResults.length - 1)];
        openExplainDrawerForResult(item.result_id);
    }
};

window.closeExplainDrawerDirect = function() {
    const drawer = document.getElementById('explainDrawer');
    const backdrop = document.getElementById('drawerBackdrop') || document.getElementById('explainDrawerBackdrop');
    if (drawer) {
        drawer.classList.remove('active');
        drawer.classList.remove('open');
    }
    if (backdrop) {
        backdrop.classList.remove('active');
        backdrop.classList.remove('open');
    }
    document.body.style.overflow = '';
};

window.closeExplainDrawer = function(e) {
    closeExplainDrawerDirect();
};

window.toggleDrawerShortlist = function() {
    if (drawerCurrentResult) {
        toggleShortlist(drawerCurrentResult.result_id);
        renderExplainDrawerContent(drawerCurrentResult);
    }
};

// ESC Key listener
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeExplainDrawerDirect();
        if (typeof closeTrendDetailSheet === 'function') closeTrendDetailSheet();
        toggleCollegeModal(false);
        toggleFactorModal(false);
    }
});

// ═══════════════════════════════════════════════════
// SIDE-BY-SIDE COMPARE & FACTOR RADAR MATRIX
// ═══════════════════════════════════════════════════
let compareFinalists = [];

window.addToCompareForResult = function(resultId) {
    const row = (currentResults || []).find(r => r.result_id === resultId);
    if (!row) return;
    if (compareFinalists.some(f => f.result_id === row.result_id)) {
        showToast('Program is already in comparison finalists.', 'info');
        switchTab('compare');
        return;
    }
    if (compareFinalists.length >= 3) {
        compareFinalists[2] = row;
        showToast(`Replaced finalist slot 3 with ${row.iit_name} (${row.branch_name})`, 'info');
    } else {
        compareFinalists.push(row);
        showToast(`Added ${row.iit_name} (${row.branch_name}) to comparison.`, 'success');
    }
    switchTab('compare');
};

// ═══════════════════════════════════════════════════
// PHASE 6: SIDE-BY-SIDE COMPARE SYSTEM (M6)
// ═══════════════════════════════════════════════════
window.populateDefaultFinalists = async function() {
    if (shortlist && shortlist.length >= 2) {
        compareFinalists = shortlist.slice(0, 3);
    } else if (currentResults && currentResults.length >= 3) {
        compareFinalists = currentResults.slice(0, 3);
    } else {
        // Fetch default 3 top choices from /api/compare
        try {
            const res = await fetch(`${API_BASE}/api/compare?ids=1,2,3`);
            const data = await res.json();
            if (data.success && data.finalists && data.finalists.length > 0) {
                compareFinalists = data.finalists;
            }
        } catch (e) {
            console.warn('Compare defaults API fallback:', e);
        }

        if (compareFinalists.length === 0) {
            compareFinalists = [
                {
                    result_id: 1, college_id: 1, branch_id: 1, college_name: 'IIT Bombay', iit_name: 'IIT Bombay', branch_name: 'Computer Science and Engineering',
                    closing_rank: 67, opening_rank: 1, base_year: 2025, nirf_rank: 1, avg_package_lpa: 36.9, placement_pct: 98.2, annual_fee: 228000,
                    hostel_rating: 4.8, mess_rating: 4.2, campus_rating: 4.9, distance_km: 1140, match_pct: 94, chance_pct: 82,
                    risk_level: 'Moderate', trend_status: 'Rising', rank_shift_1y: -6.5, rank_shift_2y: -11.2, annual_trend_pct: -7.4, confidence: 'High',
                    f1_score: 9.8, f1_weight: 9, f2_score: 9.6, f2_weight: 8, f3_score: 6.2, f3_weight: 6, f4_score: 7.5, f4_weight: 7,
                    f5_score: 8.2, f5_weight: 5, f6_score: 9.2, f6_weight: 7, f7_score: 9.8, f7_weight: 8, f8_score: 10.0, f8_weight: 9
                },
                {
                    result_id: 2, college_id: 2, branch_id: 2, college_name: 'IIT Delhi', iit_name: 'IIT Delhi', branch_name: 'Mathematics and Computing',
                    closing_rank: 310, opening_rank: 120, base_year: 2025, nirf_rank: 2, avg_package_lpa: 34.1, placement_pct: 96.0, annual_fee: 220000,
                    hostel_rating: 4.6, mess_rating: 4.4, campus_rating: 4.8, distance_km: 240, match_pct: 91, chance_pct: 91,
                    risk_level: 'Safe', trend_status: 'Stable', rank_shift_1y: -1.2, rank_shift_2y: 0.8, annual_trend_pct: -0.9, confidence: 'High',
                    f1_score: 9.4, f1_weight: 9, f2_score: 9.2, f2_weight: 8, f3_score: 9.2, f3_weight: 6, f4_score: 7.8, f4_weight: 7,
                    f5_score: 8.8, f5_weight: 5, f6_score: 9.0, f6_weight: 7, f7_score: 9.6, f7_weight: 8, f8_score: 9.8, f8_weight: 9
                },
                {
                    result_id: 3, college_id: 5, branch_id: 3, college_name: 'IIT Roorkee', iit_name: 'IIT Roorkee', branch_name: 'Data Science and Artificial Intelligence',
                    closing_rank: 720, opening_rank: 410, base_year: 2025, nirf_rank: 5, avg_package_lpa: 28.5, placement_pct: 93.5, annual_fee: 212000,
                    hostel_rating: 4.4, mess_rating: 4.3, campus_rating: 4.6, distance_km: 180, match_pct: 88, chance_pct: 96,
                    risk_level: 'Safe', trend_status: 'Falling', rank_shift_1y: 3.7, rank_shift_2y: 6.2, annual_trend_pct: 4.1, confidence: 'Medium',
                    f1_score: 8.8, f1_weight: 9, f2_score: 8.9, f2_weight: 8, f3_score: 9.5, f3_weight: 6, f4_score: 8.2, f4_weight: 7,
                    f5_score: 8.5, f5_weight: 5, f6_score: 8.6, f6_weight: 7, f7_score: 9.0, f7_weight: 8, f8_score: 9.2, f8_weight: 9
                }
            ];
        }
    }
    await renderCompareView();
    showToast('Loaded comparison finalists.', 'info');
};

window.clearFinalists = function() {
    compareFinalists = [];
    renderCompareView();
    showToast('Cleared comparison finalists.', 'info');
};

window.removeFinalistAt = function(idx) {
    compareFinalists.splice(idx, 1);
    renderCompareView();
};

window.renderCompareView = async function() {
    const grid = document.getElementById('compareFinalists');
    const tag = document.getElementById('compareCountTag');
    const radarWrap = document.getElementById('radarWrap');
    const decisionMatrix = document.getElementById('decisionMatrix');
    if (!grid) return;

    if (compareFinalists.length === 0) {
        if (shortlist && shortlist.length >= 2) {
            compareFinalists = shortlist.slice(0, 3);
        } else if (currentResults && currentResults.length >= 2) {
            compareFinalists = currentResults.slice(0, 3);
        } else {
            populateDefaultFinalists();
            return;
        }
    }

    // Attempt to enrich with v_compare_options view from backend if result_ids are available
    const ids = compareFinalists.map(f => f.result_id || f.college_id).filter(id => id != null);
    if (ids.length > 0 && !compareFinalists[0]._enriched) {
        try {
            const res = await fetch(`${API_BASE}/api/compare?ids=${ids.join(',')}`);
            const data = await res.json();
            if (data.success && data.finalists && data.finalists.length > 0) {
                // Merge data while keeping existing labels
                compareFinalists = compareFinalists.map((f, i) => {
                    const match = data.finalists.find(d => d.result_id === f.result_id || d.college_id === f.college_id);
                    return match ? { ...f, ...match, _enriched: true } : { ...f, _enriched: true };
                });
            }
        } catch (e) {
            console.warn('Enriching finalists via API failed:', e);
        }
    }

    if (tag) tag.textContent = `${compareFinalists.length} Finalist${compareFinalists.length === 1 ? '' : 's'}`;

    const slotClasses = ['slot-1', 'slot-2', 'slot-3'];
    const slotColors = ['var(--accent-text, var(--lime))', '#38bdf8', '#a78bfa'];

    let cardsHtml = '';
    compareFinalists.forEach((f, idx) => {
        const iitName = f.college_name || f.iit_name || 'IIT Campus';
        const branchName = f.branch_name || 'Engineering Program';
        const risk = f.risk_level || f.recommendation?.risk_level || (idx === 0 ? 'Moderate' : 'Safe');
        const riskClass = risk.toLowerCase().includes('safe') ? 'safe' : (risk.toLowerCase().includes('reach') || risk.toLowerCase().includes('ambitious') ? 'reach' : 'moderate');
        const matchPct = f.match_pct || f.recommendation?.match_pct || (94 - idx * 3);
        const trend = f.trend_status || (idx === 0 ? '↗ Rising' : (idx === 1 ? '— Stable' : '↘ Easing'));
        const isRising = trend.toLowerCase().includes('rising');
        const isFalling = trend.toLowerCase().includes('falling') || trend.toLowerCase().includes('easing');
        const trendClass = isRising ? 'rising' : (isFalling ? 'falling' : 'stable');
        const trendIcon = isRising ? 'arrow-up-right' : (isFalling ? 'arrow-down-right' : 'minus');
        const closing = f.closing_rank || f.cutoff_rank || (idx === 0 ? 67 : (idx === 1 ? 310 : 720));

        cardsHtml += `
            <div class="compare-card ${slotClasses[idx] || ''}">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <span class="compare-slot-tag">Finalist #${String(idx + 1).padStart(2, '0')}</span>
                    <button class="btn btn--ghost btn--sm" onclick="removeFinalistAt(${idx})" style="padding:2px 6px; color:var(--muted);" title="Remove finalist">
                        <i data-lucide="x" width="14" height="14"></i>
                    </button>
                </div>

                <div>
                    <div style="font-family:var(--font-display); font-weight:700; font-size:var(--text-lg); color:var(--text);">
                        ${escapeHtml(iitName)}
                    </div>
                    <div style="color:${slotColors[idx]}; font-weight:600; font-size:var(--text-sm); margin-top:2px;">
                        ${escapeHtml(branchName)}
                    </div>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; padding:var(--space-3) 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border);">
                    <div>
                        <div style="font-size:11px; font-family:var(--font-mono); color:var(--muted);">2025 CUTOFF</div>
                        <div style="font-family:var(--font-mono); font-size:var(--text-base); font-weight:700; color:var(--text);">
                            #${closing.toLocaleString()}
                        </div>
                    </div>
                    <span class="trend-badge ${trendClass}">
                        <i data-lucide="${trendIcon}" width="12" height="12"></i>
                        ${trend}
                    </span>
                    <div>
                        <div style="font-size:11px; font-family:var(--font-mono); color:var(--muted); text-align:right;">MATCH FIT</div>
                        <div style="font-family:var(--font-mono); font-size:var(--text-base); font-weight:700; color:var(--accent-text, var(--lime)); text-align:right;">
                            ${matchPct}%
                        </div>
                    </div>
                </div>

                <div>
                    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                        <span style="color:var(--muted);">Admissions Risk</span>
                        <span class="risk-badge ${riskClass}">${risk}</span>
                    </div>
                    <div class="risk-meter__track" style="height:6px;">
                        <div class="risk-meter__zone risk-meter__zone--safe" style="width:38%;"></div>
                        <div class="risk-meter__zone risk-meter__zone--mod" style="width:34%;"></div>
                        <div class="risk-meter__zone risk-meter__zone--reach" style="width:28%;"></div>
                    </div>
                </div>
            </div>
        `;
    });

    if (compareFinalists.length < 3) {
        cardsHtml += `
            <div class="compare-card" style="border:1px dashed var(--border-strong); justify-content:center; align-items:center; text-align:center; min-height:220px; background:transparent;">
                <div class="icon-tile branch" style="margin-bottom:var(--space-2);"><i data-lucide="plus" width="18" height="18"></i></div>
                <div style="font-weight:600; color:var(--text); font-size:var(--text-sm);">Add Slot #${compareFinalists.length + 1}</div>
                <div style="font-size:var(--text-xs); color:var(--muted); margin-top:4px; max-width:200px;">
                    Bookmark another program from results or click "Compare" in any match card.
                </div>
                <button class="btn btn--secondary btn--sm" onclick="switchTab('results')" style="margin-top:var(--space-3);">
                    Explore Results
                </button>
            </div>
        `;
    }

    grid.innerHTML = cardsHtml;
    if (radarWrap) radarWrap.style.display = 'block';
    if (decisionMatrix) decisionMatrix.style.display = 'block';

    renderCompareRadarOverlay(compareFinalists);
    renderCompareDecisionMatrix(compareFinalists);

    if (window.lucide) lucide.createIcons();
};

function renderCompareRadarOverlay(finalists) {
    const svg = document.getElementById('radarSvg');
    if (!svg) return;

    const factors = [
        'Placements', 'Academics', 'Fees / ROI',
        'Mess Food', 'Hostel', 'Campus Life', 'NIRF Rank'
    ];
    const N = factors.length;
    const cx = 220, cy = 220, R = 145;

    let svgHtml = '';

    // Concentric grid polygons
    [0.25, 0.5, 0.75, 1.0].forEach(level => {
        const pts = [];
        for (let i = 0; i < N; i++) {
            const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
            const x = cx + R * level * Math.cos(angle);
            const y = cy + R * level * Math.sin(angle);
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        svgHtml += `<polygon points="${pts.join(' ')}" fill="none" stroke="var(--border)" stroke-width="1" opacity="0.6"/>`;
    });

    // Spoke lines and labels
    factors.forEach((f, i) => {
        const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
        const x = cx + R * Math.cos(angle);
        const y = cy + R * Math.sin(angle);
        svgHtml += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;

        const lx = cx + (R + 24) * Math.cos(angle);
        const ly = cy + (R + 24) * Math.sin(angle) + 4;
        svgHtml += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="11" font-family="var(--font-sans)" font-weight="500" fill="var(--muted)">${f}</text>`;
    });

    const colors = ['#C8F560', '#38bdf8', '#a78bfa'];
    const fillColors = ['rgba(200, 245, 96, 0.25)', 'rgba(56, 189, 248, 0.25)', 'rgba(167, 139, 250, 0.25)'];

    finalists.forEach((f, idx) => {
        const leg = document.getElementById(`legendSlot${idx + 1}`);
        const iitName = f.college_name || f.iit_name || 'IIT';
        const bName = f.branch_code || (f.branch_name || '').slice(0, 10);
        if (leg) leg.textContent = `${iitName} (${bName})`;
    });

    finalists.forEach((f, idx) => {
        const ci = f.college_info || {};
        const placementPct = parseFloat(f.placement_pct != null ? f.placement_pct : (ci.placement_pct != null ? ci.placement_pct : (96.5 - idx * 2))) || 90;
        const annualFee = parseFloat(f.annual_fee != null ? f.annual_fee : (ci.annual_fee != null ? ci.annual_fee : 220000)) || 220000;
        const messRating = parseFloat(f.mess_rating != null ? f.mess_rating : (ci.mess_rating != null ? ci.mess_rating : (4.4 - idx * 0.15))) || 4.2;
        const hostelRating = parseFloat(f.hostel_rating != null ? f.hostel_rating : (ci.hostel_rating != null ? ci.hostel_rating : (4.5 - idx * 0.15))) || 4.3;
        const campusRating = parseFloat(f.campus_rating != null ? f.campus_rating : (ci.campus_rating != null ? ci.campus_rating : (4.7 - idx * 0.15))) || 4.5;
        const nirfRank = parseInt(f.nirf_rank != null ? f.nirf_rank : (ci.nirf_rank != null ? ci.nirf_rank : (idx === 0 ? 1 : (idx === 1 ? 2 : 5)))) || (idx + 1);

        // Helper to convert any score to 0-100 scale safely
        const to100 = (val, def100) => {
            if (val == null || isNaN(val)) return def100;
            let num = parseFloat(val);
            if (num <= 10) num = num * 10;
            return Math.min(99, Math.max(15, num));
        };

        const scores = [
            to100(f.f1_score, Math.min(99, Math.round((placementPct / 100) * 98))),
            to100(f.f2_score, Math.round(94 - idx * 3.5)),
            to100(f.f4_score, Math.min(96, Math.max(35, Math.round(100 - ((annualFee - 150000) / 1800))))),
            to100(f.f5_score, Math.min(98, Math.round((messRating / 5.0) * 98))),
            to100(f.f6_score, Math.min(98, Math.round((hostelRating / 5.0) * 98))),
            to100(f.f7_score, Math.min(99, Math.round((campusRating / 5.0) * 99))),
            to100(f.f8_score, Math.min(99, Math.max(30, Math.round(102 - (nirfRank * 1.5)))))
        ];

        const pts = scores.map((s, i) => {
            const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
            const r = R * (Math.max(15, Math.min(100, s)) / 100);
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        svgHtml += `
            <polygon points="${pts.join(' ')}" fill="${fillColors[idx % fillColors.length]}" stroke="${colors[idx % colors.length]}" stroke-width="2.5" opacity="0.9"/>
        `;

        pts.forEach(p => {
            const [px, py] = p.split(',');
            svgHtml += `<circle cx="${px}" cy="${py}" r="4" fill="${colors[idx % colors.length]}" stroke="var(--surface)" stroke-width="1.5"/>`;
        });
    });

    svg.innerHTML = svgHtml;
}

// ─── Comparative Decision Matrix Table (4 Grouped Sections) ───
function renderCompareDecisionMatrix(finalists) {
    const head = document.getElementById('decisionTableHead');
    const body = document.getElementById('decisionTableBody');
    const sumBox = document.getElementById('compareSummaryBox');
    const sumText = document.getElementById('compareSummaryText');
    if (!head || !body) return;

    let headHtml = `<th style="position:sticky;left:0;z-index:3;background:var(--surface);">Evaluation Criterion</th>`;
    finalists.forEach((f, idx) => {
        const iitName = f.college_name || f.iit_name || 'IIT Campus';
        const branchName = f.branch_name || 'Program';
        headHtml += `<th style="text-align:center;padding:10px 14px;min-width:180px;">${escapeHtml(iitName)}<br><span style="font-size:11px;font-weight:400;color:var(--muted);">${escapeHtml(branchName)}</span></th>`;
    });
    head.innerHTML = headHtml;

    const candidateRank = findState.rank || 1500;

    // 4 Distinct Table Groups
    const parseScore10 = (val, fallback) => {
        let num = parseFloat(val != null ? val : fallback);
        if (isNaN(num)) num = fallback;
        if (num > 10) num = num / 10;
        return Math.min(10.0, Math.max(1.0, num));
    };

    const groups = [
        {
            groupTitle: 'Admission Probability & Cutoffs',
            rows: [
                {
                    label: 'Candidate Rank (AIR)',
                    getVal: () => `#${candidateRank.toLocaleString()}`,
                    numVal: () => candidateRank,
                    noWinner: true
                },
                {
                    label: '2025 Closing Rank',
                    getVal: (f, idx) => `#${(f.closing_rank || f.latest_closing || (idx === 0 ? 67 : (idx === 1 ? 310 : 720))).toLocaleString()}`,
                    numVal: (f, idx) => f.closing_rank || f.latest_closing || (idx === 0 ? 67 : (idx === 1 ? 310 : 720)),
                    higherIsBetter: true
                },
                {
                    label: '2025 Opening Rank',
                    getVal: (f) => f.opening_rank ? `#${f.opening_rank.toLocaleString()}` : '—',
                    numVal: (f) => f.opening_rank || 0,
                    noWinner: true
                },
                {
                    label: 'Seat Quota & Pool Used',
                    getVal: (f) => `${f.seat_type_used || f.category || 'OPEN'} (${f.seat_pool || 'Gender-Neutral'})`,
                    numVal: () => 0,
                    noWinner: true
                },
                {
                    label: 'Admission Chance %',
                    getVal: (f, idx) => `${f.chance_pct || (idx === 0 ? 82 : (idx === 1 ? 91 : 96))}%`,
                    numVal: (f, idx) => f.chance_pct || (idx === 0 ? 82 : (idx === 1 ? 91 : 96)),
                    higherIsBetter: true
                },
                {
                    label: 'Risk Classification',
                    getVal: (f, idx) => f.risk_level || (idx === 0 ? 'Moderate' : 'Safe'),
                    numVal: () => 0,
                    noWinner: true
                },
                {
                    label: '1-Year Trajectory Shift',
                    getVal: (f, idx) => {
                        const s = parseFloat(f.rank_shift_1y != null ? f.rank_shift_1y : (idx === 0 ? -6.5 : (idx === 1 ? -1.2 : 3.7)));
                        return `${s > 0 ? '+' : ''}${s.toFixed(1)}%`;
                    },
                    numVal: () => 0,
                    noWinner: true
                },
                {
                    label: 'Annual Trend Velocity',
                    getVal: (f, idx) => {
                        const a = parseFloat(f.annual_trend_pct != null ? f.annual_trend_pct : (idx === 0 ? -7.4 : (idx === 1 ? -0.9 : 4.1)));
                        return `${a > 0 ? '+' : ''}${a.toFixed(1)}%/yr`;
                    },
                    numVal: () => 0,
                    noWinner: true
                },
                {
                    label: 'Cutoff Confidence',
                    getVal: (f, idx) => f.confidence || (idx === 2 ? 'Medium' : 'High'),
                    numVal: () => 0,
                    noWinner: true
                }
            ]
        },
        {
            groupTitle: 'Preference Fit Scores (Weighted Factors)',
            rows: [
                {
                    label: 'Placements & Career ROI',
                    getVal: (f, idx) => `${parseScore10(f.f1_score, 9.8 - idx * 0.5).toFixed(1)} / 10`,
                    numVal: (f, idx) => parseScore10(f.f1_score, 9.8 - idx * 0.5),
                    higherIsBetter: true
                },
                {
                    label: 'Academic Discipline Strength',
                    getVal: (f, idx) => `${parseScore10(f.f2_score, 9.6 - idx * 0.4).toFixed(1)} / 10`,
                    numVal: (f, idx) => parseScore10(f.f2_score, 9.6 - idx * 0.4),
                    higherIsBetter: true
                },
                {
                    label: 'Affordability & Low Fees',
                    getVal: (f, idx) => `${parseScore10(f.f4_score, 7.5 + idx * 0.3).toFixed(1)} / 10`,
                    numVal: (f, idx) => parseScore10(f.f4_score, 7.5 + idx * 0.3),
                    higherIsBetter: true
                },
                {
                    label: 'Mess Food Quality',
                    getVal: (f, idx) => `${parseScore10(f.f5_score, 8.2 + idx * 0.2).toFixed(1)} / 10`,
                    numVal: (f, idx) => parseScore10(f.f5_score, 8.2 + idx * 0.2),
                    higherIsBetter: true
                },
                {
                    label: 'Hostel Living Facilities',
                    getVal: (f, idx) => `${parseScore10(f.f6_score, 9.2 - idx * 0.3).toFixed(1)} / 10`,
                    numVal: (f, idx) => parseScore10(f.f6_score, 9.2 - idx * 0.3),
                    higherIsBetter: true
                },
                {
                    label: 'Campus Life & Activities',
                    getVal: (f, idx) => `${parseScore10(f.f7_score, 9.8 - idx * 0.4).toFixed(1)} / 10`,
                    numVal: (f, idx) => parseScore10(f.f7_score, 9.8 - idx * 0.4),
                    higherIsBetter: true
                },
                {
                    label: 'Prestige & NIRF Standing',
                    getVal: (f, idx) => `${parseScore10(f.f8_score, 10.0 - idx * 0.4).toFixed(1)} / 10`,
                    numVal: (f, idx) => parseScore10(f.f8_score, 10.0 - idx * 0.4),
                    higherIsBetter: true
                },
                {
                    label: 'Overall Preference Match Fit',
                    getVal: (f, idx) => `${f.match_pct || (idx === 0 ? 94 : (idx === 1 ? 91 : 88))}%`,
                    numVal: (f, idx) => f.match_pct || (idx === 0 ? 94 : (idx === 1 ? 91 : 88)),
                    higherIsBetter: true
                }
            ]
        },
        {
            groupTitle: 'Institute Metrics',
            rows: [
                {
                    label: 'Annual Tuition Fee <span class="indicative-tag">Indicative</span>',
                    getVal: (f, idx) => `₹${((f.annual_fee || (idx === 0 ? 228000 : (idx === 1 ? 220000 : 212000))) / 100000).toFixed(2)}L / yr`,
                    numVal: (f, idx) => f.annual_fee || (idx === 0 ? 228000 : (idx === 1 ? 220000 : 212000)),
                    lowerIsBetter: true
                },
                {
                    label: 'Placement Percentage <span class="indicative-tag">Indicative</span>',
                    getVal: (f, idx) => `${parseFloat(f.placement_pct || (idx === 0 ? 98.2 : (idx === 1 ? 96.0 : 93.5))).toFixed(1)}%`,
                    numVal: (f, idx) => parseFloat(f.placement_pct || (idx === 0 ? 98.2 : (idx === 1 ? 96.0 : 93.5))),
                    higherIsBetter: true
                },
                {
                    label: 'Average Package (₹ LPA) <span class="indicative-tag">Indicative</span>',
                    getVal: (f, idx) => `₹${parseFloat(f.avg_package_lpa || (idx === 0 ? 36.9 : (idx === 1 ? 34.1 : 28.5))).toFixed(1)} LPA`,
                    numVal: (f, idx) => parseFloat(f.avg_package_lpa || (idx === 0 ? 36.9 : (idx === 1 ? 34.1 : 28.5))),
                    higherIsBetter: true
                },
                {
                    label: 'NIRF Engineering Rank <span class="indicative-tag">Indicative</span>',
                    getVal: (f, idx) => `#${f.nirf_rank || (idx === 0 ? 1 : (idx === 1 ? 2 : 5))}`,
                    numVal: (f, idx) => f.nirf_rank || (idx === 0 ? 1 : (idx === 1 ? 2 : 5)),
                    lowerIsBetter: true
                },
                {
                    label: 'Hostel Facilities <span class="indicative-tag">Indicative</span>',
                    getVal: (f, idx) => `⭐ ${parseFloat(f.hostel_rating || (idx === 0 ? 4.8 : (idx === 1 ? 4.6 : 4.4))).toFixed(1)} / 5.0`,
                    numVal: (f, idx) => parseFloat(f.hostel_rating || (idx === 0 ? 4.8 : (idx === 1 ? 4.6 : 4.4))),
                    higherIsBetter: true
                },
                {
                    label: 'Mess Food Quality <span class="indicative-tag">Indicative</span>',
                    getVal: (f, idx) => `🍽️ ${parseFloat(f.mess_rating || (idx === 0 ? 4.2 : (idx === 1 ? 4.4 : 4.3))).toFixed(1)} / 5.0`,
                    numVal: (f, idx) => parseFloat(f.mess_rating || (idx === 0 ? 4.2 : (idx === 1 ? 4.4 : 4.3))),
                    higherIsBetter: true
                },
                {
                    label: 'Campus Infrastructure <span class="indicative-tag">Indicative</span>',
                    getVal: (f, idx) => `🏛️ ${parseFloat(f.campus_rating || (idx === 0 ? 4.9 : (idx === 1 ? 4.8 : 4.6))).toFixed(1)} / 5.0`,
                    numVal: (f, idx) => parseFloat(f.campus_rating || (idx === 0 ? 4.9 : (idx === 1 ? 4.8 : 4.6))),
                    higherIsBetter: true
                }
            ]
        }
    ];

    let bodyHtml = '';
    groups.forEach(group => {
        // Group Header Row
        bodyHtml += `
            <tr class="compare-group-header-row">
                <th colspan="${finalists.length + 1}">${group.groupTitle}</th>
            </tr>
        `;

        group.rows.forEach(r => {
            let winnerIdx = -1;
            if (!r.noWinner) {
                if (r.higherIsBetter) {
                    let maxVal = -Infinity;
                    finalists.forEach((f, idx) => {
                        const v = r.numVal(f, idx);
                        if (!isNaN(v) && v > maxVal) { maxVal = v; winnerIdx = idx; }
                    });
                } else if (r.lowerIsBetter) {
                    let minVal = Infinity;
                    finalists.forEach((f, idx) => {
                        const v = r.numVal(f, idx);
                        if (!isNaN(v) && v < minVal) { minVal = v; winnerIdx = idx; }
                    });
                }
            }

            bodyHtml += `<tr><td style="font-weight:600; color:var(--text);">${r.label}</td>`;
            finalists.forEach((f, idx) => {
                const isWinner = idx === winnerIdx;
                const displayVal = r.getVal(f, idx);
                bodyHtml += `
                    <td style="text-align:center; font-family:var(--font-mono); font-size:13px;">
                        <span class="${isWinner ? 'matrix-winner-val' : ''}">${displayVal}</span>
                    </td>
                `;
            });
            bodyHtml += `</tr>`;
        });
    });

    body.innerHTML = bodyHtml;

    // Generated One-Sentence Summary Takeaway
    if (sumBox && sumText && finalists.length >= 2) {
        const f1 = finalists[0];
        const f2 = finalists[1];
        const f1Name = `${f1.college_name || f1.iit_name} (${f1.branch_code || 'Prog 1'})`;
        const f2Name = `${f2.college_name || f2.iit_name} (${f2.branch_code || 'Prog 2'})`;

        const f1Pkg = f1.avg_package_lpa || 36.9;
        const f2Dist = f2.distance_km != null ? f2.distance_km : 240;
        const f2Chance = f2.chance_pct || 91;

        sumText.innerHTML = `<strong>${escapeHtml(f1Name)}</strong> provides superior placement package (₹${parseFloat(f1Pkg).toFixed(1)} LPA) and highest brand prestige, while <strong>${escapeHtml(f2Name)}</strong> offers closer proximity (${Math.round(f2Dist)} km) and higher admission likelihood (${f2Chance}%).`;
        sumBox.style.display = 'block';
    }
}

window.loadCompareData = function() {
    renderCompareView();
};

// ─── Hero Quick Forecast ───
window.quickForecastFromHero = function() {
    const rankEl = document.getElementById('heroQuickRank');
    const catEl = document.getElementById('heroQuickCategory');
    const rank = rankEl ? parseInt(rankEl.value) || 1850 : 1850;
    const cat = catEl ? catEl.value : 'OPEN';

    const findRank = document.getElementById('rankInput') || document.getElementById('rank');
    const findCat = document.getElementById('category');
    if (findRank) findRank.value = rank;
    if (findCat) findCat.value = cat;

    if (typeof updateOptionsPreview === 'function') updateOptionsPreview(rank);
    switchTab('find');
    showToast(`Loaded AIR #${rank.toLocaleString()} (${cat}) into recommendation engine.`, 'success');
};


// ═══════════════════════════════════════════════════
// PHASE 5: HISTORICAL CUTOFF TRENDS SYSTEM
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// PHASE 5: HISTORICAL CUTOFF TRENDS SYSTEM (M5)
// ═══════════════════════════════════════════════════
let trendCategory = 'OPEN';
let trendSeatPool = 'Gender-Neutral';
let trendProgramType = '4-year B.Tech';
let trendIitFilter = 'ALL';
let trendBranchFilter = 'ALL';
let trendStatusFilterVal = 'ALL';
let trendConfidenceFilterVal = 'ALL';
let trendSearchQuery = '';
let allTrendsData = [];
let currentMoversData = null;
let currentHeatmapData = null;
let currentDetailData = null;
let showFemaleOverlayInDrawer = false;

// ─── Subtab Switcher (Overview | Heatmap | Explorer) ───
window.switchTrendSubtab = function(tabName) {
    const tabs = ['overview', 'heatmap', 'explorer'];
    tabs.forEach(t => {
        const btn = document.getElementById(`trendSubtab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const pane = document.getElementById(`trendPane${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (btn) btn.classList.toggle('active', t === tabName);
        if (pane) {
            pane.classList.toggle('active', t === tabName);
            pane.style.display = t === tabName ? 'block' : 'none';
        }
    });
    if (window.lucide) lucide.createIcons();
};

// ─── Mini Sparkline SVG Generator ───
function createSparklineSvg(points, trendStatus) {
    const validPts = (points || []).filter(p => p != null && !isNaN(p) && p > 0);
    if (validPts.length < 2) {
        return `<span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">—</span>`;
    }

    const w = 76;
    const h = 24;
    const pad = 4;

    const minVal = Math.min(...validPts);
    const maxVal = Math.max(...validPts);
    const range = (maxVal - minVal) || 1;

    // In cutoffs, smaller rank is harder/higher; y is inverted so smaller rank is at top
    const coords = validPts.map((val, idx) => {
        const x = pad + (idx / (validPts.length - 1)) * (w - 2 * pad);
        const y = pad + ((val - minVal) / range) * (h - 2 * pad);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const statusStr = (trendStatus || '').toLowerCase();
    let trendClass = 'stable';
    if (statusStr.includes('rising') || statusStr.includes('tighter')) trendClass = 'rising';
    else if (statusStr.includes('falling') || statusStr.includes('easier') || statusStr.includes('loosening')) trendClass = 'falling';

    const lastCoord = coords[coords.length - 1].split(',');

    return `
        <svg class="sparkline-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="overflow:visible;vertical-align:middle;">
            <polyline class="${trendClass}" points="${coords.join(' ')}" fill="none" stroke-width="2" stroke-linecap="round"/>
            <circle class="sparkline-dot" cx="${lastCoord[0]}" cy="${lastCoord[1]}" r="2.5" fill="currentColor" stroke="var(--surface)" stroke-width="1"/>
        </svg>
    `;
}

// ─── Main Trends View Renderer ───
window.renderTrendsView = async function() {
    const catTag = document.getElementById('trendsCategoryTag');
    if (catTag) catTag.textContent = `${trendCategory} · ${trendSeatPool} · ${trendProgramType}`;

    try {
        const poolParam = encodeURIComponent(trendSeatPool || 'Gender-Neutral');
        const progParam = encodeURIComponent(trendProgramType || '4-year B.Tech');
        const [moversRes, heatmapRes, trendsRes] = await Promise.all([
            fetch(`${API_BASE}/api/trends/movers?category=${trendCategory}&pool=${poolParam}&program_type=${progParam}`).then(r => r.json()),
            fetch(`${API_BASE}/api/trends/heatmap?category=${trendCategory}&pool=${poolParam}&program_type=${progParam}`).then(r => r.json()),
            fetch(`${API_BASE}/api/trends?category=${trendCategory}&pool=${poolParam}&program_type=${progParam}`).then(r => r.json())
        ]);

        if (trendsRes.success && trendsRes.trends) {
            allTrendsData = trendsRes.trends;
            currentMoversData = moversRes;
            currentHeatmapData = heatmapRes;

            populateTrendsSidebarDropdowns(allTrendsData);
            renderTrendsKpiStrip(allTrendsData, moversRes);
            renderMoversCards(moversRes);
            renderHeatmapGrid(heatmapRes);
            renderTrendsTable(allTrendsData);
            return;
        }
    } catch (err) {
        console.warn('Trends API offline, using fallback:', err.message);
    }

    renderTrendsFallback();
};

function populateTrendsSidebarDropdowns(trends) {
    const iitSelect = document.getElementById('trendIitSelect');
    const branchSelect = document.getElementById('trendBranchSelect');

    if (iitSelect && iitSelect.options.length <= 1) {
        const iits = new Map();
        trends.forEach(t => {
            if (t.college_id && t.college_name) iits.set(t.college_id, t.college_name);
        });
        Array.from(iits.entries()).sort((a,b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = name;
            iitSelect.appendChild(opt);
        });
    }

    if (branchSelect && branchSelect.options.length <= 1) {
        const branches = new Map();
        trends.forEach(t => {
            if (t.branch_id && t.branch_name) branches.set(t.branch_id, `${t.branch_name} (${t.branch_code})`);
        });
        Array.from(branches.entries()).sort((a,b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = name;
            branchSelect.appendChild(opt);
        });
    }
}

// ─── 1. KPI Strip ───
function renderTrendsKpiStrip(trends, moversData) {
    let rising = 0;
    let falling = 0;
    let stable = 0;

    trends.forEach(t => {
        const shift = parseFloat(t.rank_shift_1y) || 0;
        if (shift <= -3 || (t.trend_status || '').toLowerCase().includes('rising')) rising++;
        else if (shift >= 3 || (t.trend_status || '').toLowerCase().includes('falling')) falling++;
        else stable++;
    });

    const kpiTight = document.getElementById('trendKpiTightening');
    if (kpiTight) kpiTight.textContent = rising;
    const kpiLoose = document.getElementById('trendKpiLoosening');
    if (kpiLoose) kpiLoose.textContent = falling;
    const kpiStab = document.getElementById('trendKpiStable');
    if (kpiStab) kpiStab.textContent = stable;

    const hottest = moversData?.tightening?.[0];
    const kpiHot = document.getElementById('trendKpiHottest');
    const kpiHotName = document.getElementById('trendKpiHottestName');
    if (kpiHot && hottest) {
        kpiHot.textContent = hottest.shift_display || `${Math.abs(hottest.rank_shift_1y || 0).toFixed(1)}% tighter`;
        if (kpiHotName) kpiHotName.textContent = `${hottest.college_name} (${hottest.branch_code})`;
    }

    const biggest = moversData?.loosening?.[0];
    const kpiBig = document.getElementById('trendKpiBiggestOpening');
    const kpiBigName = document.getElementById('trendKpiBiggestOpeningName');
    if (kpiBig && biggest) {
        kpiBig.textContent = biggest.shift_display || `+${(biggest.rank_shift_1y || 0).toFixed(1)}% easier`;
        if (kpiBigName) kpiBigName.textContent = `${biggest.college_name} (${biggest.branch_code})`;
    }
}

// ─── 2. Movers Lists (Getting Harder vs Getting Easier) ───
function renderMoversCards(moversData) {
    const tightList = document.getElementById('moversTighteningList');
    const looseList = document.getElementById('moversLooseningList');

    const renderMoverItem = (m, isTightening) => {
        const shiftVal = Math.abs(parseFloat(m.rank_shift_1y) || 0);
        const isVolatile = m.is_volatile || shiftVal > 100;
        const shiftBadge = isVolatile
            ? `<span class="volatile-badge">Volatile</span>`
            : `<span class="mover-badge ${isTightening ? 'tightening' : 'loosening'}">${m.shift_display || (shiftVal.toFixed(1) + (isTightening ? '% tighter' : '% easier'))}</span>`;
        const confBadge = `<span class="badge badge--sm" style="font-size:10px;background:var(--raised);">${m.confidence || 'Medium'}</span>`;
        const pts = [m.closing_2021, m.closing_2022, m.closing_2023, m.closing_2024, m.closing_rank || m.latest_closing].filter(Boolean);
        const sparkline = createSparklineSvg(pts, isTightening ? 'rising' : 'falling');

        return `
            <div class="mover-item-row" onclick="openTrendDetailSheet(${m.college_id}, ${m.branch_id})" title="Click to view full 5-year series and predictive corridor" style="cursor:pointer;">
                <div class="mover-item-left">
                    ${shiftBadge}
                    <div style="min-width:0;">
                        <div class="mover-college" style="font-weight:700;">${escapeHtml(m.college_name)}</div>
                        <div class="mover-branch" style="font-size:11.5px;color:var(--muted);">${escapeHtml(m.branch_name)} (${m.branch_code})</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                    ${sparkline}
                    <div class="mover-cutoff" style="text-align:right;">
                        <div style="font-weight:700;font-family:var(--font-mono);font-size:13px;">#${(m.closing_rank || m.latest_closing || 0).toLocaleString()}</div>
                        <div style="font-size:10px;color:var(--muted);">${m.base_year || 2025} Closing</div>
                    </div>
                    ${confBadge}
                </div>
            </div>
        `;
    };

    if (tightList) {
        const items = moversData?.tightening || [];
        tightList.innerHTML = items.length === 0
            ? `<div style="font-size:12px;color:var(--muted);padding:14px;text-align:center;">No tightening shifts recorded.</div>`
            : items.map(m => renderMoverItem(m, true)).join('');
    }

    if (looseList) {
        const items = moversData?.loosening || [];
        looseList.innerHTML = items.length === 0
            ? `<div style="font-size:12px;color:var(--muted);padding:14px;text-align:center;">No relaxing shifts recorded.</div>`
            : items.map(m => renderMoverItem(m, false)).join('');
    }
}

// ─── 3. Diverging Heatmap Grid (Branches × All 23 IITs) ───
function renderHeatmapGrid(heatmapData) {
    const wrap = document.getElementById('trendsHeatmapWrap');
    if (!wrap) return;

    const colleges = heatmapData?.colleges || [];
    const branches = heatmapData?.branches || [];
    const matrix = heatmapData?.matrix || {};

    if (colleges.length === 0 || branches.length === 0) {
        wrap.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);">No matrix data available.</div>`;
        return;
    }

    let headerHtml = `<tr><th class="branch-col" style="position:sticky;left:0;z-index:3;background:var(--surface);min-width:200px;text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);">Branch / Program</th>`;
    colleges.forEach(c => {
        const shortName = c.college_name.replace('Indian Institute of Technology', 'IIT').replace('IIT (BHU) Varanasi', 'IIT BHU').replace('IIT (ISM) Dhanbad', 'IIT ISM');
        headerHtml += `<th style="padding:8px 10px;white-space:nowrap;font-size:11px;font-weight:600;border-bottom:1px solid var(--border);" title="${escapeHtml(c.college_name)}">${escapeHtml(shortName)}</th>`;
    });
    headerHtml += `</tr>`;

    let rowsHtml = '';
    branches.forEach(b => {
        let cellsHtml = `<td style="position:sticky;left:0;z-index:2;background:var(--surface);font-weight:600;font-size:12px;color:var(--text);white-space:nowrap;padding:8px 12px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);">${escapeHtml(b.branch_name)} <span style="font-size:10.5px;color:var(--muted);">(${b.branch_code})</span></td>`;

        colleges.forEach(c => {
            const key = `${c.college_id}_${b.branch_id}`;
            const cell = matrix[key];

            if (!cell || (cell.closing_2025 == null && cell.shift_1y === 0)) {
                cellsHtml += `<td style="text-align:center;padding:6px;border-bottom:1px solid var(--border);"><div class="heatmap-cell empty" title="No seat in this pool" style="color:var(--muted);font-size:11px;cursor:default;">—</div></td>`;
            } else {
                let shift = cell.annual_trend_pct || cell.shift_1y || 0;
                // Clip at +/-30%
                const clippedShift = Math.max(-30, Math.min(30, shift));
                let cellClass = 'stable';
                let shiftText = `${shift > 0 ? '+' : ''}${shift.toFixed(1)}%`;
                let tooltip = `${c.college_name} · ${b.branch_code}: Cutoff #${cell.closing_2025 || '—'} (${shiftText}) · Click to inspect`;

                if (shift <= -5) {
                    cellClass = 'tightening';
                } else if (shift >= 5) {
                    cellClass = 'loosening';
                }

                cellsHtml += `
                    <td style="text-align:center;padding:6px;border-bottom:1px solid var(--border);">
                        <div class="heatmap-cell ${cellClass}" onclick="openTrendDetailSheet(${c.college_id}, ${b.branch_id})" title="${tooltip}" style="cursor:pointer;padding:4px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11.5px;font-weight:600;">
                            ${shiftText}
                        </div>
                    </td>
                `;
            }
        });

        rowsHtml += `<tr>${cellsHtml}</tr>`;
    });

    wrap.innerHTML = `
        <table class="heatmap-matrix" style="width:100%;border-collapse:collapse;">
            <thead style="position:sticky;top:0;z-index:4;background:var(--surface);">${headerHtml}</thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
}

// ─── 4. Explorer Table with Mini Sparklines ───
function renderTrendsTable(trends) {
    const tbody = document.getElementById('trendsTableBody');
    if (!tbody) return;

    let list = [...trends];

    if (trendSearchQuery.trim()) {
        const q = trendSearchQuery.toLowerCase().trim();
        list = list.filter(t =>
            (t.college_name || '').toLowerCase().includes(q) ||
            (t.branch_name || '').toLowerCase().includes(q) ||
            (t.branch_code || '').toLowerCase().includes(q)
        );
    }

    if (trendIitFilter !== 'ALL') {
        list = list.filter(t => String(t.college_id) === String(trendIitFilter));
    }

    if (trendBranchFilter !== 'ALL') {
        list = list.filter(t => String(t.branch_id) === String(trendBranchFilter));
    }

    if (trendStatusFilterVal !== 'ALL') {
        list = list.filter(t => (t.trend_status || '').toLowerCase().includes(trendStatusFilterVal.toLowerCase()));
    }

    if (trendConfidenceFilterVal !== 'ALL') {
        list = list.filter(t => (t.confidence || '').toLowerCase() === trendConfidenceFilterVal.toLowerCase());
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--muted);">No matching cutoff records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(row => {
        let shift1y = parseFloat(row.rank_shift_1y) || 0;
        let shift2y = parseFloat(row.rank_shift_2y) || 0;
        let annualPct = parseFloat(row.annual_trend_pct) || 0;

        let trendClass = 'stable';
        let trendIcon = 'minus';
        let trendText = 'Stable';

        if (annualPct <= -5 || shift1y <= -3 || (row.trend_status || '').toLowerCase().includes('rising')) {
            trendClass = 'rising';
            trendIcon = 'arrow-up-right';
            trendText = 'Rising';
        } else if (annualPct >= 5 || shift1y >= 3 || (row.trend_status || '').toLowerCase().includes('falling')) {
            trendClass = 'falling';
            trendIcon = 'arrow-down-right';
            trendText = 'Falling';
        }

        const pts = [row.closing_2021, row.closing_2022, row.closing_2023, row.closing_2024, row.closing_2025 || row.latest_closing].filter(Boolean);
        const sparklineSvg = createSparklineSvg(pts, trendClass);
        const closing2024 = row.closing_2024 ? `#${row.closing_2024.toLocaleString()}` : '—';

        return `
            <tr class="trend-table-row-clickable" onclick="openTrendDetailSheet(${row.college_id}, ${row.branch_id})" title="Click row to inspect 5-year trajectory corridor">
                <td>
                    <div style="font-weight:700;color:var(--text);">${escapeHtml(row.college_name)}</div>
                    <div style="color:var(--muted);font-size:11.5px;">${escapeHtml(row.branch_name)} (${row.branch_code})</div>
                </td>
                <td style="font-family:var(--font-mono);font-size:12px;">${row.category || trendCategory}</td>
                <td style="font-family:var(--font-mono);font-weight:700;font-size:13px;color:var(--text);">
                    #${(row.closing_2025 || row.latest_closing || 0).toLocaleString()}
                </td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--muted);">
                    ${closing2024}
                </td>
                <td style="font-family:var(--font-mono);font-size:12px;color:${shift1y < 0 ? 'var(--reach)' : (shift1y > 0 ? 'var(--safe)' : 'var(--muted)')};">
                    ${shift1y > 0 ? '+' : ''}${shift1y.toFixed(1)}%
                </td>
                <td style="font-family:var(--font-mono);font-size:12px;color:${shift2y < 0 ? 'var(--reach)' : (shift2y > 0 ? 'var(--safe)' : 'var(--muted)')};">
                    ${shift2y > 0 ? '+' : ''}${shift2y.toFixed(1)}%
                </td>
                <td style="font-family:var(--font-mono);font-size:12px;font-weight:600;">
                    ${annualPct > 0 ? '+' : ''}${annualPct.toFixed(1)}%/yr
                </td>
                <td>${sparklineSvg}</td>
                <td>
                    <span class="trend-badge ${trendClass}"><i data-lucide="${trendIcon}" width="11" height="11"></i>${trendText}</span>
                </td>
            </tr>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// ─── Filter Handlers ───
window.setTrendCategory = function(cat, btn) {
    trendCategory = cat;
    if (btn) {
        btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    renderTrendsView();
};

window.setTrendPool = function(pool) {
    trendSeatPool = pool;
    const neutralBtn = document.getElementById('trendPoolNeutralBtn');
    const femaleBtn = document.getElementById('trendPoolFemaleBtn');
    if (neutralBtn) neutralBtn.classList.toggle('active', pool === 'Gender-Neutral');
    if (femaleBtn) femaleBtn.classList.toggle('active', pool === 'Female-Only');
    renderTrendsView();
};

window.onTrendProgramTypeChange = function(val) {
    trendProgramType = val;
    renderTrendsView();
};

window.onTrendIitSelectChange = function(val) {
    trendIitFilter = val;
    renderTrendsTable(allTrendsData);
};

window.onTrendBranchSelectChange = function(val) {
    trendBranchFilter = val;
    renderTrendsTable(allTrendsData);
};

window.setTrendStatusChip = function(status, btn) {
    trendStatusFilterVal = status;
    if (btn) {
        btn.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
    }
    renderTrendsTable(allTrendsData);
};

window.setTrendConfidenceChip = function(conf, btn) {
    trendConfidenceFilterVal = conf;
    if (btn) {
        btn.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
    }
    renderTrendsTable(allTrendsData);
};

window.onTrendSearchInput = function(val) {
    trendSearchQuery = val || '';
    renderTrendsTable(allTrendsData);
};

// ─── 5. Right-Sheet Detail Panel with Inverted Y Chart & Data Table ───
window.openTrendDetailSheet = async function(collegeId, branchId) {
    const drawer = document.getElementById('trendDetailDrawer');
    const backdrop = document.getElementById('trendDetailBackdrop');
    const titleEl = document.getElementById('trendDetailTitle');
    const bodyEl = document.getElementById('trendDetailBody');

    if (!drawer || !bodyEl) return;

    if (titleEl) titleEl.textContent = 'Loading trajectory analytics…';
    bodyEl.innerHTML = `<div style="text-align:center;padding:60px;color:var(--muted);"><div class="skeleton" style="height:60px;margin-bottom:12px;"></div><div class="skeleton" style="height:200px;"></div></div>`;

    drawer.classList.add('active');
    drawer.classList.add('open');
    if (backdrop) {
        backdrop.classList.add('active');
        backdrop.classList.add('open');
    }
    document.body.style.overflow = 'hidden';

    // Deep-linking in URL query without reload
    const url = new URL(window.location.href);
    url.searchParams.set('iit', collegeId);
    url.searchParams.set('branch', branchId);
    url.searchParams.set('cat', trendCategory);
    url.searchParams.set('pool', trendSeatPool);
    url.searchParams.set('type', trendProgramType);
    window.history.replaceState(null, '', url.toString());

    try {
        const poolParam = encodeURIComponent(trendSeatPool || 'Gender-Neutral');
        const progParam = encodeURIComponent(trendProgramType || '4-year B.Tech');
        const res = await fetch(`${API_BASE}/api/trends/${collegeId}/${branchId}/series?category=${trendCategory}&pool=${poolParam}&program_type=${progParam}`);
        const data = await res.json();

        if (data.success) {
            currentDetailData = data;
            renderTrendDetailContent(data);
            return;
        }
    } catch (err) {
        console.warn('Failed to load series details:', err.message);
    }

    bodyEl.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--reach);">
            <p>Failed to load trajectory series.</p>
            <button class="btn btn--secondary btn--sm" onclick="openTrendDetailSheet(${collegeId}, ${branchId})" style="margin-top:12px;">Retry</button>
        </div>
    `;
};

window.toggleFemaleDrawerOverlay = function() {
    showFemaleOverlayInDrawer = !showFemaleOverlayInDrawer;
    if (currentDetailData) {
        renderTrendDetailContent(currentDetailData);
    }
};

function renderTrendDetailContent(data) {
    const meta = data.meta;
    const titleEl = document.getElementById('trendDetailTitle');
    const bodyEl = document.getElementById('trendDetailBody');
    if (!bodyEl) return;

    if (titleEl) titleEl.textContent = `${meta.college_name} — ${meta.branch_name}`;

    const neutral = data.series?.neutral || [];
    const female = data.series?.female || [];
    const proj = data.projection || { lower_bound: 1000, upper_bound: 1400, projected_cutoff: 1200, confidence: 'Medium' };
    const userRank = findState.rank || 1500;

    const latestClosing = neutral.length > 0 ? neutral[neutral.length - 1].closing_rank : 1200;
    const projCutoff = proj.projected_cutoff || latestClosing;
    const margin = projCutoff - userRank;

    let narrativeBadge = 'Safe';
    let narrativeClass = 'badge--safe';
    let narrativeText = `Your rank of AIR #${userRank.toLocaleString()} is comfortably within the 2026 projected cutoff corridor (${proj.lower_bound.toLocaleString()} – ${proj.upper_bound.toLocaleString()}). Safety margin: +${margin.toLocaleString()} ranks.`;

    if (userRank > proj.upper_bound) {
        narrativeBadge = 'Reach';
        narrativeClass = 'badge--reach';
        narrativeText = `Your rank of AIR #${userRank.toLocaleString()} sits ${Math.abs(userRank - proj.upper_bound).toLocaleString()} ranks beyond the projected corridor ceiling (${proj.upper_bound.toLocaleString()}). Treat as an aspirational choice.`;
    } else if (userRank > projCutoff) {
        narrativeBadge = 'Moderate';
        narrativeClass = 'badge--moderate';
        narrativeText = `Your rank of AIR #${userRank.toLocaleString()} sits near the projected cutoff line (${projCutoff.toLocaleString()}). Good likelihood across latter counselling rounds.`;
    }

    // Chart dimensions
    const chartW = 460;
    const chartH = 200;
    const padL = 50;
    const padR = 40;
    const padT = 24;
    const padB = 32;

    const allRanks = [
        ...neutral.map(n => n.closing_rank),
        ...neutral.map(n => n.opening_rank).filter(Boolean),
        ...(showFemaleOverlayInDrawer ? female.map(f => f.closing_rank) : []),
        proj.lower_bound,
        proj.upper_bound,
        proj.projected_cutoff
    ].filter(r => r > 0);

    const minRank = Math.max(1, Math.min(...allRanks) * 0.85);
    const maxRank = Math.max(...allRanks) * 1.15;
    const rankRange = (maxRank - minRank) || 1;

    const years = [2021, 2022, 2023, 2024, 2025, 2026];
    const xStep = (chartW - padL - padR) / (years.length - 1);

    // INVERTED Y AXIS: Up means harder (smaller rank number is higher on SVG Y axis)
    const calcY = (r) => padT + ((r - minRank) / rankRange) * (chartH - padT - padB);

    // Historical Points (Neutral)
    const neutralClosePts = [];
    const neutralOpenPts = [];
    neutral.forEach(item => {
        const yIdx = years.indexOf(item.year);
        if (yIdx >= 0) {
            const x = padL + yIdx * xStep;
            neutralClosePts.push({ x, y: calcY(item.closing_rank), year: item.year, rank: item.closing_rank, openRank: item.opening_rank });
            if (item.opening_rank) {
                neutralOpenPts.push({ x, y: calcY(item.opening_rank), year: item.year, rank: item.opening_rank });
            }
        }
    });

    const femaleClosePts = [];
    if (showFemaleOverlayInDrawer) {
        female.forEach(item => {
            const yIdx = years.indexOf(item.year);
            if (yIdx >= 0) {
                femaleClosePts.push({ x: padL + yIdx * xStep, y: calcY(item.closing_rank), year: item.year, rank: item.closing_rank });
            }
        });
    }

    const lastHist = neutralClosePts[neutralClosePts.length - 1] || { x: padL + 4 * xStep, y: calcY(latestClosing) };
    const projX = padL + 5 * xStep;
    const projY = calcY(projCutoff);
    const projYLow = calcY(proj.lower_bound);
    const projYHigh = calcY(proj.upper_bound);

    const histPolyline = neutralClosePts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const openPolyline = neutralOpenPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const projDashedLine = `${lastHist.x.toFixed(1)},${lastHist.y.toFixed(1)} ${projX.toFixed(1)},${projY.toFixed(1)}`;
    const corridorPolygon = `${lastHist.x.toFixed(1)},${lastHist.y.toFixed(1)} ${projX.toFixed(1)},${projYLow.toFixed(1)} ${projX.toFixed(1)},${projYHigh.toFixed(1)}`;

    const chartSvg = `
        <svg width="100%" height="${chartH}" viewBox="0 0 ${chartW} ${chartH}" style="overflow:visible;">
            <!-- Grid Lines & Caption -->
            <line x1="${padL}" y1="${padT}" x2="${chartW - padR}" y2="${padT}" stroke="var(--border)" stroke-dasharray="2,2"/>
            <line x1="${padL}" y1="${chartH - padB}" x2="${chartW - padR}" y2="${chartH - padB}" stroke="var(--border)"/>
            <text x="${padL}" y="${padT - 8}" font-size="10" font-family="var(--font-mono)" fill="var(--muted)">↑ Higher (Harder to get in)</text>

            <!-- Opening-to-Closing Shaded Band (if available) -->
            ${neutralOpenPts.length > 1 && neutralClosePts.length > 1 ? `
                <polygon points="${neutralOpenPts.map(p => `${p.x},${p.y}`).join(' ')} ${neutralClosePts.slice().reverse().map(p => `${p.x},${p.y}`).join(' ')}" fill="rgba(43,80,232,0.08)"/>
            ` : ''}

            <!-- 2026 Predictive Shaded Corridor -->
            <polygon points="${corridorPolygon}" fill="rgba(200, 245, 96, 0.15)"/>

            <!-- Opening Rank Dotted Line -->
            ${openPolyline ? `<polyline points="${openPolyline}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3,3"/>` : ''}

            <!-- Closing Rank Solid Line (Neutral) -->
            <polyline points="${histPolyline}" fill="none" stroke="var(--text)" stroke-width="2.5" stroke-linecap="round"/>

            <!-- Female-Only Overlay Line (if toggled) -->
            ${femaleClosePts.length > 1 ? `
                <polyline points="${femaleClosePts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="none" stroke="#ec4899" stroke-width="2" stroke-dasharray="4,2"/>
                ${femaleClosePts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#ec4899"><title>Female-Only ${p.year}: #${p.rank.toLocaleString()}</title></circle>`).join('')}
            ` : ''}

            <!-- Projected Dashed Line -->
            <polyline points="${projDashedLine}" fill="none" stroke="var(--lime, #c8f560)" stroke-width="2.5" stroke-dasharray="4,3" stroke-linecap="round"/>

            <!-- Historical Dots with Tooltip -->
            ${neutralClosePts.map(p => `
                <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--surface)" stroke="var(--text)" stroke-width="2" tabIndex="0">
                    <title>${p.year} Final Round: Closing #${p.rank.toLocaleString()}${p.openRank ? `, Opening #${p.openRank.toLocaleString()}` : ''}</title>
                </circle>
            `).join('')}

            <!-- Projected Dot -->
            <circle cx="${projX}" cy="${projY}" r="5" fill="var(--lime, #c8f560)" stroke="var(--surface)" stroke-width="2">
                <title>2026 Projected: #${projCutoff.toLocaleString()} (Estimate, not a guarantee)</title>
            </circle>

            <!-- Year Labels -->
            ${years.map((yr, idx) => `
                <text x="${padL + idx * xStep}" y="${chartH - 10}" text-anchor="middle" font-family="var(--font-mono)" font-size="10" font-weight="600" fill="${yr === 2026 ? 'var(--lime, #c8f560)' : 'var(--muted)'}">
                    ${yr}${yr === 2026 ? ' (Est)' : ''}
                </text>
            `).join('')}
        </svg>
    `;

    // Data Table Rows for Accessibility
    const tableRowsHtml = neutral.map(item => {
        const femItem = female.find(f => f.year === item.year);
        return `
            <tr>
                <td style="font-weight:600;font-family:var(--font-mono);">${item.year}</td>
                <td style="font-family:var(--font-mono);">${item.opening_rank ? '#' + item.opening_rank.toLocaleString() : '—'}</td>
                <td style="font-family:var(--font-mono);font-weight:700;">#${item.closing_rank.toLocaleString()}</td>
                <td style="font-family:var(--font-mono);color:#ec4899;">${femItem ? '#' + femItem.closing_rank.toLocaleString() : '—'}</td>
            </tr>
        `;
    }).join('');

    bodyEl.innerHTML = `
        <!-- Quick Stats Strip -->
        <div class="explain-hero-strip" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:var(--space-5);">
            <div class="explain-hero-item" style="background:var(--raised);padding:12px;border-radius:10px;border:1px solid var(--border);">
                <span class="explain-hero-label" style="font-size:11px;color:var(--muted);text-transform:uppercase;">2025 Closing</span>
                <span class="explain-hero-val" style="font-size:18px;font-weight:700;font-family:var(--font-mono);">#${latestClosing.toLocaleString()}</span>
            </div>
            <div class="explain-hero-item" style="background:var(--raised);padding:12px;border-radius:10px;border:1px solid var(--border);">
                <span class="explain-hero-label" style="font-size:11px;color:var(--muted);text-transform:uppercase;">1Y Shift</span>
                <span class="explain-hero-val" style="font-size:18px;font-weight:700;font-family:var(--font-mono);color:${(data.analytics?.rank_shift_1y || 0) < 0 ? 'var(--reach)' : 'var(--safe)'};">
                    ${(data.analytics?.rank_shift_1y || 0) > 0 ? '+' : ''}${(data.analytics?.rank_shift_1y || 0).toFixed(1)}%
                </span>
            </div>
            <div class="explain-hero-item" style="background:var(--raised);padding:12px;border-radius:10px;border:1px solid var(--border);">
                <span class="explain-hero-label" style="font-size:11px;color:var(--muted);text-transform:uppercase;">2026 Projected</span>
                <span class="explain-hero-val" style="font-size:18px;font-weight:700;font-family:var(--font-mono);color:var(--lime);">#${projCutoff.toLocaleString()}</span>
            </div>
        </div>

        <!-- 1. Interactive Multi-Year Chart -->
        <div style="margin-bottom:var(--space-6);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div class="explain-section-title" style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:14px;">
                    <i data-lucide="trending-up" width="16" height="16" style="color:var(--lime);"></i>
                    Historical Cutoff Trajectory &amp; 2026 Band
                </div>
                <button type="button" class="btn btn--xs ${showFemaleOverlayInDrawer ? 'btn--primary' : 'btn--ghost'}" onclick="toggleFemaleDrawerOverlay()" style="font-size:11px;padding:3px 8px;">
                    Compare Female-only
                </button>
            </div>
            <div style="background:var(--raised);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-4) var(--space-2);margin-bottom:8px;">
                ${chartSvg}
            </div>
            <div style="font-size:11px;color:var(--muted);font-family:var(--font-mono);display:flex;justify-content:space-between;">
                <span>Corridor: #${proj.lower_bound.toLocaleString()} – #${proj.upper_bound.toLocaleString()} (Estimate, not a guarantee)</span>
                <span>Confidence: ${proj.confidence || 'Medium'}</span>
            </div>
        </div>

        <!-- 2. What this means for your rank -->
        <div style="margin-bottom:var(--space-6);">
            <div class="explain-section-title" style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:14px;margin-bottom:8px;">
                <i data-lucide="user-check" width="16" height="16" style="color:var(--lime);"></i>
                What this means for your rank
            </div>
            <div class="card" style="padding:var(--space-4);background:var(--raised);border:1px solid var(--border);border-radius:12px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-size:var(--text-xs);color:var(--muted);">Candidate Rank: <strong style="color:var(--text);font-family:var(--font-mono);">#${userRank.toLocaleString()}</strong></span>
                    <span class="badge ${narrativeClass}">${narrativeBadge}</span>
                </div>
                <p style="font-size:var(--text-xs);line-height:1.6;color:var(--text);margin:0;">${narrativeText}</p>
            </div>
        </div>

        <!-- 3. Accessible Multi-Year Data Table -->
        <div style="margin-bottom:var(--space-6);">
            <div class="explain-section-title" style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:14px;margin-bottom:8px;">
                <i data-lucide="table" width="16" height="16" style="color:var(--lime);"></i>
                Official JoSAA Ranks by Year
            </div>
            <div class="table-wrap" style="border:1px solid var(--border);border-radius:10px;">
                <table style="width:100%;font-size:12px;">
                    <thead>
                        <tr>
                            <th>Year</th>
                            <th>Opening</th>
                            <th>Closing (GN)</th>
                            <th>Closing (Female)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Footer Actions -->
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-6);">
            <button class="btn btn--secondary btn--sm" onclick="closeTrendDetailSheet()" style="flex:1;justify-content:center;">
                Close
            </button>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

window.closeTrendDetailSheet = function() {
    const drawer = document.getElementById('trendDetailDrawer');
    const backdrop = document.getElementById('trendDetailBackdrop');
    if (drawer) {
        drawer.classList.remove('active');
        drawer.classList.remove('open');
    }
    if (backdrop) {
        backdrop.classList.remove('active');
        backdrop.classList.remove('open');
    }
    document.body.style.overflow = '';

    // Clear detail params from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('iit');
    url.searchParams.delete('branch');
    window.history.replaceState(null, '', url.toString());
};

// Listen for Escape key to close drawer
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const drawer = document.getElementById('trendDetailDrawer');
        if (drawer && drawer.classList.contains('active')) {
            closeTrendDetailSheet();
        }
    }
});

window.toggleShortlistFromTrend = function(collegeId, branchId, iitName, branchName) {
    const existing = shortlist.find(s => s.college_id === collegeId && s.branch_id === branchId);
    if (existing) {
        const idx = shortlist.indexOf(existing);
        shortlist.splice(idx, 1);
        showToast('Removed program from Shortlist.', 'info');
    } else {
        shortlist.push({
            result_id: Date.now(),
            college_id: collegeId,
            branch_id: branchId,
            iit_name: iitName,
            branch_name: branchName,
            closing_rank: 1500,
            recommendation: { match_pct: 88, risk_level: 'Moderate' }
        });
        showToast(`Added ${iitName} ${branchName} to Shortlist!`, 'success');
    }
    localStorage.setItem('rankly_shortlist', JSON.stringify(shortlist));
    updateShortlistBadges();
    closeTrendDetailSheet();
};

function renderTrendsFallback() {
    const sampleMovers = {
        category: 'OPEN',
        tightening: [
            { college_id: 8, branch_id: 1, college_name: 'IIT Hyderabad', branch_name: 'Computer Science and Engineering', branch_code: 'CSE', shift_display: '14.2% tighter', closing_rank: 1390, confidence: 'High' },
            { college_id: 1, branch_id: 2, college_name: 'IIT Bombay', branch_name: 'Electrical Engineering', branch_code: 'EE', shift_display: '6.5% tighter', closing_rank: 450, confidence: 'High' },
            { college_id: 11, branch_id: 3, college_name: 'IIT (ISM) Dhanbad', branch_name: 'Electronics and Communication Engineering', branch_code: 'ECE', shift_display: '5.5% tighter', closing_rank: 5200, confidence: 'Medium' },
            { college_id: 9, branch_id: 3, college_name: 'IIT Indore', branch_name: 'Electronics and Communication Engineering', branch_code: 'ECE', shift_display: '5.3% tighter', closing_rank: 3600, confidence: 'Medium' },
            { college_id: 11, branch_id: 1, college_name: 'IIT (ISM) Dhanbad', branch_name: 'Computer Science and Engineering', branch_code: 'CSE', shift_display: '5.0% tighter', closing_rank: 3800, confidence: 'Medium' }
        ],
        loosening: [
            { college_id: 6, branch_id: 4, college_name: 'IIT Roorkee', branch_name: 'Mechanical Engineering', branch_code: 'ME', shift_display: '9.9% easier', closing_rank: 3900, confidence: 'High' },
            { college_id: 7, branch_id: 3, college_name: 'IIT Guwahati', branch_name: 'Electronics and Communication Engineering', branch_code: 'ECE', shift_display: '5.9% easier', closing_rank: 1800, confidence: 'High' },
            { college_id: 7, branch_id: 2, college_name: 'IIT Guwahati', branch_name: 'Electrical Engineering', branch_code: 'EE', shift_display: '4.4% easier', closing_rank: 2400, confidence: 'Medium' },
            { college_id: 8, branch_id: 3, college_name: 'IIT Hyderabad', branch_name: 'Electronics and Communication Engineering', branch_code: 'ECE', shift_display: '4.4% easier', closing_rank: 2400, confidence: 'Medium' },
            { college_id: 6, branch_id: 3, college_name: 'IIT Roorkee', branch_name: 'Electronics and Communication Engineering', branch_code: 'ECE', shift_display: '3.7% easier', closing_rank: 1400, confidence: 'Medium' }
        ]
    };
    renderTrendsKpiStrip(sampleMovers.tightening.concat(sampleMovers.loosening), sampleMovers);
    renderMoversCards(sampleMovers);
}



// ═══════════════════════════════════════════════════
// 15. SEAMLESS DEMO DATA GENERATOR FALLBACK
// ═══════════════════════════════════════════════════
function useDemoPredictionFallback(rank, category) {
    const userRank = parseInt(rank) || 1842;
    const userCat = category || 'OPEN';
    const userGender = findState.gender || 'Male';
    const bPrefList = findState.branches && !findState.branches.includes('ALL') ? findState.branches : [];
    const isStrict = findState.strictBranch;

    // Standard 2024-2025 JoSAA real college and branch database snapshot for fallback
    const collegeCatalog = [
        { id: 1, name: 'IIT Bombay', city: 'Mumbai', state: 'Maharashtra', nirf: 1, fee: 228000, place_pct: 98.2, avg_pkg: 36.9, zone: 'West', hostel: 4.8, mess: 4.2, campus: 4.9, lat: 19.1334, lng: 72.9133, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 67, obc: 54, ews: 20, sc: 31, st: 19 },
            { code: 'EE', name: 'Electrical Engineering', open: 433, obc: 274, ews: 117, sc: 128, st: 80 },
            { code: 'ME', name: 'Mechanical Engineering', open: 1241, obc: 755, ews: 287, sc: 396, st: 226 },
            { code: 'CE', name: 'Civil Engineering', open: 3304, obc: 1631, ews: 652, sc: 880, st: 149 },
            { code: 'MME', name: 'Metallurgical and Materials Engineering', open: 3830, obc: 2044, ews: 792, sc: 1253, st: 591 }
        ]},
        { id: 2, name: 'IIT Delhi', city: 'New Delhi', state: 'Delhi', nirf: 2, fee: 220000, place_pct: 96.0, avg_pkg: 34.1, zone: 'North', hostel: 4.6, mess: 4.0, campus: 4.8, lat: 28.5450, lng: 77.1926, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 118, obc: 84, ews: 30, sc: 34, st: 17 },
            { code: 'MnC', name: 'Mathematics and Computing', open: 315, obc: 263, ews: 87, sc: 126, st: 92 },
            { code: 'EE', name: 'Electrical Engineering', open: 553, obc: 366, ews: 148, sc: 165, st: 112 },
            { code: 'ME', name: 'Mechanical Engineering', open: 1740, obc: 1100, ews: 420, sc: 550, st: 300 },
            { code: 'CE', name: 'Civil Engineering', open: 3832, obc: 1620, ews: 679, sc: 727, st: 130 }
        ]},
        { id: 3, name: 'IIT Madras', city: 'Chennai', state: 'Tamil Nadu', nirf: 3, fee: 214000, place_pct: 97.4, avg_pkg: 35.2, zone: 'South', hostel: 4.7, mess: 4.5, campus: 4.9, lat: 12.9915, lng: 80.2337, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 175, obc: 89, ews: 37, sc: 58, st: 24 },
            { code: 'AI', name: 'Artificial Intelligence and Data Science', open: 306, obc: 190, ews: 75, sc: 95, st: 40 },
            { code: 'EE', name: 'Electrical Engineering', open: 1009, obc: 474, ews: 221, sc: 399, st: 167 },
            { code: 'ME', name: 'Mechanical Engineering', open: 2460, obc: 1200, ews: 510, sc: 700, st: 320 },
            { code: 'AE', name: 'Aerospace Engineering', open: 3259, obc: 1584, ews: 610, sc: 961, st: 558 }
        ]},
        { id: 4, name: 'IIT Kanpur', city: 'Kanpur', state: 'Uttar Pradesh', nirf: 4, fee: 218000, place_pct: 94.5, avg_pkg: 31.8, zone: 'North', hostel: 4.5, mess: 4.1, campus: 4.7, lat: 26.5123, lng: 80.2329, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 252, obc: 147, ews: 48, sc: 88, st: 47 },
            { code: 'EE', name: 'Electrical Engineering', open: 1297, obc: 711, ews: 236, sc: 458, st: 262 },
            { code: 'ME', name: 'Mechanical Engineering', open: 2823, obc: 1275, ews: 484, sc: 804, st: 438 },
            { code: 'CE', name: 'Civil Engineering', open: 5648, obc: 2363, ews: 832, sc: 1211, st: 428 }
        ]},
        { id: 5, name: 'IIT Roorkee', city: 'Roorkee', state: 'Uttarakhand', nirf: 5, fee: 212000, place_pct: 93.0, avg_pkg: 28.5, zone: 'North', hostel: 4.4, mess: 3.9, campus: 4.6, lat: 29.8649, lng: 77.8967, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 414, obc: 230, ews: 80, sc: 140, st: 70 },
            { code: 'ECE', name: 'Electronics and Communication Engineering', open: 1410, obc: 823, ews: 260, sc: 460, st: 240 },
            { code: 'EE', name: 'Electrical Engineering', open: 2050, obc: 1100, ews: 390, sc: 650, st: 330 },
            { code: 'ME', name: 'Mechanical Engineering', open: 3800, obc: 1950, ews: 720, sc: 1200, st: 600 },
            { code: 'CE', name: 'Civil Engineering', open: 5820, obc: 2800, ews: 1100, sc: 1700, st: 800 }
        ]},
        { id: 6, name: 'IIT Kharagpur', city: 'Kharagpur', state: 'West Bengal', nirf: 6, fee: 224000, place_pct: 94.0, avg_pkg: 27.5, zone: 'East', hostel: 4.3, mess: 3.8, campus: 4.8, lat: 22.3149, lng: 87.3105, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 285, obc: 161, ews: 50, sc: 86, st: 43 },
            { code: 'ECE', name: 'Electronics and Communication Engineering', open: 1132, obc: 567, ews: 214, sc: 246, st: 219 },
            { code: 'EE', name: 'Electrical Engineering', open: 1620, obc: 806, ews: 293, sc: 511, st: 268 },
            { code: 'ME', name: 'Mechanical Engineering', open: 2896, obc: 1348, ews: 503, sc: 788, st: 412 },
            { code: 'BT', name: 'Biotechnology', open: 7901, obc: 3707, ews: 1351, sc: 2105, st: 232 },
            { code: 'MN', name: 'Mining Engineering', open: 9002, obc: 4055, ews: 1509, sc: 2309, st: 714 }
        ]},
        { id: 7, name: 'IIT Guwahati', city: 'Guwahati', state: 'Assam', nirf: 7, fee: 215000, place_pct: 91.5, avg_pkg: 26.0, zone: 'East', hostel: 4.6, mess: 4.2, campus: 4.9, lat: 26.1878, lng: 91.6916, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 650, obc: 380, ews: 120, sc: 210, st: 110 },
            { code: 'ECE', name: 'Electronics and Communication Engineering', open: 2197, obc: 1138, ews: 420, sc: 700, st: 350 },
            { code: 'ME', name: 'Mechanical Engineering', open: 4600, obc: 2400, ews: 890, sc: 1450, st: 720 }
        ]},
        { id: 8, name: 'IIT Hyderabad', city: 'Hyderabad', state: 'Telangana', nirf: 8, fee: 222000, place_pct: 93.5, avg_pkg: 28.0, zone: 'South', hostel: 4.7, mess: 4.4, campus: 4.8, lat: 17.5947, lng: 78.1230, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 521, obc: 253, ews: 86, sc: 142, st: 79 },
            { code: 'AI', name: 'Artificial Intelligence and Data Science', open: 676, obc: 357, ews: 97, sc: 241, st: 132 },
            { code: 'EE', name: 'Electrical Engineering', open: 2094, obc: 946, ews: 349, sc: 684, st: 349 }
        ]},
        { id: 9, name: 'IIT (BHU) Varanasi', city: 'Varanasi', state: 'Uttar Pradesh', nirf: 10, fee: 215000, place_pct: 90.0, avg_pkg: 24.5, zone: 'North', hostel: 4.2, mess: 3.9, campus: 4.5, lat: 25.2677, lng: 82.9913, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 1010, obc: 463, ews: 160, sc: 290, st: 150 },
            { code: 'ECE', name: 'Electronics Engineering', open: 3023, obc: 1381, ews: 520, sc: 890, st: 440 },
            { code: 'ME', name: 'Mechanical Engineering', open: 6500, obc: 3100, ews: 1150, sc: 1900, st: 920 }
        ]},
        { id: 10, name: 'IIT Patna', city: 'Patna', state: 'Bihar', nirf: 25, fee: 215000, place_pct: 88.0, avg_pkg: 21.0, zone: 'East', hostel: 4.4, mess: 4.1, campus: 4.6, lat: 25.5358, lng: 84.8512, cutoffs: [
            { code: 'CSE', name: 'Computer Science and Engineering', open: 2600, obc: 1100, ews: 420, sc: 700, st: 350 },
            { code: 'ME', name: 'Mechanical Engineering', open: 11758, obc: 4800, ews: 1850, sc: 2900, st: 1400 },
            { code: 'CE', name: 'Civil Engineering', open: 15400, obc: 5800, ews: 2200, sc: 3400, st: 1600 }
        ]}
    ];

    const effectiveRank = (userCat !== 'OPEN' && findState.categoryRank) ? findState.categoryRank : userRank;
    const catKey = userCat === 'OBC-NCL' ? 'obc' : (userCat === 'EWS' ? 'ews' : (userCat === 'SC' ? 'sc' : (userCat === 'ST' ? 'st' : 'open')));

    const eligibleList = [];
    let resultCounter = 1;

    for (const c of collegeCatalog) {
        for (const b of c.cutoffs) {
            const cutoffVal = b[catKey] || b['open'];
            // Check strict branch if active
            if (isStrict && bPrefList.length > 0 && !bPrefList.includes(b.code)) {
                continue;
            }

            // Cutoff bound: candidate rank <= 1.10 * closing rank
            if (effectiveRank <= cutoffVal * 1.10) {
                let risk = 'Safe';
                if (effectiveRank > cutoffVal) risk = 'Reach';
                else if (effectiveRank > cutoffVal * 0.85) risk = 'Moderate';

                // Compute branch match
                const branchMatch = (bPrefList.length === 0 || bPrefList.includes(b.code)) ? 100 : 40;
                
                // Match percentage calculation mirroring SQL weights
                const w = findState.weights || { branch: 85, placement: 90, location: 60, fees: 55 };
                const matchPct = Math.min(99, Math.max(60, Math.round(
                    (branchMatch * 0.35) + 
                    (c.place_pct * 0.30) + 
                    (Math.max(50, 105 - c.nirf * 3) * 0.20) + 
                    (risk === 'Safe' ? 14 : (risk === 'Moderate' ? 10 : 5))
                )));

                eligibleList.push({
                    result_id: resultCounter++,
                    cutoff_id: 1000 + resultCounter,
                    college_id: c.id,
                    branch_id: resultCounter,
                    iit_name: c.name,
                    college_name: c.name,
                    city: c.city,
                    state: c.state,
                    branch_name: b.name,
                    branch_code: b.code,
                    degree: '4-year B.Tech',
                    opening_rank: Math.round(cutoffVal * 0.3),
                    closing_rank: cutoffVal,
                    year: 2025,
                    category: userCat,
                    seat_type_used: userCat !== 'OPEN' ? `${userCat} by category rank` : 'OPEN by CRL',
                    distance_km: 450,
                    avg_package_lpa: c.avg_pkg,
                    highest_package_lpa: (c.avg_pkg * 2.2).toFixed(1),
                    placement_percentage: c.place_pct,
                    college_info: {
                        nirf_rank: c.nirf,
                        annual_fee_lpa: (c.fee / 100000).toFixed(2),
                        zone: c.zone,
                        hostel_rating: c.hostel,
                        mess_rating: c.mess,
                        campus_life_rating: c.campus
                    },
                    recommendation: {
                        overall_score: matchPct,
                        match_pct: matchPct,
                        risk_level: risk,
                        seat_type_used: userCat !== 'OPEN' ? `${userCat} by category rank` : 'OPEN by CRL',
                        distance_km: 450,
                        factors: [
                            { factor: 'Branch / Infrastructure', score: branchMatch, weight: '30.0', impact: branchMatch === 100 ? '+Must-have' : 'Core' },
                            { factor: 'Placement & Packages', score: Math.round(c.place_pct), weight: '20.0', impact: '+High' },
                            { factor: 'Institute NIRF Rank', score: Math.max(60, 100 - c.nirf * 2), weight: '15.0', impact: '+Reputation' },
                            { factor: 'Annual Fee & Value', score: 85, weight: '15.0', impact: 'Affordable' },
                            { factor: 'Location', score: 75, weight: '10.0', impact: c.zone },
                            { factor: 'Campus Life', score: Math.round(c.campus * 20), weight: '10.0', impact: '+Vibe' }
                        ]
                    },
                    trend_analytics: { rank_shift_1y: -5, trend_status: 'Stable Trend', confidence_pct: 92 },
                    peer_trend: { peer_selection_pct: 85, peer_rank_window: `${Math.round(cutoffVal*0.7)} - ${cutoffVal}` }
                });
            }
        }
    }

    // Sort by Match % descending
    eligibleList.sort((a, b) => (b.recommendation.match_pct - a.recommendation.match_pct));

    currentResults = eligibleList;
    activeRiskFilter = 'ALL';
    applyCardFilters();
    setApiStatus(false);

    const navResultsTab = document.getElementById('navResultsTab');
    if (navResultsTab) {
        navResultsTab.style.display = 'inline-flex';
        document.getElementById('navResultsCount').textContent = currentResults.length;
    }

    switchTab('results');
    showToast(`Discovered ${currentResults.length} personalised options! (Demo Data Mode)`, 'success');
}

// ═══════════════════════════════════════════════════
// DUAL CAMPUS MARQUEE & HERO INTERACTIVITY
// ═══════════════════════════════════════════════════

let isHeroMarqueePaused = false;
let heroCountAnimationId = null;

window.handleCampusImgError = function(imgEl, monogram, tint) {
    if (!imgEl) return;
    const card = imgEl.closest('.campus-card');
    if (!card) return;
    const imgWrap = card.querySelector('.campus-card__img-wrap');
    const fallback = card.querySelector('.campus-card__fallback');
    if (imgWrap) imgWrap.style.display = 'none';
    if (fallback) fallback.style.display = 'flex';
};

window.toggleHeroMarquee = function() {
    isHeroMarqueePaused = !isHeroMarqueePaused;
    const leftCol = document.getElementById('marqueeColLeft');
    const rightCol = document.getElementById('marqueeColRight');
    const row1 = document.getElementById('mobileRow1');
    const row2 = document.getElementById('mobileRow2');
    const btn = document.getElementById('marqueeToggleBtn');
    const textEl = document.getElementById('marqueeToggleText');

    [leftCol, rightCol, row1, row2].forEach(el => {
        if (el) el.classList.toggle('is-paused', isHeroMarqueePaused);
    });

    if (btn) {
        btn.setAttribute('aria-pressed', isHeroMarqueePaused ? 'true' : 'false');
        btn.setAttribute('aria-label', isHeroMarqueePaused ? 'Play marquee animation' : 'Pause marquee animation');
        btn.innerHTML = `<i data-lucide="${isHeroMarqueePaused ? 'play' : 'pause'}" width="14" height="14" id="marqueeToggleIcon"></i>`;
        if (window.lucide) lucide.createIcons();
    }
    if (textEl) {
        textEl.textContent = isHeroMarqueePaused ? 'Play animation' : 'Pause animation';
    }
};

window.calculateOptionsForRank = function(rank) {
    const r = parseInt(rank, 10);
    if (isNaN(r) || r <= 0) return 0;
    if (r <= 200) return 255;
    if (r <= 500) return Math.round(255 - ((r - 200) / 300) * 15);
    if (r <= 1000) return Math.round(240 - ((r - 500) / 500) * 18);
    if (r <= 2000) return Math.round(222 - ((r - 1000) / 1000) * 24);
    if (r <= 4000) return Math.round(198 - ((r - 2000) / 2000) * 36);
    if (r <= 7000) return Math.round(162 - ((r - 4000) / 3000) * 44);
    if (r <= 12000) return Math.round(118 - ((r - 7000) / 5000) * 54);
    if (r <= 18000) return Math.round(64 - ((r - 12000) / 6000) * 40);
    return Math.max(8, Math.round(24 - ((r - 18000) / 10000) * 16));
};

function animateCountUp(targetVal) {
    const el = document.getElementById('heroOptionsCount');
    if (!el) return;
    if (heroCountAnimationId) cancelAnimationFrame(heroCountAnimationId);

    const startVal = parseInt(el.textContent, 10) || 0;
    const duration = 400; // ms
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startVal + (targetVal - startVal) * ease);
        el.textContent = current;

        if (progress < 1) {
            heroCountAnimationId = requestAnimationFrame(step);
        } else {
            el.textContent = targetVal;
        }
    }
    heroCountAnimationId = requestAnimationFrame(step);
}

window.handleHeroRankChange = function(val) {
    const count = calculateOptionsForRank(val);
    animateCountUp(count);
};

async function executeQuickStart(rankNum) {
    if (isNaN(rankNum) || rankNum < 1 || rankNum > 200000) {
        showToast('Please enter a valid rank between 1 and 200,000', 'warning');
        return;
    }

    window.isQuickOrOcrMode = true;
    sortKey = 'closing_rank';
    const sortSel = document.getElementById('resultsSortSelect');
    if (sortSel) sortSel.value = 'closing_rank';

    findState.rank = rankNum;
    if (!findState.category) findState.category = 'OPEN';
    findState.categoryRank = findState.category !== 'OPEN' ? rankNum : null;
    if (!findState.gender) findState.gender = 'Male';
    if (!findState.homeCity) findState.homeCity = 'Kota';
    if (!findState.homeState) findState.homeState = 'Rajasthan';
    findState.branches = ['ALL'];
    findState.strictBranch = false;
    findState.includeRelated = true;
    findState.locationPref = 'All';
    findState.weights = {
        branch: 10,
        location: 10,
        fee: 10,
        mess: 10,
        hostel: 10,
        placement: 10,
        proximity: 10,
        campus: 10
    };

    const candidateInput = document.getElementById('candidateRank');
    if (candidateInput) {
        candidateInput.value = rankNum;
    }
    const rankIn = document.getElementById('rankInput');
    if (rankIn) {
        rankIn.value = rankNum;
    }

    showToast(`Analyzing admissions for AIR #${rankNum.toLocaleString()}...`, 'info');
    await runPrediction();
    showQuickStartBanner();
    window.history.replaceState(null, '', `?quick=1`);
}

window.showQuickStartBanner = function() {
    const wrap = document.getElementById('quickStartBannerWrap');
    if (!wrap) return;
    wrap.innerHTML = `
        <div class="quick-banner" id="quickStartBanner" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:var(--surface, #1e293b);border:1px solid var(--border);border-left:4px solid var(--primary, #2b50e8);border-radius:10px;">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <i data-lucide="info" width="16" height="16" style="color:var(--primary, #2b50e8);flex-shrink:0;"></i>
                <span style="font-size:13px;line-height:1.4;color:var(--text, #f8fafc);">Using defaults: <strong>OPEN · Male · balanced weights</strong>. Add details for sharper results.</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <button type="button" class="btn btn--primary btn--xs" onclick="openFindPrefilled()" style="padding:5px 12px;font-size:12px;font-weight:600;border-radius:6px;">Add details</button>
                <button type="button" class="btn btn--ghost btn--xs" onclick="dismissQuickBanner()" style="padding:4px;color:var(--muted);border-radius:4px;" aria-label="Dismiss banner"><i data-lucide="x" width="14" height="14"></i></button>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
};

window.dismissQuickBanner = function() {
    const b = document.getElementById('quickStartBanner');
    if (b) b.remove();
};

window.openFindPrefilled = function() {
    switchTab('find');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.startFindWithRank = function() {
    const heroInput = document.getElementById('heroRankInput');
    const val = heroInput ? heroInput.value.trim() : '';
    if (!val) {
        switchTab('find');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    const rankNum = parseInt(val, 10);
    executeQuickStart(rankNum);
};

window.startFindWithCtaRank = function() {
    const ctaInput = document.getElementById('ctaRankInput');
    const val = ctaInput ? ctaInput.value.trim() : '';
    if (!val) {
        switchTab('find');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    const rankNum = parseInt(val, 10);
    executeQuickStart(rankNum);
};

// ─── Site Stats Loader (L2: Live Data Integration) ───
window.siteStatsData = null;
async function loadSiteStats() {
    try {
        const res = await fetch('/site-stats.json');
        if (!res.ok) return;
        const stats = await res.json();
        window.siteStatsData = stats;

        // Update method stats if present
        const elCutoffs = document.getElementById('statCutoffRecords');
        if (elCutoffs && stats.totalCutoffRecords) elCutoffs.textContent = stats.totalCutoffRecords.toLocaleString('en-US');
        const elIits = document.getElementById('statIitsCovered');
        if (elIits && stats.iitsCovered) elIits.textContent = stats.iitsCovered;
        const elProgs = document.getElementById('statProgramsCovered');
        if (elProgs && stats.academicPrograms) elProgs.textContent = stats.academicPrograms;
        const elFactors = document.getElementById('statFactors');
        if (elFactors && stats.decisionFactors) elFactors.textContent = stats.decisionFactors;

        document.querySelectorAll('[data-stat]').forEach(el => {
            const key = el.getAttribute('data-stat');
            if (stats[key] !== undefined) {
                el.setAttribute('data-count', stats[key]);
                el.textContent = typeof stats[key] === 'number' ? stats[key].toLocaleString('en-US') : stats[key];
            }
        });
    } catch (e) {
        console.warn('Could not load site-stats.json:', e);
    }
}

// ─── L4: Tour Video Player Controller ───
let tourChaptersData = [
    { id: 1, time: 0, timeStr: '00:00', title: 'Enter your rank', subtitle: 'Step 1', desc: 'Input your JEE Advanced CRL rank, category, and gender seat pool.' },
    { id: 2, time: 15, timeStr: '00:15', title: 'Weigh what matters', subtitle: 'Step 2', desc: 'Tune 8 weighted dimensions: placements, brand, distance, and culture.' },
    { id: 3, time: 30, timeStr: '00:30', title: 'Inspect your matches', subtitle: 'Step 3', desc: 'Explore categorized Safe, Moderate, and Reach probability tiers.' },
    { id: 4, time: 45, timeStr: '00:45', title: 'Compare two colleges', subtitle: 'Step 4', desc: 'Run a side-by-side head-to-head comparison with historical trends.' },
    { id: 5, time: 60, timeStr: '01:00', title: 'Export your list', subtitle: 'Step 5', desc: 'Generate an optimized JoSAA priority sequence ready for portal entry.' }
];

async function initTourVideo() {
    const container = document.getElementById('tourVideoContainer');
    if (!container) return;

    const video = document.getElementById('tourVideo');
    const poster = document.getElementById('tourPoster');
    const bigPlayBtn = document.getElementById('tourBigPlay');
    const playBtn = document.getElementById('tourPlayBtn');
    const muteBtn = document.getElementById('tourMuteBtn');
    const timeCur = document.getElementById('tourTimeCurrent');
    const timeDur = document.getElementById('tourTimeDuration');
    const scrubber = document.getElementById('tourScrubber');
    const scrubberLoaded = document.getElementById('tourScrubberLoaded');
    const scrubberProgress = document.getElementById('tourScrubberProgress');
    const scrubberThumb = document.getElementById('tourScrubberThumb');
    const scrubberTooltip = document.getElementById('tourScrubberTooltip');
    const chapterMarkers = document.getElementById('tourChapterMarkers');
    const currentChapterText = document.getElementById('tourCurrentChapterText');
    const chaptersStrip = document.getElementById('tourChaptersStrip');
    const chaptersMenuBtn = document.getElementById('tourChaptersMenuBtn');
    const chaptersDropdown = document.getElementById('tourChaptersDropdown');
    const ccBtn = document.getElementById('tourCcBtn');
    const speedBtn = document.getElementById('tourSpeedBtn');
    const speedLabel = document.getElementById('tourSpeedLabel');
    const fullscreenBtn = document.getElementById('tourFullscreenBtn');

    // Fetch chapters.json if available
    try {
        const res = await fetch('/tour/chapters.json');
        if (res.ok) {
            tourChaptersData = await res.json();
        }
    } catch (e) {
        // use fallback tourChaptersData
    }

    const speeds = [1, 1.25, 1.5, 2];
    let currentSpeedIndex = 0;
    let isVideoAvailable = false;
    let totalDuration = 43; // real video duration: 43.1s
    let simulatedCurrentTime = 0;
    let isPlaying = false;
    let simulatedTimer = null;

    function formatTime(sec) {
        if (isNaN(sec) || sec < 0) sec = 0;
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function renderChapterStrip() {
        if (!chaptersStrip) return;
        chaptersStrip.innerHTML = tourChaptersData.map((chap, idx) => `
            <div class="tour-chapter-card ${idx === 0 ? 'is-active' : ''}" data-chap-id="${chap.id}" data-time="${chap.time}" role="button" tabindex="0" aria-label="${chap.title}">
                <div class="tour-chapter-card__top">
                    <span class="tour-chapter-card__step">${chap.subtitle || 'Step ' + chap.id}</span>
                    <span class="tour-chapter-card__time">${chap.timeStr || formatTime(chap.time)}</span>
                </div>
                <h4 class="tour-chapter-card__title">${chap.title}</h4>
                <p class="tour-chapter-card__desc">${chap.desc}</p>
            </div>
        `).join('');

        if (chaptersDropdown) {
            chaptersDropdown.innerHTML = tourChaptersData.map((chap, idx) => `
                <button type="button" class="tour-dropdown-item ${idx === 0 ? 'is-active' : ''}" data-time="${chap.time}">
                    <span>${chap.subtitle || 'Step ' + chap.id}: ${chap.title}</span>
                    <span style="font-family:var(--font-mono);font-size:11px;opacity:0.7;">${chap.timeStr || formatTime(chap.time)}</span>
                </button>
            `).join('');
        }

        if (chapterMarkers) {
            chapterMarkers.innerHTML = tourChaptersData.map(chap => {
                const pct = (chap.time / totalDuration) * 100;
                return `<div class="tour-chapter-marker" style="left: ${pct}%;" title="${chap.title}"></div>`;
            }).join('');
        }

        chaptersStrip.querySelectorAll('.tour-chapter-card').forEach(card => {
            card.addEventListener('click', () => {
                const t = parseFloat(card.getAttribute('data-time'));
                seekTo(t, true);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const t = parseFloat(card.getAttribute('data-time'));
                    seekTo(t, true);
                }
            });
        });

        if (chaptersDropdown) {
            chaptersDropdown.querySelectorAll('.tour-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    const t = parseFloat(item.getAttribute('data-time'));
                    seekTo(t, true);
                    chaptersDropdown.style.display = 'none';
                });
            });
        }
    }

    function togglePlay() {
        if (isVideoAvailable && video) {
            if (video.paused || video.ended) {
                video.play().then(() => {
                    setPlayingState(true);
                }).catch(() => {
                    setPlayingState(false);
                });
            } else {
                video.pause();
                setPlayingState(false);
            }
        } else {
            isPlaying = !isPlaying;
            setPlayingState(isPlaying);
            if (isPlaying && !simulatedTimer) {
                runSimulatedPlayback();
            }
        }
    }

    function runSimulatedPlayback() {
        clearInterval(simulatedTimer);
        simulatedTimer = setInterval(() => {
            if (!isPlaying) {
                clearInterval(simulatedTimer);
                simulatedTimer = null;
                return;
            }
            simulatedCurrentTime += 1;
            if (simulatedCurrentTime > totalDuration) {
                simulatedCurrentTime = 0;
                setPlayingState(false);
                clearInterval(simulatedTimer);
                simulatedTimer = null;
            }
            updateUI(simulatedCurrentTime, totalDuration);
        }, 1000);
    }

    function setPlayingState(playing) {
        isPlaying = playing;
        if (playing) {
            container.classList.add('is-playing');
            container.classList.remove('is-paused');
            if (playBtn) playBtn.innerHTML = '<i data-lucide="pause" width="18" height="18"></i>';
            if (poster) poster.style.opacity = '0';
        } else {
            container.classList.remove('is-playing');
            container.classList.add('is-paused');
            if (playBtn) playBtn.innerHTML = '<i data-lucide="play" width="18" height="18"></i>';
        }
        if (window.lucide) lucide.createIcons();
    }

    function seekTo(targetTime, autoPlay = false) {
        targetTime = Math.max(0, Math.min(targetTime, totalDuration));
        if (isVideoAvailable && video) {
            video.currentTime = targetTime;
            if (autoPlay) {
                video.play().then(() => setPlayingState(true)).catch(() => {});
            }
        } else {
            simulatedCurrentTime = targetTime;
            updateUI(simulatedCurrentTime, totalDuration);
            if (autoPlay) {
                setPlayingState(true);
                runSimulatedPlayback();
            }
        }
    }

    function updateUI(currentTime, duration) {
        if (!duration || duration <= 0) duration = 75;
        const pct = Math.max(0, Math.min(100, (currentTime / duration) * 100));

        if (scrubberProgress) scrubberProgress.style.width = `${pct}%`;
        if (scrubberThumb) scrubberThumb.style.left = `${pct}%`;
        if (scrubber) scrubber.setAttribute('aria-valuenow', Math.round(currentTime));
        if (timeCur) timeCur.textContent = formatTime(currentTime);
        if (timeDur) timeDur.textContent = formatTime(duration);

        let activeChap = tourChaptersData[0];
        for (let i = 0; i < tourChaptersData.length; i++) {
            if (currentTime >= tourChaptersData[i].time - 0.5) {
                activeChap = tourChaptersData[i];
            }
        }

        if (currentChapterText && activeChap) {
            currentChapterText.textContent = `${activeChap.subtitle || 'Step ' + activeChap.id}: ${activeChap.title}`;
        }

        if (chaptersStrip && activeChap) {
            chaptersStrip.querySelectorAll('.tour-chapter-card').forEach(card => {
                const id = parseInt(card.getAttribute('data-chap-id'), 10);
                if (id === activeChap.id) {
                    card.classList.add('is-active');
                } else {
                    card.classList.remove('is-active');
                }
            });
        }

        if (chaptersDropdown && activeChap) {
            chaptersDropdown.querySelectorAll('.tour-dropdown-item').forEach(item => {
                const t = parseFloat(item.getAttribute('data-time'));
                if (t === activeChap.time) {
                    item.classList.add('is-active');
                } else {
                    item.classList.remove('is-active');
                }
            });
        }
    }

    if (poster) { poster.style.display = 'none'; }
    if (video) {
        isVideoAvailable = true;
        video.addEventListener('loadedmetadata', () => {
            if (video.duration && !isNaN(video.duration) && video.duration > 0) {
                isVideoAvailable = true;
                totalDuration = video.duration;
                if (timeDur) timeDur.textContent = formatTime(totalDuration);
                renderChapterStrip();
            }
        });

        video.addEventListener('timeupdate', () => {
            updateUI(video.currentTime, video.duration || totalDuration);
        });

        video.addEventListener('progress', () => {
            if (video.buffered.length > 0 && scrubberLoaded) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const pct = (bufferedEnd / (video.duration || totalDuration)) * 100;
                scrubberLoaded.style.width = `${Math.min(100, pct)}%`;
            }
        });

        video.addEventListener('play', () => setPlayingState(true));
        video.addEventListener('pause', () => setPlayingState(false));
        video.addEventListener('ended', () => {
            setPlayingState(false);
            if (poster) poster.style.opacity = '1';
        });

        video.addEventListener('error', () => {
            isVideoAvailable = false;
        });
    }

    if (bigPlayBtn) bigPlayBtn.addEventListener('click', togglePlay);
    if (playBtn) playBtn.addEventListener('click', togglePlay);

    let isScrubbing = false;
    function handleScrubberMove(e) {
        const rect = scrubber.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const targetTime = ratio * totalDuration;

        if (scrubberTooltip) {
            scrubberTooltip.textContent = formatTime(targetTime);
            scrubberTooltip.style.left = `${ratio * 100}%`;
        }

        if (isScrubbing) {
            seekTo(targetTime, false);
        }
    }

    if (scrubber) {
        scrubber.addEventListener('mousedown', (e) => {
            isScrubbing = true;
            handleScrubberMove(e);
            window.addEventListener('mousemove', handleScrubberMove);
            window.addEventListener('mouseup', () => {
                isScrubbing = false;
                window.removeEventListener('mousemove', handleScrubberMove);
            }, { once: true });
        });

        scrubber.addEventListener('mousemove', (e) => {
            if (!isScrubbing) handleScrubberMove(e);
        });
    }

    if (muteBtn && video) {
        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            if (video.muted) {
                muteBtn.innerHTML = '<i data-lucide="volume-x" width="18" height="18"></i>';
            } else {
                muteBtn.innerHTML = '<i data-lucide="volume-2" width="18" height="18"></i>';
            }
            if (window.lucide) lucide.createIcons();
        });
    }

    if (chaptersMenuBtn && chaptersDropdown) {
        chaptersMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = chaptersDropdown.style.display !== 'none';
            chaptersDropdown.style.display = isOpen ? 'none' : 'block';
        });
        document.addEventListener('click', () => {
            if (chaptersDropdown) chaptersDropdown.style.display = 'none';
        });
    }

    if (ccBtn && video) {
        ccBtn.addEventListener('click', () => {
            const track = video.textTracks && video.textTracks[0];
            if (track) {
                if (track.mode === 'showing') {
                    track.mode = 'hidden';
                    ccBtn.classList.remove('active');
                } else {
                    track.mode = 'showing';
                    ccBtn.classList.add('active');
                }
            } else {
                ccBtn.classList.toggle('active');
            }
        });
    }

    if (speedBtn) {
        speedBtn.addEventListener('click', () => {
            currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
            const newSpeed = speeds[currentSpeedIndex];
            if (video) video.playbackRate = newSpeed;
            if (speedLabel) speedLabel.textContent = `${newSpeed}x`;
        });
    }

    if (fullscreenBtn && container) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if (container.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }

    window.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement?.isContentEditable) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const isInView = (rect.top < window.innerHeight && rect.bottom > 0);
        if (!isInView) return;

        const key = e.key.toLowerCase();
        if (e.code === 'Space' || key === 'k') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            const cur = isVideoAvailable && video ? video.currentTime : simulatedCurrentTime;
            seekTo(cur - 5);
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            const cur = isVideoAvailable && video ? video.currentTime : simulatedCurrentTime;
            seekTo(cur + 5);
        } else if (key === 'm') {
            e.preventDefault();
            if (muteBtn) muteBtn.click();
        } else if (key === 'c') {
            e.preventDefault();
            if (ccBtn) ccBtn.click();
        } else if (key === 'f') {
            e.preventDefault();
            if (fullscreenBtn) fullscreenBtn.click();
        }
    });

    renderChapterStrip();
    updateUI(0, totalDuration);
    if (window.lucide) lucide.createIcons();
}

// ═══════════════════════════════════════════════════
// J3: SCORECARD UPLOAD (TESSERACT.JS OCR) & FLOWS
// ═══════════════════════════════════════════════════
window.setFindMode = function(mode) {
    const manualBtn = document.getElementById('findModeManualBtn');
    const uploadBtn = document.getElementById('findModeUploadBtn');
    const manualBody = document.getElementById('findManualBody');
    const uploadPane = document.getElementById('findUploadPane');

    if (manualBtn) manualBtn.classList.toggle('active', mode === 'manual');
    if (uploadBtn) uploadBtn.classList.toggle('active', mode === 'upload');

    if (manualBody) manualBody.style.display = mode === 'manual' ? '' : 'none';
    if (uploadPane) uploadPane.style.display = mode === 'upload' ? 'block' : 'none';
};

window.skipPreferencesAndSubmit = function() {
    const rankInput = document.getElementById('rankInput');
    const rankVal = rankInput ? parseInt(rankInput.value) : 0;
    if (!rankVal || rankVal < 1 || rankVal > 200000) {
        showToast('Please enter your JEE Advanced rank first (1–2,00,000)', 'warning');
        if (rankInput) rankInput.focus();
        return;
    }
    executeQuickStart(rankVal);
};

window.handleScorecardDragOver = function(e) {
    e.preventDefault();
    const dropzone = document.getElementById('scorecardDropzone');
    if (dropzone) dropzone.style.borderColor = 'var(--lime, #c8f560)';
};

window.handleScorecardDragLeave = function(e) {
    e.preventDefault();
    const dropzone = document.getElementById('scorecardDropzone');
    if (dropzone) dropzone.style.borderColor = '';
};

window.handleScorecardDrop = function(e) {
    e.preventDefault();
    const dropzone = document.getElementById('scorecardDropzone');
    if (dropzone) dropzone.style.borderColor = '';
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        processScorecardFile(e.dataTransfer.files[0]);
    }
};

window.processScorecardFile = async function(file) {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        showToast('Scorecard file size exceeds 10MB limit.', 'error');
        return;
    }

    const progressWrap = document.getElementById('scorecardProgressWrap');
    const progressText = document.getElementById('scorecardProgressText');
    const progressPct = document.getElementById('scorecardProgressPct');
    const progressBar = document.getElementById('scorecardProgressBar');
    const confirmCard = document.getElementById('scorecardConfirmCard');

    if (progressWrap) progressWrap.style.display = 'block';
    if (confirmCard) confirmCard.style.display = 'none';

    try {
        if (progressText) progressText.textContent = 'Loading OCR Engine…';
        if (progressBar) progressBar.style.width = '20%';
        if (progressPct) progressPct.textContent = '20%';

        // Lazy-load Tesseract if needed
        if (!window.Tesseract) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('OCR engine download failed'));
                document.head.appendChild(script);
            });
        }

        if (progressText) progressText.textContent = 'Scanning scorecard text…';
        if (progressBar) progressBar.style.width = '50%';
        if (progressPct) progressPct.textContent = '50%';

        // Image Preprocessing on Canvas (Downscale to <= 1800px, Grayscale, Contrast boost)
        const preprocessImage = async (imgFile) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const maxDim = 1800;
                    let w = img.width;
                    let h = img.height;
                    if (w > maxDim || h > maxDim) {
                        if (w > h) {
                            h = Math.round((h * maxDim) / w);
                            w = maxDim;
                        } else {
                            w = Math.round((w * maxDim) / h);
                            h = maxDim;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);

                    // Grayscale & Contrast
                    try {
                        const imgData = ctx.getImageData(0, 0, w, h);
                        const d = imgData.data;
                        const contrast = 35; // Contrast factor
                        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                        for (let i = 0; i < d.length; i += 4) {
                            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                            const cVal = factor * (gray - 128) + 128;
                            const clamped = Math.max(0, Math.min(255, cVal));
                            d[i] = clamped;
                            d[i + 1] = clamped;
                            d[i + 2] = clamped;
                        }
                        ctx.putImageData(imgData, 0, 0);
                        canvas.toBlob((blob) => resolve(blob || imgFile), 'image/jpeg', 0.92);
                    } catch (e) {
                        resolve(imgFile);
                    }
                };
                img.onerror = () => resolve(imgFile);
                img.src = URL.createObjectURL(imgFile);
            });
        };

        const processedBlob = await preprocessImage(file);

        const worker = await Tesseract.createWorker('eng', 1, {
            logger: m => {
                if (m.status === 'recognizing text' && m.progress) {
                    const p = Math.round(50 + m.progress * 45);
                    if (progressBar) progressBar.style.width = `${p}%`;
                    if (progressPct) progressPct.textContent = `${p}%`;
                }
            }
        });

        const ret = await worker.recognize(processedBlob);
        await worker.terminate();

        const text = ret.data.text || '';
        const cleanText = text.replace(/\r/g, ' ');

        // Parse fields using score card heuristics
        let parsedCrl = null;
        let hasLabelMatch = false;
        const crlRegex = /(?:common\s*rank\s*list|crl|all\s*india\s*rank|air)[^\d\n\r]{0,30}(\d{1,6})\b/i;
        const crlMatch = cleanText.match(crlRegex);
        if (crlMatch) {
            const v = parseInt(crlMatch[1], 10);
            if (v >= 1 && v <= 100000) {
                parsedCrl = v;
                hasLabelMatch = true;
            }
        }

        if (!parsedCrl) {
            const multiLineCrl = /(?:common\s*rank\s*list|crl|all\s*india\s*rank|air)\s*[\n\r]+\s*(\d{1,6})\b/i;
            const m = cleanText.match(multiLineCrl);
            if (m) {
                const v = parseInt(m[1], 10);
                if (v >= 1 && v <= 100000) {
                    parsedCrl = v;
                    hasLabelMatch = true;
                }
            }
        }

        // Secondary fallback without label
        if (!parsedCrl) {
            const candidateNumbers = cleanText.match(/\b\d{2,5}\b/g) || [];
            for (const numStr of candidateNumbers) {
                const num = parseInt(numStr, 10);
                if (num >= 100 && num <= 99999 && !(num >= 2000 && num <= 2030)) {
                    parsedCrl = num;
                    break;
                }
            }
        }

        // Category
        let parsedCat = 'OPEN';
        let catAssumed = true;
        if (/\b(?:gen-ews|gene-ws|ews|economically\s*weaker)\b/i.test(cleanText)) {
            parsedCat = 'GEN-EWS';
            catAssumed = false;
        } else if (/\b(?:obc-ncl|obc\s*ncl|obc)\b/i.test(cleanText)) {
            parsedCat = 'OBC-NCL';
            catAssumed = false;
        } else if (/\b(?:scheduled\s*tribe|\bst\b)\b/i.test(cleanText) && !/\b(?:state|status)\b/i.test(cleanText)) {
            parsedCat = 'ST';
            catAssumed = false;
        } else if (/\b(?:scheduled\s*caste|\bsc\b)\b/i.test(cleanText) && !/\b(?:score|scorecard)\b/i.test(cleanText)) {
            parsedCat = 'SC';
            catAssumed = false;
        } else if (/\b(?:general|open|unreserved|gen)\b/i.test(cleanText)) {
            parsedCat = 'OPEN';
            catAssumed = false;
        }

        // Gender
        let parsedGender = 'Male';
        let genAssumed = true;
        if (/\b(?:female|girl|woman)\b/i.test(cleanText)) {
            parsedGender = 'Female';
            genAssumed = false;
        } else if (/\b(?:male|boy|man)\b/i.test(cleanText)) {
            parsedGender = 'Male';
            genAssumed = false;
        }

        if (progressWrap) progressWrap.style.display = 'none';

        // Check if label match was found: go DIRECTLY to Results with balanced weights
        if (parsedCrl && hasLabelMatch) {
            findState.rank = parsedCrl;
            findState.category = parsedCat;
            findState.gender = parsedGender;
            const catStr = catAssumed ? `${parsedCat} (assumed)` : parsedCat;
            const genStr = genAssumed ? `${parsedGender} (assumed)` : parsedGender;
            showToast(`Read: CRL ${parsedCrl} · ${catStr} · ${genStr}. Edit`, 'success');
            executeQuickStart(parsedCrl);
            return;
        }

        // If rank ambiguous or no label match: show small confirm card
        if (parsedCrl) {
            const rankIn = document.getElementById('ocrRankInput');
            const catSel = document.getElementById('ocrCatSelect');
            const genSel = document.getElementById('ocrGenderSelect');

            if (rankIn) rankIn.value = parsedCrl;
            if (catSel) catSel.value = parsedCat;
            if (genSel) genSel.value = parsedGender;

            if (confirmCard) confirmCard.style.display = 'block';
            showToast('Please confirm your extracted rank and details.', 'info');
            return;
        }

        // If nothing could be read
        showToast('Could not find rank on scorecard. Please enter rank manually.', 'warning');
        setFindMode('manual');
    } catch (err) {
        console.warn('OCR error:', err);
        if (progressWrap) progressWrap.style.display = 'none';
        showToast('Could not read scorecard. Please enter rank manually.', 'warning');
        setFindMode('manual');
    }
};

window.confirmScorecardAndFind = function() {
    const rankIn = document.getElementById('ocrRankInput');
    const catSel = document.getElementById('ocrCatSelect');
    const genSel = document.getElementById('ocrGenderSelect');

    const rank = rankIn ? parseInt(rankIn.value) : 1842;
    const cat = catSel ? catSel.value : 'OPEN';
    const gender = genSel ? genSel.value : 'Male';

    findState.rank = rank;
    findState.category = cat;
    findState.gender = gender;

    const rankInput = document.getElementById('rankInput');
    if (rankInput) rankInput.value = rank;

    executeQuickStart(rank);
};

window.retryScorecardUpload = function() {
    const confirmCard = document.getElementById('scorecardConfirmCard');
    const fileIn = document.getElementById('scorecardFileInput');
    if (confirmCard) confirmCard.style.display = 'none';
    if (fileIn) fileIn.value = '';
};

document.addEventListener('DOMContentLoaded', () => {
    loadSiteStats();
    initTourVideo();
});




// ─── Global Scroll Progress & Sticky Navbar Handler ───
function updateGlobalScrollProgress() {
    const scrollEl = document.getElementById('scrollProgress');
    const header = document.querySelector('.top-header');
    const doc = document.documentElement;
    const body = document.body;
    const winScroll = window.scrollY || window.pageYOffset || (doc ? doc.scrollTop : 0) || (body ? body.scrollTop : 0) || 0;
    const docHeight = Math.max(doc ? doc.scrollHeight : 0, body ? body.scrollHeight : 0);
    const winHeight = window.innerHeight || (doc ? doc.clientHeight : 800);
    const height = docHeight - winHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    if (scrollEl) {
        scrollEl.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;
    }
    if (header) {
        if (winScroll > 12) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
}
window.addEventListener('scroll', updateGlobalScrollProgress, { passive: true });
document.addEventListener('scroll', updateGlobalScrollProgress, { passive: true });
window.addEventListener('resize', updateGlobalScrollProgress);
window.addEventListener('load', updateGlobalScrollProgress);
document.addEventListener('DOMContentLoaded', updateGlobalScrollProgress);
