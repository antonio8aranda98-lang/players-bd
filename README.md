# Players BD

Buscador privado de registros de jugadores: resumen geográfico, filtros combinables, ficha de jugador y exportaciones completas en CSV y XLSX. Sin estados ni herramientas de CRM.

## Abrir

Necesita Node.js 22 o posterior. Ejecutar `npm start` en esta carpeta, o abrir `Abrir Players BD.command`. Visitar http://127.0.0.1:4317. Solo es accesible desde este Mac. Para detenerlo, cerrar el proceso con Ctrl+C.

No requiere instalar paquetes. `npm test` verifica la interpretación de datos, los filtros y las exportaciones.

## Datos y conexión

La copia inicial está en `.local-data/cache.json` y está excluida de Git, junto con las credenciales. Los datos personales no se incluyen en archivos de código ni en el navegador antes de pedirlos al servidor local.

La conexión permanente NO está configurada. La cuenta de servicio tendrá que ser lectora de los cinco archivos. El acceso del conector de este chat no equivale a credenciales para la aplicación. Visitar `/guia` para configurar una cuenta de servicio de lectura de Google Sheets. No publicar la copia local en un sitio estático. Si más adelante se aloja la aplicación, habrá que añadir autenticación y gestionar las credenciales en el servidor.

Los cinco archivos y sus 17 pestañas tienen correspondencias en `lib/sources.mjs`. Las nueve fuentes de entrada se seleccionan por defecto; las ocho listas complementarias se pueden incluir con el selector, una de ellas vacía. Los registros y enlaces de origen se identifican por archivo, pestaña y fila, incluso cuando dos archivos usan el mismo nombre o ID de pestaña. El total cuenta filas, no personas únicas. El esquema de la pestaña «No inscritos otras pruebas» cambia históricamente; se distinguen sus dos formatos. Si cambian las preguntas/columnas de los formularios, revisar las correspondencias.

La aplicación no modifica los archivos de Google Sheets. El mapa es esquemático por comunidades, con clasificación conservadora. No se infieren edades a partir de categorías. Las variantes originales se pueden consultar en la ficha. Los teléfonos y correos exportados corresponden al registro; no se mezclan personas. Los encabezados repetidos de los nuevos formularios se leen conjuntamente y las listas históricas distinguen su formato corto del formato completo. Las posiciones múltiples se pueden filtrar por cualquiera de ellas.

CSV lleva BOM UTF-8, delimitador punto y coma y protección frente a fórmulas. XLSX es un archivo OpenXML real con celdas de texto, encabezado fijo y autofiltro. Se exporta todo el resultado filtrado, sin limitarse a la página visible.

La sincronización agrupa las lecturas por archivo. Si falla uno, conserva su copia anterior, muestra el error y permite actualizar los demás. La fecha del panel representa la copia más antigua de los archivos; cada archivo tiene su fecha individual en Fuentes. La conexión de Google se ha verificado solo mediante el conector del chat. La autenticación permanente de la app sigue sin configurar ni probar contra Google; las pruebas de resiliencia usan respuestas simuladas.

## Versión web privada en Google

El repositorio privado de código es https://github.com/antonio8aranda98-lang/players-bd. Los datos importados, capturas y credenciales quedan fuera del repositorio.

La versión web utiliza Google Apps Script y no necesita una cuenta de servicio ni guardar claves de Google en GitHub. El manifiesto limita la ejecución al propietario y los permisos a lectura de Sheets e identificación de la cuenta. La aplicación admite únicamente `antonio8aranda98@gmail.com` y los cinco archivos declarados en `lib/sources.mjs`.

`npm run build:google` genera los tres archivos de `apps-script/` a partir del mismo modelo, filtros, exportaciones y esquema utilizados por la versión local. No incorpora la copia de datos. El editor del proyecto es https://script.google.com/home/projects/1YCE5QRPKXTckuSFt1cEaL5e9i4ekzW5D-esHP61ffOuUpcLPBLzahHki/edit.

La web consulta Google al abrirse y cada cinco minutos mientras está visible. Las lecturas se realizan con `google.script.run`, una por archivo. Si falla una lectura durante una sesión, se conserva su lectura anterior en la memoria de esa pestaña. No hay sincronización de datos hacia GitHub ni se guardan contactos en el almacenamiento del navegador.

El despliegue y la primera lectura real requieren completar la autorización de Google en el navegador. Una prueba local o simulada no confirma la concesión de ese permiso ni la lectura alojada.
