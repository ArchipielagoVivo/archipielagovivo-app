/**
 * ARCHIPIÉLAGO VIVO · _GDPR
 */

function getGdprSheet() {

  return getSheet(
    CONFIG.GDPR_SHEET
  );
}


function getSelectedGdprRequest() {

  const sheet =
    getGdprSheet();


  const activeSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getActiveSheet();


  if (
    activeSheet.getSheetId() !==
    sheet.getSheetId()
  ) {

    throw new Error(
      'Selecciona primero una fila de ' +
      sheet.getName() +
      '.'
    );
  }


  const rowNumber =
    sheet
      .getActiveCell()
      .getRow();


  if (
    rowNumber < 2
  ) {

    throw new Error(
      'Selecciona una solicitud GDPR.'
    );
  }


  const headers =
    getHeaders(
      sheet
    );


  if (
    !headers.includes(
      'request_id'
    )
  ) {

    throw new Error(
      'La hoja _gdpr debe tener la columna request_id.'
    );
  }


  const values =
    sheet
      .getRange(
        rowNumber,
        1,
        1,
        headers.length
      )
      .getValues()[0];


  const request =
    rowToObject(
      headers,
      values
    );


  request._rowNumber =
    rowNumber;


  let requestId =
    String(
      request.request_id || ''
    )
      .trim();


  if (!requestId) {

    requestId =
      generateUniquePrefixedId(
        sheet,
        'request_id',
        CONFIG.GDPR_ID_PREFIX,
        10
      );


    sheet
      .getRange(
        rowNumber,
        headers.indexOf(
          'request_id'
        ) + 1
      )
      .setValue(
        requestId
      );


    request.request_id =
      requestId;
  }


  if (
    !request.request_date &&
    headers.includes(
      'request_date'
    )
  ) {

    const requestDate =
      new Date();


    sheet
      .getRange(
        rowNumber,
        headers.indexOf(
          'request_date'
        ) + 1
      )
      .setValue(
        requestDate
      );


    request.request_date =
      requestDate;
  }


  request._requestId =
    requestId;


  return request;
}


function normalizeGdprRequestType(
  value
) {

  const normalized =
    normalizeTextKey(
      value
    );


  if (
    [
      'access',
      'acceso',
      'derecho de acceso'
    ].includes(
      normalized
    )
  ) {

    return 'access';
  }


  if (
    [
      'erasure',
      'erase',
      'deletion',
      'supresion',
      'eliminacion',
      'derecho de supresion'
    ].includes(
      normalized
    )
  ) {

    return 'erasure';
  }


  return normalized;
}


function sendSelectedGdprAccessData() {

  const request =
    getSelectedGdprRequest();


  const type =
    normalizeGdprRequestType(
      request.request_type
    );


  if (
    type !==
    'access'
  ) {

    throw new Error(
      'La solicitud seleccionada no es de tipo access/acceso.'
    );
  }


  const contact =
    normalizeEmail(
      request.contact
    );


  if (!contact) {

    throw new Error(
      'La solicitud no tiene correo en contact.'
    );
  }


  const targets =
    getVerifiedGdprTargetRecords(
      request
    );


  const payload =
    buildGdprAccessPackage(
      request,
      targets
    );


  const json =
    JSON.stringify(
      payload,
      null,
      2
    );


  const fileName =
    'archipielago-vivo-datos-' +
    sanitizeFileName(
      request._requestId
    ) +
    '.json';


  const attachment =
    Utilities
      .newBlob(
        json,
        'application/json',
        fileName
      );


  MailApp
    .sendEmail(
      {
        to:
          contact,

        subject:
          'Copia de tus datos · Archipiélago Vivo',

        body:
          'Adjuntamos una copia estructurada de los datos asociados ' +
          'a tu solicitud ' +
          request._requestId +
          '.',

        htmlBody:
          '<p>Adjuntamos una copia estructurada de los datos asociados ' +
          'a tu solicitud <strong>' +
          escapeHtml(
            request._requestId
          ) +
          '</strong>.</p>' +
          '<p>El archivo JSON incluye los registros localizados en la base maestra, ' +
          'la respuesta del formulario, el historial de consentimientos y, cuando exista, ' +
          'información de incorporación manual asociada a esas entidades.</p>',

        attachments:
          [
            attachment
          ],

        name:
          'Archipiélago Vivo'
      }
    );


  updateGdprRequestRow(
    request._rowNumber,
    {
      status:
        'completed',

      processed_at:
        new Date(),

      processed_by:
        getCurrentOperator(),

      result:
        'access_data_sent',

      notes:
        appendAuditNote(
          request.notes,
          'Datos enviados a la dirección registrada y verificada: ' +
          contact
        )
    }
  );


  SpreadsheetApp
    .getUi()
    .alert(
      'Datos enviados correctamente a:\n' +
      contact +
      '\n\nEntidades incluidas: ' +
      targets.length
    );
}


