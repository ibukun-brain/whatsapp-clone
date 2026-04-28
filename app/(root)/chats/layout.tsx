import { AppSidebar } from "@/components/app-sidebar";
import { PrimarySidebar } from "@/components/shared/primary-sidebar";
import { SecondarySidebar } from "./secondary-sidebar";
import { GlobalWsProvider } from "@/components/shared/global-ws-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GlobalWsProvider>
      <AppSidebar>
        <PrimarySidebar />
        <SecondarySidebar />
      </AppSidebar>
      {children}
    </GlobalWsProvider>
  );
}
