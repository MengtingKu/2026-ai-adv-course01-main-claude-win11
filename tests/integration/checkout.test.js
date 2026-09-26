/**
 * 結帳流程 Integration Test
 *
 * - DB_PATH=':memory:'（vitest.config.js 設定），本檔使用獨立的記憶體 SQLite，不會動到 database.sqlite
 * - 每個測試自行建立測試會員與購物車，afterEach 清除該會員的訂單 / 購物車 / 帳號並還原商品庫存
 */
const { app, request } = require('../setup');
const db = require('../../src/database');

const PASSWORD = 'password123';

const recipient = {
  recipientName: '整合測試收件人',
  recipientEmail: 'integration@example.com',
  recipientAddress: '花蓮縣秀林鄉測試路 1 號',
};

function expectEnvelope(res, { ok }) {
  expect(res.headers['content-type']).toMatch(/application\/json/);
  expect(res.body).toHaveProperty('data');
  expect(res.body).toHaveProperty('error');
  expect(res.body).toHaveProperty('message');
  expect(typeof res.body.message).toBe('string');
  if (ok) {
    expect(res.body.error).toBeNull();
  } else {
    expect(res.body.data).toBeNull();
    expect(typeof res.body.error).toBe('string');
  }
}

function getStock(productId) {
  return db.prepare('SELECT stock FROM products WHERE id = ?').get(productId).stock;
}

function countOrders(userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?').get(userId).n;
}

function countOrphanOrderItems() {
  return db.prepare(
    'SELECT COUNT(*) AS n FROM order_items WHERE order_id NOT IN (SELECT id FROM orders)'
  ).get().n;
}

function countCartItems(userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM cart_items WHERE user_id = ?').get(userId).n;
}

