import { $ } from '../utils/dom.js';
import { state } from '../state.js';

export function initTitlebar() {
  const btnMin = $('#btn-minimize');
  const btnMax = $('#btn-maximize');
  const btnClose = $('#btn-close');
  const statusDot = $('#status-dot');
  const statusText = $('#status-text');

  if (btnMin) {
    btnMin.addEventListener('click', () => {
      window.dryChat.windowControls.minimize();
    });
  }

  if (btnMax) {
    btnMax.addEventListener('click', () => {
      window.dryChat.windowControls.maximize();
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      window.dryChat.windowControls.close();
    });
  }

  // Update status in titlebar
  state.on('connection:changed', (isOnline) => {
    if (statusDot && statusText) {
      if (isOnline) {
        statusDot.className = 'status-dot';
        statusText.textContent = 'Online';
      } else {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Offline';
      }
    }
  });
}
