// ============================================================
// SAVAGE WORLDS CHARACTER CREATOR - App Logic
// ============================================================

const STEPS = [
  { id: 'setting', label: 'Setting', icon: '\u2606' },
  { id: 'concept', label: 'Concept', icon: '1' },
  { id: 'race', label: 'Ancestry', icon: '2' },
  { id: 'attributes', label: 'Attributes', icon: '3' },
  { id: 'skills', label: 'Skills', icon: '4' },
  { id: 'hindrances', label: 'Hindrances', icon: '5' },
  { id: 'edges', label: 'Edges', icon: '6' },
  { id: 'gear', label: 'Gear', icon: '7' },
  { id: 'summary', label: 'Review', icon: '8' },
];

const DIE_LABELS = { 0: '—', 4: 'd4', 6: 'd6', 8: 'd8', 10: 'd10', 12: 'd12' };

// SVG Dice Icons - each returns an inline SVG shaped like the actual die
function getDieIcon(sides) {
  const color = 'currentColor';
  const icons = {
    4: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round">
      <polygon points="12,2 2,20 22,20"/>
      <text x="12" y="17" text-anchor="middle" fill="${color}" stroke="none" font-size="8" font-weight="700" font-family="Cinzel,serif">4</text>
    </svg>`,
    6: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <text x="12" y="16" text-anchor="middle" fill="${color}" stroke="none" font-size="9" font-weight="700" font-family="Cinzel,serif">6</text>
    </svg>`,
    8: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round">
      <polygon points="12,1 23,12 12,23 1,12"/>
      <text x="12" y="16" text-anchor="middle" fill="${color}" stroke="none" font-size="9" font-weight="700" font-family="Cinzel,serif">8</text>
    </svg>`,
    10: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round">
      <polygon points="12,1 22,9 18,23 6,23 2,9"/>
      <line x1="12" y1="1" x2="6" y2="23" opacity="0.3"/>
      <line x1="12" y1="1" x2="18" y2="23" opacity="0.3"/>
      <text x="12" y="17" text-anchor="middle" fill="${color}" stroke="none" font-size="8" font-weight="700" font-family="Cinzel,serif">10</text>
    </svg>`,
    12: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round">
      <polygon points="12,1 22,8 19,20 5,20 2,8"/>
      <text x="12" y="16" text-anchor="middle" fill="${color}" stroke="none" font-size="7" font-weight="700" font-family="Cinzel,serif">12</text>
    </svg>`,
    20: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round">
      <polygon points="12,1 22,8 19,20 5,20 2,8"/>
      <polygon points="12,5 18,9 16,17 8,17 6,9" opacity="0.3"/>
      <text x="12" y="16" text-anchor="middle" fill="${color}" stroke="none" font-size="7" font-weight="700" font-family="Cinzel,serif">20</text>
    </svg>`,
  };
  return icons[sides] || '';
}

// Returns HTML with die icon + label for display (not exports)
function dieDisplay(sides) {
  if (sides === 0) return '—';
  const icon = getDieIcon(sides);
  return `<span class="die-icon">${icon}</span>`;
}

function createDefaultCharacter() {
  const attrs = {};
  SWADE.ATTRIBUTES.forEach(a => attrs[a.id] = 4);
  const skills = {};
  SWADE.SKILLS.forEach(s => skills[s.id] = s.core ? 4 : 0);
  return {
    setting: null,
    name: '',
    concept: '',
    race: null,
    heritageChoice: null,
    attributes: attrs,
    skills: skills,
    hindrances: [],
    edges: [],
    gear: [],
    funds: 500,
    hindrancePointsSpent: { attributes: 0, edges: 0, skills: 0 },
    notes: '',
  };
}

