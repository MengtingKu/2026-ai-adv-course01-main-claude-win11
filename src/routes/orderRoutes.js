const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');
const { calculateShipping, ShippingError } = require('../utils/shipping');

const router = express.Router();

router.use(authMiddleware);

function generateOrderNo() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = uuidv4().slice(0, 5).toUpperCase();
  return `ORD-${dateStr}-${random}`;
}

function getCartItems(userId) {
  return db.prepare(
    `SELECT ci.id, ci.product_id, ci.quantity,
            p.name as product_name, p.price as product_price, p.stock as product_stock
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = ?`
  ).all(userId);
}

function calculateSubtotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
}

// 以 Shipping 模組計算運費；參數不合法時回傳 { error } 供路由回 400
function quoteShipping(subtotal, body) {
  const { shippingMethod, isRemoteArea, isUrgent } = body || {};
  try {
    return { shipping: calculateShipping({ subtotal, method: shippingMethod, isRemoteArea, isUrgent }) };
  } catch (err) {
    if (err instanceof ShippingError) return { error: err.message };
    throw err;
  }
}

/**
 * @openapi
 * components:
 *   schemas:
 *     ShippingOptions:
 *       type: object
 *       properties:
 *         shippingMethod:
 *           type: string
 *           enum: [home_delivery, convenience_store]
 *           default: home_delivery
 *           description: 配送方式（宅配 120 元，商品小計滿 1,500 元免基本運費；超商取貨固定 60 元，不適用滿額免運）
 *         isRemoteArea:
 *           type: boolean
 *           default: false
 *           description: 偏遠地區，加收 200 元
 *         isUrgent:
 *           type: boolean
 *           default: false
 *           description: 當日急件，加收 250 元
 *     ShippingBreakdown:
 *       type: object
 *       properties:
 *         method:
 *           type: string
 *           enum: [home_delivery, convenience_store]
 *         baseFee:
 *           type: integer
 *           description: 基本運費（宅配滿額免運時為 0）
 *         remoteAreaSurcharge:
 *           type: integer
 *         urgentSurcharge:
 *           type: integer
 *         shippingFee:
 *           type: integer
 *           description: 運費總計 = baseFee + remoteAreaSurcharge + urgentSurcharge
 *         freeShippingApplied:
 *           type: boolean
 */

/**
 * @openapi
 * /api/orders/shipping-quote:
 *   post:
 *     summary: 依目前購物車試算運費與訂單總額（不建立訂單）
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShippingOptions'
 *     responses:
 *       200:
 *         description: 試算成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     subtotal:
 *                       type: integer
 *                     shipping_fee:
 *                       type: integer
 *                     total_amount:
 *                       type: integer
 *                     shipping:
 *                       $ref: '#/components/schemas/ShippingBreakdown'
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: 配送參數不合法
 */
router.post('/shipping-quote', (req, res) => {
  const subtotal = calculateSubtotal(getCartItems(req.user.userId));
  const { shipping, error } = quoteShipping(subtotal, req.body);
  if (error) {
    return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', message: error });
  }

  res.json({
    data: {
      subtotal,
      shipping_fee: shipping.shippingFee,
      total_amount: subtotal + shipping.shippingFee,
      shipping
    },
    error: null,
    message: '成功'
  });
});

/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: 從購物車建立訂單
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientName, recipientEmail, recipientAddress]
 *             properties:
 *               recipientName:
 *                 type: string
 *               recipientEmail:
 *                 type: string
 *                 format: email
 *               recipientAddress:
 *                 type: string
 *               shippingMethod:
 *                 type: string
 *                 enum: [home_delivery, convenience_store]
 *                 default: home_delivery
 *                 description: 配送方式（宅配 120 元，商品小計滿 1,500 元免基本運費；超商取貨固定 60 元，不適用滿額免運）
 *               isRemoteArea:
 *                 type: boolean
 *                 default: false
 *                 description: 偏遠地區，加收 200 元
 *               isUrgent:
 *                 type: boolean
 *                 default: false
 *                 description: 當日急件，加收 250 元
 *     responses:
 *       201:
 *         description: 訂單建立成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     order_no:
 *                       type: string
 *                     subtotal:
 *                       type: integer
 *                       description: 商品小計
 *                     shipping_fee:
 *                       type: integer
 *                       description: 運費總計
 *                     total_amount:
 *                       type: integer
 *                       description: 訂單總額 = subtotal + shipping_fee
 *                     shipping:
 *                       $ref: '#/components/schemas/ShippingBreakdown'
 *                     status:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product_name:
 *                             type: string
 *                           product_price:
 *                             type: integer
 *                           quantity:
 *                             type: integer
 *                     created_at:
 *                       type: string
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: 購物車為空、庫存不足、收件資訊缺失或配送參數不合法
 */
