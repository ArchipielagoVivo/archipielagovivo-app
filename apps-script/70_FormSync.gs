/**
 * ARCHIPIÉLAGO VIVO · SINCRONIZACIÓN CON GOOGLE FORMS
 */

function installArchipelagoTriggers() {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  ensureOperationalColumns();


  const triggers =
    ScriptApp
      .getProjectTriggers();


  const hasFormSubmit =
    triggers.some(
      trigger =>
        trigger.getHandlerFunction() ===
        'onFormSubmit'
    );


  const hasSync =
    triggers.some(
      trigger =>
        trigger.getHandlerFunction() ===
        'syncEditedFormResponses'
    );


  if (!hasFormSubmit) {

    ScriptApp
      .newTrigger(
        'onFormSubmit'
      )
      .forSpreadsheet(
        ss
      )
      .onFormSubmit()
      .create();
  }


  if (!hasSync) {

    ScriptApp
      .newTrigger(
        'syncEditedFormResponses'
      )
      .timeBased()
      .everyMinutes(
        CONFIG.FORM_SYNC_INTERVAL_MINUTES
      )
      .create();
  }


  initializeFormSyncState();


  SpreadsheetApp
    .getUi()
    .alert(
      'Activadores comprobados.\n\n' +
      '• Altas: onFormSubmit\n' +
      '• Ediciones: sincronización cada ' +
      CONFIG.FORM_SYNC_INTERVAL_MINUTES +
      ' minutos'
    );
}


function initializeFormSyncState() {

  const sheet =
    getSheet(
      CONFIG.FORM_SHEET
    );


  const lastRow =
    sheet.getLastRow();


  let initialized = 0;


  for (
    let rowNumber = 2;
    rowNumber <= lastRow;
    rowNumber++
  ) {

    const response =
      readFormResponseRow(
        sheet,
        rowNumber
      );


    if (
      !response.entity_id
    ) {

      continue;
    }


    saveFormResponseHash(
      response.entity_id,
      response
    );


    initialized++;
  }


  console.log(
    'HUELLAS DE FORMULARIO INICIALIZADAS: ' +
    initialized
  );


  return initialized;
}


function syncEditedFormResponses() {

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


    const dataSheet =
      getSheet(
        CONFIG.DATA_SHEET
      );


    const locations =
      loadLocations();


    const lastRow =
      formSheet.getLastRow();


    let updated = 0;
    let initialized = 0;
    let errors = 0;


    for (
      let rowNumber = 2;
      rowNumber <= lastRow;
      rowNumber++
    ) {

      try {

        const response =
          readFormResponseRow(
            formSheet,
            rowNumber
          );


        if (
          !response.entity_id
        ) {

          continue;
        }


        const entityId =
          String(
            response.entity_id
          )
            .trim()
            .toUpperCase();


        const currentHash =
          hashFormResponse(
            response
          );


        const oldHash =
          getStoredFormResponseHash(
            entityId
          );


        /*
         * Primera ejecución tras instalar el sistema:
         * inicializamos sin interpretar cambios antiguos.
         */

        if (!oldHash) {

          saveFormResponseHash(
            entityId,
            response
          );

          initialized++;

          continue;
        }


        if (
          oldHash ===
          currentHash
        ) {

          continue;
        }


        const oldRecord =
          getDataRecordByEntityId(
            dataSheet,
            entityId
          );


        const location =
          resolveLocation(
            response.location,
            locations
          );


        updateDataRecord(
          dataSheet,
          response,
          location
        );


        recordConsentChanges(
          response,
          entityId,
          oldRecord,
          {
            source: 'form',
            sourceReference:
              buildFormConsentSourceReference(
                entityId,
                rowNumber,
                'edit'
              ),
            recordedBy: 'automatic',
            partial: false
          }
        );


        saveFormResponseHash(
          entityId,
          response
        );


        try {

          ensureFormResponseIdForRow(
            formSheet,
            rowNumber
          );

        } catch (idError) {

          console.warn(
            'No se pudo resolver form_response_id para ' +
            entityId +
            ': ' +
            idError.message
          );
        }


        updated++;


      } catch (error) {

        errors++;


        console.error(
          'ERROR sincronizando fila ' +
          rowNumber +
          ': ' +
          error.message
        );
      }
    }


    console.log(
      'SINCRONIZACIÓN FORMULARIO: ' +
      'actualizadas=' +
      updated +
      ', inicializadas=' +
      initialized +
      ', errores=' +
      errors
    );


    return {
      updated:
        updated,

      initialized:
        initialized,

      errors:
        errors
    };


  } finally {

    lock.releaseLock();
  }
}


