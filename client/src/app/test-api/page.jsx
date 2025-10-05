/**
 * Test API Connection
 * 
 * This page verifies that Next.js can successfully
 * communicate with the Express API backend.
 */

'use client';

import { useState } from 'react';
import { roomsAPI, totalsAPI } from '@/lib/api';

export default function TestAPIPage() {
  const [rooms, setRooms] = useState(null);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testRoomsAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await roomsAPI.getAll();
      setRooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testTotalsAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await totalsAPI.get();
      setTotals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '20px' }}>🧪 API Connection Test</h1>
      
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <p><strong>Express API:</strong> {process.env.NEXT_PUBLIC_API_URL}</p>
        <p><strong>Status:</strong> {loading ? '⏳ Loading...' : '✅ Ready'}</p>
      </div>

      {error && (
        <div style={{ padding: '15px', background: '#fee', color: '#c00', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2>Test Rooms API</h2>
        <button 
          onClick={testRoomsAPI}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            background: '#0070f3', 
            color: 'white', 
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          Get All Rooms
        </button>
        
        {rooms && (
          <pre style={{ 
            background: '#1e1e1e', 
            color: '#d4d4d4', 
            padding: '15px', 
            borderRadius: '5px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(rooms, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Test Totals API</h2>
        <button 
          onClick={testTotalsAPI}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            background: '#0070f3', 
            color: 'white', 
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          Get Project Totals
        </button>
        
        {totals && (
          <pre style={{ 
            background: '#1e1e1e', 
            color: '#d4d4d4', 
            padding: '15px', 
            borderRadius: '5px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(totals, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '8px' }}>
        <h3>✅ Next Steps</h3>
        <ul>
          <li>Both servers are running</li>
          <li>API connection is configured</li>
          <li>Ready to start building components</li>
        </ul>
        <p style={{ marginTop: '15px' }}>
          <a href="/" style={{ color: '#0070f3' }}>← Back to Home</a>
        </p>
      </div>
    </div>
  );
}
