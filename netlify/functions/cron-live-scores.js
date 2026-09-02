const { schedule } = require('@netlify/functions');

// Roda a cada 5 minutos, sempre - mas /api/cron/live-scores so busca
// placar novo de verdade quando e um horario provavel de jogo (quinta,
// domingo, segunda). Fora disso a resposta e imediata (skipped:true),
// entao o custo em credito da Netlify nos outros dias/horas e desprezivel.
exports.handler = schedule('*/5 * * * *', async () => {
  const res = await fetch(`${process.env.URL}/api/cron/live-scores`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log('cron-live-scores', res.status, await res.text());
  return { statusCode: 200 };
});