function buildGdprAccessPackage(
  request,
  targetRecords
) {

  const formSheet =
    getSheet(
      CONFIG.FORM_SHEET
    );


  const manualSheet =
    getSheet(
      CONFIG.MANUAL_SHEET
    );


  const consentsSheet =
    getConsentsSheet();


  const entityIds =
    targetRecords
      .map(
        record =>
          String(
            record.entity_id
          )
            .trim()
            .toUpperCase()
      );


  return {
    generated_at:
      new Date()
        .toISOString(),

    request:
      {
        request_id:
          request._requestId,

        request_type:
          request.request_type,

        request_date:
          jsonSafeValue(
            request.request_date
          ),

        requested_by:
          request.requested_by,

        contact:
          request.contact
      },

    entities:
      targetRecords.map(
        record => {

          const entityId =
            String(
              record.entity_id
            )
              .trim()
              .toUpperCase();


          return {
            entity_id:
              entityId,

            data:
              jsonSafeObject(
                record
              ),

            form_responses:
              findRowsByField(
                formSheet,
                'entity_id',
                entityId
              )
                .map(
                  jsonSafeObject
                ),

            manual_records:
              findRowsByField(
                manualSheet,
                'entity_id',
                entityId
              )
                .map(
                  jsonSafeObject
                ),

            consents:
              findRowsByField(
                consentsSheet,
                'entity_id',
                entityId
              )
                .map(
                  jsonSafeObject
                )
          };
        }
      )
  };
}


function executeSelectedGdprErasure() {

  const request =
    getSelectedGdprRequest();


  const type =
    normalizeGdprRequestType(
      request.request_type
    );


  if (
    type !==
    'erasure'
  ) {

    throw new Error(
      'La solicitud seleccionada no es de tipo erasure/supresión.'
    );
  }


  const status =
    normalizeTextKey(
      request.status
    );


  if (
    status !==
    'approved'
  ) {

    throw new Error(
      'La supresión no puede ejecutarse.\n\n' +
      'El status debe ser exactamente: approved'
    );
  }


  const targets =
    getVerifiedGdprTargetRecords(
      request
    );


  const entityIds =
    targets
      .map(
        record =>
          String(
            record.entity_id
          )
            .trim()
            .toUpperCase()
      );


  /*
   * PREVALIDACIÓN:
   * localizamos las respuestas originales de Google Forms
   * antes de borrar ninguna tabla.
   */

  const formDeletionPlan =
    buildFormDeletionPlan(
      entityIds
    );


  const summary =
    targets
      .map(
        record =>
          String(
            record.entity_id
          ) +
          ' · ' +
          String(
            record.name ||
            '(sin nombre)'
          )
      )
      .join(
        '\n'
      );


  const ui =
    SpreadsheetApp
      .getUi();


  const decision =
    ui.alert(
      'Confirmar supresión GDPR',
      'Se eliminarán los datos de:\n\n' +
      summary +
      '\n\nTambién se intentará eliminar la respuesta original de Google Forms, ' +
      'la fila de form_responses, data, _manual y _consents.\n\n' +
      'La fila de auditoría GDPR NO se eliminará.\n\n' +
      'Esta operación es irreversible.',
      ui.ButtonSet.YES_NO
    );


  if (
    decision !==
    ui.Button.YES
  ) {

    return;
  }


  const result =
    eraseEntities(
      entityIds,
      formDeletionPlan
    );


  updateGdprRequestRow(
    request._rowNumber,
    {
      status:
        'completed',

      processed_at:
        new Date(),

      processed_by:
        getCurrentOperator(),

      result:
        'erased: ' +
        entityIds.join(
          ', '
        ),

      notes:
        appendAuditNote(
          request.notes,
          'Supresión ejecutada. ' +
          JSON.stringify(
            result
          )
        )
    }
  );


  ui.alert(
    'Supresión completada.\n\n' +
    'Entidades: ' +
    entityIds.length +
    '\n' +
    'Respuestas Google Forms eliminadas: ' +
    result.formResponsesDeleted +
    '\n' +
    'Filas form_responses eliminadas: ' +
    result.formRowsDeleted +
    '\n' +
    'Filas data eliminadas: ' +
    result.dataRowsDeleted +
    '\n' +
    'Filas _manual eliminadas: ' +
    result.manualRowsDeleted +
    '\n' +
    'Filas _consents eliminadas: ' +
    result.consentRowsDeleted
  );
}


