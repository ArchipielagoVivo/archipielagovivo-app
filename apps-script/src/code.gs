const CONFIG = {
  FORM_SHEET: 'form_responses',
  DATA_SHEET: 'data',
  LOCATIONS_SHEET: '_locations',

  DEFAULT_LICENSE: 'Licencia desconocida',
  DEFAULT_STATUS: 'Activo',
  DEFAULT_VERIFIED: 'No',

  // Entity ID: 8 caracteres, solo mayúsculas.
  // Se eliminan caracteres fácilmente confundibles.
  ID_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  ID_LENGTH: 8
};


/**
 * ============================================================
 * ENTRADA PRINCIPAL
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
 *   1. Busca ese ID en data.
 *   2. Actualiza esa misma fila.
 *
 * IMPORTANTE:
 * -------------
 * El consentimiento NO bloquea la entrada en data.
 * data es la base maestra.
 *
 * La exportación a uMap decidirá posteriormente
 * qué registros/campos puede publicar.
 */
function onFormSubmit(e) {

  try {

    // ----------------------------------------------------------
    // 1. Validar evento
    // ----------------------------------------------------------

    if (!e || !e.range || !e.namedValues) {

      throw new Error(
        'El activador debe ser "Al enviar formulario" ' +
        'desde la hoja de cálculo.'
      );
    }


    console.log(
      'RESPUESTA RECIBIDA: ' +
      JSON.stringify(e.namedValues)
    );


    // ----------------------------------------------------------
    // 2. Obtener hoja y fila REAL
    // ----------------------------------------------------------

    const formSheet =
      e.range.getSheet();

    const responseRow =
      e.range.getRow();


    console.log(
      'HOJA FORMULARIO: ' +
      formSheet.getName()
    );

    console.log(
      'FILA FORMULARIO: ' +
      responseRow
    );


    // ----------------------------------------------------------
    // 3. Comprobar hoja correcta
    // ----------------------------------------------------------

    if (
      formSheet.getName() !==
      CONFIG.FORM_SHEET
    ) {

      throw new Error(
        'El evento procede de "' +
        formSheet.getName() +
        '" y no de "' +
        CONFIG.FORM_SHEET +
        '".'
      );
    }


    // ----------------------------------------------------------
    // 4. Leer la fila REAL de la hoja
    // ----------------------------------------------------------
    //
    // No dependemos exclusivamente de e.namedValues.
    // Leemos directamente la fila que Google acaba de escribir.
    //

    SpreadsheetApp.flush();

    const response =
      readFormResponseRow(
        formSheet,
        responseRow
      );


    console.log(
      'RESPUESTA NORMALIZADA: ' +
      JSON.stringify(response)
    );


    // ----------------------------------------------------------
    // 5. Hoja DATA
    // ----------------------------------------------------------

    const dataSheet =
      getSheet(
        CONFIG.DATA_SHEET
      );


    // ----------------------------------------------------------
    // 6. Localización
    // ----------------------------------------------------------

    console.log(
      'LOCATION: "' +
      response.location +
      '"'
    );

    const locations =
      loadLocations();

    const location =
      resolveLocation(
        response.location,
        locations
      );


    console.log(
      'LOCALIZACIÓN RESUELTA: ' +
      JSON.stringify(location)
    );


    // ----------------------------------------------------------
    // 7. Consentimiento efectivo
    // ----------------------------------------------------------

    const effectiveConsent =
      getEffectivePublicationConsent(
        response
      );

    console.log(
      'CONSENTIMIENTO EFECTIVO: "' +
      effectiveConsent +
      '"'
    );


    // ----------------------------------------------------------
    // 8. NUEVA INSCRIPCIÓN
    // ----------------------------------------------------------

    if (
      !response.entity_id
    ) {

      const entityId =
        generateUniqueEntityId(
          dataSheet
        );


      // Escribir ID en form_responses
      writeEntityIdToFormResponse(
        formSheet,
        responseRow,
        entityId
      );


      response.entity_id =
        entityId;


      // Crear DATA
      createDataRecord(
        dataSheet,
        response,
        location
      );


      console.log(
        'NUEVA INSCRIPCIÓN CREADA: ' +
        entityId
      );

      return;
    }


    // ----------------------------------------------------------
    // 9. ACTUALIZACIÓN
    // ----------------------------------------------------------

    updateDataRecord(
      dataSheet,
      response,
      location
    );


    console.log(
      'ACTUALIZACIÓN COMPLETADA: ' +
      response.entity_id
    );


  } catch (error) {

    console.error(
      'ERROR EN onFormSubmit: ' +
      error.message
    );

    console.error(
      error.stack
    );

    throw error;
  }
}


