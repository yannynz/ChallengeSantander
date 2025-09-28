import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/auth';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  email = 'analista@pjcredit';
  password = '123456';

  private auth = inject(AuthService);
  private router = inject(Router);

  submit() {
    const ok = this.auth.login(this.email, this.password);
    if (ok) this.router.navigateByUrl('/dashboard');
  }
}
