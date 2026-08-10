/**
 * ARCHIPIÉLAGO VIVO · TV · CATÁLOGO + METADATOS YOUTUBE
 *
 * Convierte _tv_media en el catálogo técnico persistente de la TV.
 *
 * Los vídeos de las fichas siguen teniendo su fuente de verdad en DATA.
 * En _tv_media se guarda una fila DERIVADA para disponer de:
 * - título
 * - descripción
 * - canal
 * - miniatura
 * - fecha de publicación
 * - duración
 * - tags de YouTube
 * - licencia de YouTube
 *
 * Campos curatoriales (tv_description, tags, channels, rights_status...)
 * se preservan al actualizar metadatos.
 *
 * Requisito:
 * habilitar el servicio avanzado "YouTube Data API v3"
 * en Apps Script.
 */


const AV_TV_MEDIA_REQUIRED_HEADERS_ = [
  'media_id',
  'youtube_id',
  'title',
  'description',
  'tv_description',
  'channel_title',
  'thumbnail',
  'published_at',
  'duration_seconds',
  'youtube_tags',
  'youtube_license',
  'type',
  'program_id',
  'tags',
  'channels',
  'rights_status',
  'source',
  'status',
  'metadata_updated_at',
  'embeddable',
  'privacy_status'
];


function syncEntityVideosToTvMedia() {

  assertYouTubeAdvancedService_();


  const sheet =
    getSheet(
      CONFIG.TV_MEDIA_SHEET
    );


  assertTvMediaHeaders_(
    sheet
  );


  const currentExport =
    buildTvExport();


  const videoIds =
    Object.keys(
      currentExport.videos || {}
    );


  const conflicts =
    Object.keys(
      currentExport.conflicts || {}
    );


  if (
    videoIds.length === 0
  ) {

    SpreadsheetApp
      .getUi()
      .alert(
        'No hay vídeos de fichas públicas para sincronizar.' +
        (
          conflicts.length
            ? '\n\nVídeos en conflicto: ' +
              conflicts.length
            : ''
        )
      );

    return;
  }


  const metadataById =
    fetchYouTubeMetadataByIds_(
      videoIds
    );


  let created = 0;
  let updated = 0;
  let unavailable = 0;
  let notEmbeddable = 0;


  videoIds
    .forEach(
      videoId => {

        const mapping =
          currentExport.videos[
            videoId
          ];


        const metadata =
          metadataById[
            videoId
          ];


        if (!metadata) {

          unavailable++;

          return;
        }


        if (
          metadata.embeddable === false
        ) {

          notEmbeddable++;
        }


        const mediaId =
          buildEntityMediaId_(
            mapping.entity_id,
            videoId
          );


        const result =
          upsertEntityTvMediaRow_(
            sheet,
            mediaId,
            videoId,
            mapping,
            metadata
          );


        if (
          result === 'created'
        ) {

          created++;

        } else {

          updated++;
        }
      }
    );


  SpreadsheetApp.flush();


  SpreadsheetApp
    .getUi()
    .alert(
      'Vídeos de fichas sincronizados.\n\n' +
      'Nuevos: ' +
      created +
      '\n' +
      'Actualizados: ' +
      updated +
      '\n' +
      'No disponibles en YouTube API: ' +
      unavailable +
      '\n' +
      'No embebibles: ' +
      notEmbeddable +
      '\n' +
      'Conflictos entity/video omitidos: ' +
      conflicts.length
    );
}


/**
 * Actualiza únicamente los metadatos YouTube de TODAS las filas
 * existentes en _tv_media que tengan youtube_id.
 *
 * Útil para:
 * - documentales añadidos manualmente;
 * - entrevistas;
 * - archivo;
 * - vídeos de fichas ya sincronizados.
 *
 * No altera los campos curatoriales.
 */
