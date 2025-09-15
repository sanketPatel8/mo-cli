const processedOrders = new Set();

export function isDuplicateOrder(orderId, ttlMs = 2 * 60 * 1000) {
  if (!orderId) return false;

  if (processedOrders.has(orderId)) {
    return true; // duplicate found
  }

  processedOrders.add(orderId);

  // Auto-remove after TTL (free memory)
  setTimeout(() => processedOrders.delete(orderId), ttlMs);

  return false;
}
