import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, ArrowLeft, ShieldCheck, Smartphone, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const matrizShellProps = {
  eyebrow: "Painel Matriz · Acesso Restrito",
  headline: "Centro de comando da rede SimulaPool.",
  subline: "Visão consolidada de lojas, leads, MRR e operações. Acesso protegido por autenticação multi-fator obrigatória.",
};

type View = "login" | "forgot" | "forgot-sent" | "mfa-setup" | "mfa-verify";

const heroGradient = "#0A1628";

const cardClass =
  "w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.25)]";

const LoginMatriz = () => {
  useForceLightTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [view, setView] = useState<View>("login");
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();

  // MFA state
  const [otpCode, setOtpCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [qrCodeUri, setQrCodeUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    window.history.replaceState(null, "", "/loginmatriz");

    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "super_admin")
          .single();

        if (roleData) {
          // Check if MFA is verified for this session
          const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (mfaData?.currentLevel === "aal2" || mfaData?.nextLevel === "aal1") {
            // Either already verified MFA or no MFA enrolled
            navigate("/matriz", { replace: true });
            return;
          }
          // MFA enrolled but not verified - need to verify
          if (mfaData?.nextLevel === "aal2" && mfaData?.currentLevel === "aal1") {
            const factors = mfaData.currentAuthenticationMethods;
            const { data: factorsData } = await supabase.auth.mfa.listFactors();
            if (factorsData?.totp && factorsData.totp.length > 0) {
              const factor = factorsData.totp[0];
              setMfaFactorId(factor.id);
              const { data: challengeData } = await supabase.auth.mfa.challenge({ factorId: factor.id });
              if (challengeData) {
                setMfaChallengeId(challengeData.id);
                setView("mfa-verify");
                setCheckingSession(false);
                return;
              }
            }
          }
        }
      }
      setCheckingSession(false);
    };
    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      toast.error("Credenciais inválidas.");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "super_admin")
      .single();

    if (!roleData) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Acesso restrito. Esta área é exclusiva para administradores.");
      return;
    }

    // Check MFA status
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactors = factorsData?.totp ?? [];
    const verifiedFactors = totpFactors.filter(f => f.status === "verified");

    if (verifiedFactors.length > 0) {
      // MFA already enrolled → challenge
      const factor = verifiedFactors[0];
      setMfaFactorId(factor.id);
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError || !challengeData) {
        setLoading(false);
        toast.error("Erro ao iniciar verificação 2FA.");
        return;
      }
      setMfaChallengeId(challengeData.id);
      setView("mfa-verify");
      setLoading(false);
    } else {
      // No MFA enrolled → setup
      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "SIMULAPOOL Matriz",
      });
      if (enrollError || !enrollData) {
        setLoading(false);
        toast.error("Erro ao configurar 2FA.");
        return;
      }
      setMfaFactorId(enrollData.id);
      setQrCodeUri(enrollData.totp.qr_code);
      setTotpSecret(enrollData.totp.secret);
      // Create challenge for verification
      const { data: challengeData } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
      if (challengeData) {
        setMfaChallengeId(challengeData.id);
      }
      setView("mfa-setup");
      setLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (otpCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: otpCode,
    });

    if (error) {
      setLoading(false);
      setOtpCode("");
      toast.error("Código inválido. Tente novamente.");
      // Create a new challenge
      const { data: newChallenge } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (newChallenge) setMfaChallengeId(newChallenge.id);
      return;
    }

    setLoading(false);
    toast.success("Bem-vindo à Matriz!");
    navigate("/matriz", { replace: true });
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setSecretCopied(true);
    toast.success("Chave copiada!");
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Informe seu e-mail.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar e-mail de recuperação. Tente novamente.");
      return;
    }
    setView("forgot-sent");
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: heroGradient }}>
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    );
  }

  // ── MFA Setup (first time) ──
  if (view === "mfa-setup") {
    return (
      <AuthSplitShell {...matrizShellProps}>
        <div className={cardClass}>
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#38BDF8]/10 flex items-center justify-center mb-4">
              <Smartphone className="h-7 w-7 text-[#38BDF8]" />
            </div>
            <h1 className="text-xl font-bold text-white font-display">Configurar 2FA</h1>
            <p className="text-sm text-white/50 mt-2 text-center">
              Escaneie o QR Code com o Google Authenticator
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-xl p-3">
              <img src={qrCodeUri} alt="QR Code 2FA" className="w-48 h-48" />
            </div>
          </div>

          {/* Manual secret */}
          <div className="mb-6">
            <p className="text-xs text-white/40 text-center mb-2">Ou insira a chave manualmente:</p>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/10">
              <code className="flex-1 text-xs text-white/70 font-mono break-all text-center select-all">
                {totpSecret}
              </code>
              <button onClick={handleCopySecret} className="text-white/40 hover:text-white/80 shrink-0">
                {secretCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* OTP input */}
          <div className="mb-4">
            <Label className="text-white/70 text-sm mb-2 block text-center">
              Digite o código gerado pelo app
            </Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                onComplete={handleMfaVerify}
              >
                <InputOTPGroup className="gap-2">
                  {[0,1,2,3,4,5].map(i => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="w-11 h-12 text-lg bg-white/10 border-white/20 text-white rounded-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            onClick={handleMfaVerify}
            className="w-full bg-white text-[#0A1628] font-semibold hover:bg-white/90"
            disabled={loading || otpCode.length !== 6}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Ativar e Entrar
          </Button>

          <p className="text-xs text-white/30 text-center mt-4">
            Guarde esta chave em local seguro. Você precisará do app autenticador para futuros acessos.
          </p>
        </div>
      </AuthSplitShell>
    );
  }

  // ── MFA Verify (returning user) ──
  if (view === "mfa-verify") {
    return (
      <AuthSplitShell {...matrizShellProps}>
        <div className={cardClass}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full bg-[#38BDF8]/10 flex items-center justify-center mb-4">
              <ShieldCheck className="h-7 w-7 text-[#38BDF8]" />
            </div>
            <h1 className="text-xl font-bold text-white font-display">Verificação 2FA</h1>
            <p className="text-sm text-white/50 mt-2 text-center">
              Abra o Google Authenticator e digite o código de 6 dígitos
            </p>
          </div>

          <div className="mb-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                onComplete={handleMfaVerify}
                autoFocus
              >
                <InputOTPGroup className="gap-2">
                  {[0,1,2,3,4,5].map(i => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="w-11 h-12 text-lg bg-white/10 border-white/20 text-white rounded-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            onClick={handleMfaVerify}
            className="w-full bg-white text-[#0A1628] font-semibold hover:bg-white/90"
            disabled={loading || otpCode.length !== 6}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Verificar
          </Button>

          <div className="mt-4 pt-4 border-t border-white/10">
            <Button
              className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
              onClick={async () => {
                await supabase.auth.signOut();
                setView("login");
                setOtpCode("");
                setMfaFactorId("");
                setMfaChallengeId("");
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao login
            </Button>
          </div>
        </div>
      </AuthSplitShell>
    );
  }

  // Forgot password - email sent confirmation
  if (view === "forgot-sent") {
    return (
      <AuthSplitShell {...matrizShellProps}>
        <div className={cardClass}>
          <div className="flex flex-col items-center mb-6">
            <BrandLogo size="lg" className="mb-4 [&_span]:text-white" />
            <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-[#38BDF8]" />
            </div>
            <h1 className="text-xl font-bold text-white font-display">E-mail enviado!</h1>
            <p className="text-sm text-white/50 mt-2 text-center">
              Enviamos um link de redefinição de senha para:
            </p>
            <p className="font-semibold text-white mt-1">{resetEmail}</p>
          </div>

          <div className="space-y-3 text-sm text-white/60 bg-white/5 rounded-lg p-4 mb-6">
            <p>📧 Verifique sua <strong className="text-white/80">caixa de entrada</strong> e <strong className="text-white/80">spam</strong></p>
            <p>⏳ O e-mail pode levar até 2 minutos para chegar</p>
            <p>🔗 Clique no link para criar uma nova senha</p>
          </div>

          <Button
            className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
            onClick={() => {
              setView("login");
              setResetEmail("");
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login
          </Button>
        </div>
      </AuthSplitShell>
    );
  }

  // Forgot password form
  if (view === "forgot") {
    return (
      <AuthSplitShell {...matrizShellProps}>
        <div className={cardClass}>
          <div className="flex flex-col items-center mb-8">
            <BrandLogo size="lg" className="mb-4 [&_span]:text-white" />
            <h1 className="text-xl font-bold text-white font-display">Esqueci minha senha</h1>
            <p className="text-sm text-white/50 mt-1 text-center">
              Informe o e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="resetEmail" className="text-white/70">E-mail</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#38BDF8]/50"
              />
            </div>
            <Button type="submit" className="w-full bg-white text-[#0A1628] font-semibold hover:bg-white/90" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar link de recuperação
            </Button>
          </form>

          <div className="mt-6">
            <Button
              className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
              onClick={() => {
                setView("login");
                setResetEmail("");
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao login
            </Button>
          </div>
        </div>
      </AuthSplitShell>
    );
  }

  // Login form
  return (
    <AuthSplitShell {...matrizShellProps}>
      <div className={cardClass}>
        <div className="flex flex-col items-center mb-8">
          <BrandLogo size="lg" className="mb-4 [&_span]:text-white" />
          <h1 className="text-xl font-bold text-white font-display">Painel Matriz</h1>
          <p className="text-sm text-white/50 mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-white/70">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#38BDF8]/50"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-white/70">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#38BDF8]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setView("forgot")}
              className="text-sm text-[#38BDF8] hover:underline font-medium"
            >
              Esqueci minha senha
            </button>
          </div>

          <Button type="submit" className="w-full bg-white text-[#0A1628] font-semibold hover:bg-white/90" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Acessar Matriz
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-white/10">
          <Button
            className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
            onClick={() => navigate("/")}
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    </AuthSplitShell>
  );
};

export default LoginMatriz;
