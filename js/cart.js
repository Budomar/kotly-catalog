// js/cart.js - Функции корзины

// Базовая функция добавления в корзину
function addToCart(article) {
    try {
        console.log('Добавление в корзину:', article);
        
        // Находим товар в общем каталоге
        const product = allProducts.find(p => p.Артикул === article);
        if (!product) {
            console.error('Товар не найден:', article);
            showNotification('Товар не найден', 'error');
            return false;
        }

        // Получаем количество из input
        const quantityInput = document.getElementById(`quantity-${article}`);
        let quantity = 1;
        
        if (quantityInput) {
            quantity = Math.max(1, Math.min(product.В_наличии || 99, parseInt(quantityInput.value) || 1));
            // Сбрасываем значение input к 1 после добавления
            quantityInput.value = 1;
        }

        console.log('Количество:', quantity, 'Наличие:', product.В_наличии);

        // Проверяем доступность товара
        if (product.В_наличии === 0) {
            showNotification('Этот товар временно отсутствует', 'warning');
            return false;
        }

        // Проверяем, не превышает ли количество доступное наличие
        if (quantity > product.В_наличии) {
            showNotification(`Доступно только ${product.В_наличии} шт. этого товара`, 'warning');
            quantity = product.В_наличии;
        }

        // Ищем товар в корзине
        const existingItemIndex = cart.findIndex(item => item.Артикул === article);
        
        if (existingItemIndex !== -1) {
            // Товар уже в корзине - обновляем количество
            const newQuantity = cart[existingItemIndex].quantity + quantity;
            
            if (newQuantity > product.В_наличии) {
                showNotification(`Нельзя добавить больше ${product.В_наличии} шт. этого товара`, 'warning');
                cart[existingItemIndex].quantity = product.В_наличии;
            } else {
                cart[existingItemIndex].quantity = newQuantity;
            }
            
            // Обновляем цену со скидкой
            cart[existingItemIndex].discountPrice = calculateDiscountPrice(product.Цена, currentDiscount);
            
        } else {
            // Новый товар - добавляем в корзину
            cart.push({
                ...product,
                quantity: quantity,
                discountPrice: calculateDiscountPrice(product.Цена, currentDiscount),
                addedAt: new Date().toISOString()
            });
        }

        // Обновляем интерфейс
        updateCartBadge();
        renderProducts();
        
        // Показываем уведомление
        const message = quantity === 1 ? 
            `Товар добавлен в корзину` : 
            `${quantity} шт. товара добавлено в корзину`;
        
        showNotification(message, 'success');

        // Сохраняем корзину если модуль доступен
        if (typeof cartStorage !== 'undefined' && typeof cartStorage.saveCartToStorage === 'function') {
            cartStorage.saveCartToStorage();
        }

        // Обновляем мини-корзину если она видима
        if (typeof miniCart !== 'undefined' && typeof miniCart.updateMiniCart === 'function') {
            miniCart.updateMiniCart();
        }

        return true;

    } catch (error) {
        console.error('Ошибка при добавлении в корзину:', error);
        showNotification('Ошибка при добавлении в корзину', 'error');
        return false;
    }
}

// Обновление количества товара в корзине
function updateCartItem(article, newQuantity) {
    try {
        console.log('Обновление товара:', article, 'Количество:', newQuantity);
        
        const itemIndex = cart.findIndex(item => item.Артикул === article);
        if (itemIndex === -1) {
            console.error('Товар не найден в корзине:', article);
            return;
        }

        // Преобразуем в число и проверяем границы
        newQuantity = parseInt(newQuantity);
        if (isNaN(newQuantity) || newQuantity < 1) {
            newQuantity = 1;
        }

        // Проверяем доступное количество
        const product = allProducts.find(p => p.Артикул === article);
        if (product && newQuantity > product.В_наличии) {
            showNotification(`Доступно только ${product.В_наличии} шт. этого товара`, 'warning');
            newQuantity = product.В_наличии;
        }

        cart[itemIndex].quantity = newQuantity;

        // Обновляем интерфейс
        updateCart();
        updateCartBadge();

        // Сохраняем изменения
        if (typeof cartStorage !== 'undefined' && typeof cartStorage.saveCartToStorage === 'function') {
            cartStorage.saveCartToStorage();
        }

    } catch (error) {
        console.error('Ошибка при обновлении корзины:', error);
        showNotification('Ошибка при обновлении корзины', 'error');
    }
}

