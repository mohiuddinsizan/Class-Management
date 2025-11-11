export default function LogoSvg({ size=22 }){
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#8e52ff"/><stop offset="55%" stopColor="#6c7bff"/><stop offset="100%" stopColor="#3b2f7a"/>
        </radialGradient>
        <filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity=".45"/></filter>
      </defs>
      <circle cx="64" cy="64" r="40" fill="url(#g)" filter="url(#sh)"/>
      <g stroke="#4ffff2" strokeWidth="2" opacity=".9"><path d="M64 18c4 10 8 18 8 46s-4 36-8 46" fill="none"/><path d="M18 64c10-4 18-8 46-8s36 4 46 8" fill="none"/></g>
      <path d="M52 40h14c8 0 14 4 14 11 0 5-3 8-8 9 6 1 10 5 10 11 0 8-6 13-16 13H52V40zm10 16h8c4 0 6-2 6-5s-2-5-6-5h-8v10zm0 22h9c5 0 7-2 7-6s-2-6-7-6h-9v12z" fill="#fff"/>
    </svg>
  );
}
