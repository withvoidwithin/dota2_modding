// ================ Copyright © 2024, WVW, All rights reserved. ================

// Version 4.8
// Author: https://steamcommunity.com/id/withvoidwithin/
// =============================================================================

// Base
// ================================================================================================================================

/**
 * @param {number} Seconds
 * @param {number} Fix
 */
Game._FormatTime = function(Seconds, Fix){
    const Min = Math.floor(Seconds / 60)
    let Sec = Number((Seconds % 60).toFixed(Fix || 0))

    if (Sec === 60) {
        Sec = 0
        return (Min + 1) + ":00"
    }

    return Min + ":" + (Sec < 10 ? "0" : "") + Sec
}

Game._ValueToBool = function(Value){
    return Value == 1 || Value == "1"
}

Game._Clamp = function(Number, Min = 0, Max = Number) {
    return Math.max(Min, Math.min(Max, Number))
}

/**
 * @param {string} SteamID64
 */
Game._SteamID64ToSteamID32 = function(SteamID64){
    return Number(SteamID64.substr(-16,16)) - 6561197960265728
}

/**
 * @param {Array} Vec1
 * @param {Array} Vec2
 */
Game._EqualVectors = function(Vec1, Vec2){
    return Vec1[0] == Vec2[0] && Vec1[1] == Vec2[1] && Vec1[2] == Vec2[2]
}

Game._ToUpperFirstWord = function(String){
    return String.charAt(0).toUpperCase() + String.slice(1)
}

// Dota Default
// ================================================================================================================================

Game._FindPanel = function(PanelID){
    return $.GetContextPanel().FindAncestor("DotaHud").FindChildTraverse(PanelID)
}

Game._SetDefaultUIPanelVisible = function(PanelID, IsVisible){
    Game._FindPanel(PanelID).visible = IsVisible
}

// UI
// ================================================================================================================================

Game._SetUIData = function(ConfigName, Data){
    return GameUI.CustomUIConfig()[ConfigName] = Data
}

Game._GetUIData = function(ConfigName, BaseData){
    const Config = GameUI.CustomUIConfig()[ConfigName]

    if(!Config && BaseData) return GameUI.CustomUIConfig()[ConfigName] ||= BaseData
    
    return Config
}

/**
 * @param {string} ConfigName 
 */
Game._DeleteUIData = function(ConfigName){
    delete GameUI.CustomUIConfig()[ConfigName]
}

/**
 * @param {object} PanelData
 * @param {object} ContextData
 * @param {boolean} IsRecreate
 * @returns {object}
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
 * @param {object} Panel
 * @param {string} TooltipID
 * @param {string} TooltipPath
 * @param {object} TooltipData
 */
Game._CreateCustomTooltip = function(Panel, TooltipID, TooltipPath, TooltipData){
    Panel.SetPanelEvent("onmouseover",  () => $.DispatchEvent( 'UIShowCustomLayoutParametersTooltip', Panel, TooltipID, TooltipPath, "TooltipParams=" + JSON.stringify(TooltipData)))
    Panel.SetPanelEvent("onmouseout",   () => $.DispatchEvent( 'UIHideCustomLayoutTooltip', Panel, TooltipID))
}

Game._CreateCustomKeyBindButton = function(KeyBindButtonData){
    const KeyBindButton = Game._CreateCustomPanel({
        PanelType: "Button",
        Parent: KeyBindButtonData.Parent,
        PanelID: KeyBindButtonData.ButtonID,
        XML: KeyBindButtonData.XML,
    }, {ButtonName: KeyBindButtonData.KeyBindButtonName, KeyBindName: KeyBindButtonData.KeyBindName, Callback: KeyBindButtonData.OnActivateCallback})

    $.RegisterKeyBind(KeyBindButtonData.FocusPanel, KeyBindButtonData.KeyBindKey.toLowerCase(), KeyBindButtonData.OnActivateCallback)

    return KeyBindButton
}

Game._RemoveCustomKeyBindButton = function(KeyBindButton, FocusPanel, ButtonName){
    KeyBindButton.DeleteAsync(0)

    $.RegisterKeyBind(FocusPanel, "key_" + ButtonName.toLowerCase(), ()=>{})
}

/**
 * @param {object} Panel
 */
Game._SetFocusPanel = function(Panel){
    Game._SetUIData("_FocusedPanel", Panel)

    Panel.SetAcceptsFocus(true)
    Panel.SetFocus()
}

/**
 * @returns {object}
 */
Game._GetFocusPanel = function(){
    return Game._GetUIData("_FocusedPanel")
}

