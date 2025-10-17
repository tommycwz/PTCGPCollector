import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Card, ApiResponse, CollectionCard, UserCollectionItem, PokemonTcgPocketCard } from '../models/card.interface';
import { SupabaseService, UserCard } from './supabase.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private readonly IMAGE_BASE_URL = 'https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/main/public/images/cards/';
  
  // Observable for user's collection
  private userCollectionSubject = new BehaviorSubject<UserCollectionItem[]>([]);
  public userCollection$ = this.userCollectionSubject.asObservable();
  
  // Cache for processed cards
  private processedCards: Card[] | null = null;
  
  constructor(
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) { }

  /**
   * Load cards from pokemon-tcg-pocket-database
   */
  loadCards(): Observable<Card[]> {
    if (this.processedCards) {
      return of(this.processedCards);
    }

    // Load cards from assets folder (copied from npm package)
    return this.http.get<PokemonTcgPocketCard[]>('assets/data/pokemon-tcg-pocket-cards.json').pipe(
      map(rawCards => {
        if (!Array.isArray(rawCards)) {
          console.error('Invalid card data format:', rawCards);
          return [];
        }
        console.log(`Loaded ${rawCards.length} cards from pokemon-tcg-pocket-database`);
        this.processedCards = rawCards.map(card => this.processCard(card));
        return this.processedCards;
      }),
      catchError(error => {
        console.error('Error loading cards from assets:', error);
        console.log('Please make sure the cards file is copied to assets/data/pokemon-tcg-pocket-cards.json');
        return of([]);
      })
    );
  }

  /**
   * Process a raw card from the database into our Card format
   */
  private processCard(rawCard: PokemonTcgPocketCard): Card {
    return {
      ...rawCard,
      cardDefKey: `${rawCard.set}-${rawCard.number}`,
      displayImageUrl: `${this.IMAGE_BASE_URL}${rawCard.imageName}`,
      name: rawCard.label.eng
    };
  }

  /**
   * Load cards from static data file (compatibility method)
   */
  loadStaticCards(): Observable<Card[]> {
    return this.loadCards();
  }

  /**
   * Load cards from the main data file (compatibility method)
   */
  loadMainDataFile(): Observable<Card[]> {
    return this.loadCards();
  }

  /**
   * Clear all stored card data
   */
  clearStoredData(): void {
    try {
      localStorage.removeItem('pokemon_cards_data');
      console.log('Cleared stored card data');
    } catch (error) {
      console.error('Error clearing stored data:', error);
    }
  }

  /**
   * Get all cards from pokemon-tcg-pocket-database
   */
  getAllCards(): Observable<Card[]> {
    return this.loadCards();
  }

  /**
   * Save cards to local storage (acting as static file storage)
   */
  saveCardsToStorage(cards: Card[]): void {
    try {
      localStorage.setItem('pokemon_cards_data', JSON.stringify(cards));
      console.log(`Saved ${cards.length} cards to storage`);
    } catch (error) {
      console.error('Error saving cards to storage:', error);
    }
  }

  /**
   * Get stored cards from local storage
   */
  getStoredCards(): Card[] {
    try {
      const stored = localStorage.getItem('pokemon_cards_data');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading cards from storage:', error);
      return [];
    }
  }

  /**
   * Load user's collection from Supabase
   */
  async loadUserCollection(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.userCollectionSubject.next([]);
      return;
    }

    try {
      const userCards = await this.supabaseService.getUserCards(userId);
      const collectionItems: UserCollectionItem[] = userCards.map(userCard => ({
        cardDefKey: userCard.card_def_key,
        quantity: userCard.quantity,
        isOwned: true,
        dateAdded: userCard.created_at
      }));
      
      this.userCollectionSubject.next(collectionItems);
    } catch (error) {
      console.error('Error loading user collection:', error);
      this.userCollectionSubject.next([]);
    }
  }

  /**
   * Get user's collection data (reactive)
   */
  getCollection(): UserCollectionItem[] {
    return this.userCollectionSubject.value;
  }

  /**
   * Add card to user's collection in Supabase
   */
  async addToCollection(card: Card, quantity: number = 1): Promise<boolean> {
    const userId = this.authService.getUserId();
    if (!userId || !card.cardDefKey) return false;

    const success = await this.supabaseService.addCardToCollection(userId, card.cardDefKey, quantity);
    if (success) {
      await this.loadUserCollection(); // Refresh collection
    }
    return success;
  }

  /**
   * Remove card from user's collection in Supabase
   */
  async removeFromCollection(cardDefKey: string): Promise<boolean> {
    const userId = this.authService.getUserId();
    if (!userId) return false;

    const success = await this.supabaseService.removeCardFromCollection(userId, cardDefKey);
    if (success) {
      await this.loadUserCollection(); // Refresh collection
    }
    return success;
  }

  /**
   * Update card quantity in user's collection
   */
  async updateCardQuantity(cardDefKey: string, quantity: number): Promise<boolean> {
    const userId = this.authService.getUserId();
    if (!userId) return false;

    const success = await this.supabaseService.updateCardQuantity(userId, cardDefKey, quantity);
    if (success) {
      await this.loadUserCollection(); // Refresh collection
    }
    return success;
  }

  /**
   * Check if user owns a specific card
   */
  isInCollection(cardDefKey: string): boolean {
    const collection = this.userCollectionSubject.value;
    return collection.some(card => card.cardDefKey === cardDefKey && card.isOwned);
  }

  /**
   * Get card quantity in user's collection
   */
  getCardQuantity(cardDefKey: string): number {
    const collection = this.userCollectionSubject.value;
    const card = collection.find(card => card.cardDefKey === cardDefKey);
    return card?.quantity || 0;
  }

  /**
   * Get collection statistics from Supabase
   */
  async getCollectionStats(): Promise<{totalCards: number, totalQuantity: number}> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return { totalCards: 0, totalQuantity: 0 };
    }

    return await this.supabaseService.getCollectionStats(userId);
  }

  /**
   * Search cards by name or set
   */
  searchCards(query: string): Card[] {
    const allCards = this.processedCards || [];
    const searchQuery = query.toLowerCase();
    
    return allCards.filter(card => 
      (card.name && card.name.toLowerCase().includes(searchQuery)) ||
      card.set.toLowerCase().includes(searchQuery) ||
      card.label.eng.toLowerCase().includes(searchQuery)
    );
  }

  /**
   * Filter cards by set
   */
  getCardsByExpansion(setId: string): Card[] {
    const allCards = this.processedCards || [];
    return allCards.filter(card => card.set === setId);
  }

  /**
   * Get all unique sets
   */
  getExpansions(): string[] {
    const allCards = this.processedCards || [];
    const sets = allCards.map(card => card.set);
    return [...new Set(sets)].sort();
  }
}