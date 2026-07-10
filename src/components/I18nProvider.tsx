"use client";

import { createContext, useContext } from "react";
import { translate } from "@/lib/i18n";

const I18nContext = createContext(translate);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nContext.Provider value={translate}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