function hashFormResponse(
  response
) {

  const clean = {};


  Object.keys(
    response
  )
    .sort()
    .forEach(
      key => {

        clean[key] =
          normalizeHashValue(
            response[key]
          );
      }
    );


  const bytes =
    Utilities
      .computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        JSON.stringify(
          clean
        ),
        Utilities.Charset.UTF_8
      );


  return Utilities
    .base64EncodeWebSafe(
      bytes
    );
}


function normalizeHashValue(
  value
) {

  if (
    value instanceof Date
  ) {

    return value
      .toISOString();
  }


  return String(
    value === undefined ||
    value === null
      ? ''
      : value
  )
    .trim();
}


function getStoredFormResponseHash(
  entityId
) {

  return PropertiesService
    .getScriptProperties()
    .getProperty(
      getFormHashPropertyKey(
        entityId
      )
    );
}


function saveFormResponseHash(
  entityId,
  response
) {

  PropertiesService
    .getScriptProperties()
    .setProperty(
      getFormHashPropertyKey(
        entityId
      ),
      hashFormResponse(
        response
      )
    );
}


function deleteStoredFormResponseHash(
  entityId
) {

  PropertiesService
    .getScriptProperties()
    .deleteProperty(
      getFormHashPropertyKey(
        entityId
      )
    );
}


function getFormHashPropertyKey(
  entityId
) {

  return (
    'FORM_HASH_' +
    String(
      entityId
    )
      .trim()
      .toUpperCase()
  );
}


function buildFormConsentSourceReference(
  entityId,
  rowNumber,
  action
) {

  return (
    'FORM:' +
    String(
      entityId
    )
      .trim()
      .toUpperCase() +
    ':ROW:' +
    rowNumber +
    ':' +
    String(
      action || 'submit'
    )
  );
}


/**
 * ============================================================
 * FORM_RESPONSE_ID
 * ============================================================
 *
 * Permite borrar también la copia conservada por Google Forms
 * y no únicamente la fila del spreadsheet.
 */


function ensureOperationalColumns() {

  const formSheet =
    getSheet(
      CONFIG.FORM_SHEET
    );


  ensureHeaderExists(
    formSheet,
    CONFIG.FORM_RESPONSE_ID_HEADER
  );
}


function ensureHeaderExists(
  sheet,
  header
) {

  const headers =
    getHeaders(
      sheet
    );


  if (
    headers.includes(
      header
    )
  ) {

    return headers.indexOf(
      header
    ) + 1;
  }


  const column =
    sheet.getLastColumn() + 1;


  sheet
    .getRange(
      1,
      column
    )
    .setValue(
      header
    );


  return column;
}


function ensureFormResponseIdForRow(
  formSheet,
  rowNumber
) {

  const idColumn =
    ensureHeaderExists(
      formSheet,
      CONFIG.FORM_RESPONSE_ID_HEADER
    );


  const existingId =
    String(
      formSheet
        .getRange(
          rowNumber,
          idColumn
        )
        .getValue() ||
      ''
    )
      .trim();


  if (existingId) {

    return existingId;
  }


  const formUrl =
    formSheet
      .getFormUrl();


  if (!formUrl) {

    throw new Error(
      'La hoja ' +
      formSheet.getName() +
      ' no tiene un formulario asociado.'
    );
  }


  const form =
    FormApp
      .openByUrl(
        formUrl
      );


  const headers =
    getHeaders(
      formSheet
    );


  const values =
    formSheet
      .getRange(
        rowNumber,
        1,
        1,
        headers.length
      )
      .getValues()[0];


  const row =
    rowToObject(
      headers,
      values
    );


  const match =
    findBestFormResponseMatch(
      form,
      row
    );


  if (!match) {

    throw new Error(
      'No se pudo identificar con suficiente seguridad ' +
      'la respuesta original de Google Forms.'
    );
  }


  const responseId =
    match.getId();


  if (!responseId) {

    throw new Error(
      'Google Forms no devolvió un ID de respuesta.'
    );
  }


  formSheet
    .getRange(
      rowNumber,
      idColumn
    )
    .setValue(
      responseId
    );


  return responseId;
}


