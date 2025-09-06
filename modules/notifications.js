// modules/notifications.js - Система push-уведомлений
class NotificationSystem {
    constructor() {
        this.notificationPermission = null;
        this.notificationSettings = {};
        this.notificationHistory = [];
        this.unreadCount = 0;
        this.serviceWorkerRegistration = null;
        this.isSubscribed = false;
        this.subscription = null;
    }

    // Инициализация модуля
    async init() {
        await this.loadSettings();
        await this.loadHistory();
        this.setupEventListeners();
        this.checkPermission();
        this.setupServiceWorker();
        this.createNotificationElements();
        console.log('Система уведомлений инициализирована');
    }

    // Загрузка настроек
    async loadSettings() {
        try {
            const saved = localStorage.getItem('notificationSettings');
            this.notificationSettings = saved ? JSON.parse(saved) : {
                stockAlerts: true,
                priceDrops: true,
                newProducts: true,
                promotions: true,
                orderUpdates: true,
                browserNotifications: true,
                sound: false,
                vibration: true
            };
        } catch (error) {
            console.error('Ошибка загрузки настроек уведомлений:', error);
            this.notificationSettings = this.getDefaultSettings();
        }
    }

    // Загрузка истории уведомлений
    async loadHistory() {
        try {
            const saved = localStorage.getItem('notificationHistory');
            this.notificationHistory = saved ? JSON.parse(saved) : [];
            this.updateUnreadCount();
        } catch (error) {
            console.error('Ошибка загрузки истории уведомлений:', error);
            this.notificationHistory = [];
        }
    }

