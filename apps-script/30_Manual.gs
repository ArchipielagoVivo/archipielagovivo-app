/**
 * ARCHIPIÉLAGO VIVO · _MANUAL
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


    recordInitialConsents(
      manual,
      entityId,
      {
        source: 'manual',
        sourceReference:
          'MANUAL:' +
          String(
            manual.manual_id ||
            rowNumber
          ),
        recordedBy: 'manual',
        partial: true
      }
    );


    console.log(
      'NUEVO REGISTRO MANUAL: ' +
      entityId
    );


  /*
   * ACTUALIZACIÓN
   */

  } else {

    const oldRecord =
      getDataRecordByEntityId(
        dataSheet,
        entityId
      );


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
        source: 'manual',
        sourceReference:
          'MANUAL:' +
          String(
            manual.manual_id ||
            rowNumber
          ),
        recordedBy: 'manual',
        partial: true
      }
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

    processed:
      get('processed'),

    processed_at:
      get('processed_at'),

    processing_result:
      get('processing_result'),

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

    video:
      get('video'),

    instagram:
      get('instagram'),

    facebook:
      get('facebook'),

    bsky:
      get('bsky'),

    linkedin:
      get('linkedin'),

    github:
      get('github'),

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
    'video',
    manual.video
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
    'github',
    manual.github
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

    patch.video_private =
      isPrivate(
        privateFields,
        'Vídeo'
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

    patch.github_private =
      isPrivate(
        privateFields,
        'GitHub'
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

  setConsentBooleanIfProvided(
    patch,
    'consent_publication',
    manual.consent_publication
  );

  setConsentBooleanIfProvided(
    patch,
    'consent_accuracy',
    manual.consent_accuracy
  );

  setConsentBooleanIfProvided(
    patch,
    'consent_contact',
    manual.consent_contact
  );

  setConsentBooleanIfProvided(
    patch,
    'consent_whatsapp',
    manual.consent_whatsapp
  );

  setConsentBooleanIfProvided(
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
    parseRebuildDate(
      manual.date_revised ||
      manual.processed_at
    ) ||
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


function setConsentBooleanIfProvided(
  object,
  key,
  value
) {

  if (
    !hasConsentInputValue(
      value
    )
  ) {

    return;
  }


  object[key] =
    toConsentBoolean(
      value
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
