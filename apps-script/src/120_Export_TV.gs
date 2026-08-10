/**
 * ARCHIPIÉLAGO VIVO · EXPORT TV · SCHEMA V2
 *
 * Mantiene compatibilidad con schema v1 (videos / entities)
 * y añade catálogo, canales, programas, parrilla y políticas.
 *
 * URL:
 *   ?export=tv
 */


function buildTvExport() {

  const legacy =
    buildTvLegacyRegistry_();


  const configResult =
    readTvConfiguration_();


  const mediaResult =
    readTvMediaCatalog_(
      legacy,
      configResult
    );


  const policy =
    buildTvPolicy_(
      mediaResult.media
    );


  const allWarnings =
    uniqueTvMessages_(
      []
        .concat(
          legacy.warnings || []
        )
        .concat(
          configResult.warnings || []
        )
        .concat(
          mediaResult.warnings || []
        )
    );


  const allErrors =
    uniqueTvMessages_(
      []
        .concat(
          configResult.errors || []
        )
        .concat(
          mediaResult.errors || []
        )
    );


  return {
    schema_version:
      2,

    generated_at:
      new Date()
        .toISOString(),

    timezone:
      CONFIG.TV_TIMEZONE,

    channel:
      {
        name:
          'Archipiélago Vivo TV',

        playlist_id:
          CONFIG.TV_PLAYLIST_ID
      },

    map:
      {
        base_url:
          CONFIG.UMAP_MAP_BASE_URL
      },

    tv_config:
      {
        valid:
          allErrors.length === 0,

        errors:
          allErrors,

        warnings:
          allWarnings,

        name:
          'Archipiélago Vivo TV',

        default_channel_id:
          CONFIG.TV_DEFAULT_CHANNEL_ID,

        timezone:
          CONFIG.TV_TIMEZONE,

        channel_switching:
          CONFIG.TV_CHANNEL_SWITCHING
      },

    presentation:
      {
        program_change_teasers:
          CONFIG.TV_PROGRAM_CHANGE_TEASERS
      },

    channels:
      configResult.channels,

    programs:
      configResult.programs,

    media:
      mediaResult.media,

    schedule:
      configResult.schedule,

    policy:
      policy,

    /*
     * Compatibilidad con el frontend / QR anterior.
     */
    videos:
      legacy.videos,

    entities:
      legacy.entities,

    conflicts:
      legacy.conflicts,

    warnings:
      allWarnings
  };
}


/**
 * Registro v1: vídeo de ficha ↔ entidad pública.
 */
function buildTvLegacyRegistry_() {

  const result =
    getPublicEntities();


  const videos = {};
  const entities = {};
  const duplicates = {};


  result.entities
    .forEach(
      entity => {

        const videoIds =
          extractYouTubeVideoIds(
            entity.properties.video
          );


        if (
          videoIds.length === 0
        ) {

          return;
        }


        const publicEntity =
          {
            entity_id:
              entity.entity_id,

            name:
              entity.properties.name,

            map_url:
              entity.properties.map_url,

            island:
              entity.properties.island || '',

            municipality:
              entity.properties.municipality || '',

            img:
              entity.properties.img || '',

            date_created:
              entity.properties.date_created || '',

            video_ids:
              videoIds
          };


        entities[
          entity.entity_id
        ] =
          publicEntity;


        videoIds.forEach(
          videoId => {

            const mapping =
              {
                entity_id:
                  entity.entity_id,

                name:
                  entity.properties.name,

                map_url:
                  entity.properties.map_url,

                img:
                  entity.properties.img || '',

                date_created:
                  entity.properties.date_created || ''
              };


            if (
              videos[
                videoId
              ]
            ) {

              if (
                !duplicates[
                  videoId
                ]
              ) {

                duplicates[
                  videoId
                ] =
                  [
                    videos[
                      videoId
                    ]
                  ];
              }


              duplicates[
                videoId
              ]
                .push(
                  mapping
                );


              delete videos[
                videoId
              ];


              return;
            }


            if (
              duplicates[
                videoId
              ]
            ) {

              duplicates[
                videoId
              ]
                .push(
                  mapping
                );

              return;
            }


            videos[
              videoId
            ] =
              mapping;
          }
        );
      }
    );


  return {
    videos:
      videos,

    entities:
      entities,

    conflicts:
      duplicates,

    warnings:
      result.warnings || []
  };
}


