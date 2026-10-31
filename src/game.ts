// Game controller: runs a Duel, turns its events into a staged show, and keeps the HUD in sync.
import { Duel, CARD_PRICE, type Choice, type Decision, type DuelEvent } from './core/duel';
import { cmp, complement, eq, frac, mul, str, sub, type Frac, HALF } from './core/frac';
import { pBet, pCoin } from './core/prob';
import type { BetEvent, CardId, LevelDef, PlayerId } from './core/types';
import { BOOTHS, LEVELS, expertLevel, levelById } from './levels';
import { BOOTH_SUBJECTS } from './themes';
import { generateNight } from './core/endless';
import type { Stage, Seat } from './scene';
import type { Sfx } from './audio';
import { allEvents, loadSave, logEvent, writeSave, type Save } from './save';
import { stickers, subjectRows } from './progress';
import { postToHost } from './host';
import { BET_NAME, CARD_INFO, cardArt, NEW_IN_LEVEL, count, rivalVerb, DUD_SVG, FACE_YOU, MYSTERY_SVG, PIE_SVG, RIVAL_FACE, RULES_HTML, fr, ltr } from './text';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

type UiState = 'title' | 'select' | 'intro' | 'play' | 'shop' | 'result' | 'paused';

interface RawP {
  n: number;
  d: number;
  note?: string;
}

export class Game {
  stage: Stage;
  sfx: Sfx;
  save: Save = loadSave();
  duel: Duel | null = null;
  level: LevelDef = LEVELS[0];
  ui: UiState = 'title';
  private animating = false;
  private attempt = 0;
  private hp: Record<string, number> = {};
  private counts = { pies: 0, duds: 0, unknown: false };
  private lastOutcome = '';
  private lastExplain = '';
  private callValue: { n: number; d: number } | null = null;
  private resumeAfterPause: UiState = 'play';
  private seedBump = 0;
  private decisionSnapshot: { pies: number; total: number } | null = null;
  private waiters: (() => void)[] = [];

  constructor(stage: Stage, sfx: Sfx) {
    this.stage = stage;
    this.sfx = sfx;
    sfx.setMuted(this.save.settings.muted);
    sfx.setMusic(this.save.settings.music !== false);
    this.applyReduced(this.save.settings.reduced);
    this.bindHud();
  }

  // ================================================================= screens

  showTitle() {
    this.ui = 'title';
    $('hud').classList.add('hidden');
    $('select').classList.add('hidden');
    $('overlay').classList.add('hidden');
    $('shop').classList.add('hidden');
    const t = $('title');
    t.classList.remove('hidden');
    const next = this.nextLevelId();
    t.innerHTML = `
      <div class="kicker">דוכן הקרנבל של חצות · הסתברות לכיתות ח׳–ט׳</div>
      <h1 class="logo">דו־קרב העוגות</h1>
      <div class="subtitle">מכונת עוגות, תערובת ידועה, סדר נסתר. סופרים מה נשאר — ומחליטים במי לזרוק.</div>
      <button class="btn gold big" id="btn-play"><svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg><span>${next === 1 ? 'שחקו' : 'המשיכו'}</span></button>
      <div class="row-btns">
        <button class="btn dark" id="btn-levels">בחירת דוכן</button>
        <button class="btn dark" id="btn-how">איך משחקים?</button>
        ${this.save.passed[4] ? `<button class="btn cyan" id="btn-night">🎡 לילה בקרנבל</button>` : ''}
      </div>
      ${this.save.passed[4] ? `<div class="keys">שיא לילות ברצף: ${ltr(this.save.nightBest ?? 0)}</div>` : ''}
      <div class="toggles">
        <label><input type="checkbox" id="opt-sound" ${this.save.settings.muted ? '' : 'checked'} /> צלילים</label>
        <label><input type="checkbox" id="opt-music" ${this.save.settings.music === false ? '' : 'checked'} /> מוזיקה</label>
        <label><input type="checkbox" id="opt-reduced" ${this.save.settings.reduced ? 'checked' : ''} /> פחות תנועה</label>
      </div>
      <div class="keys"><span><kbd>1</kbd>זריקה ליריב</span><span><kbd>2</kbd>זריקה עליי</span><span><kbd>3</kbd>תאום שני</span><span><kbd>H</kbd>מד סיכויים</span><span><kbd>P</kbd>השהיה</span><span><kbd>M</kbd>צליל</span><span><kbd>F</kbd>מהירות ×2</span></div>`;
    $('btn-play').onclick = () => this.startLevel(next);
    $('btn-levels').onclick = () => this.showSelect();
    $('btn-how').onclick = () => this.showHow();
    const night = document.getElementById('btn-night');
    if (night) night.onclick = () => this.startNight(1);
    ($('opt-sound') as HTMLInputElement).onchange = (e) => this.setMuted(!(e.target as HTMLInputElement).checked);
    ($('opt-music') as HTMLInputElement).onchange = (e) => {
      const on = (e.target as HTMLInputElement).checked;
      this.sfx.setMusic(on);
      this.save.settings.music = on;
      writeSave(this.save);
    };
    ($('opt-reduced') as HTMLInputElement).onchange = (e) => this.applyReduced((e.target as HTMLInputElement).checked);
    this.stage.setLevel('rival-bubu', 1, 'booth', 1);
    this.sfx.music(1);
    this.stage.setHopper(1, 2);
    this.stage.frame('home', 0);
  }

  private nextLevelId() {
    for (const l of LEVELS) if (!this.save.passed[l.id]) return l.id;
    return 17;
  }

  private unlocked(id: number) {
    return id === 1 || !!this.save.passed[id - 1] || !!this.save.passed[id];
  }

  showSelect() {
    this.ui = 'select';
    $('title').classList.add('hidden');
    $('overlay').classList.add('hidden');
    $('hud').classList.add('hidden');
    const s = $('select');
    s.classList.remove('hidden');
    const total = Object.values(this.save.stars).reduce((a, b) => a + b, 0);
    const next = this.nextLevelId();
    const ex = this.save.expert ?? {};
    const token = (id: number) => {
      const L = levelById(id);
      const expert = this.expertMode;
      const open = expert ? !!this.save.passed[id] : this.unlocked(id);
      const st = expert ? ex[id] ?? 0 : this.save.stars[id] ?? 0;
      const icon = expert ? '👑' : '★';
      const crown = !expert && ex[id] ? '<span class="crown">👑</span>' : '';
      return `<button class="token ${!expert && id === next ? 'next' : ''} ${L.transfer ? 'transfer' : ''} ${expert ? 'expert' : ''}" data-id="${id}" ${open ? '' : 'disabled'} title="${L.title}" aria-label="שלב ${id}: ${L.title}${open ? `, ${st} כוכבים` : ', נעול'}">${crown}<b>${ltr(id)}</b><span class="tstars">${open ? icon.repeat(st) + '<i>' + icon.repeat(3 - st) + '</i>' : '🔒'}</span></button>`;
    };
    const anyPassed = Object.keys(this.save.passed).length > 0;
    const crowns = Object.values(ex).reduce((a, b) => a + b, 0);
    s.innerHTML = `<div class="sel-head"><div class="plaque"><span class="tent"></span><div><div class="booth-name">דו־קרב העוגות</div><div class="level-name">★ ${ltr(`${total}/51`)}${crowns ? ` · 👑 ${ltr(`${crowns}/51`)}` : ''}</div></div></div>
      ${anyPassed ? `<div class="mode-toggle" role="group" aria-label="רמת קושי"><button class="${this.expertMode ? '' : 'on'}" id="mode-normal">רגיל</button><button class="${this.expertMode ? 'on' : ''}" id="mode-expert">🔥 מומחה</button></div>` : ''}
      <button class="btn dark" id="btn-back">חזרה</button></div>
      ${this.expertMode ? '<div class="mode-note">מצב מומחה: שלבים שכבר עברתם, בלי מד הסיכויים ונגד יריב חכם יותר. כל ניצחון = כתר 👑</div>' : ''}
      <div class="midway">${BOOTHS.map((b) => {
        const L = levelById(b.levels[0]);
        const open = this.unlocked(b.levels[0]);
        const img = this.stage.portrait(L.rival.model, null);
        return `<div class="stall b${b.id} ${open ? '' : 'locked'}"><div class="canopy"></div><div class="sign">${b.name}</div><div class="subj">${BOOTH_SUBJECTS[b.id].subject}</div><div class="who">${
          L.rival.seats === 2 ? `<img src="${img}" alt="" class="twin a"/><img src="${this.stage.portrait(L.rival.model, 0xb8d8ff)}" alt="" class="twin b"/>` : `<img src="${img}" alt=""/>`
        }</div><div class="rival">${b.rival}</div><div class="tokens">${b.levels.map(token).join('')}</div></div>`;
      }).join('')}</div>
      <div class="row-btns"><button class="btn dark" id="btn-notebook">📒 המחברת שלי</button><button class="btn pink big" id="btn-go">${this.expertMode ? '🔥 ' : ''}שחקו! <small>שלב ${ltr(next)}</small></button>${this.save.passed[4] ? `<button class="btn cyan" id="btn-night2">🎡 לילה בקרנבל <small>(תערובות חדשות בכל לילה)</small></button>` : ''}</div>`;
    s.querySelectorAll<HTMLButtonElement>('.token').forEach((b) => (b.onclick = () => this.startLevel(Number(b.dataset.id), undefined, this.expertMode)));
    $('btn-back').onclick = () => this.showTitle();
    document.getElementById('mode-normal')?.addEventListener('click', () => {
      this.expertMode = false;
      this.sfx.click();
      this.showSelect();
    });
    document.getElementById('mode-expert')?.addEventListener('click', () => {
      this.expertMode = true;
      this.sfx.click();
      this.showSelect();
    });
    $('btn-go').onclick = () => this.startLevel(next, undefined, this.expertMode && !!this.save.passed[next]);
    document.getElementById('btn-night2')?.addEventListener('click', () => this.startNight(1));
    $('btn-notebook').onclick = () => {
      this.sfx.click();
      this.showNotebook();
    };
  }

