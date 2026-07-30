import { PanelShell } from "@/components/dashboard/PanelShell";

export const dynamic = "force-dynamic";

export default function PanelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PanelShell>{children}</PanelShell>;
}
