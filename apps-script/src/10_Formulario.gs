/**
 * ARCHIPIÉLAGO VIVO · FORMULARIO · ALTAS Y ACTUALIZACIONES
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


      recordInitialConsents(
        response,
        entityId,
        {
          source: 'form',
          sourceReference:
            buildFormConsentSourceReference(
              entityId,
              responseRow,
              'new'
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
          responseRow
        );

      } catch (idError) {

        console.warn(
          'No se pudo guardar form_response_id para ' +
          entityId +
          ': ' +
          idError.message
        );
      }


      console.log(
        'NUEVA INSCRIPCIÓN CREADA: ' +
        entityId
      );

      return;
    }


    /*
     * ACTUALIZACIÓN
     */

    const oldRecord =
      getDataRecordByEntityId(
        dataSheet,
        response.entity_id
      );


    updateDataRecord(
      dataSheet,
      response,
      location
    );


    recordConsentChanges(
      response,
      response.entity_id,
      oldRecord,
      {
        source: 'form',
        sourceReference:
          buildFormConsentSourceReference(
            response.entity_id,
            responseRow,
            'update'
          ),
        recordedBy: 'automatic',
        partial: false
      }
    );


    saveFormResponseHash(
      response.entity_id,
      response
    );


    try {

      ensureFormResponseIdForRow(
        formSheet,
        responseRow
      );

    } catch (idError) {

      console.warn(
        'No se pudo guardar form_response_id para ' +
        response.entity_id +
        ': ' +
        idError.message
      );
    }


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
