"use client";

import type { ComponentConfig } from "@puckeditor/core";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { nav, site, images } from "../lib/site";

type NavItem = { label: string; href: string };

/* ------------------------------------------------------------------ */
/* Header                                                             */
/* ------------------------------------------------------------------ */

export type HeaderProps = {
  logo: string;
  links: NavItem[];
  ctaLabel: string;
  ctaHref: string;
  overlay: boolean;
};

function HeaderView({ logo, links, ctaLabel, ctaHref, overlay }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [path, setPath] = useState("");

  useEffect(() => {
    setPath(window.location.pathname.replace(/\/edit$/, "") || "/");
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !overlay || scrolled || open;

  return (
    <header className={`g-header ${solid ? "is-solid" : "is-overlay"}`}>
      <div className="g-container g-header-inner">
        <a href="/" className="g-logo" aria-label={`${site.name} – início`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={site.name} />
        </a>
        <nav
          className={`g-nav ${open ? "is-open" : ""}`}
          aria-label="Principal"
        >
          {links.map((l) => (
            <a
              key={l.href + l.label}
              href={l.href}
              className={path === l.href ? "is-active" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          {ctaLabel && (
            <a
              href={ctaHref}
              className="g-btn g-btn-whatsapp g-nav-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} aria-hidden />
              <span>{ctaLabel}</span>
            </a>
          )}
        </nav>
        <button
          type="button"
          className="g-menu-toggle"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
}

export const Header: ComponentConfig<HeaderProps> = {
  label: "Cabeçalho",
  fields: {
    logo: { type: "text", label: "Logo (URL da imagem)" },
    overlay: {
      type: "radio",
      label: "Sobre a imagem do topo",
      options: [
        { label: "Sim (transparente)", value: true },
        { label: "Não (fundo branco)", value: false },
      ],
    },
    links: {
      type: "array",
      label: "Menu",
      getItemSummary: (item) => item.label || "Link",
      defaultItemProps: { label: "Página", href: "/" },
      arrayFields: {
        label: { type: "text", label: "Texto" },
        href: { type: "text", label: "Link" },
      },
    },
    ctaLabel: { type: "text", label: "Botão de contato" },
    ctaHref: { type: "text", label: "Link do botão" },
  },
  defaultProps: {
    logo: site.logo,
    links: nav,
    ctaLabel: "Fale conosco",
    ctaHref: site.whatsappHref,
    overlay: true,
  },
  render: (props) => <HeaderView {...props} />,
};

/* ------------------------------------------------------------------ */
/* Footer                                                             */
/* ------------------------------------------------------------------ */

export type FooterProps = {
  about: string;
  address: string;
  district: string;
  phones: { number: string }[];
  emails: { label: string; email: string }[];
  links: NavItem[];
  instagram: string;
  facebook: string;
  showSeals: boolean;
};

export const Footer: ComponentConfig<FooterProps> = {
  label: "Rodapé",
  fields: {
    about: { type: "textarea", label: "Sobre a empresa" },
    address: { type: "text", label: "Endereço" },
    district: { type: "text", label: "Bairro / cidade" },
    phones: {
      type: "array",
      label: "Telefones",
      getItemSummary: (i) => i.number || "Telefone",
      arrayFields: { number: { type: "text", label: "Número" } },
    },
    emails: {
      type: "array",
      label: "E-mails",
      getItemSummary: (i) => i.label || i.email || "E-mail",
      arrayFields: {
        label: { type: "text", label: "Setor" },
        email: { type: "text", label: "E-mail" },
      },
    },
    links: {
      type: "array",
      label: "Links rápidos",
      getItemSummary: (i) => i.label || "Link",
      arrayFields: {
        label: { type: "text", label: "Texto" },
        href: { type: "text", label: "Link" },
      },
    },
    instagram: { type: "text", label: "Instagram" },
    facebook: { type: "text", label: "Facebook" },
    showSeals: {
      type: "radio",
      label: "Mostrar selos de qualidade",
      options: [
        { label: "Sim", value: true },
        { label: "Não", value: false },
      ],
    },
  },
  defaultProps: {
    about:
      "Desde 1972 construindo sonhos e oportunidades em Nova Friburgo e região. Mais de 435 obras residenciais e comerciais entregues.",
    address: site.address,
    district: site.district,
    phones: site.salesPhones.map((number) => ({ number })),
    emails: site.emails,
    links: nav,
    instagram: site.instagram,
    facebook: site.facebook,
    showSeals: true,
  },
  render: ({
    about,
    address,
    district,
    phones,
    emails,
    links,
    instagram,
    facebook,
    showSeals,
  }) => (
    <footer className="g-footer">
      <div className="g-container g-footer-grid">
        <div className="g-footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.logo} alt={site.name} className="g-footer-logo" />
          <p>{about}</p>
          <div className="g-social">
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            )}
            {facebook && (
              <a
                href={facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
            )}
          </div>
        </div>
        <div>
          <h3>Navegação</h3>
          <ul className="g-footer-links">
            {links.map((l) => (
              <li key={l.href + l.label}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Atendimento</h3>
          <ul className="g-footer-contact">
            <li>
              <MapPin size={18} aria-hidden />
              <span>
                {address}
                <br />
                {district}
              </span>
            </li>
            {phones.map((p) => (
              <li key={p.number}>
                <Phone size={18} aria-hidden />
                <a href={`tel:+55${p.number.replace(/\D/g, "")}`}>{p.number}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>E-mails</h3>
          <ul className="g-footer-contact">
            {emails.map((e) => (
              <li key={e.email}>
                <Mail size={18} aria-hidden />
                <span>
                  <small>{e.label}</small>
                  <a href={`mailto:${e.email}`}>{e.email}</a>
                </span>
              </li>
            ))}
          </ul>
          {showSeals && (
            <div className="g-seals">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images.pbqph} alt="Certificação PBQP-H" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images.iso} alt="Certificado ISO 9001" />
            </div>
          )}
        </div>
      </div>
      <div className="g-footer-bottom">
        <div className="g-container">
          <span>
            © {new Date().getFullYear()} {site.name}. Todos os direitos
            reservados.
          </span>
          <span>Nova Friburgo · RJ</span>
        </div>
      </div>
    </footer>
  ),
};

/* ------------------------------------------------------------------ */
/* Floating WhatsApp button (rendered by the root)                     */
/* ------------------------------------------------------------------ */

export function WhatsAppFloat() {
  return (
    <a
      href={site.whatsappHref}
      className="g-wa-float"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar no WhatsApp"
    >
      <MessageCircle size={28} />
    </a>
  );
}
