export default async function globalSetup() {
  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://localhost:3000/api/v1/health');
      if (res.ok) break;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }

  // Clean database
  try {
    const res = await fetch('http://localhost:3000/api/v1/test/cleanup', { method: 'POST' });
    if (res.ok) {
      console.log('[Global Setup] Database cleaned via API');
    }
  } catch (err) {
    console.error('[Global Setup] Error cleaning database:', err);
  }
}
