/**
 * ARCHIPIÉLAGO VIVO · DISPERSIÓN VISUAL DE PUNTOS
 *
 * Evita que varias entidades con la misma coordenada
 * representativa queden exactamente superpuestas.
 *
 * REGLAS:
 * - No modifica data ni _locations.
 * - Solo actúa si 2 o más entidades coinciden en el mismo punto.
 * - El desplazamiento es determinista a partir de entity_id:
 *   la entidad no "salta" de sitio en cada exportación.
 * - Municipio, isla y Canarias usan radios distintos.
 */


function applyDisplayPointSpread(
  entities
) {

  const groups = {};


  entities.forEach(
    entity => {

      const key =
        buildPointGroupKey(
          entity
        );


      if (
        !groups[key]
      ) {

        groups[key] = [];
      }


      groups[key].push(
        entity
      );
    }
  );


  Object.keys(
    groups
  ).forEach(
    key => {

      const group =
        groups[key];


      if (
        group.length < 2
      ) {

        return;
      }


      group.forEach(
        entity => {

          const scope =
            getDisplayPointScope(
              entity
            );


          const maxRadius =
            CONFIG
              .POINT_SPREAD_METERS[
                scope
              ];


          const offset =
            deterministicPointOffset(
              entity.entity_id,
              maxRadius
            );


          const moved =
            offsetCoordinatesMeters(
              entity.lat,
              entity.lon,
              offset.north,
              offset.east
            );


          entity.lat =
            moved.lat;


          entity.lon =
            moved.lon;
        }
      );
    }
  );


  return entities;
}


function buildPointGroupKey(
  entity
) {

  /*
   * Se redondea a 6 decimales (~10 cm).
   * En la práctica las coordenadas de _locations coinciden
   * exactamente, pero esto evita problemas de representación.
   */

  return (
    Number(
      entity.lat
    ).toFixed(
      6
    ) +
    '|' +
    Number(
      entity.lon
    ).toFixed(
      6
    )
  );
}


function getDisplayPointScope(
  entity
) {

  if (
    entity.layer ===
    'canarias'
  ) {

    return 'canarias';
  }


  if (
    entity.properties &&
    String(
      entity.properties.municipality ||
      ''
    ).trim() !== ''
  ) {

    return 'municipality';
  }


  return 'island';
}


function deterministicPointOffset(
  entityId,
  maxRadiusMeters
) {

  /*
   * Dos hashes distintos derivados del mismo entity_id:
   * uno determina el ángulo y otro la distancia.
   *
   * sqrt() reparte los puntos uniformemente por el área
   * del círculo, no amontonados en el centro.
   */

  const hashAngle =
    stableStringHash(
      'angle:' +
      entityId
    );


  const hashRadius =
    stableStringHash(
      'radius:' +
      entityId
    );


  const angle =
    (
      hashAngle %
      1000000
    ) /
    1000000 *
    Math.PI *
    2;


  const radialUnit =
    (
      hashRadius %
      1000000
    ) /
    1000000;


  /*
   * Evitamos que un punto quede prácticamente en el centro:
   * mínimo 20 % y máximo 100 % del radio configurado.
   */

  const radius =
    maxRadiusMeters *
    (
      0.20 +
      0.80 *
      Math.sqrt(
        radialUnit
      )
    );


  return {
    north:
      Math.cos(
        angle
      ) *
      radius,

    east:
      Math.sin(
        angle
      ) *
      radius
  };
}


function stableStringHash(
  value
) {

  /*
   * FNV-1a de 32 bits.
   * Determinista y suficiente para dispersión visual.
   */

  let hash =
    2166136261;


  const text =
    String(
      value || ''
    );


  for (
    let i = 0;
    i < text.length;
    i++
  ) {

    hash ^=
      text.charCodeAt(
        i
      );


    hash =
      Math.imul(
        hash,
        16777619
      );
  }


  return hash >>> 0;
}


function offsetCoordinatesMeters(
  lat,
  lon,
  northMeters,
  eastMeters
) {

  const latitude =
    Number(
      lat
    );


  const longitude =
    Number(
      lon
    );


  /*
   * Aproximación local más que suficiente para los radios
   * utilizados aquí.
   */

  const metersPerDegreeLat =
    111320;


  const latitudeRadians =
    latitude *
    Math.PI /
    180;


  const metersPerDegreeLon =
    metersPerDegreeLat *
    Math.cos(
      latitudeRadians
    );


  return {
    lat:
      latitude +
      northMeters /
      metersPerDegreeLat,

    lon:
      longitude +
      eastMeters /
      metersPerDegreeLon
  };
}