  /** The progress notebook: how well each subject is going, what to replay, and stickers. */
  showNotebook() {
    const rows = subjectRows(allEvents());
    const st = stickers(this.save, allEvents());
    const subj = rows
      .map((r) => {
        const b = BOOTHS.find((x) => x.id === r.booth)!;
        const pct = r.recent === null ? null : Math.round(r.recent * 100);
        const tone = pct === null ? 'none' : pct >= 80 ? 'good' : pct >= 60 ? 'mid' : 'low';
        const tip =
          r.decisions === 0
            ? this.unlocked(b.levels[0])
              ? 'עוד לא שיחקתם כאן.'
              : '🔒 נפתח בהמשך.'
            : r.replay
              ? `כדאי לחזור על <button class="link" data-replay="${r.replay}">שלב ${ltr(r.replay)} — ${levelById(r.replay).title}</button>`
              : pct !== null && pct >= 80
                ? 'שולטים בזה! נסו את מצב המומחה 🔥'
                : 'עוד קצת תרגול וזה שלכם.';
        return `<div class="nb-row ${tone}"><div class="nb-head"><b>${b.name}</b><span>${BOOTH_SUBJECTS[r.booth as 1].subject}</span></div>
          <div class="nb-bar" role="img" aria-label="${pct === null ? 'אין נתונים' : `${pct}% החלטות נכונות`}"><i style="width:${pct ?? 0}%"></i><em>${pct === null ? '—' : ltr(`${pct}%`)}</em></div>
          <div class="nb-tip">${tip}${r.decisions ? ` <small>(${ltr(`${r.correct}/${r.decisions}`)} החלטות לפי הסיכויים)</small>` : ''}</div></div>`;
      })
      .join('');
    const got = st.filter((x) => x.earned).length;
    const grid = st.map((x) => `<div class="sticker ${x.earned ? 'on' : ''}" title="${x.how}"><span>${x.earned ? x.icon : '❔'}</span><b>${x.name}</b><small>${x.how}</small></div>`).join('');
    this.overlay(
      `<h2>📒 המחברת שלי</h2><p class="nb-sub">אחוז ההחלטות שהתאימו לסיכויים בכל נושא (${ltr(30)} ההחלטות האחרונות). המזל לא נספר — רק ההחלטה.</p>
      <div class="nb">${subj}</div><h3 class="nb-st">מדבקות ${ltr(`${got}/${st.length}`)}</h3><div class="stickers">${grid}</div>
      <div class="row-btns"><button class="btn gold" id="ov-close">סגירה</button></div>`,
      { 'ov-close': () => this.closeOverlay() },
    );
    $('panel-box')
      .querySelectorAll<HTMLButtonElement>('[data-replay]')
      .forEach((b) => (b.onclick = () => this.startLevel(Number(b.dataset.replay))));
  }

  showHow() {
    this.overlay(`<h2>איך משחקים?</h2>${RULES_HTML}<p>לפני זריקה אפשר להניח את האסימון על <b>סולם ההסתברות</b> — ניחוש מדויק שווה ז׳יטונים. בין סבבים קונים קלפי טריקים שמשנים את הסיכויים.</p><div class="row-btns"><button class="btn gold" id="ov-ok">הבנתי!</button></div>`, {
      'ov-ok': () => this.closeOverlay(),
    });
  }

  private overlay(html: string, handlers: Record<string, () => void>) {
    $('overlay').classList.remove('hidden');
    $('panel-box').innerHTML = html;
    for (const [id, fn] of Object.entries(handlers)) $(id).onclick = () => {
      this.sfx.click();
      fn();
    };
  }
  private closeOverlay() {
    $('overlay').classList.add('hidden');
  }

  // ================================================================= level flow

  private night = 0;

  /** Endless carnival night: a generated, solver-checked match. */
  startNight(n: number) {
    this.night = n;
    const g = generateNight(n, (Date.now() & 0xffff) * 31 + n);
    this.startLevel(g.def.id, g.def);
  }

  /** expert mode toggle on the midway (applies to levels you've passed). */
  expertMode = false;
  private stickersHad = new Set<string>();
  private levelStartedAt = 0;

  private key(id: number) {
    return this.level.expert ? id + 1000 : id;
  }

  startLevel(id: number, def?: LevelDef, expert = false) {
    this.sfx.unlock();
    this.stickersHad = new Set(stickers(this.save, allEvents()).filter((x) => x.earned).map((x) => x.id));
    this.level = def ?? (expert ? expertLevel(levelById(id)) : levelById(id));
    const sameLevel = this.duel?.level.id === id && !!this.duel?.level.expert === !!this.level.expert;
    this.attempt = (this.attempt && sameLevel ? this.attempt : 0) + 1;
    // only the very first play of a level uses its authored (tutorial) seed; every replay is a fresh shuffle
    const plays = this.save.plays ?? (this.save.plays = {});
    const fresh = (Math.random() * 0x7fffffff) ^ (Date.now() & 0xffff) ^ (this.seedBump++ * 7919);
    const k = this.key(id);
    const seed = def || plays[k] ? fresh >>> 0 : this.level.seed;
    if (!def) {
      plays[k] = (plays[k] ?? 0) + 1;
      writeSave(this.save);
    }
    this.duel = new Duel(this.level, seed, this.save.carry[k] ?? []);
    this.levelStartedAt = performance.now();
    if (this.level.id < 100) postToHost({ type: 'level-start', level: this.level.id });
    $('title').classList.add('hidden');
    $('select').classList.add('hidden');
    $('overlay').classList.add('hidden');
    $('shop').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('explain').classList.add('hidden');
    $('toast').classList.add('hidden');
    $('coach').classList.add('hidden');
    $('banner').classList.add('hidden');
    $('cream-overlay').className = '';
    const byRival: Record<string, 1 | 2 | 3 | 4 | 5> = { 'rival-bubu': 1, 'rival-rina': 2, 'rival-twin': 3, 'rival-robo': 4, 'rival-mo': 5 };
    const themeN = this.level.id >= 100 ? byRival[this.level.rival.model] ?? 2 : this.level.booth;
    this.stage.setLevel(this.level.rival.model, this.level.rival.seats, this.level.stage ?? 'booth', themeN);
    this.sfx.music(themeN);
    this.stage.frame('home', 0);
    this.hp = Object.fromEntries(this.duel.players.map((p) => [p.id, p.hp]));
    this.lastOutcome = '';
    this.lastExplain = '';
    const booth = BOOTHS.find((b) => b.id === this.level.booth)!;
    $('booth-name').textContent = this.level.id >= 100 ? 'לילה בקרנבל' : booth.name;
    $('level-name').innerHTML = this.level.id >= 100 ? this.level.title : `שלב ${ltr(this.level.id)} · ${this.level.title}`;
    $('hud').classList.toggle('expert', !!this.level.expert);
    this.renderHp();
    this.renderHand();
    this.renderChips();
    this.ui = 'intro';
    this.setActions('none');
    const firstEver = id === 1 && this.attempt === 1 && !this.level.expert;
    const carried = (this.save.carry[k] ?? []).length;
    const newThing = this.level.id < 100 && !this.level.expert ? NEW_IN_LEVEL[this.level.id] : '';
    $('goal-card').innerHTML = `<h3>${this.level.title}</h3>${newThing ? `<div class="new-tag">✨ חדש: ${newThing}</div>` : ''}<p>${this.level.goal}</p>${firstEver ? RULES_HTML : ''}${
      this.level.transfer ? '<p>🎯 <b>שלב מבחן:</b> בלי רמזים.</p>' : ''
    }${carried ? `<p>ההחלטות הטובות מהניסיון הקודם נשמרות (${ltr(carried)}).</p>` : ''}<div class="row"><button class="btn pink" id="goal-go">יאללה!</button></div>`;
    this.intro().then(() => {
      if (this.duel?.level !== this.level) return;
      $('goal-card').classList.remove('hidden');
    });
    $('goal-go').onclick = () => {
      this.sfx.unlock();
      this.sfx.click();
      $('goal-card').classList.add('hidden');
      this.ui = 'play';
      this.run(this.duel!.drain());
    };
  }

  /** Booth subject card (first visit), then a versus banner while the camera swoops in. */
  private async intro() {
    const L = this.level;
    const d = this.duel;
    const boothN = (L.id >= 100 ? 5 : L.booth) as 1 | 2 | 3 | 4 | 5;
    const seen = this.save.seenBooths ?? (this.save.seenBooths = {});
    if (L.id < 100 && !seen[boothN] && !L.expert) {
      const subj = BOOTH_SUBJECTS[boothN];
      const booth = BOOTHS.find((b) => b.id === boothN)!;
      const card = $('booth-card');
      card.innerHTML = `<div class="bc-inner b${boothN}"><div class="canopy"></div><div class="bc-kicker">${boothN === 5 ? 'הגמר' : `דוכן ${ltr(boothN)}`} · ${subj.grade}</div><h2>${booth.name}</h2>
        <img src="${this.stage.portrait(L.rival.model)}" alt="" /><div class="bc-rival">נגד ${booth.rival}</div>
        <div class="bc-subject">הנושא: <b>${subj.subject}</b></div><ul>${subj.points.map((x) => `<li>${x}</li>`).join('')}</ul>
        <button class="btn gold big" id="booth-go">נכנסים לדוכן ›</button></div>`;
      card.classList.remove('hidden');
      this.sfx.cheer();
      await new Promise<void>((resolve) => {
        $('booth-go').onclick = () => {
          this.sfx.click();
          resolve();
        };
      });
      card.classList.add('hidden');
      seen[boothN] = true;
      writeSave(this.save);
      if (this.duel !== d) return;
    }
    // versus banner + camera swoop
    const vs = $('versus');
    const twin = L.rival.seats === 2 ? `<img class="twin2" src="${this.stage.portrait(L.rival.model, 0xb8d8ff)}" alt=""/>` : '';
    vs.innerHTML = `<div class="vs-side you"><div class="vs-face">${FACE_YOU}</div><div class="vs-name">את/ה</div></div><div class="vs-mid"><div class="vs-word">VS</div><div class="vs-level">${L.id >= 100 ? L.title : `שלב ${ltr(L.id)}`}${L.expert ? ' · 🔥 מומחה' : ''}</div><div class="vs-title">${L.id >= 100 ? '' : L.title.replace(' · מומחה', '')}</div></div><div class="vs-side rival"><div class="vs-port"><img src="${this.stage.portrait(L.rival.model)}" alt=""/>${twin}</div><div class="vs-name">${L.rival.name}</div></div>`;
    vs.classList.remove('hidden');
    this.sfx.drumroll(900);
    this.stage.frame('wide', 0);
    this.stage.frame('home', this.stage.reducedMotion ? 0 : 1500);
    for (const r of this.stage.rivals.keys()) this.stage.anim(r, 'laugh');
    let skip = false;
    vs.onclick = () => (skip = true);
    for (let t = 0; t < 1700 && !skip; t += 100) await this.stage.tweens.wait(100);
    vs.classList.add('hidden');
  }

  /** Play a batch of events, then hand control to the player or the rival. */
  private async run(events: DuelEvent[]): Promise<void> {
    const d = this.duel;
    this.animating = true;
    this.setActions('none');
    $('coach').classList.add('hidden');
    // the meter describes your next decision only; hide the stale value while the show plays
    $('meter').classList.add('off');
    $('meter-frac').textContent = '?';
    try {
      for (let i = 0; i < events.length; i++) {
        await this.play(events[i], events, i);
        // a restart or menu jump replaced the duel mid-show: drop the rest of the old show
        if (this.duel !== d) return;
      }
    } finally {
      if (this.duel === d) this.animating = false;
    }
    if (!d || this.ui === 'result') return;
    if (d.phase === 'over') return this.finish();
    if (d.phase === 'shop') return this.openShop();
    if (d.phase === 'rival') {
      await this.stage.tweens.wait(450);
      if (this.duel !== d) return;
      d.rivalStep();
      return this.run(d.drain());
    }
    this.readyForYou();
  }

