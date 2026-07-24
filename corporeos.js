// corporeos.js - Módulo extraído

// Helper global: devuelve precioGremio (con fallback) o precioVenta según switch activo
window.getCorpPrecio = function (item) {
    if (!item) return 0;
    // Si el ítem tiene precio de venta final directo (servicios), usarlo sin multiplicar
    if (item.precio && item.precio > 0) return item.precio;
    const isGremio = document.getElementById('modoGremio')?.checked;
    const costoARS = item.costo || item.costoReal || item.costoARS || (item.costoUSD * (window.GECKO_SETTINGS?.cotizacionDolar || 1415)) || 0;
    const mult = item.multiplicador || window.GECKO_SETTINGS?.multiplicadorGlobal || 2.0;
    const precioVenta = item.precioVenta || Math.round(costoARS * mult);
    if (isGremio) {
        const mGremio = item.multGremio || 1.5;
        const precioGremioCalc = Math.round(costoARS * mGremio);
        const precioGremio = (item.precioGremio && item.precioGremio > 0) ? item.precioGremio : precioGremioCalc;
        return (precioGremio && precioGremio > 0) ? precioGremio : precioVenta;
    }
    return precioVenta;
};

// Helper global: resuelve el área (m²) de un cotizador de corpóreos.
// Si hay Ancho y Alto cargados, calcula el área y bloquea el input (autocálculo).
// Si falta alguno de los dos, habilita el input para carga manual y usa ese valor.
window._geckoResolverArea = function (idArea, ancho, alto) {
    const inputArea = document.getElementById(idArea);
    const clasesAuto = ['opacity-50', 'cursor-not-allowed', 'bg-zinc-900/40'];
    let areaM2;
    if (ancho > 0 && alto > 0) {
        areaM2 = (ancho * alto) / 10000;
        if (inputArea) {
            inputArea.value = areaM2.toFixed(2);
            inputArea.readOnly = true;
            inputArea.classList.add(...clasesAuto);
        }
    } else {
        areaM2 = parseFloat(inputArea?.value) || 0;
        if (inputArea) {
            inputArea.readOnly = false;
            inputArea.classList.remove(...clasesAuto);
        }
    }
    return areaM2;
};

