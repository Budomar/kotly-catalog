// modules/cart-storage.js - Модуль сохранения корзины между сессиями
class CartStorage {
    constructor() {
        this.storageKey = 'laggartt_cart';
        this.maxStorageDays = 30;
    }

    // Инициализация модуля
    init() {
        this.loadCartFromStorage();
        this.setupAutoSave();
        console.log('Модуль сохранения корзины инициализирован');
    }

    // Настройка автоматического сохранения
    setupAutoSave() {
        // Сохраняем корзину при каждом изменении
        const originalAddToCart = window.addToCart;
        const originalUpdateCartItem = window.updateCartItem;
        const originalRemoveFromCart = window.removeFromCart;

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
    }

    // Сохранение корзины в localStorage
    saveCartToStorage() {
        try {
            const cartData = {
                items: cart,
                timestamp: new Date().getTime(),
                discount: currentDiscount
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(cartData));
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
            if (!savedData) return false;

            const cartData = JSON.parse(savedData);
            
            // Проверяем срок хранения
            if (this.isDataExpired(cartData.timestamp)) {
                this.clearExpiredCart();
                return false;
            }

            // Восстанавливаем скидку
            if (cartData.discount !== undefined) {
                currentDiscount = cartData.discount;
                document.getElementById('discount-slider').value = currentDiscount;
                document.getElementById('discount-input').value = currentDiscount;
                document.getElementById('discount-value').textContent = currentDiscount;
            }

            // Восстанавливаем товары
            if (cartData.items && cartData.items.length > 0) {
                this.restoreCartItems(cartData.items);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Ошибка загрузки корзины:', error);
            this.clearInvalidCart();
            return false;
        }
    }

    // Восстановление товаров в корзину
    restoreCartItems(savedItems) {
        const restoredItems = [];
        const unavailableItems = [];

        savedItems.forEach(savedItem => {
            // Ищем актуальный товар в каталоге
            const actualProduct = allProducts.find(p => p.Артикул === savedItem.Артикул);
            
            if (actualProduct) {
                // Обновляем данные товара актуальной информацией
                const restoredItem = {
                    ...actualProduct,
                    quantity: Math.min(savedItem.quantity, actualProduct.В_наличии),
                    discountPrice: calculateDiscountPrice(actualProduct.Цена, currentDiscount)
                };
                
                // Проверяем доступность
                if (actualProduct.В_наличии > 0) {
                    restoredItems.push(restoredItem);
                } else {
                    unavailableItems.push(savedItem.Модель);
                }
            } else {
                unavailableItems.push(savedItem.Модель);
            }
        });

        // Обновляем корзину
        cart = restoredItems;

        // Показываем уведомление о восстановлении
        if (restoredItems.length > 0) {
            this.showRestorationNotification(restoredItems.length, unavailableItems);
        }

        // Обновляем интерфейс
        updateCartBadge();
        if (document.getElementById('cart-section').classList.contains('hidden-section')) {
            renderProducts();
        } else {
            updateCart();
        }
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
    clearCart() {
        cart = [];
        localStorage.removeItem(this.storageKey);
        updateCartBadge();
        updateCart();
        renderProducts();
    }

    // Обработка ошибок хранилища
    handleStorageError(error) {
        if (error.name === 'QuotaExceededError') {
            console.warn('Переполнение localStorage. Очищаем старые данные...');
            this.clearExpiredCart();
        }
    }

    // Уведомление о восстановлении корзины
    showRestorationNotification(restoredCount, unavailableItems) {
        let message = `Восстановлено ${restoredCount} товаров из корзины`;
        
        if (unavailableItems.length > 0) {
            message += `. Недоступны: ${unavailableItems.slice(0, 3).join(', ')}`;
            if (unavailableItems.length > 3) {
                message += ` и ещё ${unavailableItems.length - 3}`;
            }
        }

        showNotification(message, 'info');
    }

    // Получение информации о корзине
    getCartInfo() {
        return {
            totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
            totalValue: cart.reduce((sum, item) => sum + (item.discountPrice * item.quantity), 0),
            itemsCount: cart.length,
            lastUpdated: new Date().toLocaleString('ru-RU')
        };
    }
}

// Создаем экземпляр модуля
const cartStorage = new CartStorage();

// Глобальные функции для управления корзиной
function clearCartStorage() {
    cartStorage.clearCart();
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
        return false;
    }
}