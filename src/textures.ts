// Canvas textures: striped canopy and table, chalkboards, neon sign, night backdrop. Drawn once at startup.
import * as THREE from 'three';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function tex(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function stripes(a: string, b: string, n = 16) {
  const [c, g] = canvas(512, 64);
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? b : a;
    g.fillRect((i * 512) / n, 0, 512 / n + 1, 64);
  }
  return tex(c, true);
}

/** Round tabletop: radial red/cream stripes with little stars, like the mockups. */
export function tableTop() {
  const [c, g] = canvas(1024, 1024);
  const n = 24;
  for (let i = 0; i < n; i++) {
    g.beginPath();
    g.moveTo(512, 512);
    g.arc(512, 512, 520, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2);
    g.fillStyle = i % 2 ? '#f6e3c6' : '#d7313f';
    g.fill();
  }
  g.fillStyle = '#ffffff55';
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 120 + Math.random() * 360;
    star(g, 512 + Math.cos(a) * r, 512 + Math.sin(a) * r, 10 + Math.random() * 10);
  }
  g.lineWidth = 26;
  g.strokeStyle = '#7b1a2a';
  g.beginPath();
  g.arc(512, 512, 498, 0, Math.PI * 2);
  g.stroke();
  return tex(c);
}

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
}

export function chalkboard(lines: string[]) {
  const [c, g] = canvas(512, 640);
  g.fillStyle = '#2b2b2b';
  g.fillRect(0, 0, 512, 640);
  g.fillStyle = '#383838';
  for (let i = 0; i < 60; i++) g.fillRect(Math.random() * 512, Math.random() * 640, 40, 2);
  g.strokeStyle = '#8a5a2b';
  g.lineWidth = 34;
  g.strokeRect(0, 0, 512, 640);
  g.fillStyle = '#f2efe6';
  g.font = '700 64px Rubik, sans-serif';
  g.textAlign = 'center';
  g.direction = 'rtl';
  lines.forEach((l, i) => g.fillText(l, 256, 150 + i * 92));
  g.fillStyle = '#ff7eb6';
  g.font = '64px sans-serif';
  g.fillText('♥', 256, 150 + lines.length * 92);
  return tex(c);
}

export function neonSign(text: string, color = '#ff4fa3') {
  const [c, g] = canvas(1024, 384);
  g.font = '900 200px Rubik, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 40;
  g.lineWidth = 18;
  g.strokeStyle = color;
  g.strokeText(text, 512, 192);
  g.shadowBlur = 0;
  g.fillStyle = '#fff6d0';
  g.fillText(text, 512, 192);
  return tex(c);
}

/** Far backdrop: night sky, tents, crowd silhouettes and a glow line. */
export function backdrop() {
  const [c, g] = canvas(2048, 512);
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#120828');
  sky.addColorStop(0.6, '#3a1660');
  sky.addColorStop(1, '#7a2a6e');
  g.fillStyle = sky;
  g.fillRect(0, 0, 2048, 512);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 160; i++) {
    g.globalAlpha = Math.random() * 0.8;
    g.fillRect(Math.random() * 2048, Math.random() * 260, 2, 2);
  }
  g.globalAlpha = 1;
  // tents
  for (let i = 0; i < 14; i++) {
    const x = i * 150 + Math.random() * 40;
    const w = 120 + Math.random() * 60;
    const h = 90 + Math.random() * 70;
    g.fillStyle = i % 3 === 0 ? '#5a1838' : i % 3 === 1 ? '#2c1a5c' : '#4a2a14';
    g.beginPath();
    g.moveTo(x, 470);
    g.lineTo(x + w / 2, 470 - h);
    g.lineTo(x + w, 470);
    g.fill();
    g.fillStyle = '#ffc35a';
    for (let k = 0; k < 6; k++) g.fillRect(x + (w * k) / 6 + 6, 470 - h * 0.45 + (k % 2) * 6, 4, 4);
  }
  // crowd
  g.fillStyle = '#12081f';
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * 2048;
    const h = 40 + Math.random() * 30;
    g.beginPath();
    g.arc(x, 512 - h, 9, 0, Math.PI * 2);
    g.fill();
    g.fillRect(x - 10, 512 - h + 6, 20, h);
  }
  return tex(c);
}

export function radialGlow(color: string) {
  const [c, g] = canvas(128, 128);
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, color);
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
}

/** Spinner wheel face: `pieSectors` of `total` sectors are pies (pink), the rest confetti (cyan). */
export function wheelFace(pieSectors: number, total: number, labelA?: string) {
  const [c, g] = canvas(512, 512);
  for (let i = 0; i < total; i++) {
    g.beginPath();
    g.moveTo(256, 256);
    g.arc(256, 256, 250, (i / total) * Math.PI * 2 - Math.PI / 2, ((i + 1) / total) * Math.PI * 2 - Math.PI / 2);
    // pieSectors < 0: a mystery wheel, sectors hidden
    g.fillStyle = pieSectors < 0 ? (i % 2 ? '#5a4a7a' : '#7a6a9a') : i < pieSectors ? (i % 2 ? '#ff4fa3' : '#ff74b6') : i % 2 ? '#29c7e8' : '#6ff0ff';
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 6;
    g.stroke();
    const a = ((i + 0.5) / total) * Math.PI * 2 - Math.PI / 2;
    g.font = `${total > 8 ? 40 : 64}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(pieSectors < 0 ? '?' : i < pieSectors ? '🥧' : '🎉', 256 + Math.cos(a) * 170, 256 + Math.sin(a) * 170);
  }
  g.beginPath();
  g.arc(256, 256, 40, 0, Math.PI * 2);
  g.fillStyle = '#c8913a';
  g.fill();
  if (labelA) {
    g.fillStyle = '#fff';
    g.font = '900 54px Rubik, sans-serif';
    g.fillText(labelA, 256, 258);
  }
  return tex(c);
}
