/**
 * ================================================================
 * GECKO API BRIDGE v2.2
 * Fix: protección anti-borrado masivo accidental
 * ================================================================
 */

const GECKO_API_URL = '/app/api.php';

const GECKO_KEY_MAP = {
    'gecko_materiales':        'materiales',
    'geckoServicios':          'servicios',
    'clientes':                'clientes',
    'gecko_listaPresupuestos': 'presupuestos',
    'gecko_cajas':             'cajas',
    'gecko_movimientos':       'movimientos',
    'gecko_gastos_fijos':      'gastos_fijos',
    'GECKO_SETTINGS':          'configuracion'
};

const GECKO_ARRAY_KEYS = [
    'gecko_materiales', 'geckoServicios', 'clientes',
    'gecko_listaPresupuestos', 'gecko_cajas', 'gecko_movimientos', 'gecko_gastos_fijos'
];

// Campos que MySQL devuelve como string pero deben ser números
const GECKO_NUMERIC_FIELDS = {
    'gecko_materiales': ['stock','multiplicador','costoUSD','costoARS','costo','contenidoUnidad','multGremio','precioGremio','precioCorteMl','corteSpeed','cortePower'],
    'geckoServicios':   ['costo','precio'],
    'gecko_cajas':      ['saldo'],
    'gecko_movimientos':['monto'],
    'gecko_gastos_fijos':['monto'],
    'gecko_listaPresupuestos': ['total','sena']
};

const _cache = {};
let _inicializado = false;

window._localStorage_original = window.localStorage;

function _castearNumeros(lsKey, array) {
    const campos = GECKO_NUMERIC_FIELDS[lsKey];
    if (!campos || !Array.isArray(array)) return array;
    return array.map(item => {
        const nuevo = { ...item };
        campos.forEach(campo => {
            if (nuevo[campo] !== null && nuevo[campo] !== undefined && nuevo[campo] !== '') {
                nuevo[campo] = parseFloat(nuevo[campo]) || 0;
            }
        });
        if ('incluyeIva' in nuevo) nuevo.incluyeIva = nuevo.incluyeIva == 1 || nuevo.incluyeIva === true;
        // Normalizar campos de parámetros de corte laser
        if ('tieneParametrosCorte' in nuevo) {
            nuevo.tieneParametrosCorte = nuevo.tieneParametrosCorte == 1 || nuevo.tieneParametrosCorte === true;
        }
        // Mapear precioCorteMl (nombre DB) → cortePrecioML (nombre JS)
        if (nuevo.precioCorteMl !== undefined && nuevo.cortePrecioML === undefined) {
            nuevo.cortePrecioML = parseFloat(nuevo.precioCorteMl) || 0;
        }
        return nuevo;
    });
}

function _normalizar(lsKey, datos) {
    const debeSerArray = GECKO_ARRAY_KEYS.includes(lsKey);

    if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
        if (Array.isArray(datos.data))  return datos.data;
        if (Array.isArray(datos.rows))  return datos.rows;
        if (Array.isArray(datos.items)) return datos.items;
        if (debeSerArray) {
            const keys = Object.keys(datos);
            if (keys.length === 0) return [];
            if (keys.every(k => !isNaN(k))) return Object.values(datos);
            if ('success' in datos) return [];
        }
    }

    if (Array.isArray(datos)) return datos;
    return debeSerArray ? [] : (datos || {});
}

