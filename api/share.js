const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const data = req.body;
  if (!data || !data.summary || !data.events) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }
  const raw = JSON.stringify(data);
  if (raw.length > 2_000_000) {
    res.status(413).json({ error: 'Payload too large' });
    return;
  }
  try {
    const blob = await put(`pass-tracker-${Date.now()}.json`, raw, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: true,
    });
    res.status(200).json({ url: blob.url });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
};
