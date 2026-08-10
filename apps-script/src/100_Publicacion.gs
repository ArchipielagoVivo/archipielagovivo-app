/**
 * ARCHIPIÉLAGO VIVO · PUBLICACIÓN
 *
 * Único punto donde se decide qué registros y qué campos
 * pueden salir de la base maestra.
 *
 * data = fuente de verdad
 * exports = vistas públicas derivadas
 */


const PUBLIC_ATOMIC_FIELDS = [
  'name',
  'format',
  'category',
  'tags',
  'mission',
  'description',
  'activity',
  'audience',
  'territory',
  'founded',
  'needs',
  'offers',
  'img',
  'url',
  'email',
  'phone',
  'video',
  'instagram',
  'facebook',
  'bsky',
  'linkedin',
  'mastodon',
  'pixelfed',
  'telegram',
  'threads',
  'tiktok',
  'whatsapp',
  'x',
  'youtube'
];


const PUBLIC_SOCIAL_LINKS = [
  ['url', '🌐', 'Sitio web'],
  ['instagram', '📷', 'Instagram'],
  ['facebook', '📘', 'Facebook'],
  ['bsky', '🦋', 'Bluesky'],
  ['linkedin', '💼', 'LinkedIn'],
  ['mastodon', '🐘', 'Mastodon'],
  ['pixelfed', '🖼️', 'Pixelfed'],
  ['telegram', '✈️', 'Telegram'],
  ['threads', '🧵', 'Threads'],
  ['tiktok', '🎵', 'TikTok'],
  ['whatsapp', '💬', 'WhatsApp'],
  ['x', '𝕏', 'X'],
  ['youtube', '▶️', 'YouTube']
];


function getAllDataRecords() {

  const sheet =
    getSheet(
      CONFIG.DATA_SHEET
    );


  const values =
    sheet
      .getDataRange()
      .getValues();


  if (
    values.length < 2
  ) {

    return [];
  }


  const headers =
    values[0]
      .map(
        header =>
          String(
            header
          ).trim()
      );


  return values
    .slice(1)
    .filter(
      row =>
        row.some(
          value =>
            String(
              value === null ||
              value === undefined
                ? ''
                : value
            ).trim() !== ''
        )
    )
    .map(
      row =>
        rowToObject(
          headers,
          row
        )
    );
}


function isRecordPublishable(
  record
) {

  if (
    !isYes(
      record.consent_publication
    )
  ) {

    return false;
  }


  if (
    normalizeTextKey(
      record.status
    ) !==
    normalizeTextKey(
      CONFIG.PUBLIC_STATUS
    )
  ) {

    return false;
  }


  if (
    CONFIG.PUBLIC_REQUIRE_VERIFIED &&
    !isYes(
      record.verified
    )
  ) {

    return false;
  }


  return true;
}


function isPublicFieldPrivate(
  record,
  field
) {

  return isTruthyFlag(
    record[
      field +
      '_private'
    ]
  );
}


function isTruthyFlag(
  value
) {

  if (
    value === true ||
    value === 1
  ) {

    return true;
  }


  const normalized =
    normalizeTextKey(
      value
    );


  return [
    'true',
    '1',
    'si',
    'yes',
    'private',
    'privado'
  ].includes(
    normalized
  );
}


