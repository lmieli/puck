import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { LoginForm } from "@/components/dash/forms";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/app");
  const demo = !process.env.VITRINE_HIDE_DEMO;
  return (
    <main className="d-login">
      <section className="d-login-art" aria-hidden>
        <div className="d-login-orb" />
        <div className="d-login-copy">
          <span className="d-logo d-logo-light">Vitrine</span>
          <h1>Sites que contam histórias.</h1>
          <p>
            Crie, edite e publique sites cinematográficos para todos os seus
            clientes. Peça mudanças à IA e veja a página se transformar.
          </p>
        </div>
      </section>
      <section className="d-login-panel">
        <div className="d-login-box">
          <h2>Entrar</h2>
          <p className="d-muted">Use o e-mail e a senha da sua conta.</p>
          <LoginForm action={login} />
          {demo && (
            <div className="d-demo">
              <strong>Contas de demonstração</strong> (senha{" "}
              <code>vitrine123</code>)
              <ul>
                <li>
                  <code>admin@vitrine.app</code> agência, acessa todos os sites
                </li>
                <li>
                  <code>cliente@gemini.com.br</code> administrador do site
                  Gemini
                </li>
                <li>
                  <code>editor@gemini.com.br</code> editor do site Gemini,
                  publica com revisão
                </li>
              </ul>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
