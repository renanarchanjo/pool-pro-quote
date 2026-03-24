import { useEffect } from "react";
import { useTheme } from "next-themes";

/** Forces light theme on public pages. Restores nothing on unmount so admin pages can set their own. */
export const useForceLightTheme = () => {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);
};