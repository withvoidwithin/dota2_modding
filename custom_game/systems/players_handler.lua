-- ============== Copyright © 2024, WITHVOIDWITHIN, All rights reserved. =============

-- Version 3.0
-- Author: https://steamcommunity.com/id/withvoidwithin/
-- Source: https://github.com/withvoidwithin/dota2_modding
-- ===================================================================================

if not _G._PLAYERS_HANDLER then
    _G._PLAYERS_HANDLER = {}
end

-- Main
-- ================================================================================================================================

--- Устанавливает дефолтный контекст данных игроков, чтобы не передавать его в аргументе методов системы.
--- @param ContextData table Таблица для записи и обработки данных игроков.
function _PLAYERS_HANDLER:SetContextPlayersData(ContextData)
    self.__ContextPlayersData = ContextData
end

--- Инициализирует таблицу данных всех существующих игроков, включая ботов.
--- @param TemplateData table|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:InitPlayers(TemplateData, ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    for PlayerID = 0, DOTA_MAX_TEAM_PLAYERS do
        if PlayerResource:IsValidPlayerID(PlayerID) and PlayerResource:GetPlayer(PlayerID) then
            self:InitPlayer(PlayerID, TemplateData, ContextData)
        end
    end
end

--- Инициализирует таблицу данных игрока или бота.
--- @param PlayerID PlayerID
--- @param TemplateData table|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:InitPlayer(PlayerID, TemplateData, ContextData)
    local Data = TemplateData or {
        PlayerID                = PlayerID,
        SteamID64               = PlayerResource:GetSteamID(PlayerID),
        SteamAccountID          = PlayerResource:GetSteamAccountID(PlayerID),
        IsBotPlayer             = PlayerResource:IsFakeClient(PlayerID),

        PlayerHero              = nil,
        ClientData              = {},
        SessionData             = {},
        AccountData             = {},
        CustomUIPanels          = {},
    }

    ContextData = ContextData or self.__ContextPlayersData

    if not ContextData[PlayerID] then ContextData[PlayerID] = {} end

    ContextData[PlayerID] = Data
end

--- Создает ботов и инициализирует их данные.
--- @param BotsCount number
--- @param HeroName string|nil
--- @param Team DOTATeam_t|nil
--- @param VScript string|nil
--- @param TemplateData table|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:InitBotsPlayers(BotsCount, HeroName, Team, VScript, TemplateData, ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    for PlayerID = 0, DOTA_MAX_TEAM_PLAYERS do
        if not PlayerResource:IsValidPlayerID(PlayerID) and not PlayerResource:GetPlayer(PlayerID) then
            if BotsCount > 0 then
                GameRules:AddBotPlayerWithEntityScript(HeroName or "", "BOT_"..PlayerID, Team or DOTA_TEAM_NOTEAM, VScript or "", false)

                self:InitPlayer(PlayerID, TemplateData, ContextData)

                BotsCount = BotsCount - 1
            else
                break
            end
        end
    end
end

--- Возвращает таблицу с данными игрока. <br>
--- Если PlayerID нет, то вернет таблицу с данными всех игроков включая ботов.
--- @param PlayerID PlayerID|nil
--- @param ContextData table|nil
--- @return table
function _PLAYERS_HANDLER:GetPlayerData(PlayerID, ContextData)
    ContextData = ContextData or self.__ContextPlayersData or {}

    if PlayerID then return ContextData[PlayerID] end

    return ContextData
end

--- Возвращает таблицу с данными бота. <br>
--- Если PlayerID нет, то вернет таблицу с данными всех ботов.
--- @param PlayerID PlayerID|nil
--- @param ContextData table|nil
--- @return table
function _PLAYERS_HANDLER:GetBotPlayerData(PlayerID, ContextData)
    ContextData = ContextData or self.__ContextPlayersData or {}

    if PlayerID and ContextData[PlayerID].IsBotPlayer then
        return ContextData[PlayerID]
    end

    local Bots = {}

    for PlayerID, PlayerData in pairs(ContextData) do
        if ContextData[PlayerID].IsBotPlayer then
            Bots[PlayerID] = PlayerData
        end
    end

    return Bots
end

-- Player Hero
-- ================================================================================================================================

--- Индексирует героя игрока в контекстных данных.
--- @param PlayerHero CDOTA_BaseNPC_Hero
--- @param ContextData table|nil
function _PLAYERS_HANDLER:IndexPlayerHero(PlayerHero, ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    local PlayerOwnerID = PlayerHero:GetPlayerOwnerID()

    if PlayerOwnerID then
        ContextData[PlayerOwnerID].PlayerHero = PlayerHero
    end
end

--- Имеют ли все контекстные игроки индексированных героев в контекстных данных.
--- @param ContextData table|nil
function _PLAYERS_HANDLER:IsAllPlayerHeroIndexed(ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    for _, PlayerData in pairs(ContextData) do
        if not PlayerData.PlayerHero then
            return false
        end
    end

    return true
end

--- Получить индексированного героя игрока в контекстных данных.
--- <br> Если PlayerID нет, то вернет таблицу со всеми героями игроков.
--- @param PlayerID PlayerID|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:GetPlayerHero(PlayerID, ContextData)
    ContextData = ContextData or self.__ContextPlayersData or {}

    if not PlayerID then
        local PlayersHero = {}

        for PlayerID, PlayerData in pairs(self:GetPlayerData(nil, ContextData)) do
            PlayersHero[PlayerID] = PlayerData.PlayerHero
        end

        return PlayersHero
    end

    return ContextData[PlayerID].PlayerHero
end

-- Custom UI Panels
-- ================================================================================================================================

--- Создает кастомную UI панель в Panorama игрока.
--- <br> Если PlayerID нет, то создаст для всех игроков.
--- ```lua
--- UIPanelPath = "file://{resources}/layout/custom_game/custom_hud_elements/example_panel/example_panel.xml"
--- ```
--- @param UIPanelID string
--- @param UIPanelPath string
--- @param DialogVariables table|nil
--- @param PlayerID PlayerID|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:CreatePlayerUIPanel(UIPanelID, UIPanelPath, DialogVariables, PlayerID, ContextData)
    ContextData = ContextData or self.__ContextPlayersData or {}

    if not PlayerID then
        for ThisPlayerID in pairs(self:GetPlayerData()) do
            self:CreatePlayerUIPanel(UIPanelID, UIPanelPath, DialogVariables, ThisPlayerID, ContextData)
        end
    else
        ContextData[PlayerID].CustomUIPanels[UIPanelID] = {
            UIPanelPath     = UIPanelPath,
            DialogVariables = DialogVariables,
        }

        CustomUI:DynamicHud_Create(PlayerID, UIPanelID, UIPanelPath, DialogVariables)
    end
end

--- Удаляет существующию кастомную UI панель в Panorama игрока.
--- <br> Если PlayerID нет, то удалит для всех игроков.
--- @param UIPanelID string
--- @param PlayerID PlayerID|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:RemovePlayerUIPanel(UIPanelID, PlayerID, ContextData)
    ContextData = ContextData or self.__ContextPlayersData or {}

    if not PlayerID then
        for ThisPlayerID in pairs(self:GetPlayerData()) do
            self:RemovePlayerUIPanel(UIPanelID, ThisPlayerID, ContextData)
        end
    else
        ContextData[PlayerID].CustomUIPanels[UIPanelID] = nil

        CustomUI:DynamicHud_Destroy(PlayerID, UIPanelID)
    end
end

--- Повторно создает уже созданные кастомные UI панели игрока.
--- <br> если PlayerID нет, сделает для всех игроков.
--- @param PlayerID PlayerID|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:InitPlayerUIPanels(PlayerID, ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    if not ContextData then return end

    if not PlayerID then
        for ThisPlayerID in pairs(self:GetPlayerData()) do
            self:InitPlayerUIPanels(ThisPlayerID, ContextData)
        end
    else
        if ContextData[PlayerID] then
            for UIPanelName, UIPanelData in pairs(ContextData[PlayerID].CustomUIPanels or {}) do
                CustomUI:DynamicHud_Create(PlayerID, UIPanelName, UIPanelData.UIPanelPath, UIPanelData.DialogVariables)
            end
        end
    end
end

--- Имеет ли игрок указанную кастомную UI панель.
--- @param PlayerID PlayerID
--- @param UIPanelName string
--- @param ContextData table|nil
function _PLAYERS_HANDLER:HasPlayerUIPanel(PlayerID, UIPanelName, ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    if not ContextData then return end

    if ContextData[PlayerID].CustomUIPanels[UIPanelName] then return true end

    return false
end

function _PLAYERS_HANDLER:OnGameEventPlayerConnectFull(EventData)
    self:InitPlayerUIPanels(EventData.PlayerID)
end

-- Custom Clients Data
-- ================================================================================================================================

--- Устанавливает данные для клиента, которые автоматически синхронизируются в Panorama.
--- <br> Для корректной работы, в Panorama нужно подписаться на эвент от сервера ``"_sv_client_data_update"`` и обработать его.
--- <br> Либо воспользоваться готовым модулем addon_base для Panorama.
--- @param PlayerID PlayerID
--- @param KeyName string
--- @param Data table
--- @param IsMergeData bool|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:SetClientData(PlayerID, KeyName, Data, IsMergeData, ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    local PlayerData = self:GetPlayerData(PlayerID, ContextData)

    if not PlayerData.ClientData[KeyName] then PlayerData.ClientData[KeyName] = {} end

    if IsMergeData then
        PlayerData.ClientData[KeyName] = _MergeTables(PlayerData.ClientData[KeyName], Data)
    else
        PlayerData.ClientData[KeyName] = Data
    end

    self:SyncClientData(PlayerID, KeyName, ContextData)

    return PlayerData.ClientData[KeyName]
end

--- Возвращает указанные данные клиента.
--- <br> Если KeyName нет, вернет все данные клиента.
--- @param PlayerID PlayerID
--- @param KeyName string|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:GetClientData(PlayerID, KeyName, ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    local PlayerData = self:GetPlayerData(PlayerID, ContextData)

    if not KeyName then return PlayerData.ClientData end

    return PlayerData.ClientData[KeyName]
end

--- Удаляет указанные данные клиента.
--- @param PlayerID PlayerID
--- @param KeyName string
--- @param ContextData table|nil
function _PLAYERS_HANDLER:RemoveClientData(PlayerID, KeyName, ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    local PlayerData = self:GetPlayerData(PlayerID, ContextData)

    PlayerData.ClientData[KeyName] = nil

    self:SyncClientData(PlayerID, KeyName, ContextData)
end

--- Синхранизирует заданные данные для клиента в Panorama.
--- <br> Если KeyName нет, то синхранизирует все данные клиента.
--- @param PlayerID PlayerID
--- @param KeyName string|nil
--- @param ContextData table|nil
function _PLAYERS_HANDLER:SyncClientData(PlayerID, KeyName, ContextData)
    ContextData = ContextData or self.__ContextPlayersData

    local PlayerData        = self:GetPlayerData(PlayerID, ContextData)
    local PlayerController  = PlayerResource:GetPlayer(PlayerID)
    local SyncTable         = {ClientData = PlayerData.ClientData}

    if KeyName then
        SyncTable = {KeyName = KeyName, Data = PlayerData.ClientData[KeyName]}
    end

    if PlayerController then
        CustomGameEventManager:Send_ServerToPlayer(PlayerController, "_sv_client_data_update", SyncTable)
    end
end

--- Для корректной работы запросов от клиента, нужно установить контекстные данные с помощью:
--- ```lua
--- _PLAYER_HANDLER:SetContextPlayersData(ContextData)
--- ```
function _PLAYERS_HANDLER:OnPlayerGetClientData(EventData)
    if EventData.PlayerID >= 0 then
        _PLAYERS_HANDLER:SyncClientData(EventData.PlayerID)
    end
end

-- Init
-- ================================================================================================================================

_RegisterGameEventListeners(_PLAYERS_HANDLER, { player_connect_full = "OnGameEventPlayerConnectFull" })
_RegisterClientEventListeners(_PLAYERS_HANDLER, { _cl_get_client_data = "OnPlayerGetClientData" })