function readTvConfiguration_() {

  const warnings = [];
  const errors = [];


  const channelsResult =
    readTvChannels_(
      warnings,
      errors
    );


  const programsResult =
    readTvPrograms_(
      warnings,
      errors
    );


  const scheduleResult =
    readTvSchedule_(
      channelsResult.index,
      programsResult.index,
      warnings,
      errors
    );


  return {
    channels:
      channelsResult.rows,

    programs:
      programsResult.rows,

    schedule:
      scheduleResult,

    channelIndex:
      channelsResult.index,

    programIndex:
      programsResult.index,

    warnings:
      warnings,

    errors:
      errors
  };
}


function readTvChannels_(
  warnings,
  errors
) {

  const raw =
    readTvSheetRows_(
      CONFIG.TV_CHANNELS_SHEET,
      [
        'channel_id',
        'channel_number',
        'slug',
        'name',
        'description',
        'status'
      ],
      errors
    );


  const rows = [];
  const index = {};
  const numberIndex = {};
  const slugIndex = {};


  raw.forEach(
    item => {

      const channelId =
        tvText_(
          item.row.channel_id
        );


      if (!channelId) {

        return;
      }


      if (
        index[channelId]
      ) {

        errors.push(
          'Canal duplicado: ' +
          channelId +
          ' (fila ' +
          item.rowNumber +
          ').'
        );

        return;
      }


      const channelNumber =
        tvNumberOrNull_(
          item.row.channel_number
        );


      const slug =
        tvText_(
          item.row.slug
        );


      if (
        channelNumber === null ||
        channelNumber <= 0 ||
        Math.floor(channelNumber) !== channelNumber
      ) {

        errors.push(
          'channel_number no válido en canal ' +
          channelId +
          ' (fila ' +
          item.rowNumber +
          ').'
        );
      }


      if (
        channelNumber !== null &&
        numberIndex[channelNumber]
      ) {

        errors.push(
          'channel_number duplicado: ' +
          channelNumber +
          ' (' +
          numberIndex[channelNumber] +
          ' / ' +
          channelId +
          ').'
        );
      }


      if (!slug) {

        errors.push(
          'slug vacío en canal ' +
          channelId +
          ' (fila ' +
          item.rowNumber +
          ').'
        );

      } else if (
        slugIndex[slug]
      ) {

        errors.push(
          'slug duplicado: ' +
          slug +
          ' (' +
          slugIndex[slug] +
          ' / ' +
          channelId +
          ').'
        );
      }


      const channel = {
        channel_id:
          channelId,

        channel_number:
          channelNumber,

        slug:
          slug,

        name:
          tvText_(
            item.row.name
          ),

        description:
          tvText_(
            item.row.description
          ),

        status:
          tvText_(
            item.row.status
          )
      };


      if (
        channelNumber !== null
      ) {

        numberIndex[
          channelNumber
        ] =
          channelId;
      }


      if (slug) {

        slugIndex[
          slug
        ] =
          channelId;
      }


      channel.active =
        tvIsActive_(
          channel.status
        );


      index[
        channelId
      ] =
        channel;


      rows.push(
        channel
      );
    }
  );


  if (
    !index[
      CONFIG.TV_DEFAULT_CHANNEL_ID
    ]
  ) {

    errors.push(
      'No existe el canal por defecto: ' +
      CONFIG.TV_DEFAULT_CHANNEL_ID +
      '.'
    );
  }


  return {
    rows:
      rows,

    index:
      index
  };
}


