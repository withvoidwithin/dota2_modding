-- ============== Copyright © 2024, WITHVOIDWITHIN, All rights reserved. =============

-- Version: 1.4
-- Author: https://steamcommunity.com/id/withvoidwithin/
-- Source: https://github.com/withvoidwithin/dota2_modding
-- Required: utils/vbase.lua
-- ===================================================================================

local DataHandler = {}

-- Main
-- ================================================================================================================================

--- Функция инициализации системы. Необходимо инициировать после каждого подключения системы через require.
--- <br> Пример:
--- ```lua
--- -- For Server:
--- DataHandler:Init({ ContextGameData = _GAMEDATA(), ContextClientEvents = _GetContextClientEvents() })
--- -- For Client:
--- DataHandler:Init({ ContextGameData = _GAMEDATA(), ContextGameEvents = _GetContextGameEvents() })
function DataHandler:Init(Data)
    if not Data.ContextGameData.DataHandler then Data.ContextGameData.DataHandler = {} end

    _MergeTables(Data.ContextGameData.DataHandler, {
        PlayersToken = {},
        Data = {
            GameData    = {},
            PlayerData  = {},
            TeamData    = {},
            GlobalData  = {},
        },
        Listeners = {
            GameData    = {},
            PlayerData  = {},
            TeamData    = {},
            GlobalData  = {},
        },
    })

    self:SetDefaultContext(Data.ContextGameData.DataHandler)

    if IsServer() then
        _RegisterClientEventListeners(Data.ContextClientEvents, "DataHandler", {
            _cl_data_handler_request        = { Context = DataHandler, FunctionName = "OnClientRequestData" },
            _cl_data_handler_token_updated  = { Context = DataHandler, FunctionName = "OnPlayerTokenUpdated" },
        })

        self:RequestPlayerToken()
    else
        _RegisterGameEventListeners(Data.ContextGameEvents, "DataHandler", {
            _cl_data_handler_updated                    = { Context = DataHandler, FunctionName = "OnDataHandlerUpdated" },
            _sv_data_handler_link_lua_modifier          = { Context = DataHandler, FunctionName = "OnLinkLuaMidifier" },
            _cl_data_handler_transmite_entity_data      = { Context = DataHandler, FunctionName = "OnEntityDataTransmite" },
        })
    end
end

-- Context Data
-- ================================================================================================================================

--- Устанавливает стандартный контекст для всех методов.
--- @param Context table
--- @return table
function DataHandler:SetDefaultContext(Context)
    self.__Context = Context

    return self.__Context
end

--- Возвращает установленный стандартный контекст.
--- @return table
function DataHandler:GetDefaultContext()
    return self.__Context
end

function DataHandler:CheckContext(Context)
    Context = Context or self.__Context

    if not Context then print("[DataHandler "..(IsServer() and "Server" or "Client").."] Context does not exist.") end

    return Context
end

-- Client Side
-- ================================================================================================================================

if IsClient() then

    -- Get Data
    -- ================================================================================================================================

    function DataHandler:Get(DataType, Key)
        local Data = self.__Context.Data

        if DataType then Data = Data[DataType]  else return Data end
        if Key      then Data = Data[Key]       else return Data end

        return Data
    end

    function DataHandler:GetPlayerData(Key)
        return self:Get("PlayerData", Key)
    end

    function DataHandler:GetTeamData(Key)
        return self:Get("TeamData", Key)
    end

    function DataHandler:GetGlobalData(Key)
        return self:Get("GlobalData", Key)
    end

    -- Register Listeners
    -- ================================================================================================================================

    function DataHandler:RegisterListener(DataType, ListenerName, Key, CallbackData)
        self.__Context.Listeners[DataType][ListenerName] = {
            Key             = Key,
            CallbackData    = CallbackData,
        }
    end

    function DataHandler:RegisterPlayerDataListener(ListenerName, Key, CallbackData)
        self:RegisterListener("PlayerData", ListenerName, Key, CallbackData)
    end

    function DataHandler:RegisterTeamDataListener(ListenerName, Key, CallbackData)
        self:RegisterListener("TeamData", ListenerName, Key, CallbackData)
    end

    function DataHandler:RegisterGlobalDataListener(ListenerName, Key, CallbackData)
        self:RegisterListener("GlobalData", ListenerName, Key, CallbackData)
    end

    -- Unregister Listeners
    -- ================================================================================================================================

    function DataHandler:UnregisterListener(DataType, ListenerName)
        self.__Context.Listeners[DataType][ListenerName] = nil
    end

    function DataHandler:UnregisterPlayerDataListener(ListenerName)
        self:UnregisterListener("PlayerData", ListenerName)
    end

    function DataHandler:UnregisterTeamDataListener(ListenerName)
        self:UnregisterListener("TeamData", ListenerName)
    end

    function DataHandler:UnregisterGlobalDataListener(ListenerName)
        self:UnregisterListener("GlobalData", ListenerName)
    end

    -- Listeners
    -- ================================================================================================================================

    function DataHandler:TriggerListener(DataType, Key)
        local ContextData       = self.__Context.Data
        local ContextListeners  = self.__Context.Listeners

        for ListenerName, ListenerData in pairs(ContextListeners[DataType] or {}) do
            if ListenerData.Key == Key then
                ListenerData.CallbackData.EventData = {
                    Key             = Key,
                    value           = ContextData[DataType][Key],
                    DataType        = DataType,
                    ListenerName    = ListenerName,
                }

                _HandleCallback(ListenerData.CallbackData)
            end
        end
    end

    -- Game Events
    -- ================================================================================================================================

    function DataHandler:OnDataHandlerUpdated(EventData)
        self.__Context.Data[EventData.data_type] = EventData.key
        self:TriggerListener(EventData.data_type, EventData.key)
    end

    function DataHandler:OnEntityDataTransmite(EventData)
        local Entity = EntIndexToHScript(EventData.entity_index)

        if Entity then
            Entity[EventData.key] = EventData.value
        end
    end

    function DataHandler:OnLinkLuaMidifier(EventData)
        LinkLuaModifier(EventData.modifier_name, EventData.modifier_path, EventData.modifier_type)
    end
end

-- Server Side
-- ================================================================================================================================

if IsServer() then

    -- Set Data
    -- ================================================================================================================================

    function DataHandler:Set(DataType, DataIndex, Key, Value, IsMerge, Context)
        Context = DataHandler:CheckContext(Context)

        local ContextData = Context.Data

        if DataIndex then
            if not ContextData[DataType][DataIndex] then ContextData[DataType][DataIndex] = {} end
        end

        local Data = DataIndex and ContextData[DataType][DataIndex] or ContextData[DataType]

        if IsMerge then
            Data[Key] = _MergeTables(Data[Key], Value)
        else
            Data[Key] = Value
        end

        self:TriggerListener(DataType, DataIndex, Key, Context)
        self:SyncData(DataType, DataIndex, Key, Data[Key])

        return Data[Key]
    end

    function DataHandler:SetGameData(Key, Value, IsMerge, Context)
        return self:Set("GameData", nil, Key, Value, IsMerge, Context)
    end

    function DataHandler:SetPlayerData(PlayerID, Key, Value, IsMerge, Context)
        return self:Set("PlayerData", PlayerID, Key, Value, IsMerge, Context)
    end

    function DataHandler:SetTeamData(TeamID, Key, Value, IsMerge, Context)
        return self:Set("TeamData", TeamID, Key, Value, IsMerge, Context)
    end

    function DataHandler:SetGlobalData(Key, Value, IsMerge, Context)
        return self:Set("GlobalData", nil, Key, Value, IsMerge, Context)
    end

    -- Get Data
    -- ================================================================================================================================

    function DataHandler:Get(DataType, DataIndex, Key, DefaultValue, Context)
        Context = DataHandler:CheckContext(Context)

        local ContextData = Context.Data

        if not DataType then return ContextData end
        if DataIndex and not ContextData[DataType][DataIndex] then ContextData[DataType][DataIndex] = {} end

        local Data = DataIndex and ContextData[DataType][DataIndex] or ContextData[DataType]

        if not Key then return Data end

        if not Data[Key] and DefaultValue then
            return self:Set(DataType, DataIndex, Key, DefaultValue, false, Context)
        end

        return Data[Key]
    end

    function DataHandler:GetGameData(Key, DefaultValue, Context)
        return self:Get("GameData", nil, Key, DefaultValue, Context)
    end

    function DataHandler:GetPlayerData(PlayerID, Key, DefaultValue, Context)
        return self:Get("PlayerData", PlayerID, Key, DefaultValue, Context)
    end

    function DataHandler:GetTeamData(TeamID, Key, DefaultValue, Context)
        return self:Get("TeamData", TeamID, Key, DefaultValue, Context)
    end

    function DataHandler:GetGlobalData(Key, DefaultValue, Context)
        return self:Get("GlobalData", nil, Key, DefaultValue, Context)
    end

    -- Sync Data
    -- ================================================================================================================================

    function DataHandler:SyncData(DataType, DataIndex, Key, Value)
        local PlayerIDsHandler = {
            PlayerData = function(data_index)
                return { data_index }
            end,

            TeamData = function(data_index)
                return _GetPlayersInTeam(data_index)
            end,

            GlobalData = function()
                return _GetPlayersInTeam()
            end,
        }

        if PlayerIDsHandler[DataType] then
            for _, PlayerID in ipairs(PlayerIDsHandler[DataType](DataIndex)) do
                local PlayerController = PlayerResource:GetPlayer(PlayerID)
                local EventData = {DataType = DataType, DataIndex = DataIndex, Key = Key, Value = Value, PlayerToken = self:GetPlayerToken(PlayerID)}

                if PlayerController then
                    CustomGameEventManager:Send_ServerToPlayer(PlayerController, "_sv_data_handler_updated", EventData)
                end
            end
        end
    end

    -- Register Listeners
    -- ================================================================================================================================

    function DataHandler:RegisterListener(DataType, DataIndex, ListenerName, Key, CallbackData, Context)
        Context = self:CheckContext(Context)

        Context.Listeners[DataType][ListenerName] = {
            Key                     = Key,
            DataIndex               = DataIndex,
            CallbackData            = CallbackData,
        }
    end

    function DataHandler:RegisterGameDataListener(ListenerName, Key, CallbackData, Context)
        self:RegisterListener("GameData", nil, ListenerName, Key, CallbackData, Context)
    end

    function DataHandler:RegisterPlayerDataListener(PlayerID, ListenerName, Key, CallbackData, Context)
        self:RegisterListener("PlayerData", PlayerID, ListenerName, Key, CallbackData, Context)
    end

    function DataHandler:RegisterTeamDataListener(TeamID, ListenerName, Key, CallbackData, Context)
        self:RegisterListener("TeamData", TeamID, ListenerName, Key, CallbackData, Context)
    end

    function DataHandler:RegisterGlobalDataListener(ListenerName, Key, CallbackData, Context)
        self:RegisterListener("GlobalData", nil, ListenerName, Key, CallbackData, Context)
    end

    -- Unregister Listeners
    -- ================================================================================================================================

    function DataHandler:UnregisterListener(DataType, ListenerName, Context)
        Context = self:CheckContext(Context)

        Context.Listeners[DataType][ListenerName] = nil
    end

    function DataHandler:UnregisterGameDataListener(ListenerName, Context)
        self:UnregisterListener("GameData", ListenerName, Context)
    end

    function DataHandler:UnregisterPlayerDataListener(ListenerName, Context)
        self:UnregisterListener("PlayerData", ListenerName, Context)
    end

    function DataHandler:UnregisterTeamDataListener(ListenerName, Context)
        self:UnregisterListener("TeamData", ListenerName, Context)
    end

    function DataHandler:UnregisterGlobalDataListener(ListenerName, Context)
        self:UnregisterListener("GlobalData", ListenerName, Context)
    end

    -- Listeners
    -- ================================================================================================================================

    function DataHandler:TriggerListener(DataType, DataIndex, Key, Context)
        Context = self:CheckContext(Context)

        local ContextData       = Context.Data
        local ContextListeners  = Context.Listeners

        for ListenerName, ListenerData in pairs(ContextListeners[DataType] or {}) do
            if ListenerData.DataIndex == DataIndex and ListenerData.Key == Key then
                local Data = DataIndex and ContextData[DataType][DataIndex][Key] or ContextData[DataType][Key]

                ListenerData.CallbackData.EventData = {
                    Key             = Key,
                    Value           = ContextData[DataType][Key],
                    DataType        = DataType,
                    ListenerName    = ListenerName,
                }

                _HandleCallback(ListenerData.CallbackData)
            end
        end
    end

    -- Client Events
    -- ================================================================================================================================

    function DataHandler:OnClientRequestData(EventData)
        if EventData.PlayerID < 0 then return end

        local function sync_client_data(player_id, event_data)
            local PlayerController = PlayerResource:GetPlayer(player_id)

            if PlayerController then
                CustomGameEventManager:Send_ServerToPlayer(PlayerController, "_sv_data_handler_updated", event_data)
            end
        end

        local DataIndexes = {
            TeamData    = function(player_id) return PlayerResource:GetCustomTeamAssignment(player_id) end,
            PlayerData  = function(player_id) return player_id end,
            GlobalData  = function() end,
        }

        if EventData.DataType then
            if not DataIndexes[EventData.DataType] then return print("[DataHandler] Not valid DataType '"..EventData.DataType.."'.") end
        end

        local IsHasDataIndex = DataIndexes[EventData.DataType]

        local DataIndex = IsHasDataIndex and DataIndexes[EventData.DataType](EventData.PlayerID) or nil

        if EventData.DataType then
            if EventData.Key then
                local Data = DataHandler:Get(EventData.DataType, DataIndex, EventData.Key)

                if Data then
                    sync_client_data(EventData.PlayerID, {DataType = EventData.DataType, DataIndex = DataIndex, Key = EventData.Key, Value = Data})
                else
                    print("[DataHandler] Data does not exist for DataType = '"..EventData.DataType.."', DataIndex = '"..DataIndex.."', Key = '"..EventData.Key.."'.")
                end
            else
                local Data = DataHandler:Get(EventData.DataType, DataIndex)

                for Key, Value in pairs(Data) do
                    sync_client_data(EventData.PlayerID, {DataType = EventData.DataType, DataIndex = DataIndex, Key = Key, Value = Value})
                end
            end
        else
            for Type, DataByType in pairs(DataHandler:Get()) do
                if DataIndexes[Type] then
                    DataIndex = DataIndexes[Type](EventData.PlayerID)

                    for Key, Value in pairs(DataIndex and DataByType[DataIndex] or DataByType) do
                        sync_client_data(EventData.PlayerID, {DataType = Type, DataIndex = DataIndex, Key = Key, Value = Value})
                    end
                end
            end
        end
    end

    function DataHandler:OnPlayerTokenUpdated(EventData)
        if EventData.PlayerID > -1 then
            DataHandler:GetDefaultContext().PlayersToken[EventData.PlayerID] = EventData.PlayerToken
        end
    end

    -- Other
    -- ================================================================================================================================

    function DataHandler:TransmiteEntityData(PlayerID, EntityIndex, Key, Value)
        local PlayerController = PlayerResource:GetPlayer(PlayerID)

        if not PlayerController then return end

        CustomGameEventManager:Send_ServerToPlayer(PlayerController, "_sv_data_handler_transmite_entity_data", {
            PlayerToken = self:GetPlayerToken(PlayerID),
            EntityIndex = EntityIndex,
            Key         = Key,
            Value       = Value,
        })
    end

    function DataHandler:LinkLuaModifier(ModifierName, ModifierPath, ModifierType)
        LinkLuaModifier(ModifierName, ModifierPath, ModifierType)

        FireGameEvent("_sv_data_handler_link_lua_modifier", {
            modifier_name = ModifierName,
            modifier_path = ModifierPath,
            modifier_type = ModifierType,
        })
    end

    function DataHandler:LinkLuaModifiers(Modifiers)
        for _, ModifierData in pairs(Modifiers or {}) do
            self:LinkLuaModifier(ModifierData[1], ModifierData[2], ModifierData[3])
        end
    end

    function DataHandler:GetPlayerToken(PlayerID, Context)
        Context = self:CheckContext(Context)

        return Context.PlayersToken[PlayerID]
    end

    function DataHandler:RequestPlayerToken(PlayerID)
        if PlayerID then
            local PlayerController = PlayerResource:GetPlayer(PlayerID)

            if not PlayerController then return end

            CustomGameEventManager:Send_ServerToPlayer(PlayerController, "_sv_data_handler_request_player_token", {})
        else
            CustomGameEventManager:Send_ServerToAllClients("_sv_data_handler_request_player_token", {})
        end
    end

    function DataHandler:SendCustomEvent(PlayerID, EventName, EventData)
        local PlayerController = PlayerResource:GetPlayer(PlayerID)

        if not PlayerController then return end

        EventData.PlayerToken = self:GetPlayerToken(PlayerID)

        CustomGameEventManager:Send_ServerToPlayer(PlayerController, EventName, EventData)
    end

    -- Debug
    -- ================================================================================================================================

    function DataHandler:DebugData(DataType, Context)
        Context = DataHandler:CheckContext(Context)

        _DeepPrint(DataType and Context.Data[DataType] or Context)
    end
end

return DataHandler