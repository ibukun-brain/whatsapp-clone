import { AppSidebar } from "@/components/app-sidebar";
import { Metadata } from "next";

import { SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WhatsAppIllusration } from "@/components/icons/chats-icon";
import { SecondarySidebar } from "@/app/(root)/chats/secondary-sidebar";
import { PrimarySidebar } from "@/components/shared/primary-sidebar";

export const metadata: Metadata = {
  title: "Chats",
};

export default function Page() {
  return (
    <>
      <AppSidebar>
        <PrimarySidebar />
        <SecondarySidebar />
      </AppSidebar>

      <SidebarInset>
        <div className="flex flex-col items-center justify-center h-screen">
          <div>
            <WhatsAppIllusration />
          </div>
          <div className="text-center mt-6">
            <h2 className="text-[32px] font-normal">
              Download WhatsApp for Windows
            </h2>
            <p className="text-muted-foreground max-w-[550px]">
              Make calls, share your screen and get a faster experience when you
              download the Windows app.
            </p>
          </div>
          <div className="mt-8">
            <Button
              asChild
              variant="ghost"
              className="bg-accent-primary text-white rounded-full hover:text-white font-bold px-6"
            >
              <Link href="#">Download</Link>
            </Button>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
