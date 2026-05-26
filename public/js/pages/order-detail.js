const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;

    const order = ref(null);
    const loading = ref(true);
    const paying = ref(false);
    const paymentResult = ref(null);
    const queryingPayment = ref(false);

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-apricot/20 text-apricot' },
      paid: { label: '已付款', cls: 'bg-sage/20 text-sage' },
      failed: { label: '付款失敗', cls: 'bg-red-100 text-red-600' },
    };

    const paymentMessages = {
      paid: { text: '付款成功！感謝您的購買。', cls: 'bg-sage/10 text-sage border border-sage/20' },
      pending: { text: '付款尚未完成，如已付款請稍後再確認。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
      error: { text: '查詢付款狀態失敗，請重新整理頁面。', cls: 'bg-red-50 text-red-600 border border-red-100' },
    };

    async function initiateEcpayPayment() {
      if (!order.value || paying.value) return;
      paying.value = true;
      try {
        const res = await apiFetch('/api/payments/ecpay/create-form', {
          method: 'POST',
          body: JSON.stringify({ orderId: order.value.id })
        });

        const { action, fields } = res.data;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = action;

        Object.entries(fields).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } catch (e) {
        Notification.show('建立付款失敗，請重試', 'error');
        paying.value = false;
      }
    }

    async function checkPaymentResult() {
      queryingPayment.value = true;
      try {
        const res = await apiFetch('/api/payments/ecpay/query', {
          method: 'POST',
          body: JSON.stringify({ orderId })
        });
        paymentResult.value = res.data.status;
        if (res.data.status === 'paid') {
          order.value.status = 'paid';
        }
      } catch (e) {
        paymentResult.value = 'error';
      } finally {
        queryingPayment.value = false;
        // Remove query string without page reload
        history.replaceState(null, '', location.pathname);
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;

        const params = new URLSearchParams(location.search);
        if (params.get('payment') === 'return') {
          await checkPaymentResult();
        }
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }
    });

    return {
      order, loading, paying, paymentResult, queryingPayment,
      statusMap, paymentMessages,
      initiateEcpayPayment,
    };
  }
}).mount('#app');
