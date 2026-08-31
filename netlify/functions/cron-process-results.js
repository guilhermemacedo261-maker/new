const { schedule } = require('@netlify/functions');

// Todo dia 09:00 (America/Sao_Paulo) = 12:00 UTC. Netlify Scheduled Functions usam UTC.
exports.handler = schedule('0 12 * * *', async () => {
  const res = await fetch(`${process.env.URL}/api/cron/process-results`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log('cron-process-results', res.status, await res.text());
  return { statusCode: 200 };
});
