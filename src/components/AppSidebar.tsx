import { Lightbulb, Activity, Wifi, Cpu, LayoutDashboard, ToggleRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LogoutButton } from "./LogoutButton";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "switch control", url: "/led-control", icon: ToggleRight },
  { title: "Monitoring Sistem", url: "/monitoring", icon: Activity },
  { title: "Device Management", url: "/devices", icon: Cpu },
  { title: "Pengaturan Koneksi", url: "/settings", icon: Wifi },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-white/5 bg-black/5 backdrop-blur-md shadow-none will-change-[transform] z-[100] [&>div[data-sidebar=sidebar]]:bg-transparent"
    >
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          {open && (
            <SidebarGroupLabel className="text-lg font-bold text-primary px-4 py-6 mx-2 my-4 rounded-2xl bg-white/5 backdrop-blur-sm shadow-none border border-white/5 flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-primary">Six</span>
                <span className="text-muted-foreground">ity</span>
              </div>
              <SidebarTrigger className="h-6 w-6" />
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="rounded-xl bg-transparent border border-transparent hover:border-white/10 hover:bg-white/10 hover:backdrop-blur-sm transition-all duration-200 will-change-[transform] hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none"
                  >
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-4 py-3"
                      activeClassName="shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),inset_0_-2px_4px_rgba(255,255,255,0.2)] bg-primary/20 border-primary/30"
                    >
                      <item.icon className="h-5 w-5" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto px-4 py-4">
          <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-2">
            <LogoutButton showText={open} />
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