async function _apiGet(endpoint, lsKey) {
    try {
        const res = await fetch(`${GECKO_API_URL}?endpoint=${endpoint}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const normalizado = _normalizar(lsKey, raw);
        return _castearNumeros(lsKey, normalizado);
    } catch (err) {
        console.warn(`🦎 GECKO-API: Error GET /${endpoint}:`, err.message);
        return GECKO_ARRAY_KEYS.includes(lsKey) ? [] : {};
    }
}

async function _apiPost(endpoint, method, body) {
    try {
        const res = await fetch(`${GECKO_API_URL}?endpoint=${endpoint}`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn(`🦎 GECKO-API: Error ${method} /${endpoint}:`, err.message);
        return null;
    }
}

async function _inicializarDesdeAPI() {
    if (_inicializado) return;

    console.log('%c 🦎 GECKO-API: Conectando con MySQL... ', 'background:#F15A24;color:white;font-weight:bold;padding:3px 8px;border-radius:4px;');

    for (const [lsKey, endpoint] of Object.entries(GECKO_KEY_MAP)) {
        try {
            const datos = await _apiGet(endpoint, lsKey);

            // PROTECCIÓN: si la API devuelve array vacío pero había datos en localStorage,
            // no pisamos el cache local para evitar borrado masivo accidental.
            if (GECKO_ARRAY_KEYS.includes(lsKey) && Array.isArray(datos) && datos.length === 0) {
                const localActual = JSON.parse(window._localStorage_original.getItem(lsKey) || '[]');
                if (Array.isArray(localActual) && localActual.length > 0) {
                    console.warn(`⚠️ GECKO-API: ${endpoint} devolvió vacío pero hay ${localActual.length} ítems locales — subiendo a MySQL...`);
                    _cache[lsKey] = localActual;
                    // Subir todos los items locales a MySQL ya que la tabla está vacía
                    for (const item of localActual) {
                        if (item.id) await _apiPost(endpoint, 'POST', item);
                    }
                    console.log(`✅ GECKO-API: ${localActual.length} ítems de ${endpoint} sincronizados a MySQL.`);
                    continue;
                }
            }

            _cache[lsKey] = datos;
            window._localStorage_original.setItem(lsKey, JSON.stringify(datos));
            const info = Array.isArray(datos) ? `${datos.length} items` : 'objeto config';
            console.log(`✅ GECKO-API: ${lsKey} → ${info}`);
        } catch (e) {
            // Si la API falla, NO pisar localStorage con array vacío.
            // Dejar lo que haya en el cache local sin modificar.
            console.warn(`⚠️ GECKO-API: Falló ${endpoint} — se mantiene el cache local.`);
        }
    }

    _inicializado = true;

    // SINCRONIZACIÓN FORZADA: subir a MySQL ítems que estén en localStorage pero no en la API
    // Usa localStorage como fuente de verdad (no _cache, que puede estar vacío si MySQL estaba vacío)
    for (const [lsKey, endpoint] of Object.entries(GECKO_KEY_MAP)) {
        if (!GECKO_ARRAY_KEYS.includes(lsKey)) continue;
        try {
            const enLocal = JSON.parse(window._localStorage_original.getItem(lsKey) || '[]');
            if (!Array.isArray(enLocal) || enLocal.length === 0) continue;
            // Re-consultar MySQL para tener el estado más fresco
            const enMySQL = await _apiGet(endpoint, lsKey);
            const enMySQLArray = Array.isArray(enMySQL) ? enMySQL : [];
            const faltanEnMySQL = enLocal.filter(loc => loc.id && !enMySQLArray.find(m => String(m.id) === String(loc.id)));
            if (faltanEnMySQL.length > 0) {
                console.log(`🦎 GECKO-API: Sincronizando ${faltanEnMySQL.length} ítems faltantes en MySQL (${endpoint})...`);
                for (const item of faltanEnMySQL) {
                    await _apiPost(endpoint, 'POST', item);
                }
                _cache[lsKey] = enLocal;
                window._localStorage_original.setItem(lsKey, JSON.stringify(enLocal));
            }
        } catch(e) {
            console.warn(`🦎 GECKO-API: Error en sync forzado de ${endpoint}:`, e);
        }
    }

    console.log('%c 🦎 GECKO-API: MySQL sincronizado ✓ ', 'background:#16a34a;color:white;font-weight:bold;padding:3px 8px;border-radius:4px;');

    // Seed servicios láser faltantes (solo si MySQL no los tiene aún)
    try {
        await fetch('/app/api.php?endpoint=seed_laser', { method: 'POST' });
    } catch(e) {}

    document.dispatchEvent(new CustomEvent('geckoDB_ready'));
    document.dispatchEvent(new CustomEvent('inventoryReady'));
}

async function _sincronizarArray(lsKey, nuevoArray) {
    const endpoint = GECKO_KEY_MAP[lsKey];
    if (!endpoint || !Array.isArray(nuevoArray)) return;
    const anterior = Array.isArray(_cache[lsKey]) ? _cache[lsKey] : [];

    // PROTECCIÓN ANTI-BORRADO MASIVO:
    // Si se intenta borrar más del 50% de los ítems en una sola operación,
    // casi seguro es un error de sincronización, no una acción real del usuario.
    const cantidadABorrar = anterior.filter(a => !nuevoArray.find(n => String(n.id) === String(a.id))).length;
    if (anterior.length > 0 && cantidadABorrar > Math.max(1, Math.floor(anterior.length * 0.5))) {
        console.warn(`🦎 GECKO-API: BORRADO MASIVO BLOQUEADO en "${lsKey}" — intentaba borrar ${cantidadABorrar} de ${anterior.length} ítems. Operación cancelada.`);
        return;
    }

    for (const itemAntiguo of anterior) {
        if (!nuevoArray.find(n => String(n.id) === String(itemAntiguo.id))) {
            await _apiPost(endpoint, 'DELETE', { id: itemAntiguo.id });
        }
    }
    for (const item of nuevoArray) {
        const existia = anterior.find(a => String(a.id) === String(item.id));
        if (!existia) {
            await _apiPost(endpoint, 'POST', item);
        } else if (JSON.stringify(existia) !== JSON.stringify(item)) {
            await _apiPost(endpoint, 'PUT', item);
        }
    }
    _cache[lsKey] = nuevoArray;
}

async function _sincronizarObjeto(lsKey, objeto) {
    const endpoint = GECKO_KEY_MAP[lsKey];
    if (!endpoint) return;
    await _apiPost(endpoint, 'PUT', objeto);
    _cache[lsKey] = objeto;
}

const _localStorageProxy = {
    getItem(key)    { return window._localStorage_original.getItem(key); },
    removeItem(key) { window._localStorage_original.removeItem(key); },
    clear()         { window._localStorage_original.clear(); },
    key(index)      { return window._localStorage_original.key(index); },
    get length()    { return window._localStorage_original.length; },

    setItem(key, value) {
        window._localStorage_original.setItem(key, value);
        if (GECKO_KEY_MAP[key] && _inicializado) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    _sincronizarArray(key, parsed);
                } else if (typeof parsed === 'object' && parsed !== null) {
                    _sincronizarObjeto(key, parsed);
                }
            } catch (e) { /* JSON inválido */ }
        }
    }
};

try {
    Object.defineProperty(window, 'localStorage', {
        value: _localStorageProxy,
        writable: false,
        configurable: true
    });
    console.log('🦎 GECKO-API: Interceptor activado.');
} catch (e) {
    console.warn('🦎 GECKO-API: No se pudo interceptar localStorage.', e);
}

window._geckoAPIPromise = _inicializarDesdeAPI();

console.log('🦎 GECKO-API Bridge v2.2 cargado.');
