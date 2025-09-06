// modules/mini-cart.js - Модуль всплывающей корзины
class MiniCart {
    constructor() {
        this.isVisible = false;
        this.clickOutsideHandler = null;
        this.resizeHandler = null;
    }

    // Инициализация модуля
    init() {
        this.createMiniCart();
        this.setupEventListeners();
        console.log('Модуль всплывающей корзины инициализирован');
    }

    // Создание DOM-структуры мини-корзины
    createMiniCart() {
        // Создаем бэкдроп
        const backdrop = document.createElement('div');
        backdrop.className = 'mini-cart-backdrop';
        backdrop.addEventListener('click', () => this.hide());

        // Создаем контейнер мини-корзины
        const miniCart = document.createElement('div');
        miniCart.className = 'mini-cart';
        miniCart.innerHTML = `
            <div class="mini-cart-header">
                <h5 class="mini-cart-title">Корзина</h5>
                <button class="mini-cart-close" aria-label="Закрыть корзину">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="mini-cart-body">
                <div class="mini-cart-empty">
                    <div class="mini-cart-empty-icon">
                        <i class="bi bi-cart-x"></i>
                    </div>
                    <p>Корзина пуста</p>
                </div>
                <ul class="mini-cart-items" style="display: none;"></ul>
            </div>
            <div class="mini-cart-footer" style="display: none;">
                <div class="mini-cart-total">
                    <span class="mini-cart-total-label">Итого:</span>
                    <span class="mini-cart-total-price">0 руб.</span>
                </div>
                <div class="mini-cart-actions">
                    <button class="mini-cart-btn mini-cart-btn-secondary" onclick="showCatalog()">
                        <i class="bi bi-arrow-left"></i> В каталог
                    </button>
                    <button class="mini-cart-btn mini-cart-btn-primary" onclick="showCart()">
                        <i class="bi bi-cart-check"></i> Оформить
                    </button>
                </div>
            </div>
        `;

        // Добавляем в DOM
        document.body.appendChild(backdrop);
        document.body.appendChild(miniCart);

        // Настраиваем обработчик закрытия
        miniCart.querySelector('.mini-cart-close').addEventListener('click', () => this.hide());
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Перехватываем клик по кнопке корзины
        const originalShowCart = window.showCart;
        window.showCart = () => {
            this.toggle();
        };

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Закрытие при ресайзе (на мобильных)
        this.resizeHandler = () => {
            if (window.innerWidth >= 769 && this.isVisible) {
                this.hide();
            }
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    // Показать/скрыть мини-корзину
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // Показать мини-корзину
    show() {
        this.updateMiniCart();
        
        const miniCart = document.querySelector('.mini-cart');
        const backdrop = document.querySelector('.mini-cart-backdrop');
        
        miniCart.classList.add('show');
        backdrop.classList.add('show');
        this.isVisible = true;

        // Блокируем прокрутку body
        document.body.style.overflow = 'hidden';

        // Обработчик клика вне области
        this.clickOutsideHandler = (e) => {
            if (!miniCart.contains(e.target) && e.target !== document.querySelector('.navbar-nav .btn-outline-light')) {
                this.hide();
            }
        };
        document.addEventListener('click', this.clickOutsideHandler);
    }

    // Скрыть мини-корзину
    hide() {
        const miniCart = document.querySelector('.mini-cart');
        const backdrop = document.querySelector('.mini-cart-backdrop');
        
        miniCart.classList.remove('show');
        backdrop.classList.remove('show');
        this.isVisible = false;

        // Восстанавливаем прокрутку
        document.body.style.overflow = '';

        // Убираем обработчик
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }
    }

    // Обновление содержимого мини-корзины
    updateMiniCart() {
        const itemsContainer = document.querySelector('.mini-cart-items');
        const emptyState = document.querySelector('.mini-cart-empty');
        const footer = document.querySelector('.mini-cart-footer');
        const totalPrice = document.querySelector('.mini-cart-total-price');

        if (cart.length === 0) {
            emptyState.style.display = 'block';
            itemsContainer.style.display = 'none';
            footer.style.display = 'none';
            return;
        }

        // Показываем элементы
        emptyState.style.display = 'none';
        itemsContainer.style.display = 'block';
        footer.style.display = 'block';

        // Обновляем товары
        itemsContainer.innerHTML = cart.map(item => `
            <li class="mini-cart-item">
                <img src="${item.Фото}" 
                     alt="${item.Модель}" 
                     class="mini-cart-item-image"
                     onerror="this.onerror=null; this.src='images/default.jpg'">
                <div class="mini-cart-item-info">
                    <div class="mini-cart-item-name">${item.Модель}</div>
                    <div class="mini-cart-item-details">
                        <span class="mini-cart-item-price">${item.discountPrice.toLocaleString('ru-RU')} руб.</span>
                        <div class="mini-cart-item-quantity">
                            <button class="mini-cart-quantity-btn" 
                                    onclick="updateCartItem('${item.Артикул}', ${item.quantity - 1})">-</button>
                            <input type="number" 
                                   class="mini-cart-quantity-input" 
                                   value="${item.quantity}" 
                                   onchange="updateCartItem('${item.Артикул}', this.value)" 
                                   min="1">
                            <button class="mini-cart-quantity-btn" 
                                    onclick="updateCartItem('${item.Артикул}', ${item.quantity + 1})">+</button>
                            <button class="mini-cart-item-remove" 
                                    onclick="removeFromCart('${item.Артикул}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </li>
        `).join('');

        // Обновляем итоговую сумму
        const total = cart.reduce((sum, item) => sum + (item.discountPrice * item.quantity), 0);
        totalPrice.textContent = `${total.toLocaleString('ru-RU')} руб.`;
    }

    // Обновление бейджа на иконке корзины
    updateCartBadge(count) {
        let badge = document.querySelector('.cart-icon-badge');
        
        if (!badge) {
            const cartBtn = document.querySelector('.navbar-nav .btn-outline-light');
            const icon = cartBtn.querySelector('i');
            
            // Создаем обертку для иконки
            const iconWrapper = document.createElement('span');
            iconWrapper.className = 'cart-icon-with-badge';
            iconWrapper.innerHTML = icon.outerHTML;
            
            // Создаем бейдж
            badge = document.createElement('span');
            badge.className = 'cart-icon-badge';
            badge.textContent = count;
            
            iconWrapper.appendChild(badge);
            cartBtn.replaceChild(iconWrapper, icon);
        } else {
            badge.textContent = count;
        }

        // Скрываем бейдж если корзина пуста
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    // Показать уведомление о добавлении в корзину
    showAddToCartNotification(productName, quantity) {
        const notification = document.createElement('div');
        notification.className = 'alert alert-success position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 1070; min-width: 300px;';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill me-2"></i>
                <div>
                    <div>Товар добавлен в корзину</div>
                    <small class="text-muted">${productName} × ${quantity}</small>
                </div>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    // Уничтожение модуля (для очистки)
    destroy() {
        this.hide();
        
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }

        const miniCart = document.querySelector('.mini-cart');
        const backdrop = document.querySelector('.mini-cart-backdrop');
        
        if (miniCart) miniCart.remove();
        if (backdrop) backdrop.remove();
        
        console.log('Модуль всплывающей корзины уничтожен');
    }
}

// Создаем экземпляр модуля
const miniCart = new MiniCart();

// Глобальные функции для управления мини-корзиной
function showMiniCart() {
    miniCart.show();
}

function hideMiniCart() {
    miniCart.hide();
}

function toggleMiniCart() {
    miniCart.toggle();
}

// Перехватываем функцию добавления в корзину для показа уведомления
const originalAddToCart = window.addToCart;
window.addToCart = function(article) {
    const result = originalAddToCart(article);
    if (result !== false) {
        const product = allProducts.find(p => p.Артикул === article);
        const quantityInput = document.getElementById(`quantity-${article}`);
        const quantity = parseInt(quantityInput?.value) || 1;
        
        if (product) {
            miniCart.showAddToCartNotification(product.Модель, quantity);
        }
        
        // Показываем мини-корзину на мобильных устройствах
        if (window.innerWidth < 769) {
            setTimeout(() => miniCart.show(), 100);
        }
    }
    return result;
};

// Обновляем бейдж при изменении корзины
const originalUpdateCartBadge = window.updateCartBadge;
window.updateCartBadge = function() {
    originalUpdateCartBadge();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    miniCart.updateCartBadge(totalItems);
};

// Обновляем мини-корзину при изменениях
const originalUpdateCart = window.updateCart;
window.updateCart = function() {
    originalUpdateCart();
    miniCart.updateMiniCart();
};