function readTvPrograms_(
  warnings,
  errors
) {

  const raw =
    readTvSheetRows_(
      CONFIG.TV_PROGRAMS_SHEET,
      [
        'program_id',
        'name',
        'description',
        'status'
      ],
      errors
    );


  const rows = [];
  const index = {};


  raw.forEach(
    item => {

      const programId =
        tvText_(
          item.row.program_id
        );


      if (!programId) {

        return;
      }


      if (
        index[
          programId
        ]
      ) {

        errors.push(
          'Programa duplicado: ' +
          programId +
          ' (fila ' +
          item.rowNumber +
          ').'
        );

        return;
      }


      const program = {
        program_id:
          programId,

        name:
          tvText_(
            item.row.name
          ),

        description:
          tvText_(
            item.row.description
          ),

        status:
          tvText_(
            item.row.status
          )
      };


      program.active =
        tvIsActive_(
          program.status
        );


      index[
        programId
      ] =
        program;


      rows.push(
        program
      );
    }
  );


  if (
    !index[
      CONFIG.TV_ENTITY_PROGRAM_ID
    ]
  ) {

    errors.push(
      'Falta el programa de perfiles: ' +
      CONFIG.TV_ENTITY_PROGRAM_ID +
      '. Revisa guion/guion bajo en _tv_programs.'
    );
  }


  return {
    rows:
      rows,

    index:
      index
  };
}


function readTvSchedule_(
  channelIndex,
  programIndex,
  warnings,
  errors
) {

  const raw =
    readTvSheetRows_(
      CONFIG.TV_SCHEDULE_SHEET,
      [
        'schedule_id',
        'channel_id',
        'days',
        'start',
        'end',
        'program_id',
        'media_id',
        'selection_rule',
        'max_duration_minutes',
        'priority',
        'valid_from',
        'valid_to',
        'status'
      ],
      errors
    );


  const result = [];
  const ids = {};


  raw.forEach(
    item => {

      const row =
        item.row;


      const scheduleId =
        tvText_(
          row.schedule_id
        );


      if (!scheduleId) {

        return;
      }


      const rowErrors = [];


      if (
        ids[
          scheduleId
        ]
      ) {

        rowErrors.push(
          'schedule_id duplicado.'
        );
      }


      ids[
        scheduleId
      ] =
        true;


      const channelId =
        tvText_(
          row.channel_id
        );


      if (
        channelId !== '*' &&
        !channelIndex[
          channelId
        ]
      ) {

        rowErrors.push(
          'channel_id desconocido: ' +
          channelId +
          '.'
        );
      }


      const programId =
        tvText_(
          row.program_id
        );


      if (
        programId &&
        !programIndex[
          programId
        ]
      ) {

        rowErrors.push(
          'program_id desconocido: ' +
          programId +
          '.'
        );
      }


      const selectionRule =
        tvText_(
          row.selection_rule
        );


      if (
        !CONFIG.TV_SELECTION_RULES
          .includes(
            selectionRule
          )
      ) {

        rowErrors.push(
          'selection_rule no válido: ' +
          selectionRule +
          '. Esto suele indicar columnas desplazadas.'
        );
      }


      const start =
        tvNormalizeTime_(
          item.display.start,
          false
        );


      const end =
        tvNormalizeTime_(
          item.display.end,
          true
        );


      if (!start) {

        rowErrors.push(
          'Hora start no válida: ' +
          tvText_(
            item.display.start
          ) +
          '.'
        );
      }


      if (!end) {

        rowErrors.push(
          'Hora end no válida: ' +
          tvText_(
            item.display.end
          ) +
          '.'
        );
      }


      const startMinutes =
        start
          ? tvTimeToMinutes_(
              start
            )
          : null;


      const endMinutes =
        end
          ? tvTimeToMinutes_(
              end
            )
          : null;


      if (
        startMinutes !== null &&
        endMinutes !== null &&
        endMinutes <= startMinutes
      ) {

        rowErrors.push(
          'end debe ser posterior a start.'
        );
      }


      const priority =
        tvNumberOrNull_(
          row.priority
        );


      if (
        priority === null
      ) {

        rowErrors.push(
          'priority vacío/no numérico. Esto suele indicar columnas desplazadas.'
        );
      }


      const maxDuration =
        tvNumberOrNull_(
          row.max_duration_minutes
        );


      const days =
        tvParseDays_(
          row.days,
          rowErrors
        );


      const schedule = {
        schedule_id:
          scheduleId,

        channel_id:
          channelId,

        days:
          days,

        start:
          start || '',

        end:
          end || '',

        program_id:
          programId,

        media_id:
          tvText_(
            row.media_id
          ),

        selection_rule:
          selectionRule,

        max_duration_minutes:
          maxDuration,

        priority:
          priority,

        valid_from:
          tvExportDateValue_(
            row.valid_from
          ),

        valid_to:
          tvExportDateValue_(
            row.valid_to
          ),

        status:
          tvText_(
            row.status
          ),

        active:
          tvIsActive_(
            row.status
          ),

        is_global:
          channelId === '*',

        is_global_entity_block:
          channelId === '*' &&
          (
            selectionRule === 'entity_rotation' ||
            selectionRule === 'entity_new' ||
            selectionRule === 'entity_deadline'
          ),

        valid:
          rowErrors.length === 0
      };


      if (
        rowErrors.length
      ) {

        rowErrors.forEach(
          message =>
            errors.push(
              CONFIG.TV_SCHEDULE_SHEET +
              ' fila ' +
              item.rowNumber +
              ' (' +
              scheduleId +
              '): ' +
              message
            )
        );
      }


      result.push(
        schedule
      );
    }
  );


  return result;
}


