// Game-time tweens and waits. Everything animated goes through here, so pause and advanceTime() stay deterministic.

type Job = { t: number; dur: number; fn?: (k: number) => void; done: () => void; scaled: boolean };

export class Tweens {
  private jobs: Job[] = [];
  /** slow-motion factor for scaled jobs (1 = normal). */
  timeScale = 1;
  /** overall animation speed (the player's ×2 toggle). */
  speed = 1;
  now = 0;

  tween(durMs: number, fn?: (k: number) => void, scaled = true): Promise<void> {
    return new Promise((resolve) => {
      if (durMs <= 0) {
        fn?.(1);
        resolve();
        return;
      }
      this.jobs.push({ t: 0, dur: durMs, fn, done: resolve, scaled });
    });
  }

  wait(ms: number, scaled = false) {
    return this.tween(ms, undefined, scaled);
  }

  update(dtMs: number) {
    dtMs *= this.speed;
    this.now += dtMs;
    const jobs = this.jobs;
    this.jobs = [];
    const keep: Job[] = [];
    for (const j of jobs) {
      j.t += j.scaled ? dtMs * this.timeScale : dtMs;
      const k = Math.min(1, j.t / j.dur);
      j.fn?.(k);
      if (k >= 1) j.done();
      else keep.push(j);
    }
    this.jobs = keep.concat(this.jobs);
  }

  clear() {
    this.jobs = [];
  }

  get busy() {
    return this.jobs.length > 0;
  }
}

export const ease = {
  out: (k: number) => 1 - (1 - k) ** 3,
  inOut: (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  back: (k: number) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2,
  elastic: (k: number) => (k === 0 || k === 1 ? k : 2 ** (-10 * k) * Math.sin(((k * 10 - 0.75) * 2 * Math.PI) / 3) + 1),
};
