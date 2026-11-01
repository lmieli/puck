"use client";

import type { ComponentConfig } from "@puckeditor/core";
import { Clock, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { site } from "../lib/site";
import { Section, SectionHead, Tone, toneField } from "./ui";

export type ContactProps = {
  eyebrow: string;
  title: string;
  intro: string;
  subject: string;
  address: string;
  hours: string;
  phones: { number: string }[];
  departments: { name: string; email: string; whatsapp: boolean }[];
  tone: Tone;
};

function ContactView({
  eyebrow,
  title,
  intro,
  subject,
  address,
  hours,
  phones,
  departments,
  tone,
}: ContactProps) {
  const [dept, setDept] = useState(departments[0]?.name ?? "");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const d = departments.find((x) => x.name === dept) ?? departments[0];
    const lines = [
      `Olá! Vim pelo site${subject ? ` (${subject})` : ""}.`,
      `Nome: ${f.get("name")}`,
      `Telefone: ${f.get("phone")}`,
      f.get("email") ? `E-mail: ${f.get("email")}` : "",
      `Setor: ${d?.name ?? ""}`,
      "",
      String(f.get("message") || ""),
    ].filter((l, i) => l !== "" || i === 5);
    const text = lines.join("\n");

    if (!d || d.whatsapp) {
      window.open(
        `https://api.whatsapp.com/send?phone=${
          site.whatsappNumber
        }&text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener"
      );
    } else {
      window.location.href = `mailto:${d.email}?subject=${encodeURIComponent(
        `Contato pelo site – ${d.name}`
      )}&body=${encodeURIComponent(text)}`;
    }
    setSent(true);
  };

  return (
    <Section tone={tone} id="contato">
      <div className="g-contact">
        <div className="g-contact-info">
          <SectionHead eyebrow={eyebrow} title={title} intro={intro} />
          <ul className="g-contact-list">
            <li>
              <span className="g-feature-icon">
                <MapPin size={22} />
              </span>
              <div>
                <strong>Endereço</strong>
                <span>{address}</span>
              </div>
            </li>
            <li>
              <span className="g-feature-icon">
                <Phone size={22} />
              </span>
              <div>
                <strong>Telefones</strong>
                {phones.map((p) => (
                  <a
                    key={p.number}
                    href={`tel:+55${p.number.replace(/\D/g, "")}`}
                  >
                    {p.number}
                  </a>
                ))}
              </div>
            </li>
            <li>
              <span className="g-feature-icon">
                <Mail size={22} />
              </span>
              <div>
                <strong>E-mails</strong>
                {departments
                  .filter((d) => d.email)
                  .map((d) => (
                    <a key={d.name} href={`mailto:${d.email}`}>
                      {d.email}
                    </a>
                  ))}
              </div>
            </li>
            {hours && (
              <li>
                <span className="g-feature-icon">
                  <Clock size={22} />
                </span>
                <div>
                  <strong>Horário</strong>
                  <span>{hours}</span>
                </div>
              </li>
            )}
          </ul>
        </div>

        <form className="g-form" onSubmit={onSubmit}>
          <h3>Envie sua mensagem</h3>
          <p className="g-form-hint">
            Respondemos rapidinho, em horário comercial.
          </p>
          <label>
            <span>Nome</span>
            <input
              name="name"
              required
              autoComplete="name"
              placeholder="Seu nome completo"
            />
          </label>
          <div className="g-form-row">
            <label>
              <span>Telefone / WhatsApp</span>
              <input
                name="phone"
                required
                type="tel"
                autoComplete="tel"
                placeholder="(22) 90000-0000"
              />
            </label>
            <label>
              <span>E-mail</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@email.com"
              />
            </label>
          </div>
          <fieldset>
            <legend>Setor</legend>
            <div className="g-segment">
              {departments.map((d) => (
                <label
                  key={d.name}
                  className={dept === d.name ? "is-active" : undefined}
                >
                  <input
                    type="radio"
                    name="department"
                    value={d.name}
                    checked={dept === d.name}
                    onChange={() => setDept(d.name)}
                  />
                  {d.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            <span>Mensagem</span>
            <textarea
              name="message"
              rows={4}
              placeholder="Conte como podemos ajudar"
            />
          </label>
          <button type="submit" className="g-btn g-btn-primary g-btn-block">
            {departments.find((d) => d.name === dept)?.whatsapp !== false ? (
              <MessageCircle size={18} aria-hidden />
            ) : (
              <Send size={18} aria-hidden />
            )}
            <span>
              {departments.find((d) => d.name === dept)?.whatsapp !== false
                ? "Enviar pelo WhatsApp"
                : "Enviar por e-mail"}
            </span>
          </button>
          {sent && (
            <p className="g-form-ok">
              Pronto! Finalize o envio na janela que abriu.
            </p>
          )}
        </form>
      </div>
    </Section>
  );
}

export const Contact: ComponentConfig<ContactProps> = {
  label: "Contato",
  fields: {
    eyebrow: { type: "text", label: "Chamada" },
    title: { type: "text", label: "Título" },
    intro: { type: "textarea", label: "Introdução" },
    subject: {
      type: "text",
      label: "Assunto enviado na mensagem (ex.: nome do imóvel)",
    },
    address: { type: "textarea", label: "Endereço" },
    hours: { type: "text", label: "Horário de atendimento" },
    phones: {
      type: "array",
      label: "Telefones",
      getItemSummary: (i) => i.number || "Telefone",
      arrayFields: { number: { type: "text", label: "Número" } },
    },
    departments: {
      type: "array",
      label: "Setores",
      getItemSummary: (i) => i.name || "Setor",
      defaultItemProps: { name: "Novo setor", email: "", whatsapp: false },
      arrayFields: {
        name: { type: "text", label: "Nome" },
        email: { type: "text", label: "E-mail" },
        whatsapp: {
          type: "radio",
          label: "Enviar mensagens por",
          options: [
            { label: "WhatsApp", value: true },
            { label: "E-mail", value: false },
          ],
        },
      },
    },
    tone: toneField,
  },
  defaultProps: {
    eyebrow: "Contato",
    title: "Vamos conversar?",
    intro:
      "Preencha o formulário ou fale direto com um de nossos canais de atendimento.",
    subject: "",
    address: `${site.address} – ${site.district}`,
    hours: "",
    phones: [{ number: site.phone }, { number: site.whatsapp }],
    departments: [
      {
        name: "Vendas",
        email: "comercial@geminiengenharia.com.br",
        whatsapp: true,
      },
      {
        name: "Técnico",
        email: "tecnica2@geminiengenharia.com.br",
        whatsapp: false,
      },
      {
        name: "Recursos Humanos",
        email: "pessoal@geminiengenharia.com.br",
        whatsapp: false,
      },
    ],
    tone: "light",
  },
  render: (props) => <ContactView {...props} />,
};