window.setCorpModo = function (modo) {
    window._corpModo = modo;
    // Actualización de navegación activa
    document.querySelectorAll('[id^="sub-"]').forEach(el => el.classList.remove('nav-active'));
    let subId = 'sub-corporeos';
    if (modo === 'polifan') subId = 'sub-polifan';
    else if (modo === 'letras3d') subId = 'sub-letras-3d';
    else if (modo === '3d') subId = 'sub-3d';
    else if (modo === 'chapa-acrilico') subId = 'sub-chapa-acrilico';

    const subEl = document.getElementById(subId);
    if (subEl) subEl.classList.add('nav-active');

    const container = document.getElementById('corporeosDinamico');
    if (!container) return;

    // Configuración de Título Imponente
    const titleEl = document.getElementById('configuradorTitle');
    if (titleEl) {
        const titleMap = {
            'polifan': 'Cotizador de Polifán',
            'chapa': 'Cotizador de Chapa y Acrílico',
            'chapa-acrilico': 'Cotizador de Chapa y Acrílico',
            '3d': 'Cotizador de Impresión 3D',
            'letras3d': 'Cotizador de Letras 3D (Estimado)'
        };
        titleEl.innerText = titleMap[modo] || 'Cotizador de Corpóreos';
        titleEl.className = "text-2xl font-black text-white uppercase tracking-tighter mb-1";
    }

    if (modo === 'polifan') {
        container.innerHTML = `
            <!-- 01. IDENTIFICACIÓN -->
            <div class="card-gecko">
                <div class="flex items-center justify-between w-full mb-2">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">01. IDENTIFICACIÓN</p>
                </div>
                <input type="text" id="polifanNombre" oninput="window.calcularCostoPolifan()" placeholder="Ej: Logo para Oficina" 
                    class="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gecko transition-all" onwheel="this.blur()">
            </div>

            <!-- 02. Variables del Proyecto -->
            <div class="card-gecko space-y-2 animate-in fade-in slide-in-from-top-1">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">02. Variables de proyecto</p>
                <div class="grid grid-cols-5 gap-4">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Ancho (cm)</label>
                        <input type="number" id="polifanAncho" class="gecko-input w-full" placeholder="0" oninput="window.calcularCostoPolifan()" onwheel="this.blur()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Alto (cm)</label>
                        <input type="number" id="polifanAlto" class="gecko-input w-full" placeholder="0" oninput="window.calcularCostoPolifan()" onwheel="this.blur()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Área (m²)</label>
                        <input type="number" id="polifanArea" class="gecko-input w-full" placeholder="0" oninput="window.calcularCostoPolifan()" onwheel="this.blur()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Perímetro (cm)</label>
                        <input type="number" id="polifanPerimetro" class="gecko-input w-full" placeholder="0" oninput="window.calcularCostoPolifan()" onwheel="this.blur()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Cantidad</label>
                        <input type="number" id="polifanCantidad" class="gecko-input w-full" value="1" oninput="window.calcularCostoPolifan()" onwheel="this.blur()">
                    </div>
                </div>
                <p id="auditorCortePolifan" class="text-[11px] text-zinc-400 font-medium italic mt-2.5 ml-1"></p>
            </div>

            <!-- 03. Cuerpo -->
            <div class="card-gecko space-y-2 animate-in fade-in slide-in-from-top-2">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">03. Cuerpo (Espesor)</p>
                <div class="grid grid-cols-1 gap-4">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Espesor Polifán</label>
                        <select id="polifanEspesor" class="gecko-select w-full" onchange="window.calcularCostoPolifan()" onwheel="this.blur()"></select>
                        <p id="auditorEspesorPolifan" class="text-[11px] text-zinc-400 font-medium italic mt-2.5 ml-1"></p>
                    </div>
                </div>
            </div>

            <!-- 04. FRENTE (CAPAS) -->
            <div class="card-gecko animate-in fade-in slide-in-from-top-3">
                <div class="seccion-switch-gecko">
                    <p class="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-2 guia-gecko">04. Frente (Capas)</p>
                    
                    <div class="switch-row" onclick="document.getElementById('chkLlevaFrente').click()">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-orange-950/30 rounded-xl flex items-center justify-center border border-orange-900/30">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gecko" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-[11px] font-black text-white uppercase tracking-wider">¿LLEVA FRENTE?</p>
                                <p class="text-[9px] font-bold text-zinc-500 uppercase">PAI, ACRÍLICO, PVC</p>
                            </div>
                        </div>
                        
                        <label class="switch-gecko" onclick="event.stopPropagation()">
                            <input type="checkbox" id="chkLlevaFrente" onchange="window.toggleFrentePolifan()">
                            <span class="slider-gecko"></span>
                        </label>
                    </div>

                    <div id="detallesFrentePolifan" class="hidden mt-6 space-y-4 pt-4 border-t border-zinc-800/50">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[11px] text-zinc-400 mb-2">Material Base</label>
                                <select id="selectorBaseFrente" class="gecko-select w-full" onchange="window.calcularCostoPolifan()" onwheel="this.blur()"></select>
                            </div>
                            <div>
                                <label class="block text-[11px] text-zinc-400 mb-2">Vinilo Adicional</label>
                                <select id="selectorViniloFrente" class="gecko-select w-full" onchange="window.calcularCostoPolifan()" onwheel="this.blur()"></select>
                            </div>
                        </div>
                        <p id="auditorFrentePro" class="text-[11px] text-zinc-400 font-medium italic mt-2 ml-1"></p>
                    </div>
                </div>
            </div>

            <!-- 05. PINTURA -->
            <div class="card-gecko animate-in fade-in slide-in-from-top-4">
                <div class="seccion-switch-gecko">
                    <p class="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-2 guia-gecko">05. Pintura</p>
                    
                    <div class="switch-row" onclick="document.getElementById('chkLlevaPintura').click()">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-orange-950/30 rounded-xl flex items-center justify-center border border-orange-900/30">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gecko" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-[11px] font-black text-white uppercase tracking-wider">PINTURA</p>
                                <p class="text-[9px] font-bold text-zinc-500 uppercase">OPCIONAL: COLORES A ELECCIÓN</p>
                            </div>
                        </div>
                        
                        <label class="switch-gecko" onclick="event.stopPropagation()">
                            <input type="checkbox" id="chkLlevaPintura" onchange="window.togglePinturaPolifan()">
                            <span class="slider-gecko"></span>
                        </label>
                    </div>

                    <div id="detallesPinturaPolifan" class="hidden mt-6 space-y-4 pt-4 border-t border-zinc-800/50">
                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-8">
                                <label class="block text-[11px] text-zinc-400 mb-2">Colores</label>
                                <input type="text" id="pinturaColores" class="gecko-input w-full" placeholder="Ej: Rojo y Blanco" oninput="window.calcularCostoPolifan()" onwheel="this.blur()">
                            </div>
                            <div class="col-span-4">
                                <label class="block text-[11px] text-zinc-400 mb-2">Precio ($)</label>
                                <input type="number" id="pinturaPrecio" class="gecko-input w-full" value="0" oninput="window.calcularCostoPolifan()" onwheel="this.blur()">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        `;

        // --- Lógica de Población Dinámica ---
        const selEsp = document.getElementById('polifanEspesor');
        if (selEsp) {
            const mats = (window.materiales || []).filter(m => m.categoria === 'polifan');
            selEsp.innerHTML = mats.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('') || '<option value="0">Sin materiales</option>';
        }

        const selBase = document.getElementById('selectorBaseFrente');
        if (selBase) {
            const mats = (window.materiales || []).filter(m => {
                const cat = (m.categoria || '').toLowerCase().trim();
                const nombre = (m.nombre || '').toUpperCase();
                const sub = (m.subcategoria || '').toUpperCase();
                return cat === 'rigido' && (
                    nombre.includes('PAI') ||
                    nombre.includes('ACRILICO') ||
                    nombre.includes('PVC') ||
                    nombre.includes('ALTO IMPACTO') ||
                    sub.includes('PAI') ||
                    sub.includes('ACRILICO') ||
                    sub.includes('PVC')
                );
            });
            selBase.innerHTML = mats.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('') || '<option value="0">Sin materiales base</option>';
        }

        const selTerm = document.getElementById('selectorViniloFrente');
        if (selTerm) {
            const mats = (window.materiales || []).filter(m => {
                const cat = (m.categoria || '').toLowerCase().trim();
                return (cat === 'vinilos_lonas' || cat === 'flexible') &&
                       !m.nombre.toUpperCase().includes('LONA');
            });
            let html = '<option value="NINGUNA">NINGUNA / SOLO MATERIAL BASE</option>';
            html += mats.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('');
            selTerm.innerHTML = html;
        }

        window.toggleFrentePolifan = function () {
            const chk = document.getElementById('chkLlevaFrente');
            const wrapper = document.getElementById('detallesFrentePolifan');
            if (wrapper) wrapper.classList.toggle('hidden', !chk.checked);
            window.calcularCostoPolifan();
        };

        window.togglePinturaPolifan = function () {
            const chk = document.getElementById('chkLlevaPintura');
            const wrapper = document.getElementById('detallesPinturaPolifan');
            if (wrapper) wrapper.classList.toggle('hidden', !chk.checked);
            window.calcularCostoPolifan();
        };

        setTimeout(() => window.calcularCostoPolifan(), 50);

    } else if (modo === 'chapa-acrilico') {
        container.innerHTML = `
            <!-- 01. IDENTIFICACIÓN -->
            <div class="card-gecko">
                <div class="flex items-center justify-between w-full mb-2">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">01. IDENTIFICACIÓN</p>
                </div>
                <input type="text" id="chapaNombre" oninput="window.calcularChapaAcrilico()" placeholder="Ej: Cartel Cajón Chapa" 
                    class="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gecko transition-all">
            </div>

            <!-- 02. Variables de Proyecto -->
            <div class="card-gecko space-y-2 animate-in fade-in slide-in-from-top-1">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">02. Variables de proyecto</p>
                <div class="grid grid-cols-6 gap-3">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Ancho (cm)</label>
                        <input type="number" id="chapaAncho" class="gecko-input w-full" placeholder="0" oninput="window.calcularChapaAcrilico()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Alto (cm)</label>
                        <input type="number" id="chapaAlto" class="gecko-input w-full" placeholder="0" oninput="window.calcularChapaAcrilico()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Área (m²)</label>
                        <input type="number" id="chapaArea" class="gecko-input w-full" placeholder="0" oninput="window.calcularChapaAcrilico()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Perímetro (cm)</label>
                        <input type="number" id="chapaPerimetro" class="gecko-input w-full" placeholder="0" oninput="window.calcularChapaAcrilico()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Prof. (cm)</label>
                        <input type="number" id="chapaProfundidad" class="gecko-input w-full" placeholder="0" oninput="window.calcularChapaAcrilico()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Cant.</label>
                        <input type="number" id="chapaCantidad" class="gecko-input w-full" value="1" oninput="window.calcularChapaAcrilico()">
                    </div>
                </div>
            </div>

            <!-- 03. Cuerpo (Fleje) -->
            <div class="card-gecko space-y-2 animate-in fade-in slide-in-from-top-2">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">03. Cuerpo (Fleje/Lateral)</p>
                <div class="grid grid-cols-1 gap-4">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Material del Fleje</label>
                        <select id="chapaFlejeMat" class="gecko-select w-full" onchange="window.calcularChapaAcrilico()"></select>
                    </div>
                </div>
            </div>

            <!-- 04. Frente -->
            <div class="card-gecko animate-in fade-in slide-in-from-top-3">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] mb-4 guia-naranja">04. Frente</p>
                <div id="contenedorFilasFrente" class="space-y-3">
                    ${window._geckoFilaFrenteFondo('frente')}
                </div>
                <button type="button" onclick="window._geckoAgregarFilaFrenteFondo('frente')"
                    class="w-full py-2 mt-3 rounded-xl border border-dashed border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:border-gecko hover:text-gecko transition-all">
                    + Agregar material de frente
                </button>
            </div>

            <!-- 04B. Fondo -->
            <div class="card-gecko animate-in fade-in slide-in-from-top-3">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] mb-4 guia-naranja">04B. Fondo</p>
                <div id="contenedorFilasFondo" class="space-y-3">
                    ${window._geckoFilaFrenteFondo('fondo')}
                </div>
                <button type="button" onclick="window._geckoAgregarFilaFrenteFondo('fondo')"
                    class="w-full py-2 mt-3 rounded-xl border border-dashed border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:border-gecko hover:text-gecko transition-all">
                    + Agregar material de fondo
                </button>
            </div>

            ${window._geckoHtmlCardIluminacion()}

            <!-- Mano de obra interna -->
            <div class="card-gecko space-y-2 animate-in fade-in slide-in-from-top-4">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">Mano de obra interna</p>
                <div>
                    <label class="block text-[11px] text-zinc-400 mb-1">Días de trabajo</label>
                    <input type="number" id="chapaDiasTrabajo" class="gecko-input w-full" placeholder="0" oninput="window.calcularChapaAcrilico()">
                </div>
            </div>

            <!-- AUDITOR VISUAL -->
            <div id="auditorChapa" class="card-gecko border-dashed border-zinc-700 bg-transparent">
                <p class="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">RESUMEN DE INGENIERÍA</p>
                <div id="auditorChapaCuerpo" class="text-zinc-400 text-[11px] space-y-1.5 font-medium">
                    <p>Estructura (Cuerpo+Frente+Fondo): <span class="text-white">$0</span></p>
                    <p>Corte Láser Total: <span class="text-white">$0</span></p>
                    <p>LEDs: 0 unidades + Fuente Recomendada: <span class="text-white">$0</span></p>
                    <p>Vinilos: Material + Montado: <span class="text-white">$0</span></p>
                    <div class="border-t border-zinc-800 pt-2 mt-2">
                        <p class="text-sm font-black text-gecko uppercase italic">TOTAL ITEM: <span id="totalChapa">$0</span></p>
                    </div>
                </div>
            </div>

        `;

        window.initChapaAcrilicoSelects();
        setTimeout(() => window.calcularChapaAcrilico(), 50);

    } else if (modo === 'letras3d') {
        container.innerHTML = `
            <div class="card-gecko">
                <div class="flex items-center justify-between w-full mb-2">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">01. IDENTIFICACIÓN</p>
                    ${window.renderSwitchModo('letras3d')}
                </div>
                <input type="text" id="letras3dNombre" oninput="window.calcularLetras3D()" placeholder="Ej: Letras Corpóreas 3D" 
                    class="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gecko transition-all">
            </div>

            <div class="card-gecko space-y-2 animate-in fade-in slide-in-from-top-1">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">02. Variables de proyecto</p>
                <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Ancho (cm)</label><input type="number" id="3dAncho" class="gecko-input w-full" placeholder="0" oninput="window.calcularLetras3D()"></div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Alto (cm)</label><input type="number" id="3dAlto" class="gecko-input w-full" placeholder="0" oninput="window.calcularLetras3D()"></div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Área (m²)</label><input type="number" id="3dArea" class="gecko-input w-full" placeholder="0" oninput="window.calcularLetras3D()"></div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Perímetro (cm)</label><input type="number" id="3dPerimetro" class="gecko-input w-full" placeholder="0" oninput="window.calcularLetras3D()"></div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Profundidad (cm)</label><input type="number" id="3dProfundidad" class="gecko-input w-full" placeholder="0" oninput="window.calcularLetras3D()"></div>
                </div>
            </div>

            <div class="card-gecko space-y-2 animate-in fade-in slide-in-from-top-2">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">03. Material (Filamento)</p>
                <div class="grid grid-cols-1 gap-4">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Tipo de Filamento</label>
                        <select id="3dMaterial" class="gecko-select w-full" onchange="window.calcularLetras3D()"></select>
                        <p id="auditor3D" class="text-[11px] text-zinc-400 font-medium italic mt-2.5 ml-1">Selecioná un material para calcular</p>
                    </div>
                </div>
            </div>

            <div class="card-gecko space-y-2 animate-in fade-in slide-in-from-top-3">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">04. Frente</p>
                <p style="font-size:10px;color:#71717a;margin:0 0 8px;">Elegí una de las dos opciones (no se pueden combinar).</p>
                <div class="grid grid-cols-1 gap-4">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Material de Frente (acrílico/rígido)</label>
                        <select id="3dFrenteMat" class="gecko-select w-full" onchange="window.onCambio3DFrenteMat()"></select>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-4">
                    <p class="text-[11px] font-bold text-zinc-300 uppercase">¿Lleva servicio de corte láser?</p>
                    <label class="switch-gecko">
                        <input type="checkbox" id="chkCorteFrenteLetras3D" onchange="window.calcularLetras3D()">
                        <span class="slider-gecko"></span>
                    </label>
                </div>
                <div class="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
                    <p class="text-[11px] font-bold text-zinc-300 uppercase">¿Frente 3D integrado (impreso junto)?</p>
                    <label class="switch-gecko">
                        <input type="checkbox" id="chk3DFrenteIntegrado" onchange="window.onCambio3DFrenteIntegrado()">
                        <span class="slider-gecko"></span>
                    </label>
                </div>
            </div>

            ${window._geckoHtmlCardIluminacion()}

            <div class="card-gecko space-y-2 animate-in fade-in slide-in-from-top-3">
                <div class="flex justify-between text-[11px] text-zinc-400 uppercase tracking-widest font-bold">
                    <span>06. Resumen Estimado</span>
                </div>
                <div class="flex justify-between text-[11px] text-zinc-400 uppercase tracking-widest font-bold">
                    <span>Peso Est. (gr)</span>
                    <span id="res3dPeso" class="text-white">0 gr</span>
                </div>
                <div class="flex justify-between text-[11px] text-zinc-400 uppercase tracking-widest font-bold">
                    <span>Tiempo Est. (hs)</span>
                    <span id="res3dTiempo" class="text-white">0 hs</span>
                </div>
            </div>

            <div class="card-gecko space-y-2">
                <div class="seccion-switch-gecko">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja mb-2">07. Acabado de pintura</p>
                    <div class="switch-row" onclick="document.getElementById('chkLlevaPinturaLetras3D').click()">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-orange-950/30 rounded-xl flex items-center justify-center border border-orange-900/30">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gecko" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-[11px] font-black text-white uppercase tracking-wider">PINTURA</p>
                                <p class="text-[9px] font-bold text-zinc-500 uppercase">Área: Cuerpo (est.) + Frente</p>
                            </div>
                        </div>
                        <label class="switch-gecko" onclick="event.stopPropagation()">
                            <input type="checkbox" id="chkLlevaPinturaLetras3D" onchange="window.togglePinturaLetras3D()">
                            <span class="slider-gecko"></span>
                        </label>
                    </div>
                    <div id="detallesPinturaLetras3D" class="hidden mt-6 space-y-3 pt-4 border-t border-zinc-800/50">
                        <div id="filasPinturaLetras3D" class="space-y-2"></div>
                        <button type="button" onclick="window.agregarFilaPinturaLetras3D()"
                            class="w-full py-2 mt-2 rounded-xl border border-dashed border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:border-gecko hover:text-gecko transition-all">
                            + Agregar pintura / base
                        </button>
                    </div>
                </div>
            </div>

        `;

        const selMat = document.getElementById('3dMaterial');
        if (selMat) {
            const mats = (window.materiales || []).filter(m => {
                const cat = (m.categoria || '').toLowerCase().trim();
                return cat === '3d';
            });
            selMat.innerHTML = mats.length > 0
                ? mats.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('')
                : '<option value="">Sin materiales 3D cargados</option>';
        }

        const selFrente3D = document.getElementById('3dFrenteMat');
        if (selFrente3D) {
            const matsFrente = (window.materiales || []).filter(m => (m.categoria || '').toLowerCase().trim() === 'rigido');
            let htmlFrente = '<option value="SIN_FRENTE">SIN FRENTE</option>';
            htmlFrente += matsFrente.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
            selFrente3D.innerHTML = htmlFrente;
        }

        window._geckoPoblarSelectIluminacion();

        window.calcularLetras3D();

    } else {
        // Lógica original para otros modos (Chapa, 3D, etc)
        container.innerHTML = `
            <div class="card-gecko">
                <div class="flex items-center justify-between w-full mb-2">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">01. IDENTIFICACIÓN</p>
                    ${window.renderSwitchModo('corporeos')}
                </div>
                <input type="text" id="corpNombre" oninput="window.calcularCorporeos()" placeholder="Ej: Letras Corpóreas Chapa" 
                    class="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gecko transition-all">
            </div>

            <div class="card-gecko space-y-2">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">02. Variables de proyecto</p>
                <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Ancho (cm)</label><input type="number" id="corpAncho" class="gecko-input w-full" placeholder="0" oninput="calcularCorporeos()"></div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Alto (cm)</label><input type="number" id="corpAlto" class="gecko-input w-full" placeholder="0" oninput="calcularCorporeos()"></div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Perímetro (cm)</label><input type="number" id="corpPerimetro" class="gecko-input w-full" placeholder="0" oninput="calcularCorporeos()"></div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Profund. (cm)</label><input type="number" id="corpProfundidad" class="gecko-input w-full" placeholder="0" oninput="calcularCorporeos()"></div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Desperdicio (%)</label><input type="number" id="corpDesperdicio" class="gecko-input w-full" placeholder="15" oninput="calcularCorporeos()"></div>
                </div>
            </div>

            <div class="card-gecko space-y-2">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">03. Lógica del cuerpo (Fleje)</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Tipo de cuerpo</label>
                        <select id="corpTipoCuerpo" class="gecko-select w-full" onchange="actualizarStockCuerpo(); calcularCorporeos()">
                            <option value="Chapa">Chapa</option>
                            <option value="Acrílico">Acrílico</option>
                            <option value="PVC">PVC</option>
                            <option value="3D">Impresión 3D</option>
                        </select>
                    </div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Material en stock</label><select id="corpStockCuerpo" class="gecko-select w-full" onchange="calcularCorporeos()"></select></div>
                </div>
            </div>

            <div class="card-gecko space-y-2">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">04. Frente, Fondo y Vinilo</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Material del Frente</label>
                        <select id="corpMaterialFrente" class="gecko-select w-full" onchange="calcularCorporeos()">
                            <option value="Acrílico 3mm">Acrílico 3mm</option>
                            <option value="Chapa N18">Chapa N18</option>
                            <option value="PAI 1.5mm">PAI 1.5mm</option>
                            <option value="PVC 5mm">PVC 5mm</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Material de Fondo</label>
                        <select id="corpMaterialFondo" class="gecko-select w-full" onchange="calcularCorporeos()">
                            <option value="Sin Fondo">Sin Fondo</option>
                            <option value="PVC 3mm">PVC 3mm</option>
                            <option value="PVC 5mm">PVC 5mm</option>
                            <option value="Chapa">Chapa</option>
                        </select>
                    </div>
                </div>
                <div class="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5 group hover:border-orange-500/30 transition-all">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                            <i class="bi bi-layers"></i>
                        </div>
                        <p class="text-[12px] font-bold text-zinc-300">¿Lleva Vinilo sobre el frente?</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="corpLlevaVinilo" class="sr-only peer" onchange="document.getElementById('opVinilo').classList.toggle('hidden', !this.checked); calcularCorporeos()">
                        <div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-orange-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                </div>
                <div id="opVinilo" class="hidden"><select id="corpTipoVinilo" class="gecko-select w-full" onchange="calcularCorporeos()"><option value="Impreso">Vinilo Impreso</option><option value="Corte">Vinilo de Corte</option></select></div>
            </div>

            <div class="card-gecko space-y-2">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">05. Iluminación</p>
                <div class="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5 group hover:border-yellow-500/30 transition-all">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                            <i class="bi bi-lightbulb"></i>
                        </div>
                        <p class="text-[12px] font-bold text-zinc-300">¿Lleva Iluminación?</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="corpLlevaIlum" class="sr-only peer" onchange="document.getElementById('opIlum').classList.toggle('hidden', !this.checked); calcularCorporeos()">
                        <div class="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-orange-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                </div>
                <div id="opIlum" class="hidden pl-4">
                    <select id="corpTipoIlum" class="gecko-select w-full" onchange="calcularCorporeos()">
                        <option value="modulos">Módulos LED (Área)</option>
                        <option value="tira">Tira LED (Perímetro)</option>
                    </select>
                    <p id="infoLed" class="text-[10px] text-orange-400 mt-1"></p>
                </div>
            </div>

            <button onclick="addCorporeoAlPresupuesto()" class="w-full py-3 bg-gecko text-white font-bold rounded-xl hover:bg-orange-700 uppercase tracking-widest text-[12px] transition-all">+ Añadir a cotización</button>
        `;
        if (typeof actualizarStockCuerpo === 'function') actualizarStockCuerpo();
        if (typeof poblarSelectoresCorpóreos === 'function') poblarSelectoresCorpóreos();
        if (typeof calcularCorporeos === 'function') calcularCorporeos();
    }
}

