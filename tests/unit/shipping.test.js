const { calculateShipping, ShippingError } = require('../../src/utils/shipping');

describe('Shipping module', () => {
  describe('基本運費', () => {
    it('宅配基本運費為 120 元', () => {
      const result = calculateShipping({ subtotal: 1000, method: 'home_delivery' });

      expect(result).toEqual({
        method: 'home_delivery',
        baseFee: 120,
        remoteAreaSurcharge: 0,
        urgentSurcharge: 0,
        shippingFee: 120,
        freeShippingApplied: false,
      });
    });

    it('未指定配送方式時預設為宅配', () => {
      const result = calculateShipping({ subtotal: 1000 });

      expect(result.method).toBe('home_delivery');
      expect(result.shippingFee).toBe(120);
    });

    it('超商取貨費用為 60 元', () => {
      const result = calculateShipping({ subtotal: 1000, method: 'convenience_store' });

      expect(result.baseFee).toBe(60);
      expect(result.shippingFee).toBe(60);
      expect(result.freeShippingApplied).toBe(false);
    });

    it('超商取貨非基本運費，滿 1,500 元仍收 60 元', () => {
      const result = calculateShipping({ subtotal: 2000, method: 'convenience_store' });

      expect(result.shippingFee).toBe(60);
      expect(result.freeShippingApplied).toBe(false);
    });
  });

  describe('滿額免運門檻', () => {
    it('商品小計 1,499 元：未達門檻，收宅配基本運費 120 元', () => {
      const result = calculateShipping({ subtotal: 1499, method: 'home_delivery' });

      expect(result.baseFee).toBe(120);
      expect(result.shippingFee).toBe(120);
      expect(result.freeShippingApplied).toBe(false);
    });

    it('商品小計 1,500 元：達門檻，免基本運費', () => {
      const result = calculateShipping({ subtotal: 1500, method: 'home_delivery' });

      expect(result.baseFee).toBe(0);
      expect(result.shippingFee).toBe(0);
      expect(result.freeShippingApplied).toBe(true);
    });
  });

  describe('附加費', () => {
    it('偏遠地區加收 200 元', () => {
      const result = calculateShipping({ subtotal: 1000, isRemoteArea: true });

      expect(result.remoteAreaSurcharge).toBe(200);
      expect(result.urgentSurcharge).toBe(0);
      expect(result.shippingFee).toBe(120 + 200);
    });

    it('當日急件加收 250 元', () => {
      const result = calculateShipping({ subtotal: 1000, isUrgent: true });

      expect(result.urgentSurcharge).toBe(250);
      expect(result.remoteAreaSurcharge).toBe(0);
      expect(result.shippingFee).toBe(120 + 250);
    });

    it('多項附加費同時成立：宅配 + 偏遠 + 急件', () => {
      const result = calculateShipping({ subtotal: 1000, isRemoteArea: true, isUrgent: true });

      expect(result.baseFee).toBe(120);
      expect(result.remoteAreaSurcharge).toBe(200);
      expect(result.urgentSurcharge).toBe(250);
      expect(result.shippingFee).toBe(570);
    });

    it('多項附加費同時成立：超商取貨 + 偏遠 + 急件', () => {
      const result = calculateShipping({
        subtotal: 1000,
        method: 'convenience_store',
        isRemoteArea: true,
        isUrgent: true,
      });

      expect(result.shippingFee).toBe(60 + 200 + 250);
    });

    it('滿額免運與附加費同時成立：只免基本運費，附加費照收', () => {
      const result = calculateShipping({ subtotal: 1500, isRemoteArea: true, isUrgent: true });

      expect(result.freeShippingApplied).toBe(true);
      expect(result.baseFee).toBe(0);
      expect(result.remoteAreaSurcharge).toBe(200);
      expect(result.urgentSurcharge).toBe(250);
      expect(result.shippingFee).toBe(450);
    });
  });

  describe('參數驗證', () => {
    it.each([-1, 1.5, '1000', null, undefined])('subtotal 為 %s 時拋出 ShippingError', (subtotal) => {
      expect(() => calculateShipping({ subtotal })).toThrow(ShippingError);
    });

    it('不支援的配送方式拋出 ShippingError', () => {
      expect(() => calculateShipping({ subtotal: 1000, method: 'drone' })).toThrow(ShippingError);
    });

    it('附加費旗標非布林值時拋出 ShippingError', () => {
      expect(() => calculateShipping({ subtotal: 1000, isRemoteArea: 'yes' })).toThrow(ShippingError);
      expect(() => calculateShipping({ subtotal: 1000, isUrgent: 1 })).toThrow(ShippingError);
    });
  });
});
