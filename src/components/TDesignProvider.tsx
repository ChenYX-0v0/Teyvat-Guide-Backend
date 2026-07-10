"use client";

import "tdesign-react/es/_util/react-19-adapter";
import { I18nProvider } from "@/components/I18nProvider";

export function TDesignProvider({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
