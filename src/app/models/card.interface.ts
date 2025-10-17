export interface Card {
  set: string;
  number: number;
  rarity: string;
  rarityCode: string;
  imageName: string;
  label: {
    slug: string;
    eng: string;
  };
  packs: string[];
  // Computed properties
  cardDefKey?: string;
  displayImageUrl?: string;
  name?: string;
}

export interface ApiResponse {
  data: {
    results: Card[];
  };
  message: string | null;
  totalCount: number | null;
}

// Raw card data from pokemon-tcg-pocket-database
export type PokemonTcgPocketCard = Card;

export interface CollectionCard extends Card {
  isOwned?: boolean;
  count?: number;
  quantity?: number;
  dateAdded?: string;
}

export interface UserCollectionItem {
  cardDefKey: string;
  quantity: number;
  isOwned: boolean;
  dateAdded?: string;
}