export interface PlayerStats {
    gamesPlayed: number;
    wins: number;
    losses: number;
    winStreak: number;
    // bestStreak: number; // Future feature
}

const STORAGE_KEY = 'verbyte_player_stats';

const DEFAULT_STATS: PlayerStats = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winStreak: 0
};

export const getStats = (): PlayerStats => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_STATS;
    } catch {
        return DEFAULT_STATS;
    }
};

export const updateStats = (result: 'win' | 'loss'): PlayerStats => {
    const current = getStats();
    const newStats = { ...current };

    newStats.gamesPlayed += 1;

    if (result === 'win') {
        newStats.wins += 1;
        newStats.winStreak += 1;
    } else {
        newStats.losses += 1;
        newStats.winStreak = 0;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
    return newStats;
};
