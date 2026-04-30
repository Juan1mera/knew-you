import LobbyClient from './LobbyClient';

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main style={{ minHeight: '100vh', padding: '48px 24px 64px', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <LobbyClient sessionId={id} />
      </div>
    </main>
  );
}
