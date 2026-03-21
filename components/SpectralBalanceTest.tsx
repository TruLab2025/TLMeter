"use client";
import React from "react";

// Testowy komponent: pełna animacja, morphing, warstwy, labelki, przełącznik
export default function SpectralBalanceTest() {

  // Dwie wersje krzywej (ręcznie):
  const pathOriginal = "M0 180 C 80 120, 180 140, 260 120 C 340 110, 420 160, 500 140 C 580 120, 640 180, 700 120";
  const pathOptimized = "M0 200 C 80 160, 180 120, 260 140 C 340 120, 420 120, 500 160 C 580 180, 640 200, 700 180";
  const [active, setActive] = React.useState<'original'|'optimized'>('original');
  const [anim, setAnim] = React.useState(pathOriginal);
  React.useEffect(() => {
    if (active === 'original') setAnim(pathOriginal);
    else setAnim(pathOptimized);
  }, [active]);
  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <svg width="700" height="280" viewBox="0 0 700 280" className="block">
        {/* 1. Background grid */}
        <g>
          {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i => (
            <line key={"v"+i} x1={i*50} y1="0" x2={i*50} y2="220" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          ))}
          {[0,1,2,3,4,5,6].map(i => (
            <line key={"h"+i} x1="0" y1={i*40} x2="700" y2={i*40} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          ))}
        </g>
        <defs>
          {/* 2. ClipPath for the curve */}
          <clipPath id="clip-curve">
            <path d={anim + ' L700 220 L0 220 Z'} />
          </clipPath>
          {/* 3. Cyan gradient fill */}
          <linearGradient id="grad-cyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(39,211,255,0.7)" />
            <stop offset="100%" stopColor="rgba(39,211,255,0)" />
          </linearGradient>
          {/* 4. Purple gradient fill */}
          <linearGradient id="grad-purple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(201,59,255,0.7)" />
            <stop offset="100%" stopColor="rgba(201,59,255,0)" />
          </linearGradient>
          {/* 5. Glow filters */}
          <filter id="glow20" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="20" result="blur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
          </filter>
          <filter id="glow8" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.7" />
            </feComponentTransfer>
          </filter>
          {/* 8. Main stroke gradient */}
          <linearGradient id="main-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#27D3FF" />
            <stop offset="100%" stopColor="#C93BFF" />
          </linearGradient>
        </defs>
        {/* 3. Base gradient fill (cyan) */}
        <g clipPath="url(#clip-curve)">
          <rect x="0" y="0" width="700" height="220" fill="url(#grad-cyan)" />
        </g>
        {/* 4. Second gradient overlay (purple, partial overlay for effect) */}
        <g clipPath="url(#clip-curve)">
          <rect x="350" y="0" width="350" height="220" fill="url(#grad-purple)" />
        </g>
        {/* 5. Glow layer (blur 20px, cyan/purple) */}
        <path d={anim} stroke={active==='original'?"#27D3FF":"#C93BFF"} strokeWidth="8" fill="none" filter="url(#glow20)" opacity="0.4" />
        {/* 6. Glow layer (blur 8px, cyan/purple) */}
        <path d={anim} stroke={active==='original'?"#27D3FF":"#C93BFF"} strokeWidth="5" fill="none" filter="url(#glow8)" opacity="0.7" />
        {/* 7. Highlight stroke */}
        <path d={anim} stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
        {/* 8. Main stroke (cyan to purple gradient) */}
        <path d={anim} stroke="url(#main-stroke)" strokeWidth="3" fill="none" />
      </svg>
      {/* Przełącznik pod wykresem */}
      <div style={{display:'flex',gap:16,justifyContent:'center',margin:'24px 0'}}>
        <button
          onClick={()=>setActive('original')}
          style={{
            background:active==='original'?'#27D3FF':'#23233a',
            color:active==='original'?'#181828':'#27D3FF',
            fontWeight:700,
            border:'none',
            borderRadius:12,
            padding:'10px 32px',
            fontSize:20,
            cursor:'pointer',
            boxShadow:active==='original'?'0 2px 16px 0 #27D3FF55':'none',
            transition:'all .2s'
          }}
        >
          Oryginał
        </button>
        <button
          onClick={()=>setActive('optimized')}
          style={{
            background:active==='optimized'?'#C93BFF':'#23233a',
            color:active==='optimized'?'#181828':'#C93BFF',
            fontWeight:700,
            border:'none',
            borderRadius:12,
            padding:'10px 32px',
            fontSize:20,
            cursor:'pointer',
            boxShadow:active==='optimized'?'0 2px 16px 0 #C93BFF55':'none',
            transition:'all .2s'
          }}
        >
          TL Meter Optimized
        </button>
      </div>
      {/* Link do Spotify */}
      <div style={{textAlign:'center',marginTop:12}}>
        <a href="https://open.spotify.com/" target="_blank" rel="noopener noreferrer" style={{color:'#1DB954',fontWeight:600,fontSize:18,textDecoration:'none'}}>
          Posłuchaj cały utwór w Spotify
        </a>
      </div>
    </div>
  );
}