window.toggleFrentePolifan = function () {
    const chk = document.getElementById('chkLlevaFrente');
    const wrapper = document.getElementById('wrapperFrentePolifan');
    if (wrapper) wrapper.classList.toggle('hidden', !chk.checked);
    window.updateFrenteSelectors();
}

// window.updateFrenteSelectors eliminada por simplificación de UI Polifán Pro

window.actualizarStockCuerpo = function () {
    const tipo = document.getElementById('corpTipoCuerpo')?.value;
    const stock = document.getElementById('corpStockCuerpo');
    if (!stock || !tipo) return;

    const materiales = window.materiales || [];
    let filtrados = [];

    if (tipo === '3D') {
        filtrados = materiales.filter(m => m.categoria === '3d');
    } else {
        filtrados = materiales.filter(m => {
            const nombreM = m.nombre.toLowerCase();
            const catM = (m.categoria || '').toLowerCase();
            return nombreM.includes(tipo.toLowerCase()) || catM === 'rigido';
        });
    }

    if (filtrados.length > 0) {
        stock.innerHTML = filtrados.map(m => `<option value="${m.costo || m.costoARS || 0}">${m.nombre}</option>`).join('');
    } else {
        stock.innerHTML = `<option value="0">Sin stock de ${tipo}</option>`;
    }

    if (typeof calcularCorporeos === 'function') calcularCorporeos();
}

window.onCambio3DFrenteMat = function () {
    const sel = document.getElementById('3dFrenteMat');
    const chk = document.getElementById('chk3DFrenteIntegrado');
    if (sel && sel.value !== 'SIN_FRENTE' && chk) chk.checked = false;
    window.calcularLetras3D();
};

window.onCambio3DFrenteIntegrado = function () {
    const chk = document.getElementById('chk3DFrenteIntegrado');
    const sel = document.getElementById('3dFrenteMat');
    if (chk && chk.checked && sel) sel.value = 'SIN_FRENTE';
    window.calcularLetras3D();
};

window.agregarFilaPinturaLetras3D = function () {
    const cont = document.getElementById('filasPinturaLetras3D');
    if (!cont) return;
    const rowId = 'pintL3D_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
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
            <select class="input-pintura-mat gecko-select-pro w-full" onchange="window.calcularLetras3D()">
                <option value="">Seleccionar material...</option>
                ${opciones}
            </select>
        </div>
        <div class="col-span-5">
            <input type="text" class="input-pintura-codigo gecko-input w-full" placeholder="Código de color (manual)" oninput="window.calcularLetras3D()">
        </div>
        <div class="col-span-1 text-center">
            <button type="button" onclick="window.eliminarFilaPinturaLetras3D('${rowId}')" class="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
        </div>
    `;
    cont.appendChild(row);
    window.calcularLetras3D();
};

window.eliminarFilaPinturaLetras3D = function (rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    window.calcularLetras3D();
};

window.togglePinturaLetras3D = function () {
    const chk = document.getElementById('chkLlevaPinturaLetras3D');
    const wrapper = document.getElementById('detallesPinturaLetras3D');
    if (wrapper) wrapper.classList.toggle('hidden', !chk.checked);
    if (chk.checked) {
        const cont = document.getElementById('filasPinturaLetras3D');
        if (cont && cont.children.length === 0) {
            window.agregarFilaPinturaLetras3D();
        }
    }
    window.calcularLetras3D();
};

window.calcularLetras3D = function () {
    const ancho = parseFloat(document.getElementById('3dAncho')?.value) || 0;
    const alto = parseFloat(document.getElementById('3dAlto')?.value) || 0;
    const perimetro = parseFloat(document.getElementById('3dPerimetro')?.value) || 0;
    const profundidad = parseFloat(document.getElementById('3dProfundidad')?.value) || 0;

    // Cálculo de volumen estimado (cuerpo/costados, sin cambios)
    const gramosCuerpo = perimetro * profundidad * 0.15;
    const areaFrenteM2 = window._geckoResolverArea('3dArea', ancho, alto);
    const settings3D = JSON.parse(localStorage.getItem('GECKO_SETTINGS') || '{}');

    // Frente: material aparte O integrado a la impresión (excluyentes)
    const selFrenteMat = document.getElementById('3dFrenteMat');
    const valFrenteMat = selFrenteMat?.value;
    const frenteEsMaterial = valFrenteMat && valFrenteMat !== 'SIN_FRENTE';
    const frenteEsIntegrado = document.getElementById('chk3DFrenteIntegrado')?.checked;
    const hayFrente = frenteEsMaterial || frenteEsIntegrado;

    let costoFrenteMaterial = 0;
    let costoFrenteCorte = 0;
    let nombreFrenteMat = '';
    let nombreServCorteFrente3D = '';
    if (frenteEsMaterial) {
        const matFrenteObj = (window.materiales || []).find(m => String(m.id) === String(valFrenteMat));
        if (matFrenteObj) {
            nombreFrenteMat = matFrenteObj.nombre;
            const precioM2Frente = parseFloat(matFrenteObj.precioVenta || matFrenteObj.costo || 0);
            costoFrenteMaterial = areaFrenteM2 * precioM2Frente;
            if (document.getElementById('chkCorteFrenteLetras3D')?.checked) {
                const perimetroMl3D = perimetro / 100;
                if (matFrenteObj.precioCorteMl && parseFloat(matFrenteObj.precioCorteMl) > 0) {
                    // Prioridad: precio de corte propio del material (precioCorteMl)
                    costoFrenteCorte = perimetroMl3D * parseFloat(matFrenteObj.precioCorteMl);
                    nombreServCorteFrente3D = `Corte L\u00e1ser - ${nombreFrenteMat}`;
                } else {
                    const servicios3D = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
                    const normalizar3D = (txt) => String(txt || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
                    const qNorm3D = normalizar3D("CORTE LASER " + nombreFrenteMat);
                    // B\u00fasqueda robusta (misma l\u00f3gica que ya funciona en Chapa/Acr\u00edlico):
                    // 1. Match exacto  2. Match parcial  3. Fallback gen\u00e9rico METAL
                    let servCorteFrente3D = servicios3D.find(s => normalizar3D(s.nombre) === qNorm3D);
                    if (!servCorteFrente3D) {
                        servCorteFrente3D = servicios3D.find(s => normalizar3D(s.nombre).startsWith("CORTELASER") && qNorm3D.includes(normalizar3D(s.nombre)));
                    }
                    if (!servCorteFrente3D) {
                        servCorteFrente3D = servicios3D.find(s => normalizar3D(s.nombre) === normalizar3D("CORTE LASER - METAL"));
                    }
                    if (servCorteFrente3D) {
                        costoFrenteCorte = perimetroMl3D * (servCorteFrente3D.precio || servCorteFrente3D.precioVenta || 0);
                        nombreServCorteFrente3D = servCorteFrente3D.nombre;
                    }
                }
            }
        }
    }

    // Peso extra si el Frente es 3D integrado
    const factorPesoFrente3D = parseFloat(settings3D.factorPesoFrente3D) || 400;
    const pesoExtraFrenteIntegrado = frenteEsIntegrado ? (areaFrenteM2 * factorPesoFrente3D) : 0;

    const gramos = gramosCuerpo + pesoExtraFrenteIntegrado;
    const horas = gramos / 15;

    // Actualizar displays de peso y tiempo
    const resPeso = document.getElementById('res3dPeso');
    const resTiempo = document.getElementById('res3dTiempo');
    if (resPeso) resPeso.innerText = `${Math.round(gramos)} gr`;
    if (resTiempo) resTiempo.innerText = `${horas.toFixed(1)} hs`;

    // Material seleccionado del inventario
    const selMat = document.getElementById('3dMaterial');
    const nombreMat = selMat?.options[selMat.selectedIndex]?.text || 'Sin material';
    const matObj = window.getGeckoItem(nombreMat);

    // Precio por gramo: usar precioVenta directo del GDM
    const precioPorGramo = matObj ? (matObj.precioVenta || matObj.costo || 0) : 0;

    // Buscar servicio de impresión 3D (geckoServicios) con fallback a settings
    const servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
    const servicioImpresion = servicios.find(s => {
        const nom = (s.nombre || '').toUpperCase();
        return nom.includes('3D') || nom.includes('IMPRESION 3D') || nom.includes('IMPRESIÓN 3D');
    });
    const geckoSettings = JSON.parse(localStorage.getItem('GECKO_SETTINGS') || '{}');
    const costoHora3D = servicioImpresion
        ? (servicioImpresion.precio || servicioImpresion.precioVenta || 0)
        : (parseFloat(geckoSettings.costoHora3D) || parseFloat(window.GECKO_SETTINGS?.costoHora3D) || 2500);

    // Cálculos de costo
    const costoMaterial = Math.round(gramos * precioPorGramo);
    const costoServicio = Math.round(horas * costoHora3D);

    // Pintura — área = cuerpo estimado por peso (sin el extra de frente) + área del Frente si hay
    const pinturaL3DActiva = document.getElementById('chkLlevaPinturaLetras3D')?.checked;
    const factorAreaPintura3D = parseFloat(settings3D.factorAreaPintura3D) || 0.00025;
    const areaEstimadaCuerpo = gramosCuerpo * factorAreaPintura3D;
    const areaPinturaLetras3D = areaEstimadaCuerpo + (hayFrente ? areaFrenteM2 : 0);
    const filasPinturaL3D = [];
    if (pinturaL3DActiva) {
        document.querySelectorAll('#filasPinturaLetras3D > div').forEach(function (row) {
            const selMatP = row.querySelector('.input-pintura-mat');
            const inpCodigo = row.querySelector('.input-pintura-codigo');
            const matId = selMatP ? selMatP.value : '';
            if (!matId) return;
            const matObjP = (window.materiales || []).find(function (m) { return String(m.id) === String(matId); });
            if (!matObjP) return;
            const precioM2P = parseFloat(matObjP.precioVenta || matObjP.costo || 0);
            const codigo = inpCodigo ? inpCodigo.value.trim() : '';
            const valorFilaP = Math.round(areaPinturaLetras3D * precioM2P);
            filasPinturaL3D.push({ nombre: matObjP.nombre, codigo: codigo, valor: valorFilaP });
        });
    }
    const costoPinturaL3DTotal = filasPinturaL3D.reduce(function (acc, f) { return acc + f.valor; }, 0);

    // Iluminación (compartido con Chapa/Acrílico)
    const resultadoIlum = window._geckoCalcularIluminacion(areaFrenteM2, perimetro / 100);
    const costoIlumTotal = resultadoIlum.costoIlumTotal;
    const costoFuenteIlum = resultadoIlum.costoFuente;

    const totalFinal = costoMaterial + costoServicio + Math.round(costoFrenteMaterial + costoFrenteCorte) + costoPinturaL3DTotal + costoIlumTotal + costoFuenteIlum;

    const fmt = v => '$' + Math.round(v).toLocaleString('es-AR');

    // Actualizar columna derecha
    if (document.getElementById('subtotalEstimado'))
        document.getElementById('subtotalEstimado').innerText = fmt(totalFinal);

    // Ocultar auditor inline viejo (regla: ocultar, nunca eliminar)
    const auditorViejo3D = document.getElementById('auditor3D');
    if (auditorViejo3D) auditorViejo3D.style.display = 'none';

    // ── Auditor de cálculo unificado (estilo Láser/CNC) ────────────────────────
    const panelConf3D = document.getElementById('panelConfigurador');
    if (panelConf3D) {
        const fmtVal = n => '$' + Math.round(n).toLocaleString('es-AR');
        const hayDatos3D = matObj && gramos > 0;

        let auditorWrap3D = document.getElementById('geckoAuditor3DEstimado');
        if (!auditorWrap3D) {
            auditorWrap3D = document.createElement('div');
            auditorWrap3D.id = 'geckoAuditor3DEstimado';
            auditorWrap3D.style.marginTop = '20px';
            panelConf3D.appendChild(auditorWrap3D);
        }

        if (hayDatos3D) {
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

            html += seccion('Material (Filamento)');
            html += lineaRow(nombreMat, `${Math.round(gramos)}gr × $${Math.round(precioPorGramo).toLocaleString('es-AR')}/gr`, costoMaterial);

            html += seccion('Servicio de Impresión');
            html += lineaRow('Hora máquina', `${horas.toFixed(1)}hs × $${Math.round(costoHora3D).toLocaleString('es-AR')}/hs`, costoServicio);

            if (hayFrente) {
                html += seccion('Frente');
                if (frenteEsMaterial) {
                    html += lineaRow(nombreFrenteMat, `${areaFrenteM2.toFixed(4)}m²`, costoFrenteMaterial);
                    if (costoFrenteCorte > 0) {
                        html += lineaRow(`Corte láser - ${nombreServCorteFrente3D}`, `${(perimetro / 100).toFixed(2)}ml`, costoFrenteCorte);
                    }
                } else if (frenteEsIntegrado) {
                    html += lineaRow('Frente 3D integrado', `+${Math.round(pesoExtraFrenteIntegrado)}gr sumados al peso`, 0);
                }
            }

            if (filasPinturaL3D.length > 0) {
                html += seccion('Acabado de pintura');
                filasPinturaL3D.forEach(f => html += lineaRow(f.nombre + (f.codigo ? ` (${f.codigo})` : ''), `${areaPinturaLetras3D.toFixed(4)}m²`, f.valor));
            }

            if (costoIlumTotal > 0 || costoFuenteIlum > 0) {
                html += seccion('Iluminación');
                if (costoIlumTotal > 0) html += lineaRow('LEDs', resultadoIlum.descIlum, costoIlumTotal);
                if (costoFuenteIlum > 0) html += lineaRow('Fuente', resultadoIlum.fuenteRecomendada, costoFuenteIlum);
            }

            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 4px;margin-top:6px;border-top:1px solid #27272a;">
                <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#a1a1aa;">Total del ítem</span>
                <span style="font-size:20px;font-weight:900;color:#F15A24;font-family:monospace;">${fmtVal(totalFinal)}</span>
            </div>`;

            auditorWrap3D.innerHTML = `
                <div class="card-gecko" style="margin-top:12px;">
                    <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 14px;">Auditor de cálculo</p>
                    ${html}
                </div>`;
        } else {
            auditorWrap3D.innerHTML = `
                <div class="card-gecko" style="margin-top:0;">
                    <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 10px;">Auditor de cálculo</p>
                    <p style="font-size:11px;color:#52525b;text-align:center;padding:8px 0;">Completá los campos para ver el desglose</p>
                </div>`;
        }

        // Botón añadir — siempre después del auditor
        let btnWrap3D = document.getElementById('btnAnadir3DEstimado');
        if (!btnWrap3D) {
            btnWrap3D = document.createElement('div');
            btnWrap3D.id = 'btnAnadir3DEstimado';
            btnWrap3D.style.marginTop = '12px';
            panelConf3D.appendChild(btnWrap3D);
        }
        btnWrap3D.innerHTML = `
            <button onclick="window.addLetras3DAlPresupuesto()"
                class="w-full py-3 rounded-2xl text-white font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                style="background:#f15a24;box-shadow:0 4px 16px rgba(241,90,36,0.3);">
                + Añadir a Cotización
            </button>`;
    }

    // Guardar para el carrito
    const descFrenteL3D = frenteEsMaterial ? ` | Frente: ${nombreFrenteMat}` : (frenteEsIntegrado ? ' | Frente: 3D integrado' : '');
    const descPinturaL3D = filasPinturaL3D.length > 0
        ? ' | Pintura: ' + filasPinturaL3D.map(function (f) { return f.nombre + (f.codigo ? ' (' + f.codigo + ')' : ''); }).join(', ')
        : '';
    const _geckoSnapshotLetras3D = (function () {
        const snap = { campos: {} };
        document.querySelectorAll('#panelConfigurador [id]').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                snap.campos[el.id] = el.checked;
            } else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                snap.campos[el.id] = el.value;
            }
        });
        return snap;
    })();

    window.itemActualPolifan = {
        tipo: 'corporeos',
        origenCotizador: 'corporeos_letras3d',
        nombre: `LETRAS 3D – ${nombreMat}`,
        identificacion: document.getElementById('letras3dNombre')?.value?.trim() || '',
        textoOpciones: `Letras 3D (Est.): ${ancho}x${alto}cm | ${nombreMat}`,
        costo: totalFinal,
        otDetalle: `Medida: ${ancho}x${alto}cm | Profundidad: ${profundidad}cm | Peso Est.: ${Math.round(gramos)}gr | Tiempo Est.: ${horas.toFixed(1)}hs | Material: ${nombreMat}${descFrenteL3D}${descPinturaL3D} | ${resultadoIlum.avisoFaltaWatts ? resultadoIlum.avisoFaltaWatts : `Ilum Modelo: ${resultadoIlum.modeloNombre} | Ilum Cantidad: ${resultadoIlum.cantidadTexto} | Ilum Fuente: ${resultadoIlum.fuenteRecomendada}`}`,
        parametrosOriginales: _geckoSnapshotLetras3D
    };
};

