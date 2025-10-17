# Pokemon TCGP Collection App - Supabase Setup

## 🏗️ Supabase Database Setup

### 1. Create Tables in Supabase

Go to your Supabase project → SQL Editor and run:

```sql
-- Create profiles table
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_cards table  
CREATE TABLE user_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    card_def_key VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, card_def_key)
);

-- Add indexes for performance
CREATE INDEX idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX idx_user_cards_card_def_key ON user_cards(card_def_key);
```

### 2. Create Sample Users (Manual)

```sql
-- Create admin user
INSERT INTO profiles (username, password, role) 
VALUES ('admin', 'admin123', 'admin');

-- Create test users
INSERT INTO profiles (username, password, role) 
VALUES ('player1', 'pass123', 'user');

INSERT INTO profiles (username, password, role) 
VALUES ('player2', 'mypass', 'user');
```

### 3. Configure App Environment

Update `src/environments/environment.ts` and `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: false, // or true for prod
  supabase: {
    url: 'YOUR_SUPABASE_PROJECT_URL',
    key: 'YOUR_SUPABASE_ANON_KEY'
  }
};
```

## 🚀 How to Use

### Login
- Navigate to `/login`
- Use any manually created username/password
- Example: `admin` / `admin123`

### Collection Management
- View all Pokemon cards from your JSON data
- Click cards to add/remove from your collection
- Search and filter cards
- View collection statistics

### Admin Features
- All users can manage their own collections
- No registration - accounts created manually in database

## 📁 Pokemon Cards Data

Place your Pokemon cards JSON file at:
```
src/assets/data/pokemon-cards.json
```

Format:
```json
{
  "data": {
    "results": [
      {
        "cardDefKey": "unique-card-id",
        "expansionId": "A1",
        "name": "Pokemon Card Name",
        "displayImageUrl": "https://example.com/image.jpg",
        "url": "card-url",
        "description": "Card description"
      }
    ]
  }
}
```

## 🔧 Key Features

- ✅ Invite-only user system (manual account creation)
- ✅ Supabase database integration
- ✅ Real-time collection management
- ✅ Search and filter functionality
- ✅ Responsive design
- ✅ Authentication guards
- ✅ Collection statistics

## 🎯 Usage Flow

1. Admin creates user accounts manually in Supabase
2. Users login with provided credentials
3. Users browse and collect Pokemon cards
4. Collection data stored in Supabase
5. Real-time updates across sessions