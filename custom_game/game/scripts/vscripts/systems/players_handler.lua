-- ============== Copyright © 2024, WITHVOIDWITHIN, All rights reserved. =============

-- Version: 1.1
-- Author: https://steamcommunity.com/id/withvoidwithin/
-- Source: https://github.com/withvoidwithin/dota2_modding
-- Required: addon_base.lua
-- ===================================================================================

if IsClient() then return end

local PlayersHandler = {}

-- Main
-- ================================================================================================================================

function PlayersHandler:Init(Data)
    Data.ContextGameModeData.PlayersHandler = Data.ContextGameModeData.PlayersHandler or {
        Players = {},
    }

    self:SetDefaultContext(Data.ContextGameModeData.PlayersHandler)

    _RegisterGameEventListeners(Data.ContextGameEventListeners, "PlayersHandler", {
        player_connect_full = { Context = PlayersHandler, FunctionName = "OnGameEventPlayerConnectFull" },
    })
end

function PlayersHandler:SetDefaultContext(Context)
    self.__Context = Context
end

function PlayersHandler:GetDefaultContext()
    return self.__Context
end

-- Init Players 
-- ================================================================================================================================

function PlayersHandler:InitPlayer(PlayerID, TemplateData, Context)
    Context = Context or self:GetDefaultContext()

    local PlayersData = Context.Players

    PlayersData[PlayerID] = TemplateData or {
        PlayerID                = PlayerID,
        SteamID64               = PlayerResource:GetSteamID(PlayerID),
        SteamAccountID          = PlayerResource:GetSteamAccountID(PlayerID),
        IsBotPlayer             = PlayerResource:IsFakeClient(PlayerID),

        PlayerHero              = nil,
        SessionData             = {},
        AccountData             = {},
        CustomUIPanels          = {},
    }
end

function PlayersHandler:InitAllPlayers(TemplateData, Context)
    Context = Context or self:GetDefaultContext()

    for PlayerID = 0, DOTA_MAX_TEAM_PLAYERS do
        if PlayerResource:IsValidPlayerID(PlayerID) and PlayerResource:GetPlayer(PlayerID) then
            self:InitPlayer(PlayerID, TemplateData, Context)
        end
    end
end

function PlayersHandler:InitBotsPlayers(BotsCount, HeroName, Team, VScript, TemplateData, Context)
    Context = Context or self:GetDefaultContext()

    for PlayerID = 0, DOTA_MAX_TEAM_PLAYERS do
        if not PlayerResource:IsValidPlayerID(PlayerID) and not PlayerResource:GetPlayer(PlayerID) then
            if BotsCount > 0 then
                GameRules:AddBotPlayerWithEntityScript(HeroName or "", "BOT_"..PlayerID, Team or DOTA_TEAM_NOTEAM, VScript or "", false)

                self:InitPlayer(PlayerID, TemplateData, Context)

                BotsCount = BotsCount - 1
            else
                break
            end
        end
    end
end

-- Players Data
-- ================================================================================================================================

function PlayersHandler:GetPlayerData(PlayerID, Context)
    Context = Context or self:GetDefaultContext()

    return PlayerID and Context.Players[PlayerID] or Context.Players
end

function PlayersHandler:GetBotPlayerData(PlayerID, Context)
    Context = Context or self:GetDefaultContext()

    local PlayersData = Context.Players

    if PlayerID and PlayersData[PlayerID] and PlayersData[PlayerID].IsBotPlayer then
        return PlayersData[PlayerID]
    end

    local Bots = {}

    for PlayerID, PlayerData in pairs(self:GetPlayerData(nil, Context)) do
        if Context.Players[PlayerID].IsBotPlayer then
            Bots[PlayerID] = PlayerData
        end
    end

    return Bots
end

-- PlayerHero
-- ================================================================================================================================

function PlayersHandler:IndexPlayerHero(PlayerHero, Context)
    Context = Context or self:GetDefaultContext()

    if PlayerHero:GetPlayerOwnerID() then
        self:GetPlayerData(PlayerHero:GetPlayerOwnerID(), Context).PlayerHero = PlayerHero
    end
end

function PlayersHandler:IsAllPlayerHeroIndexed(Context)
    Context = Context or self:GetDefaultContext()

    for _, PlayerData in pairs(self:GetPlayerData(nil, Context)) do
        if not PlayerData.PlayerHero then
            return false
        end
    end

    return true
end

function PlayersHandler:GetPlayerHero(PlayerID, Context)
    Context = Context or self:GetDefaultContext()

    if not PlayerID then
        local PlayersHero = {}

        for PlayerID, PlayerData in pairs(self:GetPlayerData(nil, Context)) do
            PlayersHero[PlayerID] = PlayerData.PlayerHero
        end

        return PlayersHero
    end

    return Context.Players[PlayerID].PlayerHero
end

-- Custom UI Panels
-- ================================================================================================================================

function PlayersHandler:CreatePlayerUIPanel(UIPanelID, UIPanelPath, DialogVariables, PlayerID, Context)
    Context = Context or self:GetDefaultContext()

    local PlayersData = Context.Players

    if not PlayerID then
        for ThisPlayerID in pairs(self:GetPlayerData()) do
            self:CreatePlayerUIPanel(UIPanelID, UIPanelPath, DialogVariables, ThisPlayerID, Context)
        end
    else
        PlayersData[PlayerID].CustomUIPanels[UIPanelID] = {
            UIPanelPath     = UIPanelPath,
            DialogVariables = DialogVariables,
        }

        CustomUI:DynamicHud_Create(PlayerID, UIPanelID, UIPanelPath, DialogVariables)
    end
end

function PlayersHandler:RemovePlayerUIPanel(UIPanelID, PlayerID, Context)
    Context = Context or self:GetDefaultContext()

    local PlayersData = Context.Players

    if not PlayerID then
        for ThisPlayerID in pairs(self:GetPlayerData()) do
            self:RemovePlayerUIPanel(UIPanelID, ThisPlayerID, Context)
        end
    else
        PlayersData[PlayerID].CustomUIPanels[UIPanelID] = nil

        CustomUI:DynamicHud_Destroy(PlayerID, UIPanelID)
    end
end

function PlayersHandler:InitPlayerUIPanels(PlayerID, Context)
    Context = Context or self:GetDefaultContext()

    if not Context then return end

    local PlayersData = Context.Players

    if not PlayerID then
        for ThisPlayerID in pairs(self:GetPlayerData()) do
            self:InitPlayerUIPanels(ThisPlayerID, Context)
        end
    else
        if PlayersData[PlayerID] then
            for UIPanelName, UIPanelData in pairs(PlayersData[PlayerID].CustomUIPanels or {}) do
                CustomUI:DynamicHud_Create(PlayerID, UIPanelName, UIPanelData.UIPanelPath, UIPanelData.DialogVariables)
            end
        end
    end
end

function PlayersHandler:HasPlayerUIPanel(PlayerID, UIPanelName, Context)
    Context = Context or self:GetDefaultContext()

    if not Context then return end

    local PlayersData = Context.Players

    if PlayersData[PlayerID].CustomUIPanels[UIPanelName] then return true end

    return false
end

-- Game Events
-- ================================================================================================================================

function PlayersHandler:OnGameEventPlayerConnectFull(EventData)
    self:InitPlayerUIPanels(EventData.PlayerID)
end

return PlayersHandler
