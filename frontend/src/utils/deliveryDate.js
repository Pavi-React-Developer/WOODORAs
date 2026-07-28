// A delivery date is a calendar day, not a moment in a time zone.
export const getDeliveryDate = (order) => order?.deliveryDate ?? order?.scheduledDeliveryDate ?? null;

export const formatDeliveryDate = (value) => {
  if (!value) return 'N/A';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(date);
};
