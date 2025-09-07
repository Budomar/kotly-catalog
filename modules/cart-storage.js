// modules/cart-storage.js - Модуль сохранения корзины между сессиями
class CartStorage {
    constructor() {
        this.storageKey = 'laggartt_cart';
        this.maxStorageDays = 30;
        this.initialized = false;
    }

    // Инициализация модуля
    init() {
        if (this.initialized) return;
        
        try {
            this.loadCartFromStorage();
            this.setupAutoSave();
            this.initialized = true;
            console.log('Модуль сохранения корзины инициализирован');
        } catch (error) {
            console.error('Ошибка инициализации модуля сохранения корзины:', error);
        }
    }

    // Настройка автоматического сохранения
    setupAutoSave() {
        try {
            // Сохраняем корзину при каждом изменении
            const originalAddToCart = window.addToCart;
            const originalUpdateCartItem = window.updateCartItem;
            const originalRemoveFromCart = window.removeFromCart;
            const originalClearCart = window.clearCart;

            window.addToCart = (article) => {
                const result = originalAddToCart(article);
                if (result !== false) {
                    this.saveCartToStorage();
                }
                return result;
            };

            window.updateCartItem = (article, quantity) => {
                originalUpdateCartItem(article, quantity);
                this.saveCartToStorage();
            };

            window.removeFromCart = (article) => {
                originalRemoveFromCart(article);
                this.saveCartToStorage();
            };

            window.clearCart = () => {
                originalClearCart();
                this.clearCartStorage();
            };

            // Сохраняем при изменении скидки
            const originalUpdateDiscount = window.updateDiscount;
            window.updateDiscount = (value) => {
                originalUpdateDiscount(value);
                this.updateCartPrices();
                this.saveCartToStorage();
            };

            // Сохраняем перед закрытием страницы
            window.addEventListener('beforeunload', () => {
                this.saveCartToStorage();
            });

            // Сохраняем при изменении видимости страницы
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.saveCartToStorage();
                }
            });

        } catch (error) {
            console.error('Ошибка настройки автосохранения:', error);
        }
    }

    // Сохранение корзины в localStorage
    saveCartToStorage() {
        if (!this.initialized) return false;

        try {
            // Подготавливаем данные для сохранения
            const cartData = {
                items: cart.map(item => ({
                    Артикул: item.Артикул,
                    quantity: item.quantity,
                    addedAt: item.addedAt || new Date().toISOString()
                })),
                timestamp: new Date().getTime(),
                discount: currentDiscount,
                version: '1.0'
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(cartData));
            console.log('Корзина сохранена в localStorage');
            return true;
        } catch (error) {
            console.error('Ошибка сохранения корзины:', error);
            this.handleStorageError(error);
            return false;
        }
    }

    // Загрузка корзины из localStorage
    loadCartFromStorage() {
        try {
            const savedData = localStorage.getItem(this.storageKey);
            if (!savedData) {
                console.log('Сохраненная корзина не найдена');
                return false;
            }

            const cartData = JSON.parse(savedData);
            
            // Проверяем версию данных
            if (!this.validateCartData(cartData)) {
                console.warn('Невалидные данные корзины, очищаем...');
                this.clearInvalidCart();
                return false;
            }

            // Проверяем срок хранения
            if (this.isDataExpired(cartData.timestamp)) {
                console.log('Корзина просрочена, очищаем...');
                this.clearExpiredCart();
                return false;
            }

            // Восстанавливаем скидку
            if (cartData.discount !== undefined) {
                currentDiscount = cartData.discount;
                // Обновляем UI скидки
                if (document.getElementById('discount-slider')) {
                    document.getElementById('discount-slider').value = currentDiscount;
                    document.getElementById('discount-input').value = currentDiscount;
                    document.getElementById('discount-value').textContent = currentDiscount;
                }
            }

            // Восстанавливаем товары
            if (cartData.items && cartData.items.length > 0) {
                this.restoreCartItems(cartData.items);
                console.log('Корзина восстановлена:', cartData.items.length, 'товаров');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Ошибка загрузки корзины:', error);
            this.clearInvalidCart();
            return false;
        }
    }

    // Валидация данных корзины
    validateCartData(cartData) {
        if (!cartData || typeof cartData !== 'object') return false;
        if (!cartData.items || !Array.isArray(cartData.items)) return false;
        if (!cartData.timestamp || typeof cartData.timestamp !== 'number') return false;
        
        // Проверяем каждый элемент корзины
        for (const item of cartData.items) {
            if (!item.Артикул || typeof item.Артикул !== 'string') return false;
            if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) return false;
        }
        
        return true;
    }

    // Восстановление товаров в корзину
    restoreCartItems(savedItems) {
        const restoredItems = [];
        const unavailableItems = [];
        const outdatedItems = [];

        savedItems.forEach(savedItem => {
            // Ищем актуальный товар в каталоге
            const actualProduct = allProducts.find(p => p.Артикул === savedItem.Артикул);
            
            if (actualProduct) {
                // Проверяем доступность
                if (actualProduct.В_наличии > 0) {
                    // Обновляем данные товара актуальной информацией
                    const restoredItem = {
                        ...actualProduct,
                        quantity: Math.min(savedItem.quantity, actualProduct.В_наличии),
                        discountPrice: calculateDiscountPrice(actualProduct.Цена, currentDiscount),
                        addedAt: savedItem.addedAt || new Date().toISOString()
                    };
                    
                    restoredItems.push(restoredItem);
                    
                    // Сообщаем если количество было уменьшено
                    if (savedItem.quantity > actualProduct.В_наличии) {
                        outdatedItems.push({
                            name: actualProduct.Модель,
                            requested: savedItem.quantity,
                            available: actualProduct.В_наличии
                        });
                    }
                } else {
                    unavailableItems.push(actualProduct.Модель);
                }
            } else {
                unavailableItems.push(savedItem.Артикул);
            }
        });

        // Обновляем корзину
        cart = restoredItems;

        // Показываем уведомление о восстановлении
        this.showRestorationNotification(restoredItems.length, unavailableItems, outdatedItems);

        // Обновляем интерфейс
        if (typeof updateCartBadge === 'function') updateCartBadge();
        if (typeof updateCart === 'function') updateCart();
        if (typeof renderProducts === 'function') renderProducts();
    }

    // Обновление цен в корзине при изменении скидки
    updateCartPrices() {
        cart.forEach(item => {
            const actualProduct = allProducts.find(p => p.Артикул === item.Артикул);
            if (actualProduct) {
                item.discountPrice = calculateDiscountPrice(actualProduct.Цена, currentDiscount);
                item.Цена = actualProduct.Цена;
            }
        });
    }

    // Проверка срока годности данных
    isDataExpired(timestamp) {
        const now = new Date().getTime();
        const daysDiff = (now - timestamp) / (1000 * 60 * 60 * 24);
        return daysDiff > this.maxStorageDays;
    }

    // Очистка просроченной корзины
    clearExpiredCart() {
        localStorage.removeItem(this.storageKey);
        console.log('Корзина очищена (просрочена)');
    }

    // Очистка невалидной корзины
    clearInvalidCart() {
        localStorage.removeItem(this.storageKey);
        console.log('Корзина очищена (невалидные данные)');
    }

    // Полная очистка корзины
    clearCartStorage() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('Корзина полностью очищена из хранилища');
        } catch (error) {
            console.error('Ошибка очистки хранилища:', error);
        }
    }

    // Обработка ошибок хранилища
    handleStorageError(error) {
        if (error.name === 'QuotaExceededError') {
            console.warn('Переполнение localStorage. Очищаем старые данные...');
            this.clearExpiredCart();
            this.showNotification('Недостаточно места для сохранения. Старые данные очищены.', 'warning');
        } else if (error.name === 'SecurityError') {
            console.warn('Доступ к localStorage запрещен');
            this.showNotification('Сохранение данных недоступно в этом режиме просмотра.', 'warning');
        }
    }

    // Уведомление о восстановлении корзины
    showRestorationNotification(restoredCount, unavailableItems, outdatedItems = []) {
        if (restoredCount === 0 && unavailableItems.length === 0) return;
        
        let message = '';
        
        if (restoredCount > 0) {
            message += `Восстановлено ${restoredCount} товаров из корзины. `;
        }
        
        if (unavailableItems.length > 0) {
            message += `Недоступны: ${unavailableItems.slice(0, 3).join(', ')}`;
            if (unavailableItems.length > 3) {
                message += ` и ещё ${unavailableItems.length - 3}`;
            }
        }
        
        if (outdatedItems.length > 0) {
            message += '. Количество некоторых товаров уменьшено до доступного.';
        }
        
        if (message) {
            showNotification(message, 'info');
        }
    }

    // Получение информации о корзине
    getCartInfo() {
        return {
            totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
            totalValue: cart.reduce((sum, item) => sum + (item.discountPrice * item.quantity), 0),
            itemsCount: cart.length,
            lastUpdated: new Date().toLocaleString('ru-RU'),
            storageStatus: this.getStorageStatus()
        };
    }

    // Получение статуса хранилища
    getStorageStatus() {
        try {
            const testData = 'test';
            localStorage.setItem('test', testData);
            localStorage.removeItem('test');
            return 'available';
        } catch (error) {
            return 'unavailable';
        }
    }

    // Резервное копирование корзины
    backupCart() {
        try {
            const backupData = {
                cart: JSON.parse(JSON.stringify(cart)),
                timestamp: new Date().getTime(),
                discount: currentDiscount
            };
            
            sessionStorage.setItem('cart_backup', JSON.stringify(backupData));
            return true;
        } catch (error) {
            console.error('Ошибка резервного копирования:', error);
            return false;
        }
    }

    // Восстановление из резервной копии
    restoreFromBackup() {
        try {
            const backupData = sessionStorage.getItem('cart_backup');
            if (!backupData) return false;
            
            const backup = JSON.parse(backupData);
            if (this.validateCartData(backup)) {
                cart = backup.cart;
                currentDiscount = backup.discount;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Ошибка восстановления из резервной копии:', error);
            return false;
        }
    }
}

// Создаем экземпляр модуля
const cartStorage = new CartStorage();

// Глобальные функции для управления корзиной
function clearCartStorage() {
    cartStorage.clearCartStorage();
}

function getCartInfo() {
    return cartStorage.getCartInfo();
}

// Функция для проверки состояния хранилища
function checkStorageStatus() {
    try {
        const testKey = 'storage_test';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        console.error('LocalStorage недоступен:', error);
        showNotification('LocalStorage недоступен. Данные корзины не будут сохраняться.', 'warning');
        return false;
    }
}

// Вспомогательная функция для расчета цены со скидкой
function calculateDiscountPrice(price, discount) {
    return Math.round(price * (1 - discount / 100));
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof cartStorage !== 'undefined' && typeof cartStorage.init === 'function') {
            cartStorage.init();
        }
    }, 500);
});

console.log('Модуль сохранения корзины загружен');