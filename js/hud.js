// 2D canvas overlay: neural network visualization + lap time graph.

import { NUM_SENSORS, HIDDEN_SIZE } from './nn.js?v=elev4';

export class Hud {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(state) {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    // ─── Top-left stats ──────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Gen ${state.generation}  ·  ${state.track.name}`, 20, 16);

    const alive = state.cars.filter((c) => c.alive && !c.finished).length;
    const finished = state.cars.filter((c) => c.finished).length;

    ctx.font = '14px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.fillStyle = 'rgba(180,220,255,0.85)';
    ctx.fillText(`Racing ${alive}/${state.settings.numCars}   Finished ${finished}`, 20, 46);

    const bestLap = state.bestLapTime < Infinity ? (state.bestLapTime / 60).toFixed(1) + 's' : '--';
    const genLap = state.genBestLap < Infinity ? (state.genBestLap / 60).toFixed(1) + 's' : '--';
    ctx.fillStyle = 'rgba(90,255,150,0.9)';
    ctx.fillText(`Best Lap ${bestLap}   Gen Lap ${genLap}`, 20, 66);

    // Camera hint
    ctx.fillStyle = 'rgba(150,170,200,0.6)';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.fillText(`C: camera (${state.cameraMode})   R: reset gen   drag: orbit`, 20, 88);

    // ─── Neural net panel (bottom-left) ──────────
    const nnCar = state.followCar || state.bestCar || state.cars.find((c) => c.alive);
    if (nnCar) {
      this._drawNN(ctx, nnCar.brain, nnCar.sensors, 16, h - 240, 220, 224);
    }

    // ─── Lap graph panel (bottom-right) ───────────
    this._drawLapGraph(ctx, state.lapHistory, w - 302, h - 196, 286, 180);
  }

