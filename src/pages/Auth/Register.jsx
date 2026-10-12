import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, Loader2, Presentation, Users } from "lucide-react";
import api from "../../utils/api";
import AuthLayout, { fieldClass, primaryBtn } from "./AuthLayout";
import EmailVerificationRequired from "../EmailVerificationComponents/EmailVerificationRequired";

const ROLES = [
  { id: "student", label: "I want to join sessions", hint: "Listener", icon: Users },
  { id: "tutor", label: "I want to host sessions", hint: "Host", icon: Presentation },
];

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", bio: "", role: "student" });
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  const clientId = import.meta.env.VITE_APP_GOOGLE_CLIENT_ID;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = new FormData();
      ["name", "email", "password", "bio", "role"].forEach((k) => data.append(k, form[k]));
      if (avatar) data.append("avatar", avatar);
      const res = await api.post("/auth/register", data);
      if (res.data.verificationSent) {
        setRegistrationSuccess(true);
        setUserEmail(res.data.email);
      } else {
        navigate(form.role === "tutor" ? "/bank-setup" : "/dashboard");
        window.location.reload();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not create your account. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setError("");
    try {
      const decoded = JSON.parse(atob(credentialResponse.credential.split(".")[1]));
      const res = await api.post("/auth/google", {
        credential: credentialResponse.credential,
        context: "register",
        role: form.role,
        userInfo: { email: decoded.email, name: decoded.name, picture: decoded.picture, googleId: decoded.sub },
      });
      navigate(res.data.user.role === "tutor" ? "/bank-setup" : "/lobby");
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Google sign up failed. Try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  if (registrationSuccess) return <EmailVerificationRequired email={userEmail} onResendSuccess={() => {}} />;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthLayout
        title="Create your account"
        subtitle="Free to join. Host free or paid sessions whenever you like."
        footer={<>Already have an account? <Link to="/login" className="font-medium text-accent hover:underline">Sign in</Link></>}
      >
        {error && <div role="alert" className="mb-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</div>}

        <fieldset className="mb-5">
          <legend className="mb-1.5 text-sm font-medium">How will you use Boardly?</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(({ id, label, hint, icon: Icon }) => (
              <label key={id} className={`flex cursor-pointer flex-col gap-1.5 rounded-md border p-3 text-sm ${form.role === id ? "border-ink bg-white outline outline-1 outline-ink" : "border-line-strong bg-white hover:border-gray-400"}`}>
                <input type="radio" name="role" value={id} checked={form.role === id} onChange={set("role")} className="sr-only" />
                <Icon size={17} strokeWidth={1.7} />
                <span className="font-medium leading-snug">{hint}</span>
                <span className="text-xs leading-snug text-muted">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Full name</label>
            <input id="name" required autoComplete="name" value={form.name} onChange={set("name")} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
            <input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"} required minLength={6} autoComplete="new-password" value={form.password} onChange={set("password")} className={`${fieldClass} pr-11`} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:text-ink">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">Short bio <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="bio" rows={2} value={form.bio} onChange={set("bio")} className={`${fieldClass} h-auto py-2.5`} />
          </div>
          <div>
            <label htmlFor="avatar" className="mb-1.5 block text-sm font-medium">Profile photo <span className="font-normal text-muted">(optional)</span></label>
            <input id="avatar" type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} className="block w-full text-sm text-muted file:mr-3 file:h-9 file:rounded-md file:border file:border-line-strong file:bg-white file:px-3 file:text-sm file:text-ink hover:file:bg-sunken" />
          </div>
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : "Create account"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <div className={`flex justify-center ${googleLoading ? "pointer-events-none opacity-60" : ""}`}>
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google sign up was cancelled or failed.")} useOneTap={false} theme="outline" size="large" text="signup_with" shape="rectangular" width="368" />
        </div>
      </AuthLayout>
    </GoogleOAuthProvider>
  );
};

export default Register;
