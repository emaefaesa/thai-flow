# Thai Flow v4 · Wild Offline Guide

Versión consolidada de la guía privada de Tailandia.

## Qué incluye
- 135 lugares investigados en Bangkok, Chiang Mai, Koh Tao, Ayutthaya y Pai.
- Vista **Selección** para no quedar abrumados y vista **Todo** para consultar la guía completa.
- Búsqueda por nombre, comida, actividad, etiqueta o descripción.
- Filtros por ciudad y categoría.
- Pantalla **¿Qué hacemos?** según el tipo de plan que apetezca.
- Favoritos guardados localmente.
- Detalle de cada lugar en modal, con por qué lo guardamos, duración y mejor momento cuando existe.
- Ruta base del viaje.
- PWA / Service Worker para uso offline.
- 7 fotografías reales locales y optimizadas. Las cards sin fotografía validada muestran un placeholder claro para no enseñar una imagen falsa del lugar.

## Probar en VS Code
1. Abre esta carpeta completa en VS Code.
2. Activa Live Server.
3. Pulsa **Go Live**.
4. Abre la URL que te indique Live Server.

Si venías de una versión anterior y ves estilos antiguos, usa `Ctrl + F5`. Si persistiera por el Service Worker, DevTools > Application > Service Workers > Unregister y recarga una vez.

## Uso offline
Abre la app al menos una vez con conexión. El Service Worker guarda la interfaz, los datos y todas las imágenes locales. Los enlaces externos (Google Maps, webs, reservas) siguen requiriendo datos, salvo contenido descargado previamente en sus respectivas apps.

## Fotos
Por criterio del proyecto, una card **solo usa foto si es del lugar real**. No se usan imágenes genéricas para hacer pasar una cosa por otra. Las nuevas fotos que añadamos deben guardarse en `img/places/` y añadirse también al array `APP_SHELL` de `sw.js` si queremos garantizar su precarga offline.

## Archivo principal de datos
`data.js` contiene toda la guía. La interfaz se genera automáticamente desde esa base de datos.


## V4.1 · DnB / Bass
- Filtro propio `🔊 DnB / Bass`.
- Locked In Club y RED CNX en Chiang Mai.
- Maya Beach Club y Goodtime Beach Club en Koh Tao.
- DnB Thailand como radar por ciudad.
- Carteles nocturnos marcados para revalidar 24–48 h antes.


## V5
- Cobertura visual ampliada con fotos locales en casi todas las cards.
- Prioridad a fotos exactas en templos y lugares clave.
- Coberturas representativas por ciudad/categoría en el resto para mantener la app ligera y offline.
- Interfaz revisada con look más moderno y salvaje.
