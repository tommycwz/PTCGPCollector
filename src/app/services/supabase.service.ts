import { Injectable } from '@angular/core';
// Import only what we need to avoid storage-related types
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface Profile {
  id: number;
  username: string;
  password: string;
  role: string;
  created_at: string;
}

export interface UserCard {
  id: number;
  user_id: number;
  card_def_key: string;
  quantity: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.key);
  }

  // Auth Methods
  async login(username: string, password: string): Promise<Profile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error) {
        console.error('Login error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  }

  // Card Collection Methods
  async getUserCards(userId: number): Promise<UserCard[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user cards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch user cards:', error);
      return [];
    }
  }

  async addCardToCollection(userId: number, cardDefKey: string, quantity: number = 1): Promise<boolean> {
    try {
      // First, check if card already exists
      const { data: existingCard } = await this.supabase
        .from('user_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('card_def_key', cardDefKey)
        .single();

      if (existingCard) {
        // Update existing card quantity
        const { error } = await this.supabase
          .from('user_cards')
          .update({ quantity: existingCard.quantity + quantity })
          .eq('id', existingCard.id);

        return !error;
      } else {
        // Insert new card
        const { error } = await this.supabase
          .from('user_cards')
          .insert([{
            user_id: userId,
            card_def_key: cardDefKey,
            quantity: quantity
          }]);

        return !error;
      }
    } catch (error) {
      console.error('Failed to add card to collection:', error);
      return false;
    }
  }

  async removeCardFromCollection(userId: number, cardDefKey: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_cards')
        .delete()
        .eq('user_id', userId)
        .eq('card_def_key', cardDefKey);

      return !error;
    } catch (error) {
      console.error('Failed to remove card from collection:', error);
      return false;
    }
  }

  async updateCardQuantity(userId: number, cardDefKey: string, quantity: number): Promise<boolean> {
    try {
      if (quantity <= 0) {
        return await this.removeCardFromCollection(userId, cardDefKey);
      }

      const { error } = await this.supabase
        .from('user_cards')
        .update({ quantity })
        .eq('user_id', userId)
        .eq('card_def_key', cardDefKey);

      return !error;
    } catch (error) {
      console.error('Failed to update card quantity:', error);
      return false;
    }
  }

  async getCollectionStats(userId: number): Promise<{totalCards: number, totalQuantity: number}> {
    try {
      const { data, error } = await this.supabase
        .from('user_cards')
        .select('quantity')
        .eq('user_id', userId);

      if (error || !data) {
        return { totalCards: 0, totalQuantity: 0 };
      }

      const totalCards = data.length;
      const totalQuantity = data.reduce((sum, card) => sum + card.quantity, 0);

      return { totalCards, totalQuantity };
    } catch (error) {
      console.error('Failed to get collection stats:', error);
      return { totalCards: 0, totalQuantity: 0 };
    }
  }
}