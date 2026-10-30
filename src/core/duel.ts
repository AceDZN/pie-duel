// The match state machine. Pure TypeScript: the scene and HUD only render what this says.
import { HALF, ONE, ZERO, cmp, complement, eq, frac, maxFrac, str, type Frac } from './frac';
import { Rng } from './rng';
import { betHappened, counts, pAtLeastOneOfTwo, pBet, pCoin, pNextPie, type MagView } from './prob';
import type { BetEvent, CardId, Flavor, LevelDef, Load, PlayerId, Shell, ShellKind, Target } from './types';

export interface Player {
  id: PlayerId;
  hp: number;
  maxHp: number;
}

export type Phase = 'decide' | 'rival' | 'shop' | 'test' | 'bet' | 'over';

export type ActiveLoad =
  | { type: 'mag'; def: Load; shells: Shell[]; known: boolean[]; nextFlavor?: Flavor; fired: Shell[]; table: FlavorTable }
  | { type: 'spin'; def: Load; pie: Frac; spinsLeft: number; history: ShellKind[]; fromCard?: boolean }
  | { type: 'coin'; def: Load; coin: Frac; a: Frac; b: Frac; spinsLeft: number; history: ShellKind[] }
  | { type: 'bet'; def: Load; pie: Frac; options: BetEvent[] }
  | { type: 'mystery'; def: Load; pie: Frac; tests: boolean[]; minTests: number; maxTests: number; spinsLeft: number; history: ShellKind[] };

/** Two-way table of what has come out of a flavored magazine (and what's left). */
export type FlavorTable = Record<Flavor, { pies: number; duds: number }>;

export type Choice = 'rival' | 'self' | 'double' | 'eject' | BetEvent;

export interface Decision {
  level: number;
  load: number;
  kind: 'fire' | 'card' | 'bet';
  choice: Choice;
  target?: PlayerId;
  /** P(next is a pie) the decision is scored against (the true wheel on an untested mystery cannon). */
  p: Frac;
  /** P(next is a pie) as shown to the player (their estimate on a mystery cannon). Explanations use this. */
  pSeen: Frac;
  values: Partial<Record<Choice, Frac>>;
  best: Choice[];
  correct: boolean;
  hinted: boolean;
  outcome?: string;
}

export type DuelEvent =
  | { t: 'load'; index: number; load: ActiveLoad }
  | { t: 'shop'; offers: CardId[] }
  | { t: 'turn'; who: PlayerId }
  | { t: 'shot'; shooter: PlayerId; target: PlayerId; shell: Shell; wheel?: 'a' | 'b'; slot: number; of: number }
  /** cause: a pie from the cannon, a counter-pie after a dud at a rival, or the dare bonus after a dud at yourself. */
  | { t: 'hit'; who: PlayerId; hp: number; cause: 'pie' | 'counter' | 'dare' | 'bet' }
  | { t: 'reveal'; by: CardId; who: PlayerId; index: number; shell?: Shell; flavor?: Flavor }
  | { t: 'eject'; shell: Shell }
  | { t: 'card'; card: CardId; who: PlayerId }
  | { t: 'call'; value: Frac; truth: Frac; exact: boolean }
  | { t: 'chips'; delta: number; total: number; reason: string }
  | { t: 'test'; results: boolean[] }
  | { t: 'bet'; event: BetEvent; spins: [boolean, boolean]; happened: boolean }
  | { t: 'thought'; who: PlayerId; key: 'dudDue' | 'pieDue' | 'odds' | 'always' | 'peek'; p?: Frac }
  | { t: 'explain'; key: 'selfOnPies' | 'rivalOnDuds' | 'unlucky' | 'goodCall'; p: Frac; choice: Choice }
  | { t: 'over'; winner: PlayerId | 'none'; reason: 'ko' | 'turns' };

export const CARD_PRICE: Record<CardId, number> = { peek: 2, flavor: 2, eject: 3, magnifier: 3, spinner: 3, double: 4 };
const MAX_SHOTS = 160;
const HAND_LIMIT = 3;

