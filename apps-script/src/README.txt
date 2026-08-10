ARCHIPIÉLAGO VIVO · APPS SCRIPT MODULAR

Archivos
========
00_Config.gs
01_Menu.gs
10_Formulario.gs
20_Data.gs
30_Manual.gs
40_Privacidad.gs
50_Localizaciones.gs
60_Consentimientos.gs
70_FormSync.gs
80_GDPR.gs
90_Utils.gs

Nombres estandarizados
======================
Hoja de consentimientos: _consents
Hoja GDPR: _gdpr
Columna ID GDPR: request_id

Instalación
===========
1. Abre el MISMO proyecto Apps Script vinculado a la hoja.
2. Crea un archivo de secuencia de comandos por cada .gs del paquete.
3. Copia el contenido de cada archivo.
4. Después elimina o vacía el antiguo archivo monolítico.
   IMPORTANTE: no dejes monolito + módulos simultáneamente porque duplicarías
   CONFIG, funciones y otros símbolos globales.
5. Guarda el proyecto.
6. Recarga Google Sheets.
7. Ejecuta una vez:
   Archipiélago Vivo > Instalar / actualizar activadores
8. Autoriza permisos si Google los solicita.

Prueba mínima
=============
1. Alta ficticia desde Google Forms.
2. Comprobar form_responses.
3. Comprobar data.
4. Comprobar _consents.
5. Editar la respuesta desde el enlace de Google Forms.
6. Ejecutar "Sincronizar ediciones del formulario".
7. Probar una solicitud access en _gdpr.
8. Probar erasure SOLO con una entidad ficticia y status = approved.

Notas técnicas
==============
- Todos los .gs forman un único proyecto.
- Apps Script carga los archivos del servidor en un espacio global común.
- No se usan import/export.
- 00_Config.gs concentra CONFIG y CONSENT_DEFINITIONS.
- La lógica está separada por responsabilidad, no por orden de ejecución.


EXPORTS PÚBLICOS
================
100_Publicacion.gs
110_Export_uMap.gs
120_Export_TV.gs
130_Export_API.gs

La publicación es una vista derivada de data.

Una entidad entra en exports solamente si:
- consent_publication = Sí
- status = Activo
- verified = Sí

Los campos marcados *_private nunca se exportan.
Si location_private = true, no se exporta la ubicación original:
se usa la localización general "Canarias" de _locations y la capa canarias.

Endpoints de la Web App
=======================
?export=manifest
?export=umap&layer=el-hierro
?export=umap&layer=la-gomera
?export=umap&layer=la-palma
?export=umap&layer=tenerife
?export=umap&layer=gran-canaria
?export=umap&layer=fuerteventura
?export=umap&layer=lanzarote
?export=umap&layer=la-graciosa
?export=umap&layer=canarias
?export=tv

uMap recibe GeoJSON FeatureCollection.
TV recibe JSON con:
- videos[VIDEO_ID] -> entidad
- entities[ENTITY_ID] -> ficha pública
- conflicts -> vídeos asignados a más de una entidad

Para publicar los endpoints:
1. Implementar > Nueva implementación.
2. Tipo: Aplicación web.
3. Ejecutar como propietario del script.
4. Dar acceso público de lectura a la Web App.
5. Copiar la URL /exec.
6. En la hoja:
   Archipiélago Vivo > Exports · Ver URLs

IMPORTANTE
==========
No expongas directamente data, _consents, _gdpr ni form_responses.
doGet solo entrega vistas construidas por 100_Publicacion.gs.


DISPERSIÓN DE PUNTOS COINCIDENTES
=================================
105_PointSpread.gs

Cuando varias fichas comparten exactamente la misma coordenada representativa,
el export les aplica una pequeña variación visual determinista.

No se modifica:
- data
- _locations
- la ubicación real/original

Solo cambian las coordenadas entregadas a uMap.

Radios máximos actuales:
- municipio: 350 m
- isla: 3 km
- Canarias: 15 km

Solo se dispersan grupos con 2 o más puntos coincidentes.
El desplazamiento depende de entity_id, así que permanece estable entre exports.

Los radios se pueden cambiar en:
CONFIG.POINT_SPREAD_METERS
