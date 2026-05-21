// laser.js - Módulo extraído

window.setLaserCncModo = function (modo, silencioso = false) {
    window._laserCncModo = modo;

    // Highlight Sidebar
    document.querySelectorAll('[id^="sub-"]').forEach(el => el.classList.remove('nav-active'));
    const subId = (modo === 'cnc') ? 'sub-cnc' : 'sub-laser';
    const subEl = document.getElementById(subId);
    if (subEl) subEl.classList.add('nav-active');
    const btnLaser = document.getElementById('btnModeLaser');
    const btnCnc = document.getElementById('btnModeCnc');
    const cncFields = document.getElementById('cncExtraFields');

    if (!btnLaser || !btnCnc) return;

    // Clases de estilo unificado con Gráfica
    const activeClass = "bg-zinc-800 text-gecko shadow-sm";
    const inactiveClass = "text-zinc-500 hover:text-white";

    if (modo === 'laser') {
        btnLaser.className = `flex-1 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${activeClass}`;
        btnCnc.className = `flex-1 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${inactiveClass}`;
        if (cncFields) cncFields.classList.add('hidden');
    } else {
        btnCnc.className = `flex-1 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${activeClass}`;
        btnLaser.className = `flex-1 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${inactiveClass}`;
        if (cncFields) cncFields.classList.remove('hidden');
    }

    if (!silencioso) calcularCostoCorte('laser_cnc');
}

function onCncEspesorChange() {
    const espesor = parseFloat(document.getElementById('cncEspesor')?.value) || 5;
    const pasadas = Math.max(1, Math.ceil(espesor / 5));
    const inpPas = document.getElementById('cncPasadas');
    if (inpPas) inpPas.value = pasadas;
    calcularCostoCorte('laser_cnc');
}

window.calcularCostoCorte = function () {
    let costoTotalMaterial = 0;

    // Capturamos los valores globales (fuera de las filas)
    const desperdicio = parseFloat(document.getElementById('corteDesperdicio')?.value) || 0;
    const metrosManual = parseFloat(document.getElementById('corteMetrosManual')?.value) || 0;
    const cotiz = GECKO_SETTINGS.cotizacionDolar || 1420;
    const mode = localStorage.getItem('globalEstimationMode') || 'simple';

    // Buscamos todos los renglones que tengan la clase .fila-laser
    const filas = document.querySelectorAll('.fila-laser');

    filas.forEach(fila => {
        // En cada fila, buscamos los inputs por su CLASE (no por ID)
        const matName = fila.querySelector('.input-laser-mat')?.value;
        const ancho = parseFloat(fila.querySelector('.input-laser-ancho')?.value) || 0;
        const alto = parseFloat(fila.querySelector('.input-laser-alto')?.value) || 0;
        const cant = parseInt(fila.querySelector('.input-laser-cant')?.value) || 1;

        if (matName && ancho > 0 && alto > 0 && cant > 0) {
            const mat = window.getGeckoItem(matName);
            if (mat) {
                const multVal = mode === 'proyecto' ? 1 : mat.multiplicador;
                const precioM2 = mat.costoARS * multVal;
                
                // Sumamos el costo de esta fila al total
                costoTotalMaterial += (ancho / 100) * (alto / 100) * precioM2 * cant;
            }
        }
    });

    // Aplicamos el desperdicio global al total de materiales
    const costoMaterialConDesp = costoTotalMaterial * (1 + desperdicio / 100);

    // Calculamos el Servicio de Corte (usando el precio del primer material de la lista como referencia)
    const matPrincipalNombre = filas[0]?.querySelector('.input-laser-mat')?.value;
    const matPrincipal = window.getGeckoItem(matPrincipalNombre);
    const precioCorteMl = matPrincipal?.precioCorteMl || 7500;
    const costoServicio = metrosManual * precioCorteMl;

    const totalFinal = Math.round(costoMaterialConDesp + costoServicio);

    // AUDITORÃA EN CONSOLA
    console.group("%c GECKO AUDITOR: LÃSER / CNC ", "background: #f15a24; color: white; font-weight: bold; padding: 4px; border-radius: 4px;");
    console.log(`Costo Material Neto: $${costoTotalMaterial.toFixed(2)}`);
    console.log(`Costo + Desperdicio (${desperdicio}%): $${costoMaterialConDesp.toFixed(2)}`);
    console.log(`Costo Servicio (Corte/Min): $${costoServicio.toFixed(2)}`);
    console.log("%c PRECIO VENTA FINAL: " + "$" + totalFinal.toFixed(2), "color: #f15a24; font-weight: bold; font-size: 16px; text-decoration: underline;");
    console.groupEnd();

    // Actualizamos los textos de la interfaz (Resumen)
    const fmt = (m) => '$' + Math.round(m).toLocaleString('es-AR');
    if (document.getElementById('detMaterialBase')) document.getElementById('detMaterialBase').innerText = fmt(costoMaterialConDesp);
    if (document.getElementById('detServicio')) document.getElementById('detServicio').innerText = fmt(costoServicio);
    if (document.getElementById('subtotalEstimado')) document.getElementById('subtotalEstimado').innerText = fmt(totalFinal);

    // Guardamos el resultado para el carrito
    window.itemActualCotizado = {
        tipo: 'laser_cnc',
        textoOpciones: `Láser/CNC: Multifila (${filas.length} ítems)`,
        costo: totalFinal
    };
}

window.agregarFilaLaser = function () {
    const contenedor = document.getElementById('contenedorFilasLaser');
    if (!contenedor) return;

    const div = document.createElement('div');
    div.className = "grid grid-cols-12 gap-4 items-center fila-laser animate-in fade-in slide-in-from-top-1";
    div.innerHTML = `
        <div class="col-span-5">
            <input type="text" list="dlCorte" class="input-laser-mat w-full bg-transparent border-b border-zinc-800 p-2 text-[14px] text-white outline-none focus:border-gecko" 
                oninput="window.calcularCostoCorte()" 
                onfocus="window.prepararLista(this)" 
                onblur="window.restaurarLista(this)"
                placeholder="Seleccionar...">
        </div>
        <div class="col-span-2">
            <input type="number" class="input-laser-ancho w-full bg-transparent border-b border-zinc-800 p-2 text-[14px] text-white text-center outline-none focus:border-gecko" oninput="window.calcularCostoCorte()" placeholder="0">
        </div>
        <div class="col-span-2">
            <input type="number" class="input-laser-alto w-full bg-transparent border-b border-zinc-800 p-2 text-[14px] text-white text-center outline-none focus:border-gecko" oninput="window.calcularCostoCorte()" placeholder="0">
        </div>
        <div class="col-span-2">
            <input type="number" class="input-laser-cant w-full bg-transparent border-b border-zinc-800 p-2 text-[14px] text-white text-center outline-none focus:border-gecko" oninput="window.calcularCostoCorte()" value="1">
        </div>
        <div class="col-span-1 flex justify-center">
            <button onclick="this.closest('.fila-laser').remove(); window.calcularCostoCorte();" class="text-red-500/50 hover:text-red-500 p-2 transition-colors">✕</button>
        </div>
    `;
    contenedor.appendChild(div);
}