window.addLetras3DAlPresupuesto = function () {
    if (!window.itemActualPolifan || window.itemActualPolifan.costo <= 0) {
        window.calcularLetras3D();
    }
    if (!window.itemActualPolifan || window.itemActualPolifan.costo <= 0) {
        alert("Completá los datos antes de añadir.");
        return;
    }
    const item = {
        id: Date.now(),
        tipo: 'corporeos',
        origenCotizador: window.itemActualPolifan.origenCotizador || '',
        nombre: window.itemActualPolifan.nombre || 'Letras 3D',
        identificacion: window.itemActualPolifan.identificacion || '',
        textoOpciones: window.itemActualPolifan.textoOpciones || 'Letras 3D (Estimado)',
        costo: window.itemActualPolifan.costo,
        otDetalle: window.itemActualPolifan.otDetalle || 'Sin detalle técnico',
        modoCalculo: localStorage.getItem('globalEstimationMode') || 'simple',
        parametrosOriginales: window.itemActualPolifan.parametrosOriginales || null
    };
    if (typeof window.agregarItemAlPresupuesto === 'function') {
        window.agregarItemAlPresupuesto(item);
        if (typeof window.mostrarExito === 'function') {
            window.mostrarExito("\u00cdtem añadido al presupuesto", "¡Listo!");
        }
        window.itemActualPolifan = null;
    } else {
        console.error("agregarItemAlPresupuesto no encontrada");
    }
};

window.calcularCorporeos = function () {
    // 1. Captura de Variables de UI
    const ancho = parseFloat(document.getElementById('corpAncho').value) || 0;
    const alto = parseFloat(document.getElementById('corpAlto').value) || 0;
    const perimetro = parseFloat(document.getElementById('corpPerimetro').value) || 1;
    const profundidad = parseFloat(document.getElementById('corpProfundidad').value) || 1;
    const desperdicio = (parseFloat(document.getElementById('corpDesperdicio').value) || 0) / 100;

    const areaM2 = (ancho * alto) / 10000;
    const perimetroM = perimetro / 100;
    const areaCuerpoM2 = perimetroM * (profundidad / 100);

    const db = window.GECKO_DB || { config: {}, materiales: [] };
    const valorHora = parseFloat(db.config.horaHombre) || 31000;

    let costoMaterial = 0;
    let costoServicio = 0;

    // --- A. LÓGICA DE FRENTE Y CUERPO ---
    const matFrenteNombre = document.getElementById('corpMaterialFrente').value;
    const tipoCuerpo = document.getElementById('corpTipoCuerpo').value;

    const dataFrente = window.getGeckoItem(matFrenteNombre) || { costoARS: 50000 };
    const precioFrente = dataFrente.costoARS;

    const dataCuerpo = window.getGeckoItem(tipoCuerpo) || dataFrente;
    const precioCuerpo = dataCuerpo.costoARS;

    costoMaterial += ((areaM2 * precioFrente) + (areaCuerpoM2 * precioCuerpo)) * (1 + desperdicio);

    // --- B. SERVICIO (MANO DE OBRA) ---
    if (tipoCuerpo === '3D') {
        const horas3D = perimetro * 0.07;
        costoServicio += horas3D * (parseFloat(db.config.hora3D) || 2500);
    } else {
        let factorT = 0.6; let dif = 1.1;
        if (tipoCuerpo === 'Acrílico') { factorT = 1.0; dif = 1.5; }
        else if (tipoCuerpo === 'Chapa') { factorT = 0.8; dif = 1.4; }
        costoServicio += (perimetroM * factorT) * valorHora * dif;
    }

    // --- C. VINILO (SUMA REAL) ---
    if (document.getElementById('corpLlevaVinilo').checked) {
        const dataVinilo = window.getGeckoItem("Vinilo") || { costoARS: 16000 };
        costoMaterial += (areaM2 * dataVinilo.costoARS) * (1 + desperdicio);
        costoServicio += (areaM2 * 0.5) * valorHora; // Tiempo de pegado
    }

    // --- D. ILUMINACIÓN (SUMA REAL) ---
    if (document.getElementById('corpLlevaIlum').checked) {
        const tipoIlum = document.getElementById('corpTipoIlum').value;
        const dataFuente = window.getGeckoItem("Fuente LED") || { costoARS: 15000 };

        if (tipoIlum === 'modulos') {
            const dataLED = window.getGeckoItem("Módulo LED") || { costoARS: 600 };
            const cant = Math.ceil((ancho * alto) / 90);
            costoMaterial += (cant * dataLED.costoARS);
            if (document.getElementById('infoLed')) document.getElementById('infoLed').innerText = `LED: ${cant} u. / Fuente: ${Math.ceil(cant * 1.44)}W`;
        } else {
            const dataTira = window.getGeckoItem("Tira LED") || { costoARS: 12000 };
            const mts = perimetroM * 1.1;
            costoMaterial += (mts * dataTira.costoARS);
            if (document.getElementById('infoLed')) document.getElementById('infoLed').innerText = `Tira: ${mts.toFixed(1)}m / Fuente: ${Math.ceil(mts * 14.4 * 1.2)}W`;
        }
        costoMaterial += dataFuente.costoARS;
    }

    // --- E. FONDO ---
    if (document.getElementById('corpMaterialFondo').value !== 'Sin Fondo') {
        const dataFondo = window.getGeckoItem("PVC") || { costoARS: 13000 };
        costoMaterial += (areaM2 * dataFondo.costoARS) * (1 + desperdicio);
    }

    // --- RENDER FINAL ---
    const totalVenta = costoMaterial + costoServicio;
    const fmt = (m) => '$' + Math.round(m).toLocaleString('es-AR');

    document.getElementById('detMaterialBase').innerText = fmt(costoMaterial);
    document.getElementById('detServicio').innerText = fmt(costoServicio);
    document.getElementById('subtotalEstimado').innerText = fmt(totalVenta);

    window.itemActualCotizado = { tipo: 'corporeos', costo: totalVenta };
}

