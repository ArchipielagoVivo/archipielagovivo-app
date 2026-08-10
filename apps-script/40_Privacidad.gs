/**
 * ARCHIPIÉLAGO VIVO · PRIVACIDAD
 */

function getEffectivePublicationConsent(
  response
) {

  return (
    isYes(
      response.consent_publication
    ) ||
    isYes(
      response.re_consent_publication
    )
  );
}


function toConsentBoolean(
  value
) {

  return isYes(
    value
  );
}


function hasConsentInputValue(
  value
) {

  if (
    typeof value === 'boolean'
  ) {

    return true;
  }


  return (
    value !== undefined &&
    value !== null &&
    String(
      value
    ).trim() !== ''
  );
}


function isYes(
  value
) {

  if (
    value === true ||
    value === 1
  ) {

    return true;
  }


  if (
    value === false ||
    value === 0
  ) {

    return false;
  }


  const normalized =
    String(
      value || ''
    )
      .trim()
      .toLowerCase();


  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'sí' ||
    normalized === 'si' ||
    normalized.startsWith('sí,') ||
    normalized.startsWith('si,')
  );
}


function isNo(
  value
) {

  if (
    value === false ||
    value === 0
  ) {

    return true;
  }


  if (
    value === true ||
    value === 1
  ) {

    return false;
  }


  const normalized =
    String(
      value || ''
    )
      .trim()
      .toLowerCase();


  return (
    normalized === 'false' ||
    normalized === '0' ||
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
