import { Lock } from "lucide-react";
import { WhatsappAltIcon, WhatsappSVG } from "@/components/icons/chats-icon";

const Loading = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between bg-background p-8 pb-12 select-none z-50">
      {/* Center content */}
      <div className="flex flex-col items-center justify-center flex-1 gap-6">
        <div className="mb-4">
          <WhatsappAltIcon className="w-16 h-16 text-[#00000020]" />
        </div>
        
        <div className="flex flex-col items-center gap-10 w-full max-w-[200px]">
          <WhatsappSVG className="h-[18px] text-[#00000060]" />
          
          {/* Progress bar container */}
          <div className="w-full h-[3px] bg-[#00000010] relative overflow-hidden rounded-full">
            {/* Animated bar */}
            <div className="absolute h-full bg-[#00a884] animate-progress-loading" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-[11px] font-medium uppercase tracking-[0.1em]">
          <Lock className="w-3.5 h-3.5 opacity-80" strokeWidth={2.5} />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default Loading;