const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

const STAGING_HOST = 'payment-stage.ecpay.com.tw';
const PROD_HOST = 'payment.ecpay.com.tw';

function getHost() {
  return process.env.ECPAY_ENV === 'production' ? PROD_HOST : STAGING_HOST;
}

// Replicate PHP urlencode then apply ECPay .NET character replacements
function ecpayUrlEncode(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/~/g, '%7E')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .toLowerCase()
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')');
}

function generateCheckMacValue(params, hashKey, hashIV) {
  const { CheckMacValue: _cmv, ...rest } = params;

  const sorted = Object.keys(rest)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const queryStr = sorted.map(k => `${k}=${rest[k]}`).join('&');
  const raw = `HashKey=${hashKey}&${queryStr}&HashIV=${hashIV}`;

  const encoded = ecpayUrlEncode(raw);
  return crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
}

function formatTradeDate(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}/${p(date.getMonth() + 1)}/${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

function buildItemName(items) {
  const name = items
    .map(i => `${i.product_name} x${i.quantity}`)
    .join('#');
  return name.length > 400 ? name.slice(0, 400) : name;
}

function buildPaymentParams(order, items, baseUrl) {
  const merchantId = process.env.ECPAY_MERCHANT_ID;
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIV = process.env.ECPAY_HASH_IV;

  const params = {
    MerchantID: merchantId,
    MerchantTradeNo: order.merchant_trade_no,
    MerchantTradeDate: formatTradeDate(new Date()),
    PaymentType: 'aio',
    TotalAmount: order.total_amount,
    TradeDesc: '花卉電商訂單',
    ItemName: buildItemName(items),
    ReturnURL: `${baseUrl}/api/payments/ecpay/notify`,
    ClientBackURL: `${baseUrl}/orders/${order.id}?payment=return`,
    ChoosePayment: 'Credit',
    EncryptType: 1,
  };

  params.CheckMacValue = generateCheckMacValue(params, hashKey, hashIV);
  return params;
}

function httpsPost(host, path, body) {
  return new Promise((resolve, reject) => {
    const data = querystring.stringify(body);
    const options = {
      hostname: host,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => resolve(raw));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function queryTradeInfo(merchantTradeNo) {
  const merchantId = process.env.ECPAY_MERCHANT_ID;
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIV = process.env.ECPAY_HASH_IV;

  const params = {
    MerchantID: merchantId,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: Math.floor(Date.now() / 1000),
  };
  params.CheckMacValue = generateCheckMacValue(params, hashKey, hashIV);

  const raw = await httpsPost(getHost(), '/Cashier/QueryTradeInfo/V5', params);

  const parsed = new URLSearchParams(raw);
  return {
    tradeStatus: parsed.get('TradeStatus'),
    tradeNo: parsed.get('TradeNo'),
    paymentDate: parsed.get('PaymentDate'),
    paymentType: parsed.get('PaymentType'),
  };
}

module.exports = { generateCheckMacValue, buildPaymentParams, queryTradeInfo };
