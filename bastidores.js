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

    if (metrosLinealesTotales === 0) return;

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

    // FIX 2: Actualizar columna derecha de desglose de costos
    const fmt = v => '$' + Math.round(v).toLocaleString('es-AR');
    const detMat = document.getElementById('detMaterialBase');
    if (detMat) detMat.innerText = fmt(costoEsqueletoNeto);
    const detServ = document.getElementById('detServicio');
    if (detServ) detServ.innerText = fmt(costoRevestimientoTotalNeto);
    const detExtra = document.getElementById('detTerminaciones');
    if (detExtra) detExtra.innerText = fmt(totalRedondeado);
    const subtotalEl2 = document.getElementById('subtotalEstimado');
    if (subtotalEl2) subtotalEl2.innerText = fmt(totalRedondeado);

    // FIX 3A: Auditor Tarjeta 03 — Esqueleto
    const auditorEsqueleto = document.getElementById('auditorBastidor');
    if (auditorEsqueleto) {
        if (!materialCodigo || costoPorBarra === 0) {
            auditorEsqueleto.innerText = materialCodigo
                ? '⚠️ Material no encontrado en inventario'
                : 'Selecioná un material para ver el detalle';
            auditorEsqueleto.style.color = materialCodigo ? '#ef4444' : '#71717a';
        } else {
            const matAud = (window.materiales || []).find(m =>
                String(m.id) === String(materialCodigo) || m.nombre === materialCodigo
            ) || window.getGeckoItem(materialCodigo);
            const costoBaseAud = matAud ? (matAud.costo || matAud.costoARS || 0) : 0;
            const multAud = matAud ? (matAud.multiplicador || 3) : 3;
            const pvML = matAud ? (matAud.precioVenta || Math.round(costoBaseAud * multAud)) : 0;
            const totalEsqueleto = Math.round(metrosLinealesTotales * pvML);
            auditorEsqueleto.innerHTML =
                `• MATERIAL: ${materialNombre} | ` +
                `Precio de venta: $${pvML.toLocaleString('es-AR')}/ml | ` +
                `ML necesarios: ${metrosLinealesTotales.toFixed(1)} | ` +
                `Total: $${totalEsqueleto.toLocaleString('es-AR')}`;
            auditorEsqueleto.style.color = '#a1a1aa';
        }
    }

    // FIX 3B: Auditor Tarjeta 04 — Revestimiento
    const auditorRevest = document.getElementById('auditorRevestimiento');
    if (auditorRevest) {
        if (!llevaRevest || !materialRevest) {
            auditorRevest.innerHTML = '';
        } else {
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
                const pTens2 = servTens2 ? (servTens2.precio || servTens2.precioVenta || 4000) : 4000;
                const totalLona = Math.round(areaAud * pvRevest);
                const totalTensado = Math.round(perimetroAud * pTens2);
                auditorRevest.innerHTML =
                    `<span class="block">• LONA: ${materialRevest} | Precio de venta: $${pvRevest.toLocaleString('es-AR')}/m² | Área con demasía: ${areaAud.toFixed(2)} m² | Total: $${totalLona.toLocaleString('es-AR')}</span>` +
                    `<span class="block mt-1">• TENSADO: $${pTens2.toLocaleString('es-AR')}/ml | Perímetro: ${perimetroAud.toFixed(1)}ml | Total: $${totalTensado.toLocaleString('es-AR')}</span>`;
                auditorRevest.style.color = '#a1a1aa';
            } else {
                let areaRigido = 0;
                document.querySelectorAll('.fila-bastidor').forEach(fila => {
                    const a = parseFloat(fila.querySelector('.input-ancho')?.value) || 0;
                    const h = parseFloat(fila.querySelector('.input-alto')?.value) || 0;
                    const c = parseInt(fila.querySelector('.input-cantidad')?.value) || 1;
                    if (a > 0 && h > 0) areaRigido += (a * h / 10000) * c;
                });
                const totalRigido = Math.round(areaRigido * pvRevest);
                auditorRevest.innerHTML =
                    `• REVESTIMIENTO: ${materialRevest} | ` +
                    `Precio de venta: $${pvRevest.toLocaleString('es-AR')}/m² | ` +
                    `Área: ${areaRigido.toFixed(2)} m² | ` +
                    `Total: $${totalRigido.toLocaleString('es-AR')}`;
                auditorRevest.style.color = '#a1a1aa';
            }
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

