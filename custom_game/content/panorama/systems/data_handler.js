// ================ Copyright © 2024, WVW, All rights reserved. ================

// Version 1.1
// Author: https://steamcommunity.com/id/withvoidwithin/
// Source: https://github.com/withvoidwithin/dota2_modding
// =============================================================================

var GameData = {}

Game.__Data = Game.__Data || {}
Game._DataHandler = GameData

// Context
// ================================================================================================================================

GameData.Init = function(ContextGameData){
    ContextGameData.DataHandler = ContextGameData.DataHandler || {
        Data: {
            TeamData:   {},
            PlayerData: {},
            GlobalData: {},
        },
        Listeners: {
            TeamData:   {},
            PlayerData: {},
            GlobalData: {},
        },
    }

    this.__Context = ContextGameData.DataHandler
    this.GeneratePlayerToken()
}

GameData.GeneratePlayerToken = function(){
    const Length        = 16
    const Characters    = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

    let Token = ""

    for (let i = 0; i < Length; i++){
        const RandomIndex = Math.floor(Math.random() * Characters.length)

        Token += Characters[RandomIndex]
    }

    Game.__Data.DataHandler.PlayerToken = Token

    this.SendPlayerTokenToServer()

    return Token
}

GameData.GetLocalPlayerToken = function(){
    return Game.__Data.DataHandler.PlayerToken
}


// Get Data
// ================================================================================================================================

GameData.Get = function(DataType, Key){
    let Data = this.__Context.Data

    if(DataType)    Data = Data[DataType]
    if(Data && Key) Data = Data[Key]

    return Data
}

GameData.GetPlayerData = function(Key){
    return this.Get("PlayerData", Key)
}

GameData.GetTeamData = function(Key){
    return this.Get("TeamData", Key)
}

GameData.GetGlobalData = function(Key){
    return this.Get("GlobalData", Key)
}

// Register Listeners
// ================================================================================================================================

GameData.RegisterListener = function(DataType, ListenerName, Key, CallbackFunction){
    let Listeners = this.__Context.Listeners

    Listeners[DataType][ListenerName] = { Key: Key, CallbackFunction: CallbackFunction }
}

GameData.RegisterPlayerDataListener = function(ListenerName, Key, CallbackFunction){
    this.RegisterListener("PlayerData", ListenerName, Key, CallbackFunction)
}

GameData.RegisterTeamDataListener = function(ListenerName, Key, CallbackFunction){
    this.RegisterListener("TeamData", ListenerName, Key, CallbackFunction)
}

GameData.RegisterGlobalDataListener = function(ListenerName, Key, CallbackFunction){
    this.RegisterListener("GlobalData", ListenerName, Key, CallbackFunction)
}

// Unregister Listeners
// ================================================================================================================================

GameData.UnregisterListener = function(DataType, ListenerName){
    let Listeners = this.__Context.Listeners

    delete Listeners[DataType][ListenerName]
}

GameData.UnregisterPlayerDataListener = function(ListenerName){
    this.UnregisterListener("PlayerData", ListenerName)
}

GameData.UnregisterTeamDataListener = function(ListenerName){
    this.UnregisterListener("TeamData", ListenerName)
}

GameData.UnregisterGlobalDataListener = function(ListenerName){
    this.UnregisterListener("Global", ListenerName)
}

// Listeners
// ================================================================================================================================

GameData.TriggerListener = function(DataType, Key){
    let Listeners = this.__Context.Listeners

    for(const ListenerName in Listeners[DataType]){
        const ListenerData = Listeners[DataType][ListenerName]

        if(ListenerData.Key == Key) ListenerData.CallbackFunction({Key: Key, Data: this.Get(DataType, Key), ListenerName: ListenerName, DataType: DataType})
    }
}

// Request Data
// ================================================================================================================================

GameData.RequestData = function(DataType, Key){
    GameEvents.SendCustomGameEventToServer("_cl_data_handler_request", {DataType: DataType, Key: Key})
}

GameData.RequestPlayerData = function(Key){
    this.RequestData("PlayerData", Key)
}

GameData.RequestTeamData = function(Key){
    this.RequestData("TeamData", Key)
}

GameData.RequestGlobalData = function(Key){
    this.RequestData("GlobalData", Key)
}

GameData.SendPlayerTokenToServer = function(){
    GameEvents.SendCustomGameEventToServer("_cl_data_handler_token_updated", {PlayerToken: GameData.GetLocalPlayerToken()})
}

// Server Events
// ================================================================================================================================

GameData.OnDataHandlerUpdated = function(EventData){
    if(EventData.PlayerToken != GameData.GetLocalPlayerToken()) return

    GameData.Get(EventData.DataType)[EventData.Key] = EventData.Value
    GameData.TriggerListener(EventData.DataType, EventData.Key)

    GameEvents.SendEventClientSide("_cl_data_handler_updated", {
        key:        EventData.Key,
        value:      EventData.Value,
        data_type:  EventData.DataType,
    })
}

GameData.OnEntityDataTransmite = function(EventData){
    if(EventData.PlayerToken == GameData.GetLocalPlayerToken()){
        GameEvents.SendEventClientSide("_cl_data_handler_transmite_entity_data", {
            key:            EventData.Key,
            value:          EventData.Value,
            entity_index:   EventData.EntityIndex,
        })
    }
}

GameData.OnServerRequestPlayerToken = function(){
    GameData.SendPlayerTokenToServer()
}

// Init
// ================================================================================================================================
GameEvents.Subscribe( "_sv_data_handler_updated",                   GameData.OnDataHandlerUpdated)
GameEvents.Subscribe( "_sv_data_handler_request_player_token",      GameData.OnServerRequestPlayerToken)
GameEvents.Subscribe( "_sv_data_handler_transmite_entity_data",     GameData.OnEntityDataTransmite)

GameData.Init(Game.__Data)