export class Duel {
  readonly level: LevelDef;
  readonly rng: Rng;
  players: Player[];
  turn: PlayerId = 'you';
  phase: Phase = 'decide';
  loadIndex = -1;
  load!: ActiveLoad;
  chips: number;
  hand: CardId[];
  offers: CardId[] = [];
  private offerCursor = 0;
  meterUses: number;
  meterShown = false;
  pendingCall: Frac | null = null;
  rivalPeeks: number;
  rivalKnowsNext = false;
  decisions: Decision[] = [];
  events: DuelEvent[] = [];
  shots = 0;
  winner: PlayerId | 'none' | null = null;

  /** decisions from earlier unpassed attempts at this level: good calls carry into the rematch. */
  readonly carry: Decision[];

  /** scripted tutorial orders play only on the level's own first-play seed, so retries are fresh shuffles. */
  readonly seed: number;

  constructor(level: LevelDef, seed = level.seed, carry: Decision[] = []) {
    this.level = level;
    this.seed = seed;
    this.carry = carry.slice(-16);
    this.rng = new Rng(seed);
    this.players = [{ id: 'you', hp: level.hp.you, maxHp: level.hp.you }];
    this.players.push({ id: 'r1', hp: level.hp.rival, maxHp: level.hp.rival });
    if (level.rival.seats === 2) this.players.push({ id: 'r2', hp: level.hp.rival, maxHp: level.hp.rival });
    this.chips = level.startChips;
    this.hand = [...(level.hand ?? [])];
    this.meterUses = level.meter.kind === 'limited' ? level.meter.uses : level.meter.kind === 'on' ? Infinity : 0;
    this.rivalPeeks = level.rivalPeeks ?? 0;
    this.nextLoad(true);
  }

  // ---------- views ----------

  player(id: PlayerId) {
    return this.players.find((p) => p.id === id)!;
  }
  rivals() {
    return this.players.filter((p) => p.id !== 'you');
  }
  aliveRivals() {
    return this.rivals().filter((p) => p.hp > 0);
  }

  /** P(next is a pie) as the player knows it (null in a test phase). */
  pYou(): Frac {
    return this.pFor('you');
  }

  private pFor(seat: PlayerId): Frac {
    const L = this.load;
    switch (L.type) {
      case 'mag': {
        const v: MagView = seat === 'you' ? { shells: L.shells, known: L.known, nextFlavor: L.nextFlavor } : { shells: L.shells, known: L.shells.map(() => false) };
        if (seat !== 'you' && this.rivalKnowsNext) v.known = L.shells.map((_, i) => i === 0);
        return pNextPie(v);
      }
      case 'spin':
        return L.pie;
      case 'coin':
        return pCoin(L.coin, L.a, L.b);
      case 'bet':
        return L.pie;
      case 'mystery':
        return seat === 'you' ? this.mysteryEstimate() : L.pie;
    }
  }

  mysteryEstimate(): Frac {
    const L = this.load;
    if (L.type !== 'mystery' || L.tests.length === 0) return HALF;
    return frac(L.tests.filter(Boolean).length, L.tests.length);
  }

  /** The probability decisions are scored against: what the player could know. */
  private pScore(): Frac {
    const L = this.load;
    if (L.type === 'mystery') return L.tests.length >= L.maxTests ? this.mysteryEstimate() : L.pie;
    return this.pYou();
  }

  shellsLeft(): number {
    const L = this.load;
    if (L.type === 'mag') return L.shells.length;
    if (L.type === 'bet') return 2;
    return L.spinsLeft;
  }

  magCounts() {
    return this.load.type === 'mag' ? counts(this.load.shells) : null;
  }

  meterVisible(): boolean {
    return this.level.meter.kind === 'on' || this.meterShown;
  }

  // ---------- loads ----------

  private nextLoad(first = false) {
    this.loadIndex++;
    const defs = this.level.loads;
    const cycleFrom = this.level.cycleFrom ?? 0;
    const idx = this.loadIndex < defs.length ? this.loadIndex : cycleFrom + ((this.loadIndex - defs.length) % (defs.length - cycleFrom));
    const def = defs[idx];
    this.rivalKnowsNext = false;
    this.load = this.makeLoad(def);
    this.turn = 'you';
    this.meterShown = false;
    this.events.push({ t: 'load', index: this.loadIndex, load: this.load });
    if (this.level.shop && !first && this.load.type === 'mag') {
      this.offers = this.rollOffers();
      this.phase = 'shop';
      this.events.push({ t: 'shop', offers: this.offers });
      return;
    }
    this.enterLoadPhase();
  }

