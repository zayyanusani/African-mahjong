import { useEffect, useMemo, useState } from 'react';
import { Compass, Lightbulb, RotateCcw, Shuffle, Trophy, Volume2, VolumeX, BookOpen, Flame, Star, Leaf } from 'lucide-react';

type Tile = { id: number; icon: string; label: string; removed: boolean; row: number; col: number; layer: number };
type Save = { level: number; bestScore: number; bestTime?: number; bestMoves?: number; stars: number; completed: number; coins: number; dailyClaimDate?: string };
type Snapshot = { tiles: Tile[]; selected: number | null; score: number; moves: number; won: boolean; message: string; save: Save };

const discoveries = [
  { title: 'The Baobab', place: 'Across Africa', icon: '🌳', text: 'Baobab trees can store water in their massive trunks and are important to many communities.' },
  { title: 'The Sahel', place: 'West Africa', icon: '🌾', text: 'The Sahel is a wide transition zone between the Sahara Desert and the savannas.' },
  { title: 'Adinkra symbols', place: 'Ghana', icon: '🌀', text: 'Adinkra symbols communicate ideas, values and wisdom through visual designs.' },
  { title: 'The Djembe', place: 'West Africa', icon: '🥁', text: 'The djembe is a goblet-shaped drum known for its expressive range of sounds.' },
  { title: 'African elephant', place: 'Sub-Saharan Africa', icon: '🐘', text: 'African elephants help shape ecosystems by spreading seeds and opening pathways.' },
  { title: 'The Nile', place: 'Northeast Africa', icon: '🌊', text: 'The Nile has supported communities, farming and trade for thousands of years.' }
];
const symbols = [
  ['🦁','Lion'],['🐘','Elephant'],['🦒','Giraffe'],['🦓','Zebra'],['🌍','Africa'],['🥁','Drum'],
  ['🌴','Palm'],['🪘','Talking drum'],['🦅','Eagle'],['🐆','Leopard'],['🌅','Sunrise'],['🛖','Home'],
  ['🧿','Pattern'],['🌺','Flower'],['🦋','Butterfly'],['⭐','Star']
];
const makeTiles = (): Tile[] => {
  // Three-layer compact layout: 24 base tiles, 4 middle tiles, 4 top tiles.
  const positions: Array<{row:number;col:number;layer:number}> = [];
  for (let row=0; row<4; row++) for (let col=0; col<6; col++) positions.push({row,col,layer:0});
  for (const row of [1,2]) for (const col of [2,3]) positions.push({row,col,layer:1});
  for (const row of [1,2]) for (const col of [1,2]) positions.push({row,col,layer:2});
  const deck = positions.map((pos,id) => {
    const [icon,label] = symbols[Math.floor(id/2) % symbols.length];
    return {id,icon,label,removed:false,...pos};
  });
  // Shuffle complete pairs so every board starts solvable.
  const faces = deck.map((_,i)=>symbols[Math.floor(i/2)%symbols.length]);
  for(let i=faces.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[faces[i],faces[j]]=[faces[j],faces[i]];}
  deck.forEach((tile,i)=>{tile.icon=faces[i][0];tile.label=faces[i][1];});
  return deck;
};
const readSave = (): Save => {
  try {
    const value=localStorage.getItem('afrimahjong-save') || localStorage.getItem('afr imahjong-save');
    if(value) return {...{level:1,bestScore:0,bestTime:0,bestMoves:0,stars:0,completed:0,coins:0,dailyClaimDate:''},...JSON.parse(value)};
  } catch {}
  return {level:1,bestScore:0,bestTime:0,stars:0,completed:0,coins:0,dailyClaimDate:''};
};

