"use client";

import { toast } from "sonner";
import {
  Copy,
  Camera,
  Image as ImageIcon,
  FolderOpen,
  Trash2,
  Phone,
  Eye,
  Pencil,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SecondarySidebar = () => {
  const phoneNumber = "+234 902 160 1984";

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneNumber);
    toast.success("Phone number copied", {
      position: "bottom-left",
      style: {
        width: "200px",
      },
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-primary py-6">
      <div className="px-7 mb-8">
        <h1 className="text-xl font-medium">Profile</h1>
      </div>

      <div className="flex flex-col items-center mb-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative group cursor-pointer overflow-hidden rounded-full h-32 w-32">
              <Avatar className="h-full w-full">
                <AvatarImage
                  src="/images/profile.png"
                  alt="Profile"
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl">B</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-center p-4">
                <ImageIcon className="mb-1" size={24} />
                <span className="text-[11px] uppercase font-bold leading-tight max-w-[80px]">
                  Change profile photo
                </span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem className="gap-3 py-3 cursor-pointer">
              <Eye size={18} className="text-muted-foreground" />
              <span>View photo</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 py-3 cursor-pointer">
              <Camera size={18} className="text-muted-foreground" />
              <span>Take photo</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 py-3 cursor-pointer">
              <FolderOpen size={18} className="text-muted-foreground" />
              <span>Upload photo</span>
            </DropdownMenuItem>
            <div className="h-px bg-border my-1" />
            <DropdownMenuItem className="gap-3 py-3 text-destructive focus:text-destructive cursor-pointer font-medium">
              <Trash2 size={18} />
              <span>Remove photo</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-9 px-7 overflow-y-auto">
        {/* Name Section */}
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">Name</span>
          <div className="flex items-center justify-between">
            <span className="text-base text-foreground">Brain🧠💯</span>
            <button className="p-1 hover:bg-muted rounded-md transition-colors">
              <Pencil size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* About Section */}
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">About</span>
          <div className="flex items-center justify-between">
            <span className="text-base text-foreground">
              Connoisseur For sure ✌️
            </span>
            <button className="p-1 hover:bg-muted rounded-md transition-colors">
              <Pencil size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Phone Section */}
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">Phone</span>
          <div className="flex items-center gap-4 py-1">
            <Phone size={18} className="text-muted-foreground" />
            <span className="text-base text-foreground flex-1">
              {phoneNumber}
            </span>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              title="Copy phone number"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecondarySidebar;
