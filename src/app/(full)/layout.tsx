import { AppShell } from "@/components/shell/app-shell";

export default function FullscreenLayout({ children }: { children: React.ReactNode }) {
  return <AppShell fullscreen>{children}</AppShell>;
}
