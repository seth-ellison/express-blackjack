'use strict';

const Player = require('./player.js');

class Dealer extends Player {
  constructor(id, name) {
    super(id, name);
    
    this._deck = [];
    this._isSecondShown = false;
    
    // Start with deck of 52 cards.
    for(var i = 0; i < 52; i++) {
			this._deck.push(i);
		}
    
    this.shuffle();
  }  
  
  get isSecondShown() {
    return this._isSecondShown;
  }
  
  set isSecondShown(shown) {
    this._isSecondShown = shown;
  }
  
  // Override base behavior because the dealer's hand may be partially hidden.
  get hand() {
    if(!this._isSecondShown) {
      var censoredHand = [];
			censoredHand.push(super.hand[0]); // Get first card.
			censoredHand.push(99); // Special value for hidden card.
			
			return censoredHand;
    } else {
      return super.hand;
    }
  }
  
  // Deal a single card, removing it from the deck.
  deal() {
    return this._deck.pop();
  }
  
  // Shuffle cards in current deck.
  shuffle() {
    for (var i = this._deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = this._deck[i];
      this._deck[i] = this._deck[j];
      this._deck [j] = temp;
    }
  }
  
  // Create a brand new deck of shuffled cards.
  reshuffle() {
    this._deck = [];
    for(var i = 0; i < 52; i++) {
			this._deck.push(i);
		}
    
    this.shuffle();
  }
}

module.exports = Dealer;