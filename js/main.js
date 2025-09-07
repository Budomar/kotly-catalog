// js/main.js - Основной файл приложения

// Глобальные переменные
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 1000;
let currentDiscount = 0;
let showOriginalPrices = true;
let cart = [];

// Основная функция загрузки данных
async function loadData() {
    try {
        showLoading(true);
        const response = await fetch('data.json');
        allProducts = await response.json();
        
        // Исправляем определение контуров
        allProducts = allProducts.map(product => {
            const model = product.Модель;
            
            if (model.includes(' C ') || model.includes(' C\n') || 
                model.endsWith(' C') || model.includes('(C)') ||
                model.includes(' С ') || model.includes(' С\n') || 
                model.endsWith(' С') || model.includes('(С)')) {
                product.Контуры = "Двухконтурный";
            } else if (model.includes(' H ') || model.includes(' H\n') || 
                      model.endsWith(' H') || model.includes('(H)') ||
                      model.includes(' Н ') || model.includes(' Н\n') || 
                      model.endsWith(' Н') || model.includes('(Н)')) {
                product.Контуры = "Одноконтурный";
            }
            return product;
        });
        
        // Инициализируем модули после загрузки данных
        initModules();
        
        updateStatistics();
        filterProducts();
        showLoading(false);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showLoading(false);
        document.getElementById('products-container').innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Не удалось загрузить данные
                </div>
            </div>
        `;
    }
}

// Функции интерфейса
function showLoading(show) {
    const container = document.getElementById('products-container');
    if (show) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="d-flex justify-content-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                </div>
            </div>
        `;
    }
}

function updateStatistics() {
    document.getElementById('product-count').textContent = `Найдено ${filteredProducts.length} товаров`;
}

// Функции скидок
function calculateDiscountPrice(price, discount) {
    return Math.round(price * (1 - discount / 100));
}

function updateDiscount(value) {
    value = Math.max(0, Math.min(50, parseInt(value) || 0));
    document.getElementById('discount-slider').value = value;
    document.getElementById('discount-input').value = value;
    document.getElementById('discount-value').textContent = value;
    currentDiscount = value;
    
    if (document.getElementById('auto-apply').checked) {
        renderProducts();
    }
}

function toggleOriginalPrices() {
    showOriginalPrices = document.getElementById('show-original').checked;
    renderProducts();
}

// Функции фильтрации и сортировки
function filterProducts() {
    const searchText = document.getElementById('search-input').value.toLowerCase();
    const powerFilter = document.getElementById('power-filter').value;
    const contourFilter = document.getElementById('contour-filter').value;
    const wifiFilter = document.getElementById('wifi-filter').value;
    const stockFilter = document.getElementById('stock-filter').value;
    
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.Модель.toLowerCase().includes(searchText) || 
                            product.Артикул.toLowerCase().includes(searchText);
        const matchesPower = !powerFilter || product.Мощность === powerFilter;
        const matchesContour = !contourFilter || product.Контуры === contourFilter;
        const matchesWifi = !wifiFilter || product.WiFi === wifiFilter;
        const matchesStock = !stockFilter || 
            (stockFilter === 'available' && product.В_наличии > 0) ||
            (stockFilter === 'outofstock' && product.В_наличии === 0);
        
        return matchesSearch && matchesPower && matchesContour && matchesWifi && matchesStock;
    });
    
    currentPage = 1;
    sortProducts();
}

function sortProducts() {
    const sortOption = document.getElementById('sort-select').value;
    
    filteredProducts.sort((a, b) => {
        switch (sortOption) {
            case 'name-asc': return a.Модель.localeCompare(b.Модель);
            case 'name-desc': return b.Модель.localeCompare(a.Модель);
            case 'price-asc': return a.Цена - b.Цена;
            case 'price-desc': return b.Цена - a.Цена;
            case 'stock-desc': return b.В_наличии - a.В_наличии;
            case 'power-asc': return (parseInt(a.Мощность) || 0) - (parseInt(b.Мощность) || 0);
            case 'power-desc': return (parseInt(b.Мощность) || 0) - (parseInt(a.Мощность) || 0);
            default: return 0;
        }
    });
    
    renderProducts();
}

