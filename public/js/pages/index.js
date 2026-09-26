const { createApp, ref, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const products = ref([]);
    const pagination = ref({ total: 0, page: 1, limit: 9, totalPages: 0 });
    const loading = ref(true);

    const featuredImages = [
      'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400',
      'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400',
      'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=400',
      'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=400',
    ];

    async function loadProducts(page) {
      page = page || 1;
      loading.value = true;
      try {
        const res = await apiFetch('/api/products?page=' + page + '&limit=9');
        products.value = res.data.products.map(function (p) {
          p._adding = false;
          return p;
        });
        pagination.value = res.data.pagination;
      } catch (e) {
        products.value = [];
      } finally {
        loading.value = false;
      }
    }

    function goToProduct(id) {
      window.location.href = '/products/' + id;
    }

    async function addToCart(product) {
      if (product._adding) return;
      product._adding = true;
      try {
        await apiFetch('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id, quantity: 1 })
        });
        Notification.show('已加入購物車', 'success');
        // Update cart badge
        var badge = document.getElementById('cart-badge');
        if (badge) {
          var count = parseInt(badge.textContent || '0') + 1;
          badge.textContent = count;
          badge.style.display = 'flex';
        }
      } catch (e) {
        Notification.show('加入購物車失敗', 'error');
      } finally {
        product._adding = false;
      }
    }

    onMounted(async function () {
      await loadProducts(1);
      // 從其他頁面帶 #products 等錨點進來時，商品載入後精選區會長高，把目標往下推 → 重新定位
      if (location.hash) {
        await nextTick();
        var target = document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });

    return {
      products, pagination, loading, featuredImages,
      loadProducts, goToProduct, addToCart
    };
  }
}).mount('#app');