function readTvMediaCatalog_(
  legacy,
  configResult
) {

  const warnings = [];
  const errors = [];


  const raw =
    readTvSheetRows_(
      CONFIG.TV_MEDIA_SHEET,
      [
        'media_id',
        'type',
        'program_id',
        'tv_description',
        'tags',
        'channels',
        'rights_status',
        'source',
        'status',
        'youtube_id',
        'embeddable',
        'privacy_status',
        'title',
        'description',
        'channel_title',
        'thumbnail',
        'published_at',
        'youtube_tags',
        'duration_seconds',
        'youtube_license',
        'metadata_updated_at'
      ],
      errors
    );


  const media = [];
  const mediaIds = {};
  const youtubeIds = {};
  const now =
    new Date();


  raw.forEach(
    item => {

      const row =
        item.row;


      const youtubeId =
        parseYouTubeVideoId(
          row.youtube_id
        );


      if (!youtubeId) {

        warnings.push(
          CONFIG.TV_MEDIA_SHEET +
          ' fila ' +
          item.rowNumber +
          ': youtube_id vacío/no válido.'
        );

        return;
      }


      let mediaId =
        tvText_(
          row.media_id
        );


      const type =
        tvText_(
          row.type
        );


      const legacyEntity =
        legacy.videos[
          youtubeId
        ] ||
        null;


      if (
        !mediaId
      ) {

        mediaId =
          legacyEntity
            ? (
                'ENT-' +
                legacyEntity.entity_id +
                '-' +
                youtubeId
              )
            : (
                'YT-' +
                youtubeId
              );


        warnings.push(
          CONFIG.TV_MEDIA_SHEET +
          ' fila ' +
          item.rowNumber +
          ': media_id vacío; exportado como ' +
          mediaId +
          '.'
        );
      }


      if (
        mediaIds[
          mediaId
        ]
      ) {

        errors.push(
          'media_id duplicado: ' +
          mediaId +
          ' (filas ' +
          mediaIds[mediaId] +
          ' y ' +
          item.rowNumber +
          ').'
        );

        return;
      }


      if (
        youtubeIds[
          youtubeId
        ]
      ) {

        warnings.push(
          'youtube_id duplicado en _tv_media: ' +
          youtubeId +
          ' (se conserva la primera fila válida).'
        );

        return;
      }


      mediaIds[
        mediaId
      ] =
        item.rowNumber;


      youtubeIds[
        youtubeId
      ] =
        item.rowNumber;


      const programId =
        tvText_(
          row.program_id
        );


      const channelIds =
        tvSplitList_(
          row.channels
        );


      if (
        programId &&
        !configResult.programIndex[
          programId
        ]
      ) {

        warnings.push(
          mediaId +
          ': program_id desconocido: ' +
          programId +
          '.'
        );
      }


      channelIds.forEach(
        channelId => {

          if (
            !configResult.channelIndex[
              channelId
            ]
          ) {

            warnings.push(
              mediaId +
              ': canal desconocido en channels: ' +
              channelId +
              '.'
            );
          }
        }
      );


      const active =
        tvIsActive_(
          row.status
        );


      const embeddable =
        isTruthyFlag(
          row.embeddable
        );


      const privacyStatus =
        normalizeTextKey(
          row.privacy_status
        );


      const rightsStatus =
        normalizeTextKey(
          row.rights_status
        );


      const entityType =
        normalizeTextKey(
          type
        ) ===
        'entity';


      const entityPublic =
        entityType &&
        !!legacyEntity;


      const externalRightsOk =
        CONFIG
          .TV_ALLOWED_EXTERNAL_RIGHTS_STATUSES
          .includes(
            rightsStatus
          );


      const rightsOk =
        entityType
          ? entityPublic
          : externalRightsOk;


      const privacyOk =
        privacyStatus !== 'private';


      const playable =
        active &&
        embeddable &&
        privacyOk &&
        rightsOk;


      const durationSeconds =
        tvNumberOrNull_(
          row.duration_seconds
        );


      const entityCreatedAt =
        legacyEntity
          ? tvIsoDateOrBlank_(
              legacyEntity.date_created
            )
          : '';


      const isNewEntity =
        entityType &&
        entityCreatedAt
          ? tvIsWithinHours_(
              entityCreatedAt,
              now,
              CONFIG.TV_NEW_ENTITY_HOURS
            )
          : false;


      const itemOut = {
        media_id:
          mediaId,

        type:
          type,

        program_id:
          programId,

        tv_description:
          tvText_(
            row.tv_description
          ),

        display_description:
          tvText_(
            row.tv_description
          ) ||
          tvText_(
            row.description
          ),

        tags:
          tvSplitList_(
            row.tags
          ),

        channels:
          channelIds,

        rights_status:
          tvText_(
            row.rights_status
          ),

        source:
          tvText_(
            row.source
          ),

        status:
          tvText_(
            row.status
          ),

        youtube_id:
          youtubeId,

        embeddable:
          embeddable,

        privacy_status:
          tvText_(
            row.privacy_status
          ),

        title:
          tvText_(
            row.title
          ),

        description:
          tvText_(
            row.description
          ),

        channel_title:
          tvText_(
            row.channel_title
          ),

        thumbnail:
          tvText_(
            row.thumbnail
          ),

        published_at:
          tvExportDateValue_(
            row.published_at
          ),

        youtube_tags:
          tvText_(
            row.youtube_tags
          ),

        duration_seconds:
          durationSeconds,

        youtube_license:
          tvText_(
            row.youtube_license
          ),

        metadata_updated_at:
          tvExportDateValue_(
            row.metadata_updated_at
          ),

        entity_id:
          legacyEntity
            ? legacyEntity.entity_id
            : '',

        entity_created_at:
          entityCreatedAt,

        is_new_entity:
          isNewEntity,

        active:
          active,

        playable:
          playable,

        schedulable:
          playable &&
          !!programId &&
          (
            entityType ||
            channelIds.length > 0
          )
      };


      if (
        active &&
        !embeddable
      ) {

        warnings.push(
          mediaId +
          ': Activo pero no embebible.'
        );
      }


      if (
        active &&
        !rightsOk
      ) {

        warnings.push(
          mediaId +
          ': Activo pero rights_status no permite emisión automática (' +
          tvText_(
            row.rights_status
          ) +
          ').'
        );
      }


      media.push(
        itemOut
      );
    }
  );


  return {
    media:
      media,

    warnings:
      warnings,

    errors:
      errors
  };
}