// Рендеринг товаров
function renderProducts() {
    const container = document.getElementById('products-container');
    const productsToShow = filteredProducts.slice(
        (currentPage - 1) * productsPerPage, 
        currentPage * productsPerPage
    );
    
    if (productsToShow.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> Товары не найдены
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = productsToShow.map(product => {
        const discountPrice = calculateDiscountPrice(product.Цена, currentDiscount);
        const hasDiscount = currentDiscount > 0;
        const inCart = cart.find(item => item.Артикул === product.Артикул);
        
        return `
            <div class="col">
                <div class="card h-100">
                    <img src="${product.Фото}" class="card-img-top product-img" 
                         alt="${product.Модель}" 
                         onerror="this.onerror=null; this.src='images/default.jpg'">
                    <div class="card-body">
                        <div class="product-article">Артикул: ${product.Артикул}</div>
                        <h5 class="card-title">${product.Модель}</h5>
                        
                        <div class="mb-2">
                            <span class="badge bg-primary">${product.Мощность} кВт</span>
                            ${product.Контуры === 'Двухконтурный' ? 
                                '<span class="badge bg-danger">Двухконтурный</span>' : 
                                '<span class="badge bg-secondary">Одноконтурный</span>'}
                            ${product.WiFi === 'Да' ? '<span class="badge bg-success">Wi-Fi</span>' : ''}
                        </div>
                        
                        <div class="price-section">
                            ${hasDiscount ? `
                                ${showOriginalPrices ? `<div class="original-price">${product.Цена.toLocaleString('ru-RU')} руб.</div>` : ''}
                                <div class="discount-price">${discountPrice.toLocaleString('ru-RU')} руб.</div>
                                <small class="text-success">Экономия ${currentDiscount}%</small>
                            ` : `
                                <div class="current-price">${product.Цена.toLocaleString('ru-RU')} руб.</div>
                            `}
                        </div>
                        
                        <div class="card-footer-section">
                            <div class="stock-status ${product.В_наличии > 0 ? 'in-stock' : 'out-of-stock'}">
                                <i class="bi ${product.В_наличии > 0 ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i>
                                ${product.В_наличии > 0 ? `${product.В_наличии} шт.` : 'Под заказ'}
                            </div>
                            ${product.В_наличии > 0 ? `
                                <div class="d-flex align-items-center">
                                    <div class="product-quantity">
                                        <input type="number" class="product-quantity-input" id="quantity-${product.Артикул}" value="1" min="1" max="${product.В_наличии}">
                                    </div>
                                    <button class="btn btn-sm ${inCart ? 'btn-success' : 'btn-outline-primary'}" 
                                            onclick="addToCart('${product.Артикул}')">
                                        <i class="bi ${inCart ? 'bi-check' : 'bi-cart-plus'}"></i>
                                        ${inCart ? 'В корзине' : 'В корзину'}
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем чекбоксы сравнения
    if (typeof comparisonModule !== 'undefined') {
        comparisonModule.addCheckboxesToProducts();
    }
    
    updateStatistics();
}

// Навигация
function showCatalog() {
    document.getElementById('catalog-section').classList.remove('hidden-section');
    document.getElementById('cart-section').classList.add('hidden-section');
}

function showCart() {
    document.getElementById('catalog-section').classList.add('hidden-section');
    document.getElementById('cart-section').classList.remove('hidden-section');
    updateCart();
}

// Уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
    notification.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span>${message}</span>
            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    
    // Адаптивность для мобильных
    if (window.innerWidth < 769) {
        document.getElementById('filter-accordion-body').classList.remove('show');
        document.getElementById('discount-accordion-body').classList.remove('show');
        document.getElementById('filter-section').classList.add('collapsed');
        document.getElementById('discount-section').classList.add('collapsed');
    }
});

// Обработчик изменения размера окна
window.addEventListener('resize', function() {
    if (window.innerWidth >= 769) {
        document.getElementById('filter-accordion-body').classList.add('show');
        document.getElementById('discount-accordion-body').classList.add('show');
        document.getElementById('filter-section').classList.remove('collapsed');
        document.getElementById('discount-section').classList.remove('collapsed');
    }
});

// Глобальные функции для HTML
function toggleFilters() {
    const accordionBody = document.getElementById('filter-accordion-body');
    const accordionSection = document.getElementById('filter-section');
    accordionBody.classList.toggle('show');
    accordionSection.classList.toggle('collapsed');
}

function toggleDiscounts() {
    const accordionBody = document.getElementById('discount-accordion-body');
    const accordionSection = document.getElementById('discount-section');
    accordionBody.classList.toggle('show');
    accordionSection.classList.toggle('collapsed');
}

// Функция проверки хранилища
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

// Инициализация модулей
async function initModules() {
    // Проверяем доступность localStorage
    if (!checkStorageStatus()) {
        console.warn('LocalStorage недоступен. Функции сохранения отключены.');
    }

    // Инициализируем модуль сравнения
    if (typeof comparisonModule !== 'undefined') {
        comparisonModule.init();
    }

    // Инициализируем модуль сохранения корзины
    if (typeof cartStorage !== 'undefined') {
        cartStorage.init();
    }

    // Инициализируем модуль мини-корзины
    if (typeof miniCart !== 'undefined') {
        miniCart.init();
    }

    // Инициализируем систему рекомендаций
    if (typeof recommendationsSystem !== 'undefined') {
        recommendationsSystem.init();
    }

    // Инициализируем touch-интерфейс
    if (typeof touchInterface !== 'undefined') {
        touchInterface.init();
    }

    // Инициализируем систему уведомлений
    if (typeof notificationSystem !== 'undefined') {
        await notificationSystem.init();
    }
}