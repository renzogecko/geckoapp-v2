/**
 * ================================================================
 * GECKO API BRIDGE v2.2
 * Fix: protección anti-borrado masivo accidental
 * ================================================================
 */

const GECKO_API_URL = '/app/api.php';

const GECKO_KEY_MAP = {
    'gecko_materiales':          'materiales',
    'geckoServicios':            'servicios',
    'clientes':                  'clientes',
    'gecko_listaPresupuestos':   'presupuestos',
    'gecko_cajas':               'cajas',
    'gecko_movimientos':         'movimientos',
    'gecko_gastos_fijos':        'gastos_fijos',
    'gecko_historico_cierres':   'historico_cierres',
    'GECKO_SETTINGS':            'configuracion'
};

const GECKO_ARRAY_KEYS = [
    'gecko_materiales', 'geckoServicios', 'clientes',
    'gecko_listaPresupuestos', 'gecko_cajas', 'gecko_movimientos',
    'gecko_gastos_fijos', 'gecko_historico_cierres'
];

// Campos que MySQL devuelve como string pero deben ser números
const GECKO_NUMERIC_FIELDS = {
    'gecko_materiales': ['stock','multiplicador','costoUSD','costoARS','costo','contenidoUnidad','multGremio','precioGremio','precioVenta','precioCorteMl','corteSpeed','cortePower'],
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
        return null; // null = error de conexión, NO es lo mismo que "tabla vacía"
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

            // Si datos es null, hubo un error de conexión real (no una tabla vacía).
            // NO tocamos el cache ni localStorage — nos quedamos con lo que ya había.
            if (datos === null) {
                console.warn(`🦎 GECKO-API: ${endpoint} falló por error de conexión — se mantiene el cache local sin cambios.`);
                continue;
            }

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

    // _cache representa lo que MySQL conoce actualmente — es la fuente correcta para comparar
    const anterior = Array.isArray(_cache[lsKey]) ? [..._cache[lsKey]] : [];

    // CATÁLOGO (materiales): la base es el seguro. NUNCA se borra por diferencia de
    // array — un navegador con copia incompleta no puede vaciar la base. El borrado
    // intencional va por window.geckoApiEliminar().
    const GECKO_CATALOG_KEYS = ['gecko_materiales'];
    if (!GECKO_CATALOG_KEYS.includes(lsKey)) {
        // PROTECCIÓN ANTI-BORRADO MASIVO (solo tablas transaccionales)
        const cantidadABorrar = anterior.filter(a => !nuevoArray.find(n => String(n.id) === String(a.id))).length;
        if (anterior.length > 3 && cantidadABorrar > Math.floor(anterior.length * 0.7)) {
            console.warn(`🦎 GECKO-API: BORRADO MASIVO BLOQUEADO en "${lsKey}" — intentaba borrar ${cantidadABorrar} de ${anterior.length} ítems. Operación cancelada.`);
            return;
        }
        for (const itemAntiguo of anterior) {
            if (!itemAntiguo.id) continue;
            if (!nuevoArray.find(n => n.id && String(n.id) === String(itemAntiguo.id))) {
                await _apiPost(endpoint, 'DELETE', { id: itemAntiguo.id });
            }
        }
    }
    for (const item of nuevoArray) {
        // Si el item no tiene id, siempre es nuevo → POST directo
        if (!item.id) {
            await _apiPost(endpoint, 'POST', item);
            continue;
        }
        const existia = anterior.find(a => a.id && String(a.id) === String(item.id));
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

let _syncQueue = Promise.resolve();

Object.defineProperty(window, '_syncQueue', {
    get: () => _syncQueue,
    configurable: true
});

const _localStorageProxy = {
    getItem(key)    { return window._localStorage_original.getItem(key); },
    removeItem(key) { window._localStorage_original.removeItem(key); },
    clear()         { window._localStorage_original.clear(); },
    key(index)      { return window._localStorage_original.key(index); },
    get length()    { return window._localStorage_original.length; },

    setItem(key, value) {
        window._localStorage_original.setItem(key, value);
        if (GECKO_KEY_MAP[key] && _inicializado) {
            if (!window._geckoDebounceTimers) window._geckoDebounceTimers = {};
            clearTimeout(window._geckoDebounceTimers[key]);
            window._geckoDebounceTimers[key] = setTimeout(() => {
                try {
                    const parsed = JSON.parse(window._localStorage_original.getItem(key));
                    if (Array.isArray(parsed)) {
                        _syncQueue = _syncQueue.then(() => _sincronizarArray(key, parsed));
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        _syncQueue = _syncQueue.then(() => _sincronizarObjeto(key, parsed));
                    }
                } catch (e) { /* JSON inválido */ }
            }, 2000);
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

// Borrado INTENCIONAL de un ítem de catálogo directo a MySQL (no por diff de array).
window.geckoApiEliminar = async function (lsKey, id) {
    const endpoint = GECKO_KEY_MAP[lsKey];
    if (!endpoint || id == null) return;
    try {
        await _apiPost(endpoint, 'DELETE', { id: id });
        if (Array.isArray(_cache[lsKey])) {
            _cache[lsKey] = _cache[lsKey].filter(x => String(x.id) !== String(id));
        }
        console.log(`🦎 GECKO-API: ${endpoint} id=${id} eliminado de MySQL (intencional).`);
    } catch (e) {
        console.warn(`🦎 GECKO-API: error al eliminar ${endpoint} id=${id}:`, e);
    }
};

window.geckoSyncQueue = () => _syncQueue;