function buildPublicEntity(
  record,
  canariasLocation
) {

  if (
    !isRecordPublishable(
      record
    )
  ) {

    return null;
  }


  const entityId =
    String(
      record.entity_id || ''
    )
      .trim()
      .toUpperCase();


  if (!entityId) {

    throw new Error(
      'Registro publicable sin entity_id.'
    );
  }


  const properties = {
    entity_id:
      entityId,

    status:
      record.status,

    verified:
      record.verified,

    license:
      record.license,

    source:
      record.source,

    date_created:
      publicDateValue(
        record.date_created
      ),

    date_revised:
      publicDateValue(
        record.date_revised
      )
  };


  PUBLIC_ATOMIC_FIELDS
    .forEach(
      field => {

        if (
          isPublicFieldPrivate(
            record,
            field
          )
        ) {

          return;
        }


        const value =
          record[field];


        if (
          !isBlankPublicValue(
            value
          )
        ) {

          properties[field] =
            publicScalarValue(
              value
            );
        }
      }
    );


  /*
   * uMap sigue esperando {name}.
   * Si la persona marcó el nombre como privado,
   * se usa un texto genérico y nunca el valor original.
   */

  if (
    !properties.name
  ) {

    properties.name =
      'Iniciativa de Archipiélago Vivo';
  }


  const location =
    buildPublicLocation(
      record,
      canariasLocation
    );


  properties.island =
    location.island;


  if (
    location.municipality
  ) {

    properties.municipality =
      location.municipality;
  }


  properties.links =
    buildPublicLinksMarkdown(
      properties
    );


  properties.contact =
    buildPublicContactMarkdown(
      properties
    );


  properties.map_url =
    buildUmapFeatureUrl(
      entityId
    );


  return {
    entity_id:
      entityId,

    layer:
      location.layer,

    lon:
      location.lon,

    lat:
      location.lat,

    properties:
      properties
  };
}


function buildPublicLocation(
  record,
  canariasLocation
) {

  /*
   * Si Ubicación está marcada como privada,
   * no salen ni municipio, ni isla original, ni coordenadas
   * derivadas de esa ubicación. Se desplaza a Canarias.
   */

  if (
    isTruthyFlag(
      record.location_private
    )
  ) {

    if (
      !canariasLocation
    ) {

      throw new Error(
        'Existe una ubicación privada pero no se ha encontrado ' +
        'la localización general "Canarias" en _locations.'
      );
    }


    return {
      island:
        'Canarias',

      municipality:
        '',

      lon:
        requireFiniteCoordinate(
          canariasLocation.lon,
          'lon Canarias'
        ),

      lat:
        requireFiniteCoordinate(
          canariasLocation.lat,
          'lat Canarias'
        ),

      layer:
        'canarias'
    };
  }


  const island =
    String(
      record.island || ''
    )
      .trim();


  const layer =
    islandToLayerSlug(
      island
    );


  return {
    island:
      island,

    municipality:
      String(
        record.municipality || ''
      )
        .trim(),

    lon:
      requireFiniteCoordinate(
        record.lon,
        'lon ' +
        record.entity_id
      ),

    lat:
      requireFiniteCoordinate(
        record.lat,
        'lat ' +
        record.entity_id
      ),

    layer:
      layer
  };
}


function findCanariasLocation() {

  const locations =
    loadLocations();


  const location =
    locations.find(
      item => {

        const label =
          normalizeTextKey(
            item.label
          );


        const island =
          normalizeTextKey(
            item.island
          );


        const type =
          normalizeTextKey(
            item.type
          );


        return (
          label === 'canarias' ||
          island === 'canarias' ||
          type === 'canarias'
        );
      }
    );


  return location || null;
}


function islandToLayerSlug(
  island
) {

  const key =
    normalizeTextKey(
      island
    )
      .replace(
        /\s+/g,
        '-'
      );


  const aliases = {
    'el-hierro':
      'el-hierro',

    'la-gomera':
      'la-gomera',

    'la-palma':
      'la-palma',

    'tenerife':
      'tenerife',

    'gran-canaria':
      'gran-canaria',

    'fuerteventura':
      'fuerteventura',

    'lanzarote':
      'lanzarote',

    'la-graciosa':
      'la-graciosa',

    'graciosa':
      'la-graciosa',

    'canarias':
      'canarias'
  };


  const layer =
    aliases[key];


  if (!layer) {

    throw new Error(
      'No existe capa pública para island="' +
      island +
      '".'
    );
  }


  return layer;
}


