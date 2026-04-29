import GameClient from "./GameClient";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary-500/20 rounded-full blur-[128px]"></div>
      </div>

      <div className="w-full max-w-4xl mx-auto">
        <GameClient sessionId={id} />
      </div>
    </div>
  );
}
