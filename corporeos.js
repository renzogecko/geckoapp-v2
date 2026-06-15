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
                <div class="grid grid-cols-4 gap-4">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Ancho (cm)</label>
                        <input type="number" id="polifanAncho" class="gecko-input w-full" placeholder="0" oninput="window.calcularCostoPolifan()" onwheel="this.blur()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Alto (cm)</label>
                        <input type="number" id="polifanAlto" class="gecko-input w-full" placeholder="0" oninput="window.calcularCostoPolifan()" onwheel="this.blur()">
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

            <button onclick="window.addPolifanAlPresupuesto()" class="w-full py-4 bg-gecko text-white font-black rounded-xl hover:bg-orange-700 uppercase tracking-widest text-[12px] transition-all shadow-lg shadow-orange-500/10">+ Añadir a cotización</button>
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
                <div class="grid grid-cols-5 gap-3">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Ancho (cm)</label>
                        <input type="number" id="chapaAncho" class="gecko-input w-full" placeholder="0" oninput="window.calcularChapaAcrilico()">
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-1">Alto (cm)</label>
                        <input type="number" id="chapaAlto" class="gecko-input w-full" placeholder="0" oninput="window.calcularChapaAcrilico()">
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

            <!-- 04. Frente, Fondo y Vinilo -->
            <div class="card-gecko animate-in fade-in slide-in-from-top-3">
                <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] mb-4 guia-naranja">04. Frente, Fondo y Vinilo</p>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-2">Material Frente</label>
                        <select id="chapaFrenteMat" class="gecko-select w-full" onchange="window.calcularChapaAcrilico()"></select>
                    </div>
                    <div>
                        <label class="block text-[11px] text-zinc-400 mb-2">Material Fondo</label>
                        <select id="chapaFondoMat" class="gecko-select w-full" onchange="window.calcularChapaAcrilico()"></select>
                    </div>
                </div>

                <div class="seccion-switch-gecko border-t border-zinc-800/50 pt-4">
                    <div class="switch-row" onclick="document.getElementById('chkChapaVinilo').click()">
                        <div class="flex items-center gap-3">
                            <i class="bi bi-layers text-gecko"></i>
                            <p class="text-[11px] font-black text-white uppercase tracking-wider">¿LLEVA VINILO / MONTADO?</p>
                        </div>
                        <label class="switch-gecko" onclick="event.stopPropagation()">
                            <input type="checkbox" id="chkChapaVinilo" onchange="window.toggleChapaVinilo()">
                            <span class="slider-gecko"></span>
                        </label>
                    </div>
                    <div id="detallesChapaVinilo" class="hidden mt-4">
                        <label class="block text-[11px] text-zinc-400 mb-2">Tipo de Vinilo</label>
                        <select id="chapaViniloMat" class="gecko-select w-full" onchange="window.calcularChapaAcrilico()"></select>
                    </div>
                </div>
            </div>

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
                        <select id="chapaTipoLed" class="gecko-select w-full" onchange="window.calcularChapaAcrilico()">
                            <option value="modulos">Módulos LED (112 u/m2)</option>
                            <option value="tira">Tira LED (Perímetro + 10%)</option>
                        </select>
                        <div id="visorConsumo" class="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                            <p class="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Consumo Estimado</p>
                            <p id="txtConsumo" class="text-white font-bold text-sm">0W</p>
                            <p id="txtFuente" class="text-gecko font-black text-[10px] mt-1 uppercase">Esperando datos...</p>
                        </div>
                    </div>
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

        window.toggleChapaVinilo = function () {
            const chk = document.getElementById('chkChapaVinilo');
            document.getElementById('detallesChapaVinilo').classList.toggle('hidden', !chk.checked);
            window.calcularChapaAcrilico();
        };

        window.toggleChapaIlum = function () {
            const chk = document.getElementById('chkChapaIlum');
            document.getElementById('detallesChapaIlum').classList.toggle('hidden', !chk.checked);
            window.calcularChapaAcrilico();
        };

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
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Ancho (cm)</label><input type="number" id="3dAncho" class="gecko-input w-full" placeholder="0" oninput="window.calcularLetras3D()"></div>
                    <div><label class="block text-[11px] text-zinc-400 mb-1">Alto (cm)</label><input type="number" id="3dAlto" class="gecko-input w-full" placeholder="0" oninput="window.calcularLetras3D()"></div>
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
                <div class="flex justify-between text-[11px] text-zinc-400 uppercase tracking-widest font-bold">
                    <span>04. Resumen Estimado</span>
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

            <button onclick="window.addLetras3DAlPresupuesto()" class="w-full py-4 bg-gecko text-white font-black rounded-xl hover:bg-orange-700 uppercase tracking-widest text-[12px] transition-all shadow-lg shadow-orange-500/10">+ Añadir a cotización</button>
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

