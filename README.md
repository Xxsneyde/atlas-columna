# Atlas 3D · Músculos de la columna vertebral

Atlas anatómico interactivo en 3D de los músculos de la columna vertebral, pensado como maqueta universitaria. Funciona en el navegador (computadora y celular) sin instalar nada.

## Cómo abrirlo

- **Doble clic en `index.html`.** Funciona directamente desde la carpeta. Solo necesita internet para descargar Three.js y la tipografía desde el CDN.
- **Con un servidor local (opcional):** `python3 -m http.server` dentro de la carpeta y abrir `http://localhost:8000`.

### Publicar en GitHub Pages

1. Crea un repositorio y sube el contenido de esta carpeta (con `index.html` en la raíz).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)` → **Save**.
3. En uno o dos minutos la app estará en `https://<tu-usuario>.github.io/<repositorio>/`.

## Funciones

| Función | Cómo se usa |
|---|---|
| Rotar, zoom y desplazar | Arrastrar · rueda o pellizcar · clic derecho o dos dedos |
| Vistas | Botones Posterior, Frontal, Lateral (cada clic alterna derecha/izquierda), Superior y Encuadrar |
| Resaltado y nombre | Pasar el cursor sobre una estructura |
| Ficha | Clic en una estructura: origen, inserción, inervación, irrigación, función y nota clínica |
| Capas | Interruptor y opacidad para las capas superficial, intermedia, profunda y hueso |
| Aislar | Muestra solo la selección junto al hueso (interruptor o botón en la ficha) |
| Explosión | Deslizador que separa las capas hacia atrás (se aprecia mejor en vista lateral) |
| Buscador | Autocompletado sin importar las tildes; acepta «derecho/izquierdo» (p. ej. «romboides mayor izquierdo») |
| Árbol | Todas las estructuras por capa y grupo; botones **D**/**I** para cada lado y ojo para ocultar |
| Región | Filtro cervical / torácica / lumbar |
| Etiquetas 3D | Rótulos con líneas guía; solo aparecen los de estructuras visibles (no ocultas por otras). La oclusión se calcula con rayos acelerados (three-mesh-bvh) solo cuando la cámara se detiene, para que rotar siga siendo fluido |
| Rayos X | La selección se ve como silueta aunque otra capa la cubra |
| Quiz | Resalta un músculo al azar (lado derecho o izquierdo) con 4 opciones, puntuación y racha |

## Contenido anatómico

Cada músculo está separado y es bilateral (mallas derecha e izquierda).

- **Esqueleto:** C1–C7, T1–T12, L1–L5, sacro y cóccix, con las curvaturas fisiológicas; discos intervertebrales, costillas, cartílagos costales, esternón, escápulas, clavículas, húmeros, coxales y base del cráneo (occipital y temporales).
- **Capa superficial:** trapecio (fibras descendentes, transversas y ascendentes), dorsal ancho, romboides mayor y menor, elevador de la escápula.
- **Capa intermedia:** serratos posteriores superior e inferior.
- **Capa profunda:** esplenios de la cabeza y del cuello; erector de la columna (iliocostal lumbar, torácico y cervical; longísimo torácico, cervical y de la cabeza; espinoso); transversoespinosos (semiespinoso torácico, cervical y de la cabeza; multífidos; rotadores cervicales, torácicos y lumbares); segmentarios (interespinosos, intertransversos, elevadores de las costillas); suboccipitales (recto posterior mayor y menor, oblicuo superior e inferior de la cabeza); cuadrado lumbar.

## Origen de la geometría

- **Modelos reales:** huesos y la mayoría de los músculos provienen de **BodyParts3D** (Database Center for Life Science, Japón). Se convirtieron a un único GLB optimizado (`models/anatomia.glb`, 1,7 MB, unos 460 000 triángulos).
- **Generados por código** (`js/anatomy.js`), porque BodyParts3D no los incluye. Se construyen al cargar la página, anclados a puntos óseos calculados sobre los modelos reales:
  - **Dorsal ancho:** lámina en abanico que se adapta a la superficie del tronco. Nace en las espinosas T7–L5, la fascia toracolumbar, la cresta ilíaca y las costillas 9–11, y se inserta en el surco intertubercular del húmero con la torsión de sus fibras. La aponeurosis se muestra más clara.
  - **Multífidos:** fascículos fusiformes que van de la apófisis mamilar, transversa o articular (y del sacro) a la espinosa situada 2–4 niveles por encima, desde el sacro hasta C2.
  - **Cuadrado lumbar:** lámina cuadrilátera entre la cresta ilíaca, las puntas de las transversas de L1–L4 y la 12.ª costilla.
  - **Cóccix:** cuatro segmentos que continúan la curvatura del sacro.

## Estructura de archivos

```
index.html            Página y carga de Three.js (importmap desde jsDelivr)
css/style.css         Diseño oscuro y adaptación a celular
js/data.js            Datos anatómicos en español (músculos y huesos)
js/anatomy.js         Carga del modelo, puntos óseos, geometría procedimental y materiales
js/main.js            Escena, cámara, capas, selección, ficha, buscador, árbol, etiquetas y quiz
models/anatomia.glb   Modelo 3D (se usa al servir por http/https, p. ej. GitHub Pages)
models/anatomia.glb.js  El mismo modelo en base64 (se usa al abrir index.html con doble clic)
herramientas/         Scripts para regenerar el modelo (no hacen falta para usar la app)
```

Los scripts locales se cargan como scripts clásicos y no como módulos: los navegadores bloquean los módulos ES desde `file://`, y así la app funciona con doble clic.

## Regenerar el modelo (opcional)

1. Descarga de <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html> los archivos `isa_BP3D_4.0_obj_99.zip`, `partof_BP3D_4.0_obj_99.zip`, `isa_element_parts.txt` y `partof_element_parts.txt`, y colócalos en `herramientas/bp3d/`. Descomprime ahí los dos `.zip`.
2. En `herramientas/`:
   ```
   npm install
   python3 manifest.py      # qué mallas forman cada estructura
   node build.mjs           # → ../models/anatomia.glb
   node glb-a-js.mjs        # → ../models/anatomia.glb.js
   ```

## Licencias

- **Modelos 3D** (`models/`): derivados de BodyParts3D, © The Database Center for Life Science, bajo licencia [Creative Commons Reconocimiento-CompartirIgual 2.1 Japón](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.es). Si redistribuyes los modelos, mantén la atribución y la misma licencia. La atribución ya aparece en el pie de la app.
- **Three.js** y **three-mesh-bvh:** licencia MIT.
- **Contenido anatómico:** elaborado con fines docentes a partir de la bibliografía anatómica estándar. Revísalo con tu docente antes de usarlo como referencia clínica.