window.calcularCostoPolifan = function () {
    const ancho = parseFloat(document.getElementById('polifanAncho')?.value) || 0;
    const alto = parseFloat(document.getElementById('polifanAlto')?.value) || 0;
    const perimetro = parseFloat(document.getElementById('polifanPerimetro')?.value) || 0;
    const cantidad = parseInt(document.getElementById('polifanCantidad')?.value) || 1;

    const areaM2 = window._geckoResolverArea('polifanArea', ancho, alto);
    const perimetroMl = perimetro / 100;

    const auditCuerpo = [];
    const auditCorte = [];
    const auditFrente = [];

    // 1. Cuerpo
    const selEsp = document.getElementById('polifanEspesor');
    const espesorText = selEsp?.options[selEsp.selectedIndex]?.text || '';
    const itemPolifan = window.getGeckoItem(espesorText);
    let costoCuerpo = 0;
    if (itemPolifan) {
        // Calcular costo por m² usando el área de la placa cargada en GDM
        const anchoPlaca = (itemPolifan.ancho || itemPolifan.anchoPlaca || 0) / 100; // cm -> m
        const altoPlaca = (itemPolifan.alto || itemPolifan.altoPlaca || 0) / 100;   // cm -> m
        const areaPlacaGDM = anchoPlaca > 0 && altoPlaca > 0 ? anchoPlaca * altoPlaca : null;
        const precioItem = window.getCorpPrecio(itemPolifan);
        // Si tiene dimensiones de placa en GDM: precio es por placa, calcular $/m² (redondeado)
        const precioM2 = Math.round(areaPlacaGDM ? (precioItem / areaPlacaGDM) : precioItem);
        costoCuerpo = areaM2 * precioM2;
        auditCuerpo.push({ nombre: itemPolifan.nombre, detalle: `${parseFloat(areaM2.toFixed(2))}m² × $${precioM2.toLocaleString('es-AR')}/m²${document.getElementById('modoGremio')?.checked ? ' (Gremio)' : ''}`, valor: costoCuerpo });
    }

    // 2. Corte Polifan
    const itemCortePoli = window.getGeckoItem("CORTE DE POLIFÁN");
    let costoCortePoli = 0;
    if (itemCortePoli) {
        const precioCorte = Math.round(window.getCorpPrecio(itemCortePoli));
        costoCortePoli = perimetroMl * precioCorte;
        if (perimetroMl > 0) auditCorte.push({ nombre: itemCortePoli.nombre, detalle: `${perimetroMl.toFixed(2)}ml × $${precioCorte.toLocaleString('es-AR')}/ml`, valor: costoCortePoli });
    }

    // 3. Frente (Capas)
    let costoFrenteTotal = 0;
    let descFrente = "";
    const llevaFrente = document.getElementById('chkLlevaFrente')?.checked;
    if (llevaFrente) {
        const selBase = document.getElementById('selectorBaseFrente');
        const nomBase = selBase?.options[selBase.selectedIndex]?.text || '';
        const itBase = window.getGeckoItem(nomBase);

        // Costo Base (Mat + Corte Laser)
        let cBaseMat = 0;
        let cBaseCorte = 0;
        let precioCorteBase = 0;
        let nombreCorteBase = '';
        if (itBase) {
            cBaseMat = areaM2 * window.getCorpPrecio(itBase);
            // 1. Usar precio de corte propio del material si existe (precioCorteMl)
            if (itBase.precioCorteMl && parseFloat(itBase.precioCorteMl) > 0) {
                precioCorteBase = parseFloat(itBase.precioCorteMl);
                nombreCorteBase = `Corte Láser - ${itBase.nombre}`;
            } else {
                // 2. Fallback: buscar servicio específico SOLO en geckoServicios
                const serviciosCorte = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
                const normC = (t) => String(t || '').toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
                const qNormC = normC("CORTE LASER " + itBase.nombre);
                let servC = serviciosCorte.find(s => normC(s.nombre) === qNormC);
                if (!servC) servC = serviciosCorte.find(s => normC(s.nombre).startsWith("CORTELASER") && qNormC.includes(normC(s.nombre).replace("CORTELASER", "")));
                if (servC) {
                    precioCorteBase = window.getCorpPrecio(servC);
                    nombreCorteBase = servC.nombre;
                }
            }
            if (precioCorteBase > 0) cBaseCorte = perimetroMl * precioCorteBase;
        }

        // Costo Terminación (Vinilo + Montado)
        let cTermMat = 0;
        let cTermMontado = 0;
        const selTerm = document.getElementById('selectorViniloFrente');
        const valTerm = selTerm?.value;
        const nomTerm = selTerm?.options[selTerm.selectedIndex]?.text || '';

        if (valTerm !== 'NINGUNA') {
            const itTerm = window.getGeckoItem(nomTerm);
            if (itTerm) {
                cTermMat = areaM2 * window.getCorpPrecio(itTerm);
            }
            const itMontado = window.getGeckoItem("MONTADO");
            if (itMontado) {
                cTermMontado = areaM2 * window.getCorpPrecio(itMontado);
            }
        }

        costoFrenteTotal = cBaseMat + cBaseCorte + cTermMat + cTermMontado;
        descFrente = ` | Frente: ${nomBase}${valTerm !== 'NINGUNA' ? ' + ' + nomTerm : ''}`;

        if (cBaseMat > 0) auditFrente.push({ nombre: `Frente: ${nomBase}`, detalle: `${areaM2.toFixed(4)}m² × $${Math.round(window.getCorpPrecio(itBase)).toLocaleString('es-AR')}/m²`, valor: cBaseMat });
        if (cBaseCorte > 0) {
            auditFrente.push({ nombre: nombreCorteBase, detalle: `${perimetroMl.toFixed(2)}ml × $${Math.round(precioCorteBase).toLocaleString('es-AR')}/ml`, valor: cBaseCorte });
        }
        if (cTermMat > 0) {
            const itTermAud = window.getGeckoItem(nomTerm);
            auditFrente.push({ nombre: `Vinilo: ${nomTerm}`, detalle: `${areaM2.toFixed(4)}m² × $${Math.round(window.getCorpPrecio(itTermAud)).toLocaleString('es-AR')}/m²`, valor: cTermMat });
        }
        if (cTermMontado > 0) {
            const itMontadoAud = window.getGeckoItem("MONTADO");
            auditFrente.push({ nombre: 'Servicio de Montado', detalle: `${areaM2.toFixed(4)}m² × $${Math.round(window.getCorpPrecio(itMontadoAud)).toLocaleString('es-AR')}/m²`, valor: cTermMontado });
        }
    }

    // 4. Pintura
    let costoPintura = 0;
    const llevaPintura = document.getElementById('chkLlevaPintura')?.checked;
    if (llevaPintura) {
        costoPintura = parseFloat(document.getElementById('pinturaPrecio')?.value) || 0;
    }

    // 5. Totales
    const totalUnitario = costoCuerpo + costoCortePoli + costoFrenteTotal + costoPintura;
    const totalFinal = Math.round(totalUnitario * cantidad);
    const fmt = (v) => '$' + Math.round(v).toLocaleString('es-AR');

    if (document.getElementById('subtotalEstimado')) document.getElementById('subtotalEstimado').innerText = fmt(totalFinal);

    // Ocultar auditores viejos inline (regla: ocultar, nunca eliminar)
    ['auditorEspesorPolifan', 'auditorCortePolifan', 'auditorFrentePro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // ── Auditor de cálculo unificado (estilo Láser/CNC) ────────────────────────
    const panelConfPolifan = document.getElementById('panelConfigurador');
    if (panelConfPolifan) {
        const fmtVal = n => '$' + Math.round(n).toLocaleString('es-AR');
        const hayDatosPolifan = auditCuerpo.length > 0 || auditCorte.length > 0 || auditFrente.length > 0;

        let auditorWrapPolifan = document.getElementById('geckoAuditorPolifan');
        if (!auditorWrapPolifan) {
            auditorWrapPolifan = document.createElement('div');
            auditorWrapPolifan.id = 'geckoAuditorPolifan';
            auditorWrapPolifan.style.marginTop = '20px';
            panelConfPolifan.appendChild(auditorWrapPolifan);
        }

        if (hayDatosPolifan) {
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

            if (auditCuerpo.length > 0) {
                html += seccion('Cuerpo (Espesor)');
                auditCuerpo.forEach(l => html += lineaRow(l.nombre, l.detalle, l.valor));
            }
            if (auditCorte.length > 0) {
                html += seccion('Servicio de corte');
                auditCorte.forEach(l => html += lineaRow(l.nombre, l.detalle, l.valor));
            }
            if (auditFrente.length > 0) {
                html += seccion('Frente (Capas)');
                auditFrente.forEach(l => html += lineaRow(l.nombre, l.detalle, l.valor));
            }
            if (costoPintura > 0) {
                html += seccion('Pintura');
                html += lineaRow('Pintura', document.getElementById('pinturaColores')?.value || '', costoPintura);
            }
            if (cantidad > 1) {
                html += seccion('Cantidad');
                html += lineaRow(`Subtotal × ${cantidad} unidades`, '', totalUnitario * cantidad);
            }

            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 4px;margin-top:6px;border-top:1px solid #27272a;">
                <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#a1a1aa;">Total del ítem</span>
                <span style="font-size:20px;font-weight:900;color:#F15A24;font-family:monospace;">${fmtVal(totalFinal)}</span>
            </div>`;

            auditorWrapPolifan.innerHTML = `
                <div class="card-gecko" style="margin-top:12px;">
                    <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 14px;">Auditor de cálculo</p>
                    ${html}
                </div>`;
        } else {
            auditorWrapPolifan.innerHTML = `
                <div class="card-gecko" style="margin-top:0;">
                    <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 10px;">Auditor de cálculo</p>
                    <p style="font-size:11px;color:#52525b;text-align:center;padding:8px 0;">Completá los campos para ver el desglose</p>
                </div>`;
        }

        // Botón añadir — siempre después del auditor
        let btnWrapPolifan = document.getElementById('btnAnadirPolifan');
        if (!btnWrapPolifan) {
            btnWrapPolifan = document.createElement('div');
            btnWrapPolifan.id = 'btnAnadirPolifan';
            btnWrapPolifan.style.marginTop = '12px';
            panelConfPolifan.appendChild(btnWrapPolifan);
        }
        btnWrapPolifan.innerHTML = `
            <button onclick="window.addPolifanAlPresupuesto()"
                class="w-full py-3 rounded-2xl text-white font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                style="background:#f15a24;box-shadow:0 4px 16px rgba(241,90,36,0.3);">
                + Añadir a Cotización
            </button>`;
    }

    const _geckoSnapshotPolifan = (function () {
        const snap = { campos: {} };
        document.querySelectorAll('#panelConfigurador [id]').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                snap.campos[el.id] = el.checked;
            } else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                snap.campos[el.id] = el.value;
            }
        });
        return snap;
    })();

    window.itemActualPolifan = {
        tipo: 'corporeos',
        origenCotizador: 'corporeos_polifan',
        nombre: `POLIFÁN - ${espesorText} - ${document.getElementById('polifanNombre')?.value || 'S/N'}`,
        identificacion: document.getElementById('polifanNombre')?.value?.trim() || '',
        costo: totalFinal,
        otDetalle: `Polifán ${espesorText} | Medida: ${ancho}x${alto}cm | Cant: ${cantidad} | Corte: ${perimetroMl}ml${descFrente}${llevaPintura ? ' | Pintura: ' + (document.getElementById('pinturaColores')?.value || 'S/E') : ''}`,
        parametrosOriginales: _geckoSnapshotPolifan
    };
}

window._geckoObtenerOpcionesIluminacion = function () {
    const materiales = window.materiales || [];
    return materiales.filter(m => {
        const cat = (m.categoria || '').toLowerCase();
        const sub = (m.subcategoria || '').toUpperCase();
        const nombre = (m.nombre || '').toLowerCase();
        return cat === 'electrico' && sub === 'ILUMINACION' &&
            (nombre.includes('módulo') || nombre.includes('modulo') || nombre.includes('tira'));
    }).map(m => {
        const nombre = (m.nombre || '').toLowerCase();
        const tipo = nombre.includes('tira') ? 'tira' : 'modulo';
        return { id: m.id, nombre: m.nombre, tipo, watts: parseFloat(m.watts) || null, densidad: parseFloat(m.densidad) || null, item: m };
    });
};

window._geckoPoblarSelectIluminacion = function () {
    const sel = document.getElementById('chapaModeloLed');
    if (!sel) return;
    const opciones = window._geckoObtenerOpcionesIluminacion();
    if (opciones.length === 0) {
        sel.innerHTML = '<option value="">Sin módulos/tiras cargados en Materiales</option>';
        return;
    }
    sel.innerHTML = '<option value="">Elegí un módulo o tira...</option>' + opciones.map(o =>
        `<option value="${o.id}" data-tipo="${o.tipo}">${o.nombre}${o.watts ? '' : ' (FALTA WATTS)'}</option>`
    ).join('');
};

// Dispatcher: decide a qué cotizador recalcular según el modo activo (window._corpModo)
window._geckoRecalcularIluminacion = function () {
    if (window._corpModo === 'letras3d') window.calcularLetras3D();
    else window.calcularChapaAcrilico();
};

window.toggleChapaIlum = function () {
    const chk = document.getElementById('chkChapaIlum');
    document.getElementById('detallesChapaIlum').classList.toggle('hidden', !chk.checked);
    window._geckoRecalcularIluminacion();
};

window._geckoHtmlCardIluminacion = function () {
    return `
            <!-- 05. Iluminación -->
            <div class="card-gecko animate-in fade-in slide-in-from-top-4">
                <div class="seccion-switch-gecko">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] mb-2 guia-naranja">05. Iluminación</p>
                    <div class="switch-row" onclick="document.getElementById('chkChapaIlum').click()">
                        <div class="flex items-center gap-3">
                            <i class="bi bi-lightbulb text-gecko"></i>
                            <p class="text-[11px] font-black text-white uppercase tracking-wider">SISTEMA LED</p>
                        </div>
                        <label class="switch-gecko" onclick="event.stopPropagation()">
                            <input type="checkbox" id="chkChapaIlum" onchange="window.toggleChapaIlum()">
                            <span class="slider-gecko"></span>
                        </label>
                    </div>

                    <div id="detallesChapaIlum" class="hidden mt-4 space-y-4">
                        <select id="chapaModeloLed" class="gecko-select w-full" onchange="window._geckoRecalcularIluminacion()">
                            <option value="">Elegí un módulo o tira...</option>
                        </select>
                        <div id="visorConsumo" style="background:#141414;border:1px solid #262626;border-radius:14px;padding:16px 18px;">
                            <p style="color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Consumo estimado</p>
                            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
                                <span style="color:#F15A24;font-size:14px;line-height:1.4;">●</span>
                                <span id="txtConsumo" style="color:#e4e4e7;font-size:13px;font-weight:600;line-height:1.4;">0W</span>
                            </div>
                            <div style="display:flex;align-items:flex-start;gap:10px;">
                                <span style="color:#F15A24;font-size:14px;line-height:1.4;">●</span>
                                <span id="txtFuente" style="color:#e4e4e7;font-size:13px;font-weight:600;line-height:1.4;">Esperando datos...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
};

window._geckoCalcularIluminacion = function (areaM2, perimetroMl) {
    let costoIlumTotal = 0;
    let descIlum = "0 unidades";
    let modeloNombre = "";
    let cantidadTexto = "";
    let fuenteRecomendada = "N/A";
    let costoFuente = 0;
    let avisoFaltaWatts = '';

    if (document.getElementById('chkChapaIlum')?.checked) {
        const selModelo = document.getElementById('chapaModeloLed');
        const opciones = window._geckoObtenerOpcionesIluminacion();
        const elegido = opciones.find(o => String(o.id) === String(selModelo?.value));

        if (!elegido) {
            descIlum = 'Elegí un módulo o tira';
            const txtConsumo = document.getElementById('txtConsumo');
            if (txtConsumo) txtConsumo.innerText = descIlum;
        } else if (!elegido.watts) {
            avisoFaltaWatts = `FALTA PARÁMETRO: "${elegido.nombre}" no tiene Watts cargado en Materiales.`;
            descIlum = avisoFaltaWatts;
            const txtConsumo = document.getElementById('txtConsumo');
            if (txtConsumo) txtConsumo.innerText = avisoFaltaWatts;
        } else if (elegido.tipo === 'modulo' && !elegido.densidad) {
            avisoFaltaWatts = `FALTA PARÁMETRO: "${elegido.nombre}" no tiene Densidad (módulos/m²) cargada en Materiales.`;
            descIlum = avisoFaltaWatts;
            const txtConsumo = document.getElementById('txtConsumo');
            if (txtConsumo) txtConsumo.innerText = avisoFaltaWatts;
        } else {
            let consumoTotal = 0;
            let cantU = 0;

            if (elegido.tipo === 'modulo') {
                cantU = Math.ceil(areaM2 * elegido.densidad);
                consumoTotal = cantU * elegido.watts;
                descIlum = `${cantU} × ${elegido.nombre}`;
                modeloNombre = elegido.nombre;
                cantidadTexto = `${cantU} módulos`;
            } else {
                const mts = perimetroMl * 1.1;
                cantU = mts;
                consumoTotal = mts * elegido.watts;
                descIlum = `${mts.toFixed(2)}m de ${elegido.nombre}`;
                modeloNombre = elegido.nombre;
                cantidadTexto = `${mts.toFixed(2)}m`;
            }

            costoIlumTotal = cantU * window.getCorpPrecio(elegido.item);
            const txtConsumo = document.getElementById('txtConsumo');
            if (txtConsumo) txtConsumo.innerText = `${descIlum} = ${consumoTotal.toFixed(1)}W totales`;

            // Selección automática de fuente (factor seguridad 1.25)
            const wattsNecesarios = consumoTotal * 1.25;
            const todasFuentes = (window.materiales || [])
                .filter(m => {
                    const cat = (m.categoria || '').toLowerCase();
                    const nombre = (m.nombre || '').toUpperCase();
                    return cat === 'electrico' && nombre.includes('FUENTE');
                })
                .map(m => {
                    const matchW = m.nombre.match(/(\d+)W/i);
                    return { item: m, watts: matchW ? parseInt(matchW[1]) : 0, stock: parseInt(m.stock) || 0 };
                })
                .filter(f => f.watts > 0);

            let solucionFuente = null;

            // 1. Buscar UNA sola fuente que alcance, con stock disponible
            const candidatasUnicas = todasFuentes
                .filter(f => f.watts >= wattsNecesarios && f.stock >= 1)
                .sort((a, b) => a.watts - b.watts);
            if (candidatasUnicas.length > 0) {
                solucionFuente = { cantidad: 1, fuente: candidatasUnicas[0] };
            } else {
                // 2. Probar combinar 2, 3 o 4 unidades del mismo modelo
                const disponiblesOrdenadas = todasFuentes.slice().sort((a, b) => b.watts - a.watts);
                for (let n = 2; n <= 4 && !solucionFuente; n++) {
                    for (const f of disponiblesOrdenadas) {
                        if (f.stock >= n && (f.watts * n) >= wattsNecesarios) {
                            solucionFuente = { cantidad: n, fuente: f };
                            break;
                        }
                    }
                }
            }

            const txtFuente = document.getElementById('txtFuente');
            if (solucionFuente) {
                const nombreFuente = solucionFuente.fuente.item.nombre;
                fuenteRecomendada = solucionFuente.cantidad > 1
                    ? `${solucionFuente.cantidad} x ${nombreFuente}`
                    : nombreFuente;
                const itFuenteData = solucionFuente.fuente.item;
                costoFuente = (itFuenteData.precioVenta || itFuenteData.costoARS || itFuenteData.costo || 0) * solucionFuente.cantidad;
                if (txtFuente) {
                    txtFuente.style.color = '#e4e4e7';
                    txtFuente.innerText = `Fuente recomendada: ${fuenteRecomendada} (necesita ${wattsNecesarios.toFixed(1)}W)`;
                }
            } else {
                if (txtFuente) {
                    txtFuente.style.color = '#ef4444';
                    txtFuente.innerText = `Atención: necesita ${wattsNecesarios.toFixed(1)}W – no hay combinación de fuentes en stock que alcance`;
                }
            }
        }
    }

    return { costoIlumTotal, descIlum, modeloNombre, cantidadTexto, fuenteRecomendada, costoFuente, avisoFaltaWatts };
};

window.initChapaAcrilicoSelects = function () {
    const materiales = window.materiales || [];

    // 1. Flejes (Chapas / Metales / Acrílicos)
    const selFleje = document.getElementById('chapaFlejeMat');
    if (selFleje) {
        const matsFleje = (window.materiales || []).filter(m => {
            const cat = (m.categoria || '').toLowerCase().trim();
            const nombre = (m.nombre || '').toUpperCase();
            const sub = (m.subcategoria || '').toUpperCase();
            return (
                cat === 'chapas' ||
                cat === 'rigido' ||
                cat === 'metal_madera' ||
                nombre.includes('CHAPA') ||
                nombre.includes('GALVANIZADA') ||
                nombre.includes('ACRILICO') ||
                nombre.includes('PVC') ||
                nombre.includes('ALTO IMPACTO') ||
                sub.includes('CHAPA') ||
                sub.includes('METAL')
            );
        });
        let htmlFleje = '<option value="SELECCIONAR">SELECCIONAR MATERIAL</option>';
        htmlFleje += matsFleje.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('');
        selFleje.innerHTML = htmlFleje;
    }

    // 2. Iluminación (Módulos + Tiras LED combinados)
    window._geckoPoblarSelectIluminacion();
};

// ── Frente / Fondo: filas dinámicas (mismo patrón que agregarFilaPinturaChapa) ──
window._geckoOpcionesMatFrenteFondo = function (tipo) {
    const materiales = window.materiales || [];
    return materiales.filter(m => {
        const cat = (m.categoria || '').toLowerCase();
        if (cat === 'pvc' && tipo === 'fondo') return false; // Fondo excluye PVC (igual que chapaFondoMat hoy)
        return cat === 'rigido' || cat === 'chapas' || cat === 'polifan' ||
            cat === 'chapas / placas' || cat === 'acrílicos' || cat === 'pvc';
    }).map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('');
};

window._geckoOpcionesMatVinilo = function () {
    const matsVinilo = (window.materiales || []).filter(m => {
        const cat = (m.categoria || '').toLowerCase().trim();
        const nombre = (m.nombre || '').toUpperCase();
        return (cat === 'vinilos_lonas' || cat === 'flexible') && !nombre.includes('LONA');
    });
    return matsVinilo.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('');
};

window._geckoToggleVinilloFilaFF = function (chk) {
    const fila = chk.closest('.fila-frente-fondo');
    const wrap = fila?.querySelector('.wrapper-ff-vinilo-mat');
    if (wrap) wrap.classList.toggle('hidden', !chk.checked);
    window.calcularChapaAcrilico();
};

window._geckoFilaFrenteFondo = function (tipo) {
    const opciones = window._geckoOpcionesMatFrenteFondo(tipo);
    const colSelect = tipo === 'frente' ? 'col-span-5' : 'col-span-8';
    return `
        <div class="p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/20 fila-frente-fondo animate-in fade-in" data-tipo="${tipo}">
            <div class="grid grid-cols-12 gap-2 items-center">
                <div class="${colSelect}">
                    <select class="input-ff-mat gecko-select-pro w-full" onchange="window.calcularChapaAcrilico()">
                        <option value="SELECCIONAR">Seleccionar material...</option>
                        ${opciones}
                    </select>
                </div>
                <div class="col-span-3 flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border border-zinc-800/70 bg-black/20">
                    <span class="text-[9px] font-bold text-zinc-500 uppercase leading-tight">Corte<br>láser</span>
                    <label class="switch-gecko">
                        <input type="checkbox" class="input-ff-corte" onchange="window.calcularChapaAcrilico()">
                        <span class="slider-gecko"></span>
                    </label>
                </div>
                ${tipo === 'frente' ? `
                <div class="col-span-3 flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border border-zinc-800/70 bg-black/20">
                    <span class="text-[9px] font-bold text-zinc-500 uppercase leading-tight">Vinilo<br>montado</span>
                    <label class="switch-gecko">
                        <input type="checkbox" class="input-ff-vinilo" onchange="window._geckoToggleVinilloFilaFF(this)">
                        <span class="slider-gecko"></span>
                    </label>
                </div>` : ''}
                <div class="col-span-1 flex justify-center">
                    <button type="button" onclick="this.closest('.fila-frente-fondo').remove(); window.calcularChapaAcrilico();"
                        class="w-7 h-7 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
            ${tipo === 'frente' ? `
            <div class="wrapper-ff-vinilo-mat hidden mt-3 pt-3 border-t border-zinc-800/50">
                <label class="block text-[10px] text-zinc-400 mb-1">Tipo de vinilo</label>
                <select class="input-ff-vinilo-mat gecko-select-pro w-full" onchange="window.calcularChapaAcrilico()">
                    <option value="SELECCIONAR">Seleccionar vinilo...</option>
                    ${window._geckoOpcionesMatVinilo()}
                </select>
            </div>` : ''}
        </div>`;
};

window._geckoAgregarFilaFrenteFondo = function (tipo) {
    const contId = tipo === 'frente' ? 'contenedorFilasFrente' : 'contenedorFilasFondo';
    const cont = document.getElementById(contId);
    if (!cont) return;
    cont.insertAdjacentHTML('beforeend', window._geckoFilaFrenteFondo(tipo));
    window.calcularChapaAcrilico();
};

window.agregarFilaPinturaChapa = function () {
    const cont = document.getElementById('filasPinturaChapa');
    if (!cont) return;
    const rowId = 'pintChapa_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
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
            <select class="input-pintura-mat gecko-select-pro w-full" onchange="window.calcularChapaAcrilico()">
                <option value="">Seleccionar material...</option>
                ${opciones}
            </select>
        </div>
        <div class="col-span-5">
            <input type="text" class="input-pintura-codigo gecko-input w-full" placeholder="Código de color (manual)" oninput="window.calcularChapaAcrilico()">
        </div>
        <div class="col-span-1 text-center">
            <button type="button" onclick="window.eliminarFilaPinturaChapa('${rowId}')" class="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
        </div>
    `;
    cont.appendChild(row);
    window.calcularChapaAcrilico();
};

window.eliminarFilaPinturaChapa = function (rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    window.calcularChapaAcrilico();
};

window.togglePinturaChapa = function () {
    const chk = document.getElementById('chkLlevaPinturaChapa');
    const wrapper = document.getElementById('detallesPinturaChapa');
    if (wrapper) wrapper.classList.toggle('hidden', !chk.checked);
    if (chk.checked) {
        const cont = document.getElementById('filasPinturaChapa');
        if (cont && cont.children.length === 0) {
            window.agregarFilaPinturaChapa();
        }
    }
    window.calcularChapaAcrilico();
};

window.calcularChapaAcrilico = function () {
    // 1. Captura y Normalización de Variables
    const ancho = parseFloat(document.getElementById('chapaAncho')?.value) || 0;
    const alto = parseFloat(document.getElementById('chapaAlto')?.value) || 0;
    const perimetro = parseFloat(document.getElementById('chapaPerimetro')?.value) || 0;
    const profundidad = parseFloat(document.getElementById('chapaProfundidad')?.value) || 0;
    const cantidad = Math.max(1, parseInt(document.getElementById('chapaCantidad')?.value) || 1);

    // Crear la tarjeta de pintura SIEMPRE primero, para que quede antes
    // del auditor y visible desde el arranque (con el toggle apagado)
    let tarjetaPinturaChapa = document.getElementById('tarjetaPinturaChapa');
    if (!tarjetaPinturaChapa) {
        tarjetaPinturaChapa = document.createElement('div');
        tarjetaPinturaChapa.id = 'tarjetaPinturaChapa';
        tarjetaPinturaChapa.className = 'card-gecko space-y-2';
        tarjetaPinturaChapa.innerHTML = `
            <div class="seccion-switch-gecko">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja mb-2">06. Acabado de pintura</p>
                <div class="switch-row" onclick="document.getElementById('chkLlevaPinturaChapa').click()">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-orange-950/30 rounded-xl flex items-center justify-center border border-orange-900/30">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gecko" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                        </div>
                        <div>
                            <p class="text-[11px] font-black text-white uppercase tracking-wider">PINTURA</p>
                            <p class="text-[9px] font-bold text-zinc-500 uppercase">Área: Fleje + Frente</p>
                        </div>
                    </div>
                    <label class="switch-gecko" onclick="event.stopPropagation()">
                        <input type="checkbox" id="chkLlevaPinturaChapa" onchange="window.togglePinturaChapa()">
                        <span class="slider-gecko"></span>
                    </label>
                </div>
                <div id="detallesPinturaChapa" class="hidden mt-6 space-y-3 pt-4 border-t border-zinc-800/50">
                    <div id="filasPinturaChapa" class="space-y-2"></div>
                    <button type="button" onclick="window.agregarFilaPinturaChapa()"
                        class="w-full py-2 mt-2 rounded-xl border border-dashed border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:border-gecko hover:text-gecko transition-all">
                        + Agregar pintura / base
                    </button>
                </div>
            </div>`;
        const panelParaPintura = document.getElementById('panelConfigurador');
        if (panelParaPintura) panelParaPintura.appendChild(tarjetaPinturaChapa);
    }

    const areaM2 = window._geckoResolverArea('chapaArea', ancho, alto);
    const perimetroMl = perimetro / 100;

    // Función de normalización solicitada
    const normalizar = (txt) => String(txt || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");

    // Helper: buscar servicio de corte l\u00e1ser SOLO en geckoServicios (evita matchear contra materiales)
    const getServicioCorte = (materialObj) => {
        const nombreMaterial = (materialObj && materialObj.nombre) ? materialObj.nombre : materialObj;
        // 1. Prioridad: precio de corte propio del material (precioCorteMl)
        if (materialObj && materialObj.precioCorteMl && parseFloat(materialObj.precioCorteMl) > 0) {
            return { nombre: `Corte L\u00e1ser - ${nombreMaterial}`, precioVenta: parseFloat(materialObj.precioCorteMl), _directo: true };
        }
        // 2. Fallback: buscar servicio en la lista vieja de Servicios (compatibilidad hist\u00f3rica)
        const servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
        const qNorm = normalizar("CORTE LASER " + nombreMaterial);
        let serv = servicios.find(s => normalizar(s.nombre) === qNorm);
        if (!serv) serv = servicios.find(s => normalizar(s.nombre).startsWith("CORTELASER") && qNorm.includes(normalizar(s.nombre)));
        if (!serv) serv = servicios.find(s => normalizar(s.nombre) === normalizar("CORTE LASER - METAL"));
        return serv || null;
    };

    // 2. Lógica del Cuerpo (Fleje)
    let costoFleje = 0;
    const auditEstructura = [];
    const selFleje = document.getElementById('chapaFlejeMat');
    const valFleje = selFleje?.value;
    if (!valFleje || valFleje === 'SELECCIONAR') {
        if (document.getElementById('subtotalEstimado')) document.getElementById('subtotalEstimado').innerText = "$0";
        window.itemActualPolifan = { tipo: 'corporeos', nombre: 'Chapa / Acrílico', costo: 0, otDetalle: 'Faltan datos: seleccionar material Fleje' };
        const auditorViejoEarly = document.getElementById('auditorChapa');
        if (auditorViejoEarly) auditorViejoEarly.style.display = 'none';
        const panelConfEarly = document.getElementById('panelConfigurador');
        if (panelConfEarly) {
            let auditorWrapEarly = document.getElementById('geckoAuditorChapa');
            if (!auditorWrapEarly) {
                auditorWrapEarly = document.createElement('div');
                auditorWrapEarly.id = 'geckoAuditorChapa';
                auditorWrapEarly.style.marginTop = '20px';
                panelConfEarly.appendChild(auditorWrapEarly);
            }
            auditorWrapEarly.innerHTML = `
                <div class="card-gecko" style="margin-top:0;">
                    <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 10px;">Auditor de cálculo</p>
                    <p style="font-size:11px;color:#52525b;text-align:center;padding:8px 0;">Completá los campos para ver el desglose</p>
                </div>`;
            let btnWrapEarly = document.getElementById('btnAnadirChapa');
            if (!btnWrapEarly) {
                btnWrapEarly = document.createElement('div');
                btnWrapEarly.id = 'btnAnadirChapa';
                btnWrapEarly.style.marginTop = '12px';
                panelConfEarly.appendChild(btnWrapEarly);
            }
            btnWrapEarly.innerHTML = `
                <button onclick="window.addChapaAlPresupuesto()"
                    class="w-full py-3 rounded-2xl text-white font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style="background:#f15a24;box-shadow:0 4px 16px rgba(241,90,36,0.3);">
                    + Añadir a Cotización
                </button>`;
        }
        return;
    }
    const nomFleje = selFleje?.options[selFleje.selectedIndex]?.text || '';
    const itemFleje = window.getGeckoItem(nomFleje);

    if (itemFleje) {
        const areaFlejeM2 = (perimetro * profundidad / 10000);
        costoFleje = areaFlejeM2 * itemFleje.precioVenta;
        auditEstructura.push({ nombre: nomFleje, detalle: `${areaFlejeM2.toFixed(4)}m² × $${Math.round(itemFleje.precioVenta).toLocaleString('es-AR')}/m²`, valor: costoFleje });
    }

    // Corte Inteligente Fleje
    let costoCorteFleje = 0;
    if (itemFleje) {
        const normFleje = normalizar(itemFleje.nombre);
        let queryCorte = "";
        if (normFleje.includes("CHAPA")) {
            queryCorte = "CORTE LASER - METAL";
        } else if (normFleje.includes("ACRILICO") || normFleje.includes("PVC")) {
            // Buscamos CORTE LASER - [NOMBRE] (ej: CORTE LASER - ACRILICO 3MM)
            queryCorte = "CORTE LASER - " + itemFleje.nombre;
        }

        const servCorte = window.getGeckoItem(queryCorte);
        if (servCorte) {
            costoCorteFleje = perimetroMl * servCorte.precioVenta;
            auditEstructura.push({ nombre: `Corte ${servCorte.nombre}`, detalle: `${perimetroMl.toFixed(2)}ml × $${Math.round(servCorte.precioVenta).toLocaleString('es-AR')}/ml`, valor: costoCorteFleje });
        }
    }

    // 3. Frente y Fondo (Placas) — recorre cada fila dinámica (data-tipo="frente"/"fondo")
    let costoPlacas = 0;
    let costoCortePlacas = 0;
    let costoViniloTotal = 0;
    const auditPlacas = [];
    const auditVinilo = [];
    let hayFrenteConMaterial = false;

    document.querySelectorAll('.fila-frente-fondo').forEach((fila) => {
        const tipoFila = fila.dataset.tipo;
        const etiqueta = tipoFila === 'frente' ? 'Frente' : 'Fondo';
        const selMat = fila.querySelector('.input-ff-mat');
        const valMat = selMat?.value;
        if (!valMat || valMat === 'SELECCIONAR') return;
        const itMat = window.getGeckoItem(selMat.options[selMat.selectedIndex].text);
        if (!itMat) return;

        if (tipoFila === 'frente') hayFrenteConMaterial = true;

        // Precio por m² del material basado en el área de placa registrada en GDM (mismo cálculo que hoy)
        const anchoPlacaM = ((itMat.ancho || itMat.anchoPlaca || 0)) / 100;
        const altoPlacaM = ((itMat.alto || itMat.altoPlaca || 0)) / 100;
        const areaPlacaGDM = anchoPlacaM > 0 && altoPlacaM > 0 ? anchoPlacaM * altoPlacaM : null;
        const precioPlaca = window.getCorpPrecio(itMat);
        const precioM2Mat = Math.round(areaPlacaGDM ? (precioPlaca / areaPlacaGDM) : precioPlaca);
        const subtotalMat = areaM2 * precioM2Mat;
        costoPlacas += subtotalMat;
        auditPlacas.push({ nombre: `${etiqueta}: ${itMat.nombre}`, detalle: `${parseFloat(areaM2.toFixed(2))}m² × $${precioM2Mat.toLocaleString('es-AR')}/m²`, valor: subtotalMat });

        // Servicio de corte (corte inteligente), solo si el toggle de la fila está activo
        const llevaCorteFila = fila.querySelector('.input-ff-corte')?.checked;
        if (llevaCorteFila) {
            const servCorteMat = getServicioCorte(itMat);
            if (servCorteMat) {
                const precioCorteMat = servCorteMat.precioVenta || servCorteMat.precio || 0;
                const subtotalCorteMat = perimetroMl * precioCorteMat;
                costoCortePlacas += subtotalCorteMat;
                auditPlacas.push({ nombre: `Corte ${servCorteMat.nombre} (${etiqueta})`, detalle: `${parseFloat(perimetroMl.toFixed(2))}ml × $${Math.round(precioCorteMat).toLocaleString('es-AR')}/ml`, valor: subtotalCorteMat });
            } else {
                auditPlacas.push({
                    nombre: `⚠ FALTA SERVICIO DE CORTE`,
                    detalle: `No se encontró precio de corte para "${itMat.nombre}" (ni en el material ni en Servicios)`,
                    valor: 0
                });
            }
        }

        // Vinilo / Montado — solo filas de Frente con el toggle activo
        if (tipoFila === 'frente' && fila.querySelector('.input-ff-vinilo')?.checked) {
            const selVinilo = fila.querySelector('.input-ff-vinilo-mat');
            const valVinilo = selVinilo?.value;
            const itVinilo = (valVinilo && valVinilo !== 'SELECCIONAR') ? window.getGeckoItem(selVinilo.options[selVinilo.selectedIndex].text) : null;
            const itMontado = window.getGeckoItem("MONTADO");

            if (itVinilo) {
                const pVinilo = Math.round(window.getCorpPrecio(itVinilo));
                const subtotalVinilo = areaM2 * pVinilo;
                costoViniloTotal += subtotalVinilo;
                auditVinilo.push({ nombre: `${itVinilo.nombre} (${itMat.nombre})`, detalle: `${areaM2.toFixed(4)}m² × $${pVinilo.toLocaleString('es-AR')}/m²`, valor: subtotalVinilo });
            }
            if (itMontado) {
                const pMontado = Math.round(window.getCorpPrecio(itMontado));
                const subtotalMontado = areaM2 * pMontado;
                costoViniloTotal += subtotalMontado;
                auditVinilo.push({ nombre: `Servicio de Montado (${itMat.nombre})`, detalle: `${areaM2.toFixed(4)}m² × $${pMontado.toLocaleString('es-AR')}/m²`, valor: subtotalMontado });
            }
        }
    });

    // 4. Iluminación y Fuentes
    const resultadoIlum = window._geckoCalcularIluminacion(areaM2, perimetroMl);
    const costoIlumTotal = resultadoIlum.costoIlumTotal;
    const descIlum = resultadoIlum.descIlum;
    const fuenteRecomendada = resultadoIlum.fuenteRecomendada;
    const costoFuente = resultadoIlum.costoFuente;
    const avisoFaltaWatts = resultadoIlum.avisoFaltaWatts;

    // 5. Mano de obra interna (servicio "Mano de obra taller", buscado por nombre — nunca inventar precio)
    const diasTrabajo = parseFloat(document.getElementById('chapaDiasTrabajo')?.value) || 0;
    let costoManoObraInterna = 0;
    let servManoObra = null;
    let precioDiaManoObra = 0;
    let avisoFaltaManoObra = '';
    if (diasTrabajo > 0) {
        const servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
        servManoObra = servicios.find(s => (s.nombre || '').toLowerCase().includes('mano de obra taller'));
        precioDiaManoObra = servManoObra ? (servManoObra.precio || servManoObra.precioVenta || 0) : 0;
        if (!servManoObra) {
            avisoFaltaManoObra = 'FALTA PARÁMETRO: servicio "Mano de obra taller" no encontrado en Servicios.';
            console.warn(avisoFaltaManoObra);
        }
        costoManoObraInterna = diasTrabajo * precioDiaManoObra;
    }

    // 6. Totales y Auditoría
    const pinturaChapaActiva = document.getElementById('chkLlevaPinturaChapa')?.checked;
    const areaFlejeParaPintura = (typeof areaFlejeM2 !== 'undefined') ? areaFlejeM2 : (perimetro * profundidad / 10000);
    const areaFrenteParaPintura = hayFrenteConMaterial ? areaM2 : 0;
    const areaPinturaChapa = areaFlejeParaPintura + areaFrenteParaPintura;
    const filasPinturaChapaCalc = [];
    if (pinturaChapaActiva) {
        document.querySelectorAll('#filasPinturaChapa > div').forEach(function (row) {
            const selMat = row.querySelector('.input-pintura-mat');
            const inpCodigo = row.querySelector('.input-pintura-codigo');
            const matId = selMat ? selMat.value : '';
            if (!matId) return;
            const matObj = (window.materiales || []).find(function (m) { return String(m.id) === String(matId); });
            if (!matObj) return;
            const precioM2Pintura = parseFloat(matObj.precioVenta || matObj.costo || 0);
            const codigo = inpCodigo ? inpCodigo.value.trim() : '';
            const valorFilaPintura = Math.round(areaPinturaChapa * precioM2Pintura);
            filasPinturaChapaCalc.push({ nombre: matObj.nombre, codigo: codigo, valor: valorFilaPintura });
        });
    }
    const costoPinturaChapaTotal = filasPinturaChapaCalc.reduce(function (acc, f) { return acc + f.valor; }, 0);

    const estructuraTotal = costoFleje + costoPlacas;
    const corteTotal = costoCorteFleje + costoCortePlacas;
    const totalUnitario = estructuraTotal + corteTotal + costoViniloTotal + costoIlumTotal + costoFuente + costoPinturaChapaTotal + costoManoObraInterna;
    const totalFinal = Math.round(totalUnitario * cantidad);

    const fmt = (v) => '$' + Math.round(v).toLocaleString('es-AR');

    // Ocultar auditor inline viejo (regla: ocultar, nunca eliminar)
    const auditorViejo = document.getElementById('auditorChapa');
    if (auditorViejo) auditorViejo.style.display = 'none';

    // ── Auditor de cálculo unificado (estilo Láser/CNC) ────────────────────────
    const panelConf = document.getElementById('panelConfigurador');
    if (panelConf) {
        const fmtVal = n => '$' + Math.round(n).toLocaleString('es-AR');
        const hayDatos = auditEstructura.length > 0 || auditPlacas.length > 0;

        let auditorWrap = document.getElementById('geckoAuditorChapa');
        if (!auditorWrap) {
            auditorWrap = document.createElement('div');
            auditorWrap.id = 'geckoAuditorChapa';
            auditorWrap.style.marginTop = '20px';
            panelConf.appendChild(auditorWrap);
        }

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

            const seccion = (titulo) =>
                `<p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#71717a;margin:14px 0 6px;padding-top:2px;">${titulo}</p>`;

            let html = '';

            if (auditEstructura.length > 0) {
                html += seccion('Estructura (Fleje)');
                auditEstructura.forEach(l => html += lineaRow(l.nombre, l.detalle, l.valor));
            }

            if (auditPlacas.length > 0) {
                html += seccion('Frente / Fondo');
                auditPlacas.forEach(l => {
                    if (l.nombre.startsWith('⚠')) {
                        html += `<p style="color:#ef4444;font-size:11px;font-weight:700;margin:6px 0 10px;">${l.nombre} — ${l.detalle}</p>`;
                    } else {
                        html += lineaRow(l.nombre, l.detalle, l.valor);
                    }
                });
            }

            if (auditVinilo.length > 0) {
                html += seccion('Vinilos / Montado');
                auditVinilo.forEach(l => html += lineaRow(l.nombre, l.detalle, l.valor));
            }

            if (costoIlumTotal > 0 || costoFuente > 0) {
                html += seccion('Iluminación');
                if (costoIlumTotal > 0) html += lineaRow('LEDs', descIlum, costoIlumTotal);
                if (costoFuente > 0) html += lineaRow('Fuente', fuenteRecomendada, costoFuente);
            }

            if (filasPinturaChapaCalc.length > 0) {
                html += seccion('Acabado de pintura');
                filasPinturaChapaCalc.forEach(f => html += lineaRow(f.nombre + (f.codigo ? ` (${f.codigo})` : ''), `${areaPinturaChapa.toFixed(4)}m²`, f.valor));
            }

            if (diasTrabajo > 0) {
                html += seccion('Mano de obra interna');
                if (servManoObra) {
                    html += lineaRow('Mano de obra taller', `${diasTrabajo} día(s) × $${Math.round(precioDiaManoObra).toLocaleString('es-AR')}/día`, costoManoObraInterna);
                } else {
                    html += `<p style="color:#ef4444;font-size:11px;font-weight:700;margin:6px 0 10px;">${avisoFaltaManoObra}</p>`;
                }
            }

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

        // Botón añadir — siempre después del auditor
        let btnWrapChapa = document.getElementById('btnAnadirChapa');
        if (!btnWrapChapa) {
            btnWrapChapa = document.createElement('div');
            btnWrapChapa.id = 'btnAnadirChapa';
            btnWrapChapa.style.marginTop = '12px';
            panelConf.appendChild(btnWrapChapa);
        }
        btnWrapChapa.innerHTML = `
            <button onclick="window.addChapaAlPresupuesto()"
                class="w-full py-3 rounded-2xl text-white font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                style="background:#f15a24;box-shadow:0 4px 16px rgba(241,90,36,0.3);">
                + Añadir a Cotización
            </button>`;
    }

    if (document.getElementById('subtotalEstimado')) document.getElementById('subtotalEstimado').innerText = fmt(totalFinal);

    const _geckoSnapshotChapa = (function () {
        const snap = { campos: {} };
        document.querySelectorAll('#panelConfigurador [id]').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                snap.campos[el.id] = el.checked;
            } else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                snap.campos[el.id] = el.value;
            }
        });
        return snap;
    })();

    window.itemActualPolifan = {
        tipo: 'corporeos',
        origenCotizador: 'corporeos_chapa',
        nombre: `CHAPA/ACRILICO - ${document.getElementById('chapaNombre')?.value || 'S/N'}`,
        identificacion: document.getElementById('chapaNombre')?.value?.trim() || '',
        costo: totalFinal,
        otDetalle: `Medida: ${ancho}x${alto}cm | Profundidad: ${profundidad}cm | Cant: ${cantidad} | Fleje: ${nomFleje} | ${avisoFaltaWatts ? avisoFaltaWatts : `Ilum Modelo: ${resultadoIlum.modeloNombre} | Ilum Cantidad: ${resultadoIlum.cantidadTexto} | Ilum Fuente: ${fuenteRecomendada}`}${filasPinturaChapaCalc.length > 0 ? ' | Pintura: ' + filasPinturaChapaCalc.map(function(f){ return f.nombre + (f.codigo ? ' (' + f.codigo + ')' : ''); }).join(', ') : ''}${diasTrabajo > 0 ? ` | Mano de obra: ${diasTrabajo} días` : ''}`,
        parametrosOriginales: _geckoSnapshotChapa
    };
};

