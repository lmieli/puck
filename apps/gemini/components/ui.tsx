import {
  ArrowRight,
  ArrowUpDown,
  Award,
  BedDouble,
  Briefcase,
  Building2,
  Car,
  CircleCheck,
  Clock,
  Fence,
  HandCoins,
  HardHat,
  House,
  Layers,
  MapPin,
  MessageCircle,
  PartyPopper,
  Phone,
  Ruler,
  ShieldCheck,
  Sofa,
  SquareParking,
  Store,
  Sun,
  Trees,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export const icons = {
  building: Building2,
  house: House,
  bed: BedDouble,
  car: Car,
  elevator: ArrowUpDown,
  trees: Trees,
  pin: MapPin,
  shield: ShieldCheck,
  sun: Sun,
  ruler: Ruler,
  briefcase: Briefcase,
  store: Store,
  users: Users,
  parking: SquareParking,
  party: PartyPopper,
  award: Award,
  hardhat: HardHat,
  phone: Phone,
  clock: Clock,
  coins: HandCoins,
  trending: TrendingUp,
  layers: Layers,
  check: CircleCheck,
  sofa: Sofa,
  fence: Fence,
  chat: MessageCircle,
};

export type IconName = keyof typeof icons;

const iconLabels: Record<IconName, string> = {
  building: "Prédio",
  house: "Casa",
  bed: "Quartos",
  car: "Garagem",
  elevator: "Elevador",
  trees: "Natureza",
  pin: "Localização",
  shield: "Segurança",
  sun: "Varanda / Sol",
  ruler: "Metragem",
  briefcase: "Escritório",
  store: "Loja",
  users: "Pessoas",
  parking: "Estacionamento",
  party: "Salão de festas",
  award: "Prêmio / Selo",
  hardhat: "Obra",
  phone: "Telefone",
  clock: "Tempo",
  coins: "Pagamento",
  trending: "Investimento",
  layers: "Andares",
  check: "Confirmado",
  sofa: "Ambientes",
  fence: "Condomínio",
  chat: "Conversa",
};

export const iconOptions = (Object.keys(icons) as IconName[]).map((value) => ({
  label: iconLabels[value],
  value,
}));

export const iconField = {
  type: "select" as const,
  label: "Ícone",
  options: iconOptions,
};

export function Icon({
  name,
  size = 22,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  const Cmp = icons[name] ?? CircleCheck;
  return <Cmp size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export const toneField = {
  type: "radio" as const,
  label: "Fundo",
  options: [
    { label: "Branco", value: "light" },
    { label: "Areia", value: "sand" },
    { label: "Azul", value: "dark" },
  ],
};

export type Tone = "light" | "sand" | "dark";

export function Section({
  tone = "light",
  id,
  className = "",
  children,
}: {
  tone?: Tone;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id || undefined}
      className={`g-section g-tone-${tone} ${className}`}
    >
      <div className="g-container">{children}</div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  intro,
  align = "left",
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  align?: "left" | "center";
}) {
  if (!eyebrow && !title && !intro) return null;
  return (
    <header className={`g-head g-head-${align}`}>
      {eyebrow && <span className="g-eyebrow">{eyebrow}</span>}
      {title && <h2 className="g-title">{title}</h2>}
      {intro && <p className="g-intro">{intro}</p>}
    </header>
  );
}

export function Paragraphs({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </>
  );
}

export type ButtonItem = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "whatsapp";
};

export const buttonsField = {
  type: "array" as const,
  label: "Botões",
  getItemSummary: (item: ButtonItem) => item.label || "Botão",
  defaultItemProps: {
    label: "Saiba mais",
    href: "#",
    variant: "primary",
  } as ButtonItem,
  arrayFields: {
    label: { type: "text" as const, label: "Texto" },
    href: { type: "text" as const, label: "Link" },
    variant: {
      type: "select" as const,
      label: "Estilo",
      options: [
        { label: "Principal (vermelho)", value: "primary" },
        { label: "Secundário (azul)", value: "secondary" },
        { label: "Contorno", value: "ghost" },
        { label: "WhatsApp", value: "whatsapp" },
      ],
    },
  },
};

export function Buttons({ items }: { items?: ButtonItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="g-buttons">
      {items.map((b, i) => {
        const external = /^https?:/.test(b.href);
        return (
          <a
            key={i}
            href={b.href}
            className={`g-btn g-btn-${b.variant || "primary"}`}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {b.variant === "whatsapp" && (
              <MessageCircle size={18} aria-hidden />
            )}
            <span>{b.label}</span>
            {(b.variant === "primary" || b.variant === "secondary") && (
              <ArrowRight size={18} aria-hidden />
            )}
          </a>
        );
      })}
    </div>
  );
}

export const headFields = {
  eyebrow: { type: "text" as const, label: "Chamada (acima do título)" },
  title: { type: "text" as const, label: "Título" },
  intro: { type: "textarea" as const, label: "Introdução" },
};
