import { PlayerProfile } from "./player-profile";

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayerProfile playerId={id} />;
}
