import {
  PlusCircleIcon,
  ApplockIcon,
  MediaIcon,
  MenuIcon,
  PenIcon,
} from "@/components/icons/chats-icon";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { data } from "@/lib/utils";
import { StatusAvatar } from "@/components/shared/status-avatar";

export const SecondarySidebar = () => {
  return (
    <Sidebar
      collapsible="none"
      className="bg-sidebar-primary hidden flex-1 md:flex "
    >
      <SidebarHeader className="gap-3 px-5 pt-3 pb-0">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground">
            <h2 className="font-semibold text-[22px]">Status</h2>
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
                    <p>Add Status</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent
                align="start"
                className="text-secondary-foreground"
              >
                <DropdownMenuItem
                  // variant="default"
                  className="flex flex-row items-center px-3 rounded-lg"
                >
                  <MediaIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Photo & videos</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-row items-center px-3 rounded-lg">
                  <PenIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Text</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                          <MenuIcon
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
                    <p>Status Menu</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent
                align="start"
                className="text-secondary-foreground w-[180px]"
              >
                <DropdownMenuItem
                  // variant="default"
                  className="flex flex-row items-center hover:bg-background-secondary px-3 rounded-lg"
                >
                  <ApplockIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Status Privacy</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
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
              <div className="flex w-full gap-3">
                <div className="relative">
                  <StatusAvatar
                    src="/images/profile.png"
                    fallback="MA"
                    className="w-[48px] h-[48px]"
                  />
                  <div className="absolute bg-accent-primary rounded-full text-white w-5 h-5 flex items-center justify-center border-white border-2 right-0 bottom-0">
                    <span className="text-sm font-bold text-secondary">+</span>
                  </div>
                </div>
                <div className="leading-3.5">
                  <p className="text-secondary-foreground text-base">
                    My status
                  </p>
                  <div>
                    <p className="text-muted-foreground text-[13px]">
                      Click to add status update
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <div className="mt-8 mb-4 px-4">
              <h2 className="text-sm font-bold text-muted-foreground">
                Recent
              </h2>
            </div>
            {data.mails.map((mail, index) => (
              <Link
                href="#"
                key={index}
                className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 p-3 text-sm leading-tight whitespace-nowrap last:border-b-0"
              >
                <div className="flex w-full gap-3">
                  <div>
                    <StatusAvatar
                      src={mail.avatar}
                      fallback={mail.name.substring(0, 2).toUpperCase()}
                      unreadCount={mail.unreadStatusCount}
                      className="w-[52px] h-[52px]"
                    />
                  </div>
                  <div className="leading-3.5">
                    <p className="text-secondary-foreground text-base">
                      {mail.name}
                    </p>
                    <div>
                      <p className="text-muted-foreground">Today at 1:07 PM</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
