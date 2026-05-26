const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');
const { buildPaymentParams, queryTradeInfo } = require('../utils/ecpay');

const router = express.Router();

const ECPAY_CHECKOUT_URL = process.env.ECPAY_ENV === 'production'
  ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
  : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

/**
 * @openapi
 * /api/payments/ecpay/create-form:
 *   post:
 *     summary: 產生綠界 AIO 付款表單參數
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 回傳表單 action URL 與所有欄位參數
 *       400:
 *         description: 訂單狀態不符或缺少參數
 *       404:
 *         description: 訂單不存在
 */
router.post('/ecpay/create-form', authMiddleware, (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', message: '缺少 orderId' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    return res.status(404).json({ data: null, error: 'NOT_FOUND', message: '訂單不存在' });
  }
  if (order.user_id !== req.user.userId) {
    return res.status(403).json({ data: null, error: 'FORBIDDEN', message: '無權限存取此訂單' });
  }
  if (order.status !== 'pending') {
    return res.status(400).json({ data: null, error: 'INVALID_STATUS', message: '此訂單不可付款' });
  }

  const merchantTradeNo = `EC${Date.now().toString().slice(-10)}${uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  db.prepare('UPDATE orders SET merchant_trade_no = ? WHERE id = ?').run(merchantTradeNo, orderId);
  order.merchant_trade_no = merchantTradeNo;

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  const fields = buildPaymentParams(order, items, baseUrl);

  return res.json({
    data: { action: ECPAY_CHECKOUT_URL, fields },
    error: null,
    message: '成功'
  });
});

/**
 * @openapi
 * /api/payments/ecpay/query:
 *   post:
 *     summary: 向綠界查詢付款結果並更新訂單狀態
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 付款狀態查詢結果
 *       400:
 *         description: 尚未建立付款，無 merchant_trade_no
 *       404:
 *         description: 訂單不存在
 */
router.post('/ecpay/query', authMiddleware, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', message: '缺少 orderId' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    return res.status(404).json({ data: null, error: 'NOT_FOUND', message: '訂單不存在' });
  }
  if (order.user_id !== req.user.userId) {
    return res.status(403).json({ data: null, error: 'FORBIDDEN', message: '無權限存取此訂單' });
  }
  if (!order.merchant_trade_no) {
    return res.status(400).json({ data: null, error: 'PAYMENT_NOT_INITIATED', message: '尚未建立付款' });
  }

  try {
    const result = await queryTradeInfo(order.merchant_trade_no);

    if (result.tradeStatus === '1') {
      const paidAt = result.paymentDate || new Date().toISOString();
      db.prepare('UPDATE orders SET status = ?, paid_at = ? WHERE id = ?')
        .run('paid', paidAt, orderId);
    }

    return res.json({
      data: {
        status: result.tradeStatus === '1' ? 'paid' : 'pending',
        paymentType: result.paymentType,
        paymentDate: result.paymentDate,
      },
      error: null,
      message: '查詢成功'
    });
  } catch (err) {
    return res.status(500).json({ data: null, error: 'ECPAY_ERROR', message: '查詢綠界付款狀態失敗' });
  }
});

/**
 * ECPay ReturnURL 接收端（Server Notify）
 * 本地開發無法接收，固定回應 1|OK 避免 ECPay 重試
 */
router.post('/ecpay/notify', (req, res) => {
  res.type('text/plain').send('1|OK');
});

module.exports = router;