  private async play(e: DuelEvent, all: DuelEvent[], i: number) {
    const d = this.duel!;
    const st = this.stage;
    switch (e.t) {
      case 'load':
        return this.showLoad(e.load);
      case 'turn':
        if (e.who !== 'you') $('thought').classList.add('hidden');
        return;
      case 'thought':
        return this.showThought(e);
      case 'card':
        if (e.who !== 'you') {
          this.toast(e.card === 'double' ? `${this.level.rival.name} שולף כפולה! ✌️` : `${this.level.rival.name} מציץ במנה הבא! 👀`);
          st.anim(e.who as Seat, 'laugh');
          this.sfx.card();
          await st.tweens.wait(900);
        } else this.sfx.card();
        return;
      case 'reveal': {
        if (e.by === 'flavor') {
          this.toast(`פנס הטעמים: המנה הבאה ב${e.flavor === 'choc' ? 'שוקולד 🍫' : 'וניל 🍦'}`);
        } else if (e.shell) {
          const what = e.shell.kind === 'pie' ? 'עוגה 🥧' : 'ריק 🎉';
          this.toast(e.by === 'peek' ? `הצצה: המנה הבאה — ${what}` : `זכוכית מגדלת: המנה השנייה — ${what}`);
        }
        this.clearCall();
        this.renderMag();
        await st.tweens.wait(500);
        return;
      }
      case 'eject':
        this.clearCall();
        this.toast(`נפלט: ${e.shell.kind === 'pie' ? 'עוגה 🥧' : 'ריק 🎉'}`);
        st.removeFromHopper(e.shell.kind);
        this.dec(e.shell.kind);
        this.renderMag();
        e.shell.kind === 'dud' ? this.sfx.pop() : this.sfx.splat();
        await st.ejectShell(e.shell.kind);
        return;
      case 'shot':
        return this.showShot(e, all[i + 1]);
      case 'hit':
        return this.showHit(e);
      case 'call':
        if (e.exact && e.paid) {
          this.toast(`ניחוש מדויק! ${ltr(str(e.value))} · +2 ז׳יטונים`);
          this.sfx.coin();
        } else if (e.exact) this.toast(`ניחוש מדויק ${ltr(str(e.value))} — אבל המד היה גלוי, אז בלי ז׳יטונים`);
        else this.toast(`הניחוש: ${ltr(str(e.value))} · הסיכוי היה ${ltr(str(e.truth))}`);
        this.clearCall();
        return;
      case 'chips':
        this.renderChips();
        return;
      case 'explain':
        return this.showExplain(e);
      case 'test':
        return this.showTests(e.results);
      case 'bet':
        return this.showBet(e);
      case 'shop':
        return;
      case 'over':
        return;
    }
    void d;
  }

  // ================================================================= event shows

  private async showLoad(load: Duel['load']) {
    const st = this.stage;
    $('thought').classList.add('hidden');
    this.clearCall();
    if (load.type === 'mag') {
      const c = { pies: 0, duds: 0 };
      for (const s of load.shells) s.kind === 'pie' ? c.pies++ : c.duds++;
      const hidden = 'counter' in load.def && load.def.counter === 'piesOfTotal';
      this.counts = { pies: c.pies, duds: c.duds, unknown: hidden };
      st.showWheels('none');
      st.setHopper(hidden ? 0 : c.pies, hidden ? 0 : c.duds, hidden ? c.pies + c.duds : 0);
      this.renderMag();
      this.renderSide();
      this.banner(hidden ? `טעינה: ${count(c.pies, 'עוגה אחת', 'עוגות')} מתוך ${ltr(c.pies + c.duds)}` : `טעינה: ${count(c.pies, 'עוגה אחת', 'עוגות')} · ${count(c.duds, 'ריק אחד', 'ריקים')}`, 'הסדר מעורבב ונסתר');
      this.sfx.whoosh();
      await st.tweens.wait(900);
      await st.shuffleHopper();
      await st.tweens.wait(450);
    } else if (load.type === 'spin') {
      st.showWheels('spin', load.pie);
      this.renderMag();
      this.renderSide();
      this.banner(`גלגל המזל: ${fr(load.pie.n, load.pie.d)} מהגלגל עוגות`, `עם החזרה — הסיכוי זהה בכל סיבוב · ${count(load.spinsLeft, 'סיבוב אחד', 'סיבובים')}`);
      this.sfx.whoosh();
      await st.tweens.wait(1500);
    } else if (load.type === 'coin') {
      st.showWheels('coin', load.a, load.b);
      this.renderMag();
      this.renderSide();
      this.banner(load.coin.n * 2 === load.coin.d ? 'מטבע בוחר גלגל' : 'מטבע מוטה בוחר גלגל', `גלגל A: ${fr(load.a.n, load.a.d)} עוגות · גלגל B: ${fr(load.b.n, load.b.d)} · P(A) = ${ltr(str(load.coin))}`);
      await st.tweens.wait(1700);
    } else if (load.type === 'bet') {
      st.showWheels('spin', load.pie);
      this.renderMag();
      this.renderSide();
      this.banner('סבב הימורים', `שני סיבובים בגלגל של ${fr(load.pie.n, load.pie.d)} עוגות`);
      await st.tweens.wait(1300);
    } else if (load.type === 'mystery') {
      st.showWheels('mystery');
      this.renderMag();
      this.renderSide();
      this.banner('המכונה המסתורית', 'לא יודעים כמה עוגות בגלגל. זרקו זריקות ניסיון על הבובה!');
      await st.tweens.wait(1400);
    }
    $('banner').classList.add('hidden');
  }

  private async showThought(e: Extract<DuelEvent, { t: 'thought' }>) {
    const name = this.level.rival.seats === 2 ? (e.who === 'r1' ? 'תאום א׳' : 'תאום ב׳') : this.level.rival.name;
    // on no-meter levels the bubble mustn't work as a meter, so it says the plan without the number
    const showP = this.level.meter.kind !== 'off' && this.duel?.load.type !== 'mystery';
    const p = e.p && showP ? ltr(str(e.p)) : '';
    const likely = e.p && cmp(e.p, HALF) < 0 ? 'dud' : 'pie';
    const text: Record<string, string> = {
      always: 'אני תמיד זורק עליך! חה!',
      odds: showP ? (likely === 'dud' ? `סיכוי לעוגה ${p}… אזרוק על עצמי.` : `סיכוי לעוגה ${p}. אליך!`) : likely === 'dud' ? 'הממ… אני מעז. אזרוק על עצמי!' : 'הממ… אליך!',
      dudDue: 'שתי עוגות ברצף… עכשיו בטוח יוצא ריק! אזרוק על עצמי.',
      pieDue: 'שני ריקים ברצף… עכשיו מגיעה עוגה! אליך!',
      peek: showP ? `${p}? לא בטוח… אציץ.` : 'לא בטוח… אציץ.',
      double: showP ? `לפחות עוגה אחת משתיים: ${p}. כפולה!` : 'כפולה!',
    };
    const th = $('thought');
    th.innerHTML = `<b>${name}:</b> ${text[e.key]}`;
    th.classList.remove('hidden');
    const pos = this.stage.screenPos(e.who as Seat);
    const app = $('app').getBoundingClientRect();
    th.style.left = `${Math.min(app.width - 260, Math.max(20, pos.x - 40))}px`;
    th.style.top = `${Math.max(90, pos.y - 150)}px`;
    th.style.transform = 'none';
    if (e.key === 'dudDue' || e.key === 'pieDue') this.stage.anim(e.who as Seat, 'laugh');
    await this.stage.tweens.wait(e.key === 'dudDue' || e.key === 'pieDue' ? 1400 : 750);
  }

  private async showShot(e: Extract<DuelEvent, { t: 'shot' }>, next?: DuelEvent) {
    const st = this.stage;
    const d = this.duel!;
    const target = e.target as Seat;
    const yours = e.shooter === 'you';
    $('thought').classList.add('hidden');
    $('toast').classList.add('hidden');
    // aim: the cannon swivels toward the target; when it's aimed at you, the camera stares down the bell
    st.frame(target === 'you' ? 'you' : 'lean', 500);
    await st.aim(target, 600);
    this.sfx.lever();
    await st.pullLever();
    const L = d.load;
    // spinner / coin rounds: spin first, then fire what came up
    if (L.type === 'spin' || L.type === 'mystery' || L.type === 'bet') {
      this.sfx.spin(1300);
      await st.spinWheel(0, e.shell.kind === 'pie', L.type === 'mystery' ? frac(1, 2) : L.pie);
    } else if (L.type === 'coin' && e.wheel) {
      await st.flipCoin(e.wheel === 'a');
      this.toast(`המטבע: גלגל ${e.wheel === 'a' ? 'A' : 'B'}`);
      this.sfx.spin(1300);
      await st.spinWheel(e.wheel === 'a' ? 0 : 1, e.shell.kind === 'pie', e.wheel === 'a' ? L.a : L.b);
    } else {
      this.sfx.drumroll(this.stage.reducedMotion ? 100 : 450);
      await st.tweens.wait(this.stage.reducedMotion ? 100 : 450);
      st.removeFromHopper(e.shell.kind);
    }
    if (L.type === 'mag' || (L.type === 'spin' && false)) this.dec(e.shell.kind);
    this.renderMag();
    this.sfx.whoosh();
    // slow motion is the payoff of your own pie on a rival; everything else plays at speed
    const slow = e.shell.kind === 'pie' && yours && target !== 'you' && !(next && next.t === 'shot');
    if (target !== 'you') st.frame(target, 700);
    await st.shoot(e.shell.kind, target, slow);
    if (e.shell.kind === 'pie') {
      if (target === 'you') this.creamYou();
      else st.splatRival(target);
      this.comic('ספלאט!', false);
      this.sfx.splat();
      if (target !== 'you' && yours) this.sfx.cheer();
    } else {
      st.pop(target);
      this.comic('פוף!', true);
      this.sfx.pop();
    }
    this.lastOutcome = `${e.shooter}→${e.target}:${e.shell.kind}`;
    await st.tweens.wait(400);
  }

  private async showHit(e: Extract<DuelEvent, { t: 'hit' }>) {
    const st = this.stage;
    const duel = this.duel;
    const who = e.who as Seat;
    if (e.cause === 'counter') {
      // the side that just took a confetti dud throws a counter-pie at the shooter
      const thrower = who === 'you' ? this.lastShotTarget() : null;
      this.toast(who === 'you' ? 'ריק! עוגת נגד אליך 😱' : 'ריק! עוגת נגד ממך! 😎');
      if (thrower) st.anim(thrower, 'laugh');
      await st.tweens.wait(350);
      const from = who === 'you' ? st.rivalHandPos(thrower ?? 'r1') : st.dareTrayPos();
      st.frame(who === 'you' ? 'home' : who, 400);
      this.sfx.whoosh();
      await st.lob(from, who, 700);
      this.splat(who);
    } else if (e.cause === 'dare') {
      this.toast(who === 'you' ? `${this.seatName(this.lastShooter())} ${this.level.rival.seats === 2 ? 'העז' : rivalVerb(this.level.rival.model, 'העז', 'העזה', 'העזו')} — עוגת בונוס אליך!` : 'אומץ! עוגת בונוס מהקהל 🎪');
      this.sfx.cheer();
      const from = who === 'you' ? st.rivalHandPos(this.lastShooter() ?? 'r1') : st.dareTrayPos();
      st.frame(who === 'you' ? 'home' : who, 400);
      await st.tweens.wait(250);
      this.sfx.whoosh();
      await st.lob(from, who, 750);
      this.splat(who);
    } else if (e.cause === 'bet') {
      const from = who === 'you' ? st.rivalHandPos('r1') : st.dareTrayPos();
      await st.lob(from, who, 700);
      this.splat(who);
    }
    if (this.duel !== duel) return;
    this.hp[e.who] = e.hp;
    this.renderHp(e.who);
    if (e.who !== 'you' && e.hp === 0) st.anim(who, 'defeat');
    await st.tweens.wait(350);
    st.frame('home', 600);
  }

