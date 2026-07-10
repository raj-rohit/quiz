jest.mock('react-native-purchases', () => {
  return {
    __esModule: true,
    default: {
      configure: jest.fn(),
      getProducts: jest.fn(),
      purchaseStoreProduct: jest.fn(),
      restorePurchases: jest.fn(),
      getCustomerInfo: jest.fn(),
    },
    PRODUCT_CATEGORY: { NON_SUBSCRIPTION: 'NON_SUBSCRIPTION' },
  };
});

import { RevenueCatAdapter, ownedFromCustomerInfo } from '../revenuecat';

const mockPurchases = jest.requireMock('react-native-purchases').default;

const rcProduct = (identifier: string, price: number) => ({
  identifier,
  priceString: `€${price.toFixed(2).replace('.', ',')}`,
  price,
  currencyCode: 'EUR',
});

const infoWith = (...packIds: string[]) => ({
  entitlements: { active: Object.fromEntries(packIds.map((id) => [id, {}])) },
});

beforeEach(() => jest.clearAllMocks());

test('ownedFromCustomerInfo returns active entitlement keys', () => {
  expect(ownedFromCustomerInfo(infoWith('food', 'sport'))).toEqual(['food', 'sport']);
  expect(ownedFromCustomerInfo(infoWith())).toEqual([]);
});

test('getProducts fetches NON_SUBSCRIPTION products and maps fields', async () => {
  mockPurchases.getProducts.mockResolvedValue([rcProduct('sku_food', 2.99)]);
  const adapter = new RevenueCatAdapter('appl_test');
  const products = await adapter.getProducts(['sku_food']);
  expect(mockPurchases.getProducts).toHaveBeenCalledWith(['sku_food'], 'NON_SUBSCRIPTION');
  expect(products).toEqual([{ sku: 'sku_food', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' }]);
});

test('purchase success returns owned pack ids from customer info', async () => {
  mockPurchases.getProducts.mockResolvedValue([rcProduct('sku_food', 2.99)]);
  mockPurchases.purchaseStoreProduct.mockResolvedValue({ customerInfo: infoWith('food') });
  const adapter = new RevenueCatAdapter('appl_test');
  await adapter.getProducts(['sku_food']); // warms the product cache
  const res = await adapter.purchase('sku_food');
  expect(res).toEqual({ outcome: 'success', ownedPackIds: ['food'] });
});

test('user cancellation maps to cancelled, other errors to failed', async () => {
  mockPurchases.getProducts.mockResolvedValue([rcProduct('sku_food', 2.99)]);
  const adapter = new RevenueCatAdapter('appl_test');
  await adapter.getProducts(['sku_food']);

  mockPurchases.purchaseStoreProduct.mockRejectedValue({ userCancelled: true });
  expect(await adapter.purchase('sku_food')).toEqual({ outcome: 'cancelled' });

  mockPurchases.purchaseStoreProduct.mockRejectedValue(new Error('network'));
  expect(await adapter.purchase('sku_food')).toEqual({ outcome: 'failed' });
});

test('purchase of an unfetchable sku fails', async () => {
  mockPurchases.getProducts.mockResolvedValue([]);
  const adapter = new RevenueCatAdapter('appl_test');
  expect(await adapter.purchase('sku_ghost')).toEqual({ outcome: 'failed' });
});

test('restore and getOwnedPackIds map customer info', async () => {
  mockPurchases.restorePurchases.mockResolvedValue(infoWith('retro'));
  mockPurchases.getCustomerInfo.mockResolvedValue(infoWith('food', 'retro'));
  const adapter = new RevenueCatAdapter('appl_test');
  expect(await adapter.restore()).toEqual(['retro']);
  expect(await adapter.getOwnedPackIds()).toEqual(['food', 'retro']);
});

test('purchase resolves failed when the fallback product fetch rejects', async () => {
  mockPurchases.getProducts.mockRejectedValue(new Error('network'));
  const adapter = new RevenueCatAdapter('appl_test');
  expect(await adapter.purchase('sku_food')).toEqual({ outcome: 'failed' });
});
