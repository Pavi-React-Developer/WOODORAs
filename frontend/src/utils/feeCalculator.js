const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value) => String(value || '').toLowerCase().replace(/\s+/g, '');
const normalizeToken = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const normalizePaymentMethod = (value) => {
  if (!value) return '';
  const normalized = normalizeText(value);
  
  // Check for both/all first (matches "both", "all", "both(cod&cashfree)", etc.)
  if (normalized.includes('both') || normalized === 'all') return 'both';
  
  // Check for COD variants
  if (['cod', 'cashondelivery', 'cashdelivery'].includes(normalized)) return 'cod';
  
  // Check for CashFree variants
  if (['cashfree', 'cashfreegateway', 'online', 'onlinepayment', 'payonline'].includes(normalized)) return 'cashfree';
  
  return normalized;
};

export const normalizeFeeState = (state) => {
  if (!state) return '';
  return String(state).trim().toLowerCase() === 'tamil nadu' ? 'Tamil Nadu' : 'Other State';
};

export const calculateWeightInKg = (items = []) => items.reduce((total, item) => {
  const rawWeight = item.weight;
  let weight = parseFloat(rawWeight) || 0;

  if (
    typeof rawWeight === 'string' &&
    rawWeight.toLowerCase().includes('g') &&
    !rawWeight.toLowerCase().includes('kg')
  ) {
    weight /= 1000;
  }

  return total + (weight * (toNumber(item.qty) || 1));
}, 0);

const isStateMatch = (fee, feeState) => {
  const states = Array.isArray(fee.applicationState) ? fee.applicationState : [fee.applicationState];
  return states.some((state) => {
    const normalized = String(state || '').trim();
    return normalized === feeState || normalized.toLowerCase() === 'all';
  });
};

const isPaymentMatch = (fee, paymentMethod) => {
  // Extract payment method from fee (handle both new string format and old object format)
  let feePaymentValue = fee.paymentMethod;
  
  // Handle old format: paymentMethod is an object with name property
  if (typeof feePaymentValue === 'object' && feePaymentValue?.name) {
    feePaymentValue = feePaymentValue.name;
  }
  // Handle legacy format: paymentMethodName fallback
  else if (!feePaymentValue && fee.paymentMethodName) {
    feePaymentValue = fee.paymentMethodName;
  }
  
  const feePayment = normalizePaymentMethod(feePaymentValue);
  if (!feePayment || feePayment === 'both') return true;
  return feePayment === normalizePaymentMethod(paymentMethod);
};

const calculateFeeAmount = (fee, baseAmount, feeValue) => {
  const value = toNumber(feeValue);
  if (fee.feeType === 'Percentage') {
    return Math.round(toNumber(baseAmount) * (value / 100));
  }
  return value;
};

const calculateWeightCharge = (fee, subtotal, totalWeight) => {
  const slabs = Array.isArray(fee.weightSlabs)
    ? fee.weightSlabs
        .map((slab) => ({
          minWeight: toNumber(slab.minWeight),
          maxWeight: toNumber(slab.maxWeight),
          feeValue: toNumber(slab.charge ?? slab.feeValue),
          status: slab.status !== false,
        }))
        .filter((slab) => slab.status)
        .sort((a, b) => a.minWeight - b.minWeight)
    : [];

  if (!slabs.length) return 0;

  const matchedSlab = slabs.find((slab) => totalWeight >= slab.minWeight && totalWeight <= slab.maxWeight);
  if (matchedSlab) return calculateFeeAmount(fee, subtotal, matchedSlab.feeValue);

  // If weight does not match any slab directly (dynamic calculation)
  const highestSlab = slabs[slabs.length - 1];
  const lowestSlab = slabs[0];

  if (totalWeight > highestSlab.maxWeight) {
    // If exceeds maximum slab: Dynamically scale the charge (e.g., if max slab is 5kg for ₹200, charge ₹200 for every 5kg or part thereof)
    const factor = Math.ceil(totalWeight / (highestSlab.maxWeight || 1));
    return calculateFeeAmount(fee, subtotal, highestSlab.feeValue * factor);
  } else if (totalWeight < lowestSlab.minWeight) {
    // If below the minimum slab: apply the lowest slab's charge
    return calculateFeeAmount(fee, subtotal, lowestSlab.feeValue);
  } else {
    // If falls in a gap between two slabs: use the next highest slab
    const nextSlab = slabs.find((slab) => slab.minWeight >= totalWeight);
    if (nextSlab) return calculateFeeAmount(fee, subtotal, nextSlab.feeValue);
  }

  return 0;
};

