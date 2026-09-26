const express = require('express');
const router = express.Router();
const {
  HOME_DELIVERY_BASE_FEE,
  CONVENIENCE_STORE_FEE,
  FREE_SHIPPING_THRESHOLD,
  REMOTE_AREA_SURCHARGE,
  URGENT_SURCHARGE
} = require('../utils/shipping');

// 頁面顯示用的運費規則，單一來源為 src/utils/shipping.js（避免前端寫死金額）
const shippingRules = {
  homeDeliveryFee: HOME_DELIVERY_BASE_FEE,
  convenienceStoreFee: CONVENIENCE_STORE_FEE,
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  remoteAreaSurcharge: REMOTE_AREA_SURCHARGE,
  urgentSurcharge: URGENT_SURCHARGE
};

// Helper to render with front layout
function renderFront(res, page, locals = {}) {
  res.render('pages/' + page, { layout: 'front', ...locals }, function (err, body) {
    if (err) return res.status(500).send(err.message);
    res.render('layouts/front', { body, ...locals });
  });
}

// Helper to render with admin layout
function renderAdmin(res, page, locals = {}) {
  res.render('pages/admin/' + page, locals, function (err, body) {
    if (err) return res.status(500).send(err.message);
    res.render('layouts/admin', { body, ...locals });
  });
}

// Front pages
router.get('/', function (req, res) {
  renderFront(res, 'index', { title: '首頁', pageScript: 'index', fullWidth: true });
});

router.get('/products/:id', function (req, res) {
  renderFront(res, 'product-detail', {
    title: '商品詳情',
    pageScript: 'product-detail',
    productId: req.params.id,
    shippingRules
  });
});

router.get('/cart', function (req, res) {
  renderFront(res, 'cart', { title: '購物車', pageScript: 'cart', shippingRules });
});

router.get('/checkout', function (req, res) {
  renderFront(res, 'checkout', { title: '結帳', pageScript: 'checkout', shippingRules });
});

router.get('/login', function (req, res) {
  renderFront(res, 'login', { title: '登入', pageScript: 'login' });
});

router.get('/orders', function (req, res) {
  renderFront(res, 'orders', { title: '我的訂單', pageScript: 'orders' });
});

router.get('/orders/:id', function (req, res) {
  renderFront(res, 'order-detail', {
    title: '訂單詳情',
    pageScript: 'order-detail',
    orderId: req.params.id,
    paymentResult: req.query.payment || ''
  });
});

// Admin pages
router.get('/admin/products', function (req, res) {
  renderAdmin(res, 'products', {
    title: '商品管理',
    pageScript: 'admin-products',
    currentPath: '/admin/products'
  });
});

router.get('/admin/orders', function (req, res) {
  renderAdmin(res, 'orders', {
    title: '訂單管理',
    pageScript: 'admin-orders',
    currentPath: '/admin/orders'
  });
});

module.exports = router;
