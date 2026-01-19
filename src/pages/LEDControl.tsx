import { useState, useEffect } from "react";
import { Plus, Power, Trash2, Calendar, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LED {
  id: string;
  device_id: string;
  name: string;
  pin: number;
  active: boolean;
  schedule: string;
  active_time: string;
  inactive_time: string;
  mode: 'manual' | 'auto';
}

interface Device {
  id: string;
  name: string;
  mac_address: string;
}

interface LEDFormData {
  name: string;
  pin: number;
  device_id: string;
  schedule: "daily" | "weekly" | "monthly";
  startTime: string;
  endTime: string;
  mode: 'manual' | 'auto';
}

const LEDFormFields = ({
  formData,
  setFormData,
  devices,
  showDeviceSelect = true
}: {
  formData: LEDFormData;
  setFormData: (data: LEDFormData) => void;
  devices: Device[];
  showDeviceSelect?: boolean;
}) => (
  <div className="grid gap-6 py-4">
    {showDeviceSelect && (
      <div className="grid gap-2">
        <Label htmlFor="device" className="text-foreground/80">Device ESP32</Label>
        <Select
          value={formData.device_id}
          onValueChange={(value) => setFormData({ ...formData, device_id: value })}
        >
          <SelectTrigger className="bg-white/10 border-white/20">
            <SelectValue placeholder="Pilih device" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((device) => (
              <SelectItem key={device.id} value={device.id}>
                {device.name} ({device.mac_address})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
    <div className="grid gap-2">
      <Label htmlFor="name" className="text-foreground/80">Nama LED</Label>
      <Input
        id="name"
        placeholder="Contoh: LED Taman"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="bg-white/10 border-white/20"
      />
    </div>
    <div className="grid gap-2">
      <Label htmlFor="pin" className="text-foreground/80">Pin GPIO (3-35)</Label>
      <Input
        id="pin"
        type="number"
        min="3"
        max="35"
        value={formData.pin}
        onChange={(e) => setFormData({ ...formData, pin: parseInt(e.target.value) })}
        className="bg-white/10 border-white/20"
      />
    </div>
    <div className="grid gap-2">
      <Label htmlFor="schedule" className="text-foreground/80">Tipe Jadwal</Label>
      <Select
        value={formData.schedule}
        onValueChange={(value: "daily" | "weekly" | "monthly") =>
          setFormData({ ...formData, schedule: value })
        }
      >
        <SelectTrigger className="bg-white/10 border-white/20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Harian</SelectItem>
          <SelectItem value="weekly">Mingguan</SelectItem>
          <SelectItem value="monthly">Bulanan</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="grid gap-2">
      <Label htmlFor="mode" className="text-foreground/80">Mode Kontrol</Label>
      <Select
        value={formData.mode}
        onValueChange={(value: "manual" | "auto") =>
          setFormData({ ...formData, mode: value })
        }
      >
        <SelectTrigger className="bg-white/10 border-white/20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">Manual</SelectItem>
          <SelectItem value="auto">Otomatis (Jadwal)</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground opacity-70">
        Manual: Kontrol manual via tombol. Otomatis: LED aktif/nonaktif sesuai jadwal waktu.
      </p>
    </div>
    {formData.mode === 'auto' && (
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="startTime" className="text-foreground/80">Mulai</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="bg-white/10 border-white/20"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endTime" className="text-foreground/80">Selesai</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="bg-white/10 border-white/20"
          />
        </div>
      </div>
    )}
  </div>
);

const LEDControl = () => {
  const { user } = useAuth();
  const [leds, setLeds] = useState<LED[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLED, setEditingLED] = useState<LED | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultFormData: LEDFormData = {
    name: "",
    pin: 5,
    device_id: "",
    schedule: "daily",
    startTime: "06:00",
    endTime: "18:00",
    mode: 'manual'
  };

  const [newLED, setNewLED] = useState<LEDFormData>(defaultFormData);
  const [editFormData, setEditFormData] = useState<LEDFormData>(defaultFormData);

  useEffect(() => {
    if (user) {
      fetchDevices();
      fetchLEDs();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time changes for led_configs
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'led_configs',
        },
        () => {
          // Re-fetch LEDs to sync across all devices silently
          fetchLEDs(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Frontend Schedule Checker: Runs every second for real-time accuracy
  useEffect(() => {
    if (!user || leds.length === 0) return;

    const checkSchedules = async () => {
      const now = new Date();
      // Format to HH:mm for comparison
      const currentTimeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      for (const led of leds) {
        if (led.mode !== 'auto') continue;

        const { active_time, inactive_time, active: currentStatus } = led;

        // Ensure we only compare HH:mm parts
        const startTime = active_time?.substring(0, 5);
        const endTime = inactive_time?.substring(0, 5);

        if (!startTime || !endTime) continue;

        let shouldBeActive = false;

        if (startTime <= endTime) {
          // Normal case: e.g., 08:00 to 18:00
          shouldBeActive = currentTimeString >= startTime && currentTimeString < endTime;
        } else {
          // Overnight case: e.g., 22:00 to 06:00
          shouldBeActive = currentTimeString >= startTime || currentTimeString < endTime;
        }

        if (shouldBeActive !== currentStatus) {
          console.log(`[Realtime Schedule] Updating LED ${led.name} to ${shouldBeActive ? 'ON' : 'OFF'}`);
          try {
            const { error } = await supabase
              .from('led_configs')
              .update({ is_active: shouldBeActive })
              .eq('id', led.id);

            if (error) throw error;
          } catch (err) {
            console.error('Failed to auto-toggle LED:', err);
          }
        }
      }
    };

    // Initial check
    checkSchedules();

    const interval = setInterval(checkSchedules, 1000); // Check every 1 second
    return () => clearInterval(interval);
  }, [user, leds]);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Gagal memuat daftar device');
    }
  };

  const fetchLEDs = async (silent = false) => {
    if (!user) return;

    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from('led_configs')
        .select(`
          *,
          devices!inner(user_id)
        `)
        .eq('devices.user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLeds(data?.map(led => ({
        id: led.id,
        device_id: led.device_id,
        name: led.name,
        pin: led.pin,
        active: led.is_active || false,
        schedule: led.schedule,
        active_time: led.active_time || "06:00",
        inactive_time: led.inactive_time || "18:00",
        mode: (led.mode as 'manual' | 'auto') || 'manual'
      })) || []);
    } catch (error) {
      console.error('Error fetching LEDs:', error);
      if (!silent) toast.error('Gagal memuat daftar LED');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const toggleLED = async (id: string) => {
    if (!user) {
      toast.error("User tidak terautentikasi");
      return;
    }
    const led = leds.find(l => l.id === id);
    if (!led) return;

    const originalActive = led.active;
    const newActiveState = !originalActive;

    // Optimistic update - update UI immediately
    setLeds(prevLeds => prevLeds.map(l =>
      l.id === id ? { ...l, active: newActiveState } : l
    ));

    try {
      const { error } = await supabase
        .from('led_configs')
        .update({ is_active: newActiveState })
        .eq('id', id);

      if (error) {
        // Revert on error
        setLeds(prevLeds => prevLeds.map(l =>
          l.id === id ? { ...l, active: originalActive } : l
        ));
        throw error;
      }

      toast.success("Status LED berhasil diubah");
    } catch (error) {
      console.error('Error toggling LED:', error);
      // Ensure revert on unexpected errors
      setLeds(prevLeds => prevLeds.map(l =>
        l.id === id ? { ...l, active: originalActive } : l
      ));
      toast.error("Gagal mengubah status LED");
    }
  };

  const deleteLED = async (id: string) => {
    try {
      const { error } = await supabase
        .from('led_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLeds(leds.filter(led => led.id !== id));
      toast.success("LED berhasil dihapus");
    } catch (error) {
      console.error('Error deleting LED:', error);
      toast.error("Gagal menghapus LED");
    }
  };

  const addLED = async () => {
    if (!user) {
      toast.error("User tidak terautentikasi");
      return;
    }
    if (!newLED.name) {
      toast.error("Nama LED harus diisi");
      return;
    }
    if (!newLED.device_id) {
      toast.error("Pilih device terlebih dahulu");
      return;
    }

    // Validation for duplicate Name or Pin
    const isNameDuplicate = leds.some(led =>
      led.name.toLowerCase() === newLED.name.toLowerCase() && led.device_id === newLED.device_id
    );
    const isPinDuplicate = leds.some(led =>
      led.pin === newLED.pin && led.device_id === newLED.device_id
    );

    if (isNameDuplicate) {
      toast.error(`Nama "${newLED.name}" sudah digunakan pada device ini`);
      return;
    }
    if (isPinDuplicate) {
      toast.error(`Pin GPIO ${newLED.pin} sudah digunakan pada device ini`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('led_configs')
        .insert({
          device_id: newLED.device_id,
          name: newLED.name,
          pin: newLED.pin,
          schedule: newLED.schedule,
          active_time: newLED.startTime,
          inactive_time: newLED.endTime,
          is_active: false,
          mode: newLED.mode
        })
        .select()
        .single();

      if (error) throw error;

      await fetchLEDs();
      setNewLED(defaultFormData);
      setIsAddDialogOpen(false);
      toast.success("LED berhasil ditambahkan");
    } catch (error) {
      console.error('Error adding LED:', error);
      toast.error("Gagal menambahkan LED");
    }
  };

  const openEditDialog = (led: LED) => {
    setEditingLED(led);
    setEditFormData({
      name: led.name,
      pin: led.pin,
      device_id: led.device_id,
      schedule: led.schedule as "daily" | "weekly" | "monthly",
      startTime: led.active_time,
      endTime: led.inactive_time,
      mode: led.mode
    });
    setIsEditDialogOpen(true);
  };

  const updateLED = async () => {
    if (!editingLED) return;

    if (!editFormData.name) {
      toast.error("Nama LED harus diisi");
      return;
    }
    if (!editFormData.device_id) {
      toast.error("Pilih device terlebih dahulu");
      return;
    }

    // Validation for duplicate Name or Pin (excluding the current LED being edited)
    const isNameDuplicate = leds.some(led =>
      led.id !== editingLED.id &&
      led.name.toLowerCase() === editFormData.name.toLowerCase() &&
      led.device_id === editFormData.device_id
    );
    const isPinDuplicate = leds.some(led =>
      led.id !== editingLED.id &&
      led.pin === editFormData.pin &&
      led.device_id === editFormData.device_id
    );

    if (isNameDuplicate) {
      toast.error(`Nama "${editFormData.name}" sudah digunakan pada device ini`);
      return;
    }
    if (isPinDuplicate) {
      toast.error(`Pin GPIO ${editFormData.pin} sudah digunakan pada device ini`);
      return;
    }

    try {
      const { error } = await supabase
        .from('led_configs')
        .update({
          device_id: editFormData.device_id,
          name: editFormData.name,
          pin: editFormData.pin,
          schedule: editFormData.schedule,
          active_time: editFormData.startTime,
          inactive_time: editFormData.endTime,
          mode: editFormData.mode
        })
        .eq('id', editingLED.id);

      if (error) throw error;

      await fetchLEDs();
      setIsEditDialogOpen(false);
      setEditingLED(null);
      toast.success("LED berhasil diperbarui");
    } catch (error) {
      console.error('Error updating LED:', error);
      toast.error("Gagal memperbarui LED");
    }
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device?.name || "Unknown Device";
  };



  return (
    <div className="space-y-9">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Controller</h2>
          <p className="text-muted-foreground text-sm">Kelola dan kontrol rumah Anda</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
              <Plus className="mr-1 h-4 w-4" />
              switch
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[92%] max-w-[400px] sm:max-w-[500px] bg-card/70 backdrop-blur-2xl border-white/20 rounded-3xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Tambah switch Baru</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Konfigurasi switch baru dengan pin dan jadwal yang diinginkan
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto px-1">
              <LEDFormFields formData={newLED} setFormData={setNewLED} devices={devices} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={addLED} className="bg-primary hover:bg-primary/90">
                Simpan switch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[92%] max-w-[400px] sm:max-w-[500px] bg-card/70 backdrop-blur-2xl border-white/20 rounded-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit switch</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Ubah konfigurasi switch: pin, jadwal, dan waktu operasi
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-1">
            <LEDFormFields formData={editFormData} setFormData={setEditFormData} devices={devices} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={updateLED} className="bg-primary hover:bg-primary/90">
              Simpan Perubahan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading switch configurations...
        </div>
      ) : devices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Belum ada device terdaftar. Tambahkan device terlebih dahulu di halaman Device Management.
            </p>
          </CardContent>
        </Card>
      ) : leds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Belum ada switch terkonfigurasi. Klik tombol "add switch" untuk memulai.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap justify-start gap-3 sm:gap-6">
          {leds.map((led) => (
            <Card key={led.id} className="relative overflow-hidden transition-all hover:shadow-lg border-2 border-white/10 bg-card/40 backdrop-blur-xl w-[calc(50%-0.4rem)] sm:w-full max-w-none sm:max-w-[80mm] group">
              <div className={`absolute top-0 left-0 right-0 h-2 ${led.active ? 'bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_2px_4px_rgba(59,130,246,0.4)]' : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3)]'}`} />
              <CardHeader className="p-2 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-1">
                    <CardTitle className="text-sm sm:text-xl truncate font-bold">{led.name}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-sm truncate opacity-70">
                      {getDeviceName(led.device_id)}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Switch
                      checked={led.active}
                      onCheckedChange={() => toggleLED(led.id)}
                      className="data-[state=checked]:bg-blue-500 scale-75 sm:scale-100"
                    />
                    <div className="flex items-center gap-1 opacity-80">
                      <Power className={`h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 ${led.active ? 'text-blue-500' : 'text-gray-400'}`} />
                      <span className="text-[8px] sm:text-[10px] font-semibold">{led.active ? "ON" : "OFF"}</span>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-[10px] sm:text-sm opacity-70">Pin: {led.pin}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-4 p-2 sm:p-6 pt-0 sm:pt-0">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                  {/* Mode Slot - Always Visible */}
                  <div className="flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-3 bg-white/5 dark:bg-black/20 rounded-lg sm:rounded-xl border border-white/5">
                    <Calendar className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] sm:text-[10px] font-medium opacity-70">Mode</p>
                      <p className="text-[9px] sm:text-xs font-bold truncate uppercase">{led.mode === 'auto' ? 'Auto' : 'Man'}</p>
                    </div>
                  </div>

                  {/* Jadwal Slot - Always Visible, Inactive if Manual */}
                  <div className={`flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-3 bg-white/5 dark:bg-black/20 rounded-lg sm:rounded-xl border border-white/5 transition-opacity ${led.mode !== 'auto' ? 'opacity-40' : 'opacity-100'}`}>
                    <Calendar className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] sm:text-[10px] font-medium opacity-70">Jadwal</p>
                      <p className="text-[8px] sm:text-xs font-bold capitalize whitespace-nowrap">{led.mode === 'auto' ? led.schedule : 'Inactive'}</p>
                    </div>
                  </div>

                  {/* Waktu Operasi Slot - Always Visible, Inactive if Manual */}
                  <div className={`col-span-2 flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-3 bg-white/5 dark:bg-black/20 rounded-lg sm:rounded-xl border border-white/5 transition-opacity ${led.mode !== 'auto' ? 'opacity-40' : 'opacity-100'}`}>
                    <Clock className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] sm:text-[10px] font-medium opacity-70">Waktu Operasi</p>
                      <p className="text-[9px] sm:text-xs font-bold truncate">
                        {led.mode === 'auto' ? `${led.active_time} - ${led.inactive_time}` : 'Timer Inactive'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 sm:gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 h-7 sm:h-9 px-0 sm:px-4 text-[10px] sm:text-xs border-white/10"
                    onClick={() => openEditDialog(led)}
                  >
                    <Pencil className="h-3 w-3 sm:mr-2 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 h-7 sm:h-9 px-0 sm:px-4 text-[10px] sm:text-xs"
                    onClick={() => deleteLED(led.id)}
                  >
                    <Trash2 className="h-3 w-3 sm:mr-2 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Hapus</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LEDControl;
