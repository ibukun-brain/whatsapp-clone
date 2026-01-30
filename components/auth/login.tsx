"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, MoreVertical } from "lucide-react";
import { SettingsAltIcon, WhatsappAltIcon } from "../icons/chats-icon";
import { Button } from "../ui/button";

const Login = ({ login }: { login: () => void }) => {
  return (
    <>
      <div className="flex-1">
        <h3 className="font-semibold text-[32px] mb-8">Steps to log in</h3>
        <div className="space-y-0 relative">
          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-[26px] h-[26px] rounded-full border border-foreground flex items-center justify-center text-sm">
                1
              </div>
              <div className="w-px h-5 bg-foreground"></div>
            </div>
            <div className="text-[18px]">
              <span>Open Whatsapp</span>
              <span className="inline-flex bg-[#25d366] text-white p-1 rounded-sm mx-1">
                <WhatsappAltIcon className="w-4 h-4" />
              </span>
              <span>on your phone</span>
            </div>
          </div>

          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-[26px] h-[26px] rounded-full border border-foreground flex items-center justify-center text-sm">
                2
              </div>
              <div className="w-px h-5 bg-foreground"></div>
            </div>
            <div className="text-[18px] whitespace-nowrap">
              <span>On Android tap Menu</span>
              <span className="inline-flex items-center justify-center border border-foreground p-1 rounded-md mx-1">
                <MoreVertical className="w-4 h-4" />
              </span>{" "}
              · On iPhone tap Settings{" "}
              <span className="inline-flex items-center justify-center border border-foreground p-1 rounded-md mx-1">
                <SettingsAltIcon className="w-[18px] h-[18px]" />
              </span>
            </div>
          </div>

          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-[26px] h-[26px] rounded-full border border-foreground flex items-center justify-center text-sm">
                3
              </div>
              <div className="w-px h-5 bg-foreground"></div>
            </div>
            <div className="text-[18px]">
              <span>Tap Linked devices, then Link device</span>
            </div>
          </div>

          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-[26px] h-[26px] rounded-full border border-foreground flex items-center justify-center text-sm">
                4
              </div>
            </div>
            <div className="text-[18px]">
              <span>Scan the QR code to confirm</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#25d366] rounded flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="4"
                className="w-3.5 h-3.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-base">Stay logged in on this browser</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center ">
        <div className="p-4 bg-white mb-8">
          <Image
            src="/images/qrcode.png"
            alt="WhatsApp QR Code"
            width={228}
            height={228}
          />
        </div>
        <Button onClick={login}>
          <Link
            href="#"
            className="text-base font-normal text-foreground flex items-center gap-1 underline decoration-[#25d366] underline-offset-4 decoration-2"
          >
            Log in with passkey
            <ChevronRight className="w-5 h-5 translate-y-px" />
          </Link>
        </Button>
      </div>
    </>
  );
};

export default Login;
