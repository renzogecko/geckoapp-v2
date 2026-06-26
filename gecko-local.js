/**
 * gecko-local.js
 * Solo para desarrollo local (Live Server).
 * NUNCA subir a Hostinger.
 * Intercepta fetch() para que los 401 de api.php no redirijan al login.
 */
(function () {
    const proto = location.protocol;
    const host = location.hostname;
    const isLocal = proto === 'file:' || host === 'localhost' || host === '127.0.0.1';
    if (!isLocal) return;

    // Sobrescribir fetch global para interceptar respuestas 401
    const _fetchOriginal = window.fetch;
    window.fetch = async function (...args) {
        const res = await _fetchOriginal(...args);
        if (res.status === 401) {
            // En local, devolver un 200 vacío para que la app no redirija
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return res;
    };

    console.log('%c 🦎 GECKO-LOCAL: Modo desarrollo activo — 401 interceptados ', 'background:#22c55e;color:white;font-weight:bold;padding:3px 8px;border-radius:4px;');
})();
