# Moving to On-Chain Multiplayer: A Transition Guide

You requested a transition to a **Real-Time On-Chain** model where players see each other's presence and moves via the Smart Contract.

## 1. The Challenge (Latency vs. Truth)
*   **Current Mode**: "Session-Based". Fast, but players are isolated until the end.
*   **Goal**: "Strict On-Chain". Players see moves instantly.
*   **Trade-off**: On-chain moves on Base take **2-3 seconds** to confirm. This means the game will feel "turn-based" rather than "real-time arcade".

## 2. Smart Contract Architecture (See `contracts/VerbyteGame.sol`)
I provided a new contract that supports:
1.  `createGame`: Sets up the room.
2.  `joinGame`: The second player enters (Signals "Player 2" presence).
3.  `submitMove`: Records a guess.
4.  **Events**: `PlayerJoined`, `MoveMade`. **This is key.** Your frontend must listen to these to update the UI.

## 3. Recommended Frontend Flow (`App.tsx` Refactor)

### A. Detecting the Opponent (Fixing "Board Presence")
Instead of relying on URL parameters locally, you must **Polling/Listening** to the contract.

**Code Snippet (Hooks):**
```typescript
// Hook to watch for opponent joining
useEffect(() => {
  if (!roomId || !contract) return;

  const onPlayerJoined = (id, playerAddr) => {
    if (id === roomId && playerAddr !== account) {
       addLog("Opponent Connected!", "success");
       // Update State to show Player 2 Avatar
       setGameState(prev => ({
         ...prev, 
         players: [...prev.players, { id: playerAddr, name: 'Rival', hp: 6 }]
       }));
    }
  };

  contract.on("PlayerJoined", onPlayerJoined);
  return () => contract.off("PlayerJoined", onPlayerJoined);
}, [roomId, contract]);
```

### B. Handling Moves
When you make a move:
1.  **Don't just `setState`**.
2.  Call `contract.submitMove(roomId, letter)`.
3.  Show a "Transmitting..." spinner.
4.  **Wait** for the `MoveMade` event from the blockchain.
5.  **Then** update the UI.

**Common Pitfall**: Optimistic Updates.
*   *Bad*: Update UI immediately -> Tx Fails -> Desync.
*   *Good*: Show "Pending" -> Tx Confirmed -> Update UI.

## 4. Why "Transactions are not functioning"?
Currently, your app uses a **mock/self-transaction** logic (`GaslessRelayer.ts`) designed for the single-player "Easy Mode".
To fix this for multiplayer, you must:
1.  Deploy the `VerbyteGame.sol` contract to Base.
2.  Update `CONTRACT_ADDRESS` in your config.
3.  Replace `executeDirectMove` with real contract calls: `contract.submitMove(...)`.

## 5. Next Steps
1.  **Deploy Contract**: Use Remix or Hardhat to deploy `VerbyteGame.sol`.
2.  **Update Config**: Put the new address in `src/config/contracts.ts`.
3.  **Wire up Events**: Add the listener snippets above to `App.tsx`.