window.calcularLetras3D = function () {
    const ancho = parseFloat(document.getElementById('3dAncho')?.value) || 0;
    const alto = parseFloat(document.getElementById('3dAlto')?.value) || 0;
    const perimetro = parseFloat(document.getElementById('3dPerimetro')?.value) || 1;
    const profundidad = parseFloat(document.getElementById('3dProfundidad')?.value) || 1;

    // Cálculo de volumen estimado
    const gramos = perimetro * profundidad * 0.15;
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
    const totalFinal = costoMaterial + costoServicio;

    const fmt = v => '$' + Math.round(v).toLocaleString('es-AR');

    // Actualizar columna derecha
    if (document.getElementById('subtotalEstimado'))
        document.getElementById('subtotalEstimado').innerText = fmt(totalFinal);
    if (document.getElementById('detMaterialBase'))
        document.getElementById('detMaterialBase').innerText = fmt(costoMaterial);
    if (document.getElementById('detServicio'))
        document.getElementById('detServicio').innerText = fmt(costoServicio);
    if (document.getElementById('detTerminaciones'))
        document.getElementById('detTerminaciones').innerText = fmt(totalFinal);

    // Auditor visual bajo el selector de material
    const auditor = document.getElementById('auditor3D');
    if (auditor) {
        auditor.innerText = matObj
            ? `GDM: ${nombreMat} | $${Math.round(precioPorGramo)}/gr | Hora máquina: ${fmt(costoHora3D)}/hs`
            : 'Selecioná un material para calcular';
    }

    // Guardar para el carrito
    window.itemActualPolifan = {
        tipo: 'corporeos',
        nombre: `LETRAS 3D – ${nombreMat}`,
        textoOpciones: `Letras 3D (Est.): ${ancho}x${alto}cm | ${nombreMat}`,
        costo: totalFinal,
        otDetalle: `Medida: ${ancho}x${alto}cm | Profundidad: ${profundidad}cm | Peso Est.: ${Math.round(gramos)}gr | Tiempo Est.: ${horas.toFixed(1)}hs | Material: ${nombreMat}`
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
        nombre: window.itemActualPolifan.nombre || 'Letras 3D',
        textoOpciones: window.itemActualPolifan.textoOpciones || 'Letras 3D (Estimado)',
        costo: window.itemActualPolifan.costo,
        otDetalle: window.itemActualPolifan.otDetalle || 'Sin detalle técnico',
        modoCalculo: localStorage.getItem('globalEstimationMode') || 'simple'
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
    const perimetro = parseFloat(document.getElementById('polifanPerimetro')?.value) || 1;
    const cantidad = parseInt(document.getElementById('polifanCantidad')?.value) || 1;

    const areaM2 = (ancho * alto) / 10000;
    const perimetroMl = perimetro / 100;

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
        const auditor = document.getElementById('auditorEspesorPolifan');
        if (auditor) auditor.innerText = `$${Math.round(precioM2)}/m² | Mat: ${itemPolifan.nombre}${document.getElementById('modoGremio')?.checked ? ' (Gremio)' : ''}`;
    }

    // 2. Corte Polifan
    const itemCortePoli = window.getGeckoItem("CORTE DE POLIFÁN");
    let costoCortePoli = 0;
    if (itemCortePoli) {
        costoCortePoli = perimetroMl * window.getCorpPrecio(itemCortePoli);
        const auditor = document.getElementById('auditorCortePolifan');
        if (auditor) auditor.innerText = `Servicio: CORTE DE POLIFÁN | Precio: $${Math.round(window.getCorpPrecio(itemCortePoli))}/ml`;
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
        if (itBase) {
            cBaseMat = areaM2 * window.getCorpPrecio(itBase);
            // Búsqueda de corte laser específico
            const itCorteLaser = window.getGeckoItem("CORTE LASER - " + itBase.nombre);
            if (itCorteLaser) {
                cBaseCorte = perimetroMl * window.getCorpPrecio(itCorteLaser);
            }
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

        const auditor = document.getElementById('auditorFrentePro');
        if (auditor) {
            auditor.innerHTML = `
                <div class="text-[11px] text-zinc-400 space-y-1 mt-2">
                   <p>• Placa Base + Corte: <span class="text-white">$${Math.round(cBaseMat + cBaseCorte).toLocaleString('es-AR')}</span></p>
                   <p>• Vinilo Adicional: <span class="text-white">$${Math.round(cTermMat).toLocaleString('es-AR')}</span></p>
                   <p>• Servicio de Montado: <span class="text-white">$${Math.round(cTermMontado).toLocaleString('es-AR')}</span></p>
                   <hr class="border-zinc-700 my-1">
                   <p class="font-bold text-gecko">TOTAL FRENTE: $${Math.round(costoFrenteTotal).toLocaleString('es-AR')}</p>
                </div>
            `;
        }
    } else {
        const auditor = document.getElementById('auditorFrentePro');
        if (auditor) auditor.innerText = "";
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
    if (document.getElementById('detMaterialBase')) document.getElementById('detMaterialBase').innerText = fmt((costoCuerpo + costoFrenteTotal) * cantidad);
    if (document.getElementById('detServicio')) document.getElementById('detServicio').innerText = fmt((costoCortePoli + costoPintura) * cantidad);

    window.itemActualPolifan = {
        tipo: 'corporeos',
        nombre: `POLIFÁN - ${espesorText} - ${document.getElementById('polifanNombre')?.value || 'S/N'}`,
        costo: totalFinal,
        otDetalle: `Polifán ${espesorText} | Medida: ${ancho}x${alto}cm | Cant: ${cantidad} | Corte: ${perimetroMl}ml${descFrente}${llevaPintura ? ' | Pintura: ' + (document.getElementById('pinturaColores')?.value || 'S/E') : ''}`
    };
}

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

    // 2. Frente (Rígidos + Chapas + Polifán)
    const selFrente = document.getElementById('chapaFrenteMat');
    if (selFrente) {
        const mats = materiales.filter(m => {
            const cat = (m.categoria || '').toLowerCase();
            return cat === 'rigido' || cat === 'chapas' || cat === 'polifan' ||
                cat === 'chapas / placas' || cat === 'acrílicos' || cat === 'pvc';
        });
        let html = '<option value="SELECCIONAR">SELECCIONAR MATERIAL</option>';
        html += mats.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('');
        selFrente.innerHTML = html;
    }

    // 3. Fondo (Rígidos + Chapas + Opción Sin Fondo)
    const selFondo = document.getElementById('chapaFondoMat');
    if (selFondo) {
        const mats = materiales.filter(m => {
            const cat = (m.categoria || '').toLowerCase();
            return cat === 'rigido' || cat === 'chapas' || cat === 'polifan' ||
                cat === 'chapas / placas' || cat === 'acrílicos';
        });
        let html = '<option value="SIN_FONDO">SIN FONDO / HUECO</option>';
        html += mats.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('');
        selFondo.innerHTML = html;
    }

    // 4. Vinilo (Flexibles / Vinilos-Lonas — todos excepto lonas)
    const selVinilo = document.getElementById('chapaViniloMat');
    if (selVinilo) {
        const matsVinilo = (window.materiales || []).filter(m => {
            const cat = (m.categoria || '').toLowerCase().trim();
            const nombre = (m.nombre || '').toUpperCase();
            return (
                cat === 'vinilos_lonas' ||
                cat === 'flexible'
            ) && !nombre.includes('LONA');
        });
        let htmlVinilo = '<option value="SELECCIONAR">SELECCIONAR VINILO</option>';
        htmlVinilo += matsVinilo.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('');
        selVinilo.innerHTML = htmlVinilo;
    }
};

window.calcularChapaAcrilico = function () {
    // 1. Captura y Normalización de Variables
    const ancho = parseFloat(document.getElementById('chapaAncho')?.value) || 0;
    const alto = parseFloat(document.getElementById('chapaAlto')?.value) || 0;
    const perimetro = parseFloat(document.getElementById('chapaPerimetro')?.value) || 0;
    const profundidad = parseFloat(document.getElementById('chapaProfundidad')?.value) || 0;
    const cantidad = Math.max(1, parseInt(document.getElementById('chapaCantidad')?.value) || 1);

    const areaM2 = (ancho * alto) / 10000;
    const perimetroMl = perimetro / 100;

    // Función de normalización solicitada
    const normalizar = (txt) => String(txt || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");

    // Helper: buscar servicio de corte l\u00e1ser SOLO en geckoServicios (evita matchear contra materiales)
    const getServicioCorte = (nombreMaterial) => {
        const servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
        const qNorm = normalizar("CORTE LASER " + nombreMaterial);
        // 1. Match exacto
        let serv = servicios.find(s => normalizar(s.nombre) === qNorm);
        // 2. Match parcial: el nombre del servicio normalizado est\u00e1 contenido en la query
        if (!serv) serv = servicios.find(s => normalizar(s.nombre).startsWith("CORTELASER") && qNorm.includes(normalizar(s.nombre)));
        // 3. Fallback gen\u00e9rico METAL
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
        const auditorViejoEarly = document.getElementById('auditorChapaCuerpo');
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

    // 3. Frente y Fondo (Placas)
    let costoPlacas = 0;
    let costoCortePlacas = 0;
    const auditPlacas = [];

    // Frente
    const selFrente = document.getElementById('chapaFrenteMat');
    const valFrente = selFrente?.value;
    const itFrente = (valFrente && valFrente !== 'SELECCIONAR') ? window.getGeckoItem(selFrente.options[selFrente.selectedIndex].text) : null;
    if (itFrente) {
        // Calcular precio por m² del material basado en el área de placa registrada en GDM
        const anchoPlacaM = ((itFrente.ancho || itFrente.anchoPlaca || 0)) / 100;
        const altoPlacaM = ((itFrente.alto || itFrente.altoPlaca || 0)) / 100;
        const areaPlacaGDM = anchoPlacaM > 0 && altoPlacaM > 0 ? anchoPlacaM * altoPlacaM : null;
        const precioPlaca = window.getCorpPrecio(itFrente);
        const precioM2Frente = Math.round(areaPlacaGDM ? (precioPlaca / areaPlacaGDM) : precioPlaca);
        const subtotalFrente = areaM2 * precioM2Frente;
        costoPlacas += subtotalFrente;
        auditPlacas.push({ nombre: `Frente: ${itFrente.nombre}`, detalle: `${areaM2.toFixed(4)}m² × $${precioM2Frente.toLocaleString('es-AR')}/m²`, valor: subtotalFrente });
        const servCorteFrente = getServicioCorte(itFrente.nombre);
        if (servCorteFrente) {
            const precioCorteFrente = window.getCorpPrecio(servCorteFrente);
            const subtotalCorteFrente = perimetroMl * precioCorteFrente;
            costoCortePlacas += subtotalCorteFrente;
            auditPlacas.push({ nombre: `Corte ${servCorteFrente.nombre}`, detalle: `${perimetroMl.toFixed(2)}ml × $${Math.round(precioCorteFrente).toLocaleString('es-AR')}/ml`, valor: subtotalCorteFrente });
        }
    }

    const selFondo = document.getElementById('chapaFondoMat');
    if (selFondo?.value !== 'SIN_FONDO') {
        const itFondo = window.getGeckoItem(selFondo?.options[selFondo.selectedIndex]?.text);
        if (itFondo) {
            // Calcular precio por m² basado en área de placa GDM
            const anchoPlacaM = ((itFondo.ancho || itFondo.anchoPlaca || 0)) / 100;
            const altoPlacaM = ((itFondo.alto || itFondo.altoPlaca || 0)) / 100;
            const areaPlacaGDM = anchoPlacaM > 0 && altoPlacaM > 0 ? anchoPlacaM * altoPlacaM : null;
            const precioPlaca = window.getCorpPrecio(itFondo);
            const precioM2Fondo = Math.round(areaPlacaGDM ? (precioPlaca / areaPlacaGDM) : precioPlaca);
            const subtotalFondo = areaM2 * precioM2Fondo;
            costoPlacas += subtotalFondo;
            auditPlacas.push({ nombre: `Fondo: ${itFondo.nombre}`, detalle: `${areaM2.toFixed(4)}m² × $${precioM2Fondo.toLocaleString('es-AR')}/m²`, valor: subtotalFondo });
            const servCorteFondo = getServicioCorte(itFondo.nombre);
            if (servCorteFondo) {
                const precioCorteFondo = window.getCorpPrecio(servCorteFondo);
                const subtotalCorteFondo = perimetroMl * precioCorteFondo;
                costoCortePlacas += subtotalCorteFondo;
                auditPlacas.push({ nombre: `Corte ${servCorteFondo.nombre}`, detalle: `${perimetroMl.toFixed(2)}ml × $${Math.round(precioCorteFondo).toLocaleString('es-AR')}/ml`, valor: subtotalCorteFondo });
            }
        }
    }

    // 4. Vinilo / Montado
    let costoViniloTotal = 0;
    const auditVinilo = [];
    if (document.getElementById('chkChapaVinilo')?.checked) {
        const selVinilo = document.getElementById('chapaViniloMat');
        const valVinilo = selVinilo?.value;
        const itVinilo = (valVinilo && valVinilo !== 'SELECCIONAR') ? window.getGeckoItem(selVinilo.options[selVinilo.selectedIndex].text) : null;
        const itMontado = window.getGeckoItem("MONTADO");

        if (itVinilo) {
            const pVinilo = Math.round(window.getCorpPrecio(itVinilo));
            const subtotalVinilo = areaM2 * pVinilo;
            costoViniloTotal += subtotalVinilo;
            auditVinilo.push({ nombre: itVinilo.nombre, detalle: `${areaM2.toFixed(4)}m² × $${pVinilo.toLocaleString('es-AR')}/m²`, valor: subtotalVinilo });
        }
        if (itMontado) {
            const pMontado = Math.round(window.getCorpPrecio(itMontado));
            const subtotalMontado = areaM2 * pMontado;
            costoViniloTotal += subtotalMontado;
            auditVinilo.push({ nombre: 'Servicio de Montado', detalle: `${areaM2.toFixed(4)}m² × $${pMontado.toLocaleString('es-AR')}/m²`, valor: subtotalMontado });
        }
    }

    // 5. Iluminación y Fuentes
    let costoIlumTotal = 0;
    let descIlum = "0 unidades";
    let fuenteRecomendada = "N/A";
    let costoFuente = 0;

    if (document.getElementById('chkChapaIlum')?.checked) {
        const tipoLed = document.getElementById('chapaTipoLed').value;
        let consumoTotal = 0;
        let cantU = 0;
        let descripcionLed = '';
        let costoLed = 0;

        if (tipoLed === 'modulos') {
            // Buscar módulo LED con fallbacks
            const itemLed = window.getGeckoItem('MÓDULO LED SMD2835 – 3 LED') ||
                            window.getGeckoItem('MODULO LED SMD2835 3 LED') ||
                            window.getGeckoItem('MODULO LED');
            // Estándar industria: 112 módulos por m²
            cantU = Math.ceil(areaM2 * 112);
            consumoTotal = cantU * 0.72; // 0.72W por módulo
            if (itemLed) costoLed = cantU * itemLed.precioVenta;
            descripcionLed = `${cantU} módulos LED 3 LED SMD2835`;
            descIlum = descripcionLed;
            const txtConsumo = document.getElementById('txtConsumo');
            if (txtConsumo) txtConsumo.innerText = `${cantU} módulos × 0.72W = ${consumoTotal.toFixed(1)}W totales`;
        } else {
            // Tira LED con fallbacks
            const itemTira = window.getGeckoItem('TIRA LED SMD2835 – 120LED (FRIO)') ||
                             window.getGeckoItem('TIRA LED SMD2835 120LED FRIO') ||
                             window.getGeckoItem('TIRA LED');
            const mts = perimetroMl * 1.1;
            cantU = mts;
            consumoTotal = mts * 14.4; // 14.4W por metro tira 120LED
            if (itemTira) costoLed = mts * itemTira.precioVenta;
            descripcionLed = `${mts.toFixed(2)}m tira LED SMD2835 120LED Fría`;
            descIlum = descripcionLed;
            const txtConsumo = document.getElementById('txtConsumo');
            if (txtConsumo) txtConsumo.innerText = `${mts.toFixed(2)}m × 14.4W = ${consumoTotal.toFixed(1)}W totales`;
        }

        costoIlumTotal = costoLed;

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
                return { item: m, watts: matchW ? parseInt(matchW[1]) : 0 };
            })
            .filter(f => f.watts >= wattsNecesarios)
            .sort((a, b) => a.watts - b.watts);

        const txtFuente = document.getElementById('txtFuente');
        if (todasFuentes.length > 0) {
            const fuenteElegida = todasFuentes[0];
            fuenteRecomendada = fuenteElegida.item.nombre;
            const itFuenteData = window.getGeckoItem(fuenteRecomendada);
            if (itFuenteData) costoFuente = itFuenteData.precioVenta;
            if (txtFuente) {
                txtFuente.style.color = '';
                txtFuente.innerText = `Fuente recomendada: ${fuenteRecomendada} (necesita ${wattsNecesarios.toFixed(1)}W)`;
            }
        } else {
            if (txtFuente) {
                txtFuente.style.color = '#ef4444';
                txtFuente.innerText = `Atención: necesita ${wattsNecesarios.toFixed(1)}W – Verificar fuente disponible`;
            }
        }
    }

    // 6. Totales y Auditoría
    const estructuraTotal = costoFleje + costoPlacas;
    const corteTotal = costoCorteFleje + costoCortePlacas;
    const totalUnitario = estructuraTotal + corteTotal + costoViniloTotal + costoIlumTotal + costoFuente;
    const totalFinal = Math.round(totalUnitario * cantidad);

    const fmt = (v) => '$' + Math.round(v).toLocaleString('es-AR');

    // Ocultar auditor inline viejo (regla: ocultar, nunca eliminar)
    const auditorViejo = document.getElementById('auditorChapaCuerpo');
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
                auditPlacas.forEach(l => html += lineaRow(l.nombre, l.detalle, l.valor));
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

    window.itemActualPolifan = {
        tipo: 'corporeos',
        nombre: `CHAPA/ACRILICO - ${document.getElementById('chapaNombre')?.value || 'S/N'}`,
        costo: totalFinal,
        otDetalle: `Medida: ${ancho}x${alto}cm | Profundidad: ${profundidad}cm | Cant: ${cantidad} | Fleje: ${nomFleje} | Ilum: ${descIlum} (${fuenteRecomendada})`
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
        nombre: window.itemActualPolifan.nombre || 'Chapa / Acrílico',
        textoOpciones: window.itemActualPolifan.nombre || 'Chapa / Acrílico',
        costo: window.itemActualPolifan.costo,
        otDetalle: window.itemActualPolifan.otDetalle || 'Sin detalle técnico',
        modoCalculo: localStorage.getItem('globalEstimationMode') || 'simple'
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
        nombre: window.itemActualPolifan.nombre || 'Trabajo Corpóreo',
        textoOpciones: window.itemActualPolifan.textoOpciones || window.itemActualPolifan.nombre,
        costo: window.itemActualPolifan.costo,
        otDetalle: window.itemActualPolifan.otDetalle || 'Sin detalle técnico',
        modoCalculo: localStorage.getItem('globalEstimationMode') || 'simple'
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
