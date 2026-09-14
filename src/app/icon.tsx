import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 180,
          background: 'linear-gradient(135deg, #065f46 0%, #022c22 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          borderRadius: 110,
          border: '12px solid #10b981',
          fontWeight: 900,
          fontFamily: 'sans-serif',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          📈
        </div>
        <div style={{ fontSize: 42, marginTop: 10, color: '#6ee7b7', fontWeight: 800 }}>
          الشاطبي
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
