import {
  IAuctions,
  ICharacterSummary,
  IGold,
  ICharacterMedia,
  IMountsNameWithId,
  IPetType,
  IWowToken,
  IItem,
  IItemMedia,
  IHallOfFame,
  ProfessionIndex,
  ProfessionDetail,
  SkillTierDetail,
} from '@app/resources/types';

export type BlizzardApiStringNumber = string | number;

export type BlizzardApiValue = string | number | boolean;

export type BlizzardApiNamedField = Record<string, BlizzardApiValue>;

export type BlizzardApiArray = Array<BlizzardApiValue | BlizzardApiNamedField>;

export type BlizzardApiResponse = Record<
  string,
  BlizzardApiValue | BlizzardApiNamedField | BlizzardApiArray
>;

export type BlizzardApiArrayResponse = Record<string, BlizzardApiArray>;

export type BlizzardApiPetsCollection = Record<'pets', Array<IPetType>> & {
  status?: string;
};

export type BlizzardApiMountsCollection = Record<'mounts', Array<IMountsNameWithId>> & {
  status?: string;
};

export type BlizzardApiCharacterSummary = Readonly<ICharacterSummary>;

export type BlizzardApiCharacterMedia = Readonly<ICharacterMedia>;

export type BlizzardApiWowToken = Readonly<IWowToken>;

export type BlizzardApiAuctions = Readonly<IAuctions>;

export type BlizzardApiHallOfFame = Readonly<IHallOfFame>;

export type GoldApiListing = Readonly<IGold>;

export type BlizzardApiItem = Partial<IItem>;

export type BlizzardApiItemMedia = IItemMedia;

export type BlizzardApiKeys = {
  access_token: string;
  token_type: string;
  expires_in: number;
  sub: string;
};

export type BlizzardApiErrorResponse = {
  status: number;
  response: {
    status: number;
    statusText: string;
  };
};

export type BlizzardApiGuildSummary = {
  _links: {
    self: { href: string };
  };
  id: number;
  name: string;
  faction: {
    type: string;
    name: string;
  };
  achievement_points: number;
  member_count: number;
  realm: {
    key: { href: string };
    name: string;
    id: number;
    slug: string;
  };
  crest: {
    emblem: {
      id: number;
      media: {
        key: { href: string };
        id: number;
      };
      color: {
        id: number;
        rgba: {
          r: number;
          g: number;
          b: number;
          a: number;
        };
      };
    };
    border: {
      id: number;
      media: {
        key: { href: string };
        id: number;
      };
      color: {
        id: number;
        rgba: {
          r: number;
          g: number;
          b: number;
          a: number;
        };
      };
    };
    background: {
      color: {
        id: number;
        rgba: {
          r: number;
          g: number;
          b: number;
          a: number;
        };
      };
    };
  };
  roster: { href: string };
  achievements: { href: string };
  created_timestamp: number;
  activity: { href: string };
  name_search: string;
  lastModified: string;
};

// Profession Index Query Responses
export type IProfessionResponse = Readonly<ProfessionIndex>;

export type IProfessionDetailResponse = Readonly<ProfessionDetail>;

export type ISkillTieryResponse = Readonly<SkillTierDetail>;

// Character Professions
export type BlizzardApiCharacterProfession = {
  profession: {
    key: { href: string };
    name: string;
    id: number;
  };
  tiers?: Array<{
    skill_points: number;
    max_skill_points: number;
    tier: {
      name: string;
      id: number;
    };
    known_recipes?: Array<{
      key: { href: string };
      name: string;
      id: number;
    }>;
  }>;
  specialization?: {
    name: string;
  };
  skill_points?: number;
};

export type BlizzardApiCharacterProfessions = {
  _links: {
    self: { href: string };
  };
  character: {
    key: { href: string };
    name: string;
    id: number;
    realm: {
      key: { href: string };
      name: string;
      id: number;
      slug: string;
    };
  };
  primaries: BlizzardApiCharacterProfession[];
  secondaries: BlizzardApiCharacterProfession[];
  lastModified: string;
  status?: string;
};
