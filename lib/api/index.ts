
import { axiosInstance } from "../axios";
import { type Country } from "react-phone-number-input";

export const api = {
  auth: {
    signupRequest: async (data: {
      display_name: string;
      phone: string;
      country: Country;
    }) => {
      const response = await axiosInstance.post(
        "/auth/webauthn/signup_request/",
        data
      );
      return response.data;
    },
    signup: async (data: { phone: string; attResp: any }) => {
      const response = await axiosInstance.post("/auth/webauthn/signup/", data);
      return response.data;
    },
    loginRequest: async (data: { phone: string }) => {
      const response = await axiosInstance.post(
        "/auth/webauthn/login_request/",
        data
      );
      return response.data;
    },
    login: async (data: { phone: string; attResp: any }) => {
      const response = await axiosInstance.post("/auth/webauthn/login/", data);
      return response.data;
    },
  },
  user: {
    getMe: async () => {
      const response = await axiosInstance.get("/users/me/");
      return response.data;
    },
    updateProfile: async (data: FormData) => {
      const response = await axiosInstance.patch("/users/me/", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    searchIntl: async (intl_phone: string) => {
      const response = await axiosInstance.get(
        "/users/search_by_intl_phone/",
        {
          params: {
            intl_phone,
          },
        }
      );
      return response.data;
    },
  },
};
