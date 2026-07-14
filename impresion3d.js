// impresion3d.js - Módulo extraído

window.agregarFilaPintura3D = function () {
    const cont = document.getElementById('filasPintura3D');
    if (!cont) return;
    const rowId = 'pint3d_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const mats = (window.materiales || []).filter(m => {
        const cat = (m.categoria || '').toLowerCase().trim();
        return cat === 'pintura' || cat === 'base';
    });
    const opciones = mats.length > 0
        ? mats.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('')
        : '<option value="">Sin materiales de Pintura/Base cargados</option>';
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'grid grid-cols-12 gap-2 items-center';
    row.innerHTML = `
        <div class="col-span-6">
            <select class="input-pintura3d-mat gecko-select-pro w-full" onchange="window.calcularCosto3D()">
                <option value="">Seleccionar material...</option>
                ${opciones}
            </select>
        </div>
        <div class="col-span-5">
            <input type="text" class="input-pintura3d-codigo gecko-input w-full" placeholder="Código de color (manual)" oninput="window.calcularCosto3D()">
        </div>
        <div class="col-span-1 text-center">
            <button type="button" onclick="window.eliminarFilaPintura3D('${rowId}')" class="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
        </div>
    `;
    cont.appendChild(row);
    window.calcularCosto3D();
};

window.eliminarFilaPintura3D = function (rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    window.calcularCosto3D();
};

window.togglePintura3D = function () {
    const chk = document.getElementById('chkLlevaPintura3D');
    const wrapper = document.getElementById('detallesPintura3D');
    if (wrapper) wrapper.classList.toggle('hidden', !chk.checked);
    if (chk.checked) {
        const cont = document.getElementById('filasPintura3D');
        if (cont && cont.children.length === 0) {
            window.agregarFilaPintura3D();
        }
    }
    window.calcularCosto3D();
};

