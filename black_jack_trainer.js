// ─────────────────────────────────────────────
//  BLACKJACK — script.js

// ══════════════════════════════════════════════
//  1. DECK SETUP

// These are the four suits. We use the actual symbols
const SUITS = ['♠', '♥', '♦', '♣'];

// All 13 ranks in a standard deck.
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// All red cards
const RED_SUITS = new Set(['♥', '♦']);


// Creates a single card as a plain JavaScript object.
function makeCard(rank, suit) {
  return { rank, suit };
}

// Builds a complete 52-card deck and returns it shuffled.
function buildDeck() {
  const deck = [];

  for (const suit of SUITS) {          
    for (const rank of RANKS) {        
      deck.push(makeCard(rank, suit)); 
    }
  }
  return shuffle(deck);
}

// Fisher-Yates shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array; 
}

// ══════════════════════════════════════════════
//  2. SCORING

// Returns the numeric value of one rank.
function rankValue(rank) {
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank); 
}

// Calculates the best possible score for a hand.
function handScore(hand) {
  let score = 0;
  let aces  = 0; 

  for (const card of hand) {
    score += rankValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
}

// Returns if points are more than 21
function isBust(hand) {
  return handScore(hand) > 21;
}

// Returns if points are exactly 2
function isBlackjack(hand) {
  return handScore(hand) === 21 && hand.length === 2;
}

// ══════════════════════════════════════════════
//  3. GAME STATE
let deck       = [];    // the current deck — an array of card objects
let playerHands = [];    // the player's cards this hand
let dealerHand = [];    // the dealer's cards this hand
let balance    = 1000;  // player's total money
let bet        = 0;     // how much the player has wagered this hand
let gameActive = false; // true while a hand is in progress, false between hands

let currentHandIdx = 0;
let bets = [];
let splitAces = false;

// ══════════════════════════════════════════════
//  4. DOM HELPERS

// Generates the HTML string for one card.
function cardHTML(card, faceDown = false) {
  if (faceDown) {
    return `<div class="card face-down"></div>`;
  }

  const colorClass = RED_SUITS.has(card.suit) ? 'red' : '';

  return `
    <div class="card ${colorClass}">
      <div class="top">${card.rank}${card.suit}</div>
      <div class="mid">${card.suit}</div>
      <div class="bot">${card.rank}${card.suit}</div>
    </div>
  `;
}

// Redraws both hands on the page.
function renderHands(revealDealer = false) {

  const dealerContainer = document.getElementById('dealer-cards');
  dealerContainer.innerHTML = dealerHand.map((c, i) =>
    cardHTML(c, !revealDealer && i === 1)  
  ).join('');

  if (revealDealer) {
    document.getElementById('dealer-score').textContent = handScore(dealerHand);
  } else {
    document.getElementById('dealer-score').textContent =
      rankValue(dealerHand[0]?.rank) + '+?';
  }

  const container = document.getElementById('player-hands-container');

  container.innerHTML = playerHands.map((hand, i) => {
    const score   = handScore(hand);
    const bust    = isBust(hand);
    const bj      = isBlackjack(hand);

    let zoneClass = '';
    if (gameActive) {
      zoneClass = i === currentHandIdx ? 'active-hand' : 'done-hand';
    }

    const label = playerHands.length > 1 ? `Hand ${i + 1}` : 'You';

    const badgeClass = bust ? 'bust' : bj ? 'bj' : '';

    return `
      <div class="hand-zone ${zoneClass}">
        <div class="hand-label">
          ${label}
          <span class="score-badge ${badgeClass}">${score}</span>
        </div>
        <div class="card-row">
          ${hand.map(c => cardHTML(c)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Set the middle message
function setMessage(text) {
  document.getElementById('message').textContent = text;
}

// Update the balance variable
function updateBalance() {
  document.getElementById('balance').textContent = balance;
}

// Update the bet variable
function updateBetDisplay() {
  document.getElementById('current-bet').textContent = bet;
}

// Enables or disables buttons depending on whether a hand is active.
function setButtons(inGame) {
  document.getElementById('btn-deal').disabled  = inGame;
  document.getElementById('btn-clear').disabled = inGame;
  document.getElementById('btn-hit').disabled   = !inGame;
  document.getElementById('btn-stand').disabled = !inGame;

  const currentHand = playerHands[currentHandIdx];
  const canDouble = inGame &&
                    currentHand &&
                    currentHand.length === 2 &&
                    balance >= bets[currentHandIdx];
  document.getElementById('btn-double').disabled = !canDouble;

  document.getElementById('btn-split').disabled = !canSplit(inGame);

  document.querySelectorAll('.chip').forEach(chip => {
    chip.disabled = inGame;
  });
}

// Determines if the player can split given their hand. 
function canSplit(inGame) {
  if (!inGame) return false;

  const hand = playerHands[currentHandIdx];
  if (!hand || hand.length !== 2) return false;          
  if (hand[0].rank !== hand[1].rank) return false;      
  if (playerHands.length > 1) return false;             
  if (balance < bets[currentHandIdx]) return false;      

  return true;
}

// Allows the player to split their current hand. 
function split() {
  const originalBet = bets[currentHandIdx];

  splitAces = playerHands[currentHandIdx][0].rank === 'A';

  const secondCard = playerHands[currentHandIdx].pop();
  const newHand    = [secondCard];

  playerHands.push(newHand);

  balance -= originalBet;
  bets.push(originalBet); 
  updateBalance();

  playerHands[0].push(deck.pop());
  playerHands[1].push(deck.pop());

  currentHandIdx = 0; 
  renderHands(false);
  setButtons(true);

  if (splitAces) {
    setMessage('Split Aces — one card each. Dealer plays...');
    setTimeout(runDealer, 800);
    return;
  }

  setMessage('Hand 1: Hit or Stand?');
}

// ══════════════════════════════════════════════
//  6. GAME FLOW

// This will allow the player to deal once they have placed their bet. 
function deal() {
  if (bet === 0) {
    setMessage('Place a bet first!');
    return;
  }

  deck = buildDeck();

  playerHands    = [[deck.pop(), deck.pop()]]; 
  dealerHand     = [deck.pop(), deck.pop()];
  bets           = [bet];                       
  currentHandIdx = 0;
  splitAces      = false;

  gameActive = true;
  balance   -= bet;
  updateBalance();

  renderHands(false);
  setButtons(true);

  if (isBlackjack(playerHands[0])) {
    endRound();
    return;
  }

  setMessage('Hit or Stand?');
}

// This function will allow the player to hit. Will determine if they can hit again. 
function hit() {
  const hand = playerHands[currentHandIdx];
  hand.push(deck.pop());
  renderHands(false);

  document.getElementById('btn-double').disabled = true;
  document.getElementById('btn-split').disabled  = true;

  if (isBust(hand)) {
    endCurrentHand();
  } else if (handScore(hand) === 21) {
    endCurrentHand();
  } else {
    const label = playerHands.length > 1 ? ` (Hand ${currentHandIdx + 1})` : '';
    setMessage(`Score: ${handScore(hand)}${label} — Hit or Stand?`);
  }
}

// This function will allow the player to stand on a hand.
function stand() {
  endCurrentHand();
}

// This function will allow the player to double down on a hand. Adds double down logic 
function doubleDown() {
  const handBet = bets[currentHandIdx];

  balance -= handBet;
  bets[currentHandIdx] *= 2; 
  updateBalance();
  updateBetDisplay();

  const hand = playerHands[currentHandIdx];
  hand.push(deck.pop()); 
  renderHands(false);

  if (isBust(hand)) {
    endCurrentHand();
  } else {
    stand(); 
  }
}

// ══════════════════════════════════════════════
//  7. HAND SEQUENCING  (NEW)

// End the current hand being played. 
function endCurrentHand() {
  if (currentHandIdx < playerHands.length - 1) {

    currentHandIdx++;
    renderHands(false);

    const nextHand = playerHands[currentHandIdx];

    if (handScore(nextHand) === 21) {
      setMessage(`Hand ${currentHandIdx + 1}: 21! Moving on...`);
      setTimeout(endCurrentHand, 600);
      return;
    }

    setButtons(true);
    setMessage(`Hand ${currentHandIdx + 1}: Hit or Stand?`);

  } else {
    runDealer();
  }
}

// Runs the dealers hand. Does not push on 17. 
function runDealer() {
  setButtons(false);    
  renderHands(true);    

  function dealerDraw() {
    if (handScore(dealerHand) < 17) {
      dealerHand.push(deck.pop());
      renderHands(true);
      setTimeout(dealerDraw, 600);
    } else {
      endRound();
    }
  }

  setTimeout(dealerDraw, 600);
}

// ══════════════════════════════════════════════
//  8. ROUND RESOLUTION

// Ends the round. Resets the variables, the hands, and the buttons.
function endRound() {
  gameActive = false;
  renderHands(true);

  const ds       = handScore(dealerHand);
  const dealerBJ = isBlackjack(dealerHand);

  const messages = [];

  playerHands.forEach((hand, i) => {
    const ps       = handScore(hand);
    const playerBJ = isBlackjack(hand);
    const handBet  = bets[i];

    const label = playerHands.length > 1 ? `Hand ${i + 1}: ` : '';

    let msg    = '';
    let payout = 0;

    if (playerBJ && dealerBJ) {
      msg    = `${label}Push!`;
      payout = handBet;                      
    } else if (playerBJ) {
      msg    = `${label}Blackjack!`;
      payout = Math.floor(handBet * 2.5);    
    } else if (isBust(hand)) {
      msg    = `${label}Bust!`;
      payout = 0;
    } else if (isBust(dealerHand)) {
      msg    = `${label}Dealer busts, you win!`;
      payout = handBet * 2;
    } else if (ps > ds) {
      msg    = `${label}You win!`;
      payout = handBet * 2;
    } else if (ps < ds) {
      msg    = `${label}Dealer wins!`;
      payout = 0;
    } else {
      msg    = `${label}Push`;
      payout = handBet;
    }

    balance += payout;

    const net = payout - handBet;
    if (net > 0) msg += ` (+$${net})`;
    if (net < 0) msg += ` (-$${Math.abs(net)})`;

    messages.push(msg);
  });

  updateBalance();

  setMessage(messages.join('  |  '));

  bet = 0;
  bets = [];
  updateBetDisplay();
  setButtons(false);

  if (balance === 0) {
    setTimeout(() => {
      balance = 1000;
      updateBalance();
      setMessage('Balance topped up to $1000!');
    }, 1500);
  }

  setTimeout(clearTable, 2000); 
}

// Clears the table after every round. Clears the scores and the card containers.
function clearTable() {
  document.getElementById('dealer-cards').innerHTML = '';
  document.getElementById('dealer-score').textContent = '';
  document.getElementById('player-hands-container').innerHTML = '';
}

// ══════════════════════════════════════════════
//  9. BETTING  

// Add to the current bet. Adds to the total currentBet if the game is not active.
function addBet(amount) {
  if (gameActive) return;
  if (bet + amount > balance) {
    setMessage('Not enough balance!');
    return;
  }
  bet += amount;
  updateBetDisplay();
  setMessage(`Bet: $${bet} — Click Deal when ready`);
}

// Clear the current bet. Resets currentBet to 0 if the game is not active.
function clearBet() {
  if (gameActive) return;
  bet = 0;
  updateBetDisplay();
  setMessage('Place your bet and deal!');
}


// ══════════════════════════════════════════════
//  10. EVENT LISTENERS

// Add actionable feedback to the buttons. 
document.getElementById('btn-deal').addEventListener('click',   deal);
document.getElementById('btn-hit').addEventListener('click',    hit);
document.getElementById('btn-stand').addEventListener('click',  stand);
document.getElementById('btn-double').addEventListener('click', doubleDown);
document.getElementById('btn-clear').addEventListener('click',  clearBet);
document.getElementById('btn-split').addEventListener('click',  split);  // NE
//document.getElementById('btn-insurance').addEventListener('click',  insurance);
//document.getElementById('btn-surrender').addEventListener('click',  surrender);  // NEW


// Activate the chips to allow for betting
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    addBet(parseInt(chip.dataset.amount));
  });
});


// ══════════════════════════════════════════════
//  11. INITIALIZATION

setMessage('Place your bet and deal!');
setButtons(false);



// To-do : Insurance and surrender 

// Insurance: Deal, endRound, setButtons
// Surrender: Deal, endRound, setButtons