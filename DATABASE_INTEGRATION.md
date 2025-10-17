# Pokemon TCGP Collection App - Updated Database Integration

## Overview

Your Pokemon TCGP Collection app has been updated to use the `pokemon-tcg-pocket-database` npm package instead of manual JSON files. This provides access to the complete, up-to-date Pokemon TCG Pocket card database.

## What Changed

### 1. Data Source
- **Before**: Manual `pokemon-cards.json` file upload
- **After**: Direct integration with `pokemon-tcg-pocket-database` npm package

### 2. Card Images
- **Source**: Images are now loaded from the GitHub repository: `https://github.com/flibustier/pokemon-tcg-exchange/blob/main/public/images/cards/`
- **Format**: Each card has an `imageName` field that contains the webp filename
- **URL Construction**: `https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/main/public/images/cards/{imageName}`

### 3. Card Structure
The card data structure has been updated to match the pokemon-tcg-pocket-database format:

```typescript
interface Card {
  set: string;              // e.g., "A1"
  number: number;           // Card number in set
  rarity: string;           // e.g., "Common", "Rare", "Double Rare"
  rarityCode: string;       // e.g., "C", "R", "RR"
  imageName: string;        // Filename for the card image
  label: {
    slug: string;           // URL-friendly name
    eng: string;            // English card name
  };
  packs: string[];          // Available in packs, e.g., ["Mewtwo"]
  
  // Computed properties (added by the service)
  cardDefKey?: string;      // Generated: "{set}-{number}"
  displayImageUrl?: string; // Full image URL
  name?: string;            // Alias for label.eng
}
```

## Benefits

1. **Always Up-to-Date**: No need to manually update card data files
2. **Complete Database**: Access to all Pokemon TCG Pocket cards
3. **High-Quality Images**: Direct access to card images from the official source
4. **Structured Data**: Consistent data format with proper categorization

## Technical Details

### Files Modified
- `src/app/models/card.interface.ts` - Updated card interface
- `src/app/services/card.service.ts` - Integrated npm package and image URLs
- `src/app/collection/collection.page.ts` - Updated to use new card structure
- `src/app/collection/collection.page.html` - Updated template for new properties
- `src/types.d.ts` - Added TypeScript declarations for JSON imports

### Key Features Maintained
- ✅ Supabase authentication and database integration
- ✅ Card collection management (add/remove/update quantities)
- ✅ Search and filtering by set/name
- ✅ Collection statistics
- ✅ Responsive design with Ionic components

### New Features
- 🆕 Real-time access to complete card database
- 🆕 High-quality card images from official source
- 🆕 Enhanced card information (rarity, pack availability)
- 🆕 Improved search (name, set, rarity)

## Setup Requirements

The npm package is already installed via:
```bash
npm install -D pokemon-tcg-pocket-database
```

### Card Data Setup

The cards data is automatically copied from the npm package to the assets folder during build/start:

1. **Automatic Copy**: The `copy-cards` script runs before `start` and `build` commands
2. **File Location**: Cards are copied to `src/assets/data/pokemon-tcg-pocket-cards.json`
3. **Manual Copy** (if needed): Run `npm run copy-cards` to manually copy the latest card data

### Scripts Updated

- `npm start` - Now includes automatic card data copying before starting the dev server
- `npm run build` - Now includes automatic card data copying before building
- `npm run copy-cards` - Manually copy card data from the npm package

## Usage

1. **Login**: Use your existing Supabase authentication
2. **Browse Cards**: All cards are automatically loaded from the database
3. **Search**: Search by card name, set, or rarity
4. **Filter**: Filter by set (expansion) or view only owned cards
5. **Collect**: Add/remove cards from your collection with quantity tracking

The app maintains all existing functionality while providing access to the complete and current Pokemon TCG Pocket card database.