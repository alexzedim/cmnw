import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray } from 'class-validator';
import type { IAddonScanEntry } from '../queue';

export class UploadOsintDto {
  @ApiProperty({ type: 'array' })
  @IsArray()
  @ArrayMaxSize(10000)
  entries: IAddonScanEntry[];
}
