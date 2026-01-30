import { AppSidebar } from "@/components/app-sidebar";
import { PrimarySidebar } from "@/components/shared/primary-sidebar";
import { SecondarySidebar } from "./secondary-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { StatusIcon } from "@/components/icons/chats-icon";

const StatusPage = () => {
  return (
    <>
      <AppSidebar>
        <PrimarySidebar />
        <SecondarySidebar />
      </AppSidebar>
      <SidebarInset>
        <div className="flex flex-col items-center justify-center h-screen">
          <div>
            <StatusIcon
              style={{
                width: "64px",
                height: "64px",
                color: "#00000033",
              }}
              isactive={true}
            />
          </div>
          <div className="text-center mt-6">
            <h2 className="text-[32px] font-normal">Share status updates</h2>
            <p className="text-muted-foreground max-w-[550px]">
              Share photos, videos and text that disapper after 24 hours
            </p>
          </div>
        </div>
      </SidebarInset>
    </>
  );
};

export default StatusPage;
