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
        className="lg:[--sidebar-width-dynamic:429px] xl:[--sidebar-width-dynamic:629px]"
        style={
          {
            "--sidebar-width": "var(--sidebar-width-dynamic, 429px)",
          } as React.CSSProperties
        }
      >
        {children}
      </SidebarProvider>
    </MediaViewerProvider>
  );
}

