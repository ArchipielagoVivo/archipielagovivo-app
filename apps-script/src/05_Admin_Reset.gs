/**
 * ARCHIPIÉLAGO VIVO · ADMINISTRACIÓN / RESET
 *
 * RESET DE ENTORNO DE PRUEBAS
 *
 * Elimina:
 * - respuestas almacenadas en Google Forms
 * - datos de form_responses
 * - datos de data
 * - datos de _manual
 * - datos de _consents
 * - hashes FORM_HASH_* de Script Properties
 *
 * Conserva:
 * - cabeceras
 * - _locations
 * - _gdpr
 * - configuración/preguntas del Google Form
 *
 * IMPORTANTE:
 * data, _manual o _consents pueden ser "Tablas" nativas
 * de Google Sheets. Para esas hojas no basta con deleteRows():
 * la tabla tiene su propio rango y se redimensiona mediante
 * Google Sheets API.
 */


function resetTestData() {

  const ui =
    SpreadsheetApp
      .getUi();


  const confirmation =
    ui.prompt(
      'Vaciar datos de prueba',
      'Esta acción eliminará TODAS las respuestas del Google Form y vaciará:\n\n' +
      '• form_responses\n' +
      '• data\n' +
      '• _manual\n' +
      '• _consents\n\n' +
      'No se borrarán _locations ni _gdpr.\n\n' +
      'Escribe exactamente BORRAR PRUEBAS para continuar.',
      ui.ButtonSet.OK_CANCEL
    );


  if (
    confirmation.getSelectedButton() !==
    ui.Button.OK
  ) {

    return;
  }


  if (
    confirmation
      .getResponseText()
      .trim() !==
    'BORRAR PRUEBAS'
  ) {

    ui.alert(
      'Cancelado: el texto de confirmación no coincide.'
    );

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


    /*
     * 1. Borrar respuestas del almacén del Google Form.
     */

    const formUrl =
      formSheet
        .getFormUrl();


    if (!formUrl) {

      throw new Error(
        'No se ha encontrado el Google Form asociado a ' +
        CONFIG.FORM_SHEET +
        '.'
      );
    }


    const form =
      FormApp
        .openByUrl(
          formUrl
        );


    const formResponseCount =
      form
        .getResponses()
        .length;


    form
      .deleteAllResponses();


    /*
     * 2. Vaciar hojas.
     *
     * Cada hoja se procesa de forma independiente para que
     * un problema estructural en una tabla no impida limpiar
     * las demás.
     */

    const results = [];


    results.push(
      resetOneSheet(
        formSheet,
        false
      )
    );


    results.push(
      resetOneSheet(
        getSheet(
          CONFIG.DATA_SHEET
        ),
        true
      )
    );


    results.push(
      resetOneSheet(
        getSheet(
          CONFIG.MANUAL_SHEET
        ),
        true
      )
    );


    results.push(
      resetOneSheet(
        getSheet(
          CONFIG.CONSENTS_SHEET
        ),
        true
      )
    );


    /*
     * 3. Eliminar hashes usados por FormSync.
     */

    const hashesDeleted =
      clearFormSyncHashes();


    SpreadsheetApp
      .flush();


    const details =
      results
        .map(
          result =>
            result.sheet +
            ': ' +
            result.rowsCleared +
            ' registros eliminados' +
            (
              result.tableFound
                ? ', tabla redimensionada'
                : ''
            ) +
            (
              result.remainingRows !== null
                ? ', filas físicas=' +
                  result.remainingRows
                : ''
            ) +
            (
              result.warning
                ? '\n  AVISO: ' +
                  result.warning
                : ''
            )
        )
        .join(
          '\n'
        );


    ui.alert(
      'Reset completado.\n\n' +
      'Respuestas eliminadas de Google Forms: ' +
      formResponseCount +
      '\n\n' +
      details +
      '\n\nHashes eliminados: ' +
      hashesDeleted +
      '\n\n_locations y _gdpr se han conservado.'
    );


  } finally {

    lock.releaseLock();
  }
}


function resetOneSheet(
  sheet,
  handleNativeTables
) {

  const lastRow =
    sheet.getLastRow();


  const rowsCleared =
    Math.max(
      lastRow - 1,
      0
    );


  /*
   * PRIMERO se borran los valores.
   *
   * De esta forma los datos desaparecen incluso si después
   * Google no permite reducir físicamente el rango de la tabla.
   */

  clearValuesBelowHeader(
    sheet
  );


  let tableFound =
    false;

  let warning =
    '';


  if (
    handleNativeTables
  ) {

    try {

      tableFound =
        shrinkNativeTablesToHeader(
          sheet
        );


    } catch (error) {

      warning =
        'Los datos se borraron, pero no se pudo redimensionar ' +
        'la tabla nativa: ' +
        error.message;
    }
  }


  /*
   * Después intentamos reducir también la rejilla física.
   *
   * Si existe una tabla nativa y se ha podido reducir a la
   * cabecera, deleteRows() ya no choca con su antiguo rango.
   */

  try {

    shrinkSheetGridToHeader(
      sheet
    );


  } catch (error) {

    warning =
      warning
        ? warning +
          ' | Rejilla: ' +
          error.message
        : 'No se pudo reducir la rejilla: ' +
          error.message;
  }


  return {
    sheet:
      sheet.getName(),

    rowsCleared:
      rowsCleared,

    tableFound:
      tableFound,

    remainingRows:
      sheet.getMaxRows(),

    warning:
      warning
  };
}