  private enterLoadPhase() {
    const L = this.load;
    this.phase = L.type === 'bet' ? 'bet' : L.type === 'mystery' ? 'test' : 'decide';
    if (this.phase === 'decide') {
      this.events.push({ t: 'turn', who: 'you' });
      this.lightUp();
    }
  }

  /** Flavor-light levels: the lamp shows the next shell's flavor whenever it's your move. */
  private lightUp() {
    const L = this.load;
    if (!this.level.autoFlavor || L.type !== 'mag' || !L.shells.length || !L.shells[0].flavor || L.nextFlavor) return;
    L.nextFlavor = L.shells[0].flavor;
    this.events.push({ t: 'reveal', by: 'flavor', who: 'you', index: 0, flavor: L.nextFlavor });
  }

  private makeLoad(def: Load): ActiveLoad {
    switch (def.type) {
      case 'mag': {
        let shells: Shell[];
        if (def.flavors) {
          shells = [];
          for (const f of ['choc', 'van'] as Flavor[]) {
            for (let i = 0; i < def.flavors[f].pies; i++) shells.push({ kind: 'pie', flavor: f });
            for (let i = 0; i < def.flavors[f].duds; i++) shells.push({ kind: 'dud', flavor: f });
          }
        } else {
          shells = [...Array(def.pies).fill(0).map((): Shell => ({ kind: 'pie' })), ...Array(def.duds).fill(0).map((): Shell => ({ kind: 'dud' }))];
        }
        if (def.order && this.loadIndex < this.level.loads.length && this.seed === this.level.seed) shells = def.order.map((k) => ({ kind: k }));
        else this.rng.shuffle(shells);
        const table: FlavorTable = { choc: { pies: 0, duds: 0 }, van: { pies: 0, duds: 0 } };
        return { type: 'mag', def, shells, known: shells.map(() => false), fired: [], table };
      }
      case 'spin':
        return { type: 'spin', def, pie: def.pie, spinsLeft: def.spins, history: [] };
      case 'coin':
        return { type: 'coin', def, coin: def.coin, a: def.a, b: def.b, spinsLeft: def.spins, history: [] };
      case 'bet':
        return { type: 'bet', def, pie: def.pie, options: def.options };
      case 'mystery':
        return { type: 'mystery', def, pie: def.pie, tests: [], minTests: def.minTests, maxTests: def.maxTests, spinsLeft: def.spins, history: [] };
    }
  }

  private rollOffers(): CardId[] {
    const list = this.level.shop!.offers;
    const out: CardId[] = [];
    for (let i = 0; i < Math.min(3, list.length); i++) out.push(list[(this.offerCursor + i) % list.length]);
    this.offerCursor = (this.offerCursor + 3) % list.length;
    return out;
  }

  // ---------- shop ----------

  buy(card: CardId): boolean {
    if (this.phase !== 'shop' || !this.offers.includes(card)) return false;
    if (this.chips < CARD_PRICE[card] || this.hand.length >= HAND_LIMIT) return false;
    this.chips -= CARD_PRICE[card];
    this.hand.push(card);
    this.offers.splice(this.offers.indexOf(card), 1);
    this.events.push({ t: 'chips', delta: -CARD_PRICE[card], total: this.chips, reason: card });
    return true;
  }

  leaveShop() {
    if (this.phase !== 'shop') return;
    this.enterLoadPhase();
  }

  // ---------- hints ----------

  useMeter(): boolean {
    if (this.phase !== 'decide' || this.level.meter.kind !== 'limited' || this.meterShown || this.meterUses <= 0) return false;
    this.meterUses--;
    this.meterShown = true;
    return true;
  }

  call(value: Frac | null) {
    if (!this.level.callIt || this.phase !== 'decide') return;
    this.pendingCall = value;
  }

  // ---------- your options and scoring ----------