function refreshTvMediaYouTubeMetadata() {

  assertYouTubeAdvancedService_();


  const sheet =
    getSheet(
      CONFIG.TV_MEDIA_SHEET
    );


  assertTvMediaHeaders_(
    sheet
  );


  const headers =
    getHeaders(
      sheet
    );


  const index =
    createHeaderIndex(
      headers
    );


  const values =
    sheet
      .getDataRange()
      .getValues();


  const rows = [];


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const rawId =
      getCell(
        values[i],
        index,
        'youtube_id'
      );


    const youtubeId =
      parseYouTubeVideoId(
        rawId
      );


    if (!youtubeId) {

      continue;
    }


    rows.push(
      {
        rowNumber:
          i + 1,

        youtubeId:
          youtubeId
      }
    );
  }


  const uniqueIds =
    Array.from(
      new Set(
        rows.map(
          item =>
            item.youtubeId
        )
      )
    );


  if (
    uniqueIds.length === 0
  ) {

    SpreadsheetApp
      .getUi()
      .alert(
        '_tv_media no contiene ningún youtube_id válido.'
      );

    return;
  }


  const metadataById =
    fetchYouTubeMetadataByIds_(
      uniqueIds
    );


  let updated = 0;
  let unavailable = 0;
  let notEmbeddable = 0;


  rows.forEach(
    item => {

      const metadata =
        metadataById[
          item.youtubeId
        ];


      if (!metadata) {

        unavailable++;

        return;
      }


      updateTvMediaMetadataColumns_(
        sheet,
        headers,
        item.rowNumber,
        item.youtubeId,
        metadata
      );


      if (
        metadata.embeddable === false
      ) {

        notEmbeddable++;
      }


      updated++;
    }
  );


  SpreadsheetApp.flush();


  SpreadsheetApp
    .getUi()
    .alert(
      'Metadatos de YouTube actualizados.\n\n' +
      'Filas actualizadas: ' +
      updated +
      '\n' +
      'Vídeos no disponibles: ' +
      unavailable +
      '\n' +
      'Vídeos no embebibles: ' +
      notEmbeddable
    );
}


function assertYouTubeAdvancedService_() {

  if (
    typeof YouTube === 'undefined'
  ) {

    throw new Error(
      'El servicio avanzado YouTube Data API v3 no está habilitado. ' +
      'En Apps Script abre Servicios (+), añade YouTube Data API v3 ' +
      'y vuelve a ejecutar esta opción.'
    );
  }
}


function assertTvMediaHeaders_(
  sheet
) {

  const headers =
    getHeaders(
      sheet
    );


  const missing =
    AV_TV_MEDIA_REQUIRED_HEADERS_
      .filter(
        header =>
          !headers.includes(
            header
          )
      );


  if (
    missing.length
  ) {

    throw new Error(
      'Faltan columnas en ' +
      CONFIG.TV_MEDIA_SHEET +
      ': ' +
      missing.join(
        ', '
      )
    );
  }
}


function fetchYouTubeMetadataByIds_(
  videoIds
) {

  const result = {};


  const ids =
    Array.from(
      new Set(
        videoIds
          .map(
            value =>
              parseYouTubeVideoId(
                value
              )
          )
          .filter(
            Boolean
          )
      )
    );


  /*
   * YouTube Data API admite consultas por varios IDs.
   * Procesamos en lotes conservadores de 50.
   */
  const chunkSize =
    50;


  for (
    let offset = 0;
    offset < ids.length;
    offset += chunkSize
  ) {

    const chunk =
      ids.slice(
        offset,
        offset + chunkSize
      );


    const response =
      YouTube.Videos.list(
        'snippet,contentDetails,status',
        {
          id:
            chunk.join(
              ','
            )
        }
      );


    const items =
      response &&
      response.items
        ? response.items
        : [];


    items.forEach(
      item => {

        result[
          item.id
        ] =
          normalizeYouTubeVideoMetadata_(
            item
          );
      }
    );
  }


  return result;
}


function normalizeYouTubeVideoMetadata_(
  item
) {

  const snippet =
    item.snippet ||
    {};


  const contentDetails =
    item.contentDetails ||
    {};


  const status =
    item.status ||
    {};


  return {
    youtube_id:
      item.id || '',

    title:
      snippet.title || '',

    description:
      snippet.description || '',

    channel_title:
      snippet.channelTitle || '',

    thumbnail:
      pickBestYouTubeThumbnail_(
        snippet.thumbnails
      ),

    published_at:
      snippet.publishedAt
        ? new Date(
            snippet.publishedAt
          )
        : '',

    duration_seconds:
      parseIso8601DurationSeconds_(
        contentDetails.duration
      ),

    youtube_tags:
      Array.isArray(
        snippet.tags
      )
        ? snippet.tags.join(
            ', '
          )
        : '',

    youtube_license:
      status.license || '',

    embeddable:
      status.embeddable,

    privacy_status:
      status.privacyStatus || ''
  };
}


function pickBestYouTubeThumbnail_(
  thumbnails
) {

  thumbnails =
    thumbnails ||
    {};


  const preference = [
    'maxres',
    'standard',
    'high',
    'medium',
    'default'
  ];


  for (
    let i = 0;
    i < preference.length;
    i++
  ) {

    const candidate =
      thumbnails[
        preference[i]
      ];


    if (
      candidate &&
      candidate.url
    ) {

      return candidate.url;
    }
  }


  return '';
}