Game._DropFocusPanel = function(){
    Game._DeleteUIData("_FocusedPanel")

    $.DispatchEvent("DropInputFocus")
}

/**
 * @param {object} Panel
 * @param {boolean} IsVisible
 */
Game._SetCustomUIPanelVisible = function(Panel, IsVisible){
    Panel.SetHasClass("_VISIBLE", IsVisible)
    Panel.SetHasClass("_HIDDEN", !IsVisible)

    // if(IsVisible)   Panel.visible = true
    // else            $.Schedule(Delay || 3, () => Panel.BHasClass("_Hidden") ? Panel.visible = false : null)
}

/**
 * @param {object} Panel
 * @param {string} GroupName "Must be unique."
 */
Game._AddUIPanelToGroup = function(Panel, GroupName){
    const Groups = Game._GetUIData("_UIGroupPanels", {})

    Groups[GroupName] ||= {}
    Groups[GroupName][Panel.id] = Panel
}

/**
 * @param {string} GroupName
 * @param {boolean} IsVisible
 * @param {number|undefined} Delay
 */
Game._SetUIPanelGroupVisible = function(GroupName, IsVisible, Delay){
    const UIGroupPanels = Game._GetUIData("_UIGroupPanels")
    
    if(!UIGroupPanels) return

    for(const PanelID in UIGroupPanels[GroupName] || {}){
        Game._SetCustomUIPanelVisible(UIGroupPanels[GroupName][PanelID], IsVisible, Delay)
    }
}

// Client Data
// ================================================================================================================================

/**
 * @param {string} KeyName
 * @param {string} ListenerName 
 * @param {function} Callback
 */
Game._RegisterListenerClientDataUpdates = function(KeyName, ListenerName, Callback){
    const ListenerClientData = Game._GetUIData("_ListenerClientData", {})

    ListenerClientData[KeyName] ||= {}
    ListenerClientData[KeyName][ListenerName] = Callback
}

/**
 * @param {string} KeyName
 * @param {string} ListenerName 
 */
Game._UnregisterListenerClientDataUpdates = function(KeyName, ListenerName){
    const ListenerClientData = Game._GetUIData("_ListenerClientData", {})

    ListenerClientData[KeyName] ||= {}

    delete ListenerClientData[KeyName][ListenerName]
}

/**
 * @param {string|undefined} KeyName 
 */
Game._GetLocalClientData = function(KeyName){
    if(KeyName) return Game._GetUIData("_ClientData")[KeyName]
    
    return Game._GetUIData("_ClientData")
}

// Custom
// ================================================================================================================================

/**
 * @param {string} CommandName
 * @param {function} Callback
 * @param {string} Description
 * @param {number} ConVarFlag
 * @returns {string}
 */
Game._RegisterCommand = function(CommandName, Callback, Description, ConVarFlag){
    const CommandsData      = Game._GetUIData("_CommandsData", {})
    const CommandNameID     = (CommandsData[CommandName] || 0) + 1
    const CommandNameUnique = `${CommandName}_${CommandNameID}`

    CommandsData[CommandName] = CommandNameID

    Game.AddCommand(CommandNameUnique, Callback, Description, ConVarFlag)

    return CommandNameUnique
}

/**
 * @param {object} KeyBindsTable 
 * ```js
    KeyBindsTable = {
        W: {
            Command:    "_custom_movement_move_up",
            Callback:   OnKeyBindMovePressed,
        },
        SPACE: {
            Command:    "_player_space",
            Callback:   function(){},
        }
    }
 * ```
 */
Game._RegisterKeyBinds = function(KeyBindsTable){
    for(let Key in KeyBindsTable){
        Game.CreateCustomKeyBind(Key,
            Game._RegisterCommand("+" + KeyBindsTable[Key].Command, () => KeyBindsTable[Key].Callback(Key, true), "", 0),
            Game._RegisterCommand("-" + KeyBindsTable[Key].Command, () => KeyBindsTable[Key].Callback(Key, false), "", 0)
        )
    }
}

/**
 * @param {string} ListenerName 
 * @param {function} Callback
 */
Game._RegisterListenerMouseCallback = function(ListenerName, Callback){
    const GlobalMouseCallbacks = Game._GetUIData("_ListenerMouseCallbacks", {})

    GlobalMouseCallbacks[ListenerName] = Callback
}

/**
 * @param {string} ListenerName 
 */
Game._UnregisterListenerMouseCallback = function(ListenerName){
    delete Game._GetUIData("_ListenerMouseCallbacks")[ListenerName]
}

