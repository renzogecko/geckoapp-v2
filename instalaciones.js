window.renderInstalacion = function () {
    const panel = document.getElementById('panelConfigurador');
    if (!panel) return;
    panel.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-1">
            <div class="card-gecko">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja mb-2">01. Datos del trabajo</p>
                <input type="text" id="instNombre" oninput="window.calcularInstalacion()" placeholder="Ej: Instalación cartel local X"
                    class="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gecko transition-all">
            </div>

            <div class="card-gecko space-y-2">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">02. Personal y horas</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Cantidad de empleados</label>
                        <input type="number" id="instEmpleados" class="gecko-input w-full" placeholder="0" oninput="window.calcularInstalacion()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Horas de trabajo</label>
                        <input type="number" id="instHoras" class="gecko-input w-full" placeholder="0" oninput="window.calcularInstalacion()">
                    </div>
                </div>
            </div>

            <div class="card-gecko space-y-2">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">03. Gastos extra</p>
                <div id="filasExtraInstalacion" class="space-y-2"></div>
                <button type="button" onclick="window.agregarFilaExtraInstalacion()"
                    class="w-full py-2 mt-2 rounded-xl border border-dashed border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:border-gecko hover:text-gecko transition-all">
                    + Agregar gasto extra
                </button>
            </div>

            <div class="card-gecko space-y-2">
                <div class="seccion-switch-gecko">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja mb-2">04. Instalación fuera de La Plata</p>
                    <div class="switch-row" onclick="document.getElementById('chkInstFueraLaPlata').click()">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-orange-950/30 rounded-xl flex items-center justify-center border border-orange-900/30">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gecko" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-[11px] font-black text-white uppercase tracking-wider">¿Es fuera de La Plata?</p>
                                <p class="text-[9px] font-bold text-zinc-500 uppercase">Combustible, viáticos y peajes</p>
                            </div>
                        </div>
                        <label class="switch-gecko" onclick="event.stopPropagation()">
                            <input type="checkbox" id="chkInstFueraLaPlata" onchange="window.toggleInstalacionFuera()">
                            <span class="slider-gecko"></span>
                        </label>
                    </div>
                    <div id="detallesInstalacionFuera" class="hidden mt-6 space-y-3 pt-4 border-t border-zinc-800/50">
                        <div>
                            <label class="block text-[11px] text-zinc-400 mb-1">Kilómetros (un tramo — se duplica solo para ida y vuelta)</label>
                            <input type="number" id="instKm" class="gecko-input w-full" placeholder="0" oninput="window.calcularInstalacion()">
                        </div>
                        <div>
                            <label class="block text-[11px] text-zinc-400 mb-1">Viáticos ($)</label>
                            <input type="number" id="instViaticos" class="gecko-input w-full" placeholder="0" oninput="window.calcularInstalacion()">
                        </div>
                        <div>
                            <label class="block text-[11px] text-zinc-400 mb-1">Peajes ($)</label>
                            <input type="number" id="instPeajes" class="gecko-input w-full" placeholder="0" oninput="window.calcularInstalacion()">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    window.calcularInstalacion();
};

window.agregarFilaExtraInstalacion = function () {
    const cont = document.getElementById('filasExtraInstalacion');
    if (!cont) return;
    const rowId = 'extraInst_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'grid grid-cols-12 gap-2 items-center';
    row.innerHTML = `
        <div class="col-span-7">
            <input type="text" class="input-extra-desc gecko-input w-full" placeholder="Descripción (ej: mecha, embellecedores)" oninput="window.calcularInstalacion()">
        </div>
        <div class="col-span-4">
            <input type="number" class="input-extra-monto gecko-input w-full" placeholder="$ 0" oninput="window.calcularInstalacion()">
        </div>
        <div class="col-span-1 text-center">
            <button type="button" onclick="window.eliminarFilaExtraInstalacion('${rowId}')" class="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
        </div>`;
    cont.appendChild(row);
    window.calcularInstalacion();
};

