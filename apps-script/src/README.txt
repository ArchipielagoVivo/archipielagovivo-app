ARCHIPIÉLAGO VIVO · APPS SCRIPT MODULAR

Visión general
--------------
Colección modular de scripts de Google Apps Script que operan sobre la
hoja de cálculo principal del proyecto Archipiélago Vivo. Implementa
ingesta (forms), gestión de consentimientos/GDPR, exportación pública
y funcionalidades de publicación para mapas y TV.

Estructura principal (apps-script/src)
-------------------------------------
Archivos destacados (.gs):
- 00_Config.gs            : configuración global y constantes
- 01_Menu.gs              : menú del proyecto en la hoja
- 05_Admin_Reset.gs       : utilidades/acciones administrativas (reset)
- 10_Formulario.gs        : manejo de respuestas de formularios
- 15_Reprocesar.gs        : rutinas de re-procesado y reindexado
- 20_Data.gs              : transformación y ensamblado de `data`
- 30_Manual.gs            : herramientas manuales de mantenimiento
- 40_Privacidad.gs        : lógica relacionada con privacidad y export
- 45_Data_Consent_Booleans.gs : correcciones/normalizaciones de booleans
- 50_Localizaciones.gs    : tablas y helpers de localización
- 60_Consentimientos.gs   : definición y gestión de consentimientos
- 65_SourceReferences.gs  : gestión de referencias y fuentes
- 70_FormSync.gs          : sincronización de ediciones del formulario
- 80_GDPR.gs              : endpoints y helpers GDPR
- 90_Utils.gs             : utilidades generales

Exports y publicación
----------------------
Archivos de export/ publicación:
- 100_Publicacion.gs         : construye vistas públicas y doGet
- 105_PointSpread.gs         : dispersión determinista de puntos coincidentes
- 110_Export_uMap.gs         : capa GeoJSON para uMap
- 120_Export_TV.gs           : export específico para cliente TV
- 130_Export_API.gs          : endpoints JSON/manifest
- 140_TV_YouTube_Metadata.gs : metadatos y normalización YouTube/TV

Datos y ficheros auxiliares
---------------------------
TSV de entrada (local):
- _tv_channels_CORREGIDO.tsv
- _tv_programs_CORREGIDO.tsv
- _tv_schedule_CORREGIDO.tsv

Documentación y notas en texto:
- BOOLEANOS_REPROCESADO.txt, CONSENT_YOUTUBE_TEXT.txt, GITHUB_UPDATE.txt, etc.

Instalación y despliegue
------------------------
1. Abrir el mismo proyecto de Apps Script vinculado a la hoja.
2. Registrar la hoja maestra en la configuración (vincular la hoja principal al script).
3. Crear un archivo `.gs` por cada módulo listado y pegar su contenido.
4. Evitar mantener simultáneamente el antiguo monolito y los módulos.
5. Guardar y recargar Google Sheets.
6. Ejecutar una vez desde el menú: Archipiélago Vivo > Instalar / actualizar activadores
7. Autorizar permisos si Google los solicita.

Endpoints principales (doGet)
----------------------------
Parámetros habituales:
- `?export=manifest`
- `?export=umap&layer=<isla|canarias>`
- `?export=tv`

Formato de salida:
- uMap: GeoJSON FeatureCollection
- TV: JSON con `videos`, `entities` y `conflicts`

Condiciones de publicación
--------------------------
Una entidad se publica si:
- `consent_publication` = Sí
- `status` = Activo
- `verified` = Sí

Campos marcados `*_private` no se exportan. Si `location_private = true`
se reemplaza la ubicación por la localización general definida en `_locations`.

Notas importantes
-----------------
- No exponer directamente hojas sensibles: `data`, `_consents`, `_gdpr`, `form_responses`.
- `doGet` debe servir únicamente vistas derivadas (desde `100_Publicacion.gs`).
- `105_PointSpread.gs` solo altera coordenadas de presentación, no los datos
  originales ni `_locations`.

Dónde mirar
-----------
Revisar los archivos listados en este directorio para entender flujos
concretos (reprocesado, export TV, normalización de YouTube, etc.).
