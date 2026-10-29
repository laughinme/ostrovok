import { createFileRoute } from "@tanstack/react-router";
import { SessionGate } from "@/features/authenticate";
import { ProfilePage } from "@/pages/profile";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Профиль вкуса - О!кно" }] }),
  component: () => (
    <SessionGate role="guest">
      <ProfilePage />
    </SessionGate>
  ),
});
