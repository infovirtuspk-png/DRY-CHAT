import { $ } from '../utils/dom.js';
import { showToast } from './toasts.js';

let currentRotation = 0;
let currentFilePath = null;

export function openMediaViewer(mediaData) {
  const viewer = $('#media-viewer');
  const content = $('#media-viewer-content');
  if (!viewer || !content) return;

  currentRotation = 0;
  currentFilePath = mediaData.localPath;

  content.innerHTML = '';

  if (mediaData.mediaType === 'video') {
    const video = document.createElement('video');
    video.src = mediaData.localPath || mediaData.cloudinaryUrl;
    video.controls = true;
    video.autoplay = true;
    content.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = mediaData.localPath || mediaData.cloudinaryUrl;
    img.id = 'mv-current-image';
    content.appendChild(img);
  }

  viewer.style.display = 'flex';
}

export function closeMediaViewer() {
  const viewer = $('#media-viewer');
  const content = $('#media-viewer-content');
  if (content) content.innerHTML = '';
  if (viewer) viewer.style.display = 'none';
}

export function initMediaViewer() {
  const btnClose = $('#btn-mv-close');
  const btnRotate = $('#btn-mv-rotate');
  const btnFolder = $('#btn-mv-folder');

  if (btnClose) {
    btnClose.addEventListener('click', closeMediaViewer);
  }

  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      const img = $('#mv-current-image');
      if (img) {
        currentRotation = (currentRotation + 90) % 360;
        img.style.transform = `rotate(${currentRotation}deg)`;
      }
    });
  }

  if (btnFolder) {
    btnFolder.addEventListener('click', async () => {
      if (currentFilePath) {
        await window.dryChat.media.showInFolder({ filePath: currentFilePath });
      } else {
        showToast('Local file path unavailable', 'error');
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMediaViewer();
    }
  });
}
