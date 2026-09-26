// Motion layer — scroll reveal、header 捲動狀態、hero 視差、預取、角標回饋。
// 需在頁面 Vue app 掛載前載入，MutationObserver 才能接住 Vue 產生的節點。
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Scroll reveal ──
  var revealObserver = ('IntersectionObserver' in window && !reduceMotion)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var t = entry.target;
            if (t.matches('[data-reveal]')) t.classList.add('is-in');
            (t._revealTargets || []).forEach(function (el) { el.classList.add('is-in'); });
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    : null;

  function register(root) {
    if (root.nodeType !== 1) return;
    var targets = root.matches('[data-reveal]') ? [root] : [];
    targets.push.apply(targets, root.querySelectorAll('[data-reveal]:not(.is-in)'));
    targets.forEach(function (el) {
      if (!revealObserver) { el.classList.add('is-in'); return; }
      // clip 揭示的元素本身被 clip-path 裁成 0 寬，IntersectionObserver 永遠判定不可見 → 改觀察父層
      if (el.dataset.reveal === 'clip' && el.parentElement) {
        var watch = el.parentElement;
        watch._revealTargets = (watch._revealTargets || []).concat(el);
        revealObserver.observe(watch);
      } else {
        revealObserver.observe(el);
      }
    });

    var imgs = root.tagName === 'IMG' ? [root] : root.querySelectorAll('img');
    Array.prototype.forEach.call(imgs, function (img) {
      if (img.complete && img.naturalWidth > 0) img.classList.add('is-loaded');
    });
  }

  register(document.body);
  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) { m.addedNodes.forEach(register); });
  }).observe(document.body, { childList: true, subtree: true });

  // 安全網：Vue 載入失敗時仍顯示內容與圖片
  setTimeout(function () {
    document.querySelectorAll('[v-cloak]').forEach(function (el) { el.removeAttribute('v-cloak'); });
  }, 2500);
  window.addEventListener('load', function () {
    document.querySelectorAll('img:not(.is-loaded)').forEach(function (img) {
      if (img.complete) img.classList.add('is-loaded');
    });
  });

  // ── Header 捲動狀態 + hero 視差（同一個 rAF 迴圈）──
  var header = document.querySelector('header.sticky');
  var parallaxEls = [];
  var ticking = false;

  function collectParallax() {
    parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (header) header.classList.toggle('is-scrolled', y > 24);
      if (!reduceMotion && window.innerWidth >= 768) {
        parallaxEls.forEach(function (el) {
          var speed = parseFloat(el.dataset.parallax) || 0.1;
          // 使用獨立的 translate 屬性，不干擾 transform 進場動畫
          el.style.translate = y < window.innerHeight ? '0 ' + (y * speed).toFixed(1) + 'px' : '';
        });
      }
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('DOMContentLoaded', function () { collectParallax(); onScroll(); });
  // Vue 掛載會重建 hero 節點，掛載後重新收集
  window.addEventListener('load', function () { collectParallax(); onScroll(); });

  // ── 預取：hover / touch 內部連結或商品卡時預先抓取下一頁 ──
  var prefetched = {};
  function prefetch(e) {
    var el = e.target.closest && e.target.closest('[data-prefetch], a[href^="/"]');
    if (!el) return;
    var url = (el.dataset.prefetch || el.getAttribute('href') || '').split('#')[0];
    if (!url || prefetched[url] || url === location.pathname) return;
    prefetched[url] = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });

  // ── Scroll spy：首頁捲到哪個區塊，導覽列對應連結標示為目前位置 ──
  var navLinks = document.querySelectorAll('[data-nav-section]');
  if (navLinks.length && location.pathname === '/' && 'IntersectionObserver' in window) {
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      navLinks.forEach(function (link) {
        if (visible[link.dataset.navSection]) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' }); // 只看視窗中線附近的區塊
    document.addEventListener('DOMContentLoaded', function () {
      navLinks.forEach(function (link) {
        var section = document.getElementById(link.dataset.navSection);
        if (section) spy.observe(section);
      });
    });
  }

  // ── 購物車角標：數字變動時彈跳 ──
  var badge = document.getElementById('cart-badge');
  if (badge) {
    var lastCount = badge.textContent;
    new MutationObserver(function () {
      if (badge.textContent === lastCount) return;
      lastCount = badge.textContent;
      badge.classList.remove('m-bump');
      void badge.offsetWidth; // 重新觸發動畫
      badge.classList.add('m-bump');
    }).observe(badge, { childList: true, characterData: true, subtree: true });
  }
})();