function buildTvPolicy_(
  media
) {

  const playableEntities =
    media.filter(
      item =>
        normalizeTextKey(
          item.type
        ) === 'entity' &&
        item.playable
    );


  const totalSeconds =
    playableEntities
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.duration_seconds || 0
          ),
        0
      );


  const totalMinutes =
    totalSeconds /
    60;


  let currentTier =
    CONFIG
      .TV_ENTITY_ROTATION_TIERS[
        CONFIG.TV_ENTITY_ROTATION_TIERS.length - 1
      ];


  for (
    let i = 0;
    i < CONFIG.TV_ENTITY_ROTATION_TIERS.length;
    i++
  ) {

    const tier =
      CONFIG.TV_ENTITY_ROTATION_TIERS[i];


    if (
      tier.max_minutes === null ||
      totalMinutes <=
        tier.max_minutes
    ) {

      currentTier =
        tier;

      break;
    }
  }


  return {
    entity_rotation:
      {
        selection_order: [
          'deadline_risk',
          'least_recently_aired',
          'fewest_historical_airs',
          'deterministic_entity_id'
        ],

        total_playable_entities:
          playableEntities.length,

        total_duration_seconds:
          totalSeconds,

        current_full_cycle_hours:
          currentTier.full_cycle_hours,

        tiers:
          CONFIG.TV_ENTITY_ROTATION_TIERS
      },

    entity_new:
      {
        new_for_hours:
          CONFIG.TV_NEW_ENTITY_HOURS,

        selection_rule:
          'entity_new',

        premium_windows:
          [
            '09:00',
            '13:30',
            '18:30',
            '21:30'
          ]
      },

    rights:
      {
        external_allowed_statuses:
          CONFIG.TV_ALLOWED_EXTERNAL_RIGHTS_STATUSES,

        entity_rule:
          'La ficha debe ser pública y el vídeo debe ser reproducible.'
      }
  };
}