/**
 * ============================================================
 * LEER FILA REAL DEL FORMULARIO
 * ============================================================
 */
function readFormResponseRow(
  sheet,
  rowNumber
) {

  const headers =
    getHeaders(sheet);

  const values =
    sheet
      .getRange(
        rowNumber,
        1,
        1,
        headers.length
      )
      .getValues()[0];


  const rowData = {};


  headers.forEach(
    (header, index) => {

      rowData[header] =
        values[index];

    }
  );


  console.log(
    'FILA REAL LEÍDA: ' +
    JSON.stringify(rowData)
  );


  return normaliseFormResponse(
    rowData
  );
}


/**
 * ============================================================
 * NORMALIZAR FORMULARIO
 * ============================================================
 */
function normaliseFormResponse(
  values
) {

  const get = (
    name
  ) => {

    const value =
      values[name];


    if (
      value === undefined ||
      value === null
    ) {

      return '';
    }


    if (
      Array.isArray(value)
    ) {

      return value
        .join(', ')
        .trim();
    }


    return String(value)
      .trim();
  };


  return {

    timestamp:
      get('Timestamp'),

    email_address:
      get('Email address'),


    // --------------------------------------------------------
    // IDENTIDAD
    // --------------------------------------------------------

    contributor_creator:
      get('contributor_creator'),

    registration_type:
      get('registration_type'),

    name_individual:
      get('name_individual'),

    name_entity:
      get('name_entity'),

    entity_id:
      get('entity_id'),


    // --------------------------------------------------------
    // ACTIVIDAD
    // --------------------------------------------------------

    format:
      get('format'),

    mission:
      get('mission'),

    description:
      get('description'),

    location:
      get('location'),

    category:
      get('category'),

    tags:
      get('tags'),

    activity:
      get('activity'),

    audience:
      get('audience'),

    territory:
      get('territory'),

    founded:
      get('founded'),


    // --------------------------------------------------------
    // CONTACTO
    // --------------------------------------------------------

    url:
      get('url'),

    phone:
      get('phone'),

    email_public:
      get('email_public'),

    img:
      get('img'),


    // --------------------------------------------------------
    // REDES
    // --------------------------------------------------------

    instagram:
      get('instagram'),

    facebook:
      get('facebook'),

    bsky:
      get('bsky'),

    linkedin:
      get('linkedin'),

    mastodon:
      get('mastodon'),

    pixelfed:
      get('pixelfed'),

    telegram:
      get('telegram'),

    threads:
      get('threads'),

    tiktok:
      get('tiktok'),

    whatsapp:
      get('whatsapp'),

    x:
      get('x'),

    youtube:
      get('youtube'),


    // --------------------------------------------------------
    // NECESIDADES / OFERTAS
    // --------------------------------------------------------

    needs:
      get('needs'),

    offers:
      get('offers'),


    // --------------------------------------------------------
    // PRIVACIDAD
    // --------------------------------------------------------

    private_fields:
      get('private_fields'),


    // --------------------------------------------------------
    // CONSENTIMIENTOS
    // --------------------------------------------------------

    consent_accuracy:
      get('consent_accuracy'),

    consent_publication:
      get('consent_publication'),

    consent_contact:
      get('consent_contact'),

    consent_whatsapp:
      get('consent_whatsapp'),

    consent_newsletter:
      get('consent_newsletter'),

    re_consent_publication:
      get('re_consent_publication')
  };
}


/**
 * ============================================================
 * CONSENTIMIENTO EFECTIVO
 * ============================================================
 *
 * La lógica es:
 *
 * Sí + vacío  → Sí
 * No + Sí     → Sí
 * No + No     → No
 *
 * La segunda pregunta solo aparece si la primera
 * fue negativa.
 */
function getEffectivePublicationConsent(
  response
) {

  const first =
    String(
      response.consent_publication || ''
    ).trim();


  const second =
    String(
      response.re_consent_publication || ''
    ).trim();


  if (
    isYes(first)
  ) {

    return first;
  }


  if (
    isYes(second)
  ) {

    return second;
  }


  if (
    isNo(second)
  ) {

    return second;
  }


  return first;
}


/**
 * Comprueba respuesta afirmativa.
 */
function isYes(value) {

  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();


  return (
    normalized === 'sí' ||
    normalized === 'si' ||
    normalized.startsWith('sí,') ||
    normalized.startsWith('si,')
  );
}


/**
 * Comprueba respuesta negativa.
 */
function isNo(value) {

  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();


  return (
    normalized === 'no' ||
    normalized.startsWith('no,')
  );
}


