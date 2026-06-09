// laser.js — Cotizador Láser / CNC

window.setLaserCncModo = function (modo) {
    window._laserCncModo = modo;
    // Recargar el panel para reflejar el modo
    if (typeof window.cambiarCategoriaCotizador === 'function') {
        window.cambiarCategoriaCotizador('laser_cnc');
    }
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

    // Leer laserParams guardados
    const laserParams = JSON.parse(localStorage.getItem('gecko_laserParams') || '{}');
    const normalizar = str => str.trim().replace(/\s+/g, ' ').toUpperCase();

    let totalMaterial = 0;
    let totalCorte = 0;
    const auditLineas = [];

    const filas = document.querySelectorAll('.fila-laser');

    filas.forEach((fila, idx) => {
        const matNombre = fila.querySelector('.input-laser-mat')?.value?.trim();
        const ancho = parseFloat(fila.querySelector('.input-laser-ancho')?.value) || 0;
        const alto = parseFloat(fila.querySelector('.input-laser-alto')?.value) || 0;
        const perimetro = parseFloat(fila.querySelector('.input-laser-perimetro')?.value) || 0;
        const cant = parseInt(fila.querySelector('.input-laser-cant')?.value) || 1;
        const pasadas = esCnc ? (parseInt(fila.querySelector('.input-laser-pasadas')?.value) || 1) : 1;

        if (!matNombre || ancho <= 0 || alto <= 0) return;

        const mat = (window.materiales || []).find(m => normalizar(m.nombre) === normalizar(matNombre));
        if (!mat) return;

        // Precio del material: público o gremio
        const precioM2 = isGremio && mat.precioGremio > 0 ? mat.precioGremio : (mat.precioVenta || mat.costo * (mat.multiplicador || 2));

        // Costo material por fila
        const areaM2 = (ancho / 100) * (alto / 100);
        const costoMat = areaM2 * precioM2 * cant;

        // Precio de corte desde laserParams
        const nombreNorm = normalizar(matNombre);
        const params = laserParams[matNombre] || laserParams[nombreNorm] ||
            Object.entries(laserParams).find(([k]) => normalizar(k) === nombreNorm)?.[1] || {};
        const precioML = params.precio || 0; // precio por metro lineal (en ARS/m)
        const precioXcm = precioML / 100;    // convertir a ARS/cm

        // Costo corte por fila (perímetro en cm × precio/cm × pasadas × cantidad)
        const costoCorte = perimetro * precioXcm * pasadas * cant;

        totalMaterial += costoMat;
        totalCorte += costoCorte;

        // Línea del auditor
        const areaFmt = (areaM2).toFixed(4);
        const corteInfo = perimetro > 0
            ? `Corte: ${perimetro}cm × ${fmt(precioXcm)}/cm${pasadas > 1 ? ` × ${pasadas} pasadas` : ''} = ${fmt(costoCorte / cant)}`
            : 'Sin corte';
        auditLineas.push({
            mat: matNombre,
            cant,
            texto: `${matNombre} | Área: ${areaFmt}m² × ${fmt(precioM2)}/m² = ${fmt(costoMat / cant)} | ${corteInfo} | ×${cant} = ${fmt(costoMat + costoCorte)}`
        });
    });

    // Aplicar desperdicio solo al material (si > 0)
    const costoMatConDesp = desperdicioPct > 0
        ? totalMaterial * (1 + desperdicioPct / 100)
        : totalMaterial;
    const totalFinal = Math.round(costoMatConDesp + totalCorte + extras);

    // Actualizar footer
    if (document.getElementById('detMaterialBase'))
        document.getElementById('detMaterialBase').innerText = fmt(costoMatConDesp);
    if (document.getElementById('detServicio'))
        document.getElementById('detServicio').innerText = fmt(totalCorte);
    if (document.getElementById('detTerminaciones'))
        document.getElementById('detTerminaciones').innerText = extras > 0 ? fmt(extras) : '$ 0';
    if (document.getElementById('subtotalEstimado'))
        document.getElementById('subtotalEstimado').innerText = fmt(totalFinal);

    // Auditor por fila
    const auditorContainer = document.getElementById('auditorLaserContainer');
    if (auditorContainer) {
        if (auditLineas.length > 0) {
            auditorContainer.innerHTML = auditLineas.map(l => `
                <div class="px-4 py-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/50">
                    <p class="text-[10px] text-zinc-400 font-mono leading-relaxed">${l.texto}</p>
                </div>
            `).join('');
        } else {
            auditorContainer.innerHTML = '';
        }
    }

    // Actualizar etiquetas del panel derecho para contexto láser
    const labelMat = document.querySelector('#contenedorResumenGrafica .flex:nth-child(2) span:first-child');
    const labelServ = document.querySelector('#contenedorResumenGrafica .flex:nth-child(3) span:first-child');
    const labelExtra = document.querySelector('#contenedorResumenGrafica .flex:nth-child(4) span:first-child');
    if (labelMat) labelMat.textContent = 'Material base';
    if (labelServ) labelServ.textContent = 'Servicio de corte';
    if (labelExtra) labelExtra.textContent = extras > 0 ? 'Extras / Adicionales' : 'Extras / Adicionales';

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
