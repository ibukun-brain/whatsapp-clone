import {
  DownloadIcon,
  WhatsappAltIcon,
  WhatsappLoginIllustration,
  WhatsappSVGAlt,
} from "@/components/icons/chats-icon";
import Login from "@/components/auth/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const IndexPage = () => {
  return (
    <>
      <header>
        <div className="px-10 py-2.5 text-[#25d366] flex gap-1 items-center">
          <WhatsappAltIcon height={30} />
          <WhatsappSVGAlt height={20} className="mt-1" />
        </div>
      </header>
      <section className="mt:18 lg:mt-64 flex flex-col justify-center items-center grow max-w-[872px] shrink-0 mx-auto">
        <div className="py-4 px-12 border border-foreground rounded-2xl flex flex-row items-center justify-between bg-white space-x-6">
          <div>
            <WhatsappLoginIllustration className="w-16" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Download WhatsApp for Windows
            </h2>
            <p>
              Make calls, share your screen and get a faster experience when you
              download the Windows app
            </p>
          </div>
          <div>
            <Button
              asChild
              className="bg-[#25d366] flex items-center font-normal text-base rounded-full border border-foreground py-2.5 px-6! w-40 h-[52px] hover:bg-foreground text-foreground hover:text-white transition-colors duration-500 hover:ease-in-out"
            >
              <Link href="#">
                Download
                <DownloadIcon height={16} />
              </Link>
            </Button>
          </div>
        </div>
        <Login />
      </section>
    </>
  );
};

export default IndexPage;
