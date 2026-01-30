"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import Link from "next/link";
import { ChevronDown, Search, Check } from "lucide-react";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import {
  getCountries,
  getCountryCallingCode,
  type Country,
} from "react-phone-number-input";
import PhoneInput from "react-phone-number-input/input";
import enLabels from "react-phone-number-input/locale/en";
import flags from "react-phone-number-input/flags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { startRegistration } from "@simplewebauthn/browser";
import { axiosInstance } from "@/lib/axios";
import { toast } from "sonner";

const en = enLabels as Record<Country, string>;

const Signup = () => {
  const [step, setStep] = useState<"phone" | "name">("phone");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [country, setCountry] = useState<Country>("NG");
  const [searchQuery, setSearchQuery] = useState("");

  const signupMutation = useMutation({
    mutationFn: async () => {
      // 1. Get registration options from server
      const { data: options } = await axiosInstance.post(
        "/auth/webauthn/signup_request/",
        {
          display_name: displayName,
          phone: phoneNumber,
        },
      );

      console.log(options);

      // 2. Start terminal registration process
      const registrationResponse = await startRegistration(JSON.parse(options));

      // 3. Send registration response back to server
      const { data } = await axiosInstance.post("/auth/webauthn/signup/", {
        phone: phoneNumber,
        attResp: { ...registrationResponse },
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Account created successfully with Passkey!");
    },
    onError: (error: any) => {
      console.error("Signup error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to create account. Please try again.",
      );
    },
  });

  const handleNext = () => {
    if (step === "phone") {
      if (!phoneNumber) {
        toast.error("Please enter your phone number");
        return;
      }
      setStep("name");
    } else {
      if (!displayName) {
        toast.error("Please enter your display name");
        return;
      }
      signupMutation.mutate();
    }
  };

  const Flag = (flags as Record<Country, React.ElementType>)[country];

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.country_code) {
          setCountry(data.country_code as Country);
        }
      })
      .catch((error) => console.error("Error fetching country:", error));
  }, []);

  const filteredCountries = getCountries()
    .slice(0, 50)
    .filter((c) => {
      const countryName = en[c].toLowerCase();
      const query = searchQuery.toLowerCase();
      return (
        countryName.includes(query) ||
        getCountryCallingCode(c).includes(query) ||
        c.toLowerCase().includes(query)
      );
    });

  return (
    <section className="text-center mx-auto px-6 max-w-md">
      <div className="mb-10">
        <h2 className="text-[32px] font-medium text-foreground">
          {step === "phone" ? "Enter phone number" : "What's your name?"}
        </h2>
        <p className="text-[18px]">
          {step === "phone"
            ? "Select a country and enter your phone number"
            : "Enter a display name for your profile"}
        </p>
      </div>

      <div className="flex flex-col space-y-4 mb-10">
        {step === "phone" ? (
          <>
            {/* Country Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative flex items-center rounded-full border border-foreground h-14 px-6 focus-within:border-[#21c063] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-7 shrink-0">
                      <Flag
                        title={en[country]}
                        className="w-full h-auto shadow-sm"
                      />
                    </div>
                    <span className="flex-1 text-left text-base font-normal text-foreground">
                      {en[country]}
                    </span>
                    <ChevronDown className="w-5 h-5 text-[#8696a0] group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[300px] w-(--radix-dropdown-menu-trigger-width) p-0 overflow-hidden bg-popover rounded-xl shadow-lg border border-border">
                <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search country"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-muted/50 border-none h-9 focus-visible:ring-1"
                      autoFocus
                    />
                  </div>
                </div>
                <ScrollArea className="h-[200px]">
                  {filteredCountries.map((c) => {
                    const ItemFlag = (
                      flags as Record<Country, React.ElementType>
                    )[c];
                    const isSelected = country === c;
                    return (
                      <DropdownMenuItem
                        key={c}
                        onClick={() => {
                          setCountry(c);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted focus:bg-muted"
                      >
                        <div className="w-6 shrink-0 text-2xl leading-none">
                          <ItemFlag
                            title={en[c]}
                            className="w-full h-auto shadow-sm rounded-[2px] overflow-hidden"
                          />
                        </div>
                        <span className="flex-1 text-left text-sm font-normal text-foreground truncate">
                          {en[c]}
                        </span>
                        <span className="text-sm text-muted-foreground font-normal tabular-nums">
                          +{getCountryCallingCode(c)}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-[#21c063] ml-2" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                  {filteredCountries.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No country found
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Phone Input */}
            <div className="flex items-center rounded-full border border-foreground h-14 px-6 focus-within:border-[#21c063] transition-colors overflow-hidden">
              <span className="text-base text-foreground border-r border-foreground pr-4 mr-4 shrink-0">
                +{getCountryCallingCode(country)}
              </span>
              <PhoneInput
                country={country}
                value={phoneNumber}
                onChange={(val) => setPhoneNumber(val || "")}
                placeholder="phone number"
                className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-[#8696a0] w-full"
              />
            </div>
          </>
        ) : (
          <div className="flex items-center rounded-full border border-foreground h-14 px-6 focus-within:border-[#21c063] transition-colors overflow-hidden mb-6">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-[#8696a0] w-full h-full shadow-none focus-visible:ring-0 px-0"
              autoFocus
            />
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-6 justify-center items-center">
        <Button
          onClick={handleNext}
          disabled={signupMutation.isPending}
          className="bg-[#21c063] text-white font-medium rounded-full border-0 hover:bg-[#1da856] cursor-pointer px-10 h-10 transition-colors w-fit min-w-[120px]"
        >
          {signupMutation.isPending
            ? "Creating..."
            : step === "phone"
              ? "Next"
              : "Create Account"}
        </Button>
        <Button
          asChild
          variant="link"
          className="text-[#00a884] h-auto p-0 font-normal hover:no-underline"
        >
          <Link
            href="#"
            className="underline decoration-1 decoration-[#00a884] underline-offset-4"
          >
            Login in with Passkey
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Signup;
