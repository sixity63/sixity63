import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, ToggleRight, Settings } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LogoutButton } from "./LogoutButton";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Monitoring', path: '/monitoring', icon: Activity },
  { label: 'LED Control', path: '/led-control', icon: ToggleRight },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, [lastScrollY]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full max-w-[200mm] mx-auto bg-background min-h-screen relative shadow-[0_0_50px_rgba(0,0,0,0.1)] border-x border-border/50">
          <header className="sticky top-0 z-50 w-full min-h-12 h-auto border-b border-border flex items-center justify-between px-4 pb-2 bg-card/80 backdrop-blur-md safe-area-top">
            <div className="flex items-center">
              <SidebarTrigger className="mr-2" />
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                <span className="text-primary">Six</span>
                <span className="text-muted-foreground font-medium">ity</span>
              </h1>
            </div>
          </header>
          <main className={`flex-1 ${location.pathname === '/monitoring' ? 'px-3 py-6 pb-16' : 'p-6 pb-16'}`}>
            {children}
          </main>

          {/* Bottom Navigation Bar */}
          <nav
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[100mm] z-50 bg-neumorphic/90 backdrop-blur-md border border-border rounded-2xl shadow-lg safe-area-bottom overflow-hidden transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
              }`}
          >
            <div className="px-2 py-2">
              <div className="grid grid-cols-4 gap-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center justify-center p-2.5 rounded-xl transition-all ${isActive
                        ? 'bg-neumorphic shadow-[inset_2px_2px_4px_hsl(var(--neumorphic-shadow-dark)),inset_-2px_-2px_4px_hsl(var(--neumorphic-shadow-light))]'
                        : 'bg-neumorphic shadow-[2px_2px_4px_hsl(var(--neumorphic-shadow-dark)),-2px_-2px_4px_hsl(var(--neumorphic-shadow-light))] hover:shadow-[inset_1px_1px_2px_hsl(var(--neumorphic-shadow-dark)),inset_-1px_-1px_2px_hsl(var(--neumorphic-shadow-light))]'
                        }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </SidebarProvider>
  );
}
