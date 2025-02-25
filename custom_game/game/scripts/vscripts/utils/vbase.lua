-- ============== Copyright © 2024, WITHVOIDWITHIN, All rights reserved. =============

-- Version: 1.8
-- Author: https://steamcommunity.com/id/withvoidwithin/
-- Source: https://github.com/withvoidwithin/dota2_modding
-- ===================================================================================

-- Annotations
-- ================================================================================================================================

--- Таблица с данными вызова.
--- @class (exact) _CallbackData
--- @field Context? table Контекст вызова.
--- @field FunctionName? string|number Название функции в контексте.
--- @field Function? function Вызываемая функция.
--- @field EventData? table Передаваемые данные в обратный вызов.

-- Функции для работы с данными.
-- ================================================================================================================================

--- Создает копию таблицы, со всеми значениями из оригинальной таблицы.
--- @param Table table - Оригинальная таблица.
--- @param IsCopyMeta? boolean - Скопировать Metadata ?
--- <br> **[ Server / Client ]**
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

--- Добавляет и заменяет существующие значения BaseTable из NewTable.
--- <br> Если значение из NewTable = "__nil", то значение этого ключа будет удалено из BaseTable.
--- @param BaseTable? table
--- @param NewTable? table
--- <br> **[ Server / Client ]**
function _MergeTables(BaseTable, NewTable)
    if not BaseTable then BaseTable = {} end

    for Key, Value in pairs(NewTable or {}) do
        if Value == "__nil" then
            BaseTable[Key] = nil
        elseif type(Value) == "table" and not IsValidEntity(Value) then
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
--- @param Table? table
--- @return number
--- <br> **[ Server / Client ]**
function _GetTableSize(Table)
    local Count = 0

    for _ in pairs(Table or {}) do
        Count = Count + 1
    end

    return Count
end