export default function App() {
  const [save,setSave] = useState<Save>(readSave);
  const [tiles,setTiles] = useState<Tile[]>(makeTiles);
  const [selected,setSelected] = useState<number|null>(null);
  const [score,setScore] = useState(0);
  const [moves,setMoves] = useState(0);
  const [seconds,setSeconds] = useState(0);
  const [hints,setHints] = useState<[number,number]|null>(null);
  const [message,setMessage] = useState('Match two identical free tiles to clear the board.');
  const [sound,setSound] = useState(false);
  const [showDiscovery,setShowDiscovery] = useState(false);
  const [discovery,setDiscovery] = useState(0);
  const [won,setWon] = useState(false);
  const [history,setHistory] = useState<Snapshot[]>([]);
  const remember = () => setHistory(h => [...h, { tiles: tiles.map(t=>({...t})), selected, score, moves, won, message, save: {...save} }].slice(-50));
  const playTone = (frequency: number, duration = 0.12) => {
    if (!sound || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration + 0.02);
      oscillator.onended = () => { void context.close(); };
    } catch { /* Audio is optional; gameplay must continue if unavailable. */ }
  };
  const remaining = tiles.filter(t=>!t.removed);
  const pairs = remaining.length/2;
  const progress = Math.round(((32-remaining.length)/32)*100);
  const isFree = (tile:Tile) => {
    if(tile.removed) return false;
    const covered = tiles.some(other => !other.removed && other.layer > tile.layer &&
      Math.abs(other.col-tile.col) < 1 && Math.abs(other.row-tile.row) < 1);
    if(covered) return false;
    const leftBlocked = tiles.some(other=>!other.removed && other.layer===tile.layer && other.row===tile.row && other.col===tile.col-1);
    const rightBlocked = tiles.some(other=>!other.removed && other.layer===tile.layer && other.row===tile.row && other.col===tile.col+1);
    return !leftBlocked || !rightBlocked;
  };
  const freeTiles = useMemo(()=>tiles.filter(isFree), [tiles]);

  useEffect(()=>{ localStorage.setItem('afrimahjong-save',JSON.stringify(save)); },[save]);
  useEffect(()=>{ if(won) return; const timer=window.setInterval(()=>setSeconds(s=>s+1),1000); return ()=>window.clearInterval(timer); },[won]);
  const formatTime = (value:number) => `${Math.floor(value/60).toString().padStart(2,'0')}:${(value%60).toString().padStart(2,'0')}`;
  const restart = (newLevel=false) => {
    setTiles(makeTiles()); setSelected(null); setHints(null); setMoves(0); setSeconds(0); setWon(false); setHistory([]);
    setScore(0); setMessage(newLevel ? 'New journey unlocked. Good luck!' : 'Fresh board! Match the identical symbols.');
  };
  const choose = (tile:Tile) => {
    if(tile.removed || won) return;
    if(!isFree(tile)) { setMessage('This tile is blocked. Choose a free tile on the top or edge.'); return; }
    if(selected===tile.id) { remember(); setSelected(null); setHints(null); return; }
    if(selected===null) { remember(); setSelected(tile.id); setHints(null); return; }
    const first=tiles.find(t=>t.id===selected);
    if(!first || first.removed) { remember(); setSelected(tile.id); setHints(null); return; }
    remember();
    setHints(null);
    if(first.icon===tile.icon) {
      const next=tiles.map(t=>t.id===first.id||t.id===tile.id?{...t,removed:true}:t);
      const nextScore=score+100;
      setTiles(next); setSelected(null); setMoves(m=>m+1); setScore(nextScore);
      playTone(660);
      setMessage('Great match! +100 points and +5 coins ✨');
      setSave(s=>({...s,coins:s.coins+5,bestScore:Math.max(s.bestScore,nextScore)}));
      if(next.every(t=>t.removed)) {
        const earned=Math.max(1,Math.min(3,3-Math.floor((moves+1)/10)));
        setWon(true); playTone(880, 0.24); setMessage(`Amazing! Board cleared in ${formatTime(seconds)} — +25 bonus coins!`);
        setSave(s=>({...s,completed:s.completed+1,stars:s.stars+earned,coins:s.coins+25,bestScore:Math.max(s.bestScore,nextScore),bestTime:!s.bestTime||seconds<s.bestTime?seconds:s.bestTime,bestMoves:!s.bestMoves||moves+1<s.bestMoves?moves+1:s.bestMoves}));
      }
    } else {
      playTone(220, 0.16);
      setSelected(tile.id); setMoves(m=>m+1); setMessage('Not a match yet — try another tile.');
    }
  };
  const hint = () => {
    const current=tiles.filter(t=>isFree(t));
    for(let i=0;i<current.length;i++) {
      const partner=current.find((t,j)=>j>i&&t.icon===current[i].icon);
      if(partner) { setHints([current[i].id,partner.id]); setSelected(null); setMessage('Hint: these two tiles match.'); return; }
    }
    setMessage('No free matching pair found — reshuffling the remaining tiles.');
    shuffle();
  };
  const shuffle = () => {
    // Keep the remaining deck solvable: shuffle complete pairs, never individual faces.
    const active = tiles.filter(t => !t.removed);
    if (active.length < 2) {
      setMessage('There are no remaining tiles to shuffle.');
      return;
    }
    const pairFaces: Array<[string, string]> = [];
    for (let i = 0; i < active.length / 2; i++) {
      pairFaces.push(symbols[Math.floor(Math.random() * symbols.length)] as [string, string]);
    }
    for (let i = pairFaces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairFaces[i], pairFaces[j]] = [pairFaces[j], pairFaces[i]];
    }
    const faces = pairFaces.flatMap(face => [face, face]);
    for (let i = faces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [faces[i], faces[j]] = [faces[j], faces[i]];
    }
    let index = 0;
    setTiles(tiles.map(t => {
      if (t.removed) return t;
      const [icon, label] = faces[index++];
      return { ...t, icon, label };
    }));
    setSelected(null);
    setHints(null);
    setMessage('Tiles reshuffled into matching pairs. Keep exploring!');
  };
  const undo = () => {
    const previous=history[history.length-1];
    if(!previous) { setMessage('Nothing to undo yet. Make a move first.'); return; }
    setTiles(previous.tiles); setSelected(previous.selected); setScore(previous.score); setMoves(previous.moves); setWon(previous.won); setMessage('Last move undone.'); setSave(previous.save); setHints(null); setHistory(h=>h.slice(0,-1));
  };
  const startNext = () => { setSave(s=>({...s,level:s.level+1})); restart(true); };
  const openDiscovery = () => { setDiscovery((d)=> (d+1)%discoveries.length); setShowDiscovery(true); };
  const todayKey = new Date().toLocaleDateString('en-CA');
  const dailyClaimed = save.dailyClaimDate === todayKey;
  const claimDailyReward = () => {
    if (dailyClaimed) { setMessage('Your daily reward has already been claimed. Come back tomorrow!'); return; }
    setSave(s=>({...s,coins:s.coins+10,dailyClaimDate:todayKey}));
    setMessage('Daily explorer reward claimed: +10 coins! 🪙');
  };

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="AfriMahjong home"><span className="brand-mark">✦</span><span>Afri<span>Mahjong</span><small>PLAY · EXPLORE · DISCOVER AFRICA</small></span></a>
      <div className="top-actions"><button className="icon-button" onClick={()=>setSound(!sound)} aria-label="Toggle sound">{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button className="profile-chip" onClick={()=>setShowDiscovery(true)}>ZS</button></div>
    </header>

    <section className="welcome">
      <div><div className="eyebrow"><span className="pulse"/> YOUR AFRICAN ADVENTURE</div><h1>Every tile tells<br/><em>a story.</em></h1><p>Match your way across a continent of wonder.</p></div>
      <div className="welcome-art" aria-hidden="true"><span className="sun"></span><span className="mountain m1"></span><span className="mountain m2"></span><span className="tree">🌴</span><span className="animal">🦒</span></div>
    </section>

    <section className="stats-row">
      <div className="stat-card"><span className="stat-icon green"><Compass size={18}/></span><div><small>JOURNEY LEVEL</small><strong>{save.level}</strong></div></div>
      <div className="stat-card"><span className="stat-icon gold"><Star size={18}/></span><div><small>TOTAL STARS</small><strong>{save.stars}</strong></div></div>
      <div className="stat-card"><span className="stat-icon orange"><Flame size={18}/></span><div><small>BOARDS CLEARED</small><strong>{save.completed}</strong></div></div>
      <div className="stat-card"><span className="stat-icon gold">🪙</span><div><small>COINS</small><strong>{save.coins}</strong></div></div>
      <div className="stat-card"><span className="stat-icon green">⏱️</span><div><small>BEST TIME</small><strong>{save.bestTime ? formatTime(save.bestTime) : '—'}</strong></div></div>
      <div className="stat-card"><span className="stat-icon orange">🎯</span><div><small>BEST MOVES</small><strong>{save.bestMoves || '—'}</strong></div></div>
    </section>

    <section className="game-layout">
      <div className="game-panel">
        <div className="panel-heading"><div><span className="section-kicker">THE SAVANNA TRAIL</span><h2>Tile Match <span className="level-pill">LEVEL {save.level}</span></h2></div><button className="text-button" onClick={()=>restart()}><RotateCcw size={15}/> Restart</button></div>
        <div className="game-meta"><span>Score <b>{score.toLocaleString()}</b></span><span>Moves <b>{moves}</b></span><span>Pairs left <b>{pairs}</b></span><span>Time <b>{formatTime(seconds)}</b></span></div>
        <div className="progress-track"><span style={{width:progress+'%'}}/></div>
        <div className="tile-board" aria-label="Mahjong tile board">
          {tiles.map(tile=><button key={tile.id} style={{gridColumn:tile.col+1,gridRow:tile.row+1,zIndex:tile.layer+1,transform:tile.layer===2?'translate(7px,-7px)':tile.layer===1?'translate(3px,-3px)':undefined}} className={'tile layer-'+tile.layer+' '+(tile.removed?'tile-gone':'')+(!isFree(tile)?' tile-blocked':'')+(selected===tile.id?' selected':'')+(hints?.includes(tile.id)?' hint-tile':'')} onClick={()=>choose(tile)} disabled={tile.removed} aria-label={tile.label}>
            {!tile.removed && <><span className="tile-symbol">{tile.icon}</span><span className="tile-label">{tile.label}</span></>}
          </button>)}
        </div>
        <div className="game-message" role="status"><span>✦</span>{message}</div>
        <div className="tool-row">
          <button className="tool-button" onClick={hint}><span className="tool-icon hint"><Lightbulb size={19}/></span><span>Hint<small>Find a pair</small></span></button>
          <button className="tool-button" onClick={undo}><span className="tool-icon undo"><RotateCcw size={19}/></span><span>Undo<small>Last move</small></span></button>
          <button className="tool-button" onClick={shuffle}><span className="tool-icon shuffle"><Shuffle size={19}/></span><span>Shuffle<small>Mix tiles</small></span></button>
        </div>
        {won && <div className="win-banner"><div className="win-trophy"><Trophy size={25}/></div><div><b>Trail completed!</b><p>You earned stars for your journey.</p></div><button onClick={startNext}>Next level →</button></div>}
      </div>
      <aside className="side-column">
        <div className="discovery-card"><div className="card-top"><span className="section-kicker">DID YOU KNOW?</span><span className="leaf-icon"><Leaf size={17}/></span></div><div className="discovery-emoji">{discoveries[discovery].icon}</div><h3>{discoveries[discovery].title}</h3><span className="place-tag">{discoveries[discovery].place}</span><p>{discoveries[discovery].text}</p><button className="discover-link" onClick={openDiscovery}>Explore more <span>↗</span></button></div>
        <div className="daily-card"><div className="daily-copy"><span className="daily-emoji">🎁</span><div><b>Daily Explorer Bonus</b><p>Visit every day to earn 10 coins.</p></div></div><button className="daily-claim" onClick={claimDailyReward} disabled={dailyClaimed}>{dailyClaimed ? "✓ Claimed today" : "Claim +10 coins"}</button></div><div className="goal-card"><div className="goal-icon"><BookOpen size={19}/></div><div><b>Discover Africa</b><p>Unlock stories as you play.</p></div><div className="goal-count">{save.completed}<small>boards</small></div></div><div className="achievement-card"><span className="section-kicker">YOUR ACHIEVEMENTS</span><div className="achievement-row"><span>🌱</span><div><b>First Steps</b><small>{save.completed > 0 ? "Unlocked — first board cleared" : "Clear your first board"}</small></div><strong>{save.completed > 0 ? "✓" : "🔒"}</strong></div><div className="achievement-row"><span>🪙</span><div><b>Coin Collector</b><small>{save.coins >= 50 ? "Unlocked — 50 coins earned" : `${save.coins}/50 coins collected`}</small></div><strong>{save.coins >= 50 ? "✓" : "🔒"}</strong></div><div className="achievement-row"><span>⭐</span><div><b>Star Seeker</b><small>{save.stars >= 10 ? "Unlocked — 10 stars earned" : `${save.stars}/10 stars earned`}</small></div><strong>{save.stars >= 10 ? "✓" : "🔒"}</strong></div></div>
        <div className="quote-card"><span>“</span><p>Wisdom is like a baobab tree; no one individual can embrace it.</p><small>— African proverb</small></div>
      </aside>
    </section>
    <footer><span>✦ AFRIMAHJONG</span><span>Made for curious minds, inspired by Africa.</span><span>V5.5 · PERSONAL BEST + MOVE CHALLENGE</span></footer>
    {showDiscovery && <div className="modal-backdrop" onClick={()=>setShowDiscovery(false)}><section className="discovery-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowDiscovery(false)}>×</button><div className="modal-icon">{discoveries[discovery].icon}</div><span className="section-kicker">AFRICA DISCOVERY LIBRARY</span><h2>{discoveries[discovery].title}</h2><span className="place-tag">{discoveries[discovery].place}</span><p>{discoveries[discovery].text}</p><div className="modal-controls"><button className="secondary-button" onClick={()=>setDiscovery((discovery+discoveries.length-1)%discoveries.length)}>← Previous</button><button className="primary-button" onClick={()=>setDiscovery((discovery+1)%discoveries.length)}>Next story →</button></div></section></div>}
  </main>;
}