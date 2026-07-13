import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, HelpCircle, FileUp, AlertTriangle, Play, Download, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface BatchRecord {
  nin: string;
  firstName?: string;
  lastName?: string;
}

interface BatchResultItem {
  index: number;
  nin: string;
  status: 'pending' | 'success' | 'no_match' | 'failed';
  matched?: boolean;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  dateOfBirth?: string;
  error?: string;
}

export const BatchVerify: React.FC = () => {
  const { token, business } = useAuth();
  
  const [balance, setBalance] = useState<number>(0);
  const [inputText, setInputText] = useState('');
  const [parsedRecords, setParsedRecords] = useState<BatchRecord[]>([]);
  
  // Execution state
  const [verifying, setVerifying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [results, setResults] = useState<BatchResultItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchBalance = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5001/api/v1/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [token]);

  // Parse pasted text or simple text input
  // Expect format: NIN, [FirstName], [LastName] (one per line) or just NIN (one per line)
  const handleParseText = () => {
    setErrorMessage('');
    if (!inputText.trim()) {
      setErrorMessage('Please enter or paste at least one record to verify.');
      return;
    }

    const lines = inputText.split('\n');
    const records: BatchRecord[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',').map(p => p.trim());
      const nin = parts[0].replace(/\D/g, ''); // Extract digits only

      if (nin.length === 11) {
        records.push({
          nin,
          firstName: parts[1] || '',
          lastName: parts[2] || ''
        });
      }
    }

    if (records.length === 0) {
      setErrorMessage('Could not find any valid 11-digit NINs in the provided input.');
      return;
    }

    if (records.length > 500) {
      setErrorMessage('Batch limit exceeded. You can verify up to 500 records at a time.');
      return;
    }

    setParsedRecords(records);
  };

  // Parse CSV upload
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const records: BatchRecord[] = [];
      
      // Basic CSV parser
      // Assumes columns: NIN, First Name, Last Name
      let headersParsed = false;
      let ninColIdx = 0;
      let firstColIdx = 1;
      let lastColIdx = 2;

      for (const line of lines) {
        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, '')); // Strip quotes
        if (cols.length === 0 || cols.every(c => c === '')) continue;

        if (!headersParsed) {
          // Detect headers if present, otherwise treat as row 1
          const isHeader = cols.some(c => c.toLowerCase().includes('nin') || c.toLowerCase().includes('identity'));
          if (isHeader) {
            ninColIdx = cols.findIndex(c => c.toLowerCase().includes('nin'));
            firstColIdx = cols.findIndex(c => c.toLowerCase().includes('first') || c.toLowerCase().includes('name'));
            lastColIdx = cols.findIndex(c => c.toLowerCase().includes('last') || c.toLowerCase().includes('surname'));
            
            if (ninColIdx === -1) ninColIdx = 0;
            headersParsed = true;
            continue;
          }
          headersParsed = true;
        }

        const nin = cols[ninColIdx]?.replace(/\D/g, '') || '';
        if (nin.length === 11) {
          records.push({
            nin,
            firstName: cols[firstColIdx] || '',
            lastName: cols[lastColIdx] || ''
          });
        }
      }

      if (records.length === 0) {
        setErrorMessage('Failed to parse any valid 11-digit NIN rows from the CSV file.');
        return;
      }

      if (records.length > 500) {
        setErrorMessage('Batch size exceeds maximum allowed limit of 500 rows.');
        return;
      }

      setParsedRecords(records);
    };
    reader.readAsText(file);
  };

  const handleStartVerification = async () => {
    if (parsedRecords.length === 0) return;
    
    const cost = parsedRecords.length * 60;
    if (balance < cost) {
      setErrorMessage(`Insufficient wallet balance. Total cost: ₦${cost.toFixed(2)}, Available: ₦${balance.toFixed(2)}.`);
      return;
    }

    setVerifying(true);
    setCurrentIndex(0);
    setErrorMessage('');
    
    // Prepare initial empty results
    const initialResults: BatchResultItem[] = parsedRecords.map((r, idx) => ({
      index: idx,
      nin: r.nin,
      status: 'pending'
    }));
    setResults(initialResults);

    try {
      // Use fetch to process SSE stream chunk-by-chunk
      const response = await fetch('http://localhost:5001/api/v1/verify/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ records: parsedRecords })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Batch verification request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Readable stream not supported by browser.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Save the last incomplete chunk back to the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;

            const payload = JSON.parse(dataStr);

            if (payload.type === 'start') {
              // Started successfully
              continue;
            }

            if (payload.type === 'progress') {
              const { index, status, matched, data, error } = payload;
              
              setCurrentIndex(index + 1);
              setResults(prev => {
                const copy = [...prev];
                copy[index] = {
                  ...copy[index],
                  status,
                  matched,
                  firstName: data?.firstName,
                  lastName: data?.lastName,
                  middleName: data?.middleName,
                  gender: data?.gender,
                  dateOfBirth: data?.dateOfBirth,
                  error
                };
                return copy;
              });
            }

            if (payload.type === 'complete') {
              setVerifying(false);
              fetchBalance(); // Refresh wallet
              break;
            }
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during batch streaming.');
      setVerifying(false);
      fetchBalance();
    }
  };

  const handleClear = () => {
    setInputText('');
    setParsedRecords([]);
    setResults([]);
    setCurrentIndex(0);
    setErrorMessage('');
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;

    // Build CSV string
    const headers = 'Index,NIN,Status,Matched,First Name,Last Name,Middle Name,Gender,DOB,Error\n';
    const rows = results.map(r => {
      return `${r.index + 1},${r.nin},${r.status},${r.matched ?? ''},${r.firstName || ''},${r.lastName || ''},${r.middleName || ''},${r.gender || ''},${r.dateOfBirth || ''},"${r.error || ''}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `biaverify_batch_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kycStatus = business?.kycStatus || 'none';
  const progressPercent = parsedRecords.length > 0 ? (currentIndex / parsedRecords.length) * 100 : 0;

  return (
    <div className="main-content">
      <div style={{ marginBottom: '28px' }}>
        <h2>Batch NIN Identity Verification</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Bulk search up to 500 records. View progress stream in real-time and export reports to CSV.
        </p>
      </div>

      {kycStatus !== 'approved' ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={36} style={{ color: 'var(--warning)', marginBottom: '12px' }} />
          <h3>Access Blocked</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '400px', margin: '6px auto' }}>
            Batch NIN queries require an approved business KYC status. Please submit your business documents.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Controls Grid */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'stretch' }}>
            {/* Input card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={20} style={{ color: 'var(--primary)' }} />
                Bulk Input Panel
              </h3>
              
              {errorMessage && (
                <div className="badge-error" style={{ padding: '12px', borderRadius: '8px', fontSize: '0.85rem', display: 'block', width: '100%', marginBottom: '16px' }}>
                  {errorMessage}
                </div>
              )}

              <textarea
                disabled={verifying}
                rows={6}
                placeholder="Paste data format: NIN, [FirstName], [LastName] (One per line)&#10;Example:&#10;12300000000, John, Doe&#10;45600000000, Jane, Smith"
                className="form-input"
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', flex: 1, resize: 'none', marginBottom: '16px' }}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    disabled={verifying}
                    onClick={handleParseText}
                    className="btn-base btn-secondary"
                    style={{ padding: '10px 18px' }}
                  >
                    Parse Paste Box
                  </button>
                  <label className="btn-base btn-secondary" style={{ padding: '10px 18px', cursor: 'pointer', position: 'relative' }}>
                    <FileUp size={16} />
                    <span>Upload CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      disabled={verifying}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      onChange={handleCsvUpload}
                    />
                  </label>
                </div>
                <button
                  disabled={verifying}
                  onClick={handleClear}
                  className="btn-base btn-secondary"
                  style={{ color: 'var(--error)', borderColor: 'var(--error-glow)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Target queue review card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ marginBottom: '12px' }}>Verify Calculation</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Prepaid Balance:</span>
                    <strong style={{ color: 'var(--success)' }}>₦{balance.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Queued Records:</span>
                    <strong>{parsedRecords.length} rows</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Estimated Cost:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>₦{(parsedRecords.length * 60).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button
                  disabled={verifying || parsedRecords.length === 0}
                  onClick={handleStartVerification}
                  className={`btn-base btn-primary ${verifying || parsedRecords.length === 0 ? 'btn-disabled' : ''}`}
                  style={{ width: '100%', padding: '12px' }}
                >
                  <Play size={16} />
                  <span>Start Batch Verification</span>
                </button>
              </div>
            </div>
          </div>

          {/* Progress Stream and Results Table */}
          {(verifying || results.length > 0) && (
            <div className="glass-panel" style={{ padding: '28px' }}>
              {/* Progress bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: '700' }}>
                    {verifying ? 'Streaming Batch Verification...' : 'Batch Verification Completed'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {currentIndex} / {parsedRecords.length} ({Math.round(progressPercent)}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(to right, #3b82f6, #10b981)',
                    transition: 'width 0.1s ease'
                  }}></div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4>Results Queue</h4>
                <button
                  disabled={verifying}
                  onClick={handleExportCsv}
                  className={`btn-base btn-secondary ${verifying ? 'btn-disabled' : ''}`}
                  style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                >
                  <Download size={14} /> Export CSV Report
                </button>
              </div>

              {/* Results list */}
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>NIN</th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Middle Name</th>
                      <th>Status</th>
                      <th>Info / Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace' }}>{row.nin}</td>
                        <td>{row.firstName || '-'}</td>
                        <td>{row.lastName || '-'}</td>
                        <td>{row.middleName || '-'}</td>
                        <td>
                          {row.status === 'pending' && <span className="badge badge-warning">Queued</span>}
                          {row.status === 'success' && <span className="badge badge-success">Match</span>}
                          {row.status === 'no_match' && <span className="badge badge-warning">No Match</span>}
                          {row.status === 'failed' && <span className="badge badge-error">Failed</span>}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: row.status === 'failed' ? 'var(--error)' : 'var(--text-secondary)' }}>
                          {row.error || (row.status === 'success' ? `DOB: ${row.dateOfBirth}, Gender: ${row.gender}` : '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
