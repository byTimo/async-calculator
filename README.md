# Абстрактный асихнронный калькулятор

## Версия в виде массива

### Функционал

- ✔ Правила калькуляции простого поля
- ✔ Правила калькуляции массива элементов
- ❌ Правила калькуляции массива массивов (бесконечная вложенность)
- ✔ Отложенный старт (debounce)
- ❌ Пропуск первого рассчета (calculate first time)
- ✔ Получение знания о том, что идет рассчет
- ❌ Advanced typing
  
### Фичи
- Правила указываются 1 раз и больше не пересобираются
- effect от каждого правила свой
- не храним предыдущее состояние расчетов - только предыдущие Deps-ы
- effect в RAF
- delay в RAF на AbortSignal-е