Game._RegisterListenerEscapeCallback = function(ListenerName, Callback){
    let EscapePressedData = Game._GetUIData("_EscapePressedData", {IsPressed: false, Callbacks: {}})

    EscapePressedData.Callbacks[ListenerName] = Callback

    Game._SetUIData("_EscapePressedData", EscapePressedData)
}

Game._UnregisterListenerEscapeCallback = function(ListenerName){
    let EscapePressedData = Game._GetUIData("_EscapePressedData", {IsPressed: false, Callbacks: {}})

    delete EscapePressedData.Callbacks[ListenerName]

    Game._SetUIData("_EscapePressedData", EscapePressedData)
}

Game._GetCursorTarget = function(){
    const Entities = GameUI.FindScreenEntities(GameUI.GetCursorPosition())
 
    for (const Entity of Entities){
        if(Entity.accurateCollision) return Entity.entityIndex
    }
 
    return Entities.length > 0 ? Entities[0].entityIndex : 0
}

/**
 * @param {number} EntityIndex 
 * @param {string} BuffName 
 * @returns {number|undefined}
 */
Game._FindModifierByName = function(EntityIndex, BuffName){
    for(let i = 0; i <= Entities.GetNumBuffs(EntityIndex) - 1; i++){
        const BuffIndex = Entities.GetBuff(EntityIndex, i )

        if(Buffs.GetName(EntityIndex, BuffIndex) == BuffName) return BuffIndex
    }
}

// Main
// ================================================================================================================================
function InitClientData(){
    if(Game.GetState() > DOTA_GameState.DOTA_GAMERULES_STATE_INIT){
        if(!Game._GetUIData("_ClientData")) GameEvents.SendCustomGameEventToServer( "_cl_get_client_data", {})
    }
}

// Events
// ================================================================================================================================
function OnGlobalMouseCallback(Status, MouseButtonID){
    let IsIgnoreMouse = false

    const _ListenerMouseCallbacks = Game._GetUIData("_ListenerMouseCallbacks", {})

    for(const ListenerName in _ListenerMouseCallbacks){
        const Callback = _ListenerMouseCallbacks[ListenerName](Status, MouseButtonID)

        if(Callback) IsIgnoreMouse = true
    }

    return IsIgnoreMouse
}

/**
 * @param {object} LostFocusedPanel 
 */
function OnInputFocusLost(LostFocusedPanel){
    if(Game._GetFocusPanel() === LostFocusedPanel) Game._SetFocusPanel(LostFocusedPanel)
}

function OnEscapePressed(){
    let EscapePressedData = Game._GetUIData("_EscapePressedData", {IsPressed: false, Callbacks: {}})

    EscapePressedData.IsPressed = !EscapePressedData.IsPressed

    Game._SetUIData("_EscapePressedData", EscapePressedData)

    for(const CallbackName in EscapePressedData.Callbacks){
        EscapePressedData.Callbacks[CallbackName](EscapePressedData.IsPressed)
    }
}

// Server Events
// ================================================================================================================================

function OnTransmiteEntDataToClientLua(EventData){
    GameEvents.SendEventClientSide("transmit_ent_data_to_client_lua", {
        ent_index:  EventData.EntityIndex,
        key_name:   EventData.KeyName,
        data:       EventData.Data,
    })
}

function OnClientDataUpdated(EventData){
    let ClientData

    if(EventData.ClientData){
        ClientData = Game._SetUIData("_ClientData", EventData.ClientData)
    } else {
        ClientData = Game._SetUIData("_ClientData", {...Game._GetUIData("_ClientData", {}), ...{[EventData.KeyName]: EventData.Data}})
    }

    const ListenerClientData = Game._GetUIData("_ListenerClientData", {})

    if(EventData.KeyName){
        for(const ListenerName in ListenerClientData[EventData.KeyName]){
            ListenerClientData[EventData.KeyName][ListenerName](ClientData[EventData.KeyName])
        }
    } else {
        for(const KeyName in ListenerClientData){
            for(const ListenerName in ListenerClientData[KeyName]){
                ListenerClientData[KeyName][ListenerName](ClientData[KeyName])
            }
        }
    }
}

// Init
// ================================================================================================================================

GameEvents.Subscribe( "_sv_client_data_update",                 OnClientDataUpdated)
GameEvents.Subscribe( "_sv_transmit_ent_data_to_client_lua",    OnTransmiteEntDataToClientLua)

$.RegisterForUnhandledEvent("InputFocusLost",           OnInputFocusLost)
$.RegisterForUnhandledEvent("DOTAUnhandledEscapeKey",   OnEscapePressed)

GameUI.SetMouseCallback(OnGlobalMouseCallback)

InitClientData()