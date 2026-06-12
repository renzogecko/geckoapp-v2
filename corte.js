/**
 * GECKO - Módulo de Vinilo de Corte (Nesting & Bobina)
 */

window.GeckoCorte = {
    state: {
        ancho: 0,
        alto: 0,
        cantidad: 1,
        bobina: 60,
        materialId: null,
        transfer: false,
        montado: false,
        totalFinal: 0,
        detalle: '',
        matName: 'Sin material'
    },

    init: function () {
        console.log("🦎 Módulo Vinilo de Corte (Nesting) Iniciado");
        
        // ASEGURAR CARGA DE DATOS
        if (!window.materiales || window.materiales.length === 0) {
            window.materiales = JSON.parse(localStorage.getItem('gecko_materiales')) || [];
        }

        const tieneManoObra = (window.materiales || []).some(m => (m.categoria || '').toUpperCase().includes('MANO'));
        if (!tieneManoObra) {
            const servs = JSON.parse(localStorage.getItem('gecko_terminaciones')) || [];
            if (servs.length > 0) {
                window.materiales = [...(window.materiales || []), ...servs];
            }
        }

        this.render();
        this.poblarMateriales();
        this.poblarPlacas();
    },

    poblarMateriales: function () {
        const select = document.getElementById('corteMaterial');
        if (!select) return;

        // Palabras que excluyen materiales no aptos para corte de vinilo
        const excluidos = ['lona', 'front', 'backlight', 'mesh', 'papel', 'banner'];

        const materialesFiltrados = (window.materiales || []).filter(m => {
            const cat = (m.categoria || '').toLowerCase().trim();
            const nombre = (m.nombre || '').toLowerCase();
            const sub = (m.subcategoria || '').toLowerCase();

            // Categoría válida: nueva (vinilos_lonas) o vieja (flexible)
            const esCatValida = cat === 'vinilos_lonas' || cat === 'flexible' ||
                                cat.includes('vinilo') || cat.includes('flexible');

            // Excluir si el nombre o subcategoría contiene alguna palabra prohibida
            const tieneExcluido = excluidos.some(ex => nombre.includes(ex) || sub.includes(ex));

            return esCatValida && !tieneExcluido;
        });

        select.innerHTML = '<option value="">Seleccionar Material...</option>' +
            materialesFiltrados.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('');
    },

    poblarPlacas: function () {
        const select = document.getElementById('cortePlacas');
        if (!select) return;
        const placas = (window.materiales || []).filter(m => {
            const cat = (m.categoria || '').toLowerCase().trim();
            return cat === 'rigido' || cat === 'chapas' || cat === 'polifan' ||
                   cat.includes('placa') || cat.includes('rigido') || cat.includes('rígido');
        });

        select.innerHTML = '<option value="">Seleccionar Placa...</option>' +
            placas.map(m => `<option value="${m.id || m.nombre}">${m.nombre}</option>`).join('');
    },

    render: function () {
        const panel = document.getElementById('panelConfigurador');
        if (!panel) return;

        const inputStyle = "w-full bg-transparent border-b-2 border-zinc-800 p-3 text-[11px] font-normal text-white transition-all outline-none placeholder:text-zinc-500";
        const labelStyle = "block text-[11px] font-normal text-zinc-500 mb-2";
        const titleStyle = "text-[12px] font-black text-white uppercase tracking-[0.2em] mb-4 pl-3 border-l-4 border-gecko leading-none";

        panel.innerHTML = `
            <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <!-- 01. IDENTIFICACIÓN -->
                <div class="card-gecko">
                    <div class="flex items-center justify-between w-full mb-3">
                        <p class="${titleStyle}">01. Identificación del Trabajo</p>
                        <label class="flex items-center gap-2 cursor-pointer select-none group" title="Modo Gremio: usa precios especiales">
                            <span id="corteLabPublico" class="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">PÚBLICO</span>
                            <div class="relative inline-flex items-center">
                                <input type="checkbox" id="modoGremioCorte" class="sr-only peer"
                                    onchange="window.GeckoCorte.calcular(); document.getElementById('corteLabPublico')?.classList.toggle('text-zinc-500', !this.checked); document.getElementById('corteLabGremio')?.classList.toggle('text-indigo-400', this.checked);">
                                <div class="w-9 h-5 bg-zinc-700 rounded-full peer-checked:bg-indigo-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                            </div>
                            <span id="corteLabGremio" class="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">GREMIO</span>
                        </label>
                    </div>
                    <input type="text" id="corteNombre" placeholder="Ej: Calcos para Vidriera KFC"
                        class="${inputStyle}" oninput="window.GeckoCorte.calcular()">
                </div>

                <!-- 02. MEDIDAS Y BOBINA -->
                <div class="card-gecko">
                    <p class="${titleStyle}">02. Medidas y Bobina</p>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="${labelStyle}">Ancho Bobina</label>
                            <select id="corteBobina" class="gecko-select-pro" onchange="window.GeckoCorte.calcular()">
                                <option value="60">60 cm</option>
                                <option value="120">120 cm</option>
                            </select>
                        </div>
                        <div>
                            <label class="${labelStyle}">Largo (cm)</label>
                            <input type="number" id="corteLargo" placeholder="0" class="${inputStyle}" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
                        </div>
                        <div>
                            <label class="${labelStyle}">Cantidad</label>
                            <input type="number" id="corteCantidad" value="1" class="${inputStyle}" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
                        </div>
                    </div>
                </div>

                <!-- 03. MATERIAL -->
                <div class="card-gecko">
                    <p class="${titleStyle}">03. Selección de Material</p>
                    <select id="corteMaterial" class="gecko-select-pro" onchange="window.GeckoCorte.calcular()">
                        <option value="">Cargando materiales...</option>
                    </select>
                    <p id="auditorMaterialCorte" class="hidden"></p>
                </div>

                <!-- 04. SERVICIOS Y TRANSFER -->
                <div class="card-gecko">
                    <p class="${titleStyle}">04. Servicios y Adicionales</p>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                            <div class="flex items-center gap-3">
                                <input type="checkbox" id="corteTransfer" class="w-4 h-4 accent-gecko cursor-pointer" onchange="window.GeckoCorte.calcular()">
                                <label for="corteTransfer" class="text-[11px] font-bold text-zinc-300 uppercase cursor-pointer">Lleva Transfer</label>
                            </div>
                            <span id="priceCorteTransfer" class="text-[11px] font-black text-gecko">$0</span>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-gecko/5 rounded-xl border border-gecko/20">
                            <span class="text-[11px] font-black text-gecko uppercase tracking-widest">Corte Plotter (Automático)</span>
                            <span id="priceCortePlotter" class="text-[11px] font-black text-gecko">$0</span>
                        </div>
                    </div>
                </div>

                <!-- 05. MONTADO PRO -->
                <div class="seccion-switch-gecko">
                    <p class="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-2 guia-gecko">05. Montado en Rígido</p>
                    
                    <div class="switch-row" onclick="document.getElementById('switch-montado-corte').click()">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-orange-950/30 rounded-xl flex items-center justify-center border border-orange-900/30">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gecko" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-[11px] font-black text-white uppercase tracking-wider">¿Lleva Montado?</p>
                                <p class="text-[9px] font-bold text-zinc-500 uppercase">Opcional / PVC, Foam, ACM</p>
                            </div>
                        </div>
                        
                        <label class="switch-gecko" onclick="event.stopPropagation()">
                            <input type="checkbox" id="switch-montado-corte" onchange="window.GeckoCorte.toggleMontado()">
                            <span class="slider-gecko"></span>
                        </label>
                    </div>

                    <div id="detallesMontadoCorte" class="hidden mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div class="pt-4 border-t border-zinc-800/50">
                            <select id="cortePlacas" onchange="window.GeckoCorte.calcular()" class="gecko-select-pro w-full mb-1">
                                <option value="">Seleccionar Placa...</option>
                            </select>
                            <p id="auditorPlacaCorte" class="hidden"></p>

                            <!-- Títulos de Columnas -->
                            <div class="grid grid-cols-4 gap-4 px-1 mb-1">
                                <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Ancho</span>
                                <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Alto</span>
                                <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold text-center">Cant</span>
                                <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Corte ML</span>
                            </div>

                            <div id="contenedor-filas-corte-rigidos" class="space-y-1">
                                <div class="gecko-input-row">
                                    <input type="number" placeholder="0" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
                                    <input type="number" placeholder="0" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
                                    <input type="number" value="1" class="text-center" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
                                    <input type="number" placeholder="0" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
                                </div>
                            </div>

                            <button type="button" onclick="window.GeckoCorte.agregarFilaMontado()" class="btn-add-fila mt-4">
                                + AÑADIR PLACA / MEDIDA
                            </button>
                        </div>
                    </div>
                </div>

                <!-- AUDITOR DE CÁLCULO — fuera de seccion-switch-gecko para evitar doble card -->
                <div id="geckoAuditorCorte"></div>

                <!-- BOTÓN FINAL -->
                <button onclick="window.GeckoCorte.añadirAlPresupuesto()" class="w-full py-4 bg-gecko text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[12px] hover:bg-orange-600 transition-all shadow-lg shadow-gecko/20 mt-6">
                    + AÑADIR COTIZACIÓN
                </button>
            </div>
        `;
    },

    toggleMontado: function () {
        const isChecked = document.getElementById('switch-montado-corte').checked;
        document.getElementById('detallesMontadoCorte').classList.toggle('hidden', !isChecked);
        this.calcular();
    },

    agregarFilaMontado: function () {
        const container = document.getElementById('contenedor-filas-corte-rigidos');
        const div = document.createElement('div');
        div.className = "gecko-input-row";
        div.innerHTML = `
            <input type="number" placeholder="0" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
            <input type="number" placeholder="0" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
            <input type="number" value="1" class="text-center" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
            <div class="flex items-center gap-2">
                <input type="number" placeholder="0" oninput="window.GeckoCorte.calcular()" onwheel="this.blur()">
                <button onclick="this.closest('.gecko-input-row').remove(); window.GeckoCorte.calcular();" class="text-zinc-700 hover:text-red-500 transition-colors px-1">✕</button>
            </div>
        `;
        container.appendChild(div);
    },

    calcular: function () {
        const largo = parseFloat(document.getElementById('corteLargo')?.value) || 0;
        const cant = parseFloat(document.getElementById('corteCantidad')?.value) || 1;
        const bobinaStr = document.getElementById('corteBobina')?.value || "60";
        const bobina = parseFloat(bobinaStr);
        const materialId = document.getElementById('corteMaterial')?.value;
        const llevaTransfer = document.getElementById('corteTransfer')?.checked;
        const llevaMontado = document.getElementById('switch-montado-corte')?.checked;

        const mode = localStorage.getItem('globalEstimationMode') || 'simple';

        // 2. CÁLCULO DE METROS LINEALES
        let mlTotales = (largo / 100) * cant;
        let costoMaterial = 0;
        let matName = "Sin material";

        const mat = window.getGeckoItem(materialId);
        if (mat) {
            matName = mat.nombre;

            // --- LÓGICA GREMIO (lee ambos switches: el local y el global de Gráfica) ---
            const isGremio = document.getElementById('modoGremioCorte')?.checked ||
                             document.getElementById('modoGremio')?.checked;

            // precioBase es el precio por m2 del material
            const precioBase = (isGremio && mat.precioGremio > 0)
                ? mat.precioGremio
                : (mat.precioVenta || (mat.costoARS * (mat.multiplicador || 2.0)));

            // DEBUG: verificar en consola el estado del switch y el precio elegido
            console.log('Modo Gremio:', isGremio, '| Precio usado ($/m2):', precioBase, '| Material:', mat.nombre);

            // Precio por metro lineal = precioBase ($/m2) * ancho bobina (m)
            const precioML = precioBase * (bobina / 100);
            if (mlTotales > 0) costoMaterial = mlTotales * precioML;

            const gremioTag = isGremio ? ' 🟣 GREMIO' : '';
            this.safeSetText('auditorMaterialCorte', `GDM: ${mat.nombre}${gremioTag} | $${Math.round(precioML)}/ml`);
        } else {
            this.safeSetText('auditorMaterialCorte', '');
        }

        // 3. TRANSFER
        let costoTransfer = 0;
        if (llevaTransfer) {
            let mlTransfer = (bobina === 120) ? mlTotales * 2 : mlTotales;
            const matTransfer = window.getGeckoItem("Transfer") || window.getGeckoItem("CINTA POSICIONADORA");
            const precioTranfer = matTransfer ? matTransfer.precioVenta : 0;
            costoTransfer = mlTransfer * precioTranfer;
        }

        // 4. CORTE PLOTTER (BÚSQUEDA EN MANO DE OBRA)
        const servicioCorte = window.getGeckoItem("PLOTER DE CORTE - " + bobinaStr + "CM") || window.getGeckoItem("SERVICIO DE CORTE");
        const precioServicioCorte = servicioCorte ? servicioCorte.precioVenta : 0;
        const costoCortePlotter = mlTotales * precioServicioCorte;

        // 5. MONTADO SOBRE RÍGIDOS
        let totalRigidos = 0;
        if (llevaMontado) {
            const placaId = document.getElementById('cortePlacas')?.value;
            const placaMat = window.getGeckoItem(placaId);
            
            if (placaMat) {
                const precioPlaca = (typeof window.getPrecioEfectivo === 'function')
                    ? window.getPrecioEfectivo(placaMat)
                    : (placaMat.precioVenta || placaMat.costoARS * (placaMat.multiplicador || 2));
                this.safeSetText('auditorPlacaCorte', `GDM: ${placaMat.nombre} | Precio: $${Math.round(precioPlaca)}/m2`);

                const filas = document.querySelectorAll('#contenedor-filas-corte-rigidos .gecko-input-row');
                filas.forEach(f => {
                    const ins = f.querySelectorAll('input');
                    const a = parseFloat(ins[0]?.value) || 0;
                    const l = parseFloat(ins[1]?.value) || 0;
                    const c = parseFloat(ins[2]?.value) || 1;
                    const ml = parseFloat(ins[3]?.value) || 0;
                    totalRigidos += (a * l * c / 10000) * precioPlaca + (ml * 2500);
                });
            } else {
                this.safeSetText('auditorPlacaCorte', '');
            }
        }

        const totalFinal = costoMaterial + costoTransfer + costoCortePlotter + totalRigidos;

        // ACTUALIZACIÓN DE UI
        this.safeSetText('priceCorteTransfer', '$' + Math.round(costoTransfer).toLocaleString('es-AR'));
        this.safeSetText('priceCortePlotter', '$' + Math.round(costoCortePlotter).toLocaleString('es-AR'));
        this.safeSetText('subtotalEstimado', '$' + Math.round(totalFinal).toLocaleString('es-AR'));

        this.safeSetText('detMaterialBase', '$' + Math.round(costoMaterial).toLocaleString('es-AR'));
        this.safeSetText('detServicio', '$' + Math.round(costoTransfer + costoCortePlotter + totalRigidos).toLocaleString('es-AR'));
        this.safeSetText('detTerminaciones', '$' + Math.round(totalFinal).toLocaleString('es-AR'));

        this.state.totalFinal = totalFinal;
        this.state.detalle = `${matName} | ${cant} unid. | ${mlTotales.toFixed(2)} ML ${llevaMontado ? '+ Montado' : ''}`;
        this.state.matName = matName;

        // Actualizar panel derecho (mismo patrón que grafica.js)
        window.itemActualCotizado = {
            id: Date.now(),
            tipo: 'grafica',
            nombre: document.getElementById('corteNombre')?.value || 'Vinilo Corte',
            material: matName,
            detalle: this.state.detalle,
            costo: totalFinal,
            textoOpciones: matName
        };

        // ── Auditor de cálculo ────────────────────────────────────────────────────
        const auditorWrap = document.getElementById('geckoAuditorCorte');
        if (auditorWrap) {
            const fmtVal = n => '$' + Math.round(n).toLocaleString('es-AR');
            const hayDatos = costoMaterial > 0 || costoTransfer > 0 || costoCortePlotter > 0 || totalRigidos > 0;

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

                // ZONA 1 — MATERIAL
                if (costoMaterial > 0) {
                    const mat = window.getGeckoItem(document.getElementById('corteMaterial')?.value);
                    const isGremio = document.getElementById('modoGremioCorte')?.checked || document.getElementById('modoGremio')?.checked;
                    const precioBase = mat ? ((isGremio && mat.precioGremio > 0) ? mat.precioGremio : (mat.precioVenta || (mat.costoARS * (mat.multiplicador || 2.0)))) : 0;
                    const precioMLAudit = precioBase * (bobina / 100);
                    html += seccion('Material');
                    html += lineaRow(
                        matName,
                        `${mlTotales.toFixed(2)}ML × ${fmtVal(precioMLAudit)}/ML (bobina ${bobina}cm)${cant > 1 ? ` × ${cant} u` : ''}`,
                        costoMaterial
                    );
                }

                // ZONA 2 — SERVICIOS
                const servicios = [];
                if (costoCortePlotter > 0) {
                    const servCorte = window.getGeckoItem('PLOTER DE CORTE - ' + bobinaStr + 'CM') || window.getGeckoItem('SERVICIO DE CORTE');
                    const precioCorte = servCorte ? servCorte.precioVenta : 0;
                    servicios.push({ label: 'Corte plotter', detalle: `${mlTotales.toFixed(2)}ML × ${fmtVal(precioCorte)}/ML`, valor: costoCortePlotter });
                }
                if (costoTransfer > 0) {
                    const mlT = bobina === 120 ? mlTotales * 2 : mlTotales;
                    const matT = window.getGeckoItem('Transfer') || window.getGeckoItem('CINTA POSICIONADORA');
                    const precioT = matT ? matT.precioVenta : 0;
                    servicios.push({ label: 'Transfer', detalle: `${mlT.toFixed(2)}ML × ${fmtVal(precioT)}/ML`, valor: costoTransfer });
                }
                if (servicios.length > 0) {
                    html += seccion('Servicios');
                    servicios.forEach(s => { html += lineaRow(s.label, s.detalle, s.valor); });
                }

                // ZONA 3 — MONTADO EN RÍGIDO
                if (totalRigidos > 0) {
                    const placaId = document.getElementById('cortePlacas')?.value;
                    const placaMat = window.getGeckoItem(placaId);
                    html += seccion('Montado en rígido');
                    html += lineaRow(placaMat ? placaMat.nombre : 'Placa', 'Material + corte por fila', totalRigidos);
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
                auditorWrap.innerHTML = '';
            }
        }

        return totalFinal;
    },

    safeSetText: function (id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    },

    añadirAlPresupuesto: function () {
        const nombreTrabajo = document.getElementById('corteNombre')?.value || 'S/N';
        if (!this.state.totalFinal || this.state.totalFinal <= 0) return alert("Costo inválido");

        const isGremio = document.getElementById('modoGremioCorte')?.checked ||
                         document.getElementById('modoGremio')?.checked;
        const gremioSuffix = isGremio ? ' (Gremio)' : '';

        const item = {
            id: Date.now(),
            tipo: 'grafica',
            nombre: `CORTE - ${this.state.matName}${gremioSuffix} - ${nombreTrabajo}`,
            costo: this.state.totalFinal,
            detalle: this.state.detalle,
            modoCalculo: 'Bobina/Nesting'
        };

        if (window.agregarItemAlPresupuesto) {
            window.agregarItemAlPresupuesto(item);
            if (typeof window.mostrarExito === 'function') {
                window.mostrarExito("Producto añadido", "Cotización Actualizada");
            }
            this.reset();
        }
    },

    reset: function () {
        this.render();
        this.poblarMateriales();
        this.poblarPlacas();
    }
};
