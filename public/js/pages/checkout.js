const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const loading = ref(true);
    const submitting = ref(false);
    const cartItems = ref([]);
    const form = ref({
      recipientName: '',
      recipientEmail: '',
      recipientAddress: '',
      shippingMethod: 'home_delivery',
      isRemoteArea: false,
      isUrgent: false
    });
    const errors = ref({});
    // 運費由後端 Shipping 模組試算，避免前後端規則不一致
    const quote = ref(null);

    const cartTotal = computed(function () {
      return cartItems.value.reduce(function (sum, item) {
        return sum + item.product.price * item.quantity;
      }, 0);
    });

    function validate() {
      errors.value = {};
      if (!form.value.recipientName.trim()) errors.value.recipientName = '請輸入收件人姓名';
      if (!form.value.recipientEmail.trim()) {
        errors.value.recipientEmail = '請輸入 Email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.recipientEmail)) {
        errors.value.recipientEmail = 'Email 格式不正確';
      }
      if (!form.value.recipientAddress.trim()) errors.value.recipientAddress = '請輸入收件地址';
      return Object.keys(errors.value).length === 0;
    }

    async function fetchQuote() {
      try {
        const res = await apiFetch('/api/orders/shipping-quote', {
          method: 'POST',
          body: JSON.stringify({
            shippingMethod: form.value.shippingMethod,
            isRemoteArea: form.value.isRemoteArea,
            isUrgent: form.value.isUrgent
          })
        });
        quote.value = res.data;
      } catch (e) {
        quote.value = null;
      }
    }

    watch(
      function () { return [form.value.shippingMethod, form.value.isRemoteArea, form.value.isUrgent]; },
      fetchQuote
    );

    async function submitOrder() {
      if (!validate() || submitting.value) return;
      submitting.value = true;
      try {
        const res = await apiFetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(form.value)
        });
        Notification.show('訂單已建立', 'success');
        window.location.href = '/orders/' + res.data.id;
      } catch (err) {
        Notification.show(err?.data?.message || '訂單建立失敗', 'error');
      } finally {
        submitting.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/cart');
        cartItems.value = res.data.items;
        if (cartItems.value.length === 0) {
          window.location.href = '/cart';
          return;
        }
      } catch (e) {
        window.location.href = '/cart';
        return;
      }
      await fetchQuote();
      loading.value = false;
    });

    return { loading, submitting, cartItems, form, errors, cartTotal, quote, submitOrder };
  }
}).mount('#app');
