"use client";


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { MediaIcon, SettingsIcon } from "./icons/chats-icon";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const pathname = usePathname()
  return (
    <SidebarMenu className="space-y-2 items-center justify-center pb-2">
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={{
            children: "Profile",
            hidden: false,
          }}
          asChild
          className="hover:bg-muted rounded-full w-10.5 h-10.5"
        >
          <Link href="#">
            <MediaIcon
              style={{
                width: "24px",
                height: "24px",
              }}
            />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={{
            children: "Profile",
            hidden: false,
          }}
          className={cn(
            "hover:bg-muted rounded-full w-10.5 h-10.5",
            pathname === "/setting" && "bg-muted",
          )}
        >
          <Link href="/settings">
            <SettingsIcon
              style={{
                width: "24px",
                height: "24px",
              }}
            />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={{
            children: "Profile",
            hidden: false,
          }}
          className={cn(
            "hover:bg-muted rounded-full flex items-center justify-center w-10.5 h-10.5",
            pathname === "/profile" && "bg-muted",
          )}
          // asChild  n 
        >
          <Link href="/profile">
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarImage src="/images/profile.png" alt={user.name} />
              <AvatarFallback className="rounded-full w-7 h-7">
                CN
              </AvatarFallback>
            </Avatar>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
