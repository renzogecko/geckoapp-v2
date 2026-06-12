// laser.js — Cotizador Láser / CNC

window.setLaserCncModo = function (modo) {
    window._laserCncModo = modo;
    // Recargar el panel para reflejar el modo
    if (typeof window.cambiarCategoriaCotizador === 'function') {
        window.cambiarCategoriaCotizador('laser_cnc');
    }
};

// ── Agregar fila de acabado / vinilo ─────────────────────────────────────────
window.agregarFilaAcabado = function () {
    const contenedor = document.getElementById('contenedorFilasAcabados');
    if (!contenedor) return;

    // Calcular área total de las piezas para autocompletar
    let areaTotalAuto = 0;
    document.querySelectorAll('.fila-laser').forEach(fila => {
        const ancho = parseFloat(fila.querySelector('.input-laser-ancho')?.value) || 0;
        const alto = parseFloat(fila.querySelector('.input-laser-alto')?.value) || 0;
        const cant = parseInt(fila.querySelector('.input-laser-cant')?.value) || 1;
        areaTotalAuto += (ancho / 100) * (alto / 100) * cant;
    });

    // Opciones de vinilos del inventario
    // Mostrar todo material que pueda usarse como acabado de superficie (vinilo, papel, sticker, etc.)
    // Excluir solo categorías que son claramente materiales de estructura/corte, no de acabado
    const _matsSrc = (window.materiales && window.materiales.length > 0)
        ? window.materiales
        : JSON.parse(localStorage.getItem('gecko_materiales') || '[]');
    const _catExcluidas = ['rigido', 'polifan', 'chapas', '3d', 'electrico', 'metal_madera'];
    const matsVinilo = _matsSrc.filter(m => {
        const cat = (m.categoria || '').toLowerCase().trim();
        // Excluir categorías de estructura/corte que nunca son acabados
        if (_catExcluidas.some(ex => cat === ex || cat.includes(ex))) return false;
        // Excluir si el nombre sugiere que es un material de corte/estructura, no acabado
        const nombre = (m.nombre || '').toLowerCase();
        if (nombre.includes('filamento') || nombre.includes('led ') || nombre.includes('fuente')) return false;
        return true;
    });
    const opcionesVinilo = matsVinilo.map(m =>
        `<option value="${m.nombre}">${m.nombre}</option>`
    ).join('');

    const div = document.createElement('div');
    div.className = 'grid grid-cols-12 gap-2 items-center fila-acabado animate-in fade-in';
    div.innerHTML = `
        <div class="col-span-4">
            <select class="input-acabado-mat gecko-select-pro w-full" onchange="window.calcularCostoCorte()">
                <option value="">Seleccionar vinilo...</option>
                ${opcionesVinilo}
            </select>
        </div>
        <div class="col-span-3 relative">
            <input type="number" min="0" step="0.001"
                class="input-acabado-area w-full bg-zinc-900/40 border border-zinc-700/50 rounded-lg px-2 py-2 text-[13px] text-white text-center outline-none focus:border-gecko"
                value="${areaTotalAuto > 0 ? parseFloat(areaTotalAuto.toFixed(4)) : ''}"
                placeholder="0.0000"
                oninput="this.dataset.manual='true'; window.calcularCostoCorte();"
                onwheel="this.blur()"
                data-auto="${areaTotalAuto > 0 ? areaTotalAuto : 0}"
                data-manual="false"
                title="Área del vinilo en m²">
            <button onclick="
                const autoVal = parseFloat(this.previousElementSibling.dataset.auto) || 0;
                if (autoVal > 0) {
                    this.previousElementSibling.value = parseFloat(autoVal.toFixed(4));
                    this.previousElementSibling.dataset.manual = 'false';
                    window.calcularCostoCorte();
                }"
                class="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-gecko transition-colors"
                title="Restaurar área automática">
                <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
            </button>
        </div>
        <div class="col-span-2">
            <input type="number" min="1" max="100" value="100"
                class="input-acabado-cobertura w-full bg-transparent border-b border-zinc-800 px-1 py-2 text-[13px] text-white text-center outline-none focus:border-gecko"
                oninput="window.calcularCostoCorte()" onwheel="this.blur()">
        </div>
        <div class="col-span-2">
            <input type="number" min="1" value="1"
                class="input-acabado-cant w-full bg-transparent border-b border-zinc-800 px-1 py-2 text-[13px] text-white text-center outline-none focus:border-gecko"
                oninput="window.calcularCostoCorte()" onwheel="this.blur()">
        </div>
        <div class="col-span-1 flex justify-center">
            <button onclick="this.closest('.fila-acabado').remove(); window.calcularCostoCorte();"
                class="w-7 h-7 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;
    contenedor.appendChild(div);
};

// ── Agregar fila de material ──────────────────────────────────────────────────
window.agregarFilaLaser = function () {
    const contenedor = document.getElementById('contenedorFilasLaser');
    if (!contenedor) return;
    const esCnc = (window._laserCncModo || 'laser') === 'cnc';

    const div = document.createElement('div');
    div.className = `grid gap-2 items-center fila-laser animate-in fade-in ${esCnc ? 'grid-cols-12' : 'grid-cols-11'}`;

    // Construir opciones del select con materiales válidos
    const matsCats = ['rigido', 'polifan', 'chapas'];
    const matsValidos = (window.materiales || []).filter(m => matsCats.includes(m.categoria));
    const opcionesSelect = matsValidos.map(m =>
        `<option value="${m.nombre}">${m.nombre}</option>`
    ).join('');

    div.innerHTML = `
        <div class="col-span-3">
            <select class="input-laser-mat gecko-select-pro w-full" onchange="window.calcularCostoCorte()">
                <option value="">Seleccionar material...</option>
                ${opcionesSelect}
            </select>
        </div>
        <div class="col-span-2">
            <input type="number" min="0"
                class="input-laser-ancho w-full bg-transparent border-b border-zinc-800 px-1 py-2 text-[13px] text-white text-center outline-none focus:border-gecko"
                oninput="window.calcularCostoCorte()" placeholder="0" onwheel="this.blur()">
        </div>
        <div class="col-span-2">
            <input type="number" min="0"
                class="input-laser-alto w-full bg-transparent border-b border-zinc-800 px-1 py-2 text-[13px] text-white text-center outline-none focus:border-gecko"
                oninput="window.calcularCostoCorte()" placeholder="0" onwheel="this.blur()">
        </div>
        <div class="col-span-2">
            <input type="number" min="0"
                class="input-laser-perimetro w-full bg-transparent border-b border-zinc-800 px-1 py-2 text-[13px] text-white text-center outline-none focus:border-gecko"
                oninput="window.calcularCostoCorte()" placeholder="0" onwheel="this.blur()">
        </div>
        ${esCnc ? `
        <div class="col-span-1">
            <input type="number" min="1" value="1"
                class="input-laser-pasadas w-full bg-transparent border-b border-zinc-800 px-1 py-2 text-[13px] text-white text-center outline-none focus:border-gecko"
                oninput="window.calcularCostoCorte()" onwheel="this.blur()">
        </div>` : ''}
        <div class="col-span-1">
            <input type="number" min="1" value="1"
                class="input-laser-cant w-full bg-transparent border-b border-zinc-800 px-1 py-2 text-[13px] text-white text-center outline-none focus:border-gecko"
                oninput="window.calcularCostoCorte()" onwheel="this.blur()">
        </div>
        <div class="col-span-1 flex justify-center">
            <button onclick="this.closest('.fila-laser').remove(); window.calcularCostoCorte();"
                class="w-7 h-7 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;
    contenedor.appendChild(div);
};