router.post('/', (req, res) => {
  const { recipientName, recipientEmail, recipientAddress } = req.body;
  const userId = req.user.userId;

  if (!recipientName || !recipientEmail || !recipientAddress) {
    return res.status(400).json({
      data: null,
      error: 'VALIDATION_ERROR',
      message: '收件人姓名、Email 和地址為必填欄位'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    return res.status(400).json({
      data: null,
      error: 'VALIDATION_ERROR',
      message: 'Email 格式不正確'
    });
  }

  // Get cart items with product info
  const cartItems = getCartItems(userId);

  if (cartItems.length === 0) {
    return res.status(400).json({
      data: null,
      error: 'CART_EMPTY',
      message: '購物車為空'
    });
  }

  // Check stock
  const insufficientItems = cartItems.filter(item => item.quantity > item.product_stock);
  if (insufficientItems.length > 0) {
    const names = insufficientItems.map(i => i.product_name).join(', ');
    return res.status(400).json({
      data: null,
      error: 'STOCK_INSUFFICIENT',
      message: `以下商品庫存不足：${names}`
    });
  }

  // Calculate subtotal + shipping fee
  const subtotal = calculateSubtotal(cartItems);
  const { shipping, error: shippingError } = quoteShipping(subtotal, req.body);
  if (shippingError) {
    return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', message: shippingError });
  }
  const totalAmount = subtotal + shipping.shippingFee;

  const orderId = uuidv4();
  const orderNo = generateOrderNo();

  // Transaction: create order, order items, deduct stock, clear cart
  const createOrder = db.transaction(() => {
    db.prepare(
      `INSERT INTO orders (id, order_no, user_id, recipient_name, recipient_email, recipient_address,
                           subtotal, shipping_fee, shipping_method, is_remote_area, is_urgent, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      orderId, orderNo, userId, recipientName, recipientEmail, recipientAddress,
      subtotal, shipping.shippingFee, shipping.method,
      shipping.remoteAreaSurcharge > 0 ? 1 : 0, shipping.urgentSurcharge > 0 ? 1 : 0,
      totalAmount
    );

    const insertItem = db.prepare(
      `INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    for (const item of cartItems) {
      insertItem.run(uuidv4(), orderId, item.product_id, item.product_name, item.product_price, item.quantity);
      updateStock.run(item.quantity, item.product_id);
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
  });

  createOrder();

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db.prepare(
    'SELECT product_name, product_price, quantity FROM order_items WHERE order_id = ?'
  ).all(orderId);

  res.status(201).json({
    data: {
      id: order.id,
      order_no: order.order_no,
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      total_amount: order.total_amount,
      shipping,
      status: order.status,
      items: orderItems,
      created_at: order.created_at
    },
    error: null,
    message: '訂單建立成功'
  });
});

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: 自己的訂單列表
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           order_no:
 *                             type: string
 *                           total_amount:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 */
router.get('/', (req, res) => {
  const orders = db.prepare(
    'SELECT id, order_no, total_amount, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.userId);

  res.json({
    data: { orders },
    error: null,
    message: '成功'
  });
});

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     summary: 訂單詳情
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     order_no:
 *                       type: string
 *                     recipient_name:
 *                       type: string
 *                     recipient_email:
 *                       type: string
 *                     recipient_address:
 *                       type: string
 *                     subtotal:
 *                       type: integer
 *                     shipping_fee:
 *                       type: integer
 *                     shipping_method:
 *                       type: string
 *                       enum: [home_delivery, convenience_store]
 *                     is_remote_area:
 *                       type: integer
 *                       enum: [0, 1]
 *                     is_urgent:
 *                       type: integer
 *                       enum: [0, 1]
 *                     total_amount:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           product_id:
 *                             type: string
 *                           product_name:
 *                             type: string
 *                           product_price:
 *                             type: integer
 *                           quantity:
 *                             type: integer
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 *       404:
 *         description: 訂單不存在
 */
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);

  if (!order) {
    return res.status(404).json({ data: null, error: 'NOT_FOUND', message: '訂單不存在' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

  res.json({
    data: { ...order, items },
    error: null,
    message: '成功'
  });
});

/**
 * @openapi
 * /api/orders/{id}/pay:
 *   patch:
 *     summary: 模擬付款（更新訂單付款狀態）
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [success, fail]
 *     responses:
 *       200:
 *         description: 付款狀態更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     order_no:
 *                       type: string
 *                     total_amount:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product_name:
 *                             type: string
 *                           product_price:
 *                             type: integer
 *                           quantity:
 *                             type: integer
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: action 無效或訂單狀態不是 pending
 *       404:
 *         description: 訂單不存在
 */
router.patch('/:id/pay', (req, res) => {
  const { action } = req.body;
  const userId = req.user.userId;

  const actionMap = { success: 'paid', fail: 'failed' };
  if (!action || !actionMap[action]) {
    return res.status(400).json({
      data: null,
      error: 'VALIDATION_ERROR',
      message: 'action 必須為 success 或 fail'
    });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!order) {
    return res.status(404).json({ data: null, error: 'NOT_FOUND', message: '訂單不存在' });
  }

  if (order.status !== 'pending') {
    return res.status(400).json({
      data: null,
      error: 'INVALID_STATUS',
      message: '訂單狀態不是 pending，無法付款'
    });
  }

  const newStatus = actionMap[action];
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newStatus, order.id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

  res.json({
    data: { ...updated, items },
    error: null,
    message: action === 'success' ? '付款成功' : '付款失敗'
  });
});

module.exports = router;
