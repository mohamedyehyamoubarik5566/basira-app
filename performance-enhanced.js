// Enhanced Performance Optimization Module with Security
class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.debounceTimers = new Map();
        this.observers = new Map();
        this.lazyLoadQueue = [];
        this.performanceMetrics = new Map();
        this.resourceLoadTimes = new Map();
        this.initializeOptimizations();
    }

    initializeOptimizations() {
        this.setupLazyLoading();
        this.setupVirtualScrolling();
        this.setupImageOptimization();
        this.setupMemoryManagement();
        this.setupNetworkOptimization();
        this.setupPerformanceMonitoring();
    }

    // Enhanced Debounce Function with Memory Management
    debounce(func, delay, key) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }

        const timer = setTimeout(() => {
            try {
                func();
            } catch (error) {
                console.error(`Debounced function error for key ${key}:`, error);
            } finally {
                this.debounceTimers.delete(key);
            }
        }, delay);

        this.debounceTimers.set(key, timer);
        
        // Cleanup old timers
        if (this.debounceTimers.size > 100) {
            this.cleanupTimers();
        }
    }

    // Enhanced Throttle Function
    throttle(func, limit, key) {
        if (this.cache.has(key)) {
            return;
        }

        this.cache.set(key, true);
        
        const startTime = performance.now();
        
        setTimeout(() => {
            try {
                func();
            } catch (error) {
                console.error(`Throttled function error for key ${key}:`, error);
            } finally {
                this.cache.delete(key);
                
                // Record performance metric
                const endTime = performance.now();
                this.recordMetric(key, endTime - startTime);
            }
        }, limit);
    }

    // Enhanced Memoization with TTL and Size Limits
    memoize(func, keyGenerator, ttl = 300000) { // 5 minutes default TTL
        return (...args) => {
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
            const cacheKey = `memo_${key}`;
            
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < ttl) {
                return cached.value;
            }

            const startTime = performance.now();
            const result = func(...args);
            const endTime = performance.now();
            
            // Store with timestamp
            this.cache.set(cacheKey, {
                value: result,
                timestamp: Date.now(),
                executionTime: endTime - startTime
            });
            
            // Limit cache size and cleanup old entries
            if (this.cache.size > 200) {
                this.cleanupCache();
            }

            return result;
        };
    }

    // Enhanced Lazy Loading with Error Handling
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImageSafely(img);
                        lazyImageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });

            this.observers.set('lazyImages', lazyImageObserver);
            this.detectLazyImages();
        }
    }

    loadImageSafely(img) {
        const startTime = performance.now();
        
        img.addEventListener('load', () => {
            const loadTime = performance.now() - startTime;
            this.recordMetric('image_load', loadTime);
            img.classList.remove('lazy');
            img.classList.add('loaded');
        });
        
        img.addEventListener('error', () => {
            console.warn('Failed to load image:', img.dataset.src);
            img.classList.add('error');
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
        });
        
        if (img.dataset.src) {
            img.src = img.dataset.src;
        }
    }

    detectLazyImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        const observer = this.observers.get('lazyImages');
        
        if (observer) {
            lazyImages.forEach(img => {
                img.classList.add('lazy');
                observer.observe(img);
            });
        }
    }

    // Enhanced Virtual Scrolling
    setupVirtualScrolling() {
        this.virtualScrollConfig = {
            itemHeight: 60,
            containerHeight: 400,
            buffer: 10,
            overscan: 5
        };
    }

    createVirtualList(container, items, renderItem, options = {}) {
        const config = { ...this.virtualScrollConfig, ...options };
        const { itemHeight, containerHeight, buffer, overscan } = config;
        
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const totalHeight = items.length * itemHeight;

        let scrollTop = 0;
        let startIndex = 0;
        let endIndex = Math.min(visibleCount + buffer, items.length);

        const viewport = document.createElement('div');
        viewport.style.cssText = `
            height: ${containerHeight}px;
            overflow: auto;
            position: relative;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            height: ${totalHeight}px;
            position: relative;
        `;

        const renderVisible = this.debounce(() => {
            const fragment = document.createDocumentFragment();
            
            content.innerHTML = '';
            
            const actualStart = Math.max(0, startIndex - overscan);
            const actualEnd = Math.min(items.length, endIndex + overscan);
            
            for (let i = actualStart; i < actualEnd; i++) {
                try {
                    const item = renderItem(items[i], i);
                    if (item) {
                        item.style.cssText = `
                            position: absolute;
                            top: ${i * itemHeight}px;
                            height: ${itemHeight}px;
                            width: 100%;
                            box-sizing: border-box;
                        `;
                        fragment.appendChild(item);
                    }
                } catch (error) {
                    console.error(`Error rendering item ${i}:`, error);
                }
            }
            
            content.appendChild(fragment);
        }, 16, 'virtualScroll');

        viewport.addEventListener('scroll', this.throttle(() => {
            scrollTop = viewport.scrollTop;
            startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
            endIndex = Math.min(items.length, startIndex + visibleCount + buffer * 2);
            renderVisible();
        }, 16, 'virtualScrollThrottle'));

        viewport.appendChild(content);
        container.appendChild(viewport);
        renderVisible();

        return {
            update: (newItems) => {
                items = newItems;
                content.style.height = `${newItems.length * itemHeight}px`;
                renderVisible();
            },
            scrollToIndex: (index) => {
                viewport.scrollTop = index * itemHeight;
            },
            destroy: () => {
                viewport.remove();
                this.debounceTimers.delete('virtualScroll');
                this.cache.delete('virtualScrollThrottle');
            }
        };
    }

    // Enhanced Image Optimization
    setupImageOptimization() {
        this.imageOptimizer = {
            compress: (file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) => {
                return new Promise((resolve, reject) => {
                    if (!file || !file.type.startsWith('image/')) {
                        reject(new Error('Invalid file type'));
                        return;
                    }

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();

                    img.onload = () => {
                        try {
                            let { width, height } = img;
                            const ratio = Math.min(maxWidth / width, maxHeight / height);
                            
                            if (ratio < 1) {
                                width *= ratio;
                                height *= ratio;
                            }

                            canvas.width = width;
                            canvas.height = height;
                            
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            canvas.toBlob(resolve, 'image/jpeg', quality);
                        } catch (error) {
                            reject(error);
                        }
                    };

                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = URL.createObjectURL(file);
                });
            }
        };
    }

    // Enhanced Memory Management
    setupMemoryManagement() {
        setInterval(() => {
            this.checkMemoryUsage();
        }, 30000);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.performMemoryCleanup();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.performMemoryCleanup();
        });
    }

    checkMemoryUsage() {
        if (performance.memory) {
            const memInfo = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };

            const usagePercentage = (memInfo.used / memInfo.limit) * 100;
            
            if (usagePercentage > 80) {
                console.warn('High memory usage detected:', usagePercentage.toFixed(2) + '%');
                this.performMemoryCleanup();
            }

            this.recordMetric('memory_usage', usagePercentage);
        }
    }

    performMemoryCleanup() {
        try {
            this.cleanupCache();
            this.cleanupTimers();
            this.cleanupMetrics();
            
            if (window.gc) {
                window.gc();
            }
            
            console.log('Memory cleanup completed');
        } catch (error) {
            console.error('Memory cleanup error:', error);
        }
    }

    cleanupCache() {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000;
        
        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp && (now - value.timestamp) > maxAge) {
                this.cache.delete(key);
            }
        }
        
        if (this.cache.size > 100) {
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
            
            this.cache.clear();
            entries.slice(0, 100).forEach(([key, value]) => {
                this.cache.set(key, value);
            });
        }
    }

    cleanupTimers() {
        for (const [key, timer] of this.debounceTimers.entries()) {
            if (!timer) {
                this.debounceTimers.delete(key);
            }
        }
    }

    cleanupMetrics() {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000;
        
        for (const [key, metrics] of this.performanceMetrics.entries()) {
            const filteredMetrics = metrics.filter(metric => 
                (now - metric.timestamp) < maxAge
            );
            
            if (filteredMetrics.length === 0) {
                this.performanceMetrics.delete(key);
            } else {
                this.performanceMetrics.set(key, filteredMetrics);
            }
        }
    }

    // Enhanced Network Optimization
    setupNetworkOptimization() {
        this.requestQueue = [];
        this.activeRequests = 0;
        this.maxConcurrentRequests = navigator.hardwareConcurrency || 4;
        this.requestCache = new Map();
    }

    queueRequest(requestFn, cacheKey = null, cacheTTL = 300000) {
        return new Promise((resolve, reject) => {
            if (cacheKey && this.requestCache.has(cacheKey)) {
                const cached = this.requestCache.get(cacheKey);
                if (Date.now() - cached.timestamp < cacheTTL) {
                    resolve(cached.data);
                    return;
                }
            }

            this.requestQueue.push({ 
                requestFn, 
                resolve, 
                reject, 
                cacheKey,
                timestamp: Date.now()
            });
            
            this.processQueue();
        });
    }

    processQueue() {
        if (this.activeRequests >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
            return;
        }

        const { requestFn, resolve, reject, cacheKey } = this.requestQueue.shift();
        this.activeRequests++;

        const startTime = performance.now();

        requestFn()
            .then(result => {
                if (cacheKey) {
                    this.requestCache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                }
                
                const endTime = performance.now();
                this.recordMetric('network_request', endTime - startTime);
                
                resolve(result);
            })
            .catch(reject)
            .finally(() => {
                this.activeRequests--;
                this.processQueue();
            });
    }

    // Performance Monitoring
    setupPerformanceMonitoring() {
        this.observeWebVitals();
        this.observeResourceTiming();
        this.observeLongTasks();
    }

    observeWebVitals() {
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.recordMetric('lcp', lastEntry.startTime);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.set('lcp', lcpObserver);
            } catch (e) {
                console.warn('LCP observation not supported');
            }

            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.recordMetric('fid', entry.processingStart - entry.startTime);
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
                this.observers.set('fid', fidObserver);
            } catch (e) {
                console.warn('FID observation not supported');
            }

            try {
                const clsObserver = new PerformanceObserver((list) => {
                    let clsValue = 0;
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                    this.recordMetric('cls', clsValue);
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.set('cls', clsObserver);
            } catch (e) {
                console.warn('CLS observation not supported');
            }
        }
    }

    observeResourceTiming() {
        if ('PerformanceObserver' in window) {
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.recordResourceTiming(entry);
                    });
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.set('resource', resourceObserver);
            } catch (e) {
                console.warn('Resource timing observation not supported');
            }
        }
    }

    observeLongTasks() {
        if ('PerformanceObserver' in window) {
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.recordMetric('long_task', entry.duration);
                        if (entry.duration > 100) {
                            console.warn('Long task detected:', entry.duration + 'ms');
                        }
                    });
                });
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.set('longtask', longTaskObserver);
            } catch (e) {
                console.warn('Long task observation not supported');
            }
        }
    }

    recordResourceTiming(entry) {
        const timing = {
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize || 0,
            type: this.getResourceType(entry.name),
            timestamp: Date.now()
        };
        
        if (!this.resourceLoadTimes.has(timing.type)) {
            this.resourceLoadTimes.set(timing.type, []);
        }
        
        this.resourceLoadTimes.get(timing.type).push(timing);
        
        const maxEntries = 100;
        const entries = this.resourceLoadTimes.get(timing.type);
        if (entries.length > maxEntries) {
            entries.splice(0, entries.length - maxEntries);
        }
    }

    getResourceType(url) {
        if (url.match(/\.(css)$/i)) return 'css';
        if (url.match(/\.(js)$/i)) return 'js';
        if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) return 'image';
        if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'font';
        return 'other';
    }

    recordMetric(name, value) {
        if (!this.performanceMetrics.has(name)) {
            this.performanceMetrics.set(name, []);
        }
        
        this.performanceMetrics.get(name).push({
            value: value,
            timestamp: Date.now()
        });
        
        const maxMetrics = 1000;
        const metrics = this.performanceMetrics.get(name);
        if (metrics.length > maxMetrics) {
            metrics.splice(0, metrics.length - maxMetrics);
        }
    }

    // Performance Report Generation
    getPerformanceReport() {
        const report = {
            timestamp: Date.now(),
            metrics: {},
            resourceTiming: {},
            recommendations: []
        };

        for (const [name, metrics] of this.performanceMetrics.entries()) {
            if (metrics.length > 0) {
                const values = metrics.map(m => m.value);
                report.metrics[name] = {
                    count: values.length,
                    average: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    latest: values[values.length - 1]
                };
            }
        }

        for (const [type, timings] of this.resourceLoadTimes.entries()) {
            if (timings.length > 0) {
                const durations = timings.map(t => t.duration);
                const sizes = timings.map(t => t.size);
                
                report.resourceTiming[type] = {
                    count: timings.length,
                    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
                    totalSize: sizes.reduce((a, b) => a + b, 0),
                    averageSize: sizes.reduce((a, b) => a + b, 0) / sizes.length
                };
            }
        }

        report.recommendations = this.generateRecommendations(report);
        return report;
    }

    generateRecommendations(report) {
        const recommendations = [];

        if (report.metrics.lcp && report.metrics.lcp.latest > 2500) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Largest Contentful Paint is slow. Consider optimizing images and critical resources.',
                metric: 'lcp',
                value: report.metrics.lcp.latest
            });
        }

        if (report.metrics.fid && report.metrics.fid.average > 100) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'First Input Delay is high. Consider reducing JavaScript execution time.',
                metric: 'fid',
                value: report.metrics.fid.average
            });
        }

        if (report.metrics.cls && report.metrics.cls.latest > 0.1) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Cumulative Layout Shift is high. Ensure images and ads have dimensions.',
                metric: 'cls',
                value: report.metrics.cls.latest
            });
        }

        if (report.metrics.memory_usage && report.metrics.memory_usage.latest > 70) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: 'High memory usage detected. Consider implementing memory cleanup.',
                metric: 'memory_usage',
                value: report.metrics.memory_usage.latest
            });
        }

        return recommendations;
    }

    // Cleanup and Destroy
    destroy() {
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();

        for (const observer of this.observers.values()) {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        }
        this.observers.clear();

        this.cache.clear();
        this.performanceMetrics.clear();
        this.resourceLoadTimes.clear();
        this.requestCache.clear();

        console.log('PerformanceOptimizer destroyed');
    }
}

// Initialize Performance Optimizer
const performanceOptimizer = new PerformanceOptimizer();

// Export for global use
window.PerformanceOptimizer = PerformanceOptimizer;
window.performanceOptimizer = performanceOptimizer;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    performanceOptimizer.destroy();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
}