window.eliminarFilaExtraInstalacion = function (rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    window.calcularInstalacion();
};

window.toggleInstalacionFuera = function () {
    const chk = document.getElementById('chkInstFueraLaPlata');
    const wrapper = document.getElementById('detallesInstalacionFuera');
    if (wrapper) wrapper.classList.toggle('hidden', !chk.checked);
    window.calcularInstalacion();
};

window.calcularInstalacion = function () {
    const nombre = document.getElementById('instNombre')?.value || 'Instalación';
    const empleados = parseFloat(document.getElementById('instEmpleados')?.value) || 0;
    const horas = parseFloat(document.getElementById('instHoras')?.value) || 0;

    const settings = JSON.parse(localStorage.getItem('GECKO_SETTINGS') || '{}');
    const valorHoraHombre = parseFloat(settings.valorHoraHombre) || 0;
    const costoManoObra = empleados * horas * valorHoraHombre;

    const filasExtra = [];
    document.querySelectorAll('#filasExtraInstalacion > div').forEach(function (row) {
        const desc = row.querySelector('.input-extra-desc')?.value?.trim() || '';
        const monto = parseFloat(row.querySelector('.input-extra-monto')?.value) || 0;
        if (desc && monto > 0) filasExtra.push({ desc: desc, monto: monto });
    });
    const costoExtras = filasExtra.reduce(function (acc, f) { return acc + f.monto; }, 0);

    const fueraActivo = document.getElementById('chkInstFueraLaPlata')?.checked;
    let kmTotales = 0, costoCombustible = 0, viaticos = 0, peajes = 0, precioKm = 0;
    if (fueraActivo) {
        const kmTramo = parseFloat(document.getElementById('instKm')?.value) || 0;
        kmTotales = kmTramo * 2;
        precioKm = parseFloat(settings.precioKm) || 0;
        costoCombustible = kmTotales * precioKm;
        viaticos = parseFloat(document.getElementById('instViaticos')?.value) || 0;
        peajes = parseFloat(document.getElementById('instPeajes')?.value) || 0;
    }
    const costoTraslado = costoCombustible + viaticos + peajes;

    const totalFinal = Math.round(costoManoObra + costoExtras + costoTraslado);

    const fmtVal = v => '$' + Math.round(v).toLocaleString('es-AR');
    const lineaRow = (label, detalle, valor) => `
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid #1f1f23;">
            <div style="flex:1;min-width:0;">
                <span style="color:#F15A24;font-size:10px;margin-right:6px;">•</span>
                <span style="color:#d4d4d8;font-size:12px;font-weight:700;">${label}</span>
                ${detalle ? `<span style="display:block;color:#71717a;font-size:10px;margin-left:16px;margin-top:2px;">${detalle}</span>` : ''}
            </div>
            <span style="color:white;font-size:13px;font-weight:900;font-family:monospace;margin-left:12px;white-space:nowrap;">${fmtVal(valor)}</span>
        </div>`;
    const seccion = titulo => `<p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#71717a;margin:14px 0 6px;">${titulo}</p>`;

    let html = '';
    const hayDatos = costoManoObra > 0 || costoExtras > 0 || costoTraslado > 0;
    if (hayDatos) {
        if (costoManoObra > 0) {
            html += seccion('Mano de obra');
            html += lineaRow('Instalación', `${empleados} empleado(s) × ${horas}hs × ${fmtVal(valorHoraHombre)}/hs`, costoManoObra);
        } else if (empleados > 0 || horas > 0) {
            html += seccion('Mano de obra');
            html += `<p style="color:#ef4444;font-size:11px;font-weight:700;">⚠️ FALTA PARÁMETRO: Hora Hombre en Configuración está en $0</p>`;
        }
        if (filasExtra.length > 0) {
            html += seccion('Gastos extra');
            filasExtra.forEach(function (f) { html += lineaRow(f.desc, '', f.monto); });
        }
        if (fueraActivo && costoTraslado > 0) {
            html += seccion('Traslado (fuera de La Plata)');
            if (costoCombustible > 0) html += lineaRow('Combustible', `${kmTotales}km × ${fmtVal(precioKm)}/km`, costoCombustible);
            if (viaticos > 0) html += lineaRow('Viáticos', '', viaticos);
            if (peajes > 0) html += lineaRow('Peajes', '', peajes);
        }
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 4px;margin-top:6px;border-top:1px solid #27272a;">
            <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#a1a1aa;">Total del ítem</span>
            <span style="font-size:20px;font-weight:900;color:#F15A24;font-family:monospace;">${fmtVal(totalFinal)}</span>
        </div>`;
    }

    const panelConf = document.getElementById('panelConfigurador');
    let auditorWrap = document.getElementById('geckoAuditorInstalacion');
    if (!auditorWrap && panelConf) {
        auditorWrap = document.createElement('div');
        auditorWrap.id = 'geckoAuditorInstalacion';
        auditorWrap.style.marginTop = '12px';
        panelConf.appendChild(auditorWrap);
    }
    if (auditorWrap) {
        auditorWrap.innerHTML = hayDatos
            ? `<div class="card-gecko" style="margin-top:0;"><p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 14px;">Auditor de cálculo</p>${html}</div>`
            : `<div class="card-gecko" style="margin-top:0;"><p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 10px;">Auditor de cálculo</p><p style="font-size:11px;color:#52525b;text-align:center;padding:8px 0;">Completá los campos para ver el desglose</p></div>`;
    }

    let btnWrap = document.getElementById('btnAnadirInstalacion');
    if (!btnWrap && panelConf) {
        btnWrap = document.createElement('div');
        btnWrap.id = 'btnAnadirInstalacion';
        btnWrap.style.marginTop = '12px';
        panelConf.appendChild(btnWrap);
    }
    if (btnWrap) {
        btnWrap.innerHTML = `<button onclick="window.addInstalacionAlPresupuesto()"
            class="w-full py-3 rounded-2xl text-white font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
            style="background:#f15a24;box-shadow:0 4px 16px rgba(241,90,36,0.3);">
            + Añadir a Cotización
        </button>`;
    }

    const descTraslado = fueraActivo ? ` | Traslado: ${kmTotales}km, combustible ${fmtVal(costoCombustible)}, peajes ${fmtVal(peajes)}, viáticos ${fmtVal(viaticos)}` : '';
    window.itemActualInstalacion = {
        tipo: 'instalacion',
        nombre: nombre,
        textoOpciones: `Instalación: ${empleados} pers. × ${horas}hs${fueraActivo ? ' + traslado' : ''}`,
        costo: totalFinal,
        otDetalle: `Instalación con ${empleados} persona(s), ${horas}hs${descTraslado}`
    };
};

window.addInstalacionAlPresupuesto = function () {
    if (!window.itemActualInstalacion || window.itemActualInstalacion.costo <= 0) {
        window.calcularInstalacion();
    }
    if (!window.itemActualInstalacion || window.itemActualInstalacion.costo <= 0) {
        alert("Completá los datos de la instalación antes de añadir.");
        return;
    }
    const item = {
        id: Date.now(),
        tipo: 'instalacion',
        nombre: window.itemActualInstalacion.nombre,
        textoOpciones: window.itemActualInstalacion.textoOpciones,
        costo: window.itemActualInstalacion.costo,
        otDetalle: window.itemActualInstalacion.otDetalle,
        modoCalculo: localStorage.getItem('globalEstimationMode') || 'simple'
    };
    if (typeof window.agregarItemAlPresupuesto === 'function') {
        window.agregarItemAlPresupuesto(item);
        if (typeof window.mostrarExito === 'function') {
            window.mostrarExito("Ítem añadido al presupuesto", "¡Listo!");
        }
        window.itemActualInstalacion = null;
    } else {
        console.error("agregarItemAlPresupuesto no encontrada");
    }
};
