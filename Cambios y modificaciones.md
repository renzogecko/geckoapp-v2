# Cambios del sistema

## PENDIENTES
- Al modificar el precio global del dolar, debe impactar en los precios de los materiales, debe actualizarse en los precios del modal de gestion de insumos. 
- lista de clientes , revisar los iconos de contacto directo, sobre todo el de whatsapp. (ver si se pueden poner los iconos correspondientes)
- en el modal de gestion de insumos, los precios deben redonder siempre en numero redondo, no dar decimales.. hay un bug que redondea segun el margen real, lo que deberia rendondear es el numero del valor del insumo. 
- Al imprimir los presupesto o decargar el PDF, el nombre del archivo debe ser "PRES_(nombre del cliente) - (Trabajo)"
- En el cotizador de grafica , tarjeta de "montado" agregarle las unidades a los items de alto y ancho (metros, centimetros, milimetros) lo que corresponda. (Ej: 1.5mts o 150cm) , siempre tiene que estar en la unidad que cargaste el item. 
- En el cotizador de grafica , tarjeta de "montado" el precio se debe calcular siempre por mas que no pongamos los metros lineales, si no se cargan los metros lineales de corte, igual tiene q calcular el precio de todas formas con los otros datos. Si se cargan los metros lineales de corte automatiamente se suma. Si se deja en 0 el sistema deberia detectar que se debe calcular por la suma de los items (Ej. si pones 4 items de 100cm de ancho y 1mts de largo, deberia calcular solo el area sin sumar el corte)

---

## ESTADO AL 06/06/2026 — Bugs pendientes tras deploy en Hostinger

### 🔴 CRÍTICO
1. Imágenes adjuntas no persisten tras recargar — api.php no tiene columna metadata en tabla presupuestos. gecko-api.js al sincronizar desde MySQL sobreescribe localStorage perdiendo imagenes, titulo, fechaEntrega, mostrarPrecios.
2. Precio $/ML en Parámetros Láser no persiste — api.php no tiene endpoint laser_params en producción.

### 🟠 ALTO
3. Input número de teléfono oculto en modal Nuevo Cliente — gecko-input-line tiene width:100% !important que pisa el flex-1 del input de número.
4. Segundo teléfono no se guarda — guardarNuevoCliente no lee todos los .tel-num-input.

### 🟡 MEDIO
5. Costos Operativos muestra valores vacíos — initConfiguracion no carga valores desde MySQL al abrir la tab.
6. Sin feedback visual al guardar Parámetros Láser — guardarParametrosLaser no llama mostrarExito.
7. Búsqueda de clientes no filtra la lista.

### 🟢 BAJO
8. Título del presupuesto no aparece en el preview/PDF.
9. Toggle Público/Gremio sin efecto en cotizador Vinilo Corte.
10. 85 materiales en lugar de 66 — verificar duplicados.

## CONTEXTO TÉCNICO IMPORTANTE
- gecko-input-line en styles.css tiene width:100% !important — cualquier override necesita !important
- Las imágenes se guardan en base64 en localStorage bajo p.imagenes pero NO se sincronizan a MySQL porque falta columna metadata en tabla presupuestos
- gecko-api.js intercepta localStorage y sincroniza con MySQL — al recargar, MySQL sobreescribe localStorage perdiendo los metadatos
- laser_params se guarda en localStorage bajo clave gecko_laserParams pero el endpoint api.php?endpoint=laser_params no existe en producción
- verDocumento (gecko-docs.js) es la función correcta para mostrar previews — usa iframe + modal oscuro
- _imprimirDocumento (gecko-fixes.js) ahora llama a verDocumento
- Presupuestador Manual: _gpmGuardar usa timestamp _tsGuardado para identificar el doc correcto post-save
- Hook procesarGuardado captura _editIdAntes y _nextIdAntes ANTES de llamar procesarGuardado para evitar race condition con metadatos
