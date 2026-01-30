import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "629px",
        } as React.CSSProperties
      }
    >
      {children}
      <Toaster />
    </SidebarProvider>
  );
}