/**
 * ============================================================
 * CREAR REGISTRO
 * ============================================================
 */
function createDataRecord(
  dataSheet,
  response,
  location
) {

  const now =
    new Date();


  const record =
    buildDataRecord(
      response,
      location,
      now,
      now,
      null
    );


  appendDataRecord(
    dataSheet,
    record
  );


  console.log(
    'REGISTRO CREADO EN DATA: ' +
    response.entity_id
  );
}


/**
 * ============================================================
 * ACTUALIZAR REGISTRO
 * ============================================================
 */
function updateDataRecord(
  dataSheet,
  response,
  location
) {

  const entityId =
    String(
      response.entity_id
    ).trim();


  if (!entityId) {

    throw new Error(
      'La respuesta indica actualización ' +
      'pero entity_id está vacío.'
    );
  }


  const headers =
    getHeaders(dataSheet);


  const entityIdIndex =
    headers.indexOf(
      'entity_id'
    );


  if (
    entityIdIndex === -1
  ) {

    throw new Error(
      'No existe entity_id en data.'
    );
  }


  const lastRow =
    dataSheet.getLastRow();


  if (
    lastRow < 2
  ) {

    throw new Error(
      'No existen registros en data.'
    );
  }


  const ids =
    dataSheet
      .getRange(
        2,
        entityIdIndex + 1,
        lastRow - 1,
        1
      )
      .getValues()
      .flat()
      .map(
        value =>
          String(value).trim()
      );


  const position =
    ids.indexOf(
      entityId
    );


  if (
    position === -1
  ) {

    throw new Error(
      'No existe en data el entity_id: ' +
      entityId
    );
  }


  const rowNumber =
    position + 2;


  // ----------------------------------------------------------
  // Registro anterior
  // ----------------------------------------------------------

  const oldRow =
    dataSheet
      .getRange(
        rowNumber,
        1,
        1,
        headers.length
      )
      .getValues()[0];


  const oldRecord =
    rowToObject(
      headers,
      oldRow
    );


  // ----------------------------------------------------------
  // Fechas
  // ----------------------------------------------------------

  const dateCreated =
    oldRecord.date_created ||
    new Date();


  const dateRevised =
    new Date();


  // ----------------------------------------------------------
  // Crear nuevo estado
  // ----------------------------------------------------------

  const record =
    buildDataRecord(
      response,
      location,
      dateCreated,
      dateRevised,
      oldRecord
    );


  // ----------------------------------------------------------
  // Escribir respetando columnas de DATA
  // ----------------------------------------------------------

  const newRow =
    headers.map(
      header => {

        if (
          record[header] !== undefined
        ) {

          return record[header];
        }


        if (
          oldRecord[header] !== undefined
        ) {

          return oldRecord[header];
        }


        return '';
      }
    );


  dataSheet
    .getRange(
      rowNumber,
      1,
      1,
      headers.length
    )
    .setValues([
      newRow
    ]);


  console.log(
    'REGISTRO ACTUALIZADO EN DATA: ' +
    entityId
  );
}


/**
 * ============================================================
 * CONSTRUIR REGISTRO DATA
 * ============================================================
 */
