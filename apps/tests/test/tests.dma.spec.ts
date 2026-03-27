import { Test, TestingModule } from '@nestjs/testing';
import { DateTime } from 'luxon';
import { TestsDma } from '../src/tests.dma';
import { commodityItem, item, wowTokenItem } from '../mocks';
import { BattleNetService } from '@app/battle-net';

describe('DMA', () => {
  let testsService: TestsDma;
  let app: TestingModule;
  jest.setTimeout(600_000);

  const mockQueryData = {
    '/data/wow/auctions/commodities': {
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
      auctions: [
        { id: 1, item: { id: 191341 }, quantity: 1, unit_price: 100000, time_left: 'SHORT' },
        { id: 2, item: { id: 191342 }, quantity: 5, unit_price: 200000, time_left: 'MEDIUM' },
      ],
    },
    '/data/wow/connected-realm/1615/auctions': {
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
      auctions: [{ item: { id: 191341 } }, { item: { id: 191342 } }],
    },
    '/data/wow/token/index': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
      last_updated_timestamp: 1735689600000,
      price: 350000000,
    },
    '/data/wow/item/191341': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      id: 191341,
      name: 'Test Item',
      quality: { type: 'EPIC', name: 'Epic' },
      level: 450,
      required_level: 70,
      media: { key: { href: 'https://api.blizzard.com/' }, id: 191341 },
      item_class: { key: { href: 'https://api.blizzard.com/' }, id: 2, name: 'Weapon' },
      item_subclass: { key: { href: 'https://api.blizzard.com/' }, id: 1, name: 'Axe' },
      inventory_type: { type: 'ONE_HAND', name: 'One-Hand' },
      purchase_price: 0,
      sell_price: 0,
      max_count: 1,
      preview_item: {},
      is_equippable: true,
      is_stackable: false,
      purchase_quantity: 1,
      modified_crafting: {},
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
    },
    '/data/wow/media/item/191341': {
      _links: { self: { href: 'https://api.blizzard.com/' } },
      id: 191341,
      lastModified: 'Fri, 01 Jan 2026 00:00:00 GMT',
    },
  };

  const mockBattleNetService = {
    createQueryOptions: jest.fn().mockReturnValue({ namespace: 'test', locale: 'en_GB', timeout: 30000 }),
    query: jest.fn().mockImplementation((path: string) => {
      const data = mockQueryData[path as keyof typeof mockQueryData];
      return Promise.resolve(data || {});
    }),
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [],
      providers: [TestsDma, { provide: BattleNetService, useValue: mockBattleNetService }],
    }).compile();

    testsService = app.get<TestsDma>(TestsDma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('COMMDTY', () => {
    it('commodities response', async () => {
      const response = await testsService.commodity();
      expect(response).toHaveProperty('lastModified');
      expect(response).toHaveProperty('auctions');
      expect(Array.isArray(response.auctions)).toBeTruthy();

      const lastModified = DateTime.fromRFC2822(response.lastModified).toJSDate();
      expect(lastModified).toEqual(expect.any(Date));

      const [item] = response.auctions;
      expect(item).toMatchObject(commodityItem);
    });
  });

  describe('AUCTIONS', () => {
    it('auctions response', async () => {
      const response = await testsService.auctions(1615);
      expect(response).toHaveProperty('lastModified');
      expect(response).toHaveProperty('auctions');
      expect(Array.isArray(response.auctions)).toBeTruthy();

      const lastModified = DateTime.fromRFC2822(response.lastModified).toJSDate();
      expect(lastModified).toEqual(expect.any(Date));

      response.auctions.map((auction) => expect(auction.item.id).toEqual(expect.any(Number)));
    });
  });

  describe('WOWTOKEN', () => {
    it('wowtoken response', async () => {
      const response = await testsService.wowToken();
      expect(response).toMatchObject(wowTokenItem);
      expect(response).toHaveProperty('lastModified');
      const lastModified = DateTime.fromRFC2822(response.lastModified).toJSDate();
      expect(lastModified).toEqual(expect.any(Date));
    });
  });

  describe('ITEM', () => {
    it('item response', async () => {
      const response = await testsService.item(191341);
      expect(response).toMatchObject(item);
    });
  });

  describe('ITEM MEDIA', () => {
    it('item media response', async () => {
      const response = await testsService.itemMedia(191341);
      console.log(response);
    });
  });
});