  _panel(ctx, x, y, w, h, title) {
    ctx.fillStyle = 'rgba(10,14,26,0.82)';
    ctx.strokeStyle = 'rgba(60,130,200,0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(180,220,255,0.75)';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + w / 2, y + 8);
  }

  _drawNN(ctx, brain, sensors, bx, by, bw, bh) {
    this._panel(ctx, bx, by, bw, bh, 'Neural Network');
    const padX = 32;
    const padY = 32;
    const layerX = [bx + padX, bx + bw / 2, bx + bw - padX];

    const inputNodes = [];
    for (let i = 0; i < NUM_SENSORS; i++) {
      const y = by + padY + 4 + (i / (NUM_SENSORS - 1)) * (bh - padY * 2 - 8);
      inputNodes.push({ x: layerX[0], y });
    }
    const hiddenNodes = [];
    for (let i = 0; i < HIDDEN_SIZE; i++) {
      const y = by + padY + 14 + (i / (HIDDEN_SIZE - 1)) * (bh - padY * 2 - 28);
      hiddenNodes.push({ x: layerX[1], y });
    }
    const outputNodes = [];
    for (let i = 0; i < 2; i++) {
      const y = by + padY + 30 + i * (bh - padY * 2 - 60);
      outputNodes.push({ x: layerX[2], y });
    }

    // Connections
    for (let i = 0; i < NUM_SENSORS; i++) {
      for (let j = 0; j < HIDDEN_SIZE; j++) {
        const w = brain.w1[i][j];
        const alpha = Math.min(Math.abs(w) * 0.35, 0.8);
        ctx.strokeStyle = w > 0 ? `rgba(80,255,140,${alpha})` : `rgba(255,80,80,${alpha})`;
        ctx.lineWidth = Math.min(Math.abs(w) * 0.7, 2.2);
        ctx.beginPath();
        ctx.moveTo(inputNodes[i].x, inputNodes[i].y);
        ctx.lineTo(hiddenNodes[j].x, hiddenNodes[j].y);
        ctx.stroke();
      }
    }
    for (let i = 0; i < HIDDEN_SIZE; i++) {
      for (let j = 0; j < 2; j++) {
        const w = brain.w2[i][j];
        const alpha = Math.min(Math.abs(w) * 0.35, 0.85);
        ctx.strokeStyle = w > 0 ? `rgba(80,255,140,${alpha})` : `rgba(255,80,80,${alpha})`;
        ctx.lineWidth = Math.min(Math.abs(w) * 0.7, 2.4);
        ctx.beginPath();
        ctx.moveTo(hiddenNodes[i].x, hiddenNodes[i].y);
        ctx.lineTo(outputNodes[j].x, outputNodes[j].y);
        ctx.stroke();
      }
    }

    // Input nodes
    const inputLabels = ['L2', 'L1', 'C', 'R1', 'R2'];
    for (let i = 0; i < NUM_SENSORS; i++) {
      const v = sensors ? sensors[i] : 0;
      const b = Math.floor(80 + v * 175);
      ctx.fillStyle = `rgb(${b},${Math.floor(b * 0.9)},50)`;
      ctx.beginPath();
      ctx.arc(inputNodes[i].x, inputNodes[i].y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(180,200,220,0.7)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(inputLabels[i], inputNodes[i].x - 10, inputNodes[i].y - 4);
    }

    // Hidden nodes
    const hv = brain._lastHidden || [];
    for (let i = 0; i < HIDDEN_SIZE; i++) {
      const v = hv[i] || 0;
      ctx.fillStyle = v > 0
        ? `rgb(${80 + v * 175},255,140)`
        : `rgb(255,${80 + (-v) * 175},80)`;
      ctx.beginPath();
      ctx.arc(hiddenNodes[i].x, hiddenNodes[i].y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Output nodes
    const ov = brain._lastOutput || [];
    const outputLabels = ['Steer', 'Gas'];
    for (let i = 0; i < 2; i++) {
      const v = ov[i] || 0;
      ctx.fillStyle = v > 0
        ? `rgb(${80 + v * 175},255,140)`
        : `rgb(255,${80 + (-v) * 175},80)`;
      ctx.beginPath();
      ctx.arc(outputNodes[i].x, outputNodes[i].y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(180,200,220,0.8)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(outputLabels[i], outputNodes[i].x + 12, outputNodes[i].y - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((v >= 0 ? '+' : '') + v.toFixed(2), outputNodes[i].x, outputNodes[i].y + 10);
    }
  }

  _drawLapGraph(ctx, history, gx, gy, gw, gh) {
    this._panel(ctx, gx, gy, gw, gh, 'Lap Time by Generation');
    if (history.length < 2) {
      ctx.fillStyle = 'rgba(120,150,180,0.5)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for data...', gx + gw / 2, gy + gh / 2);
      return;
    }

    const padL = 36, padR = 12, padT = 28, padB = 22;
    const px = gx + padL;
    const py = gy + padT;
    const pw = gw - padL - padR;
    const ph = gh - padT - padB;

    const entries = history.filter((e) => e.bestLap !== null);
    ctx.strokeStyle = 'rgba(60,130,200,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + ph);
    ctx.lineTo(px + pw, py + ph);
    ctx.stroke();

    if (entries.length < 1) {
      const maxProg = Math.max(...history.map((e) => e.avgProgress), 1);
      ctx.strokeStyle = 'rgba(255,160,50,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < history.length; i++) {
        const x = px + (i / (history.length - 1)) * pw;
        const y = py + ph - (history[i].avgProgress / maxProg) * ph;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,160,50,0.7)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Avg Progress', px + 4, py + 10);
      return;
    }

    const minLap = Math.min(...entries.map((e) => e.bestLap));
    const maxLap = Math.max(...entries.map((e) => e.bestLap));
    const minPad = minLap * 0.95;
    const maxPad = maxLap * 1.05;
    const range = maxPad - minPad || 1;

    ctx.fillStyle = 'rgba(120,150,180,0.7)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText((maxPad / 60).toFixed(1) + 's', px - 4, py + 4);
    ctx.fillText((minPad / 60).toFixed(1) + 's', px - 4, py + ph - 4);

    ctx.textAlign = 'center';
    ctx.fillText('Gen ' + history[0].gen, px, py + ph + 12);
    ctx.fillText('Gen ' + history[history.length - 1].gen, px + pw, py + ph + 12);

    ctx.strokeStyle = 'rgba(80,255,140,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < history.length; i++) {
      if (history[i].bestLap === null) continue;
      const x = px + (i / (history.length - 1)) * pw;
      const y = py + ((history[i].bestLap - minPad) / range) * ph;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(80,255,140,1)';
    for (let i = 0; i < history.length; i++) {
      if (history[i].bestLap === null) continue;
      const x = px + (i / (history.length - 1)) * pw;
      const y = py + ((history[i].bestLap - minPad) / range) * ph;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(80,255,140,0.85)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Best ' + (minLap / 60).toFixed(1) + 's', px + 4, py + 10);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