// Удаление товара из корзины
function removeFromCart(article) {
    try {
        console.log('Удаление из корзины:', article);
        
        const itemIndex = cart.findIndex(item => item.Артикул === article);
        if (itemIndex === -1) {
            console.error('Товар не найден в корзине:', article);
            return;
        }

        const itemName = cart[itemIndex].Модель;
        cart.splice(itemIndex, 1);

        // Обновляем интерфейс
        updateCartBadge();
        updateCart();
        renderProducts();
        
        showNotification(`Товар "${itemName}" удален из корзины`, 'info');

        // Сохраняем изменения
        if (typeof cartStorage !== 'undefined' && typeof cartStorage.saveCartToStorage === 'function') {
            cartStorage.saveCartToStorage();
        }

        // Обновляем мини-корзину
        if (typeof miniCart !== 'undefined' && typeof miniCart.updateMiniCart === 'function') {
            miniCart.updateMiniCart();
        }

    } catch (error) {
        console.error('Ошибка при удалении из корзины:', error);
        showNotification('Ошибка при удалении из корзины', 'error');
    }
}

// Обновление бейджа корзины
function updateCartBadge() {
    try {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const badge = document.getElementById('cart-badge');
        
        if (badge) {
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
            
            // Анимация при изменении
            if (totalItems > 0) {
                badge.classList.add('pulse-animation');
                setTimeout(() => badge.classList.remove('pulse-animation'), 500);
            }
        }

        // Обновляем кнопки в карточках товаров
        updateProductButtons();

    } catch (error) {
        console.error('Ошибка при обновлении бейджа корзины:', error);
    }
}

// Обновление кнопок в карточках товаров
function updateProductButtons() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const articleElement = card.querySelector('.product-article');
        if (articleElement) {
            const article = articleElement.textContent.replace('Артикул:', '').trim();
            const inCart = cart.find(item => item.Артикул === article);
            const button = card.querySelector('.btn');
            
            if (button) {
                if (inCart) {
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-success');
                    button.innerHTML = '<i class="bi bi-check"></i> В корзине';
                } else {
                    button.classList.remove('btn-success');
                    button.classList.add('btn-primary');
                    button.innerHTML = '<i class="bi bi-cart-plus"></i> В корзину';
                }
            }
        }
    });
}

