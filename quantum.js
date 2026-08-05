// ========================================
// Foresight Quantum — Crossing Ribbons + Atom
// ========================================

let canvasW, canvasH;
let cx, cy;
let fc = 0;
let orbitParticles = [];
let mouseXSmooth = 0, mouseYSmooth = 0;

const C = {
  blue: [64, 94, 171],
  blueBright: [90, 130, 220],
  blueGlow: [120, 160, 240],
  lightBlue: [140, 170, 220],
  paleBlue: [170, 195, 235],
  deepBlue: [40, 70, 140],
};

class OrbitParticle {
  constructor(orbitIdx, speed, size) {
    this.orbitIdx = orbitIdx;
    this.angle = random(TWO_PI);
    this.speed = speed;
    this.size = size;
  }
  update() { this.angle += this.speed; }
  getPos(rx, ry, tilt, offX, offY) {
    let x = cos(this.angle) * rx;
    let y = sin(this.angle) * ry;
    let rx2 = x * cos(tilt) - y * sin(tilt);
    let ry2 = x * sin(tilt) + y * cos(tilt);
    return { x: cx + offX + rx2, y: cy + offY + ry2 };
  }
}

// Ribbon definitions
const ribbonDefs = [];

function buildRibbonDefs() {
  ribbonDefs.length = 0;

  // One single ribbon: wide → narrow at center (pinched) → wide again
  let paths = [
    {
      points: [
        {x: -0.95, y: 0.9},
        {x: -0.65, y: 0.55},
        {x: -0.3, y: 0.2},
        {x: 0.0, y: 0.0},
        {x: 0.35, y: -0.15},
        {x: 0.7, y: -0.4},
        {x: 0.95, y: -0.6}
      ],
      spread: 200, lines: 65, phase: 0,
      // Variable spread: wide at ends, narrow at center
      spreadProfile: true
    },
  ];

  for (let p of paths) {
    ribbonDefs.push({
      points: p.points,
      spread: p.spread,
      lines: p.lines,
      phase: p.phase,
      spreadProfile: p.spreadProfile || false
    });
  }
}

function setup() {
  let container = document.getElementById('quantum-canvas');
  if (!container) return;
  canvasW = container.offsetWidth;
  canvasH = container.offsetHeight;
  let canvas = createCanvas(canvasW, canvasH);
  canvas.parent('quantum-canvas');
  cx = canvasW / 2;
  cy = canvasH / 2;
  mouseXSmooth = cx;
  mouseYSmooth = cy;
  buildOrbitParticles();
  buildRibbonDefs();
}

function buildOrbitParticles() {
  orbitParticles = [];
  // Large central particle (nucleus)
  orbitParticles.push(new OrbitParticle(0, 0, 22));
  // Medium particles on orbits
  let sizes = [10, 7, 12, 6, 9, 8, 14, 5, 11, 7];
  let orbits = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
  let speeds = [0.008, 0.006, 0.011, 0.007];
  for (let i = 0; i < sizes.length; i++) {
    orbitParticles.push(new OrbitParticle(orbits[i], speeds[orbits[i]] * (0.7 + random(0.6)), sizes[i]));
  }
}

function draw() {
  fc++;
  clear();

  let mx = mouseX || cx;
  let my = mouseY || cy;

  mouseXSmooth += (mx - mouseXSmooth) * 0.18;
  mouseYSmooth += (my - mouseYSmooth) * 0.18;

  let offX = (mouseXSmooth - cx) * 0.3;
  let offY = (mouseYSmooth - cy) * 0.25;

  let orbitCx = cx + offX;
  let orbitCy = cy + offY;
  drawCrossingRibbons(orbitCx, orbitCy);
  drawOrbits(offX, offY);
  drawOrbitParticles(offX, offY);
}

// ===================== CROSSING RIBBONS =====================
function drawCrossingRibbons(contractX, contractY) {
  for (let d of ribbonDefs) {
    drawRibbon(cx, cy, d, contractX, contractY);
  }
}

