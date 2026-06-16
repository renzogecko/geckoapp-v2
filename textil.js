// textil.js - Módulo Textil GECKO (Event-Driven Edition)
// Cotizadores: DTF y TERMOVINILO

window._textilModo = 'dtf';
const preciosTextil = { dtf: 0, estampado: 0, termo: 0, corte: 0 };

// 1. Sincronización de Carga: Esperar al Inventario
document.addEventListener('inventoryReady', () => {
    console.log('🦎 GECKO - Textil: Inventario detectado. Cargando precios...');
    inicializarPreciosTextil();
});

// Por si el evento ya se disparó antes de cargar el script
if (window.materiales && window.materiales.length > 0) {
    setTimeout(inicializarPreciosTextil, 100);
}

function inicializarPreciosTextil() {
    // 1. Obtención de datos normalizados mediante GDM
    const dataDTF = window.getGeckoItem("DTF TEXTIL");
    const dataEstampado = window.getGeckoItem("ESTAMPADO");
    const dataTermo = window.getGeckoItem("TERMOVINILO");
    const dataCorte = window.getGeckoItem("PLOTER 60") || window.getGeckoItem("SERVICIO DE CORTE");

    // 2. Asignación de Precios con Programación Defensiva
    preciosTextil.dtf = dataDTF ? dataDTF.precioVenta : 0;
    preciosTextil.estampado = dataEstampado ? dataEstampado.precioVenta : 0;
    preciosTextil.termo = dataTermo ? (dataTermo.precioVenta / 2) : 0;
    preciosTextil.corte = dataCorte ? dataCorte.precioVenta : 7800; // Fallback de seguridad

    console.log('🦎 GECKO - Precios Textil Sincronizados via GDM:', preciosTextil);

    // Actualizar Auditores Inmediatamente (UI Sync inicial)
    window.calcularCostoTextil();
}

window.setTextilModo = function (modo) {
    window._textilModo = modo;

    const container = document.getElementById('contenedorVariablesTextil');
    if (container) {
        const ancho = (modo === 'dtf') ? '57 cm' : '50 cm';
        const labelStyle = "block text-[11px] uppercase tracking-wider text-zinc-400 font-bold mb-2 ml-1";
        const inputStyle = "w-full h-12 px-4 bg-zinc-900/50 border border-zinc-700 rounded-2xl focus:border-orange-500 outline-none text-white font-bold transition-all";

        container.innerHTML = `
            <div class="grid grid-cols-2 gap-6">
                <div>
                    <label class="${labelStyle}">Ancho del rollo</label>
                    <div class="w-full h-12 px-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl text-zinc-500 font-bold flex items-center cursor-not-allowed">
                        ${ancho}
                    </div>
                    <p class="text-[10px] text-zinc-600 font-bold mt-1 ml-1">Ancho estándar del rollo · no modificable</p>
                </div>
                <div>
                    <label class="${labelStyle}">Largo (cm)</label>
                    <input type="number" id="textilLargo" oninput="window.calcularCostoTextil()" onwheel="this.blur()" class="${inputStyle}" placeholder="0">
                </div>
            </div>
        `;
    }
    window.calcularCostoTextil();
}

