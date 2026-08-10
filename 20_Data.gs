/**
 * ARCHIPIÉLAGO VIVO · DATA · BASE MAESTRA
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


  /*
   * _manual utiliza el campo "name" directamente.
   * El formulario utiliza name_individual / name_entity.
   */
  if (
    response.name
  ) {

    name =
      response.name;

  } else if (
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


    video:
      response.video,

    video_private:
      isPrivate(
        privateFields,
        'Vídeo'
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


    github:
      response.github,

    github_private:
      isPrivate(
        privateFields,
        'GitHub'
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
      avConsentBoolean_(
        getEffectivePublicationConsent(
          response
        )
      ),

    consent_accuracy:
      avConsentBoolean_(
        response.consent_accuracy
      ),

    consent_contact:
      avConsentBoolean_(
        response.consent_contact
      ),

    consent_whatsapp:
      avConsentBoolean_(
        response.consent_whatsapp
      ),

    consent_newsletter:
      avConsentBoolean_(
        response.consent_newsletter
      )
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


function getDataRecordByEntityId(
  dataSheet,
  entityId
) {

  const records =
    findRowsByField(
      dataSheet,
      'entity_id',
      entityId
    );


  if (
    records.length === 0
  ) {

    throw new Error(
      'No existe en data el entity_id: ' +
      entityId
    );
  }


  if (
    records.length > 1
  ) {

    throw new Error(
      'entity_id duplicado en data: ' +
      entityId
    );
  }


  return records[0];
}
