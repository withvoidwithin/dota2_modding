#### ↩️[Вернуться на основную страницу](../README.md)

# 💼Asset Packs
Моя структура файлов дает возможность легко добавлять, изменять или удалять отдельные ассет-паки без риска влияния на другие.
<br> Для этого каждый ассет-пак должен храниться в ``custom_game/assets/pack_name``.
<br> Я рекомендую называть свои паки следующим образом: ``{метка_автора}_{название_пака}_{версия при необходимости}`` / ``v_base_textures``

## 🎨Base Textures Pack
![Base Textures Pack](/resources/images/cover_base_textures_pack.jpg)
<br> В игре есть множество подходящих для дизайна карт текстур и материалов. Основная проблема заключается в том, чтобы их найти. В Dota 2 нет четкой структуры хранения ассетов, всё разбросано в разных местах и много раз дублируется, а некоторые текстурные карты вовсе отсутствуют.
<br><br> Поэтому я специально разработал этот ассет-пак, где просмотрел более 100 тысяч текстур в игре, нашел и декомпилировал большое количество тайловых текстур, конвертировал в jpg grayscale формат для того, чтобы максимально уменьшить вес исходников без потери качества. А также воссоздал недостающие PBR текстурные карты.
<br><br> Учтите, что оптимизированы лишь исходники текстур. Material Editor компилирует текстуры в формат .vtex с RGB каналами и создает Mipmap Levels, от чего вес итоговых текстур, используемых в игре, будет больше.
<br><br> **ТЕКСТУРЫ В ЭТОМ ПАКЕ ПРЕДНАЗНАЧЕНЫ ИСКЛЮЧИТЕЛЬНО ДЛЯ СОЗДАНИЯ ПОЛЬЗОВАТЕЛЬСКИХ ИГР ДЛЯ DOTA 2.**
<br> [custom_game/assets/v_base_textures](/custom_game/content/assets/v_base_textures)

#### ↩️[Вернуться на основную страницу](../README.md)