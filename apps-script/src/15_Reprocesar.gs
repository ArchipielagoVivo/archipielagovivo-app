/**
 * ARCHIPIÉLAGO VIVO · REPROCESADO COMPLETO
 *
 * Reconstruye:
 *
 *   form_responses
 *          ↓
 *        data
 *          ↓
 *   _manual procesado
 *
 * y genera de nuevo _consents.
 *
 * No borra:
 * - Google Forms
 * - form_responses
 * - _manual
 *
 * _manual se interpreta como historial de operaciones manuales:
 * - solo se reproducen filas marcadas como procesadas;
 * - se reproducen en el orden en que aparecen en la hoja;
 * - una fila cuyo entity_id ya existe actúa como actualización;
 * - una fila cuyo entity_id todavía no existe actúa como alta manual.
 */


function rebuildDataAndConsentsFromFormResponses() {

  return rebuildDataAndConsentsFromSources();
}


function rebuildDataAndConsentsFromSources() {

  const ui =
    SpreadsheetApp
      .getUi();


  const confirmation =
    ui.prompt(
      'Reconstruir data y _consents',
      'Se vaciarán data y _consents y se reconstruirán desde:\n\n' +
      '1. form_responses\n' +
      '2. filas procesadas de _manual\n\n' +
      'NO se borrarán Google Forms, form_responses ni _manual.\n' +
      'Las operaciones manuales se volverán a aplicar en el orden de la hoja.\n\n' +
      'Escribe exactamente REPROCESAR para continuar.',
      ui.ButtonSet.OK_CANCEL
    );


  if (
    confirmation.getSelectedButton() !==
    ui.Button.OK ||
    confirmation
      .getResponseText()
      .trim() !==
    'REPROCESAR'
  ) {

    return;
  }


  const lock =
    LockService
      .getScriptLock();


  lock.waitLock(
    30000
  );


  try {

    const formSheet =
      getSheet(
        CONFIG.FORM_SHEET
      );


    const manualSheet =
      getSheet(
        CONFIG.MANUAL_SHEET
      );


    const dataSheet =
      getSheet(
        CONFIG.DATA_SHEET
      );


    const consentsSheet =
      getConsentsSheet();


    /*
     * Guardamos una instantánea antes de vaciar DATA.
     *
     * Se utiliza únicamente para conservar metadatos editoriales
     * que no necesariamente forman parte de las fuentes de entrada:
     * verified, status y license.
     */

    const editorialState =
      snapshotEditorialState(
        dataSheet
      );


    clearSheetValuesBelowHeaderForRebuild(
      dataSheet
    );


    clearSheetValuesBelowHeaderForRebuild(
      consentsSheet
    );


    const locations =
      avLoadLocations_();


    /*
     * FASE 1
     * ------
     * Reconstruir las altas procedentes del formulario.
     */

    const formResult =
      replayFormResponsesForRebuild(
        formSheet,
        dataSheet,
        locations,
        editorialState
      );


    /*
     * FASE 2
     * ------
     * Reaplicar el historial manual ya procesado.
     *
     * Esto es importante porque _manual puede:
     * - modificar una ficha procedente del formulario;
     * - crear una ficha que nunca estuvo en Google Forms.
     */

    const manualResult =
      replayManualRowsForRebuild(
        manualSheet,
        dataSheet,
        locations,
        editorialState
      );


    /*
     * Garantía final:
     * DATA nunca conserva el texto largo del formulario en los
     * campos consent_*; siempre termina en booleanos reales.
     */
    normalizeDataConsentBooleans_(
      dataSheet
    );


    SpreadsheetApp.flush();


    const errors =
      formResult.errors.concat(
        manualResult.errors
      );


    let message =
      'Reprocesado completado.\n\n' +

      'FORM_RESPONSES\n' +
      'Fichas reconstruidas: ' +
      formResult.rebuilt +
      '\n' +
      'entity_id generados: ' +
      formResult.generatedIds +
      '\n' +
      'Filas vacías omitidas: ' +
      formResult.skipped +
      '\n\n' +

      '_MANUAL\n' +
      'Altas reaplicadas: ' +
      manualResult.created +
      '\n' +
      'Actualizaciones reaplicadas: ' +
      manualResult.updated +
      '\n' +
      'Filas no procesadas omitidas: ' +
      manualResult.skipped +
      '\n\n' +

      'Errores: ' +
      errors.length;


    if (
      errors.length
    ) {

      message +=
        '\n\n' +
        errors
          .slice(
            0,
            12
          )
          .join(
            '\n'
          );


      if (
        errors.length > 12
      ) {

        message += '\n…';
      }
    }


    ui.alert(
      message
    );


    return {
      form:
        formResult,

      manual:
        manualResult,

      errors:
        errors
    };


  } finally {

    lock.releaseLock();
  }
}


