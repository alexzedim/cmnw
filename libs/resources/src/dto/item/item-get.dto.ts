import { IARealm } from '@app/resources';

export class ItemGetDto {
  readonly item: any;

  readonly realm?: IARealm[];
}
