/*
 * Atlas 3D de los músculos de la columna vertebral
 * Datos anatómicos de cada estructura (todo en español).
 *
 * Cada músculo existe en el modelo como dos mallas: "<id>_R" (derecho) y "<id>_L" (izquierdo).
 */
window.ATLAS_DATA = (function () {
  'use strict';

  const regiones = [
    { id: 'cervical', nombre: 'Cervical' },
    { id: 'toracica', nombre: 'Torácica' },
    { id: 'lumbar', nombre: 'Lumbar' },
  ];

  // Separación hacia atrás en el modo explosión (decímetros con el deslizador al máximo).
  const capas = [
    { id: 'superficial', nombre: 'Superficial', color: '#d0584a', explosion: 1.7 },
    { id: 'intermedia', nombre: 'Intermedia', color: '#e0973c', explosion: 1.25 },
    { id: 'profunda', nombre: 'Profunda', color: '#a8354f', explosion: 0.4 },
    { id: 'hueso', nombre: 'Hueso', color: '#e6dcc6', explosion: 0 },
  ];

  const grupos = [
    { id: 'trapecio', capa: 'superficial', nombre: 'Trapecio', color: '#d0584a' },
    { id: 'dorsal', capa: 'superficial', nombre: 'Dorsal ancho', color: '#c64c47' },
    { id: 'romboides', capa: 'superficial', nombre: 'Romboides', color: '#d86a52' },
    { id: 'elevador', capa: 'superficial', nombre: 'Elevador de la escápula', color: '#dc7458' },
    { id: 'serratos', capa: 'intermedia', nombre: 'Serratos posteriores', color: '#e0973c' },
    { id: 'esplenios', capa: 'profunda', nombre: 'Esplenios', color: '#b94a64', explosion: 1.0 },
    { id: 'erector', capa: 'profunda', nombre: 'Erector de la columna', color: '#a8354f', explosion: 0.72 },
    { id: 'transversoespinosos', capa: 'profunda', nombre: 'Transversoespinosos', color: '#93346a', explosion: 0.38 },
    { id: 'segmentarios', capa: 'profunda', nombre: 'Segmentarios', color: '#7c3a78', explosion: 0.14 },
    { id: 'suboccipitales', capa: 'profunda', nombre: 'Suboccipitales', color: '#9a3f7c', explosion: 0.16 },
    { id: 'cuadrado', capa: 'profunda', nombre: 'Cuadrado lumbar', color: '#8a3a52', explosion: 0.05 },
  ];

  const musculos = [
    // ───────────────────────────── CAPA SUPERFICIAL ─────────────────────────────
    {
      id: 'trap_desc', grupo: 'trapecio',
      nombre: 'Trapecio (fibras descendentes)', corto: 'Fibras descendentes', latin: 'M. trapezius, pars descendens',
      forma: 'Plano, triangular', regiones: ['cervical'],
      origen: 'Tercio medial de la línea nucal superior, protuberancia occipital externa y ligamento nucal (apófisis espinosas de C1–C6).',
      insercion: 'Tercio lateral del borde posterior de la clavícula.',
      inervacion: 'Nervio accesorio (XI par craneal, raíz espinal): motor. Ramos de C3–C4 (plexo cervical): propioceptivos.',
      irrigacion: 'Rama superficial de la arteria cervical transversa y ramas de la arteria occipital.',
      funcion: 'Eleva la escápula y el hombro, y rota la cavidad glenoidea hacia arriba junto con el serrato anterior. Con la escápula fija, extiende el cuello e inclina la cabeza hacia el mismo lado, con rotación hacia el lado contrario.',
      clinica: 'La lesión del nervio accesorio (p. ej., en la disección ganglionar del triángulo posterior del cuello) produce hombro caído y dificultad para elevar el brazo por encima de la horizontal. Es asiento frecuente de puntos gatillo que causan cefalea tensional.',
    },
    {
      id: 'trap_trans', grupo: 'trapecio',
      nombre: 'Trapecio (fibras transversas)', corto: 'Fibras transversas', latin: 'M. trapezius, pars transversa',
      forma: 'Plano, cuadrilátero', regiones: ['cervical', 'toracica'],
      origen: 'Apófisis espinosas y ligamentos supraespinosos de C7 a T3.',
      insercion: 'Borde medial del acromion y labio superior de la espina de la escápula.',
      inervacion: 'Nervio accesorio (XI par craneal). Ramos propioceptivos de C3–C4.',
      irrigacion: 'Arteria cervical transversa (rama superficial) y ramas dorsales de las arterias intercostales posteriores superiores.',
      funcion: 'Retrae (aduce) la escápula hacia la línea media y la estabiliza durante los movimientos del brazo.',
      clinica: 'Su debilidad deja la escápula en protracción y favorece la postura de hombros adelantados (síndrome cruzado superior). Se explora con la retracción escapular contra resistencia.',
    },
    {
      id: 'trap_asc', grupo: 'trapecio',
      nombre: 'Trapecio (fibras ascendentes)', corto: 'Fibras ascendentes', latin: 'M. trapezius, pars ascendens',
      forma: 'Plano, triangular', regiones: ['toracica'],
      origen: 'Apófisis espinosas y ligamentos supraespinosos de T4 a T12.',
      insercion: 'Tubérculo del trapecio, en el extremo medial de la espina de la escápula.',
      inervacion: 'Nervio accesorio (XI par craneal). Ramos propioceptivos de C3–C4.',
      irrigacion: 'Ramas dorsales de las arterias intercostales posteriores y arteria dorsal de la escápula.',
      funcion: 'Deprime la escápula y colabora en su rotación superior, esencial para elevar el brazo por encima de la cabeza.',
      clinica: 'Su debilidad altera el ritmo escapulohumeral y se asocia al síndrome de pinzamiento subacromial. Se fortalece con el ejercicio en «Y» en decúbito prono.',
    },
    {
      id: 'dorsal', grupo: 'dorsal', procedural: true,
      nombre: 'Dorsal ancho', latin: 'M. latissimus dorsi',
      forma: 'Plano, en abanico', regiones: ['toracica', 'lumbar'],
      origen: 'Apófisis espinosas de T7–T12 y, mediante la fascia toracolumbar, de las vértebras lumbares y el sacro; tercio posterior de la cresta ilíaca; tres o cuatro últimas costillas; a menudo el ángulo inferior de la escápula.',
      insercion: 'Suelo del surco intertubercular (corredera bicipital) del húmero.',
      inervacion: 'Nervio toracodorsal (C6–C8), rama del fascículo posterior del plexo braquial.',
      irrigacion: 'Arteria toracodorsal (rama de la subescapular) y ramas dorsales de las arterias intercostales posteriores y lumbares.',
      funcion: 'Extiende, aduce y rota medialmente el húmero; desciende el brazo elevado (trepar, remar, nadar). Con el brazo fijo eleva el tronco (dominadas). Accesorio en la espiración forzada y la tos.',
      clinica: 'Se usa como colgajo pediculado en cirugía reconstructiva (p. ej., reconstrucción mamaria). La lesión del nervio toracodorsal en la cirugía axilar debilita la aducción y extensión del brazo (dificultad para usar muletas o trepar).',
    },
    {
      id: 'romb_may', grupo: 'romboides',
      nombre: 'Romboides mayor', latin: 'M. rhomboideus major',
      forma: 'Plano, cuadrilátero', regiones: ['toracica'],
      origen: 'Apófisis espinosas y ligamentos supraespinosos de T2 a T5.',
      insercion: 'Borde medial de la escápula, desde la raíz de la espina hasta el ángulo inferior.',
      inervacion: 'Nervio dorsal de la escápula (C4–C5).',
      irrigacion: 'Arteria dorsal de la escápula (o rama profunda de la cervical transversa) y ramas dorsales de las intercostales posteriores superiores.',
      funcion: 'Retrae la escápula, rota la cavidad glenoidea hacia abajo y fija la escápula contra la pared torácica.',
      clinica: 'El atrapamiento del nervio dorsal de la escápula en el escaleno medio provoca dolor interescapular y leve separación del borde medial. Es sitio habitual de dolor miofascial por posturas mantenidas frente al ordenador.',
    },
    {
      id: 'romb_men', grupo: 'romboides',
      nombre: 'Romboides menor', latin: 'M. rhomboideus minor',
      forma: 'Plano, en cinta', regiones: ['cervical', 'toracica'],
      origen: 'Porción inferior del ligamento nucal y apófisis espinosas de C7 y T1.',
      insercion: 'Borde medial de la escápula, a la altura de la raíz de la espina.',
      inervacion: 'Nervio dorsal de la escápula (C4–C5).',
      irrigacion: 'Arteria dorsal de la escápula.',
      funcion: 'Retrae y eleva la escápula y rota la cavidad glenoidea hacia abajo.',
      clinica: 'Se explora con las manos en la cintura empujando los codos hacia atrás contra resistencia: se palpa el borde medial de la escápula. Su parálisis desplaza la escápula lateralmente.',
    },
    {
      id: 'elev_esc', grupo: 'elevador',
      nombre: 'Elevador de la escápula', latin: 'M. levator scapulae',
      forma: 'Alargado, en cinta', regiones: ['cervical'],
      origen: 'Tubérculos posteriores de las apófisis transversas de C1 a C4.',
      insercion: 'Borde medial de la escápula, desde el ángulo superior hasta la raíz de la espina.',
      inervacion: 'Nervio dorsal de la escápula (C5) y ramos directos de C3–C4 (plexo cervical).',
      irrigacion: 'Arterias dorsal de la escápula, cervical transversa y cervical ascendente.',
      funcion: 'Eleva la escápula y rota la cavidad glenoidea hacia abajo. Con la escápula fija, inclina el cuello hacia el mismo lado y lo rota hacia ese lado.',
      clinica: 'Responsable frecuente de la tortícolis y del dolor en el ángulo superior de la escápula al girar la cabeza (síndrome del elevador de la escápula).',
    },

    // ───────────────────────────── CAPA INTERMEDIA ─────────────────────────────
    {
      id: 'serr_ps', grupo: 'serratos',
      nombre: 'Serrato posterior superior', latin: 'M. serratus posterior superior',
      forma: 'Plano, cuadrilátero, con digitaciones', regiones: ['cervical', 'toracica'],
      origen: 'Porción inferior del ligamento nucal y apófisis espinosas de C7 a T3.',
      insercion: 'Bordes superiores de las costillas 2.ª a 5.ª, lateral a sus ángulos.',
      inervacion: 'Nervios intercostales T2–T5 (ramos anteriores).',
      irrigacion: 'Arterias intercostales posteriores 2.ª a 5.ª.',
      funcion: 'Eleva las costillas superiores (músculo accesorio de la inspiración). Se le atribuye además una función propioceptiva.',
      clinica: 'Sus puntos gatillo producen un dolor profundo bajo la escápula que empeora con la respiración y con los movimientos del brazo.',
    },
    {
      id: 'serr_pi', grupo: 'serratos',
      nombre: 'Serrato posterior inferior', latin: 'M. serratus posterior inferior',
      forma: 'Plano, cuadrilátero, con digitaciones', regiones: ['toracica', 'lumbar'],
      origen: 'Apófisis espinosas de T11 a L2, a través de la fascia toracolumbar.',
      insercion: 'Bordes inferiores de las costillas 9.ª a 12.ª, cerca de sus ángulos.',
      inervacion: 'Ramos anteriores de T9–T12 (nervios intercostales 9.º–11.º y nervio subcostal).',
      irrigacion: 'Arterias intercostales posteriores inferiores, arteria subcostal y ramas de las arterias lumbares.',
      funcion: 'Desciende las últimas costillas y las fija frente a la tracción del diafragma durante la inspiración.',
      clinica: 'Fuente de dolor dorsolumbar miofascial persistente, que suele aumentar al toser o al respirar profundamente.',
    },

    // ───────────────────────────── CAPA PROFUNDA ─────────────────────────────
    // Esplenios
    {
      id: 'espl_cab', grupo: 'esplenios',
      nombre: 'Esplenio de la cabeza', latin: 'M. splenius capitis',
      forma: 'Plano, ancho', regiones: ['cervical', 'toracica'],
      origen: 'Mitad inferior del ligamento nucal y apófisis espinosas de C7 a T3.',
      insercion: 'Apófisis mastoides del temporal y tercio lateral de la línea nucal superior del occipital.',
      inervacion: 'Ramos posteriores de los nervios espinales cervicales medios (C3–C5).',
      irrigacion: 'Rama descendente de la arteria occipital y arteria cervical profunda.',
      funcion: 'Bilateral: extiende la cabeza y el cuello. Unilateral: inclina y rota la cabeza hacia el mismo lado.',
      clinica: 'Se lesiona con frecuencia en el latigazo cervical. Su contractura contribuye a la cefalea cervicogénica, con dolor irradiado al vértice o detrás del ojo.',
    },
    {
      id: 'espl_cue', grupo: 'esplenios',
      nombre: 'Esplenio del cuello', latin: 'M. splenius cervicis',
      forma: 'Plano, alargado', regiones: ['cervical', 'toracica'],
      origen: 'Apófisis espinosas de T3 a T6.',
      insercion: 'Tubérculos posteriores de las apófisis transversas de C1 a C3.',
      inervacion: 'Ramos posteriores de los nervios espinales cervicales inferiores.',
      irrigacion: 'Ramas descendentes de la arteria occipital, arteria cervical profunda y ramas de la cervical transversa.',
      funcion: 'Bilateral: extiende el cuello. Unilateral: inclina y rota el cuello hacia el mismo lado.',
      clinica: 'Causa rigidez y dolor cervical posterior. Sus puntos gatillo refieren dolor hacia la órbita y el ángulo de la mandíbula.',
    },

    // Erector de la columna — Iliocostal
    {
      id: 'ilio_lum', grupo: 'erector', subgrupo: 'Iliocostal',
      nombre: 'Iliocostal lumbar', latin: 'M. iliocostalis lumborum',
      forma: 'Alargado, con múltiples tendones', regiones: ['lumbar', 'toracica'],
      origen: 'Tendón común del erector de la columna: cresta sacra, cara posterior del sacro, labio medial de la cresta ilíaca y fascia toracolumbar.',
      insercion: 'Ángulos de las 6–9 costillas inferiores y, en su porción lumbar, puntas de las apófisis transversas (costiformes) de L1–L4.',
      inervacion: 'Ramos laterales de los ramos posteriores de los nervios espinales torácicos inferiores y lumbares.',
      irrigacion: 'Ramas dorsales de las arterias lumbares, intercostales posteriores inferiores, subcostal e iliolumbar.',
      funcion: 'Bilateral: extiende la columna lumbar. Unilateral: la inclina hacia el mismo lado. Desciende las costillas inferiores.',
      clinica: 'Protagonista del espasmo muscular en la lumbalgia mecánica aguda. Sus puntos gatillo refieren dolor a la nalga y a la región abdominal.',
    },
    {
      id: 'ilio_tor', grupo: 'erector', subgrupo: 'Iliocostal',
      nombre: 'Iliocostal torácico', latin: 'M. iliocostalis thoracis',
      forma: 'Alargado, con múltiples tendones', regiones: ['toracica'],
      origen: 'Bordes superiores de los ángulos de las 6 costillas inferiores (7.ª–12.ª), medial a los tendones del iliocostal lumbar.',
      insercion: 'Ángulos de las 6 costillas superiores (1.ª–6.ª) y apófisis transversa de C7.',
      inervacion: 'Ramos laterales de los ramos posteriores de los nervios espinales torácicos.',
      irrigacion: 'Ramas dorsales de las arterias intercostales posteriores.',
      funcion: 'Extiende e inclina lateralmente la columna torácica; estabiliza las costillas.',
      clinica: 'Sus puntos gatillo pueden simular dolor visceral (dolor torácico atípico, cólico renal).',
    },
    {
      id: 'ilio_cer', grupo: 'erector', subgrupo: 'Iliocostal',
      nombre: 'Iliocostal cervical', latin: 'M. iliocostalis cervicis',
      forma: 'Alargado, delgado', regiones: ['cervical', 'toracica'],
      origen: 'Ángulos de las costillas 3.ª a 6.ª.',
      insercion: 'Tubérculos posteriores de las apófisis transversas de C4 a C6.',
      inervacion: 'Ramos posteriores de los nervios espinales cervicales inferiores y torácicos superiores.',
      irrigacion: 'Arteria cervical profunda, ramas musculares de la arteria vertebral y ramas dorsales de las intercostales posteriores superiores.',
      funcion: 'Extiende e inclina lateralmente la columna cervical; eleva las costillas superiores.',
      clinica: 'Participa en la cervicodorsalgia postural; su espasmo limita la inclinación del cuello hacia el lado opuesto.',
    },

    // Erector de la columna — Longísimo
    {
      id: 'long_tor', grupo: 'erector', subgrupo: 'Longísimo',
      nombre: 'Longísimo torácico', latin: 'M. longissimus thoracis',
      forma: 'Alargado, fusiforme, con múltiples tendones', regiones: ['toracica', 'lumbar'],
      origen: 'Tendón común del erector de la columna (sacro, apófisis espinosas lumbares, cresta ilíaca) y apófisis transversas y accesorias de las vértebras lumbares.',
      insercion: 'Puntas de las apófisis transversas de todas las vértebras torácicas y costillas 3.ª/4.ª a 12.ª, entre el tubérculo y el ángulo. Las fibras lumbares, en las apófisis accesorias y transversas lumbares.',
      inervacion: 'Ramos laterales de los ramos posteriores de los nervios espinales torácicos y lumbares.',
      irrigacion: 'Ramas dorsales de las arterias intercostales posteriores, subcostal y lumbares.',
      funcion: 'Bilateral: extiende la columna torácica y lumbar y mantiene la postura erguida. Unilateral: inclina la columna hacia el mismo lado.',
      clinica: 'Es el más largo y voluminoso del erector. Su contractura antiálgica es típica de la hernia discal lumbar (escoliosis antiálgica, pérdida de la lordosis).',
    },
    {
      id: 'long_cer', grupo: 'erector', subgrupo: 'Longísimo',
      nombre: 'Longísimo cervical', latin: 'M. longissimus cervicis',
      forma: 'Alargado, delgado', regiones: ['cervical', 'toracica'],
      origen: 'Apófisis transversas de T1 a T5.',
      insercion: 'Tubérculos posteriores de las apófisis transversas de C2 a C6.',
      inervacion: 'Ramos posteriores de los nervios espinales cervicales inferiores y torácicos superiores.',
      irrigacion: 'Arteria cervical profunda, ramas musculares de la vertebral y ramas dorsales de las intercostales posteriores superiores.',
      funcion: 'Extiende e inclina lateralmente el cuello.',
      clinica: 'Se afecta en el esguince cervical por hiperextensión-flexión.',
    },
    {
      id: 'long_cab', grupo: 'erector', subgrupo: 'Longísimo',
      nombre: 'Longísimo de la cabeza', latin: 'M. longissimus capitis',
      forma: 'Alargado, en cinta', regiones: ['cervical', 'toracica'],
      origen: 'Apófisis transversas de T1 a T5 y apófisis articulares de C4 a C7.',
      insercion: 'Borde posterior de la apófisis mastoides, profundo al esplenio de la cabeza y al esternocleidomastoideo.',
      inervacion: 'Ramos posteriores de los nervios espinales cervicales medios e inferiores.',
      irrigacion: 'Arteria occipital, arteria cervical profunda y ramas musculares de la vertebral.',
      funcion: 'Bilateral: extiende la cabeza. Unilateral: inclina y rota la cabeza hacia el mismo lado.',
      clinica: 'Relacionado con la cefalea cervicogénica y el dolor retroauricular.',
    },

    // Erector de la columna — Espinoso
    {
      id: 'espinoso', grupo: 'erector', subgrupo: 'Espinoso',
      nombre: 'Espinoso', latin: 'M. spinalis (thoracis)',
      forma: 'Alargado, delgado', regiones: ['toracica', 'lumbar'],
      origen: 'Apófisis espinosas de T11 a L2.',
      insercion: 'Apófisis espinosas de T1 a T8 (variable).',
      inervacion: 'Ramos posteriores de los nervios espinales torácicos y lumbares superiores.',
      irrigacion: 'Ramas dorsales de las arterias intercostales posteriores y lumbares.',
      funcion: 'Extiende la columna torácica y la estabiliza.',
      clinica: 'Es el más medial y delgado del erector. Su porción torácica es constante; las porciones cervical y de la cabeza son inconstantes y suelen fusionarse con el semiespinoso.',
    },

    // Transversoespinosos
    {
      id: 'semi_tor', grupo: 'transversoespinosos', subgrupo: 'Semiespinoso',
      nombre: 'Semiespinoso torácico', latin: 'M. semispinalis thoracis',
      forma: 'Alargado, fascículos largos', regiones: ['toracica'],
      origen: 'Apófisis transversas de T6 a T10.',
      insercion: 'Apófisis espinosas de C6 a T4 (salta 4–6 segmentos).',
      inervacion: 'Ramos mediales de los ramos posteriores de los nervios espinales torácicos.',
      irrigacion: 'Ramas dorsales de las arterias intercostales posteriores.',
      funcion: 'Extiende la columna torácica y cervical inferior y la rota hacia el lado opuesto.',
      clinica: 'Forma parte del sistema transversoespinoso que controla la rotación del tronco; su debilidad se asocia a hipercifosis.',
    },
    {
      id: 'semi_cer', grupo: 'transversoespinosos', subgrupo: 'Semiespinoso',
      nombre: 'Semiespinoso cervical', latin: 'M. semispinalis cervicis',
      forma: 'Alargado, fascículos largos', regiones: ['cervical', 'toracica'],
      origen: 'Apófisis transversas de T1 a T6.',
      insercion: 'Apófisis espinosas de C2 a C5, sobre todo en la del axis.',
      inervacion: 'Ramos mediales de los ramos posteriores de los nervios espinales cervicales.',
      irrigacion: 'Arteria cervical profunda, arteria occipital y ramas musculares de la vertebral.',
      funcion: 'Extiende el cuello, lo rota hacia el lado opuesto y es el principal estabilizador de la lordosis cervical.',
      clinica: 'Su desinserción de C2 durante la laminectomía cervical se asocia a pérdida de la lordosis y cifosis posquirúrgica; por eso se intenta preservar.',
    },
    {
      id: 'semi_cab', grupo: 'transversoespinosos', subgrupo: 'Semiespinoso',
      nombre: 'Semiespinoso de la cabeza', latin: 'M. semispinalis capitis',
      forma: 'Ancho y grueso, con intersección tendinosa', regiones: ['cervical', 'toracica'],
      origen: 'Apófisis transversas de C7 a T6 y apófisis articulares de C4 a C6.',
      insercion: 'Área del occipital entre las líneas nucales superior e inferior.',
      inervacion: 'Ramos posteriores de C1 a C6, incluido el nervio occipital mayor (C2).',
      irrigacion: 'Rama descendente de la arteria occipital, arteria cervical profunda y ramas de la vertebral.',
      funcion: 'Es el extensor más potente de la cabeza; rota débilmente la cabeza hacia el lado opuesto.',
      clinica: 'El nervio occipital mayor lo perfora; su atrapamiento en este punto produce neuralgia occipital (dolor punzante en la nuca y el cuero cabelludo).',
    },
    {
      id: 'multifidos', grupo: 'transversoespinosos', subgrupo: 'Multífidos', procedural: true,
      nombre: 'Multífidos', latin: 'Mm. multifidi',
      forma: 'Fascículos cortos, múltiples y superpuestos', regiones: ['cervical', 'toracica', 'lumbar'],
      origen: 'Cara posterior del sacro, espina ilíaca posterosuperior, aponeurosis del erector, apófisis mamilares lumbares, apófisis transversas torácicas y apófisis articulares de C4–C7.',
      insercion: 'Apófisis espinosas de las vértebras situadas 2 a 4 niveles por encima, desde L5 hasta C2.',
      inervacion: 'Ramos mediales de los ramos posteriores de los nervios espinales (inervación estrictamente segmentaria).',
      irrigacion: 'Ramas dorsales de las arterias lumbares, intercostales posteriores, cervical profunda, vertebral y sacras laterales.',
      funcion: 'Estabilizan cada segmento vertebral (control fino de la columna); extienden, inclinan y rotan la columna hacia el lado opuesto. Son más gruesos en la región lumbar.',
      clinica: 'En la lumbalgia crónica se observa atrofia e infiltración grasa del multífido lumbar en la resonancia magnética. Los ejercicios de control motor buscan reactivarlos.',
    },
    {
      id: 'rot_cer', grupo: 'transversoespinosos', subgrupo: 'Rotadores',
      nombre: 'Rotadores cervicales', latin: 'Mm. rotatores cervicis',
      forma: 'Fascículos cortos', regiones: ['cervical'],
      origen: 'Apófisis articulares y transversas de las vértebras cervicales.',
      insercion: 'Lámina y base de la apófisis espinosa de la vértebra situada 1–2 niveles por encima.',
      inervacion: 'Ramos mediales de los ramos posteriores de los nervios espinales cervicales.',
      irrigacion: 'Arteria vertebral y arteria cervical profunda.',
      funcion: 'Rotan la columna hacia el lado opuesto y la extienden; son sobre todo órganos propioceptivos (alta densidad de husos musculares).',
      clinica: 'Poco desarrollados en el cuello; su información propioceptiva participa en el control postural y en el mareo de origen cervical.',
    },
    {
      id: 'rot_tor', grupo: 'transversoespinosos', subgrupo: 'Rotadores',
      nombre: 'Rotadores torácicos', latin: 'Mm. rotatores thoracis',
      forma: 'Fascículos cortos (breves y largos)', regiones: ['toracica'],
      origen: 'Apófisis transversas de las vértebras torácicas.',
      insercion: 'Lámina y base de la apófisis espinosa de la vértebra inmediatamente superior (rotadores cortos) o de dos niveles por encima (rotadores largos).',
      inervacion: 'Ramos mediales de los ramos posteriores de los nervios espinales torácicos.',
      irrigacion: 'Ramas dorsales de las arterias intercostales posteriores.',
      funcion: 'Rotan la columna hacia el lado opuesto, colaboran en la extensión y aportan propiocepción segmentaria.',
      clinica: 'Son más constantes y desarrollados en la región torácica; su disfunción segmentaria se relaciona con dolor dorsal localizado.',
    },
    {
      id: 'rot_lum', grupo: 'transversoespinosos', subgrupo: 'Rotadores',
      nombre: 'Rotadores lumbares', latin: 'Mm. rotatores lumborum',
      forma: 'Fascículos cortos, irregulares', regiones: ['lumbar'],
      origen: 'Apófisis mamilares y transversas de las vértebras lumbares.',
      insercion: 'Lámina y base de la apófisis espinosa de la vértebra superior.',
      inervacion: 'Ramos mediales de los ramos posteriores de los nervios espinales lumbares.',
      irrigacion: 'Ramas dorsales de las arterias lumbares.',
      funcion: 'Rotación hacia el lado opuesto y control propioceptivo segmentario.',
      clinica: 'Irregulares y poco desarrollados en la región lumbar; su función es sobre todo sensorial.',
    },

    // Segmentarios
    {
      id: 'intesp_cer', grupo: 'segmentarios', subgrupo: 'Interespinosos',
      nombre: 'Interespinosos cervicales', latin: 'Mm. interspinales cervicis',
      forma: 'Cortos, pares', regiones: ['cervical'],
      origen: 'Borde superior de la apófisis espinosa de cada vértebra cervical (de C3 a T1).',
      insercion: 'Borde inferior de la apófisis espinosa de la vértebra inmediatamente superior (desde C2), a cada lado del ligamento interespinoso.',
      inervacion: 'Ramos posteriores de los nervios espinales cervicales.',
      irrigacion: 'Ramas musculares de la arteria vertebral y arteria cervical profunda.',
      funcion: 'Extensión segmentaria y estabilización; función propioceptiva.',
      clinica: 'Bien desarrollados en el cuello, donde forman dos haces por nivel por las apófisis espinosas bífidas.',
    },
    {
      id: 'intesp_tor', grupo: 'segmentarios', subgrupo: 'Interespinosos',
      nombre: 'Interespinosos torácicos', latin: 'Mm. interspinales thoracis',
      forma: 'Cortos, inconstantes', regiones: ['toracica'],
      origen: 'Apófisis espinosas de las vértebras torácicas superiores (T1–T3) e inferiores (T11–T12).',
      insercion: 'Apófisis espinosa de la vértebra inmediatamente superior.',
      inervacion: 'Ramos posteriores de los nervios espinales torácicos.',
      irrigacion: 'Ramas dorsales de las arterias intercostales posteriores.',
      funcion: 'Extensión segmentaria y propiocepción.',
      clinica: 'Suelen faltar en la región torácica media, donde las apófisis espinosas se imbrican.',
    },
    {
      id: 'intesp_lum', grupo: 'segmentarios', subgrupo: 'Interespinosos',
      nombre: 'Interespinosos lumbares', latin: 'Mm. interspinales lumborum',
      forma: 'Cortos, cuadriláteros', regiones: ['lumbar'],
      origen: 'Borde superior de las apófisis espinosas lumbares (L2–L5).',
      insercion: 'Borde inferior de la apófisis espinosa de la vértebra inmediatamente superior (T12–L4).',
      inervacion: 'Ramos posteriores de los nervios espinales lumbares.',
      irrigacion: 'Ramas dorsales de las arterias lumbares.',
      funcion: 'Extensión segmentaria de la columna lumbar y propiocepción.',
      clinica: 'En los traumatismos por flexión violenta (lesión por cinturón de seguridad, fractura de Chance) puede romperse el complejo interespinoso.',
    },
    {
      id: 'intert_cer', grupo: 'segmentarios', subgrupo: 'Intertransversos',
      nombre: 'Intertransversos cervicales', latin: 'Mm. intertransversarii cervicis (anteriores et posteriores)',
      forma: 'Cortos, en pares anterior y posterior', regiones: ['cervical'],
      origen: 'Tubérculos anterior y posterior de las apófisis transversas cervicales.',
      insercion: 'Tubérculos correspondientes de la apófisis transversa de la vértebra superior.',
      inervacion: 'Los anteriores, por ramos anteriores; los posteriores, por ramos anteriores y posteriores de los nervios espinales cervicales.',
      irrigacion: 'Arterias vertebral, cervical ascendente y cervical profunda.',
      funcion: 'Inclinan la columna cervical hacia el mismo lado y la estabilizan.',
      clinica: 'El ramo anterior de cada nervio espinal cervical emerge entre el intertransverso anterior y el posterior.',
    },
    {
      id: 'intert_lum', grupo: 'segmentarios', subgrupo: 'Intertransversos',
      nombre: 'Intertransversos lumbares', latin: 'Mm. intertransversarii lumborum (mediales et laterales)',
      forma: 'Cortos, en pares medial y lateral', regiones: ['lumbar'],
      origen: 'Mediales: apófisis accesoria y mamilar. Laterales: apófisis transversas (costiformes) lumbares.',
      insercion: 'Estructuras homólogas de la vértebra lumbar superior.',
      inervacion: 'Mediales: ramos posteriores. Laterales: ramos anteriores de los nervios espinales lumbares.',
      irrigacion: 'Ramas dorsales de las arterias lumbares.',
      funcion: 'Inclinan la columna lumbar hacia el mismo lado; función propioceptiva predominante.',
      clinica: 'Su altísima densidad de husos musculares sugiere que actúan más como sensores de posición que como motores.',
    },
    {
      id: 'elev_cost', grupo: 'segmentarios', subgrupo: 'Elevadores de las costillas',
      nombre: 'Elevadores de las costillas', latin: 'Mm. levatores costarum (breves et longi)',
      forma: 'Pequeños, triangulares (12 pares)', regiones: ['toracica'],
      origen: 'Puntas de las apófisis transversas de C7 y T1–T11.',
      insercion: 'Cara externa de la costilla inmediatamente inferior (cortos) o de la segunda costilla inferior (largos), entre el tubérculo y el ángulo.',
      inervacion: 'Ramos laterales de los ramos posteriores de los nervios espinales C8–T11.',
      irrigacion: 'Ramas dorsales de las arterias intercostales posteriores.',
      funcion: 'Elevan las costillas durante la inspiración; colaboran en la rotación e inclinación de la columna torácica.',
      clinica: 'Pueden estar implicados en las disfunciones de la articulación costotransversa y en el dolor costal posterior.',
    },

    // Suboccipitales
    {
      id: 'rcp_may', grupo: 'suboccipitales',
      nombre: 'Recto posterior mayor de la cabeza', latin: 'M. rectus capitis posterior major',
      forma: 'Triangular', regiones: ['cervical'],
      origen: 'Apófisis espinosa del axis (C2).',
      insercion: 'Porción lateral de la línea nucal inferior del occipital.',
      inervacion: 'Nervio suboccipital (ramo posterior de C1).',
      irrigacion: 'Ramas musculares de la arteria vertebral y ramas descendentes de la arteria occipital.',
      funcion: 'Extiende la cabeza en la articulación atlantooccipital y la rota hacia el mismo lado en la atlantoaxial.',
      clinica: 'Forma el límite medial del triángulo suboccipital, que contiene la arteria vertebral y el nervio suboccipital.',
    },
    {
      id: 'rcp_men', grupo: 'suboccipitales',
      nombre: 'Recto posterior menor de la cabeza', latin: 'M. rectus capitis posterior minor',
      forma: 'Triangular, pequeño', regiones: ['cervical'],
      origen: 'Tubérculo posterior del atlas (C1).',
      insercion: 'Tercio medial de la línea nucal inferior del occipital.',
      inervacion: 'Nervio suboccipital (C1).',
      irrigacion: 'Arteria vertebral y arteria occipital.',
      funcion: 'Extiende la cabeza; aporta abundante información propioceptiva.',
      clinica: 'Se une a la duramadre mediante el «puente miodural», vinculado con algunas cefaleas cervicogénicas.',
    },
    {
      id: 'obl_sup', grupo: 'suboccipitales',
      nombre: 'Oblicuo superior de la cabeza', latin: 'M. obliquus capitis superior',
      forma: 'Alargado, pequeño', regiones: ['cervical'],
      origen: 'Apófisis transversa del atlas (C1).',
      insercion: 'Occipital, entre las líneas nucales superior e inferior, lateral al semiespinoso de la cabeza.',
      inervacion: 'Nervio suboccipital (C1).',
      irrigacion: 'Arteria vertebral y arteria occipital.',
      funcion: 'Extiende la cabeza y la inclina hacia el mismo lado.',
      clinica: 'Forma el límite superolateral del triángulo suboccipital.',
    },
    {
      id: 'obl_inf', grupo: 'suboccipitales',
      nombre: 'Oblicuo inferior de la cabeza', latin: 'M. obliquus capitis inferior',
      forma: 'Fusiforme, grueso', regiones: ['cervical'],
      origen: 'Apófisis espinosa del axis (C2).',
      insercion: 'Apófisis transversa del atlas (C1).',
      inervacion: 'Nervio suboccipital (C1).',
      irrigacion: 'Arteria vertebral y arteria occipital.',
      funcion: 'Rota la cabeza (y el atlas) hacia el mismo lado en la articulación atlantoaxial. Es el único músculo «de la cabeza» que no se inserta en el cráneo.',
      clinica: 'Forma el límite inferior del triángulo suboccipital; el nervio occipital mayor emerge bajo su borde inferior.',
    },

    // Cuadrado lumbar
    {
      id: 'cuad_lumb', grupo: 'cuadrado', procedural: true,
      nombre: 'Cuadrado lumbar', latin: 'M. quadratus lumborum',
      forma: 'Cuadrilátero, plano y grueso', regiones: ['lumbar'],
      origen: 'Labio interno de la porción posterior de la cresta ilíaca y ligamento iliolumbar.',
      insercion: 'Mitad medial del borde inferior de la 12.ª costilla y puntas de las apófisis transversas (costiformes) de L1 a L4.',
      inervacion: 'Nervio subcostal (T12) y ramos anteriores de L1–L4.',
      irrigacion: 'Arterias lumbares, arteria subcostal y rama lumbar de la arteria iliolumbar.',
      funcion: 'Unilateral: inclina la columna lumbar y eleva la hemipelvis. Bilateral: extiende la columna lumbar y fija la 12.ª costilla durante la inspiración.',
      clinica: 'Fuente muy frecuente de lumbalgia; sus puntos gatillo refieren dolor a la cresta ilíaca, la cadera y la nalga. Se bloquea en anestesia regional (bloqueo del cuadrado lumbar).',
    },
  ];

  // ───────────────────────────── HUESOS ─────────────────────────────
  const ORD = ['1.ª', '2.ª', '3.ª', '4.ª', '5.ª', '6.ª', '7.ª', '8.ª', '9.ª', '10.ª', '11.ª', '12.ª'];

  const infoHueso = {
    atlas: {
      nombre: 'Atlas (C1)',
      descripcion: 'Primera vértebra cervical. Carece de cuerpo y de apófisis espinosa: es un anillo formado por dos masas laterales unidas por los arcos anterior y posterior. Sostiene el cráneo a través de los cóndilos occipitales.',
      inserciones: 'Recto posterior menor (tubérculo posterior), oblicuos superior e inferior de la cabeza (apófisis transversa), elevador de la escápula y esplenio del cuello (apófisis transversa).',
      clinica: 'La fractura de Jefferson (estallido del anillo) se produce por compresión axial, como al zambullirse en aguas poco profundas.',
    },
    axis: {
      nombre: 'Axis (C2)',
      descripcion: 'Segunda vértebra cervical. Su apófisis odontoides (diente) actúa como pivote sobre el que gira el atlas; posee la apófisis espinosa bífida más robusta del cuello.',
      inserciones: 'Recto posterior mayor y oblicuo inferior de la cabeza, semiespinoso cervical, multífidos e interespinosos.',
      clinica: 'Las fracturas de la odontoides y la «fractura del ahorcado» (de ambos pedículos) son lesiones características del axis.',
    },
    cervical: {
      descripcion: 'Vértebra cervical típica: cuerpo pequeño y ancho, agujeros transversos por donde pasa la arteria vertebral, apófisis transversas con tubérculos anterior y posterior, y apófisis espinosa corta y bífida.',
      inserciones: 'Esplenio del cuello, elevador de la escápula, iliocostal y longísimo cervicales, semiespinosos, multífidos, rotadores, interespinosos e intertransversos.',
      clinica: 'La región C5–C7 es la más afectada por la espondilosis y la hernia discal cervical, con dolor irradiado al brazo (radiculopatía).',
    },
    c7: {
      nombre: 'Vértebra prominente (C7)',
      descripcion: 'Séptima vértebra cervical. Su apófisis espinosa, larga y no bífida, es la primera que se palpa con claridad en la base del cuello.',
      inserciones: 'Trapecio, romboides menor, serrato posterior superior, esplenio de la cabeza, ligamento nucal y músculos transversoespinosos.',
      clinica: 'Es el punto de referencia para contar las apófisis espinosas en la exploración física.',
    },
    toracica: {
      descripcion: 'Vértebra torácica: cuerpo en forma de corazón con fositas costales para la cabeza de las costillas, apófisis transversas con fosita para el tubérculo costal y apófisis espinosa larga, inclinada hacia abajo.',
      inserciones: 'Trapecio, romboides, dorsal ancho (T7–T12), serratos posteriores, esplenios, erector de la columna, semiespinosos, multífidos, rotadores y elevadores de las costillas.',
      clinica: 'Las fracturas por compresión en cuña de la columna torácica son típicas de la osteoporosis y producen hipercifosis.',
    },
    lumbar: {
      descripcion: 'Vértebra lumbar: cuerpo grande y reniforme, apófisis transversas (costiformes) largas, apófisis mamilares y accesorias, y apófisis espinosa ancha, cuadrilátera y horizontal.',
      inserciones: 'Dorsal ancho (vía fascia toracolumbar), serrato posterior inferior, erector de la columna, multífidos, rotadores, interespinosos, intertransversos y cuadrado lumbar.',
      clinica: 'Los niveles L4–L5 y L5–S1 concentran la mayoría de las hernias discales y de la espondilolistesis.',
    },
    sacro: {
      nombre: 'Sacro',
      descripcion: 'Hueso triangular formado por la fusión de cinco vértebras sacras. Se articula con los coxales (articulaciones sacroilíacas) y transmite el peso del tronco a la pelvis.',
      inserciones: 'Tendón común del erector de la columna, multífidos, dorsal ancho (vía fascia toracolumbar) y glúteo mayor.',
      clinica: 'La disfunción de la articulación sacroilíaca es una causa frecuente de dolor lumbar bajo y glúteo.',
    },
    coccix: {
      nombre: 'Cóccix',
      descripcion: 'Hueso pequeño formado por la fusión de tres a cinco vértebras coccígeas rudimentarias. Es el vestigio de la cola.',
      inserciones: 'Glúteo mayor, músculo coccígeo, elevador del ano y ligamento anococcígeo.',
      clinica: 'La coccigodinia (dolor en el cóccix) suele deberse a caídas sentado o al parto.',
    },
    costilla: {
      descripcion: 'Hueso plano y curvo que forma la caja torácica. Se articula por detrás con las vértebras torácicas (cabeza y tubérculo) y por delante con el esternón mediante el cartílago costal.',
      inserciones: 'Iliocostales, longísimo torácico, serratos posteriores, elevadores de las costillas, dorsal ancho (últimas costillas) y cuadrado lumbar (12.ª costilla).',
      clinica: 'Las fracturas costales son más frecuentes entre la 5.ª y la 9.ª costilla; las de las costillas inferiores pueden asociarse a lesión hepática, esplénica o renal.',
    },
    cartilago: {
      descripcion: 'Cartílago hialino que prolonga cada costilla verdadera hasta el esternón, aportando elasticidad a la caja torácica.',
      inserciones: 'Músculos pectoral mayor, transverso del tórax y recto del abdomen (cartílagos inferiores).',
      clinica: 'La inflamación de las uniones costocondrales (costocondritis o síndrome de Tietze) causa dolor torácico anterior.',
    },
    esternon: {
      nombre: 'Esternón',
      descripcion: 'Hueso plano de la pared anterior del tórax formado por el manubrio, el cuerpo y la apófisis xifoides.',
      inserciones: 'Pectoral mayor, esternocleidomastoideo, músculos infrahioideos, diafragma y recto del abdomen.',
      clinica: 'Su cuerpo es el punto de apoyo de las compresiones torácicas en la reanimación cardiopulmonar.',
    },
    escapula: {
      nombre: 'Escápula',
      descripcion: 'Hueso plano y triangular de la cara posterior del tórax (niveles T2–T7). Presenta la espina, el acromion, la apófisis coracoides y la cavidad glenoidea.',
      inserciones: 'Trapecio (espina y acromion), romboides mayor y menor y elevador de la escápula (borde medial), además de los músculos del manguito rotador.',
      clinica: 'La «escápula alada» se debe a parálisis del serrato anterior (nervio torácico largo) o, en menor grado, del trapecio.',
    },
    clavicula: {
      nombre: 'Clavícula',
      descripcion: 'Hueso largo en forma de S que une el esternón con el acromion y mantiene el hombro separado del tórax.',
      inserciones: 'Trapecio (fibras descendentes, tercio lateral), esternocleidomastoideo, deltoides y pectoral mayor.',
      clinica: 'Es el hueso que se fractura con más frecuencia, habitualmente en la unión de sus tercios medio y lateral.',
    },
    humero: {
      nombre: 'Húmero',
      descripcion: 'Hueso largo del brazo. En su extremo proximal presenta la cabeza, los tubérculos mayor y menor y, entre ellos, el surco intertubercular.',
      inserciones: 'Dorsal ancho (suelo del surco intertubercular), deltoides, pectoral mayor, redondo mayor y manguito rotador.',
      clinica: 'Las fracturas del cuello quirúrgico pueden lesionar el nervio axilar y la arteria circunfleja humeral posterior.',
    },
    coxal: {
      nombre: 'Hueso coxal',
      descripcion: 'Hueso de la pelvis formado por la fusión del ilion, el isquion y el pubis. Su cresta ilíaca es un gran punto de inserción para los músculos del tronco.',
      inserciones: 'Dorsal ancho, iliocostal lumbar y tendón común del erector de la columna, multífidos (espina ilíaca posterosuperior) y cuadrado lumbar (cresta ilíaca).',
      clinica: 'La línea que une ambas crestas ilíacas (línea de Tuffier) cruza el nivel L4–L5, referencia para la punción lumbar.',
    },
    occipital: {
      nombre: 'Hueso occipital',
      descripcion: 'Forma la parte posterior e inferior del cráneo. Contiene el agujero magno y los cóndilos que se articulan con el atlas. En su cara externa presenta las líneas nucales superior e inferior.',
      inserciones: 'Trapecio, esplenio de la cabeza, semiespinoso de la cabeza, rectos posteriores de la cabeza y oblicuo superior de la cabeza.',
      clinica: 'La protuberancia occipital externa (inion) es un punto de referencia palpable; la neuralgia occipital se proyecta sobre esta región.',
    },
    temporal: {
      nombre: 'Hueso temporal',
      descripcion: 'Hueso lateral del cráneo que aloja el oído. Su apófisis mastoides se palpa detrás de la oreja.',
      inserciones: 'Esplenio de la cabeza y longísimo de la cabeza (apófisis mastoides), además del esternocleidomastoideo.',
      clinica: 'La mastoiditis es una complicación de la otitis media que afecta a las celdillas aéreas de la apófisis mastoides.',
    },
    disco: {
      nombre: 'Disco intervertebral',
      descripcion: 'Estructura fibrocartilaginosa entre los cuerpos vertebrales, formada por un anillo fibroso externo y un núcleo pulposo gelatinoso. Amortigua las cargas y permite el movimiento.',
      inserciones: 'Sin inserciones musculares directas; lo estabilizan los ligamentos longitudinales y los músculos segmentarios.',
      clinica: 'La hernia discal (salida del núcleo pulposo a través del anillo) puede comprimir una raíz nerviosa y causar ciática o braquialgia.',
    },
  };

  const vert = (id, info, nombre) => ({ id, info, nombre: nombre || `Vértebra ${id}` });
  const discoNombre = (id) => {
    const map = { disco_C2: 'C2–C3', disco_C3: 'C3–C4', disco_C4: 'C4–C5', disco_C5: 'C5–C6', disco_C6: 'C6–C7', disco_C7: 'C7–T1',
      disco_L5: 'L5–S1' };
    if (map[id]) return map[id];
    const m = id.match(/disco_([TL])(\d+)/);
    const n = +m[2];
    if (m[1] === 'T') return n < 12 ? `T${n}–T${n + 1}` : 'T12–L1';
    return `L${n}–L${n + 1}`;
  };
  const discos = ['disco_C2', 'disco_C3', 'disco_C4', 'disco_C5', 'disco_C6', 'disco_C7']
    .concat(Array.from({ length: 11 }, (_, i) => `disco_T${i + 1}`))
    .concat(Array.from({ length: 5 }, (_, i) => `disco_L${i + 1}`));

  // Árbol de huesos. "lados: true" = estructura bilateral (mallas _R y _L).
  const gruposHueso = [
    { id: 'h_cervical', nombre: 'Columna cervical', region: 'cervical', items: [
      vert('C1', 'atlas', 'Atlas (C1)'), vert('C2', 'axis', 'Axis (C2)'),
      vert('C3', 'cervical'), vert('C4', 'cervical'), vert('C5', 'cervical'), vert('C6', 'cervical'),
      vert('C7', 'c7', 'Vértebra prominente (C7)'),
    ] },
    { id: 'h_toracica', nombre: 'Columna torácica', region: 'toracica',
      items: Array.from({ length: 12 }, (_, i) => vert(`T${i + 1}`, 'toracica')) },
    { id: 'h_lumbar', nombre: 'Columna lumbar', region: 'lumbar',
      items: Array.from({ length: 5 }, (_, i) => vert(`L${i + 1}`, 'lumbar')) },
    { id: 'h_sacro', nombre: 'Sacro y cóccix', region: 'lumbar', items: [
      { id: 'sacro', info: 'sacro', nombre: 'Sacro' }, { id: 'coccix', info: 'coccix', nombre: 'Cóccix' },
    ] },
    { id: 'h_discos', nombre: 'Discos intervertebrales', region: null,
      items: discos.map((d) => ({ id: d, info: 'disco', nombre: `Disco ${discoNombre(d)}` })) },
    { id: 'h_costillas', nombre: 'Costillas', region: 'toracica',
      items: Array.from({ length: 12 }, (_, i) => ({ id: `costilla${i + 1}`, lados: true, info: 'costilla',
        nombre: `${ORD[i]} costilla`, tipo: i < 7 ? 'verdadera' : i < 10 ? 'falsa' : 'flotante' })) },
    { id: 'h_torax', nombre: 'Esternón y cartílagos', region: 'toracica', items: [
      { id: 'esternon', info: 'esternon', nombre: 'Esternón' },
      ...Array.from({ length: 7 }, (_, i) => ({ id: `cartilago${i + 1}`, lados: true, info: 'cartilago', nombre: `${ORD[i].replace('ª', 'º')} cartílago costal` })),
    ] },
    { id: 'h_hombro', nombre: 'Cintura escapular', region: 'toracica', items: [
      { id: 'escapula', lados: true, info: 'escapula', nombre: 'Escápula' },
      { id: 'clavicula', lados: true, info: 'clavicula', nombre: 'Clavícula' },
      { id: 'humero', lados: true, info: 'humero', nombre: 'Húmero' },
    ] },
    { id: 'h_pelvis', nombre: 'Pelvis', region: 'lumbar', items: [
      { id: 'coxal', lados: true, info: 'coxal', nombre: 'Hueso coxal' },
    ] },
    { id: 'h_craneo', nombre: 'Base del cráneo', region: 'cervical', items: [
      { id: 'occipital', info: 'occipital', nombre: 'Occipital' },
      { id: 'temporal', lados: true, info: 'temporal', nombre: 'Temporal' },
    ] },
  ];

  const creditos = {
    modelo: 'BodyParts3D, © The Database Center for Life Science (DBCLS), licencia CC BY-SA 2.1 Japón',
    url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/',
    licencia: 'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.es',
  };

  return { regiones, capas, grupos, musculos, gruposHueso, infoHueso, creditos };
})();
