import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPurchaseEvent,
  shouldTrackPurchase,
} from '../lib/meta-purchase.mjs';

test('builds a Purchase event with a normalized hashed phone', async () => {
  const payload = await buildPurchaseEvent({
    client: {
      id: 'client-123',
      tel: '+34 613 753 680',
      servicio: 'Estancia Diurna',
    },
    eventId: 'purchase-client-123',
    eventTime: 1_750_000_000,
  });

  assert.deepEqual(payload, {
    data: [{
      event_name: 'Purchase',
      event_time: 1_750_000_000,
      action_source: 'website',
      event_source_url: 'https://lacasitadesimba.es/',
      event_id: 'purchase-client-123',
      user_data: {
        ph: ['89be6e1ca3f86cf89128ce9c259d6f4de24820ab872501a11d27bacc37aa8d03'],
      },
      custom_data: { content_name: 'Estancia Diurna' },
    }],
  });
});

test('tracks only the first transition to a paid client', () => {
  assert.equal(shouldTrackPurchase(null, { estado: 'cliente' }), true);
  assert.equal(shouldTrackPurchase({ estado: 'consulta' }, { estado: 'cliente' }), true);
  assert.equal(shouldTrackPurchase({ estado: 'excluido' }, { estado: 'cliente' }), true);
  assert.equal(shouldTrackPurchase({ estado: 'cliente' }, { estado: 'cliente' }), false);
  assert.equal(shouldTrackPurchase({ estado: 'cliente' }, { estado: 'cliente', purchaseEventId: 'pending', purchasePendingAt: '2026-08-27T12:00:00.000Z' }), true);
  assert.equal(shouldTrackPurchase({ estado: 'cliente' }, { estado: 'cliente', purchaseEventId: 'already-sent', purchaseTrackedAt: '2026-08-27T12:00:00.000Z' }), false);
  assert.equal(shouldTrackPurchase({ estado: 'consulta' }, { estado: 'consulta' }), false);
  assert.equal(shouldTrackPurchase({ estado: 'consulta' }, { estado: 'cliente', purchaseEventId: 'already-sent', purchaseTrackedAt: '2026-08-27T12:00:00.000Z' }), false);
  assert.equal(shouldTrackPurchase({ estado: 'excluido' }, { estado: 'cliente', purchaseLegacy: true }), false);
});

test('sends the Purchase payload to the Graph API without exposing the token', async () => {
  let request;
  const response = await (await import('../lib/meta-purchase.mjs')).sendPurchaseEvent({
    client: { id: 'client-123', tel: '+34 613 753 680', servicio: 'Bono 7 días' },
    eventId: 'purchase-client-123',
    eventTime: 1_750_000_000,
    token: 'test-token',
    fetchImpl: async (url, init) => {
      request = { url, init };
      return { ok: true, json: async () => ({ events_received: 1 }) };
    },
  });

  assert.equal(response.events_received, 1);
  assert.equal(request.url, 'https://graph.facebook.com/v24.0/4281036645446757/events');
  assert.equal(request.init.headers.Authorization, 'Bearer test-token');
  assert.equal(JSON.parse(request.init.body).data[0].event_name, 'Purchase');
});
