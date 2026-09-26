const Notification = {
  _timeout: null,

  show(message, type = 'info') {
    const el = document.getElementById('notification-toast');
    if (!el) return;

    // 直角深底 + 左側機能色條（依 design system：機能色面積極小）
    const accents = {
      success: 'bg-success',
      error: 'bg-error',
      warning: 'bg-warning',
      info: 'bg-cherry'
    };
    const accent = accents[type] || accents.info;

    el.className = 'm-toast fixed top-20 right-4 z-[100] min-w-[220px] max-w-[calc(100vw-2rem)] overflow-hidden bg-ink-900 text-bg-paper font-ui text-[13px] tracking-[0.3px] shadow-[0_8px_40px_rgba(26,25,23,.18)]';
    el.innerHTML = '';

    const bar = document.createElement('span');
    bar.className = 'absolute left-0 top-0 bottom-0 w-[3px] ' + accent;
    const text = document.createElement('p');
    text.className = 'pl-5 pr-6 py-3.5';
    text.textContent = message;
    const timer = document.createElement('span');
    timer.className = 'm-toast-bar absolute left-0 right-0 bottom-0 h-px bg-white/25';
    el.append(bar, text, timer);

    el.style.display = 'block';
    el.style.opacity = '';

    if (this._timeout) clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => { el.style.display = 'none'; }, 300);
    }, 3000);
  }
};
