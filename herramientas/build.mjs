// Convierte las mallas OBJ de BodyParts3D a un único GLB optimizado (meshopt + cuantización).
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, simplify, quantize, meshopt, dedup, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';

// Uso: node build.mjs [salida.glb] [ratio]   (requiere bp3d/ con los OBJ descomprimidos y manifest.json)
const HERE = path.dirname(new URL(import.meta.url).pathname);
const BP = path.join(HERE, 'bp3d');
const OUT = process.argv[2] || path.join(HERE, '..', 'models', 'anatomia.glb');
const RATIO = Number(process.argv[3] || 0.45);
const items = JSON.parse(fs.readFileSync(path.join(HERE, 'manifest.json'), 'utf8'));

function readObj(file) {
  let p = path.join(BP, 'isa_BP3D_4.0_obj_99', file + '.obj');
  if (!fs.existsSync(p)) p = path.join(BP, 'partof_BP3D_4.0_obj_99', file + '.obj');
  const v = [], f = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      // BodyParts3D: mm, Z arriba, +Y posterior, -X derecha  ->  Three.js: dm, Y arriba, +Z posterior, +X derecha
      v.push(-x * 0.01, z * 0.01, y * 0.01);
    } else if (line.startsWith('f ')) {
      const idx = line.trim().split(/\s+/).slice(1).map((t) => parseInt(t, 10) - 1);
      for (let i = 1; i + 1 < idx.length; i++) f.push(idx[0], idx[i], idx[i + 1]);
    }
  }
  return { v, f };
}

// Centro: caja de todas las vértebras
const parts = new Map();
let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (const it of items) {
  const meshes = it.files.map((f) => ({ file: f, ...readObj(f) }));
  parts.set(it.id, meshes);
  if (/^(C|T|L)\d+$/.test(it.id) || it.id === 'sacro') {
    for (const m of meshes) for (let i = 0; i < m.v.length; i += 3)
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], m.v[i + k]); max[k] = Math.max(max[k], m.v[i + k]); }
  }
}
const center = [0, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
console.log('centro', center.map((c) => c.toFixed(3)), 'altura columna', (max[1] - min[1]).toFixed(2));

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('anatomia');

function addMesh(name, v, f) {
  const pos = new Float32Array(v.length);
  for (let i = 0; i < v.length; i += 3) {
    pos[i] = v[i] - center[0]; pos[i + 1] = v[i + 1] - center[1]; pos[i + 2] = v[i + 2] - center[2];
  }
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(f)).setBuffer(buffer));
  const mesh = doc.createMesh(name).addPrimitive(prim);
  scene.addChild(doc.createNode(name).setMesh(mesh));
}

function merge(meshes) {
  const v = [], f = [];
  for (const m of meshes) { const o = v.length / 3; v.push(...m.v); for (const i of m.f) f.push(i + o); }
  return { v, f };
}

for (const it of items) {
  const meshes = parts.get(it.id);
  if (it.splitBySide) {
    const bySide = { R: [], L: [] };
    for (const m of meshes) {
      let sx = 0; for (let i = 0; i < m.v.length; i += 3) sx += m.v[i];
      bySide[sx > 0 ? 'R' : 'L'].push(m);
    }
    for (const s of ['R', 'L']) { const g = merge(bySide[s]); addMesh(`${it.id}_${s}`, g.v, g.f); }
  } else {
    const g = merge(meshes); addMesh(it.id, g.v, g.f);
  }
}

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
doc.createExtension(KHRMeshQuantization).setRequired(true);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });

let before = 0; for (const m of doc.getRoot().listMeshes()) before += m.listPrimitives()[0].getIndices().getCount() / 3;
await doc.transform(
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.0008, lockBorder: false }),
  dedup(), prune(),
  quantize({ quantizePosition: 14 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
let after = 0; for (const m of doc.getRoot().listMeshes()) after += m.listPrimitives()[0].getIndices().getCount() / 3;
console.log('triángulos', before, '->', after);

const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
doc.getRoot().getAsset().copyright = 'BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan';
await io.write(OUT, doc);
console.log(OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(2), 'MB');
