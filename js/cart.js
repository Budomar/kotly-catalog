// js/cart.js - Функции корзины
function addToCart(article) {
    const product = allProducts.find(p => p.Артикул === article);
    if (!product) return false;

    const quantityInput = document.getElementById(`quantity-${article}`);
    const quantity = Math.max(1, Math.min(product.В_наличии, parseInt(quantityInput.value) || 1));

    const existingItem = cart.find(item => item.Артикул === article);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            ...product,
            quantity: quantity,
            discountPrice: calculateDiscountPrice(product.Цена, currentDiscount)
        });
    }
    
    updateCartBadge();
    renderProducts();
    showNotification(`Товар добавлен в корзину (${quantity} шт.)`, 'success');
    
    return true;
}

function updateCartItem(article, quantity) {
    const item = cart.find(item => item.Артикул === article);
    if (item) {
        item.quantity = Math.max(1, parseInt(quantity) || 1);
        updateCart();
    }
}

function removeFromCart(article) {
    cart = cart.filter(item => item.Артикул !== article);
    updateCartBadge();
    updateCart();
    renderProducts();
}

function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-badge').textContent = totalItems;
}

function updateCart() {
    const container = document.getElementById('cart-items-container');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.Цена * item.quantity), 0);
    const totalDiscount = cart.reduce((sum, item) => sum + ((item.Цена - item.discountPrice) * item.quantity), 0);
    const finalPrice = totalPrice - totalDiscount;

    document.getElementById('cart-total-items').textContent = totalItems;
    document.getElementById('cart-total-price').textContent = totalPrice.toLocaleString('ru-RU') + ' руб.';
    document.getElementById('cart-total-discount').textContent = totalDiscount.toLocaleString('ru-RU') + ' руб.';
    document.getElementById('cart-final-price').textContent = finalPrice.toLocaleString('ru-RU') + ' руб.';

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-cart-x" style="font-size: 3rem;"></i>
                <p class="mt-3">Корзина пуста</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="row align-items-center">
                <div class="col-md-2">
                    <img src="${item.Фото}" class="img-fluid rounded" 
                         alt="${item.Модель}" 
                         onerror="this.onerror=null; this.src='images/default.jpg'">
                </div>
                <div class="col-md-4">
                    <h6>${item.Модель}</h6>
                    <div class="text-muted">Артикул: ${item.Артикул}</div>
                </div>
                <div class="col-md-2">
                    <div class="fw-bold">${item.discountPrice.toLocaleString('ru-RU')} руб.</div>
                    ${currentDiscount > 0 ? `
                        <small class="text-muted text-decoration-line-through">
                            ${item.Цена.toLocaleString('ru-RU')} руб.
                        </small>
                    ` : ''}
                </div>
                <div class="col-md-2">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateCartItem('${item.Артикул}', ${item.quantity - 1})">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" 
                               onchange="updateCartItem('${item.Артикул}', this.value)" min="1">
                        <button class="quantity-btn" onclick="updateCartItem('${item.Артикул}', ${item.quantity + 1})">+</button>
                    </div>
                </div>
                <div class="col-md-2 text-end">
                    <div class="fw-bold mb-2">${(item.discountPrice * item.quantity).toLocaleString('ru-RU')} руб.</div>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart('${item.Артикул}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function sendRequest(type) {
    if (cart.length === 0) {
        showNotification('Корзина пуста', 'warning');
        return;
    }

    const requestType = type === 'invoice' ? 'Счёт' : 'КП';
    const message = `Запрос ${requestType} на следующие товары:\n\n` +
        cart.map(item => 
            `${item.Модель} (Артикул: ${item.Артикул}) - ${item.quantity} шт. x ${item.discountPrice} руб. = ${(item.discountPrice * item.quantity).toLocaleString('ru-RU')} руб.`
        ).join('\n') +
        `\n\nИтого: ${document.getElementById('cart-final-price').textContent}`;

    showNotification(`Запрос ${requestType} отправлен!`, 'success');
    
    cart = [];
    updateCartBadge();
    updateCart();
    renderProducts();
}