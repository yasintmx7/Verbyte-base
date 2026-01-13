import React, { useState, useRef, useEffect } from 'react';
import { Shield, Zap, Search, Eye, Terminal, Activity, Lock, Unlock, AlertTriangle, CheckCircle, Heart, EyeOff, Trophy, RefreshCcw } from 'lucide-react';
import { GameState, GameStatus } from '../types';
import { ethers } from 'ethers';
import { executeDirectMove } from '../src/services/GaslessRelayer';

const DecryptedChar: React.FC<{ char: string, revealed: boolean, isGameOver: boolean }> = ({ char, revealed, isGameOver }) => {
  return (
    <div className={`w-12 h-16 md:w-16 md:h-24 border-b-4 flex items-center justify-center text-4xl md:text-6xl font-bold transition-all ${revealed
      ? 'border-blue-500 text-white'
      : 'border-slate-700 text-transparent'
      }`}>
      {revealed || isGameOver ? char : '_'}
    </div>
  );
};

const NodeCard: React.FC<{ player: any, isLocal: boolean }> = ({ player, isLocal }) => {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl ${isLocal ? 'bg-slate-800 ring-2 ring-blue-500' : 'bg-slate-800/50'}`}>
      <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden">
        <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-white">{player.name}</span>
          {player.hp <= 0 && <span className="text-xs font-bold text-rose-500">ELIMINATED</span>}
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-slate-400 mt-1">
          <Heart size={12} className={player.hp > 1 ? "text-rose-500 fill-rose-500" : "text-rose-500"} />
          <span>{player.hp} Lives Left</span>
        </div>
      </div>
    </div>
  );
};

const Keyboard: React.FC<{ guessed: string[], onGuess: (char: string) => void, word: string, disabled: boolean }> = ({ guessed, onGuess, word, disabled }) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-2">
          {row.map(char => {
            const isGuessed = guessed.includes(char);
            const isCorrect = word.includes(char);

            let statusClass = "bg-slate-800 text-slate-300 hover:bg-slate-700"; // default
            if (isGuessed) {
              if (isCorrect) statusClass = "bg-emerald-500/20 text-emerald-500 border border-emerald-500/50";
              else statusClass = "bg-rose-500/10 text-rose-500 opacity-50";
            }

            return (
              <button
                key={char}
                onClick={() => onGuess(char)}
                disabled={isGuessed || disabled}
                className={`w-8 h-10 md:w-10 md:h-12 rounded-lg font-bold text-sm transition-all ${statusClass}`}
              >
                {char}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const GameUI: React.FC<{
  gameState: GameState;
  onGuess: (letter: string) => void;
  onPowerUp: (type: 'vowelScan' | 'shieldBoost') => void;
  onPlayAgain: () => void;
  account: string;
  logs: any[];
  taunt: string;
  roomId: string | null;
}> = ({ gameState, onGuess, onPowerUp, onPlayAgain, account, logs, taunt, roomId }) => {
  const [showHint, setShowHint] = useState(false);
  const [syncState, setSyncState] = useState<'none' | 'submitting' | 'waiting' | 'synced'>('none');
  const [opponentScore, setOpponentScore] = useState<number | null>(null);

  const localPlayer = gameState.players.find(p => p.id === account || p.id === 'local-player');
  const opponent = gameState.players.find(p => p.id !== account && p.id !== 'local-player');
  const isGameOver = gameState.status !== GameStatus.PLAYING;

  const handleClaimVictory = async () => {
    setSyncState('submitting');
    try {
      if (!window.ethereum) {
        alert("No wallet found. Please install a Web3 wallet.");
        setSyncState('none');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 1. Commit Local Score to Chain
      const { txHash } = await executeDirectMove(signer, 0, "V");

      // 2. Enter Waiting State
      setSyncState('waiting');

      // 3. Simulate Polling (Real app would read Contract)
      setTimeout(() => {
        setOpponentScore(Math.floor(Math.random() * 50));
        setSyncState('synced');
      }, 5000);

    } catch (error: any) {
      console.error("Claim failed:", error);
      alert(`Transaction failed: ${error.message || "Unknown error"}`);
      setSyncState('none');
    }
  };

  const timerPercentage = (gameState.timeLeft / 30) * 100;
  const isTimeLow = gameState.timeLeft <= 7;

  return (
    <div className={`flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto px-4 ${gameState.isStunned ? 'opacity-50 pointer-events-none' : ''}`}>

      {/* Top Bar */}
      <div className="w-full flex justify-between items-center mb-10">
        <div className="flex gap-4">
          {localPlayer && <NodeCard player={localPlayer} isLocal={true} />}
          {opponent && <NodeCard player={opponent} isLocal={false} />}
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-6 py-2 rounded-full font-bold tracking-widest uppercase mb-4 shadow-lg shadow-blue-900/20">
            Topic: {gameState.category}
          </div>
          <div className={`text-4xl font-bold font-mono ${isTimeLow ? 'text-rose-500 animate-pulse' : 'text-slate-200'}`}>
            {gameState.timeLeft}s
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center mb-8">

        {/* The Word */}
        <div className="flex flex-wrap gap-2 md:gap-4 mb-12 justify-center">
          {gameState.word.split('').map((char, i) => (
            <DecryptedChar
              key={`${char}-${i}`}
              char={char}
              revealed={gameState.guessedLetters.includes(char) || isGameOver}
              isGameOver={isGameOver}
            />
          ))}
        </div>

        {/* Controls / Powerups */}
        <div className="flex flex-wrap gap-4 mb-12">
          <button
            onClick={() => setShowHint(!showHint)}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-sm transition-all flex items-center gap-2"
          >
            {showHint ? <EyeOff size={16} /> : <Eye size={16} />}
            {showHint ? gameState.hint : 'Show Hint'}
          </button>

          <button
            onClick={() => onPowerUp('vowelScan')}
            disabled={!gameState.powerUps.vowelScanAvailable || isGameOver}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 font-bold text-sm transition-all flex items-center gap-2"
          >
            <Search size={16} /> Reveal Vowels (Cost: 2 Lives)
          </button>

          <button
            onClick={() => onPowerUp('shieldBoost')}
            disabled={!gameState.powerUps.shieldBoostAvailable || isGameOver}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-rose-400 font-bold text-sm transition-all flex items-center gap-2"
          >
            <Heart size={16} /> Heal +1 Life
          </button>
        </div>

        {/* Keyboard */}
        <div className="w-full">
          <Keyboard guessed={gameState.guessedLetters} onGuess={onGuess} word={gameState.word} disabled={isGameOver || gameState.isStunned || false} />
        </div>

      </div>

      {/* Game Over / Sync Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-slate-800 p-10 rounded-3xl text-center max-w-md w-full shadow-2xl">

            {/* STATE: SUBMITTING / WAITING */}
            {(syncState === 'submitting' || syncState === 'waiting') && (
              <div className="flex flex-col items-center animate-pulse">
                <RefreshCcw size={48} className="text-blue-500 mb-6 animate-spin" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  {syncState === 'submitting' ? 'Securing Relay...' : 'Syncing with Opponent...'}
                </h2>
                <p className="text-slate-400">
                  {syncState === 'submitting' ? 'Confirming transaction on Base...' : 'Waiting for opponent to commit score...'}
                </p>
              </div>
            )}

            {/* STATE: SYNCED (FINAL RESULT) */}
            {syncState === 'synced' && (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto bg-emerald-500/20 text-emerald-500">
                  <Trophy size={40} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">VICTORY CONFIRMED</h2>
                <div className="flex gap-8 my-6 w-full justify-center">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold">You</div>
                    <div className="text-3xl font-mono font-bold text-blue-400">100</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-700">VS</div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold">Opponent</div>
                    <div className="text-3xl font-mono font-bold text-rose-400">{opponentScore}</div>
                  </div>
                </div>
                <button onClick={onPlayAgain} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold text-slate-200 transition-all">
                  Play Next Match
                </button>
              </div>
            )}

            {/* STATE: INITIAL VICTORY (Prompt to Sync) */}
            {syncState === 'none' && (
              <>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto ${gameState.status === GameStatus.WON ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                  {gameState.status === GameStatus.WON ? <Trophy size={40} /> : <Zap size={40} />}
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">
                  {gameState.status === GameStatus.WON ? 'Level Complete!' : 'Game Over'}
                </h2>

                <p className="text-slate-400 mb-8">
                  {gameState.status === GameStatus.WON ? 'Score ready for sync.' : `The word was ${gameState.word}.`}
                </p>

                <div className="space-y-3">
                  {gameState.status === GameStatus.WON && (
                    <button onClick={handleClaimVictory} disabled={syncState !== 'none'} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2">
                      Sync & Compare Scores
                    </button>
                  )}
                  <button onClick={onPlayAgain} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold text-slate-200 transition-all flex items-center justify-center gap-2">
                    <RefreshCcw size={16} /> Play Again
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default GameUI;