  private shotLog: { shooter: PlayerId; target: PlayerId }[] = [];
  private lastShotTarget(): Seat | null {
    const s = this.lastOutcome.split(':')[0].split('→');
    return (s[1] as Seat) ?? null;
  }
  private lastShooter(): Seat | null {
    return (this.lastOutcome.split('→')[0] as Seat) || null;
  }

  private seatName(seat: Seat | null) {
    if (this.level.rival.seats === 2) return seat === 'r2' ? 'תאום ב׳' : 'תאום א׳';
    return this.level.rival.name;
  }

  private splat(who: Seat) {
    if (who === 'you') this.creamYou();
    else this.stage.splatRival(who);
    this.comic('ספלאט!', false);
    this.sfx.splat();
  }

  private creamYou() {
    this.stage.splatYou();
    const o = $('cream-overlay');
    o.className = 'on';
    $('flash').className = '';
    void $('flash').offsetWidth;
    $('flash').className = 'on';
    setTimeout(() => (o.className = 'drip'), 380);
    setTimeout(() => (o.className = ''), 1900);
    for (const r of this.stage.rivals.keys()) this.stage.anim(r, 'laugh');
  }

  private async showExplain(e: Extract<DuelEvent, { t: 'explain' }>) {
    const s = this.decisionSnapshot;
    const p = e.p;
    if (e.key === 'lucky') {
      // a wrong call that got lucky: a short, non-blocking note
      const side = cmp(p, HALF) > 0 ? 'לעוגה' : 'לריק';
      this.toast(`מזל! אבל ${this.decisionWhy || `הסיכוי ${side} היה ${ltr(str(cmp(p, HALF) > 0 ? p : complement(p)))}`} — הכיוון ההפוך היה טוב יותר`);
      this.lastExplain = e.key;
      await this.stage.tweens.wait(1200);
      return;
    }
    if (e.key === 'ejectBetter') {
      this.toast(`בדיוק ${ltr('1/2')} וקלף פליטה ביד: פליטה הייתה נותנת מידע לפני הזריקה`);
      this.lastExplain = e.key;
      await this.stage.tweens.wait(1400);
      return;
    }
    // let the cream on your screen clear before the card
    await this.stage.tweens.wait(900);
    const q = complement(p);
    const why = this.decisionWhy;
    let big = ltr(str(p));
    let icon = '🥧';
    let caption = 'הסתברות לעוגה';
    let body = '';
    const estimate = this.duel?.load.type === 'mystery';
    if (e.key === 'selfOnPies') {
      body = estimate
        ? `${why}. לפי מה שראיתם עוגה סבירה יותר — עדיף היה לזרוק על היריב.`
        : p.n === p.d
          ? `${why} — עדיף היה לזרוק על היריב.`
          : `${why}. זה יותר מחצי — עדיף היה לזרוק על היריב.`;
    } else if (e.key === 'rivalOnDuds') {
      body = estimate
        ? `${why}. לפי מה שראיתם ריק סביר יותר — עדיף היה לכוון לעצמכם.`
        : `${why}. הסתברות לריק = ${ltr(`1 − ${str(p)} = ${str(q)}`)} (המאורע המשלים) — ${q.n === q.d ? 'ודאי' : 'יותר מחצי'}. עדיף היה לכוון לעצמכם ולקבל בונוס אומץ.`;
      big = ltr(str(q));
      icon = '🎉';
      caption = 'הסתברות לריק';
    } else {
      body = `בחירה נכונה! ${why}. גם סיכוי טוב לא מבטיח — החלטות טובות הן מה שנספר לכוכבים.`;
      big = '👍';
      icon = '🍀';
      caption = '';
    }
    this.lastExplain = e.key;
    const box = $('explain');
    box.innerHTML = `<div class="row"><span class="big">${big}</span><span style="font-size:3em">${icon}</span></div>${caption ? `<div class="cap">${caption}</div>` : ''}<p>${body}</p><button class="btn gold" id="explain-ok">ממשיכים</button>`;
    box.classList.remove('hidden');
    await new Promise<void>((resolve) => {
      const done = () => {
        box.classList.add('hidden');
        this.waiters = this.waiters.filter((w) => w !== done);
        resolve();
      };
      this.waiters.push(done);
      $('explain-ok').onclick = () => {
        this.sfx.click();
        done();
      };
    });
  }

  /** A blocking cream card with a "continue" button (worked explanations). */
  private async card(html: string) {
    const box = $('explain');
    box.innerHTML = `${html}<button class="btn gold" id="explain-ok">ממשיכים</button>`;
    box.classList.remove('hidden');
    await new Promise<void>((resolve) => {
      $('explain-ok').onclick = () => {
        this.sfx.click();
        box.classList.add('hidden');
        resolve();
      };
    });
  }

  private async showTests(results: boolean[]) {
    const st = this.stage;
    st.frame('dummy', 400);
    await st.aim('dummy', 350);
    // test fire is quick: a rapid volley at the dummy, one bar-chart tick per shot
    for (const r of results) {
      await st.shoot(r ? 'pie' : 'dud', 'dummy', false, 3);
      if (r) {
        st.cream.burst(st.dummy.position.clone().setY(1.1), st.dummy.position.clone().setY(0).normalize(), 30);
        this.sfx.splat();
      } else {
        st.pop('dummy');
        this.sfx.pop();
      }
      this.renderSide();
      this.renderMag();
    }
    st.frame('home', 400);
  }

  private async showBet(e: Extract<DuelEvent, { t: 'bet' }>) {
    const st = this.stage;
    const lastDec = this.duel!.decisions[this.duel!.decisions.length - 1];
    const pie = lastDec?.kind === 'bet' ? lastDec.p : frac(1, 2);
    this.toast(`ההימור שלך: ${BET_NAME[e.event]}`);
    for (const s of e.spins) {
      this.sfx.spin(1300);
      await st.spinWheel(0, s, pie);
      this.toast(s ? 'עוגה! 🥧' : 'ריק! 🎉');
      s ? this.sfx.splat() : this.sfx.pop();
      await st.tweens.wait(500);
    }
    this.banner(e.happened ? 'ההימור הצליח!' : 'ההימור נכשל…', e.happened ? 'העוגה טסה אל היריב' : 'העוגה טסה אליך');
    await st.tweens.wait(900);
    $('banner').classList.add('hidden');
    const dec = this.duel?.decisions[this.duel.decisions.length - 1];
    if (dec && dec.kind === 'bet' && !dec.correct) {
      // the engine has already moved to the next load: work from the recorded decision
      const pp = str(dec.p);
      const qq = str(complement(dec.p));
      const options = Object.keys(dec.values) as BetEvent[];
      const form: Record<BetEvent, string> = { twoPies: `${pp}·${pp}`, noPie: `${qq}·${qq}`, exactlyOne: `${pp}·${qq} + ${qq}·${pp}`, atLeastOne: `1 − ${qq}·${qq}`, pieThenDud: `${pp}·${qq}` };
      const lines = options.map((o) => `<li>${BET_NAME[o]}: ${ltr(`${form[o]} = ${str(dec.values[o]!)}`)}</li>`).join('');
      await this.card(`<div class="row"><span class="big">🌳</span></div><p>בדיאגרמת העץ כופלים לאורך הענף:</p><ul style="text-align:start">${lines}</ul><p>${BET_NAME[dec.best[0] as BetEvent]} סביר יותר.</p>`);
    }
  }

  // ================================================================= your turn

  /** Tutorial coaching in booth 1: say what the fraction means and pulse the matching button (never forced). */
  private coach() {
    const d = this.duel!;
    const c = $('coach');
    document.querySelectorAll('.fire.pulse').forEach((b) => b.classList.remove('pulse'));
    c.classList.add('hidden');
    if (d.level.booth !== 1 || d.level.expert || d.phase !== 'decide' || d.load.type !== 'mag') return;
    const r = this.rawP();
    let msg = '';
    let btn = '';
    if (d.level.id === 1 && d.decisions.length === 0)
      msg = `${count(r.n, 'עוגה אחת', 'עוגות')} מתוך ${ltr(r.d)} מנות: הסיכוי לעוגה ${fr(r.n, r.d)} — פחות מחצי. ריק סביר יותר, אז כוונו <b>לעצמכם</b> וקבלו בונוס אומץ!`;
    else if (r.d > 0 && r.n === r.d && d.level.id <= 2) msg = `נשארו רק עוגות: ${fr(r.n, r.d)} = 1, <b>ודאי</b>. זרקו על ${this.level.rival.name}!`;
    else if (r.d > 0 && r.n === 0 && d.level.id <= 2) msg = `לא נשארה אף עוגה: ${fr(0, r.d)} = 0, <b>בלתי אפשרי</b> לחטוף. כוונו לעצמכם!`;
    else if (d.level.id === 1 && d.decisions.length === 1) msg = `עכשיו ${fr(r.n, r.d)}. ${2 * r.n > r.d ? 'יותר מחצי — זרקו על היריב.' : 2 * r.n < r.d ? 'פחות מחצי — כוונו לעצמכם.' : 'בדיוק חצי — שתי הבחירות טובות.'}`;
    if (!msg) return;
    btn = 2 * r.n > r.d ? '.fire.rival' : 2 * r.n < r.d ? '.fire.self' : '';
    c.innerHTML = `💡 ${msg}`;
    c.classList.remove('hidden');
    if (btn) document.querySelector(btn)?.classList.add('pulse');
  }

  private decisionWhy = '';

  private readyForYou() {
    const d = this.duel!;
    this.reveal = false;
    this.sidePanelFold();
    if (d.phase === 'test') this.setActions('test');
    else if (d.phase === 'bet') this.setActions('bet');
    else this.setActions('fire');
    this.renderMag();
    this.renderMeter();
    this.renderScale();
    this.renderHand();
    this.renderSide();
    this.coach();
    this.stage.aim(d.aliveRivals()[0]?.id as Seat, 400);
  }

  /** Raw "pies / shells" the player can know right now (keeps 2/4 as 2/4 so the counting stays visible). */
  rawP(): RawP {
    const d = this.duel!;
    const L = d.load;
    if (L.type === 'mag') {
      if (L.known[0]) return { n: L.shells[0].kind === 'pie' ? 1 : 0, d: 1, note: 'ידוע' };
      let pies = 0;
      let total = 0;
      L.shells.forEach((s, i) => {
        if (L.known[i]) return;
        if (L.nextFlavor && s.flavor !== L.nextFlavor) return;
        total++;
        if (s.kind === 'pie') pies++;
      });
      return { n: pies, d: total, note: L.nextFlavor ? (L.nextFlavor === 'choc' ? 'בשוקולד' : 'בווניל') : undefined };
    }
    const p = d.pYou();
    if (L.type === 'mystery') return { n: L.tests.filter(Boolean).length, d: Math.max(1, L.tests.length), note: 'הערכה' };
    if (L.type === 'coin') {
      const pc = pCoin(L.coin, L.a, L.b);
      return { n: pc.n, d: pc.d };
    }
    return { n: p.n, d: p.d };
  }

  private fire(target: 'self' | PlayerId) {
    const d = this.duel;
    if (!d || this.animating || d.phase !== 'decide' || this.ui !== 'play') return;
    this.sfx.unlock();
    this.sfx.click();
    const raw = this.rawP();
    this.decisionSnapshot = { pies: raw.n, total: raw.d };
    this.decisionWhy = this.decisionContext();
    if (this.callValue) d.call(frac(this.callValue.n, this.callValue.d));
    this.reveal = true;
    this.renderSide();
    const before = d.decisions.length;
    if (!d.fire(target)) return;
    this.logDecisions(before);
    this.run(d.drain());
  }

