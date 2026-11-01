// Shared company data and image URLs used by the components' default props
// and by the initial pages in default-pages.ts.

const UPLOADS = "https://geminiengenharia.com.br/wp-content/uploads";

export const img = (path: string) => `${UPLOADS}/${path}`;

export const site = {
  name: "Gemini Engenharia",
  logo: img("2020/04/gemini-engenharia-marca.png"),
  address: "Rua Maria Duque Estrada Laginestra, 900b",
  district: "Parque São Clemente, Nova Friburgo – RJ",
  phone: "(22) 2522-1329",
  phoneHref: "tel:+552225221329",
  whatsapp: "(22) 99201-8868",
  whatsappHref:
    "https://api.whatsapp.com/send?phone=5522992018868&text=Ol%C3%A1!%20Gostaria%20de%20receber%20um%20atendimento.",
  whatsappNumber: "5522992018868",
  salesPhones: [
    "(22) 2522-1329",
    "(22) 99231-8363",
    "(22) 99278-1684",
    "(22) 99201-8868",
  ],
  emails: [
    { label: "Comercial", email: "comercial@geminiengenharia.com.br" },
    { label: "Recursos Humanos", email: "pessoal@geminiengenharia.com.br" },
    { label: "Técnico", email: "tecnica2@geminiengenharia.com.br" },
  ],
  instagram: "https://www.instagram.com/geminiengenharia/",
  facebook: "https://www.facebook.com/Gemini-Engenharia-805390292932986",
};

export const nav = [
  { label: "Início", href: "/" },
  { label: "A empresa", href: "/a-empresa" },
  { label: "Bougainville", href: "/residencial-bougainville" },
  { label: "Gardênia", href: "/residencial-gardenia" },
  { label: "Villa Boulevard", href: "/villa-boulevard" },
  { label: "Andamento da obra", href: "/andamento-da-obra" },
  { label: "Contato", href: "/contato" },
];

export const images = {
  bougainvilleFacade: img("2026/07/banner03.jpg"),
  bougainvilleBanner: img("2026/07/Banner01.jpg"),
  bougainvillePlanBanner: img("2026/07/Banner02.jpg"),
  bougainvilleLogo: img("2025/02/marcaBougainville.png"),
  bougainvilleWorks: img("2025/05/Bougainville.jpg"),
  bougainvilleWorks2: img(
    "2025/05/Imagem-do-WhatsApp-de-2025-05-06-as-14.35.15_8487cb54.jpg"
  ),
  bougainvilleWorks3: img(
    "2025/05/Imagem-do-WhatsApp-de-2025-05-06-as-14.35.15_efa6d9fe.jpg"
  ),
  living: img("2025/01/Sala-ampliada.jpg"),
  living2: img("2025/01/sala-ampliada-2.jpg"),
  living3: img("2025/01/sala-ampliada-3.jpg"),
  kitchen: img("2025/01/Cozinha.jpg"),
  bedroom: img("2025/01/Quarto.jpg"),
  homeOffice: img("2025/01/Home-ofice.jpg"),
  bathroom: img("2025/01/WC.jpg"),
  plans: Array.from({ length: 10 }, (_, i) =>
    img(
      `2025/01/Humanizada_Pagina_${String(i + 1).padStart(2, "0")}${
        i === 0 ? "-1" : ""
      }.jpg`
    )
  ),
  gardenia: img(
    "2022/12/gemini-engenharia-villa-das-flores-residencial-gardenia-imoveis-nova-friburgo.jpg"
  ),
  gardenia2: img(
    "2022/12/gemini-engenharia-villa-das-flores-residencial-gardenia-imoveis-nova-friburgo-01.jpg"
  ),
  gardenia3: img(
    "2022/12/gemini-engenharia-villa-das-flores-residencial-gardenia-imoveis-nova-friburgo-02.jpg"
  ),
  gardenia3d: img(
    "2020/04/gemini-engenharia-villa-das-flores-residencial-gardenia-3d.jpg"
  ),
  gardeniaApt: [1, 2, 3, 4, 5, 6, 7, 10].map((n) =>
    img(
      `2020/04/gemini-engenharia-villa-das-flores-gardenia-apartamento-${String(
        n
      ).padStart(2, "0")}.jpg`
    )
  ),
  gardeniaPlan2: img("2020/04/villa-das-flores-planta01.png"),
  gardeniaPlan3: img("2020/04/villa-das-flores-planta021.png"),
  gardeniaPlan3Upper: img("2020/04/villa-das-flores-planta031.png"),
  boulevard: img("2025/02/boulevard.jpg"),
  boulevardPhoto: img("2020/04/gemini-engenharia-villa-boulevard-foto.jpg"),
  boulevardPhoto2: img("2020/04/gemini-engenharia-villa-boulevard-foto04.jpg"),
  boulevardGallery: ["", "-01", "-02", "-03", "-04", "-05"].map((s) =>
    img(
      `2022/12/gemini-engenharia-villa-das-flores-villa-boulevard-imoveis-nova-friburgo${s}.jpg`
    )
  ),
  boulevardBusiness: img(
    "2022/12/gemini-engenharia-villa-boulevard-imoveis-comerciais-nova-friburgo-1.jpg"
  ),
  villaDasFlores: img("2020/03/vila-image-home.jpg"),
  villaDasFloresBalcony: img(
    "2022/11/gemini-engenharia-villa-das-flores-foto.jpg"
  ),
  villaDasFloresMap: img(
    "2020/04/gemini-engenharia-villa-das-flores-mapa-1.png"
  ),
  family: img("2020/04/gemini-engenharia-sobre-nos.jpg"),
  projects: img("2020/04/gemini-engenharia-sobre-nos-projetos.jpg"),
  anniversary: img("2022/12/gemini-50-anos-1.png"),
  pbqph: img("2020/04/gemini-engenharia-selo-PBPQ_H1.jpg"),
  iso: img("2020/04/gemini-engenharia-selo-iso-9001.jpg"),
  portfolio: {
    pauloHenrique: img("2020/03/47e7346adfd4ae4aa53dfb9c67bec90f.jpg"),
    caixa: img("2020/03/29112006152958imagem1.jpg"),
    juvenalFolly: img("2020/03/29112006153434imagem-B.jpg"),
    florDeLis: img("2020/03/28072009142354imagem-B.jpg"),
    unimed: img("2020/03/29112006152056imagem.jpg"),
    willisau: img("2020/03/29112006152919imagem.jpg"),
    blueMarine: img("2020/03/blue.jpg"),
    mezaninos: img("2020/03/29112006153126imagem.jpg"),
  },
};
