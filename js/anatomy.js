/*
 * Atlas 3D de los músculos de la columna vertebral
 * Geometría: carga de las mallas reales (BodyParts3D) y generación procedimental
 * de las estructuras que no existen en ese conjunto de datos:
 *   - Dorsal ancho (lámina en abanico adaptada a la superficie del tronco)
 *   - Multífidos (fascículos fusiformes que saltan 2–4 segmentos)
 *   - Cuadrado lumbar (lámina cuadrilátera gruesa)
 *   - Cóccix
 *
 * Sistema de coordenadas (1 unidad = 1 dm): +X derecha del paciente, +Y craneal, +Z posterior.
 */
window.Anatomy = (function () {
  'use strict';

  let T = null; // THREE

  // ════════════════════════════ Carga del modelo ════════════════════════════

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(s);
    });
  }

  // Desde file:// el navegador bloquea fetch(): el GLB se incluye también como script en base64.
  async function loadModelBuffer(onProgress) {
    if (location.protocol === 'file:') {
      onProgress(0.15);
      await loadScript('models/anatomia.glb.js');
      const bin = atob(window.ANATOMIA_GLB_B64);
      window.ANATOMIA_GLB_B64 = null;
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      onProgress(1);
      return out.buffer;
    }
    const res = await fetch('models/anatomia.glb');
    if (!res.ok) throw new Error(`No se pudo descargar el modelo (${res.status})`);
    const total = Number(res.headers.get('content-length')) || 0;
    if (!res.body || !total) return res.arrayBuffer();
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress(Math.min(1, loaded / total));
    }
    const out = new Uint8Array(loaded);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out.buffer;
  }

  function parseGLB(deps, buffer) {
    const loader = new deps.GLTFLoader();
    loader.setMeshoptDecoder(deps.MeshoptDecoder);
    return new Promise((resolve, reject) => loader.parse(buffer, '', resolve, reject));
  }

  // Convierte cada malla cuantizada a Float32 en coordenadas de mundo.
  function bake(o) {
    o.updateWorldMatrix(true, false);
    const src = o.geometry.attributes.position;
    const arr = new Float32Array(src.count * 3);
    for (let i = 0; i < src.count; i++) {
      arr[i * 3] = src.getX(i); arr[i * 3 + 1] = src.getY(i); arr[i * 3 + 2] = src.getZ(i);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(arr, 3));
    const idx = o.geometry.index;
    g.setIndex(new T.BufferAttribute(idx ? Uint32Array.from(idx.array) : Uint32Array.from({ length: src.count }, (_, i) => i), 1));
    g.applyMatrix4(o.matrixWorld);
    return g;
  }

  // ════════════════════════════ Utilidades geométricas ════════════════════════════

  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function best(g, score) {
    const p = g.attributes.position.array;
    let bs = -Infinity, bi = -1;
    for (let i = 0; i < p.length; i += 3) {
      const s = score(p[i], p[i + 1], p[i + 2]);
      if (s > bs) { bs = s; bi = i; }
    }
    return bi < 0 ? null : V(p[bi], p[bi + 1], p[bi + 2]);
  }

  function centroidWhere(g, pred) {
    const p = g.attributes.position.array;
    const c = V(); let n = 0;
    for (let i = 0; i < p.length; i += 3) {
      if (pred(p[i], p[i + 1], p[i + 2])) { c.x += p[i]; c.y += p[i + 1]; c.z += p[i + 2]; n++; }
    }
    return n ? c.multiplyScalar(1 / n) : null;
  }

  function bboxOf(g) { g.computeBoundingBox(); return g.boundingBox.clone(); }

  // Recorre puntos distribuidos sobre la superficie (triángulos subdivididos a un paso dado).
  function sampleSurface(g, step, fn) {
    const p = g.attributes.position.array, ix = g.index.array;
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
      const ax = p[a], ay = p[a + 1], az = p[a + 2];
      const ux = p[b] - ax, uy = p[b + 1] - ay, uz = p[b + 2] - az;
      const vx = p[c] - ax, vy = p[c + 1] - ay, vz = p[c + 2] - az;
      const l = Math.sqrt(Math.max(ux * ux + uy * uy + uz * uz, vx * vx + vy * vy + vz * vz,
        (ux - vx) ** 2 + (uy - vy) ** 2 + (uz - vz) ** 2));
      const n = Math.min(10, Math.max(1, Math.ceil(l / step)));
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n - i; j++) {
          const s = i / n, r = j / n;
          fn(ax + ux * s + vx * r, ay + uy * s + vy * r, az + uz * s + vz * r);
        }
      }
    }
  }

  // Rejilla 2D de valores (mapa de alturas). periodicX para mapas cilíndricos (ángulo).
  class Grid {
    constructor(x0, x1, nx, y0, y1, ny, periodicX = false) {
      Object.assign(this, { x0, x1, nx, y0, y1, ny, periodicX });
      this.dx = (x1 - x0) / nx; this.dy = (y1 - y0) / ny;
      this.a = new Float32Array(nx * ny).fill(NaN);
    }
    cell(x, y) {
      let ix = Math.floor((x - this.x0) / this.dx);
      const iy = Math.floor((y - this.y0) / this.dy);
      if (this.periodicX) ix = ((ix % this.nx) + this.nx) % this.nx;
      if (ix < 0 || ix >= this.nx || iy < 0 || iy >= this.ny) return -1;
      return iy * this.nx + ix;
    }
    putMax(x, y, v) { const i = this.cell(x, y); if (i >= 0 && !(this.a[i] >= v)) this.a[i] = v; }
    putMin(x, y, v) { const i = this.cell(x, y); if (i >= 0 && !(this.a[i] <= v)) this.a[i] = v; }
    at(ix, iy) {
      if (this.periodicX) ix = ((ix % this.nx) + this.nx) % this.nx;
      else ix = clamp(ix, 0, this.nx - 1);
      iy = clamp(iy, 0, this.ny - 1);
      return this.a[iy * this.nx + ix];
    }
    // Rellena huecos promediando vecinos (difusión iterativa).
    fillHoles(maxIter = 400) {
      const { nx, ny } = this;
      for (let it = 0; it < maxIter; it++) {
        const b = this.a.slice(); let changed = false;
        for (let iy = 0; iy < ny; iy++) {
          for (let ix = 0; ix < nx; ix++) {
            const i = iy * nx + ix;
            if (!Number.isNaN(this.a[i])) continue;
            let s = 0, n = 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              if (!this.periodicX && (ix + dx < 0 || ix + dx >= nx)) continue;
              if (iy + dy < 0 || iy + dy >= ny) continue;
              const v = this.at(ix + dx, iy + dy);
              if (!Number.isNaN(v)) { s += v; n++; }
            }
            if (n) { b[i] = s / n; changed = true; }
          }
        }
        this.a = b;
        if (!changed) break;
      }
    }
    filter(radius, op) {
      const { nx, ny } = this; const b = new Float32Array(this.a.length);
      for (let iy = 0; iy < ny; iy++) {
        for (let ix = 0; ix < nx; ix++) {
          let acc = op === 'max' ? -Infinity : 0, n = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (!this.periodicX && (ix + dx < 0 || ix + dx >= nx)) continue;
              if (iy + dy < 0 || iy + dy >= ny) continue;
              const v = this.at(ix + dx, iy + dy);
              if (Number.isNaN(v)) continue;
              if (op === 'max') acc = Math.max(acc, v); else acc += v;
              n++;
            }
          }
          b[iy * nx + ix] = n ? (op === 'max' ? acc : acc / n) : NaN;
        }
      }
      this.a = b;
    }
    sample(x, y) {
      const fx = (x - this.x0) / this.dx - 0.5, fy = (y - this.y0) / this.dy - 0.5;
      const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const v00 = this.at(ix, iy), v10 = this.at(ix + 1, iy), v01 = this.at(ix, iy + 1), v11 = this.at(ix + 1, iy + 1);
      const vals = [v00, v10, v01, v11];
      if (vals.some(Number.isNaN)) {
        const ok = vals.filter((v) => !Number.isNaN(v));
        return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN;
      }
      return lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
    }
  }

  // Acumula vértices con atributos de dirección de fibra y fracción tendinosa.
  class Builder {
    constructor() { this.pos = []; this.fib = []; this.ten = []; this.idx = []; }
    vert(p, f, t) {
      this.pos.push(p.x, p.y, p.z); this.fib.push(f.x, f.y, f.z); this.ten.push(t);
      return this.pos.length / 3 - 1;
    }
    tri(a, b, c) { this.idx.push(a, b, c); }
    geometry() {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('fiber', new T.Float32BufferAttribute(this.fib, 3));
      g.setAttribute('tendon', new T.Float32BufferAttribute(this.ten, 1));
      g.setIndex(this.idx);
      return g;
    }
  }

  // Lámina gruesa cerrada a partir de una rejilla (u, v) con puntos interno/externo.
  function thickSheet(B, nu, nv, fn) {
    const O = [], I = [], F = [], TT = [];
    for (let i = 0; i <= nu; i++) {
      O[i] = []; I[i] = []; F[i] = []; TT[i] = [];
      for (let j = 0; j <= nv; j++) {
        const r = fn(i / nu, j / nv);
        O[i][j] = r.pOut; I[i][j] = r.pIn; F[i][j] = r.fiber; TT[i][j] = r.tendon;
      }
    }
    const start = B.idx.length;
    const vo = [], vi = [];
    for (let i = 0; i <= nu; i++) {
      vo[i] = []; vi[i] = [];
      for (let j = 0; j <= nv; j++) {
        vo[i][j] = B.vert(O[i][j], F[i][j], TT[i][j]);
        vi[i][j] = B.vert(I[i][j], F[i][j], TT[i][j]);
      }
    }
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        B.tri(vo[i][j], vo[i + 1][j], vo[i + 1][j + 1]); B.tri(vo[i][j], vo[i + 1][j + 1], vo[i][j + 1]);
        B.tri(vi[i][j], vi[i + 1][j + 1], vi[i + 1][j]); B.tri(vi[i][j], vi[i][j + 1], vi[i + 1][j + 1]);
      }
    }
    // Bordes (vértices duplicados para aristas nítidas)
    const dup = (i, j, outer) => B.vert(outer ? O[i][j] : I[i][j], F[i][j], TT[i][j]);
    for (let i = 0; i < nu; i++) {
      let a = dup(i + 1, 0, true), b = dup(i, 0, true), c = dup(i, 0, false), d = dup(i + 1, 0, false);
      B.tri(a, b, c); B.tri(a, c, d);
      a = dup(i, nv, true); b = dup(i + 1, nv, true); c = dup(i + 1, nv, false); d = dup(i, nv, false);
      B.tri(a, b, c); B.tri(a, c, d);
    }
    for (let j = 0; j < nv; j++) {
      let a = dup(0, j, true), b = dup(0, j + 1, true), c = dup(0, j + 1, false), d = dup(0, j, false);
      B.tri(a, b, c); B.tri(a, c, d);
      a = dup(nu, j + 1, true); b = dup(nu, j, true); c = dup(nu, j, false); d = dup(nu, j + 1, false);
      B.tri(a, b, c); B.tri(a, c, d);
    }
    orientOutward(B, start);
  }

  // Si el volumen con signo es negativo, invierte el orden de los triángulos añadidos.
  function orientOutward(B, start) {
    const p = B.pos; let vol = 0;
    for (let t = start; t < B.idx.length; t += 3) {
      const a = B.idx[t] * 3, b = B.idx[t + 1] * 3, c = B.idx[t + 2] * 3;
      vol += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1])
        - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c])
        + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
    }
    if (vol < 0) {
      for (let t = start; t < B.idx.length; t += 3) {
        const tmp = B.idx[t + 1]; B.idx[t + 1] = B.idx[t + 2]; B.idx[t + 2] = tmp;
      }
    }
  }

  // Copia especular (derecha → izquierda).
  function mirrorX(g) {
    const m = g.clone();
    const p = m.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) p[i] = -p[i];
    if (m.attributes.fiber) { const f = m.attributes.fiber.array; for (let i = 0; i < f.length; i += 3) f[i] = -f[i]; }
    const ix = m.index.array;
    for (let t = 0; t < ix.length; t += 3) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; }
    return m;
  }

  // ════════════════════════════ Referencias óseas ════════════════════════════

  const VERTEBRAS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7',
    'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
    'L1', 'L2', 'L3', 'L4', 'L5'];

  function vertebraLandmarks(name, g) {
    const bb = bboxOf(g);
    const depth = bb.max.z - bb.min.z;
    const body = centroidWhere(g, (x, y, z) => z < bb.min.z + 0.3 * depth && Math.abs(x) < 0.25) || bb.getCenter(V());
    const spTip = best(g, (x, y, z) => z - Math.abs(x) * 0.6);
    const tpR = best(g, (x) => x);
    const halfW = (bb.max.x - bb.min.x) / 2;
    const region = name[0];
    // Origen de los multífidos: apófisis mamilar (L), transversa (T) o articular (C)
    const f = region === 'L' ? 0.5 : 0.6;
    const a = halfW * f;
    const yMin = region === 'L' ? body.y - 0.02 : -Infinity;
    let arch = null;
    for (const w of [0.035, 0.07, 0.12]) {
      arch = best(g, (x, y, z) => (Math.abs(x - a) < w && y > yMin ? z : -Infinity));
      if (arch) break;
    }
    return { name, bb, body, spTip, tpR, halfW, arch, region };
  }

  function computeLandmarks(G) {
    const L = { vert: {} };
    for (const n of VERTEBRAS) if (G[n]) L.vert[n] = vertebraLandmarks(n, G[n]);

    const sac = G.sacro, sbb = bboxOf(sac), H = sbb.max.y - sbb.min.y;
    L.sacrum = { bb: sbb };
    L.sacralOrigins = [0, 1, 2, 3].map((k) => {
      const y0 = sbb.max.y - (0.22 + 0.16 * k) * H;
      return best(sac, (x, y, z) => (Math.abs(x - (0.2 - 0.03 * k)) < 0.07 && Math.abs(y - y0) < 0.07 ? z : -Infinity));
    });
    L.sacralCrest = [0, 1, 2].map((k) => {
      const y0 = sbb.max.y - (0.25 + 0.17 * k) * H;
      return best(sac, (x, y, z) => (Math.abs(x) < 0.05 && Math.abs(y - y0) < 0.06 ? z : -Infinity));
    });
    L.sacralApex = best(sac, (x, y, z) => (Math.abs(x) < 0.12 ? -y : -Infinity));

    const cox = G.coxal_R;
    L.psis = best(cox, (x, y, z) => (y > sbb.max.y - 0.55 && y < sbb.max.y + 0.1 ? z : -Infinity));
    L.crest = (xk) => best(cox, (x, y, z) => (Math.abs(x - xk) < 0.03 ? y : -Infinity));

    L.ribLateral = (k) => best(G[`costilla${k}_R`], (x) => x);
    L.rib12Lower = (xk) => best(G.costilla12_R, (x, y) => (Math.abs(x - xk) < 0.035 ? -y : -Infinity));

    const hum = G.humero_R, hbb = bboxOf(hum);
    const humAt = (dy) => best(hum, (x, y, z) => (Math.abs(y - (hbb.max.y - dy)) < 0.035 ? -z - 0.6 * x : -Infinity));
    L.latInsHigh = humAt(0.55);
    L.latInsLow = humAt(0.82);
    L.scapulaAngle = best(G.escapula_R, (x, y) => -y);
    return L;
  }

  // ════════════════════════════ Estructuras procedimentales ════════════════════════════

  // Mapa de la superficie ósea posterior (x, y) → z máxima (láminas y apófisis): los fascículos no deben atravesar el hueso.
  function posteriorBoneMap(G) {
    const m = new Grid(-0.8, 0.8, 80, -3.7, 3.7, 370);
    const names = VERTEBRAS.concat(['sacro']);
    // Se excluye la franja de las apófisis espinosas: los fascículos discurren en el canal a su lado.
    for (const n of names) if (G[n]) sampleSurface(G[n], 0.018, (x, y, z) => { if (Math.abs(x) > 0.075) m.putMax(x, y, z); });
    m.filter(1, 'max');
    return m;
  }

  function buildMultifidus(L, boneMap) {
    const B = new Builder();
    const levels = VERTEBRAS.slice(1); // C2–L5 (el atlas no recibe multífidos)
    const seq = levels.concat(['S1', 'S2', 'S3', 'S4']);
    const baseR = (n) => {
      if (n[0] === 'C') return 0.027;
      if (n[0] === 'T') return +n.slice(1) <= 6 ? 0.027 : 0.033;
      return { L1: 0.048, L2: 0.056, L3: 0.064, L4: 0.07, L5: 0.074 }[n];
    };
    const origin = (n) => (n[0] === 'S' ? L.sacralOrigins[+n[1] - 1] : L.vert[n].arch);
    const insertion = (n) => {
      const v = L.vert[n];
      const p = v.body.clone().lerp(v.spTip, n[0] === 'C' ? 0.8 : 0.74);
      p.x = 0.032;
      return p;
    };
    for (let i = 0; i < levels.length; i++) {
      for (const k of [2, 3, 4]) {
        const on = seq[i + k];
        if (!on || (on[0] === 'C' && +on.slice(1) < 4)) continue;
        const A = origin(on);
        if (!A) continue;
        fascicle(B, A, insertion(levels[i]), baseR(levels[i]) * (0.78 + 0.1 * k), k, boneMap);
      }
    }
    // Fascículos desde la espina ilíaca posterosuperior y el sacro lateral hacia L4–L5
    const lat = L.sacralOrigins[1].clone(); lat.x += 0.1;
    fascicle(B, L.psis, insertion('L4'), 0.078, 4, boneMap);
    fascicle(B, L.psis, insertion('L5'), 0.078, 3, boneMap);
    fascicle(B, lat, insertion('L5'), 0.078, 4, boneMap);
    return B.geometry();
  }

  // Fascículo fusiforme de sección elíptica entre A (origen) y P (inserción).
  function fascicle(B, A, P, r, rank, boneMap) {
    const n = 22, m = 14;
    const len = A.distanceTo(P);
    const ctrl = A.clone().add(P).multiplyScalar(0.5); ctrl.z += len * 0.1;
    const pts = [], rad = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, it = 1 - t;
      const p = V(
        it * it * A.x + 2 * it * t * ctrl.x + t * t * P.x,
        it * it * A.y + 2 * it * t * ctrl.y + t * t * P.y,
        it * it * A.z + 2 * it * t * ctrl.z + t * t * P.z);
      const rt = r * (0.26 + 0.74 * Math.pow(Math.sin(Math.PI * t), 0.6));
      const bz = boneMap.sample(p.x, p.y);
      if (!Number.isNaN(bz)) {
        const need = bz + rt * 0.62 * (1 + 0.45 * (rank - 2));
        const w = smooth(0.02, 0.22, t) * smooth(0.98, 0.8, t);
        if (p.z < need) p.z = lerp(p.z, need, w);
      }
      pts.push(p); rad.push(rt);
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < n; i++) pts[i].z = Math.max(pts[i].z, (pts[i - 1].z + pts[i + 1].z) / 2);
    }
    const rings = [];
    const up = V(0, 0, 1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const tan = pts[Math.min(n, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
      const nz = up.clone().addScaledVector(tan, -tan.z).normalize();
      const bx = V().crossVectors(tan, nz);
      const ten = clamp(1 - smooth(0.0, 0.16, t) + smooth(0.84, 1.0, t), 0, 1);
      const ring = [];
      for (let k = 0; k < m; k++) {
        const ph = (k / m) * Math.PI * 2;
        const q = pts[i].clone().addScaledVector(bx, Math.cos(ph) * rad[i] * 1.35).addScaledVector(nz, Math.sin(ph) * rad[i] * 0.68);
        ring.push(B.vert(q, tan, ten));
      }
      rings.push({ ring, tan, ten });
    }
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < m; k++) {
        const a = rings[i].ring[k], b = rings[i + 1].ring[k], c = rings[i].ring[(k + 1) % m], d = rings[i + 1].ring[(k + 1) % m];
        B.tri(a, b, c); B.tri(b, d, c);
      }
    }
    const c0 = B.vert(pts[0], rings[0].tan, 1), c1 = B.vert(pts[n], rings[n].tan, 1);
    for (let k = 0; k < m; k++) {
      B.tri(c0, rings[0].ring[k], rings[0].ring[(k + 1) % m]);
      B.tri(c1, rings[n].ring[(k + 1) % m], rings[n].ring[k]);
    }
  }

  function buildQuadratusLumborum(L) {
    const B = new Builder();
    const off = (p, dz, dy = 0) => V(p.x, p.y + dy, p.z + dz);
    const crestPts = [0.5, 0.62, 0.74, 0.86, 0.94].map((x) => off(L.crest(x), -0.1, -0.03));
    const ribPts = [0.25, 0.35, 0.45, 0.55, 0.64].map((x) => off(L.rib12Lower(x), -0.05, -0.01));
    const tp = ['L4', 'L3', 'L2', 'L1'].map((n) => off(L.vert[n].tpR, -0.07));
    const C0 = new T.CatmullRomCurve3(crestPts, false, 'centripetal');
    const C1 = new T.CatmullRomCurve3(ribPts, false, 'centripetal');
    const D0 = new T.CatmullRomCurve3([crestPts[0], ...tp, ribPts[0]], false, 'centripetal');
    const lm = crestPts[4].clone().lerp(ribPts[4], 0.5); lm.x += 0.06;
    const D1 = new T.CatmullRomCurve3([crestPts[4], lm, ribPts[4]], false, 'centripetal');
    const P00 = crestPts[0], P10 = crestPts[4], P01 = ribPts[0], P11 = ribPts[4];
    const S = (u, v) => {
      const c0 = C0.getPointAt(u), c1 = C1.getPointAt(u), d0 = D0.getPointAt(v), d1 = D1.getPointAt(v);
      return V(
        (1 - v) * c0.x + v * c1.x + (1 - u) * d0.x + u * d1.x - ((1 - u) * (1 - v) * P00.x + u * (1 - v) * P10.x + (1 - u) * v * P01.x + u * v * P11.x),
        (1 - v) * c0.y + v * c1.y + (1 - u) * d0.y + u * d1.y - ((1 - u) * (1 - v) * P00.y + u * (1 - v) * P10.y + (1 - u) * v * P01.y + u * v * P11.y),
        (1 - v) * c0.z + v * c1.z + (1 - u) * d0.z + u * d1.z - ((1 - u) * (1 - v) * P00.z + u * (1 - v) * P10.z + (1 - u) * v * P01.z + u * v * P11.z));
    };
    thickSheet(B, 16, 26, (u, v) => {
      const mid = S(u, v);
      const t = 0.02 + 0.15 * Math.pow(Math.sin(Math.PI * u), 0.6) * (0.55 + 0.45 * Math.sin(Math.PI * v));
      const fib = S(u, Math.min(1, v + 0.02)).sub(S(u, Math.max(0, v - 0.02))).normalize();
      const ten = 0.6 * clamp(smooth(0.1, 0.0, v) + smooth(0.92, 1.0, v), 0, 1);
      return { pOut: mid.clone().setZ(mid.z + t / 2), pIn: mid.clone().setZ(mid.z - t / 2), fiber: fib, tendon: ten };
    });
    return B.geometry();
  }

  function buildLatissimus(L, G) {
    const cx = 0, cz = -0.6;
    const deep = new Grid(-Math.PI, Math.PI, 200, -2.9, 2.5, 135, true);
    const trap = new Grid(-Math.PI, Math.PI, 200, -2.9, 2.5, 135, true);
    const addTo = (grid, name, op) => {
      if (!G[name]) return;
      sampleSurface(G[name], 0.03, (x, y, z) => {
        const th = Math.atan2(x - cx, z - cz), r = Math.hypot(x - cx, z - cz);
        if (op === 'max') grid.putMax(th, y, r); else grid.putMin(th, y, r);
      });
    };
    const deepNames = ['ilio_lum', 'ilio_tor', 'long_tor', 'espinoso', 'serr_pi', 'romb_may', 'escapula', 'coxal', 'multifidos']
      .flatMap((n) => [`${n}_R`, `${n}_L`])
      .concat(Array.from({ length: 8 }, (_, i) => [`costilla${i + 5}_R`, `costilla${i + 5}_L`]).flat())
      .concat(VERTEBRAS.slice(10), ['sacro']);
    deepNames.forEach((n) => addTo(deep, n, 'max'));
    ['trap_asc_R', 'trap_asc_L', 'trap_trans_R', 'trap_trans_L'].forEach((n) => addTo(trap, n, 'min'));
    deep.fillHoles();
    deep.filter(2, 'max');
    deep.filter(2, 'avg');
    deep.filter(1, 'avg');

    // Línea de origen: espinosas T7–L5 → cresta sacra → EIPS → cresta ilíaca → costillas 11–9
    const origin = [];
    for (const n of ['T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'L1', 'L2', 'L3', 'L4', 'L5']) {
      const p = L.vert[n].spTip.clone(); p.x = 0.008; origin.push({ p, apo: n[0] === 'T' ? (+n.slice(1) < 10 ? 0.04 : 0.1) : 0.24 });
    }
    L.sacralCrest.forEach((p) => origin.push({ p: V(0.008, p.y, p.z), apo: 0.3 }));
    origin.push({ p: L.psis.clone(), apo: 0.24 });
    [0.55, 0.7, 0.85, 0.98].forEach((x, i) => origin.push({ p: L.crest(x), apo: 0.14 - i * 0.035 }));
    [11, 10, 9].forEach((k) => origin.push({ p: L.ribLateral(k), apo: 0.025 }));
    const oCurve = new T.CatmullRomCurve3(origin.map((o) => o.p), false, 'centripetal');
    // fracción aponeurótica a lo largo del origen (interpolada por longitud de arco)
    const lens = [0];
    for (let i = 1; i < origin.length; i++) lens.push(lens[i - 1] + origin[i].p.distanceTo(origin[i - 1].p));
    const apoAt = (u) => {
      const d = u * lens[lens.length - 1];
      let i = 1; while (i < lens.length - 1 && lens[i] < d) i++;
      const t = clamp((d - lens[i - 1]) / (lens[i] - lens[i - 1] || 1), 0, 1);
      return lerp(origin[i - 1].apo, origin[i].apo, t);
    };

    const ang = L.scapulaAngle;
    const K0 = V(ang.x + 0.32, ang.y + 0.22, ang.z - 0.12); // convergencia de las fibras superiores
    const K1 = V(ang.x + 0.48, ang.y - 0.05, ang.z - 0.3); // convergencia de las fibras laterales
    const nu = 70, nv = 46;

    const radial = (p) => {
      const th = Math.atan2(p.x - cx, p.z - cz);
      return { th, r: Math.hypot(p.x - cx, p.z - cz) };
    };
    const fromRadial = (th, r, y) => V(cx + Math.sin(th) * r, y, cz + Math.cos(th) * r);

    // Pre-cálculo de fibras
    const grid = [];
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const O = oCurve.getPointAt(u);
      const Ins = L.latInsLow.clone().lerp(L.latInsHigh, u);
      const K = K0.clone().lerp(K1, smooth(0, 1, u));
      // Las fibras inferiores ascienden casi verticales: su punto de convergencia se aproxima al origen
      const mid = K.clone().lerp(O.clone().lerp(Ins, 0.55), 0.35 * smooth(0.55, 1, u));
      const path = new T.CatmullRomCurve3([O, mid, Ins], false, 'centripetal');
      const apo = apoAt(u);
      const col = [];
      for (let j = 0; j <= nv; j++) {
        const v = j / nv;
        const p = path.getPointAt(v);
        const { th, r } = radial(p);
        const surf = deep.sample(th, p.y);
        let T0 = 0.013 + (0.03 + 0.085 * smooth(0.45, 0.88, v)) * smooth(apo - 0.02, apo + 0.08, v);
        T0 *= 1 + 0.6 * smooth(0.82, 1, u) * smooth(0.3, 0.8, v);
        T0 = lerp(T0, 0.03, smooth(0.9, 0.99, v));
        let rIn = Math.max((Number.isNaN(surf) ? r : surf) + 0.012, r - T0 / 2);
        let rOut = rIn + T0;
        const tm = trap.sample(th, p.y);
        if (!Number.isNaN(tm) && rOut > tm - 0.006 && v < 0.6) {
          rOut = tm - 0.006; rIn = Math.min(rIn, rOut - 0.012);
        }
        const tendon = clamp(0.92 * (1 - smooth(apo - 0.04, apo + 0.06, v)) + smooth(0.91, 0.98, v), 0, 1);
        col.push({ pIn: fromRadial(th, rIn, p.y), pOut: fromRadial(th, rOut, p.y), tendon });
      }
      grid.push(col);
    }
    const B = new Builder();
    thickSheet(B, nu, nv, (u, v) => {
      const i = Math.round(u * nu), j = Math.round(v * nv);
      const c = grid[i][j];
      const a = grid[i][Math.max(0, j - 1)].pOut, b = grid[i][Math.min(nv, j + 1)].pOut;
      return { pIn: c.pIn, pOut: c.pOut, fiber: b.clone().sub(a).normalize(), tendon: c.tendon };
    });
    return B.geometry();
  }

  function buildCoccyx(L, G) {
    const sac = G.sacro;
    const apex = L.sacralApex;
    const c1 = centroidWhere(sac, (x, y) => Math.abs(y - (apex.y + 0.32)) < 0.04 && Math.abs(x) < 0.3);
    const dir = apex.clone().sub(c1).normalize();
    dir.applyAxisAngle(V(1, 0, 0), 0.35).normalize(); // continúa la curvatura hacia delante
    const side = V(1, 0, 0);
    const depthAxis = V().crossVectors(side, dir).normalize();
    const sizes = [[0.2, 0.085, 0.075], [0.145, 0.07, 0.065], [0.105, 0.06, 0.052], [0.07, 0.048, 0.04]];
    const parts = [];
    let c = apex.clone().addScaledVector(dir, 0.02);
    sizes.forEach(([w, h, d], i) => {
      c = c.clone().addScaledVector(dir, h * 0.95 + (i ? sizes[i - 1][1] * 0.75 : 0));
      const s = new T.SphereGeometry(1, 28, 18);
      const m = new T.Matrix4().makeBasis(side.clone().multiplyScalar(w), dir.clone().multiplyScalar(h), depthAxis.clone().multiplyScalar(d));
      m.setPosition(c);
      s.applyMatrix4(m);
      parts.push(s);
      dir.applyAxisAngle(V(1, 0, 0), 0.12);
    });
    const merged = parts.length > 1 ? mergeParts(parts) : parts[0];
    return merged;
  }

  function mergeParts(list) {
    const pos = [], idx = [];
    for (const g of list) {
      const o = pos.length / 3;
      pos.push(...g.attributes.position.array);
      for (const i of g.index.array) idx.push(i + o);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }

  // ════════════════════════════ Atributos de fibra para mallas reales ════════════════════════════

  // Dirección de fibras (lado derecho) cuando el eje principal de la malla no la representa bien.
  const FIBRA = {
    romb_may: [1, -0.55, 0], romb_men: [1, -0.5, 0],
    serr_ps: [1, -0.6, 0], serr_pi: [1, 0.45, 0],
    trap_trans: [1, 0, 0], trap_asc: [0.75, 1, 0],
    elev_cost: [0.4, -1, 0], obl_inf: [1, 0.35, -0.3], rcp_may: [0.4, 1, 0.1],
  };

  function principalAxis(g) {
    const p = g.attributes.position.array, n = p.length / 3;
    const c = V();
    for (let i = 0; i < p.length; i += 3) { c.x += p[i]; c.y += p[i + 1]; c.z += p[i + 2]; }
    c.multiplyScalar(1 / n);
    const C = [0, 0, 0, 0, 0, 0]; // xx xy xz yy yz zz
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i] - c.x, y = p[i + 1] - c.y, z = p[i + 2] - c.z;
      C[0] += x * x; C[1] += x * y; C[2] += x * z; C[3] += y * y; C[4] += y * z; C[5] += z * z;
    }
    let v = V(0.1, 1, 0.1).normalize();
    for (let k = 0; k < 40; k++) {
      v = V(C[0] * v.x + C[1] * v.y + C[2] * v.z, C[1] * v.x + C[3] * v.y + C[4] * v.z, C[2] * v.x + C[4] * v.y + C[5] * v.z).normalize();
    }
    return { axis: v, center: c };
  }

  function addMuscleAttributes(name, g) {
    const base = name.replace(/_[RL]$/, '');
    const left = name.endsWith('_L');
    const { axis, center } = principalAxis(g);
    let dir = axis;
    if (FIBRA[base]) { const f = FIBRA[base]; dir = V(left ? -f[0] : f[0], f[1], f[2]).normalize(); }
    const p = g.attributes.position.array, n = p.length / 3;
    const fib = new Float32Array(n * 3), ten = new Float32Array(n);
    // Tendones en los extremos del eje principal (tono más claro)
    let tmin = Infinity, tmax = -Infinity;
    const proj = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = (p[i * 3] - center.x) * axis.x + (p[i * 3 + 1] - center.y) * axis.y + (p[i * 3 + 2] - center.z) * axis.z;
      proj[i] = t; tmin = Math.min(tmin, t); tmax = Math.max(tmax, t);
    }
    const span = tmax - tmin || 1;
    for (let i = 0; i < n; i++) {
      fib[i * 3] = dir.x; fib[i * 3 + 1] = dir.y; fib[i * 3 + 2] = dir.z;
      const t = (proj[i] - tmin) / span;
      ten[i] = 0.55 * clamp(smooth(0.035, 0.0, t) + smooth(0.965, 1.0, t), 0, 1);
    }
    g.setAttribute('fiber', new T.BufferAttribute(fib, 3));
    g.setAttribute('tendon', new T.BufferAttribute(ten, 1));
  }

  // ════════════════════════════ Materiales ════════════════════════════

  const FIBER_GLSL = /* glsl */`
    varying vec3 vFiber;
    varying float vTendon;
    varying vec3 vObjPos;
    uniform float uFiberStrength;
    uniform vec3 uTendonColor;
    float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vnoise(vec3 x) {
      vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fiberHeight(vec3 p, vec3 f) {
      float along = dot(p, f);
      vec3 q = p - along * f;
      return vnoise(q * 95.0 + f * along * 4.0) * 0.65 + vnoise(q * 210.0 + f * along * 9.0) * 0.35;
    }
    vec3 fiberPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
      vec3 sx = normalize(dFdx(surfPos)); vec3 sy = normalize(dFdy(surfPos));
      vec3 r1 = cross(sy, surfNorm); vec3 r2 = cross(surfNorm, sx);
      float det = dot(sx, r1) * faceDir;
      vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
      return normalize(abs(det) * surfNorm - grad);
    }
  `;

  // Resaltado tipo Fresnel (borde luminoso) común a músculos y huesos: conserva el color del tejido.
  const HIGHLIGHT_GLSL = `
    {
      float fr = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
      fr = fr * fr * (3.0 - 2.0 * fr);
      totalEmissiveRadiance += uHiColor * uHiAmount * (0.14 + 0.95 * fr * fr);
    }`;

  function withHighlight(mat, extraVertex, extraFragment) {
    mat.userData.uniforms = Object.assign({
      uHiColor: { value: new T.Color(0x000000) },
      uHiAmount: { value: 0 },
    }, mat.userData.uniforms || {});
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, mat.userData.uniforms);
      if (extraVertex) extraVertex(sh);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uHiColor;\nuniform float uHiAmount;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${HIGHLIGHT_GLSL}`);
      if (extraFragment) extraFragment(sh);
    };
    return mat;
  }

  function muscleMaterial(color) {
    const mat = new T.MeshPhysicalMaterial({
      color, roughness: 0.5, metalness: 0,
      sheen: 0.5, sheenRoughness: 0.5, sheenColor: new T.Color(color).lerp(new T.Color('#ffd9cf'), 0.4),
      clearcoat: 0.2, clearcoatRoughness: 0.4,
    });
    mat.userData.uniforms = {
      uFiberStrength: { value: 1.4 },
      uTendonColor: { value: new T.Color('#e9ddd0') },
    };
    withHighlight(mat,
      (sh) => {
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', `#include <common>
            attribute vec3 fiber; attribute float tendon;
            varying vec3 vFiber; varying float vTendon; varying vec3 vObjPos;`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            vFiber = fiber; vTendon = tendon; vObjPos = position;`);
      },
      (sh) => {
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>\n${FIBER_GLSL}`)
          .replace('#include <color_fragment>', `#include <color_fragment>
            diffuseColor.rgb = mix(diffuseColor.rgb, uTendonColor, clamp(vTendon, 0.0, 1.0));`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            roughnessFactor = mix(roughnessFactor, 0.36, clamp(vTendon, 0.0, 1.0));`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            {
              vec3 fdir = normalize(vFiber + vec3(1e-5));
              float h = fiberHeight(vObjPos, fdir);
              float fw = fwidth(h);
              float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
              float fade = (1.0 - smoothstep(0.08, 0.3, fw)) * smoothstep(0.08, 0.45, facing);
              float k = uFiberStrength * fade * (1.0 - 0.7 * clamp(vTendon, 0.0, 1.0));
              normal = fiberPerturb(-vViewPosition, normal, vec2(dFdx(h), dFdy(h)) * k, faceDirection);
            }`);
      });
    mat.customProgramCacheKey = () => 'musculo-v3';
    return mat;
  }

  function boneMaterial(color) {
    const mat = new T.MeshPhysicalMaterial({
      color, roughness: 0.62, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.6,
      sheen: 0.25, sheenRoughness: 0.8, sheenColor: new T.Color('#fff6e6'),
    });
    withHighlight(mat);
    mat.customProgramCacheKey = () => 'hueso-v2';
    return mat;
  }

  // ════════════════════════════ Construcción ════════════════════════════

  async function build(deps, onProgress = () => {}) {
    T = deps.THREE;
    const buffer = await loadModelBuffer((f) => onProgress(0.05 + f * 0.6, 'Descargando modelo anatómico…'));
    onProgress(0.68, 'Descomprimiendo mallas…');
    const gltf = await parseGLB(deps, buffer);
    const G = {};
    gltf.scene.traverse((o) => {
      if (o.isMesh) G[o.userData.name || o.name] = bake(o);
    });
    onProgress(0.76, 'Calculando referencias óseas…');
    await tick();
    const L = computeLandmarks(G);

    onProgress(0.8, 'Generando multífidos…');
    await tick();
    const boneMap = posteriorBoneMap(G);
    G.multifidos_R = buildMultifidus(L, boneMap);
    G.multifidos_L = mirrorX(G.multifidos_R);

    onProgress(0.85, 'Generando cuadrado lumbar y cóccix…');
    await tick();
    G.cuad_lumb_R = buildQuadratusLumborum(L);
    G.cuad_lumb_L = mirrorX(G.cuad_lumb_R);
    G.coccix = buildCoccyx(L, G);

    onProgress(0.9, 'Generando dorsal ancho…');
    await tick();
    G.dorsal_R = buildLatissimus(L, G);
    G.dorsal_L = mirrorX(G.dorsal_R);

    onProgress(0.96, 'Preparando superficies…');
    await tick();
    for (const [name, g] of Object.entries(G)) {
      if (!g.attributes.normal) g.computeVertexNormals();
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
    return { geometries: G, landmarks: L };
  }

  function isMuscleName(name, muscleIds) {
    return muscleIds.has(name.replace(/_[RL]$/, ''));
  }

  const tick = () => new Promise((r) => setTimeout(r, 0));

  return { build, muscleMaterial, boneMaterial, addMuscleAttributes, isMuscleName, VERTEBRAS };
})();
