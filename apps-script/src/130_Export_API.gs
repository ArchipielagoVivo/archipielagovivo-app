/**
 * ARCHIPIÉLAGO VIVO · API PÚBLICA DE EXPORTS
 *
 * El proyecto debe desplegarse como Web App.
 *
 * Endpoints:
 *   ?export=manifest
 *   ?export=umap&layer=tenerife
 *   ?export=tv
 *
 * Opcional:
 *   &callback=miFuncion
 * devuelve JSONP para clientes web que lo necesiten.
 */


function doGet(
  e
) {

  try {

    const params =
      e &&
      e.parameter
        ? e.parameter
        : {};


    const exportType =
      normalizeTextKey(
        params.export ||
        'manifest'
      );


    let payload;


    if (
      exportType === 'umap'
    ) {

      payload =
        buildUmapGeoJson(
          params.layer ||
          ''
        );


    } else if (
      exportType === 'tv'
    ) {

      payload =
        buildTvExport();


    } else if (
      exportType === 'manifest'
    ) {

      payload =
        buildExportManifest();


    } else {

      return createExportResponse(
        {
          ok:
            false,

          error:
            'Export no válido: ' +
            exportType
        },
        params.callback,
        400
      );
    }


    return createExportResponse(
      payload,
      params.callback,
      200
    );


  } catch (error) {

    return createExportResponse(
      {
        ok:
          false,

        error:
          error.message,

        generated_at:
          new Date()
            .toISOString()
      },
      e &&
      e.parameter
        ? e.parameter.callback
        : '',
      500
    );
  }
}


function buildExportManifest() {

  const serviceUrl =
    ScriptApp
      .getService()
      .getUrl();


  const result =
    getPublicEntities();


  const layerCounts = {};


  CONFIG.EXPORT_LAYERS
    .forEach(
      layer => {

        layerCounts[layer] = 0;
      }
    );


  result.entities
    .forEach(
      entity => {

        if (
          layerCounts[
            entity.layer
          ] !== undefined
        ) {

          layerCounts[
            entity.layer
          ]++;
        }
      }
    );


  const layerUrls = {};


  CONFIG.EXPORT_LAYERS
    .forEach(
      layer => {

        layerUrls[layer] =
          serviceUrl
            ? (
                serviceUrl +
                '?export=umap&layer=' +
                encodeURIComponent(
                  layer
                )
              )
            : '';
      }
    );


  return {
    name:
      'Archipiélago Vivo Public Exports',

    schema_version:
      1,

    generated_at:
      new Date()
        .toISOString(),

    source_entities:
      getAllDataRecords().length,

    public_entities:
      result.entities.length,

    warnings:
      result.warnings,

    umap:
      {
        format:
          'GeoJSON',

        map_url:
          CONFIG.UMAP_MAP_BASE_URL,

        layers:
          layerCounts,

        urls:
          layerUrls
      },

    tv:
      {
        schema_version:
          2,

        playlist_id:
          CONFIG.TV_PLAYLIST_ID,

        url:
          serviceUrl
            ? serviceUrl +
              '?export=tv'
            : ''
      }
  };
}


function createExportResponse(
  payload,
  callback,
  statusCode
) {

  /*
   * ContentService no permite fijar un código HTTP
   * arbitrario; statusCode queda dentro de la carga útil
   * para diagnóstico.
   */

  if (
    payload &&
    typeof payload === 'object' &&
    payload.ok === undefined &&
    statusCode >= 400
  ) {

    payload.ok =
      false;
  }


  if (
    payload &&
    typeof payload === 'object' &&
    statusCode >= 400
  ) {

    payload.status =
      statusCode;
  }


  const json =
    JSON.stringify(
      payload
    );


  const safeCallback =
    validateJsonpCallback(
      callback
    );


  if (safeCallback) {

    return ContentService
      .createTextOutput(
        safeCallback +
        '(' +
        json +
        ');'
      )
      .setMimeType(
        ContentService
          .MimeType
          .JAVASCRIPT
      );
  }


  return ContentService
    .createTextOutput(
      json
    )
    .setMimeType(
      ContentService
        .MimeType
        .JSON
    );
}


function validateJsonpCallback(
  value
) {

  const callback =
    String(
      value || ''
    )
      .trim();


  if (!callback) {

    return '';
  }


  if (
    !/^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(
      callback
    )
  ) {

    throw new Error(
      'callback JSONP no válido.'
    );
  }


  return callback;
}


function showExportUrls() {

  const serviceUrl =
    ScriptApp
      .getService()
      .getUrl();


  if (!serviceUrl) {

    SpreadsheetApp
      .getUi()
      .alert(
        'El proyecto todavía no tiene una URL pública de Web App.\n\n' +
        'Despliega Apps Script como aplicación web y vuelve a ejecutar esta opción.'
      );

    return;
  }


  const message =
    'MANIFEST\n' +
    serviceUrl +
    '?export=manifest\n\n' +

    'uMap · Tenerife\n' +
    serviceUrl +
    '?export=umap&layer=tenerife\n\n' +

    'TV\n' +
    serviceUrl +
    '?export=tv\n\n' +

    'El manifest contiene las URLs de las 9 capas.';


  SpreadsheetApp
    .getUi()
    .alert(
      message
    );
}
