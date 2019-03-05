"use strict"; 

const Player = require('./player.js');
const Dealer = require('./dealer.js');

class Blackjack {
  constructor() {
    this._ids = 0;
    this._players = [];
    this._dealer = new Dealer(this.nextId(), "DEAL-R");
    this._isRoundEnding = false;
    this._activePlayerId = 1; // Begin with first player.
    this._websockets = [];
    this._round = 0;
  }
  
  get activePlayerId() {
    return this._activePlayerId;
  }
  
  get isRoundEnding() { 
    return this._isRoundEnding;
  } 
  
  set isRoundEnding(isEnding) {
    this._isRoundEnding = isEnding;
  }
  
  get players() {
    return this._players;
  }
   
  get dealer() {
    return this._dealer;
  }
  
  get websockets() {
    return this._websockets;
  }
  
  set websockets(sockets) {
    this._websockets = sockets;
  }
  
  get round() {
    return this._round;
  }
  
  set round(round) {
    this._round = round;
  }
  
  /*
    All game messages for this instance are sent to each socket registered to the game prior to startup.
  */
  addWebSocket(socket) {
    var isMapped = false;
    for(var existingSocket of this._websockets) {
      if(existingSocket.playerId === socket.playerId)
        isMapped = true;
    }
    
    // Only add to the list if a socket for the specified player isn't already bound to the game state.
    if(!isMapped)
      this._websockets.push(socket);
  }
  
  /*
    Called when a web socket is found to be broken, or when the associated web socket is closed.
    It's dead Jim. Of no further use to us.
  */
  removeWebSocket(uuid) {
    var i = this._websockets.length;
    while (i--) {
        if (this._websockets[i].uuid === uuid) {
            this._websockets.splice(i, 1);
        }
    }
  }
  
  /* All players have a unique id. We use this to ensure no two players have the same ID in a match. */
  nextId() {
    return this._ids++;
  }
  
  /* Since players aren't in an associative array, we run a O(n) search to find the player in question */
  getPlayerById(id) {
    for(var player of this._players) {
      if(player.id === id) {
        return player;
      }
    }
    
    console.log("Player w/ ID: " + id + " not found!");
    return undefined;
  }
  
  /* Add player to the game state. */
  addPlayer(name) {
    this._players.push(new Player(this.nextId(), name));
    console.log("Players: " + JSON.stringify(this._players));
  }
  
  /* Get the websocket currently mapped to the specified player */
  findSocketByPlayerId(id) {
    for(var existingSocket of this._websockets) {
      if(existingSocket.playerId === id)
        return existingSocket;
    }
    
    return undefined;
  }
  
  /*
    Before a game of blackjack truly begins, deal out the initial hands and score them.
  */
  setup() {
    this.isRoundEnding = false;
    this.round++;
    
    console.log("Setting up for round " + this.round);
    
    if(this._players.length >= 2) {
      for(var player of this._players) {
        console.log("Setup for player: " + JSON.stringify(player));
        player.discardHand();
         
        player.hit(this._dealer.deal());
        player.hit(this._dealer.deal());
      }
      
      this._dealer.discardHand();
      this._dealer.isSecondShown = false;
      this._dealer.hit(this._dealer.deal());
      this._dealer.hit(this._dealer.deal());
    } else {
      console.log("Cannot set up game yet. Not enough players.");
    }
  }
  
  
  /*
    Called every time a player stands, busts, or blackjacks. 
    If all active players are accounted for, it handles the final actions of the round. 
  */
  checkForRoundEnd() {
    // If all player are accounted for, the round is over.
    if(this.activePlayerId > this.players.length) { // Ids start at 1, so we can actually compare against length like this.
      this._activePlayerId = 1; // Reset to 1st player.

      // Round is over. Play out dealer logic, then set win/loss on players.
      this._dealer.isSecondShown = true;
      this.isRoundEnding = true;
      
      console.log("Dealer reveals " + this._dealer.total);

      while(this._dealer.total < 15) {
        console.log(this._dealer.name + " hits on " + this._dealer.total);
        this._dealer.hit(this._dealer.deal());
        console.log(this._dealer.name + " is at " + this._dealer.total);
      }

      if(this._dealer.total === 21) {
        console.log(this._dealer.name + " wins! All remaining players lose!");
        this._dealer.gamesWon++;
        
        for(var player of this._players) {
          if(!player.hasWon)
            player.gamesLost++;
        }
      } else if(this._dealer.total > 21) {
        console.log(this._dealer.name + " busted! All remaining players win!");
        this._dealer.gamesLost++;
        
        for(var player of this._players) {
          if(!player.hasWon)
            player.gamesWon++;
        }
      } else {
        // Compare player totals to dealer total
        for(var player of this._players) {
          if(!player.hasWon && player.total < 21) {
            if(player.total > this._dealer.total) {
              console.log(player.name + " wins! " + this._dealer.name + " only had " + this._dealer.total);
              player.hasWon = true;
              player.gamesWon++;
              this._dealer.gamesLost++;
            } else if(this._dealer.total > player.total) {
              console.log(this._dealer.name + " wins! " + player.name + " only had " + player.total);
              this._dealer.hasWon = true;
              player.gamesLost++;
              this._dealer.gamesWon++;
            } else {
              console.log(this._dealer.name + " pushes! " + player.name + " tied the dealer at " + player.total);

            }
          }
        }
      }
      
      return true;
    }
    
    return false;
  }
  
  /*
    If an action is being attempted, only accept input if the player attempting
    the action is the currently active player. (i.e. it's their turn)
  */
  accept(playerId, action) {
    console.log("Player ID: " + playerId + " attempting to take action: " + action);
    console.log("Current active player is: " + this.activePlayerId);
    if(this.activePlayerId !== playerId)
      return false;
    
    var player = this.getPlayerById(playerId);
    if(action === "Hit") {
      player.hit(this._dealer.deal());
      
      if(player.hasWon || player.hasBusted)
        this._activePlayerId++; // This player is done, go to the next player.
    } else if(action === "Stand") {
      player.stand();
      this._activePlayerId++; // Next player.
    }
    
    // If the round ended, set up internal state for second round and send additional message!
    if(this.checkForRoundEnd()) {
      this.setup(); // Reset the game for a new round.

      console.log("Round End! New Blackjack State: " + JSON.stringify(this));

      for(var socket of this.websockets) {
        this.send(socket, {"type": "Sync", "state": this}); // BROADCAST.
      }
    }
    
    return true;
  }
  
  // Since send is error-prone in the event of a disconnect, we catch the error and log it.
  send(ws, json) {
    try {
      ws.send(JSON.stringify(json));
    } catch(e) {
      console.log("Send failed on websocket id: " + ws.uuid + " - purging broken socket from associated game state.");
      this.removeWebSocket(ws.uuid);
    }
  };
  
  toJSON() {
    return {
      "activePlayerId": this.activePlayerId, // <-- Automatic getter functions
      "round": this.round,
      "players": this.players,
      "dealer": this.dealer,
      "isRoundEnding": this.isRoundEnding
    };
  };
}

module.exports = Blackjack;