// Полное обновление корзины
function updateCart() {
    try {
        const container = document.getElementById('cart-items-container');
        if (!container) return;

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.Цена * item.quantity), 0);
        const totalDiscount = cart.reduce((sum, item) => sum + ((item.Цена - item.discountPrice) * item.quantity), 0);
        const finalPrice = totalPrice - totalDiscount;

        // Обновляем итоговую информацию
        document.getElementById('cart-total-items').textContent = totalItems;
        document.getElementById('cart-total-price').textContent = totalPrice.toLocaleString('ru-RU') + ' руб.';
        document.getElementById('cart-total-discount').textContent = totalDiscount.toLocaleString('ru-RU') + ' руб.';
        document.getElementById('cart-final-price').textContent = finalPrice.toLocaleString('ru-RU') + ' руб.';

        // Рендерим товары в корзине
        if (cart.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-cart-x" style="font-size: 3rem;"></i>
                    <h4 class="mt-3">Корзина пуста</h4>
                    <p class="mb-4">Добавьте товары из каталога</p>
                    <button class="btn btn-primary" onclick="showCatalog()">
                        <i class="bi bi-arrow-left"></i> Перейти в каталог
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = cart.map(item => {
            const itemTotal = item.discountPrice * item.quantity;
            const maxQuantity = Math.min(item.В_наличии, 99);

            return `
                <div class="cart-item animate__animated animate__fadeIn">
                    <div class="row align-items-center">
                        <div class="col-3 col-md-2">
                            <img src="${item.Фото || 'images/default.jpg'}" class="img-fluid rounded" 
                                 alt="${item.Модель}" 
                                 onerror="this.onerror=null; this.src='images/default.jpg'"
                                 style="max-height: 80px; object-fit: contain;">
                        </div>
                        <div class="col-9 col-md-4">
                            <h6 class="mb-1">${item.Модель}</h6>
                            <div class="text-muted small">Артикул: ${item.Артикул}</div>
                            <div class="mt-1">
                                ${item.Мощность ? `<span class="badge bg-primary me-1">${item.Мощность} кВт</span>` : ''}
                                ${item.Контуры ? `<span class="badge bg-secondary me-1">${item.Контуры}</span>` : ''}
                            </div>
                        </div>
                        <div class="col-6 col-md-2 mt-2 mt-md-0">
                            <div class="fw-bold text-primary">${item.discountPrice.toLocaleString('ru-RU')} руб.</div>
                            ${currentDiscount > 0 ? `
                                <small class="text-muted text-decoration-line-through">
                                    ${item.Цена.toLocaleString('ru-RU')} руб.
                                </small>
                            ` : ''}
                        </div>
                        <div class="col-6 col-md-2 mt-2 mt-md-0">
                            <div class="quantity-control d-flex align-items-center">
                                <button class="btn btn-sm btn-outline-secondary quantity-btn" 
                                        onclick="updateCartItem('${item.Артикул}', ${item.quantity - 1})"
                                        ${item.quantity <= 1 ? 'disabled' : ''}>
                                    <i class="bi bi-dash"></i>
                                </button>
                                <input type="number" class="form-control form-control-sm quantity-input mx-1" 
                                       value="${item.quantity}" 
                                       onchange="updateCartItem('${item.Артикул}', this.value)" 
                                       min="1" max="${maxQuantity}"
                                       style="width: 50px; text-align: center;">
                                <button class="btn btn-sm btn-outline-secondary quantity-btn" 
                                        onclick="updateCartItem('${item.Артикул}', ${item.quantity + 1})"
                                        ${item.quantity >= maxQuantity ? 'disabled' : ''}>
                                    <i class="bi bi-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="col-6 col-md-2 mt-2 mt-md-0 text-end">
                            <div class="fw-bold mb-1">${itemTotal.toLocaleString('ru-RU')} руб.</div>
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="removeFromCart('${item.Артикул}')"
                                    title="Удалить из корзины">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Ошибка при обновлении корзины:', error);
        showNotification('Ошибка при отображении корзины', 'error');
    }
}

// Отправка запроса (счет или КП)
function sendRequest(type) {
    try {
        if (cart.length === 0) {
            showNotification('Корзина пуста', 'warning');
            return;
        }

        const requestType = type === 'invoice' ? 'Счёт' : 'Коммерческое предложение';
        
        // Формируем сообщение
        let message = `Запрос ${requestType}\n\n`;
        message += `Товары в корзине:\n`;
        message += cart.map(item => 
            `• ${item.Модель} (${item.Артикул}) - ${item.quantity} шт. x ${item.discountPrice} руб. = ${(item.discountPrice * item.quantity).toLocaleString('ru-RU')} руб.`
        ).join('\n');
        
        message += `\n\nИтого: ${document.getElementById('cart-final-price').textContent}`;
        message += `\n\nДата: ${new Date().toLocaleString('ru-RU')}`;

        // В реальном приложении здесь был бы AJAX-запрос на сервер
        console.log('Отправка запроса:', message);
        
        // Показываем уведомление об успехе
        showNotification(`Запрос ${requestType} отправлен! Менеджер свяжется с вами в ближайшее время.`, 'success');
        
        // Очищаем корзину после отправки
        clearCart();

    } catch (error) {
        console.error('Ошибка при отправке запроса:', error);
        showNotification('Ошибка при отправке запроса', 'error');
    }
}

// Очистка корзины
function clearCart() {
    cart = [];
    updateCartBadge();
    updateCart();
    renderProducts();
    
    // Очищаем хранилище
    if (typeof cartStorage !== 'undefined' && typeof cartStorage.clearCart === 'function') {
        cartStorage.clearCart();
    }
    
    showNotification('Корзина очищена', 'info');
}

// Вспомогательная функция для расчета цены со скидкой
function calculateDiscountPrice(price, discount) {
    return Math.round(price * (1 - discount / 100));
}

// Делаем функции глобальными
window.addToCart = addToCart;
window.updateCartItem = updateCartItem;
window.removeFromCart = removeFromCart;
window.updateCartBadge = updateCartBadge;
window.updateCart = updateCart;
window.sendRequest = sendRequest;
window.clearCart = clearCart;

console.log('Функции корзины загружены');