function validateTvConfiguration() {

  const payload =
    buildTvExport();


  const errors =
    payload.tv_config.errors || [];


  const warnings =
    payload.tv_config.warnings || [];


  const media =
    payload.media || [];


  const playable =
    media.filter(
      item =>
        item.playable
    ).length;


  const newEntities =
    media.filter(
      item =>
        item.playable &&
        item.is_new_entity
    ).length;


  let message =
    'ARCHIPIÉLAGO VIVO TV · VALIDACIÓN\n\n' +
    'Configuración válida: ' +
    (
      errors.length === 0
        ? 'SÍ'
        : 'NO'
    ) +
    '\n' +
    'Canales: ' +
    payload.channels.length +
    '\n' +
    'Canal por defecto: ' +
    payload.tv_config.default_channel_id +
    '\n' +
    'Continuidad 30 s: ' +
    (
      payload.presentation &&
      payload.presentation.program_change_teasers &&
      payload.presentation.program_change_teasers.enabled
        ? 'ACTIVA'
        : 'INACTIVA'
    ) +
    '\n' +
    'Programas: ' +
    payload.programs.length +
    '\n' +
    'Filas de parrilla: ' +
    payload.schedule.length +
    '\n' +
    'Media reproducible: ' +
    playable +
    '\n' +
    'Entities nuevas: ' +
    newEntities +
    '\n' +
    'Vuelta completa entity: ' +
    payload.policy.entity_rotation.current_full_cycle_hours +
    ' h';


  if (
    errors.length
  ) {

    message +=
      '\n\nERRORES (' +
      errors.length +
      ')\n- ' +
      errors
        .slice(0, 12)
        .join(
          '\n- '
        );


    if (
      errors.length > 12
    ) {

      message +=
        '\n… +' +
        (
          errors.length -
          12
        ) +
        ' errores más. Consulta ?export=tv.';
    }
  }


  if (
    warnings.length
  ) {

    message +=
      '\n\nAVISOS (' +
      warnings.length +
      ')\n- ' +
      warnings
        .slice(0, 10)
        .join(
          '\n- '
        );


    if (
      warnings.length > 10
    ) {

      message +=
        '\n… +' +
        (
          warnings.length -
          10
        ) +
        ' avisos más. Consulta ?export=tv.';
    }
  }


  SpreadsheetApp
    .getUi()
    .alert(
      message
    );


  return payload.tv_config;
}


