/**
 * ARCHIPIÉLAGO VIVO · CONFIGURACIÓN GLOBAL
 * Sin efectos secundarios de nivel superior.
 */

const CONFIG = {
  FORM_SHEET: 'form_responses',
  MANUAL_SHEET: '_manual',
  DATA_SHEET: 'data',
  LOCATIONS_SHEET: '_locations',

  CONSENTS_SHEET: '_consents',
  GDPR_SHEET: '_gdpr',

  DEFAULT_LICENSE: 'Licencia desconocida',
  DEFAULT_STATUS: 'Activo',
  DEFAULT_VERIFIED: 'No',

  // Versión actual de los textos de consentimiento.
  CONSENT_VERSION: '1.0',

  // Sincronización de ediciones realizadas desde el enlace de Google Forms.
  FORM_SYNC_INTERVAL_MINUTES: 15,
  FORM_RESPONSE_ID_HEADER: 'form_response_id',

  // Entity ID: 8 caracteres, solo mayúsculas.
  // Se eliminan caracteres fácilmente confundibles.
  ID_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  ID_LENGTH: 8,

  CONSENT_ID_PREFIX: 'CONS-',
  GDPR_ID_PREFIX: 'GDPR-',

  // Publicación / exports.
  PUBLIC_STATUS: 'Activo',
  PUBLIC_REQUIRE_VERIFIED: true,

  UMAP_MAP_BASE_URL:
    'https://umap.openstreetmap.fr/es/map/archipielago-vivo_1422295',

  TV_PLAYLIST_ID:
    'PLHnCLhOECJFA',

  EXPORT_LAYERS: [
    'el-hierro',
    'la-gomera',
    'la-palma',
    'tenerife',
    'gran-canaria',
    'fuerteventura',
    'lanzarote',
    'la-graciosa',
    'canarias'
  ],

  /*
   * Dispersión VISUAL de puntos coincidentes.
   * Solo afecta al export público; nunca modifica data.
   *
   * Los valores son radios máximos alrededor del punto
   * representativo almacenado en _locations.
   */
  POINT_SPREAD_METERS: {
    municipality: 350,
    island: 3000,
    canarias: 15000
  }
};


const CONSENT_DEFINITIONS = {
  publication: {
    field: 'consent_publication',
    purpose: 'publication',
    text:
      '¿Autorizas la publicación de la información proporcionada en el mapa?\n' +
      'Autorizas a Archipiélago Vivo a publicar en el mapa los datos destinados a ser públicos, ' +
      'respetando los campos que hayas indicado como privados.',
    reconfirmationText:
      '¿Quieres continuar y autorizar la publicación?'
  },

  contact: {
    field: 'consent_contact',
    purpose: 'contact',
    text:
      '¿Podemos contactar contigo sobre tu registro?\n' +
      'Utilizaremos tus datos de contacto para revisar, actualizar o aclarar la información de tu registro ' +
      'y para cuestiones relacionadas con tu participación en Archipiélago Vivo.'
  },

  whatsapp: {
    field: 'consent_whatsapp',
    purpose: 'whatsapp',
    text:
      '¿Quieres formar parte de la comunidad de Archipiélago Vivo en WhatsApp?\n' +
      'Si quieres participar en la comunidad, te enviaremos el enlace para unirte al grupo de WhatsApp. ' +
      'Allí podremos compartir novedades, propuestas, convocatorias y oportunidades para participar en el proyecto.'
  },

  newsletter: {
    field: 'consent_newsletter',
    purpose: 'newsletter',
    text:
      '¿Quieres recibir el correo de Archipiélago Vivo cada dos semanas?\n' +
      'Te enviaremos un correo aproximadamente cada dos semanas con historias, novedades, propuestas ' +
      'y otras formas de participar en Archipiélago Vivo. Puedes darte de baja cuando quieras.'
  }
};


/**
 * ============================================================
 * MENÚ
 * ============================================================
 */
