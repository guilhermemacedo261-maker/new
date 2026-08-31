import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PARTICIPANT_COOKIE, readSignedToken } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export default async function PerfilRedirectPage() {
  const participantId = await readSignedToken(cookies().get(PARTICIPANT_COOKIE)?.value);

  if (participantId) {
    redirect(`/player/${participantId}`);
  }

  return (
    <div className="p-8 text-center">
      <p className="text-buteco-white/60 mb-4">Você ainda não selecionou seu nome.</p>
      <Link href="/picks" className="px-6 py-3 rounded-xl bg-buteco-red font-display inline-block">
        Selecionar participante
      </Link>
    </div>
  );
}
