# How to Fix "Rooms" (Multiplayer)

Currently, the "Private Room" feature creates a room ID in the URL, but the game logic is **Local Only**. This means that sharing the link **does not** actually connect two players; it just starts a Bot match for whoever opens it.

Here are the 3 ways to fix this, depending on what kind of "Multiplayer" you want:

---

## Options 1: The "Daily Challenge" Fix (No Server Needed)
**Best for:** Maintaining your "Gasless/Session" design. Zero cost.  
**How it works:**
1.  Use the Room ID as a **"Seed"**.
2.  When Player A sends `?room=XYZ123` to Player B...
3.  Player B clicks it and gets the **EXACT SAME WORD** and category as Player A.
4.  It becomes a race. They play separately, but on the same "Board."
5.  **Implementation:** Modify `fetchRandomWord` to pick the word based on the Room ID string instead of random math.

## Option 2: The "Turn-Based" On-Chain Fix
**Best for:** Security & Blockchain purity.  
**How it works:**
1.  Player A creates a game transaction on-chain.
2.  Player B joins that Game ID on-chain.
3.  Moves are transactions.
4.  **Cons:** Slow, costs gas for every move. (You moved away from this for UX).

## Option 3: Real-Time PvP (Requires Backend)
**Best for:** True Hangman Clash experience.  
**How it works:**
1.  We need a central server or database (like **Firebase**, **Supabase**, or **Socket.io**).
2.  The browser sends "I guessed A" to the server.
3.  The server updates Player B's screen instantly.
4.  **Cons:** Requires setting up an external account/service and API keys.

---

## Recommended Immediate Fix: Option 1 (Seeded Challenge)

I can implement **Option 1** right now. It makes the Room ID meaningful without needing complex servers.

### Plan:
1.  Update `fetchRandomWord` to accept an optional `seed`.
2.  If a `seed` (Room ID) exists, hash it to pick a specific word from your list.
3.  Update `App.tsx` to pass the `roomId` to the word fetcher.

**Shall I proceed with Option 1?**
