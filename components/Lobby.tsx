
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, Terminal, Cpu, Database, Share2, Plus, Trophy, Target, History } from 'lucide-react';
import { getStats, PlayerStats } from '../src/services/statsService';

interface LobbyProps {
  onStart: (avatar: string) => void;
  walletConnected: boolean;
  onCreateRoom: () => void;
  roomId: string | null;
}

const TutorialModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
    <div className="bg-slate-900 border border-blue-500/30 rounded-2xl max-w-lg w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>

      <h3 className="text-2xl font-display font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
        <Terminal className="text-blue-500" /> Protocol Manual
      </h3>

      <div className="space-y-6 text-sm text-slate-300 font-mono leading-relaxed">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">1</div>
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-1">Decipher the Word</h4>
            <p>Guess letters to reveal the hidden password. You are racing against time and your own system integrity.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-8 h-8 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold shrink-0">2</div>
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-1">Watch Your Integrity</h4>
            <p>Every wrong guess damages your node (HP). If your integrity reaches 0, your connection is severed (Game Over).</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">3</div>
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-1">Use Power-Ups</h4>
            <p>Stuck? Spend integrity to Scan Vowels or Reboot your system to heal.</p>
          </div>
        </div>
      </div>

      <button onClick={onClose} className="w-full mt-8 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white uppercase tracking-widest transition-all">
        Acknowledged
      </button>
    </div>
  </div>
);

const Lobby: React.FC<LobbyProps> = ({ onStart, walletConnected, onCreateRoom, roomId }) => {
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [stats, setStats] = useState<PlayerStats | null>(null);

  useEffect(() => {
    setStats(getStats());
  }, []);

  const avatars = Array.from({ length: 5 }, (_, i) => `https://api.dicebear.com/7.x/pixel-art/svg?seed=Verbyte${i}`);


  return (
    <div className="grid lg:grid-cols-2 gap-16 items-center">
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      <div className="space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-[0.3em] rounded-md border border-blue-500/20">
              <Terminal size={12} /> THE VERBYTE
            </span>
            <button onClick={() => setShowTutorial(true)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em] rounded-md border border-white/10 transition-colors">
              How to Play
            </button>
          </div>
          <h2 className="text-5xl md:text-7xl font-display font-bold leading-[1.1] text-white tracking-tighter">
            VERIFY THE <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">BYTES.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-lg leading-relaxed">
            Verbyte is the premier onchain word arena. Decode hidden protocol strings, protect your node integrity, and secure your permanent record on the Base ledger.
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/5">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Games</div>
              <div className="text-xl font-mono font-bold text-white">{stats.gamesPlayed}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Wins</div>
              <div className="text-xl font-mono font-bold text-emerald-400">{stats.wins}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1">Losses</div>
              <div className="text-xl font-mono font-bold text-red-400">{stats.losses}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">Streak</div>
              <div className="text-xl font-mono font-bold text-amber-400">{stats.winStreak}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 glass rounded-2xl border-white/5 group hover:border-blue-500/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 text-blue-400">
              <Database size={20} />
            </div>
            <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Secured by Base</h4>
            <p className="text-[10px] text-slate-500 leading-normal">Zero-latency decoding powered by L2.</p>
          </div>
          <div className="p-5 glass rounded-2xl border-white/5 group hover:border-indigo-500/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400">
              <Cpu size={20} />
            </div>
            <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Skill-Based</h4>
            <p className="text-[10px] text-slate-500 leading-normal">No RNG. Just raw lexical intellect.</p>
          </div>
          <div className="p-5 glass rounded-2xl border-white/5 group hover:border-amber-500/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 text-amber-400">
              <Sparkles size={20} />
            </div>
            <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Proof of Win</h4>
            <p className="text-[10px] text-slate-500 leading-normal">Commit every Byte decrypted to the chain.</p>
          </div>
        </div>
      </div>

      <div className="glass p-10 rounded-[2.5rem] shadow-2xl relative border-white/10 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 blur-[80px]"></div>

        <h3 className="text-2xl font-display font-bold mb-8 text-white flex items-center gap-3">
          <ShieldCheck className="text-blue-500" /> {roomId ? `Joining Private Node ${roomId}` : 'Initialize Terminal'}
        </h3>

        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Interface Profiler</label>
            <div className="flex justify-between gap-3 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
              {avatars.map((url, i) => (
                <button key={i} onClick={() => setAvatarIndex(i)} className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${avatarIndex === i ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/40' : 'border-transparent opacity-30 hover:opacity-100'}`}>
                  <img src={url} alt={`node-${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {!walletConnected ? (
            <div className="bg-slate-900 border border-white/5 p-5 rounded-xl flex items-start gap-4 ring-1 ring-blue-500/5">
              <p className="text-[11px] text-slate-400 leading-relaxed uppercase tracking-wide">
                Identity Locked. Sync your wallet to initialize Verbyte save files and authorize your node on the network.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => onStart(avatars[avatarIndex])}
                className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl text-lg font-bold shadow-xl shadow-blue-600/30 transition-all active:scale-95 group text-white flex items-center justify-center gap-3"
              >
                {roomId ? 'JOIN_NODE.EXE' : 'AUTHORIZE_UPLINK'}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {!roomId && (
                <>
                  <button
                    onClick={onCreateRoom}
                    className="w-full bg-slate-900 hover:bg-slate-800 py-4 rounded-2xl text-sm font-mono font-bold text-slate-400 border border-white/5 transition-all flex items-center justify-center gap-3"
                  >
                    <Plus size={16} /> INITIALIZE_PRIVATE_NODE
                  </button>

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="ENTER ROOM CODE..."
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 text-xs font-mono font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                    />
                    <button
                      onClick={() => {
                        if (joinCode.length > 0) window.location.search = `?room=${joinCode}`;
                      }}
                      disabled={!joinCode}
                      className="px-6 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-blue-400 rounded-xl transition-colors"
                    >
                      JOIN
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {roomId && (
            <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 text-center">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block mb-2">Secure Link Shared</span>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="text-[10px] font-mono text-blue-500 hover:text-blue-400 underline uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
              >
                <Share2 size={12} /> Copy Invite URL
              </button>
            </div>
          )}

          <div className="text-center">
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em] font-bold">
              Proof of Lexicon starting on Base
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
