/**
 * ARCHIPIÉLAGO VIVO · REFERENCIAS DE FUENTE
 *
 * Helpers compartidos para construir referencias de auditoría.
 *
 * Se usa un nombre interno único para evitar colisiones con
 * versiones antiguas del proyecto.
 */


function avBuildFormConsentSourceReference_(
  entityId,
  rowNumber,
  action
) {

  return (
    'FORM:' +
    String(
      entityId || ''
    )
      .trim()
      .toUpperCase() +
    ':ROW:' +
    String(
      rowNumber || ''
    ) +
    ':' +
    String(
      action || 'submit'
    )
  );
}
