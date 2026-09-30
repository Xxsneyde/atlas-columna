// Empaqueta models/anatomia.glb como script (base64) para que la app funcione abriendo index.html sin servidor.
// Uso: node herramientas/glb-a-js.mjs
import fs from 'node:fs';
const glb = fs.readFileSync(new URL('../models/anatomia.glb', import.meta.url));
const out = `/* BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 JP. Generado por herramientas/glb-a-js.mjs */\nwindow.ANATOMIA_GLB_B64="${glb.toString('base64')}";\n`;
fs.writeFileSync(new URL('../models/anatomia.glb.js', import.meta.url), out);
console.log('models/anatomia.glb.js', (out.length / 1024 / 1024).toFixed(2), 'MB');
