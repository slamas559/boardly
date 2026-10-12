import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import api from "../../utils/api";
import AuthLayout, { fieldClass, primaryBtn } from "./AuthLayout";
import EmailVerificationRequired from "../EmailVerificationComponents/EmailVerificationRequired";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const clientId = import.meta.env.VITE_APP_GOOGLE_CLIENT_ID;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/login", { email: form.email, password: form.password });
      window.location.href = redirectPath;
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.emailVerified === false) {
        setUnverifiedEmail(err.response.data.email || form.email);
        return;
      }
      setError(err.response?.data?.message || "Sign in failed. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setError("");
    try {
      const decoded = JSON.parse(atob(credentialResponse.credential.split(".")[1]));
      await api.post("/auth/google", {
        credential: credentialResponse.credential,
        context: "login",
        userInfo: { email: decoded.email, name: decoded.name, picture: decoded.picture, googleId: decoded.sub },
      });
      window.location.href = redirectPath;
    } catch (err) {
      setError(err.response?.data?.message || "Google sign in failed. Try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  if (unverifiedEmail) return <EmailVerificationRequired email={unverifiedEmail} />;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to your rooms and sessions."
        footer={<>New to Boardly? <Link to={`/register${redirectPath !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`} className="font-medium text-accent hover:underline">Create an account</Link></>}
      >
        {error && <div role="alert" className="mb-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(""); }} className={fieldClass} placeholder="you@example.com" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link to="/forgot-password" className="text-sm text-muted hover:text-ink">Forgot?</Link>
            </div>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }} className={`${fieldClass} pr-11`} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:text-ink">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign in"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <div className={`flex justify-center ${googleLoading ? "pointer-events-none opacity-60" : ""}`}>
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google sign in was cancelled or failed.")} useOneTap={false} theme="outline" size="large" text="continue_with" shape="rectangular" width="368" />
        </div>
      </AuthLayout>
    </GoogleOAuthProvider>
  );
};

export default Login;
