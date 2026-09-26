const { app, request, registerUser } = require('./setup');

describe('Orders API', () => {
  let userToken;
  let productId;
  let orderId;

  beforeAll(async () => {
    // Register a user for order tests
    const { token } = await registerUser();
    userToken = token;

    // Get a product id
    const prodRes = await request(app).get('/api/products');
    productId = prodRes.body.data.products[0].id;

    // Add product to cart
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 1 });
  });

  it('should create an order from cart', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        recipientName: '測試收件人',
        recipientEmail: 'recipient@example.com',
        recipientAddress: '台北市測試路 123 號',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body).toHaveProperty('message');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('order_no');
    expect(res.body.data).toHaveProperty('total_amount');
    expect(res.body.data).toHaveProperty('status', 'pending');
    expect(res.body.data).toHaveProperty('items');
    expect(Array.isArray(res.body.data.items)).toBe(true);

    orderId = res.body.data.id;
  });

  it('should fail to create order with empty cart', async () => {
    // The cart was already cleared by the previous order
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        recipientName: '測試收件人',
        recipientEmail: 'recipient@example.com',
        recipientAddress: '台北市測試路 123 號',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('data', null);
    expect(res.body).toHaveProperty('error');
  });

  it('should fail to create order without auth', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        recipientName: '測試收件人',
        recipientEmail: 'recipient@example.com',
        recipientAddress: '台北市測試路 123 號',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).not.toBeNull();
  });

  it('should get order list', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body.data).toHaveProperty('orders');
    expect(Array.isArray(res.body.data.orders)).toBe(true);
    expect(res.body.data.orders.length).toBeGreaterThan(0);
  });

  it('should get order detail', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body.data).toHaveProperty('id', orderId);
    expect(res.body.data).toHaveProperty('order_no');
    expect(res.body.data).toHaveProperty('items');
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('should return 404 for non-existent order', async () => {
    const res = await request(app)
      .get('/api/orders/non-existent-order-id')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('data', null);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Orders API - shipping fee', () => {
  let userToken;
  let product;

  const recipient = {
    recipientName: '測試收件人',
    recipientEmail: 'recipient@example.com',
    recipientAddress: '台北市測試路 123 號',
  };

  async function addToCart(quantity) {
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product.id, quantity });
  }

  beforeAll(async () => {
    const { token } = await registerUser();
    userToken = token;

    // 取一個單價低於 1,500 且庫存足夠的商品，方便構造未達門檻 / 達門檻情境
    const prodRes = await request(app).get('/api/products?limit=100');
    product = prodRes.body.data.products.find((p) => p.price < 1500 && p.stock >= 10);
  });

  it('should quote shipping for current cart without creating order', async () => {
    await addToCart(1);

    const res = await request(app)
      .post('/api/orders/shipping-quote')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ shippingMethod: 'convenience_store', isUrgent: true });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.subtotal).toBe(product.price);
    expect(res.body.data.shipping_fee).toBe(60 + 250);
    expect(res.body.data.total_amount).toBe(product.price + 310);
  });

  it('should default to home delivery and include shipping fee in total_amount', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send(recipient);

    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(product.price);
    expect(res.body.data.shipping_fee).toBe(120);
    expect(res.body.data.total_amount).toBe(product.price + 120);
    expect(res.body.data.shipping.method).toBe('home_delivery');

    const detail = await request(app)
      .get(`/api/orders/${res.body.data.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(detail.body.data.shipping_method).toBe('home_delivery');
    expect(detail.body.data.shipping_fee).toBe(120);
    expect(detail.body.data.total_amount).toBe(product.price + 120);
  });

  it('should waive base fee over threshold but still charge surcharges', async () => {
    const quantity = Math.ceil(1500 / product.price);
    await addToCart(quantity);
    const subtotal = product.price * quantity;

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...recipient, shippingMethod: 'home_delivery', isRemoteArea: true, isUrgent: true });

    expect(res.status).toBe(201);
    expect(res.body.data.shipping.freeShippingApplied).toBe(true);
    expect(res.body.data.shipping_fee).toBe(450);
    expect(res.body.data.total_amount).toBe(subtotal + 450);
  });

  it('should reject invalid shipping method without creating order', async () => {
    await addToCart(1);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...recipient, shippingMethod: 'drone' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('data', null);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');

    // 購物車應保留（訂單未建立）
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect(cartRes.body.data.items.length).toBe(1);
  });
});
