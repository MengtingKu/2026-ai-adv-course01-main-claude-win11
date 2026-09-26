document.addEventListener('DOMContentLoaded', function () {
  const authNav = document.getElementById('auth-nav');
  const cartBadge = document.getElementById('cart-badge');
  const ordersLink = document.getElementById('orders-link');
  const mobileAccount = document.getElementById('mobile-account');
  const mobileCartCount = document.getElementById('mobile-cart-count');

  const userName = function () {
    const span = document.createElement('span');
    span.textContent = Auth.getUser()?.name || '';
    return span.innerHTML; // 已跳脫，可安全插入 HTML
  };

  if (authNav) {
    if (Auth.isLoggedIn()) {
      let html = '<div class="flex items-center gap-5">';
      if (Auth.isAdmin()) {
        html += '<a href="/admin/products" class="m-underline inline-flex items-center gap-2 font-ui text-[13px] tracking-[0.5px] text-white/70 hover:text-white transition-colors duration-150"><span class="w-1.5 h-1.5 rounded-full bg-cherry" aria-hidden="true"></span>後台管理</a>';
      }
      html += '<span class="font-ui text-[13px] text-white/70">' + userName() + '</span>';
      html += '<button onclick="Auth.logout()" class="m-fill m-fill-ink font-ui text-[13px] border border-white/20 text-white px-4 h-9 flex items-center hover:border-white/50 transition-all duration-150" style="--m-fill: rgb(255 255 255 / 0.08)">登出</button>';
      html += '</div>';
      authNav.innerHTML = html;
    } else {
      authNav.innerHTML = '<a href="/login" class="m-fill m-fill-ink font-ui text-[13px] border border-white/20 text-white px-4 h-9 flex items-center hover:border-white/50 transition-all duration-150" style="--m-fill: rgb(255 255 255 / 0.08)">登入</a>';
    }
  }

  // 手機選單內的帳號區塊（未登入時保留 EJS 預設的「登入 / 註冊」）
  if (mobileAccount && Auth.isLoggedIn()) {
    const row = 'flex items-center justify-between h-12 border-b border-white/10 font-ui text-[14px] text-white/85 active:text-white';
    let html = '<p class="font-ui text-overline text-white/60 mb-3">Account</p>';
    html += '<p class="font-display text-[26px] font-light leading-tight mb-4">' + userName() + '</p>';
    html += '<div class="border-t border-white/10">';
    html += '<a href="/orders" class="' + row + '">我的訂單<span aria-hidden="true">→</span></a>';
    if (Auth.isAdmin()) {
      html += '<a href="/admin/products" class="' + row + '"><span class="inline-flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-cherry" aria-hidden="true"></span>後台管理</span><span aria-hidden="true">→</span></a>';
    }
    html += '</div>';
    html += '<button type="button" onclick="Auth.logout()" class="mt-6 w-full h-12 border border-white/25 text-white font-ui text-[14px] tracking-[1px] active:bg-white/10">登出</button>';
    mobileAccount.innerHTML = html;
  }

  if (ordersLink) {
    ordersLink.style.display = Auth.isLoggedIn() ? '' : 'none';
  }

  if (cartBadge) {
    // 手機選單同步顯示購物車數量
    if (mobileCartCount) {
      new MutationObserver(function () {
        mobileCartCount.textContent = cartBadge.textContent ? cartBadge.textContent + ' 件' : '';
      }).observe(cartBadge, { childList: true, characterData: true, subtree: true });
    }
    apiFetch('/api/cart').then(function (res) {
      if (res && res.data && res.data.items && res.data.items.length > 0) {
        cartBadge.textContent = res.data.items.length;
        cartBadge.style.display = 'flex';
      }
    }).catch(function () {});
  }

  // ── Mobile menu ──
  const toggle = document.getElementById('menu-toggle');
  const sheet = document.getElementById('mobile-menu');
  if (toggle && sheet) {
    const setOpen = function (open) {
      sheet.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
      document.documentElement.classList.toggle('m-menu-open', open);
      if (open) {
        const first = sheet.querySelector('a, button');
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 200);
      }
    };
    const isOpen = function () { return sheet.classList.contains('is-open'); };

    toggle.addEventListener('click', function () { setOpen(!isOpen()); });
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setOpen(false); toggle.focus(); return; }
      // 焦點鎖在 toggle + 選單內
      if (e.key === 'Tab') {
        const focusables = [toggle].concat(Array.prototype.slice.call(sheet.querySelectorAll('a, button')));
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // 轉為桌機寬度時自動關閉
    window.matchMedia('(min-width: 768px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }
});
