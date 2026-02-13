"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Login from "@/components/auth/login";
import { useState } from "react";
import Signup from "./signup";
import AuthFlow from "./flow";


const Authentication = () => {
  const [activeStep, setActiveStep] = useState<"login" | "signup" | null>(null);

  const handleSignup = () => {
    setActiveStep("signup");
  };

  const handleLogin = () => {
    setActiveStep("login");
  };
  return (

    <>
      <div className="py-12 px-12 mt-3 border border-foreground rounded-2xl flex flex-row items-top justify-between bg-white space-x-12 w-[872px]">
        {activeStep === "login" ? <Login signup={handleSignup} /> : activeStep === "signup" ? <Signup login={handleLogin} /> : <AuthFlow login={handleLogin} />}
      </div>
      {activeStep !== "signup" && (
        <div className="mt-8">
          <p>
            <span className="text-[18px] font-medium">
              Don&apos;t have a Whatsapp account?
            </span>
            <Button
              onClick={handleSignup}
              asChild
              variant="link"
              className="text-foreground font-normal text-base"
            >
              <Link
                href="#"
                className="underline decoration-[#25d366] decoration-2"
              >
                Get started
              </Link>
            </Button>
          </p>
        </div>
      )}
    </>
  );

};

export default Authentication;

