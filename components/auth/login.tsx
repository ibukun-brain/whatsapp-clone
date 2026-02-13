import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ChevronDown, Search, Check, Plus, User as UserIcon } from "lucide-react";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { startAuthentication } from "@simplewebauthn/browser";
import { axiosInstance } from "@/lib/axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/providers/auth-store-provider";
import { useUserStore } from "@/lib/providers/user-store-provider";
import { useShallow } from "zustand/react/shallow";


const en = enLabels as Record<Country, string>;

const Login = ({ signup }: { signup: () => void }) => {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "name" | "profilePicture">("phone");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [country, setCountry] = useState<Country>("NG");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const { setAuth, accessToken } = useAuthStore(
    useShallow((state) => ({
      setAuth: state.setAuth,
      accessToken: state.accessToken,
    }))
  );
  const { user, setUser } = useUserStore(
    useShallow((state) => ({
      user: state.user,
      setUser: state.setUser,
    }))
  );


  const loginMutation = useMutation({
    mutationFn: async () => {
      // 1. Get registration options from server
      const { data: options } = await axiosInstance.post(
        "/auth/webauthn/login_request/",
        {
          phone: phoneNumber,
        },
      );

      // 2. Start terminal registration process
      const authenticationResponse = await startAuthentication({ optionsJSON: JSON.parse(options) });;

      // 3. Send registration response back to server
      const { data } = await axiosInstance.post("/auth/webauthn/login/", {
        attResp: { ...authenticationResponse },
        phone: phoneNumber,
        display_name: displayName,
      });

      return data;
    },
    onSuccess: (data) => {
      console.log("Login: onSuccess", data);
      toast.success("Account created successfully with Passkey!");
      setAuth(data.access);
      setUser(data.user);
      setStep("name");
    },

    onError: (error: any) => {
      console.error("Login error:", error);
      toast.error(
        error.response?.data?.message ||
        "Failed to create account. Please try again.",
      );
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (profileFile) {
        formData.append("profile_pic", profileFile);
        formData.append("display_name", displayName);
      }
      const { data } = await axiosInstance.patch("/users/me/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${accessToken}`
        }
      });

      return data;
    },
    onSuccess: () => {
      router.push("/chats");
    },
    onError: (error: any) => {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile picture. Proceeding to chats...");
    },
  });

  const handleNext = async () => {
    if (step === "phone") {
      if (!phoneNumber) {
        toast.error("Please enter your phone number");
        return;
      }

      setIsCheckingPhone(true);
      setPhoneError("");

      try {
        const { data } = await axiosInstance.get(
          "/users/search_by_intl_phone/",
          {
            params: {
              intl_phone: phoneNumber,
            },
          },
        );

        if (data.exists) {
          // If user exists, try to login
          setStep("name")
        } else {
          setStep("phone")
        }
        loginMutation.mutate();
      } catch (error) {
        setPhoneError((error as any)?.response?.data?.message || "Failed to verify phone number. Please try again.");
      } finally {
        setIsCheckingPhone(false);
      }
    } else if (step === "name") {
      if (!displayName) {
        toast.error("Please enter your display name");
        return;
      }
      // loginMutation.mutate();
      setStep("profilePicture")
    } else if (step === "profilePicture") {
      updateProfileMutation.mutate();
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setProfileFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePic(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const Flag = (flags as Record<Country, React.ElementType>)[country];

  const { data: ipData } = useQuery({
    queryKey: ["ipLocation"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("https://ipapi.co/json/");
      return data;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (ipData?.country_code) {
      setCountry(ipData.country_code as Country);
    }
  }, [ipData]);

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

  const renderHeader = () => {
    switch (step) {
      case "phone":
        return {
          title: "Enter phone number",
          subtitle: "Select a country and enter your phone number"
        };
      case "name":
        return {
          title: "What's your name?",
          subtitle: "Enter a display name for your profile"
        };
      case "profilePicture":
        return {
          title: "Profile Picture",
          subtitle: "Please provide your name and an optional profile photo"
        };
    }
  };

  const headerInfo = renderHeader();

  return (
    <section className="text-center mx-auto px-6 max-w-md">
      <div className="mb-10">
        <h2 className="text-[32px] font-medium text-foreground">
          {headerInfo.title}
        </h2>
        <p className="text-[18px]">
          {headerInfo.subtitle}
        </p>
      </div>

      <div className="flex flex-col space-y-4 mb-10 w-full items-center">
        {step === "phone" && (
          <div className="w-full flex flex-col space-y-4">
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
            <div
              className={`flex items-center rounded-full border h-14 px-6 transition-colors overflow-hidden ${phoneError
                ? "border-red-500 focus-within:border-red-500"
                : "border-foreground focus-within:border-[#21c063]"
                }`}
            >
              <span className="text-base text-foreground border-r border-foreground pr-4 mr-4 shrink-0">
                +{getCountryCallingCode(country)}
              </span>
              <PhoneInput
                country={country}
                value={phoneNumber}
                onChange={(val) => {
                  const newValue = val || "";
                  if (newValue !== phoneNumber) {
                    setPhoneNumber(newValue);
                  }
                  if (phoneError) setPhoneError("");
                }}
                placeholder="phone number"
                className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-[#8696a0] w-full"
              />
            </div>
            {phoneError && (
              <p className="text-red-500 text-sm ml-4 self-start">{phoneError}</p>
            )}
          </div>
        )}

        {step === "name" && (
          <div className="w-full flex items-center rounded-full border border-foreground h-14 px-6 focus-within:border-[#21c063] transition-colors overflow-hidden mb-6">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-[#8696a0] w-full h-full shadow-none focus-visible:ring-0 px-0"
              autoFocus
            />
          </div>
        )}

        {step === "profilePicture" && (
          <div className="relative cursor-pointer group" onClick={() => document.getElementById('profile-upload')?.click()}>
            <Avatar className="w-[100px] h-[100px] border-2 border-transparent group-hover:border-muted transition-colors">
              <AvatarImage src={profilePic ?? user?.profile_pic ?? undefined} className="object-cover" />

              <AvatarFallback className="bg-muted w-full h-full flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-muted-foreground opacity-50" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-1 right-1 bg-[#21c063] rounded-full p-1.5 border-[3px] border-background shadow-sm flex items-center justify-center">
              <Plus className="w-5 h-5 text-white stroke-[3px]" />
            </div>
            <input type="file" id="profile-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-6 justify-center items-center">
        <Button
          onClick={handleNext}
          disabled={loginMutation.isPending}
          className="bg-[#21c063] text-white font-medium rounded-full border-0 hover:bg-[#1da856] cursor-pointer px-10 h-10 transition-colors w-fit min-w-[120px]"
        >
          {loginMutation.isPending || isCheckingPhone
            ? "Loading..."
            : step === "profilePicture"
              ? "Continue to Chat"
              : "Next"}
        </Button>
        {step !== "profilePicture" && (
          <Button
            onClick={signup}
            variant="link"
            className="text-[#00a884] h-auto p-0 font-normal hover:no-underline underline decoration-1 decoration-[#00a884] underline-offset-4"
          >
            Signup with Passkey
          </Button>
        )}
      </div>
    </section>
  );
};

export default Login;
