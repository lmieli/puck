import Link from "next/link";
import { forgotPassword } from "@/app/actions";
import { SimpleForm } from "@/components/dash/forms";

export const metadata = { title: "Esqueci minha senha" };

export default function ForgotPage() {
  return (
    <main className="d-auth">
      <div className="d-login-box">
        <span className="d-logo">Vitrine</span>
        <h2>Esqueci minha senha</h2>
        <p className="d-muted">
          Informe seu e-mail. Enviamos um link para criar uma nova senha.
        </p>
        <SimpleForm
          action={forgotPassword}
          submit="Enviar link"
          pendingText="Enviando…"
        >
          <label className="d-field">
            <span>E-mail</span>
            <input
              id="forgot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>
        </SimpleForm>
        <Link href="/login" className="d-back">
          ← Voltar ao login
        </Link>
      </div>
    </main>
  );
}
