# Players BD

Aplicación web para consultar una base de jugadores desde cinco Google Sheets: panel geográfico, filtros combinables, ficha individual y exportación del resultado completo en CSV o XLSX.

Web: https://antonio8aranda98-lang.github.io/players-bd/

Código: https://github.com/antonio8aranda98-lang/players-bd

## Acceso a los datos

El código y la interfaz están publicados en GitHub Pages. Los contactos y registros permanecen en Google Sheets y se consultan en la memoria del navegador después de pulsar «Conectar con Google». Las hojas no necesitan publicarse. No se guardan tokens ni registros en GitHub, localStorage ni sessionStorage.

El cliente OAuth es de tipo web y admite el origen `https://antonio8aranda98-lang.github.io`. `public/google-client.json` contiene únicamente su identificador público; no contiene el secreto. Se solicita el permiso `spreadsheets.readonly`. La configuración de Google está en modo de prueba y se limita a la cuenta del propietario.

La app lee al abrir la conexión y cada cinco minutos con la pestaña visible. Cuando caduca el token de Google, hay que pulsar de nuevo «Conectar con Google». Si falla una de las cinco lecturas, se conserva su lectura anterior durante esa sesión y se muestra el error.

Los totales cuentan registros, no personas únicas. Las nueve fuentes de entrada se seleccionan por defecto; las ocho listas complementarias se pueden incluir en Fuentes, una de ellas vacía. Cada registro conserva archivo, pestaña y fila. Las ubicaciones desconocidas no se infieren del título de las listas.

## Desarrollo y publicación

Se necesita Node.js 22 o posterior; no requiere instalar paquetes.

- `npm test`: pruebas del modelo, lectura, filtros y exportaciones.
- `npm run build:pages`: genera `docs/index.html` y `docs/.nojekyll`.
- GitHub Pages publica la carpeta `/docs` de la rama `main`. Guardar el resultado generado en esa rama activa el despliegue.
- `PLAYERS_GOOGLE_CLIENT_ID` permite sustituir el identificador público durante la compilación.

Las correspondencias de columnas están en `lib/sources.mjs`. Los formularios con encabezados repetidos y los formatos históricos se adaptan por separado. Si cambia un formulario, revisar sus correspondencias. Las posiciones múltiples se pueden filtrar por cualquiera de ellas.

La exportación CSV utiliza UTF-8 con BOM, punto y coma y protección contra fórmulas. XLSX es OpenXML real, con celdas de texto, encabezado fijo y autofiltro. Se exportan todos los resultados filtrados, no solo la página visible.

## Versión local

`npm start` o `Abrir Players BD.command` inicia la versión local en http://127.0.0.1:4317. Sus datos importados están en `.local-data/cache.json`, excluidos de Git. La versión local admite una cuenta de servicio opcional; la web de Pages utiliza la conexión de Google del navegador.

La carpeta `.local-data`, las claves de `.secrets` y las capturas de `output` quedan fuera del repositorio. No incluir copias de los datos ni credenciales privadas al publicar cambios.
