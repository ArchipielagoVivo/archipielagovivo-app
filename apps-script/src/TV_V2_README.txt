ARCHIPIÉLAGO VIVO TV · SCHEMA V2
==================================

CAMBIOS IMPORTANTES EN LAS HOJAS
--------------------------------
1. _tv_programs debe usar exactamente:
   archipielago-vivo
   (con guion, no archipielago_vivo).

2. La parrilla usa el programa "alternativas", por lo que se añade a _tv_programs.

3. Las filas temáticas GEN/FUE/TER/MEM deben llevar:
   selection_rule = program_rotation
   priority = 10
   valid_from / valid_to = vacíos
   status = Activo

4. Los horarios exportados se normalizan a HH:MM. El parser admite HH:MM:SS,
   pero se recomienda guardar texto HH:MM y usar 24:00 para el fin del día.

5. _tv_media debe tener embeddable y privacy_status. El módulo 140 se ha
   actualizado para persistir ambos metadatos.

POLÍTICA DE ENTITIES
--------------------
- entity_rotation: bloques de 15 min cada 2 h, prioridad 100.
- entity_deadline: red de seguridad 04:30, prioridad 110.
- entity_new: 09:00, 13:30, 18:30 y 21:30, prioridad 120.
- Una entity se considera nueva durante 72 h desde date_created de la ficha pública.

La vuelta completa se adapta a la duración total:
<=10 min -> 2 h
<=20 min -> 6 h
<=40 min -> 12 h
<=80 min -> 24 h
<=160 min -> 48 h
<=240 min -> 72 h
<=480 min -> 7 días
<=960 min -> 14 días
>960 min -> 30 días

EXPORT
------
?export=tv devuelve schema_version = 2 y conserva videos/entities/conflicts
para compatibilidad con la TV/QR actual.

NUEVA VALIDACIÓN
----------------
Menú:
Archipiélago Vivo -> TV · Validar configuración

Detecta, entre otros:
- columnas desplazadas;
- selection_rule inválido;
- priority vacío;
- canales/programas inexistentes;
- media_id duplicados;
- vídeos activos no embebibles;
- rights_status que impide emisión automática.


ACTUALIZACIÓN CONTINUIDAD MULTICANAL
====================================
Ver TV_CONTINUIDAD_MULTICANAL.txt.
