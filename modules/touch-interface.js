// modules/touch-interface.js - Улучшенный touch-интерфейс для мобильных
class TouchInterface {
    constructor() {
        this.isMobile = false;
        this.isTouchDevice = false;
        this.swipeStartX = 0;
        this.swipeStartY = 0;
        this.currentSwipeItem = null;
        this.scrollTimeout = null;
    }

    // Инициализация модуля
    init() {
        this.detectDeviceType();
        this.setupEventListeners();
        this.optimizeForTouch();
        this.setupSwipeGestures();
        this.setupPullToRefresh();
        this.setupScrollToTop();
        console.log('Модуль touch-интерфейса инициализирован');
    }

    // Определение типа устройства
    detectDeviceType() {
        this.isTouchDevice = 'ontouchstart' in window || 
                            navigator.maxTouchPoints > 0 || 
                            navigator.msMaxTouchPoints > 0;
        
        this.isMobile = window.innerWidth <= 768;
        
        // Добавляем классы для CSS
        if (this.isTouchDevice) {
            document.documentElement.classList.add('touch-device');
        }
        if (this.isMobile) {
            document.documentElement.classList.add('mobile-device');
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчик изменения ориентации
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 300);
        });

        // Обработчик изменения размера
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Предотвращение масштабирования при двойном тапе
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault();
            }
            
            lastTap = currentTime;
        });

        // Оптимизация скролла
        document.addEventListener('scroll', () => {
            this.handleScroll();
        }, { passive: true });
    }

    // Оптимизация для touch-устройств
    optimizeForTouch() {
        // Добавляем touch-классы
        document.querySelectorAll('.btn, .card, .form-control').forEach(el => {
            el.classList.add('touch-optimized');
        });

        // Улучшаем элементы управления
        this.enhanceFormControls();
        this.enhanceNavigation();
        this.enhanceProductCards();
    }

    // Улучшение элементов формы
    enhanceFormControls() {
        // Увеличиваем hit area для чекбоксов и радиокнопок
        document.querySelectorAll('.form-check-input').forEach(input => {
            const label = input.closest('.form-check-label') || input.nextElementSibling;
            if (label && label.tagName === 'LABEL') {
                label.style.padding = '12px 15px';
                label.style.margin = '5px 0';
            }
        });

        // Оптимизация селектов
        document.querySelectorAll('.form-select').forEach(select => {
            select.addEventListener('touchstart', (e) => {
                e.currentTarget.classList.add('active');
            });

            select.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    e.currentTarget.classList.remove('active');
                }, 300);
            });
        });
    }

    // Улучшение навигации
    enhanceNavigation() {
        // Добавляем вибрационный feedback
        document.querySelectorAll('.navbar-nav .btn').forEach(btn => {
            btn.addEventListener('touchstart', () => {
                this.vibrate(20);
            });
        });

        // Мобильное меню фильтров
        if (this.isMobile) {
            this.createMobileFiltersButton();
        }
    }

    // Улучшение карточек товаров
    enhanceProductCards() {
        document.querySelectorAll('.card').forEach(card => {
            // Добавляем feedback при касании
            card.addEventListener('touchstart', () => {
                card.classList.add('active');
            });

            card.addEventListener('touchend', () => {
                setTimeout(() => {
                    card.classList.remove('active');
                }, 150);
            });

            // Быстрое добавление в корзину
            const addToCartBtn = card.querySelector('.btn-outline-primary, .btn-success');
            if (addToCartBtn) {
                addToCartBtn.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    this.vibrate(10);
                });
            }
        });
    }

    // Настройка swipe-жестов
    setupSwipeGestures() {
        if (!this.isTouchDevice) return;

        document.addEventListener('touchstart', (e) => {
            this.swipeStartX = e.touches[0].clientX;
            this.swipeStartY = e.touches[0].clientY;
            this.currentSwipeItem = e.target.closest('.swipeable-item');
        });

        document.addEventListener('touchmove', (e) => {
            if (!this.currentSwipeItem) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - this.swipeStartX;
            const diffY = currentY - this.swipeStartY;

            // Определяем направление swipe
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                e.preventDefault();
                this.handleSwipe(diffX);
            }
        });

        document.addEventListener('touchend', () => {
            if (this.currentSwipeItem) {
                this.resetSwipe();
            }
        });
    }

    // Обработка swipe-жестов
    handleSwipe(diffX) {
        if (diffX > 50) {
            // Swipe вправо
            this.currentSwipeItem.classList.add('swiped');
        } else if (diffX < -50) {
            // Swipe влево
            this.currentSwipeItem.classList.remove('swiped');
        }
    }

    // Сброс swipe-состояния
    resetSwipe() {
        setTimeout(() => {
            if (this.currentSwipeItem) {
                this.currentSwipeItem.classList.remove('swiped');
                this.currentSwipeItem = null;
            }
        }, 3000);
    }

    // Настройка pull-to-refresh
    setupPullToRefresh() {
        if (!this.isTouchDevice) return;

        let startY = 0;
        let pullDelta = 0;
        const refreshElement = document.createElement('div');
        refreshElement.className = 'pull-to-refresh';
        refreshElement.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
        document.body.appendChild(refreshElement);

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!startY) return;

            const currentY = e.touches[0].pageY;
            pullDelta = currentY - startY;

            if (pullDelta > 0) {
                e.preventDefault();
                refreshElement.style.transform = `translateY(${Math.min(pullDelta, 60)}px)`;

                if (pullDelta > 60) {
                    refreshElement.classList.add('visible');
                } else {
                    refreshElement.classList.remove('visible');
                }
            }
        });

        document.addEventListener('touchend', () => {
            if (pullDelta > 60) {
                this.handlePullToRefresh();
            }

            refreshElement.style.transform = 'translateY(0)';
            refreshElement.classList.remove('visible');
            startY = 0;
            pullDelta = 0;
        });
    }

    // Обработка pull-to-refresh
    handlePullToRefresh() {
        this.vibrate(40);
        showNotification('Обновляем данные...', 'info');
        
        setTimeout(() => {
            loadData();
            showNotification('Данные обновлены', 'success');
        }, 1000);
    }

    // Настройка кнопки "Наверх"
    setupScrollToTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-to-top';
        scrollBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.vibrate(20);
        });

        document.body.appendChild(scrollBtn);

        window.addEventListener('scroll', () => {
            this.toggleScrollToTop();
        });
    }

    // Показать/скрыть кнопку "Наверх"
    toggleScrollToTop() {
        const scrollBtn = document.querySelector('.scroll-to-top');
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    }

    // Создание кнопки мобильных фильтров
    createMobileFiltersButton() {
        const filtersBtn = document.createElement('button');
        filtersBtn.className = 'mobile-filters-btn';
        filtersBtn.innerHTML = '<i class="bi bi-funnel"></i>';
        filtersBtn.addEventListener('click', () => {
            this.toggleMobileFilters();
        });

        const filtersPanel = document.createElement('div');
        filtersPanel.className = 'mobile-filters-panel';
        filtersPanel.innerHTML = this.getMobileFiltersContent();

        const container = document.createElement('div');
        container.className = 'mobile-filters';
        container.appendChild(filtersBtn);
        container.appendChild(filtersPanel);

        document.body.appendChild(container);
    }

    // Контент мобильных фильтров
    getMobileFiltersContent() {
        return `
            <div class="mb-3">
                <label class="form-label fw-bold">Мощность</label>
                <select class="form-select" id="mobile-power-filter">
                    <option value="">Все мощности</option>
                    <option value="18">18 кВт</option>
                    <option value="24">24 кВт</option>
                    <option value="28">28 кВт</option>
                    <option value="30">30 кВт</option>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label fw-bold">Контуры</label>
                <select class="form-select" id="mobile-contour-filter">
                    <option value="">Все контуры</option>
                    <option value="Двухконтурный">Двухконтурные</option>
                    <option value="Одноконтурный">Одноконтурные</option>
                </select>
            </div>
            <button class="btn btn-primary w-100" onclick="applyMobileFilters()">
                Применить
            </button>
        `;
    }

    // Переключение мобильных фильтров
    toggleMobileFilters() {
        const panel = document.querySelector('.mobile-filters-panel');
        panel.classList.toggle('visible');
        this.vibrate(20);
    }

    // Вибрационный feedback
    vibrate(duration) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }

    // Обработчик изменения ориентации
    handleOrientationChange() {
        this.vibrate(20);
        this.detectDeviceType();
        this.optimizeForTouch();
        
        // Обновляем layout
        setTimeout(() => {
            if (typeof comparisonModule !== 'undefined') {
                comparisonModule.addCheckboxesToProducts();
            }
            if (typeof recommendationsSystem !== 'undefined') {
                recommendationsSystem.calculateVisibleItems();
                recommendationsSystem.updateNavigation();
            }
        }, 100);
    }

    // Обработчик изменения размера
    handleResize() {
        const wasMobile = this.isMobile;
        this.detectDeviceType();
        
        if (wasMobile !== this.isMobile) {
            this.optimizeForTouch();
        }
    }

    // Обработчик скролла
    handleScroll() {
        // Оптимизация производительности при скролле
        document.documentElement.classList.add('scrolling');
        
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            document.documentElement.classList.remove('scrolling');
        }, 100);
    }

    // Применение мобильных фильтров
    applyMobileFilters() {
        const powerFilter = document.getElementById('mobile-power-filter').value;
        const contourFilter = document.getElementById('mobile-contour-filter').value;
        
        document.getElementById('power-filter').value = powerFilter;
        document.getElementById('contour-filter').value = contourFilter;
        
        filterProducts();
        this.toggleMobileFilters();
    }

    // Уничтожение модуля
    destroy() {
        // Очистка обработчиков событий
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('scroll', this.handleScroll);
        
        // Удаление созданных элементов
        document.querySelectorAll('.pull-to-refresh, .scroll-to-top, .mobile-filters').forEach(el => el.remove());
        
        console.log('Модуль touch-интерфейса уничтожен');
    }
}

