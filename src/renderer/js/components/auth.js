import { $ } from '../utils/dom.js';
import { state } from '../state.js';
import { showToast } from './toasts.js';

export function initAuth(onAuthSuccess) {
  const authContainer = $('#auth-container');
  const loginForm = $('#login-form');
  const registerForm = $('#register-form');
  const forgotForm = $('#forgot-form');

  const linkShowRegister = $('#link-show-register');
  const linkShowLogin = $('#link-show-login');
  const linkShowForgot = $('#link-show-forgot');
  const linkBackLogin = $('#link-back-login');

  const authHeaderTitle = $('#auth-header-title');
  const authHeaderSubtitle = $('#auth-header-subtitle');

  // Form switching
  if (linkShowRegister) {
    linkShowRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      forgotForm.style.display = 'none';
      registerForm.style.display = 'block';
      authHeaderTitle.textContent = 'Create Dry Chat Account';
      authHeaderSubtitle.textContent = 'Get your unique 13-digit Dry Chat ID';
    });
  }

  if (linkShowLogin) {
    linkShowLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.style.display = 'none';
      forgotForm.style.display = 'none';
      loginForm.style.display = 'block';
      authHeaderTitle.textContent = 'Welcome to Dry Chat';
      authHeaderSubtitle.textContent = 'Private & Secure Realtime Messaging';
    });
  }

  if (linkShowForgot) {
    linkShowForgot.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'none';
      forgotForm.style.display = 'block';
      authHeaderTitle.textContent = 'Reset Password';
      authHeaderSubtitle.textContent = 'Enter your email to receive recovery instructions';
    });
  }

  if (linkBackLogin) {
    linkBackLogin.addEventListener('click', (e) => {
      e.preventDefault();
      forgotForm.style.display = 'none';
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
      authHeaderTitle.textContent = 'Welcome to Dry Chat';
      authHeaderSubtitle.textContent = 'Private & Secure Realtime Messaging';
    });
  }

  // Password strength meter
  const regPassword = $('#reg-password');
  const regStrengthFill = $('#reg-strength-fill');
  if (regPassword && regStrengthFill) {
    regPassword.addEventListener('input', () => {
      const val = regPassword.value;
      let strength = 0;
      if (val.length >= 6) strength += 25;
      if (val.length >= 10) strength += 25;
      if (/[A-Z]/.test(val) && /[a-z]/.test(val)) strength += 25;
      if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) strength += 25;

      regStrengthFill.style.width = `${strength}%`;
      if (strength <= 25) regStrengthFill.style.backgroundColor = '#EF4444';
      else if (strength <= 50) regStrengthFill.style.backgroundColor = '#F59E0B';
      else if (strength <= 75) regStrengthFill.style.backgroundColor = '#3B82F6';
      else regStrengthFill.style.backgroundColor = '#22C55E';
    });
  }

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#login-email').value.trim();
      const password = $('#login-password').value;
      const btnSubmit = $('#btn-login-submit');

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Signing In...';

      try {
        const res = await window.dryChat.auth.login({ email, password });
        if (res.success) {
          showToast(`Welcome back, ${res.user.name}!`, 'success');
          state.setCurrentUser(res.user);
          authContainer.style.display = 'none';
          onAuthSuccess(res.user);
        } else {
          showToast(res.error || 'Invalid email or password', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
      }
    });
  }

  // Handle Register Submit
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#reg-name').value.trim();
      const email = $('#reg-email').value.trim();
      const username = $('#reg-username').value.trim();
      const password = $('#reg-password').value;
      const about = $('#reg-about').value.trim();
      const btnSubmit = $('#btn-register-submit');

      if (password.length < 6) {
        showToast('Password must be at least 6 characters long.', 'error');
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generating 13-Digit ID & Registering...';

      try {
        const res = await window.dryChat.auth.register({ name, email, password, username, about });
        if (res.success) {
          showToast(`Account created! Your 13-digit ID: ${res.user.dryChatId}`, 'success', 6000);
          state.setCurrentUser(res.user);
          authContainer.style.display = 'none';
          onAuthSuccess(res.user);
        } else {
          showToast(res.error || 'Registration failed', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="bi bi-person-plus"></i> Create Account & Get 13-Digit ID';
      }
    });
  }

  // Handle Forgot Password Submit
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#forgot-email').value.trim();
      const btnSubmit = $('#btn-forgot-submit');

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = 'Sending link...';

      try {
        const res = await window.dryChat.auth.forgotPassword({ email });
        if (res.success) {
          showToast('Password reset link sent to your email!', 'success');
          forgotForm.reset();
        } else {
          showToast(res.error || 'Failed to send reset link', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="bi bi-envelope"></i> Send Password Reset Link';
      }
    });
  }
}