// ── Función principal de cálculo ──────────────────────────────────────────────
window.calcularCostoCorte = function () {
    const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
    const isGremio = document.getElementById('modoGremioCorte')?.checked || false;
    const esCnc = (window._laserCncModo || 'laser') === 'cnc';
    const desperdicioPct = Math.max(0, parseFloat(document.getElementById('corteDesperdicio')?.value) || 0);
    const extras = parseFloat(document.getElementById('corteExtras')?.value) || 0;

    // Leer laserParams guardados (fuente del $/ML de corte)
    const laserParams = JSON.parse(localStorage.getItem('gecko_laserParams') || '{}');
    const normalizar = str => (str || '').trim().replace(/\s+/g, ' ').toUpperCase();

    // ── Función canónica de precio de material ──────────────────────────────
    // mat.costo ya es el costoUnitarioBase (calculado por recalcularCostoReal según
    // unidadVenta: $/m² o $/unidad), así que el precio de venta es costo × multiplicador.
    const getPrecioMat = (mat) => {
        const costoUnit = parseFloat(mat.costo) || 0;
        const mult = parseFloat(mat.multiplicador) || 2;
        const precioPublico = Math.round(costoUnit * mult);
        const precioGremio = (parseFloat(mat.precioGremio) > 0)
            ? parseFloat(mat.precioGremio)
            : Math.round(costoUnit * (parseFloat(mat.multGremio) || 1.5));
        return isGremio ? precioGremio : precioPublico;
    };

    // ── Lookup de precio de corte $/cm ──────────────────────────────────────
    // laserParams[nombre].precio está en $/ML (metro lineal = 100 cm)
    // Conversión: $/cm = $/ML ÷ 100
    const getPrecioCorte = (matNombre) => {
        const nombreNorm = normalizar(matNombre);
        const palabras = nombreNorm.split(/[\s\-–]+/).filter(p => p.length > 1);
        const params = laserParams[matNombre]
            || laserParams[nombreNorm]
            || Object.entries(laserParams).find(([k]) => normalizar(k) === nombreNorm)?.[1]
            || Object.entries(laserParams).find(([k]) => {
                const kNorm = normalizar(k);
                return palabras.every(p => kNorm.includes(p));
            })?.[1];
        // También usar mat.cortePrecioML como fallback directo del objeto material
        if (!params || !params.precio) {
            const mat = (window.materiales || []).find(m => normalizar(m.nombre) === nombreNorm);
            const mlFallback = parseFloat(mat?.cortePrecioML) || 0;
            return mlFallback / 100; // $/ML → $/cm
        }
        return (parseFloat(params.precio) || 0) / 100; // $/ML → $/cm
    };

    let totalMaterial = 0;
    let totalCorte = 0;
    const auditLineas = [];

    document.querySelectorAll('.fila-laser').forEach((fila) => {
        const matNombre = fila.querySelector('.input-laser-mat')?.value?.trim();
        const ancho = parseFloat(fila.querySelector('.input-laser-ancho')?.value) || 0;
        const alto = parseFloat(fila.querySelector('.input-laser-alto')?.value) || 0;
        const perimetro = parseFloat(fila.querySelector('.input-laser-perimetro')?.value) || 0;
        const cant = parseInt(fila.querySelector('.input-laser-cant')?.value) || 1;
        const pasadas = esCnc ? (parseInt(fila.querySelector('.input-laser-pasadas')?.value) || 1) : 1;

        if (!matNombre || ancho <= 0 || alto <= 0) return;

        const mat = (window.materiales || []).find(m => normalizar(m.nombre) === normalizar(matNombre));
        if (!mat) return;

        // Precio por m² según estrategia y modo público/gremio
        const precioM2 = getPrecioMat(mat);

        // Costo del material: área × precio/m² × cantidad
        const areaM2 = (ancho / 100) * (alto / 100);
        const costoMatUnit = areaM2 * precioM2;           // por 1 pieza
        const costoMatTotal = costoMatUnit * cant;

        // Costo de corte: perímetro (cm) × precio/cm × pasadas × cantidad
        const precioXcm = getPrecioCorte(matNombre);
        const costoCorteUnit = perimetro * precioXcm * pasadas;  // por 1 pieza
        const costoCorteTotal = costoCorteUnit * cant;

        totalMaterial += costoMatTotal;
        totalCorte += costoCorteTotal;

        // ── Auditor: línea clara y verificable ────────────────────────────
        const precioMLDisplay = Math.round(precioXcm * 100); // mostrar en $/ML para referencia
        const corteInfo = perimetro > 0
            ? `Corte: ${perimetro}cm × ${fmt(precioXcm)}/cm (${fmt(precioMLDisplay)}/ML)${pasadas > 1 ? ` × ${pasadas} pas.` : ''} = ${fmt(costoCorteUnit)}/u`
            : 'Sin corte (sin perímetro)';

        auditLineas.push({
            mat: matNombre,
            cant,
            texto: `${matNombre} | ${ancho}×${alto}cm | Área: ${areaM2.toFixed(4)}m² × ${fmt(precioM2)}/m² = ${fmt(costoMatUnit)}/u | ${corteInfo} | ×${cant} piezas = ${fmt(costoMatTotal + costoCorteTotal)}`
        });
    });

    // Calcular acabados / vinilos (si el toggle está activo)
    let totalAcabados = 0;
    const auditAcabados = [];
    const switchAcabados = document.getElementById('switch-acabados-laser');
    if (switchAcabados?.checked) {
        document.querySelectorAll('.fila-acabado').forEach(fila => {
            const matNombre = fila.querySelector('.input-acabado-mat')?.value?.trim();
            const area = parseFloat(fila.querySelector('.input-acabado-area')?.value) || 0;
            const cobertura = parseFloat(fila.querySelector('.input-acabado-cobertura')?.value) || 100;
            const cant = parseInt(fila.querySelector('.input-acabado-cant')?.value) || 1;
            if (!matNombre || area <= 0) return;
            const matV = (window.materiales || []).find(m => normalizar(m.nombre) === normalizar(matNombre));
            if (!matV) return;
            // Mismo sistema de precio que rígidos: costo × multiplicador
            const precioM2 = getPrecioMat(matV);
            const areaEfectiva = area * (cobertura / 100);
            const costoFilaUnit = areaEfectiva * precioM2;
            const costoFila = costoFilaUnit * cant;
            totalAcabados += costoFila;
            auditAcabados.push(
                `Acabado: ${matNombre} | ${areaEfectiva.toFixed(4)}m² × ${fmt(precioM2)}/m²${cant > 1 ? ` × ${cant}` : ''} = ${fmt(costoFila)}`
            );
        });
    }

    // Aplicar desperdicio solo al material (si > 0)
    const costoMatConDesp = desperdicioPct > 0
        ? totalMaterial * (1 + desperdicioPct / 100)
        : totalMaterial;
    const totalFinal = Math.round(costoMatConDesp + totalCorte + totalAcabados + extras);

    // Actualizar footer
    if (document.getElementById('detMaterialBase'))
        document.getElementById('detMaterialBase').innerText = fmt(costoMatConDesp);
    if (document.getElementById('detServicio'))
        document.getElementById('detServicio').innerText = fmt(totalCorte);
    if (document.getElementById('detTerminaciones'))
        document.getElementById('detTerminaciones').innerText = totalAcabados > 0 ? fmt(totalAcabados) : (extras > 0 ? fmt(extras) : '$0');
    if (document.getElementById('subtotalEstimado'))
        document.getElementById('subtotalEstimado').innerText = fmt(totalFinal);

    // Auditor por fila — piezas + acabados
    const auditorContainer = document.getElementById('auditorLaserContainer');
    if (auditorContainer) {
        const todasLasLineas = [
            ...auditLineas.map(l => ({ texto: l.texto, tipo: 'pieza' })),
            ...auditAcabados.map(t => ({ texto: t, tipo: 'acabado' }))
        ];
        if (todasLasLineas.length > 0) {
            auditorContainer.innerHTML = todasLasLineas.map(l => `
                <div class="px-4 py-2.5 rounded-xl border ${l.tipo === 'acabado'
                    ? 'bg-indigo-950/30 border-indigo-800/30'
                    : 'bg-zinc-900/60 border-zinc-800/50'}">
                    <p class="text-[10px] ${l.tipo === 'acabado' ? 'text-indigo-300' : 'text-zinc-400'} font-mono leading-relaxed">${l.texto}</p>
                </div>
            `).join('');
        } else {
            auditorContainer.innerHTML = '<p class="text-[11px] text-zinc-600 text-center py-3">Completá las filas para ver el desglose</p>';
        }
    }

    // Actualizar etiquetas del panel derecho (contenedorResumenGrafica)
    // Buscar en el contenedor correcto para evitar colisión con el #detServicio del panel textil
    const resumenPanel = document.getElementById('contenedorResumenGrafica');
    if (resumenPanel) {
        const labelServFooter = resumenPanel.querySelector('#detServicio')?.previousElementSibling;
        const labelExtraFooter = resumenPanel.querySelector('#detTerminaciones')?.previousElementSibling;
        if (labelServFooter) labelServFooter.textContent = 'Servicio de corte';
        if (labelExtraFooter) labelExtraFooter.textContent = totalAcabados > 0 ? 'Acabados / Vinilos' : 'Extras';
    }

    // Guardar para carrito
    const nombre = document.getElementById('corteNombre')?.value?.trim() || 'Trabajo Láser/CNC';
    window.itemActualCotizado = {
        tipo: 'laser_cnc',
        textoOpciones: nombre,
        costo: totalFinal,
        otDetalle: auditLineas.map(l => l.texto).join(' | ')
    };

    // Mostrar / ocultar botón añadir
    const btnExistente = document.getElementById('btnAnadirLaser');
    if (!btnExistente) {
        const panelConf = document.getElementById('panelConfigurador');
        if (panelConf) {
            const btnWrap = document.createElement('div');
            btnWrap.id = 'btnAnadirLaser';
            btnWrap.className = 'mt-4';
            // Usar id="btnConfirmarItem" para que agregarItemAlCarritoUI() lo encuentre
            btnWrap.innerHTML = `
                <button id="btnConfirmarItem" onclick="window.agregarItemAlCarritoUI()"
                    class="w-full py-3 rounded-2xl text-white font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style="background:#f15a24;box-shadow:0 4px 16px rgba(241,90,36,0.3);">
                    + Añadir a Cotización
                </button>`;
            panelConf.appendChild(btnWrap);
        }
    }
};
