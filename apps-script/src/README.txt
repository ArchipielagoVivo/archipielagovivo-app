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
