const { schedule } = require('@netlify/functions');

// Quinta-feira 16:00 (America/Sao_Paulo) = 19:00 UTC. Netlify Scheduled Functions usam UTC.
exports.handler = schedule('0 19 * * 4', async () => {
  const res = await fetch(`${process.env.URL}/api/cron/close-picks`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log('cron-close-picks', res.status, await res.text());
  return { statusCode: 200 };
});
