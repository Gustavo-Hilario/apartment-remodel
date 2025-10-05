'use client';

import Link from 'next/link';

const rooms = [
  { slug: 'cocina', name: 'Cocina' },
  { slug: 'sala', name: 'Sala' },
  { slug: 'cuarto1', name: 'Cuarto 1' },
  { slug: 'cuarto2', name: 'Cuarto 2' },
  { slug: 'cuarto3', name: 'Cuarto 3' },
  { slug: 'bano1', name: 'Baño 1' },
  { slug: 'bano2', name: 'Baño 2' },
  { slug: 'bano_visita', name: 'Baño Visita' },
  { slug: 'balcon', name: 'Balcón' },
];

export default function RoomsPage() {
  return (
    <div>
      <h1>🚪 All Rooms</h1>
      <p style={{ color: '#666', marginTop: '8px', marginBottom: '32px' }}>
        Select a room to edit its items
      </p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '16px' 
      }}>
        {rooms.map(room => (
          <Link
            key={room.slug}
            href={`/rooms/${room.slug}`}
            style={{
              padding: '24px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ fontSize: '2em', marginBottom: '8px' }}>🚪</div>
            <div style={{ fontWeight: '600' }}>{room.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
