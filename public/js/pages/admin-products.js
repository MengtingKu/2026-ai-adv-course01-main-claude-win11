const { createApp, ref, computed, onMounted, onBeforeUnmount } = Vue;

createApp({
  setup() {
    const products = ref([]);
    const pagination = ref({ total: 0, page: 1, limit: 10, totalPages: 0 });
    const loading = ref(true);

    const modalVisible = ref(false);
    const editingProduct = ref(null);
    const saving = ref(false);
    const form = ref({ name: '', description: '', price: 0, stock: 0, image_url: '' });

    const confirmVisible = ref(false);
    const deleteTarget = ref(null);

    const fallbackImage = 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=160';
    const LOW_STOCK = 5;

    // 庫存狀態標籤（文字色皆使用 *-ink token，淡底上 ≥4.5:1）
    function stockState(stock) {
      if (stock <= 0) return { label: '售完', cls: 'text-error-ink bg-error/10 border-error/25' };
      if (stock <= LOW_STOCK) return { label: '偏低', cls: 'text-warning-ink bg-warning/10 border-warning/30' };
      return null;
    }

    const lowStockCount = computed(function () {
      return products.value.filter(function (p) { return p.stock <= LOW_STOCK; }).length;
    });

    async function loadProducts(page) {
      page = page || 1;
      loading.value = true;
      try {
        const res = await apiFetch('/api/admin/products?page=' + page + '&limit=10');
        products.value = res.data.products;
        pagination.value = res.data.pagination;
      } catch (e) {
        Notification.show('載入商品失敗', 'error');
      } finally {
        loading.value = false;
      }
    }

    function openCreate() {
      editingProduct.value = null;
      form.value = { name: '', description: '', price: 0, stock: 0, image_url: '' };
      modalVisible.value = true;
    }

    function openEdit(product) {
      editingProduct.value = product;
      form.value = {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        image_url: product.image_url,
      };
      modalVisible.value = true;
    }

    function closeModal() {
      modalVisible.value = false;
    }

    async function handleSave() {
      if (!form.value.name.trim() || form.value.price <= 0) {
        Notification.show('請填寫必要欄位', 'warning');
        return;
      }
      saving.value = true;
      try {
        if (editingProduct.value) {
          await apiFetch('/api/admin/products/' + editingProduct.value.id, {
            method: 'PUT',
            body: JSON.stringify(form.value)
          });
          Notification.show('商品已更新', 'success');
        } else {
          await apiFetch('/api/admin/products', {
            method: 'POST',
            body: JSON.stringify(form.value)
          });
          Notification.show('商品已新增', 'success');
        }
        modalVisible.value = false;
        await loadProducts(pagination.value.page);
      } catch (e) {
        Notification.show('儲存失敗', 'error');
      } finally {
        saving.value = false;
      }
    }

    function confirmDeleteFn(product) {
      deleteTarget.value = product;
      confirmVisible.value = true;
    }

    async function handleDelete() {
      confirmVisible.value = false;
      try {
        await apiFetch('/api/admin/products/' + deleteTarget.value.id, { method: 'DELETE' });
        Notification.show('商品已刪除', 'success');
        await loadProducts(pagination.value.page);
      } catch (e) {
        Notification.show('刪除失敗', 'error');
      }
    }

    function onKeydown(e) {
      if (e.key !== 'Escape') return;
      if (confirmVisible.value) confirmVisible.value = false;
      else if (modalVisible.value) closeModal();
    }

    onMounted(function () {
      loadProducts();
      document.addEventListener('keydown', onKeydown);
    });
    onBeforeUnmount(function () {
      document.removeEventListener('keydown', onKeydown);
    });

    return {
      products, pagination, loading, fallbackImage, lowStockCount, stockState,
      modalVisible, editingProduct, saving, form,
      confirmVisible, deleteTarget,
      loadProducts, openCreate, openEdit, closeModal, handleSave,
      confirmDeleteFn, handleDelete
    };
  }
}).mount('#app');
