/**
 * ARCHIPIÉLAGO VIVO · UTILIDADES COMPARTIDAS
 */

function getHeaders(
  sheet
) {

  return sheet
    .getRange(
      1,
      1,
      1,
      sheet.getLastColumn()
    )
    .getValues()[0]
    .map(
      h =>
        String(h).trim()
    );
}


/**
 * ============================================================
 * ÍNDICE DE CABECERAS
 * ============================================================
 */


function createHeaderIndex(
  headers
) {

  const index = {};


  headers.forEach(
    (header, i) => {

      index[
        header.toLowerCase()
      ] = i;

    }
  );


  return index;
}


/**
 * ============================================================
 * OBTENER CELDA
 * ============================================================
 */


function getCell(
  row,
  index,
  header
) {

  const position =
    index[
      header.toLowerCase()
    ];


  if (
    position === undefined
  ) {

    return '';
  }


  return row[position];
}


/**
 * ============================================================
 * FILA → OBJETO
 * ============================================================
 */


function rowToObject(
  headers,
  row
) {

  const object = {};


  headers.forEach(
    (header, index) => {

      object[header] =
        row[index];

    }
  );


  return object;
}


/**
 * ============================================================
 * OBTENER HOJA
 * ============================================================
 */


function getSheet(
  name
) {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        name
      );


  if (!sheet) {

    throw new Error(
      'No existe la hoja: ' +
      name
    );
  }


  return sheet;
}
/**
 * ============================================================
 * CONSENTIMIENTOS: _consents
 * ============================================================
 *
 * data conserva el estado actual.
 * _consents conserva el historial.
 *
 * Estados usados:
 * - granted
 * - denied
 * - withdrawn
 *
 * Si una opción opcional queda vacía, se interpreta como
 * ausencia de consentimiento, pero no se crea una fila "denied".
 */


function findRowsByField(
  sheet,
  field,
  targetValue,
  normalizer
) {

  normalizer =
    normalizer ||
    function(value) {

      return String(
        value === undefined ||
        value === null
          ? ''
          : value
      )
        .trim()
        .toUpperCase();
    };


  const headers =
    getHeaders(
      sheet
    );


  const index =
    createHeaderIndex(
      headers
    );


  if (
    index[
      field.toLowerCase()
    ] ===
    undefined
  ) {

    return [];
  }


  const target =
    normalizer(
      targetValue
    );


  const values =
    sheet
      .getDataRange()
      .getValues();


  const results = [];


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const row =
      values[i];


    const value =
      normalizer(
        row[
          index[
            field.toLowerCase()
          ]
        ]
      );


    if (
      value ===
      target
    ) {

      results.push(
        rowToObject(
          headers,
          row
        )
      );
    }
  }


  return results;
}


function jsonSafeObject(
  object
) {

  const result = {};


  Object.keys(
    object
  ).forEach(
    key => {

      result[key] =
        jsonSafeValue(
          object[key]
        );
    }
  );


  return result;
}


function jsonSafeValue(
  value
) {

  if (
    value instanceof Date
  ) {

    return value
      .toISOString();
  }


  return value;
}


function sanitizeFileName(
  value
) {

  return String(
    value || 'request'
  )
    .replace(
      /[^A-Za-z0-9._-]+/g,
      '-'
    )
    .replace(
      /-+/g,
      '-'
    );
}


function escapeHtml(
  value
) {

  return String(
    value === undefined ||
    value === null
      ? ''
      : value
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}


function appendAuditNote(
  oldNotes,
  newNote
) {

  const previous =
    String(
      oldNotes || ''
    )
      .trim();


  const timestamp =
    Utilities
      .formatDate(
        new Date(),
        Session.getScriptTimeZone() ||
        'Atlantic/Canary',
        'yyyy-MM-dd HH:mm:ss'
      );


  const line =
    '[' +
    timestamp +
    '] ' +
    newNote;


  return previous
    ? previous +
      '\n' +
      line
    : line;
}


function getCurrentOperator() {

  const email =
    Session
      .getEffectiveUser()
      .getEmail();


  return email ||
    'manual';
}


/**
 * ============================================================
 * UTILIDADES GENERALES NUEVAS
 * ============================================================
 */


function getFirstExistingSheet(
  names,
  label
) {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  for (
    let i = 0;
    i < names.length;
    i++
  ) {

    const sheet =
      ss.getSheetByName(
        names[i]
      );


    if (sheet) {

      return sheet;
    }
  }


  throw new Error(
    'No existe la hoja de ' +
    label +
    '. Nombres aceptados: ' +
    names.join(', ')
  );
}


function assertRequiredHeaders(
  headers,
  required,
  sheetName
) {

  const existing =
    new Set(
      headers
        .map(
          header =>
            String(
              header
            )
              .trim()
              .toLowerCase()
        )
    );


  const missing =
    required.filter(
      header =>
        !existing.has(
          String(
            header
          )
            .trim()
            .toLowerCase()
        )
    );


  if (
    missing.length > 0
  ) {

    throw new Error(
      'Faltan columnas en ' +
      sheetName +
      ': ' +
      missing.join(', ')
    );
  }
}


function generateUniquePrefixedId(
  sheet,
  header,
  prefix,
  length
) {

  const headers =
    getHeaders(
      sheet
    );


  const index =
    headers.indexOf(
      header
    );


  if (
    index === -1
  ) {

    throw new Error(
      'No existe ' +
      header +
      ' en ' +
      sheet.getName()
    );
  }


  const lastRow =
    sheet.getLastRow();


  const existing =
    new Set(
      lastRow > 1
        ? sheet
            .getRange(
              2,
              index + 1,
              lastRow - 1,
              1
            )
            .getValues()
            .flat()
            .filter(
              Boolean
            )
            .map(
              value =>
                String(
                  value
                )
                  .trim()
                  .toUpperCase()
            )
        : []
    );


  let id;


  do {

    let suffix = '';


    for (
      let i = 0;
      i < length;
      i++
    ) {

      const position =
        Math.floor(
          Math.random() *
          CONFIG.ID_CHARS.length
        );


      suffix +=
        CONFIG.ID_CHARS[
          position
        ];
    }


    id =
      prefix +
      suffix;


  } while (
    existing.has(
      id
    )
  );


  return id;
}


function normalizeTextKey(
  value
) {

  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    );
}