  /** Success value of each option the player has right now (chance the move works). */
  options(): { values: Partial<Record<Choice, Frac>>; best: Choice[] } {
    const p = this.pScore();
    const values: Partial<Record<Choice, Frac>> = { rival: p, self: complement(p) };
    const hasDouble = this.hand.includes('double') && this.shellsLeft() >= 2;
    if (hasDouble) values.double = this.pDouble();
    let best: Choice[];
    // Ejecting only changes your chances when they are exactly ½: then either reveal tips the next shot off ½.
    if (this.canEject() && eq(p, HALF)) best = ['eject'];
    else {
      // Double is optional: it joins the best moves when it beats or ties the best single shot, and never makes that shot wrong
      const top = maxFrac(values.rival!, values.self!);
      best = (['rival', 'self'] as Choice[]).filter((c) => eq(values[c]!, top));
      if (hasDouble) {
        const c = cmp(values.double!, top);
        if (c > 0) best.unshift('double');
        else if (c === 0) best.push('double');
      }
    }
    return { values, best };
  }

  canEject() {
    return this.hand.includes('eject') && this.load.type === 'mag' && this.load.shells.length >= 2;
  }

  /** P(at least one pie among the next two) for the Double card, from the player's knowledge. */
  pDouble(): Frac {
    const L = this.load;
    if (L.type === 'mag') return pAtLeastOneOfTwo({ shells: L.shells, known: L.known, nextFlavor: L.nextFlavor });
    const p = this.pScore();
    return complement(frac(complement(p).n ** 2, complement(p).d ** 2));
  }

  private record(kind: Decision['kind'], choice: Choice, target?: PlayerId): Decision {
    const o = this.options();
    const correct = o.best.includes(choice);
    const d: Decision = { level: this.level.id, load: this.loadIndex, kind, choice, target, p: this.pScore(), pSeen: this.pYou(), values: o.values, best: o.best, correct, hinted: this.meterVisible() };
    this.decisions.push(d);
    return d;
  }

  // ---------- actions ----------

  /** Fire at a rival, or at yourself ('self'); a dare that pops a dud sends the bonus pie at `dareAt`. */
  fire(target: Target, dareAt?: PlayerId): boolean {
    if (this.phase !== 'decide' || this.turn !== 'you') return false;
    const t: PlayerId = target === 'self' ? 'you' : target;
    const tp = this.players.find((pl) => pl.id === t);
    if (!tp || (t !== 'you' && tp.hp <= 0)) return false;
    const p = this.pYou();
    const d = this.record('fire', t === 'you' ? 'self' : 'rival', t);
    this.resolveCall(p);
    const shell = this.shoot('you', t, dareAt);
    d.outcome = shell.kind;
    this.explain(d, shell);
    this.afterShot();
    return true;
  }

  /** One-line worked explanation after a bad outcome, phrased with what the player could see. */
  private explain(d: Decision, shell: Shell) {
    const p = d.pSeen;
    const half = cmp(p, HALF);
    if (d.choice === 'self' && shell.kind === 'pie' && half > 0) this.events.push({ t: 'explain', key: 'selfOnPies', p, choice: d.choice });
    else if (d.choice === 'rival' && shell.kind === 'dud' && half < 0) this.events.push({ t: 'explain', key: 'rivalOnDuds', p, choice: d.choice });
    else if (half !== 0 && ((d.choice === 'self' && shell.kind === 'pie' && half < 0) || (d.choice === 'rival' && shell.kind === 'dud' && half > 0)))
      this.events.push({ t: 'explain', key: 'unlucky', p, choice: d.choice });
  }

  private resolveCall(truth: Frac) {
    if (this.pendingCall === null) return;
    const exact = eq(this.pendingCall, truth);
    this.events.push({ t: 'call', value: this.pendingCall, truth, exact });
    if (exact) this.addChips(2, 'call');
    this.pendingCall = null;
  }

  private addChips(n: number, reason: string) {
    this.chips += n;
    this.events.push({ t: 'chips', delta: n, total: this.chips, reason });
  }

