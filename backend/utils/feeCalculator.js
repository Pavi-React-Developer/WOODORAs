const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value) => String(value || '').toLowerCase().replace(/\s+/g, '');
const normalizeToken = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizePaymentMethod = (value) => {
  const normalized = normalizeText(value);
  if (['cod', 'cashondelivery', 'cashdelivery'].includes(normalized)) return 'cod';
  if (['cashfree', 'cashfreegateway', 'online', 'onlinepayment', 'payonline'].includes(normalized)) return 'cashfree';
  if (['both', 'all'].includes(normalized)) return 'both';
  return normalized;
};

// Fix #9: Normalize state name to title case for consistent matching.
// Previously only Tamil Nadu was recognized — all other states collapsed to
// 'Other State', silently dropping any fee configured for them.
const normalizeFeeState = (state) => {
  if (!state) return '';
  const trimmed = String(state).trim();
  if (!trimmed) return '';
  // Title-case each word so 'KARNATAKA', 'karnataka', 'Karnataka' all match
  return trimmed
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

// Fix #18: Guard against null/undefined items in the array
const calculateWeightInKg = (items = []) => (Array.isArray(items) ? items : []).reduce((total, item) => {
  if (!item) return total;
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
    // 'all' or 'All' means the fee applies to all states
    if (!normalized || normalized.toLowerCase() === 'all') return true;
    // Compare title-cased state names for consistency
    const normFeeState = normalized.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return normFeeState === feeState;
  });
};

const isPaymentMatch = (fee, paymentMethod) => {
  const feePayment = normalizePaymentMethod(fee.paymentMethod?.name || fee.paymentMethodName);
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

const calculateOrderFees = ({ fees = [], globalFee = null, subtotal = 0, items = [], state = '', paymentMethod = '' }) => {
  const feeState = normalizeFeeState(state);
  const totalWeight = calculateWeightInKg(items);
  const result = {
    feeState,
    totalWeight,
    shippingCharge: 0,
    codAdvance: 0,
    extraFeesList: [],
    appliedFees: [],
    productFee: 0,
    giftFee: 0,
  };

  if (!toNumber(subtotal) || !feeState) return result;

  const matchingFees = fees.filter((fee) => (
    fee.active !== false &&
    isStateMatch(fee, feeState) &&
    isPaymentMatch(fee, paymentMethod)
  ));

  const weightFee = matchingFees.find((fee) => (
    normalizeToken(fee.feeCategory?.name).includes('weight')
  ));

  if (weightFee) {
    result.shippingCharge = calculateWeightCharge(weightFee, subtotal, totalWeight);
    if (result.shippingCharge > 0) {
      result.appliedFees.push({
        name: weightFee.feeName || 'Weight Charge',
        amount: result.shippingCharge,
        isWeightFee: true,
      });
    }
  }

  matchingFees
    .filter((fee) => !normalizeToken(fee.feeCategory?.name).includes('weight'))
    .forEach((fee) => {
      const charge = calculateFeeAmount(fee, subtotal, fee.flatFeeValue);
      if (charge <= 0) return;

      const feeName = String(fee.feeName || 'Fee');
      const categoryName = String(fee.feeCategory?.name || '');
      const isAdvance = `${feeName} ${categoryName}`.toLowerCase().includes('advance');

      if (isAdvance && normalizePaymentMethod(paymentMethod) === 'cod') {
        result.codAdvance += charge;
        result.appliedFees.push({ name: feeName, amount: charge });
      } else {
        const appliedFee = { name: feeName, amount: charge };
        result.extraFeesList.push(appliedFee);
        result.appliedFees.push(appliedFee);
      }
    });

  // Calculate Global Fees (Product Fee and Gift Fee)
  if (globalFee && globalFee.isActive) {
    // Product Fee is added ONE TIME if the cart has items
    if (items.length > 0 && globalFee.productFee > 0) {
      result.productFee = globalFee.productFee;
      const productFeeItem = { name: 'Product Fee', amount: globalFee.productFee };
      result.extraFeesList.push(productFeeItem);
      result.appliedFees.push(productFeeItem);
    }
    
    // Gift Fee is added ONE TIME if toggle is ON and cart has gift item
    const hasGift = items.some(item => item.isGift && item.isGiftWrapper);
    if (hasGift && globalFee.giftFee > 0) {
      result.giftFee = globalFee.giftFee;
      const giftFeeItem = { name: 'Gift Fee', amount: globalFee.giftFee };
      result.extraFeesList.push(giftFeeItem);
      result.appliedFees.push(giftFeeItem);
    }
  }

  return result;
};

module.exports = { calculateOrderFees, calculateWeightInKg, normalizeFeeState, normalizePaymentMethod };
