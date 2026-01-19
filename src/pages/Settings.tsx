import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, Save, Lock, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDevice } from "@/contexts/DeviceContext";

const BRIDGE_URL = import.meta.env.VITE_MQTT_BRIDGE_URL || 'http://localhost:3001';
const BRIDGE_API_KEY = import.meta.env.VITE_BRIDGE_API_KEY || '';

const Settings = () => {
  const { selectedDeviceId } = useDevice();
  const { theme, setTheme } = useTheme();
  const [wifiConfig, setWifiConfig] = useState({
    ssid: "",
    password: "",
  });
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableNetworks] = useState([
    { ssid: "MyWiFi", signal: "Strong", secured: true },
    { ssid: "GuestNetwork", signal: "Medium", secured: false },
    { ssid: "Office_WiFi", signal: "Weak", secured: true },
  ]);

  // Fetch user devices
  useEffect(() => {
    fetchDevices();
  }, [selectedDeviceId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('devices-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices'
        },
        (payload) => {
          console.log('Device change received:', payload);
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDevices(data || []);

      // Select device based on context or auto-select first device
      if (data && data.length > 0) {
        let deviceToSelect = null;
        if (selectedDeviceId) {
          deviceToSelect = data.find(d => d.id === selectedDeviceId) || data[0];
        } else {
          deviceToSelect = data[0];
        }

        if (deviceToSelect && (!selectedDevice || selectedDevice.id !== deviceToSelect.id)) {
          setSelectedDevice(deviceToSelect);
          setWifiConfig({
            ssid: deviceToSelect.wifi_ssid || "",
            password: deviceToSelect.wifi_password || "",
          });
          setIsConnected(!!deviceToSelect.last_seen &&
            new Date().getTime() - new Date(deviceToSelect.last_seen).getTime() < 60000);
        }
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Gagal memuat data perangkat');
    }
  };

  const handleSave = async () => {
    if (!wifiConfig.ssid) {
      toast.error("SSID tidak boleh kosong");
      return;
    }

    if (!selectedDevice) {
      toast.error("Pilih perangkat terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('devices')
        .update({
          wifi_ssid: wifiConfig.ssid,
          wifi_password: wifiConfig.password,
        })
        .eq('id', selectedDevice.id);

      if (error) throw error;

      // Try to notify device via MQTT bridge
      try {
        const macRaw = selectedDevice.mac_address || '';
        const mac = macRaw.replace(/:/g, '').toLowerCase();
        const res = await fetch(`${BRIDGE_URL}/api/device/${mac}/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(BRIDGE_API_KEY ? { 'X-API-KEY': BRIDGE_API_KEY } : {}),
          },
          body: JSON.stringify({
            wifi_ssid: wifiConfig.ssid,
            wifi_password: wifiConfig.password,
          }),
        });

        if (!res.ok) {
          console.warn('Bridge responded with non-OK', await res.text());
          toast.success("Konfigurasi WiFi berhasil disimpan pada server. Perangkat akan menerima konfigurasi saat bridge berhasil mengirim.");
        } else {
          toast.success("Konfigurasi WiFi berhasil disimpan dan dikirim ke perangkat.");
        }
      } catch (bridgeErr) {
        console.error('Bridge error', bridgeErr);
        toast.success("Konfigurasi WiFi berhasil disimpan pada server. Namun pengiriman ke perangkat gagal.");
      }
    } catch (error) {
      console.error('Error saving wifi config:', error);
      toast.error('Gagal menyimpan konfigurasi WiFi');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = () => {
    toast.success("Memindai jaringan WiFi...");
  };

  // Password change state and handler
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!passwordData.newPassword) {
      toast.error("Password baru tidak boleh kosong");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Password baru tidak cocok");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      // Password changed — Supabase may invalidate the current session.
      // Re-authenticate the user immediately with the new password to restore the session.
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userEmail = (userData && (userData as any).email) || null;
        if (userEmail) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: passwordData.newPassword,
          });
          if (signInError) {
            console.warn('Re-authenticate failed after password change:', signInError.message);
          }
        }
      } catch (reAuthErr) {
        console.warn('Error during re-authentication', reAuthErr);
      }

      toast.success("Password berhasil diubah");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error?.message || "Gagal mengubah password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">settings and connection</h2>
        <p className="text-muted-foreground text-sm">Konfigurasi koneksi WiFi untuk ESP32</p>
      </div>

      {devices.length === 0 && (
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Belum ada perangkat terdaftar. Silakan tambahkan perangkat di halaman Perangkat.
            </p>
          </CardContent>
        </Card>
      )}

      {devices.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="h-5 w-5 text-primary" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  Status Koneksi
                </CardTitle>
                <CardDescription>
                  {selectedDevice ? selectedDevice.name : 'Informasi koneksi saat ini'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-primary" : ""}>
                    {isConnected ? "Terhubung" : "Terputus"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Device:</span>
                  <span className="text-sm font-medium">{selectedDevice?.name || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">SSID:</span>
                  <span className="text-sm font-medium">{selectedDevice?.wifi_ssid || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">MAC Address:</span>
                  <span className="text-sm font-medium">{selectedDevice?.mac_address || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Terakhir Terlihat:</span>
                  <span className="text-sm font-medium">
                    {selectedDevice?.last_seen
                      ? new Date(selectedDevice.last_seen).toLocaleString('id-ID')
                      : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font bold">Jaringan Tersedia</CardTitle>
                    <CardDescription>Daftar WiFi yang terdeteksi</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleScan}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableNetworks.map((network, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => setWifiConfig({ ...wifiConfig, ssid: network.ssid })}
                    >
                      <div className="flex items-center gap-3">
                        <Wifi className={`h-4 w-4 ${network.signal === 'Strong' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-medium">{network.ssid}</p>
                          <p className="text-xs text-muted-foreground">{network.signal}</p>
                        </div>
                      </div>
                      {network.secured && (
                        <Badge variant="outline" className="text-xs">Secured</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl font bold">Konfigurasi WiFi</CardTitle>
              <CardDescription>Atur kredensial WiFi untuk ESP32</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="ssid">SSID (Nama WiFi)</Label>
                  <Input
                    id="ssid"
                    placeholder="Masukkan nama WiFi"
                    value={wifiConfig.ssid}
                    onChange={(e) => setWifiConfig({ ...wifiConfig, ssid: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password WiFi"
                    value={wifiConfig.password}
                    onChange={(e) => setWifiConfig({ ...wifiConfig, password: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full md:w-auto bg-primary hover:bg-primary/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Menyimpan..." : "Simpan Konfigurasi"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Moon className="h-5 w-5" />
                Tampilan Aplikasi
              </CardTitle>
              <CardDescription>Sesuaikan tema aplikasi (Gelap/Terang)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="w-full justify-start md:justify-center"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Terang
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="w-full justify-start md:justify-center"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Gelap
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Lock className="h-5 w-5" />
                Ganti Password
              </CardTitle>
              <CardDescription>Ubah password akun Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Masukkan password baru"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Ulangi password baru"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  className="w-full md:w-auto bg-primary hover:bg-primary/90"
                  disabled={isChangingPassword}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  {isChangingPassword ? "Mengubah..." : "Ubah Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Settings;
