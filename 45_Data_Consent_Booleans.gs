/**
 * ARCHIPIÉLAGO VIVO · NORMALIZACIÓN DE CONSENTIMIENTOS EN DATA
 *
 * DATA debe guardar únicamente el ESTADO ACTUAL:
 *
 * TRUE / FALSE
 *
 * Nunca el texto largo del formulario.
 *
 * Este módulo usa nombres internos únicos (av...) para evitar que una
 * función antigua de un script legado pueda interferir.
 */


const AV_DATA_CONSENT_FIELDS_ = [
  'consent_publication',
  'consent_accuracy',
  'consent_contact',
  'consent_whatsapp',
  'consent_newsletter'
];


function avConsentBoolean_(
  value
) {

  if (
    value === true ||
    value === 1
  ) {

    return true;
  }


  if (
    value === false ||
    value === 0 ||
    value === undefined ||
    value === null
  ) {

    return false;
  }


  const normalized =
    String(
      value
    )
      .trim()
      .toLowerCase();


  if (
    normalized === ''
  ) {

    return false;
  }


  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'sí' ||
    normalized === 'si' ||
    normalized.startsWith('sí,') ||
    normalized.startsWith('si,')
  );
}


function normalizeDataConsentBooleans() {

  const ui =
    SpreadsheetApp
      .getUi();


  const sheet =
    getSheet(
      CONFIG.DATA_SHEET
    );


  const changed =
    normalizeDataConsentBooleans_(
      sheet
    );


  SpreadsheetApp.flush();


  ui.alert(
    'Consentimientos normalizados.\n\n' +
    'Celdas convertidas a TRUE/FALSE: ' +
    changed +
    '\n\n' +
    'Campos:\n' +
    AV_DATA_CONSENT_FIELDS_
      .join(
        '\n'
      )
  );


  return changed;
}


function normalizeDataConsentBooleans_(
  sheet
) {

  const lastRow =
    sheet.getLastRow();


  if (
    lastRow <= 1
  ) {

    return 0;
  }


  const headers =
    getHeaders(
      sheet
    );


  let changed = 0;


  AV_DATA_CONSENT_FIELDS_
    .forEach(
      field => {

        const index =
          headers.indexOf(
            field
          );


        if (
          index === -1
        ) {

          throw new Error(
            'Falta la columna ' +
            field +
            ' en ' +
            sheet.getName()
          );
        }


        const range =
          sheet.getRange(
            2,
            index + 1,
            lastRow - 1,
            1
          );


        const values =
          range.getValues();


        const normalizedValues =
          values.map(
            row => {

              const original =
                row[0];


              const normalized =
                avConsentBoolean_(
                  original
                );


              if (
                original !== normalized
              ) {

                changed++;
              }


              return [
                normalized
              ];
            }
          );


        range.setValues(
          normalizedValues
        );
      }
    );


  return changed;
}


function inspectDataConsentTypes() {

  const ui =
    SpreadsheetApp
      .getUi();


  const sheet =
    getSheet(
      CONFIG.DATA_SHEET
    );


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow <= 1
  ) {

    ui.alert(
      'DATA no contiene registros.'
    );

    return;
  }


  const headers =
    getHeaders(
      sheet
    );


  const parts = [];


  AV_DATA_CONSENT_FIELDS_
    .forEach(
      field => {

        const index =
          headers.indexOf(
            field
          );


        if (
          index === -1
        ) {

          parts.push(
            field +
            ': COLUMNA AUSENTE'
          );

          return;
        }


        const value =
          sheet
            .getRange(
              2,
              index + 1
            )
            .getValue();


        parts.push(
          field +
          ': ' +
          String(
            value
          ) +
          ' [' +
          typeof value +
          ']'
        );
      }
    );


  ui.alert(
    'Tipos reales de la primera fila de DATA\n\n' +
    parts.join(
      '\n'
    )
  );
}
