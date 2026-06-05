# Cambios del sistema

## RESUELTOS
- Campo fecha presupuestador manual — showPicker al hacer click
- Placeholders Notas y Condiciones — color gris correcto
- Preview al guardar — abre el documento correcto sin IDs duplicados
- Botón "Guardar Presupuesto" → "Generar Presupuesto"
- Editar presupuesto manual — abre el presupuestador manual con datos correctos
- Lista de presupuestos vacía al cargar — se renderiza con delay de 1500ms
- Al abrir presupuesto manual queda cargado el último — debería iniciarse vacío

## PENDIENTES
- Bug en el scroll, a veces se traba y no se puede bajar, se soluciona con f5
- Campo blanco al escribir en inputs — autocompletado nativo del browser, sin solución CSS limpia
- Modal nuevo cliente — agregar CUIT y múltiples teléfonos con nombre
- Sección Clientes — sacar de caja contenedora, scroll libre
- Sección Pedidos — sacar de caja contenedora, scroll libre
- Al generar presupuesto el texto sale duplicado en el print
- Al modificar el precio global del dolar, debe impactar en los precios de los materiales, debe actualizarse en los precios del modal de gestion de insumos. 
-bug en el presupeustador de grafica-vinilo de corte , cuando entras a cotizar algo luego de pasar por otro cotizador no muestra el precio en el ITEM ACTUAL (se pone en $0) hasta que actualizas recien ahi se muestra el valor. 
- lista de clientes , revisar los iconos de contacto directo, sobre todo el de whatsapp. (ver si se pueden poner los iconos correspondientes)
- en el modal de gestion de insumos, los precios deben redonder siempre en numero redondo, no dar decimales.. hay un bug que redondea segun el margen real, lo que deberia rendondear es el numero del valor del insumo. 
- Revisar por que se borraron los numeros del precio al gremio. 
- Al imprimir los presupesto o decargar el PDF, el nombre del archivo debe ser "PRES_(nombre del cliente) - (Trabajo)"
- En el cotizador de grafica , tarjeta de "montado" agregarle las unidades a los items de alto y ancho (metros, centimetros, milimetros) lo que corresponda. (Ej: 1.5mts o 150cm) , siempre tiene que estar en la unidad que cargaste el item. 
- En el cotizador de grafica , tarjeta de "montado" el precio se debe calcular siempre por mas que no pongamos los metros lineales, si no se cargan los metros lineales de corte, igual tiene q calcular el precio de todas formas con los otros datos. Si se cargan los metros lineales de corte automatiamente se suma. Si se deja en 0 el sistema deberia detectar que se debe calcular por la suma de los items (Ej. si pones 4 items de 100cm de ancho y 1mts de largo, deberia calcular solo el area sin sumar el corte)