/**
 * gecko-local.js — Solo desarrollo local. NUNCA subir a Hostinger.
 */
(function () {
    const isLocal = location.protocol === 'file:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1';
    window._geckoLocalMode = true;
    window._geckoLocalMode = true;

    // Interceptar fetch para bloquear 401
    const _fetch = window.fetch;
    window.fetch = async function (...args) {
        const res = await _fetch(...args);
        if (res.status === 401) {
            return new Response(
                JSON.stringify({ success: true, logueado: true, usuario: 'Renzo', rol: 'admin' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return res;
    };

    // Bloquear location.replace y location.href hacia login
    const _replace = location.replace.bind(location);
    location.replace = function (url) {
        if (typeof url === 'string' && url.includes('login')) {
            console.warn('🦎 GECKO-LOCAL: redirect a login bloqueado');
            return;
        }
        return _replace(url);
    };

    // Bloquear asignación de location.href hacia login con Object.defineProperty
    let _href = location.href;
    try {
        Object.defineProperty(window.location, 'href', {
            set: function (url) {
                if (typeof url === 'string' && url.includes('login')) {
                    console.warn('🦎 GECKO-LOCAL: href a login bloqueado');
                    return;
                }
                _replace(url);
            },
            get: function () { return _href; },
            configurable: true
        });
    } catch (e) { }

    // Simular sesión activa para que main.js no redirija
    window.GECKO_SESSION = { usuario: 'Renzo', rol: 'admin', activa: true };
    window.geckoUsuarioActual = { nombre: 'Renzo', rol: 'admin', email: 'renzo@gecko.com' };

    console.log('%c 🦎 GECKO-LOCAL activo ', 'background:#22c55e;color:white;font-weight:bold;padding:3px 8px;border-radius:4px;');
})();
