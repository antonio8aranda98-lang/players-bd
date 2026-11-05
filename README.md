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

## Publicación en GitHub Pages

El código está en https://github.com/antonio8aranda98-lang/players-bd. La aplicación web se prepara en `docs/` y se publica desde la rama `main`, carpeta `/docs`, usando GitHub Pages. Los archivos `docs/index.html` y `docs/.nojekyll` son el sitio; no requieren un servidor Node.

El alojamiento elegido es GitHub Pages. Google se utiliza únicamente para autorizar la lectura de los cinco Sheets. El sitio y los archivos de código no contienen contactos, la copia local ni credenciales privadas.

En la cuenta actual GitHub muestra «Upgrade or make this repository public to enable Pages». Pages todavía NO está activado. El repositorio se mantiene privado hasta que el propietario decida hacerlo público o usar un plan compatible con Pages en repositorios privados.

### Conexión de las hojas desde Pages

Hace falta un cliente OAuth web de Google con Google Sheets API activada y el origen `https://antonio8aranda98-lang.github.io` autorizado. Solo se utiliza su identificador público; no se utiliza ni publica un secreto de cliente. Compilar con `PLAYERS_GOOGLE_CLIENT_ID=identificador_publico npm run build:pages` y guardar el resultado de `docs/` en el repositorio.

Al abrir la web se pulsa «Conectar con Google». El token de acceso y los registros permanecen en la memoria de esa pestaña. No se guardan en GitHub, localStorage ni sessionStorage. Las consultas se actualizan cada cinco minutos con la pestaña visible, mientras el token de Google siga vigente; al caducar hay que reconectar. Las cinco hojas permanecen restringidas en Google y no necesitan publicarse.

La primera autorización, la lectura real desde el dominio de GitHub Pages y la publicación siguen pendientes. El paquete está preparado y probado con respuestas simuladas; eso no confirma la conexión de Google en producción.
