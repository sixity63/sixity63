import { createContext, useContext, useEffect, useState } from "react";

const THEME_TRANSITION_DURATION = 1200; // ms

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "light",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    );
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionDirection, setTransitionDirection] = useState<"light-to-dark" | "dark-to-light" | "system">("system");

    // Kelola class/atribut untuk overlay animasi bulan -> matahari
    useEffect(() => {
        const root = window.document.documentElement;

        if (!isTransitioning) return;

        if (transitionDirection === "dark-to-light") {
            root.setAttribute("data-theme-transition", "dark-to-light");
        } else if (transitionDirection === "light-to-dark") {
            root.setAttribute("data-theme-transition", "light-to-dark");
        } else {
            root.removeAttribute("data-theme-transition");
        }

        root.classList.add("theme-transition");

        const timer = window.setTimeout(() => {
            root.classList.remove("theme-transition");
            root.removeAttribute("data-theme-transition");
            setIsTransitioning(false);
        }, THEME_TRANSITION_DURATION);

        return () => window.clearTimeout(timer);
    }, [isTransitioning, transitionDirection]);

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove("light", "dark");

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light";

            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    const value = {
        theme,
        setTheme: (nextTheme: Theme) => {
            const root = window.document.documentElement;
            const currentIsDark = root.classList.contains("dark");
            const nextIsDark =
                nextTheme === "dark" ||
                (nextTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

            // Jika benar-benar pindah mode (dark <-> light), nyalakan animasi
            if (currentIsDark !== nextIsDark) {
                setTransitionDirection(currentIsDark ? "dark-to-light" : "light-to-dark");
                setIsTransitioning(true);

                // Terapkan perubahan theme di pertengahan animasi, bukan langsung
                window.setTimeout(() => {
                    localStorage.setItem(storageKey, nextTheme);
                    setTheme(nextTheme);
                }, THEME_TRANSITION_DURATION * 0.4);

                return;
            }

            // Kalau tidak benar-benar pindah (misalnya light -> system tapi preferensi tetap light), langsung saja
            localStorage.setItem(storageKey, nextTheme);
            setTheme(nextTheme);
        },
    };

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
}