window.addChapaAlPresupuesto = function () {
    if (!window.itemActualPolifan || window.itemActualPolifan.costo <= 0) {
        window.calcularChapaAcrilico();
    }
    if (!window.itemActualPolifan || window.itemActualPolifan.costo <= 0) {
        alert("Completá los datos del trabajo antes de añadir.");
        return;
    }
    const item = {
        id: Date.now(),
        tipo: 'corporeos',
        origenCotizador: window.itemActualPolifan.origenCotizador || '',
        nombre: window.itemActualPolifan.nombre || 'Chapa / Acrílico',
        identificacion: window.itemActualPolifan.identificacion || '',
        textoOpciones: window.itemActualPolifan.nombre || 'Chapa / Acrílico',
        costo: window.itemActualPolifan.costo,
        otDetalle: window.itemActualPolifan.otDetalle || 'Sin detalle técnico',
        modoCalculo: localStorage.getItem('globalEstimationMode') || 'simple',
        parametrosOriginales: window.itemActualPolifan.parametrosOriginales || null
    };
    if (typeof window.agregarItemAlPresupuesto === 'function') {
        window.agregarItemAlPresupuesto(item);
        if (typeof window.mostrarExito === 'function') {
            window.mostrarExito("\u00cdtem añadido al presupuesto", "¡Listo!");
        }
        window.itemActualPolifan = null;
    } else {
        console.error("agregarItemAlPresupuesto no encontrada");
    }
};