function buildDataRecord(
  response,
  location,
  dateCreated,
  dateRevised,
  oldRecord
) {

  oldRecord =
    oldRecord || {};


  // ----------------------------------------------------------
  // NOMBRE
  // ----------------------------------------------------------
  //
  // Si format está vacío:
  // → persona.
  //
  // Esto permite que los registros individuales
  // no necesiten format.
  //

  let name;


  if (
    response.format
  ) {

    if (
      response.registration_type ===
      'En mi propio nombre'
    ) {

      name =
        response.name_individual;

    } else {

      name =
        response.name_entity;
    }

  } else {

    name =
      response.name_individual ||
      response.name_entity;
  }


  // ----------------------------------------------------------
  // CAMPOS PRIVADOS
  // ----------------------------------------------------------

  const privateFields =
    parsePrivateFields(
      response.private_fields
    );


  // ----------------------------------------------------------
  // LICENCIA / ESTADO / VERIFICACIÓN
  // ----------------------------------------------------------

  const license =
    oldRecord.license ||
    CONFIG.DEFAULT_LICENSE;


  const verified =
    oldRecord.verified ||
    CONFIG.DEFAULT_VERIFIED;


  const status =
    oldRecord.status ||
    CONFIG.DEFAULT_STATUS;


  return {

    // --------------------------------------------------------
    // IDENTIDAD
    // --------------------------------------------------------

    entity_id:
      response.entity_id,

    name:
      name,

    name_private:
      isPrivate(
        privateFields,
        'Nombre'
      ),


    // --------------------------------------------------------
    // TIPO / CATEGORÍA
    // --------------------------------------------------------

    format:
      response.format,

    format_private:
      isPrivate(
        privateFields,
        'Tipo de entidad o proyecto'
      ),


    category:
      response.category,

    category_private:
      isPrivate(
        privateFields,
        'Categoría'
      ),


    // --------------------------------------------------------
    // CONTENIDO
    // --------------------------------------------------------

    tags:
      response.tags,

    tags_private:
      isPrivate(
        privateFields,
        'Etiquetas'
      ),


    mission:
      response.mission,

    mission_private:
      isPrivate(
        privateFields,
        'Misión'
      ),


    description:
      response.description,

    description_private:
      isPrivate(
        privateFields,
        'Descripción'
      ),


    // --------------------------------------------------------
    // UBICACIÓN
    // --------------------------------------------------------
    //
    // DATA conserva siempre la localización real.
    //
    // location_private = TRUE
    // significa que la exportación pública NO debe utilizar
    // esa ubicación.
    //
    // En la exportación a uMap se sustituirá por Canarias.
    //

    island:
      location.island,

    municipality:
      location.municipality,

    lon:
      location.lon,

    lat:
      location.lat,

    location_private:
      isPrivate(
        privateFields,
        'Ubicación'
      ),


    // --------------------------------------------------------
    // ACTIVIDAD
    // --------------------------------------------------------

    activity:
      response.activity,

    activity_private:
      isPrivate(
        privateFields,
        'Actividades'
      ),


    // --------------------------------------------------------
    // PÚBLICO
    // --------------------------------------------------------

    audience:
      response.audience,

    audience_private:
      isPrivate(
        privateFields,
        'Público'
      ),


    // --------------------------------------------------------
    // TERRITORIO
    // --------------------------------------------------------

    territory:
      response.territory,

    territory_private:
      isPrivate(
        privateFields,
        'Ámbito territorial'
      ),


    // --------------------------------------------------------
    // AÑO DE INICIO
    // --------------------------------------------------------

    founded:
      response.founded,

    founded_private:
      isPrivate(
        privateFields,
        'Año de inicio'
      ),


    // --------------------------------------------------------
    // NECESIDADES / OFERTAS
    // --------------------------------------------------------

    needs:
      response.needs,

    needs_private:
      isPrivate(
        privateFields,
        'Necesidades'
      ),


    offers:
      response.offers,

    offers_private:
      isPrivate(
        privateFields,
        'Ofertas'
      ),


    // --------------------------------------------------------
    // LICENCIA
    // --------------------------------------------------------

    license:
      license,


    // --------------------------------------------------------
    // IMAGEN
    // --------------------------------------------------------

    img:
      response.img,

    img_private:
      isPrivate(
        privateFields,
        'Imagen'
      ),


    // --------------------------------------------------------
    // WEB
    // --------------------------------------------------------

    url:
      response.url,

    url_private:
      isPrivate(
        privateFields,
        'Página web'
      ),


    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    email:
      response.email_public,

    email_private:
      isPrivate(
        privateFields,
        'Correo Electrónico'
      ),


    // --------------------------------------------------------
    // TELÉFONO
    // --------------------------------------------------------

    phone:
      response.phone,

    phone_private:
      isPrivate(
        privateFields,
        'Teléfono'
      ),


    // --------------------------------------------------------
    // REDES
    // --------------------------------------------------------

    instagram:
      response.instagram,

    instagram_private:
      isPrivate(
        privateFields,
        'Instagram'
      ),


    facebook:
      response.facebook,

    facebook_private:
      isPrivate(
        privateFields,
        'Facebook'
      ),


    bsky:
      response.bsky,

    bsky_private:
      isPrivate(
        privateFields,
        'Bluesky'
      ),


    linkedin:
      response.linkedin,

    linkedin_private:
      isPrivate(
        privateFields,
        'LinkedIn'
      ),


    mastodon:
      response.mastodon,

    mastodon_private:
      isPrivate(
        privateFields,
        'Mastodon'
      ),


    pixelfed:
      response.pixelfed,

    pixelfed_private:
      isPrivate(
        privateFields,
        'Pixelfed'
      ),


    telegram:
      response.telegram,

    telegram_private:
      isPrivate(
        privateFields,
        'Telegram'
      ),


    threads:
      response.threads,

    threads_private:
      isPrivate(
        privateFields,
        'Threads'
      ),


    tiktok:
      response.tiktok,

    tiktok_private:
      isPrivate(
        privateFields,
        'TikTok'
      ),


    whatsapp:
      response.whatsapp,

    whatsapp_private:
      isPrivate(
        privateFields,
        'WhatsApp'
      ),


    x:
      response.x,

    x_private:
      isPrivate(
        privateFields,
        'X'
      ),


    youtube:
      response.youtube,

    youtube_private:
      isPrivate(
        privateFields,
        'YouTube'
      ),


    // --------------------------------------------------------
    // ORIGEN
    // --------------------------------------------------------

    source:
      oldRecord.source ||
      'Formulario de inscripción',


    source_reference:
      oldRecord.source_reference ||
      response.timestamp,


    // --------------------------------------------------------
    // ESTADO INTERNO
    // --------------------------------------------------------

    verified:
      verified,

    status:
      status,


    // --------------------------------------------------------
    // CONTRIBUYENTE
    // --------------------------------------------------------

    contributor_creator:
      response.contributor_creator,


    contributor_email:
      response.email_address,


    // --------------------------------------------------------
    // FECHAS
    // --------------------------------------------------------

    date_created:
      dateCreated,


    contributor_revision:
      response.contributor_creator,


    date_revised:
      dateRevised,


    // --------------------------------------------------------
    // CONSENTIMIENTOS
    // --------------------------------------------------------
    //
    // IMPORTANTE:
    // Estos datos SÍ entran en DATA.
    //
    // No se utiliza aquí para bloquear el registro.
    //

    consent_publication:
      getEffectivePublicationConsent(
        response
      ),

    consent_accuracy:
      response.consent_accuracy,

    consent_contact:
      response.consent_contact,

    consent_whatsapp:
      response.consent_whatsapp,

    consent_newsletter:
      response.consent_newsletter
  };
}