export const calculateOrderFees = ({ fees = [], subtotal = 0, items = [], state = '', paymentMethod = '' }) => {
  const feeState = normalizeFeeState(state);
  const totalWeight = calculateWeightInKg(items);
  const result = {
    feeState,
    totalWeight,
    shippingCharge: 0,
    codAdvance: 0,
    extraFeesList: [],
    appliedFees: [],
  };

  if (!toNumber(subtotal) || !feeState) return result;

  const matchingFees = fees.filter((fee) => (
    fee.active !== false &&
    isStateMatch(fee, feeState) &&
    isPaymentMatch(fee, paymentMethod)
  ));

  const weightFee = matchingFees.find((fee) => {
    const name = normalizeToken(fee.feeCategory?.name);
    return name.includes('weight') && !name.includes('shipping');
  });

  if (weightFee) {
    const wCharge = calculateWeightCharge(weightFee, subtotal, totalWeight);
    if (wCharge > 0) {
      result.shippingCharge += wCharge;
      result.appliedFees.push({
        name: weightFee.feeName || 'Weight Charge',
        amount: wCharge,
        isWeightFee: true,
      });
    }
  }

  const shippingFee = matchingFees.find((fee) => (
    normalizeToken(fee.feeCategory?.name).includes('shipping')
  ));

  let isFreeShipping = false;
  if (shippingFee) {
    const minOrder = toNumber(shippingFee.minimumOrderAmount);
    if (minOrder > 0 && subtotal >= minOrder) {
      isFreeShipping = true;
      result.isFreeShipping = true;
      result.appliedFees.push({
        name: shippingFee.feeName || 'Shipping Charge',
        amount: 0,
        isFree: true,
      });
    } else {
      let sCharge = 0;
      if (shippingFee.weightSlabs && shippingFee.weightSlabs.length > 0) {
        sCharge = calculateWeightCharge(shippingFee, subtotal, totalWeight);
      } else {
        sCharge = calculateFeeAmount(shippingFee, subtotal, shippingFee.flatFeeValue);
      }

      if (sCharge > 0) {
        result.shippingCharge += sCharge;
        result.appliedFees.push({
          name: shippingFee.feeName || 'Shipping Charge',
          amount: sCharge,
          isShippingFee: true,
        });
      }
    }
  }

  matchingFees
    .filter((fee) => {
      const categoryToken = normalizeToken(fee.feeCategory?.name);
      const isWeight = categoryToken.includes('weight');
      const isShipping = categoryToken.includes('shipping');
      return !isWeight && !isShipping;
    })
    .forEach((fee) => {
      const charge = calculateFeeAmount(fee, subtotal, fee.flatFeeValue);
      if (charge <= 0) return;

      const feeName = String(fee.feeName || 'Fee');
      const categoryName = String(fee.feeCategory?.name || '');
      const isAdvance = `${feeName} ${categoryName}`.toLowerCase().includes('advance');

      if (isAdvance && normalizePaymentMethod(paymentMethod) === 'cod') {
        result.codAdvance += charge;
        // Do NOT push advance payment into appliedFees — it is a payment, not a charge.
        // It is tracked separately in codAdvance and shown in the Paid row.
      } else {
        const appliedFee = { name: feeName, amount: charge };
        result.extraFeesList.push(appliedFee);
        result.appliedFees.push(appliedFee);
      }
    });

  return result;
};
