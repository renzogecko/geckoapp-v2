/**
 * gecko-mock-data.js
 * Carga datos de prueba DESPUÉS de que gecko-api.js termina de sincronizar.
 * Escucha 'geckoDB_ready' / 'geckoAPI_syncComplete' y solo actúa si
 * gecko_listaPresupuestos quedó vacía tras la sincronización.
 *
 * Usa window._localStorage_original para bypassear el proxy de gecko-api.js
 * y evitar que las escrituras mock disparen sincronizaciones con la API.
 */

(function () {

    // ── Solo corre en entornos locales ─────────────────────────────────────
    const proto = location.protocol;
    const host  = location.hostname;
    const isLocal = proto === 'file:' || host === 'localhost' || host === '127.0.0.1';
    if (!isLocal) return;

    // ── Datos de prueba ────────────────────────────────────────────────────

    const MOCK_PRESUPUESTOS = [
        // Presupuestos (status: 'Cotizado')
        {
            id: 1001,
            cliente: 'Laura García',
            fecha: '05/05/2026',
            total: 85000,
            status: 'Cotizado',
            sena: 0,
            estado_ot: '',
            metodo_pago: '',
            items: [
                { nombre: 'Banner flex 3×1 m', textoOpciones: 'Banner flex 3×1 m', tipo: 'grafica', costo: 55000 },
                { nombre: 'Vinilo ploteado logo', textoOpciones: 'Vinilo ploteado logo', tipo: 'grafica', costo: 30000 }
            ]
        },
        {
            id: 1002,
            cliente: 'Nicolas Romero',
            fecha: '08/05/2026',
            total: 175000,
            status: 'Cotizado',
            sena: 0,
            estado_ot: '',
            metodo_pago: '',
            items: [
                { nombre: 'Lona impresa 5×2 m', textoOpciones: 'Lona impresa 5×2 m', tipo: 'grafica', costo: 120000 },
                { nombre: 'Ojales y flejes', textoOpciones: 'Ojales y flejes', tipo: 'grafica', costo: 55000 }
            ]
        },
        {
            id: 1003,
            cliente: 'Cliente Genérico',
            fecha: '12/05/2026',
            total: 52000,
            status: 'Cotizado',
            sena: 0,
            estado_ot: '',
            metodo_pago: '',
            items: [
                { nombre: 'Folletería A5 x500', textoOpciones: 'Folletería A5 x500', tipo: 'grafica', costo: 52000 }
            ]
        },
        // OTs (status: 'OT')
        {
            id: 1004,
            cliente: 'Renzo Delcueto',
            fecha: '10/05/2026',
            fecha_entrega: '25/05/2026',
            total: 95000,
            status: 'OT',
            sena: 30000,
            estado_ot: 'En Proceso',
            metodo_pago: 'Efectivo',
            items: [
                { nombre: 'Cartel vinílico 1,2×0,8 m', textoOpciones: 'Cartel vinílico 1,2×0,8 m', tipo: 'grafica', costo: 70000 },
                { nombre: 'Instalación en local', textoOpciones: 'Instalación en local', tipo: 'grafica', costo: 25000 }
            ]
        },
        {
            id: 1005,
            cliente: 'Laura García',
            fecha: '13/05/2026',
            fecha_entrega: '22/05/2026',
            total: 220000,
            status: 'OT',
            sena: 110000,
            estado_ot: 'En Taller',
            metodo_pago: 'MercadoPago',
            items: [
                { nombre: 'Impresión lona 4×2 m', textoOpciones: 'Impresión lona 4×2 m', tipo: 'grafica', costo: 160000 },
                { nombre: 'Bastidor aluminio 4×2 m', textoOpciones: 'Bastidor aluminio 4×2 m', tipo: 'grafica', costo: 60000 }
            ]
        },
        {
            id: 1006,
            cliente: 'Nicolas Romero',
            fecha: '15/05/2026',
            fecha_entrega: '20/05/2026',
            total: 290000,
            status: 'OT',
            sena: 150000,
            estado_ot: 'Listo',
            metodo_pago: 'Transferencia',
            items: [
                { nombre: 'Letras corpóreas acrílico x8', textoOpciones: 'Letras corpóreas acrílico x8', tipo: 'corporeos', costo: 210000 },
                { nombre: 'Stickers troquelados x200', textoOpciones: 'Stickers troquelados x200', tipo: 'grafica', costo: 80000 }
            ]
        }
    ];

    const MOCK_CAJAS = [
        { id: 'mock_c1', nombre: 'Efectivo',      saldo: 45000,  icono: 'efectivo' },
        { id: 'mock_c2', nombre: 'MercadoPago',   saldo: 120000, icono: 'mercado_pago_celeste' },
        { id: 'mock_c3', nombre: 'Banco Galicia', saldo: 380000, icono: 'banco' }
    ];

    const MOCK_MOVIMIENTOS = [
        { fecha: '10/05/2026', detalle: 'Seña OT #1004 — Renzo Delcueto', caja: 'Efectivo',      tipo: 'Ingreso', monto: 30000,  categoria: 'Cobro seña' },
        { fecha: '12/05/2026', detalle: 'Compra papeles y film laminado',   caja: 'Efectivo',      tipo: 'Egreso',  monto: 8500,   categoria: 'Insumos' },
        { fecha: '14/05/2026', detalle: 'Seña OT #1005 — Laura García',    caja: 'MercadoPago',   tipo: 'Ingreso', monto: 110000, categoria: 'Cobro seña' },
        { fecha: '16/05/2026', detalle: 'Recarga tinta ecosolvente UV',     caja: 'MercadoPago',   tipo: 'Egreso',  monto: 25000,  categoria: 'Insumos' },
        { fecha: '18/05/2026', detalle: 'Seña OT #1006 — Nicolas Romero',  caja: 'Banco Galicia', tipo: 'Ingreso', monto: 150000, categoria: 'Cobro seña' }
    ];

    // ── Lógica principal ───────────────────────────────────────────────────

    async function cargarMocks() {
        if (window._geckoMockLoaded) return;

        // Condición clave: solo actuar si la sincronización dejó la lista vacía
        const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
        if (lista.length > 0) return;

        window._geckoMockLoaded = true;

        // Escribir via _localStorage_original para no disparar el proxy de
        // gecko-api.js que intentaría sincronizar los mocks con la API.
        const ls = window._localStorage_original || localStorage;

        function writeIfEmpty(key, mockData) {
            const current = JSON.parse(ls.getItem(key) || '[]');
            if (!Array.isArray(current) || current.length === 0) {
                ls.setItem(key, JSON.stringify(mockData));
            }
        }

        writeIfEmpty('gecko_listaPresupuestos', MOCK_PRESUPUESTOS);
        writeIfEmpty('gecko_cajas',             MOCK_CAJAS);
        writeIfEmpty('gecko_movimientos',        MOCK_MOVIMIENTOS);

        // Materiales y servicios desde el backup local
        try {
            const res = await fetch('./gecko_backup_14-5-2026.json');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.materiales)     && data.materiales.length     > 0) writeIfEmpty('gecko_materiales', data.materiales);
                if (Array.isArray(data.geckoServicios) && data.geckoServicios.length > 0) writeIfEmpty('geckoServicios',   data.geckoServicios);
            }
        } catch (e) {
            console.warn('🦎 GECKO MOCK: No se pudo cargar el backup de materiales/servicios', e);
        }

        console.log('🦎 GECKO MOCK: Datos de prueba cargados');

        // Avisar al resto de la app para que re-renderice
        document.dispatchEvent(new CustomEvent('mockDataLoaded'));

        // Llamada directa a renders por si no están suscritos al evento aún
        if (typeof window.renderOts          === 'function') window.renderOts();
        if (typeof window.renderPresupuestos === 'function') window.renderPresupuestos();
    }

    // Escucha el evento que gecko-api.js dispara al terminar la sincronización
    document.addEventListener('geckoDB_ready',        cargarMocks);
    document.addEventListener('geckoAPI_syncComplete', cargarMocks);

})();
