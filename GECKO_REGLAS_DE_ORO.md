# 🦎 GeckoApp v2 — Reglas de Oro

> **De cumplimiento obligatorio** para Claude y para cualquier agente que toque
> el código (Antigravity, Claude Code, etc). Renzo NO es programador — confía
> en que el agente respete estas reglas sin que se las recuerde cada vez.

---

## R1 — La base de datos MySQL es la fuente de verdad

La base en Hostinger (`u532400705_Gecko_app`) es el único lugar donde los datos
están realmente respaldados. El navegador (localStorage) es una **copia local**,
no un respaldo. Nada que viva solo en un navegador está a salvo.

**Implicancia:** un cambio que pueda afectar la base se trata como un cambio
crítico. No se aplica sin checklist y sin backup previo.

---

## R2 — Backup obligatorio antes de tocar la base

Antes de **cualquier** acción que pueda modificar tablas de MySQL (import masivo,
re-sync, SQL directo, alta/modificación de columnas), exportar primero:

1. Backup vía botón **BACKUP** de la app (descarga JSON con todo el estado).
2. Backup de MySQL desde phpMyAdmin → Exportar → SQL de las tablas afectadas.

Guardarlos con fecha en el nombre. Solo después se ejecuta el cambio.

---

## R3 — Catálogos jamás se borran por sincronización

Las tablas `materiales`, `servicios` y `clientes` son catálogos. Un navegador
con copia incompleta **nunca** puede borrar registros de la base por diferencia
de array. El borrado real se hace solo por acción explícita del usuario
(clickear el tachito en la UI), y va por un endpoint dedicado
(`window.geckoApiEliminar`).

**Implicancia:** todo nuevo catálogo debe agregarse al array
`GECKO_CATALOG_KEYS` en `gecko-api.js` antes de ponerse en producción.

**Estado actual:**
- ✅ `gecko_materiales` blindado
- ❌ `geckoServicios` pendiente
- ❌ `clientes` pendiente

---

## R4 — Cálculo de precios: si falta un dato, error visible, no número inventado

Las funciones que calculan precios (cotizadores, auditor de cálculo, presupuestos)
**no deben** devolver un valor numérico cuando falta un parámetro de entrada.
Deben:

1. Mostrar en el auditor un mensaje rojo: **"FALTA PARÁMETRO: nombre_parametro"**.
2. Devolver $0 o `null` (decidir uno y mantener consistencia).
3. Logear en consola el ítem y el parámetro faltante.

**Razón:** un cálculo erróneo de $3.800.000 cuando el real eran $50.000 puede
hacer perder un cliente o cobrar un trabajo a pérdida. Es preferible que se vea
el error y se corrija, a que silenciosamente cobre cualquier cosa.

---

## R5 — Lookup de materiales/servicios por ID, no por nombre

Cuando un cotizador necesita un material o servicio, debe buscarlo por su `id`,
no por su `nombre`. Los nombres tienen variantes (espacios al final, acentos,
mayúsculas) y romperán matches tarde o temprano.

Si por razones históricas hay lookups por nombre, normalizar con
`.trim().toLowerCase()` y dejar un comentario `// TODO: migrar a lookup por id`.

---

## R6 — Antes de tocar código, leer las dependencias

Antes de ejecutar un cambio en una sección (Materiales, Cotizadores, Reportes,
Finanzas), Claude/agente debe identificar:

- Qué **otras secciones** consumen esos datos.
- Qué **funciones** dependen del campo/tabla a tocar.
- Si algún cotizador hace lookup contra eso.

Y devolverle a Renzo un **checklist de impacto** antes del prompt, en este
formato:

```
CAMBIO PROPUESTO: [descripción]
TABLAS AFECTADAS: [lista]
CÁLCULOS QUE PUEDEN ROMPERSE: [lista]
SECCIONES DE LA UI QUE PUEDEN VERSE AFECTADAS: [lista]
RIESGO DE PÉRDIDA DE DATOS: [SÍ/NO + cuáles]
PLAN DE ROLLBACK: [cómo revertir si sale mal]
```

Renzo aprueba con "OK" o pide ajustes. Recién después va el prompt para
Antigravity.

---

## R7 — Smoke test obligatorio después de cada deploy

Después de cada cambio aplicado en producción, ejecutar este test rápido:

1. ✅ Cargar un material nuevo desde Materiales → guardar → verificar que aparece
   en la lista y en MySQL.
2. ✅ Editar un material existente → verificar que abre con datos pre-cargados y
   guarda correctamente.
3. ✅ Borrar un material de prueba → verificar que desaparece de la UI y de MySQL.
4. ✅ Hacer un presupuesto de prueba con al menos un material que tenga corte
   láser → verificar que el cálculo da un número razonable.
5. ✅ Ver la sección Reportes → verificar que los gráficos cargan sin errores
   en consola (F12).
6. ✅ `SELECT COUNT(*)` de la tabla afectada → comparar con el conteo previo.

Si algo del smoke test falla → rollback inmediato (volver al commit anterior),
no parchear sobre la marcha.

---

## R8 — Una sección por sesión

No mezclar trabajo en múltiples secciones en una misma conversación. Mezclar
genera errores cruzados y dificulta el rollback. Si aparece un bug en otra
sección durante una sesión enfocada, anotarlo y resolverlo en sesión propia.

---

## R9 — Fragmentos exactos, nunca regenerar archivos

Los prompts para Antigravity siempre usan reemplazo por fragmento exacto
(`BUSCAR ... REEMPLAZAR POR ...`). Nunca se le pide al agente que regenere un
archivo completo, ni siquiera uno chico. Regenerar pierde cambios manuales,
comentarios y pequeños fixes acumulados.

Todo prompt termina con un `git add archivos_específicos && git commit -m "..." && git push origin main`.

---

## R10 — En caso de duda, parar y preguntar

Si Claude/agente no está seguro de:
- Si un cambio puede afectar datos productivos
- Qué columnas tiene una tabla
- Si una función se usa en otro lado del código

**Para y le pregunta a Renzo o lee el código primero.** No avanza por intuición.
El costo de una pregunta de más es bajísimo. El costo de un dato perdido o un
cálculo roto es altísimo.

---

## Cómo aplicar estas reglas

Renzo: pegá el contenido de este archivo en la primera conversación con un
agente nuevo, o subilo a la sección "user preferences" / "system prompt" de
la herramienta que uses (Claude.ai, Antigravity, Claude Code).

Para Claude (en chat): estas reglas se cumplen sin que Renzo las recuerde. Si
el agente las olvida, Renzo puede decir simplemente "regla R4" y el agente
debe corregirse.

---

*Última actualización: 22 de junio 2026. Versión 1.0.*