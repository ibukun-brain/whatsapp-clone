import { AppSidebar } from "@/components/app-sidebar";
import { PrimarySidebar } from "@/components/shared/primary-sidebar";
import { SecondarySidebar } from "./secondary-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ChannelsIcon } from "@/components/icons/chats-icon";

const ChannelsPage = () => {
  return (
    <>
      <AppSidebar>
        <PrimarySidebar />
        <SecondarySidebar />
      </AppSidebar>
      <SidebarInset>
        <div className="flex flex-col items-center justify-center h-screen">
          <div>
            <ChannelsIcon
              style={{
                width: "64px",
                height: "64px",
                color: "#00000033",
              }}
              isactive={true}
            />
          </div>
          <div className="text-center mt-6">
            <h2 className="text-[32px] font-normal">Discover Channels</h2>
            <p className="text-muted-foreground max-w-[550px]">
              Entertainment, sports, news, lifestyle, people and more. Follow the channels that interest you 
            </p>
          </div>
        </div>
      </SidebarInset>
    </>
  );
};

export default ChannelsPage;