function clearValuesBelowHeader(
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


function shrinkSheetGridToHeader(
  sheet
) {

  const frozenRows =
    sheet.getFrozenRows();


  if (
    frozenRows > 0
  ) {

    sheet.setFrozenRows(
      0
    );
  }


  try {

    const maxRows =
      sheet.getMaxRows();


    if (
      maxRows > 1
    ) {

      sheet.deleteRows(
        2,
        maxRows - 1
      );
    }


  } finally {

    /*
     * Si la cabecera estaba congelada, la restauramos.
     */

    if (
      frozenRows > 0
    ) {

      sheet.setFrozenRows(
        1
      );
    }
  }
}


/**
 * ============================================================
 * TABLAS NATIVAS DE GOOGLE SHEETS
 * ============================================================
 *
 * SpreadsheetApp todavía no expone directamente la gestión
 * completa de estas tablas. Consultamos y actualizamos su rango
 * mediante Google Sheets API v4.
 */


function shrinkNativeTablesToHeader(
  sheet
) {

  const spreadsheet =
    sheet.getParent();


  const spreadsheetId =
    spreadsheet.getId();


  const sheetId =
    sheet.getSheetId();


  const metadata =
    getNativeTablesMetadata(
      spreadsheetId,
      sheetId
    );


  const tables =
    metadata.tables || [];


  if (
    tables.length === 0
  ) {

    return false;
  }


  const requests = [];


  tables.forEach(
    table => {

      const range =
        table.range || {};


      /*
       * Se conserva:
       * - sheetId
       * - columna inicial/final
       * - fila inicial
       *
       * Y se reduce endRowIndex a una sola fila:
       * la cabecera de la tabla.
       */

      const startRowIndex =
        range.startRowIndex === undefined
          ? 0
          : range.startRowIndex;


      const newRange = {
        sheetId:
          sheetId,

        startRowIndex:
          startRowIndex,

        endRowIndex:
          startRowIndex + 1
      };


      if (
        range.startColumnIndex !== undefined
      ) {

        newRange.startColumnIndex =
          range.startColumnIndex;
      }


      if (
        range.endColumnIndex !== undefined
      ) {

        newRange.endColumnIndex =
          range.endColumnIndex;
      }


      requests.push(
        {
          updateTable:
            {
              table:
                {
                  tableId:
                    table.tableId,

                  range:
                    newRange
                },

              fields:
                'range'
            }
        }
      );
    }
  );


  sheetsApiBatchUpdate(
    spreadsheetId,
    requests
  );


  return true;
}


function getNativeTablesMetadata(
  spreadsheetId,
  targetSheetId
) {

  const fields =
    'sheets(properties(sheetId,title),tables(tableId,name,range))';


  const url =
    'https://sheets.googleapis.com/v4/spreadsheets/' +
    encodeURIComponent(
      spreadsheetId
    ) +
    '?fields=' +
    encodeURIComponent(
      fields
    );


  const response =
    UrlFetchApp.fetch(
      url,
      {
        method:
          'get',

        headers:
          {
            Authorization:
              'Bearer ' +
              ScriptApp.getOAuthToken()
          },

        muteHttpExceptions:
          true
      }
    );


  const code =
    response.getResponseCode();


  if (
    code < 200 ||
    code >= 300
  ) {

    throw new Error(
      'Sheets API GET ' +
      code +
      ': ' +
      response.getContentText()
    );
  }


  const payload =
    JSON.parse(
      response.getContentText()
    );


  const target =
    (
      payload.sheets ||
      []
    )
      .find(
        item =>
          item.properties &&
          item.properties.sheetId ===
          targetSheetId
      );


  return {
    tables:
      target &&
      target.tables
        ? target.tables
        : []
  };
}


function sheetsApiBatchUpdate(
  spreadsheetId,
  requests
) {

  if (
    !requests ||
    requests.length === 0
  ) {

    return;
  }


  const url =
    'https://sheets.googleapis.com/v4/spreadsheets/' +
    encodeURIComponent(
      spreadsheetId
    ) +
    ':batchUpdate';


  const response =
    UrlFetchApp.fetch(
      url,
      {
        method:
          'post',

        contentType:
          'application/json',

        headers:
          {
            Authorization:
              'Bearer ' +
              ScriptApp.getOAuthToken()
          },

        payload:
          JSON.stringify(
            {
              requests:
                requests
            }
          ),

        muteHttpExceptions:
          true
      }
    );


  const code =
    response.getResponseCode();


  if (
    code < 200 ||
    code >= 300
  ) {

    throw new Error(
      'Sheets API batchUpdate ' +
      code +
      ': ' +
      response.getContentText()
    );
  }
}


function clearFormSyncHashes() {

  const properties =
    PropertiesService
      .getScriptProperties();


  const all =
    properties
      .getProperties();


  let deleted = 0;


  Object.keys(
    all
  )
    .filter(
      key =>
        key.indexOf(
          'FORM_HASH_'
        ) === 0
    )
    .forEach(
      key => {

        properties
          .deleteProperty(
            key
          );


        deleted++;
      }
    );


  return deleted;
}
