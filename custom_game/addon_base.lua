-- ============== Copyright © 2024, WITHVOIDWITHIN, All rights reserved. =============

-- Version: 1.0
-- Author: https://steamcommunity.com/id/withvoidwithin/
-- Source: https://github.com/withvoidwithin/dota2_modding
-- ===================================================================================

-- Tables
-- ================================================================================================================================

--- Создает копию таблицы, со всеми значениями из оригинальной таблицы.
--- <br> **[ Server / Client ]**
--- @param Table table - Оригинальная таблица.
--- @param IsCopyMeta boolean|nil - Скопировать Metadata ?
function _DeepCopy(Table, IsCopyMeta)
    local BaseType = type(Table)
    local Copy

    if BaseType == "table" then
        Copy = {}

        for BaseKey, BaseValue in next, Table, nil do
            Copy[_DeepCopy(BaseKey, IsCopyMeta)] = _DeepCopy(BaseValue, IsCopyMeta)
        end

        if IsCopyMeta then
            setmetatable(Copy, _DeepCopy(getmetatable(Table), IsCopyMeta))
        end
    else
        Copy = Table
    end

    return Copy
end

--- Добавляет и заменяет существующие значения BaseTable из NewTable
--- <br> **[ Server / Client ]**
--- @param BaseTable table
--- @param NewTable table|nil
function _MergeTables(BaseTable, NewTable)
    if not BaseTable then BaseTable = {} end

    for Key, Value in pairs(NewTable or {}) do
        if type(Value) == "table" then
            if not BaseTable[Key] or type(BaseTable[Key]) ~= "table" then
                BaseTable[Key] = {}
            end

            BaseTable[Key] = _MergeTables(BaseTable[Key], Value)
        else
            BaseTable[Key] = Value
        end
    end

    return BaseTable
end

--- Подсчитывает количество элементов в таблице.
--- <br> **[ Server / Client ]**
--- @param Table table
--- @return number
function _GetTableSize(Table)
    local Count = 0

    for _ in pairs(Table or {}) do
        Count = Count + 1
    end

    return Count
end

