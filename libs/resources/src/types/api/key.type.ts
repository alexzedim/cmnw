export interface IKeyConfig {
  client: string;
  secret: string;
  token?: string;
  expiredIn?: number;
  tags?: string[];
}

export interface IKeysJson {
  keys: IKeyConfig[];
}
