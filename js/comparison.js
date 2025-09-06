// modules/comparison.js - Модуль сравнения товаров
class ComparisonModule {
    constructor() {
        this.maxItems = 4;
        this.comparedItems = [];
        this.notificationTimeout = null;
    }

    init() {
        this.loadFromStorage();
        this.updateBadge();
        this.setupEventListeners();
        console.log('Модуль сравнения инициализирован');
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('productComparison');
            if (saved) {
                this.comparedItems = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Ошибка загрузки сравнения:', error);
            this.comparedItems = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('productComparison', JSON.stringify(this.comparedItems));
        } catch (error) {
            console.error('Ошибка сохранения сравнения:', error);
        }
    }

    updateBadge() {
        const badge = document.getElementById('compare-badge');
        if (badge) {
            badge.textContent = this.comparedItems.length;
            badge.style.display = this.comparedItems.length > 0 ? 'flex' : 'none';
        }
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('compare-checkbox')) {
                const article = e.target.dataset.article;
                if (article) {
                    this.addToComparison(article);
                }
            }

            if (e.target.classList.contains('compare-remove')) {
                const article = e.target.dataset.article;
                if (article) {
                    this.removeFromComparison(article);
                }
            }
        });
    }

    addCheckboxesToProducts() {
        setTimeout(() => {
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                const article = card.querySelector('.product-article');
                if (article) {
                    const articleText = article.textContent.replace('Артикул: ', '').trim();
                    if (!card.querySelector('.compare-checkbox')) {
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'compare-checkbox';
                        checkbox.dataset.article = articleText;
                        checkbox.checked = this.comparedItems.includes(articleText);
                        card.style.position = 'relative';
                        card.appendChild(checkbox);
                    }
                }
            });
        }, 100);
    }

    addToComparison(productArticle) {
        if (this.comparedItems.length >= this.maxItems) {
            this.showNotification(`Можно сравнивать не более ${this.maxItems} товаров`, 'warning');
            return false;
        }

        if (this.comparedItems.includes(productArticle)) {
            this.removeFromComparison(productArticle);
            return false;
        }

        const product = allProducts.find(p => p.Артикул === productArticle);
        if (!product) {
            this.showNotification('Товар не найден', 'error');
            return false;
        }

        this.comparedItems.push(productArticle);
        this.saveToStorage();
        this.updateBadge();
        this.updateProductCheckbox(productArticle, true);

        this.showNotification(
            `Товар добавлен к сравнению (${this.comparedItems.length}/${this.maxItems})`, 
            'success'
        );

        return true;
    }

    removeFromComparison(productArticle) {
        this.comparedItems = this.comparedItems.filter(item => item !== productArticle);
        this.saveToStorage();
        this.updateBadge();
        this.updateProductCheckbox(productArticle, false);
        this.showNotification('Товар удален из сравнения', 'info');
    }

    clearComparison() {
        this.comparedItems.forEach(article => {
            this.updateProductCheckbox(article, false);
        });

        this.comparedItems = [];
        this.saveToStorage();
        this.updateBadge();

        const modal = bootstrap.Modal.getInstance(document.getElementById('compareModal'));
        if (modal) {
            modal.hide();
        }

        this.showNotification('Сравнение очищено', 'info');
    }

    updateProductCheckbox(article, checked) {
        const checkbox = document.querySelector(`.compare-checkbox[data-article="${article}"]`);
        if (checkbox) {
            checkbox.checked = checked;
        }
    }

    showComparison() {
        if (this.comparedItems.length === 0) {
            this.showNotification('Добавьте товары для сравнения', 'warning');
            return;
        }

        const productsToCompare = this.comparedItems.map(article => 
            allProducts.find(p => p.Артикул === article)
        ).filter(Boolean);

        if (productsToCompare.length === 0) {
            this.showNotification('Товары для сравнения не найдены', 'error');
            return;
        }

        this.renderComparisonTable(productsToCompare);
        const modal = new bootstrap.Modal(document.getElementById('compareModal'));
        modal.show();
    }

    renderComparisonTable(products) {
        const container = document.getElementById('compare-container');
        
        if (products.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4">Нет товаров для сравнения</p>';
            return;
        }

        const features = [
            { name: 'Изображение', key: 'image' },
            { name: 'Модель', key: 'Модель' },
            { name: 'Цена', key: 'Цена' },
            { name: 'Мощность', key: 'Мощность' },
            { name: 'Контуры', key: 'Контуры' },
            { name: 'Wi-Fi', key: 'WiFi' },
            { name: 'Наличие', key: 'В_наличии' }
        ];

        let html = `
            <div class="table-responsive">
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th>Характеристика</th>
                            ${products.map(product => `
                                <th class="compare-product">
                                    <div class="text-center">
                                        <img src="${product.Фото}" alt="${product.Модель}" 
                                             onerror="this.onerror=null; this.src='images/default.jpg'" 
                                             class="img-fluid mb-2">
                                        <div>${product.Модель}</div>
                                        <small class="text-muted">Арт: ${product.Артикул}</small>
                                        <div class="mt-2">
                                            <span class="compare-remove" data-article="${product.Артикул}" 
                                                  title="Удалить из сравнения">
                                                <i class="bi bi-x-circle"></i>
                                            </span>
                                        </div>
                                    </div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        features.forEach(feature => {
            html += `<tr><td class="compare-feature">${feature.name}</td>`;
            
            products.forEach(product => {
                let value = '';
                
                if (feature.key === 'image') {
                    value = `<img src="${product.Фото}" alt="${product.Модель}" 
                                 onerror="this.onerror=null; this.src='images/default.jpg'"
                                 style="max-height: 60px;">`;
                } else if (feature.key === 'Цена') {
                    value = `${product[feature.key].toLocaleString('ru-RU')} руб.`;
                } else if (feature.key === 'В_наличии') {
                    value = product[feature.key] > 0 ? 
                           `<span class="text-success">${product[feature.key]} шт.</span>` : 
                           '<span class="text-danger">Под заказ</span>';
                } else {
                    value = product[feature.key] || '—';
                }
                
                html += `<td class="compare-value">${value}</td>`;
            });
            
            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <small class="text-muted">
                    <i class="bi bi-info-circle"></i> 
                    Для добавления товаров в сравнение отметьте чекбоксы на карточках товаров
                </small>
            </div>
        `;

        container.innerHTML = html;
    }

    showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.compare-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `compare-notification ${type}`;
        notification.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${message}</span>
                <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        document.body.appendChild(notification);

        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
}

// Создаем экземпляр модуля
const comparisonModule = new ComparisonModule();

// Глобальные функции для HTML
function showComparison() {
    comparisonModule.showComparison();
}

function clearComparison() {
    comparisonModule.clearComparison();
}

function addToComparison(article) {
    comparisonModule.addToComparison(article);
}