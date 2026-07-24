/**
 * ================================================================
 * GECKO FEED v1.0
 * Feed de actividad reciente (movimientos, clientes, presupuestos)
 * ================================================================
 */

(function () {
    const POLL_MS = 60000;
    const MAX_ITEMS = 30;
    const LAST_SEEN_KEY = 'gecko_feed_last_seen';

    let items = [];
    let pollTimer = null;
    let cargando = false;

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function tiempoRelativo(ts) {
        const segundos = Math.max(0, Math.floor((Date.now() - ts) / 1000));
        if (segundos < 60) return 'hace instantes';
        const min = Math.floor(segundos / 60);
        if (min < 60) return `hace ${min} min`;
        const horas = Math.floor(min / 60);
        if (horas < 24) return `hace ${horas} hora${horas === 1 ? '' : 's'}`;
        const dias = Math.floor(horas / 24);
        return `hace ${dias} día${dias === 1 ? '' : 's'}`;
    }

    function textoItem(item) {
        const quien = escapeHtml(item.creado_por || 'Alguien');
        if (item.tipo === 'movimiento') {
            const monto = Math.round(parseFloat(item.monto) || 0).toLocaleString('es-AR');
            return `${quien} registró un movimiento de $${monto} en ${escapeHtml(item.caja || '')}`;
        }
        if (item.tipo === 'cliente') {
            return `${quien} dio de alta al cliente ${escapeHtml(item.nombre || '')}`;
        }
        if (item.tipo === 'presupuesto') {
            const esOT = item.status === 'OT';
            return `${quien} creó ${esOT ? 'la OT' : 'el Presupuesto'} #${escapeHtml(item.id)} para ${escapeHtml(item.cliente || '')}`;
        }
        return '';
    }

    function render() {
        const badge = document.getElementById('geckoFeedBadge');
        const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10);
        const noLeidos = items.filter(it => it.ts > lastSeen).length;

        if (badge) {
            if (noLeidos > 0) {
                badge.textContent = String(noLeidos);
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        const lista = document.getElementById('geckoFeedList');
        if (!lista) return;

        if (items.length === 0) {
            lista.innerHTML = `<p class="px-4 py-6 text-center text-[12px] text-gray-400 dark:text-zinc-600 font-bold">Sin actividad reciente.</p>`;
            return;
        }

        lista.innerHTML = items.map(it => `
            <div class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <p class="text-[12px] text-zinc-700 dark:text-zinc-300 font-semibold leading-snug">${textoItem(it)}</p>
                <p class="text-[10px] text-gray-400 dark:text-zinc-600 font-bold mt-1 uppercase tracking-wide">${tiempoRelativo(it.ts)}</p>
            </div>
        `).join('');
    }

    async function poll() {
        if (cargando) return;
        cargando = true;
        try {
            const since = items.length > 0 ? items[0].creado_en : '';
            const url = 'api.php?endpoint=actividad' + (since ? `&since=${encodeURIComponent(since)}` : '');
            const res = await fetch(url);
            if (!res.ok) return;
            const nuevos = await res.json();
            if (!Array.isArray(nuevos) || nuevos.length === 0) return;

            const idsExistentes = new Set(items.map(it => `${it.tipo}_${it.id}`));
            const aAgregar = nuevos.filter(n => !idsExistentes.has(`${n.tipo}_${n.id}`));
            if (aAgregar.length === 0) return;

            items = [...aAgregar, ...items].slice(0, MAX_ITEMS);
            render();
        } catch (err) {
            console.warn('🦎 GECKO-FEED: error al consultar actividad:', err.message);
        } finally {
            cargando = false;
        }
    }

    function iniciarPolling() {
        detenerPolling();
        pollTimer = setInterval(poll, POLL_MS);
    }

    function detenerPolling() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            detenerPolling();
        } else {
            poll();
            iniciarPolling();
        }
    });

    function abrir() {
        const panel = document.getElementById('geckoFeedPanel');
        if (!panel) return;
        panel.classList.remove('hidden');
        localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
        render();
    }

    function cerrar() {
        const panel = document.getElementById('geckoFeedPanel');
        if (panel) panel.classList.add('hidden');
    }

    function toggle() {
        const panel = document.getElementById('geckoFeedPanel');
        if (!panel) return;
        if (panel.classList.contains('hidden')) abrir(); else cerrar();
    }

    document.addEventListener('click', (e) => {
        const panel = document.getElementById('geckoFeedPanel');
        const btn = document.getElementById('geckoFeedBtn');
        if (!panel || !btn || panel.classList.contains('hidden')) return;
        if (!panel.contains(e.target) && !btn.contains(e.target)) cerrar();
    });

    window.GeckoFeed = { toggle };

    document.addEventListener('DOMContentLoaded', () => {
        poll();
        iniciarPolling();
    });
})();
