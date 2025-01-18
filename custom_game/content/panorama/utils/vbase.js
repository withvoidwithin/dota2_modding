// ================ Copyright © 2024, WVW, All rights reserved. ================

// Version 1.5
// Author: https://steamcommunity.com/id/withvoidwithin/
// Source: https://github.com/withvoidwithin/dota2_modding
// =============================================================================

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

/**
 * Ищет модификатор (бафф) по его названию для указанного существа.
 * @param {number} EntityIndex - Индекс сущности, для которой нужно найти модификатор.
 * @param {string} ModifierName - Имя модификатора (баффа), который необходимо найти.
 * @returns {number|undefined} Индекс найденного модификатора или undefined, если модификатор не найден.
 */
Game._FindModifierByName = function(EntityIndex, ModifierName){
    for(let i = 0; i <= Entities.GetNumBuffs(EntityIndex) - 1; i++){
        const BuffIndex = Entities.GetBuff(EntityIndex, i )

        if(Buffs.GetName(EntityIndex, BuffIndex) == ModifierName) return BuffIndex
    }
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

    this.__PanelInFocus = Panel

    Panel.SetAcceptsFocus(true)
    Panel.SetFocus()
}

/**
 * Возвращает панель, которая в данный момент находится в фокусе.
 */
Game._GetFocusPanel = function(){
    return this.__PanelInFocus
}

/**
 * Сбрасывает текущую панель в фокусе и снимает фокус ввода.
 */
Game._DropFocusPanel = function(){
    delete this.__PanelInFocus

    $.DispatchEvent("DropInputFocus")
}

/**
 * Создает или пересоздает пользовательскую панель с заданными параметрами и контекстными данными.
 *
 * @param {Object} PanelData - Данные для создания панели.
 * @param {Panel} PanelData.Parent - Родительская панель, в которой будет создана новая панель.
 * @param {string} PanelData.PanelID - Идентификатор панели.
 * @param {string} PanelData.PanelType - Тип панели (например, "Panel", "Label" и т.д.).
 * @param {string} PanelData.XML - Путь к XML макету панели.
 * @param {Object} [PanelData.Properties={}] - Дополнительные свойства панели.
 * @param {Object} [PanelData.Styles={}] - Стили, которые будут применены к панели.
 * @param {*} [ContextData] - Данные контекста, которые будут привязаны к панели.
 * @param {boolean} [IsRecreate=false] - Если `true`, существующая панель будет пересоздана.
 * @returns {Panel} Созданная или обновленная панель.
 *
 * @example
 * const panelData = {
 *     Parent: $.GetContextPanel(),
 *     PanelID: "CustomPanel",
 *     PanelType: "Panel",
 *     XML: "file://{resources}/layout/custom_layout.xml",
 *     Properties: { class: "my-custom-class" },
 *     Styles: { width: "200px", height: "100px" }
 * };
 * const customPanel = Game._CreateCustomPanel(panelData, { data: "context" }, true);
 */
Game._CreateCustomPanel = function(PanelData, ContextData, IsRecreate){
    let Panel = PanelData.Parent.FindChildTraverse(PanelData.PanelID)

    if(!Panel || IsRecreate){
        if(Panel) Panel.DeleteAsync(0)

        Panel = $.CreatePanel(PanelData.PanelType, PanelData.Parent, PanelData.PanelID, PanelData.Properties || {})

        Panel.BLoadLayout( PanelData.XML, false, false )
        Object.assign(Panel.style, PanelData.Styles || {})
    }

    if(ContextData !== undefined){
        Panel._SetContextData = function(Data){
            if(Data === undefined) return
        
            this._ContextData = Data

            if(typeof(this["_OnContextDataUpdated"]) === "function" ) this["_OnContextDataUpdated"](this._ContextData)
        }

        Panel._GetContextData = function(){
            return this._ContextData
        }
    
        Panel._SetContextData(ContextData)
    }

    return Panel
}

/**
 * Создает пользовательский тултип для указанной панели, устанавливая события для его показа и скрытия.
 *
 * @param {Panel} Panel - Панель, для которой нужно создать тултип.
 * @param {string} TooltipID - Уникальный идентификатор тултипа.
 * @param {string} TooltipPath - Путь к XML макету тултипа.
 * @param {Object} TooltipData - Данные, которые будут переданы в тултип в виде параметров.
 *
 * @example
 * Game._CreateCustomTooltip(myPanel, "MyTooltipID", "file://{resources}/layout/custom_tooltip.xml", { text: "Пример текста" });
 */
Game._CreateCustomTooltip = function(Panel, TooltipID, TooltipPath, TooltipData){
    Panel.SetPanelEvent("onmouseover",  () => $.DispatchEvent( 'UIShowCustomLayoutParametersTooltip', Panel, TooltipID, TooltipPath, "TooltipParams=" + JSON.stringify(TooltipData)))
    Panel.SetPanelEvent("onmouseout",   () => $.DispatchEvent( 'UIHideCustomLayoutTooltip', Panel, TooltipID))
}

/**
 * Загружает новый xml файл в панель с определенным ID у определенного родителя.
 *
 * @param {string} PanelID - ID панели в которую загрузится xml верстка.
 * @param {Panel} Context - Родитель с PanelID внутри.
 * @param {string} ComponentPath - Путь к XML макету компонента.
 *
 * @example
 * Game._LoadComponent("PanelID", Parent, "file://{resources}/layout/custom_game/my_component.xml");
 */
Game._LoadComponent = function(PanelID, Context, ComponentPath){
    const Component = Context.FindChildTraverse(PanelID)

    if(Component) Component.BLoadLayout( ComponentPath, true, false )
}

// Callback
// ================================================================================================================================

/**
 * Регистрирует слушатель на эвенты нажатия кнопок мыши.
 * @param {string} ListenerName
 * @param {Function} Callback - Функция, вызываемая при событии мыши.
 */
Game._RegisterListenerMouseCallback = function(ListenerName, Callback){
    if(!this.__ListenerMouseCallbacks) this.__ListenerMouseCallbacks = {}

    this.__ListenerMouseCallbacks[ListenerName] = Callback
}

/**
 * Удаляет зарегистрированный слушатель на эвенты мыши.
 * @param {string} ListenerName
 */
Game._UnregisterListenerMouseCallback = function(ListenerName){
    delete this.__ListenerMouseCallbacks[ListenerName]
}

// Events
// ================================================================================================================================

function OnInputFocusLost(LostFocusedPanel){
    if(Game._GetFocusPanel() === LostFocusedPanel) Game._SetFocusPanel(LostFocusedPanel)
}

function OnGlobalMouseCallback(Status, MouseButtonID){
    let IsIgnoreMouse = false

    for(const ListenerName in Game.__ListenerMouseCallbacks){
        const Callback = Game.__ListenerMouseCallbacks[ListenerName](Status, MouseButtonID)

        if(Callback) IsIgnoreMouse = true
    }

    return IsIgnoreMouse
}

// Init
// ================================================================================================================================

$.RegisterForUnhandledEvent("InputFocusLost", OnInputFocusLost)

GameUI.SetMouseCallback(OnGlobalMouseCallback)