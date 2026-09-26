/**
 * Shipping 運費計算模組
 *
 * 規則：
 * - 宅配（home_delivery）基本運費 120 元；商品小計滿 1,500 元免基本運費
 * - 超商取貨（convenience_store）固定 60 元，非基本運費，不適用滿額免運
 * - 偏遠地區加收 200 元、當日急件加收 250 元（附加費不因滿額而減免）
 *
 * 純函式、不依賴 DB，可獨立進行單元測試。
 */

const SHIPPING_METHODS = {
  HOME_DELIVERY: 'home_delivery',
  CONVENIENCE_STORE: 'convenience_store'
};

const HOME_DELIVERY_BASE_FEE = 120;
const CONVENIENCE_STORE_FEE = 60;
const FREE_SHIPPING_THRESHOLD = 1500;
const REMOTE_AREA_SURCHARGE = 200;
const URGENT_SURCHARGE = 250;

class ShippingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ShippingError';
  }
}

/**
 * 計算運費
 * @param {object} params
 * @param {number} params.subtotal - 商品小計（非負整數）
 * @param {string} [params.method='home_delivery'] - 配送方式
 * @param {boolean} [params.isRemoteArea=false] - 是否為偏遠地區
 * @param {boolean} [params.isUrgent=false] - 是否為當日急件
 * @returns {{ method: string, baseFee: number, remoteAreaSurcharge: number, urgentSurcharge: number,
 *             shippingFee: number, freeShippingApplied: boolean }}
 * @throws {ShippingError} 參數不合法時
 */
function calculateShipping({
  subtotal,
  method = SHIPPING_METHODS.HOME_DELIVERY,
  isRemoteArea = false,
  isUrgent = false
} = {}) {
  if (!Number.isInteger(subtotal) || subtotal < 0) {
    throw new ShippingError('商品小計必須為非負整數');
  }
  if (!Object.values(SHIPPING_METHODS).includes(method)) {
    throw new ShippingError(
      `配送方式必須為 ${Object.values(SHIPPING_METHODS).join(' 或 ')}`
    );
  }
  if (typeof isRemoteArea !== 'boolean' || typeof isUrgent !== 'boolean') {
    throw new ShippingError('isRemoteArea 與 isUrgent 必須為布林值');
  }

  let baseFee;
  let freeShippingApplied = false;
  if (method === SHIPPING_METHODS.HOME_DELIVERY) {
    freeShippingApplied = subtotal >= FREE_SHIPPING_THRESHOLD;
    baseFee = freeShippingApplied ? 0 : HOME_DELIVERY_BASE_FEE;
  } else {
    baseFee = CONVENIENCE_STORE_FEE;
  }

  const remoteAreaSurcharge = isRemoteArea ? REMOTE_AREA_SURCHARGE : 0;
  const urgentSurcharge = isUrgent ? URGENT_SURCHARGE : 0;

  return {
    method,
    baseFee,
    remoteAreaSurcharge,
    urgentSurcharge,
    shippingFee: baseFee + remoteAreaSurcharge + urgentSurcharge,
    freeShippingApplied
  };
}

module.exports = {
  calculateShipping,
  ShippingError,
  SHIPPING_METHODS,
  HOME_DELIVERY_BASE_FEE,
  CONVENIENCE_STORE_FEE,
  FREE_SHIPPING_THRESHOLD,
  REMOTE_AREA_SURCHARGE,
  URGENT_SURCHARGE
};
