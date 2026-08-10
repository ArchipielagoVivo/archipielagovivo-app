/**
 * ARCHIPIÉLAGO VIVO · EXPORT TV
 *
 * Relaciona vídeo de YouTube ↔ entidad pública.
 *
 * URL:
 *   ?export=tv
 */


function buildTvExport() {

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
                  entity.properties.img || ''
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
    schema_version:
      1,

    generated_at:
      new Date()
        .toISOString(),

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

    videos:
      videos,

    entities:
      entities,

    conflicts:
      duplicates,

    warnings:
      result.warnings
  };
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


  /*
   * Si todo el campo era un único texto con espacios,
   * todavía intentamos extraer IDs de URLs incrustadas.
   */

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
