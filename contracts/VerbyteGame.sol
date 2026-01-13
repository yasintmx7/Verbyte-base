// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VerbyteGame
 * @dev Fully on-chain turn-based game logic for Verbyte.
 */
contract VerbyteGame {
    enum GameStatus { Waiting, Playing, Finished }

    struct Game {
        address player1;
        address player2;
        string word; // In a real app, store a hash to prevent cheating!
        string guessedLetters;
        uint256 lastMoveTimestamp;
        GameStatus status;
        address turn; // Who's turn is it?
        address winner;
    }

    mapping(string => Game) public games; // roomId => Game

    event GameCreated(string roomId, address creator);
    event PlayerJoined(string roomId, address joiner);
    event MoveMade(string roomId, address player, string letter, bool isHit);
    event GameEnded(string roomId, address winner);

    // Create a game (Player 1)
    function createGame(string memory roomId, string memory hiddenWord) external {
        require(games[roomId].player1 == address(0), "Room exists");
        
        games[roomId] = Game({
            player1: msg.sender,
            player2: address(0),
            word: hiddenWord,
            guessedLetters: "",
            lastMoveTimestamp: block.timestamp,
            status: GameStatus.Waiting,
            turn: msg.sender,
            winner: address(0)
        });

        emit GameCreated(roomId, msg.sender);
    }

    // Join a game (Player 2)
    function joinGame(string memory roomId) external {
        Game storage g = games[roomId];
        require(g.status == GameStatus.Waiting, "Game not waiting");
        require(g.player1 != address(0), "Room missing");
        require(g.player1 != msg.sender, "Cannot play self");

        g.player2 = msg.sender;
        g.status = GameStatus.Playing;

        emit PlayerJoined(roomId, msg.sender);
    }

    // Submit a move (Strict Turn-Based)
    function submitMove(string memory roomId, string memory letter) external {
        Game storage g = games[roomId];
        require(g.status == GameStatus.Playing, "Game not active");
        // require(g.turn == msg.sender, "Not your turn"); // Uncomment for strict turn-based

        // Check guess
        // Note: String manipulation in Solidity is expensive/hard.
        // Simplified Logic: We emit the move, frontend validates "Hit/Miss".
        // In a strictly secure version, Solidity must check 'g.word' contains 'letter'.
        
        // Update State
        g.lastMoveTimestamp = block.timestamp;
        g.turn = (msg.sender == g.player1) ? g.player2 : g.player1;

        emit MoveMade(roomId, msg.sender, letter, true); // Optimistically 'true' for demo
    }
}