  useCard(card: CardId, arg?: { index?: number; target?: PlayerId }): boolean {
    if (this.phase !== 'decide' || this.turn !== 'you' || !this.hand.includes(card)) return false;
    const L = this.load;
    const take = () => this.hand.splice(this.hand.indexOf(card), 1);
    switch (card) {
      case 'peek':
        if (L.type !== 'mag' || !L.shells.length || L.known[0]) return false;
        take();
        L.known[0] = true;
        this.events.push({ t: 'card', card, who: 'you' }, { t: 'reveal', by: 'peek', who: 'you', index: 0, shell: L.shells[0] });
        return true;
      case 'magnifier': {
        const k = arg?.index ?? 1;
        if (L.type !== 'mag' || k < 0 || k >= L.shells.length || L.known[k]) return false;
        take();
        L.known[k] = true;
        this.events.push({ t: 'card', card, who: 'you' }, { t: 'reveal', by: 'magnifier', who: 'you', index: k, shell: L.shells[k] });
        return true;
      }
      case 'flavor':
        if (L.type !== 'mag' || !L.shells.length || !L.shells[0].flavor) return false;
        take();
        L.nextFlavor = L.shells[0].flavor;
        this.events.push({ t: 'card', card, who: 'you' }, { t: 'reveal', by: 'flavor', who: 'you', index: 0, flavor: L.nextFlavor });
        return true;
      case 'eject': {
        if (!this.canEject() || L.type !== 'mag') return false;
        // only a scored decision when it matters (odds exactly ½); otherwise it neither helps nor hurts
        const d = eq(this.pScore(), HALF) ? this.record('card', 'eject') : null;
        take();
        const shell = L.shells.shift()!;
        L.known.shift();
        L.nextFlavor = undefined;
        L.fired.push(shell);
        if (shell.flavor) L.table[shell.flavor][shell.kind === 'pie' ? 'pies' : 'duds']++;
        if (d) d.outcome = shell.kind;
        this.rivalKnowsNext = false;
        this.events.push({ t: 'card', card, who: 'you' }, { t: 'eject', shell });
        if (!L.shells.length) this.nextLoad();
        else this.lightUp();
        return true;
      }
      case 'spinner': {
        if (L.type !== 'mag' || !L.shells.length) return false;
        take();
        const c = counts(L.shells);
        this.load = { type: 'spin', def: L.def, pie: frac(c.pies, c.total), spinsLeft: c.total, history: [], fromCard: true };
        this.events.push({ t: 'card', card, who: 'you' }, { t: 'load', index: this.loadIndex, load: this.load });
        return true;
      }
      case 'double': {
        const t = arg?.target ?? this.aliveRivals()[0]?.id;
        if (!t || t === 'you' || this.shellsLeft() < 2) return false;
        const d = this.record('card', 'double', t);
        take();
        this.events.push({ t: 'card', card, who: 'you' });
        // two shells at once: each pie creams the rival; only if both are duds does the rival counter
        const a = this.draw();
        const b = this.draw();
        this.shots++;
        const before = this.shellsLeft() + 2;
        for (const x of [a, b]) {
          this.events.push({ t: 'shot', shooter: 'you', target: t, shell: x.shell, wheel: x.wheel, slot: before, of: before });
          if (x.shell.kind === 'pie') this.hurt(t, 'pie');
        }
        if (a.shell.kind === 'dud' && b.shell.kind === 'dud') this.hurt('you', 'counter');
        d.outcome = `${a.shell.kind}+${b.shell.kind}`;
        this.afterShot();
        return true;
      }
    }
  }

  // ---------- test phase (mystery) ----------

  testFire(k: number): boolean {
    const L = this.load;
    if (this.phase !== 'test' || L.type !== 'mystery') return false;
    const n = Math.min(k, L.maxTests - L.tests.length);
    if (n <= 0) return false;
    const res: boolean[] = [];
    for (let i = 0; i < n; i++) res.push(this.rng.chance(L.pie.n, L.pie.d));
    L.tests.push(...res);
    this.events.push({ t: 'test', results: res });
    return true;
  }

  startDuel(): boolean {
    const L = this.load;
    if (this.phase !== 'test' || L.type !== 'mystery' || L.tests.length < L.minTests) return false;
    this.phase = 'decide';
    this.events.push({ t: 'turn', who: 'you' });
    return true;
  }

  // ---------- bets ----------

  bet(e: BetEvent): boolean {
    const L = this.load;
    if (this.phase !== 'bet' || L.type !== 'bet' || !L.options.includes(e)) return false;
    const values: Partial<Record<Choice, Frac>> = {};
    for (const o of L.options) values[o] = pBet(o, L.pie);
    const top = maxFrac(...L.options.map((o) => values[o]!));
    const best = L.options.filter((o) => eq(values[o]!, top));
    const a = this.rng.chance(L.pie.n, L.pie.d);
    const b = this.rng.chance(L.pie.n, L.pie.d);
    const happened = betHappened(e, a, b);
    this.decisions.push({ level: this.level.id, load: this.loadIndex, kind: 'bet', choice: e, p: L.pie, pSeen: L.pie, values, best, correct: best.includes(e), hinted: this.meterVisible(), outcome: happened ? 'won' : 'lost' });
    this.events.push({ t: 'bet', event: e, spins: [a, b], happened });
    this.hurt(happened ? this.aliveRivals()[0].id : 'you', 'bet');
    if (this.winner === null) this.nextLoad();
    return true;
  }

