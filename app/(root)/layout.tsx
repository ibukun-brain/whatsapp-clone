import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthStoreProvider } from "@/lib/providers/auth-store-provider";
import { MediaViewerProvider } from "@/components/chat/MediaViewerContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MediaViewerProvider>
      <SidebarProvider
      // className="w-100"
      // style={
      //   {
      //     "--sidebar-width": "629px",
      //   } as React.CSSProperties
      // }
      >
        {children}
      </SidebarProvider>
    </MediaViewerProvider>
  );
}

