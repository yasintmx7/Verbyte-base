# Multiplayer Sync Design: "Play Local, Sync On-Chain"

## Objective
Enable a 2-player experience where users:
1.  Play the same word (Seeded Room).
2.  Play independently (Session Mode).
3.  **Sync at the End**: Wait for the opponent to finish, then compare scores.

## Proposed Architecture

Since we want to avoid building a complex Web2 backend (Node.js/Socket.io) and keep the game "Blockchain-native" but fast, we will use the **Blockchain itself** as the "Meeting Point" for results.

### The Flow

1.  **Room Setup (The Seed)**
    *   Player A shares link `?room=COOL_ROOM_123`.
    *   Both players load the **same word** (derived from the Room ID hash).
    *   *No data is sent to each other yet.*

2.  **Gameplay (Off-Chain)**
    *   Both players solve the puzzle locally.
    *   **Fast, 60fps, no lag.**
    *   When Player A finishes (Wins/Loses), they get a "Score" (e.g., Time remaining + HP).

3.  **The "Commit" (The Handshake)**
    *   Player A clicks "Submit Result".
    *   Transaction sent to Smart Contract: `submitScore(roomId, score)`.
    *   **UI Update**: Player A enters **"Waiting Room"** state.

4.  **The Wait (Polling)**
    *   Player A's client polls the Smart Contract: *"Has `opponent_address` submitted a score for `roomId`?"*
    *   **UI**: "Waiting for Opponent to finish..." with a spinning loader.

5.  **The Reveal (Sync)**
    *   Player B finishes and submits their transaction.
    *   Player A's polling detects Player B's score on-chain.
    *   **UI Update**: Both screens show the **Final Scoreboard**.
    *   *Example*: "You: 50pts (Winner!) vs Opponent: 30pts".

## visual State Machine

```mermaid
graph TD
    A[Start Game (Seeded)] --> B[Play Locally]
    B --> C{Game Over}
    C --> D[Submit Score to Chain]
    D --> E[State: WAITING_FOR_OPPONENT]
    E -- Poll Contract --> F{Opponent Score Found?}
    F -- No --> E
    F -- Yes --> G[One-Time Result Reveal]
    G --> H[Distribure Rewards]
```

## Implementation Steps

1.  **Smart Contract Update**: 
    *   Needs a mapping: `mapping(bytes32 => GameSession)` to store scores for a Room ID.
2.  **Frontend Update**:
    *   Add `GameStatus.WAITING`.
    *   Add a polling hook `useOpponentScore(roomId)` that reads from the contract every 5 seconds.
    *   Display the comparison UI once data is returned.

## Benefits
*   **Decentralized**: No generic game servers. Logic lives on Base.
*   **Secure**: You can't fake the opponent's score; it must come from their wallet.
*   **Simple**: Re-uses the existing specific "Commit" action we just built.
