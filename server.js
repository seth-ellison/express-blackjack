// init project
const express = require('express');
const uuid = require('uuid/v4');
const app = express();
const expressWs = require('express-ws')(app);
const Blackjack = require('./blackjack.js');
const blackjackGames = {};

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// This function serves as a middle-ground between the Express server and any route-handling function.
// In it, we enable CORS so that an application running from a different orgin can make successful WSS requests.
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  // Reply with HTML template.
  response.sendFile(__dirname + '/views/index.html');
});

// Since send is error-prone in the event of a disconnect, we catch the error and log it.
const send = function(ws, json) {
    try {
      ws.send(JSON.stringify(json));
    } catch(e) {
      console.log("Send failed on websocket id: " + ws.uuid + " - purging broken socket from associated game state.");
      blackjackGames[ws.gameUuid].removeWebSocket(ws.uuid);
    }
  };

// /blackjack is our web socket endpoint upon which we register event handlers.
app.ws('/blackjack', function(ws, req) {
  
  // I need every socket to be uniquely identifiable so that
  // the rest of the app can refer to this socket for updates/errors/etc...
  if(ws.uuid === null || ws.uuid === undefined)
    ws.uuid = uuid();
  
  ws.on('close', function(code, reason) {
    if(ws.gameUuid === undefined || ws.gameUuid == null)
      return; // Nothing to do. The connection wasn't linked to a game.
    else {
      // Update Blackjack game state to remove old socket by UUID.
      console.log("WebSocket mapped as game:socketUuid:player closed! -> " + ws.gameUuid + " : " + ws.uuid + " : " + ws.playerId);  
      blackjackGames[ws.gameUuid].removeWebSocket(ws.uuid);
    }
  });
  
  ws.on('message', function(msg) {
    
    var data = JSON.parse(msg);
    var id = "";
    
    if(data.type === "Ping") {
      send(ws, {"type": "Pong"});
    }
    if(data.type === "Join") {
      // Specific UUID passed, check for existence of game, and if found, join.
      id = data.uuid;
      
      if(typeof blackjackGames[id] !== 'undefined') {
        if(blackjackGames[id].players.length < 2) {
          console.log(data.name + " joining game " + id);
          
          ws.playerId = 2;
          ws.gameUuid = id;
          
          blackjackGames[id].addWebSocket(ws);
          blackjackGames[id].addPlayer(data.name);
          send(ws, {"type": "Joined", "uuid": id, "playerId": 2});
          
          blackjackGames[id].setup();
          
          // Tell clients to sync with server state.
          for(var socket of blackjackGames[id].websockets) {
            send(socket, {"type": "Sync", "state": blackjackGames[id]}); // PUBLIC. BROADCAST.
          }
        }
      } else {
        console.log("Game w/ UUID " + id + " not found.");
        send(ws, {"type": "NotFound", "uuid": id});
      }
      
    } else if(data.type === "Find") {
      console.log(data.name + " finding game . . . ");
      // Search for open game, and add user to it.
      if(Object.keys(blackjackGames).length === 0) {
        
        console.log("No games found! Creating first entry for player " + data.name);
        // No games exist. Create an empty game for this user to start things off.
        id = uuid();
        
        ws.playerId = 1;
        ws.gameUuid = id; 
        
        blackjackGames[id] = new Blackjack();
        blackjackGames[id].addWebSocket(ws);
        blackjackGames[id].addPlayer(data.name);
        
        send(ws, {"type": "Created", "uuid": id, "playerId": 1}); // Private message. No need to broadcast.
      } else {
        var found = false;
        
        for(var game in blackjackGames) {
          if(blackjackGames[game].players.length < 2 && !found) {
            id = game;
            found = true;
            console.log(data.name + " joining game " + id);
            blackjackGames[id].addPlayer(data.name);
            
            ws.playerId = 2;
            ws.gameUuid = id;
            
            blackjackGames[id].addWebSocket(ws);
            blackjackGames[id].setup();
            
            send(ws, {"type": "Joined", "uuid": id, "playerId": 2}); // Private message. No need to broadcast.
            
            // Tell clients to sync with server state.
            for(var socket of blackjackGames[id].websockets) {
              send(socket, {"type": "Sync", "state": blackjackGames[id]}); // PUBLIC. BROADCAST.
            }
          }
        }
        
        if(!found) {
          console.log("No open games found! Creating first entry for player " + data.name);
          // No games exist. Create an empty game for this user to start things off.
          id = uuid();
          blackjackGames[id] = new Blackjack();
          blackjackGames[id].addPlayer(data.name); 
          
          ws.playerId = 1;
          ws.gameUuid = id;
          
          blackjackGames[id].addWebSocket(ws);
          send(ws, {"type": "Created", "uuid": id, "playerId": 1}); // Private
        }
      }
    } else if(data.type === "Create") {
      // Create a new game session.
      id = uuid();
      
      console.log("Creating new game for " + data.name + " with UUID " + id);
      
      blackjackGames[id] = new Blackjack();
      
      ws.playerId = 1;
      ws.gameUuid = id;
      
      blackjackGames[id].addWebSocket(ws);
      blackjackGames[id].addPlayer(data.name);
      
      send({"type": "Created", "uuid": id, "playerId": 1}); // Private
    } else if(data.type === "Action") {
      // User action attempted
      id = data.uuid;
      
      var playerSocket = blackjackGames[id].findSocketByPlayerId(data.playerId);
      if(typeof playerSocket === 'undefined') {
        // New socket for player detected! (Their prior socket was closed, and thus purged from the game)
        
        // Out with the old, if it wasn't yet purged.
        //if(typeof playerSocket !== 'undefined')
        //  blackjackGames[id].removeWebSocket(playerSocket.uuid);
        
        // In with the new.
        ws.playerId = data.playerId;
        ws.gameUuid = id;
        blackjackGames[id].addWebSocket(ws);
      }
      
      // Query game state to see if it accepts the player action as valid.
      var accepted = blackjackGames[id].accept(data.playerId, data.action);
      
      if(!accepted) {
        console.log("Action Rejected!");
        // Tell client which attempted action that it was rejected.
        send(ws, {"result": false, "type": "Action", "action": data.action, "playerId": data.playerId});
      } else {
        
        // Tell clients to sync with server state, because a user took an action.
        for(var socket of blackjackGames[id].websockets) {
          send(socket, {"type": "Sync", "state": blackjackGames[id]}); // BROADCAST.
        }
        
        console.log("Action Accepted! Blackjack State: " + JSON.stringify(blackjackGames[id]));
        
        
      }
      
    }
    
    
    
  });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