  private useCard(card: CardId) {
    const d = this.duel;
    if (!d || this.animating || d.phase !== 'decide' || this.ui !== 'play') return;
    const before = d.decisions.length;
    const ok = card === 'magnifier' ? d.useCard('magnifier', { index: 1 }) : card === 'double' ? d.useCard('double', { target: d.aliveRivals()[0].id }) : d.useCard(card);
    if (!ok) {
      this.toast('אי אפשר להשתמש בקלף הזה עכשיו');
      return;
    }
    this.logDecisions(before);
    this.renderHand();
    this.run(d.drain());
  }

  private logDecisions(from: number) {
    const d = this.duel!;
    for (const x of d.decisions.slice(from)) {
      logEvent({ t: Date.now(), level: d.level.id, kind: x.kind, choice: x.choice, p: str(x.pSeen), correct: x.correct, hinted: x.hinted, attempt: this.attempt, firstTry: this.attempt === 1 && !(this.save.carry[d.level.id]?.length) });
    }
  }

  // ================================================================= shop

  private openShop() {
    const d = this.duel!;
    this.ui = 'shop';
    this.stage.frame('shop', 600);
    const s = $('shop');
    s.classList.remove('hidden');
    const render = () => {
      s.innerHTML = `<div class="shop-title"><h2>חנות הקלפים</h2><small>קנו קלפים לסבב הבא (עד שלושה ביד) · יש לכם <span class="chip-ico" style="display:inline-block;width:1em;height:1em;vertical-align:middle"></span> ${ltr(d.chips)}</small></div>
      <div class="shop-cards">${d.offers
        .map((c, i) => {
          const info = CARD_INFO[c];
          const can = d.chips >= CARD_PRICE[c] && d.hand.length < 3;
          return `<button class="shop-card" data-i="${i}" style="--c1:${info.c1};--c2:${info.c2}" ${can ? '' : 'disabled'}><h3>${info.name}</h3>${cardArt(c)}<p>${info.desc}</p><div class="price"><span class="chip-ico"></span>${ltr(CARD_PRICE[c])}</div></button>`;
        })
        .join('')}</div>
      <div class="row-btns"><button class="btn cyan big" id="shop-go">לסיבוב הבא ›</button></div>
      <div class="hand-note">${d.hand.length ? `ביד: ${d.hand.map((c) => CARD_INFO[c].icon + ' ' + CARD_INFO[c].name).join(' · ')}` : ''}</div>`;
      s.querySelectorAll<HTMLButtonElement>('.shop-card').forEach(
        (b) =>
          (b.onclick = () => {
            if (d.buy(d.offers[Number(b.dataset.i)])) {
              this.sfx.coin();
              this.renderChips();
              this.renderHand();
              d.drain();
              render();
            }
          }),
      );
      $('shop-go').onclick = () => {
        this.sfx.click();
        s.classList.add('hidden');
        this.ui = 'play';
        this.stage.frame('home', 500);
        d.leaveShop();
        this.run(d.drain());
      };
    };
    render();
  }

  // ================================================================= end

  private finish() {
    const d = this.duel!;
    const r = d.result();
    this.ui = 'result';
    this.setActions('none');
    const id = d.level.id;
    const endless = id >= 100;
    const expert = !!d.level.expert;
    if (endless) {
      if (r.passed) this.save.nightBest = Math.max(this.save.nightBest ?? 0, this.night);
    } else if (expert) {
      const ex = this.save.expert ?? (this.save.expert = {});
      if (r.passed) {
        ex[id] = Math.max(ex[id] ?? 0, r.stars);
        delete this.save.carry[id + 1000];
      } else this.save.carry[id + 1000] = [...d.carry, ...d.decisions].slice(-16);
    } else if (r.passed) {
      this.save.passed[id] = true;
      this.save.stars[id] = Math.max(this.save.stars[id] ?? 0, r.stars);
      delete this.save.carry[id];
    } else {
      this.save.carry[id] = [...d.carry, ...d.decisions].slice(-16);
    }
    writeSave(this.save);
    if (!endless && r.passed) postToHost({ type: 'level-complete', level: id, stars: r.stars, durationMs: Math.round(performance.now() - this.levelStartedAt) });
    logEvent({ t: Date.now(), level: id, kind: 'match', outcome: `${r.won ? 'won' : 'lost'}/${r.passed ? 'passed' : 'not-passed'}`, attempt: this.attempt, firstTry: this.attempt === 1 });
    if (r.won) {
      this.sfx.win();
      for (const s of this.stage.rivals.keys()) this.stage.anim(s, 'defeat');
    } else {
      this.sfx.lose();
      for (const s of this.stage.rivals.keys()) this.stage.anim(s, 'cheer');
    }
    const stars = `<div class="stars-big">${[0, 1, 2].map((i) => `<span class="${i < r.stars ? 'on' : 'off'}" style="animation-delay:${0.25 + i * 0.28}s">${expert && i < r.stars ? '👑' : '★'}</span>`).join('')}</div>`;
    if (r.passed) {
      [0, 1, 2].slice(0, r.stars).forEach((i) => setTimeout(() => this.sfx.coin(), 250 + i * 280));
      this.domConfetti();
    }
    const title = r.won ? 'ניצחת! 🥧' : r.passed ? 'הפסדת בקרב — אבל עברת!' : 'הקצפת ניצחה הפעם…';
    const L0 = d.level.loads[0];
    const hint =
      L0.type === 'mystery'
        ? `השוו את השכיחות היחסית מזריקות הניסיון ל־${ltr('1/2')}. יותר ניסויים — הערכה מדויקת יותר.`
        : L0.type === 'spin' || L0.type === 'bet' || L0.type === 'coin'
          ? `בגלגל הסיכוי לא משתנה אחרי רצף. השוו את הסיכוי לעוגה ל־${ltr('1/2')}.`
          : `ספרו כמה עוגות נשארו מתוך כמה מנות, והשוו ל־${ltr('1/2')}.`;
    const why = r.won
      ? `${this.level.rival.name} ${rivalVerb(this.level.rival.model, 'מכוסה', 'מכוסה', 'מכוסים')} בקצפת.`
      : r.passed
        ? 'המזל לא היה איתך, אבל ההחלטות שלך התאימו לסיכויים — וזה מה שקובע.'
        : endless
          ? 'הקצפת ניצחה הלילה. כל לילה הוא תערובת חדשה — נסו לילה חדש!'
          : r.accuracy >= 0.8 && !r.varied
          ? 'עדיין לא ראינו אותך בוחר נכון בשני המצבים: כשעוגה סבירה יותר וכשריק סביר יותר. ההחלטות נשמרות, והסיבוב הבא יבדוק את מה שחסר.'
          : r.accuracy >= 0.8
            ? 'ההחלטות שלך התאימו לסיכויים, אבל היו מעט מדי כדי לבדוק. הן נשמרות — עוד סיבוב אחד!'
            : `נסו שוב: ${hint}`;
    const next = endless ? null : LEVELS.find((l) => l.id === id + 1);
    const wrong = d.decisions.filter((x) => !x.correct).slice(-1)[0];
    const lesson = wrong ? `<p style="font-size:.9em;opacity:.9">טעות לדוגמה: הסיכוי לעוגה היה ${ltr(str(wrong.pSeen))} ובחרת ${wrong.choice === 'self' ? 'לכוון לעצמך' : wrong.choice === 'rival' ? 'לזרוק על היריב' : CARD_INFO[wrong.choice as CardId]?.name ?? wrong.choice}. ${betterMove(wrong)}</p>` : '';
    const newStickers = stickers(this.save, allEvents()).filter((x) => x.earned && !this.stickersHad.has(x.id));
    const stickerLine = newStickers.map((x) => `<p class="unlock">🎉 מדבקה חדשה במחברת: ${x.icon} <b>${x.name}</b></p>`).join('');
    const timeline = d.decisions.length ? `<div class="timeline" aria-label="ההחלטות שלך בסיבוב">${d.decisions.slice(-14).map((x, i) => decisionChip(x, i)).join('')}</div><p class="timeline-key">🎯 על היריב · 🙃 על עצמך · ✓ לפי הסיכויים</p>` : '';
    if (r.passed && id === 17 && !expert) return this.finale(stars, r.won);
    this.overlay(
      `<h2>${title}</h2>${stars}<p>${why}</p><p>החלטות לפי הסיכויים: ${ltr(`${r.matchCorrect}/${r.matchDecisions}`)}${d.carry.length ? ` (כולל ניסיונות קודמים: ${ltr(`${r.correct}/${r.total}`)})` : ''}</p>${timeline}${lesson}${stickerLine}
      ${r.passed && !endless && !expert && next && next.booth !== d.level.booth ? `<p class="unlock">🎪 נפתח דוכן חדש: <b>${BOOTHS.find((b) => b.id === next.booth)!.name}</b> — ${BOOTH_SUBJECTS[next.booth].subject}</p>` : ''}
      ${r.passed && !endless && !expert ? '<p class="unlock">🔥 נפתח מצב מומחה לשלב הזה: בלי מד, יריב חכם יותר.</p>' : ''}
      <div class="row-btns">${r.passed && next && !expert ? `<button class="btn gold" id="ov-next">לשלב הבא ›</button>` : ''}${endless && r.passed ? `<button class="btn gold" id="ov-night">הלילה הבא ›</button>` : ''}<button class="btn ${r.passed ? 'dark' : 'pink'}" id="ov-retry">${endless && !r.passed ? 'לילה חדש' : 'שחקו שוב'}</button>${r.passed && !endless && !expert ? `<button class="btn dark" id="ov-expert">🔥 מומחה</button>` : ''}<button class="btn dark" id="ov-select">לשדרת הדוכנים</button></div>`,
      {
        ...(r.passed && next && !expert ? { 'ov-next': () => this.startLevel(next.id) } : {}),
        ...(endless && r.passed ? { 'ov-night': () => this.startNight(this.night + 1) } : {}),
        ...(r.passed && !endless && !expert ? { 'ov-expert': () => this.startLevel(id, undefined, true) } : {}),
        'ov-retry': () => (endless ? this.startNight(r.passed ? this.night : 1) : this.startLevel(id, undefined, expert)),
        'ov-select': () => this.showSelect(),
      },
    );
  }

  /** The champion's finale: trophy, fireworks, totals and where to go next. */
  private finale(stars: string, won: boolean) {
    const total = Object.values(this.save.stars).reduce((a, b) => a + b, 0);
    for (let i = 0; i < 8; i++) setTimeout(() => this.stage.fireworks(), i * 260);
    this.domConfetti();
    setTimeout(() => this.domConfetti(), 900);
    this.overlay(
      `<div class="finale"><div class="trophy">🏆</div><h2>אלופי הקרנבל!</h2>${stars}<p>${won ? 'ביג מו מכוסה בקצפת, והגביע שלכם.' : 'ביג מו ניצח בקרב — אבל ההחלטות שלכם היו של אלופים, והגביע שלכם.'} ספרתם, חישבתם — ועקפתם את המזל.</p>
      <p>סך הכול: ★ ${ltr(`${total}/51`)}</p>
      <ul><li>🔥 <b>מצב מומחה</b> נפתח לכל שלב שעברתם: בלי מד ונגד יריבים חכמים יותר — אספו כתרים 👑</li><li>🎡 <b>לילות בקרנבל</b>: תערובות חדשות בכל לילה, כמה לילות ברצף תשרדו?</li></ul></div>
      <div class="row-btns"><button class="btn gold" id="ov-night">🎡 לילה בקרנבל</button><button class="btn dark" id="ov-select">לשדרת הדוכנים</button></div>`,
      { 'ov-night': () => this.startNight(1), 'ov-select': () => this.showSelect() },
    );
  }