function getVerifiedGdprTargetRecords(
  request
) {

  const contact =
    normalizeEmail(
      request.contact
    );


  if (!contact) {

    throw new Error(
      'La solicitud GDPR no tiene un correo de contacto.'
    );
  }


  const dataSheet =
    getSheet(
      CONFIG.DATA_SHEET
    );


  let records =
    findRowsByField(
      dataSheet,
      'contributor_email',
      contact,
      normalizeEmail
    );


  if (
    request.entity_id
  ) {

    const requestedEntityId =
      String(
        request.entity_id
      )
        .trim()
        .toUpperCase();


    records =
      records.filter(
        record =>
          String(
            record.entity_id
          )
            .trim()
            .toUpperCase() ===
          requestedEntityId
      );
  }


  if (
    records.length === 0
  ) {

    throw new Error(
      'No existe ninguna entidad asociada al correo indicado ' +
      'y al ámbito de esta solicitud.'
    );
  }


  records.forEach(
    record => {

      if (
        normalizeEmail(
          record.contributor_email
        ) !==
        contact
      ) {

        throw new Error(
          'Verificación fallida para entity_id ' +
          record.entity_id +
          '.'
        );
      }
    }
  );


  return records;
}


function buildFormDeletionPlan(
  entityIds
) {

  const formSheet =
    getSheet(
      CONFIG.FORM_SHEET
    );


  ensureHeaderExists(
    formSheet,
    CONFIG.FORM_RESPONSE_ID_HEADER
  );


  const headers =
    getHeaders(
      formSheet
    );


  const index =
    createHeaderIndex(
      headers
    );


  if (
    index.entity_id ===
    undefined
  ) {

    throw new Error(
      'No existe entity_id en ' +
      formSheet.getName()
    );
  }


  const ids =
    new Set(
      entityIds.map(
        value =>
          String(
            value
          )
            .trim()
            .toUpperCase()
      )
    );


  const rows = [];


  for (
    let rowNumber = 2;
    rowNumber <=
      formSheet.getLastRow();
    rowNumber++
  ) {

    const entityId =
      String(
        formSheet
          .getRange(
            rowNumber,
            index.entity_id + 1
          )
          .getValue() ||
        ''
      )
        .trim()
        .toUpperCase();


    if (
      !ids.has(
        entityId
      )
    ) {

      continue;
    }


    let responseId =
      String(
        formSheet
          .getRange(
            rowNumber,
            index[
              CONFIG.FORM_RESPONSE_ID_HEADER
            ] + 1
          )
          .getValue() ||
        ''
      )
        .trim();


    if (!responseId) {

      responseId =
        ensureFormResponseIdForRow(
          formSheet,
          rowNumber
        );
    }


    if (!responseId) {

      throw new Error(
        'No se pudo obtener form_response_id para ' +
        entityId +
        '. Se cancela la supresión antes de borrar nada.'
      );
    }


    rows.push(
      {
        rowNumber:
          rowNumber,

        entityId:
          entityId,

        responseId:
          responseId
      }
    );
  }


  return {
    formSheet:
      formSheet,

    rows:
      rows
  };
}


