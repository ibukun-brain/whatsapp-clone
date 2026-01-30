import { PlusCircleIcon, CommunitiesIcon } from "@/components/icons/chats-icon";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const SecondarySidebar = () => {
  return (
    <Sidebar
      collapsible="none"
      className="bg-sidebar-primary hidden flex-1 md:flex "
    >
      <SidebarHeader className="gap-3 px-5 pt-3 pb-0">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground">
            <h2 className="font-semibold text-[22px]">Communities</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-10 h-10 rounded-full hover:bg-muted/30 hover:cursor-pointer focus-visible:ring-0 focus-visible:ring-offset-0"
                      >
                        <div>
                          <PlusCircleIcon
                            style={{
                              width: "24px",
                              height: "24px",
                              color: "#000",
                            }}
                          />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create new community</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenu>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            <Link
              href="#"
              className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 p-3 text-sm leading-tight whitespace-nowrap last:border-b-0"
            >
              <div className="flex w-full gap-3 items-center">
                <div className="relative">
                  <div className="w-[48px] h-[48px] rounded-xl bg-accent-primary flex items-center justify-center">
                    <CommunitiesIcon
                      style={{
                        width: "28px",
                        height: "28px",
                        color: "#fff",
                      }}
                      isactive={true}
                    />
                  </div>
                </div>
                <div className="leading-3.5">
                  <p className="text-secondary-foreground text-base">
                    New community
                  </p>
                  <div></div>
                </div>
              </div>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