  // ================================================================= HUD rendering

  private bindHud() {
    $('btn-pause').onclick = () => this.togglePause();
    $('btn-sound').onclick = () => this.setMuted(!this.sfx.muted);
    $('btn-speed').onclick = () => this.setFast(!this.save.settings.fast);
    this.setFast(!!this.save.settings.fast);
    $('btn-meter').onclick = () => {
      if (this.duel?.useMeter()) {
        this.sfx.click();
        logEvent({ t: Date.now(), level: this.level.id, kind: 'hint', attempt: this.attempt, firstTry: false });
        this.renderMeter();
      }
    };
    const track = $('scale-track');
    const place = (ev: PointerEvent) => {
      if (!this.duel || this.duel.phase !== 'decide' || this.animating || !this.level.callIt) return;
      const r = track.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      const den = Math.max(1, this.rawP().d);
      const n = Math.round(x * den);
      this.callValue = { n, d: den };
      this.renderScale();
      this.sfx.click();
    };
    track.addEventListener('pointerdown', (ev) => {
      place(ev);
      track.setPointerCapture(ev.pointerId);
    });
    track.addEventListener('pointermove', (ev) => {
      if (track.hasPointerCapture(ev.pointerId)) place(ev);
    });
    $('game').addEventListener('pointerdown', (ev) => {
      if (!this.duel || this.duel.phase !== 'decide' || this.animating || this.ui !== 'play') return;
      const r = (ev.target as HTMLElement).getBoundingClientRect();
      const seat = this.stage.pick(ev.clientX - r.left, ev.clientY - r.top);
      if (seat && seat !== 'you' && (this.hp[seat] ?? 0) > 0) this.fire(seat);
    });
    window.addEventListener('keydown', (ev) => {
      if (ev.repeat) return;
      const k = ev.key.toLowerCase();
      if (k === 'p' || k === 'escape') return this.togglePause();
      if (k === 'm') return this.setMuted(!this.sfx.muted);
      if (k === 'f') return this.setFast(!this.save.settings.fast);
      if (this.ui === 'intro' && (k === 'enter' || k === ' ')) return $('goal-go')?.click();
      if (!$('explain').classList.contains('hidden') && (k === 'enter' || k === ' ')) return $('explain-ok')?.click();
      const d = this.duel;
      if (!d || this.ui !== 'play') return;
      if (k === '1') this.fire(d.aliveRivals()[0]?.id ?? 'r1');
      else if (k === '2') this.fire('self');
      else if (k === '3' && d.player('r2') && d.player('r2').hp > 0) this.fire('r2');
      else if (k === 'h') $('btn-meter').click();
      else if (k === 'r' && d.phase === 'over') this.startLevel(d.level.id);
    });
  }

  togglePause() {
    if (this.ui === 'paused') {
      this.ui = this.resumeAfterPause;
      this.closeOverlay();
      return;
    }
    if (this.ui !== 'play' && this.ui !== 'shop' && this.ui !== 'intro') return;
    this.resumeAfterPause = this.ui;
    this.ui = 'paused';
    this.overlay(`<h2>הפסקה</h2>${RULES_HTML}<div class="row-btns"><button class="btn gold" id="ov-resume">המשך</button><button class="btn dark" id="ov-restart">התחלה מחדש</button><button class="btn dark" id="ov-menu">תפריט</button></div>`, {
      'ov-resume': () => this.togglePause(),
      'ov-restart': () => this.startLevel(this.level.id),
      'ov-menu': () => this.showTitle(),
    });
  }

  get paused() {
    return this.ui === 'paused';
  }

  setMuted(m: boolean) {
    this.sfx.setMuted(m);
    this.save.settings.muted = m;
    writeSave(this.save);
    $('btn-sound').setAttribute('aria-pressed', String(!m));
  }

  /** ×2 animation speed for players who want less watching between decisions. */
  setFast(on: boolean) {
    this.save.settings.fast = on;
    // the base pace is already brisk; the toggle doubles it
    this.stage.tweens.speed = on ? 2.4 : 1.3;
    writeSave(this.save);
    $('btn-speed').setAttribute('aria-pressed', String(on));
  }

  applyReduced(on: boolean) {
    this.stage.reducedMotion = on;
    this.save.settings.reduced = on;
    writeSave(this.save);
    $('app').classList.toggle('reduced', on);
  }

  private setActions(mode: 'none' | 'fire' | 'test' | 'bet') {
    const a = $('actions');
    const d = this.duel;
    const en = mode !== 'none';
    if (mode === 'test' && d && d.load.type === 'mystery') {
      const L = d.load;
      a.innerHTML = `<div class="alt-actions"><button class="fire self small" id="t1" ${L.tests.length >= L.maxTests ? 'disabled' : ''}>זריקות ניסיון ×${ltr(1)}</button><button class="fire self small" id="t4" ${L.tests.length >= L.maxTests ? 'disabled' : ''}>זריקות ניסיון ×${ltr(4)}</button><button class="fire rival small" id="tgo" ${L.tests.length >= L.minTests ? '' : 'disabled'}>לדו־קרב!</button></div>`;
      $('t1').onclick = () => this.test(1);
      $('t4').onclick = () => this.test(4);
      $('tgo').onclick = () => {
        if (d.startDuel()) {
          this.sfx.click();
          logEvent({ t: Date.now(), level: d.level.id, kind: 'tests', p: `${L.tests.filter(Boolean).length}/${L.tests.length}`, attempt: this.attempt, firstTry: true });
          this.run(d.drain());
        }
      };
      return;
    }
    if (mode === 'bet' && d && d.load.type === 'bet') {
      const L = d.load;
      a.innerHTML = `<div class="alt-actions">${L.options.map((o, i) => `<button class="fire ${i ? 'self' : 'rival'} small" data-bet="${o}">${BET_NAME[o]}</button>`).join('')}</div>`;
      a.querySelectorAll<HTMLButtonElement>('[data-bet]').forEach(
        (b) =>
          (b.onclick = () => {
            if (this.animating) return;
            const before = d.decisions.length;
            if (d.bet(b.dataset.bet as BetEvent)) {
              this.sfx.click();
              this.logDecisions(before);
              this.run(d.drain());
            }
          }),
      );
      return;
    }
    const twins = this.level.rival.seats === 2;
    const alive = (s: PlayerId) => (this.hp[s] ?? 0) > 0;
    const pieIco = `<span class="ico">${PIE_SVG}</span>`;
    const rivalBtn = (s: PlayerId, label: string, key: string) => `<button class="fire rival ${twins ? 'small' : ''}" data-t="${s}" ${en && alive(s) ? '' : 'disabled'}>${pieIco}<span>${label}</span><kbd>${key}</kbd></button>`;
    a.innerHTML = `${twins ? rivalBtn('r1', 'זריקה לתאום א׳', '1') + rivalBtn('r2', 'זריקה לתאום ב׳', '3') : rivalBtn('r1', 'זריקה ליריב', '1')}<button class="fire self ${twins ? 'small' : ''}" data-t="self" ${en ? '' : 'disabled'}><span class="ico" style="font-size:1.4em;display:grid;place-items:center">${FACE_YOU}</span><span>זריקה עליי</span><kbd>2</kbd></button>`;
    a.querySelectorAll<HTMLButtonElement>('[data-t]').forEach((b) => (b.onclick = () => this.fire(b.dataset.t as 'self' | PlayerId)));
  }

  private test(k: number) {
    const d = this.duel!;
    if (this.animating || !d.testFire(k)) return;
    this.sfx.click();
    this.run(d.drain());
  }

  /** keep the meter just under the cream-points card (which grows with two twins) */
  private placeMeter() {
    const app = $('app').getBoundingClientRect();
    const card = $('hp-card').getBoundingClientRect();
    const m = $('meter');
    if (app.width / app.height < 0.8) {
      m.style.top = '';
      return;
    }
    m.style.top = `${card.bottom - app.top + 10}px`;
    m.style.transform = 'none';
  }

  private renderHp(changed?: string) {
    const d = this.duel!;
    const face = RIVAL_FACE[this.level.rival.model] ?? '🙂';
    const rows = d.players
      .filter((p) => p.id !== 'you')
      .map((p) => ({ id: p.id, name: this.level.rival.seats === 2 ? (p.id === 'r1' ? 'תאום א׳' : 'תאום ב׳') : this.level.rival.name, face, cls: 'rival', max: p.maxHp }))
      .concat([{ id: 'you', name: 'את/ה', face: FACE_YOU, cls: 'you', max: d.player('you').maxHp }]);
    $('hp-card').innerHTML = rows
      .map((r) => {
        const hp = this.hp[r.id] ?? 0;
        return `<div class="hp-row ${r.cls}" aria-label="${r.name}: ${hp} מתוך ${r.max}"><span class="face">${r.face}</span><span class="who">${r.name}</span><span class="pies">${Array.from({ length: r.max }, (_, i) => `<span class="hp-pie ${r.max > 6 ? 'small' : ''} ${i < hp ? '' : 'lost'}">${PIE_SVG}</span>`).join('')}</span>${changed === r.id ? `<span class="delta">${ltr('-1')}</span>` : ''}</div>`;
      })
      .join('');
    this.placeMeter();
  }

  private renderChips() {
    $('chips').textContent = String(this.duel?.chips ?? 0);
  }

  private dec(kind: 'pie' | 'dud') {
    if (kind === 'pie') this.counts.pies = Math.max(0, this.counts.pies - 1);
    else this.counts.duds = Math.max(0, this.counts.duds - 1);
  }

