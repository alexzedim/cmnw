import { ApiProperty } from '@nestjs/swagger';
import { ContractEntity } from '@app/pg';

export class ContractDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  itemId: number;

  @ApiProperty()
  connectedRealmId: number;

  @ApiProperty()
  timestamp: number;

  @ApiProperty()
  day: number;

  @ApiProperty()
  week: number;

  @ApiProperty()
  month: number;

  @ApiProperty()
  year: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  priceMedian: number;

  @ApiProperty()
  priceTop: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  openInterest: number;

  @ApiProperty()
  type: string;

  @ApiProperty({ type: [String], nullable: true })
  sellers?: Array<string>;

  @ApiProperty({ nullable: true })
  createdAt?: Date;

  static fromEntity(entity: ContractEntity): ContractDto {
    const dto = new ContractDto();
    dto.id = entity.id;
    dto.itemId = entity.itemId;
    dto.connectedRealmId = entity.connectedRealmId;
    dto.timestamp = entity.timestamp;
    dto.day = entity.day;
    dto.week = entity.week;
    dto.month = entity.month;
    dto.year = entity.year;
    dto.price = entity.price;
    dto.priceMedian = entity.priceMedian;
    dto.priceTop = entity.priceTop;
    dto.quantity = entity.quantity;
    dto.openInterest = entity.openInterest;
    dto.type = entity.type;
    dto.sellers = entity.sellers;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

export class ContractsResponseDto {
  @ApiProperty({ type: [ContractDto] })
  contracts: ContractDto[];

  constructor(contracts: ContractDto[]) {
    this.contracts = contracts;
  }
}
