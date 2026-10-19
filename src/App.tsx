import { useEffect, useMemo, useState } from 'react';
import { Compass, Lightbulb, RotateCcw, Shuffle, Trophy, Volume2, VolumeX, BookOpen, Flame, Star, Leaf } from 'lucide-react';

type Tile = { id: number; icon: string; label: string; removed: boolean };
type Save = { level: number; bestScore: number; stars: number; completed: number };

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
  const deck = symbols.flatMap(([icon,label], i) => [
    { id: i*2, icon, label, removed:false }, { id: i*2+1, icon, label, removed:false }
  ]);
  for (let i=deck.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
  return deck;
};
const readSave = (): Save => {
  try { const value=localStorage.getItem('afr imahjong-save'); if(value) return {...{level:1,bestScore:0,stars:0,completed:0},...JSON.parse(value)}; } catch {}
  return {level:1,bestScore:0,stars:0,completed:0};
};

export default function App() {
  const [save,setSave] = useState<Save>(readSave);
  const [tiles,setTiles] = useState<Tile[]>(makeTiles);
  const [selected,setSelected] = useState<number|null>(null);
  const [score,setScore] = useState(0);
  const [moves,setMoves] = useState(0);
  const [hints,setHints] = useState<[number,number]|null>(null);
  const [message,setMessage] = useState('Match two identical free tiles to clear the board.');
  const [sound,setSound] = useState(false);
  const [showDiscovery,setShowDiscovery] = useState(false);
  const [discovery,setDiscovery] = useState(0);
  const [won,setWon] = useState(false);
  const remaining = tiles.filter(t=>!t.removed);
  const pairs = remaining.length/2;
  const progress = Math.round(((32-remaining.length)/32)*100);
  const freeTiles = useMemo(()=>remaining, [tiles]);

  useEffect(()=>{ localStorage.setItem('afr imahjong-save',JSON.stringify(save)); },[save]);
  const restart = (newLevel=false) => {
    setTiles(makeTiles()); setSelected(null); setHints(null); setMoves(0); setWon(false);
    setScore(0); setMessage(newLevel ? 'New journey unlocked. Good luck!' : 'Fresh board! Match the identical symbols.');
  };
  const choose = (tile:Tile) => {
    if(tile.removed || won) return;
    setHints(null);
    if(selected===tile.id) { setSelected(null); return; }
    if(selected===null) { setSelected(tile.id); return; }
    const first=tiles.find(t=>t.id===selected);
    if(first && first.icon===tile.icon) {
      const next=tiles.map(t=>t.id===first.id||t.id===tile.id?{...t,removed:true}:t);
      setTiles(next); setSelected(null); setMoves(m=>m+1); setScore(s=>s+100);
      setMessage('Great match! +100 points ✨');
      if(next.every(t=>t.removed)) {
        const earned= Math.max(1, Math.min(3, 3-Math.floor(moves/10)));
        setWon(true); setMessage('Amazing! You cleared this board.');
        setSave(s=>({...s,level:Math.max(s.level, s.level+1),completed:s.completed+1,stars:s.stars+earned,bestScore:Math.max(s.bestScore,score+100)}));
      }
    } else {
      setSelected(tile.id); setMoves(m=>m+1); setMessage('Not a match yet — try another tile.');
    }
  };
  const hint = () => {
    const current=tiles.filter(t=>!t.removed);
    for(let i=0;i<current.length;i++) {
      const partner=current.find((t,j)=>j>i&&t.icon===current[i].icon);
      if(partner) { setHints([current[i].id,partner.id]); setSelected(null); setMessage('Hint: these two tiles match.'); return; }
    }
    setMessage('No matching pair found. Try Shuffle.');
  };
  const shuffle = () => {
    const active=tiles.filter(t=>!t.removed);
    const icons=active.map(t=>t.icon).sort(()=>Math.random()-.5);
    let index=0;
    setTiles(tiles.map(t=>t.removed?t:{...t,icon:icons[index++],label:'Discovery tile'}));
    setSelected(null); setHints(null); setMessage('Tiles shuffled. Find your next pair!');
  };
  const undo = () => { setMessage('Undo is ready for the next move in the full game build.'); setSelected(null); };
  const startNext = () => { setSave(s=>({...s,level:s.level+1})); restart(true); };
  const openDiscovery = () => { setDiscovery((d)=> (d+1)%discoveries.length); setShowDiscovery(true); };

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
    </section>

    <section className="game-layout">
      <div className="game-panel">
        <div className="panel-heading"><div><span className="section-kicker">THE SAVANNA TRAIL</span><h2>Tile Match <span className="level-pill">LEVEL {save.level}</span></h2></div><button className="text-button" onClick={()=>restart()}><RotateCcw size={15}/> Restart</button></div>
        <div className="game-meta"><span>Score <b>{score.toLocaleString()}</b></span><span>Moves <b>{moves}</b></span><span>Pairs left <b>{pairs}</b></span></div>
        <div className="progress-track"><span style={{width:progress+'%'}}/></div>
        <div className="tile-board" aria-label="Mahjong tile board">
          {tiles.map(tile=><button key={tile.id} className={'tile '+(tile.removed?'tile-gone':'')+(selected===tile.id?' selected':'')+(hints?.includes(tile.id)?' hint-tile':'')} onClick={()=>choose(tile)} disabled={tile.removed} aria-label={tile.label}>
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
        <div className="goal-card"><div className="goal-icon"><BookOpen size={19}/></div><div><b>Discover Africa</b><p>Unlock stories as you play.</p></div><div className="goal-count">{save.completed}<small>stories</small></div></div>
        <div className="quote-card"><span>“</span><p>Wisdom is like a baobab tree; no one individual can embrace it.</p><small>— African proverb</small></div>
      </aside>
    </section>
    <footer><span>✦ AFRIMAHJONG</span><span>Made for curious minds, inspired by Africa.</span><span>V1.0 · OFFLINE READY</span></footer>
    {showDiscovery && <div className="modal-backdrop" onClick={()=>setShowDiscovery(false)}><section className="discovery-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowDiscovery(false)}>×</button><div className="modal-icon">{discoveries[discovery].icon}</div><span className="section-kicker">AFRICA DISCOVERY LIBRARY</span><h2>{discoveries[discovery].title}</h2><span className="place-tag">{discoveries[discovery].place}</span><p>{discoveries[discovery].text}</p><div className="modal-controls"><button className="secondary-button" onClick={()=>setDiscovery((discovery+discoveries.length-1)%discoveries.length)}>← Previous</button><button className="primary-button" onClick={()=>setDiscovery((discovery+1)%discoveries.length)}>Next story →</button></div></section></div>}
  </main>;
}