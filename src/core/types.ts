// Level and match data types. Pure data, no rendering.
import type { Frac } from './frac';

export type ShellKind = 'pie' | 'dud';
export type Flavor = 'choc' | 'van';
export interface Shell {
  kind: ShellKind;
  flavor?: Flavor;
}

export type PlayerId = 'you' | 'r1' | 'r2';
export type Target = 'self' | PlayerId;

export type RivalStyle =
  | 'naive' // Chef Bubu: always fires at you
  | 'odds' // Grandma Rina, the Twins: fires by the odds it can see
  | 'gambler' // Robo-Clown: by the odds, but flips after a streak of two ("it's due")
  | 'champion'; // Big Mo: by the odds, peeks when unsure

export type CardId = 'peek' | 'eject' | 'double' | 'spinner' | 'magnifier' | 'flavor';

/** How the shell counter shows a magazine load. */
export type CounterMode = 'icons' | 'piesOfTotal';

export interface MagLoad {
  type: 'mag';
  pies: number;
  duds: number;
  /** split by flavor (Flavor Light levels); pies/duds must equal the totals. */
  flavors?: Record<Flavor, { pies: number; duds: number }>;
  /** scripted order for tutorials, next shell first. Hidden from the player like any order. */
  order?: ShellKind[];
  counter?: CounterMode;
}

/** With replacement: a wheel with `pie.d` sectors of which `pie.n` are pies. */
export interface SpinLoad {
  type: 'spin';
  pie: Frac;
  spins: number;
}

/** Area model: a coin with P(A) = coin picks wheel A or wheel B for each shot. */
export interface CoinLoad {
  type: 'coin';
  coin: Frac;
  a: Frac;
  b: Frac;
  spins: number;
}

export type BetEvent = 'twoPies' | 'noPie' | 'exactlyOne' | 'atLeastOne' | 'pieThenDud';

/** Two spins at the rival: pick an event; if it happens the rival is creamed, else you are. */
export interface BetLoad {
  type: 'bet';
  pie: Frac;
  options: BetEvent[];
}

/** Unknown wheel: test-fire at a dummy, estimate, then duel `spins` shots on it. */
export interface MysteryLoad {
  type: 'mystery';
  pie: Frac;
  spins: number;
  minTests: number;
  maxTests: number;
}

export type Load = MagLoad | SpinLoad | CoinLoad | BetLoad | MysteryLoad;

export type MeterRule = { kind: 'on' } | { kind: 'limited'; uses: number } | { kind: 'off' };

export interface ShopRule {
  /** cards offered, three at a time (rotates through the list). */
  offers: CardId[];
}

export interface LevelDef {
  id: number;
  booth: 1 | 2 | 3 | 4 | 5;
  title: string; // Hebrew
  goal: string; // Hebrew, one line, shown at start
  rival: { name: string; style: RivalStyle; model: string; seats: 1 | 2 };
  hp: { you: number; rival: number };
  loads: Load[];
  /** after the last load, cycle from this index (defaults to 0). */
  cycleFrom?: number;
  meter: MeterRule;
  callIt: boolean;
  startChips: number;
  /** cards in hand at the start. */
  hand?: CardId[];
  shop?: ShopRule;
  /** the rival may also draw these cards (Big Mo). */
  rivalPeeks?: number;
  transfer?: boolean;
  /** the flavor light shines on the next shell at the start of each of your turns. */
  autoFlavor?: boolean;
  /** stage look: 'booth' (default), 'dim' (night game), 'rooftop' (final). */
  stage?: 'booth' | 'dim' | 'rooftop';
  /** seed used for the first play of the level (tutorial scripting relies on it). */
  seed: number;
  /** Workbook modules practiced (route paths). */
  modules: string[];
}
