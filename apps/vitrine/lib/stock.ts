// Curated, verified stock photos (Unsplash) the AI and templates can use when
// a site has no images of its own yet.

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2000&q=80`;

export const stock: { url: string; tags: string }[] = [
  {
    url: u("1487215078519-e21cc028cb29"),
    tags: "fone de ouvido preto fundo escuro, produto, dramático",
  },
  {
    url: u("1583394838336-acd977736f90"),
    tags: "fone de ouvido fundo branco, produto, minimalista",
  },
  {
    url: u("1546435770-a3e426bf472b"),
    tags: "fone sobre mesa branca com teclado, escritório, minimalista",
  },
  {
    url: u("1484704849700-f032a568e944"),
    tags: "fone metálico e couro, detalhe, close",
  },
  {
    url: u("1505740420928-5e560c06d30e"),
    tags: "fone de ouvido fundo amarelo, produto colorido",
  },
  {
    url: u("1524678606370-a47ad25cb82a"),
    tags: "fone rosa fundo pastel, produto, cor",
  },
  {
    url: u("1618005182384-a83a8bd57fbe"),
    tags: "abstrato ondas coloridas, gradiente, tecnologia",
  },
  {
    url: u("1620641788421-7a1c342ea42e"),
    tags: "abstrato luz rosa e roxa, escuro, tecnologia",
  },
  {
    url: u("1557672172-298e090bd0f1"),
    tags: "abstrato tinta fluida rosa e azul",
  },
  {
    url: u("1506905925346-21bda4d32df4"),
    tags: "montanhas acima das nuvens, paisagem, pôr do sol",
  },
  {
    url: u("1469474968028-56623f02e42e"),
    tags: "vale verde ao amanhecer, natureza, paisagem",
  },
  {
    url: u("1500530855697-b586d89ba3ee"),
    tags: "estrada no deserto, viagem, paisagem",
  },
  {
    url: u("1511379938547-c1f69419868d"),
    tags: "estúdio de música em casa, violões, ambiente",
  },
  {
    url: u("1470225620780-dba8ba36b745"),
    tags: "dj mesa de som luz roxa, música, festa",
  },
  {
    url: u("1459749411175-04bf5292ceea"),
    tags: "show multidão luzes, música ao vivo",
  },
  {
    url: u("1517841905240-472988babdf9"),
    tags: "pessoa sorrindo jaqueta jeans, retrato, estilo de vida",
  },
  {
    url: u("1487958449943-2429e8be8625"),
    tags: "arquitetura moderna branca, prédio, construção",
  },
  {
    url: u("1486406146926-c627a92ad1ab"),
    tags: "prédios de vidro vistos de baixo, cidade, corporativo",
  },
  {
    url: u("1600585154340-be6161a56a0c"),
    tags: "casa moderna com jardim ao entardecer, imóvel",
  },
  {
    url: u("1600607687939-ce8a6c25118c"),
    tags: "sala de estar moderna clara, interior, imóvel",
  },
  {
    url: u("1512917774080-9991f1c4c750"),
    tags: "casa com piscina, imóvel de alto padrão",
  },
];
