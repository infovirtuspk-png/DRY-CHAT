import { $ } from '../utils/dom.js';

export function hideSplashScreen() {
  const splash = $('#splash-screen');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
    }, 400);
  }
}
