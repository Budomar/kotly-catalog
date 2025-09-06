import pandas as pd
import json
import re
import os

def main():
    try:
        print("Загрузка данных из Google Sheets...")
        
        # Прямые ссылки на CSV экспорт Google Sheets
        price_url = "https://docs.google.com/spreadsheets/d/19PRNpA6F_HMI6iHSCg2iJF52PnN203ckY1WnqY_t5fc/export?format=csv"
        stock_url = "https://docs.google.com/spreadsheets/d/1o0e3-E20mQsWToYVQpCHZgLcbizCafLRpoPdxr8Rqfw/export?format=csv"
        
        # Загружаем данные
        print("Загружаем прайс...")
        price_df = pd.read_csv(price_url)
        print("Колонки в прайсе:", price_df.columns.tolist())
        
        print("Загружаем остатки...")
        stock_df = pd.read_csv(stock_url)
        print("Колонки в остатках:", stock_df.columns.tolist())
        
        print("Обработка данных...")
        
        # Автоматически находим нужные колонки
        def find_column(df, possible_names):
            for col in df.columns:
                col_lower = str(col).lower()
                if any(name.lower() in col_lower for name in possible_names):
                    return col
            return None
        
        # Находим колонки в прайсе
        article_col_price = find_column(price_df, ['артикул', 'article', 'код', 'articul', 'sku'])
        name_col = find_column(price_df, ['товар', 'наименование', 'модель', 'name', 'product', 'название'])
        price_col = find_column(price_df, ['розничная', 'цена', 'price', 'retail', 'стоимость', 'руб'])
        
        print(f"Найдены колонки в прайсе: Артикул='{article_col_price}', Название='{name_col}', Цена='{price_col}'")
        
        # Находим колонки в остатках
        article_col_stock = find_column(stock_df, ['артикул', 'article', 'код', 'articul', 'sku'])
        stock_col = find_column(stock_df, ['в наличии', 'остаток', 'количество', 'quantity', 'stock', 'наличие', 'кол-во'])
        
        print(f"Найдены колонки в остатках: Артикул='{article_col_stock}', Наличие='{stock_col}'")
        
        if not all([article_col_price, name_col, price_col, article_col_stock, stock_col]):
            raise ValueError("Не найдены все необходимые колонки в таблицах")
        
        # Создаем чистые датафреймы
        price_clean = price_df[[article_col_price, name_col, price_col]].copy()
        price_clean.columns = ['Артикул', 'Модель', 'Цена']
        
        stock_clean = stock_df[[article_col_stock, stock_col]].copy()
        stock_clean.columns = ['Артикул', 'В_наличии']
        
        # Очистка данных
        price_clean = price_clean.dropna(subset=['Артикул'])
        price_clean['Артикул'] = price_clean['Артикул'].astype(str).str.strip()
        
        stock_clean = stock_clean.dropna(subset=['Артикул'])
        stock_clean['Артикул'] = stock_clean['Артикул'].astype(str).str.strip()
        
        # Обработка цены
        def parse_price(price):
            try:
                if pd.isna(price):
                    return 0.0
                price_str = str(price).replace(' ', '').replace(',', '.')
                price_str = re.sub(r'[^\d\.]', '', price_str)
                return float(price_str)
            except:
                return 0.0
        
        price_clean['Цена'] = price_clean['Цена'].apply(parse_price)
        
        # Обработка количества
        def parse_quantity(qty):
            try:
                if pd.isna(qty):
                    return 0
                qty_str = str(qty).replace(' ', '').replace(',', '.')
                qty_val = float(qty_str)
                return max(0, int(qty_val))
            except:
                return 0
        
        stock_clean['В_наличии'] = stock_clean['В_наличии'].apply(parse_quantity)
        
        # Объединяем данные
        merged_df = pd.merge(price_clean, stock_clean, on='Артикул', how='left')
        merged_df['В_наличии'] = merged_df['В_наличии'].fillna(0).astype(int)
        
        # Функция для определения фото по модели
        def get_image_for_model(model_name):
            """Определяет какое фото использовать для модели"""
            model = str(model_name).upper()
            
            # Правила сопоставления моделей с фото (используем новые имена файлов)
            if 'METEOR T2' in model:
                return 'images/meteor-t2.jpg'
            elif 'METEOR C30' in model:
                return 'images/meteor-c30.jpg'
            elif 'METEOR B30' in model:
                return 'images/meteor-b30.jpg'
            elif 'METEOR B20' in model:
                return 'images/meteor-b20.jpg'
            elif 'METEOR C11' in model:
                return 'images/meteor-c11.jpg'
            elif 'METEOR Q3' in model:
                return 'images/meteor-q3.jpg'
            elif 'METEOR M30' in model:
                return 'images/meteor-m30.jpg'
            elif 'METEOR M6' in model:
                return 'images/meteor-m6.jpg'
            elif 'LAGGARTT' in model or 'ГАЗ 6000' in model:
                return 'images/laggartt.jpg'
            elif 'DEVOTION' in model:
                return 'images/devotion.jpg'
            elif 'MK' in model:
                return 'images/mk.jpg'
            else:
                return 'images/default.jpg'
        
        # Добавляем дополнительные поля
        def extract_info(model):
            model_str = str(model).upper()
            
            # Словарь соответствий серий и форматов мощности
            power_patterns = [
                (r'(T2|M6|M30|B20|B30|C30|C11|Q3)[^\d]*(\d+)', 2),  # METEOR T2 45 H
                (r'(\d+)\s*(C|H|С|Х|кВт|KW)', 1),  # 24 C, 28 H
                (r'ГАЗ\s*6000\s*(\d+)', 1),  # LaggarTT ГАЗ 6000 24 С
                (r'MK\s*(\d+)', 1),  # MK 250, MK 350
                (r'LL1GBQ(\d+)', 1),  # Devotion LL1GBQ30
                (r'LN1GBQ(\d+)', 1),  # Devotion LN1GBQ60
            ]
            
            power = "Не указана"
            for pattern, group in power_patterns:
                match = re.search(pattern, model_str)
                if match:
                    power = match.group(group)
                    break
            
            # Если не нашли по шаблонам, ищем любое подходящее число
            if power == "Не указана":
                numbers = re.findall(r'\b(\d{2,3})\b', model_str)
                if numbers:
                    power = numbers[0]
            
            # Контуры
            if any(x in model_str for x in [' C', 'С ', 'C)', '-C', ' C ', ' С ']):
                contours = "Двухконтурный"
            elif any(x in model_str for x in [' H', 'Н ', 'H)', '-H', ' H ', ' Н ']):
                contours = "Одноконтурный"
            else:
                contours = "Двухконтурный" if 'НАСТЕННЫЙ' in model_str else "Одноконтурный"
            
            # Wi-Fi
            wifi = "Да" if any(x in model_str for x in ['WI-FI', 'WIFI', 'ВАЙ-ФАЙ', 'WI FI']) else "Нет"
            
            return power, contours, wifi
        
        # Добавляем поля для рекомендаций
        def get_product_category(model):
            model_str = str(model).lower()
            if 'meteor' in model_str:
                return 'meteor'
            elif 'laggartt' in model_str or 'газ' in model_str:
                return 'laggartt'
            elif 'devotion' in model_str:
                return 'devotion'
            elif 'mk' in model_str:
                return 'mk'
            else:
                return 'other'
        
        def get_power_level(power):
            try:
                power_val = int(power)
                if power_val <= 20:
                    return 'low'
                elif power_val <= 30:
                    return 'medium'
                else:
                    return 'high'
            except:
                return 'unknown'
        
        merged_df['Категория'] = merged_df['Модель'].apply(get_product_category)
        merged_df['Уровень_мощности'] = merged_df['Мощность'].apply(get_power_level)
        
        # Конвертируем в JSON
        result = merged_df.to_dict('records')
        
        # Сохраняем
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Готово! Обработано {len(result)} товаров")
        print(f"📊 В наличии: {sum(1 for x in result if x['В_наличии'] > 0)} товаров")
        
        # Покажем пример данных
        print("\nПример данных (первые 3 товара):")
        for i, item in enumerate(result[:3]):
            print(f"{i+1}. {item['Артикул']} - {item['Модель'][:30]}...")
            print(f"   Цена: {item['Цена']} руб., Наличие: {item['В_наличии']} шт.")
            print(f"   Контуры: {item['Контуры']}, Мощность: {item['Мощность']} кВт, Wi-Fi: {item['WiFi']}")
            print(f"   Фото: {item['Фото']}")
            print(f"   Категория: {item['Категория']}, Уровень мощности: {item['Уровень_мощности']}")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        
        # Создаем пустой файл чтобы сайт не сломался
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()