  // ---------- rivals ----------

  /** What the rival will do now (pure; doesn't change state). */
  rivalPlan(): { target: PlayerId; thought: DuelEvent & { t: 'thought' }; peek: boolean } {
    const me = this.turn;
    const style = this.level.rival.style;
    const p = this.pFor(me);
    const L = this.load;
    if (style === 'naive') return { target: 'you', thought: { t: 'thought', who: me, key: 'always' }, peek: false };
    if (style === 'champion' && this.rivalPeeks > 0 && L.type === 'mag' && !this.rivalKnowsNext && cmp(p, frac(1, 3)) >= 0 && cmp(p, frac(2, 3)) <= 0)
      return { target: 'you', thought: { t: 'thought', who: me, key: 'peek', p }, peek: true };
    if (style === 'gambler' && 'history' in L && L.history.length >= 2) {
      const [x, y] = L.history.slice(-2);
      if (x === y) {
        const dudDue = x === 'pie';
        return { target: dudDue ? me : 'you', thought: { t: 'thought', who: me, key: dudDue ? 'dudDue' : 'pieDue', p }, peek: false };
      }
    }
    // by the odds: self when a dud is more likely, else at you
    return { target: cmp(p, HALF) < 0 ? me : 'you', thought: { t: 'thought', who: me, key: 'odds', p }, peek: false };
  }

  rivalStep(): boolean {
    if (this.phase !== 'rival') return false;
    const me = this.turn;
    const plan = this.rivalPlan();
    if (plan.peek) {
      this.rivalPeeks--;
      this.rivalKnowsNext = true;
      this.events.push({ t: 'card', card: 'peek', who: me }, plan.thought);
      return true; // the next rivalStep acts on what it saw
    }
    this.events.push(plan.thought);
    this.shoot(me, plan.target);
    this.afterShot();
    return true;
  }

  // ---------- core shot ----------

  private draw(): { shell: Shell; wheel?: 'a' | 'b' } {
    const L = this.load;
    switch (L.type) {
      case 'mag': {
        const shell = L.shells.shift()!;
        L.known.shift();
        L.nextFlavor = undefined;
        L.fired.push(shell);
        if (shell.flavor) L.table[shell.flavor][shell.kind === 'pie' ? 'pies' : 'duds']++;
        this.rivalKnowsNext = false;
        return { shell };
      }
      case 'spin':
      case 'mystery': {
        const kind: ShellKind = this.rng.chance(L.pie.n, L.pie.d) ? 'pie' : 'dud';
        L.spinsLeft--;
        L.history.push(kind);
        return { shell: { kind } };
      }
      case 'coin': {
        const wheel = this.rng.chance(L.coin.n, L.coin.d) ? 'a' : 'b';
        const p = wheel === 'a' ? L.a : L.b;
        const kind: ShellKind = this.rng.chance(p.n, p.d) ? 'pie' : 'dud';
        L.spinsLeft--;
        L.history.push(kind);
        return { shell: { kind }, wheel };
      }
      case 'bet':
        throw new Error('no shots in a bet load');
    }
  }

  /**
   * Table rule: every shot creams exactly one player.
   * At a rival: pie → the rival; dud → the shooter (the rival's counter-pie).
   * At yourself (a dare): pie → you; dud → the dare bonus pie flies at the other side.
   */
  private shoot(shooter: PlayerId, target: PlayerId, dareAt?: PlayerId): Shell {
    const before = this.shellsLeft();
    const { shell, wheel } = this.draw();
    this.shots++;
    this.events.push({ t: 'shot', shooter, target, shell, wheel, slot: before, of: before });
    if (target !== shooter) this.hurt(shell.kind === 'pie' ? target : shooter, shell.kind === 'pie' ? 'pie' : 'counter');
    else if (shell.kind === 'pie') this.hurt(shooter, 'pie');
    else {
      const other = shooter === 'you' ? (dareAt && this.player(dareAt)?.hp > 0 ? dareAt : this.aliveRivals()[0].id) : 'you';
      this.hurt(other, 'dare');
    }
    return shell;
  }

