/**
 * ARCHIPIÉLAGO VIVO · LOCALIZACIONES
 */

function loadLocations() {

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


function resolveLocation(
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


  return location;
}


/**
 * ============================================================
 * ESCRIBIR DATA
 * ============================================================
 */