/**
 * ============================================================
 * FASE 1 · FORM_RESPONSES
 * ============================================================
 */


function replayFormResponsesForRebuild(
  formSheet,
  dataSheet,
  locations,
  editorialState
) {

  let rebuilt = 0;
  let generatedIds = 0;
  let skipped = 0;
  const errors = [];


  for (
    let rowNumber = 2;
    rowNumber <= formSheet.getLastRow();
    rowNumber++
  ) {

    try {

      const response =
        readFormResponseRow(
          formSheet,
          rowNumber
        );


      if (
        isEmptyFormResponseForRebuild(
          response
        )
      ) {

        skipped++;

        continue;
      }


      if (
        !response.entity_id
      ) {

        const entityId =
          generateUniqueEntityId(
            dataSheet
          );


        writeEntityIdToFormResponse(
          formSheet,
          rowNumber,
          entityId
        );


        response.entity_id =
          entityId;


        generatedIds++;
      }


      const entityId =
        normalizeEntityIdForRebuild(
          response.entity_id
        );


      const location =
        avResolveLocation_(
          response.location,
          locations
        );


      const editorial =
        editorialState[
          entityId
        ] ||
        {};


      const createdAt =
        parseRebuildDate(
          response.timestamp
        ) ||
        new Date();


      const record =
        buildDataRecord(
          response,
          location,
          createdAt,
          createdAt,
          {
            verified:
              editorial.verified,

            status:
              editorial.status,

            license:
              editorial.license
          }
        );


      appendDataRecord(
        dataSheet,
        record
      );


      recordInitialConsents(
        response,
        entityId,
        {
          source:
            'form',

          sourceReference:
            avBuildFormConsentSourceReference_(
              entityId,
              rowNumber,
              'rebuild'
            ),

          recordedBy:
            'automatic-rebuild',

          partial:
            false,

          eventDate:
            createdAt
        }
      );


      saveFormResponseHash(
        entityId,
        response
      );


      rebuilt++;


    } catch (error) {

      errors.push(
        'FORM fila ' +
        rowNumber +
        ': ' +
        error.message
      );
    }
  }


  return {
    rebuilt:
      rebuilt,

    generatedIds:
      generatedIds,

    skipped:
      skipped,

    errors:
      errors
  };
}


/**
 * ============================================================
 * FASE 2 · _MANUAL
 * ============================================================
 */


function replayManualRowsForRebuild(
  manualSheet,
  dataSheet,
  locations,
  editorialState
) {

  const headers =
    getHeaders(
      manualSheet
    );


  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];


  for (
    let rowNumber = 2;
    rowNumber <= manualSheet.getLastRow();
    rowNumber++
  ) {

    try {

      const values =
        manualSheet
          .getRange(
            rowNumber,
            1,
            1,
            headers.length
          )
          .getValues()[0];


      const input =
        rowToObject(
          headers,
          values
        );


      if (
        isEmptyManualRowForRebuild(
          input
        )
      ) {

        skipped++;

        continue;
      }


      /*
       * Solo reproducimos operaciones que ya fueron aplicadas
       * anteriormente.
       *
       * Una fila pendiente sigue siendo una fila pendiente.
       * Una fila ERROR tampoco debe alterar el estado reconstruido.
       */

      if (
        !isProcessed(
          input.processed
        )
      ) {

        skipped++;

        continue;
      }


      const manual =
        normaliseManualResponse(
          input
        );


      let entityId =
        normalizeEntityIdForRebuild(
          manual.entity_id
        );


      if (!entityId) {

        /*
         * En condiciones normales toda fila procesada ya tiene
         * entity_id porque processManualRow lo escribe.
         *
         * Si falta por algún motivo, generamos uno y lo dejamos
         * persistido para que futuras reconstrucciones sean estables.
         */

        entityId =
          generateUniqueEntityId(
            dataSheet
          );


        manual.entity_id =
          entityId;


        writeManualEntityId(
          manualSheet,
          rowNumber,
          entityId
        );
      }


      manual.entity_id =
        entityId;


      const existing =
        getDataRecordByEntityIdOrNullForRebuild(
          dataSheet,
          entityId
        );


      const location =
        resolveManualLocationForRebuild(
          manual,
          existing,
          locations
        );


      const eventDate =
        parseRebuildDate(
          manual.date_revised
        ) ||
        parseRebuildDate(
          manual.processed_at
        ) ||
        parseRebuildDate(
          manual.date_created
        ) ||
        new Date();


      if (!existing) {

        /*
         * Alta nacida en _manual.
         */

        const editorial =
          editorialState[
            entityId
          ] ||
          {};


        const createdAt =
          parseRebuildDate(
            manual.date_created
          ) ||
          eventDate;


        const record =
          buildDataRecord(
            manual,
            location,
            createdAt,
            eventDate,
            {
              verified:
                editorial.verified,

              status:
                editorial.status,

              license:
                editorial.license
            }
          );


        appendDataRecord(
          dataSheet,
          record
        );


        recordInitialConsents(
          manual,
          entityId,
          {
            source:
              'manual',

            sourceReference:
              'MANUAL:' +
              String(
                manual.manual_id ||
                rowNumber
              ) +
              ':rebuild',

            recordedBy:
              'manual-rebuild',

            partial:
              true,

            eventDate:
              eventDate
          }
        );


        created++;

        continue;
      }


      /*
       * Actualización manual de una entidad ya reconstruida.
       *
       * buildManualDataPatch respeta:
       * - campo vacío = no cambiar;
       * - clear_fields = borrar.
       */

      const oldRecord =
        existing;


      manual.processed_at =
        manual.processed_at ||
        eventDate;


      updateDataRecordFromManual(
        dataSheet,
        manual,
        location
      );


      recordConsentChanges(
        manual,
        entityId,
        oldRecord,
        {
          source:
            'manual',

          sourceReference:
            'MANUAL:' +
            String(
              manual.manual_id ||
              rowNumber
            ) +
            ':rebuild',

          recordedBy:
            'manual-rebuild',

          partial:
            true,

          eventDate:
            eventDate
        }
      );


      updated++;


    } catch (error) {

      errors.push(
        'MANUAL fila ' +
        rowNumber +
        ': ' +
        error.message
      );
    }
  }


  return {
    created:
      created,

    updated:
      updated,

    skipped:
      skipped,

    errors:
      errors
  };
}


