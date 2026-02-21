'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KYCPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [kycLevel, setKycLevel] = useState(0);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);

    fetch('/api/v1/auth/profile', {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const level = data.data.kycLevel;
          if (typeof level === 'string') {
            setKycLevel(parseInt(level.replace('level_', '')) || 0);
          } else {
            setKycLevel(level || 0);
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleVerifyPhone = async () => {
    if (!phone || !code) return;
    try {
      const res = await fetch('/api/v1/auth/kyc/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (data.success) {
        setVerified(true);
        setKycLevel(1);
      }
    } catch {}
  };

  if (!token) return null;

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '24px' }}>
        KYC Verification
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
        Complete verification to increase your withdrawal limits
      </p>

      {/* Current Level */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid var(--border)',
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '18px' }}>
          Current Level: {kycLevel}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {kycLevel === 0 ? 'Unverified' : `Level ${kycLevel} Verified`}
        </p>
      </div>

      {verified && (
        <div style={{
          background: 'rgba(14,203,129,0.1)',
          border: '1px solid var(--green)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          color: 'var(--green)',
          fontSize: '14px',
        }}>
          ✅ Level 1 verified! Your phone has been approved.
        </div>
      )}

      {/* Level 1 - Phone Verification */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '16px',
        border: `1px solid ${kycLevel >= 1 ? 'var(--green)' : 'var(--border)'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>
            Phone Verification
          </h3>
          {kycLevel >= 1 && <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ Completed</span>}
        </div>

        {kycLevel < 1 && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  marginBottom: '8px',
                }}
              />
              <input
                type="text"
                placeholder="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <button
              onClick={handleVerifyPhone}
              style={{
                padding: '10px 24px',
                background: 'var(--yellow)',
                color: '#0B0E11',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Verify Phone
            </button>
          </>
        )}
      </div>

      {/* Level 2 - Identity Verification */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '16px',
        border: `1px solid ${kycLevel >= 2 ? 'var(--green)' : 'var(--border)'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>
            Identity Verification
          </h3>
          {kycLevel >= 2 && <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ Completed</span>}
        </div>

        {!showDocUpload && kycLevel < 2 && (
          <button
            onClick={() => setShowDocUpload(true)}
            style={{
              padding: '10px 24px',
              background: kycLevel >= 1 ? 'var(--yellow)' : 'var(--bg-tertiary)',
              color: kycLevel >= 1 ? '#0B0E11' : 'var(--text-tertiary)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: kycLevel >= 1 ? 'pointer' : 'not-allowed',
            }}
          >
            Upload Document
          </button>
        )}

        {(showDocUpload || kycLevel < 2) && (
          <div style={{ marginTop: showDocUpload ? '16px' : '0' }}>
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="docType" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '13px' }}>
                Document Type
              </label>
              <select
                id="docType"
                aria-label="Document type"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              >
                <option value="passport">Passport</option>
                <option value="id_card">National ID Card</option>
                <option value="drivers_license">Driver&apos;s License</option>
              </select>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '13px' }}>
                Front of Document
              </label>
              <input type="file" accept="image/*,.pdf" />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '13px' }}>
                Back of Document
              </label>
              <input type="file" accept="image/*,.pdf" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
