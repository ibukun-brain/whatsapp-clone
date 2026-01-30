import { AppSidebar } from "@/components/app-sidebar";
import { PrimarySidebar } from "@/components/shared/primary-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { SettingsIcon } from "@/components/icons/chats-icon";
import { SecondarySidebar } from "./secondary-sidebar";

const SettingsPage = () => {
  return (
    <>
      <AppSidebar>
        <PrimarySidebar />
        <SecondarySidebar />
      </AppSidebar>
      <SidebarInset>
        <div className="flex flex-col items-center justify-center h-screen">
          <SettingsIcon style={{ width: "64px", height: "64px", color: "#00000033" }} isactive={true} />
          <div className="text-center mt-6">
            <h2 className="text-[32px] font-normal">Settings</h2>
          </div>
        </div>
      </SidebarInset>
    </>
  );
};

export default SettingsPage;