function eraseEntities(
  entityIds,
  formDeletionPlan
) {

  const idSet =
    new Set(
      entityIds.map(
        value =>
          String(
            value
          )
            .trim()
            .toUpperCase()
      )
    );


  let formResponsesDeleted =
    0;


  /*
   * Primero se elimina la copia del almacén de Google Forms.
   */

  if (
    formDeletionPlan.rows.length >
    0
  ) {

    const formUrl =
      formDeletionPlan
        .formSheet
        .getFormUrl();


    if (!formUrl) {

      throw new Error(
        'No se pudo abrir el formulario asociado.'
      );
    }


    const form =
      FormApp
        .openByUrl(
          formUrl
        );


    formDeletionPlan
      .rows
      .forEach(
        item => {

          try {

            form.deleteResponse(
              item.responseId
            );

            formResponsesDeleted++;

          } catch (error) {

            /*
             * Si ya no existe en el formulario, continuamos.
             * La hoja y el resto de almacenes deben limpiarse igualmente.
             */

            console.warn(
              'No se pudo borrar la respuesta Forms ' +
              item.responseId +
              ': ' +
              error.message
            );
          }
        }
      );
  }


  const formRowsDeleted =
    deleteRowsByEntityIds(
      formDeletionPlan.formSheet,
      idSet
    );


  const dataRowsDeleted =
    deleteRowsByEntityIds(
      getSheet(
        CONFIG.DATA_SHEET
      ),
      idSet
    );


  const manualRowsDeleted =
    deleteRowsByEntityIds(
      getSheet(
        CONFIG.MANUAL_SHEET
      ),
      idSet
    );


  const consentRowsDeleted =
    deleteRowsByEntityIds(
      getConsentsSheet(),
      idSet
    );


  entityIds.forEach(
    entityId =>
      deleteStoredFormResponseHash(
        entityId
      )
  );


  return {
    formResponsesDeleted:
      formResponsesDeleted,

    formRowsDeleted:
      formRowsDeleted,

    dataRowsDeleted:
      dataRowsDeleted,

    manualRowsDeleted:
      manualRowsDeleted,

    consentRowsDeleted:
      consentRowsDeleted
  };
}


function deleteRowsByEntityIds(
  sheet,
  idSet
) {

  const headers =
    getHeaders(
      sheet
    );


  const index =
    createHeaderIndex(
      headers
    );


  if (
    index.entity_id ===
    undefined
  ) {

    return 0;
  }


  let deleted = 0;


  for (
    let rowNumber =
      sheet.getLastRow();
    rowNumber >= 2;
    rowNumber--
  ) {

    const entityId =
      String(
        sheet
          .getRange(
            rowNumber,
            index.entity_id + 1
          )
          .getValue() ||
        ''
      )
        .trim()
        .toUpperCase();


    if (
      idSet.has(
        entityId
      )
    ) {

      sheet.deleteRow(
        rowNumber
      );

      deleted++;
    }
  }


  return deleted;
}


function updateGdprRequestRow(
  rowNumber,
  patch
) {

  const sheet =
    getGdprSheet();


  const headers =
    getHeaders(
      sheet
    );


  const index =
    createHeaderIndex(
      headers
    );


  Object.keys(
    patch
  ).forEach(
    key => {

      if (
        index[
          key
        ] === undefined
      ) {

        return;
      }


      sheet
        .getRange(
          rowNumber,
          index[key] + 1
        )
        .setValue(
          patch[key]
        );
    }
  );
}


/**
 * ============================================================
 * UTILIDADES PARA ACCESO GDPR
 * ============================================================
 */