function parseIso8601DurationSeconds_(
  value
) {

  const text =
    String(
      value || ''
    )
      .trim();


  if (!text) {

    return '';
  }


  const match =
    text.match(
      /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i
    );


  if (!match) {

    return '';
  }


  const days =
    Number(
      match[1] || 0
    );


  const hours =
    Number(
      match[2] || 0
    );


  const minutes =
    Number(
      match[3] || 0
    );


  const seconds =
    Number(
      match[4] || 0
    );


  return (
    days * 86400 +
    hours * 3600 +
    minutes * 60 +
    seconds
  );
}


function buildEntityMediaId_(
  entityId,
  youtubeId
) {

  return (
    'ENT-' +
    String(
      entityId || ''
    )
      .trim()
      .toUpperCase() +
    '-' +
    String(
      youtubeId || ''
    )
      .trim()
  );
}


function upsertEntityTvMediaRow_(
  sheet,
  mediaId,
  youtubeId,
  mapping,
  metadata
) {

  const headers =
    getHeaders(
      sheet
    );


  const values =
    sheet
      .getDataRange()
      .getValues();


  const mediaIdIndex =
    headers.indexOf(
      'media_id'
    );


  let rowNumber =
    null;


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    if (
      String(
        values[i][
          mediaIdIndex
        ] || ''
      ).trim() ===
      mediaId
    ) {

      rowNumber =
        i + 1;

      break;
    }
  }


  const existing =
    rowNumber
      ? rowToObject(
          headers,
          sheet
            .getRange(
              rowNumber,
              1,
              1,
              headers.length
            )
            .getValues()[0]
        )
      : {};


  const record = {
    media_id:
      mediaId,

    youtube_id:
      youtubeId,

    title:
      metadata.title,

    description:
      metadata.description,

    /*
     * Campo editorial: nunca sobrescribir una versión
     * preparada manualmente.
     */
    tv_description:
      existing.tv_description || '',

    channel_title:
      metadata.channel_title,

    thumbnail:
      metadata.thumbnail,

    published_at:
      metadata.published_at,

    duration_seconds:
      metadata.duration_seconds,

    youtube_tags:
      metadata.youtube_tags,

    youtube_license:
      metadata.youtube_license,

    embeddable:
      metadata.embeddable === true,

    privacy_status:
      metadata.privacy_status,

    type:
      'entity',

    program_id:
      existing.program_id ||
      CONFIG.TV_ENTITY_PROGRAM_ID,

    /*
     * Tags y canales son curatoriales.
     */
    tags:
      existing.tags || '',

    channels:
      existing.channels ||
      CONFIG.TV_DEFAULT_CHANNEL_ID,

    /*
     * No inferimos derechos a partir de la licencia de YouTube.
     */
    rights_status:
      existing.rights_status || '',

    source:
      'data:' +
      String(
        mapping.entity_id || ''
      )
        .trim()
        .toUpperCase(),

    status:
      existing.status ||
      CONFIG.DEFAULT_STATUS,

    metadata_updated_at:
      new Date()
  };


  const row =
    headers.map(
      header =>
        record[
          header
        ] !== undefined
          ? record[
              header
            ]
          : (
              existing[
                header
              ] !== undefined
                ? existing[
                    header
                  ]
                : ''
            )
    );


  if (
    rowNumber
  ) {

    sheet
      .getRange(
        rowNumber,
        1,
        1,
        headers.length
      )
      .setValues(
        [
          row
        ]
      );


    return 'updated';
  }


  sheet
    .appendRow(
      row
    );


  return 'created';
}


function updateTvMediaMetadataColumns_(
  sheet,
  headers,
  rowNumber,
  youtubeId,
  metadata
) {

  const existing =
    rowToObject(
      headers,
      sheet
        .getRange(
          rowNumber,
          1,
          1,
          headers.length
        )
        .getValues()[0]
    );


  const patch = {
    youtube_id:
      youtubeId,

    title:
      metadata.title,

    description:
      metadata.description,

    channel_title:
      metadata.channel_title,

    thumbnail:
      metadata.thumbnail,

    published_at:
      metadata.published_at,

    duration_seconds:
      metadata.duration_seconds,

    youtube_tags:
      metadata.youtube_tags,

    youtube_license:
      metadata.youtube_license,

    embeddable:
      metadata.embeddable === true,

    privacy_status:
      metadata.privacy_status,

    metadata_updated_at:
      new Date()
  };


  const row =
    headers.map(
      header =>
        patch[
          header
        ] !== undefined
          ? patch[
              header
            ]
          : existing[
              header
            ]
    );


  sheet
    .getRange(
      rowNumber,
      1,
      1,
      headers.length
    )
    .setValues(
      [
        row
      ]
    );
}
