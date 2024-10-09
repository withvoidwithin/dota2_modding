-- ============== Copyright © 2024, WITHVOIDWITHIN, All rights reserved. =============

-- Version 2.0
-- Author: https://steamcommunity.com/id/withvoidwithin/
-- Source: https://github.com/withvoidwithin/dota2_modding
-- ===================================================================================

if not _G._UNITS_HANDLER then
    _G._UNITS_HANDLER = {}
end

-- Main
-- ================================================================================================================================

function _UNITS_HANDLER:InitBaseModifiers(Unit)
    local UnitKV = GetUnitKeyValuesByName(Unit:GetUnitName())

    if not UnitKV then return end

    for ModifierName, KV in pairs(UnitKV._Modifiers or {}) do
        Unit:AddNewModifier(Unit, nil, ModifierName, KV)
    end
end

function _UNITS_HANDLER:InitHullRadius(Unit)
    local UnitKV = GetUnitKeyValuesByName(Unit:GetUnitName())

    if not UnitKV then return end

    if UnitKV._HullRadius then Unit:SetHullRadius(tonumber(UnitKV._HullRadius)) end
end

function _UNITS_HANDLER:InitSpawnAngles(Unit)
    local UnitKV = GetUnitKeyValuesByName(Unit:GetUnitName())

    if not UnitKV then return end

    if UnitKV._SpawnAngles then Unit:SetAngles(0, UnitKV._SpawnAngles, 0) end
end

-- Game Events
-- ================================================================================================================================

function _UNITS_HANDLER:OnGameEventUnitSpawned(EventData)
    local Unit = EntIndexToHScript(EventData.entindex)

    if not Unit then return end

    self:InitBaseModifiers(Unit)
    self:InitHullRadius(Unit)
    self:InitSpawnAngles(Unit)
end

function _UNITS_HANDLER:OnEntityKilled(EventData)
	local Unit = EntIndexToHScript(EventData.entindex_killed)

    if not Unit then return end

	_OnEntityCustomEvent("OnEntityKilled", EventData, Unit)
end

-- Init
-- ================================================================================================================================

_RegisterGameEventListeners(_UNITS_HANDLER, {
    npc_spawned     = "OnGameEventUnitSpawned",
    entity_killed   = "OnEntityKilled",
})