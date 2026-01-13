// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VerbyteGame
 * @dev Fully on-chain turn-based game logic for Verbyte.
 */
contract VerbyteGame {
    struct Game {
        address player1; // Host
        address player2; // Guest
        string word;
        string guessedLetters;
        uint256 lastMoveTimestamp;
        GameStatus status;
        address winner;
    }

    enum GameStatus { Waiting, Playing, Finished }

    mapping(string => Game) public games;

    event GameCreated(string roomId, address creator);
    event GameStarted(string roomId, address host, address guest); // New Event
    event PlayerJoined(string roomId, address joiner);
    event MoveMade(string roomId, address player, string letter, bool isHit);
    event GameEnded(string roomId, address winner);

    // Old function (kept for backward compatibility if needed, or replace)
    function createGame(string memory roomId, string memory hiddenWord) public {
        games[roomId] = Game({
            player1: msg.sender,
            player2: address(0),
            word: hiddenWord,
            guessedLetters: "",
            lastMoveTimestamp: block.timestamp,
            status: GameStatus.Waiting,
            winner: address(0)
        });
        emit GameCreated(roomId, msg.sender);
    }

    function joinGame(string memory roomId) public {
        Game storage game = games[roomId];
        require(game.status == GameStatus.Waiting, "Game not waiting");
        require(game.player2 == address(0), "Full");
        
        game.player2 = msg.sender;
        game.status = GameStatus.Playing;
        
        emit PlayerJoined(roomId, msg.sender);
    }

        // Update State
        g.lastMoveTimestamp = block.timestamp;
        g.turn = (msg.sender == g.player1) ? g.player2 : g.player1;

        emit MoveMade(roomId, msg.sender, letter, true); // Optimistically 'true' for demo
    }
}
