/**
 * ARCHIPIÉLAGO VIVO · EXPORT uMap
 *
 * Devuelve GeoJSON FeatureCollection.
 *
 * URL:
 *   ?export=umap&layer=tenerife
 */


function buildUmapGeoJson(
  layer
) {

  const normalizedLayer =
    normalizeExportLayer(
      layer
    );


  const result =
    getPublicEntities();


  const features =
    result.entities
      .filter(
        entity =>
          normalizedLayer === 'all' ||
          entity.layer ===
          normalizedLayer
      )
      .map(
        entity => ({
          type:
            'Feature',

          geometry:
            {
              type:
                'Point',

              coordinates:
                [
                  entity.lon,
                  entity.lat
                ]
            },

          properties:
            entity.properties
        })
      );


  return {
    type:
      'FeatureCollection',

    features:
      features,

    archipielago_vivo:
      {
        schema_version:
          1,

        generated_at:
          new Date()
            .toISOString(),

        layer:
          normalizedLayer,

        feature_count:
          features.length,

        warnings:
          result.warnings
      }
  };
}


function normalizeExportLayer(
  value
) {

  const layer =
    normalizeTextKey(
      value || ''
    )
      .replace(
        /\s+/g,
        '-'
      );


  if (
    layer === 'all'
  ) {

    return 'all';
  }


  if (
    !CONFIG.EXPORT_LAYERS.includes(
      layer
    )
  ) {

    throw new Error(
      'Capa no válida: "' +
      value +
      '". Capas permitidas: ' +
      CONFIG.EXPORT_LAYERS.join(
        ', '
      )
    );
  }


  return layer;
}