window.addPolifanAlPresupuesto = function () {
    if (!window.itemActualPolifan || window.itemActualPolifan.costo <= 0) {
        window.calcularCostoPolifan();
    }
    if (!window.itemActualPolifan || window.itemActualPolifan.costo <= 0) {
        alert("Completá los datos del trabajo antes de añadir.");
        return;
    }
    const item = {
        id: Date.now(),
        tipo: window.itemActualPolifan.tipo || 'corporeos',
        origenCotizador: window.itemActualPolifan.origenCotizador || '',
        nombre: window.itemActualPolifan.nombre || 'Trabajo Corpóreo',
        identificacion: window.itemActualPolifan.identificacion || '',
        textoOpciones: window.itemActualPolifan.textoOpciones || window.itemActualPolifan.nombre,
        costo: window.itemActualPolifan.costo,
        otDetalle: window.itemActualPolifan.otDetalle || 'Sin detalle técnico',
        modoCalculo: localStorage.getItem('globalEstimationMode') || 'simple',
        parametrosOriginales: window.itemActualPolifan.parametrosOriginales || null
    };
    if (typeof window.agregarItemAlPresupuesto === 'function') {
        window.agregarItemAlPresupuesto(item);
        if (typeof window.mostrarExito === 'function') {
            window.mostrarExito("\u00cdtem añadido al presupuesto", "¡Listo!");
        }
        window.itemActualPolifan = null;
    } else {
        console.error("agregarItemAlPresupuesto no encontrada");
    }
};
