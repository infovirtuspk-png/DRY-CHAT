import { $, $$ } from '../utils/dom.js';

const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','🥲','🥹','😊','😇','🙂','🙃','😉','😌',
  '😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸',
  '🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢',
  '😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🫡',
  '🤔','🫣','🤭','🫢','🤫','🫠','🤥','😶','😐','😑','😬','🫨','😮‍💨','😮','😯','😲',
  '🥱','😴','🤤','😪','😵','😵‍💫','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠',
  '👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪',
  '🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🫱','🫲','🫳','🫴','🤌','🤏',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💖','💗','💓','💞',
  '🔥','✨','🎉','🎊','🎈','🎁','⭐','🌟','💥','💯','⚡','🚀','🏆','🎯','🎲','🎵'
];

export function initEmojiPicker(onEmojiSelect) {
  const grid = $('#emoji-grid');
  const searchInput = $('#emoji-search');

  function renderEmojis(filter = '') {
    if (!grid) return;
    grid.innerHTML = '';
    const filtered = filter
      ? EMOJI_LIST.filter(e => e.includes(filter))
      : EMOJI_LIST;

    filtered.forEach(emoji => {
      const el = document.createElement('div');
      el.className = 'emoji-item';
      el.textContent = emoji;
      el.addEventListener('click', () => {
        onEmojiSelect(emoji);
      });
      grid.appendChild(el);
    });
  }

  renderEmojis();

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderEmojis(e.target.value.trim());
    });
  }
}
