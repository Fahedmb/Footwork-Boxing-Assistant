import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import cn from 'classnames';
import useSound from 'use-sound';
import { useRAFInterval } from '../hooks/useRAFInterval';

/* ═════════ types & LS ═════════ */

type Drill = 'movement' | 'guard';
interface Config {
  drill: Drill;
  rounds: number;
  roundSeconds: number;
  difficulty: number;      // 1–5
  showAssists: boolean;
  unpredictable: boolean;
  attackWindows: boolean;  // also drives purple “attack NOW” in guard drill
}

const LS_KEY = 'footwork-cfg';
const readLS = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); }
  catch { return null; }
};
const writeLS = (c: Config) => localStorage.setItem(LS_KEY, JSON.stringify(c));

const defaultCfg: Config = {
  drill: 'movement',
  rounds: 3,
  roundSeconds: 180,
  difficulty: 1,
  showAssists: true,
  unpredictable: false,
  attackWindows: false,
};

/* ═════════ root page ═════════ */

export default function Footwork() {
  const [cfg, setCfg]   = useState<Config>(defaultCfg);
  const [hydrated, setHydr] = useState(false);
  const [started, setGo]    = useState(false);
  const [theme, setTheme]   = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const fromLS = readLS();
    if (fromLS) setCfg(fromLS);
    setHydr(true);
  }, []);
  useEffect(() => { if (hydrated) writeLS(cfg); }, [cfg, hydrated]);

  return (
      <>
        <style jsx global>{`
          html.flash-blue   { background:#1e3a8a !important; }
          html.flash-red    { background:#7f1d1d !important; }
          html.flash-green  { background:#064e3b !important; }
          html.flash-purple { background:#5b21b6 !important; }
        `}</style>

        <div className={cn(
            'min-h-screen transition-colors',
            theme === 'dark'
                ? 'bg-neutral-900 text-neutral-100'
                : 'bg-neutral-100 text-neutral-900'
        )}>
          <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-6">
            <h1 className="text-3xl font-extrabold">Footwork&nbsp;Timer</h1>
            <button
                onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
                className="rounded border px-2 py-1 text-xs hover:bg-neutral-800 hover:text-white dark:border-neutral-600 dark:hover:bg-neutral-200 dark:hover:text-black"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </header>

          <main className="flex flex-col items-center justify-center pb-24">
            {!started ? (
                <Setup cfg={cfg} setCfg={setCfg} onStart={() => setGo(true)} />
            ) : cfg.drill === 'movement' ? (
                <MovementDrill cfg={cfg} onExit={() => setGo(false)} />
            ) : (
                <GuardDrill cfg={cfg} onExit={() => setGo(false)} />
            )}
          </main>
        </div>
      </>
  );
}

/* ═════════ setup screen ═════════ */

function Setup({ cfg, setCfg, onStart }:{
  cfg:Config; setCfg:(c:Config)=>void; onStart:()=>void;
}) {
  const emoji = ['😌','🙂','😅','😬','😤'][cfg.difficulty-1];

  return (
      <form
          onSubmit={e => { e.preventDefault(); onStart(); }}
          className="w-full max-w-md space-y-6 rounded-xl border border-gray-400/50 bg-white/70 p-6 backdrop-blur dark:border-gray-600 dark:bg-gray-800/60"
      >
        {/* drill */}
        <label className="block">
          <span className="font-medium">Drill</span>
          <select
              value={cfg.drill}
              onChange={e => setCfg({ ...cfg, drill: e.target.value as Drill })}
              className="mt-1 w-full rounded border p-2 dark:bg-gray-800"
          >
            <option value="movement">Movement</option>
            <option value="guard">Guard</option>
          </select>
        </label>

        {/* rounds + seconds */}
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="font-medium">Rounds</span>
            <input
                type="number" min={1}
                className="mt-1 w-full rounded border p-2 dark:bg-gray-800"
                value={cfg.rounds}
                onChange={e => setCfg({ ...cfg, rounds:+e.target.value })}
            />
          </label>
          <label>
            <span className="font-medium">Sec / round</span>
            <input
                type="number" min={10}
                className="mt-1 w-full rounded border p-2 dark:bg-gray-800"
                value={cfg.roundSeconds}
                onChange={e =>
                    setCfg({ ...cfg, roundSeconds:+e.target.value })
                }
            />
          </label>
        </div>

        {/* difficulty + emoji label */}
        <label className="block">
          <span className="font-medium">Difficulty {emoji}</span>
          <input
              type="range" min={1} max={5}
              value={cfg.difficulty}
              onChange={e =>
                  setCfg({ ...cfg, difficulty:+e.target.value })
              }
              className="mt-2 w-full accent-emerald-500"
          />
          <p className="text-xs pt-1">
            1&nbsp;slow 😌&nbsp;· 3 steady 😅 · 5 fast 😤
          </p>
        </label>

        {cfg.drill==='movement' && (
            <div className="space-y-1">
              <Toggle lbl="Attack / defence cues"   v={cfg.showAssists}     set={v=>setCfg({...cfg,showAssists:v})}/>
              <Toggle lbl="Unpredictable bounce"    v={cfg.unpredictable}   set={v=>setCfg({...cfg,unpredictable:v})}/>
              <Toggle lbl="Attack windows (blue)"   v={cfg.attackWindows}   set={v=>setCfg({...cfg,attackWindows:v})}/>
            </div>
        )}

        <button type="submit" className="w-full rounded bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700">
          🔔 Start
        </button>
      </form>
  );
}
const Toggle = ({lbl,v,set}:{lbl:string;v:boolean;set:(b:boolean)=>void}) => (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={v} onChange={e=>set(e.target.checked)} />
      <span>{lbl}</span>
    </label>
);

