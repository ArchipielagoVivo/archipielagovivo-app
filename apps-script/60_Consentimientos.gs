/**
 * ARCHIPIÉLAGO VIVO · _CONSENTS
 */

function getConsentsSheet() {

  return getSheet(
    CONFIG.CONSENTS_SHEET
  );
}


function getConsentState(
  value
) {

  if (
    !hasConsentInputValue(
      value
    )
  ) {

    return null;
  }


  if (
    isYes(
      value
    )
  ) {

    return 'granted';
  }


  if (
    isNo(
      value
    )
  ) {

    return 'denied';
  }


  return null;
}


function getConsentValueForPurpose(
  response,
  purpose
) {

  if (
    purpose === 'publication'
  ) {

    return getEffectivePublicationConsent(
      response
    );
  }


  const definition =
    CONSENT_DEFINITIONS[
      purpose
    ];


  return response[
    definition.field
  ];
}


function hasConsentFieldInPartialInput(
  response,
  purpose
) {

  if (
    purpose === 'publication'
  ) {

    return hasConsentInputValue(
      response.consent_publication
    );
  }


  const definition =
    CONSENT_DEFINITIONS[
      purpose
    ];


  return hasConsentInputValue(
    response[
      definition.field
    ]
  );
}


function buildConsentText(
  response,
  purpose
) {

  const definition =
    CONSENT_DEFINITIONS[
      purpose
    ];


  if (
    purpose === 'publication' &&
    isNo(
      response.consent_publication
    ) &&
    String(
      response.re_consent_publication ||
      ''
    ).trim() !== ''
  ) {

    return (
      definition.text +
      '\n\nReconfirmación:\n' +
      definition.reconfirmationText
    );
  }


  return definition.text;
}


function buildConsentNotes(
  response,
  purpose
) {

  if (
    purpose !== 'publication'
  ) {

    return '';
  }


  const first =
    String(
      response.consent_publication || ''
    ).trim();

  const second =
    String(
      response.re_consent_publication || ''
    ).trim();


  if (!second) {

    return '';
  }


  return (
    'Respuesta inicial: ' +
    first +
    ' · Reconfirmación: ' +
    second
  );
}


function recordInitialConsents(
  response,
  entityId,
  meta
) {

  meta =
    meta || {};


  const eventDate =
    meta.eventDate ||
    new Date();


  Object.keys(
    CONSENT_DEFINITIONS
  ).forEach(
    purpose => {

      if (
        meta.partial &&
        !hasConsentFieldInPartialInput(
          response,
          purpose
        )
      ) {

        return;
      }


      const value =
        getConsentValueForPurpose(
          response,
          purpose
        );


      const state =
        getConsentState(
          value
        );


      /*
       * Una respuesta vacía no crea un consentimiento.
       */

      if (!state) {

        return;
      }


      appendConsentRecord(
        {
          entity_id:
            entityId,

          purpose:
            purpose,

          status:
            state,

          granted_at:
            state === 'granted'
              ? eventDate
              : '',

          withdrawn_at:
            '',

          source:
            meta.source ||
            'unknown',

          source_reference:
            meta.sourceReference ||
            '',

          consent_version:
            CONFIG.CONSENT_VERSION,

          consent_text:
            buildConsentText(
              response,
              purpose
            ),

          recorded_by:
            meta.recordedBy ||
            'automatic',

          notes:
            buildConsentNotes(
              response,
              purpose
            )
        }
      );
    }
  );
}