function readTvSheetRows_(
  sheetName,
  requiredHeaders,
  errors
) {

  let sheet;


  try {

    sheet =
      getSheet(
        sheetName
      );

  } catch (error) {

    errors.push(
      error.message
    );

    return [];
  }


  if (
    sheet.getLastColumn() === 0
  ) {

    errors.push(
      sheetName +
      ': hoja sin columnas.'
    );

    return [];
  }


  const range =
    sheet.getDataRange();


  const values =
    range.getValues();


  const displays =
    range.getDisplayValues();


  if (
    values.length === 0
  ) {

    return [];
  }


  const headers =
    values[0]
      .map(
        value =>
          tvText_(
            value
          )
      );


  const missing =
    requiredHeaders
      .filter(
        header =>
          !headers.includes(
            header
          )
      );


  if (
    missing.length
  ) {

    errors.push(
      sheetName +
      ': faltan columnas: ' +
      missing.join(
        ', '
      ) +
      '.'
    );

    return [];
  }


  const rows = [];


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const valueRow =
      values[i];


    if (
      !valueRow.some(
        value =>
          tvText_(
            value
          ) !== ''
      )
    ) {

      continue;
    }


    const row = {};
    const display = {};


    headers.forEach(
      (header, columnIndex) => {

        row[
          header
        ] =
          valueRow[
            columnIndex
          ];


        display[
          header
        ] =
          displays[i][
            columnIndex
          ];
      }
    );


    rows.push(
      {
        rowNumber:
          i + 1,

        row:
          row,

        display:
          display
      }
    );
  }


  return rows;
}


function tvNormalizeTime_(
  value,
  allow24
) {

  let text =
    tvText_(
      value
    );


  if (!text) {

    return '';
  }


  const match =
    text.match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?$/
    );


  if (!match) {

    return '';
  }


  const hours =
    Number(
      match[1]
    );


  const minutes =
    Number(
      match[2]
    );


  if (
    minutes < 0 ||
    minutes > 59
  ) {

    return '';
  }


  if (
    hours === 24
  ) {

    if (
      !allow24 ||
      minutes !== 0
    ) {

      return '';
    }


    return '24:00';
  }


  if (
    hours < 0 ||
    hours > 23
  ) {

    return '';
  }


  return (
    String(hours)
      .padStart(
        2,
        '0'
      ) +
    ':' +
    String(minutes)
      .padStart(
        2,
        '0'
      )
  );
}


function tvTimeToMinutes_(
  value
) {

  if (
    value === '24:00'
  ) {

    return 1440;
  }


  const parts =
    String(
      value
    )
      .split(
        ':'
      );


  return (
    Number(
      parts[0]
    ) *
    60 +
    Number(
      parts[1]
    )
  );
}


