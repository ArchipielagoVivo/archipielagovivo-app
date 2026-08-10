/**
 * ARCHIPIÉLAGO VIVO · LOCALIZACIONES
 */

function avLoadLocations_() {

  const sheet =
    getSheet(
      CONFIG.LOCATIONS_SHEET
    );


  const values =
    sheet
      .getDataRange()
      .getValues();


  if (
    values.length === 0
  ) {

    throw new Error(
      '_locations está vacía.'
    );
  }


  const headers =
    values[0]
      .map(
        h =>
          String(h).trim()
      );


  const index =
    createHeaderIndex(
      headers
    );


  const locations = [];


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const row =
      values[i];


    const label =
      getCell(
        row,
        index,
        '_location_label'
      );


    if (!label) {
      continue;
    }


    locations.push({

      label:
        String(label).trim(),

      municipality:
        getCell(
          row,
          index,
          '_municipalities'
        ),

      island:
        getCell(
          row,
          index,
          '_islands'
        ),

      archipelago:
        getCell(
          row,
          index,
          '_archipelago'
        ),

      lon:
        getCell(
          row,
          index,
          '_lon'
        ),

      lat:
        getCell(
          row,
          index,
          '_lat'
        ),

      type:
        getCell(
          row,
          index,
          '_type'
        )
    });
  }


  return locations;
}


/**
 * ============================================================
 * RESOLVER LOCALIZACIÓN
 * ============================================================
 */


function avResolveLocation_(
  locationValue,
  locations
) {

  const target =
    String(
      locationValue || ''
    )
      .trim()
      .toLowerCase();


  if (!target) {

    throw new Error(
      'La localización está vacía.'
    );
  }


  const location =
    locations.find(
      item =>
        String(item.label)
          .trim()
          .toLowerCase() ===
        target
    );


  if (!location) {

    throw new Error(
      'No se encontró la localización: ' +
      locationValue
    );
  }


  return avNormalizeResolvedLocation_(
    location
  );
}


function avNormalizeResolvedLocation_(
  location
) {

  const type =
    String(
      location.type || ''
    )
      .trim()
      .toLowerCase();


  const label =
    String(
      location.label || ''
    )
      .trim();


  const archipelago =
    String(
      location.archipelago || ''
    )
      .trim();


  let island =
    String(
      location.island || ''
    )
      .trim();


  let municipality =
    String(
      location.municipality || ''
    )
      .trim();


  /*
   * _locations modela tres niveles:
   *
   * archipelago:
   *   _archipelago = Canarias
   *   _islands     = vacío
   *   _municipalities = vacío
   *
   * island:
   *   _islands     = nombre de isla
   *   _municipalities = vacío
   *
   * municipality:
   *   _islands     = isla
   *   _municipalities = municipio
   *
   * DATA necesita siempre un valor en `island` porque ese campo
   * determina la capa pública de uMap. Por eso, para el nivel
   * archipelago, `island` toma el valor de `_archipelago`.
   */

  if (
    type === 'archipelago'
  ) {

    island =
      archipelago ||
      label;

    municipality =
      '';

  } else if (
    type === 'island'
  ) {

    island =
      island ||
      label;

    municipality =
      '';

  } else if (
    type === 'municipality'
  ) {

    if (!island) {

      throw new Error(
        'Localización municipal "' +
        label +
        '" sin _islands en _locations.'
      );
    }


    if (!municipality) {

      throw new Error(
        'Localización municipal "' +
        label +
        '" sin _municipalities en _locations.'
      );
    }

  } else {

    /*
     * Compatibilidad defensiva con posibles filas antiguas.
     */

    if (
      !island &&
      archipelago
    ) {

      island =
        archipelago;
    }
  }


  if (!island) {

    throw new Error(
      'La localización "' +
      label +
      '" no permite determinar island/capa pública.'
    );
  }


  return {
    label:
      label,

    municipality:
      municipality,

    island:
      island,

    archipelago:
      archipelago,

    lon:
      location.lon,

    lat:
      location.lat,

    type:
      location.type
  };
}


/**
 * ============================================================
 * ESCRIBIR DATA
 * ============================================================
 */


/**
 * ============================================================
 * REPARAR LOCALIZACIONES DE DATA DESDE LAS FUENTES
 * ============================================================
 *
 * No reconstruye toda DATA.
 * Solo recalcula:
 * - island
 * - municipality
 * - lon
 * - lat
 *
 * Fuente:
 * 1. location actual de form_responses
 * 2. si existe una operación _manual procesada con location,
 *    la última de esas operaciones prevalece.
 */