// Создаем экземпляр модуля
const touchInterface = new TouchInterface();

// Глобальные функции
function applyMobileFilters() {
    touchInterface.applyMobileFilters();
}

function toggleMobileFilters() {
    touchInterface.toggleMobileFilters();
}

// Интеграция с основным приложением
document.addEventListener('DOMContentLoaded', () => {
    // Добавляем обработчик для мобильных фильтров
    const originalFilterProducts = window.filterProducts;
    window.filterProducts = function() {
        originalFilterProducts();
        if (touchInterface.isMobile) {
            touchInterface.toggleMobileFilters();
        }
    };
});

// Оптимизация загрузки изображений
if ('connection' in navigator && navigator.connection) {
    const connection = navigator.connection;
    const connectionIndicator = document.createElement('div');
    connectionIndicator.className = 'connection-indicator';
    document.body.appendChild(connectionIndicator);

    if (connection.saveData) {
        document.documentElement.classList.add('low-connection');
    }

    connection.addEventListener('change', () => {
        if (connection.effectiveType) {
            const effectiveType = connection.effectiveType;
            connectionIndicator.className = 'connection-indicator';
            
            if (effectiveType.includes('2g')) {
                connectionIndicator.classList.add('slow');
                document.documentElement.classList.add('low-connection');
            } else if (effectiveType.includes('3g')) {
                connectionIndicator.classList.add('medium');
                document.documentElement.classList.remove('low-connection');
            } else {
                connectionIndicator.classList.add('fast');
                document.documentElement.classList.remove('low-connection');
            }
        }
    });
}

// Lazy loading для изображений
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    // Добавляем lazy loading к изображениям товаров
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.product-img').forEach(img => {
            if (!img.src) {
                img.dataset.src = img.getAttribute('src') || 'images/default.jpg';
                img.removeAttribute('src');
                imageObserver.observe(img);
            }
        });
    });
}