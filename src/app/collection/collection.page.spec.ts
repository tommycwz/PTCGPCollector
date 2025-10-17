import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollectionPage } from './collection.page';

describe('CollectionPage', () => {
  let component: CollectionPage;
  let fixture: ComponentFixture<CollectionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionPage]
    }).compileComponents();
    
    fixture = TestBed.createComponent(CollectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});