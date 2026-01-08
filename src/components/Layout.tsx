import { ReactNode } from "react";
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 h-10 border-b border-border flex items-center justify-between px-3 bg-card/80 backdrop-blur-md safe-area-top pb-4">
            <div className="flex items-center">
              <SidebarTrigger className="mr-4" />
              <h1 className="text-xl font-semibold text-foreground">
                <span className="text-primary">Six</span>
                <span className="text-muted-foreground">ity</span>
              </h1>
            </div>
            <LogoutButton />
          </header>
          <main className="flex-1 p-6 pb-16">
            {children}
          </main>
          
          {/* Bottom Navigation Bar */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-neumorphic/80 backdrop-blur-md border-t border-border safe-area-bottom">
            <div className="max-w-9xl mx-auto px-2 py-2">
              <div className="grid grid-cols-4 gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center justify-center p-2 rounded-xl transition-all ${
                        isActive
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
