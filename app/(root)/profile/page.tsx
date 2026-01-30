import { AppSidebar } from "@/components/app-sidebar";
import { PrimarySidebar } from "@/components/shared/primary-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import SecondarySidebar from "./secondary-sidebar";
import { ProfileDefaultIcon } from "@/components/icons/chats-icon";

const ProfilePage = () => {
  return (
    <>
      <AppSidebar>
        <PrimarySidebar />
        <SecondarySidebar />
      </AppSidebar>
      <SidebarInset>
        <div className="flex flex-col items-center justify-center h-screen">
            <ProfileDefaultIcon className="w-16 h-16 text-[#00000033]" />
          <div className="text-center mt-6">
            <h2 className="text-[32px] font-normal">Profile</h2>
          </div>
        </div>
      </SidebarInset>
    </>
  );
};

export default ProfilePage;
