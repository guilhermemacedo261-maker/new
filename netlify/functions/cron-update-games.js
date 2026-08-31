const { schedule } = require('@netlify/functions');

// Terca-feira 08:00 (America/Sao_Paulo) = 11:00 UTC. Netlify Scheduled Functions usam UTC.
exports.handler = schedule('0 11 * * 2', async () => {
  const res = await fetch(`${process.env.URL}/api/cron/update-games`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log('cron-update-games', res.status, await res.text());
  return { statusCode: 200 };
});
