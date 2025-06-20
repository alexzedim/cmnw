import { ApiProperty, ApiPropertyOptions, getSchemaPath } from '@nestjs/swagger';
import { Valuations } from '@app/mongo';
import { MarketEntity } from '@app/pg';
import { MARKET_TYPE } from '@app/resources/constants';

export const SWAGGER_ITEM_QUOTES: ApiPropertyOptions = {
  name: 'quotes',
  description: 'Quotes are aggregated Level 2 data of requested COMMDTY item',
};

export const SWAGGER_ITEM_FEED: ApiPropertyOptions = {
  name: 'feed',
  type: () => MarketEntity,
  description: 'Feed represents direct market data',
  example: {
    orderId: '123432432',
    itemId: 171982,
    type: MARKET_TYPE.C,
    connectedRealmId: 1602,
    timestamp: Date.now(),
    quantity: 100,
    bid: 9,
    buyout: 10,
    price: 0.1,
    value: 100,
    timeLeft: 'LONG',
  },
};

export const SWAGGER_DATASET_X: ApiPropertyOptions = {
  name: 'x',
  type: Number,
  description: 'Represents index value for chart by X axis',
};

export const SWAGGER_DATASET_Y: ApiPropertyOptions = {
  name: 'y',
  type: Number,
  description: 'Represents index value for chart by Y axis',
};

export const SWAGGER_DATASET_ORDERS: ApiPropertyOptions = {
  name: 'orders',
  type: Number,
  description: 'Represents the number of unique orders on price level',
};

export const SWAGGER_DATASET_VALUE: ApiPropertyOptions = {
  name: 'value',
  type: Number,
  description: 'Represents the amount or quantity of item on price level',
};

export const SWAGGER_DATASET_OPEN_INTEREST: ApiPropertyOptions = {
  name: 'oi',
  type: Number,
  description: 'Represents open interest for required item on price level',
};

class OrderDataSet {
  @ApiProperty(SWAGGER_DATASET_X)
  readonly x: number;

  @ApiProperty(SWAGGER_DATASET_Y)
  readonly y: number;

  @ApiProperty(SWAGGER_DATASET_ORDERS)
  readonly orders: number;

  @ApiProperty(SWAGGER_DATASET_VALUE)
  readonly value: number;

  @ApiProperty(SWAGGER_DATASET_OPEN_INTEREST)
  readonly oi: number;
}

export const SWAGGER_ITEM_CHART_Y_AXIS: ApiPropertyOptions = {
  name: 'yAxis',
  type: () => [Number],
  isArray: true,
  example: [1, 2, 3, 4, 5],
};

export const SWAGGER_ITEM_CHART_X_AXIS: ApiPropertyOptions = {
  name: 'xAxis',
  isArray: true,
  items: {
    oneOf: [
      { $ref: getSchemaPath(Number) },
      { $ref: getSchemaPath(String) },
      { $ref: getSchemaPath(Date) },
    ],
  },
  example: [1, 'gordunni', new Date()],
};

export const SWAGGER_ITEM_CHART_DATASET: ApiPropertyOptions = {
  name: 'dataset',
  type: () => OrderDataSet,
  description: 'This field is a dataset for HighCharts',
  example: {
    x: 0,
    y: 0,
    orders: 20,
    value: 123,
    price: 10,
    oi: 550,
  },
};

export const SWAGGER_ITEM_ID: ApiPropertyOptions = {
  name: 'id',
  description: 'Item ID, name or asset class of item group ',
  required: true,
  type: String,
  example: '174305 || Windowblossom || HRBS',
};

export const SWAGGER_ITEM: ApiPropertyOptions = {
  name: 'item',
  description: 'Item ID, name or asset class of item group ',
  required: false,
  type: String,
  example: '174305 || Windowblossom || HRBS',
};

export const SWAGGER_CONNECTED_REALM_ID: ApiPropertyOptions = {
  name: 'connected_realm_id',
  description: 'Connected realm ID for group of realms with common players and AH',
  type: Number,
  example: 1602,
};

export const SWAGGER_VALUATIONS_EVALUATIONS: ApiPropertyOptions = {
  name: 'is_evaluating',
  description:
    'This field represent number of missing values for each requested realm',
  type: Number,
  example: 1,
};

export const SWAGGER_VALUATIONS: ApiPropertyOptions = {
  name: 'valuations',
  description: 'Show every evaluation for requested item',
  type: () => Valuations,
  isArray: true,
};

export const SWAGGER_WOWTOKEN_LIMIT: ApiPropertyOptions = {
  name: 'limit',
  description: 'Request required number of plots from 1 to 250, latest by default',
  type: Number,
  required: false,
  minimum: 0,
  maximum: 250,
  example: 5,
};

// TODO cover enum
export const SWAGGER_WOWTOKEN_REGION: ApiPropertyOptions = {
  name: 'region',
  description: 'Request from selected region',
  required: true,
  type: String,
  default: 'eu',
  example: 'eu',
};
