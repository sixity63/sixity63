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
      collapsible="icon"
      className="border-r border-blue-200/20 bg-blue-50/10 md:backdrop-blur-md md:shadow-[0_8px_32px_rgba(31,38,135,0.37)] will-change-[transform]"
    >
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold text-primary px-4 py-6 mx-2 my-4 rounded-2xl bg-blue-100/20 md:backdrop-blur-sm md:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.1)] border border-blue-200/30">
            {open && (
              <span>
                <span className="text-primary">Six</span>
                <span className="text-muted-foreground">ity</span>
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="rounded-xl bg-blue-50/30 md:backdrop-blur-sm md:shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),inset_0_-1px_2px_rgba(0,0,0,0.1)] border border-blue-200/30 md:hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.15)] transition-transform duration-200 will-change-[transform] hover:scale-[1.02] active:scale-[0.98] hover:bg-blue-100/40 motion-reduce:transition-none"
                  >
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-4 py-3"
                      activeClassName="shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),inset_0_-1px_2px_rgba(255,255,255,0.1)] bg-gradient-to-br from-primary/10 to-primary/5"
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
          <div className="rounded-xl bg-gradient-to-br from-background to-background/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),inset_0_-1px_2px_rgba(0,0,0,0.1)] border border-border/20 p-2">
            <LogoutButton showText={open} />
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
