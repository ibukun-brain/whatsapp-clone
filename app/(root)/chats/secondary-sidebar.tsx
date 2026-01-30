"use client";
import React from "react";

import {
  ApplockIcon,
  CancelIcon,
  ChatsIcon,
  CheckBoxIcon,
  ChevronIcon,
  CreateGroupIcon,
  LogoutIcon,
  MenuIcon,
  NewChatIcon,
  PinIcon,
  SearchIcon,
  StarIcon,
  WhatsappSVG,
} from "@/components/icons/chats-icon";
import { ContactSheet } from "@/components/contact-sheet";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "../../../components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar";
// This is sample data
import { data } from "@/lib/utils";
import { chatCategories } from "@/lib/utils";

export const SecondarySidebar = () => {
  const [contactSheetOpen, setContactSheetOpen] = React.useState(false);

  return (
    <Sidebar
      collapsible="none"
      className="bg-sidebar-primary hidden flex-1 md:flex "
    >
      <SidebarHeader className="gap-3 px-5 pt-3 pb-0">
        <div className="flex w-full items-center justify-between">
          <div className="text-accent-primary">
            <WhatsappSVG className="h-7 w-26" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-10 h-10 rounded-full hover:bg-muted/30  hover:cursor-pointer"
                    onClick={() => setContactSheetOpen(true)}
                  >
                    <div>
                      <NewChatIcon
                        style={{
                          width: "24px",
                          height: "24px",
                          color: "#000",
                        }}
                      />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-white border-none">
                  <p>
                    New chat
                    <span className="text-gray-400"> Ctrl+Alt+N</span>
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ContactSheet
              open={contactSheetOpen}
              onOpenChange={setContactSheetOpen}
            />
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
                    <p>Menu</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent
                align="start"
                className="text-secondary-foreground cursor-pointer w-[180px]"
              >
                <DropdownMenuItem className="px-3 rounded-xl]">
                  <CreateGroupIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>New group</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="px-3 rounded-xl">
                  <StarIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Starred messages</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="px-3 rounded-xl">
                  <CheckBoxIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Select chats</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="px-3 rounded-xl">
                  <ChatsIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Mark all as read</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="px-3 rounded-xl">
                  <ApplockIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>App lock</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="px-3 rounded-xl"
                >
                  <LogoutIcon
                    className="text-secondary-foreground"
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Log out</span>
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
            placeholder="Ask Meta AI or Search"
            className="h-10 rounded-full border-0 pl-10 hover:ring-2 hover:ring-muted focus-visible:ring-2 focus-visible:ring-accent-primary placeholder:text-[15px] placeholder:text-muted-foreground bg-background-secondary focus:bg-white"
          />
        </div>
        <div className="chat-category flex flex-row space-x-2">
          {chatCategories.map((category) => (
            <div
              className={cn(
                "rounded-full border py-1 px-3 text-sm font-semibold text-muted-foreground hover:bg-background-secondary cursor-pointer",
                category.isActive &&
                  "text-accent-foreground bg-accent-secondary hover:bg-accent-secondary/80",
              )}
              key={category.title}
            >
              {category.title}
            </div>
          ))}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            {data.mails.map((mail, index) => (
              <Link
                href="#"
                key={index}
                className="group hover:bg-background-secondary hover:text-sidebar-accent-foreground hover:rounded-lg flex flex-col items-start gap-2 p-3 text-sm leading-tight whitespace-nowrap last:border-b-0"
              >
                <div className="flex w-full gap-3">
                  <div>
                    <Avatar className="h-[49px] w-[49px] border">
                      <AvatarImage src="/avatars/me.jpg" />
                      <AvatarFallback>MA</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <p className="text-secondary-foreground text-base">
                      {mail.name}
                    </p>
                    <div className="max-w-[370px]">
                      <p className="truncate whitespace-nowrap">
                        {mail.teaser}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto text-xs">
                    <p>{mail.date}</p>
                    <div className="flex absolute right-6 mt-2 space-x-2">
                      {mail.isPinned && <PinIcon />}
                      <div>
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