function recordConsentChanges(
  response,
  entityId,
  oldRecord,
  meta
) {

  meta =
    meta || {};

  oldRecord =
    oldRecord || {};


  const eventDate =
    meta.eventDate ||
    new Date();


  Object.keys(
    CONSENT_DEFINITIONS
  ).forEach(
    purpose => {

      const definition =
        CONSENT_DEFINITIONS[
          purpose
        ];


      if (
        meta.partial &&
        !hasConsentFieldInPartialInput(
          response,
          purpose
        )
      ) {

        return;
      }


      const oldValue =
        oldRecord[
          definition.field
        ];


      const newValue =
        getConsentValueForPurpose(
          response,
          purpose
        );


      const oldState =
        getConsentState(
          oldValue
        );


      const newState =
        getConsentState(
          newValue
        );


      if (
        oldState ===
        newState
      ) {

        return;
      }


      /*
       * Si había consentimiento y deja de haberlo,
       * cerramos el consentimiento concedido.
       */

      if (
        oldState === 'granted' &&
        newState !== 'granted'
      ) {

        withdrawLatestGrantedConsent(
          entityId,
          purpose,
          eventDate
        );
      }


      /*
       * Nuevo consentimiento concedido:
       * siempre crea un nuevo evento.
       */

      if (
        newState === 'granted'
      ) {

        appendConsentRecord(
          {
            entity_id:
              entityId,

            purpose:
              purpose,

            status:
              'granted',

            granted_at:
              eventDate,

            withdrawn_at:
              '',

            source:
              meta.source ||
              'unknown',

            source_reference:
              meta.sourceReference ||
              '',

            consent_version:
              CONFIG.CONSENT_VERSION,

            consent_text:
              buildConsentText(
                response,
                purpose
              ),

            recorded_by:
              meta.recordedBy ||
              'automatic',

            notes:
              buildConsentNotes(
                response,
                purpose
              )
          }
        );

        return;
      }


      /*
       * Un "No" explícito se registra.
       *
       * Si antes había un "Sí", la fila anterior queda
       * como withdrawn y además registramos este "No".
       */

      if (
        newState === 'denied'
      ) {

        appendConsentRecord(
          {
            entity_id:
              entityId,

            purpose:
              purpose,

            status:
              'denied',

            granted_at:
              '',

            withdrawn_at:
              '',

            source:
              meta.source ||
              'unknown',

            source_reference:
              meta.sourceReference ||
              '',

            consent_version:
              CONFIG.CONSENT_VERSION,

            consent_text:
              buildConsentText(
                response,
                purpose
              ),

            recorded_by:
              meta.recordedBy ||
              'automatic',

            notes:
              buildConsentNotes(
                response,
                purpose
              )
          }
        );
      }
    }
  );
}


function appendConsentRecord(
  record
) {

  const sheet =
    getConsentsSheet();


  record.consent_id =
    generateUniquePrefixedId(
      sheet,
      'consent_id',
      CONFIG.CONSENT_ID_PREFIX,
      10
    );


  const headers =
    getHeaders(
      sheet
    );


  const required =
    [
      'consent_id',
      'entity_id',
      'purpose',
      'status',
      'granted_at',
      'withdrawn_at',
      'source',
      'source_reference',
      'consent_version',
      'consent_text',
      'recorded_by',
      'notes'
    ];


  assertRequiredHeaders(
    headers,
    required,
    sheet.getName()
  );


  sheet.appendRow(
    headers.map(
      header =>
        record[header] !== undefined
          ? record[header]
          : ''
    )
  );
}


function withdrawLatestGrantedConsent(
  entityId,
  purpose,
  withdrawnAt
) {

  const sheet =
    getConsentsSheet();


  const headers =
    getHeaders(
      sheet
    );


  const index =
    createHeaderIndex(
      headers
    );


  [
    'entity_id',
    'purpose',
    'status',
    'withdrawn_at'
  ].forEach(
    header => {

      if (
        index[
          header
        ] === undefined
      ) {

        throw new Error(
          'Falta la columna "' +
          header +
          '" en ' +
          sheet.getName()
        );
      }
    }
  );


  const lastRow =
    sheet.getLastRow();


  for (
    let rowNumber =
      lastRow;
    rowNumber >= 2;
    rowNumber--
  ) {

    const row =
      sheet
        .getRange(
          rowNumber,
          1,
          1,
          headers.length
        )
        .getValues()[0];


    const rowEntityId =
      String(
        row[
          index.entity_id
        ] || ''
      )
        .trim()
        .toUpperCase();


    const rowPurpose =
      String(
        row[
          index.purpose
        ] || ''
      )
        .trim()
        .toLowerCase();


    const rowStatus =
      String(
        row[
          index.status
        ] || ''
      )
        .trim()
        .toLowerCase();


    if (
      rowEntityId ===
        String(
          entityId
        )
          .trim()
          .toUpperCase() &&
      rowPurpose ===
        String(
          purpose
        )
          .trim()
          .toLowerCase() &&
      rowStatus ===
        'granted'
    ) {

      sheet
        .getRange(
          rowNumber,
          index.status + 1
        )
        .setValue(
          'withdrawn'
        );


      sheet
        .getRange(
          rowNumber,
          index.withdrawn_at + 1
        )
        .setValue(
          withdrawnAt
        );


      return true;
    }
  }


  return false;
}


/**
 * ============================================================
 * SINCRONIZACIÓN DE EDICIONES DE GOOGLE FORMS
 * ============================================================
 *
 * El activador "Al enviar formulario" de la HOJA procesa
 * las altas. Para detectar cambios realizados posteriormente
 * mediante el enlace de edición, guardamos una huella de cada
 * respuesta y revisamos periódicamente form_responses.
 */