/**
 * ============================================================
 * HELPERS DE REPROCESADO
 * ============================================================
 */


function snapshotEditorialState(
  dataSheet
) {

  const state = {};


  getAllDataRecords()
    .forEach(
      record => {

        const entityId =
          normalizeEntityIdForRebuild(
            record.entity_id
          );


        if (!entityId) {

          return;
        }


        state[
          entityId
        ] =
          {
            verified:
              record.verified,

            status:
              record.status,

            license:
              record.license
          };
      }
    );


  return state;
}


function getDataRecordByEntityIdOrNullForRebuild(
  dataSheet,
  entityId
) {

  const records =
    findRowsByField(
      dataSheet,
      'entity_id',
      entityId
    );


  if (
    records.length === 0
  ) {

    return null;
  }


  if (
    records.length > 1
  ) {

    throw new Error(
      'entity_id duplicado durante reprocesado: ' +
      entityId
    );
  }


  return records[0];
}


function resolveManualLocationForRebuild(
  manual,
  existing,
  locations
) {

  if (
    manual.location
  ) {

    return avResolveLocation_(
      manual.location,
      locations
    );
  }


  if (existing) {

    return {
      island:
        existing.island,

      municipality:
        existing.municipality,

      lon:
        existing.lon,

      lat:
        existing.lat,

      type:
        ''
    };
  }


  throw new Error(
    'Alta manual sin ubicación para entity_id ' +
    manual.entity_id
  );
}


function parseRebuildDate(
  value
) {

  if (
    value instanceof Date
  ) {

    return value;
  }


  if (
    value === undefined ||
    value === null ||
    String(
      value
    ).trim() === ''
  ) {

    return null;
  }


  const parsed =
    new Date(
      value
    );


  if (
    isNaN(
      parsed.getTime()
    )
  ) {

    return null;
  }


  return parsed;
}


function normalizeEntityIdForRebuild(
  value
) {

  return String(
    value || ''
  )
    .trim()
    .toUpperCase();
}


function isEmptyFormResponseForRebuild(
  response
) {

  return (
    !response.timestamp &&
    !response.email_address &&
    !response.name_individual &&
    !response.name_entity &&
    !response.entity_id
  );
}


function isEmptyManualRowForRebuild(
  input
) {

  return !Object.keys(
    input
  )
    .some(
      key =>
        String(
          input[key] === undefined ||
          input[key] === null
            ? ''
            : input[key]
        ).trim() !== ''
    );
}


function clearSheetValuesBelowHeaderForRebuild(
  sheet
) {

  const maxRows =
    sheet.getMaxRows();


  const maxColumns =
    sheet.getMaxColumns();


  if (
    maxRows <= 1 ||
    maxColumns <= 0
  ) {

    return;
  }


  sheet
    .getRange(
      2,
      1,
      maxRows - 1,
      maxColumns
    )
    .clearContent();
}