function repairDataLocationsFromSources() {

  const ui =
    SpreadsheetApp
      .getUi();


  const dataSheet =
    getSheet(
      CONFIG.DATA_SHEET
    );


  const formSheet =
    getSheet(
      CONFIG.FORM_SHEET
    );


  const manualSheet =
    getSheet(
      CONFIG.MANUAL_SHEET
    );


  const locations =
    avLoadLocations_();


  const sourceLocationByEntity =
    {};


  /*
   * FORM_RESPONSES
   */

  for (
    let rowNumber = 2;
    rowNumber <= formSheet.getLastRow();
    rowNumber++
  ) {

    const response =
      readFormResponseRow(
        formSheet,
        rowNumber
      );


    const entityId =
      String(
        response.entity_id || ''
      )
        .trim()
        .toUpperCase();


    const sourceLocation =
      String(
        response.location || ''
      )
        .trim();


    if (
      entityId &&
      sourceLocation
    ) {

      sourceLocationByEntity[
        entityId
      ] =
        sourceLocation;
    }
  }


  /*
   * _MANUAL
   *
   * Solo las operaciones procesadas forman parte del estado real.
   * Al recorrer de arriba abajo, la última location manual gana.
   */

  const manualHeaders =
    getHeaders(
      manualSheet
    );


  for (
    let rowNumber = 2;
    rowNumber <= manualSheet.getLastRow();
    rowNumber++
  ) {

    const values =
      manualSheet
        .getRange(
          rowNumber,
          1,
          1,
          manualHeaders.length
        )
        .getValues()[0];


    const input =
      rowToObject(
        manualHeaders,
        values
      );


    if (
      !isProcessed(
        input.processed
      )
    ) {

      continue;
    }


    const entityId =
      String(
        input.entity_id || ''
      )
        .trim()
        .toUpperCase();


    const sourceLocation =
      String(
        input.location || ''
      )
        .trim();


    if (
      entityId &&
      sourceLocation
    ) {

      sourceLocationByEntity[
        entityId
      ] =
        sourceLocation;
    }
  }


  const dataHeaders =
    getHeaders(
      dataSheet
    );


  const requiredHeaders = [
    'entity_id',
    'island',
    'municipality',
    'lon',
    'lat'
  ];


  requiredHeaders
    .forEach(
      header => {

        if (
          dataHeaders.indexOf(
            header
          ) === -1
        ) {

          throw new Error(
            'Falta la columna "' +
            header +
            '" en DATA.'
          );
        }
      }
    );


  const entityIndex =
    dataHeaders.indexOf(
      'entity_id'
    );


  const islandIndex =
    dataHeaders.indexOf(
      'island'
    );


  const municipalityIndex =
    dataHeaders.indexOf(
      'municipality'
    );


  const lonIndex =
    dataHeaders.indexOf(
      'lon'
    );


  const latIndex =
    dataHeaders.indexOf(
      'lat'
    );


  let repaired = 0;
  let skipped = 0;
  const errors = [];


  for (
    let rowNumber = 2;
    rowNumber <= dataSheet.getLastRow();
    rowNumber++
  ) {

    const entityId =
      String(
        dataSheet
          .getRange(
            rowNumber,
            entityIndex + 1
          )
          .getValue() || ''
      )
        .trim()
        .toUpperCase();


    if (!entityId) {

      continue;
    }


    const sourceLocation =
      sourceLocationByEntity[
        entityId
      ];


    if (!sourceLocation) {

      skipped++;

      continue;
    }


    try {

      const resolved =
        avResolveLocation_(
          sourceLocation,
          locations
        );


      dataSheet
        .getRange(
          rowNumber,
          islandIndex + 1
        )
        .setValue(
          resolved.island
        );


      dataSheet
        .getRange(
          rowNumber,
          municipalityIndex + 1
        )
        .setValue(
          resolved.municipality
        );


      dataSheet
        .getRange(
          rowNumber,
          lonIndex + 1
        )
        .setValue(
          resolved.lon
        );


      dataSheet
        .getRange(
          rowNumber,
          latIndex + 1
        )
        .setValue(
          resolved.lat
        );


      repaired++;


    } catch (error) {

      errors.push(
        entityId +
        ': ' +
        error.message
      );
    }
  }


  SpreadsheetApp.flush();


  let message =
    'Reparación de localizaciones completada.\n\n' +
    'Fichas reparadas: ' +
    repaired +
    '\n' +
    'Sin location en las fuentes: ' +
    skipped +
    '\n' +
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
          10
        )
        .join(
          '\n'
        );
  }


  ui.alert(
    message
  );


  return {
    repaired:
      repaired,

    skipped:
      skipped,

    errors:
      errors
  };
}
