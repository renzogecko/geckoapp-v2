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
                    <label class="${labelStyle}">Ancho Fijo (Visual)</label>
                    <div class="w-full h-12 px-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl text-zinc-500 font-bold flex items-center cursor-not-allowed">
                        ${ancho}
                    </div>
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

        // 1. Búsqueda de Ítems (GDM) - Uso estricto de PLOTER DE CORTE
        const queryMaterial = (modoActivo === 'dtf') ? "DTF" : "TERMO";
        const itemMaterial = window.getGeckoItem(queryMaterial);
        const itemEstampa = window.getGeckoItem("ESTAMPADO");
        const itemCorte = window.getGeckoItem("PLOTER DE CORTE - 60CM");
        
        // 2. Uso de Precios (No re-multiplicar, el GDM ya incluye el margen)
        const pMaterial = itemMaterial ? itemMaterial.precioVenta : (modoActivo === 'dtf' ? 12000 : 8500);
        const pEstampa = itemEstampa ? itemEstampa.precioVenta : 2500;
        const pCorte = itemCorte ? itemCorte.precioVenta : 0;

        // 3. Lógica de Negocio Estricta
        let costoML = pMaterial;
        if (modoActivo === 'termo') {
            costoML = pMaterial + pCorte;
        }

        const subtotalMaterial = (largo / 100) * costoML;
        const subtotalEstampas = bajadas * pEstampa;
        const subtotalPrendas = cantPrendas * valorPrenda;
        
        const totalFinal = Math.round(subtotalMaterial + subtotalEstampas + subtotalPrendas);
        
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

        // 4. Auditoría Visual (Feedback real del desglose)
        const auditorMat = document.getElementById('auditorMaterial');
        const auditorEst = document.getElementById('auditorEstampado');
        
        if (auditorMat) {
            if (modoActivo === 'termo') {
                auditorMat.innerText = `Auditor: Material: ${fmt(pMaterial)} + Corte: ${fmt(pCorte)} = ${fmt(costoML)}/ml.`;
            } else {
                auditorMat.innerText = `Auditor: Material DTF @ ${fmt(pMaterial)}/ml | Subtotal: ${fmt(subtotalMaterial)}`;
            }
        }
        if (auditorEst) {
            auditorEst.innerText = `Auditor: Estampa @ ${fmt(pEstampa)}/u | Subtotal: ${fmt(subtotalEstampas)}`;
        }

        // 5. Actualización de UI Derecha
        const detMat = document.getElementById('detMaterialBase');
        const detServ = document.getElementById('detServicio');
        const detPrenda = document.getElementById('detTerminaciones');
        const totalDisplay = document.getElementById('subtotalEstimado');

        if (detMat) detMat.innerText = fmt(subtotalMaterial);
        if (detServ) detServ.innerText = fmt(subtotalEstampas);
        if (detPrenda) detPrenda.innerText = fmt(subtotalPrendas);
        if (totalDisplay) totalDisplay.innerText = fmt(totalFinal);

    } catch (e) {
        console.error("Error en cálculo textil:", e);
    }
};

// --- FUNCIÓN DE ENVÍO INDEPENDIENTE ---
window.añadirTextilAlPresupuesto = function() {
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
