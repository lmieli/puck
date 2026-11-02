import Link from "next/link";
import { setPassword } from "@/app/actions";
import { SimpleForm } from "@/components/dash/forms";
import { readAccessLink } from "@/lib/repo";

export const metadata = { title: "Criar senha" };
export const dynamic = "force-dynamic";

export default async function AccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = readAccessLink(token);
  return (
    <main className="d-auth">
      <div className="d-login-box">
        <span className="d-logo">Vitrine</span>
        {link ? (
          <>
            <h2>
              {link.kind === "invite"
                ? `Bem-vindo, ${link.name}`
                : "Criar nova senha"}
            </h2>
            <p className="d-muted">
              Conta <strong>{link.email}</strong>. Escolha uma senha com pelo
              menos 8 caracteres.
            </p>
            <SimpleForm
              action={setPassword.bind(null, token)}
              submit="Salvar senha e entrar"
              pendingText="Salvando…"
            >
              <label className="d-field">
                <span>Nova senha</span>
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </label>
              <label className="d-field">
                <span>Repita a senha</span>
                <input
                  id="confirm-password"
                  name="confirm"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </label>
            </SimpleForm>
          </>
        ) : (
          <>
            <h2>Link inválido</h2>
            <p className="d-muted">
              Este link expirou ou já foi usado. Peça um novo ao administrador
              do seu site.
            </p>
            <Link href="/login" className="d-btn">
              Voltar ao login
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