--- Возвращает случайный ключ из таблицы.
--- <br> **[ Server / Client ]**
--- @param Table table
--- @return string|number|nil
function _GetTableRandomKey(Table)
    local Keys = {}

    for key in pairs(Table or {}) do
        table.insert(Keys, key)
    end

    return Keys[RandomInt(1, #Keys)]
end

--- Возвращает случайное значение из таблицы.
--- <br> **[ Server / Client ]**
--- @param Table table
--- @return any
function _GetTableRandomValue(Table)
    local Values = {}

    for _, Value in pairs(Table or {}) do
        table.insert(Values, Value)
    end

    return Values[RandomInt(1, #Values)]
end

--- Возвращает первый ключ таблицы.
--- <br> **[ Server / Client ]**
--- @param Table table
--- @return number|string|nil
function _GetTableFirstKey(Table)
    for Key in pairs(Table or {}) do
        return Key
    end
end

--- Возвращает первое значение таблицы.
--- <br> **[ Server / Client ]**
--- @param Table table
function _GetTableFirstValue(Table)
    for _, Value in pairs(Table) do
        return Value
    end
end

--- Проверяет, является ли таблица пустой.
--- <br> **[ Server / Client ]**
--- @param Table table Таблица, которую нужно проверить.
--- @return boolean `true`, если таблица пустая или `nil`, иначе `false`.
function _IsTableEmpty(Table)
    for _ in pairs(Table or {}) do
        return false
    end

    return true
end

-- Handlers
-- ================================================================================================================================

--- Производит вычисление двух переменных по заданной функции и ограничивает результат в диапазоне.
--- ```lua
--- Пример:
--- CalcFunction = function(a, b) return a - b end
--- ```
--- <br> **[ Server / Client ]**
--- @param A number|nil
--- @param B number|nil
--- @param CalcFunction function Функция, используемая для вычислений.
--- @param Min number|nil
--- @param Max number|nil
--- @param BaseA number|nil
--- @param BaseB number|nil
function _Calc(A, B, CalcFunction, Min, Max, BaseA, BaseB)
    return _Clamp(CalcFunction(A or BaseA or 0, B or BaseB or 0), Min, Max)
end

--- Возвращает значение фиксируя его в указанном диапазоне.
--- <br> Если Min нет, то фиксирует от 0.
--- <br> Если Max нет, то фиксирует передаваемым значением.
--- <br> **[ Server / Client ]**
--- @param Number number
--- @param Min number|nil
--- @param Max number|nil
function _Clamp(Number, Min, Max)
    return math.max(Min or 0, math.min(Max or Number, Number))
end

--- Конвертирует значение в булево значение.
--- <br> **[ Server / Client ]**
--- @param Value number|string
function _ValueToBool(Value)
	return Value == 1 or Value == "1" or Value == true
end

--- Обрабатывает вызов функции обратного вызова с предоставленными аргументами.
--- ```lua
--- Примеры:
--- _HandleCallback({ Context = MyContext, FunctionName = "MyMethod", EventData = ...})
--- _HandleCallback({ FunctionName = "GlobalFunction", EventData = ...})
--- _HandleCallback({ Function  = DirectFunction, EventData = ...})
--- ```
--- @param CallbackData table
function _HandleCallback(CallbackData)
    if CallbackData.Context then
        return CallbackData.Context[CallbackData.FunctionName](CallbackData.Context, CallbackData.EventData)
    elseif CallbackData.FunctionName then
        return _G[CallbackData.FunctionName](CallbackData.EventData)
    elseif CallbackData.Function then
        return CallbackData.Function(CallbackData.EventData)
    end
end

--- Вызывает метод контекста в соответствии с переданным или текущим стейтом.
--- ```lua
--- States = {
---     [DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP]    = "OnStateGameSetup",
---     [DOTA_GAMERULES_STATE_HERO_SELECTION]       = "OnStateHeroSelection",
--- }
--- ```
--- **[ Server / Client ]**
--- @param ListenerEventData table Эвент дата от ListenToGameEvent.
--- @param States table таблица со стейтами и вызываемыми функциями.
--- @param Context table контекст вызова функции.
function _HandleGameStateChange(ListenerEventData, States, Context)
	local StateID           = ListenerEventData.CustomStateID or GameRules:State_Get()
	local StateFunction     = Context[States[StateID]]

	if StateFunction then StateFunction(Context, StateID, ListenerEventData) end
end

--- Разбивает строку на отдельные значения, используя указанный разделитель, и возвращает их в виде таблицы.
--- **[ Server / Client ]**
--- @param String string Строка, которую нужно разбить на значения.
--- @param Devider string Разделитель, по которому производится разделение строки (по умолчанию — пробел).
function _ParseStringToValues(String, Devider)
    local Values = {}

    Devider = Devider or " "

    for Value in String:gmatch("[^" .. Devider .. "]+") do
        table.insert(Values, Value)
    end

    return Values
end

-- Game Events
-- ================================================================================================================================

--- Регистрирует слушателей игровых событий и связывает их с переданным контекстом и функцией.
--- ```lua
--- ListenersData = {
---     ["dota_player_killed"] = { Context = MyContext, FunctionName = "OnPlayerKilled" },
---     ["npc_spawned"]        = { Context = MyContext, FunctionName = "OnNPCSpawned" },
--- }
--- ```
--- **[ Server / Client ]**
--- @param ContextGameEventListeners table Таблица для хранения активных слушателей событий.
--- @param ContextName string Имя контекста, в котором будут храниться слушатели.
--- @param ListenersData table Данные о слушателях, содержащие имя события и соответствующие данные вызова (контекст и имя функции).
function _RegisterGameEventListeners(ContextGameEventListeners, ContextName, ListenersData)
    for ListenerName, CallbackData in pairs(ListenersData or {}) do
        if not ContextGameEventListeners[ContextName] then ContextGameEventListeners[ContextName] = {} end

        if ContextGameEventListeners[ContextName][ListenerName] then
            StopListeningToGameEvent(ContextGameEventListeners[ContextName][ListenerName])
        end

        ContextGameEventListeners[ContextName][ListenerName] = ListenToGameEvent(ListenerName, Dynamic_Wrap(CallbackData.Context, CallbackData.FunctionName), CallbackData.Context)
    end
end

--- Отменяет регистрацию слушателей игровых событий для указанного контекста.
--- ```lua
--- Listeners = {
---     "dota_player_killed",
---     "npc_spawned",
--- }
--- ```
--- **[ Server / Client ]**
--- @param ContextGameEventListeners table Таблица с активными слушателями событий.
--- @param ContextName string Имя контекста, для которого удаляются слушатели.
--- @param Listeners table Список имен событий, для которых нужно удалить слушателей.
function _UnregisterGameEventListeners(ContextGameEventListeners, ContextName, Listeners)
    for _, ListenerName in pairs(Listeners or {}) do
        if ContextGameEventListeners[ContextName] and ContextGameEventListeners[ContextName][ListenerName] then
            StopListeningToGameEvent(ContextGameEventListeners[ContextName][ListenerName])

            ContextGameEventListeners[ContextName][ListenerName] = nil
        end
    end

    if _GetTableSize(ContextGameEventListeners[ContextName]) == 0 then
        ContextGameEventListeners[ContextName] = nil
    end
end

-- Base NPC
-- ================================================================================================================================

--- Проверяет, полное ли здоровье у указанного юнита.
--- <br> **[ Server / Client ]**
--- @return boolean `true`, если здоровье юнита полное, иначе `false`.
function _IsUnitHealthFull(Unit)
    return Unit:GetHealth() >= Unit:GetMaxHealth()
end

-- ================================================================================================================================
-- SERVER ONLY
-- ================================================================================================================================

if IsClient() then return end

-- Handlers
-- ================================================================================================================================

--- Прекеш ресурсов. Требует специальный контекст прекеша.
--- <br> Прекеш типы: ``soundfile, particle, model, ...``
--- ```lua
--- Resources = {
---     soundfile = {
---         "soundevents/sounds.vsndevts",
---     },
---     particle = {
---         "particles/particle.vpcf",
---     },
---     ...
--- }
--- ```
--- **[ Server Only ]**
--- @param Context CScriptPrecacheContext 
--- @param Resources table
function _PrecacheTable(Context, Resources)
	for PrecacheType, Files in pairs(Resources or {}) do
		for _, File in pairs(Files or {}) do
			PrecacheResource( PrecacheType, File, Context )
		end
	end
end

-- Client Events
-- ================================================================================================================================

--- Регистрирует слушателей клиентских событий и связывает их с переданным контекстом и функцией.
--- ```lua
--- ListenersData = {
---     ["custom_event_name"] = { Context = self, FunctionName = "OnCustomEvent" },
--- }
--- ```
--- **[ Server Only ]**
--- @param ContextClientEventListeners table Таблица для хранения активных слушателей событий на клиенте.
--- @param ContextName string Имя контекста, в котором будут храниться слушатели.
--- @param ListenersData table Данные о слушателях, содержащие имя события и соответствующие данные вызова (контекст и имя функции).
function _RegisterClientEventListeners(ContextClientEventListeners, ContextName, ListenersData)
    for ListenerName, CallbackData in pairs(ListenersData or {}) do
        if not ContextClientEventListeners[ContextName] then ContextClientEventListeners[ContextName] = {} end

        if ContextClientEventListeners[ContextName][ListenerName] then
            CustomGameEventManager:UnregisterListener(ContextClientEventListeners[ContextName][ListenerName])
        end

        ContextClientEventListeners[ContextName][ListenerName] = CustomGameEventManager:RegisterListener(ListenerName, (CallbackData.Context and CallbackData.Context[CallbackData.FunctionName] or CallbackData.Function))
    end
end

--- Отменяет регистрацию слушателей клиентских событий для указанного контекста.
--- ```lua
--- Listeners = {
---     "custom_event_name",
--- }
--- ```
--- **[ Server Only ]**
--- @param ContextClientEventListeners table Таблица с активными слушателями событий на клиенте.
--- @param ContextName string Имя контекста, для которого удаляются слушатели.
--- @param Listeners table Список имен событий, для которых нужно удалить слушателей.
function _UnregisterClientEventListeners(ContextClientEventListeners, ContextName, Listeners)
    for _, ListenerName in pairs(Listeners or {}) do
        if ContextClientEventListeners[ContextName] and ContextClientEventListeners[ContextName][ListenerName] then
            CustomGameEventManager:UnregisterListener(ContextClientEventListeners[ContextName][ListenerName])

            ContextClientEventListeners[ContextName][ListenerName] = nil
        end
    end

    if _GetTableSize(ContextClientEventListeners[ContextName]) == 0 then
        ContextClientEventListeners[ContextName] = nil
    end
end
