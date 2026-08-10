/**
 * ARCHIPIÉLAGO VIVO · PRIVACIDAD
 */

function getEffectivePublicationConsent(
  response
) {

  const first =
    String(
      response.consent_publication || ''
    )
      .trim();


  const second =
    String(
      response.re_consent_publication || ''
    )
      .trim();


  if (
    isYes(first)
  ) {

    return first;
  }


  if (
    isYes(second)
  ) {

    return second;
  }


  if (
    isNo(second)
  ) {

    return second;
  }


  return first;
}


function isYes(value) {

  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();


  return (
    normalized === 'sí' ||
    normalized === 'si' ||
    normalized.startsWith('sí,') ||
    normalized.startsWith('si,')
  );
}


function isNo(value) {

  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();


  return (
    normalized === 'no' ||
    normalized.startsWith('no,')
  );
}


/**
 * ============================================================
 * CREAR REGISTRO EN DATA
 * ============================================================
 */


function parsePrivateFields(
  value
) {

  if (!value) {
    return [];
  }


  return String(value)
    .split(',')
    .map(
      item =>
        item
          .trim()
          .toLowerCase()
    )
    .filter(Boolean);
}


function isPrivate(
  privateFields,
  label
) {

  return privateFields.includes(
    String(label)
      .trim()
      .toLowerCase()
  );
}


/**
 * ============================================================
 * PROCESSED
 * ============================================================
 */
