import {
  PlusCircleIcon,
  CancelIcon,
  ChevronIcon,
  SearchIcon,
  AddChannelIcon,
  ChatsIcon,
  ApplockIcon,
  LogoutIcon,
  HelpIcon,
  KeyIcon,
  KeyboardIcon,
  NotificationBellIcon,
} from "@/components/icons/chats-icon";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarSeparator,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// This is sample data
import { data } from "@/lib/utils";

export const SecondarySidebar = () => {
  return (
    <Sidebar
      collapsible="none"
      className="bg-sidebar-primary hidden flex-1 md:flex "
    >
      <SidebarHeader className="gap-3 px-5 pt-3 pb-0">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground">
            <h2 className="font-semibold text-[22px]">Settings</h2>
          </div>
        </div>
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon
              style={{
                width: "20px",
                height: "20px",
              }}
            />
          </div>
          <div className="absolute right-4 top-5.5 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-all duration-100">
            <button>
              <CancelIcon
                style={{
                  width: "20px",
                  height: "20px",
                }}
              />
            </button>
          </div>
          <SidebarInput
            placeholder="Search settings"
            className="h-10 rounded-full border-0 pl-10 hover:ring-2 hover:ring-muted focus-visible:ring-2 focus-visible:ring-accent-primary placeholder:text-[15px] placeholder:text-muted-foreground bg-background-secondary focus:bg-white"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3">
          <Link
            href="#"
            className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col gap-2 p-3 text-sm leading-tight whitespace-nowrap mt-3"
          >
            <div className="flex w-full gap-3 items-center">
              <div>
                <Avatar className="h-[64px] w-[64px] border">
                  <AvatarImage src="images/profile.png" />
                  <AvatarFallback>MA</AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className="text-secondary-foreground text-base">Brain</p>
                <div className="max-w-[370px]">
                  <p className="truncate whitespace-nowrap text-muted-foreground">
                    Connoisseur For sure ✌️
                  </p>
                </div>
              </div>
            </div>
            <SidebarSeparator />
          </Link>

          <SidebarGroupContent>
            <Link
              href="#"
              className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 px-4 p-3 text-sm leading-tight whitespace-nowrap"
            >
              <div className="flex w-full gap-3 items-center">
                <div>
                  <KeyIcon style={{ width: "24px", height: "24px" }} />
                </div>
                <div>
                  <p className="text-secondary-foreground text-base">Account</p>
                  <div className="max-w-[370px]">
                    <p className="truncate whitespace-nowrap text-muted-foreground">
                      Security notifications, account info
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link
              href="#"
              className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 px-4 p-3 text-sm leading-tight whitespace-nowrap"
            >
              <div className="flex w-full gap-3 items-center">
                <div>
                  <ApplockIcon style={{ width: "24px", height: "24px" }} />
                </div>
                <div>
                  <p className="text-secondary-foreground text-base">Privacy</p>
                  <div className="max-w-[370px]">
                    <p className="truncate whitespace-nowrap text-muted-foreground">
                      Blocked contacts, disappearing messages
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link
              href="#"
              className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 px-4 p-3 text-sm leading-tight whitespace-nowrap"
            >
              <div className="flex w-full gap-3 items-center">
                <div>
                  <ChatsIcon style={{ width: "24px", height: "24px" }} />
                </div>
                <div>
                  <p className="text-secondary-foreground text-base">Chats</p>
                  <div className="max-w-[370px]">
                    <p className="truncate whitespace-nowrap text-muted-foreground">
                      Theme, wallpaper, chat settings
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link
              href="#"
              className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 px-4 p-3 text-sm leading-tight whitespace-nowrap"
            >
              <div className="flex w-full gap-3 items-center">
                <div>
                  <NotificationBellIcon style={{ width: "24px", height: "24px" }} />
                </div>
                <div>
                  <p className="text-secondary-foreground text-base">Notifications</p>
                  <div className="max-w-[370px]">
                    <p className="truncate whitespace-nowrap text-muted-foreground">
                      Messages, groups, sounds
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link
              href="#"
              className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 px-4 p-3 text-sm leading-tight whitespace-nowrap"
            >
              <div className="flex w-full gap-3 items-center">
                <div>
                  <KeyboardIcon style={{ width: "24px", height: "24px" }} />
                </div>
                <div>
                  <p className="text-secondary-foreground text-base">
                    Keyboard shortcuts
                  </p>
                  <div className="max-w-[370px]">
                    <p className="truncate whitespace-nowrap text-muted-foreground">
                      Quick actions
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link
              href="#"
              className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 px-4 p-3 text-sm leading-tight whitespace-nowrap"
            >
              <div className="flex w-full gap-3 items-center">
                <div>
                  <HelpIcon style={{ width: "24px", height: "24px" }} />
                </div>
                <div>
                  <p className="text-secondary-foreground text-base">
                    Help and feedback
                  </p>
                  <div className="max-w-[370px]">
                    <p className="truncate whitespace-nowrap text-muted-foreground">
                      Help centre, contact us, privacy policy
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link
              href="#"
              className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 px-4 py-5 text-sm leading-tight whitespace-nowrap"
            >
              <div className="flex w-full gap-3 items-center text-destructive">
                <div>
                  <LogoutIcon style={{ width: "24px", height: "24px" }} />
                </div>
                <div>
                  <p className="text-base">Log out</p>
                </div>
              </div>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