function buildPublicLinksMarkdown(
  properties
) {

  const lines = [];


  PUBLIC_SOCIAL_LINKS
    .forEach(
      definition => {

        const field =
          definition[0];

        const icon =
          definition[1];

        const label =
          definition[2];

        const value =
          String(
            properties[field] || ''
          )
            .trim();


        if (!value) {

          return;
        }


        lines.push(
          icon +
          ' [[' +
          value +
          '|' +
          label +
          ']]'
        );
      }
    );


  return lines.join(
    '\n'
  );
}


function buildPublicContactMarkdown(
  properties
) {

  const lines = [];


  const email =
    String(
      properties.email || ''
    )
      .trim();


  const phone =
    String(
      properties.phone || ''
    )
      .trim();


  if (email) {

    lines.push(
      '✉️ [[mailto:' +
      email +
      '|' +
      email +
      ']]'
    );
  }


  if (phone) {

    lines.push(
      '☎️ ' +
      phone
    );
  }


  return lines.join(
    '\n'
  );
}


function buildUmapFeatureUrl(
  entityId
) {

  return (
    CONFIG.UMAP_MAP_BASE_URL +
    '?feature=' +
    encodeURIComponent(
      entityId
    )
  );
}


function getPublicEntities() {

  const records =
    getAllDataRecords();


  const needsCanariasFallback =
    records.some(
      record =>
        isRecordPublishable(
          record
        ) &&
        isTruthyFlag(
          record.location_private
        )
    );


  const canariasLocation =
    needsCanariasFallback
      ? findCanariasLocation()
      : null;


  const entities = [];
  const warnings = [];


  records.forEach(
    record => {

      if (
        !isRecordPublishable(
          record
        )
      ) {

        return;
      }


      try {

        const entity =
          buildPublicEntity(
            record,
            canariasLocation
          );


        if (entity) {

          entities.push(
            entity
          );
        }


      } catch (error) {

        warnings.push(
          {
            entity_id:
              String(
                record.entity_id || ''
              )
                .trim()
                .toUpperCase(),

            message:
              error.message
          }
        );
      }
    }
  );


  return {
    entities:
      applyDisplayPointSpread(
        entities
      ),

    warnings:
      warnings
  };
}


function validatePublicExports() {

  const result =
    getPublicEntities();


  const counts = {};


  CONFIG.EXPORT_LAYERS
    .forEach(
      layer => {

        counts[layer] = 0;
      }
    );


  result.entities
    .forEach(
      entity => {

        if (
          counts[
            entity.layer
          ] !== undefined
        ) {

          counts[
            entity.layer
          ]++;
        }
      }
    );


  const lines =
    CONFIG.EXPORT_LAYERS
      .map(
        layer =>
          layer +
          ': ' +
          counts[layer]
      );


  const warnings =
    result.warnings
      .slice(
        0,
        10
      )
      .map(
        warning =>
          warning.entity_id +
          ' · ' +
          warning.message
      );


  let message =
    'Entidades públicas: ' +
    result.entities.length +
    '\n\n' +
    lines.join(
      '\n'
    );


  if (
    result.warnings.length
  ) {

    message +=
      '\n\nAdvertencias: ' +
      result.warnings.length +
      '\n' +
      warnings.join(
        '\n'
      );


    if (
      result.warnings.length >
      warnings.length
    ) {

      message +=
        '\n…';
    }
  }


  SpreadsheetApp
    .getUi()
    .alert(
      message
    );


  return {
    count:
      result.entities.length,

    layers:
      counts,

    warnings:
      result.warnings
  };
}


function isBlankPublicValue(
  value
) {

  return (
    value === null ||
    value === undefined ||
    String(
      value
    ).trim() === ''
  );
}


function publicScalarValue(
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


function publicDateValue(
  value
) {

  if (
    !value
  ) {

    return '';
  }


  if (
    value instanceof Date
  ) {

    return value
      .toISOString();
  }


  return String(
    value
  );
}


function requireFiniteCoordinate(
  value,
  label
) {

  const number =
    Number(
      String(
        value
      )
        .replace(
          ',',
          '.'
        )
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    throw new Error(
      'Coordenada inválida: ' +
      label +
      '="' +
      value +
      '".'
    );
  }


  return number;
}
