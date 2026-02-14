import { useState, useEffect } from "react";
import { Wifi, WifiOff, Save, Lock, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDevice } from "@/contexts/DeviceContext";
import { useAuth } from "@/hooks/useAuth";
import ImageCropper from "@/components/ImageCropper";

const BRIDGE_URL = import.meta.env.VITE_MQTT_BRIDGE_URL || 'http://localhost:3001';
const BRIDGE_API_KEY = import.meta.env.VITE_BRIDGE_API_KEY || '';

const Settings = () => {
  const { user } = useAuth();
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


  // Profile Picture State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Crop Modal State (New)
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Helper: Resize Image to avoid large DB payload
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to base64 string, JPEG quality 0.7
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };

      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    // Load saved image from Supabase Profiles
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles' as any)
            .select('avatar_url')
            .eq('id', user.id)
            .single();

          if ((data as any)?.avatar_url) {
            const remoteUrl = (data as any).avatar_url;
            setPreviewImage(remoteUrl);
            // Backup to localstorage for faster initial load next time
            localStorage.setItem(`user_profile_image_${user.id}`, remoteUrl);
          } else {
            console.log('No profile found or error', error);
            // Fallback to local
            const local = localStorage.getItem(`user_profile_image_${user.id}`);
            if (local) setPreviewImage(local);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Allow up to 5MB input, we will resize it anyway
        toast.error("Ukuran file terlalu besar (Max 5MB)");
        return;
      }

      // Read file as DataURL and open cropper
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropSrc(reader.result as string);
        setCropOpen(true);
        // Reset input value so same file can be selected again
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBase64: string) => {
    setPreviewImage(croppedBase64);
    // We also need a File object if we were uploading raw file,
    // but here we upload base64 string directly so just setting previewImage is enough to prepare for Save.
    // However, check existing handleSaveProfile logic: it uses previewImage. So we represent!
    // But we should confirm `imageFile` state is not blocking the Save button.
    // The current Save button logic is: `disabled={!imageFile}`.
    // We need to update that logic or set a dummy file object.
    // Better: Update Save button disabled logic to checking `previewImage` or a new `isDirty` flag.
    // For now, let's create a dummy file just to satisfy the check if needed, or update the check.
    // Let's check handleSaveProfile logic... it checks `previewImage`.
    // But the BUTTON in JSX checks `!imageFile`.
    // So we MUST set imageFile to something truthy to enable the button.
    setImageFile(new File(["cropped"], "profile.jpg", { type: "image/jpeg" }));
  };

  const handleSaveProfile = async () => {
    if (previewImage && user?.id) {
      setLoading(true);

      // 1. Simpan ke LocalStorage (Pasti Berhasil)
      localStorage.setItem(`user_profile_image_${user.id}`, previewImage);

      // 2. Coba Simpan ke Supabase Cloud
      let cloudSuccess = false;
      try {
        const updates = {
          id: user.id,
          avatar_url: previewImage,
          updated_at: new Date(),
        };

        const { error } = await supabase
          .from('profiles' as any)
          .upsert(updates);

        if (error) {
          console.warn("Cloud sync failed", error);
          toast.warning(`Gagal Sync Cloud: ${error.message}`);
        } else {
          cloudSuccess = true;
        }
      } catch (err: any) {
        console.warn("Cloud sync error", err);
        toast.warning(`Error Cloud: ${err.message}`);
      }

      // 3. Update UI
      window.dispatchEvent(new Event('profile-updated'));
      if (cloudSuccess) toast.success("Foto profil tersimpan dan tersinkronisasi!");
      else toast.info("Foto tersimpan lokal (Cloud bermasalah).");

      setImageFile(null);
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (user?.id) {
      setLoading(true);

      // 1. Hapus di LocalStorage (Pasti Berhasil)
      localStorage.removeItem(`user_profile_image_${user.id}`);
      setPreviewImage(null);
      setImageFile(null);

      // 2. Coba Hapus di Supabase Cloud (Hapus baris data sepenuhnya)
      try {
        const { error } = await supabase
          .from('profiles' as any)
          .delete()
          .eq('id', user.id);

        if (error) {
          console.warn("Cloud delete failed", error);
        }
      } catch (err: any) {
        console.warn("Cloud delete error", err);
      }

      // 3. Update UI
      window.dispatchEvent(new Event('profile-updated'));
      toast.success("Foto profil dihapus.");
      setLoading(false);
    }
  };

  // Fetch user devices
  useEffect(() => {
    fetchDevices();
  }, [selectedDeviceId]);

  // Subscribe to realtime updates
  useEffect(() => {
    // 1. Listen to device changes (configuration updates, etc)
    const deviceChannel = supabase
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

    // 2. Listen to sensor_data untuk status online
    const sensorChannel = supabase
      .channel('settings-sensor-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data' },
        (payload: any) => {
          if (payload.new && selectedDevice && payload.new.device_id === selectedDevice.id) {
            setIsConnected(true);
            setSelectedDevice((prev: any) => ({
              ...prev,
              last_seen: payload.new.created_at || new Date().toISOString()
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deviceChannel);
      supabase.removeChannel(sensorChannel);
    };
  }, [selectedDevice]); // Re-subscribe if selectedDevice changes

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
            new Date().getTime() - new Date(deviceToSelect.last_seen).getTime() < 120000); // 2 minutes
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

      // Kirim ke perangkat via MQTT bridge (jika berjalan)
      try {
        const macRaw = selectedDevice.mac_address || '';
        const mac = macRaw.replace(/:/g, '').toLowerCase();
        if (!mac) {
          toast.success("Konfigurasi WiFi berhasil disimpan. Isi MAC address perangkat di halaman Devices agar bisa dikirim via bridge.");
          return;
        }
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (BRIDGE_API_KEY) headers['X-API-KEY'] = BRIDGE_API_KEY;

        const res = await fetch(`${BRIDGE_URL}/api/device/${mac}/config`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            wifi_ssid: wifiConfig.ssid,
            wifi_password: wifiConfig.password,
          }),
        });

        if (res.ok) {
          toast.success("Konfigurasi WiFi berhasil disimpan dan dikirim ke perangkat.");
        } else if (res.status === 401) {
          toast.success("Konfigurasi WiFi berhasil disimpan. Agar dikirim ke perangkat: set VITE_BRIDGE_API_KEY di .env (sama dengan BRIDGE_API_KEY di server) dan jalankan MQTT bridge.");
        } else {
          toast.success("Konfigurasi WiFi berhasil disimpan. Bridge mengembalikan error—pastikan MQTT broker dan bridge berjalan.");
        }
      } catch (bridgeErr) {
        console.error('Bridge error', bridgeErr);
        toast.success("Konfigurasi WiFi berhasil disimpan. Untuk kirim ke perangkat: jalankan server bridge (folder server/) dan set VITE_MQTT_BRIDGE_URL di .env ke URL bridge.");
      }
    } catch (error) {
      console.error('Error saving wifi config:', error);
      toast.error('Gagal menyimpan konfigurasi WiFi');
    } finally {
      setLoading(false);
    }
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
        <Card className="border-border bg-card/50 dark:bg-transparent dark:border-white/10">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Belum ada perangkat terdaftar. Silakan tambahkan perangkat di halaman Perangkat.
            </p>
          </CardContent>
        </Card>
      )}

      {devices.length > 0 && (
        <>
          <Card className="border-border bg-card/50 dark:bg-transparent dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">U</div>
                Profil Pengguna
              </CardTitle>
              <CardDescription>Sesuaikan foto profil Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary">
                    {previewImage ? (
                      <img src={previewImage} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        No Img
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="picture">Foto Profil</Label>
                    <Input
                      id="picture"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: JPG, PNG. Ukuran maksimal 3MB.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} disabled={!imageFile} size="sm">
                      Simpan Foto
                    </Button>
                    {previewImage && (
                      <Button onClick={handleDeleteProfile} variant="destructive" size="sm">
                        Hapus Foto
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 dark:bg-transparent dark:border-white/10">
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

          <Card className="border-border bg-card/50 dark:bg-transparent dark:border-white/10">
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

          <Card className="border-border bg-card/50 dark:bg-transparent dark:border-white/10">
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

          <Card className="border-border bg-card/50 dark:bg-transparent dark:border-white/10">
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

      {/* Image Cropper Modal */}
      <ImageCropper
        open={cropOpen}
        imageSrc={cropSrc}
        onClose={() => setCropOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default Settings;
