// Lista delle voci di navigazione. Le label vengono risolte via i18n
// (`useTranslations("nav")` lato client, `getTranslations("nav")` lato
// server) a partire dalla `key`. Per aggiungere una voce qui, aggiungi la
// chiave corrispondente in tutti i file /messages/*.json sotto "nav".
export const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/eventi", key: "eventi" },
  { href: "/bnb", key: "bnb" },
  { href: "/ristoranti", key: "ristoranti" },
  { href: "/shop", key: "shop" },
  { href: "/videolezioni", key: "videolezioni" },
  { href: "/infopoint", key: "infopoint" },
  { href: "/virtual-tour", key: "virtualTour" },
] as const;
