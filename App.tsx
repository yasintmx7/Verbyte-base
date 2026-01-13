import React, { useState, useEffect, useCallback } from 'react';
import { GameStatus, GameState, Player } from './types';
import { fetchRandomWord, fetchCipherTaunt } from './services/geminiService';
import Lobby from './components/Lobby';
import GameUI from './components/GameUI';
import Matchmaking from './components/Matchmaking';
import { Wallet, Globe, ShieldAlert, Cpu, Share2, LogOut } from 'lucide-react';
import { ethers } from 'ethers';
import { signGameMove, relayTransaction, executeDirectMove } from './src/services/GaslessRelayer';
import { CONTRACT_CONFIG } from './src/config/contracts';
import { updateStats } from './src/services/statsService';

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



  // Inside App component:
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  // Initialize Contract
  useEffect(() => {
    if (account && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.getSigner().then(signer => {
        const c = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, signer);
        setContract(c);
      });
    }
  }, [account]);

  // Inside App component...

  // Listen for On-Chain Events (Multiplayer Sync)
  useEffect(() => {
    if (!contract || !roomId) return;

    const onPlayerJoined = (id: string, joiner: string) => {
      if (id === roomId) {
        // If we are waiting in the lobby/matchmaking and someone joins
        if (joiner.toLowerCase() !== account?.toLowerCase()) {
          addLog(`Rival Node ${joiner.substring(0, 6)} detected! Synchronizing...`, "success");

          // Create Opponent Object
          const opponentPlayer: Player = {
            id: joiner,
            name: `Rival ${joiner.substring(0, 4)}`,
            avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${joiner}`,
            hp: INITIAL_HP,
            isReady: true,
            score: 0
          };

          // HOST START: If we are already in MATCHMAKING state, start the game now.
          // We use a functional update to ensure we have the latest state if needed, 
          // but strictly we just need to transition to PLAYING.
          setGameState(prev => {
            if (prev.status === GameStatus.MATCHMAKING) {
              return {
                ...prev,
                status: GameStatus.PLAYING,
                players: [prev.players[0], opponentPlayer],
                timeLeft: TURN_DURATION,
                turnStartTime: Date.now()
              };
            }
            return prev;
          });

          // Also trigger a Taunt
          setCipherTaunt("OPPONENT_DETECTED_//_INITIATING_BATTLE_PROTOCOL");
        }
      }
    };

    contract.on("PlayerJoined", onPlayerJoined);
    return () => { contract.off("PlayerJoined", onPlayerJoined); };
  }, [contract, roomId, account, addLog]);

  const createPrivateRoom = async () => {
    if (!contract || !account) return alert("Wallet not connected.");

    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const wordData = await fetchRandomWord();

    addLog("Initializing Private Node on-chain...", "warn");
    try {
      const tx = await contract.createGame(newId, wordData.word);
      addLog("Broadcasting Node ID...", "info");
      await tx.wait();

      // Success
      const url = new URL(window.location.href);
      url.searchParams.set('room', newId);
      window.history.pushState({}, '', url);
      setRoomId(newId);
      addLog(`Node ${newId} secured. Waiting for peer...`, 'success');

      // Pre-load word into state so it's ready when we start
      // But we stay in LOBBY until user clicks "AUTHORIZE UPLINK" (which calls startMatchmaking)
      // Actually, we should probably auto-enter matchmaking? 
      // No, let user choose avatar/ready up.

    } catch (e: any) {
      console.error(e);
      addLog(`Initialization failed: ${e.reason || e.message}`, 'error');
    }
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

  const startMatchmaking = async (avatar: string) => {
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

    // Multiplayer Logic
    if (roomId && contract) {
      addLog(`Connecting to Node ${roomId}...`, "warn");

      try {
        // Check if we are Host or Guest
        const gameData = await contract.games(roomId);
        const hostAddress = gameData[0]; // player1

        if (hostAddress.toLowerCase() === account.toLowerCase()) {
          // I am HOST.
          addLog("Node ownership verified. Waiting for challenger link...", "info");
          // We stay in MATCHMAKING. The 'useEffect' onPlayerJoined will trigger Game Start.
        } else {
          // I am GUEST. Join the game.
          if (gameData[1] !== '0x0000000000000000000000000000000000000000') {
            // Player 2 already exists?
            addLog("Node is full.", "error");
            return;
          }

          const tx = await contract.joinGame(roomId);
          addLog("Establishing uplink...", "info");
          await tx.wait();
          addLog("Connection Established.", "success");

          // Start Game Immediately (Host is already there)
          const hostPlayer: Player = {
            id: hostAddress,
            name: `Rival ${hostAddress.substring(0, 4)}`,
            avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${hostAddress}`,
            hp: INITIAL_HP,
            isReady: true,
            score: 0
          };

          // We also need the word! 
          // Contract doesn't expose word publicly in `games` struct usually if private? 
          // Wait, `games` struct returns `word`.
          // My ABI has `word` in `games` return?
          // Step 425 output says `word` is returned (index 2).
          const word = gameData[2];
          if (word) {
            // Start Game
            setGameState({
              status: GameStatus.PLAYING,
              word: word,
              category: "DECRYPTED_SIGNAL",
              hint: "CRACK_THE_CODE",
              guessedLetters: [],
              players: [player, hostPlayer],
              turnStartTime: Date.now(),
              timeLeft: TURN_DURATION,
              isStunned: false,
              powerUps: { vowelScanAvailable: true, shieldBoostAvailable: true }
            });
            setLogs([{ msg: `System: Uplink to ${roomId} secure. Decrypting...`, type: "info" }]);
          } else {
            addLog("Failed to sync word data.", "error");
          }
        }
      } catch (e: any) {
        console.error("Matchmaking Error:", e);
        addLog(`Connection failed/rejected.`, 'error');
        setGameState(prev => ({ ...prev, status: GameStatus.LOBBY }));
      }

    } else {
      // Single Player / Bot Logic
      addLog("Scanning for network challengers...", "info");
      setTimeout(() => {
        const bot: Player = {
          id: 'onchain-challenger',
          name: 'Cipher_Ghost.eth',
          avatar: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=BaseGhost${Date.now()}`,
          hp: INITIAL_HP,
          score: 0,
          isReady: true,
          isBot: true
        };
        startGame([player, bot]);
      }, 3500);
    }
  };

  const handleGuess = useCallback(async (letter: string) => {
    const cleanLetter = letter.toUpperCase();

    if (gameState.status !== GameStatus.PLAYING || gameState.isStunned) return;
    if (gameState.guessedLetters.includes(cleanLetter)) return;

    // Local Optimistic Update (For instant UX)
    setGameState(prev => {
      const isCorrect = prev.word.includes(cleanLetter);
      let updatedPlayers = [...prev.players];

      if (!isCorrect) {
        updatedPlayers = updatedPlayers.map(p => (p.id === account || p.id === 'local-player') ? { ...p, hp: Math.max(0, p.hp - 1) } : p);
      }
      return { ...prev, guessedLetters: [...prev.guessedLetters, cleanLetter], players: updatedPlayers };
    });

    // REMOVED: On-Chain Move Submission

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
      updateStats('win');
    } else if (localPlayer && localPlayer.hp <= 0) {
      setGameState(prev => ({ ...prev, status: GameStatus.LOST, winnerId: opponent?.id }));
      addLog("Terminal failure. Node offline.", "error");
      updateStats('loss');
    } else if (opponent && opponent.hp <= 0) {
      setGameState(prev => ({ ...prev, status: GameStatus.WON, winnerId: localPlayer?.id }));
      addLog("Opponent link severed. Node ownership confirmed.", "success");
      updateStats('win');
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
