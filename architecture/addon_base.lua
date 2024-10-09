-- ============== Copyright © 2024, WITHVOIDWITHIN, All rights reserved. =============

-- Version 5.1
-- Author: https://steamcommunity.com/id/withvoidwithin/
-- Source: https://github.com/withvoidwithin/dota2_modding
-- ===================================================================================

_G.__Cache = _G.__Cache or {}

-- Base
-- ================================================================================================================================

--- Конвертирует значение в булево значение.
--- @param Value number|string
function _NumberToBool(Value)
	return Value == 1 or Value == "1" or Value == true
end

--- Возвращает значение фиксируя его в указанном диапазоне.
--- <br> Если Min нет, то фиксирует от 0.
--- <br> Если Max нет, то фиксирует передаваемым значением.
--- @param Number number
--- @param Min number|nil
--- @param Max number|nil
function _Clamp(Number, Min, Max)
    return math.max(Min or 0, math.min(Max or Number, Number))
end

--- Вычисляет A и B по заданной функции.
--- @param A number
--- @param B number
--- @param CalcFunction function
--- @param Min number|nil
--- @param Max number|nil
--- @param BaseA number|nil
--- @param BaseB number|nil
--- @return number
function _Calc(A, B, CalcFunction, Min, Max, BaseA, BaseB)
    return _Clamp(CalcFunction(A or BaseA or 0, B or BaseB or 0), Min, Max)
end

-- Base NPC
-- ================================================================================================================================

--- Полное ли здоровье юнита?
--- @param Unit CBaseEntity
function _IsUnitHealthFull(Unit)
    if Unit:GetHealth() >= Unit:GetMaxHealth() then return true end

    return false
end

-- Tables
-- ================================================================================================================================

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
--- @param Table table
--- @return number|string|nil
function _GetTableFirstKey(Table)
    for Key in pairs(Table or {}) do
        return Key
    end
end

--- Возвращает первое значение таблицы.
--- @param Table table
function _GetTableFirstValue(Table)
    for _, Value in pairs(Table) do
        return Value
    end
end

--- Добавляет и заменяет существующие значения BaseTable из NewTable
--- <br> **[ Server / Client ]**
--- @param BaseTable table
--- @param NewTable table
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

--- Создает новую таблицу со всеми значениями передаваемой таблицей.
--- @param Table table
--- @param IsCopyMeta boolean|nil
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

-- Game Events
-- ================================================================================================================================

--- Регистрирует слушатель игрового эвента и вызывает соответствующий метод в заданном контексте.
--- <br> Поддерживает script_reload и не вызывает дублирование логики.
--- ```lua
--- Пример использования:
--- Listeners = { game_rules_state_change = "OnGameEventStateChanged" }
--- ```
--- **[ Server / Client ]**
--- @param Context table
--- @param Listeners table
function _RegisterGameEventListeners(Context, Listeners)
    if not Context.__GameEventListeners then
		Context.__GameEventListeners = {}
	end

    for ListenerName, FunctionName in pairs(Listeners or {}) do
        if Context.__GameEventListeners[ListenerName] then
            StopListeningToGameEvent(Context.__GameEventListeners[ListenerName])
        end

        Context.__GameEventListeners[ListenerName] = ListenToGameEvent(ListenerName, Dynamic_Wrap(Context, FunctionName), Context)
    end
end

--- Удаляет зарегистрированный слушатель игрового эвента в заданом контексте.
--- <br> Если Listeners нет, тогда удалит все существующие слушатели.
--- ```lua
--- Пример использования:
--- Listeners = { "game_rules_state_change", ... }
--- ```
--- **[ Server / Client ]**
--- @param Context table
--- @param Listeners table|nil
function _UnregisterGameEventListeners(Context, Listeners)
    for ListenerName, ListenerID in pairs(Listeners or Context.__GameEventListeners or {}) do
        StopListeningToGameEvent(ListenerID)

        Context.__GameEventListeners[ListenerName] = nil
    end

    if _GetTableSize(Context.__GameEventListeners) == 0 then
        Context.__GameEventListeners = nil
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





