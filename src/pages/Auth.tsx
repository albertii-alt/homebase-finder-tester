import { useState, useEffect, useRef, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import loginBg from "../assets/loginphoto.jpg";
import registerBg from "../assets/loginphoto.jpg";
import { useIsMobile } from "../hooks/use-mobile";
import { useToast } from "../hooks/use-toast";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/firebase/config";
import { createUserDoc, getUserDoc } from "@/lib/firestore";
import type { UserRole } from "@/types/firestore";

const Auth = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const suppressRedirectRef = useRef(false);

  const [isLogin, setIsLogin] = useState(true);

  // common UI state
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRole, setLoginRole] = useState<"owner" | "tenant">("owner");
  const [loginLoading, setLoginLoading] = useState(false);

  // register state
  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerRole, setRegisterRole] = useState<"owner" | "tenant">("owner");
  const [registerLoading, setRegisterLoading] = useState(false);

  // show/hide password toggles
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [registerShowPassword, setRegisterShowPassword] = useState(false);
  const [confirmShowPassword, setConfirmShowPassword] = useState(false);

  const persistCurrentUser = (current: {
    uid: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
  }) => {
    try {
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          uid: current.uid,
          name: current.name,
          email: current.email,
          role: current.role,
          avatar:
            current.avatar ??
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(current.name || "User")}`,
          loggedIn: true,
        })
      );
    } catch {
      // best-effort persistence only
    }
  };

  const clearPersistedCurrentUser = () => {
    try {
      localStorage.removeItem("currentUser");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setLoginEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        clearPersistedCurrentUser();
        return;
      }

      try {
        const profile = await getUserDoc(firebaseUser.uid);
        if (!active) return;

        if (!profile) {
          await signOut(auth);
          clearPersistedCurrentUser();
          toast({ title: "Account issue", description: "Your profile is missing. Please sign in again." });
          return;
        }

        const role = normalizeRole(profile.role);
        const name = profile.fullName || firebaseUser.displayName || firebaseUser.email || "User";
        const email = firebaseUser.email ?? profile.email;
        const avatar = firebaseUser.photoURL;
        persistCurrentUser({ uid: firebaseUser.uid, name, email: email ?? "", role, avatar: avatar ?? undefined });

        if (!suppressRedirectRef.current) {
          navigate("/interface");
        }
      } catch (error) {
        console.error("onAuthStateChanged failed", error);
        clearPersistedCurrentUser();
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate, toast]);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const normalizeRole = (value: unknown): UserRole | null => {
    if (value === "owner" || value === "tenant") {
      return value;
    }
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "owner" || lower === "tenant") {
        return lower as UserRole;
      }
    }
    return null;
  };

  const getLoginErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/invalid-email":
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          return "Email or password is incorrect.";
        case "auth/too-many-requests":
          return "Too many attempts. Please try again later.";
        default:
          break;
      }
    }
    return "Please try again.";
  };

  const getRegisterErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/email-already-in-use":
          return "This email is already registered.";
        case "auth/invalid-email":
          return "Please enter a valid email address.";
        case "auth/weak-password":
          return "Password must be at least 6 characters long.";
        default:
          break;
      }
    }
    return "An unexpected error occurred. Please try again.";
  };

  const getResetErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/invalid-email":
          return "Please enter a valid email address.";
        case "auth/user-not-found":
          return "No account found with that email.";
        default:
          break;
      }
    }
    return "Unable to send reset link. Please try again.";
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loginLoading) return;

    if (!loginEmail || !loginPassword) {
      toast({ title: "Login failed", description: "Please fill in all fields." });
      return;
    }

    if (!validateEmail(loginEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }

    const trimmedEmail = loginEmail.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    suppressRedirectRef.current = true;
    setLoginLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, trimmedEmail, loginPassword);
      const data = await getUserDoc(credential.user.uid);
      const storedRole = normalizeRole(data?.role);

      if (!storedRole) {
        await signOut(auth);
        toast({ title: "Login failed", description: "User role not found. Please contact support." });
        clearPersistedCurrentUser();
        return;
      }

      if (storedRole !== loginRole) {
        await signOut(auth);
        toast({ title: "Wrong account type", description: "Wrong account type." });
        clearPersistedCurrentUser();
        return;
      }

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", normalizedEmail);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      const displayName = data?.fullName ?? credential.user.displayName ?? credential.user.email ?? "User";
      const email = credential.user.email ?? data?.email ?? normalizedEmail;

      persistCurrentUser({
        uid: credential.user.uid,
        name: displayName,
        email,
        role: storedRole,
        avatar: credential.user.photoURL ?? undefined,
      });

      toast({
        title: `Welcome back, ${displayName}!`,
        description: `You are logged in as ${storedRole}.`,
      });

      navigate("/interface");
    } catch (error) {
      toast({ title: "Login failed", description: getLoginErrorMessage(error) });
      await signOut(auth).catch(() => undefined);
      clearPersistedCurrentUser();
    } finally {
      suppressRedirectRef.current = false;
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (registerLoading) return;

    if (!fullName || !registerEmail || !registerPassword || !confirmPassword) {
      toast({ title: "Registration failed", description: "Please fill in all fields." });
      return;
    }

    if (!validateEmail(registerEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }

    if (registerPassword.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters long." });
      return;
    }

    if (registerPassword !== confirmPassword) {
      toast({ title: "Password mismatch", description: "Passwords do not match." });
      return;
    }

    suppressRedirectRef.current = true;
    setRegisterLoading(true);

    try {
      const trimmedEmail = registerEmail.trim();
      const normalizedEmail = trimmedEmail.toLowerCase();
      const credential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        registerPassword
      );

      if (fullName.trim()) {
        await updateProfile(credential.user, { displayName: fullName.trim() });
      }

      const createdProfile = await createUserDoc(credential.user.uid, {
        fullName: fullName.trim(),
        email: credential.user.email ?? normalizedEmail,
        role: registerRole,
      });

      const emailForLogin = (credential.user.email ?? createdProfile.email ?? normalizedEmail).trim().toLowerCase();

      await signOut(auth);
      clearPersistedCurrentUser();

      toast({ title: "Registration successful", description: "Welcome to Homebase Finder!" });

      setLoginRole(registerRole);
      setIsLogin(true);
      setLoginEmail(emailForLogin);
      setLoginPassword("");
      setRegisterPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({ title: "Registration failed", description: getRegisterErrorMessage(error) });
      await signOut(auth).catch(() => undefined);
      clearPersistedCurrentUser();
    } finally {
      suppressRedirectRef.current = false;
      setRegisterLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast({ title: "Validation", description: "Please enter your email address." });
      return;
    }
    if (!validateEmail(forgotEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      toast({
        title: "Reset link sent",
        description: `Password reset link has been sent to ${forgotEmail.trim()}`,
      });
      setShowForgotPassword(false);
      setForgotEmail("");
    } catch (error) {
      toast({ title: "Reset failed", description: getResetErrorMessage(error) });
    }
  };

  const toggleForm = () => setIsLogin((s) => !s);

  return (
    <div className={`auth-container ${isLogin ? "no-scroll-form" : ""}`}>
        {/* Navigation arrows (visible on forms) - jump back to the public landing page
          Show only LEFT arrow on the Login form and only RIGHT arrow on Register */}
      {isLogin ? (
        <button
          className="nav-arrow arrow-left"
          type="button"
          onClick={() => {
            // keep navigation within the SPA router
            navigate("/index");
          }}
          aria-label="Go to home"
        >
          {/* white chevron-left icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      ) : (
        <button
          className="nav-arrow arrow-right"
          type="button"
          onClick={() => {
            // mirror the login arrow behaviour for consistency
            navigate("/index");
          }}
          aria-label="Go to home"
        >
          {/* white chevron-right icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
      <div
        className={`auth-background ${isLogin ? "login-bg" : "register-bg"}`}
        style={{ backgroundImage: `url(${isLogin ? loginBg : registerBg})` }}
      />

      <div className={`auth-overlay ${isLogin ? "left-to-right" : "right-to-left"}`} />

      <div className={`auth-content ${isLogin ? "form-left" : "form-right"} ${isMobile ? "mobile" : ""}`}>
        {/* Logo */}
        <div className={`auth-logo ${isLogin ? "logo-left" : "logo-right"}`}>
          <div className="logo-icon">
            <img className="img-logo" src="/HomebaseFinderOfficialLogo.png" alt="Homebase Finder Logo" />
          </div>
          <div className="logo-text">
            <div className="logo-title">HOMEBASE</div>
            <div className="logo-subtitle">FINDER</div>
          </div>
        </div>

        {/* Forms */}
        <div className="forms-wrapper">
          {/* Login */}
          <div className={`auth-form ${isLogin ? "form-active" : "form-hidden"}`}>
            <h1 className="form-title">Welcome Back!</h1>
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <input
                  id="loginEmail"
                  type="email"
                  className="form-input"
                  placeholder=" "
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <label htmlFor="loginEmail" className="floating">Email Address</label>
              </div>

              <div className="form-group">
                <div className="password-wrapper">
                  <input
                    id="loginPassword"
                    type={loginShowPassword ? "text" : "password"}
                    className="form-input has-toggle"
                    placeholder=" "
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <label htmlFor="loginPassword" className="floating">Password</label>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setLoginShowPassword((s) => !s)}
                    aria-label={loginShowPassword ? "Hide password" : "Show password"}
                  >
                    {loginShowPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <select
                  className="form-select"
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value as "owner" | "tenant")}
                >
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span>Remember me</span>
                </label>

                <button type="button" className="forgot-password" onClick={() => setShowForgotPassword(true)}>
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="form-button" disabled={loginLoading}>
                {loginLoading ? "Logging in..." : "LOGIN"}
              </button>

              <div className="form-switch-text">
                <button type="button" className="form-switch-link" onClick={toggleForm}>
                  Register Instead
                </button>
              </div>
            </form>
          </div>

          {/* Register */}
          <div className={`auth-form ${!isLogin ? "form-active" : "form-hidden"}`}>
            <h1 className="form-title">Create an Account</h1>
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  placeholder=" "
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <label htmlFor="fullName" className="floating">Full Name</label>
              </div>

              <div className="form-group">
                <input
                  id="registerEmail"
                  type="email"
                  className="form-input"
                  placeholder=" "
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
                <label htmlFor="registerEmail" className="floating">Email Address</label>
              </div>

              <div className="form-group">
                <div className="password-wrapper">
                  <input
                    id="registerPassword"
                    type={registerShowPassword ? "text" : "password"}
                    className="form-input has-toggle"
                    placeholder=" "
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                  <label htmlFor="registerPassword" className="floating">Password</label>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setRegisterShowPassword((s) => !s)}
                    aria-label={registerShowPassword ? "Hide password" : "Show password"}
                  >
                    {registerShowPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <div className="password-wrapper">
                  <input
                    id="confirmPassword"
                    type={confirmShowPassword ? "text" : "password"}
                    className="form-input has-toggle"
                    placeholder=" "
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <label htmlFor="confirmPassword" className="floating">Confirm Password</label>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setConfirmShowPassword((s) => !s)}
                    aria-label={confirmShowPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {confirmShowPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <select
                  className="form-select"
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value as "owner" | "tenant")}
                >
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>

              <button type="submit" className="form-button" disabled={registerLoading}>
                {registerLoading ? "Creating..." : "Register"}
              </button>

              <div className="form-switch-text">
                Already have an Account?
                <button type="button" className="form-switch-link" onClick={toggleForm}>
                  Login here
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowForgotPassword(false)}>×</button>
            <h2 className="modal-title">Reset Password</h2>
            <p className="modal-text">Enter your email address and we'll send you a link to reset your password.</p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <input
                  id="forgotEmail"
                  type="email"
                  className="form-input"
                  placeholder=" "
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <label htmlFor="forgotEmail" className="floating">Email Address</label>
              </div>
              <button type="submit" className="form-button">Send Reset Link</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
