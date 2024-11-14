// ================ Copyright © 2024, WVW, All rights reserved. ================

// Version 1.0
// Author: https://steamcommunity.com/id/withvoidwithin/
// Source: https://github.com/withvoidwithin/dota2_modding
// =============================================================================

var Data = {}

// Handlers
// ================================================================================================================================

/**
 * Форматирует время, заданное в секундах, в строку формата "MM:SS".
 * @param {number} Seconds - Время в секундах, которое нужно отформатировать.
 * @param {number} [Fix=0] - Опциональное количество знаков после запятой для секунд.
 *                           Если не указано, по умолчанию используется 0.
 * @returns {string}
 * @example
 * Game._FormatTime(75); // Вернет "1:15"
 * Game._FormatTime(75, 2); // Вернет "1:15.00" при Fix = 2
 * Game._FormatTime(3600); // Вернет "60:00"
 */
Game._FormatTime = function(Seconds, Fix = 0){
    const Min = Math.floor(Seconds / 60)
    let Sec = Number((Seconds % 60).toFixed(Fix))

    if (Sec === 60) {
        Sec = 0
        return (Min + 1) + ":00"
    }

    return Min + ":" + (Sec < 10 ? "0" : "") + Sec
}

/**
 * Преобразует значение в булевое значение `true` или `false` на основе его значения.
 * @example
 * Game._ValueToBool(1); // Вернет true
 * Game._ValueToBool("1"); // Вернет true
 * Game._ValueToBool(0); // Вернет false
 * Game._ValueToBool("0"); // Вернет false
 */
Game._ValueToBool = function(Value){
    return Value == 1 || Value == "1"
}

/**
 * Ограничивает значение числа в пределах заданного минимального и максимального диапазона.
 * @param {number} Number - Число, которое нужно ограничить.
 * @param {number} [Min=0] - Минимальное значение диапазона. По умолчанию равно 0.
 * @param {number} [Max=Number] - Максимальное значение диапазона. По умолчанию равно значению самого числа.
 * @returns {number} Возвращает число, ограниченное в пределах [Min, Max].
 * @example
 * Game._Clamp(5, 1, 10); // Вернет 5
 * Game._Clamp(-5, 1, 10); // Вернет 1
 * Game._Clamp(15, 1, 10); // Вернет 10
 * Game._Clamp(5); // Вернет 5, так как Min по умолчанию 0, Max равно Number
 * Game._Clamp(-5); // Вернет 0, так как Min по умолчанию 0
 */
Game._Clamp = function(Number, Min = 0, Max = Number){
    return Math.max(Min, Math.min(Max, Number))
}

/**
 * Проверяет равенство двух векторов по их компонентам.
 * @param {Array} Vec1
 * @param {Array} Vec2
 * @returns {boolean}
 * @example
 * Game._EqualVectors([1, 2, 3], [1, 2, 3]); // Вернет true
 * Game._EqualVectors([1, 2, 3], [3, 2, 1]); // Вернет false
 */
Game._IsVectorsEqual = function(Vec1, Vec2){
    return Vec1[0] == Vec2[0] && Vec1[1] == Vec2[1] && Vec1[2] == Vec2[2]
}

/**
 * Преобразует первую букву строки в верхний регистр.
 * @param {string} String 
 * @example
 * Game._ToUpperFirstWord("hello"); // Вернет "Hello"
 */
Game._ToUpperFirstWord = function(String){
    return String.charAt(0).toUpperCase() + String.slice(1)
}

/**
 * Преобразует SteamID64 в SteamID32.
 * @param {string} SteamID64 - SteamID64, ДОЛЖЕН БЫТЬ ОБЯЗАТЕЛЬНО В ВИДЕ СТРОКИ.
 * @returns {number} Числовое значение SteamID32.
 * @example
 * Game._SteamID64ToSteamID32("76561198074593327"); // Вернет 114327599 (примерный результат)
 */
Game._SteamID64ToSteamID32 = function(SteamID64){
    return Number(SteamID64.substr(-16,16)) - 6561197960265728
}

// Panels
// ================================================================================================================================

/**
 * Ищет и возвращает панель с заданным идентификатором внутри указанного родительского элемента.
 *
 * @param {string} PanelID - Идентификатор панели, которую требуется найти.
 * @param {Panel} [Parent=$.GetContextPanel().FindAncestor("DotaHud")] - Родительская панель, в пределах которой будет выполнен поиск. По умолчанию используется корневая панель DotaHud.
 * @returns {Panel|null} Возвращает найденную панель или `null`, если панель с указанным идентификатором не найдена.
 * @example
 * Game._FindPanel("SomePanelID"); // Ищет панель с идентификатором "SomePanelID" в DotaHud
 * Game._FindPanel("SomePanelID", $.GetContextPanel()); // Ищет панель с идентификатором "SomePanelID" в контексте текущей панели
 */
Game._FindPanel = function(PanelID, Parent = $.GetContextPanel().FindAncestor("DotaHud")){
    return Parent.FindChildTraverse(PanelID)
}

/**
 * Устанавливает видимость для панели с указанным идентификатором.
 * @param {string} PanelID - Идентификатор панели, видимость которой необходимо изменить.
 * @param {boolean} IsVisible - Если `true`, панель будет видимой; если `false`, панель будет скрыта.
 * @example
 * Game._SetDefaultUIPanelVisible("PreGame", false); // Позволяет скрыть стандартный PreGame HUD (В нем находится меню пика гереов)
 */
Game._SetDefaultUIPanelVisible = function(PanelID, IsVisible){
    Game._FindPanel(PanelID).visible = IsVisible
}

/**
 * Устанавливает фокус на указанной панели, если она существует и является валидной.
 * @param {Panel} Panel - Панель, на которую нужно установить фокус.
 */
Game._SetFocusPanel = function(Panel){
    if(!Panel.IsValid()) return

    Data.PanelInFocus = Panel

    Panel.SetAcceptsFocus(true)
    Panel.SetFocus()
}

/**
 * Возвращает панель, которая в данный момент находится в фокусе.
 */
Game._GetFocusPanel = function(){
    return Data.PanelInFocus
}

/**
 * Сбрасывает текущую панель в фокусе и снимает фокус ввода.
 */
Game._DropFocusPanel = function(){
    delete Data.PanelInFocus

    $.DispatchEvent("DropInputFocus")
}