    // Сохранение настроек
    async saveSettings() {
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
        } catch (error) {
            console.error('Ошибка сохранения настроек уведомлений:', error);
        }
    }

    // Сохранение истории
    async saveHistory() {
        try {
            localStorage.setItem('notificationHistory', JSON.stringify(this.notificationHistory));
        } catch (error) {
            console.error('Ошибка сохранения истории уведомлений:', error);
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчики для элементов уведомлений
        document.addEventListener('click', (e) => {
            // Закрытие уведомлений
            if (e.target.closest('.push-notification-close')) {
                this.hideNotification(e.target.closest('.push-notification'));
            }
            
            // Управление настройками
            if (e.target.closest('.notification-settings-switch input')) {
                this.handleSettingsChange(e.target);
            }
            
            // Открытие dropdown уведомлений
            if (e.target.closest('.notification-icon')) {
                this.toggleNotificationDropdown();
            }
            
            // Очистка уведомлений
            if (e.target.closest('.notification-dropdown-clear')) {
                this.clearAllNotifications();
            }
            
            // Отметка как прочитанное
            if (e.target.closest('.notification-dropdown-item')) {
                const item = e.target.closest('.notification-dropdown-item');
                const index = parseInt(item.dataset.index);
                this.markAsRead(index);
            }
        });

        // Глобальные обработчики клавиш
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllNotifications();
            }
        });

        // Отслеживание изменений наличия товаров
        this.setupStockTracking();
    }

    // Проверка разрешений
    async checkPermission() {
        if (!('Notification' in window)) {
            console.log('Браузер не поддерживает уведомления');
            this.notificationPermission = 'unsupported';
            return;
        }

        this.notificationPermission = Notification.permission;

        if (this.notificationPermission === 'default') {
            this.showPermissionRequest();
        }
    }

    // Запрос разрешения
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            
            if (permission === 'granted') {
                this.hidePermissionRequest();
                this.showNotification('Уведомления включены', 'Теперь вы будете получать уведомления о акциях и наличии товаров', 'success');
            }
            
            return permission;
        } catch (error) {
            console.error('Ошибка запроса разрешения:', error);
            return 'denied';
        }
    }

    // Настройка Service Worker
    async setupServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('Service Worker не поддерживается');
            return;
        }

        try {
            this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker зарегистрирован');

            // Подписка на push-уведомления
            await this.subscribeToPush();
        } catch (error) {
            console.error('Ошибка регистрации Service Worker:', error);
        }
    }

    // Подписка на push-уведомления
    async subscribeToPush() {
        if (!this.serviceWorkerRegistration) return;

        try {
            const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
            
            if (subscription) {
                this.isSubscribed = true;
                this.subscription = subscription;
            } else if (this.notificationSettings.browserNotifications) {
                await this.subscribeUser();
            }
        } catch (error) {
            console.error('Ошибка подписки на push-уведомления:', error);
        }
    }

    // Подписка пользователя
    async subscribeUser() {
        try {
            const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U')
            });

            this.isSubscribed = true;
            this.subscription = subscription;
            
            // Отправка подписки на сервер
            await this.sendSubscriptionToServer(subscription);
            
        } catch (error) {
            console.error('Ошибка подписки пользователя:', error);
        }
    }

    // Отправка подписки на сервер
    async sendSubscriptionToServer(subscription) {
        // Здесь будет код отправки подписки на ваш сервер
        console.log('Подписка отправлена на сервер:', subscription);
    }

    // Создание элементов уведомлений
    createNotificationElements() {
        // Создаем контейнер для уведомлений
        const container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);

        // Создаем запрос разрешения
        const permissionRequest = document.createElement('div');
        permissionRequest.className = 'notification-permission';
        permissionRequest.innerHTML = `
            <div class="notification-permission-content">
                <div class="notification-permission-header">
                    <i class="bi bi-bell notification-permission-icon"></i>
                    <h3 class="notification-permission-title">Разрешить уведомления?</h3>
                </div>
                <p class="notification-permission-text">
                    Получайте уведомления о наличии товаров, акциях и специальных предложениях
                </p>
                <div class="notification-permission-actions">
                    <button class="notification-permission-btn secondary" onclick="notificationSystem.hidePermissionRequest()">
                        Не сейчас
                    </button>
                    <button class="notification-permission-btn primary" onclick="notificationSystem.requestPermission()">
                        Разрешить
                    </button>
                </div>
            </div>
        `;
        container.appendChild(permissionRequest);

        // Создаем dropdown уведомлений
        const notificationDropdown = document.createElement('div');
        notificationDropdown.className = 'notification-dropdown';
        notificationDropdown.innerHTML = `
            <div class="notification-dropdown-header">
                <h4 class="notification-dropdown-title">Уведомления</h4>
                <button class="notification-dropdown-clear">Очистить все</button>
            </div>
            <ul class="notification-dropdown-list">
                <li class="notification-dropdown-empty">
                    <div class="notification-dropdown-empty-icon">
                        <i class="bi bi-bell"></i>
                    </div>
                    <p>Нет уведомлений</p>
                </li>
            </ul>
        `;
        container.appendChild(notificationDropdown);
    }

    // Показать запрос разрешения
    showPermissionRequest() {
        const permissionElement = document.querySelector('.notification-permission');
        if (permissionElement) {
            permissionElement.classList.add('visible');
        }
    }

    // Скрыть запрос разрешения
    hidePermissionRequest() {
        const permissionElement = document.querySelector('.notification-permission');
        if (permissionElement) {
            permissionElement.classList.remove('visible');
        }
    }

    // Показать уведомление
    showNotification(title, message, type = 'info', options = {}) {
        // Добавляем в историю
        const notification = {
            id: Date.now(),
            title,
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false,
            ...options
        };

        this.notificationHistory.unshift(notification);
        this.updateUnreadCount();
        this.saveHistory();

        // Показываем браузерное уведомление
        if (this.notificationPermission === 'granted' && this.notificationSettings.browserNotifications) {
            this.showBrowserNotification(title, message);
        }

        // Показываем in-app уведомление
        this.showInAppNotification(notification);

        // Воспроизводим звук
        if (this.notificationSettings.sound) {
            this.playNotificationSound();
        }

        // Вибрация
        if (this.notificationSettings.vibration && 'vibrate' in navigator) {
            navigator.vibrate(200);
        }

        return notification;
    }

    // Показать браузерное уведомление
    showBrowserNotification(title, message) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const notification = new Notification(title, {
            body: message,
            icon: '/images/logo.png',
            badge: '/images/badge.png',
            vibrate: [200, 100, 200],
            tag: 'laggartt-notification'
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        setTimeout(() => notification.close(), 5000);
    }

    // Показать in-app уведомление
    showInAppNotification(notification) {
        const notificationElement = document.createElement('div');
        notificationElement.className = `push-notification ${notification.type}`;
        notificationElement.innerHTML = `
            <div class="push-notification-icon">
                <i class="bi ${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="push-notification-content">
                <div class="push-notification-title">${notification.title}</div>
                <div class="push-notification-message">${notification.message}</div>
            </div>
            <button class="push-notification-close">
                <i class="bi bi-x"></i>
            </button>
        `;

        document.getElementById('notification-container').appendChild(notificationElement);

        // Показываем с анимацией
        setTimeout(() => {
            notificationElement.classList.add('visible');
        }, 100);

        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            this.hideNotification(notificationElement);
        }, 5000);

        return notificationElement;
    }

    // Скрыть уведомление
    hideNotification(notificationElement) {
        if (!notificationElement) return;

        notificationElement.classList.remove('visible');
        notificationElement.classList.add('hidden');

        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.parentNode.removeChild(notificationElement);
            }
        }, 500);
    }

    // Скрыть все уведомления
    hideAllNotifications() {
        document.querySelectorAll('.push-notification').forEach(notification => {
            this.hideNotification(notification);
        });
    }

    // Получить иконку для типа уведомления
    getNotificationIcon(type) {
        const icons = {
            success: 'bi-check-circle',
            error: 'bi-exclamation-circle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        };
        return icons[type] || 'bi-bell';
    }

    // Воспроизвести звук уведомления
    playNotificationSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDci0FLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfJ8N2QQAoUXrTp66hVFApGn+DxwG8gBzGF0/LQfC8GHGzE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAw// modules/notifications.js - Система push-уведомлений
class NotificationSystem {
    constructor() {
        this.notificationPermission = null;
        this.notificationSettings = {};
        this.notificationHistory = [];
        this.unreadCount = 0;
        this.serviceWorkerRegistration = null;
        this.isSubscribed = false;
        this.subscription = null;
    }

    // Инициализация модуля
    async init() {
        await this.loadSettings();
        await this.loadHistory();
        this.setupEventListeners();
        this.checkPermission();
        this.setupServiceWorker();
        this.createNotificationElements();
        console.log('Система уведомлений инициализирована');
    }

    // Загрузка настроек
    async loadSettings() {
        try {
            const saved = localStorage.getItem('notificationSettings');
            this.notificationSettings = saved ? JSON.parse(saved) : {
                stockAlerts: true,
                priceDrops: true,
                newProducts: true,
                promotions: true,
                orderUpdates: true,
                browserNotifications: true,
                sound: false,
                vibration: true
            };
        } catch (error) {
            console.error('Ошибка загрузки настроек уведомлений:', error);
            this.notificationSettings = this.getDefaultSettings();
        }
    }

    // Загрузка истории уведомлений
    async loadHistory() {
        try {
            const saved = localStorage.getItem('notificationHistory');
            this.notificationHistory = saved ? JSON.parse(saved) : [];
            this.updateUnreadCount();
        } catch (error) {
            console.error('Ошибка загрузки истории уведомлений:', error);
            this.notificationHistory = [];
        }
    }

    // Сохранение настроек
    async saveSettings() {
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
        } catch (error) {
            console.error('Ошибка сохранения настроек уведомлений:', error);
        }
    }

    // Сохранение истории
    async saveHistory() {
        try {
            localStorage.setItem('notificationHistory', JSON.stringify(this.notificationHistory));
        } catch (error) {
            console.error('Ошибка сохранения истории уведомлений:', error);
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчики для элементов уведомлений
        document.addEventListener('click', (e) => {
            // Закрытие уведомлений
            if (e.target.closest('.push-notification-close')) {
                this.hideNotification(e.target.closest('.push-notification'));
            }
            
            // Управление настройками
            if (e.target.closest('.notification-settings-switch input')) {
                this.handleSettingsChange(e.target);
            }
            
            // Открытие dropdown уведомлений
            if (e.target.closest('.notification-icon')) {
                this.toggleNotificationDropdown();
            }
            
            // Очистка уведомлений
            if (e.target.closest('.notification-dropdown-clear')) {
                this.clearAllNotifications();
            }
            
            // Отметка как прочитанное
            if (e.target.closest('.notification-dropdown-item')) {
                const item = e.target.closest('.notification-dropdown-item');
                const index = parseInt(item.dataset.index);
                this.markAsRead(index);
            }
        });

        // Глобальные обработчики клавиш
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllNotifications();
            }
        });

        // Отслеживание изменений наличия товаров
        this.setupStockTracking();
    }

    // Проверка разрешений
    async checkPermission() {
        if (!('Notification' in window)) {
            console.log('Браузер не поддерживает уведомления');
            this.notificationPermission = 'unsupported';
            return;
        }

        this.notificationPermission = Notification.permission;

        if (this.notificationPermission === 'default') {
            this.showPermissionRequest();
        }
    }

    // Запрос разрешения
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            
            if (permission === 'granted') {
                this.hidePermissionRequest();
                this.showNotification('Уведомления включены', 'Теперь вы будете получать уведомления о акциях и наличии товаров', 'success');
            }
            
            return permission;
        } catch (error) {
            console.error('Ошибка запроса разрешения:', error);
            return 'denied';
        }
    }

    // Настройка Service Worker
    async setupServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('Service Worker не поддерживается');
            return;
        }

        try {
            this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker зарегистрирован');

            // Подписка на push-уведомления
            await this.subscribeToPush();
        } catch (error) {
            console.error('Ошибка регистрации Service Worker:', error);
        }
    }

    // Подписка на push-уведомления
    async subscribeToPush() {
        if (!this.serviceWorkerRegistration) return;

        try {
            const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
            
            if (subscription) {
                this.isSubscribed = true;
                this.subscription = subscription;
            } else if (this.notificationSettings.browserNotifications) {
                await this.subscribeUser();
            }
        } catch (error) {
            console.error('Ошибка подписки на push-уведомления:', error);
        }
    }

    // Подписка пользователя
    async subscribeUser() {
        try {
            const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U')
            });

            this.isSubscribed = true;
            this.subscription = subscription;
            
            // Отправка подписки на сервер
            await this.sendSubscriptionToServer(subscription);
            
        } catch (error) {
            console.error('Ошибка подписки пользователя:', error);
        }
    }

    // Отправка подписки на сервер
    async sendSubscriptionToServer(subscription) {
        // Здесь будет код отправки подписки на ваш сервер
        console.log('Подписка отправлена на сервер:', subscription);
    }

    // Создание элементов уведомлений
    createNotificationElements() {
        // Создаем контейнер для уведомлений
        const container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);

        // Создаем запрос разрешения
        const permissionRequest = document.createElement('div');
        permissionRequest.className = 'notification-permission';
        permissionRequest.innerHTML = `
            <div class="notification-permission-content">
                <div class="notification-permission-header">
                    <i class="bi bi-bell notification-permission-icon"></i>
                    <h3 class="notification-permission-title">Разрешить уведомления?</h3>
                </div>
                <p class="notification-permission-text">
                    Получайте уведомления о наличии товаров, акциях и специальных предложениях
                </p>
                <div class="notification-permission-actions">
                    <button class="notification-permission-btn secondary" onclick="notificationSystem.hidePermissionRequest()">
                        Не сейчас
                    </button>
                    <button class="notification-permission-btn primary" onclick="notificationSystem.requestPermission()">
                        Разрешить
                    </button>
                </div>
            </div>
        `;
        container.appendChild(permissionRequest);

        // Создаем dropdown уведомлений
        const notificationDropdown = document.createElement('div');
        notificationDropdown.className = 'notification-dropdown';
        notificationDropdown.innerHTML = `
            <div class="notification-dropdown-header">
                <h4 class="notification-dropdown-title">Уведомления</h4>
                <button class="notification-dropdown-clear">Очистить все</button>
            </div>
            <ul class="notification-dropdown-list">
                <li class="notification-dropdown-empty">
                    <div class="notification-dropdown-empty-icon">
                        <i class="bi bi-bell"></i>
                    </div>
                    <p>Нет уведомлений</p>
                </li>
            </ul>
        `;
        container.appendChild(notificationDropdown);
    }

    // Показать запрос разрешения
    showPermissionRequest() {
        const permissionElement = document.querySelector('.notification-permission');
        if (permissionElement) {
            permissionElement.classList.add('visible');
        }
    }

    // Скрыть запрос разрешения
    hidePermissionRequest() {
        const permissionElement = document.querySelector('.notification-permission');
        if (permissionElement) {
            permissionElement.classList.remove('visible');
        }
    }

    // Показать уведомление
    showNotification(title, message, type = 'info', options = {}) {
        // Добавляем в историю
        const notification = {
            id: Date.now(),
            title,
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false,
            ...options
        };

        this.notificationHistory.unshift(notification);
        this.updateUnreadCount();
        this.saveHistory();

        // Показываем браузерное уведомление
        if (this.notificationPermission === 'granted' && this.notificationSettings.browserNotifications) {
            this.showBrowserNotification(title, message);
        }

        // Показываем in-app уведомление
        this.showInAppNotification(notification);

        // Воспроизводим звук
        if (this.notificationSettings.sound) {
            this.playNotificationSound();
        }

        // Вибрация
        if (this.notificationSettings.vibration && 'vibrate' in navigator) {
            navigator.vibrate(200);
        }

        return notification;
    }

    // Показать браузерное уведомление
    showBrowserNotification(title, message) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const notification = new Notification(title, {
            body: message,
            icon: '/images/logo.png',
            badge: '/images/badge.png',
            vibrate: [200, 100, 200],
            tag: 'laggartt-notification'
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        setTimeout(() => notification.close(), 5000);
    }

    // Показать in-app уведомление
    showInAppNotification(notification) {
        const notificationElement = document.createElement('div');
        notificationElement.className = `push-notification ${notification.type}`;
        notificationElement.innerHTML = `
            <div class="push-notification-icon">
                <i class="bi ${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="push-notification-content">
                <div class="push-notification-title">${notification.title}</div>
                <div class="push-notification-message">${notification.message}</div>
            </div>
            <button class="push-notification-close">
                <i class="bi bi-x"></i>
            </button>
        `;

        document.getElementById('notification-container').appendChild(notificationElement);

        // Показываем с анимацией
        setTimeout(() => {
            notificationElement.classList.add('visible');
        }, 100);

        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            this.hideNotification(notificationElement);
        }, 5000);

        return notificationElement;
    }

    // Скрыть уведомление
    hideNotification(notificationElement) {
        if (!notificationElement) return;

        notificationElement.classList.remove('visible');
        notificationElement.classList.add('hidden');

        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.parentNode.removeChild(notificationElement);
            }
        }, 500);
    }

    // Скрыть все уведомления
    hideAllNotifications() {
        document.querySelectorAll('.push-notification').forEach(notification => {
            this.hideNotification(notification);
        });
    }

    // Получить иконку для типа уведомления
    getNotificationIcon(type) {
        const icons = {
            success: 'bi-check-circle',
            error: 'bi-exclamation-circle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        };
        return icons[type] || 'bi-bell';
    }

    // Воспроизвести звук уведомления
    playNotificationSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDci0FLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfJ8N2QQAoUXrTp66hVFApGn+DxwG8gBzGF0/LQfC8GHGzE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAwPVKzp769aFgxEm+Dxw3EhCCx/0fLQfC8GFGTE8OCURAw