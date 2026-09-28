import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ozonReferenceDiscount } from '../src/features/pricing/ozon-price';

test('Ozon reference discount is not a marketplace subsidy', () => {
  assert.equal(ozonReferenceDiscount(320000, 450000), 28.89);
  assert.equal(ozonReferenceDiscount(280000, 400000), 30);
  assert.equal(ozonReferenceDiscount(280000, 280000), 0);
  for (const old of [undefined, 0, 200000]) assert.equal(ozonReferenceDiscount(280000, old), null);
  assert.equal(ozonReferenceDiscount(0, 400000), null);
});
