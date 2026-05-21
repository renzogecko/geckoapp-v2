// impresion3d.js - Módulo extraído

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
    const matObj = materiales.find(m => m.nombre === nombreMat);

    const getPV = (m) => {
        if (!m) return 0;
        const base = Math.round(m.costo || m.costoReal || m.costoARS || (m.costoUSD * cotiz) || 0);
        const mult = m.multiplicador || multGlobal;
        return Math.round(base * mult);
    };

    const precioVentaGr = matObj ? getPV(matObj) : 0;

    const costoMaterial = gramos * precioVentaGr;
    const costoServicio = horas * costoHora3D;
    const totalFinal = Math.round(costoMaterial + costoServicio);

    const fmt = (v) => '$' + Math.round(v).toLocaleString('es-AR');
    if (document.getElementById('subtotalEstimado')) document.getElementById('subtotalEstimado').innerText = fmt(totalFinal);

    window.itemActual3D = {
        tipo: '3d',
        textoOpciones: `Impresión 3D Técnica: ${nombreMat} (${gramos}gr)`,
        costo: totalFinal,
        otDetalle: `Peso: ${gramos}gr | Tiempo: ${horas}hs | Material: ${nombreMat}`
    };
}

