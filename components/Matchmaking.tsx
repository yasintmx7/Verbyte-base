
import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { Loader2, Globe, Wifi } from 'lucide-react';

interface MatchmakingProps {
  player: Player;
  roomId: string | null;
}

const Matchmaking: React.FC<MatchmakingProps> = ({ player, roomId }) => {
  const [steps, setSteps] = useState<string[]>([]);
  const allSteps = roomId ? [
    `Establishing secure tunnel to ${roomId}...`,
    "Wait for challenger handshake...",
    "Querying validator set for Node authority...",
    "Latency test: 8ms (OPTIMAL)",
    "P2P Link Active: Cipher_Ghost.eth intercepted."
  ] : [
    "Establishing peer-to-peer uplink...",
    "Synchronizing Base shard 0x2105...",
    "Querying validator set for challengers...",
    "Latency test: 14ms (OPTIMAL)",
    "Ghost link detected: Cipher_Ghost.eth found."
  ];

  useEffect(() => {
    const intervals = allSteps.map((step, i) => {
        return setTimeout(() => {
            setSteps(prev => [...prev, step]);
        }, i * 650);
    });
    return () => intervals.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-10">
      <div className="relative">
         <div className="absolute inset-0 animate-ping bg-blue-500/20 rounded-full"></div>
         <div className="relative w-44 h-44 rounded-full border-4 border-blue-500/30 p-2 flex items-center justify-center bg-slate-950 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            <div className="w-36 h-36 rounded-full overflow-hidden bg-slate-900 border-2 border-blue-400/50">
                <img src={player.avatar} alt="You" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full border-2 border-slate-950">
                <Wifi size={14} className="text-white" />
            </div>
         </div>
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-4xl font-display font-bold flex items-center justify-center gap-3 text-white tracking-tighter">
            <Loader2 className="animate-spin text-blue-400" size={32} />
            {roomId ? `TUNNELING_${roomId}` : 'SYNCING_BLOCKS'}
        </h2>
        <div className="max-w-xs mx-auto bg-slate-900/50 border border-white/5 p-4 rounded-xl font-mono text-[10px] space-y-1 text-left min-h-[120px]">
            {steps.map((s, i) => (
                <div key={i} className="flex gap-2 text-blue-400/80 animate-in fade-in slide-in-from-left-2">
                    <span className="text-slate-600">[{1000 + (i * 12)}ms]</span>
                    <span>{s}</span>
                </div>
            ))}
        </div>
      </div>

      <div className="flex gap-4">
        {[1, 2, 3, 4].map(i => (
           <div key={i} className="w-14 h-14 bg-slate-900/80 rounded-2xl border border-white/5 flex items-center justify-center glass">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: `${i * 0.25}s` }}></div>
           </div>
        ))}
      </div>
      
      <div className="flex items-center gap-2 text-slate-600 font-mono text-[10px] uppercase tracking-widest">
         <Globe size={12} className="animate-spin-slow" /> Network: Base Mainnet
      </div>
    </div>
  );
};

export default Matchmaking;
