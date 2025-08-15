export type AdministrationSection = "users" | "licensees";

export type AdministrationTab = {
  id: AdministrationSection;
  label: string;
  icon: string;
};

export const ADMINISTRATION_TABS_CONFIG: AdministrationTab[] = [
  {
    id: "users",
    label: "Users",
    icon: "👤", // User emoji
  },
  {
    id: "licensees",
    label: "Licensees",
    icon: "🏢", // Building emoji
  },
];
