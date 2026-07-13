import React, { useState } from 'react';
import { BookOpen, Key, Terminal, Code, AlertTriangle } from 'lucide-react';

export const ApiDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'curl' | 'nodejs' | 'python'>('curl');

  const curlCode = `curl -X POST https://verify.bia.com.ng/api/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"nin": "12300000000"}'`;

  const nodeCode = `const axios = require('axios');

async function verifyNIN() {
  try {
    const res = await axios.post('https://verify.bia.com.ng/api/v1/verify', 
      { nin: '12300000000' },
      {
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(res.data);
  } catch (err) {
    console.error(err.response.data);
  }
}

verifyNIN();`;

  const pythonCode = `import requests

url = "https://verify.bia.com.ng/api/v1/verify"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "nin": "12300000000"
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`;

  return (
    <div className="main-content">
      <div style={{ marginBottom: '28px' }}>
        <h2>API Integration Guide</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Integrate Nigerian identity checks programmatically. Rate limits default to 60 requests/minute.
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'stretch' }}>
        {/* Left Docs Content */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={20} style={{ color: 'var(--primary)' }} />
            Endpoint Reference
          </h3>
          
          <div style={{ marginBottom: '24px' }}>
            <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}>POST</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.05rem', marginLeft: '12px' }}>
              /api/v1/verify
            </span>
          </div>

          <h4 style={{ marginBottom: '10px' }}>Headers:</h4>
          <table className="data-table" style={{ marginBottom: '24px' }}>
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Header Key</th>
                <th>Description / Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontFamily: 'monospace' }}>Authorization</td>
                <td>
                  <span style={{ fontFamily: 'monospace' }}>Bearer YOUR_API_KEY</span> (Required)
                </td>
              </tr>
              <tr>
                <td style={{ fontFamily: 'monospace' }}>Content-Type</td>
                <td>
                  <span style={{ fontFamily: 'monospace' }}>application/json</span>
                </td>
              </tr>
            </tbody>
          </table>

          <h4 style={{ marginBottom: '10px' }}>Request Body Schema:</h4>
          <table className="data-table" style={{ marginBottom: '32px' }}>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Field</th>
                <th style={{ width: '100px' }}>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>nin</td>
                <td>String</td>
                <td>The 11-digit National Identification Number to verify (Required).</td>
              </tr>
            </tbody>
          </table>

          <h4 style={{ marginBottom: '16px' }}>Code Samples:</h4>
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            overflow: 'hidden'
          }}>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              background: '#0f172a',
              borderBottom: '1px solid #334155',
            }}>
              {(['curl', 'nodejs', 'python'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveTab(lang)}
                  style={{
                    background: activeTab === lang ? '#1e293b' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === lang ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeTab === lang ? '#e2e8f0' : '#64748b',
                    padding: '10px 20px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                  {lang}
                </button>
              ))}
            </div>
            {/* Code */}
            <pre style={{
              margin: 0,
              padding: '20px',
              overflowX: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#93c5fd',
              lineHeight: '1.6'
            }}>
              {activeTab === 'curl' && curlCode}
              {activeTab === 'nodejs' && nodeCode}
              {activeTab === 'python' && pythonCode}
            </pre>
          </div>
        </div>

        {/* Right Status / Error Codes */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ marginBottom: '12px' }}>White-Label Responses</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              All responses are sanitized. Upstream network schemas, stack traces, and underlying verification systems are never leaked.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <h4 style={{ marginBottom: '10px' }}>Success Match (200 OK)</h4>
            <pre style={{
              background: '#1e293b',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #334155',
              color: '#86efac',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: '1.5'
            }}>
{`{
  "status": "success",
  "matched": true,
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "middleName": "Adam",
    "gender": "male",
    "dateOfBirth": "1990-01-01",
    "photo": "base64_encoded_portrait_photo_string"
  }
}`}
            </pre>
          </div>

          <div>
            <h4 style={{ marginBottom: '10px' }}>Success No Match (200 OK)</h4>
            <pre style={{
              background: '#1e293b',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #334155',
              color: '#fde047',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: '1.5'
            }}>
{`{
  "status": "success",
  "matched": false,
  "message": "No matching record..."
}`}
            </pre>
          </div>

          <div>
            <h4 style={{ marginBottom: '10px' }}>Standard HTTP Error Codes</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>401:</span>
                <span style={{ color: 'var(--text-secondary)' }}>Invalid API key credentials.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>402:</span>
                <span style={{ color: 'var(--text-secondary)' }}>Insufficient prepaid balance.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>403:</span>
                <span style={{ color: 'var(--text-secondary)' }}>KYC pending approval.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>429:</span>
                <span style={{ color: 'var(--text-secondary)' }}>Rate limit capacity exceeded.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>502:</span>
                <span style={{ color: 'var(--text-secondary)' }}>Upstream provider timeout (fee refunded).</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