window.calcularCostoTextil = function () {
    try {
        const modoActivo = window._textilModo || 'dtf';
        const largo = parseFloat(document.getElementById('textilLargo')?.value) || 0;
        const bajadas = parseInt(document.getElementById('textilBajadas')?.value) || 0;
        const valorPrenda = parseFloat(document.getElementById('prendaCostoUnit')?.value) || 0;
        const cantPrendas = parseInt(document.getElementById('prendaCantidad')?.value) || 1;

        const fmt = (v) => '$' + Math.round(v).toLocaleString('es-AR');

        // 1. Búsqueda de Ítems (GDM) - Nombres exactos según geckoServicios en DB
        const itemMaterial = modoActivo === 'dtf'
            ? (window.getGeckoItem("DTF - textil") || window.getGeckoItem("DTF TEXTIL") || window.getGeckoItem("DTF"))
            : (window.getGeckoItem("Termovinilo") || window.getGeckoItem("TERMOVINILO") || window.getGeckoItem("TERMO"));
        const itemEstampa = window.getGeckoItem("Estampados") || window.getGeckoItem("ESTAMPADO") || window.getGeckoItem("estampado");
        const itemCorte = window.getGeckoItem("Ploter de corte - 60cm")
            || window.getGeckoItem("PLOTER DE CORTE - 60CM")
            || window.getGeckoItem("PLOTER 60")
            || window.getGeckoItem("Ploter de corte - 60 cm");

        // Servicios usan campo 'precio', materiales usan 'costo' o 'precioVenta'
        const getPrecio = (item) => item ? (item.precio || item.precioVenta || item.costo || 0) : 0;

        // 2. Precios base
        const pMaterial = getPrecio(itemMaterial) || (modoActivo === 'dtf' ? 20000 : 8500);
        const pEstampa = getPrecio(itemEstampa) || 800;
        const pCorte = getPrecio(itemCorte) || 7500;

        // 3. Lógica de cálculo
        // Material: largo en cm → ML (÷100) × precio/ML
        const subtotalMaterial = (largo / 100) * pMaterial;
        // Corte (solo termovinilo): largo en cm → ML (÷100) × precio/ML — línea separada
        const subtotalCorte = (modoActivo === 'termo') ? (largo / 100) * pCorte : 0;
        // Estampas: cantidad × precio unitario
        const subtotalEstampas = bajadas * pEstampa;
        const subtotalPrendas = cantPrendas * valorPrenda;

        const totalFinal = Math.round(subtotalMaterial + subtotalCorte + subtotalEstampas + subtotalPrendas);

        // --- ASIGNACIÓN AL CARRITO GLOBAL (CRÍTICO) ---
        // Realizamos la asignación inmediatamente tras el cálculo para sincronizar la UI
        window.itemActualCotizado = {
            id: Date.now(),
            tipo: 'textil',
            nombre: document.getElementById('textilNombre')?.value || 'Trabajo Textil',
            costo: totalFinal,
            textoOpciones: `${modoActivo.toUpperCase()} (${largo}cm)`,
            detalle: `${largo}cm lineal | ${bajadas} estampas`,
            otDetalle: `Material: ${largo}cm | Estampas: ${bajadas} | Prendas: ${cantPrendas}`
        };

        // 4. Auditor unificado — solo si Textil es la categoría activa
        const categoriaActiva = localStorage.getItem('gecko_activeCategory');
        const panelConfTextil = (categoriaActiva === 'textil') ? document.getElementById('panelConfigurador') : null;
        let auditorWrap = document.getElementById('geckoAuditorTextil');
        if (!auditorWrap && panelConfTextil) {
            auditorWrap = document.createElement('div');
            auditorWrap.id = 'geckoAuditorTextil';
            auditorWrap.style.marginTop = '12px';
            panelConfTextil.appendChild(auditorWrap);
        }
        // Botón siempre después del auditor
        let btnTextilWrap = document.getElementById('btnTextilAnadir');
        if (!btnTextilWrap && panelConfTextil) {
            btnTextilWrap = document.createElement('div');
            btnTextilWrap.id = 'btnTextilAnadir';
            btnTextilWrap.style.marginTop = '12px';
            btnTextilWrap.innerHTML = `<button id="btnConfirmarItem" onclick="window.añadirTextilAlPresupuesto()" class="w-full py-3 bg-[#f15a24] text-white rounded-2xl font-black uppercase text-[11px] tracking-[3px] shadow-lg">+ AÑADIR A COTIZACIÓN</button>`;
            panelConfTextil.appendChild(btnTextilWrap);
        }
        if (auditorWrap && categoriaActiva === 'textil') {
            const hayDatos = subtotalMaterial > 0 || subtotalCorte > 0 || subtotalEstampas > 0 || subtotalPrendas > 0;
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

            if (hayDatos) {
                let html = '';

                // ZONA 1 — MATERIAL
                html += seccion('Material');
                const labelMat = modoActivo === 'termo'
                    ? `Termovinilo`
                    : `DTF Textil`;
                html += lineaRow(labelMat,
                    `${largo}cm × ${fmt(pMaterial)}/ML`,
                    subtotalMaterial);

                // ZONA 2 — CORTE PLOTTER (solo termovinilo)
                if (subtotalCorte > 0) {
                    html += seccion('Servicio de corte');
                    html += lineaRow('Ploter de corte 60cm',
                        `${largo}cm × ${fmt(pCorte)}/ML`,
                        subtotalCorte);
                }

                // ZONA 3 — ESTAMPADO
                if (bajadas > 0) {
                    html += seccion('Estampado');
                    html += lineaRow('Bajadas',
                        `${bajadas} u × ${fmt(pEstampa)}/u`,
                        subtotalEstampas);
                }

                // ZONA 3 — PRENDA
                if (subtotalPrendas > 0) {
                    html += seccion('Prendas');
                    html += lineaRow('Costo prendas',
                        `${cantPrendas} u × ${fmt(valorPrenda)}/u`,
                        subtotalPrendas);
                }

                // TOTAL
                html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 4px;margin-top:6px;border-top:1px solid #27272a;">
                    <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#a1a1aa;">Total del ítem</span>
                    <span style="font-size:20px;font-weight:900;color:#F15A24;font-family:monospace;">${fmt(totalFinal)}</span>
                </div>`;

                auditorWrap.innerHTML = `
                    <div class="card-gecko" style="margin-top:0;">
                        <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 14px;">Auditor de cálculo</p>
                        ${html}
                    </div>`;
            } else {
                auditorWrap.innerHTML = `
                    <div class="card-gecko" style="margin-top:0;">
                        <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 10px;">Auditor de cálculo</p>
                        <p style="font-size:11px;color:#52525b;text-align:center;padding:8px 0;">Completá los campos para ver el desglose</p>
                    </div>`;
            }
        }

        // 5. Actualización de UI Derecha
        const detMat = document.getElementById('detMaterialBase');
        const detServ = document.getElementById('detServicio');
        const detPrenda = document.getElementById('detTerminaciones');
        const totalDisplay = document.getElementById('subtotalEstimado');

        if (detMat) detMat.innerText = fmt(subtotalMaterial + subtotalCorte);
        if (detServ) detServ.innerText = fmt(subtotalEstampas);
        if (detPrenda) detPrenda.innerText = fmt(subtotalPrendas);
        if (totalDisplay) totalDisplay.innerText = fmt(totalFinal);

    } catch (e) {
        console.error("Error en cálculo textil:", e);
    }
};

// --- FUNCIÓN DE ENVÍO INDEPENDIENTE ---
window.añadirTextilAlPresupuesto = function () {
    // 1. Forzar cálculo para asegurar datos frescos
    window.calcularCostoTextil();

    // 2. Validaciones básicas (Programación Defensiva)
    const largo = parseFloat(document.getElementById('textilLargo')?.value) || 0;
    const total = parseFloat(document.getElementById('subtotalEstimado')?.innerText.replace('$', '').replace(/\./g, '')) || 0;

    if (largo <= 0 || total <= 0) {
        alert("⚠️ Por favor, ingresa un largo válido para calcular el costo.");
        return;
    }

    // 3. Preparar el Objeto de Trabajo (Siguiendo el estándar de Gráfica)
    const nombreTrabajo = document.getElementById('textilNombre')?.value || 'TRABAJO TEXTIL';
    const materialActivo = window._textilModo === 'termo' ? 'TERMOVINILO' : 'DTF TEXTIL';
    const bajadas = parseInt(document.getElementById('textilBajadas')?.value) || 0;
    const cantPrendas = parseInt(document.getElementById('prendaCantidad')?.value) || 1;

    const item = {
        id: Date.now(),
        tipo: 'textil',
        nombre: nombreTrabajo.toUpperCase(),
        textoOpciones: `${materialActivo} (${largo}cm)`,
        costo: total,
        otDetalle: window.itemActualCotizado?.otDetalle || `${largo}cm lineal | ${bajadas} bajadas | ${cantPrendas} prendas`,
        modoCalculo: localStorage.getItem('globalEstimationMode') || 'simple'
    };

    // 4. Enviar al presupuesto global (La vía rápida)
    if (typeof window.agregarItemAlPresupuesto === 'function') {
        window.agregarItemAlPresupuesto(item);

        // 5. Feedback y Limpieza
        if (typeof window.mostrarExito === 'function') {
            window.mostrarExito("Producto añadido", "Cotización Actualizada");
        }
        console.log("✅ Textil enviado con éxito:", item);
    } else {
        console.error("❌ Error: No se encontró window.agregarItemAlPresupuesto");
    }
};