-- ================================================================================================================================
-- Server Only
-- ================================================================================================================================

if IsClient() then return end

-- Base
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

--- Линкует модифаер на сервере и клиенте.
--- <br> Для корректной работы необходимо задекларировать эвент в ``"scripts/custom.gameevents"`` со следующей таблицей:
--- ```kv
--- "link_lua_modifier"
--- {
---     "modifier_name" "string"
---     "modifier_path" "string"
---     "modifier_type" "byte"
--- }
--- ```
--- А затем нужно принять эвент ``"link_lua_modifier"`` на клиенте и выполнить стандартную функцию LinkLuaModifier.
--- <br> **[ Server Only ]**
--- @param ModifierName string
--- @param ModifierPath string
--- @param ModifierType LuaModifierType
function _LinkLuaModifier(ModifierName, ModifierPath, ModifierType)
    LinkLuaModifier(ModifierName, ModifierPath, ModifierType)

    FireGameEvent("link_lua_modifier", {
        modifier_name = ModifierName,
        modifier_path = ModifierPath,
        modifier_type = ModifierType,
    })
end

--- Линкует таблицу с модифаерами на сервере и клиенте.
--- ```lua
--- Modifiers = {
---     { "ModifierName", "ModifierPath", LUA_MODIFIER_MOTION_NONE },
---     ...
--- }
--- ```
--- <br> Для корректной работы необходимо задекларировать эвент в ``"scripts/custom.gameevents"`` со следующей таблицей:
--- ```kv
--- "link_lua_modifier"
--- {
---     "modifier_name" "string"
---     "modifier_path" "string"
---     "modifier_type" "byte"
--- }
--- ```
--- А затем нужно принять эвент ``"link_lua_modifier"`` на клиенте и выполнить стандартную функцию LinkLuaModifier.
--- <br> **[ Server Only ]**
--- @param Modifiers table
function _LinkLuaModifiers(Modifiers)
    for _, ModifierData in pairs(Modifiers) do
        _LinkLuaModifier(ModifierData[1], ModifierData[2], ModifierData[3])
    end
end

--- @param PlayerID PlayerID
--- @param EntityIndex number
--- @param KeyName string
--- @param Data any
function _TrasmitEntityDataToClientLua(PlayerID, EntityIndex, KeyName, Data)
    local PlayerController = PlayerResource:GetPlayer(PlayerID)

    if not PlayerController then return end

    CustomGameEventManager:Send_ServerToPlayer(PlayerController, "_sv_transmit_ent_data_to_client_lua", {
        EntityIndex = EntityIndex,
        KeyName     = KeyName,
        Data        = Data,
    })
end

-- Events Listeners
-- ================================================================================================================================

--- Регистрирует слушатель клиентских эвентов и вызывает соответствующий метод в заданном контексте.
--- <br> Поддерживает script_reload и не вызывает дублирование логики.
--- ```lua
--- Listeners = { client_event_name = "FunctionName" }
--- ```
--- **[ Server Only ]**
--- @param Context table
--- @param Listeners table
function _RegisterClientEventListeners(Context, Listeners)
    if not Context.__ClientEventListeners then
		Context.__ClientEventListeners = {}
	end

    for ListenerName, FunctionName in pairs(Listeners or {}) do
        if Context.__ClientEventListeners[ListenerName] then
            CustomGameEventManager:UnregisterListener(Context.__ClientEventListeners[ListenerName])
        end

        Context.__ClientEventListeners[ListenerName] = CustomGameEventManager:RegisterListener(ListenerName, Context[FunctionName])
    end
end

--- Удаляет зарегистрированный слушатель клиентских эвентов в заданом контексте.
--- <br> Если Listeners нет, тогда удалит все существующие слушатели.
--- ```lua
--- Listeners = { "client_event_name", ... }
--- ```
--- **[ Server Only ]**
--- @param Context table
--- @param Listeners table
function _UnregisterClientEventListeners(Context, Listeners)
    local ListenersTable = Context._ClientEventListeners

    if Listeners then
        ListenersTable = {}

        for _, ListenerName in pairs(Listeners) do
            if Context._ClientEventListeners[ListenerName] then
                ListenersTable[ListenerName] = Context[ListenerName]
            end
        end
    end

    for ListenerName in pairs(ListenersTable or {}) do
        CustomGameEventManager:UnregisterListener(Context._ClientEventListeners[ListenerName])
        Context._ClientEventListeners[ListenerName] = nil
    end
