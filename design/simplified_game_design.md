# Verbyte Game Design System

A hybrid blockchain game supporting distinct Single-Player and Multiplayer modes.

## 1. Game Modes

### A. Single-Player Mode (PvE)
*   **User Experience**: You vs. The Machine.
*   **Opponent**: `Cipher_Ghost.eth` (AI Bot).
*   **Behavior**: 
    *   The bot actively makes moves alongside you.
    *   It guesses a letter every 5 seconds.
    *   It has a 94% "miss chance" (mostly harmless), but occasionally finds correct letters, putting time pressure on the player.
*   **Win Condition**: Solve the word before the Bot solves it AND before you run out of HP.

### B. Multiplayer Mode (PvP)
*   **User Experience**: You vs. A Friend.
*   **Opponent**: `Room Opponent (Waiting...)` (Human).
*   **Behavior**:
    *   The opponent slot is visible but **Idle**. 
    *   No automatic moves occur on the opponent's side.
    *   This represents the fact that your friend is playing their own *parallel session* on their device.
*   **Win Condition**: Solve the word as fast as possible.
*   **Sync**:
    *   When you finish, you click **"Sync & Compare Scores"**.
    *   The app polls the blockchain to find your opponent's submission.
    *   **Final Result**: A scoreboard appears showing "You: 100 vs Opponent: 85".

## 2. Room Code System

### Creation
*   User clicks **"INITIALIZE_PRIVATE_NODE"**.
*   System generates a 6-character code (e.g., `203XVAKL`).
*   **Seeding**: This code is used to seed the Random Number Generator. This ensures **Both players get the same word** (e.g., "HOUSE").

### Joining
Two methods to join:
1.  **Shared Link**: `verbyte.app/?room=203XVAKL` (Auto-joins).
2.  **Manual Code**: Enter `203XVAKL` in the "ENTER ROOM CODE" input in the Lobby.

## 3. Technical Architecture

### "Play Local, Verify Global"
1.  **Session**: The game runs 100% off-chain in the browser (60fps, no lag).
2.  **Commit**: Only the **Verification** (Win State) is sent to the blockchain.
3.  **Sync**: Multiplayer results are aggregated by reading two separate commit transactions from the Base blockchain.

---
*Design implemented in Verbyte v2.*
