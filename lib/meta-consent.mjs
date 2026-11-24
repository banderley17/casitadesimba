// Consentimiento para compartir el teléfono (cifrado) con Meta.
//
// Solo se envían a Meta (públicos personalizados y eventos Purchase) los
// contactos que marcaron la casilla opcional del formulario web. Los contactos
// sin consentimiento registrado —incluidos los anteriores a este cambio y los
// creados a mano en el panel— quedan fuera.

export const PRIVACY_TEXT_VERSION = '2026-11-24';

export function hasMetaConsent(client) {
  const consent = client?.consentimientos;
  return Boolean(consent && consent.meta === true && !consent.metaRetiradoAt);
}

// Registra la decisión enviada desde el formulario. La última decisión del
// interesado prevalece: si una solicitud nueva llega sin la casilla marcada,
// el consentimiento previo se considera retirado.
export function mergeConsent(previous, { consentMeta }, now = new Date().toISOString()) {
  const prev = previous && typeof previous === 'object' ? previous : {};
  const next = { ...prev, privacidadInformadaAt: now, textoPrivacidad: PRIVACY_TEXT_VERSION };
  if (consentMeta === true) {
    next.meta = true;
    next.metaAt = now;
    delete next.metaRetiradoAt;
  } else {
    if (prev.meta === true) next.metaRetiradoAt = now;
    next.meta = false;
  }
  return next;
}