end

--- Регистрирует кастомный эвент для энтити.
--- @param Entity CBaseEntity
--- @param EventName string Название эвента, например: <i> OnEntityKilled
--- @param ActionName string Уникальное название действия.
--- @param CallbackContext table|nil Конекст вызова метода для эвента.
--- @param CallbackFunctionName string Имя метода в контексте вызова.
--- @param ... any Любые другие аргументы.
function _RegisterEntityCustomEvent(Entity, EventName, ActionName, CallbackContext, CallbackFunctionName, ...)
    if not __Cache.EntityCustomEvents                                         then __Cache.EntityCustomEvents                                       = {} end
    if not __Cache.EntityCustomEvents[EventName]                              then __Cache.EntityCustomEvents[EventName]                            = {} end

    local TableIndex

    for Index, Ent in pairs(__Cache.EntityCustomEvents[EventName]) do
        if Ent == Entity then TableIndex = Index end
    end

    if not TableIndex then table.insert(__Cache.EntityCustomEvents[EventName], Entity) end
    if not Entity.__CustomEventData             then Entity.__CustomEventData               = {} end
    if not Entity.__CustomEventData[EventName]  then Entity.__CustomEventData[EventName]    = {} end

    Entity.__CustomEventData[EventName][ActionName] = {
        Context         = CallbackContext,
        FunctionName    = CallbackFunctionName,
        Arguments       = {...},
    }
end

--- Удаляет кастомный эвент для энтити.
--- @param Entity CBaseEntity
--- @param EventName string Название эвента, например: <i> OnEntityKilled
--- @param ActionName string Уникальное название действия.
function _UnregisterEntityCustomEvent(Entity, EventName, ActionName)
    if not __Cache.EntityCustomEvents                     then return end
    if not __Cache.EntityCustomEvents[EventName]          then return end

    local TableIndex

    for Index, Ent in pairs(__Cache.EntityCustomEvents[EventName] or {}) do
        if Ent == Entity then TableIndex = Index end
    end

    if TableIndex then table.remove(__Cache.EntityCustomEvents[EventName], TableIndex) end

    Entity.__CustomEventData = nil
end

--- Функция вызова кастомного эвента.
--- @param EventName string Название эвента, например: <i> OnEntityKilled
--- @param EventData table Данные передачи внутрь эвента.
--- @param CurrentEntity CBaseEntity|nil Контекстный энтити с возвращаением результата.
function _OnEntityCustomEvent(EventName, EventData, CurrentEntity)
    if not __Cache.EntityCustomEvents               then return end
    if not __Cache.EntityCustomEvents[EventName]    then return end

    local function handle_actions(event_name, table_index, entity, event_data)
        if IsValidEntity(entity) and entity.__CustomEventData then
            for ActionName, ActionData in pairs(entity.__CustomEventData[event_name] or {}) do
                if ActionData.Context then
                    ActionData.Context[ActionData.FunctionName](ActionData.Context, entity, event_data, unpack(ActionData.Arguments))
                else
                    _G[ActionData.FunctionName](entity, event_data, unpack(ActionData.Arguments))
                end
            end
        else
            table.remove(__Cache.EntityCustomEvents[EventName], table_index)
        end
    end

    if CurrentEntity then
        local TableIndex

        for Index, Ent in pairs(__Cache.EntityCustomEvents[EventName]) do
            if Ent == CurrentEntity then TableIndex = Index end
        end

        return handle_actions(EventName, TableIndex, CurrentEntity, EventData)
    else
        for Index, Entity in pairs(__Cache.EntityCustomEvents[EventName]) do
            handle_actions(EventName, Index, Entity, EventData)
        end
    end
end



