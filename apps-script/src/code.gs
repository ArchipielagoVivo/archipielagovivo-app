const CONFIG = {
  FORM_SHEET: 'form_responses',
  MANUAL_SHEET: '_manual',
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
 * MENÚ
 * ============================================================
 */

function onOpen() {

  SpreadsheetApp.getUi()
    .createMenu('Archipiélago Vivo')
    .addItem(
      'Procesar _manual',
      'processManual'
    )
    .addSeparator()
    .addItem(
      'Procesar fila manual seleccionada',
      'processSelectedManualRow'
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

function onFormSubmit(e) {

  try {

    if (
      !e ||
      !e.range ||
      !e.namedValues
    ) {

      throw new Error(
        'El activador debe ser "Al enviar formulario" ' +
        'desde la hoja de cálculo.'
      );
    }


    console.log(
      'RESPUESTA RECIBIDA: ' +
      JSON.stringify(e.namedValues)
    );


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


    /*
     * Leemos directamente la fila real.
     *
     * Esto es importante porque en algunas actualizaciones
     * e.namedValues no contiene correctamente todos los datos.
     */

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


    const dataSheet =
      getSheet(
        CONFIG.DATA_SHEET
      );


    /*
     * Localización
     */

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


    /*
     * Consentimiento efectivo
     */

    const effectiveConsent =
      getEffectivePublicationConsent(
        response
      );


    console.log(
      'CONSENTIMIENTO EFECTIVO: "' +
      effectiveConsent +
      '"'
    );


    /*
     * NUEVO REGISTRO
     */

    if (
      !response.entity_id
    ) {

      const entityId =
        generateUniqueEntityId(
          dataSheet
        );


      /*
       * Escribir entity_id en form_responses.
       */

      writeEntityIdToFormResponse(
        formSheet,
        responseRow,
        entityId
      );


      response.entity_id =
        entityId;


      /*
       * Crear registro.
       */

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


    /*
     * ACTUALIZACIÓN
     */

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

    url:
      get('url'),

    phone:
      get('phone'),

    email_public:
      get('email_public'),

    img:
      get('img'),

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

    needs:
      get('needs'),

    offers:
      get('offers'),

    private_fields:
      get('private_fields'),

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
 * Sí + vacío  → Sí
 * No + Sí     → Sí
 * No + No     → No
 *
 * La segunda pregunta solo aparece si
 * la primera fue negativa.
 */

function getEffectivePublicationConsent(
  response
) {

  const first =
    String(
      response.consent_publication || ''
    )
      .trim();


  const second =
    String(
      response.re_consent_publication || ''
    )
      .trim();


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
 * CREAR REGISTRO EN DATA
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
 * ACTUALIZAR REGISTRO EN DATA
 * ============================================================
 *
 * Usado por FORMULARIO.
 *
 * Como el formulario contiene todos los campos,
 * los vacíos también se consideran valores reales.
 */

function updateDataRecord(
  dataSheet,
  response,
  location
) {

  const entityId =
    String(
      response.entity_id
    )
      .trim()
      .toUpperCase();


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
          String(value)
            .trim()
            .toUpperCase()
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


  const dateCreated =
    oldRecord.date_created ||
    new Date();


  const dateRevised =
    new Date();


  const record =
    buildDataRecord(
      response,
      location,
      dateCreated,
      dateRevised,
      oldRecord
    );


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


  /*
   * NOMBRE
   *
   * Formulario:
   * - "En mi propio nombre" → name_individual
   * - entidad → name_entity
   *
   * Si format está vacío, se considera persona.
   */

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


  /*
   * PRIVACIDAD
   */

  const privateFields =
    parsePrivateFields(
      response.private_fields
    );


  /*
   * Valores internos.
   *
   * Si proceden de DATA se conservan.
   */

  const license =
    response.license ||
    oldRecord.license ||
    CONFIG.DEFAULT_LICENSE;


  const verified =
    response.verified ||
    oldRecord.verified ||
    CONFIG.DEFAULT_VERIFIED;


  const status =
    response.status ||
    oldRecord.status ||
    CONFIG.DEFAULT_STATUS;


  return {

    entity_id:
      String(
        response.entity_id || ''
      )
        .trim()
        .toUpperCase(),


    name:
      name,

    name_private:
      isPrivate(
        privateFields,
        'Nombre'
      ),


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


    /*
     * LOCALIZACIÓN
     */

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


    activity:
      response.activity,

    activity_private:
      isPrivate(
        privateFields,
        'Actividades'
      ),


    audience:
      response.audience,

    audience_private:
      isPrivate(
        privateFields,
        'Público'
      ),


    territory:
      response.territory,

    territory_private:
      isPrivate(
        privateFields,
        'Ámbito territorial'
      ),


    founded:
      response.founded,

    founded_private:
      isPrivate(
        privateFields,
        'Año de inicio'
      ),


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


    license:
      license,


    img:
      response.img,

    img_private:
      isPrivate(
        privateFields,
        'Imagen'
      ),


    url:
      response.url,

    url_private:
      isPrivate(
        privateFields,
        'Página web'
      ),


    email:
      response.email_public,

    email_private:
      isPrivate(
        privateFields,
        'Correo Electrónico'
      ),


    phone:
      response.phone,

    phone_private:
      isPrivate(
        privateFields,
        'Teléfono'
      ),


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


    /*
     * ORIGEN
     */

    source:
      response.source ||
      oldRecord.source ||
      'Formulario de inscripción',


    source_reference:
      response.source_reference ||
      oldRecord.source_reference ||
      response.timestamp,


    /*
     * ESTADO
     */

    verified:
      verified,

    status:
      status,


    /*
     * CONTRIBUYENTE
     */

    contributor_creator:
      response.contributor_creator,

    contributor_email:
      response.email_address ||
      response.contributor_email ||
      oldRecord.contributor_email ||
      '',


    /*
     * FECHAS
     */

    date_created:
      dateCreated,

    contributor_revision:
      response.contributor_creator ||
      oldRecord.contributor_revision ||
      '',

    date_revised:
      dateRevised,


    /*
     * CONSENTIMIENTOS
     *
     * Siempre se guardan en DATA.
     */

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
 * PROCESAMIENTO DE _MANUAL
 * ============================================================
 *
 * _manual tiene:
 *
 * manual_id
 * processed
 * processed_at
 * processing_result
 * entity_id
 * ...
 *
 * Si entity_id está vacío:
 * → crea.
 *
 * Si entity_id existe:
 * → actualiza.
 *
 * Un campo vacío NO modifica DATA.
 *
 * clear_fields permite borrar explícitamente.
 */

function processManual() {

  const sheet =
    getSheet(
      CONFIG.MANUAL_SHEET
    );


  const dataSheet =
    getSheet(
      CONFIG.DATA_SHEET
    );


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    SpreadsheetApp.getUi()
      .alert(
        'No hay registros en _manual.'
      );

    return;
  }


  let processedCount = 0;
  let errorCount = 0;


  for (
    let rowNumber = 2;
    rowNumber <= lastRow;
    rowNumber++
  ) {

    try {

      const result =
        processManualRow(
          sheet,
          dataSheet,
          rowNumber
        );


      if (result) {
        processedCount++;
      }


    } catch (error) {

      errorCount++;


      console.error(
        'ERROR EN _manual fila ' +
        rowNumber +
        ': ' +
        error.message
      );


      markManualError(
        sheet,
        rowNumber,
        error
      );
    }
  }


  SpreadsheetApp.getUi()
    .alert(
      'Procesamiento de _manual completado.\n\n' +
      'Procesados: ' +
      processedCount +
      '\n' +
      'Errores: ' +
      errorCount
    );
}


/**
 * ============================================================
 * PROCESAR FILA MANUAL SELECCIONADA
 * ============================================================
 */

function processSelectedManualRow() {

  const sheet =
    getSheet(
      CONFIG.MANUAL_SHEET
    );


  const dataSheet =
    getSheet(
      CONFIG.DATA_SHEET
    );


  const rowNumber =
    sheet.getActiveCell()
      .getRow();


  if (
    rowNumber < 2
  ) {

    SpreadsheetApp.getUi()
      .alert(
        'Selecciona una fila de datos de _manual.'
      );

    return;
  }


  try {

    const processed =
      processManualRow(
        sheet,
        dataSheet,
        rowNumber
      );


    if (processed) {

      SpreadsheetApp.getUi()
        .alert(
          'Fila _manual procesada correctamente.'
        );

    }

  } catch (error) {

    markManualError(
      sheet,
      rowNumber,
      error
    );


    SpreadsheetApp.getUi()
      .alert(
        'Error:\n\n' +
        error.message
      );


    throw error;
  }
}


/**
 * ============================================================
 * PROCESAR UNA FILA DE _MANUAL
 * ============================================================
 */

function processManualRow(
  manualSheet,
  dataSheet,
  rowNumber
) {

  const headers =
    getHeaders(
      manualSheet
    );


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


  /*
   * No reprocesar si ya está marcado como procesado.
   */

  if (
    isProcessed(
      input.processed
    )
  ) {

    return false;
  }


  console.log(
    'PROCESANDO _manual FILA: ' +
    rowNumber
  );


  /*
   * Normalizar entrada manual.
   */

  const manual =
    normaliseManualResponse(
      input
    );


  /*
   * Resolver localización.
   */

  console.log(
    'LOCATION MANUAL: "' +
    manual.location +
    '"'
  );


  const locations =
    loadLocations();


  const location =
    resolveLocation(
      manual.location,
      locations
    );


  /*
   * Obtener entity_id.
   */

  let entityId =
    manual.entity_id;


  /*
   * NUEVO
   */

  if (!entityId) {

    entityId =
      generateUniqueEntityId(
        dataSheet
      );


    manual.entity_id =
      entityId;


    createDataRecord(
      dataSheet,
      manual,
      location
    );


    console.log(
      'NUEVO REGISTRO MANUAL: ' +
      entityId
    );


  /*
   * ACTUALIZACIÓN
   */

  } else {

    updateDataRecordFromManual(
      dataSheet,
      manual,
      location
    );


    console.log(
      'REGISTRO MANUAL ACTUALIZADO: ' +
      entityId
    );
  }


  /*
   * Escribir entity_id en _manual
   * si se acaba de generar.
   */

  writeManualEntityId(
    manualSheet,
    rowNumber,
    entityId
  );


  /*
   * Marcar procesado.
   */

  markManualProcessed(
    manualSheet,
    rowNumber,
    entityId
  );


  return true;
}


/**
 * ============================================================
 * NORMALIZAR _MANUAL
 * ============================================================
 */

function normaliseManualResponse(
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

    manual_id:
      get('manual_id'),

    entity_id:
      get('entity_id'),

    name:
      get('name'),

    format:
      get('format'),

    category:
      get('category'),

    tags:
      get('tags'),

    mission:
      get('mission'),

    description:
      get('description'),

    location:
      get('location'),

    activity:
      get('activity'),

    audience:
      get('audience'),

    territory:
      get('territory'),

    founded:
      get('founded'),

    license:
      get('license'),

    img:
      get('img'),

    url:
      get('url'),

    email_public:
      get('email'),

    phone:
      get('phone'),

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

    needs:
      get('needs'),

    offers:
      get('offers'),

    private_fields:
      get('private_fields'),

    source:
      get('source'),

    source_reference:
      get('source_reference'),

    verified:
      get('verified'),

    status:
      get('status'),

    contributor_creator:
      get('contributor_creator'),

    contributor_email:
      get('contributor_email'),

    date_created:
      get('date_created'),

    contributor_revision:
      get('contributor_revision'),

    date_revised:
      get('date_revised'),

    consent_publication:
      get('consent_publication'),

    consent_accuracy:
      get('consent_accuracy'),

    consent_contact:
      get('consent_contact'),

    consent_whatsapp:
      get('consent_whatsapp'),

    consent_newsletter:
      get('consent_newsletter'),

    clear_fields:
      get('clear_fields')
  };
}


/**
 * ============================================================
 * ACTUALIZAR DATA DESDE _MANUAL
 * ============================================================
 *
 * MUY IMPORTANTE:
 *
 * En _manual:
 *
 * campo vacío = NO CAMBIAR.
 *
 * clear_fields = BORRAR.
 */

function updateDataRecordFromManual(
  dataSheet,
  manual,
  location
) {

  const entityId =
    String(
      manual.entity_id
    )
      .trim()
      .toUpperCase();


  const headers =
    getHeaders(
      dataSheet
    );


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
          String(value)
            .trim()
            .toUpperCase()
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


  /*
   * Convertimos el manual en un registro DATA parcial.
   */

  const partial =
    buildManualDataPatch(
      manual,
      location,
      oldRecord
    );


  /*
   * clear_fields
   */

  const clearFields =
    parseClearFields(
      manual.clear_fields
    );


  /*
   * Construir fila final.
   */

  const newRow =
    headers.map(
      header => {

        /*
         * Si está explícitamente marcado para borrar.
         */

        if (
          clearFields.includes(
            header.toLowerCase()
          )
        ) {

          return '';
        }


        /*
         * Si el manual contiene el campo,
         * usamos el nuevo valor.
         */

        if (
          partial[header] !== undefined
        ) {

          return partial[header];
        }


        /*
         * Si no, conservamos el anterior.
         */

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
    'DATA ACTUALIZADA MANUALMENTE: ' +
    entityId
  );
}


/**
 * ============================================================
 * CREAR PATCH DE DATA DESDE _MANUAL
 * ============================================================
 */

function buildManualDataPatch(
  manual,
  location,
  oldRecord
) {

  const patch = {};


  /*
   * ID
   */

  patch.entity_id =
    manual.entity_id
      .toUpperCase();


  /*
   * Campos de contenido.
   *
   * Solo se incluyen si _manual
   * tiene un valor.
   */

  setIfNotEmpty(
    patch,
    'name',
    manual.name
  );

  setIfNotEmpty(
    patch,
    'format',
    manual.format
  );

  setIfNotEmpty(
    patch,
    'category',
    manual.category
  );

  setIfNotEmpty(
    patch,
    'tags',
    manual.tags
  );

  setIfNotEmpty(
    patch,
    'mission',
    manual.mission
  );

  setIfNotEmpty(
    patch,
    'description',
    manual.description
  );

  setIfNotEmpty(
    patch,
    'activity',
    manual.activity
  );

  setIfNotEmpty(
    patch,
    'audience',
    manual.audience
  );

  setIfNotEmpty(
    patch,
    'territory',
    manual.territory
  );

  setIfNotEmpty(
    patch,
    'founded',
    manual.founded
  );

  setIfNotEmpty(
    patch,
    'license',
    manual.license
  );

  setIfNotEmpty(
    patch,
    'img',
    manual.img
  );

  setIfNotEmpty(
    patch,
    'url',
    manual.url
  );

  setIfNotEmpty(
    patch,
    'email',
    manual.email_public
  );

  setIfNotEmpty(
    patch,
    'phone',
    manual.phone
  );

  setIfNotEmpty(
    patch,
    'instagram',
    manual.instagram
  );

  setIfNotEmpty(
    patch,
    'facebook',
    manual.facebook
  );

  setIfNotEmpty(
    patch,
    'bsky',
    manual.bsky
  );

  setIfNotEmpty(
    patch,
    'linkedin',
    manual.linkedin
  );

  setIfNotEmpty(
    patch,
    'mastodon',
    manual.mastodon
  );

  setIfNotEmpty(
    patch,
    'pixelfed',
    manual.pixelfed
  );

  setIfNotEmpty(
    patch,
    'telegram',
    manual.telegram
  );

  setIfNotEmpty(
    patch,
    'threads',
    manual.threads
  );

  setIfNotEmpty(
    patch,
    'tiktok',
    manual.tiktok
  );

  setIfNotEmpty(
    patch,
    'whatsapp',
    manual.whatsapp
  );

  setIfNotEmpty(
    patch,
    'x',
    manual.x
  );

  setIfNotEmpty(
    patch,
    'youtube',
    manual.youtube
  );

  setIfNotEmpty(
    patch,
    'needs',
    manual.needs
  );

  setIfNotEmpty(
    patch,
    'offers',
    manual.offers
  );


  /*
   * LOCALIZACIÓN
   *
   * Si se introduce location,
   * recalculamos las coordenadas.
   */

  if (
    manual.location
  ) {

    patch.island =
      location.island;

    patch.municipality =
      location.municipality;

    patch.lon =
      location.lon;

    patch.lat =
      location.lat;
  }


  /*
   * PRIVACIDAD
   *
   * Solo recalculamos los *_private
   * si se ha proporcionado private_fields.
   */

  if (
    manual.private_fields
  ) {

    const privateFields =
      parsePrivateFields(
        manual.private_fields
      );


    patch.name_private =
      isPrivate(
        privateFields,
        'Nombre'
      );

    patch.format_private =
      isPrivate(
        privateFields,
        'Tipo de entidad o proyecto'
      );

    patch.category_private =
      isPrivate(
        privateFields,
        'Categoría'
      );

    patch.tags_private =
      isPrivate(
        privateFields,
        'Etiquetas'
      );

    patch.mission_private =
      isPrivate(
        privateFields,
        'Misión'
      );

    patch.description_private =
      isPrivate(
        privateFields,
        'Descripción'
      );

    patch.location_private =
      isPrivate(
        privateFields,
        'Ubicación'
      );

    patch.activity_private =
      isPrivate(
        privateFields,
        'Actividades'
      );

    patch.audience_private =
      isPrivate(
        privateFields,
        'Público'
      );

    patch.territory_private =
      isPrivate(
        privateFields,
        'Ámbito territorial'
      );

    patch.founded_private =
      isPrivate(
        privateFields,
        'Año de inicio'
      );

    patch.needs_private =
      isPrivate(
        privateFields,
        'Necesidades'
      );

    patch.offers_private =
      isPrivate(
        privateFields,
        'Ofertas'
      );

    patch.img_private =
      isPrivate(
        privateFields,
        'Imagen'
      );

    patch.url_private =
      isPrivate(
        privateFields,
        'Página web'
      );

    patch.email_private =
      isPrivate(
        privateFields,
        'Correo Electrónico'
      );

    patch.phone_private =
      isPrivate(
        privateFields,
        'Teléfono'
      );

    patch.instagram_private =
      isPrivate(
        privateFields,
        'Instagram'
      );

    patch.facebook_private =
      isPrivate(
        privateFields,
        'Facebook'
      );

    patch.bsky_private =
      isPrivate(
        privateFields,
        'Bluesky'
      );

    patch.linkedin_private =
      isPrivate(
        privateFields,
        'LinkedIn'
      );

    patch.mastodon_private =
      isPrivate(
        privateFields,
        'Mastodon'
      );

    patch.pixelfed_private =
      isPrivate(
        privateFields,
        'Pixelfed'
      );

    patch.telegram_private =
      isPrivate(
        privateFields,
        'Telegram'
      );

    patch.threads_private =
      isPrivate(
        privateFields,
        'Threads'
      );

    patch.tiktok_private =
      isPrivate(
        privateFields,
        'TikTok'
      );

    patch.whatsapp_private =
      isPrivate(
        privateFields,
        'WhatsApp'
      );

    patch.x_private =
      isPrivate(
        privateFields,
        'X'
      );

    patch.youtube_private =
      isPrivate(
        privateFields,
        'YouTube'
      );
  }


  /*
   * ORIGEN
   */

  setIfNotEmpty(
    patch,
    'source',
    manual.source
  );

  setIfNotEmpty(
    patch,
    'source_reference',
    manual.source_reference
  );


  /*
   * ESTADO
   */

  setIfNotEmpty(
    patch,
    'verified',
    manual.verified
  );

  setIfNotEmpty(
    patch,
    'status',
    manual.status
  );


  /*
   * CONTRIBUYENTE
   */

  setIfNotEmpty(
    patch,
    'contributor_creator',
    manual.contributor_creator
  );

  setIfNotEmpty(
    patch,
    'contributor_email',
    manual.contributor_email
  );


  /*
   * CONSENTIMIENTOS
   */

  setIfNotEmpty(
    patch,
    'consent_publication',
    manual.consent_publication
  );

  setIfNotEmpty(
    patch,
    'consent_accuracy',
    manual.consent_accuracy
  );

  setIfNotEmpty(
    patch,
    'consent_contact',
    manual.consent_contact
  );

  setIfNotEmpty(
    patch,
    'consent_whatsapp',
    manual.consent_whatsapp
  );

  setIfNotEmpty(
    patch,
    'consent_newsletter',
    manual.consent_newsletter
  );


  /*
   * FECHA DE REVISIÓN
   *
   * Toda modificación manual genera
   * una nueva fecha de revisión.
   */

  patch.date_revised =
    new Date();


  if (
    manual.contributor_revision
  ) {

    patch.contributor_revision =
      manual.contributor_revision;

  } else if (
    manual.contributor_creator
  ) {

    patch.contributor_revision =
      manual.contributor_creator;
  }


  /*
   * date_created no se modifica
   * en una actualización.
   */

  return patch;
}


/**
 * ============================================================
 * NUEVO REGISTRO MANUAL
 * ============================================================
 */

function buildManualNewRecord(
  manual,
  location
) {

  const now =
    new Date();


  return buildDataRecord(
    manual,
    location,
    now,
    now,
    {}
  );
}


/**
 * ============================================================
 * AUXILIAR
 * ============================================================
 */

function setIfNotEmpty(
  object,
  key,
  value
) {

  if (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ''
  ) {

    object[key] =
      value;
  }
}


/**
 * ============================================================
 * CLEAR_FIELDS
 * ============================================================
 */

function parseClearFields(
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
 * PROCESSED
 * ============================================================
 */

function isProcessed(
  value
) {

  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();


  return (
    normalized === 'sí' ||
    normalized === 'si' ||
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'procesado'
  );
}


/**
 * ============================================================
 * MARCAR _MANUAL COMO PROCESADO
 * ============================================================
 */

function markManualProcessed(
  sheet,
  rowNumber,
  entityId
) {

  const headers =
    getHeaders(sheet);


  const processedIndex =
    headers.indexOf(
      'processed'
    );


  const processedAtIndex =
    headers.indexOf(
      'processed_at'
    );


  const resultIndex =
    headers.indexOf(
      'processing_result'
    );


  if (
    processedIndex !== -1
  ) {

    sheet
      .getRange(
        rowNumber,
        processedIndex + 1
      )
      .setValue(
        'Sí'
      );
  }


  if (
    processedAtIndex !== -1
  ) {

    sheet
      .getRange(
        rowNumber,
        processedAtIndex + 1
      )
      .setValue(
        new Date()
      );
  }


  if (
    resultIndex !== -1
  ) {

    sheet
      .getRange(
        rowNumber,
        resultIndex + 1
      )
      .setValue(
        'OK: ' +
        entityId
      );
  }
}


/**
 * ============================================================
 * MARCAR ERROR EN _MANUAL
 * ============================================================
 */

function markManualError(
  sheet,
  rowNumber,
  error
) {

  const headers =
    getHeaders(sheet);


  const processedIndex =
    headers.indexOf(
      'processed'
    );


  const processedAtIndex =
    headers.indexOf(
      'processed_at'
    );


  const resultIndex =
    headers.indexOf(
      'processing_result'
    );


  if (
    processedIndex !== -1
  ) {

    sheet
      .getRange(
        rowNumber,
        processedIndex + 1
      )
      .setValue(
        'ERROR'
      );
  }


  if (
    processedAtIndex !== -1
  ) {

    sheet
      .getRange(
        rowNumber,
        processedAtIndex + 1
      )
      .setValue(
        new Date()
      );
  }


  if (
    resultIndex !== -1
  ) {

    sheet
      .getRange(
        rowNumber,
        resultIndex + 1
      )
      .setValue(
        error.message
      );
  }
}


/**
 * ============================================================
 * ESCRIBIR ENTITY_ID EN _MANUAL
 * ============================================================
 */

function writeManualEntityId(
  sheet,
  rowNumber,
  entityId
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
      'No existe entity_id en _manual.'
    );
  }


  sheet
    .getRange(
      rowNumber,
      index + 1
    )
    .setValue(
      entityId
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


  sheet.appendRow(
    row
  );
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
    new Set(
      existingIds
    );


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