  private hurt(who: PlayerId, cause: 'pie' | 'counter' | 'dare' | 'bet') {
    const p = this.player(who);
    if (p.hp <= 0 || this.winner !== null) return;
    p.hp -= 1;
    this.events.push({ t: 'hit', who, hp: p.hp, cause });
    this.checkOver();
  }

  private checkOver(): boolean {
    if (this.winner !== null) return true;
    if (this.player('you').hp <= 0) this.winner = this.aliveRivals()[0]?.id ?? 'r1';
    else if (this.aliveRivals().length === 0) this.winner = 'you';
    else if (this.shots >= MAX_SHOTS) this.winner = 'none';
    else return false;
    this.phase = 'over';
    this.events.push({ t: 'over', winner: this.winner, reason: this.winner === 'none' ? 'turns' : 'ko' });
    return true;
  }

  /** The turn always passes after a shot. */
  private afterShot() {
    this.meterShown = false;
    this.pendingCall = null;
    if (this.winner !== null) return;
    if (this.shellsLeft() === 0) {
      this.nextLoad();
      return;
    }
    this.turn = this.nextSeat(this.turn);
    this.events.push({ t: 'turn', who: this.turn });
    this.phase = this.turn === 'you' ? 'decide' : 'rival';
    if (this.phase === 'decide') this.lightUp();
  }

  private nextSeat(from: PlayerId): PlayerId {
    // walk the seats in order from the shooter (who may just have creamed themselves out)
    const seats = this.players.map((p) => p.id);
    const i = seats.indexOf(from);
    for (let k = 1; k <= seats.length; k++) {
      const id = seats[(i + k) % seats.length];
      if (this.player(id).hp > 0) return id;
    }
    return from;
  }

  drain(): DuelEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ---------- result ----------

  result() {
    return evaluate([...this.carry, ...this.decisions], this.winner === 'you', this.phase === 'over', this.decisions);
  }

  /** Short text for tests and render_game_to_text. */
  describe() {
    const L = this.load;
    const p = this.phase === 'test' ? null : this.pYou();
    return {
      level: this.level.id,
      phase: this.phase,
      turn: this.turn,
      hp: Object.fromEntries(this.players.map((pl) => [pl.id, pl.hp])),
      load: L.type,
      left: L.type === 'mag' ? counts(L.shells) : { left: this.shellsLeft() },
      pNextPie: p ? str(p) : null,
      chips: this.chips,
      hand: [...this.hand],
      decisions: `${this.result().correct}/${this.decisions.length}`,
    };
  }
}

/**
 * The fairness rule: a level is passed by winning OR by reading the odds (≥ 80 % solver-correct calls over at least
 * three decisions, counting earlier attempts). Stars measure decision quality, not luck.
 */
export function evaluate(all: Decision[], won: boolean, over: boolean, current: Decision[] = all) {
  const decisions = all;
  const total = decisions.length;
  const correct = decisions.filter((d) => d.correct).length;
  const accuracy = total ? correct / total : 0;
    // A constant strategy can't count as reading the odds: every move that was ever the only best move must
    // also appear among your correct decisions (aiming at the rival when pies were likelier, at yourself when duds were).
    // and the match must have asked both questions (a pie-likely and a dud-likely moment), each answered right at least once
    const read = (side: 1 | -1) => decisions.some((d) => d.kind !== 'bet' && cmp(d.p, HALF) === side && d.correct);
    const strictlyBest = new Set(decisions.filter((d) => d.kind === 'bet' && d.best.length === 1).map((d) => d.best[0]));
    const shown = new Set(decisions.filter((d) => d.correct).map((d) => d.choice));
    const varied = read(1) && read(-1) && [...strictlyBest].every((c) => shown.has(c));
    const oddsRead = total >= 3 && accuracy >= 0.8 && varied;
    const passed = won || oddsRead;
    const stars = !passed ? 0 : oddsRead && accuracy >= 0.95 ? 3 : oddsRead ? 2 : 1;
  const matchCorrect = current.filter((d) => d.correct).length;
  return { total, correct, accuracy, won, oddsRead, passed, stars, over, matchDecisions: current.length, matchCorrect };
}

export { ONE, ZERO };