--- Возвращает случайный ключ из таблицы.
--- @param Table table
--- @return string|number
--- <br> **[ Server / Client ]**
function _GetTableRandomKey(Table)
    local Keys = {}

    for key in pairs(Table or {}) do
        table.insert(Keys, key)
    end

    return Keys[RandomInt(1, #Keys)]
end

--- Возвращает случайное значение из таблицы.
--- @param Table table
--- @return any
--- <br> **[ Server / Client ]**
function _GetTableRandomValue(Table)
    local Values = {}

    for _, Value in pairs(Table or {}) do
        table.insert(Values, Value)
    end

    return Values[RandomInt(1, #Values)]
end

--- Возвращает рандомный ключ с учетов весов.
--- <br> Формат таблицы: { key = weight }, где weight это число в виде string или nubmer.
--- @param Table table<string|number, number|string>
--- @return string|number
--- <br> **[ Server / Client ]**
function _GetTableRandomKeyForWeight(Table)
    local List = {}

    for Key, Weight in pairs(Table) do
        for i = 1, tonumber(Weight) do
            table.insert(List, Key)
        end
    end

    return _GetTableRandomValue(List)
end

--- Проверяет, является ли таблица пустой.
--- @param Table table Таблица, которую нужно проверить.
--- @return boolean `true`, если таблица пустая или `nil`, иначе `false`.
--- <br> **[ Server / Client ]**
function _IsTableEmpty(Table)
    for _ in pairs(Table or {}) do
        return false
    end

    return true
end

--- Печатает данные в консоле.
--- Если данные являются таблицей, выводит структуру таблицы, включая ключи и значения.
--- Поддерживает глубокий вывод для вложенных таблиц или данных сущностей, если указано.
--- @param Data any Данные для вывода, могут быть любого типа.
--- @param IsDeepPrint? boolean Необязательный. Если true, будет выполняться глубокий вывод вложенных таблиц и данных сущностей. По умолчанию false.
--- @param TabSize? string Необязательный. Определяет строку, используемую для отступов. По умолчанию четыре пробела.
--- <br> **[ Server / Client ]**
function _Print(Data, IsDeepPrint, TabSize)
    TabSize = TabSize or "    "

    function PrintData(Data, Indent)
        Indent = Indent or ""

        if type(Data) == "table" then
            if #Indent == 0 then print("{") end

            for Key, Value in pairs(Data) do
                if type(Value) == "table" then
                    if IsValidEntity(Value) then
                        local HasInsideData = _GetTableSize(Value) > 1
                        print(Indent, Key.." = <"..Value:GetClassname().."|"..(Value:GetName() or " ").."|"..Value:GetEntityIndex()..">"..(IsDeepPrint and HasInsideData and " {" or ""))

                        if IsDeepPrint and HasInsideData then
                            for k, v in pairs(Value) do
                                if k ~= "__self" then print(Indent..TabSize, k..":") end
                                PrintData(v, Indent..TabSize..TabSize)
                            end

                            print(Indent, "}")
                        end
                    else
                        print(Indent, Key..(next(Value) and ":" or ": {}"))
                        PrintData(Value, Indent..TabSize)
                    end
                else
                    local Type = type(Value) == "function" and "" or (" <"..type(Value)..">")
                    print(Indent, Key.." = \""..tostring(Value).."\""..Type)
                end
            end

            if #Indent == 0 then print("}") end
        elseif type(Data) == "boolean" or type(Data) == "number" or type(Data) == "string" then
            if #Indent > 0 then
                print(Indent, "\""..tostring(Data).."\"", "<"..type(Data)..">")
            else
                print("\""..tostring(Data).."\"", "<"..type(Data)..">")
            end
        elseif type(Data) == "function" or type(Data) == "userdata" then
            print(Indent, Data)
        else
            print(Data)
        end
    end

    PrintData(Data)
end

--- Печатает данные в консоле, включая внутренние данные энтити, если такие есть.
--- Если данные являются таблицей, выводит структуру таблицы, включая ключи и значения.
--- @param Data any Данные для вывода, могут быть любого типа.
--- @param TabSize string|nil Необязательный. Определяет строку, используемую для отступов. По умолчанию четыре пробела.
--- <br> **[ Server / Client ]**
function _DeepPrint(Data, TabSize)
    _Print(Data, true, TabSize)
end

--- Перезаписывает данные подключенной таблицы другой таблицей.
--- <br> **[ Server / Client ]**
function _OverrideRequire(Base, RequireString)
    return _MergeTables(Base, require(RequireString))
end

-- Handlers
-- ================================================================================================================================

--- Производит вычисление двух переменных по заданной функции и ограничивает результат в диапазоне.
--- @param A? number
--- @param B? number
--- @param CalcFunction fun(a: number, b: number): number Функция, используемая для вычислений.
--- @param Min? number
--- @param Max? number
--- @param BaseA? number
--- @param BaseB? number
--- <br> **[ Server / Client ]**
function _Calc(A, B, CalcFunction, Min, Max, BaseA, BaseB)
    return _Clamp(CalcFunction(A or BaseA or 0, B or BaseB or 0), Min, Max)
end

--- Возвращает значение фиксируя его в указанном диапазоне.
--- <br> Если Min нет, то фиксирует от 0.
--- <br> Если Max нет, то фиксирует передаваемым значением.
--- @param Number number
--- @param Min? number
--- @param Max? number
--- <br> **[ Server / Client ]**
function _Clamp(Number, Min, Max)
    return math.max(Min or 0, math.min(Max or Number, Number))
end

--- Конвертирует значение в булево значение.
--- @param Value number|string
--- <br> **[ Server / Client ]**
function _ValueToBool(Value)
	return Value == 1 or Value == "1" or Value == true
end

--- Обрабатывает вызов функции обратного вызова с предоставленными аргументами.
--- ```lua
--- Примеры:
--- _HandleCallback({ Context = MyContext, FunctionName = "MyMethod", EventData = {...}})
--- _HandleCallback({ FunctionName = "GlobalFunction", EventData = {...}})
--- _HandleCallback({ Function  = DirectFunction, EventData = {...}})
--- ```
--- @param CallbackData _CallbackData
--- <br> **[ Server / Client ]**
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
--- @param ListenerEventData table Эвент дата от ListenToGameEvent.
--- @param States table<DOTA_GameState|string|number, string> таблица со стейтами и вызываемыми функциями.
--- @param Context table контекст вызова.
--- **[ Server / Client ]**
function _HandleGameStateChange(ListenerEventData, States, Context)
	local StateID           = ListenerEventData.CustomStateID or GameRules:State_Get()
	local StateFunction     = Context[States[StateID]]

	if StateFunction then StateFunction(Context, StateID, ListenerEventData) end
end

--- Разбивает строку на отдельные значения, используя указанный разделитель, и возвращает их в виде таблицы.
--- @param String string Строка, которую нужно разбить на значения.
--- @param Devider? string Разделитель, по которому производится разделение строки (по умолчанию — пробел).
--- **[ Server / Client ]**
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

--- Регистрирует и индексирует слушателей игровых событий.
--- <br> При повторном вызове ранее зарегистрированые слушатели в этом контексте будут отменены.
--- ```lua
--- ListenersData = {
---     dota_player_killed = { Context = MyContext, FunctionName = "OnPlayerKilled" },
---     npc_spawned        = { Context = MyContext, FunctionName = "OnNPCSpawned" },
--- }
--- ```
--- Пример:
--- ```lua
--- _RegisterGameEventListeners(_CONTEXT_GAME_EVENTS(), "Game", {
--- 	game_rules_state_change = { Context = MyContext, FunctionName = "OnGameEventStateChanged" },
--- })
--- ```
--- @param ContextGameEvents table Контекст хранения данных активных слушателей.
--- @param KeyName string Название ключа, по которому будут проиндексированы слушатели.
--- @param ListenersData table Данные о слушателях, содержащие имя события и соответствующие данные вызова (контекст и имя функции).
--- **[ Server / Client ]**
function _RegisterGameEventListeners(ContextGameEvents, KeyName, ListenersData)
    for ListenerName, CallbackData in pairs(ListenersData or {}) do
        if not ContextGameEvents[KeyName] then ContextGameEvents[KeyName] = {} end

        if ContextGameEvents[KeyName][ListenerName] then
            StopListeningToGameEvent(ContextGameEvents[KeyName][ListenerName])
        end

        ContextGameEvents[KeyName][ListenerName] = ListenToGameEvent(ListenerName, Dynamic_Wrap(CallbackData.Context, CallbackData.FunctionName), CallbackData.Context)
    end
end

--- Отменяет регистрацию слушателей игровых событий для указанного контекста.
--- ```lua
--- Listeners = {
---     "dota_player_killed",
---     "npc_spawned",
--- }
--- ```
--- @param ContextGameEvents table Контекст хранения данных активных слушателей.
--- @param KeyName string Название ключа, по которому ранее были зарегистрированы слушатели.
--- @param Listeners table Список имен событий, для которых нужно удалить слушателей.
--- **[ Server / Client ]**
function _UnregisterGameEventListeners(ContextGameEvents, KeyName, Listeners)
    for _, ListenerName in pairs(Listeners or {}) do
        if ContextGameEvents[KeyName] ~= nil and ContextGameEvents[KeyName][ListenerName] ~= nil then
            StopListeningToGameEvent(ContextGameEvents[KeyName][ListenerName])

            ContextGameEvents[KeyName][ListenerName] = nil
        end
    end

    if _GetTableSize(ContextGameEvents[KeyName]) == 0 then
        ContextGameEvents[KeyName] = nil
    end
end

-- Base NPC
-- ================================================================================================================================

--- Проверяет, полное ли здоровье у указанного юнита.
--- @return boolean `true`, если здоровье юнита полное, иначе `false`.
--- <br> **[ Server / Client ]**
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
--- @param Context CScriptPrecacheContext 
--- @param Resources table
--- **[ Server Only ]**
function _PrecacheTable(Context, Resources)
	for PrecacheType, Files in pairs(Resources or {}) do
		for _, File in pairs(Files or {}) do
			PrecacheResource( PrecacheType, File, Context )
		end
	end
end

-- Player Resources
-- ================================================================================================================================

--- Возвращает список всех PlayerID игроков, принадлежащих указанной команде или всех игроков, если TeamID не указан.
--- @param TeamID number? Идентификатор команды (например, DOTA_TEAM_GOODGUYS или DOTA_TEAM_BADGUYS). Если `nil`, возвращаются все игроки.
--- @return number[] Список PlayerID игроков.
--- <br> **[ Server Only ]**
function _GetPlayersInTeam(TeamID)
    local Players = {}

    for PlayerID = 0, DOTA_MAX_PLAYERS - 1 do
        if TeamID == nil or PlayerResource:IsValidPlayer(PlayerID) and PlayerResource:GetTeam(PlayerID) == TeamID then
            table.insert(Players, PlayerID)
        end
    end

    return Players
end

-- Client Events
-- ================================================================================================================================

--- Регистрирует и индексирует слушателей клиентских событий.
--- <br> При повторном вызове ранее зарегистрированые слушатели в этом контексте будут отменены.
--- ```lua
--- ListenersData = {
---     ["custom_event_name"] = { Context = self, FunctionName = "OnCustomEvent" },
--- }
--- ```
--- @param ContextClientEvents table Контекст хранения данных активных слушателей.
--- @param KeyName string Название ключа, по которому будут проиндексированы слушатели.
--- @param ListenersData table Данные о слушателях, содержащие имя события и соответствующие данные вызова (контекст и имя функции).
--- **[ Server Only ]**
function _RegisterClientEventListeners(ContextClientEvents, KeyName, ListenersData)
    for ListenerName, CallbackData in pairs(ListenersData or {}) do
        if not ContextClientEvents[KeyName] then ContextClientEvents[KeyName] = {} end

        if ContextClientEvents[KeyName][ListenerName] then
            CustomGameEventManager:UnregisterListener(ContextClientEvents[KeyName][ListenerName])
        end

        ContextClientEvents[KeyName][ListenerName] = CustomGameEventManager:RegisterListener(ListenerName, (CallbackData.Context and CallbackData.Context[CallbackData.FunctionName] or CallbackData.Function))
    end
end

--- Отменяет регистрацию слушателей клиентских событий для указанного контекста.
--- ```lua
--- Listeners = {
---     "custom_event_name",
--- }
--- ```
--- @param ContextClientEvents table Контекст хранения данных активных слушателей.
--- @param KeyName string Название ключа, по которому ранее были зарегистрированы слушатели.
--- @param Listeners table Список имен событий, для которых нужно удалить слушателей.
--- **[ Server Only ]**
function _UnregisterClientEventListeners(ContextClientEvents, KeyName, Listeners)
    for _, ListenerName in pairs(Listeners or {}) do
        if ContextClientEvents[KeyName] and ContextClientEvents[KeyName][ListenerName] then
            CustomGameEventManager:UnregisterListener(ContextClientEvents[KeyName][ListenerName])

            ContextClientEvents[KeyName][ListenerName] = nil
        end
    end

    if _GetTableSize(ContextClientEvents[KeyName]) == 0 then
        ContextClientEvents[KeyName] = nil
    end
end