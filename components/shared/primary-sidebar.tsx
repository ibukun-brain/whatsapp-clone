"use client";

import React from "react";

import { NavUser } from "@/components/nav-user";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

import Link from "next/link";
import { cn } from "@/lib/utils";

import { Badge } from "../ui/badge";
import { usePathname } from "next/navigation";

import { data } from "@/lib/utils";
import { db } from "@/lib/indexdb";
import { useLiveQuery } from "dexie-react-hooks";
import { User } from "@/types";

export const PrimarySidebar = () => {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const currentUser = useLiveQuery(
    async () => await db.user.toCollection().first()
  );


  return (
    <Sidebar
      collapsible="none"
      className="w-[calc(var(--sidebar-width-icon)+17px)]! border-r"
    >
      <SidebarContent className="py-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="flex justify-between items-center">
              {data.navMain.map((item, index) => (
                <React.Fragment key={item.title}>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setOpen(true);
                      }}
                      className={cn(
                        "hover:bg-muted px-2.5 md:px-2 w-10 h-10 rounded-full",
                        pathname === item.url && "bg-muted",
                        // activeItem && "active:bg-muted",
                      )}
                      asChild
                    >
                      <Link href={item.url}>
                        <div>
                          {item.title !== "Meta AI" && (
                            <Badge
                              variant="default"
                              className={cn(
                                "bg-accent-primary absolute right-0 bottom-6.5 border-background border-2 p-1 text-xs text-white",
                                item.title == "Chats" && currentUser?.unread_messages && currentUser.unread_messages > 0 &&
                                "w-8 h-5 bottom-6 left-5 p-2.5 pl-3",
                              )}
                            >
                              {item.title == "Chats" && currentUser?.unread_messages && currentUser.unread_messages > 0 && (
                                <div className="font-bold">{`${currentUser?.unread_messages}`}</div>
                              )}
                            </Badge>
                          )}
                          <item.icon
                            style={
                              item.title === "Communities"
                                ? {
                                  width: "26px",
                                  height: "26px",
                                }
                                : {
                                  width: "24px",
                                  height: "24px",
                                }
                            }
                            isactive={pathname === item.url}
                          />
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>{" "}
                  {index === 3 && (
                    <div className="w-11 mr-4 mt-2 mb-1">
                      <SidebarSeparator className="" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser as User} />
      </SidebarFooter>
    </Sidebar>
  );
};