/* ═════════ movement drill (unchanged visuals) ═════════ */

type Dir='center'|'left'|'right'|'forward'|'back';
const rot:Record<Dir,number>={center:0,left:-90,right:90,forward:0,back:180};

function MovementDrill({ cfg,onExit }:{ cfg:Config; onExit:()=>void }) {
  const { rounds,roundSeconds,difficulty,showAssists,unpredictable,attackWindows }=cfg;

  const [round,setRound]=useState(1);
  const [time,setTime]=useState(roundSeconds*1000);
  const [q,setQ]=useState<Dir[]>(['center']);
  const [dir,setDir]=useState<Dir>('center');
  const [steps,setSteps]=useState(3);
  const [pulse,setPulse]=useState(false);
  const [flash,setFlash]=useState<'none'|'atk'|'def'>('none');
  const [hold,setHold]=useState(0);

  const [bellStart]=useSound('/sounds/bell-start.mp3',{volume:0.9});
  const [bellEnd]  =useSound('/sounds/bell-end.mp3'  ,{volume:0.9});

  const hop=900-(difficulty-1)*112.5; const half=hop/2;
  const acc=useRef(0);
  useRAFInterval(dt=>{
    setTime(t=>t-dt);
    acc.current+=dt;
    if(acc.current>=half){ acc.current-=half; setPulse(p=>!p); if(!pulse) setSteps(s=>s-1);}
    if(hold>0) setHold(h=>h-dt);
  },true);

  useEffect(()=>{
    const h=document.body;
    h.classList.toggle('flash-red',flash==='atk');
    h.classList.toggle('flash-green',flash==='def');
    h.classList.toggle('flash-blue',hold>0);
  },[flash,hold]);

  useEffect(()=>{
    if(!attackWindows||dir!=='forward'||steps>1) return;
    setHold(600);
  },[attackWindows,dir,steps]);

  useEffect(()=>{
    if(steps>0) return;
    setQ(q=>{
      const nxt=q.length?q[0]:pickDir();
      setDir(nxt); setSteps(randSteps()); setFlash('none');
      return q.length?q.slice(1):['center'];
    });
  },[steps]);

  const pickDir=():Dir=>Math.random()<0.6?(Math.random()<0.5?'left':'right'):(Math.random()<0.5?'forward':'back');
  const randSteps=()=>unpredictable?Math.floor(Math.random()*3)+2:Math.floor(Math.random()*2)+3;

  useEffect(()=>{
    if(!showAssists||(dir!=='forward'&&dir!=='back')) return;
    if(Math.random()<0.07*difficulty) setFlash(dir==='forward'?'atk':'def');
  },[dir,showAssists,difficulty]);

  useEffect(()=>{
    if(time>0) return;
    if(round===rounds){ bellEnd(); onExit(); return;}
    bellEnd(); bellStart(); setRound(r=>r+1); setTime(roundSeconds*1000);
  },[time,round,rounds,roundSeconds,bellEnd,bellStart,onExit]);

  const prog=100-(time/(roundSeconds*10));

  return (
      <section className="relative flex h-screen w-screen flex-col items-center justify-center">
        <div className="absolute top-4 w-80">
          <div className="h-2 overflow-hidden rounded bg-neutral-700"><div className="h-full bg-emerald-500" style={{width:`${prog}%`}}/></div>
          <p className="pt-1 text-center text-sm font-medium">Round {round}/{rounds} – {(time/1000).toFixed(1)} s</p>
        </div>

        <Image src={dir==='center'?'/neutral.png':'/arrow.png'} alt="" width={150} height={150} priority style={{transform:`rotate(${rot[dir]}deg)`}}/>
        <div className={cn('absolute bottom-12 h-28 w-28 rounded-full border-8 transition-opacity',
            pulse?'border-emerald-400 drop-shadow-[0_0_14px_rgba(16,185,129,0.8)]':'border-emerald-800 opacity-50')}/>

        <button onClick={onExit} className="absolute top-4 right-4 rounded bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-700">Quit</button>
      </section>
  );
}

