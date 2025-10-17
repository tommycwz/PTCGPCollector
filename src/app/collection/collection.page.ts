import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CardService } from '../services/card.service';
import { AuthService } from '../services/auth.service';
import { Card, CollectionCard, UserCollectionItem } from '../models/card.interface';

interface SetGroup {
  setName: string;
  cards: Card[];
}

@Component({
  selector: 'app-collection',
  templateUrl: './collection.page.html',
  styleUrls: ['./collection.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class CollectionPage implements OnInit, OnDestroy {
  allCards: Card[] = [];
  filteredCards: Card[] = [];
  cardsBySet: SetGroup[] = [];
  collection: UserCollectionItem[] = [];
  loading = false;
  searchTerm = '';
  selectedExpansion = '';
  expansions: string[] = [];
  viewMode: 'all' | 'owned' = 'all';
  
  // Collection statistics
  collectionStats = { totalCards: 0, totalQuantity: 0 };
  
  private subscriptions: Subscription[] = [];
  
  constructor(
    private cardService: CardService,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadCards();
    this.loadUserCollection();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadUserCollection() {
    // Load user's collection from Supabase
    await this.cardService.loadUserCollection();
    
    // Subscribe to collection changes
    const collectionSub = this.cardService.userCollection$.subscribe(async collection => {
      this.collection = collection;
      this.filterCards();
      // Update collection stats
      this.collectionStats = await this.cardService.getCollectionStats();
    });
    
    this.subscriptions.push(collectionSub);
  }

  async loadCards() {
    const loading = await this.loadingController.create({
      message: 'Loading Pokemon cards...',
    });
    await loading.present();

    try {
      // Load cards from pokemon-tcg-pocket-database
      this.cardService.loadCards().subscribe({
        next: (cards) => {
          if (cards && cards.length > 0) {
            this.allCards = cards;
            this.setupCollectionData();
            console.log(`Successfully loaded ${cards.length} cards`);
          } else {
            this.showError('No cards found. Please check if pokemon-tcg-pocket-database is properly set up.');
          }
          loading.dismiss();
        },
        error: (error) => {
          console.error('Error loading cards:', error);
          loading.dismiss();
          this.showError('Error loading cards from database. Check console for details.');
        }
      });
    } catch (error) {
      loading.dismiss();
      this.showError('Error loading cards');
    }
  }

  setupCollectionData() {
    this.collection = this.cardService.getCollection();
    this.expansions = this.cardService.getExpansions();
    this.filterCards();
  }

  filterCards() {
    let filtered = [...this.allCards];

    // Filter by search term
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(card => 
        (card.name && card.name.toLowerCase().includes(searchLower)) ||
        card.set.toLowerCase().includes(searchLower) ||
        card.label.eng.toLowerCase().includes(searchLower)
      );
    }

    // Filter by set
    if (this.selectedExpansion) {
      filtered = filtered.filter(card => card.set === this.selectedExpansion);
    }

    // Filter by ownership
    if (this.viewMode === 'owned') {
      const ownedCardKeys = this.collection.map(c => c.cardDefKey);
      filtered = filtered.filter(card => card.cardDefKey && ownedCardKeys.includes(card.cardDefKey));
    }

    this.filteredCards = filtered;
    this.groupCardsBySet();
  }

  groupCardsBySet() {
    // Group filtered cards by set
    const setMap = new Map<string, Card[]>();
    
    this.filteredCards.forEach(card => {
      if (!setMap.has(card.set)) {
        setMap.set(card.set, []);
      }
      setMap.get(card.set)!.push(card);
    });

    // Convert to array and sort sets
    this.cardsBySet = Array.from(setMap.entries())
      .map(([setName, cards]) => ({
        setName,
        cards: cards.sort((a, b) => a.number - b.number) // Sort cards by number within set
      }))
      .sort((a, b) => a.setName.localeCompare(b.setName)); // Sort sets alphabetically
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value || '';
    this.filterCards();
  }

  onExpansionChange(event: any) {
    this.selectedExpansion = event.target.value || '';
    this.filterCards();
  }

  onViewModeChange(event: any) {
    this.viewMode = event.target.value || 'all';
    this.filterCards();
  }

  async addToCollection(card: Card) {
    const success = await this.cardService.addToCollection(card, 1);
    if (success) {
      this.showToast(`Added "${card.label.eng}" to collection`);
    } else {
      this.showError('Failed to add card to collection');
    }
  }

  removeFromCollection(card: Card) {
    if (!card.cardDefKey) return;
    this.cardService.removeFromCollection(card.cardDefKey);
    this.collection = this.cardService.getCollection();
    this.showToast(`Removed "${card.name || card.label.eng}" from collection`);
    this.filterCards();
  }

  isInCollection(card: Card): boolean {
    return card.cardDefKey ? this.cardService.isInCollection(card.cardDefKey) : false;
  }

  getCardCount(card: Card): number {
    return card.cardDefKey ? this.cardService.getCardQuantity(card.cardDefKey) : 0;
  }

  getQuantityClass(card: Card): string {
    const count = this.getCardCount(card);
    if (count === 0) return 'quantity-zero';
    if (count === 1) return 'quantity-one';
    if (count <= 3) return 'quantity-few';
    return 'quantity-many';
  }

  async decreaseQuantity(card: Card) {
    if (!card.cardDefKey) return;
    
    const currentCount = this.getCardCount(card);
    if (currentCount > 0) {
      const newQuantity = currentCount - 1;
      if (newQuantity === 0) {
        await this.cardService.removeFromCollection(card.cardDefKey);
        this.showToast(`Removed "${card.label.eng}" from collection`);
      } else {
        await this.cardService.updateCardQuantity(card.cardDefKey, newQuantity);
        this.showToast(`Updated "${card.label.eng}" quantity to ${newQuantity}`);
      }
    }
  }

  async toggleCardInCollection(card: Card, event: Event) {
    event.stopPropagation();
    
    if (!card.cardDefKey) return;
    
    const isOwned = this.cardService.isInCollection(card.cardDefKey);
    
    if (isOwned) {
      const success = await this.cardService.removeFromCollection(card.cardDefKey);
      if (success) {
        this.showToast(`Removed ${card.name || card.label.eng} from collection`);
      } else {
        this.showError('Failed to remove card from collection');
      }
    } else {
      const success = await this.cardService.addToCollection(card);
      if (success) {
        this.showToast(`Added ${card.name || card.label.eng} to collection`);
      } else {
        this.showError('Failed to add card to collection');
      }
    }
  }

  async logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  async refreshCollection() {
    const loading = await this.loadingController.create({
      message: 'Refreshing collection...',
    });
    await loading.present();

    try {
      await this.cardService.loadUserCollection();
      loading.dismiss();
      this.showToast('Collection refreshed!');
    } catch (error) {
      loading.dismiss();
      this.showError('Failed to refresh collection');
    }
  }

  async loadStaticData() {
    const loading = await this.loadingController.create({
      message: 'Loading sample Pokemon cards...',
    });
    await loading.present();

    this.cardService.loadStaticCards().subscribe({
      next: (cards) => {
        this.allCards = cards;
        this.cardService.saveCardsToStorage(cards);
        this.setupCollectionData();
        loading.dismiss();
        this.showToast('Loaded sample Pokemon cards successfully!');
      },
      error: (error) => {
        console.error('Error loading static cards:', error);
        loading.dismiss();
        this.showError('Failed to load sample cards');
      }
    });
  }

  async showDataFileInstructions() {
    const alert = await this.alertController.create({
      header: 'Manual Data Upload',
      message: `
        <div>
          <p><strong>To add your Pokemon cards data:</strong></p>
          <ol>
            <li>Save your <code>pokemon-cards.json</code> file to:</li>
            <li><code>src/assets/data/pokemon-cards.json</code></li>
            <li>Restart the development server</li>
            <li>Click "Reload Data" to load your cards</li>
          </ol>
          <p><strong>File format:</strong> The JSON file should have the same structure as the sample file.</p>
          <p>Until then, the app will use sample data.</p>
        </div>
      `,
      buttons: [
        {
          text: 'Reload Data',
          handler: () => {
            this.reloadData();
          }
        },
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async reloadData() {
    const loading = await this.loadingController.create({
      message: 'Reloading Pokemon cards data...',
      spinner: 'lines'
    });
    await loading.present();

    try {
      // Clear stored data and reload from files
      this.cardService.clearStoredData();
      
      this.cardService.loadCards().subscribe({
        next: (cards) => {
          if (cards.length > 0) {
            this.allCards = cards;
            this.cardService.saveCardsToStorage(cards);
            this.setupCollectionData();
            loading.dismiss();
            this.showToast(`Successfully loaded ${cards.length} Pokemon cards!`);
          } else {
            loading.dismiss();
            this.showFileNotFoundError();
          }
        },
        error: (error) => {
          console.error('Error reloading cards:', error);
          loading.dismiss();
          this.showFileNotFoundError();
        }
      });
    } catch (error) {
      loading.dismiss();
      this.showError('An unexpected error occurred while reloading data.');
    }
  }

  private async showFileNotFoundError() {
    const alert = await this.alertController.create({
      header: 'Data File Not Found',
      message: `
        <div>
          <p><strong>Pokemon cards data file not found.</strong></p>
          <p>To add your Pokemon cards:</p>
          <ol>
            <li>Place your <code>pokemon-cards.json</code> file in:</li>
            <li><code>src/assets/data/pokemon-cards.json</code></li>
            <li>Restart the development server</li>
            <li>Click "Reload Data"</li>
          </ol>
          <p><strong>File format:</strong> Use the same JSON structure as the sample file.</p>
          <p>For now, the app will use sample data.</p>
        </div>
      `,
      buttons: [
        {
          text: 'Load Sample Data',
          handler: () => {
            this.loadSampleData();
          }
        },
        {
          text: 'View Instructions',
          handler: () => {
            this.showDataFileInstructions();
          }
        },
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  private async loadSampleData() {
    const loading = await this.loadingController.create({
      message: 'Loading sample data...',
    });
    await loading.present();

    this.cardService.loadStaticCards().subscribe({
      next: (cards) => {
        this.allCards = cards;
        this.setupCollectionData();
        loading.dismiss();
        this.showToast('Sample data loaded successfully!');
      },
      error: (error) => {
        console.error('Error loading sample data:', error);
        loading.dismiss();
        this.showError('Failed to load sample data.');
      }
    });
  }

  getCollectionStats() {
    return this.collectionStats;
  }

  getDataSourceLabel(): string {
    const cardsCount = this.allCards.length;
    if (cardsCount === 0) return 'No Data';
    if (cardsCount <= 20) return 'Sample';
    return 'Full API';
  }

  getDataSourceIcon(): string {
    const cardsCount = this.allCards.length;
    if (cardsCount === 0) return 'alert-circle';
    if (cardsCount <= 20) return 'library';
    return 'cloud-done';
  }

  getDataSourceColor(): string {
    const cardsCount = this.allCards.length;
    if (cardsCount === 0) return 'warning';
    if (cardsCount <= 20) return 'medium';
    return 'success';
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    const placeholder = target.nextElementSibling as HTMLElement;
    
    if (target && placeholder) {
      target.style.display = 'none';
      placeholder.style.display = 'flex';
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }
}