function evalPath(points, t) {
  let n = points.length - 1;
  let seg = t * n;
  let i = floor(seg);
  if (i >= n) i = n - 1;
  let localT = seg - i;

  let p0 = points[max(i - 1, 0)];
  let p1 = points[i];
  let p2 = points[min(i + 1, n)];
  let p3 = points[min(i + 2, n)];

  let t2 = localT * localT;
  let t3 = t2 * localT;

  let x = 0.5 * (
    (2 * p1.x) + (-p0.x + p2.x) * localT +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
  );
  let y = 0.5 * (
    (2 * p1.y) + (-p0.y + p2.y) * localT +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );
  return { x, y };
}

function pathPerp(points, t) {
  let dt = 0.005;
  let a = evalPath(points, max(t - dt, 0));
  let b = evalPath(points, min(t + dt, 1));
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let len = sqrt(dx * dx + dy * dy) || 1;
  return { x: -dy / len, y: dx / len };
}

// Compute tangent direction at point t on the path
function pathTangent(points, t) {
  let dt = 0.005;
  let a = evalPath(points, max(t - dt, 0));
  let b = evalPath(points, min(t + dt, 1));
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let len = sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

function drawRibbon(ox, oy, def, contractX, contractY) {
  let segments = 80;
  let contractRadius = 200;
  let contractionStrength = 0.8;

  for (let l = 0; l < def.lines; l++) {
    let t01 = l / def.lines;
    let spreadNorm = (t01 - 0.5) * 2;

    let edgeFade = 1 - abs(spreadNorm) * 0.5;
    let alpha = edgeFade * 100;

    let ci = l % 5;
    let col;
    if (ci === 0) col = C.blueBright;
    else if (ci === 1) col = C.lightBlue;
    else if (ci === 2) col = C.paleBlue;
    else if (ci === 3) col = C.blue;
    else col = C.blueGlow;

    let prevX = -1, prevY = -1;

    for (let i = 0; i <= segments; i++) {
      let t = i / segments;
      let pathPos = evalPath(def.points, t);
      let px0 = cx + pathPos.x * canvasW * 0.5;
      let py0 = cy + pathPos.y * canvasH * 0.5;

      let perp = pathPerp(def.points, t);

      // Wide at ends, slightly narrower in middle
      let spreadFactor = 0.65 + 0.35 * abs(t - 0.5) * 2;
      let spreadAmount = spreadFactor * def.spread;
      let spreadX = perp.x * spreadNorm * spreadAmount;
      let spreadY = perp.y * spreadNorm * spreadAmount;

      // Contraction near orbit center
      let dxm = px0 - contractX;
      let dym = py0 - contractY;
      let distToCenter = sqrt(dxm * dxm + dym * dym);
      let influence = 1 - constrain(distToCenter / contractRadius, 0, 1);
      influence = influence * influence;

      let finalSpreadX = spreadX * (1 - influence * contractionStrength);
      let finalSpreadY = spreadY * (1 - influence * contractionStrength);

      let fx = px0 + finalSpreadX;
      let fy = py0 + finalSpreadY;

      let endFade = 1;
      if (t < 0.1) endFade = t / 0.1;
      if (t > 0.9) endFade = (1 - t) / 0.1;
      endFade = max(endFade, 0);

      let a = alpha * endFade * (1 - t * 0.1);

      if (prevX >= 0) {
        stroke(col[0], col[1], col[2], a);
        strokeWeight(0.8);
        line(prevX, prevY, fx, fy);
      }
      prevX = fx;
      prevY = fy;
    }
  }

  // Cross-lines (perpendicular to ribbon) — mesh/grid texture
  let crossCount = 45;
  for (let c = 0; c < crossCount; c++) {
    let ct = (c + 0.5) / crossCount;

    let pathPos = evalPath(def.points, ct);
    let px0 = cx + pathPos.x * canvasW * 0.5;
    let py0 = cy + pathPos.y * canvasH * 0.5;

    let perp = pathPerp(def.points, ct);

    let spreadFactor = 0.65 + 0.35 * abs(ct - 0.5) * 2;
    let spreadAmount = spreadFactor * def.spread;

    // Contraction
    let dxm = px0 - contractX;
    let dym = py0 - contractY;
    let distToCenter = sqrt(dxm * dxm + dym * dym);
    let influence = 1 - constrain(distToCenter / contractRadius, 0, 1);
    influence = influence * influence;

    let contractedSpread = spreadAmount * (1 - influence * contractionStrength);

    let startX = px0 + perp.x * contractedSpread;
    let startY = py0 + perp.y * contractedSpread;
    let endX = px0 - perp.x * contractedSpread;
    let endY = py0 - perp.y * contractedSpread;

    let endFade = 1;
    if (ct < 0.1) endFade = ct / 0.1;
    if (ct > 0.9) endFade = (1 - ct) / 0.1;
    endFade = max(endFade, 0);

    let a = endFade * 45;
    stroke(C.lightBlue[0], C.lightBlue[1], C.lightBlue[2], a);
    strokeWeight(0.5);
    line(startX, startY, endX, endY);
  }
}

// ===================== ORBITS =====================
function drawOrbits(offX, offY) {
  let base = min(canvasW, canvasH) * 0.28;
  let orbits = [
    { rx: base * 1.0, ry: base * 0.3, tilt: -0.1 },
    { rx: base * 0.9, ry: base * 0.4, tilt: 0.6 },
    { rx: base * 0.75, ry: base * 0.35, tilt: 1.3 },
    { rx: base * 0.6, ry: base * 0.25, tilt: -0.7 },
  ];
  for (let o of orbits) {
    noFill();
    stroke(C.blueBright[0], C.blueBright[1], C.blueBright[2], 90);
    strokeWeight(1.2);
    beginShape();
    for (let a = 0; a < TWO_PI; a += 0.02) {
      let x = cos(a) * o.rx;
      let y = sin(a) * o.ry;
      let rx2 = x * cos(o.tilt) - y * sin(o.tilt);
      let ry2 = x * sin(o.tilt) + y * cos(o.tilt);
      vertex(cx + offX + rx2, cy + offY + ry2);
    }
    endShape(CLOSE);
  }
}

// ===================== ORBIT PARTICLES =====================
function drawOrbitParticles(offX, offY) {
  let base = min(canvasW, canvasH) * 0.28;
  let orbitsDef = [
    { rx: base * 1.0, ry: base * 0.3, tilt: -0.1 },
    { rx: base * 0.9, ry: base * 0.4, tilt: 0.6 },
    { rx: base * 0.75, ry: base * 0.35, tilt: 1.3 },
    { rx: base * 0.6, ry: base * 0.25, tilt: -0.7 },
  ];

  for (let idx = 0; idx < orbitParticles.length; idx++) {
    let p = orbitParticles[idx];
    p.update();
    let pos;
    if (idx === 0) {
      // Central nucleus — stays at orbit center
      pos = { x: cx + offX, y: cy + offY };
    } else {
      let o = orbitsDef[p.orbitIdx];
      pos = p.getPos(o.rx, o.ry, o.tilt, offX, offY);
    }

    noStroke();

    if (idx === 0) {
      // Large central sphere with glow
      fill(C.blueGlow[0], C.blueGlow[1], C.blueGlow[2], 25);
      ellipse(pos.x, pos.y, p.size * 5, p.size * 5);
      fill(C.blueBright[0], C.blueBright[1], C.blueBright[2], 60);
      ellipse(pos.x, pos.y, p.size * 3, p.size * 3);
      fill(C.blue[0], C.blue[1], C.blue[2], 255);
      ellipse(pos.x, pos.y, p.size, p.size);
    } else {
      // Orbit particles with glow
      fill(C.blueGlow[0], C.blueGlow[1], C.blueGlow[2], 30);
      ellipse(pos.x, pos.y, p.size * 3, p.size * 3);
      fill(C.blue[0], C.blue[1], C.blue[2], 220);
      ellipse(pos.x, pos.y, p.size, p.size);
    }
  }
}

function windowResized() {
  let container = document.getElementById('quantum-canvas');
  if (!container) return;
  canvasW = container.offsetWidth;
  canvasH = container.offsetHeight;
  resizeCanvas(canvasW, canvasH);
  cx = canvasW / 2;
  cy = canvasH / 2;
}