/* ═════════ guard drill with diff-based spacing & purple attack cue ═════════ */

type G='green'|'yellow'|'redL'|'redR'|'blue';
function GuardDrill({ cfg,onExit }:{ cfg:Config; onExit:()=>void }) {
  const { rounds,roundSeconds,difficulty,attackWindows }=cfg;

  const [round,setR]=useState(1);
  const [time,setT]=useState(roundSeconds*1000);
  const [state,setS]=useState<G>('green');
  const [seq,setSeq]=useState<G[]>([]);
  const [pulse,setP]=useState(false);
  const [atkWindow,setAtk]=useState(0);

  const [bellStart] = useSound('/sounds/bell-start.mp3',{volume:0.5});
  const [bellEnd]   = useSound('/sounds/bell-end.mp3'  ,{volume:0.5});

  const hop=900-(difficulty-1)*117.5;
  const half=hop/2;
  const acc=useRef(0);
  useRAFInterval(dt=>{
    setT(t=>t-dt); acc.current+=dt;
    if(acc.current>=half){ acc.current-=half; setP(p=>!p); if(!pulse) advance(); }
    if(atkWindow>0) setAtk(a=>a-dt);
  },true);

  useEffect(()=>{
    const h=document.documentElement;
    h.classList.toggle('flash-purple',atkWindow>0);
  },[atkWindow]);

  const advance=()=>{
    setSeq(s=>{
      if(s.length){ setS(s[0]); return s.slice(1);}
      // build new combo; easier diff = long pause
      const spacing   = 5000 - (difficulty-1)*900;   // 5s … 1.4s
      const comboLen  = Math.random()<0.4*difficulty?2:1;
      const firstSide = Math.random()>0.5?'L':'R';
      const second    = firstSide==='L'?'R':'L';

      const newS:G[] = ['yellow', firstSide==='L'?'redL':'redR'];
      if(comboLen===2) newS.push(second==='L'?'redL':'redR');
      newS.push('blue');

      // chance to give YOU an attack cue
      if(attackWindows && Math.random()<0.3) {
        setTimeout(()=>setAtk(400), half);   // purple flash very soon
      }

      setTimeout(()=>setSeq([]), spacing);   // insert delay before next build
      setS('green');
      return newS;
    });
  };

  useEffect(()=>{
    if(time>0) return;
    if(round===rounds){ bellEnd(); onExit(); return;}
    bellEnd(); bellStart(); setR(r=>r+1); setT(roundSeconds*1000);
  },[time,round,rounds,roundSeconds,bellEnd,bellStart,onExit]);

  const bg:Record<G,string>={green:'bg-emerald-900',yellow:'bg-yellow-500',redL:'bg-red-700',redR:'bg-red-700',blue:'bg-blue-700'};
  const circle=pulse?'border-emerald-400 drop-shadow-[0_0_14px_rgba(16,185,129,0.8)]':'border-emerald-800 opacity-50';

  return (
      <section className={cn('relative flex h-screen w-screen items-center justify-center transition-colors duration-150', bg[state])}>
        <div className="absolute top-3 text-lg font-medium">Round {round}/{rounds} – {(time/1000).toFixed(1)} s</div>

        {state==='redL' && <div className="absolute left-0 top-0 h-full w-1/2 bg-red-900/60"/>}
        {state==='redR' && <div className="absolute right-0 top-0 h-full w-1/2 bg-red-900/60"/>}

        <div className={cn('h-28 w-28 rounded-full border-8 transition-opacity',circle)}/>

        <button onClick={onExit} className="absolute top-3 right-4 rounded bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-700">Quit</button>
      </section>
  );
}
