// grafica.js - Módulo de Impresión GeckoApp v2.1
// Enfoque: Consolidación de Montados, limpieza de UI y lógica de inventario real.

// Helper global: retorna precio según modo Gremio activo
window.getPrecioEfectivo = function (item) {
    if (!item) return 0;
    const isGremio = document.getElementById('modoGremio')?.checked;
    const cotiz = window.GECKO_SETTINGS?.cotizacionDolar || 1415;
    const multGlobal = window.GECKO_SETTINGS?.multiplicadorGlobal || 2.0;
    const costoARS = item.costo || item.costoReal || item.costoARS || (item.costoUSD * cotiz) || 0;
    const mult = item.multiplicador || multGlobal;
    const precioVenta = item.precioVenta || Math.round(costoARS * mult);
    if (isGremio) {
        const mGremio = item.multGremio || 1.5;
        const precioGremioCalc = Math.round(costoARS * mGremio);
        const precioGremio = (item.precioGremio && item.precioGremio > 0) ? item.precioGremio : precioGremioCalc;
        return (precioGremio && precioGremio > 0) ? precioGremio : precioVenta;
    }
    return precioVenta;
};

window.GeckoGrafica = {
    state: {
        tipoTrabajo: 'impresion',
        laminadoTouched: false
    },

    init: function () {
        console.log("🔍 DIAGNOSTICO: GeckoGrafica.init() ejecutado", new Date().toISOString());
        console.log("🦎 GeckoGrafica: Inicializando módulo v2.1...");
        this.state.laminadoTouched = false;

        // 1. Limpieza de Categorías (Forzar solo Vinilos, Lonas, Papel)
        this.limpiarCategorias();

        // 3. Conectar eventos globales
        this.bindEvents();

        // 4. Poblar materiales iniciales
        this.actualizarMateriales();

        // 5. Ajustar etiquetas de terminaciones
        this.ajustarLabels();

        // 7. Inicializar Placas
        this.actualizarSelectorPlacas();
        // Mostrar auditor y botón desde el inicio
        setTimeout(() => this.calcular(), 50);
    },

    limpiarCategorias: function () {
        const catSelect = document.getElementById('graficaCat');
        if (!catSelect) return;

        catSelect.innerHTML = `
            <option value="">Categoría...</option>
            <option value="VINILOS">Vinilos</option>
            <option value="LONAS">Lonas</option>
            <option value="PAPEL">Papel</option>
        `;
    },

    ajustarLabels: function () {
        // Cambiar label de Montado en Tarjeta 04
        const labelMontado = document.querySelector('label[for="checkMontado"]');
        if (labelMontado) {
            labelMontado.innerText = 'MONTADO SOBRE SUPERFICIE';
        }
    },

    bindEvents: function () {
        const panel = document.getElementById('panelConfigurador');
        if (!panel) return;

        panel.addEventListener('input', (e) => {
            // Solo ejecutar si Gráfica está activa en el panel
            if (!document.getElementById('graficaCat') && !document.getElementById('graficaMatEspec')) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                this.syncLaminado();
                this.calcular();
            }
        });

        panel.addEventListener('change', (e) => {
            // Solo ejecutar si Gráfica está activa en el panel
            if (!document.getElementById('graficaCat') && !document.getElementById('graficaMatEspec')) return;
            if (e.target.id === 'graficaCat') {
                this.actualizarMateriales();
                this.actualizarTerminaciones();
            }
            if (e.target.id === 'graficaMatEspec') {
                this.actualizarTerminaciones();
            }
            if (e.target.id === 'checkTransfer' || e.target.id === 'checkTroquelado') {
                this.calcular();
            }
            // Tarjeta 05: Montado Pro
            if (e.target.id === 'switch-montado') {
                const isChecked = e.target.checked;
                const detalles = document.getElementById('detallesMontado');
                if (detalles) detalles.classList.toggle('hidden', !isChecked);
                if (isChecked) {
                    this.actualizarSelectorPlacas();
                    this.initFilaRigidos();
                }
            }
            this.calcular();
        });
    },

    actualizarMateriales: function () {
        const catSelect = document.getElementById('graficaCat');
        const matSelect = document.getElementById('graficaMatEspec');
        if (!catSelect || !matSelect) return;

        const cat = catSelect.value.toUpperCase();
        const allMaterials = window.materiales || [];

        // Helper insensible: compara nombre y categoría sin depender de subcategoría
        const esViniloLonaFlex = (m) => {
            const categ = (m.categoria || '').toLowerCase();
            return categ === 'vinilos_lonas' || categ === 'flexible' ||
                   categ.includes('vinilo') || categ.includes('lona') || categ.includes('flexible');
        };

        let filtered = [];
        if (cat === 'VINILOS') {
            filtered = allMaterials.filter(m => {
                const name = (m.nombre || '').toLowerCase();
                // Mostrar si está en la categoría correcta Y el nombre menciona vinilo
                // O si no tiene subcategoría cargada (compatibilidad con datos viejos)
                return esViniloLonaFlex(m) && (
                    name.includes('vinilo') || name.includes('clear') ||
                    name.includes('esmerilado') || name.includes('microperforado') ||
                    name.includes('micro') || name.includes('one way') ||
                    name.includes('imprimible') ||
                    !(m.nombre || '').toLowerCase().includes('lona')
                );
            });
        } else if (cat === 'LONAS') {
            filtered = allMaterials.filter(m => {
                const name = (m.nombre || '').toLowerCase();
                return esViniloLonaFlex(m) && (
                    name.includes('lona') || name.includes('banner') ||
                    name.includes('front') || name.includes('mesh')
                );
            });
        } else if (cat === 'PAPEL') {
            filtered = allMaterials.filter(m => {
                const name = (m.nombre || '').toLowerCase();
                const categ = (m.categoria || '').toLowerCase();
                return name.includes('papel') || categ.includes('papel');
            });
        }

        // Fallback: si el filtro específico no encuentra nada, mostrar todos de la categoría base
        if (filtered.length === 0 && (cat === 'VINILOS' || cat === 'LONAS')) {
            filtered = allMaterials.filter(esViniloLonaFlex);
        }

        matSelect.innerHTML = '<option value="">Seleccionar material...</option>';
        filtered.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id || m.nombre;
            opt.textContent = m.nombre;
            matSelect.appendChild(opt);
        });

        matSelect.disabled = filtered.length === 0;
    },

    actualizarTerminaciones: function () {
        const cat = document.getElementById('graficaCat')?.value.toUpperCase();
        if (!cat) return;

        const termIds = ['checkRefilado', 'checkBolsillo', 'checkOjales', 'checkLaminado', 'checkMontado', 'checkTransfer', 'checkTroquelado'];

        const hideAll = () => {
            termIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.closest('.grid')?.classList.add('hidden');
            });
        };

        const show = (id) => {
            const el = document.getElementById(id);
            if (el) {
                el.closest('.grid')?.classList.remove('hidden');
            } else {
                if (id === 'checkTransfer') this.inyectarTransfer();
                if (id === 'checkTroquelado') this.inyectarTroquelado();
                if (id === 'checkTensado') this.inyectarTensado();
            }
        };

        hideAll();

        if (cat === 'VINILOS') {
            ['checkRefilado', 'checkTransfer', 'checkTroquelado', 'checkMontado', 'checkLaminado'].forEach(show);
        } else if (cat === 'LONAS') {
            ['checkRefilado', 'checkBolsillo', 'checkOjales', 'checkTensado'].forEach(show);
        } else {
            ['checkRefilado', 'checkLaminado'].forEach(show);
        }
    },

    inyectarTransfer: function () {
        const container = document.querySelector('.divide-zinc-800\\/30');
        if (!container || document.getElementById('checkTransfer')) return;

        const div = document.createElement('div');
        div.className = 'grid grid-cols-12 items-center gap-4 py-4';
        div.innerHTML = `
            <div class="col-span-5 flex items-center gap-3 text-left">
                <input type="checkbox" id="checkTransfer" onchange="window.calcularCostoGrafica(); window.GeckoGrafica.toggleInputTerm(this, 'valTransfer')" class="w-4 h-4 accent-gecko cursor-pointer">
                <label for="checkTransfer" class="text-[11px] font-bold text-zinc-200 uppercase tracking-wider cursor-pointer">Transfer</label>
            </div>
            <div class="col-span-4 flex flex-col items-start gap-1">
                <div class="flex items-center justify-start gap-2">
                    <input type="number" id="valTransfer" value="1" oninput="window.calcularCostoGrafica()" onwheel="this.blur()"
                        class="w-16 bg-transparent border-b border-zinc-800 py-1 text-white text-[13px] focus:outline-none focus:border-gecko transition-all">
                    <span class="text-[10px] font-black text-zinc-400 tracking-tighter">ML</span>
                </div>
                <p id="auditorTransfer" class="text-[11px] text-zinc-400 font-medium mt-2.5 italic"></p>
            </div>
            <div class="col-span-3 text-right text-[12px] font-black text-gecko" id="priceTransfer">$0</div>
        `;
        container.appendChild(div);
    },

    inyectarTroquelado: function () {
        const container = document.querySelector('.divide-zinc-800\\/30');
        if (!container || document.getElementById('checkTroquelado')) return;

        const div = document.createElement('div');
        div.className = 'grid grid-cols-12 items-center gap-4 py-4';
        div.innerHTML = `
            <div class="col-span-5 flex items-center gap-3 text-left">
                <input type="checkbox" id="checkTroquelado" onchange="window.calcularCostoGrafica(); window.GeckoGrafica.toggleInputTerm(this, 'valTroquelado')" class="w-4 h-4 accent-gecko cursor-pointer">
                <label for="checkTroquelado" class="text-[11px] font-bold text-zinc-200 uppercase tracking-wider cursor-pointer">Troquelado</label>
            </div>
            <div class="col-span-4 flex flex-col items-start gap-1">
                <div class="flex items-center justify-start gap-2">
                    <input type="number" id="valTroquelado" value="1" oninput="window.calcularCostoGrafica()" onwheel="this.blur()"
                        class="w-16 bg-transparent border-b border-zinc-800 py-1 text-white text-[13px] focus:outline-none focus:border-gecko transition-all">
                    <span class="text-[10px] font-black text-zinc-400 tracking-tighter">ML</span>
                </div>
                <p id="auditorTroquelado" class="text-[11px] text-zinc-400 font-medium mt-2.5 italic"></p>
            </div>
            <div class="col-span-3 text-right text-[12px] font-black text-gecko" id="priceTroquelado">$0</div>
        `;
        container.appendChild(div);
    },

    inyectarTensado: function () {
        const container = document.querySelector('.divide-zinc-800\\/30');
        if (!container || document.getElementById('checkTensado')) return;

        const div = document.createElement('div');
        div.className = 'grid grid-cols-12 items-center gap-4 py-4';
        div.innerHTML = `
            <div class="col-span-5 flex items-center gap-3 text-left">
                <input type="checkbox" id="checkTensado" onchange="window.calcularCostoGrafica(); window.GeckoGrafica.toggleInputTerm(this, 'valTensado')" class="w-4 h-4 accent-gecko cursor-pointer">
                <label for="checkTensado" class="text-[11px] font-bold text-zinc-200 uppercase tracking-wider cursor-pointer">Tensado de Lona</label>
            </div>
            <div class="col-span-4 flex flex-col items-start gap-1">
                <div class="flex items-center justify-start gap-2">
                    <input type="number" id="valTensado" value="1" oninput="window.calcularCostoGrafica()" onwheel="this.blur()"
                        class="w-16 bg-transparent border-b border-zinc-800 py-1 text-white text-[13px] focus:outline-none focus:border-gecko transition-all">
                    <span class="text-[10px] font-black text-zinc-400 tracking-tighter">ML</span>
                </div>
                <p id="auditorTensado" class="text-[11px] text-zinc-400 font-medium mt-2.5 italic"></p>
            </div>
            <div class="col-span-3 text-right text-[12px] font-black text-gecko" id="priceTensado">$0</div>
        `;
        container.appendChild(div);
    },

    toggleInputTerm: function (checkbox, inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.disabled = !checkbox.checked;
        if (!checkbox.checked) input.value = '';
    },

    calcular: function () {
        console.log("🧮 GeckoGrafica: Calculando...");

        const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
        const cotiz = window.GECKO_SETTINGS?.cotizacionDolar || 1415;
        const mode = localStorage.getItem('globalEstimationMode') || 'simple';

        // 1. Área Total
        let mt2Totales = 0;
        const filas = document.querySelectorAll('#contenedorFilasVariables .gecko-input-row');
        filas.forEach(fila => {
            const inputs = fila.querySelectorAll('input');
            const w = parseFloat(inputs[0]?.value) || 0;
            const h = parseFloat(inputs[1]?.value) || 0;
            const c = parseFloat(inputs[2]?.value) || 1;
            mt2Totales += (w * h / 10000) * c;
        });

        // 2. Material Base
        const matId = document.getElementById('graficaMatEspec')?.value;
        const mat = window.getGeckoItem(matId);
        let costoBase = 0;
        let precioM2 = 0;
        if (mat) {
            const isGremio = document.getElementById('modoGremio')?.checked;

            // Validate Width (Ancho) logic
            let warningAncho = '';
            const anchoRollo = mat.ancho || 0; // ancho en cm
            if (anchoRollo > 0) {
                // Check if any job dimension exceeds roll width
                const excede = Array.from(filas).some(fila => {
                    const inputs = fila.querySelectorAll('input');
                    const w = parseFloat(inputs[0]?.value) || 0;
                    const h = parseFloat(inputs[1]?.value) || 0;
                    // If BOTH width and height are strictly greater than roll width, it does not fit
                    return (w > anchoRollo && h > anchoRollo);
                });
                if (excede) warningAncho = ' <span class="text-red-500 font-bold ml-2"> EXCEDE ANCHO ROLLO!</span>';
            }

            const factor = (mode === 'proyecto') ? 1 : (mat.multiplicador || 2.0);
            let precioVenta = mat.costoARS * factor;

            if (isGremio && mode !== 'proyecto') {
                const mGremio = mat.multGremio || 1.5;
                const precioGremioCalculado = mat.costoARS * mGremio;
                let precioGremio = (mat.precioGremio && mat.precioGremio > 0) ? mat.precioGremio : precioGremioCalculado;
                if (!precioGremio || precioGremio === 0) precioGremio = precioVenta; // Fallback a Venta Normal
                precioVenta = precioGremio;
            }

            precioM2 = precioVenta;
            if (mt2Totales > 0) costoBase = mt2Totales * precioM2;

            // Actualizar Auditor de Material
            this.safeSetText('auditorMaterialGrafica', `GDM: ${mat.nombre} | Precio: $${Math.round(precioM2)}/m2${warningAncho}`);
            document.getElementById('auditorMaterialGrafica').innerHTML = document.getElementById('auditorMaterialGrafica').innerText; // Allow HTML rendering for warning
            if (warningAncho !== '') {
                document.getElementById('auditorMaterialGrafica').innerHTML = `GDM: ${mat.nombre} | Precio: $${Math.round(precioM2)}/m2${warningAncho}`;
            }

        } else {
            this.safeSetText('auditorMaterialGrafica', '');
        }

        // 3. Terminaciones y Servicios
        let serviciosCostos = 0; // Renombrado para coincidir con la arquitectura solicitada
        const activeTerms = [];

        // Refilado
        if (this.isTermActive('checkRefilado')) {
            const ml = parseFloat(document.getElementById('valRefilado')?.value) || 1;
            const sub = ml * 1800;
            serviciosCostos += sub;
            activeTerms.push('Refilado');
            this.safeSetText('priceRefilado', fmt(sub));
            this.safeSetText('auditorRefilado', `Unit: $1.800/ml`);
        } else {
            this.safeSetText('priceRefilado', '$0');
            this.safeSetText('auditorRefilado', '');
        }

        // Bolsillo
        if (this.isTermActive('checkBolsillo')) {
            const ml = parseFloat(document.getElementById('valBolsillo')?.value) || 1;
            const sub = ml * 3000;
            serviciosCostos += sub;
            activeTerms.push('Bolsillo');
            this.safeSetText('priceBolsillo', fmt(sub));
            this.safeSetText('auditorBolsillo', `Unit: $3.000/ml`);
        } else {
            this.safeSetText('priceBolsillo', '$0');
            this.safeSetText('auditorBolsillo', '');
        }

        // Ojales
        if (this.isTermActive('checkOjales')) {
            const cant = parseFloat(document.getElementById('valOjales')?.value) || 1;
            const sub = cant * 800;
            serviciosCostos += sub;
            activeTerms.push('Ojales');
            this.safeSetText('priceOjales', fmt(sub));
            this.safeSetText('auditorOjales', `Unit: $800/u`);
        } else {
            this.safeSetText('priceOjales', '$0');
            this.safeSetText('auditorOjales', '');
        }

        // Laminado
        if (this.isTermActive('checkLaminado')) {
            const m2Laminado = parseFloat(document.getElementById('graficaLaminadoMt2')?.value) || 0;
            const lamMat = window.getGeckoItem("Laminado");

            if (lamMat) {
                const factor = (mode === 'proyecto') ? 1 : lamMat.multiplicador;
                const precioBase = lamMat.costoARS * factor;
                const sub = m2Laminado * precioBase;
                serviciosCostos += sub;
                activeTerms.push('Laminado');
                this.safeSetText('priceLaminado', fmt(sub));
                this.safeSetText('auditorLaminado', `GDM: $${Math.round(precioBase)}/m2`);
            } else {
                const sub = m2Laminado * 4500;
                serviciosCostos += sub;
                activeTerms.push('Laminado');
                this.safeSetText('priceLaminado', fmt(sub));
                this.safeSetText('auditorLaminado', `Unit: $4.500/m2`);
            }
        } else {
            this.safeSetText('priceLaminado', '$0');
            this.safeSetText('auditorLaminado', '');
        }

        // MONTADO SOBRE SUPERFICIE (Tarjeta 04)
        if (this.isTermActive('checkMontado')) {
            const valMontado = parseFloat(document.getElementById('valMontado')?.value) || 1;
            const servMont = window.getGeckoItem("MONTADO") || window.getGeckoItem("SERVICIO DE MONTADO");
            const precioBase = servMont ? (servMont.precio || servMont.precioVenta || 1800) : 1800;

            const sub = valMontado * precioBase;
            serviciosCostos += sub;
            activeTerms.push('Montado Sup.');
            this.safeSetText('priceMontado', fmt(sub));
            this.safeSetText('auditorMontado', `GDM: $${Math.round(precioBase)}/m2`);
        } else {
            this.safeSetText('priceMontado', '$0');
            this.safeSetText('auditorMontado', '');
        }

        // MONTADO EN RÍGIDO (Tarjeta 05) - ALGORITMO DE ALTA PRECISIÓN
        let totalRigidos = 0;
        const switchMontado = document.getElementById('switch-montado');
        const selectorPlacas = document.getElementById('graficaImpresionPlacas');

        if (switchMontado && switchMontado.checked && selectorPlacas) {
            const textoSeleccionado = selectorPlacas.options[selectorPlacas.selectedIndex]?.text;
            const matPlaca = window.getGeckoItem(textoSeleccionado);

            let precioMaterial = 0;
            if (matPlaca) {
                const factor = (mode === 'proyecto') ? 1 : matPlaca.multiplicador;
                precioMaterial = matPlaca.costoARS * factor;

                // Actualizar Auditor de Placa
                this.safeSetText('auditorPlacaRigida', `GDM: ${matPlaca.nombre} | Precio: $${Math.round(precioMaterial)}/m2`);
                console.log('Material encontrado:', matPlaca.nombre, 'Precio:', precioMaterial);
            } else {
                this.safeSetText('auditorPlacaRigida', '');
                if (selectorPlacas.value !== "") {
                    console.error('ERROR: No se encontró el material en window.materiales');
                }
            }

            if (precioMaterial > 0) {
                const containerRigidos = document.getElementById('contenedor-filas-rigidos');
                if (containerRigidos) {
                    const precioCorteRealRigido = (matPlaca && matPlaca.precioCorteMl && parseFloat(matPlaca.precioCorteMl) > 0)
                        ? parseFloat(matPlaca.precioCorteMl) : 0;
                    if (precioCorteRealRigido === 0) {
                        this.safeSetText('auditorPlacaRigida', `⚠️ FALTA PARÁMETRO: precioCorteMl en "${matPlaca?.nombre || 'material'}" — el corte no se está sumando`);
                    }
                    const filas = containerRigidos.querySelectorAll('.fila-rigido');
                    filas.forEach(fila => {
                        const inputs = fila.querySelectorAll('input');
                        if (inputs.length >= 4) {
                            const ancho = parseFloat(inputs[0]?.value) || 0;
                            const alto = parseFloat(inputs[1]?.value) || 0;
                            const cant = parseFloat(inputs[2]?.value) || 1;
                            const corteML = parseFloat(inputs[3]?.value) || 0;

                            const costoMaterial = (ancho * alto * cant / 10000) * precioMaterial;
                            const costoCorte = corteML * precioCorteRealRigido;

                            totalRigidos += (costoMaterial + costoCorte);
                        }
                    });
                }
            }

            if (totalRigidos > 0) activeTerms.push('Montado Rígido');
        }

        // 6. Transfer (Manual por ML)
        if (this.isTermActive('checkTransfer')) {
            const ml = parseFloat(document.getElementById('valTransfer')?.value) || 1;
            const matTransfer = window.getGeckoItem("TRANSFER");
            const precioBase = matTransfer ? matTransfer.precioVenta : 0;
            const sub = ml * precioBase;
            serviciosCostos += sub;
            activeTerms.push('Transfer');
            this.safeSetText('priceTransfer', fmt(sub));
            this.safeSetText('auditorTransfer', `GDM: $${Math.round(precioBase)}/ml`);
        } else {
            this.safeSetText('priceTransfer', '$0');
            this.safeSetText('auditorTransfer', '');
        }

        // 6.1 Tensado de Lona
        if (this.isTermActive('checkTensado')) {
            const ml = parseFloat(document.getElementById('valTensado')?.value) || 1;
            const servTensado = window.getGeckoItem("TENSADO");
            const precioBase = servTensado ? (servTensado.precio || servTensado.precioVenta || 3500) : 3500; // Fallback
            const sub = ml * precioBase;
            serviciosCostos += sub;
            activeTerms.push('Tensado');
            this.safeSetText('priceTensado', fmt(sub));
            this.safeSetText('auditorTensado', `GDM: $${Math.round(precioBase)}/ml`);
        } else {
            this.safeSetText('priceTensado', '$0');
            this.safeSetText('auditorTensado', '');
        }

        // 7. Troquelado (Búsqueda en Mano de Obra con Fallback)
        if (this.isTermActive('checkTroquelado')) {
            const ml = parseFloat(document.getElementById('valTroquelado')?.value) || 1;
            // Búsqueda SOLO en servicios para evitar conflicto con materiales homónimos
            const _serviciosTroq = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
            const servTroq = _serviciosTroq.find(s => s.nombre?.toLowerCase().includes('troquel'))
                || window.getGeckoItem("PLOTER 60")
                || window.getGeckoItem("SERVICIO DE CORTE");
            const precioServ = servTroq ? (servTroq.precio || servTroq.precioVenta || 7800) : 7800;

            if (precioServ === 7800 && !servTroq) {
                console.warn("🦎 GECKO - Usando precio de respaldo para Troquelado: $7.800");
            }

            const sub = ml * precioServ;
            serviciosCostos += sub;
            activeTerms.push('Troquelado');
            this.safeSetText('priceTroquelado', fmt(sub));
            this.safeSetText('auditorTroquelado', `GDM: $${Math.round(precioServ)}/ml`);
        } else {
            this.safeSetText('priceTroquelado', '$0');
            this.safeSetText('auditorTroquelado', '');
        }

        const detalleTerminaciones = activeTerms.join(', ');

        // --- 4. INTEGRACIÓN FINAL (EL CABLE ROTO) ---
        const totalVinilos = costoBase;
        const totalFinal = totalVinilos + serviciosCostos + totalRigidos;

        // ACTUALIZACIÓN DE UI
        this.safeSetText('detMaterialBase', fmt(totalVinilos));
        this.safeSetText('detServicio', fmt(serviciosCostos + totalRigidos));
        this.safeSetText('detTerminaciones', fmt(totalFinal));
        this.safeSetText('subtotalEstimado', fmt(totalFinal));

        // 5. DEBUGGING FORZADO
        console.log('Suma Final Vinilos:', totalVinilos);
        console.log('Suma Final Rígidos:', totalRigidos);
        console.log('TOTAL ENVIADO A PANTALLA:', totalFinal);

        // Persistencia para el Carrito Global
        window.itemActualCotizado = {
            id: Date.now(),
            tipo: 'grafica',
            nombre: document.getElementById('graficaNombre')?.value || 'Trabajo de Impresión',
            material: mat ? mat.nombre : 'Sin material',
            detalle: `${mt2Totales.toFixed(2)} m2 totales | ${detalleTerminaciones || 'Sin terminaciones'}`,
            costo: totalFinal,
            textoOpciones: mat ? mat.nombre : 'S/M'
        };

        // ── Auditor de cálculo ────────────────────────────────────────────────────
        const panelConfGrafica = document.getElementById('panelConfigurador');
        let auditorWrap = document.getElementById('geckoAuditorGrafica');
        console.log('🔍 DIAGNOSTICO: auditorWrap encontrado =', !!auditorWrap, 'cantidad en DOM =', document.querySelectorAll('#geckoAuditorGrafica').length);
        if (!auditorWrap && panelConfGrafica) {
            console.log('🔍 DIAGNOSTICO: creando NUEVO auditorWrap via appendChild');
            auditorWrap = document.createElement('div');
            auditorWrap.id = 'geckoAuditorGrafica';
            auditorWrap.style.marginTop = '-33px';
            panelConfGrafica.appendChild(auditorWrap);
        }
        if (auditorWrap) {
            const fmtVal = n => '$' + Math.round(n).toLocaleString('es-AR');
            const hayDatos = (mat && mt2Totales > 0) || serviciosCostos > 0 || totalRigidos > 0;

            if (hayDatos) {
                const lineaRow = (label, detalle, valor) => `
                    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid #1f1f23;">
                        <div style="flex:1;min-width:0;">
                            <span style="color:#F15A24;font-size:10px;margin-right:6px;">•</span>
                            <span style="color:#d4d4d8;font-size:12px;font-weight:700;">${label}</span>
                            ${detalle ? `<span style="display:block;color:#71717a;font-size:10px;margin-left:16px;margin-top:2px;">${detalle}</span>` : ''}
                        </div>
                        <span style="color:white;font-size:13px;font-weight:900;font-family:monospace;margin-left:12px;white-space:nowrap;">${fmtVal(valor)}</span>
                    </div>`;
                const seccion = titulo =>
                    `<p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#71717a;margin:14px 0 6px;">${titulo}</p>`;

                let html = '';

                // ZONA 1 — MATERIAL BASE
                if (mat && mt2Totales > 0) {
                    html += seccion('Material');
                    html += lineaRow(
                        mat.nombre,
                        `${parseFloat(mt2Totales.toFixed(2))}m² × ${fmtVal(precioM2)}/m²`,
                        costoBase
                    );
                }

                // ZONA 2 — TERMINACIONES Y SERVICIOS
                const termActivas = [];
                if (this.isTermActive('checkRefilado')) {
                    const ml = parseFloat(document.getElementById('valRefilado')?.value) || 1;
                    termActivas.push({ label: 'Refilado', detalle: `${ml}ml × $1.800/ml`, valor: ml * 1800 });
                }
                if (this.isTermActive('checkBolsillo')) {
                    const ml = parseFloat(document.getElementById('valBolsillo')?.value) || 1;
                    termActivas.push({ label: 'Bolsillo', detalle: `${ml}ml × $3.000/ml`, valor: ml * 3000 });
                }
                if (this.isTermActive('checkOjales')) {
                    const cant = parseFloat(document.getElementById('valOjales')?.value) || 1;
                    termActivas.push({ label: 'Ojales', detalle: `${cant}u × $800/u`, valor: cant * 800 });
                }
                if (this.isTermActive('checkLaminado')) {
                    const m2Lam = parseFloat(document.getElementById('graficaLaminadoMt2')?.value) || 0;
                    const lamMat = window.getGeckoItem('Laminado');
                    const precioLam = lamMat ? lamMat.costoARS * (mode === 'proyecto' ? 1 : lamMat.multiplicador) : 4500;
                    termActivas.push({ label: 'Laminado', detalle: `${m2Lam}m² × ${fmtVal(precioLam)}/m²`, valor: m2Lam * precioLam });
                }
                if (this.isTermActive('checkMontado')) {
                    const val = parseFloat(document.getElementById('valMontado')?.value) || 1;
                    const serv = window.getGeckoItem('MONTADO') || window.getGeckoItem('SERVICIO DE MONTADO');
                    const precio = serv ? (serv.precio || serv.precioVenta || 1800) : 1800;
                    termActivas.push({ label: 'Montado sup.', detalle: `${val}m² × ${fmtVal(precio)}/m²`, valor: val * precio });
                }
                if (this.isTermActive('checkTransfer')) {
                    const ml = parseFloat(document.getElementById('valTransfer')?.value) || 1;
                    const matT = window.getGeckoItem('TRANSFER');
                    const precio = matT ? matT.precioVenta : 0;
                    termActivas.push({ label: 'Transfer', detalle: `${ml}ml × ${fmtVal(precio)}/ml`, valor: ml * precio });
                }
                if (this.isTermActive('checkTensado')) {
                    const ml = parseFloat(document.getElementById('valTensado')?.value) || 1;
                    const serv = window.getGeckoItem('TENSADO');
                    const precio = serv ? (serv.precio || serv.precioVenta || 3500) : 3500;
                    termActivas.push({ label: 'Tensado', detalle: `${ml}ml × ${fmtVal(precio)}/ml`, valor: ml * precio });
                }
                if (this.isTermActive('checkTroquelado')) {
                    const ml = parseFloat(document.getElementById('valTroquelado')?.value) || 1;
                    const _servsTroqDetalle = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
                    const serv = _servsTroqDetalle.find(s => s.nombre?.toLowerCase().includes('troquel'))
                        || window.getGeckoItem('PLOTER 60')
                        || window.getGeckoItem('SERVICIO DE CORTE');
                    const precio = serv ? (serv.precio || serv.precioVenta || 7800) : 7800;
                    termActivas.push({ label: 'Troquelado', detalle: `${ml}ml × ${fmtVal(precio)}/ml`, valor: ml * precio });
                }

                if (termActivas.length > 0) {
                    html += seccion('Terminaciones y servicios');
                    termActivas.forEach(t => { html += lineaRow(t.label, t.detalle, t.valor); });
                }

                // ZONA 3 — MONTADO EN RÍGIDO
                if (totalRigidos > 0) {
                    const selectorPlacas = document.getElementById('graficaImpresionPlacas');
                    const textoPlaca = selectorPlacas?.options[selectorPlacas.selectedIndex]?.text || 'Placa';
                    const matPlacaAudit = window.getGeckoItem(textoPlaca);
                    const sinPrecioCorteAudit = !(matPlacaAudit && matPlacaAudit.precioCorteMl && parseFloat(matPlacaAudit.precioCorteMl) > 0);
                    html += seccion('Montado en rígido');
                    if (sinPrecioCorteAudit) {
                        html += lineaRow(textoPlaca, `⚠️ FALTA PARÁMETRO: precioCorteMl — el corte de "${textoPlaca}" no se está sumando`, totalRigidos);
                    } else {
                        html += lineaRow(textoPlaca, 'Material + corte por fila', totalRigidos);
                    }
                }

                // TOTAL
                html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 4px;margin-top:6px;border-top:1px solid #27272a;">
                    <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#a1a1aa;">Total del ítem</span>
                    <span style="font-size:20px;font-weight:900;color:#F15A24;font-family:monospace;">${fmtVal(totalFinal)}</span>
                </div>`;

                auditorWrap.innerHTML = `
                    <div class="card-gecko" style="margin-top:12px;">
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

        // Exportar para compatibilidad legacy
        window._graficaTotal = totalFinal;
        window._graficaM2 = mt2Totales;
    },

    isTermActive: function (id) {
        const el = document.getElementById(id);
        if (!el) return false;
        const grid = el.closest('.grid');
        return el.checked && grid && !grid.classList.contains('hidden');
    },

    safeSetText: function (id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    },

    actualizarSelectorPlacas: function () {
        const select = document.getElementById('graficaImpresionPlacas');
        if (!select || !window.materiales) return;

        const placas = window.materiales.filter(m => {
            const cat = (m.categoria || '').toLowerCase();
            return cat === 'rigido' || cat === 'chapas' || cat === 'polifan' ||
                cat.includes('placa') || cat.includes('rígido') || cat.includes('rigido');
        });

        select.innerHTML = '<option value="">Seleccionar Placa...</option>' +
            placas.map(p => `<option value="${p.id || p.nombre}">${p.nombre}</option>`).join('');
    },

    añadirAlPresupuesto: function () {
        // 1. Sincronización: Forzar cálculo para asegurar datos frescos
        this.calcular();

        // 2. Validar Material
        const matId = document.getElementById('graficaMatEspec')?.value;
        if (!matId) {
            alert("Por favor, seleccioná un material específico.");
            return;
        }

        // 3. Validación: Verificar que al menos una fila tenga medidas válidas
        const filas = document.querySelectorAll('#contenedorFilasVariables .gecko-input-row');
        let valida = false;
        filas.forEach(f => {
            const ins = f.querySelectorAll('input');
            if (ins.length >= 2) {
                const w = parseFloat(ins[0]?.value) || 0;
                const h = parseFloat(ins[1]?.value) || 0;
                if (w > 0 && h > 0) valida = true;
            }
        });

        if (!valida) {
            alert("Cargá al menos un trabajo con Ancho y Alto válidos.");
            return;
        }

        // 4. Construcción del Item
        const mat = window.getGeckoItem(matId);
        const isGremio = document.getElementById('modoGremio')?.checked;
        const gremioSuffix = isGremio ? ' (Gremio)' : '';
        const matNombre = (mat ? mat.nombre : 'Sin material') + gremioSuffix;
        const total = parseFloat(document.getElementById('subtotalEstimado')?.innerText.replace('$', '').replace(/\./g, '')) || 0;
        const nombreIdentificacion = document.getElementById('graficaNombre')?.value || 'Trabajo de Impresión';

        // Resumen para textoOpciones
        const resumenOpciones = `${matNombre}`.toUpperCase();

        const item = {
            id: Date.now(),
            tipo: 'grafica',
            nombre: nombreIdentificacion,
            identificacion: document.getElementById('graficaNombre')?.value?.trim() || '',
            textoOpciones: resumenOpciones,
            costo: total,
            otDetalle: window.itemActualCotizado?.detalle || 'Sin detalle técnico',
            material: matNombre
        };

        // 5. Envío: Llamar al carrito global
        if (typeof window.agregarItemAlPresupuesto === 'function') {
            window.agregarItemAlPresupuesto(item);

            // 6. Feedback y Reset
            if (typeof window.mostrarExito === 'function') {
                window.mostrarExito("Gráfica añadida", matNombre);
            }
            this.resetForm();
        } else {
            console.error("Error: window.agregarItemAlPresupuesto no encontrada.");
        }
    },

    resetForm: function () {
        // Limpiar identificación
        const nombreInput = document.getElementById('graficaNombre');
        if (nombreInput) nombreInput.value = '';

        // Limpiar Categoría y Materiales (sin tocar Cliente)
        const catSelect = document.getElementById('graficaCat');
        if (catSelect) {
            catSelect.value = '';
            this.actualizarMateriales();
        }

        // Limpiar Filas de Trabajo (Dejar solo una vacía)
        const container = document.getElementById('contenedorFilasVariables');
        if (container) {
            container.innerHTML = `
                <div class="grid grid-cols-4 gap-4 px-1 mb-1">
                    <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Ancho (cm)</span>
                    <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Alto (cm)</span>
                    <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold text-center">Cant</span>
                    <span></span>
                </div>
            `;
            window.agregarFilaTrabajo();
        }

        // Desmarcar Terminaciones
        document.querySelectorAll('.card-gecko input[type="checkbox"]').forEach(cb => {
            if (cb.id !== 'checkModoProyecto') cb.checked = false; // No reseteamos el modo de cotización
        });

        // Ocultar paneles dinámicos
        const montadoDetalle = document.getElementById('detallesMontado');
        if (montadoDetalle) montadoDetalle.classList.add('hidden');

        const rigidoContainer = document.getElementById('contenedor-filas-rigidos');
        if (rigidoContainer) rigidoContainer.innerHTML = '';

        this.calcular();
    },

    setLaminadoTouched: function () {
        this.state.laminadoTouched = true;
    },

    syncLaminado: function (force = false) {
        const chk = document.getElementById('checkLaminado');
        const input = document.getElementById('graficaLaminadoMt2');
        if (!chk || !input) return;

        // Si se fuerza (ej: clic en reset), reseteamos el flag de "tocado"
        if (force === true) {
            this.state.laminadoTouched = false;
        }

        // Solo actualizamos si el checkbox está ON y el usuario NO ha tocado el campo manualmente
        if (chk.checked && (!this.state.laminadoTouched || force === true)) {
            let areaTot = 0;
            const filas = document.querySelectorAll('#contenedorFilasVariables .gecko-input-row');
            filas.forEach(f => {
                const inputs = f.querySelectorAll('input');
                const w = parseFloat(inputs[0]?.value) || 0;
                const h = parseFloat(inputs[1]?.value) || 0;
                const c = parseFloat(inputs[2]?.value) || 0;
                areaTot += (w * h / 10000) * c;
            });
            input.value = areaTot.toFixed(2);
            if (force === true) this.calcular();
        }
    },

    initFilaRigidos: function () {
        const container = document.getElementById('contenedor-filas-rigidos');
        if (container && container.children.length === 0) {
            window.agregarFilaMontado();
        }
    }
};

window.agregarFilaMontado = function () {
    const container = document.getElementById('contenedor-filas-rigidos');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "gecko-input-row fila-rigido animate-in fade-in slide-in-from-right-2";
    div.innerHTML = `
        <input type="number" placeholder="Ancho" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
        <input type="number" placeholder="Alto" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
        <input type="number" value="1" class="text-center" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
        <div class="flex items-center gap-2">
            <input type="number" placeholder="ML" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
            <button onclick="this.closest('.gecko-input-row').remove(); window.calcularCostoGrafica();" 
                class="text-zinc-700 hover:text-red-500 transition-colors px-2 pb-1">✕</button>
        </div>
    `;
    container.appendChild(div);
    window.GeckoGrafica.calcular();
};

// --- PUENTES GLOBALES ---
window.actualizarSubMaterialesGrafica = () => window.GeckoGrafica.actualizarMateriales();
window.calcularCostoGrafica = () => window.GeckoGrafica.calcular();

window.agregarFilaTrabajo = function () {
    const container = document.getElementById('contenedorFilasVariables');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'gecko-input-row animate-in slide-in-from-left-2';
    div.innerHTML = `
        <input type="number" placeholder="Ancho" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
        <input type="number" placeholder="Alto" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
        <input type="number" value="1" class="text-center" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
        <div class="flex justify-end pr-2 pb-1">
            <button onclick="this.closest('.gecko-input-row').remove(); window.GeckoGrafica.syncLaminado(); window.calcularCostoGrafica();" 
                class="text-zinc-700 hover:text-red-500 transition-colors">✕</button>
        </div>
    `;
    container.appendChild(div);
    window.GeckoGrafica.syncLaminado();
    window.GeckoGrafica.calcular();
};

// Sobrecarga de inicialización
const originalCambiarCat = window.cambiarCategoriaCotizador;
window.cambiarCategoriaCotizador = function (cat) {
    originalCambiarCat(cat);
    if (cat === 'grafica') setTimeout(() => window.GeckoGrafica.init(), 100);
};