describe('Integration: 會員結帳流程', () => {
  let initialStock; // product_id -> stock，每個測試後還原
  let member; // { id, email, token }
  let productA; // 單價較低的商品
  let productB;

  const auth = () => ({ Authorization: `Bearer ${member.token}` });

  async function addToCart(product, quantity) {
    const res = await request(app).post('/api/cart').set(auth()).send({ productId: product.id, quantity });
    expect(res.status).toBe(200);
    return res;
  }

  beforeAll(() => {
    initialStock = new Map(
      db.prepare('SELECT id, stock FROM products').all().map((p) => [p.id, p.stock])
    );
  });

  beforeEach(async () => {
    // 1. 建立測試會員並登入
    const email = `it-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: PASSWORD, name: '整合測試會員' });
    expect(reg.status).toBe(201);

    const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
    expectEnvelope(login, { ok: true });
    expect(login.body.data.token).toEqual(expect.any(String));

    member = { id: login.body.data.user.id, email, token: login.body.data.token };

    // 2. 取得商品資料
    const products = await request(app).get('/api/products?limit=100');
    expect(products.status).toBe(200);
    expectEnvelope(products, { ok: true });
    const list = [...products.body.data.products]
      .filter((p) => p.stock >= 10)
      .sort((a, b) => a.price - b.price);
    [productA, productB] = list;
    expect(productA.price).toBeLessThan(1500);
  });

  afterEach(() => {
    const cleanup = db.transaction(() => {
      db.prepare(
        'DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)'
      ).run(member.id);
      db.prepare('DELETE FROM orders WHERE user_id = ?').run(member.id);
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(member.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(member.id);

      const restore = db.prepare('UPDATE products SET stock = ? WHERE id = ?');
      for (const [id, stock] of initialStock) restore.run(stock, id);
    });
    cleanup();
  });

  describe('建立訂單成功', () => {
    it('超商取貨 + 偏遠地區：寫入訂單、品項、運費、總額，扣庫存並清空購物車', async () => {
      // 3. 加入購物車
      await addToCart(productA, 2);
      await addToCart(productB, 1);
      const stockA = getStock(productA.id);
      const stockB = getStock(productB.id);

      // 4. 建立包含配送方式與配送資訊的訂單
      const res = await request(app)
        .post('/api/orders')
        .set(auth())
        .send({ ...recipient, shippingMethod: 'convenience_store', isRemoteArea: true, isUrgent: false });

      // 5. 驗證訂單建立結果 —— HTTP 與回應格式
      expect(res.status).toBe(201);
      expectEnvelope(res, { ok: true });

      const subtotal = productA.price * 2 + productB.price;
      const shippingFee = 60 + 200; // 超商取貨不適用滿額免運
      const data = res.body.data;
      expect(data).toMatchObject({
        order_no: expect.stringMatching(/^ORD-\d{8}-[0-9A-F]{5}$/),
        status: 'pending',
        subtotal,
        shipping_fee: shippingFee,
        total_amount: subtotal + shippingFee,
        shipping: {
          method: 'convenience_store',
          baseFee: 60,
          remoteAreaSurcharge: 200,
          urgentSurcharge: 0,
          shippingFee,
          freeShippingApplied: false,
        },
      });
      expect(data.items).toHaveLength(2);

      // 訂單正確寫入
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(data.id);
      expect(order).toMatchObject({
        user_id: member.id,
        order_no: data.order_no,
        recipient_name: recipient.recipientName,
        recipient_email: recipient.recipientEmail,
        recipient_address: recipient.recipientAddress,
        shipping_method: 'convenience_store',
        is_remote_area: 1,
        is_urgent: 0,
        subtotal,
        shipping_fee: shippingFee,
        total_amount: subtotal + shippingFee,
        status: 'pending',
      });

      // 訂單品項正確寫入（名稱、價格快照、數量）
      const items = db
        .prepare('SELECT product_id, product_name, product_price, quantity FROM order_items WHERE order_id = ?')
        .all(data.id);
      expect(items).toHaveLength(2);
      expect(items).toEqual(
        expect.arrayContaining([
          { product_id: productA.id, product_name: productA.name, product_price: productA.price, quantity: 2 },
          { product_id: productB.id, product_name: productB.name, product_price: productB.price, quantity: 1 },
        ])
      );

      // 庫存正確扣除
      expect(getStock(productA.id)).toBe(stockA - 2);
      expect(getStock(productB.id)).toBe(stockB - 1);

      // 購物車已清空（API 與 DB）
      const cart = await request(app).get('/api/cart').set(auth());
      expect(cart.status).toBe(200);
      expect(cart.body.data.items).toHaveLength(0);
      expect(countCartItems(member.id)).toBe(0);

      // 訂單詳情 API 讀回相同的金額
      const detail = await request(app).get(`/api/orders/${data.id}`).set(auth());
      expect(detail.status).toBe(200);
      expect(detail.body.data.total_amount).toBe(subtotal + shippingFee);
      expect(detail.body.data.items).toHaveLength(2);
    });

    it('宅配小計未達 1,500：收基本運費 120', async () => {
      await addToCart(productA, 1);

      const res = await request(app).post('/api/orders').set(auth()).send(recipient);

      expect(res.status).toBe(201);
      expect(res.body.data.subtotal).toBe(productA.price);
      expect(res.body.data.shipping_fee).toBe(120);
      expect(res.body.data.total_amount).toBe(productA.price + 120);
      expect(db.prepare('SELECT shipping_method FROM orders WHERE id = ?').get(res.body.data.id))
        .toEqual({ shipping_method: 'home_delivery' });
    });

    it('宅配滿 1,500 + 當日急件：免基本運費，急件附加費照收', async () => {
      const quantity = Math.ceil(1500 / productA.price);
      await addToCart(productA, quantity);
      const stockBefore = getStock(productA.id);

      const res = await request(app)
        .post('/api/orders')
        .set(auth())
        .send({ ...recipient, shippingMethod: 'home_delivery', isUrgent: true });

      const subtotal = productA.price * quantity;
      expect(res.status).toBe(201);
      expect(res.body.data.shipping.freeShippingApplied).toBe(true);
      expect(res.body.data.shipping_fee).toBe(250);
      expect(res.body.data.total_amount).toBe(subtotal + 250);
      expect(getStock(productA.id)).toBe(stockBefore - quantity);
    });
  });

  describe('建立訂單失敗', () => {
    it('庫存不足：回 400，不建立訂單、不扣庫存、保留購物車', async () => {
      await addToCart(productA, 1);
      await addToCart(productB, 3);
      // 模擬加入購物車後庫存被其他人買走
      db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(2, productB.id);
      const stockA = getStock(productA.id);

      const res = await request(app).post('/api/orders').set(auth()).send(recipient);

      expect(res.status).toBe(400);
      expectEnvelope(res, { ok: false });
      expect(res.body.error).toBe('STOCK_INSUFFICIENT');
      expect(countOrders(member.id)).toBe(0);
      expect(countOrphanOrderItems()).toBe(0);
      expect(getStock(productA.id)).toBe(stockA);
      expect(getStock(productB.id)).toBe(2);
      expect(countCartItems(member.id)).toBe(2);
    });

    it('配送方式不合法：回 400，不建立訂單、不扣庫存', async () => {
      await addToCart(productA, 1);
      const stockA = getStock(productA.id);

      const res = await request(app)
        .post('/api/orders')
        .set(auth())
        .send({ ...recipient, shippingMethod: 'drone', isRemoteArea: true });

      expect(res.status).toBe(400);
      expectEnvelope(res, { ok: false });
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(countOrders(member.id)).toBe(0);
      expect(getStock(productA.id)).toBe(stockA);
      expect(countCartItems(member.id)).toBe(1);
    });

    it('購物車為空：回 400 CART_EMPTY，不建立訂單', async () => {
      const res = await request(app).post('/api/orders').set(auth()).send(recipient);

      expect(res.status).toBe(400);
      expectEnvelope(res, { ok: false });
      expect(res.body.error).toBe('CART_EMPTY');
      expect(countOrders(member.id)).toBe(0);
    });

    it('transaction 中途失敗：整筆 rollback，不留下不完整訂單、不扣任何庫存', async () => {
      await addToCart(productA, 2);
      await addToCart(productB, 1);
      const stockA = getStock(productA.id);
      const stockB = getStock(productB.id);

      // 讓 productB 的 order_items INSERT 失敗：此時 orders 與 productA 的品項/扣庫存已在 transaction 內執行
      db.prepare('CREATE TEMP TABLE IF NOT EXISTS fail_order_item_products (product_id TEXT)').run();
      db.prepare('INSERT INTO fail_order_item_products (product_id) VALUES (?)').run(productB.id);
      db.prepare(
        `CREATE TEMP TRIGGER IF NOT EXISTS fail_order_item_insert
         BEFORE INSERT ON order_items
         WHEN NEW.product_id IN (SELECT product_id FROM fail_order_item_products)
         BEGIN SELECT RAISE(ABORT, 'forced failure for integration test'); END`
      ).run();

      let res;
      try {
        res = await request(app).post('/api/orders').set(auth()).send(recipient);
      } finally {
        db.prepare('DROP TRIGGER IF EXISTS temp.fail_order_item_insert').run();
        db.prepare('DROP TABLE IF EXISTS temp.fail_order_item_products').run();
      }

      expect(res.status).toBe(500);
      expectEnvelope(res, { ok: false });
      expect(countOrders(member.id)).toBe(0);
      expect(countOrphanOrderItems()).toBe(0);
      expect(getStock(productA.id)).toBe(stockA);
      expect(getStock(productB.id)).toBe(stockB);
      expect(countCartItems(member.id)).toBe(2);

      // rollback 後同一購物車可正常下單
      const retry = await request(app).post('/api/orders').set(auth()).send(recipient);
      expect(retry.status).toBe(201);
      expect(getStock(productA.id)).toBe(stockA - 2);
      expect(getStock(productB.id)).toBe(stockB - 1);
    });
  });
});
