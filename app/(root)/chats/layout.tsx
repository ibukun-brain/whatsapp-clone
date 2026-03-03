import { AppSidebar } from "@/components/app-sidebar";
import { PrimarySidebar } from "@/components/shared/primary-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { SecondarySidebar } from "./secondary-sidebar";
import { GlobalWsProvider } from "@/components/shared/global-ws-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GlobalWsProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "629px",
          } as React.CSSProperties
        }
      >
        <AppSidebar>
          <PrimarySidebar />
          <SecondarySidebar />
        </AppSidebar>
        {children}
        <Toaster />
      </SidebarProvider>
    </GlobalWsProvider>
  );
}
