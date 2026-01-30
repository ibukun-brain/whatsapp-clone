import { AppSidebar } from "@/components/app-sidebar";
import { PrimarySidebar } from "@/components/shared/primary-sidebar";
import { SecondarySidebar } from "./secondary-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CommunitiesIcon } from "@/components/icons/chats-icon";

const CommunitiesPage = () => {
  return (
    <>
      <AppSidebar>
        <PrimarySidebar />
        <SecondarySidebar />
      </AppSidebar>
      <SidebarInset>
        <div className="flex flex-col items-center justify-center h-screen">
          <div>
            <CommunitiesIcon
              style={{
                width: "64px",
                height: "64px",
                color: "#00000033",
              }}
              isactive={true}
            />
          </div>
          <div className="text-center mt-6">
            <h2 className="text-[32px] font-normal">Create communites</h2>
            <p className="text-muted-foreground max-w-[550px]">
              Bring members together in topic-based groups and easily send them admin annoucements.
            </p>
          </div>
        </div>
      </SidebarInset>
    </>
  );
};

export default CommunitiesPage;
