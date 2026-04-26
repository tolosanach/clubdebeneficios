import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #FE5000, #BD4BF8)' }}>
        <svg width="110" height="110" viewBox="0 0 28 28" fill="none">
          <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <rect x="16" y="5.5" width="8" height="5" rx="2.5" fill="white" opacity=".9"/>
          <rect x="16" y="12" width="9" height="5.5" rx="2.75" fill="white"/>
        </svg>
      </div>
    ),
    { ...size }
  )
}
