/*
 * Atlas 3D de los músculos de la columna vertebral
 * Interfaz: escena, cámara, capas, selección, fichas, buscador, árbol, etiquetas y quiz.
 */
window.AtlasApp = (function () {
  'use strict';

  const D = window.ATLAS_DATA;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  let THREE, renderer, scene, camera, controls, raycaster;
  let modelBox, modelCenter;
  let started = false;

  const entries = new Map(); // nombre de malla → entrada
  let pickables = [];

  const muscleById = new Map(D.musculos.map((m) => [m.id, m]));
  const groupById = new Map(D.grupos.map((g) => [g.id, g]));
  const layerById = new Map(D.capas.map((c) => [c.id, c]));
  const boneItemById = new Map();
  D.gruposHueso.forEach((g) => g.items.forEach((it) => boneItemById.set(it.id, { item: it, group: g })));

  const SIDE_TXT = { R: 'lado derecho', L: 'lado izquierdo' };
  const SELECT_COLOR = 0x39d5c8;
  const QUIZ_COLOR = 0xffc857;

  const defaults = () => ({
    layers: Object.fromEntries(D.capas.map((c) => [c.id, { visible: true, opacity: 1 }])),
    regions: new Set(D.regiones.map((r) => r.id)),
    explode: 0,
    labels: false,
    isolate: false,
  });
  const S = Object.assign(defaults(), {
    selection: null, // { kind, id, sides, meshes }
    hover: null,
    hidden: new Set(), // "muscle:id" | "bone:id"
    quiz: null,
    tween: null,
    lateralSide: 'R',
    dirty: true,
  });

  // ════════════════════════════ Arranque ════════════════════════════

  function setProgress(f, text) {
    $('#progress-bar').style.width = `${Math.round(f * 100)}%`;
    if (text) $('#loader-status').textContent = text;
  }

  function fail(msg) {
    const l = $('#loader');
    l.classList.add('error');
    $('#loader-status').textContent = msg;
  }

  setTimeout(() => {
    if (!started) fail('No se pudo cargar el motor 3D (Three.js) desde internet. Revisa tu conexión y recarga la página.');
  }, 30000);

  async function start(deps) {
    started = true;
    THREE = deps.THREE;
    if (deps.computeBoundsTree) {
      THREE.BufferGeometry.prototype.computeBoundsTree = deps.computeBoundsTree;
      THREE.Mesh.prototype.raycast = deps.acceleratedRaycast;
    }
    try {
      setProgress(0.04, 'Preparando escena…');
      initScene(deps);
      const { geometries } = await window.Anatomy.build(deps, setProgress);
      createEntries(geometries);
      buildUI();
      refreshVisibility();
      applyHighlights();
      setView('posterior', true);
      setProgress(1, 'Listo');
      requestAnimationFrame(loop);
      if (deps.computeBoundsTree) buildBVHInBackground([...entries.values()].map((e) => e.mesh.geometry));
      setTimeout(() => {
        $('#loader').classList.add('done');
        toast('Haz clic en un músculo para ver su ficha');
      }, 250);
    } catch (err) {
      console.error(err);
      fail(`Error al iniciar: ${err.message}`);
    }
  }

  function initScene(deps) {
    _a = new THREE.Vector3(); _c = new THREE.Vector3(); _d = new THREE.Vector3(); _p = new THREE.Vector3();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    $('#viewport').appendChild(renderer.domElement);

    scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new deps.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;

    camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.05, 200);
    camera.position.set(0, 0.5, 16);
    scene.add(camera);

    // Iluminación: luz principal y de relleno solidarias a la cámara, contraluz para el volumen.
    scene.add(new THREE.HemisphereLight(0xe8eeff, 0x1c1411, 0.5));
    const addCamLight = (color, intensity, pos, target = [0, 0, -12]) => {
      const l = new THREE.DirectionalLight(color, intensity);
      l.position.set(...pos);
      l.target.position.set(...target);
      camera.add(l); camera.add(l.target);
      return l;
    };
    addCamLight(0xfff3e8, 2.1, [4, 5, 3]);
    addCamLight(0xffe2d6, 0.45, [-5, -2, 2]);
    addCamLight(0xa9d8ff, 1.1, [-3, 4, -34], [0, 0, -8]);
    addCamLight(0xffffff, 0.5, [5, -1, -30], [0, 0, -8]);

    controls = new deps.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 1.2;
    controls.maxDistance = 45;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.1;
    controls.addEventListener('start', () => { S.tween = null; clearActiveView(); hideTooltip(); });

    raycaster = new THREE.Raycaster();
    window.addEventListener('resize', onResize);
    bindPointer();
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    S.dirty = true;
  }

  // ════════════════════════════ Entradas (mallas) ════════════════════════════

  function muscleColors() {
    const out = {};
    for (const g of D.grupos) {
      const ms = D.musculos.filter((m) => m.grupo === g.id);
      ms.forEach((m, i) => {
        const c = new THREE.Color(g.color);
        const n = ms.length;
        const l = n > 1 ? -0.06 + (0.12 * i) / (n - 1) : 0;
        c.offsetHSL(n > 1 ? (i % 2 ? 0.012 : -0.012) : 0, 0, l);
        out[m.id] = c;
      });
    }
    return out;
  }

  function boneRegion(id) {
    const m = id.match(/^disco_([CTL])/);
    if (m) return { C: 'cervical', T: 'toracica', L: 'lumbar' }[m[1]];
    const bi = boneItemById.get(id);
    return bi ? bi.group.region : null;
  }

  function createEntries(G) {
    const colors = muscleColors();
    const boneCol = new THREE.Color('#e4d9c3');
    const discCol = new THREE.Color('#a9c6cf');
    const cartCol = new THREE.Color('#c9d9d3');
    for (const [name, geom] of Object.entries(G)) {
      const side = /_R$/.test(name) ? 'R' : /_L$/.test(name) ? 'L' : null;
      const id = side ? name.slice(0, -2) : name;
      let entry;
      if (muscleById.has(id)) {
        const m = muscleById.get(id), g = groupById.get(m.grupo), layer = layerById.get(g.capa);
        if (!geom.attributes.fiber) window.Anatomy.addMuscleAttributes(name, geom);
        const color = colors[id];
        const mat = window.Anatomy.muscleMaterial(color);
        entry = {
          name, kind: 'muscle', id, side, data: m, color, layer: g.capa, group: g.id,
          regions: m.regiones, explode: g.explosion ?? layer.explosion,
          label: m.nombre, mesh: new THREE.Mesh(geom, mat),
        };
      } else {
        const bi = boneItemById.get(id);
        if (!bi) { console.warn('Estructura sin datos:', name); continue; }
        const color = id.startsWith('disco') ? discCol : id.startsWith('cartilago') ? cartCol : boneCol;
        const mat = window.Anatomy.boneMaterial(color);
        const reg = boneRegion(id);
        entry = {
          name, kind: 'bone', id, side, data: bi.item, color, layer: 'hueso', group: bi.group.id,
          regions: reg ? [reg] : [], explode: 0, label: bi.item.nombre, mesh: new THREE.Mesh(geom, mat),
        };
      }
      entry.mesh.material.side = THREE.DoubleSide;
      entry.mesh.name = name;
      entry.mesh.userData.entry = entry;
      entry.baseColor = entry.color.clone();
      if (entry.kind === 'muscle') entry.anchors = computeAnchors(geom);
      entries.set(name, entry);
      scene.add(entry.mesh);
    }
    modelBox = new THREE.Box3();
    for (const e of entries.values()) if (e.kind === 'bone') modelBox.union(e.mesh.geometry.boundingBox);
    modelCenter = modelBox.getCenter(new THREE.Vector3());
  }

  // Puntos de anclaje de etiquetas: un punto de superficie por cada dirección principal.
  const ANCHOR_DIRS = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
  function computeAnchors(g) {
    const p = g.attributes.position.array;
    const c = g.boundingSphere.center;
    return ANCHOR_DIRS.map(([dx, dy, dz]) => {
      let bs = -Infinity, bi = 0;
      for (let i = 0; i < p.length; i += 3) {
        const qx = p[i] - c.x, qy = p[i + 1] - c.y, qz = p[i + 2] - c.z;
        const along = qx * dx + qy * dy + qz * dz;
        const perp = Math.sqrt(Math.max(0, qx * qx + qy * qy + qz * qz - along * along));
        const s = along - 0.7 * perp;
        if (s > bs) { bs = s; bi = i; }
      }
      return { dir: new THREE.Vector3(dx, dy, dz), p: new THREE.Vector3(p[bi], p[bi + 1], p[bi + 2]) };
    });
  }

  const keyOf = (e) => `${e.kind}:${e.id}`;

  function entriesFor(kind, id, sides) {
    const out = [];
    for (const e of entries.values()) {
      if (e.kind === kind && e.id === id && (!sides || !e.side || sides.includes(e.side))) out.push(e);
    }
    return out;
  }

  // ════════════════════════════ Visibilidad, opacidad y resaltado ════════════════════════════

  function setOpacity(mat, op) {
    const transparent = op < 0.999;
    if (mat.transparent !== transparent) { mat.transparent = transparent; mat.needsUpdate = true; }
    mat.opacity = op;
    mat.depthWrite = !transparent || op > 0.6;
  }

  function inSelection(e) { return !!S.selection && S.selection.meshes.includes(e.name); }

  function refreshVisibility() {
    pickables = [];
    for (const e of entries.values()) {
      const L = S.layers[e.layer];
      let vis = L.visible, op = L.opacity, pick = true;
      if (S.quiz) {
        pick = false;
        if (e.kind === 'muscle') {
          const target = S.quiz.target && S.quiz.target.meshes.includes(e.name);
          const inReg = e.regions.some((r) => S.regions.has(r));
          vis = target || inReg; op = target ? 1 : 0.06;
        }
      } else {
        if (S.hidden.has(keyOf(e))) vis = false;
        const inRegion = !e.regions.length || e.regions.some((r) => S.regions.has(r));
        if (!inRegion) {
          if (e.kind === 'muscle') vis = false;
          else { op = Math.min(op, 0.12); pick = false; }
        }
        if (S.isolate && S.selection) {
          if (inSelection(e)) { vis = true; op = Math.max(op, 1); }
          else if (e.kind === 'muscle') vis = false;
        }
      }
      e.mesh.visible = vis && op > 0.01;
      setOpacity(e.mesh.material, op);
      if (e.mesh.visible && pick && op > 0.25) pickables.push(e.mesh);
    }
    updateTreeState();
    updateGhosts();
    occlusionPending = true;
    S.labelsDirty = true;
    S.dirty = true;
  }

  function setHighlight(e, color, amount) {
    const u = e.mesh.material.userData.uniforms;
    u.uHiColor.value.set(color);
    u.uHiAmount.value = amount;
  }

  function applyHighlights() {
    for (const e of entries.values()) {
      const sel = !S.quiz && inSelection(e);
      const hov = !S.quiz && S.hover === e.name;
      if (sel) setHighlight(e, SELECT_COLOR, hov ? 0.85 : 0.65);
      else if (hov) setHighlight(e, e.kind === 'bone' ? 0x9cc8d8 : e.baseColor.clone().lerp(new THREE.Color(0xffffff), 0.35), 0.5);
      else setHighlight(e, 0x000000, 0);
    }
    S.dirty = true;
  }

  // Silueta translúcida que se dibuja por encima de todo: la selección se ve aunque otra capa la cubra.
  let ghostGroup = null;
  const ghostMats = {};
  function ghostMaterial(hex) {
    if (ghostMats[hex]) return ghostMats[hex];
    ghostMats[hex] = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(hex) }, uAlpha: { value: 1 } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying vec3 vN; varying vec3 vV;
        void main() { float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(uColor, (0.05 + 0.5 * f * f) * uAlpha);
        #include <colorspace_fragment>
        }`,
      transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    });
    return ghostMats[hex];
  }

  function updateGhosts() {
    if (!ghostGroup) { ghostGroup = new THREE.Group(); ghostGroup.renderOrder = 20; scene.add(ghostGroup); }
    ghostGroup.clear();
    let names = [], hex = SELECT_COLOR;
    if (S.quiz && S.quiz.target) { names = S.quiz.target.meshes; hex = QUIZ_COLOR; }
    else if (S.selection) names = S.selection.meshes;
    for (const n of names) {
      const e = entries.get(n);
      if (!e || !e.mesh.visible) continue;
      const g = new THREE.Mesh(e.mesh.geometry, ghostMaterial(hex));
      g.renderOrder = 20;
      g.position.copy(e.mesh.position);
      g.userData.src = e.mesh;
      ghostGroup.add(g);
    }
    S.dirty = true;
  }

  function applyExplode() {
    for (const e of entries.values()) e.mesh.position.z = e.explode * S.explode;
    if (ghostGroup) ghostGroup.children.forEach((g) => g.position.copy(g.userData.src.position));
    occlusionPending = true;
    S.labelsDirty = true;
    S.dirty = true;
  }

  // ════════════════════════════ Cámara ════════════════════════════

  const VIEW_DIRS = {
    posterior: [0, 0.06, 1], frontal: [0, 0.06, -1],
    lateral_R: [1, 0.06, 0], lateral_L: [-1, 0.06, 0], superior: [0, 1, 0.04],
  };

  function viewArea() {
    const W = window.innerWidth, H = window.innerHeight;
    const wide = W >= 1024;
    const left = wide ? $('#panel-left').getBoundingClientRect().right + 12 : 0;
    const right = wide ? $('#panel-right').getBoundingClientRect().left - 12 : W;
    let right2 = right;
    let top = $('.topbar').getBoundingClientRect().bottom + 8;
    let bottom = $('.views').getBoundingClientRect().top - 8;
    const card = $('#card'), quiz = $('#quiz');
    if (!card.hidden) {
      const r = card.getBoundingClientRect();
      if (W >= 760) right2 = Math.min(right2, r.left - 12); else bottom = Math.min(bottom, r.top - 8);
    }
    if (!quiz.hidden) {
      const r = quiz.getBoundingClientRect();
      if (W >= 760) top = Math.max(top, r.bottom + 8); else bottom = Math.min(bottom, r.top - 8);
    }
    return { left, right: right2, top, bottom, W, H };
  }

  // Distancia para encuadrar una caja desde una dirección, teniendo en cuenta el área útil.
  function fitDistance(box, center, dir) {
    const a = viewArea();
    const effW = Math.max(200, a.right - a.left), effH = Math.max(200, a.bottom - a.top);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (effH / a.H);
    const tanH = tanV * (effW / effH);
    const back = dir.clone().normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), back);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(back, right).normalize();
    let d = 0;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(center);
      const z = p.dot(back);
      d = Math.max(d, z + Math.abs(p.dot(right)) / tanH, z + Math.abs(p.dot(up)) / tanV);
    }
    return d * 1.04;
  }

  // Desplaza el objetivo para que el encuadre quede centrado en el área útil (entre paneles).
  function areaOffset(center, dir, dist) {
    const a = viewArea();
    const cxPx = (a.left + a.right) / 2 - a.W / 2, cyPx = (a.top + a.bottom) / 2 - a.H / 2;
    const worldPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / a.H;
    const back = dir.clone().normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), back);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(back, right).normalize();
    return center.clone().addScaledVector(right, -cxPx * worldPerPx).addScaledVector(up, cyPx * worldPerPx);
  }

  function tweenTo(target, dir, dist, instant) {
    const toPos = target.clone().addScaledVector(dir.clone().normalize(), dist);
    if (instant) {
      controls.target.copy(target); camera.position.copy(toPos); controls.update(); S.dirty = true; return;
    }
    const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const to = new THREE.Spherical().setFromVector3(toPos.clone().sub(target));
    let dTheta = to.theta - from.theta;
    if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    S.tween = { from, to, dTheta, t0: performance.now(), ms: 800, fromT: controls.target.clone(), toT: target.clone() };
    hideTooltip();
  }

  function stepTween(now) {
    const tw = S.tween;
    const k = Math.min(1, (now - tw.t0) / tw.ms);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const sph = new THREE.Spherical(
      THREE.MathUtils.lerp(tw.from.radius, tw.to.radius, e),
      THREE.MathUtils.lerp(tw.from.phi, tw.to.phi, e),
      tw.from.theta + tw.dTheta * e);
    controls.target.lerpVectors(tw.fromT, tw.toT, e);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    camera.lookAt(controls.target);
    if (k >= 1) S.tween = null;
    S.labelsDirty = true;
  }

  function visibleBox() {
    const box = new THREE.Box3();
    for (const e of entries.values()) {
      if (!e.mesh.visible || e.mesh.material.opacity < 0.2) continue;
      const b = e.mesh.geometry.boundingBox.clone().translate(e.mesh.position);
      box.union(b);
    }
    return box.isEmpty() ? modelBox.clone() : box;
  }

  function setView(name, instant) {
    let key = name;
    if (name === 'lateral') {
      const btn = document.querySelector('.views [data-view="lateral"]');
      if (btn.classList.contains('active')) S.lateralSide = S.lateralSide === 'R' ? 'L' : 'R';
      key = `lateral_${S.lateralSide}`;
      btn.querySelector('span').textContent = S.lateralSide === 'R' ? 'Lateral D' : 'Lateral I';
    }
    const dir = name === 'fit'
      ? camera.position.clone().sub(controls.target).normalize()
      : new THREE.Vector3(...VIEW_DIRS[key]).normalize();
    const box = visibleBox();
    const center = box.getCenter(new THREE.Vector3());
    const dist = fitDistance(box, center, dir);
    tweenTo(areaOffset(center, dir, dist), dir, dist, instant);
    document.querySelectorAll('.views button').forEach((b) => b.classList.toggle('active', b.dataset.view === name && name !== 'fit'));
  }

  function clearActiveView() {
    document.querySelectorAll('.views button').forEach((b) => b.classList.remove('active'));
  }

  function frameEntries(list, opts = {}) {
    if (!list.length) return;
    const box = new THREE.Box3();
    list.forEach((e) => box.union(e.mesh.geometry.boundingBox.clone().translate(e.mesh.position)));
    const center = box.getCenter(new THREE.Vector3());
    let dir = opts.dir || camera.position.clone().sub(controls.target).normalize();
    // Para estructuras pequeñas se evita acercarse demasiado: el área útil muestra al menos ~24 cm de contexto.
    const a = viewArea();
    const visFrac = Math.max(0.2, (a.bottom - a.top) / a.H);
    const minDist = Math.max(opts.minDist ?? 0, 2.4 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * visFrac));
    const dist = Math.max(minDist, fitDistance(box, center, dir) * (opts.pad ?? 1.45));
    tweenTo(areaOffset(center, dir, dist), dir, dist);
  }

  // ════════════════════════════ Puntero: resaltado y selección ════════════════════════════

  let pointerState = null, hoverPending = null;

  function bindPointer() {
    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', (ev) => {
      pointerState = { x: ev.clientX, y: ev.clientY, t: performance.now(), id: ev.pointerId };
    });
    dom.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'mouse' && !(ev.buttons & 1)) hoverPending = { x: ev.clientX, y: ev.clientY };
      else if (S.hover) setHover(null);
    });
    dom.addEventListener('pointerleave', () => { hoverPending = null; setHover(null); });
    dom.addEventListener('pointerup', (ev) => {
      if (!pointerState || pointerState.id !== ev.pointerId) return;
      const moved = Math.hypot(ev.clientX - pointerState.x, ev.clientY - pointerState.y);
      const dt = performance.now() - pointerState.t;
      pointerState = null;
      if (moved > 6 || dt > 600 || ev.button !== 0) return;
      if (S.quiz) return;
      const e = pick(ev.clientX, ev.clientY);
      if (e) select({ kind: e.kind, id: e.id, sides: e.side ? [e.side] : null }, { frame: false });
      else select(null);
    });
  }

  function pick(x, y) {
    const r = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    raycaster.far = Infinity;
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.entry : null;
  }

  function processHover() {
    if (!hoverPending) return;
    const { x, y } = hoverPending;
    hoverPending = null;
    if (S.quiz) return;
    const e = pick(x, y);
    setHover(e ? e.name : null);
    const tip = $('#tooltip');
    if (e) {
      tip.innerHTML = `${esc(e.label)}<small>${e.side ? SIDE_TXT[e.side] + ' · ' : ''}${esc(e.kind === 'muscle' ? groupById.get(e.group).nombre : 'Hueso')}</small>`;
      tip.hidden = false;
      const w = tip.offsetWidth;
      const left = x + 16 + w > window.innerWidth ? x - w - 12 : x + 16;
      tip.style.transform = `translate(${left}px, ${y + 14}px)`;
    } else tip.hidden = true;
    renderer.domElement.style.cursor = e ? 'pointer' : '';
  }

  function hideTooltip() {
    hoverPending = null;
    if (S.hover) setHover(null);
    $('#tooltip').hidden = true;
  }

  function setHover(name) {
    if (S.hover === name) return;
    S.hover = name;
    if (!name) $('#tooltip').hidden = true;
    applyHighlights();
  }

  // ════════════════════════════ Selección y ficha ════════════════════════════

  function select(sel, opts = {}) {
    if (!sel) {
      S.selection = null;
      if (S.isolate) { S.isolate = false; $('#toggle-isolate').checked = false; }
      $('#toggle-isolate').disabled = true;
      hideCard();
      refreshVisibility(); applyHighlights();
      return;
    }
    const list = entriesFor(sel.kind, sel.id, sel.sides);
    if (!list.length) return;
    S.selection = { kind: sel.kind, id: sel.id, sides: sel.sides, meshes: list.map((e) => e.name) };
    // Garantiza que la estructura elegida sea visible
    const e0 = list[0];
    let changed = false;
    if (!S.layers[e0.layer].visible) { S.layers[e0.layer].visible = true; changed = true; }
    if (S.layers[e0.layer].opacity < 0.3) { S.layers[e0.layer].opacity = 1; changed = true; }
    if (S.hidden.delete(keyOf(e0))) changed = true;
    if (e0.regions.length && !e0.regions.some((r) => S.regions.has(r))) { e0.regions.forEach((r) => S.regions.add(r)); changed = true; }
    if (changed) syncControls();
    $('#toggle-isolate').disabled = false;
    refreshVisibility(); applyHighlights();
    showCard(list);
    if (opts.frame) frameEntries(list);
    revealInTree(sel.kind, sel.id);
  }

  const ICONS = {
    origen: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>',
    insercion: '<svg viewBox="0 0 24 24"><path d="M5 12h12M13 7l5 5-5 5"/></svg>',
    inervacion: '<svg viewBox="0 0 24 24"><path d="M13 3 6 13h5l-1 8 7-10h-5l1-8Z"/></svg>',
    irrigacion: '<svg viewBox="0 0 24 24"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"/></svg>',
    funcion: '<svg viewBox="0 0 24 24"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>',
    forma: '<svg viewBox="0 0 24 24"><path d="M12 3 20 8v8l-8 5-8-5V8l8-5Z"/></svg>',
    desc: '<svg viewBox="0 0 24 24"><path d="M5 5h14M5 10h14M5 15h9"/></svg>',
    ins: '<svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h5"/><circle cx="4.5" cy="7" r=".6"/><circle cx="4.5" cy="12" r=".6"/><circle cx="4.5" cy="17" r=".6"/></svg>',
  };

  function showCard(list) {
    const e = list[0];
    const sides = list.map((x) => x.side).filter(Boolean);
    const sideTxt = sides.length === 2 ? 'Ambos lados' : sides.length === 1 ? (sides[0] === 'R' ? 'Lado derecho' : 'Lado izquierdo') : '';
    $('#card-swatch').style.background = `#${e.baseColor.getHexString()}`;
    const chips = [];
    if (sideTxt) chips.push(`<span class="side">${sideTxt}</span>`);
    const field = (key, title, text) => `<dt>${ICONS[key]}${title}</dt><dd>${esc(text)}</dd>`;
    let body = '';
    if (e.kind === 'muscle') {
      const m = e.data, g = groupById.get(m.grupo);
      $('#card-title').textContent = m.nombre;
      $('#card-latin').textContent = m.latin;
      chips.push(`<span>Capa ${esc(layerById.get(g.capa).nombre.toLowerCase())}</span>`, `<span>${esc(g.nombre)}</span>`);
      if (m.subgrupo && m.subgrupo !== m.nombre) chips.push(`<span>${esc(m.subgrupo)}</span>`);
      chips.push(`<span>${m.regiones.map((r) => D.regiones.find((x) => x.id === r).nombre).join(' · ')}</span>`);
      body = `<dl>
        ${field('forma', 'Forma', m.forma)}
        ${field('origen', 'Origen', m.origen)}
        ${field('insercion', 'Inserción', m.insercion)}
        ${field('inervacion', 'Inervación', m.inervacion)}
        ${field('irrigacion', 'Irrigación', m.irrigacion)}
        ${field('funcion', 'Función', m.funcion)}
      </dl>
      <div class="clinical"><h4>Nota clínica</h4><p>${esc(m.clinica)}</p></div>
      ${m.procedural ? '<p class="card-note">Geometría generada por código a partir de los puntos óseos del modelo (no existe en BodyParts3D).</p>' : ''}`;
    } else {
      const it = e.data, info = D.infoHueso[it.info] || {};
      $('#card-title').textContent = it.nombre;
      $('#card-latin').textContent = info.nombre && info.nombre !== it.nombre ? info.nombre : 'Hueso';
      if (it.info === 'disco') $('#card-latin').textContent = 'Fibrocartílago';
      if (it.info === 'cartilago') $('#card-latin').textContent = 'Cartílago hialino';
      const g = boneItemById.get(it.id).group;
      chips.push(`<span>${esc(g.nombre)}</span>`);
      if (it.tipo) chips.push(`<span>Costilla ${it.tipo}</span>`);
      body = `<dl>
        ${field('desc', 'Descripción', info.descripcion || '')}
        ${field('ins', 'Inserciones musculares', info.inserciones || '')}
      </dl>
      ${info.clinica ? `<div class="clinical"><h4>Nota clínica</h4><p>${esc(info.clinica)}</p></div>` : ''}
      ${it.id === 'coccix' ? '<p class="card-note">Geometría generada por código a partir del vértice del sacro.</p>' : ''}`;
    }
    $('#card-chips').innerHTML = chips.join('');
    $('#card-body').innerHTML = body;
    $('#card-body').scrollTop = 0;
    $('#card-isolate').textContent = S.isolate ? 'Ver todo' : 'Aislar';
    $('#card-isolate').classList.toggle('on', S.isolate);
    $('#card').hidden = false;
  }

  function hideCard() { $('#card').hidden = true; }

  function setIsolate(on) {
    S.isolate = on && !!S.selection;
    $('#toggle-isolate').checked = S.isolate;
    $('#card-isolate').textContent = S.isolate ? 'Ver todo' : 'Aislar';
    $('#card-isolate').classList.toggle('on', S.isolate);
    refreshVisibility();
    if (S.isolate) frameEntries(S.selection.meshes.map((n) => entries.get(n)), { pad: 1.6 });
  }

  // ════════════════════════════ Interfaz ════════════════════════════

  function buildUI() {
    buildLayers();
    buildRegions();
    buildTree();
    bindSearch();

    const ex = $('#explode');
    ex.addEventListener('input', () => {
      S.explode = ex.value / 100;
      $('#explode-val').textContent = `${ex.value} %`;
      fillRange(ex);
      applyExplode();
    });
    fillRange(ex);

    $('#toggle-labels').addEventListener('change', (ev) => { S.labels = ev.target.checked; S.labelsDirty = true; S.dirty = true; if (!S.labels) clearLabels(); });
    $('#toggle-isolate').addEventListener('change', (ev) => setIsolate(ev.target.checked));
    $('#btn-quiz').addEventListener('click', () => { closeDrawers(); startQuiz(); });
    $('#btn-reset').addEventListener('click', resetAll);

    document.querySelectorAll('.views button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

    $('#card-close').addEventListener('click', () => select(null));
    $('#card-isolate').addEventListener('click', () => setIsolate(!S.isolate));
    $('#card-focus').addEventListener('click', () => S.selection && frameEntries(S.selection.meshes.map((n) => entries.get(n))));
    $('#card-hide').addEventListener('click', () => {
      if (!S.selection) return;
      S.hidden.add(`${S.selection.kind}:${S.selection.id}`);
      select(null);
    });

    $('#quiz-exit').addEventListener('click', exitQuiz);
    $('#quiz-next').addEventListener('click', nextQuestion);

    // Cajones en pantallas pequeñas
    $('#btn-left').addEventListener('click', () => toggleDrawer('panel-left'));
    $('#btn-right').addEventListener('click', () => toggleDrawer('panel-right'));
    document.querySelectorAll('.close-drawer').forEach((b) => b.addEventListener('click', closeDrawers));
    $('#scrim').addEventListener('click', closeDrawers);

    $('#tree-expand').addEventListener('click', () => document.querySelectorAll('#tree details').forEach((d) => { d.open = true; }));
    $('#tree-collapse').addEventListener('click', () => document.querySelectorAll('#tree details:not(.t-root)').forEach((d) => { d.open = false; }));

    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      if (document.activeElement === $('#search')) return;
      if (document.querySelector('.panel.open')) closeDrawers();
      else if (S.quiz) exitQuiz();
      else select(null);
    });
  }

  function fillRange(input) {
    input.style.setProperty('--fill', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
  }

  function toggleDrawer(id) {
    const p = document.getElementById(id);
    const open = !p.classList.contains('open');
    closeDrawers();
    if (open) {
      p.classList.add('open');
      $('#scrim').hidden = false;
      document.querySelector(`[aria-controls="${id}"]`).setAttribute('aria-expanded', 'true');
    }
  }

  function closeDrawers() {
    document.querySelectorAll('.panel.open').forEach((p) => p.classList.remove('open'));
    document.querySelectorAll('.drawer-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    $('#scrim').hidden = true;
  }

  const isNarrow = () => window.innerWidth < 1024;

  function buildLayers() {
    const wrap = $('#layers');
    wrap.innerHTML = '';
    for (const c of D.capas) {
      const count = c.id === 'hueso'
        ? `${D.gruposHueso.reduce((n, g) => n + g.items.length, 0)} piezas`
        : `${D.musculos.filter((m) => groupById.get(m.grupo).capa === c.id).length} músculos`;
      const row = el('div', 'layer');
      row.dataset.layer = c.id;
      row.innerHTML = `
        <label class="layer-top">
          <span class="layer-swatch" style="background:${c.color}"></span>
          <span class="layer-name">${esc(c.nombre)}</span>
          <span class="layer-count">${count}</span>
          <input type="checkbox" class="switch" checked aria-label="Mostrar capa ${esc(c.nombre.toLowerCase())}">
        </label>
        <div class="layer-op">
          <span>Opacidad</span>
          <input type="range" min="0" max="100" value="100" aria-label="Opacidad de la capa ${esc(c.nombre.toLowerCase())}">
          <output>100 %</output>
        </div>`;
      const chk = row.querySelector('.switch');
      const rng = row.querySelector('input[type=range]');
      chk.addEventListener('change', () => { S.layers[c.id].visible = chk.checked; row.classList.toggle('off', !chk.checked); refreshVisibility(); });
      rng.addEventListener('input', () => {
        S.layers[c.id].opacity = rng.value / 100;
        row.querySelector('output').textContent = `${rng.value} %`;
        fillRange(rng);
        refreshVisibility();
      });
      fillRange(rng);
      wrap.appendChild(row);
    }
  }

  function buildRegions() {
    const wrap = $('#regions');
    wrap.innerHTML = '';
    for (const r of D.regiones) {
      const b = el('button', 'chip', esc(r.nombre));
      b.setAttribute('aria-pressed', 'true');
      b.dataset.region = r.id;
      b.addEventListener('click', () => {
        if (S.regions.has(r.id)) {
          if (S.regions.size === 1) { toast('Debe quedar al menos una región activa'); return; }
          S.regions.delete(r.id);
        } else S.regions.add(r.id);
        syncControls();
        refreshVisibility();
      });
      wrap.appendChild(b);
    }
  }

  // Refleja el estado en los controles (tras restablecer o seleccionar desde el buscador).
  function syncControls() {
    document.querySelectorAll('.layer').forEach((row) => {
      const st = S.layers[row.dataset.layer];
      row.querySelector('.switch').checked = st.visible;
      row.classList.toggle('off', !st.visible);
      const rng = row.querySelector('input[type=range]');
      rng.value = Math.round(st.opacity * 100);
      row.querySelector('output').textContent = `${rng.value} %`;
      fillRange(rng);
    });
    document.querySelectorAll('#regions .chip').forEach((b) => b.setAttribute('aria-pressed', String(S.regions.has(b.dataset.region))));
    const ex = $('#explode');
    ex.value = Math.round(S.explode * 100);
    $('#explode-val').textContent = `${ex.value} %`;
    fillRange(ex);
    $('#toggle-labels').checked = S.labels;
    $('#toggle-isolate').checked = S.isolate;
  }

  function resetAll() {
    if (S.quiz) exitQuiz();
    Object.assign(S, defaults());
    S.hidden.clear();
    select(null);
    syncControls();
    applyExplode();
    clearLabels();
    refreshVisibility();
    setView('posterior');
  }

  // ─── Árbol de estructuras ───

  const EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6A17 17 0 0 0 2 12s3.6 6 10 6c1.6 0 3-.3 4.3-.9"/></svg>';

  function details(cls, summaryHtml, open) {
    const d = el('details', cls);
    d.open = !!open;
    const s = el('summary', null, summaryHtml);
    const kids = el('div', 't-kids');
    d.append(s, kids);
    return { d, kids };
  }

  function leaf(kind, id, name, color, bilateral) {
    const row = el('div', 'leaf');
    row.dataset.kind = kind; row.dataset.id = id;
    row.innerHTML = `<button class="leaf-name" title="${esc(name)}"><span class="sw" style="background:${color}"></span>${esc(name)}</button>
      ${bilateral ? '<button class="side-btn" data-side="R" title="Lado derecho" aria-label="Lado derecho">D</button><button class="side-btn" data-side="L" title="Lado izquierdo" aria-label="Lado izquierdo">I</button>' : ''}
      <button class="eye-btn" aria-label="Ocultar ${esc(name)}" title="Mostrar u ocultar">${EYE}</button>`;
    return row;
  }

  function buildTree() {
    const tree = $('#tree');
    tree.innerHTML = '';
    const colors = muscleColors();
    const mRoot = details('t-root', `Músculos <span class="t-count">${D.musculos.length} × 2</span>`, true);
    for (const capa of D.capas.filter((c) => c.id !== 'hueso')) {
      const ms = D.musculos.filter((m) => groupById.get(m.grupo).capa === capa.id);
      const L = details('t-layer', `<span class="sw" style="background:${capa.color}"></span>Capa ${esc(capa.nombre.toLowerCase())}<span class="t-count">${ms.length}</span>`, capa.id !== 'profunda');
      for (const g of D.grupos.filter((x) => x.capa === capa.id)) {
        const gm = D.musculos.filter((m) => m.grupo === g.id);
        const mk = (m) => leaf('muscle', m.id, m.corto || m.nombre, `#${colors[m.id].getHexString()}`, true);
        if (gm.length === 1) { L.kids.appendChild(mk(gm[0])); continue; }
        const G = details('t-group', `${esc(g.nombre)}<span class="t-count">${gm.length}</span>`, capa.id !== 'profunda');
        const subs = [...new Set(gm.map((m) => m.subgrupo).filter(Boolean))];
        if (subs.length) {
          for (const sub of subs) {
            const sm = gm.filter((m) => m.subgrupo === sub);
            if (sm.length === 1) { G.kids.appendChild(mk(sm[0])); continue; }
            const Sb = details('t-sub', `${esc(sub)}<span class="t-count">${sm.length}</span>`, false);
            sm.forEach((m) => Sb.kids.appendChild(mk(m)));
            G.kids.appendChild(Sb.d);
          }
        } else gm.forEach((m) => G.kids.appendChild(mk(m)));
        L.kids.appendChild(G.d);
      }
      mRoot.kids.appendChild(L.d);
    }
    tree.appendChild(mRoot.d);

    const nBones = D.gruposHueso.reduce((n, g) => n + g.items.length, 0);
    const bRoot = details('t-root', `Huesos y cartílagos <span class="t-count">${nBones}</span>`, true);
    for (const g of D.gruposHueso) {
      const G = details('t-group', `${esc(g.nombre)}<span class="t-count">${g.items.length}</span>`, false);
      g.items.forEach((it) => {
        const c = it.info === 'disco' ? '#a9c6cf' : it.info === 'cartilago' ? '#c9d9d3' : '#e4d9c3';
        G.kids.appendChild(leaf('bone', it.id, it.nombre, c, !!it.lados));
      });
      bRoot.kids.appendChild(G.d);
    }
    tree.appendChild(bRoot.d);

    tree.addEventListener('click', (ev) => {
      const row = ev.target.closest('.leaf');
      if (!row) return;
      const { kind, id } = row.dataset;
      if (ev.target.closest('.eye-btn')) {
        const k = `${kind}:${id}`;
        if (S.hidden.has(k)) S.hidden.delete(k); else S.hidden.add(k);
        if (S.selection && S.selection.id === id && S.hidden.has(k)) select(null);
        refreshVisibility();
        return;
      }
      if (S.quiz) return;
      const sideBtn = ev.target.closest('.side-btn');
      select({ kind, id, sides: sideBtn ? [sideBtn.dataset.side] : null }, { frame: true });
      if (isNarrow()) closeDrawers();
    });
  }

  function updateTreeState() {
    document.querySelectorAll('#tree .leaf').forEach((row) => {
      const { kind, id } = row.dataset;
      const sel = S.selection && S.selection.kind === kind && S.selection.id === id;
      row.classList.toggle('selected', !!sel);
      row.querySelectorAll('.side-btn').forEach((b) => {
        b.classList.toggle('on', !!sel && (!S.selection.sides || S.selection.sides.includes(b.dataset.side)));
      });
      const hidden = S.hidden.has(`${kind}:${id}`);
      row.classList.toggle('hidden-item', hidden);
      const eye = row.querySelector('.eye-btn');
      if (eye.dataset.state !== String(hidden)) { eye.innerHTML = hidden ? EYE_OFF : EYE; eye.dataset.state = String(hidden); }
      let regs;
      if (kind === 'muscle') regs = muscleById.get(id).regiones;
      else { const r = boneRegion(id); regs = r ? [r] : []; }
      row.classList.toggle('filtered', regs.length > 0 && !regs.some((r) => S.regions.has(r)));
    });
  }

  function revealInTree(kind, id) {
    const row = document.querySelector(`#tree .leaf[data-kind="${kind}"][data-id="${id}"]`);
    if (!row) return;
    let p = row.parentElement;
    while (p && p.id !== 'tree') { if (p.tagName === 'DETAILS') p.open = true; p = p.parentElement; }
    if (!isNarrow()) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ─── Buscador con autocompletado ───

  let searchIndex = [];

  function bindSearch() {
    const colors = muscleColors();
    searchIndex = D.musculos.map((m) => ({
      kind: 'muscle', id: m.id, label: m.nombre,
      sub: `${m.latin} · ${groupById.get(m.grupo).nombre}`,
      color: `#${colors[m.id].getHexString()}`, bilateral: true,
      hay: norm(`${m.nombre} ${m.latin} ${groupById.get(m.grupo).nombre} ${m.subgrupo || ''}`),
    }));
    for (const g of D.gruposHueso) {
      for (const it of g.items) {
        searchIndex.push({
          kind: 'bone', id: it.id, label: it.nombre, sub: g.nombre, bilateral: !!it.lados,
          color: it.info === 'disco' ? '#a9c6cf' : '#e4d9c3',
          hay: norm(`${it.nombre} ${g.nombre} ${it.id} ${it.info === 'disco' ? 'disco intervertebral' : 'hueso'}`),
        });
      }
    }
    const input = $('#search'), list = $('#search-results');
    let results = [], active = -1;

    const render = () => {
      list.innerHTML = '';
      if (!results.length) {
        list.innerHTML = '<li class="empty">Sin resultados</li>';
      } else {
        results.forEach((r, i) => {
          const li = el('li');
          li.setAttribute('role', 'option');
          li.setAttribute('aria-selected', String(i === active));
          li.innerHTML = `<span class="dot" style="background:${r.color}"></span><span><span class="r-main">${highlight(r.label, input.value)}${r.side ? ` <small>(${SIDE_TXT[r.side]})</small>` : ''}</span><span class="r-sub">${esc(r.sub)}</span></span>`;
          li.addEventListener('mousedown', (ev) => { ev.preventDefault(); choose(i); });
          list.appendChild(li);
        });
      }
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
    const choose = (i) => {
      const r = results[i];
      if (!r) return;
      close();
      input.value = r.label;
      input.blur();
      if (S.quiz) exitQuiz();
      select({ kind: r.kind, id: r.id, sides: r.side ? [r.side] : null }, { frame: true });
    };
    input.addEventListener('input', () => {
      let q = norm(input.value.trim());
      if (!q) { close(); return; }
      let side = null;
      if (/\bderech/.test(q)) side = 'R';
      if (/\bizquierd/.test(q)) side = 'L';
      q = q.replace(/\b(derech\w*|izquierd\w*|lado)\b/g, ' ').trim();
      const toks = q.split(/\s+/).filter(Boolean);
      results = searchIndex
        .map((r) => {
          if (!toks.every((t) => r.hay.includes(t))) return null;
          const lbl = norm(r.label);
          const words = lbl.split(/[^a-z0-9ñ]+/).filter(Boolean);
          let score = 0;
          if (norm(r.id) === q.replace(/\s+/g, '')) score += 8;
          if (lbl.startsWith(toks[0] || '')) score += 3;
          if (toks.every((t) => words.some((w) => w.startsWith(t)))) score += 2;
          if (toks.some((t) => words.includes(t))) score += 2;
          if (r.kind === 'muscle') score += 1;
          return { ...r, side: side && r.bilateral ? side : null, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 9);
      active = results.length ? 0 : -1;
      render();
    });
    input.addEventListener('keydown', (ev) => {
      if (list.hidden) return;
      if (ev.key === 'ArrowDown') { active = Math.min(results.length - 1, active + 1); render(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { active = Math.max(0, active - 1); render(); ev.preventDefault(); }
      else if (ev.key === 'Enter') { choose(active); ev.preventDefault(); }
      else if (ev.key === 'Escape') { close(); input.blur(); }
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('focus', () => { if (input.value.trim()) input.dispatchEvent(new Event('input')); });
  }

  function highlight(label, q) {
    const toks = norm(q).replace(/\b(derech\w*|izquierd\w*|lado)\b/g, ' ').split(/\s+/).filter(Boolean);
    const n = norm(label);
    const marks = new Array(label.length).fill(false);
    for (const t of toks) {
      let i = n.indexOf(t);
      while (i >= 0) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = n.indexOf(t, i + t.length); }
    }
    let out = '', open = false;
    for (let i = 0; i < label.length; i++) {
      if (marks[i] && !open) { out += '<mark>'; open = true; }
      if (!marks[i] && open) { out += '</mark>'; open = false; }
      out += esc(label[i]);
    }
    return open ? `${out}</mark>` : out;
  }

  // ════════════════════════════ Etiquetas 3D con líneas guía ════════════════════════════

  // Rendimiento: la oclusión (¿la etiqueta apunta a algo tapado?) se calcula con rayos acelerados por BVH
  // y solo cuando la cámara se detiene; mientras se mueve, únicamente se reproyectan las posiciones.
  const labelPool = new Map(); // id → { el, line, dot, w, tf }
  const occluded = new Map(); // nombre de malla → bool
  let occlusionPending = true, lastMove = 0;
  let _a, _c, _d, _p; // vectores reutilizados (se crean en initScene, cuando THREE ya existe)

  function clearLabels() {
    labelPool.forEach((l) => { l.el.remove(); l.line.remove(); l.dot.remove(); });
    labelPool.clear();
    occluded.clear();
    occlusionPending = true;
  }

  function anchorFor(e, out) {
    _c.copy(e.mesh.geometry.boundingSphere.center).add(e.mesh.position);
    _d.copy(camera.position).sub(_c).normalize();
    let best = e.anchors[0], bd = -Infinity;
    for (const a of e.anchors) { const d = a.dir.dot(_d); if (d > bd) { bd = d; best = a; } }
    return out.copy(best.p).add(e.mesh.position);
  }

  function labelCandidates() {
    const out = [];
    for (const m of D.musculos) {
      for (const s of ['R', 'L']) {
        const e = entries.get(`${m.id}_${s}`);
        if (e && e.mesh.visible && e.mesh.material.opacity > 0.3) out.push(e);
      }
    }
    return out;
  }

  function recomputeOcclusion() {
    raycaster.firstHitOnly = true;
    for (const e of labelCandidates()) {
      anchorFor(e, _a);
      _d.copy(_a).sub(camera.position);
      const dist = _d.length();
      raycaster.set(camera.position, _d.normalize());
      raycaster.far = dist + 0.05;
      const hit = raycaster.intersectObjects(pickables, false)[0];
      occluded.set(e.name, !!hit && hit.object !== e.mesh && hit.distance < dist - 0.04 && hit.object.material.opacity > 0.5);
    }
    raycaster.firstHitOnly = false;
    raycaster.far = Infinity;
    occlusionPending = false;
    S.labelsDirty = true;
  }

  function updateLabels(moving) {
    if (!S.labels || S.quiz) { if (labelPool.size) clearLabels(); return; }
    const a = viewArea();
    const svg = $('#label-lines'), box = $('#labels');
    box.classList.toggle('moving', !!moving);
    svg.classList.toggle('moving', !!moving);
    const byId = new Map();
    for (const e of labelCandidates()) {
      if (occluded.get(e.name) !== false) continue;
      anchorFor(e, _p);
      const d = _p.distanceTo(camera.position);
      const prev = byId.get(e.id);
      if (!prev || d < prev.d) byId.set(e.id, { e, x: _p.x, y: _p.y, z: _p.z, d });
    }
    const cands = [];
    for (const [id, c] of byId) {
      _p.set(c.x, c.y, c.z).project(camera);
      if (_p.z > 1 || Math.abs(_p.x) > 1.05 || Math.abs(_p.y) > 1.05) continue;
      const sx = (_p.x * 0.5 + 0.5) * a.W, sy = (-_p.y * 0.5 + 0.5) * a.H;
      if (sx < a.left || sx > a.right || sy < a.top || sy > a.bottom) continue;
      cands.push({ id, e: c.e, sx, sy });
    }
    const seen = new Set(cands.map((c) => c.id));
    for (const [id, l] of labelPool) if (!seen.has(id)) { l.el.remove(); l.line.remove(); l.dot.remove(); labelPool.delete(id); }
    if (!cands.length) return;

    // 1) crear las que faltan  2) medir en lote (un solo cálculo de diseño)  3) escribir posiciones
    const fresh = [];
    for (const c of cands) {
      if (labelPool.has(c.id)) continue;
      const lab = el('div', 'label', esc(c.e.label));
      lab.style.setProperty('--c', `#${c.e.baseColor.getHexString()}`);
      lab.addEventListener('click', () => select({ kind: 'muscle', id: c.id, sides: null }, { frame: true }));
      box.appendChild(lab);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '2.6');
      svg.append(line, dot);
      const l = { el: lab, line, dot, w: 0, tf: '' };
      labelPool.set(c.id, l);
      fresh.push(l);
    }
    for (const l of fresh) l.w = l.el.offsetWidth;

    let midX = 0;
    for (const c of cands) midX += c.sx;
    midX /= cands.length;
    const narrow = a.W < 760;
    const gap = narrow ? 17 : 22;
    for (const side of ['L', 'R']) {
      const col = cands.filter((c) => (side === 'L' ? c.sx < midX : c.sx >= midX)).sort((p, q) => p.sy - q.sy);
      if (!col.length) continue;
      let maxW = 0, minX = Infinity, maxX = -Infinity;
      for (const c of col) { c.l = labelPool.get(c.id); maxW = Math.max(maxW, c.l.w); minX = Math.min(minX, c.sx); maxX = Math.max(maxX, c.sx); }
      const x = side === 'L'
        ? Math.max(a.left + 6 + maxW, minX - (narrow ? 24 : 48))
        : Math.min(a.right - 6 - maxW, maxX + (narrow ? 24 : 48));
      const ys = col.map((c) => c.sy);
      for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
      const bottom = a.bottom - 10;
      if (ys[ys.length - 1] > bottom) {
        ys[ys.length - 1] = bottom;
        for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - gap);
      }
      col.forEach((c, i) => {
        const l = c.l;
        const y = Math.max(a.top + 10, ys[i]);
        const lx = side === 'L' ? x - l.w : x;
        const tf = `translate(${lx.toFixed(0)}px, ${(y - 10).toFixed(0)}px)`;
        if (tf !== l.tf) { l.el.style.transform = tf; l.tf = tf; }
        if (l.side !== side) { l.el.classList.toggle('right', side === 'R'); l.side = side; }
        const ex = side === 'L' ? x + 2 : x - 2, elbow = side === 'L' ? x + 14 : x - 14;
        l.line.setAttribute('points', `${c.sx.toFixed(1)},${c.sy.toFixed(1)} ${elbow.toFixed(1)},${y.toFixed(1)} ${ex.toFixed(1)},${y.toFixed(1)}`);
        l.dot.setAttribute('cx', c.sx.toFixed(1));
        l.dot.setAttribute('cy', c.sy.toFixed(1));
      });
    }
  }

  // Árbol de volúmenes (BVH) de cada malla, construido en segundo plano tras la carga:
  // acelera los rayos de las etiquetas y del resaltado al pasar el cursor.
  function buildBVHInBackground(queue) {
    const step = (deadline) => {
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < 10) {
        const g = queue.shift();
        if (!g.boundsTree) g.computeBoundsTree();
      }
      if (queue.length) schedule(step);
      else occlusionPending = true;
    };
    const schedule = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 200 }) : setTimeout(fn, 16));
    schedule(step);
  }

  // ════════════════════════════ Quiz ════════════════════════════

  function startQuiz() {
    if (S.isolate) setIsolate(false);
    select(null);
    S.quiz = { score: 0, total: 0, streak: 0, best: 0, last: null };
    $('#quiz').hidden = false;
    $('#btn-quiz').disabled = true;
    clearLabels();
    nextQuestion();
  }

  function nextQuestion() {
    const q = S.quiz;
    if (!q) return;
    const pool = D.musculos.filter((m) => m.regiones.some((r) => S.regions.has(r)) && !S.hidden.has(`muscle:${m.id}`));
    const cands = pool.filter((m) => m.id !== q.last);
    const m = cands[Math.floor(Math.random() * cands.length)] || pool[0];
    const side = Math.random() < 0.5 ? 'R' : 'L';
    q.last = m.id;
    q.target = { id: m.id, side, meshes: [`${m.id}_${side}`] };
    q.answered = false;
    // distractores: preferentemente de la misma capa
    const capa = groupById.get(m.grupo).capa;
    const shuffle = (arr) => arr.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const same = shuffle(D.musculos.filter((x) => x.id !== m.id && groupById.get(x.grupo).capa === capa));
    const other = shuffle(D.musculos.filter((x) => x.id !== m.id && groupById.get(x.grupo).capa !== capa));
    const opts = shuffle([m, ...same.slice(0, 2), ...other].slice(0, 4));
    const wrap = $('#quiz-options');
    wrap.innerHTML = '';
    opts.forEach((o) => {
      const b = el('button', null, esc(o.nombre));
      b.dataset.id = o.id;
      b.addEventListener('click', () => answer(o.id));
      wrap.appendChild(b);
    });
    $('#quiz-question').textContent = '¿Qué músculo está resaltado?';
    $('#quiz-feedback').textContent = `Pista: ${SIDE_TXT[side]} · capa ${layerById.get(capa).nombre.toLowerCase()}`;
    $('#quiz-feedback').className = 'quiz-feedback';
    $('#quiz-next').disabled = true;
    refreshVisibility();
    const target = entries.get(q.target.meshes[0]);
    const dirs = { R: [0.55, 0.12, 1], L: [-0.55, 0.12, 1] };
    let dir = new THREE.Vector3(...dirs[side]).normalize();
    if (m.id === 'cuad_lumb' || m.id === 'intert_cer') dir = new THREE.Vector3(side === 'R' ? 1 : -1, 0.1, 0.35).normalize();
    const size = target.mesh.geometry.boundingSphere.radius;
    frameEntries([target], { dir, pad: size < 0.6 ? 1.9 : 1.25, minDist: 4 });
  }

  function answer(id) {
    const q = S.quiz;
    if (!q || q.answered) return;
    q.answered = true;
    q.total++;
    const m = muscleById.get(q.target.id);
    const ok = id === m.id;
    if (ok) { q.score++; q.streak++; q.best = Math.max(q.best, q.streak); } else q.streak = 0;
    document.querySelectorAll('#quiz-options button').forEach((b) => {
      b.disabled = true;
      if (b.dataset.id === m.id) b.classList.add('correct');
      else if (b.dataset.id === id) b.classList.add('wrong');
    });
    const fb = $('#quiz-feedback');
    const fn = m.funcion.split('. ')[0].replace(/\.$/, '');
    fb.innerHTML = ok
      ? `<strong>¡Correcto!</strong> ${esc(m.nombre)} (${SIDE_TXT[q.target.side]}). ${esc(fn)}.`
      : `<strong>Incorrecto.</strong> Era: ${esc(m.nombre)} (${SIDE_TXT[q.target.side]}). ${esc(fn)}.`;
    fb.className = `quiz-feedback ${ok ? 'ok' : 'bad'}`;
    $('#quiz-score').textContent = `${q.score}/${q.total}`;
    $('#quiz-streak').textContent = q.streak > 1 ? `Racha: ${q.streak}` : q.best > 1 ? `Mejor racha: ${q.best}` : '';
    $('#quiz-next').disabled = false;
    $('#quiz-next').focus({ preventScroll: true });
  }

  function exitQuiz() {
    if (!S.quiz) return;
    const target = S.quiz.target;
    S.quiz = null;
    $('#quiz').hidden = true;
    $('#btn-quiz').disabled = false;
    refreshVisibility();
    applyHighlights();
    if (target) S.labelsDirty = true;
  }

  // ════════════════════════════ Avisos ════════════════════════════

  let toastTimer = null;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = el('div', 'toast'); t.setAttribute('role', 'status'); $('#app').appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // ════════════════════════════ Bucle de render ════════════════════════════

  function loop(now) {
    requestAnimationFrame(loop);
    if (S.tween) { stepTween(now); S.dirty = true; }
    const moved = controls.update();
    if (moved) { S.dirty = true; S.labelsDirty = true; }
    processHover();
    if (S.quiz && S.quiz.target) {
      const e = entries.get(S.quiz.target.meshes[0]);
      if (e) {
        setHighlight(e, QUIZ_COLOR, 0.9 + 0.6 * (0.5 + 0.5 * Math.sin(now / 260)));
        if (ghostMats[QUIZ_COLOR]) ghostMats[QUIZ_COLOR].uniforms.uAlpha.value = 0.7 + 0.5 * (0.5 + 0.5 * Math.sin(now / 260));
        S.dirty = true;
      }
    }
    if (S.labels && !S.quiz) {
      const moving = moved || !!S.tween;
      if (moving) { lastMove = now; occlusionPending = true; }
      if (occlusionPending && now - lastMove > 140) recomputeOcclusion();
      if (S.labelsDirty || moving || S.wasMoving) { updateLabels(moving); S.labelsDirty = false; }
      S.wasMoving = moving;
    }
    if (S.dirty) { renderer.render(scene, camera); S.dirty = false; }
  }

  // Gancho para pruebas automatizadas y depuración desde la consola.
  const debug = {
    get state() { return S; },
    entries,
    select, setView, frameEntries, camera: () => camera, controls: () => controls,
    bench(ms = 3000) {
      return new Promise((resolve) => {
        let frames = 0; const t0 = performance.now();
        const step = () => {
          controls.target.x += 0; camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.01);
          renderer.render(scene, camera); frames++;
          if (performance.now() - t0 < ms) requestAnimationFrame(step);
          else resolve({ fps: +(frames / ((performance.now() - t0) / 1000)).toFixed(1), triangles: renderer.info.render.triangles, calls: renderer.info.render.calls });
        };
        requestAnimationFrame(step);
      });
    },
  };

  return { start, debug };
})();