window.calcularCosto3D = function () {
    const gramos = parseFloat(document.getElementById('preciso3dPeso')?.value) || 0;
    const horas = parseFloat(document.getElementById('preciso3dTiempo')?.value) || 0;

    const materiales = window.materiales || [];
    const settings = window.GECKO_SETTINGS || {};
    const cotiz = settings.cotizacionDolar || 1415;
    const multGlobal = settings.multiplicadorGlobal || 2.0;
    const costoHora3D = parseFloat(settings.costoHora3D) || 2500;

    const selMat = document.getElementById('preciso3dMaterial');
    const nombreMat = selMat?.options[selMat.selectedIndex]?.text;

    // Usar getGeckoItem() como lookup canónico de precio (incluye precioVenta guardado)
    const itemMat = (nombreMat && typeof window.getGeckoItem === 'function') ? window.getGeckoItem(nombreMat) : null;
    const precioVentaGr = itemMat ? (parseFloat(itemMat.precioVenta) || 0) : 0;

    const costoMaterial = gramos * precioVentaGr;
    const costoServicio = horas * costoHora3D;

    // Acabado de pintura — área estimada a partir del peso
    const factorAreaPintura = parseFloat(settings.factorAreaPintura3D) || 0.00025;
    const areaEstimadaPintura = gramos * factorAreaPintura;
    const filasPintura = [];
    const pintura3DActiva = document.getElementById('chkLlevaPintura3D')?.checked;
    if (pintura3DActiva) {
        document.querySelectorAll('#filasPintura3D > div').forEach(function (row) {
            const selMat = row.querySelector('.input-pintura3d-mat');
            const inpCodigo = row.querySelector('.input-pintura3d-codigo');
            const matId = selMat ? selMat.value : '';
            if (!matId) return;
            const matObj = (window.materiales || []).find(function (m) { return String(m.id) === String(matId); });
            if (!matObj) return;
            const precioM2 = parseFloat(matObj.precioVenta || matObj.costo || 0);
            const codigo = inpCodigo ? inpCodigo.value.trim() : '';
            const valorFila = Math.round(areaEstimadaPintura * precioM2);
            filasPintura.push({ nombre: matObj.nombre, codigo: codigo, valor: valorFila });
        });
    }
    const costoPinturaTotal = filasPintura.reduce(function (acc, f) { return acc + f.valor; }, 0);

    const totalFinal = Math.round(costoMaterial + costoServicio + costoPinturaTotal);

    const fmt = (v) => '$' + Math.round(v).toLocaleString('es-AR');
    if (document.getElementById('subtotalEstimado')) document.getElementById('subtotalEstimado').innerText = fmt(totalFinal);

    const descPintura = filasPintura.length > 0
        ? ' | Pintura: ' + filasPintura.map(function (f) { return f.nombre + (f.codigo ? ' (' + f.codigo + ')' : ''); }).join(', ')
        : '';
    window.itemActual3D = {
        tipo: '3d',
        textoOpciones: `Impresión 3D Técnica: ${nombreMat} (${gramos}gr)`,
        identificacion: document.getElementById('3dNombre')?.value?.trim() || '',
        costo: totalFinal,
        otDetalle: `Peso: ${gramos}gr | Tiempo: ${horas}hs | Material: ${nombreMat}${descPintura}`
    };
    window.itemActualCotizado = window.itemActual3D;

    // ── Auditor + botón ───────────────────────────────────────────────────────
    const panelConf3D = document.getElementById('panelConfigurador');
    let auditorWrap = document.getElementById('geckoAuditor3D');
    if (!auditorWrap && panelConf3D) {
        auditorWrap = document.createElement('div');
        auditorWrap.id = 'geckoAuditor3D';
        auditorWrap.style.marginTop = '0';
        panelConf3D.appendChild(auditorWrap);
    }
    let btn3DWrap = document.getElementById('btn3DAnadir');
    if (!btn3DWrap && panelConf3D) {
        btn3DWrap = document.createElement('div');
        btn3DWrap.id = 'btn3DAnadir';
        btn3DWrap.style.marginTop = '12px';
        btn3DWrap.innerHTML = `<button id="btnConfirmarItem" onclick="window.agregarItemAlCarritoUI()" class="w-full py-3 bg-[#f15a24] text-white rounded-2xl font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all active:scale-[0.98]">+ AÑADIR A COTIZACIÓN</button>`;
        panelConf3D.appendChild(btn3DWrap);
    }
    if (auditorWrap) {
        const lineaRow = (label, detalle, valor) => `
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid #1f1f23;">
                <div style="flex:1;min-width:0;">
                    <span style="color:#F15A24;font-size:10px;margin-right:6px;">•</span>
                    <span style="color:#d4d4d8;font-size:12px;font-weight:700;">${label}</span>
                    ${detalle ? `<span style="display:block;color:#71717a;font-size:10px;margin-left:16px;margin-top:2px;">${detalle}</span>` : ''}
                </div>
                <span style="color:white;font-size:13px;font-weight:900;font-family:monospace;margin-left:12px;white-space:nowrap;">${fmt(valor)}</span>
            </div>`;
        const seccion = titulo =>
            `<p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#71717a;margin:14px 0 6px;">${titulo}</p>`;

        // Siempre mostrar ambas zonas — precio de referencia visible aunque los campos estén en 0
        let html = '';
        html += seccion('Material');
        html += lineaRow(
            nombreMat || 'Sin filamento cargado',
            gramos > 0 ? `${gramos}gr × ${fmt(precioVentaGr)}/gr` : `${fmt(precioVentaGr)}/gr (precio de referencia)`,
            costoMaterial
        );
        html += seccion('Servicio de impresión');
        html += lineaRow(
            'Tiempo máquina',
            horas > 0 ? `${horas}hs × ${fmt(costoHora3D)}/hs` : `${fmt(costoHora3D)}/hs (precio de referencia)`,
            costoServicio
        );
        if (filasPintura.length > 0) {
            html += seccion('Acabado de pintura');
            filasPintura.forEach(function (f) {
                html += lineaRow(
                    f.nombre + (f.codigo ? ' (' + f.codigo + ')' : ''),
                    `${areaEstimadaPintura.toFixed(3)}m² (estimado) × ${fmt(0)}`.replace(fmt(0), fmt(f.valor / (areaEstimadaPintura || 1))),
                    f.valor
                );
            });
        }
        if (totalFinal > 0) {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 4px;margin-top:6px;border-top:1px solid #27272a;">
                <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#a1a1aa;">Total del ítem</span>
                <span style="font-size:20px;font-weight:900;color:#F15A24;font-family:monospace;">${fmt(totalFinal)}</span>
            </div>`;
        }
        auditorWrap.innerHTML = `
            <div class="card-gecko" style="margin-top:0;">
                <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 14px;">Auditor de cálculo</p>
                ${html}
            </div>`;
    }
}

