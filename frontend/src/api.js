import axios from "axios";
import supabase from "./supabaseClient";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

// Automatically attach user_id to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (uid) {
    config.params = { ...config.params, user_id: uid };
  }
  return config;
});

export default api;