function findBestFormResponseMatch(
  form,
  sheetRow
) {

  const sheetEmail =
    normalizeEmail(
      sheetRow[
        'Email address'
      ]
    );


  const sheetTimestamp =
    toTimestampMillis(
      sheetRow.Timestamp
    );


  const responses =
    form.getResponses();


  let best = null;
  let bestScore =
    -Infinity;


  responses.forEach(
    formResponse => {

      const formEmail =
        normalizeEmail(
          formResponse
            .getRespondentEmail()
        );


      /*
       * Si ambos correos existen y no coinciden,
       * descartamos la respuesta.
       */

      if (
        sheetEmail &&
        formEmail &&
        sheetEmail !==
        formEmail
      ) {

        return;
      }


      let score = 0;


      if (
        sheetEmail &&
        formEmail &&
        sheetEmail ===
        formEmail
      ) {

        score += 40;
      }


      const formTimestamp =
        toTimestampMillis(
          formResponse
            .getTimestamp()
        );


      if (
        sheetTimestamp &&
        formTimestamp
      ) {

        const diff =
          Math.abs(
            sheetTimestamp -
            formTimestamp
          );


        if (
          diff <= 2000
        ) {

          score += 120;

        } else if (
          diff <= 60000
        ) {

          score += 60;

        } else if (
          diff <= 3600000
        ) {

          score += 15;
        }
      }


      const answers =
        formResponseToObject(
          formResponse
        );


      Object.keys(
        answers
      ).forEach(
        title => {

          if (
            sheetRow[title] ===
            undefined
          ) {

            return;
          }


          const formValue =
            normalizeComparable(
              answers[title]
            );


          const sheetValue =
            normalizeComparable(
              sheetRow[title]
            );


          if (
            formValue ===
            sheetValue
          ) {

            if (
              formValue !== ''
            ) {

              score += 3;
            }

          } else if (
            formValue !== '' ||
            sheetValue !== ''
          ) {

            score -= 1;
          }
        }
      );


      if (
        score >
        bestScore
      ) {

        bestScore =
          score;

        best =
          formResponse;
      }
    }
  );


  /*
   * Umbral conservador porque el ID se utilizará
   * posteriormente para una operación irreversible.
   */

  if (
    bestScore < 40
  ) {

    return null;
  }


  return best;
}


function formResponseToObject(
  formResponse
) {

  const object = {};


  formResponse
    .getItemResponses()
    .forEach(
      itemResponse => {

        object[
          itemResponse
            .getItem()
            .getTitle()
        ] =
          itemResponse
            .getResponse();
      }
    );


  return object;
}


function normalizeComparable(
  value
) {

  if (
    Array.isArray(
      value
    )
  ) {

    return value
      .map(
        item =>
          String(
            item
          ).trim()
      )
      .join(', ')
      .toLowerCase();
  }


  return String(
    value === undefined ||
    value === null
      ? ''
      : value
  )
    .trim()
    .replace(
      /\s+/g,
      ' '
    )
    .toLowerCase();
}


function normalizeEmail(
  value
) {

  return String(
    value || ''
  )
    .trim()
    .toLowerCase();
}


function toTimestampMillis(
  value
) {

  if (
    value instanceof Date
  ) {

    return value
      .getTime();
  }


  const date =
    new Date(
      value
    );


  const millis =
    date.getTime();


  return isNaN(
    millis
  )
    ? null
    : millis;
}


/**
 * ============================================================
 * GDPR / RGPD: _gdpr o _gpdr
 * ============================================================
 *
 * La hoja puede conservar el nombre histórico "_gpdr".
 *
 * Tipos implementados:
 * - access
 * - erasure
 *
 * La supresión NUNCA se ejecuta por recibir una solicitud.
 * Solo se ejecuta manualmente sobre una fila cuyo status sea
 * exactamente "approved".
 */
