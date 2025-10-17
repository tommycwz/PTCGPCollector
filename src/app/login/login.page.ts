import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  username = '';
  password = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  async login() {
    if (!this.username || !this.password) {
      this.showToast('Please enter username and password');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Logging in...',
    });
    await loading.present();

    try {
      const success = await this.authService.login(this.username, this.password);
      
      loading.dismiss();

      if (success) {
        this.showToast('Login successful!');
        this.router.navigate(['/collection']);
      } else {
        this.showToast('Invalid username or password');
      }
    } catch (error) {
      loading.dismiss();
      this.showToast('Login failed. Please try again.');
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom'
    });
    toast.present();
  }
}