/**
 * ============================================================
 * PRIVATE FIELDS
 * ============================================================
 */
function parsePrivateFields(
  value
) {

  if (!value) {
    return [];
  }


  return String(value)
    .split(',')
    .map(
      item =>
        item
          .trim()
          .toLowerCase()
    )
    .filter(Boolean);
}


/**
 * Comprueba si un campo está seleccionado como privado.
 */
function isPrivate(
  privateFields,
  label
) {

  return privateFields.includes(
    String(label)
      .trim()
      .toLowerCase()
  );
}


/**
 * ============================================================
 * ESCRIBIR ENTITY_ID EN FORM_RESPONSES
 * ============================================================
 */
function writeEntityIdToFormResponse(
  sheet,
  row,
  entityId
) {

  const headers =
    getHeaders(sheet);


  const columnIndex =
    headers.indexOf(
      'entity_id'
    );


  if (
    columnIndex === -1
  ) {

    throw new Error(
      'No existe la columna entity_id en ' +
      sheet.getName()
    );
  }


  sheet
    .getRange(
      row,
      columnIndex + 1
    )
    .setValue(
      entityId
    );


  console.log(
    'ENTITY_ID ESCRITO EN FORM_RESPONSES: ' +
    entityId
  );
}


/**
 * ============================================================
 * LOCALIZACIONES
 * ============================================================
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
function appendDataRecord(
  sheet,
  record
) {

  const headers =
    getHeaders(sheet);


  const row =
    headers.map(
      header => {

        if (
          record[header] !== undefined
        ) {

          return record[header];
        }


        return '';
      }
    );


  sheet.appendRow(row);
}


/**
 * ============================================================
 * GENERAR ENTITY_ID
 * ============================================================
 */
function generateUniqueEntityId(
  sheet
) {

  const headers =
    getHeaders(sheet);


  const index =
    headers.indexOf(
      'entity_id'
    );


  if (
    index === -1
  ) {

    throw new Error(
      'No existe entity_id en data.'
    );
  }


  const lastRow =
    sheet.getLastRow();


  const existingIds =
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
          .filter(Boolean)
          .map(
            value =>
              String(value)
                .trim()
                .toUpperCase()
          )
      : [];


  const existing =
    new Set(existingIds);


  let id;


  do {

    id = '';


    for (
      let i = 0;
      i < CONFIG.ID_LENGTH;
      i++
    ) {

      const position =
        Math.floor(
          Math.random() *
          CONFIG.ID_CHARS.length
        );


      id +=
        CONFIG.ID_CHARS[
          position
        ];
    }

  } while (
    existing.has(id)
  );


  return id;
}


/**
 * ============================================================
 * CABECERAS
 * ============================================================
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
      .getSheetByName(name);


  if (!sheet) {

    throw new Error(
      'No existe la hoja: ' +
      name
    );
  }


  return sheet;
}
