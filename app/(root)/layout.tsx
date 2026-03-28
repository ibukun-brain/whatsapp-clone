import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AuthStoreProvider } from "@/lib/providers/auth-store-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider
    // className="w-100"
    // style={
    //   {
    //     "--sidebar-width": "629px",
    //   } as React.CSSProperties
    // }
    >
      {children}
      <Toaster />
    </SidebarProvider>
  );
}