  private renderMag() {
    const d = this.duel;
    if (!d) return;
    const L = d.load;
    const slots = $('mag-slots');
    const sub = $('mag-sub');
    const title = $('mag-title');
    if (L.type === 'mag') {
      title.textContent = 'במכונה עכשיו';
      const { pies, duds, unknown } = this.counts;
      const total = pies + duds;
      const yourTurn = d.phase === 'decide' && !this.animating;
      let html = '';
      if (unknown) {
        for (let i = 0; i < total; i++) html += `<span class="slot">${MYSTERY_SVG}</span>`;
        sub.innerHTML = total ? `${count(pies, 'עוגה אחת', 'עוגות')} מתוך ${ltr(total)} מנות · כמה ריקים?` : '';
      } else {
        // the order is hidden, so show the counts: pies first, then duds; a peeked next shell is marked
        const next = yourTurn && L.known[0] ? L.shells[0].kind : null;
        let markedNext = false;
        for (let i = 0; i < pies; i++) {
          const mark = next === 'pie' && !markedNext;
          if (mark) markedNext = true;
          html += `<span class="slot ${mark ? 'next' : ''}">${PIE_SVG}${mark ? '<span class="tag">הבא</span>' : ''}</span>`;
        }
        for (let i = 0; i < duds; i++) {
          const mark = next === 'dud' && !markedNext;
          if (mark) markedNext = true;
          html += `<span class="slot ${mark ? 'next' : ''}">${DUD_SVG}${mark ? '<span class="tag">הבא</span>' : ''}</span>`;
        }
        const second = yourTurn && L.known[1] ? `המנה השנייה: ${L.shells[1].kind === 'pie' ? 'עוגה' : 'ריק'}` : '';
        const flav = yourTurn && L.nextFlavor ? `המנה הבאה ב${L.nextFlavor === 'choc' ? 'שוקולד 🍫' : 'וניל 🍦'}` : '';
        sub.innerHTML = [flav, second].filter(Boolean).join(' · ');
      }
      slots.innerHTML = html;
    } else if (L.type === 'spin' || L.type === 'bet') {
      title.textContent = L.type === 'bet' ? 'סבב הימורים' : 'גלגל המזל (עם החזרה)';
      slots.innerHTML = `<span class="slot">${PIE_SVG}</span><span style="align-self:center;font-weight:800;font-size:1.4em">${fr(L.pie.n, L.pie.d)}</span><span class="slot">${DUD_SVG}</span><span style="align-self:center;font-weight:800;font-size:1.4em">${ltr(str(complement(L.pie)))}</span>`;
      sub.innerHTML = L.type === 'spin' ? `${L.spinsLeft === 1 ? 'נשאר' : 'נשארו'} ${count(L.spinsLeft, 'סיבוב אחד', 'סיבובים')} · אחרי רצף הסיכוי לא משתנה` : 'שני סיבובים בלתי תלויים';
    } else if (L.type === 'coin') {
      title.textContent = L.coin.n * 2 === L.coin.d ? 'מטבע ושני גלגלים' : 'מטבע מוטה ושני גלגלים';
      slots.innerHTML = `<span style="font-weight:700">A: ${fr(L.a.n, L.a.d)}</span>&nbsp;&nbsp;<span style="font-weight:700">B: ${fr(L.b.n, L.b.d)}</span>&nbsp;&nbsp;<span>P(A) = ${ltr(str(L.coin))}</span>`;
      sub.innerHTML = `${L.spinsLeft === 1 ? 'נשארה' : 'נשארו'} ${count(L.spinsLeft, 'זריקה אחת', 'זריקות')}`;
    } else if (L.type === 'mystery') {
      title.textContent = 'המכונה המסתורית';
      const pies = L.tests.filter(Boolean).length;
      slots.innerHTML = `<span class="slot">${MYSTERY_SVG}</span>`;
      sub.innerHTML = d.phase === 'test' ? `זריקות ניסיון: ${ltr(L.tests.length)} מתוך ${ltr(L.maxTests)} · עוגות: ${ltr(pies)}` : `שכיחות יחסית מהניסוי: ${fr(pies, Math.max(1, L.tests.length))} · ${L.spinsLeft === 1 ? 'נשארה' : 'נשארו'} ${count(L.spinsLeft, 'זריקה אחת', 'זריקות')}`;
    }
  }

  private renderMeter() {
    const d = this.duel!;
    const m = $('meter');
    const rule = this.level.meter;
    const btn = $('btn-meter');
    if (rule.kind === 'off' || d.phase !== 'decide') {
      m.classList.toggle('hidden', rule.kind === 'off');
      if (rule.kind === 'off') return;
    } else m.classList.remove('hidden');
    const show = d.meterVisible() && d.phase === 'decide';
    m.classList.toggle('off', !show);
    btn.classList.toggle('hidden', rule.kind !== 'limited' || show || d.phase !== 'decide');
    $('meter-uses').textContent = rule.kind === 'limited' ? `(${d.meterUses})` : '';
    if (show) {
      const r = this.rawP();
      const p = r.d ? r.n / r.d : 0;
      $('meter-fill').style.height = `${p * 100}%`;
      const simple = frac(r.n, Math.max(1, r.d));
      const reduced = simple.d !== r.d && r.d > 1;
      $('meter-frac').innerHTML = r.d === 0 ? '—' : r.note === 'ידוע' ? `${r.n}<br><small>${r.n ? 'ודאי' : 'בלתי אפשרי'}</small>` : reduced ? `${r.n}/${r.d}<br>= ${str(simple)}` : `${r.n}/${r.d}`;
      $('meter-frac').classList.toggle('long', reduced);
    } else {
      $('meter-fill').style.height = '50%';
      $('meter-frac').textContent = '?';
    }
  }

  private renderScale() {
    const d = this.duel!;
    const sc = $('scale');
    const ticks = $('scale-ticks');
    const tok = $('scale-token');
    const hint = $('scale-hint');
    const active = this.level.callIt && d.phase === 'decide';
    sc.classList.toggle('locked', !active);
    const den = Math.max(1, this.rawP().d);
    const nTicks = den <= 12 ? den : 10;
    let h = '';
    for (let i = 0; i <= nTicks; i++) {
      const x = i / nTicks;
      const lab = nTicks === den ? (i === 0 || i === den ? '' : `${i}/${den}`) : (i / nTicks).toFixed(1);
      h += `<span class="tick" style="left:${x * 100}%"><bdi dir="ltr">${lab}</bdi></span>`;
    }
    ticks.innerHTML = h;
    if (this.callValue && active) {
      tok.classList.remove('hidden');
      tok.style.left = `${(this.callValue.n / this.callValue.d) * 100}%`;
      $('token-frac').textContent = `${this.callValue.n}/${this.callValue.d}`;
    } else tok.classList.add('hidden');
    hint.innerHTML = active ? (this.callValue ? 'האסימון במקום. ניחוש מדויק = ' + ltr('+2') + ' ז׳יטונים' : 'רוצים לנחש? הניחו את האסימון על סולם ההסתברות. לא חובה.') : '';
  }

  private clearCall() {
    this.callValue = null;
    $('scale-token').classList.add('hidden');
  }

  private renderHand() {
    const d = this.duel;
    const h = $('hand');
    if (!d || !d.hand.length) {
      h.innerHTML = '';
      return;
    }
    h.innerHTML = d.hand
      .map((c, i) => {
        const info = CARD_INFO[c];
        return `<button class="card" data-i="${i}" style="--c1:${info.c1};--c2:${info.c2}" title="${info.desc}" ${d.canUse(c) && !this.animating ? '' : 'disabled'}>${cardArt(c, 'ico')}<span>${info.name}</span></button>`;
      })
      .join('');
    h.querySelectorAll<HTMLButtonElement>('.card').forEach((b) => (b.onclick = () => this.useCard(d.hand[Number(b.dataset.i)])));
  }

  /** Left panel: tree diagram (Double), two-way table (flavors), area model (coin), test bars (mystery), bet tree. */
  /** true from the moment you decide until your next turn: the panels may show their bottom line. */
  private reveal = false;

  /** Left panel: tree diagram (Double), two-way table (flavors), area model (coin), test bars (mystery), bet tree.
   *  It shows the inputs; the bottom line stays "?" until you decide (or spend a meter use), so you do the math. */
  private renderSide() {
    const d = this.duel;
    const p = $('side-panel');
    if (!d) return p.classList.add('hidden');
    const L = d.load;
    const inputs = this.level.meter.kind !== 'off';
    const answer = this.reveal || d.meterVisible();
    const q = (v: string) => (answer ? `<b>${v}</b>` : '<b class="ask">?</b>');
    if (L.type === 'mag' && L.shells.some((s) => s.flavor)) {
      const t = { choc: { pies: 0, duds: 0 }, van: { pies: 0, duds: 0 } };
      L.shells.forEach((s, i) => {
        if (L.known[i]) return;
        t[s.flavor!][s.kind === 'pie' ? 'pies' : 'duds']++;
      });
      const lit = L.nextFlavor;
      const row = (f: 'choc' | 'van', name: string) => `<tr class="${lit === f ? 'lit' : ''}"><th>${name}</th><td>${ltr(t[f].pies)}</td><td>${ltr(t[f].duds)}</td><td>${ltr(t[f].pies + t[f].duds)}</td></tr>`;
      const tot = { pies: t.choc.pies + t.van.pies, duds: t.choc.duds + t.van.duds };
      const name = lit === 'choc' ? 'השוקולד' : 'הווניל';
      p.innerHTML = `<h4>טבלה דו־ממדית — מה נשאר</h4><table><tr><th></th><th>עוגה</th><th>ריק</th><th>סה״כ</th></tr>${row('choc', '🍫 שוקולד')}${row('van', '🍦 וניל')}<tr><th>סה״כ</th><td>${ltr(tot.pies)}</td><td>${ltr(tot.duds)}</td><td>${ltr(tot.pies + tot.duds)}</td></tr></table>${
        lit ? `<div class="eq" dir="rtl">הפנס על ${name}: עוגות בשורה ÷ כל השורה = ${q(fr(t[lit].pies, t[lit].pies + t[lit].duds))}</div>` : '<div class="eq" dir="rtl">הסתברות מותנית: מסתכלים רק על השורה שהפנס מאיר</div>'
      }`;
      p.classList.remove('hidden');
      return;
    }
    if (L.type === 'mag' && d.hand.includes('double') && L.shells.length >= 2 && (d.phase === 'decide' || this.reveal)) {
      const pool = L.shells.filter((_, i) => !L.known[i]);
      const n = pool.length;
      const k = pool.filter((s) => s.kind === 'pie').length;
      const dd = n - k;
      const show = inputs && !L.known[0] && !L.known[1];
      p.innerHTML = `<h4>דיאגרמת עץ — שתי מנות</h4>${treeSvg(show ? [`${k}/${n}`, `${dd}/${n}`, `${k - 1}/${n - 1}`, `${dd}/${n - 1}`, `${k}/${n - 1}`, `${dd - 1}/${n - 1}`] : ['?', '?', '?', '?', '?', '?'])}${
        show
          ? `<div class="eq" dir="rtl">לפחות עוגה אחת = 1 − (שני ריקים) = ${ltr(`1 − ${dd}/${n} · ${Math.max(0, dd - 1)}/${n - 1}`)} = ${q(ltr(str(complement(frac(dd * Math.max(0, dd - 1), n * (n - 1))))))}</div>`
          : '<div class="eq" dir="rtl">כפולה מצליחה אם יש לפחות עוגה אחת: 1 − (שני ריקים)</div>'
      }`;
      p.classList.remove('hidden');
      return;
    }
    if (L.type === 'coin') {
      p.innerHTML = `<h4>מודל שטח</h4>${areaSvg(L.coin, L.a, L.b)}${
        inputs ? `<div class="eq" dir="rtl">הסתברות לעוגה = שני החלקים הוורודים:</div><div class="eq">${str(L.coin)}·${str(L.a)} + ${str(complement(L.coin))}·${str(L.b)} = ${q(str(pCoin(L.coin, L.a, L.b)))}</div>` : '<div class="eq" dir="rtl">חברו את שני החלקים הוורודים</div>'
      }`;
      p.classList.remove('hidden');
      return;
    }
    if (L.type === 'bet') {
      const qq = complement(L.pie);
      p.innerHTML = `<h4>דיאגרמת עץ — שני סיבובים</h4>${treeSvg([str(L.pie), str(qq), str(L.pie), str(qq), str(L.pie), str(qq)])}<div class="eq" dir="rtl">כופלים לאורך הענף, מחברים ענפים</div>`;
      p.classList.remove('hidden');
      return;
    }
    if (L.type === 'mystery') {
      const pies = L.tests.filter(Boolean).length;
      const n = L.tests.length;
      p.innerHTML = `<h4>זריקות ניסיון על הבובה</h4>${barsSvg(pies, n - pies, L.maxTests)}<div class="eq" dir="rtl">שכיחות יחסית: ${n ? `${fr(pies, n)} ≈ ${ltr((pies / n).toFixed(2))}` : '—'}</div><div class="eq" dir="rtl" style="font-weight:500">${n && n < 8 ? 'מעט ניסויים — ההערכה עלולה לטעות' : n >= 16 ? 'הרבה ניסויים — הערכה אמינה יותר' : ''}</div>`;
      p.classList.remove('hidden');
      return;
    }
    p.classList.add('hidden');
  }