function tvParseDays_(
  value,
  rowErrors
) {

  const allowed = [
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun'
  ];


  const days =
    tvSplitList_(
      value
    )
      .map(
        day =>
          day.toLowerCase()
      );


  if (
    days.length === 0
  ) {

    rowErrors.push(
      'days vacío.'
    );

    return [];
  }


  days.forEach(
    day => {

      if (
        !allowed.includes(
          day
        )
      ) {

        rowErrors.push(
          'día no válido: ' +
          day +
          '.'
        );
      }
    }
  );


  return days;
}


function tvSplitList_(
  value
) {

  return String(
    value === null ||
    value === undefined
      ? ''
      : value
  )
    .split(
      /[,;\n\r]+/
    )
    .map(
      item =>
        item.trim()
    )
    .filter(
      Boolean
    );
}


function tvText_(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return '';
  }


  return String(
    value
  )
    .trim();
}


function tvNumberOrNull_(
  value
) {

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {

    return null;
  }


  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : null;
}


function tvIsActive_(
  value
) {

  return normalizeTextKey(
    value
  ) ===
  normalizeTextKey(
    CONFIG.PUBLIC_STATUS
  );
}


function tvExportDateValue_(
  value
) {

  if (
    value instanceof Date &&
    !isNaN(
      value.getTime()
    )
  ) {

    return value
      .toISOString();
  }


  return tvText_(
    value
  );
}


function tvIsoDateOrBlank_(
  value
) {

  if (!value) {

    return '';
  }


  if (
    value instanceof Date &&
    !isNaN(
      value.getTime()
    )
  ) {

    return value
      .toISOString();
  }


  const date =
    new Date(
      value
    );


  return isNaN(
    date.getTime()
  )
    ? tvText_(
        value
      )
    : date.toISOString();
}


function tvIsWithinHours_(
  isoDate,
  now,
  hours
) {

  const date =
    new Date(
      isoDate
    );


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return false;
  }


  const ageMs =
    now.getTime() -
    date.getTime();


  return (
    ageMs >= 0 &&
    ageMs <=
      Number(hours) *
      60 *
      60 *
      1000
  );
}


function uniqueTvMessages_(
  messages
) {

  return Array.from(
    new Set(
      messages
        .map(
          message =>
            tvText_(
              message
            )
        )
        .filter(
          Boolean
        )
    )
  );
}


function extractYouTubeVideoIds(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return [];
  }


  const text =
    String(
      value
    );


  const candidates =
    text
      .split(
        /[\n\r,;]+/
      )
      .map(
        item =>
          item.trim()
      )
      .filter(
        Boolean
      );


  const ids = [];


  candidates
    .forEach(
      candidate => {

        const id =
          parseYouTubeVideoId(
            candidate
          );


        if (
          id &&
          !ids.includes(
            id
          )
        ) {

          ids.push(
            id
          );
        }
      }
    );


  if (
    ids.length === 0
  ) {

    const pattern =
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/gi;


    let match;


    while (
      (
        match =
          pattern.exec(
            text
          )
      ) !== null
    ) {

      const id =
        match[1];


      if (
        !ids.includes(
          id
        )
      ) {

        ids.push(
          id
        );
      }
    }
  }


  return ids;
}


function parseYouTubeVideoId(
  value
) {

  const text =
    String(
      value || ''
    )
      .trim();


  if (
    /^[A-Za-z0-9_-]{11}$/.test(
      text
    )
  ) {

    return text;
  }


  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/i,
    /[?&]v=([A-Za-z0-9_-]{11})/i,
    /youtube(?:-nocookie)?\.com\/shorts\/([A-Za-z0-9_-]{11})/i,
    /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/i
  ];


  for (
    let i = 0;
    i < patterns.length;
    i++
  ) {

    const match =
      text.match(
        patterns[i]
      );


    if (match) {

      return match[1];
    }
  }


  return null;
}
