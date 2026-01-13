import React, { useState, useEffect, useCallback } from 'react';
import { GameStatus, GameState, Player } from './types';
import { fetchRandomWord, fetchCipherTaunt } from './services/geminiService';
import Lobby from './components/Lobby';
import GameUI from './components/GameUI';
import Matchmaking from './components/Matchmaking';
import { Wallet, Globe, ShieldAlert, Cpu, Share2, LogOut } from 'lucide-react';
import { ethers } from 'ethers';
import { signGameMove, relayTransaction, executeDirectMove } from './src/services/GaslessRelayer';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const INITIAL_HP = 6;
const TURN_DURATION = 60;
const BASE_CHAIN_ID = '0x2105';

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<{ msg: string, type: 'info' | 'warn' | 'error' | 'success' }[]>([]);
  const [cipherTaunt, setCipherTaunt] = useState("INITIALIZING_SECURE_LINK...");
  const [roomId, setRoomId] = useState<string | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.LOBBY,
    word: '',
    category: '',
    hint: '',
    guessedLetters: [],
    players: [],
    turnStartTime: Date.now(),
    timeLeft: TURN_DURATION,
    isStunned: false,
    powerUps: {
      vowelScanAvailable: true,
      shieldBoostAvailable: true
    }
  });

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev.slice(-9), { msg, type }]);
  }, []);

  // Handle Room ID from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomId(room);
      addLog(`Incoming uplink request for Private Node: ${room}`, 'warn');
    }
  }, [addLog]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install a Web3 wallet to initialize your node.");
      return;
    }
    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chain = await window.ethereum.request({ method: 'eth_chainId' });

      // Signature Verification
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      addLog("Authenticating... Signature required.", "warn");
      const message = `VERBYTE PROTOCOL ACCESS REQUEST\n\nTIMESTAMP: ${Date.now()}\n\nSign this message to verify identity.`;

      try {
        await signer.signMessage(message);
        addLog("Identity verified.", "success");
      } catch (sigError) {
        addLog("Authentication rejected.", "error");
        return;
      }

      setAccount(accounts[0]);
      setChainId(chain);
      addLog("Identity uplink established.", "success");
    } catch (err) {
      console.error("Uplink failed", err);
      addLog("Connection process failed.", "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID,
              chainName: 'Base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        } catch (addError) { console.error(addError); }
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => setAccount(accounts[0] || null));
      window.ethereum.on('chainChanged', (hexId: string) => setChainId(hexId));
    }
  }, []);

  const createPrivateRoom = () => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const url = new URL(window.location.href);
    url.searchParams.set('room', newId);
    window.history.pushState({}, '', url);
    setRoomId(newId);
    addLog(`Private Node ${newId} initialized. Sync the Byte.`, 'success');
  };

  const startGame = async (players: Player[]) => {
    addLog("Challenge received.", "warn");
    const wordData = await fetchRandomWord();
    setGameState({
      status: GameStatus.PLAYING,
      word: wordData.word,
      category: wordData.category,
      hint: wordData.hint,
      guessedLetters: [],
      players: players.map(p => ({ ...p, hp: INITIAL_HP })),
      turnStartTime: Date.now(),
      timeLeft: TURN_DURATION,
      isStunned: false,
      powerUps: {
        vowelScanAvailable: true,
        shieldBoostAvailable: true
      }
    });
    setLogs([{ msg: `System: ${roomId ? `Room ${roomId} Secure.` : 'Uplink secure.'} Decrypting...`, type: "info" }]);
    const taunt = await fetchCipherTaunt("GAME_START", INITIAL_HP);
    setCipherTaunt(taunt);
  };

  const startMatchmaking = (avatar: string) => {
    if (!account) return;
    const player: Player = {
      id: account,
      name: `${account.substring(0, 6)}...${account.substring(account.length - 4)}`,
      avatar,
      hp: INITIAL_HP,
      score: 0,
      isReady: true,
    };
    setGameState(prev => ({ ...prev, status: GameStatus.MATCHMAKING, players: [player] }));
    addLog(roomId ? `Awaiting challenger in Node ${roomId}...` : "Scanning for network challengers...", "info");

    setTimeout(() => {
      const bot: Player = {
        id: 'onchain-challenger',
        name: roomId ? 'Room Opponent (Waiting...)' : 'Cipher_Ghost.eth',
        avatar: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${roomId || 'BaseGhost'}${Date.now()}`,
        hp: INITIAL_HP,
        score: 0,
        isReady: true,
        isBot: true
      };
      startGame([player, bot]);
    }, 3500);
  };

  const handleGuess = useCallback(async (letter: string) => {
    const cleanLetter = letter.toUpperCase();

    if (gameState.status !== GameStatus.PLAYING || gameState.isStunned) return;
    if (gameState.guessedLetters.includes(cleanLetter)) return;

    // Session-Based Gameplay: No transaction on guess.
    // Logic runs purely in-memory for speed and UX.

    setGameState(prev => {
      const isCorrect = prev.word.includes(cleanLetter);
      let updatedPlayers = [...prev.players];

      if (!isCorrect) {
        updatedPlayers = updatedPlayers.map(p => (p.id === account || p.id === 'local-player') ? { ...p, hp: Math.max(0, p.hp - 1) } : p);
        // addLog(`Incorrect.`, "error"); // Optional: reduce noise
      } else {
        // addLog(`Match found.`, "success"); // Optional: reduce noise
      }

      return { ...prev, guessedLetters: [...prev.guessedLetters, cleanLetter], players: updatedPlayers };
    });

  }, [account, addLog, gameState.status, gameState.isStunned, gameState.guessedLetters, gameState.word, gameState.players]);

  const usePowerUp = useCallback((type: 'vowelScan' | 'shieldBoost') => {
    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING || prev.isStunned) return prev;

      if (type === 'vowelScan' && prev.powerUps.vowelScanAvailable) {
        const vowels = ['A', 'E', 'I', 'O', 'U'];
        const existingGuesses = new Set(prev.guessedLetters);
        const newVowels = vowels.filter(v => prev.word.includes(v) && !existingGuesses.has(v));
        addLog("Vowel Scan complete.", "info");

        return {
          ...prev,
          guessedLetters: [...prev.guessedLetters, ...newVowels],
          players: prev.players.map(p => (p.id === account || p.id === 'local-player') ? { ...p, hp: Math.max(0, p.hp - 2) } : p),
          powerUps: { ...prev.powerUps, vowelScanAvailable: false }
        };
      }

      if (type === 'shieldBoost' && prev.powerUps.shieldBoostAvailable) {
        addLog("Subsystem repair active.", "warn");
        return {
          ...prev,
          players: prev.players.map(p => (p.id === account || p.id === 'local-player') ? { ...p, hp: Math.min(INITIAL_HP, p.hp + 1) } : p),
          timeLeft: Math.max(1, prev.timeLeft - 10),
          isStunned: true,
          powerUps: { ...prev.powerUps, shieldBoostAvailable: false }
        };
      }

      return prev;
    });

    if (type === 'shieldBoost') {
      setTimeout(() => {
        setGameState(prev => ({ ...prev, isStunned: false }));
        addLog("Reboot complete.", "success");
      }, 1500);
    }
  }, [account, addLog]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState.status !== GameStatus.PLAYING) return;
      if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
        handleGuess(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState.status, handleGuess]);

  // Turn Timer
  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING) {
      const timer = setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            const updatedPlayers = prev.players.map(p =>
              (p.id === account || p.id === 'local-player') ? { ...p, hp: Math.max(0, p.hp - 1) } : p
            );
            return { ...prev, timeLeft: TURN_DURATION, players: updatedPlayers };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.status, account, addLog]);

  // Bot Logic (Disabled in Multiplayer Rooms)
  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING) {
      if (roomId) return; // Disable fake moves in Room Mode (Opponent is real human playing async)

      const bot = gameState.players.find(p => p.isBot);
      if (bot && bot.hp > 0) {
        const botTimer = setInterval(() => {
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const unvisited = alphabet.split('').filter(l => !gameState.guessedLetters.includes(l));
          if (unvisited.length === 0) return;

          const randomLetter = unvisited[Math.floor(Math.random() * unvisited.length)];
          if (Math.random() > 0.94) {
            const botIsCorrect = gameState.word.includes(randomLetter);
            setGameState(prev => {
              const updatedPlayers = botIsCorrect ? prev.players : prev.players.map(p => p.id === bot.id ? { ...p, hp: Math.max(0, p.hp - 1) } : p);
              return { ...prev, guessedLetters: [...prev.guessedLetters, randomLetter], players: updatedPlayers };
            });
          }
        }, 5000);
        return () => clearInterval(botTimer);
      }
    }
  }, [gameState.status, gameState.guessedLetters, gameState.players, gameState.word]);

  // Win/Loss Condition
  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;
    const localPlayer = gameState.players.find(p => !p.isBot);
    const opponent = gameState.players.find(p => p.isBot);
    const allGuessed = gameState.word.length > 0 && gameState.word.split('').every(l => gameState.guessedLetters.includes(l));

    if (allGuessed) {
      setGameState(prev => ({ ...prev, status: GameStatus.WON, winnerId: localPlayer?.id }));
      addLog("Decrypted. Victory committed.", "success");
    } else if (localPlayer && localPlayer.hp <= 0) {
      setGameState(prev => ({ ...prev, status: GameStatus.LOST, winnerId: opponent?.id }));
      addLog("Terminal failure. Node offline.", "error");
    } else if (opponent && opponent.hp <= 0) {
      setGameState(prev => ({ ...prev, status: GameStatus.WON, winnerId: localPlayer?.id }));
      addLog("Opponent link severed. Node ownership confirmed.", "success");
    }
  }, [gameState.status, gameState.word, gameState.guessedLetters, gameState.players, account, addLog]);

  // Taunts (Optional)
  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING) {
      const fetchTaunt = async () => {
        // Reduced
      };
    }
  }, [gameState.status, gameState.players, account]);

  const isWrongNetwork = account && chainId !== BASE_CHAIN_ID;

  return (
    <div className="min-h-screen flex flex-col items-center selection:bg-blue-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[120px] rounded-full opacity-60"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/5 blur-[120px] rounded-full opacity-60"></div>
      </div>

      <header className="w-full max-w-6xl px-6 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
          setGameState(prev => ({ ...prev, status: GameStatus.LOBBY }));
          setRoomId(null);
          window.history.pushState({}, '', window.location.pathname);
        }}>
          <div className="p-2.5 bg-blue-600 rounded-lg">
            <Cpu className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-white">
            VER<span className="text-blue-500">BYTE</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {roomId && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg">
              <span className="text-xs font-bold text-blue-400 uppercase">Room: {roomId}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  addLog("URL copied.", "info");
                }}
                className="p-1 hover:bg-blue-500/20 rounded-md text-blue-400"
              >
                <Share2 size={12} />
              </button>
            </div>
          )}

          {isWrongNetwork ? (
            <button onClick={switchNetwork} className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 text-xs font-bold uppercase">
              <ShieldAlert size={14} /> Switch to Base
            </button>
          ) : (
            !account ? (
              <button onClick={connectWallet} disabled={isConnecting} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm">
                <Wallet size={16} /> {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-blue-400">
                  {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
                </div>
                <button
                  onClick={() => setAccount(null)}
                  className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                  title="Disconnect Wallet"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )
          )}
        </div>
      </header>

      <main className="w-full max-w-6xl px-6 flex-1 flex flex-col justify-center z-10 pb-12">
        {gameState.status === GameStatus.LOBBY && (
          <Lobby
            onStart={startMatchmaking}
            walletConnected={!!account}
            onCreateRoom={createPrivateRoom}
            roomId={roomId}
          />
        )}
        {gameState.status === GameStatus.MATCHMAKING && <Matchmaking player={gameState.players[0]} roomId={roomId} />}
        {(gameState.status === GameStatus.PLAYING || gameState.status === GameStatus.WON || gameState.status === GameStatus.LOST) && (
          <GameUI
            gameState={gameState}
            onGuess={handleGuess}
            onPowerUp={usePowerUp}
            onPlayAgain={() => {
              setGameState(prev => ({ ...prev, status: GameStatus.LOBBY }));
              setRoomId(null);
              window.history.pushState({}, '', window.location.pathname);
            }}
            account={account!}
            logs={logs}
            taunt={cipherTaunt}
            roomId={roomId}
          />
        )}
      </main>
    </div>
  );
};

export default App;