  /** On a phone the side panel starts folded to a tab; tapping toggles it. */
  private sidePanelFold() {
    const p = $('side-panel');
    if (p.dataset.bound) return;
    p.dataset.bound = '1';
    p.addEventListener('click', () => p.classList.toggle('open'));
  }

  /** One sentence about where the probability came from, written at the moment you decided. */
  private decisionContext(): string {
    const d = this.duel!;
    const L = d.load;
    const r = this.rawP();
    if (L.type === 'mag') {
      if (L.known[0]) return `הצצתם: המנה הבאה ${L.shells[0].kind === 'pie' ? 'עוגה — ודאי' : 'ריק — בלתי אפשרי לחטוף עוגה'}`;
      if (L.nextFlavor) return `הפנס הראה ${L.nextFlavor === 'choc' ? 'שוקולד' : 'וניל'}: בשורה הזו ${count(r.n, 'עוגה אחת', 'עוגות')} מתוך ${ltr(r.d)} — הסתברות מותנית ${fr(r.n, r.d)}`;
      if (r.n === r.d) return `נשארו רק עוגות: ${fr(r.n, r.d)} = 1, ודאי`;
      if (r.n === 0) return `לא נשארה אף עוגה: ${fr(0, r.d)} = 0, בלתי אפשרי`;
      const seen = L.known.some(Boolean) ? ' (בלי המנה שראיתם)' : '';
      return `${r.n === 1 ? 'נשארה' : 'נשארו'} ${count(r.n, 'עוגה אחת', 'עוגות')} מתוך ${ltr(r.d)} מנות${seen}: הסתברות לעוגה ${fr(r.n, r.d)}`;
    }
    if (L.type === 'spin') return `בגלגל ${fr(L.pie.n, L.pie.d)} עוגות, עם החזרה — אותו סיכוי בכל סיבוב, גם אחרי רצף`;
    if (L.type === 'coin') return `מודל שטח: ${ltr(`${str(L.coin)}·${str(L.a)} + ${str(complement(L.coin))}·${str(L.b)} = ${str(pCoin(L.coin, L.a, L.b))}`)}`;
    if (L.type === 'mystery') {
      const n = L.tests.length;
      return `ההערכה מהניסויים: ${fr(r.n, n)} (שכיחות יחסית)${n < 10 ? ` — רק ${count(n, 'ניסוי אחד', 'ניסויים')}, אז ההערכה יכולה לטעות` : ''}`;
    }
    return '';
  }

  // ================================================================= small UI helpers

  private domConfetti() {
    const box = document.createElement('div');
    box.className = 'dom-confetti';
    const cols = ['#ff4fa3', '#3ee6ff', '#ffc35a', '#7ee07a', '#b36bff'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = cols[i % cols.length];
      p.style.animationDelay = `${Math.random() * 0.6}s`;
      p.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
    }
    $('app').appendChild(box);
    setTimeout(() => box.remove(), 3600);
  }

  private toastTimer = 0;
  toast(html: string) {
    const t = $('toast');
    t.innerHTML = html;
    t.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.add('hidden'), 2200);
  }

  banner(main: string, small = '') {
    const b = $('banner');
    b.innerHTML = `${main}${small ? `<small>${small}</small>` : ''}`;
    b.classList.remove('hidden');
  }

  comic(text: string, confetti: boolean) {
    $('banner').classList.add('hidden');
    const c = $('comic');
    c.textContent = text;
    c.className = `comic ${confetti ? 'confetti' : ''}`;
    void c.offsetWidth;
    setTimeout(() => c.classList.add('hidden'), 950);
  }

  // ================================================================= test hooks

  describe() {
    const d = this.duel;
    const base: Record<string, unknown> = { screen: this.ui, coordinates: 'n/a (first-person table view; seats: you, r1, r2)' };
    if (!d) return base;
    const L = d.load;
    const yourMove = d.phase === 'decide' && !this.animating && this.ui === 'play';
    const raw = d.phase !== 'test' ? this.rawP() : null;
    return {
      ...base,
      level: { id: d.level.id, title: d.level.title, booth: d.level.booth, rival: d.level.rival.name, transfer: !!d.level.transfer },
      objective: d.level.goal,
      phase: d.phase,
      animating: this.animating,
      yourMove,
      hp: { ...this.hp },
      load:
        L.type === 'mag'
          ? { type: 'mag', piesLeft: this.counts.pies, dudsLeft: this.counts.duds, counter: this.counts.unknown ? 'piesOfTotal' : 'icons', nextKnown: L.known[0] ? L.shells[0].kind : null, nextFlavor: L.nextFlavor ?? null }
          : L.type === 'spin' || L.type === 'bet'
            ? { type: L.type, pie: str(L.pie), left: d.shellsLeft() }
            : L.type === 'coin'
              ? { type: 'coin', coin: str(L.coin), a: str(L.a), b: str(L.b), left: L.spinsLeft }
              : { type: 'mystery', tests: `${L.tests.filter(Boolean).length}/${L.tests.length}`, left: L.spinsLeft },
      pNextPie: yourMove && raw ? `${raw.n}/${raw.d}` : null,
      meterVisible: d.meterVisible(),
      options: yourMove ? Object.fromEntries(Object.entries(d.options().values).map(([k, v]) => [k, str(v!)])) : null,
      best: yourMove ? d.options().best : null,
      chips: d.chips,
      hand: d.hand,
      call: this.callValue ? `${this.callValue.n}/${this.callValue.d}` : null,
      decisions: d.decisions.map((x) => `${x.choice}@${str(x.pSeen)}:${x.correct ? 'ok' : 'x'}`),
      lastOutcome: this.lastOutcome,
      lastExplain: this.lastExplain,
      result: d.phase === 'over' ? { winner: d.winner, ...d.result() } : null,
      stage: this.stage.describe(),
    };
  }
}

function betterMove(x: Decision) {
  const best = x.best[0] as Choice;
  const name = best === 'self' ? 'זריקה על עצמך' : best === 'rival' ? 'זריקה על היריב' : best === 'eject' ? 'פליטה (בדיוק חצי — כדאי לקבל מידע)' : best === 'double' ? 'כפולה' : BET_NAME[best as BetEvent] ?? best;
  return `המהלך הטוב: ${name}.`;
}

function treeSvg(l: string[]) {
  const t = (x: number, y: number, s: string) => `<text x="${x}" y="${y}" fill="#ffe9b0" font-size="13" font-weight="700" text-anchor="middle">${s}</text>`;
  return `<svg viewBox="0 0 240 130" direction="ltr">
  <g stroke="#fff8" stroke-width="2" fill="none"><path d="M12 65 L92 30 M12 65 L92 100 M110 30 L190 12 M110 30 L190 48 M110 100 L190 82 M110 100 L190 118"/></g>
  ${t(52, 38, l[0])}${t(52, 98, l[1])}${t(150, 14, l[2])}${t(150, 50, l[3])}${t(150, 84, l[4])}${t(150, 124, l[5])}
  <g font-size="14">${['🥧', '🎉'].map((e, i) => `<text x="101" y="${i ? 105 : 35}" text-anchor="middle">${e}</text>`).join('')}${['🥧', '🎉', '🥧', '🎉'].map((e, i) => `<text x="205" y="${[17, 53, 87, 123][i]}" text-anchor="middle">${e}</text>`).join('')}</g></svg>`;
}

function areaSvg(coin: Frac, a: Frac, b: Frac) {
  const w = 220;
  const h = 120;
  const wa = (coin.n / coin.d) * w;
  const ha = (a.n / a.d) * h;
  const hb = (b.n / b.d) * h;
  return `<svg viewBox="0 0 ${w + 4} ${h + 22}" direction="ltr">
  <rect x="2" y="2" width="${wa}" height="${h}" fill="#29c7e8"/><rect x="2" y="${2 + h - ha}" width="${wa}" height="${ha}" fill="#ff4fa3"/>
  <rect x="${2 + wa}" y="2" width="${w - wa}" height="${h}" fill="#1a8fb0"/><rect x="${2 + wa}" y="${2 + h - hb}" width="${w - wa}" height="${hb}" fill="#c43a85"/>
  <rect x="2" y="2" width="${w}" height="${h}" fill="none" stroke="#fff" stroke-width="2"/><line x1="${2 + wa}" y1="2" x2="${2 + wa}" y2="${h + 2}" stroke="#fff" stroke-width="2"/>
  <text x="${2 + wa / 2}" y="${h + 18}" fill="#fff" font-size="13" text-anchor="middle">A · ${str(coin)}</text><text x="${2 + wa + (w - wa) / 2}" y="${h + 18}" fill="#fff" font-size="13" text-anchor="middle">B · ${str(complement(coin))}</text></svg>`;
}

function barsSvg(pies: number, duds: number, max: number) {
  const h = 100;
  const sp = (pies / Math.max(1, max)) * h;
  const sd = (duds / Math.max(1, max)) * h;
  return `<svg viewBox="0 0 220 130" direction="ltr"><line x1="10" y1="${h + 4}" x2="210" y2="${h + 4}" stroke="#fff8"/>
  <rect x="40" y="${h + 4 - sp}" width="50" height="${sp}" fill="#ff4fa3" rx="4"/><rect x="130" y="${h + 4 - sd}" width="50" height="${sd}" fill="#29c7e8" rx="4"/>
  <text x="65" y="${h - sp - 2}" fill="#fff" font-size="14" text-anchor="middle">${pies}</text><text x="155" y="${h - sd - 2}" fill="#fff" font-size="14" text-anchor="middle">${duds}</text>
  <text x="65" y="126" font-size="14" text-anchor="middle">🥧</text><text x="155" y="126" font-size="14" text-anchor="middle">🎉</text></svg>`;
}

// keep tree-shaking honest for helpers used only in some builds
void eq;
void mul;
void sub;
void pBet;

/** One decision as a small chip: what the odds were, what you did, and whether it matched. */
function decisionChip(x: Decision, i = 0) {
  const what =
    x.choice === 'rival' ? '🎯' : x.choice === 'self' ? '🙃' : x.kind === 'bet' ? '🌳' : x.choice === 'double' ? '✌️' : x.choice === 'eject' ? '🌀' : '🃏';
  const label = x.kind === 'bet' ? BET_NAME[x.choice as BetEvent] : x.choice === 'rival' ? 'על היריב' : x.choice === 'self' ? 'על עצמך' : CARD_INFO[x.choice as CardId]?.name ?? '';
  return `<span class="chip ${x.correct ? 'ok' : 'bad'}" style="--i:${i}" title="${label}"><i>${what}</i>${x.kind === 'bet' ? '' : ltr(str(x.pSeen))}<b>${x.correct ? '✓' : '✗'}</b></span>`;
}
