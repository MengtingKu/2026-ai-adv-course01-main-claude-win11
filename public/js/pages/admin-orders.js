const { createApp, ref, watch, onMounted, onBeforeUnmount } = Vue;

createApp({
  setup() {
    const orders = ref([]);
    const pagination = ref({ total: 0, page: 1, limit: 10, totalPages: 0 });
    const loading = ref(true);
    const statusFilter = ref('');

    const detailVisible = ref(false);
    const detailOrder = ref(null);
    const detailLoading = ref(false);

    const filters = [
      { value: '', label: '全部' },
      { value: 'pending', label: '待付款' },
      { value: 'paid', label: '已付款' },
      { value: 'failed', label: '付款失敗' },
    ];

    // 文字色使用 *-ink token，淡底上 ≥4.5:1；狀態另以圓點輔助，不只靠顏色辨識
    const statusMap = {
      pending: { label: '待付款', cls: 'text-warning-ink bg-warning/10 border-warning/30', dot: 'bg-warning' },
      paid: { label: '已付款', cls: 'text-success-ink bg-success/10 border-success/30', dot: 'bg-success' },
      failed: { label: '付款失敗', cls: 'text-error-ink bg-error/10 border-error/25', dot: 'bg-error' },
    };

    function status(key) {
      return statusMap[key] || { label: key, cls: 'text-ink-600 border-line-soft', dot: 'bg-ink-400' };
    }

    const shippingMap = { home_delivery: '宅配', convenience_store: '超商取貨' };
    function shippingLabel(method) {
      return shippingMap[method] || '—';
    }

    function formatDate(value, withTime) {
      const d = new Date(value);
      return withTime
        ? d.toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' })
        : d.toLocaleDateString('zh-TW');
    }

    async function loadOrders(page) {
      page = page || 1;
      loading.value = true;
      try {
        var url = '/api/admin/orders?page=' + page + '&limit=10';
        if (statusFilter.value) url += '&status=' + statusFilter.value;
        const res = await apiFetch(url);
        orders.value = res.data.orders;
        pagination.value = res.data.pagination;
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }
    }

    async function viewDetail(id) {
      detailVisible.value = true;
      detailLoading.value = true;
      try {
        const res = await apiFetch('/api/admin/orders/' + id);
        detailOrder.value = res.data;
      } catch (e) {
        Notification.show('載入訂單詳情失敗', 'error');
        detailVisible.value = false;
      } finally {
        detailLoading.value = false;
      }
    }

    watch(statusFilter, function () {
      loadOrders(1);
    });

    function onKeydown(e) {
      if (e.key === 'Escape' && detailVisible.value) detailVisible.value = false;
    }

    onMounted(function () {
      loadOrders();
      document.addEventListener('keydown', onKeydown);
    });
    onBeforeUnmount(function () {
      document.removeEventListener('keydown', onKeydown);
    });

    return {
      orders, pagination, loading, statusFilter, filters,
      detailVisible, detailOrder, detailLoading,
      status, shippingLabel, formatDate, loadOrders, viewDetail
    };
  }
}).mount('#app');
