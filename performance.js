// Performance Optimization Module
class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.debounceTimers = new Map();
        this.observers = new Map();
        this.lazyLoadQueue = [];
        this.initializeOptimizations();
    }

    initializeOptimizations() {
        this.setupLazyLoading();
        this.setupVirtualScrolling();
        this.setupImageOptimization();
        this.setupMemoryManagement();
        this.setupNetworkOptimization();
    }

    // Debounce Function
    debounce(func, delay, key) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }

        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);

        this.debounceTimers.set(key, timer);
    }

    // Throttle Function
    throttle(func, limit, key) {
        if (this.cache.has(key)) {
            return;
        }

        this.cache.set(key, true);
        setTimeout(() => {
            func();
            this.cache.delete(key);
        }, limit);
    }

    // Memoization
    memoize(func, keyGenerator) {
        return (...args) => {
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
            
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }

            const result = func(...args);
            this.cache.set(key, result);
            
            // Limit cache size
            if (this.cache.size > 100) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            return result;
        };
    }

    // Lazy Loading Setup
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        lazyImageObserver.unobserve(img);
                    }
                });
            });

            this.observers.set('lazyImages', lazyImageObserver);
        }
    }

    // Virtual Scrolling for Large Lists
    setupVirtualScrolling() {
        this.virtualScrollConfig = {
            itemHeight: 60,
            containerHeight: 400,
            buffer: 5
        };
    }

    createVirtualList(container, items, renderItem) {
        const { itemHeight, containerHeight, buffer } = this.virtualScrollConfig;
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const totalHeight = items.length * itemHeight;

        let scrollTop = 0;
        let startIndex = 0;
        let endIndex = Math.min(visibleCount + buffer, items.length);

        const viewport = document.createElement('div');
        viewport.style.height = `${containerHeight}px`;
        viewport.style.overflow = 'auto';

        const content = document.createElement('div');
        content.style.height = `${totalHeight}px`;
        content.style.position = 'relative';

        const renderVisible = () => {
            content.innerHTML = '';
            
            for (let i = startIndex; i < endIndex; i++) {
                const item = renderItem(items[i], i);
                item.style.position = 'absolute';
                item.style.top = `${i * itemHeight}px`;
                item.style.height = `${itemHeight}px`;
                content.appendChild(item);
            }
        };

        viewport.addEventListener('scroll', this.throttle(() => {
            scrollTop = viewport.scrollTop;
            startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
            endIndex = Math.min(items.length, startIndex + visibleCount + buffer * 2);
            renderVisible();
        }, 16, 'virtualScroll'));

        viewport.appendChild(content);
        container.appendChild(viewport);
        renderVisible();

        return {
            update: (newItems) => {
                items = newItems;
                content.style.height = `${newItems.length * itemHeight}px`;
                renderVisible();
            }
        };
    }

    // Image Optimization
    setupImageOptimization() {
        this.imageOptimizer = {
            compress: (file, quality = 0.8) => {
                return new Promise((resolve) => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();

                    img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob(resolve, 'image/jpeg', quality);
                    };

                    img.src = URL.createObjectURL(file);
                });
            },

            resize: (file, maxWidth, maxHeight) => {
                return new Promise((resolve) => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();

                    img.onload = () => {
                        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                        canvas.width = img.width * ratio;
                        canvas.height = img.height * ratio;
                        
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob(resolve, 'image/jpeg', 0.9);
                    };

                    img.src = URL.createObjectURL(file);
                });
            }
        };
    }

    // Memory Management
    setupMemoryManagement() {
        // Clean up unused data periodically
        setInterval(() => {
            this.cleanupMemory();
        }, 5 * 60 * 1000); // Every 5 minutes

        // Monitor memory usage
        if (performance.memory) {
            setInterval(() => {
                const memInfo = PerformanceMonitor.getMemoryUsage();
                if (memInfo && memInfo.used > memInfo.limit * 0.8) {
                    console.warn('High memory usage detected, cleaning up...');
                    this.cleanupMemory();
                }
            }, 30000); // Every 30 seconds
        }
    }

    cleanupMemory() {
        // Clear old cache entries
        if (this.cache.size > 50) {
            const keysToDelete = Array.from(this.cache.keys()).slice(0, 25);
            keysToDelete.forEach(key => this.cache.delete(key));
        }

        // Clear old localStorage entries
        this.cleanupLocalStorage();

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    cleanupLocalStorage() {
        try {
            const keys = Object.keys(localStorage);
            const now = Date.now();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

            keys.forEach(key => {
                if (key.startsWith('basira_temp_')) {
                    const item = localStorage.getItem(key);
                    try {
                        const data = JSON.parse(item);
                        if (data.timestamp && (now - data.timestamp) > maxAge) {
                            localStorage.removeItem(key);
                        }
                    } catch (e) {
                        // Remove invalid entries
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (error) {
            console.error('Error cleaning localStorage:', error);
        }
    }

    // Network Optimization
    setupNetworkOptimization() {
        this.requestQueue = [];
        this.activeRequests = 0;
        this.maxConcurrentRequests = 6;
    }

    queueRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    processQueue() {
        if (this.activeRequests >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
            return;
        }

        const { requestFn, resolve, reject } = this.requestQueue.shift();
        this.activeRequests++;

        requestFn()
            .then(resolve)
            .catch(reject)
            .finally(() => {
                this.activeRequests--;
                this.processQueue();
            });
    }

    // Batch Operations
    batchOperation(items, operation, batchSize = 100) {
        return new Promise((resolve) => {
            const results = [];
            let index = 0;

            const processBatch = () => {
                const batch = items.slice(index, index + batchSize);
                
                batch.forEach(item => {
                    results.push(operation(item));
                });

                index += batchSize;

                if (index < items.length) {
                    // Use requestAnimationFrame for non-blocking processing
                    requestAnimationFrame(processBatch);
                } else {
                    resolve(results);
                }
            };

            processBatch();
        });
    }

    // DOM Optimization
    optimizeDOM() {
        // Remove unused elements
        const unusedElements = document.querySelectorAll('[data-unused="true"]');
        unusedElements.forEach(el => el.remove());

        // Optimize CSS
        this.optimizeCSS();

        // Minimize reflows and repaints
        this.batchDOMUpdates();
    }

    optimizeCSS() {
        // Remove unused CSS classes
        const stylesheets = Array.from(document.styleSheets);
        const usedClasses = new Set();

        // Collect used classes
        document.querySelectorAll('*').forEach(el => {
            el.classList.forEach(cls => usedClasses.add(cls));
        });

        // This is a simplified version - in production, use tools like PurgeCSS
        console.log('Used CSS classes:', usedClasses.size);
    }

    batchDOMUpdates() {
        const updates = [];
        
        return {
            add: (element, property, value) => {
                updates.push({ element, property, value });
            },
            
            execute: () => {
                // Batch all DOM updates in a single frame
                requestAnimationFrame(() => {
                    updates.forEach(({ element, property, value }) => {
                        element.style[property] = value;
                    });
                    updates.length = 0;
                });
            }
        };
    }

    // Performance Monitoring
    measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`${name} took ${end - start} milliseconds`);
        
        // Log to performance database
        this.logPerformanceMetric(name, end - start);
        
        return result;
    }

    logPerformanceMetric(name, duration) {
        const metrics = db.getItem('performanceMetrics', []);
        metrics.push({
            name,
            duration,
            timestamp: Date.now(),
            url: window.location.pathname
        });

        // Keep only last 1000 metrics
        if (metrics.length > 1000) {
            metrics.splice(0, metrics.length - 1000);
        }

        db.setItem('performanceMetrics', metrics);
    }

    // Get Performance Report
    getPerformanceReport() {
        const metrics = db.getItem('performanceMetrics', []);
        const report = {};

        metrics.forEach(metric => {
            if (!report[metric.name]) {
                report[metric.name] = {
                    count: 0,
                    totalDuration: 0,
                    avgDuration: 0,
                    maxDuration: 0,
                    minDuration: Infinity
                };
            }

            const stat = report[metric.name];
            stat.count++;
            stat.totalDuration += metric.duration;
            stat.maxDuration = Math.max(stat.maxDuration, metric.duration);
            stat.minDuration = Math.min(stat.minDuration, metric.duration);
            stat.avgDuration = stat.totalDuration / stat.count;
        });

        return report;
    }

    // Preload Critical Resources
    preloadResources(resources) {
        resources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.url;
            link.as = resource.type;
            document.head.appendChild(link);
        });
    }

    // Service Worker Registration
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }
}

// Initialize Performance Optimizer
const performanceOptimizer = new PerformanceOptimizer();

// Export for global use
window.PerformanceOptimizer = PerformanceOptimizer;
window.performanceOptimizer = performanceOptimizer;