// ============================================================
// APP STATE
// ============================================================
const app = {
  currentStep: 0,
  character: createDefaultCharacter(),
  gearTab: 'melee',
  edgeFilter: 'All',
  skillFilter: 'all',

  // ----------------------------------------------------------
  // INIT
  // ----------------------------------------------------------
  init() {
    this.renderNav();
    this.goToStep(0);
  },

  // ----------------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------------
  renderNav() {
    const nav = document.getElementById('stepNav');
    nav.innerHTML = STEPS.map((s, i) => `
      <li data-step="${i}" onclick="app.goToStep(${i})" class="${i === this.currentStep ? 'active' : ''}">
        <span class="step-num">${s.icon}</span>
        <span>${s.label}</span>
      </li>
    `).join('');
    this.renderMobileNav();
  },

  renderMobileNav() {
    const mobileNav = document.getElementById('mobileNav');
    if (!mobileNav) return;
    mobileNav.innerHTML = STEPS.map((s, i) => `
      <button class="mobile-nav-btn ${i === this.currentStep ? 'active' : ''}" onclick="app.goToStep(${i})">
        <span class="mobile-nav-icon">${s.icon}</span>
        <span class="mobile-nav-label">${s.label}</span>
      </button>
    `).join('');
  },

  toggleMobileSummary() {
    const panel = document.getElementById('summaryPanel');
    const overlay = document.getElementById('summaryOverlay');
    if (panel) panel.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  },

  goToStep(i) {
    this.currentStep = i;
    this.renderNav();
    this.renderContent();
    this.renderSummary();
    document.getElementById('mainContent').scrollTop = 0;
  },

  nextStep() { if (this.currentStep < STEPS.length - 1) this.goToStep(this.currentStep + 1); },
  prevStep() { if (this.currentStep > 0) this.goToStep(this.currentStep - 1); },

  // ----------------------------------------------------------
  // BUDGET CALCULATIONS
  // ----------------------------------------------------------
  getAttributePoints() {
    const base = this.isYoung();
    const total = base !== null ? base : 5;
    let spent = 0;
    SWADE.ATTRIBUTES.forEach(a => {
      const raceMin = this.getRaceAttributeMinimum(a.id);
      const val = this.character.attributes[a.id];
      // Points spent = number of raises above base (d4), minus free racial raises
      const raceRaises = raceMin > 4 ? (raceMin - 4) / 2 : 0;
      const totalRaises = (val - 4) / 2;
      spent += Math.max(0, totalRaises - raceRaises);
    });
    const bonusFromHindrances = this.character.hindrancePointsSpent.attributes * 2; // 2 HP = 1 attr point
    return { total: total + Math.floor(bonusFromHindrances / 2), spent, remaining: total + Math.floor(bonusFromHindrances / 2) - spent };
  },

  getSkillPoints() {
    const base = this.isYoungSkillPoints();
    const total = base !== null ? base : 15;
    let spent = 0;
    SWADE.SKILLS.forEach(s => {
      const val = this.character.skills[s.id];
      if (val === 0) return;
      const linkedAttr = this.character.attributes[s.attribute];
      if (s.core) {
        // Core skills start at d4 free, each raise costs 1 up to linked attr, 2 above
        const raises = (val - 4) / 2;
        for (let r = 1; r <= raises; r++) {
          const dieAtLevel = 4 + r * 2;
          spent += dieAtLevel > linkedAttr ? 2 : 1;
        }
      } else {
        // Non-core: first d4 costs 1, then each raise costs 1 up to linked, 2 above
        spent += 1; // buying d4
        const raises = (val - 4) / 2;
        for (let r = 1; r <= raises; r++) {
          const dieAtLevel = 4 + r * 2;
          spent += dieAtLevel > linkedAttr ? 2 : 1;
        }
      }
    });
    const bonusFromHindrances = this.character.hindrancePointsSpent.skills; // 1 HP = 1 skill point
    return { total: total + bonusFromHindrances, spent, remaining: total + bonusFromHindrances - spent };
  },

  getHindrancePoints() {
    let earned = 0;
    this.character.hindrances.forEach(hId => {
      const h = this.getHindrances().find(x => x.id === hId);
      if (h) earned += h.type === 'Major' ? 2 : 1;
    });
    // Cap at 4
    earned = Math.min(earned, 4);
    const spent = this.character.hindrancePointsSpent.attributes +
                  this.character.hindrancePointsSpent.edges +
                  this.character.hindrancePointsSpent.skills;
    return { earned, spent, remaining: earned - spent };
  },

  getFreeEdgeCount() {
    let count = 0;
    // Human adaptable
    const race = this.getSelectedRace();
    if (race) {
      race.abilities.forEach(ab => {
        if (ab.type === 'free_edge') count += ab.count;
      });
      // Heritage choice
      if (this.character.heritageChoice) {
        const hc = race.abilities.find(a => a.type === 'heritage_choice');
        if (hc) {
          const chosen = hc.choices.find(c => c.id === this.character.heritageChoice);
          if (chosen) {
            chosen.effects.forEach(e => {
              if (e.type === 'free_edge') count += e.count || 1;
            });
          }
        }
      }
    }
    // Blind hindrance
    if (this.character.hindrances.includes('blind')) {
      const blind = this.getHindrances().find(h => h.id === 'blind');
      if (blind && blind.special && blind.special.freeEdges) count += blind.special.freeEdges;
    }
    // From hindrance points
    count += this.character.hindrancePointsSpent.edges;
    return count;
  },

  getEdgeBudget() {
    const free = this.getFreeEdgeCount();
    const taken = this.character.edges.length;
    return { total: free, spent: taken, remaining: free - taken };
  },

  getStartingFunds() {
    let base = 500;
    if (this.character.edges.includes('rich')) base = 1500;
    if (this.character.edges.includes('filthyRich')) base = 2500;
    if (this.character.hindrances.includes('poverty')) base = Math.floor(base / 2);
    return base;
  },

  getRemainingFunds() {
    let spent = 0;
    this.character.gear.forEach(g => {
      spent += g.cost * (g.qty || 1);
    });
    return this.getStartingFunds() - spent;
  },

  // ----------------------------------------------------------
  // RACE HELPERS
  // ----------------------------------------------------------
  getSelectedRace() {
    return this.getRaces().find(r => r.id === this.character.race);
  },

  getRaceAttributeMinimum(attrId) {
    const race = this.getSelectedRace();
    if (!race) return 4;
    let min = 4;
    race.abilities.forEach(ab => {
      if (ab.type === 'attribute_minimum' && ab.attribute === attrId) min = Math.max(min, ab.value);
    });
    // Heritage choice
    if (this.character.heritageChoice) {
      const hc = race.abilities.find(a => a.type === 'heritage_choice');
      if (hc) {
        const chosen = hc.choices.find(c => c.id === this.character.heritageChoice);
        if (chosen) {
          chosen.effects.forEach(e => {
            if (e.type === 'attribute_minimum' && e.attribute === attrId) min = Math.max(min, e.value);
          });
        }
      }
    }
    return min;
  },

  isYoung() {
    if (this.character.hindrances.includes('youngMinor')) return 4;
    if (this.character.hindrances.includes('youngMajor')) return 3;
    return null;
  },

  isYoungSkillPoints() {
    if (this.character.hindrances.includes('youngMinor') || this.character.hindrances.includes('youngMajor')) return 10;
    return null;
  },

  // ----------------------------------------------------------
  // DERIVED STATS
  // ----------------------------------------------------------
  getDerivedStats() {
    const c = this.character;
    const race = this.getSelectedRace();
    let pace = 6;
    let runDie = 6;
    let parry = 2 + Math.floor(c.skills.fighting / 2);
    let toughness = 2 + Math.floor(c.attributes.vigor / 2);
    let size = 0;
    let armorBonus = 0;

    // Race modifiers
    if (race) {
      race.abilities.forEach(ab => {
        if (ab.type === 'pace_set') pace = ab.value;
        if (ab.type === 'pace_modifier') pace += ab.value;
        if (ab.type === 'run_die') runDie = ab.value;
        if (ab.type === 'toughness_bonus') toughness += ab.value;
        if (ab.type === 'size_modifier') { size += ab.value; toughness += ab.value; }
      });
    }

    // Hindrance modifiers
    if (c.hindrances.includes('small')) { size -= 1; toughness -= 1; }
    if (c.hindrances.includes('slowMinor')) { pace = 5; runDie = 4; }
    if (c.hindrances.includes('slowMajor')) { pace = 4; runDie = 4; }
    if (c.hindrances.includes('elderly') && this.getHindrances().find(h => h.id === 'elderly')?.special) {
      pace -= 1;
    }

    // Edge modifiers
    if (c.edges.includes('fleetFooted')) { pace += 2; runDie = 10; }
    if (c.edges.includes('brawny')) { size += 1; toughness += 1; }
    if (c.edges.includes('brawler')) toughness += 1;

    // Shield parry bonus
    c.gear.forEach(g => {
      if (g.parryBonus) parry += g.parryBonus;
      if (g.armor) armorBonus = Math.max(armorBonus, g.armor);
    });

    return { pace, runDie, parry, toughness, size, armorBonus };
  },

  // ----------------------------------------------------------
  // EDGE REQUIREMENT CHECK
  // ----------------------------------------------------------
  meetsEdgeRequirements(edge) {
    const c = this.character;
    for (const req of edge.requirements) {
      switch (req.type) {
        case 'attribute':
          if (c.attributes[req.attribute] < req.minimum) return false;
          break;
        case 'skill':
          if ((c.skills[req.skill] || 0) < req.minimum) return false;
          break;
        case 'skill_any':
          if (!req.skills.some(s => (c.skills[s] || 0) >= req.minimum)) return false;
          break;
        case 'edge':
          if (!c.edges.includes(req.edge)) return false;
          break;
        case 'edge_any':
          if (!req.edges.some(e => c.edges.includes(e))) return false;
          break;
      }
    }
    // Rank check - only Novice edges for character creation
    if (edge.rank && edge.rank !== 'Novice') return false;
    return true;
  },

  formatRequirements(edge) {
    return edge.requirements.map(req => {
      switch (req.type) {
        case 'attribute': {
          const attr = SWADE.ATTRIBUTES.find(a => a.id === req.attribute);
          return `${attr ? attr.name : req.attribute} d${req.minimum}`;
        }
        case 'skill': {
          const sk = SWADE.SKILLS.find(s => s.id === req.skill);
          return `${sk ? sk.name : req.skill} d${req.minimum}`;
        }
        case 'skill_any': {
          const names = req.skills.map(s => { const sk = SWADE.SKILLS.find(x => x.id === s); return sk ? sk.name : s; });
          return `${names.join(' or ')} d${req.minimum}`;
        }
        case 'edge': {
          const ed = this.getEdges().find(e => e.id === req.edge);
          return ed ? ed.name : req.edge;
        }
        case 'edge_any': {
          const names = req.edges.map(e => { const ed = this.getEdges().find(x => x.id === e); return ed ? ed.name : e; });
          return names.join(' or ');
        }
        default: return '';
      }
    }).filter(Boolean).join(', ');
  },

  // ----------------------------------------------------------
  // RENDER MAIN CONTENT
  // ----------------------------------------------------------
  renderContent() {
    const main = document.getElementById('mainContent');
    const step = STEPS[this.currentStep].id;
    main.innerHTML = `<div class="step-content">${this['render_' + step]()}</div>`;
  },

  // ----------------------------------------------------------
  // SETTING-MERGED DATA GETTERS
  // ----------------------------------------------------------
  getSettingData() {
    if (!this.character.setting) return null;
    return SETTINGS[this.character.setting] || null;
  },

  getRaces() {
    const setting = this.getSettingData();
    if (!setting) return SWADE.RACES;
    return [...setting.RACES, ...SWADE.RACES];
  },

  getEdges() {
    const setting = this.getSettingData();
    if (!setting) return SWADE.EDGES;
    return [...SWADE.EDGES, ...setting.EDGES];
  },

  getHindrances() {
    const setting = this.getSettingData();
    if (!setting) return SWADE.HINDRANCES;
    return [...SWADE.HINDRANCES, ...setting.HINDRANCES];
  },

  getGearCategories() {
    const base = SWADE.GEAR;
    const setting = this.getSettingData();
    if (!setting) return base;
    const merged = {};
    for (const cat of Object.keys(base)) {
      merged[cat] = [...(setting.GEAR[cat] || []), ...(base[cat] || [])];
    }
    // Add any setting-only categories
    for (const cat of Object.keys(setting.GEAR)) {
      if (!merged[cat]) merged[cat] = setting.GEAR[cat];
    }
    return merged;
  },

  // ----------------------------------------------------------
  // Step 0: Setting Selection
  // ----------------------------------------------------------
  render_setting() {
    const selected = this.character.setting;
    const settingKeys = Object.keys(SETTINGS);
    return `
      <h2>Choose Your Setting</h2>
      <p class="step-desc">Select the world your character inhabits. Each setting provides unique ancestries, edges, hindrances, and gear alongside the core Savage Worlds options.</p>
      <div class="setting-grid">
        ${settingKeys.map(key => {
          const s = SETTINGS[key];
          const isSel = selected === key;
          return `
            <div class="card setting-card ${isSel ? 'selected' : ''}" onclick="app.selectSetting('${key}')" style="cursor:pointer; border-color: ${isSel ? s.color : 'var(--border)'};">
              ${s.banner ? `<img class="setting-banner" src="${s.banner}" alt="${s.name}" style="${isSel ? 'filter:brightness(1);' : ''}">` : ''}
              <div class="setting-card-body">
                <div class="card-header">
                  <span class="card-title" style="font-size:1.15rem;">
                    <span style="font-size:1.3rem; margin-right:0.4rem;">${s.icon}</span>
                    ${s.name}
                  </span>
                  ${isSel ? `<span class="card-badge" style="background:${s.color};">Selected</span>` : ''}
                </div>
                <p style="color:${s.color}; font-size:0.8rem; font-weight:600; margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.5px;">${s.subtitle}</p>
                <p class="card-desc">${s.description}</p>
                <div style="margin-top:0.8rem; display:flex; gap:0.8rem; flex-wrap:wrap;">
                  <span style="font-size:0.72rem; color:var(--text-dim); background:var(--bg-input); padding:2px 8px; border-radius:4px;">${s.RACES.length} Ancestries</span>
                  <span style="font-size:0.72rem; color:var(--text-dim); background:var(--bg-input); padding:2px 8px; border-radius:4px;">${s.EDGES.length} Edges</span>
                  <span style="font-size:0.72rem; color:var(--text-dim); background:var(--bg-input); padding:2px 8px; border-radius:4px;">${s.HINDRANCES.length} Hindrances</span>
                  <span style="font-size:0.72rem; color:var(--text-dim); background:var(--bg-input); padding:2px 8px; border-radius:4px;">Unique Gear</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${this.navButtons()}
    `;
  },

  selectSetting(key) {
    const prev = this.character.setting;
    this.character.setting = key;
    // If setting changed, reset race selection (setting races differ)
    if (prev !== key) {
      this.character.race = null;
      this.character.heritageChoice = null;
      this.character.hindrances = [];
      this.character.edges = [];
      this.character.gear = [];
      this.character.hindrancePointsSpent = { attributes: 0, edges: 0, skills: 0 };
    }
    this.renderContent();
    this.renderSummary();
  },

  // Step 1: Concept
  render_concept() {
    return `
      <h2>Character Concept</h2>
      <p class="step-desc">Define who your character is. Give them a name and a brief concept that captures their essence.</p>
      <div class="form-group">
        <label>Character Name</label>
        <input type="text" value="${this.escHtml(this.character.name)}"
               oninput="app.character.name = this.value; app.renderSummary();"
               placeholder="Enter your character's name...">
      </div>
      <div class="form-group">
        <label>Concept / Background</label>
        <textarea oninput="app.character.concept = this.value; app.renderSummary();"
                  placeholder="Grizzled bounty hunter, wandering healer, cunning thief...">${this.escHtml(this.character.concept)}</textarea>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea oninput="app.character.notes = this.value;"
                  placeholder="Any additional notes about your character...">${this.escHtml(this.character.notes)}</textarea>
      </div>
      ${this.navButtons()}
    `;
  },

  // Step 2: Race
  render_race() {
    const selected = this.character.race;
    let html = `
      <h2>Ancestry</h2>
      <p class="step-desc">Choose your character's ancestry. Each has unique abilities and traits that shape gameplay.</p>
      <div class="selection-grid">
    `;
    this.getRaces().forEach(race => {
      const isSel = selected === race.id;
      html += `
        <div class="card ${isSel ? 'selected' : ''}" onclick="app.selectRace('${race.id}')" style="cursor:pointer;">
          <div class="card-header">
            <span class="card-title">${race.name}</span>
            ${isSel ? '<span class="card-badge">Selected</span>' : ''}
          </div>
          <p class="card-desc">${race.description}</p>
          <ul class="ability-list">
            ${race.abilities.map(ab => `
              <li><span class="ability-label">${ab.label || ''}:</span> <span class="ability-desc">${ab.description || ''}</span></li>
            `).join('')}
          </ul>
          ${isSel && this.renderHeritageChoice(race) || ''}
        </div>
      `;
    });
    html += `</div>${this.navButtons()}`;
    return html;
  },

  renderHeritageChoice(race) {
    const hc = race.abilities.find(a => a.type === 'heritage_choice');
    if (!hc) return '';
    return `
      <div style="margin-top:0.8rem;">
        <label>${hc.label}</label>
        <p class="card-desc" style="margin-bottom:0.5rem;">${hc.description}</p>
        <div class="heritage-choices">
          ${hc.choices.map(ch => `
            <div class="heritage-choice ${this.character.heritageChoice === ch.id ? 'selected' : ''}"
                 onclick="event.stopPropagation(); app.character.heritageChoice = '${ch.id}'; app.applyRace(); app.renderContent(); app.renderSummary();">
              <div class="hc-name">${ch.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  selectRace(id) {
    this.character.race = id;
    this.character.heritageChoice = null;
    this.applyRace();
    this.renderContent();
    this.renderSummary();
  },

  applyRace() {
    // Reset attributes to base, then apply race minimums
    SWADE.ATTRIBUTES.forEach(a => {
      const min = this.getRaceAttributeMinimum(a.id);
      if (this.character.attributes[a.id] < min) {
        this.character.attributes[a.id] = min;
      }
    });
  },

  // Step 3: Attributes
  render_attributes() {
    const budget = this.getAttributePoints();
    let html = `
      <h2>Attributes</h2>
      <p class="step-desc">Distribute ${budget.total} points among your five attributes. Each starts at d4 and can be raised one die type per point (d4 &rarr; d6 &rarr; d8 &rarr; d10 &rarr; d12).</p>
      <div class="point-tracker">
        <div class="pt-item">
          <span class="pt-label">Points Remaining</span>
          <span class="pt-value ${budget.remaining < 0 ? 'over-budget' : budget.remaining === 0 ? 'zero' : ''}">${budget.remaining}</span>
        </div>
        <div class="pt-item">
          <span class="pt-label">Points Spent</span>
          <span class="pt-value">${budget.spent}</span>
        </div>
        <div class="pt-item">
          <span class="pt-label">Total Budget</span>
          <span class="pt-value">${budget.total}</span>
        </div>
      </div>
    `;

    SWADE.ATTRIBUTES.forEach(attr => {
      const val = this.character.attributes[attr.id];
      const raceMin = this.getRaceAttributeMinimum(attr.id);
      const canDecrease = val > raceMin;
      const canIncrease = val < 12 && budget.remaining > 0;
      html += `
        <div class="trait-row">
          <div class="trait-name">
            ${attr.name}
            <br><small>${attr.description}</small>
          </div>
          <div class="die-selector">
            <button class="die-btn" onclick="app.changeAttribute('${attr.id}', -1)" ${!canDecrease ? 'disabled' : ''}>&#9664;</button>
            <span class="die-value ${val === raceMin && val === 4 ? 'base' : ''}">${dieDisplay(val)}</span>
            <button class="die-btn" onclick="app.changeAttribute('${attr.id}', 1)" ${!canIncrease ? 'disabled' : ''}>&#9654;</button>
          </div>
          <span class="trait-cost">${val > raceMin ? ((val - raceMin) / 2) + ' pts' : 'Base'}</span>
        </div>
      `;
    });

    html += this.navButtons();
    return html;
  },

  changeAttribute(id, dir) {
    const val = this.character.attributes[id];
    const newVal = val + dir * 2;
    if (newVal < this.getRaceAttributeMinimum(id) || newVal > 12) return;
    if (dir > 0 && this.getAttributePoints().remaining <= 0) return;
    this.character.attributes[id] = newVal;
    this.renderContent();
    this.renderSummary();
  },

  // Step 4: Skills
  render_skills() {
    const budget = this.getSkillPoints();
    const filter = this.skillFilter;
    let html = `
      <h2>Skills</h2>
      <p class="step-desc">Distribute ${budget.total} skill points. Core skills (marked) start at d4 free. Raising above the linked attribute costs 2 points per step.</p>
      <div class="point-tracker">
        <div class="pt-item">
          <span class="pt-label">Points Remaining</span>
          <span class="pt-value ${budget.remaining < 0 ? 'over-budget' : budget.remaining === 0 ? 'zero' : ''}">${budget.remaining}</span>
        </div>
        <div class="pt-item">
          <span class="pt-label">Points Spent</span>
          <span class="pt-value">${budget.spent}</span>
        </div>
      </div>
      <div class="filters">
        ${['all', 'core', 'agility', 'smarts', 'spirit', 'strength', 'vigor'].map(f => `
          <button class="filter-btn ${filter === f ? 'active' : ''}" onclick="app.skillFilter='${f}'; app.renderContent();">
            ${f === 'all' ? 'All' : f === 'core' ? 'Core' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        `).join('')}
      </div>
    `;

    const filteredSkills = SWADE.SKILLS.filter(s => {
      if (filter === 'all') return true;
      if (filter === 'core') return s.core;
      return s.attribute === filter;
    });

    filteredSkills.forEach(skill => {
      const val = this.character.skills[skill.id];
      const linkedAttr = this.character.attributes[skill.attribute];
      const attrName = SWADE.ATTRIBUTES.find(a => a.id === skill.attribute)?.name || '';
      const minVal = skill.core ? 4 : 0;
      const canDecrease = val > minVal;
      const canIncrease = val < 12 && budget.remaining > 0;
      const costNext = val === 0 ? 1 : ((val + 2) > linkedAttr ? 2 : 1);

      html += `
        <div class="trait-row">
          <div class="trait-name">
            ${skill.name}
            ${skill.core ? '<span class="core-badge">CORE</span>' : ''}
            <br><small>${attrName}${val > 0 && val > linkedAttr ? ' <span style="color:var(--danger);">(above linked)</span>' : ''}</small>
          </div>
          <div class="die-selector">
            <button class="die-btn" onclick="app.changeSkill('${skill.id}', -1)" ${!canDecrease ? 'disabled' : ''}>&#9664;</button>
            <span class="die-value ${val === 0 ? 'base' : ''}">${dieDisplay(val)}</span>
            <button class="die-btn" onclick="app.changeSkill('${skill.id}', 1)" ${!canIncrease ? 'disabled' : ''}>&#9654;</button>
          </div>
          <span class="trait-cost">${canIncrease ? 'Next: ' + costNext + 'pt' : (val === 12 ? 'MAX' : '')}</span>
        </div>
      `;
    });

    html += this.navButtons();
    return html;
  },

  changeSkill(id, dir) {
    const skill = SWADE.SKILLS.find(s => s.id === id);
    const val = this.character.skills[id];
    const minVal = skill.core ? 4 : 0;
    let newVal;
    if (dir < 0) {
      newVal = val === 4 && !skill.core ? 0 : val - 2;
    } else {
      newVal = val === 0 ? 4 : val + 2;
    }
    if (newVal < minVal || newVal > 12) return;
    if (dir > 0 && this.getSkillPoints().remaining <= 0) return;
    this.character.skills[id] = newVal;
    this.renderContent();
    this.renderSummary();
  },

  // Step 5: Hindrances
  render_hindrances() {
    const hp = this.getHindrancePoints();
    const selected = this.character.hindrances;
    let majorCount = 0, minorCount = 0;
    selected.forEach(hId => {
      const h = this.getHindrances().find(x => x.id === hId);
      if (h) { if (h.type === 'Major') majorCount++; else minorCount++; }
    });

    let html = `
      <h2>Hindrances</h2>
      <p class="step-desc">Take up to one Major (2 pts) and two Minor (1 pt each) Hindrances for up to 4 points. Spend points on extra Edges, attributes, or skills.</p>
      <div class="point-tracker">
        <div class="pt-item">
          <span class="pt-label">Hindrance Points</span>
          <span class="pt-value">${hp.earned}</span>
        </div>
        <div class="pt-item">
          <span class="pt-label">Points Spent</span>
          <span class="pt-value">${hp.spent}</span>
        </div>
        <div class="pt-item">
          <span class="pt-label">Remaining</span>
          <span class="pt-value ${hp.remaining < 0 ? 'over-budget' : ''}">${hp.remaining}</span>
        </div>
        <div class="pt-item">
          <span class="pt-label">Major</span>
          <span class="pt-value">${majorCount}/1</span>
        </div>
        <div class="pt-item">
          <span class="pt-label">Minor</span>
          <span class="pt-value">${minorCount}/2</span>
        </div>
      </div>
    `;

    // Hindrance point allocation
    if (hp.earned > 0) {
      html += this.renderHindrancePointAllocation();
    }

    html += '<div class="selection-grid" style="margin-top:1rem;">';

    // Major first, then minor
    const sorted = [...this.getHindrances()].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'Major' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    sorted.forEach(h => {
      const isSel = selected.includes(h.id);
      const isMajor = h.type === 'Major';
      const maxed = isMajor ? majorCount >= 1 : minorCount >= 2;
      const disabled = !isSel && (maxed || hp.earned >= 4);

      html += `
        <div class="card ${isSel ? 'selected' : ''} ${disabled && !isSel ? 'disabled' : ''}"
             onclick="app.toggleHindrance('${h.id}')" style="cursor:pointer;">
          <div class="card-header">
            <span class="card-title">${h.name}</span>
            <span class="card-badge ${isMajor ? 'major' : 'minor'}">${h.type}</span>
          </div>
          <p class="card-desc">${h.description}</p>
        </div>
      `;
    });

    html += `</div>${this.navButtons()}`;
    return html;
  },

  renderHindrancePointAllocation() {
    const hp = this.getHindrancePoints();
    const s = this.character.hindrancePointsSpent;
    return `
      <div class="hp-allocation">
        <h3>Spend Hindrance Points (${hp.remaining} remaining)</h3>
        <div class="hp-row">
          <label>Extra Edge (2 pts each)</label>
          <div class="qty-controls">
            <button onclick="app.adjustHP('edges', -1)" ${s.edges <= 0 ? 'disabled' : ''}>-</button>
            <span class="qty-val">${s.edges}</span>
            <button onclick="app.adjustHP('edges', 1)" ${hp.remaining < 2 ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div class="hp-row">
          <label>Raise Attribute (2 pts)</label>
          <div class="qty-controls">
            <button onclick="app.adjustHP('attributes', -1)" ${s.attributes <= 0 ? 'disabled' : ''}>-</button>
            <span class="qty-val">${s.attributes}</span>
            <button onclick="app.adjustHP('attributes', 1)" ${hp.remaining < 2 ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div class="hp-row">
          <label>Extra Skill Point (1 pt each)</label>
          <div class="qty-controls">
            <button onclick="app.adjustHP('skills', -1)" ${s.skills <= 0 ? 'disabled' : ''}>-</button>
            <span class="qty-val">${s.skills}</span>
            <button onclick="app.adjustHP('skills', 1)" ${hp.remaining < 1 ? 'disabled' : ''}>+</button>
          </div>
        </div>
      </div>
    `;
  },

  adjustHP(type, dir) {
    const hp = this.getHindrancePoints();
    const cost = type === 'skills' ? 1 : 2;
    if (dir > 0 && hp.remaining < cost) return;
    if (dir < 0 && this.character.hindrancePointsSpent[type] <= 0) return;
    this.character.hindrancePointsSpent[type] += dir;
    this.renderContent();
    this.renderSummary();
  },

  toggleHindrance(id) {
    const idx = this.character.hindrances.indexOf(id);
    if (idx >= 0) {
      this.character.hindrances.splice(idx, 1);
      // Reset hindrance point spending if we now have fewer points
      this.clampHindranceSpending();
    } else {
      const h = this.getHindrances().find(x => x.id === id);
      // Check limits
      let majorCount = 0, minorCount = 0;
      this.character.hindrances.forEach(hId => {
        const hx = this.getHindrances().find(x => x.id === hId);
        if (hx) { if (hx.type === 'Major') majorCount++; else minorCount++; }
      });
      if (h.type === 'Major' && majorCount >= 1) return;
      if (h.type === 'Minor' && minorCount >= 2) return;
      this.character.hindrances.push(id);
    }
    this.renderContent();
    this.renderSummary();
  },

  clampHindranceSpending() {
    const hp = this.getHindrancePoints();
    while (hp.earned < this.character.hindrancePointsSpent.attributes * 2 + this.character.hindrancePointsSpent.edges * 2 + this.character.hindrancePointsSpent.skills) {
      if (this.character.hindrancePointsSpent.skills > 0) this.character.hindrancePointsSpent.skills--;
      else if (this.character.hindrancePointsSpent.attributes > 0) this.character.hindrancePointsSpent.attributes--;
      else if (this.character.hindrancePointsSpent.edges > 0) this.character.hindrancePointsSpent.edges--;
      else break;
    }
    // Also clamp edges if we have too many
    while (this.character.edges.length > this.getFreeEdgeCount()) {
      this.character.edges.pop();
    }
  },

  // Step 6: Edges
  render_edges() {
    const budget = this.getEdgeBudget();
    const filter = this.edgeFilter;
    const categories = ['All', ...new Set(this.getEdges().map(e => e.category))];

    let html = `
      <h2>Edges</h2>
      <p class="step-desc">Select your character's Edges. You have ${budget.total} Edge slot${budget.total !== 1 ? 's' : ''} available. Only Novice-rank Edges are available at character creation.</p>
      <div class="point-tracker">
        <div class="pt-item">
          <span class="pt-label">Edges Available</span>
          <span class="pt-value ${budget.remaining < 0 ? 'over-budget' : budget.remaining === 0 ? 'zero' : ''}">${budget.remaining}</span>
        </div>
        <div class="pt-item">
          <span class="pt-label">Edges Taken</span>
          <span class="pt-value">${budget.spent}</span>
        </div>
      </div>
      <div class="filters">
        ${categories.map(c => `
          <button class="filter-btn ${filter === c ? 'active' : ''}"
                  onclick="app.edgeFilter='${c}'; app.renderContent();">${c}</button>
        `).join('')}
      </div>
      <div class="selection-grid">
    `;

    const filteredEdges = this.getEdges().filter(e => {
      if (e.rank !== 'Novice') return false;
      if (filter !== 'All' && e.category !== filter) return false;
      return true;
    });

    filteredEdges.forEach(edge => {
      const isSel = this.character.edges.includes(edge.id);
      const meets = this.meetsEdgeRequirements(edge);
      const canTake = isSel || (meets && budget.remaining > 0);
      const reqStr = this.formatRequirements(edge);

      html += `
        <div class="card ${isSel ? 'selected' : ''} ${!canTake && !isSel ? 'disabled' : ''}"
             onclick="app.toggleEdge('${edge.id}')" style="cursor:pointer;">
          <div class="card-header">
            <span class="card-title">${edge.name}</span>
            <span class="card-badge">${edge.category}</span>
          </div>
          <p class="card-desc">${edge.description}</p>
          ${reqStr ? `<p class="card-reqs ${!meets ? 'unmet' : ''}">Requires: ${reqStr}</p>` : ''}
        </div>
      `;
    });

    html += `</div>${this.navButtons()}`;
    return html;
  },

  toggleEdge(id) {
    const idx = this.character.edges.indexOf(id);
    if (idx >= 0) {
      this.character.edges.splice(idx, 1);
    } else {
      const edge = this.getEdges().find(e => e.id === id);
      if (!edge || !this.meetsEdgeRequirements(edge)) return;
      if (this.getEdgeBudget().remaining <= 0) return;
      this.character.edges.push(id);
    }
    this.renderContent();
    this.renderSummary();
  },

  // Step 7: Gear
  render_gear() {
    const funds = this.getRemainingFunds();
    const total = this.getStartingFunds();
    const tab = this.gearTab;
    const tabs = [
      { id: 'melee', label: 'Melee' },
      { id: 'ranged', label: 'Ranged' },
      { id: 'firearms', label: 'Firearms' },
      { id: 'armor', label: 'Armor' },
      { id: 'shields', label: 'Shields' },
      { id: 'mundane', label: 'Mundane' },
    ];

    let html = `
      <h2>Gear & Equipment</h2>
      <p class="step-desc">Outfit your character. Starting funds: $${total}.</p>
      <div class="point-tracker">
        <div class="pt-item">
          <span class="pt-label">Funds Remaining</span>
          <span class="pt-value ${funds < 0 ? 'over-budget' : ''}">\$${funds}</span>
        </div>
        <div class="pt-item">
          <span class="pt-label">Total Funds</span>
          <span class="pt-value">\$${total}</span>
        </div>
      </div>
    `;

    // Owned gear
    if (this.character.gear.length > 0) {
      html += `<div class="card" style="margin-bottom:1.5rem;">
        <div class="card-header"><span class="card-title">Owned Equipment</span></div>
        <div class="table-scroll"><table class="gear-table">
          <thead><tr><th>Item</th><th>Cost</th><th>Qty</th><th></th></tr></thead>
          <tbody>`;
      this.character.gear.forEach((g, i) => {
        html += `<tr>
          <td>${g.name}</td>
          <td class="cost">\$${g.cost}</td>
          <td>
            <div class="qty-controls">
              <button onclick="app.changeGearQty(${i}, -1)">-</button>
              <span class="qty-val">${g.qty || 1}</span>
              <button onclick="app.changeGearQty(${i}, 1)">+</button>
            </div>
          </td>
          <td><button class="btn btn-danger btn-sm" onclick="app.removeGear(${i})">Drop</button></td>
        </tr>`;
      });
      html += `</tbody></table></div></div>`;
    }

    // Gear tabs
    html += `<div class="tabs">
      ${tabs.map(t => `<button class="tab ${tab === t.id ? 'active' : ''}" onclick="app.gearTab='${t.id}'; app.renderContent();">${t.label}</button>`).join('')}
    </div>`;

    const items = this.getGearCategories()[tab] || [];
    html += `<div class="table-scroll"><table class="gear-table"><thead><tr>`;
    if (tab === 'armor') {
      html += '<th>Name</th><th>Armor</th><th>Coverage</th><th>Cost</th><th>Weight</th><th></th>';
    } else if (tab === 'shields') {
      html += '<th>Name</th><th>Parry</th><th>Cost</th><th>Weight</th><th>Notes</th><th></th>';
    } else if (tab === 'melee') {
      html += '<th>Name</th><th>Damage</th><th>Cost</th><th>Weight</th><th>Notes</th><th></th>';
    } else if (tab === 'ranged' || tab === 'firearms') {
      html += '<th>Name</th><th>Damage</th><th>Range</th><th>Cost</th><th>Wt</th><th>Notes</th><th></th>';
    } else {
      html += '<th>Name</th><th>Cost</th><th>Weight</th><th>Notes</th><th></th>';
    }
    html += '</tr></thead><tbody>';

    items.forEach(item => {
      const owned = this.character.gear.find(g => g.id === item.id);
      html += `<tr class="${owned ? 'selected' : ''}">`;
      if (tab === 'armor') {
        html += `<td>${item.name}</td><td>+${item.armor}</td><td>${item.coverage}</td><td class="cost">\$${item.cost}</td><td>${item.weight}</td>`;
      } else if (tab === 'shields') {
        html += `<td>${item.name}</td><td>+${item.parryBonus}</td><td class="cost">\$${item.cost}</td><td>${item.weight}</td><td>${item.notes}</td>`;
      } else if (tab === 'melee') {
        html += `<td>${item.name}</td><td>${item.damage}</td><td class="cost">\$${item.cost}</td><td>${item.weight}</td><td>${item.notes}</td>`;
      } else if (tab === 'ranged' || tab === 'firearms') {
        html += `<td>${item.name}</td><td>${item.damage}</td><td>${item.range}</td><td class="cost">\$${item.cost}</td><td>${item.weight}</td><td>${item.notes}</td>`;
      } else {
        html += `<td>${item.name}</td><td class="cost">\$${item.cost}</td><td>${item.weight}</td><td>${item.notes}</td>`;
      }
      html += `<td><button class="btn btn-sm" onclick="app.addGear('${tab}','${item.id}')" ${funds < item.cost && !owned ? 'disabled' : ''}>${owned ? '+1' : 'Buy'}</button></td>`;
      html += '</tr>';
    });

    html += `</tbody></table></div>${this.navButtons()}`;
    return html;
  },

  addGear(category, itemId) {
    const items = this.getGearCategories()[category];
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const existing = this.character.gear.find(g => g.id === itemId);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      this.character.gear.push({ ...item, qty: 1 });
    }
    this.renderContent();
    this.renderSummary();
  },

  removeGear(index) {
    this.character.gear.splice(index, 1);
    this.renderContent();
    this.renderSummary();
  },

  changeGearQty(index, dir) {
    const g = this.character.gear[index];
    g.qty = (g.qty || 1) + dir;
    if (g.qty <= 0) this.character.gear.splice(index, 1);
    this.renderContent();
    this.renderSummary();
  },

  // Step 8: Summary / Review
  render_summary() {
    const c = this.character;
    const race = this.getSelectedRace();
    const stats = this.getDerivedStats();

    let html = `
      <h2>Character Review</h2>
      <p class="step-desc">Review your completed character sheet below.</p>
      <div class="card" style="padding:1.5rem;">
        <h2 style="color:var(--accent); margin-bottom:0.2rem;">${c.name || 'Unnamed Character'}</h2>
        <p style="color:var(--text-dim); font-style:italic; margin-bottom:1rem;">${c.concept || 'No concept set'}</p>
        <p style="color:var(--info); margin-bottom:1.5rem;">Ancestry: ${race ? race.name : 'None selected'}</p>

        <div class="derived-stats">
          <div class="derived-stat-box"><span class="ds-label">Pace</span><span class="ds-value">${stats.pace}</span></div>
          <div class="derived-stat-box"><span class="ds-label">Parry</span><span class="ds-value">${stats.parry}</span></div>
          <div class="derived-stat-box"><span class="ds-label">Toughness</span><span class="ds-value">${stats.toughness}${stats.armorBonus ? ' (' + stats.armorBonus + ')' : ''}</span></div>
          <div class="derived-stat-box"><span class="ds-label">Run Die</span><span class="ds-value">d${stats.runDie}</span></div>
        </div>

        <h3 style="color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:0.3rem; margin:1rem 0 0.5rem; text-transform:uppercase; font-size:0.85rem; letter-spacing:1px;">Attributes</h3>
        ${SWADE.ATTRIBUTES.map(a => `
          <div class="summary-row"><span class="s-label">${a.name}</span><span class="s-value">${dieDisplay(c.attributes[a.id])}</span></div>
        `).join('')}

        <h3 style="color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:0.3rem; margin:1rem 0 0.5rem; text-transform:uppercase; font-size:0.85rem; letter-spacing:1px;">Skills</h3>
        ${SWADE.SKILLS.filter(s => c.skills[s.id] > 0).map(s => `
          <div class="summary-row"><span class="s-label">${s.name}</span><span class="s-value">${dieDisplay(c.skills[s.id])}</span></div>
        `).join('')}

        ${c.hindrances.length > 0 ? `
          <h3 style="color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:0.3rem; margin:1rem 0 0.5rem; text-transform:uppercase; font-size:0.85rem; letter-spacing:1px;">Hindrances</h3>
          <ul class="summary-list">
            ${c.hindrances.map(hId => {
              const h = this.getHindrances().find(x => x.id === hId);
              return h ? `<li>${h.name} (${h.type})</li>` : '';
            }).join('')}
          </ul>
        ` : ''}

        ${c.edges.length > 0 ? `
          <h3 style="color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:0.3rem; margin:1rem 0 0.5rem; text-transform:uppercase; font-size:0.85rem; letter-spacing:1px;">Edges</h3>
          <ul class="summary-list">
            ${c.edges.map(eId => {
              const e = this.getEdges().find(x => x.id === eId);
              return e ? `<li>${e.name} &mdash; ${e.summary || ''}</li>` : '';
            }).join('')}
          </ul>
        ` : ''}

        ${c.gear.length > 0 ? `
          <h3 style="color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:0.3rem; margin:1rem 0 0.5rem; text-transform:uppercase; font-size:0.85rem; letter-spacing:1px;">Gear</h3>
          <ul class="summary-list">
            ${c.gear.map(g => `<li>${g.name}${(g.qty || 1) > 1 ? ' x' + g.qty : ''} ${g.damage ? '(' + g.damage + ')' : ''}</li>`).join('')}
          </ul>
          <div class="summary-row" style="margin-top:0.5rem;"><span class="s-label">Remaining Funds</span><span class="s-value">\$${this.getRemainingFunds()}</span></div>
        ` : ''}

        ${c.notes ? `
          <h3 style="color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:0.3rem; margin:1rem 0 0.5rem; text-transform:uppercase; font-size:0.85rem; letter-spacing:1px;">Notes</h3>
          <p class="card-desc">${this.escHtml(c.notes)}</p>
        ` : ''}
      </div>

      <div class="export-section" style="margin-top:1.5rem;">
        <h3 style="color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:0.3rem; margin-bottom:0.75rem; text-transform:uppercase; font-size:0.85rem; letter-spacing:1px;">Export Character</h3>
        <div class="export-grid">
          <button class="btn export-btn" onclick="app.exportJSON()">
            <span class="export-icon">{ }</span>
            <span class="export-label">JSON</span>
            <span class="export-desc">Raw character data</span>
          </button>
          <button class="btn export-btn export-btn--foundry" onclick="app.exportFoundryVTT()">
            <span class="export-icon">\u2694</span>
            <span class="export-label">Foundry VTT</span>
            <span class="export-desc">SWADE Actor import</span>
          </button>
          <button class="btn export-btn export-btn--roll20" onclick="app.exportRoll20()">
            <span class="export-icon">\u26CF</span>
            <span class="export-label">Roll20</span>
            <span class="export-desc">Character sheet data</span>
          </button>
          <button class="btn export-btn" onclick="window.print()">
            <span class="export-icon">\u2399</span>
            <span class="export-label">Print</span>
            <span class="export-desc">Print character sheet</span>
          </button>
        </div>
      </div>
      ${this.navButtons(true)}
    `;
    return html;
  },

  // ----------------------------------------------------------
  // SIDEBAR SUMMARY PANEL
  // ----------------------------------------------------------
  renderSummary() {
    const panel = document.getElementById('summaryPanel');
    const c = this.character;
    // Update mobile header title
    const mobileTitle = document.getElementById('mobileTitle');
    if (mobileTitle) mobileTitle.textContent = c.name || 'Savage Master';
    const race = this.getSelectedRace();
    const stats = this.getDerivedStats();

    panel.innerHTML = `
      ${this.getSettingData() ? `<div style="font-size:0.72rem; text-transform:uppercase; letter-spacing:1px; color:${this.getSettingData().color}; font-weight:600; margin-bottom:0.3rem;">${this.getSettingData().icon} ${this.getSettingData().name}</div>` : ''}
      <div class="summary-name">${c.name || 'Unnamed'}</div>
      <div class="summary-concept">${c.concept || 'No concept'}</div>
      ${race ? `<div class="summary-race">${race.name}</div>` : ''}

      <div class="summary-section" style="margin-top:1rem;">
        <h3>Derived Stats</h3>
        <div class="summary-row"><span class="s-label">Pace</span><span class="s-value">${stats.pace}</span></div>
        <div class="summary-row"><span class="s-label">Parry</span><span class="s-value">${stats.parry}</span></div>
        <div class="summary-row"><span class="s-label">Toughness</span><span class="s-value">${stats.toughness}${stats.armorBonus ? ' (' + stats.armorBonus + ')' : ''}</span></div>
        <div class="summary-row"><span class="s-label">Size</span><span class="s-value">${stats.size}</span></div>
        <div class="summary-row"><span class="s-label">Run Die</span><span class="s-value">d${stats.runDie}</span></div>
      </div>

      <div class="summary-section">
        <h3>Attributes</h3>
        ${SWADE.ATTRIBUTES.map(a => `
          <div class="summary-row"><span class="s-label">${a.name}</span><span class="s-value">${dieDisplay(c.attributes[a.id])}</span></div>
        `).join('')}
      </div>

      <div class="summary-section">
        <h3>Skills</h3>
        ${SWADE.SKILLS.filter(s => c.skills[s.id] > 0).map(s => `
          <div class="summary-row"><span class="s-label">${s.name}</span><span class="s-value">${dieDisplay(c.skills[s.id])}</span></div>
        `).join('') || '<p style="font-size:0.8rem; color:var(--text-dim);">No skills selected</p>'}
      </div>

      ${c.hindrances.length > 0 ? `
        <div class="summary-section">
          <h3>Hindrances</h3>
          <ul class="summary-list">
            ${c.hindrances.map(hId => {
              const h = this.getHindrances().find(x => x.id === hId);
              return h ? `<li>${h.name}</li>` : '';
            }).join('')}
          </ul>
        </div>
      ` : ''}

      ${c.edges.length > 0 ? `
        <div class="summary-section">
          <h3>Edges</h3>
          <ul class="summary-list">
            ${c.edges.map(eId => {
              const e = this.getEdges().find(x => x.id === eId);
              return e ? `<li>${e.name}</li>` : '';
            }).join('')}
          </ul>
        </div>
      ` : ''}

      ${c.gear.length > 0 ? `
        <div class="summary-section">
          <h3>Gear</h3>
          <ul class="summary-list">
            ${c.gear.map(g => `<li>${g.name}${(g.qty||1) > 1 ? ' x' + g.qty : ''}</li>`).join('')}
          </ul>
          <div class="summary-row" style="margin-top:0.3rem;"><span class="s-label">Funds</span><span class="s-value">\$${this.getRemainingFunds()}</span></div>
        </div>
      ` : ''}
    `;
  },

  // ----------------------------------------------------------
  // NAV BUTTONS
  // ----------------------------------------------------------
  navButtons(isLast = false) {
    return `
      <div class="nav-buttons">
        ${this.currentStep > 0 ? `<button class="btn" onclick="app.prevStep()">&#9664; Back</button>` : '<span></span>'}
        ${!isLast ? `<button class="btn btn-primary" onclick="app.nextStep()">Next &#9654;</button>` : '<span></span>'}
      </div>
    `;
  },

  // ----------------------------------------------------------
  // EXPORT / RESET
  // ----------------------------------------------------------
  exportJSON() {
    const c = this.character;
    const race = this.getSelectedRace();
    const stats = this.getDerivedStats();
    const exportData = {
      name: c.name,
      concept: c.concept,
      setting: this.getSettingData() ? this.getSettingData().name : 'Core SWADE',
      race: race ? race.name : null,
      attributes: {},
      skills: {},
      hindrances: c.hindrances.map(id => {
        const h = this.getHindrances().find(x => x.id === id);
        return h ? { name: h.name, type: h.type } : null;
      }).filter(Boolean),
      edges: c.edges.map(id => {
        const e = this.getEdges().find(x => x.id === id);
        return e ? { name: e.name, summary: e.summary } : null;
      }).filter(Boolean),
      gear: c.gear.map(g => ({ name: g.name, qty: g.qty || 1, cost: g.cost })),
      derivedStats: stats,
      remainingFunds: this.getRemainingFunds(),
      notes: c.notes,
    };
    SWADE.ATTRIBUTES.forEach(a => exportData.attributes[a.name] = DIE_LABELS[c.attributes[a.id]]);
    SWADE.SKILLS.forEach(s => { if (c.skills[s.id] > 0) exportData.skills[s.name] = DIE_LABELS[c.skills[s.id]]; });

    this._downloadJSON(exportData, (c.name || 'character').replace(/[^a-z0-9]/gi, '_') + '.json');
  },

  // ----------------------------------------------------------
  // FOUNDRY VTT EXPORT (SWADE System)
  // ----------------------------------------------------------
  exportFoundryVTT() {
    const c = this.character;
    const race = this.getSelectedRace();
    const stats = this.getDerivedStats();
    const settingData = this.getSettingData();

    // Build Foundry VTT Actor
    const actor = {
      name: c.name || 'Unnamed Character',
      type: 'character',
      img: 'icons/svg/mystery-man.svg',
      system: {
        attributes: {},
        stats: {
          speed: { value: stats.pace, runningDie: stats.runDie, runningMod: 0, adjusted: stats.pace },
          toughness: { value: stats.toughness, armor: stats.armorBonus, mod: 0 },
          parry: { value: stats.parry, mod: 0 },
          size: stats.size,
        },
        details: {
          biography: { value: c.notes ? '<p>' + this.escHtml(c.notes) + '</p>' : '' },
          species: { name: race ? race.name : '' },
          archetype: c.concept || '',
        },
        bennies: { value: 3, max: 3 },
        wounds: { value: 0, max: 3 },
        fatigue: { value: 0, max: 2 },
        wildcard: true,
        advances: { value: 0 },
        powerPoints: { value: 0, max: 0 },
        additionalStats: {},
      },
      items: [],
      prototypeToken: {
        name: c.name || 'Unnamed Character',
        displayName: 20,
        actorLink: true,
        disposition: 1,
      },
    };

    // Attributes
    SWADE.ATTRIBUTES.forEach(a => {
      actor.system.attributes[a.id] = {
        die: { sides: c.attributes[a.id], modifier: 0 },
        unShakeBonus: 0,
      };
    });

    // Skills as items
    SWADE.SKILLS.forEach(s => {
      if (c.skills[s.id] > 0) {
        actor.items.push({
          name: s.name,
          type: 'skill',
          img: 'systems/swade/assets/icons/skill.svg',
          system: {
            die: { sides: c.skills[s.id], modifier: 0 },
            attribute: s.attribute,
            isCoreSkill: s.core || false,
          },
        });
      }
    });

    // Edges as items
    c.edges.forEach(eId => {
      const edge = this.getEdges().find(x => x.id === eId);
      if (edge) {
        actor.items.push({
          name: edge.name,
          type: 'edge',
          img: 'systems/swade/assets/icons/edge.svg',
          system: {
            isArcaneBackground: edge.id.startsWith('ab'),
            requirements: { value: edge.rank || 'Novice' },
            description: edge.description || '',
          },
        });
      }
    });

    // Hindrances as items
    c.hindrances.forEach(hId => {
      const h = this.getHindrances().find(x => x.id === hId);
      if (h) {
        actor.items.push({
          name: h.name,
          type: 'hindrance',
          img: 'systems/swade/assets/icons/hindrance.svg',
          system: {
            major: h.type === 'Major',
            description: h.description || '',
          },
        });
      }
    });

    // Gear as items
    c.gear.forEach(g => {
      const qty = g.qty || 1;
      if (g.damage) {
        // Weapon
        const isRanged = !!g.range;
        actor.items.push({
          name: g.name,
          type: 'weapon',
          img: isRanged ? 'systems/swade/assets/icons/ranged-weapon.svg' : 'systems/swade/assets/icons/melee-weapon.svg',
          system: {
            damage: g.damage,
            range: g.range || '',
            ap: parseInt((g.notes || '').match(/AP\s*(\d+)/i)?.[1]) || 0,
            actions: { skill: isRanged ? 'Shooting' : 'Fighting' },
            notes: g.notes || '',
            equipped: true,
            quantity: qty,
            weight: g.weight || 0,
            price: g.cost || 0,
          },
        });
      } else if (g.armor !== undefined) {
        // Armor
        actor.items.push({
          name: g.name,
          type: 'armor',
          img: 'systems/swade/assets/icons/armor.svg',
          system: {
            armor: g.armor,
            equipped: true,
            notes: g.notes || '',
            locations: { torso: true },
            quantity: qty,
            weight: g.weight || 0,
            price: g.cost || 0,
          },
        });
      } else if (g.parryBonus) {
        // Shield
        actor.items.push({
          name: g.name,
          type: 'shield',
          img: 'systems/swade/assets/icons/shield.svg',
          system: {
            parry: g.parryBonus,
            cover: 0,
            equipped: true,
            notes: g.notes || '',
            quantity: qty,
            weight: g.weight || 0,
            price: g.cost || 0,
          },
        });
      } else {
        // Mundane gear
        actor.items.push({
          name: g.name,
          type: 'gear',
          img: 'systems/swade/assets/icons/gear.svg',
          system: {
            notes: g.notes || '',
            equipped: true,
            quantity: qty,
            weight: g.weight || 0,
            price: g.cost || 0,
          },
        });
      }
    });

    // Add racial abilities as Special Abilities
    if (race) {
      race.abilities.forEach(ab => {
        if (ab.type === 'ability' || ab.type === 'racial_hindrance') {
          actor.items.push({
            name: ab.label,
            type: 'ability',
            img: 'systems/swade/assets/icons/special-ability.svg',
            system: {
              description: ab.description || '',
              subtype: ab.type === 'racial_hindrance' ? 'race' : 'race',
            },
          });
        }
      });
    }

    // Add setting name to biography
    if (settingData) {
      actor.system.details.biography.value =
        '<p><strong>Setting:</strong> ' + this.escHtml(settingData.name + ' — ' + settingData.subtitle) + '</p>' +
        actor.system.details.biography.value;
    }

    this._downloadJSON(actor, (c.name || 'character').replace(/[^a-z0-9]/gi, '_') + '_foundry.json');
  },

  // ----------------------------------------------------------
  // ROLL20 EXPORT (SWADE Character Sheet)
  // ----------------------------------------------------------
  exportRoll20() {
    const c = this.character;
    const race = this.getSelectedRace();
    const stats = this.getDerivedStats();
    const settingData = this.getSettingData();

    // Roll20 uses flat attribute key-value pairs
    const attribs = {};
    const set = (key, val) => { attribs[key] = { current: String(val), max: '' }; };
    const setMax = (key, val, max) => { attribs[key] = { current: String(val), max: String(max) }; };

    // Character info
    set('character_name', c.name || 'Unnamed');
    set('setting', settingData ? settingData.name + ' — ' + settingData.subtitle : 'Core SWADE');
    set('race', race ? race.name : '');
    set('concept', c.concept || '');
    set('rank', 'Novice');
    set('wildcard', '1');

    // Attributes (die type number)
    SWADE.ATTRIBUTES.forEach(a => {
      set(a.id, c.attributes[a.id]);
      set(a.id + '_die', 'd' + c.attributes[a.id]);
    });

    // Derived stats
    set('pace', stats.pace);
    set('pace_running_die', 'd' + stats.runDie);
    set('parry', stats.parry);
    set('toughness', stats.toughness);
    set('toughness_armor', stats.armorBonus);
    set('size', stats.size);
    setMax('wounds', 0, 3);
    setMax('fatigue', 0, 2);
    setMax('bennies', 3, 3);

    // Skills as repeating section
    const skills = [];
    SWADE.SKILLS.forEach(s => {
      if (c.skills[s.id] > 0) {
        skills.push({
          name: s.name,
          die: 'd' + c.skills[s.id],
          attribute: s.attribute,
          core: s.core ? '1' : '0',
        });
      }
    });

    // Edges
    const edges = c.edges.map(eId => {
      const e = this.getEdges().find(x => x.id === eId);
      return e ? { name: e.name, description: e.description || '', rank: e.rank || 'Novice' } : null;
    }).filter(Boolean);

    // Hindrances
    const hindrances = c.hindrances.map(hId => {
      const h = this.getHindrances().find(x => x.id === hId);
      return h ? { name: h.name, type: h.type, description: h.description || '' } : null;
    }).filter(Boolean);

    // Gear / Weapons / Armor
    const weapons = [];
    const armor = [];
    const gear = [];
    c.gear.forEach(g => {
      const qty = g.qty || 1;
      if (g.damage) {
        weapons.push({
          name: g.name,
          damage: g.damage,
          range: g.range || 'Melee',
          rof: '1',
          ap: (g.notes || '').match(/AP\s*(\d+)/i)?.[1] || '0',
          notes: g.notes || '',
          quantity: qty,
          weight: g.weight || 0,
        });
      } else if (g.armor !== undefined) {
        armor.push({
          name: g.name,
          armor_value: g.armor,
          coverage: g.coverage || '',
          notes: g.notes || '',
          weight: g.weight || 0,
        });
      } else if (g.parryBonus) {
        armor.push({
          name: g.name,
          armor_value: 0,
          parry_bonus: g.parryBonus,
          coverage: 'Shield',
          notes: g.notes || '',
          weight: g.weight || 0,
        });
      } else {
        gear.push({
          name: g.name,
          quantity: qty,
          weight: g.weight || 0,
          notes: g.notes || '',
        });
      }
    });

    // Racial abilities
    const specials = [];
    if (race) {
      race.abilities.forEach(ab => {
        if (ab.type === 'ability' || ab.type === 'racial_hindrance' || ab.type === 'free_edge') {
          specials.push({ name: ab.label, description: ab.description || '' });
        }
      });
    }

    const roll20Data = {
      schema_version: 3,
      type: 'character',
      character: {
        name: c.name || 'Unnamed',
        bio: (settingData ? '<p><b>Setting:</b> ' + settingData.name + '</p>' : '') +
             (c.notes ? '<p>' + this.escHtml(c.notes) + '</p>' : ''),
        attribs: attribs,
        abilities: [],
      },
      repeating: {
        skills: skills,
        edges: edges,
        hindrances: hindrances,
        weapons: weapons,
        armor: armor,
        gear: gear,
        specials: specials,
      },
    };

    this._downloadJSON(roll20Data, (c.name || 'character').replace(/[^a-z0-9]/gi, '_') + '_roll20.json');
  },

  // ----------------------------------------------------------
  // DOWNLOAD HELPER
  // ----------------------------------------------------------
  _downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  resetCharacter() {
    if (!confirm('Start a new character? All current progress will be lost.')) return;
    this.character = createDefaultCharacter();
    this.goToStep(0);
  },

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------
  escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => app.init());
