// Type declarations to fix Supabase compilation issues
declare var Buffer: any;
declare namespace NodeJS {
  interface ReadableStream {
    readable: boolean;
  }
}

// Type declarations for JSON imports
declare module "*.json" {
  const value: any;
  export default value;
}

declare module "pokemon-tcg-pocket-database/dist/cards.json" {
  const cards: Array<{
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
  }>;
  export = cards;
}

export {};