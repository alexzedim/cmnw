import { ArrayMaxSize, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IAddonScanEntry } from '../queue';

export class UploadOsintDto {
  @ApiProperty({ type: 'array' })
  @IsArray()
  @ArrayMaxSize(10000)
  entries: IAddonScanEntry[];
}
