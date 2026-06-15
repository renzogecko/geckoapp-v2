// bastidores.js - Módulo extraído

window.calcularCostoBastidores = function () {
    const filas = document.querySelectorAll('.fila-bastidor');
    const materialCodigo = document.getElementById('bastidorMaterial')?.value || '';
    const llevaRevest = document.getElementById('bastidorRevestimientoCheck')?.checked || false;
    const materialRevest = document.getElementById('bastidorRevestimientoMaterial')?.value || '';

    const divExtra = document.getElementById('bastidorRevestimientoExtra');
    if (divExtra) divExtra.style.display = llevaRevest ? 'block' : 'none';

    // FIX 1: Siempre limpiar y repoblar el selector desde inventario (cat: metal_madera)
    const selMat = document.getElementById('bastidorMaterial');
    if (selMat) {
        const valorActual = selMat.value;
        const matsEstructura = (window.materiales || [])
            .filter(m => (m.categoria || '').toLowerCase().trim() === 'metal_madera')
            .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        selMat.innerHTML = '<option value="">Seleccionar material...</option>' +
            matsEstructura.map(m => {
                const val = m.id || m.nombre;
                return `<option value="${val}" ${val == valorActual ? 'selected' : ''}>${m.nombre}</option>`;
            }).join('');
    }

    let metrosLinealesTotales = 0;
    let costoRevestimientoTotalNeto = 0;
    let detalleItems = [];

    filas.forEach(fila => {
        const ancho = parseFloat(fila.querySelector('.input-ancho')?.value) || 0;
        const alto = parseFloat(fila.querySelector('.input-alto')?.value) || 0;
        const cant = parseInt(fila.querySelector('.input-cantidad')?.value) || 1;

        if (ancho > 0 && alto > 0 && cant > 0) {
            // REGLAS FINALES DE INGENIERÍA:
            // Verticales: Si Ancho > 100cm, cada ~80cm
            const refAncho = ancho > 100 ? (Math.ceil(ancho / 80) - 1) : 0;

            // Horizontales: Trigger >= 140cm, espacios <= 100cm
            const refAlto = alto >= 140 ? (Math.ceil(alto / 100) - 1) : 0;

            const mlFila = ((ancho * 2) + (alto * 2) + (refAncho * alto) + (refAlto * ancho)) / 100;
            metrosLinealesTotales += mlFila * cant;
            detalleItems.push(`${cant} un. ${ancho}x${alto}cm`);
        }
    });

    if (metrosLinealesTotales === 0) {
        const subtotalElEmpty = document.getElementById('subtotalEstimado');
        if (subtotalElEmpty) subtotalElEmpty.innerText = '$0';
        window.itemActualCotizado = { tipo: 'bastidores', textoOpciones: 'Estructura (sin datos)', costo: 0, otDetalle: 'Faltan datos: cargar medidas' };

        const panelConfEmpty = document.getElementById('panelConfigurador');
        if (panelConfEmpty) {
            let auditorWrapEmpty = document.getElementById('geckoAuditorBastidores');
            if (!auditorWrapEmpty) {
                auditorWrapEmpty = document.createElement('div');
                auditorWrapEmpty.id = 'geckoAuditorBastidores';
                auditorWrapEmpty.style.marginTop = '20px';
                panelConfEmpty.appendChild(auditorWrapEmpty);
            }
            auditorWrapEmpty.innerHTML = `
                <div class="card-gecko" style="margin-top:0;">
                    <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 10px;">Auditor de cálculo</p>
                    <p style="font-size:11px;color:#52525b;text-align:center;padding:8px 0;">Completá los campos para ver el desglose</p>
                </div>`;

            let btnWrapEmpty = document.getElementById('btnAnadirBastidores');
            if (!btnWrapEmpty) {
                btnWrapEmpty = document.createElement('div');
                btnWrapEmpty.id = 'btnAnadirBastidores';
                btnWrapEmpty.style.marginTop = '12px';
                panelConfEmpty.appendChild(btnWrapEmpty);
            }
            btnWrapEmpty.innerHTML = `
                <button id="btnConfirmarItem" onclick="window.agregarItemAlCarritoUI()"
                    class="w-full py-3 rounded-2xl text-white font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style="background:#f15a24;box-shadow:0 4px 16px rgba(241,90,36,0.3);">
                    + Añadir a Cotización
                </button>`;
        }
        return;
    }

    const barras6m = Math.ceil(metrosLinealesTotales / 6);
    const cotiz = GECKO_SETTINGS.cotizacionDolar || 1420;
    const materialsList = window.materiales || [];
    const buscarCostoNeto = (query) => {
        const mat = window.getGeckoItem(query);
        return mat ? mat.costoARS : 0;
    };

    // MEJORA 2: Buscar material dinámicamente desde inventario por id/nombre
    let materialNombre = "Estructura";
    let costoPorBarra = 0;

    if (materialCodigo) {
        const matEstructura = (window.materiales || []).find(m =>
            String(m.id) === String(materialCodigo) || m.nombre === materialCodigo
        ) || window.getGeckoItem(materialCodigo);

        if (matEstructura) {
            materialNombre = matEstructura.nombre;
            // Usar precioVenta que ya incluye m.o. (×mult)
            // Si no tiene precioVenta, calcular desde costoARS
            const costoBase = matEstructura.costo || matEstructura.costoARS || 0;
            const mult = matEstructura.multiplicador || 3;
            const precioVentaML = matEstructura.precioVenta || Math.round(costoBase * mult);
            // Una barra = 6 metros lineales
            const unidad = (matEstructura.unidad || '').toLowerCase();
            costoPorBarra = unidad === 'barra' ? precioVentaML : precioVentaML * 6;
        }
    }

    // MEJORA 3: Demasía + tensado para lonas en el revestimiento
    if (llevaRevest) {
        const servicios3 = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
        // Resetear el costo (ya fue acumulado en el loop de filas arriba sin tensado)
        // Re-calcular con tensado incluido
        costoRevestimientoTotalNeto = 0;

        filas.forEach(fila => {
            const ancho = parseFloat(fila.querySelector('.input-ancho')?.value) || 0;
            const alto = parseFloat(fila.querySelector('.input-alto')?.value) || 0;
            const cant = parseInt(fila.querySelector('.input-cantidad')?.value) || 1;

            if (ancho > 0 && alto > 0 && cant > 0) {
                const nombreRevest = materialRevest.toLowerCase();
                const esLona = nombreRevest.includes('lona') || nombreRevest.includes('front') ||
                    nombreRevest.includes('banner') || nombreRevest.includes('mesh');

                // Demasía: +20cm por lado si es lona; sin demasía si es rígido
                const demasia = esLona ? 20 : 0;
                const anchoD = ancho + demasia;
                const altoD = alto + demasia;
                const areaM2 = (anchoD * altoD) / 10000;

                const matR = window.getGeckoItem(materialRevest);
                const costoBaseR = matR ? (matR.costo || matR.costoARS || 0) : 0;
                const multR = matR ? (matR.multiplicador || 3) : 3;
                const precioVentaRevest = matR ? (matR.precioVenta || Math.round(costoBaseR * multR)) : 0;
                costoRevestimientoTotalNeto += areaM2 * precioVentaRevest * cant;

                // Tensado de lona por perímetro
                if (esLona) {
                    const perimetroLona = ((anchoD * 2) + (altoD * 2)) / 100;
                    const servicioTensado = servicios3.find(s => {
                        const nom = (s.nombre || '').toUpperCase();
                        return nom.includes('TENSADO') && nom.includes('LONA');
                    });
                    const precioTensado = servicioTensado
                        ? (servicioTensado.precio || servicioTensado.precioVenta || 4000)
                        : 4000;
                    costoRevestimientoTotalNeto += perimetroLona * precioTensado * cant;
                }
            }
        });
    }

    const costoEsqueletoNeto = barras6m * costoPorBarra;
    const costoNetoTotal = costoEsqueletoNeto + costoRevestimientoTotalNeto;
    const modo = globalEstimationMode || 'simple';
    let precioFinal = 0;
    if (modo === 'simple') precioFinal = costoNetoTotal * 3;
    else {
        const horasEstimadas = 1 + (metrosLinealesTotales / 4);
        const costoManoObra = horasEstimadas * (GECKO_SETTINGS.valorHoraHombre || 3500);
        precioFinal = costoNetoTotal + costoManoObra;
    }

    const totalRedondeado = Math.ceil(precioFinal);
    const subtotalEl = document.getElementById('subtotalEstimado');
    if (subtotalEl) subtotalEl.innerText = '$' + totalRedondeado.toLocaleString('es-AR');

    const resPanel = document.getElementById('resumenConsumoBastidor');
    if (resPanel) {
        resPanel.classList.remove('hidden');
        document.getElementById('txtTotalML').innerText = `Metros lineales totales: ${metrosLinealesTotales.toFixed(1)} m`;
        document.getElementById('txtTotalBarras').innerText = `Barras de 6m: ${barras6m}`;
    }

    // Auditor de revestimiento
    const txtRevest = document.getElementById('txtRevest');
    if (txtRevest) {
        if (llevaRevest && materialRevest) {
            const esLona = materialRevest.toLowerCase().includes('lona') ||
                materialRevest.toLowerCase().includes('front') ||
                materialRevest.toLowerCase().includes('banner');
            txtRevest.innerText = esLona
                ? `Revestimiento: ${materialRevest} (+20cm demasía) | Tensado incluido`
                : `Revestimiento: ${materialRevest}`;
            txtRevest.classList.remove('hidden');
        } else {
            txtRevest.classList.add('hidden');
        }
    }

    window.itemActualCotizado = {
        tipo: 'bastidores',
        textoOpciones: `Estructura ${materialNombre} (${detalleItems.join(', ')})`,
        otDetalle: `${metrosLinealesTotales.toFixed(1)}ml totales | ${barras6m} barras | ${llevaRevest ? materialRevest + ' (con demasía si aplica)' : 'Sin revest.'}`,
        costo: totalRedondeado,
        modoCalculo: modo
    };

    const fmt = v => '$' + Math.round(v).toLocaleString('es-AR');
    const subtotalEl2 = document.getElementById('subtotalEstimado');
    if (subtotalEl2) subtotalEl2.innerText = fmt(totalRedondeado);

    // ── Auditor de cálculo unificado (estilo Láser/CNC) ────────────────────────
    const panelConf = document.getElementById('panelConfigurador');
    if (panelConf) {
        const fmtVal = n => '$' + Math.round(n).toLocaleString('es-AR');

        let auditorWrap = document.getElementById('geckoAuditorBastidores');
        if (!auditorWrap) {
            auditorWrap = document.createElement('div');
            auditorWrap.id = 'geckoAuditorBastidores';
            auditorWrap.style.marginTop = '20px';
            panelConf.appendChild(auditorWrap);
        }

        const lineaRow = (label, detalle, valor) => `
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid #1f1f23;">
                <div style="flex:1;min-width:0;">
                    <span style="color:#F15A24;font-size:10px;margin-right:6px;">•</span>
                    <span style="color:#d4d4d8;font-size:12px;font-weight:700;">${label}</span>
                    ${detalle ? `<span style="display:block;color:#71717a;font-size:10px;margin-left:16px;margin-top:2px;">${detalle}</span>` : ''}
                </div>
                <span style="color:white;font-size:13px;font-weight:900;font-family:monospace;margin-left:12px;white-space:nowrap;">${fmtVal(valor)}</span>
            </div>`;

        const seccion = (titulo) =>
            `<p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#71717a;margin:14px 0 6px;padding-top:2px;">${titulo}</p>`;

        let html = '';

        if (auditEsqueleto.length > 0) {
            html += seccion('Esqueleto (Estructura)');
            auditEsqueleto.forEach(l => html += lineaRow(l.nombre, l.detalle, l.valor));
        } else {
            html += seccion('Esqueleto (Estructura)');
            html += `<p style="font-size:11px;color:#52525b;padding:4px 0;">Seleccioná un material para ver el detalle</p>`;
        }

        if (auditRevest.length > 0) {
            html += seccion('Revestimiento');
            auditRevest.forEach(l => html += lineaRow(l.nombre, l.detalle, l.valor));
        }

        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 4px;margin-top:6px;border-top:1px solid #27272a;">
            <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#a1a1aa;">Total del ítem</span>
            <span style="font-size:20px;font-weight:900;color:#F15A24;font-family:monospace;">${fmtVal(totalRedondeado)}</span>
        </div>`;

        auditorWrap.innerHTML = `
            <div class="card-gecko" style="margin-top:12px;">
                <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 14px;">Auditor de cálculo</p>
                ${html}
            </div>`;

        // Botón añadir — siempre después del auditor
        let btnWrap = document.getElementById('btnAnadirBastidores');
        if (!btnWrap) {
            btnWrap = document.createElement('div');
            btnWrap.id = 'btnAnadirBastidores';
            btnWrap.style.marginTop = '12px';
            panelConf.appendChild(btnWrap);
        }
        btnWrap.innerHTML = `
            <button id="btnConfirmarItem" onclick="window.agregarItemAlCarritoUI()"
                class="w-full py-3 rounded-2xl text-white font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                style="background:#f15a24;box-shadow:0 4px 16px rgba(241,90,36,0.3);">
                + Añadir a Cotización
            </button>`;
    }

    // Ocultar auditor inline viejo (regla: ocultar, nunca eliminar)
    const auditorEsqueleto = document.getElementById('auditorBastidor');
    if (auditorEsqueleto) auditorEsqueleto.style.display = 'none';

    const auditEsqueleto = [];
    if (materialCodigo && costoPorBarra > 0) {
        const matAud = (window.materiales || []).find(m =>
            String(m.id) === String(materialCodigo) || m.nombre === materialCodigo
        ) || window.getGeckoItem(materialCodigo);
        const costoBaseAud = matAud ? (matAud.costo || matAud.costoARS || 0) : 0;
        const multAud = matAud ? (matAud.multiplicador || 3) : 3;
        const pvML = Math.round(matAud ? (matAud.precioVenta || Math.round(costoBaseAud * multAud)) : 0);
        const totalEsqueleto = Math.round(metrosLinealesTotales * pvML);
        auditEsqueleto.push({ nombre: materialNombre, detalle: `${metrosLinealesTotales.toFixed(1)}ml × $${pvML.toLocaleString('es-AR')}/ml`, valor: totalEsqueleto });
    }

    // Ocultar auditor inline viejo (regla: ocultar, nunca eliminar)
    const auditorRevest = document.getElementById('auditorRevestimiento');
    if (auditorRevest) auditorRevest.style.display = 'none';

    const auditRevest = [];
    if (llevaRevest && materialRevest) {
            const esLonaR = materialRevest.toLowerCase().includes('lona') ||
                            materialRevest.toLowerCase().includes('front') ||
                            materialRevest.toLowerCase().includes('banner');
            const matR2 = window.getGeckoItem(materialRevest);
            const costoBaseR2 = matR2 ? (matR2.costo || matR2.costoARS || 0) : 0;
            const multR2 = matR2 ? (matR2.multiplicador || 3) : 3;
            const pvRevest = matR2 ? (matR2.precioVenta || Math.round(costoBaseR2 * multR2)) : 0;

            if (esLonaR) {
                let areaAud = 0, perimetroAud = 0;
                document.querySelectorAll('.fila-bastidor').forEach(fila => {
                    const a = parseFloat(fila.querySelector('.input-ancho')?.value) || 0;
                    const h = parseFloat(fila.querySelector('.input-alto')?.value) || 0;
                    const c = parseInt(fila.querySelector('.input-cantidad')?.value) || 1;
                    if (a > 0 && h > 0) {
                        areaAud += ((a + 20) * (h + 20) / 10000) * c;
                        perimetroAud += (((a + 20) * 2 + (h + 20) * 2) / 100) * c;
                    }
                });
                const servsTens2 = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
                const servTens2 = servsTens2.find(s => (s.nombre || '').toUpperCase().includes('TENSADO'));
                const pTens2 = Math.round(servTens2 ? (servTens2.precio || servTens2.precioVenta || 4000) : 4000);
                const pvRevestR = Math.round(pvRevest);
                const totalLona = Math.round(areaAud * pvRevestR);
                const totalTensado = Math.round(perimetroAud * pTens2);
                auditRevest.push({ nombre: `Lona: ${materialRevest}`, detalle: `${areaAud.toFixed(2)}m² × $${pvRevestR.toLocaleString('es-AR')}/m² (con demasía)`, valor: totalLona });
                auditRevest.push({ nombre: 'Servicio de Tensado', detalle: `${perimetroAud.toFixed(1)}ml × $${pTens2.toLocaleString('es-AR')}/ml`, valor: totalTensado });
            } else {
                let areaRigido = 0;
                document.querySelectorAll('.fila-bastidor').forEach(fila => {
                    const a = parseFloat(fila.querySelector('.input-ancho')?.value) || 0;
                    const h = parseFloat(fila.querySelector('.input-alto')?.value) || 0;
                    const c = parseInt(fila.querySelector('.input-cantidad')?.value) || 1;
                    if (a > 0 && h > 0) areaRigido += (a * h / 10000) * c;
                });
                const pvRevestRig = Math.round(pvRevest);
                const totalRigido = Math.round(areaRigido * pvRevestRig);
                auditRevest.push({ nombre: `Revestimiento: ${materialRevest}`, detalle: `${areaRigido.toFixed(2)}m² × $${pvRevestRig.toLocaleString('es-AR')}/m²`, valor: totalRigido });
            }
    }

    // Plano de FILA ACTIVA o ÚLTIMA
    const filaParaPlan = window._filaBastidorActiva || filas[filas.length - 1];
    if (filaParaPlan) {
        const a = parseFloat(filaParaPlan.querySelector('.input-ancho')?.value) || 0;
        const h = parseFloat(filaParaPlan.querySelector('.input-alto')?.value) || 0;
        if (a > 0 && h > 0) {
            const rV = a > 100 ? (Math.ceil(a / 80) - 1) : 0;
            const rH = h >= 140 ? (Math.ceil(h / 100) - 1) : 0;
            window.dibujarPlanoBastidor(a, h, rV, rH);
        }
    }
}

window.enfocarFilaBastidor = function (el) {
    if (!el) return;
    document.querySelectorAll('.fila-bastidor').forEach(f => {
        f.classList.remove('bg-zinc-800/40', 'border-l-2', 'border-gecko');
    });
    el.classList.add('bg-zinc-800/40', 'border-l-2', 'border-gecko');
    window._filaBastidorActiva = el;
    window.calcularCostoBastidores(); // Redibujar plano activo
}

window.eliminarFilaBastidor = function (btn) {
    const filas = document.querySelectorAll('.fila-bastidor');
    if (filas.length > 1) {
        btn.closest('.fila-bastidor').remove();
        window.calcularCostoBastidores();
    } else {
        const fila = filas[0];
        fila.querySelectorAll('input').forEach(i => i.value = (i.classList.contains('input-cantidad') ? 1 : ''));
        window.calcularCostoBastidores();
    }
}

window.agregarFilaBastidor = function () {
    const contenedor = document.getElementById('contenedorFilasBastidor');
    if (!contenedor) return;

    const div = document.createElement('div');
    div.className = "grid grid-cols-12 gap-3 items-center fila-bastidor px-2 transition-all animate-in fade-in slide-in-from-top-2";
    div.onclick = function () { window.enfocarFilaBastidor(this); };
    div.innerHTML = `
        <div class="col-span-3">
            <input type="number" class="input-ancho ${inputStyle} !text-sm !p-2" oninput="window.calcularCostoBastidores()" onfocus="window.enfocarFilaBastidor(this.closest('.fila-bastidor'))" placeholder="0">
        </div>
        <div class="col-span-3">
            <input type="number" class="input-alto ${inputStyle} !text-sm !p-2" oninput="window.calcularCostoBastidores()" onfocus="window.enfocarFilaBastidor(this.closest('.fila-bastidor'))" placeholder="0">
        </div>
        <div class="col-span-3">
            <input type="number" class="input-cantidad ${inputStyle} !text-sm !p-2" value="1" oninput="window.calcularCostoBastidores()" onfocus="window.enfocarFilaBastidor(this.closest('.fila-bastidor'))">
        </div>
        <div class="col-span-3 flex justify-end">
            <button onclick="window.eliminarFilaBastidor(this)" class="text-red-500/50 hover:text-red-500 p-2 transition-colors">✕</button>
        </div>
    `;
    contenedor.appendChild(div);
}

window.dibujarPlanoBastidor = function (ancho, alto, refV, refH) {
    const canvas = document.getElementById('canvasBastidor');
    if (!canvas) return;

    const padding = 50;
    const maxWidth = canvas.clientWidth - (padding * 2);
    const maxHeight = canvas.clientHeight - (padding * 2);

    const escala = Math.min(maxWidth / ancho, maxHeight / alto);
    const drawW = ancho * escala;
    const drawH = alto * escala;

    const offsetX = (canvas.clientWidth - drawW) / 2;
    const offsetY = (canvas.clientHeight - drawH) / 2;

    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${canvas.clientWidth} ${canvas.clientHeight}" xmlns="http://www.w3.org/2000/svg">`;

    // Marco exterior principal
    svg += `<rect x="${offsetX}" y="${offsetY}" width="${drawW}" height="${drawH}" fill="none" stroke="#F15A24" stroke-width="2.5" />`;

    // Refuerzos Verticales (Gris tenue)
    const espaciadoV = drawW / (refV + 1);
    const medidaRealV = (ancho / (refV + 1)).toFixed(1);
    for (let i = 1; i <= refV; i++) {
        const x = offsetX + espaciadoV * i;
        svg += `<line x1="${x}" y1="${offsetY}" x2="${x}" y2="${offsetY + drawH}" stroke="#3f3f46" stroke-width="1" stroke-dasharray="3,3" />`;
    }

    // Refuerzos Horizontales (Gris tenue)
    const espaciadoH = drawH / (refH + 1);
    const medidaRealH = (alto / (refH + 1)).toFixed(1);
    for (let i = 1; i <= refH; i++) {
        const y = offsetY + espaciadoH * i;
        svg += `<line x1="${offsetX}" y1="${y}" x2="${offsetX + drawW}" y2="${y}" stroke="#3f3f46" stroke-width="1" stroke-dasharray="3,3" />`;
    }

    // COTAS Y MEDIDAS (Estilo técnico)
    // Verticales (ancho)
    for (let i = 0; i <= refV; i++) {
        const xTxt = offsetX + (espaciadoV * i) + (espaciadoV / 2);
        svg += `<text x="${xTxt}" y="${offsetY + drawH + 20}" fill="#a1a1aa" font-size="9" font-weight="bold" text-anchor="middle">${medidaRealV} cm</text>`;
    }
    // Horizontales (alto)
    for (let i = 0; i <= refH; i++) {
        const yTxt = offsetY + (espaciadoH * i) + (espaciadoH / 2);
        svg += `<text x="${offsetX - 25}" y="${yTxt}" fill="#a1a1aa" font-size="9" font-weight="bold" text-anchor="middle" transform="rotate(-90, ${offsetX - 25}, ${yTxt})">${medidaRealH} cm</text>`;
    }

    // Etiquetas de TOTALES
    svg += `<text x="${offsetX + drawW / 2}" y="${offsetY - 15}" fill="#F15A24" font-size="12" font-weight="black" text-anchor="middle" class="uppercase tracking-widest">${ancho} cm TOTAL</text>`;
    svg += `<text x="${offsetX + drawW + 20}" y="${offsetY + drawH / 2}" fill="#F15A24" font-size="12" font-weight="black" text-anchor="middle" transform="rotate(90, ${offsetX + drawW + 20}, ${offsetY + drawH / 2})" class="uppercase tracking-widest">${alto} cm TOTAL</text>`;

    svg += `</svg>`;
    canvas.innerHTML = svg;
}

