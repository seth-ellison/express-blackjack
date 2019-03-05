"use strict";

class Player {
  constructor(id, name) {
    this._id = id;
    this._hasWon = false;
    this._name = name;
    this._hand = [];
    this._total = 0;
    this._isStanding = false;
    this._hasBusted = false;
    this._gamesWon = 0;
    this._gamesLost = 0;
    
    this._faceValues = [ 
			[0, 2], // 2 of hearts 
			[1, 3], // 3 of hearts 
			[2, 4], // 4 of hearts
			[3, 5], // 5 of hearts
			[4, 6], // 6 of hearts
			[5, 7], // 7 of hearts
			[6, 8], // 8 of hearts
			[7, 9], // 9 of hearts
			[8, 10], // 10 of hearts
			[9, 10], // Jack of Hearts
			[10, 10], // Queen of Hearts
			[11, 10], // King of Hearts
			[12, 11], // Ace of Hearts
		  
			[13, 2], // 2 of Spades ... You get it.
			[14, 3], 
			[15, 4],
			[16, 5],
			[17, 6],
			[18, 7],
			[19, 8],
			[20, 9],
			[21, 10],
			[22, 10],
			[23, 10],
			[24, 10],
			[25, 11],
			
			[26, 2], // 2 of Clubs ... You get it.
			[27, 3],
			[28, 4],
			[29, 5],
			[30, 6],
			[31, 7],
			[32, 8],
			[33, 9],
			[34, 10],
			[35, 10],
			[36, 10],
			[37, 10],
			[38, 11],
			
			[39, 2], // 2 of Diamonds ... You get it.
			[40, 3], 
			[41, 4],
			[42, 5],
			[43, 6],
			[44, 7],
			[45, 8],
			[46, 9],
			[47, 10],
			[48, 10],
			[49, 10],
			[50, 10],
			[51, 11]
    ];
  }
  
  get id() {
    return this._id;
  }
  
  get name() {
    return this._name;
  }
  
  set name(name) {
    this._name = name;
  }
  
  get hasWon() {
    return this._hasWon;
  }
  
  set hasWon(won) {
    this._hasWon = won;
  }
  
  get hasBusted() {
    return this._hasBusted;
  }
  
  set hasBusted(busted) {
    this._hasBusted = busted;
  }
  
  get hand() {
    return this._hand;
  }
  
  set hand(hand) {
    this._hand = hand;
  }
  
  get total() {
    return this._total;
  }
  
  set total(total) {
    this._total = total;
  }
  
  get isStanding() {
    return this._isStanding;
  }
  
  set isStanding(standing) {
    this._isStanding = standing;
  }
  
  get gamesWon() {
    return this._gamesWon;
  }
  
  set gamesWon(won) {
    this._gamesWon = won;
  }
  
  get gamesLost() {
    return this._gamesLost;
  }
  
  set gamesLost(lost) {
    this._gamesLost = lost;
  }
  
  /* Add a card to this player's hand */
  hit(card) {
    if(!this._isStanding) { // If the player has chosen to stand, deny the card.
      this._hand.push(card);  
      this.score();
    }
  }
  
  /* Pass active player's priority */
  stand() {
    this._isStanding = true;
  }
  
  /* Prior to receiving a new hand, wipe the state slate clean. */
  discardHand() {
    this._hasWon = false;
    this._isStanding = false;
    this._hadBusted = false;
    this._hand = [];
    this._total = 0;
  }
  
  /* Calculate total hand value for player */
  score() {
    this._total = 0;
    
    for(var card of this._hand) {
      this._total += this.getCardValue(card);
    }
    
    if(this._total > 21) {
      console.log(this._name + " busted!");
      this._hasBusted = true;
      this._isStanding = true;
      this._gamesLost++;
    } else if(this._total === 21) {
      console.log(this._name + " got a Blackjack!"); 
      this._hasWon = true;
      this._gamesWon++;
      this._isStanding = true;
    }
  }
  
  /* Retrieve value of specific card by deck index. */
  getCardValue(index) {
    if(index == 99) return 0; // Hidden card. No value revealed.
		else return this._faceValues[index][1];
  }
  
  toJSON() {
    return {
      "id": this.id, // <-- Using automatic getter functions
      "name": this.name,
      "hand": this.hand,
      "total": this.total,
      "hasWon": this.hasWon,
      "hasBusted": this.hasBusted,
      "isStanding": this.isStanding,
      "gamesWon": this.gamesWon,
      "gamesLost": this.gamesLost
    };
  };
}

module.exports = Player;
