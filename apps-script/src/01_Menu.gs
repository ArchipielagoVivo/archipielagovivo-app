/**
 * ARCHIPIÉLAGO VIVO · MENÚ
 */

function onOpen() {

  SpreadsheetApp.getUi()
    .createMenu('Archipiélago Vivo')
    .addItem(
      'Procesar _manual',
      'processManual'
    )
    .addItem(
      'Procesar fila manual seleccionada',
      'processSelectedManualRow'
    )
    .addSeparator()
    .addItem(
      'Sincronizar ediciones del formulario',
      'syncEditedFormResponses'
    )
    .addItem(
      'Instalar / actualizar activadores',
      'installArchipelagoTriggers'
    )
    .addSeparator()
    .addItem(
      'GDPR · Enviar datos de solicitud seleccionada',
      'sendSelectedGdprAccessData'
    )
    .addItem(
      'GDPR · Ejecutar supresión aprobada',
      'executeSelectedGdprErasure'
    )
    .addSeparator()
    .addItem(
      'Exports · Validar datos públicos',
      'validatePublicExports'
    )
    .addItem(
      'Exports · Ver URLs',
      'showExportUrls'
    )
    .addToUi();
}


/**
 * ============================================================
 * FORMULARIO
 * ============================================================
 *
 * Activador:
 *
 * Hoja de cálculo
 * → Activadores
 * → Al enviar formulario
 *
 * NUEVA INSCRIPCIÓN
 * -----------------
 * Si entity_id está vacío:
 *   1. Genera entity_id.
 *   2. Lo escribe en form_responses.
 *   3. Crea el registro en data.
 *
 * ACTUALIZACIÓN
 * -------------
 * Si entity_id ya existe:
 *   1. Busca ese entity_id en data.
 *   2. Actualiza ese registro.
 *
 * IMPORTANTE:
 * -------------
 * El consentimiento NO bloquea la entrada en data.
 *
 * data es la base maestra.
 *
 * La exportación a uMap decidirá posteriormente
 * qué registros y campos pueden publicarse.
 */
