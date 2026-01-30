"use client";
import React from "react";

import {
  PlusCircleIcon,
  CancelIcon,
  ChevronIcon,
  SearchIcon,
  AddChannelIcon,
} from "@/components/icons/chats-icon";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
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
            <h2 className="font-semibold text-[22px]">Channels</h2>
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
                    <p>Menu</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="start" className="text-[15px]">
                <DropdownMenuItem
                  // variant="default"
                  className="flex flex-row items-center px-3 rounded-lg"
                >
                  <AddChannelIcon style={{ width: "20px", height: "20px" }} />
                  <span>Create channel</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-row items-center px-3 rounded-lg">
                  <SearchIcon style={{ width: "24px", height: "24px" }} />
                  <span>Find channels</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            placeholder="Search"
            className="h-10 rounded-full border-0 pl-10 hover:ring-2 hover:ring-muted focus-visible:ring-2 focus-visible:ring-accent-primary placeholder:text-[15px] placeholder:text-muted-foreground bg-background-secondary focus:bg-white"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            {data.channels.map((channel, index) => (
              <Link
                href="#"
                key={index}
                className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 p-3 text-sm leading-tight whitespace-nowrap last:border-b-0"
              >
                <div className="flex w-full gap-3">
                  <div>
                    <Avatar className="h-[49px] w-[49px] border">
                      <AvatarImage src={channel.avatar} />
                      <AvatarFallback>MA</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <p className="text-secondary-foreground text-base">
                      {channel.name}
                    </p>
                    <div className="max-w-[370px]">
                      <p className="truncate whitespace-nowrap text-muted-foreground">
                        {channel.teaser}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto text-xs">
                    <p>{channel.date}</p>
                    <div className="flex absolute right-6 mt-2 space-x-2">
                      <div>
                        {channel.unreadStatusCount > 0 && (
                          <div className="bg-accent-primary text-white rounded-full p-1 w-5.5 h-5.5 flex items-center justify-center text-xs">
                            {channel.unreadStatusCount}
                          </div>
                        )}
                        <ChevronIcon className="opacity-0 transition-opacity ease-in-out duration-200 group-hover:opacity-100" />
                      </div>
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
