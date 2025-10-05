'use client';

import { useParams } from 'next/navigation';

export default function RoomEditorPage() {
  const params = useParams();
  const roomSlug = params.slug;

  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h1>🚪 Room Editor</h1>
      <p style={{ color: '#666', marginTop: '16px' }}>
        Editing room: <strong>{roomSlug}</strong>
      </p>
      <p style={{ color: '#999', fontSize: '0.9em', marginTop: '40px' }}>
        🚧 Coming soon - currently migrating from room-editor.html
      </p>
    </div>
  );
}
