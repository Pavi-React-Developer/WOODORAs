const NodeCache = require('node-cache');

// Standard TTL 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

/**
 * Express middleware to cache responses.
 * Uses req.originalUrl as the cache key.
 */
const cacheMiddleware = (duration) => (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        return next();
    }

    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        res.setHeader('Content-Type', 'application/json');
        return res.send(cachedResponse);
    }

    // Override res.json to capture the response and save it to the cache
    const originalJson = res.json;
    res.json = (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                cache.set(key, JSON.stringify(body), duration || 300);
            } catch (err) {
                console.error("Cache serialization error:", err);
            }
        }
        return originalJson.call(res, body);
    };

    next();
};

/**
 * Clear specific cache keys or all cache manually
 */
const clearCache = (keyPattern) => {
    if (!keyPattern) {
        cache.flushAll();
        return;
    }
    
    // Simple exact key removal
    cache.del(keyPattern);
};

module.exports = {
    cacheMiddleware,
    clearCache,
    cache
};
