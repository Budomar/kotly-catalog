// modules/notifications.js - Система push-уведомлений
class NotificationSystem {
    constructor() {
        this.permission = null;
        this.notifications = [];
        this.isSupported = 'Notification' in window;
        this.serviceWorkerRegistered = false;
        this.subscription = null;
        this.notificationSettings = {
            stock: true,
            price: true,
            promotions: true,
            orders: true,
            system: true
        };
    }

    // Инициализация модуля
    async init() {
        if (!this.isSupported) {
            console.warn('Уведомления не поддерживаются браузером');
            return;
        }

        this.loadSettings();
        this.setupEventListeners();
        this.checkPermission();
        await this.registerServiceWorker();
        
        console.log('Система уведомлений инициализирована');
    }

    // Загрузка настроек из localStorage
    loadSettings() {
        try {
            const saved = localStorage.getItem('notificationSettings');
            if (saved) {
                this.notificationSettings = { ...this.notificationSettings, ...JSON.parse(saved) };
            }
            
            const savedNotifications = localStorage.getItem('userNotifications');
            if (savedNotifications) {
                this.notifications = JSON.parse(savedNotifications);
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек уведомлений:', error);
        }
    }

    // Сохранение настроек в localStorage
    saveSettings() {
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
            localStorage.setItem('userNotifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Ошибка сохранения настроек уведомлений:', error);
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчики для настроек уведомлений
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('notification-toggle')) {
                const setting = e.target.dataset.setting;
                const enabled = e.target.checked;
                
                this.notificationSettings[setting] = enabled;
                this.saveSettings();
                
                this.showPushNotification(
                    'Настройки уведомлений',
                    `Уведомления ${enabled ? 'включены' : 'отключены'} для ${this.getSettingName(setting)}`,
                    enabled ? 'success' : 'warning'
                );
            }
        });

        // Обработчик для кнопки разрешения уведомлений
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('enable-notifications')) {
                this.requestPermission();
            } else if (e.target.classList.contains('later-notifications')) {
                this.hidePermissionRequest();
            }
        });

        // Отслеживание изменений наличия товаров
        this.setupStockMonitoring();
    }

    // Проверка разрешения на уведомления
    checkPermission() {
        this.permission = Notification.permission;
        
        if (this.permission === 'default') {
            this.showPermissionRequest();
        } else if (this.permission === 'granted') {
            this.hidePermissionRequest();
        }
    }

    // Запрос разрешения на уведомления
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                this.hidePermissionRequest();
                this.showPushNotification('Уведомления включены', 'Теперь вы будете получать уведомления о акциях и наличии товаров', 'success');
                
                // Подписываемся на push-уведомления
                await this.subscribeToPush();
            } else {
                this.showPushNotification('Доступ запрещен', 'Вы можете включить уведомления в настройках браузера', 'warning');
            }
        } catch (error) {
            console.error('Ошибка запроса разрешения:', error);
        }
    }

    // Регистрация Service Worker
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            this.serviceWorkerRegistered = true;
            console.log('Service Worker зарегистрирован:', registration);
            
            // Проверяем подписку на push-уведомления
            await this.checkPushSubscription();
        } catch (error) {
            console.error('Ошибка регистрации Service Worker:', error);
        }
    }

    // Подписка на push-уведомления
    async subscribeToPush() {
        if (!this.serviceWorkerRegistered) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            this.subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U')
            });
            
            // Отправляем подписку на сервер
            await this.sendSubscriptionToServer(this.subscription);
            
        } catch (error) {
            console.error('Ошибка подписки на push-уведомления:', error);
        }
    }

    // Проверка push-подписки
    async checkPushSubscription() {
        if (!this.serviceWorkerRegistered) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            this.subscription = await registration.pushManager.getSubscription();
            
            if (this.subscription) {
                console.log('Подписка на push-уведомления активна');
            }
        } catch (error) {
            console.error('Ошибка проверки подписки:', error);
        }
    }

    // Отправка подписки на сервер
    async sendSubscriptionToServer(subscription) {
        try {
            // Здесь будет отправка на ваш сервер
            console.log('Подписка отправлена на сервер:', subscription);
            
            // В демо-режиме просто сохраняем в localStorage
            localStorage.setItem('pushSubscription', JSON.stringify(subscription));
            
        } catch (error) {
            console.error('Ошибка отправки подписки:', error);
        }
    }

    // Мониторинг наличия товаров
    setupStockMonitoring() {
        let previousStock = {};

        // Сохраняем текущее наличие при загрузке
        if (allProducts && allProducts.length > 0) {
            allProducts.forEach(product => {
                previousStock[product.Артикул] = product.В_наличии;
            });
        }

        // Перехватываем обновление данных
        const originalLoadData = window.loadData;
        window.loadData = async () => {
            await originalLoadData();
            this.checkStockChanges(previousStock);
            
            // Обновляем предыдущее состояние
            allProducts.forEach(product => {
                previousStock[product.Артикул] = product.В_наличии;
            });
        };
    }

    // Проверка изменений наличия
    checkStockChanges(previousStock) {
        if (!allProducts || !this.notificationSettings.stock) return;

        allProducts.forEach(product => {
            const previous = previousStock[product.Артикул] || 0;
            const current = product.В_наличии;

            if (previous === 0 && current > 0) {
                // Товар появился в наличии
                this.showStockNotification(product, current);
            } else if (previous > 0 && current === 0) {
                // Товар закончился
                this.showOutOfStockNotification(product);
            } else if (previous > 0 && current > previous + 5) {
                // Большая поставка
                this.showRestockNotification(product, current);
            }
        });
    }

    // Показ уведомления о появлении в наличии
    showStockNotification(product, quantity) {
        if (!this.notificationSettings.stock) return;

        const message = `${product.Модель} теперь в наличии! ${quantity} шт.`;
        
        this.addNotification({
            type: 'stock',
            title: 'Товар в наличии',
            message: message,
            productId: product.Артикул,
            timestamp: new Date().getTime(),
            read: false
        });

        this.showPushNotification('Товар в наличии', message, 'success');
    }

    // Показ уведомления о окончании товара
    showOutOfStockNotification(product) {
        if (!this.notificationSettings.stock) return;

        const message = `${product.Модель} закончился на складе`;
        
        this.addNotification({
            type: 'stock',
            title: 'Товар закончился',
            message: message,
            productId: product.Артикул,
            timestamp: new Date().getTime(),
            read: false
        });

        this.showPushNotification('Товар закончился', message, 'warning');
    }

    // Показ уведомления о пополнении склада
    showRestockNotification(product, quantity) {
        if (!this.notificationSettings.stock) return;

        const message = `${product.Модель} - большая поставка! ${quantity} шт.`;
        
        this.addNotification({
            type: 'stock',
            title: 'Поставка товара',
            message: message,
            productId: product.Артикул,
            timestamp: new Date().getTime(),
            read: false
        });

        this.showPushNotification('Поставка товара', message, 'success');
    }

    // Показ уведомления об акции
    showPromotionNotification(title, message) {
        if (!this.notificationSettings.promotions) return;

        this.addNotification({
            type: 'promotion',
            title: title,
            message: message,
            timestamp: new Date().getTime(),
            read: false
        });

        this.showPushNotification(title, message, 'success');
    }

    // Добавление уведомления в историю
    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // Ограничиваем историю 100 уведомлениями
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }
        
        this.saveSettings();
        this.updateNotificationBadge();
        this.renderNotificationsDropdown();
    }

    // Показ push-уведомления
    showPushNotification(title, message, type = 'info') {
        if (this.permission !== 'granted') return;

        // Показываем браузерное уведомление
        if (this.isSupported) {
            const notification = new Notification(title, {
                body: message,
                icon: '/images/logo.png',
                tag: 'laggartt-notification',
                requireInteraction: false
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
        }

        // Показываем внутреннее уведомление
        this.showInternalNotification(title, message, type);
    }

    // Показ внутреннего уведомления
    showInternalNotification(title, message, type) {
        const notification = document.createElement('div');
        notification.className = `push-notification ${type}`;
        notification.innerHTML = `
            <div class="push-notification-content">
                <div class="push-notification-icon">
                    <i class="bi ${this.getNotificationIcon(type)}"></i>
                </div>
                <div class="push-notification-info">
                    <div class="push-notification-title">${title}</div>
                    <div class="push-notification-message">${message}</div>
                </div>
                <button class="push-notification-close">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Обработчик закрытия
        notification.querySelector('.push-notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Показываем уведомление
        setTimeout(() => notification.classList.add('visible'), 100);

        // Автоматическое скрытие
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Получение иконки для типа уведомления
    getNotificationIcon(type) {
        const icons = {
            info: 'bi-info-circle',
            success: 'bi-check-circle',
            warning: 'bi-exclamation-circle',
            error: 'bi-x-circle'
        };
        return icons[type] || 'bi-bell';
    }

    // Получение названия настройки
    getSettingName(setting) {
        const names = {
            stock: 'наличие товаров',
            price: 'изменение цен',
            promotions: 'акции и скидки',
            orders: 'статус заказов',
            system: 'системные уведомления'
        };
        return names[setting] || setting;
    }

    // Показ запроса разрешения
    showPermissionRequest() {
        const existingRequest = document.querySelector('.notification-permission');
        if (existingRequest) return;

        const request = document.createElement('div');
        request.className = 'notification-permission';
        request.innerHTML = `
            <div class="notification-permission-content">
                <div class="notification-permission-header">
                    <div class="notification-permission-icon">
                        <i class="bi bi-bell"></i>
                    </div>
                    <h3 class="notification-permission-title">Разрешить уведомления?</h3>
                </div>
                <p class="notification-permission-text">
                    Получайте уведомления о наличии товаров, акциях и статусе заказов
                </p>
                <div class="notification-permission-actions">
                    <button class="notification-permission-btn secondary later-notifications">
                        Позже
                    </button>
                    <button class="notification-permission-btn primary enable-notifications">
                        Разрешить
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(request);
        setTimeout(() => request.classList.add('visible'), 100);
    }

    // Скрытие запроса разрешения
    hidePermissionRequest() {
        const request = document.querySelector('.notification-permission');
        if (request) {
            request.remove();
        }
    }

    // Обновление бейджа уведомлений
    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.querySelector('.notification-badge');
        const bell = document.querySelector('.notification-nav-btn');

        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }

        if (bell) {
            bell.classList.toggle('has-notifications', unreadCount > 0);
        }
    }

    // Рендер выпадающего списка уведомлений
    renderNotificationsDropdown() {
        const dropdown = document.querySelector('.notification-dropdown-body');
        if (!dropdown) return;

        const unreadNotifications = this.notifications.filter(n => !n.read);
        const recentNotifications = this.notifications.slice(0, 10);

        dropdown.innerHTML = recentNotifications.length > 0 ? 
            recentNotifications.map(notification => `
                <div class="notification-dropdown-item ${notification.read ? '' : 'unread'}" 
                     onclick="notificationSystem.markAsRead('${notification.timestamp}')">
                    <div class="notification-dropdown-content">
                        <div class="notification-dropdown-icon">
                            <i class="bi ${this.getNotificationIcon(notification.type)}"></i>
                        </div>
                        <div class="notification-dropdown-text">
                            <div class="notification-dropdown-message">${notification.message}</div>
                            <div class="notification-dropdown-time">${this.formatTime(notification.timestamp)}</div>
                        </div>
                    </div>
                </div>
            `).join('') : `
                <div class="notification-dropdown-item">
                    <div class="notification-dropdown-content">
                        <div class="notification-dropdown-text">
                            <div class="notification-dropdown-message">Нет уведомлений</div>
                        </div>
                    </div>
                </div>
            `;
    }

    // Форматирование времени
    formatTime(timestamp) {
        const now = new Date().getTime();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'только что';
        if (minutes < 60) return `${minutes} мин назад`;
        if (hours < 24) return `${hours} ч назад`;
        if (days < 7) return `${days} дн назад`;
        
        return new Date(timestamp).toLocaleDateString('ru-RU');
    }

    // Отметка как прочитанное
    markAsRead(timestamp) {
        const notification = this.notifications.find(n => n.timestamp == timestamp);
        if (notification) {
            notification.read = true;
            this.saveSettings();
            this.updateNotificationBadge();
            this.renderNotificationsDropdown();
        }
    }

    // Отметка все как прочитанные
    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.saveSettings();
        this.updateNotificationBadge();
        this.renderNotificationsDropdown();
    }

    // Вспомогательная функция для преобразования ключа
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Создание UI для уведомлений
    createNotificationUI() {
        // Создаем кнопку уведомлений в навигации
        const navItem = document.createElement('div');
        navItem.className = 'notification-nav-item';
        navItem.innerHTML = `
            <button class="notification-nav-btn" onclick="notificationSystem.toggleNotifications()">
                <i class="bi bi-bell"></i>
                <span class="notification-badge" style="display: none;">0</span>
            </button>
            <div class="notification-dropdown">
                <div class="notification-dropdown-header">
                    <h4 class="notification-dropdown-title">Уведомления</h4>
                    <button class="notification-dropdown-clear" onclick="notificationSystem.markAllAsRead()">
                        Очистить
                    </button>
                </div>
                <div class="notification-dropdown-body"></div>
                <div class="notification-dropdown-footer">
                    <a href="#" class="notification-dropdown-view-all">Все уведомления</a>
                </div>
            </div>
        `;

        // Добавляем в навигацию
        const navbar = document.querySelector('.navbar-nav');
        if (navbar) {
            navbar.appendChild(navItem);
        }

        // Рендерим уведомления
        this.renderNotificationsDropdown();
        this.updateNotificationBadge();
    }

    // Переключение отображения уведомлений
    toggleNotifications() {
        const dropdown = document.querySelector('.notification-dropdown');
        dropdown.classList.toggle('visible');
        
        // Отмечаем все как прочитанные при открытии
        if (dropdown.classList.contains('visible')) {
            this.markAllAsRead();
        }
    }

    // Создание секции настроек уведомлений
    createSettingsSection() {
        const settingsSection = document.createElement('div');
        settingsSection.className = 'notification-settings';
        settingsSection.innerHTML = `
            <div class="notification-settings-header">
                <h3 class="notification-settings-title">
                    <i class="bi bi-bell"></i>
                    Настройки уведомлений
                </h3>
            </div>
            <div class="notification-settings-grid">
                <div class="notification-setting-group">
                    <h4 class="notification-setting-title">
                        <i class="bi bi-box-seam"></i>
                        Товары
                    </h4>
                    <div class="notification-setting-item">
                        <div class="notification-setting-label">
                            <div class="notification-setting-name">Наличие товаров</div>
                            <div class="notification-setting-desc">Уведомлять о поступлении товаров</div>
                        </div>
                        <label class="notification-switch">
                            <input type="checkbox" class="notification-toggle" data-setting="stock" ${this.notificationSettings.stock ? 'checked' : ''}>
                            <span class="notification-slider"></span>
                        </label>
                    </div>
                    <div class="notification-setting-item">
                        <div class="notification-setting-label">
                            <div class="notification-setting-name">Изменение цен</div>
                            <div class="notification-setting-desc">Уведомлять о снижении цен</div>
                        </div>
                        <label class="notification-switch">
                            <input type="checkbox" class="notification-toggle" data-setting="price" ${this.notificationSettings.price ? 'checked' : ''}>
                            <span class="notification-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="notification-setting-group">
                    <h4 class="notification-setting-title">
                        <i class="bi bi-percent"></i>
                        Акции
                    </h4>
                    <div class="notification-setting-item">
                        <div class="notification-setting-label">
                            <div class="notification-setting-name">Акции и скидки</div>
                            <div class="notification-setting-desc">Уведомлять о специальных предложениях</div>
                        </div>
                        <label class="notification-switch">
                            <input type="checkbox" class="notification-toggle" data-setting="promotions" ${this.notificationSettings.promotions ? 'checked' : ''}>
                            <span class="notification-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="notification-setting-group">
                    <h4 class="notification-setting-title">
                        <i class="bi bi-cart"></i>
                        Заказы
                    </h4>
                    <div class="notification-setting-item">
                        <div class="notification-setting-label">
                            <div class="notification-setting-name">Статус заказов</div>
                            <div class="notification-setting-desc">Уведомлять об изменении статуса заказа</div>
                        </div>
                        <label class="notification-switch">
                            <input type="checkbox" class="notification-toggle" data-setting="orders" ${this.notificationSettings.orders ? 'checked' : ''}>
                            <span class="notification-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        // Добавляем в страницу
        const catalogSection = document.getElementById('catalog-section');
        if (catalogSection) {
            catalogSection.appendChild(settingsSection);
        }
    }
}

// Создаем экземпляр системы уведомлений
const notificationSystem = new NotificationSystem();

// Глобальные функции
function toggleNotifications() {
    notificationSystem.toggleNotifications();
}

function markAllNotificationsRead() {
    notificationSystem.markAllAsRead();
}

// Интеграция с основным приложением
document.addEventListener('DOMContentLoaded', async () => {
    // Инициализируем систему уведомлений
    if (typeof notificationSystem !== 'undefined') {
        await notificationSystem.init();
        notificationSystem.createNotificationUI();
        notificationSystem.createSettingsSection();
    }

    // Показываем уведомление о акции при загрузке
    setTimeout(() => {
        if (Math.random() > 0.5) {
            notificationSystem.showPromotionNotification(
                'Специальное предложение',
                'Скидка 10% на все котлы METEOR до конца недели!'
            );
        }
    }, 10000);
});

// Service Worker (sw.js)
if ('serviceWorker' in navigator) {
    // Этот файл нужно создать отдельно
    const swCode = `
        self.addEventListener('push', function(event) {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: '/images/logo.png',
                badge: '/images/badge.png',
                vibrate: [200, 100, 200],
                tag: 'laggartt-push'
            };
            
            event.waitUntil(
                self.registration.showNotification(data.title, options)
            );
        });

        self.addEventListener('notificationclick', function(event) {
            event.notification.close();
            event.waitUntil(
                clients.openWindow('/')
            );
        });
    `;

    // Создаем blob URL для Service Worker
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swURL = URL.createObjectURL(blob);
    
    // Регистрируем Service Worker
    navigator.serviceWorker.register(swURL)
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
}