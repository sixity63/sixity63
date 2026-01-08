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

  const fetchLEDs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('led_configs')
        .select(`
          *,
          devices!inner(user_id)
        `)
        .eq('devices.user_id', user.id)
        .order('created_at', { ascending: false });

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
      toast.error('Gagal memuat daftar LED');
    } finally {
      setLoading(false);
    }
  };

  const toggleLED = async (id: string) => {
    if (!user) {
      toast.error("User tidak terautentikasi");
      return;
    }
    const led = leds.find(l => l.id === id);
    if (!led) return;

    try {
      const { error } = await supabase
        .from('led_configs')
        .update({ is_active: !led.active })
        .eq('id', id);

      if (error) throw error;

      setLeds(leds.map(l =>
        l.id === id ? { ...l, active: !l.active } : l
      ));
      toast.success("Status LED berhasil diubah");
    } catch (error) {
      console.error('Error toggling LED:', error);
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

  const LEDFormFields = ({ 
    formData, 
    setFormData, 
    showDeviceSelect = true 
  }: { 
    formData: LEDFormData; 
    setFormData: (data: LEDFormData) => void;
    showDeviceSelect?: boolean;
  }) => (
    <div className="grid gap-6 py-4">
      {showDeviceSelect && (
        <div className="grid gap-2">
          <Label htmlFor="device">Device ESP32</Label>
          <Select 
            value={formData.device_id} 
            onValueChange={(value) => setFormData({ ...formData, device_id: value })}
          >
            <SelectTrigger>
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
        <Label htmlFor="name">Nama LED</Label>
        <Input
          id="name"
          placeholder="Contoh: LED Taman"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pin">Pin GPIO (3-35)</Label>
        <Input
          id="pin"
          type="number"
          min="3"
          max="35"
          value={formData.pin}
          onChange={(e) => setFormData({ ...formData, pin: parseInt(e.target.value) })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="schedule">Tipe Jadwal</Label>
        <Select 
          value={formData.schedule} 
          onValueChange={(value: "daily" | "weekly" | "monthly") => 
            setFormData({ ...formData, schedule: value })
          }
        >
          <SelectTrigger>
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
        <Label htmlFor="mode">Mode Kontrol</Label>
        <Select 
          value={formData.mode} 
          onValueChange={(value: "manual" | "auto") => 
            setFormData({ ...formData, mode: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="auto">Otomatis (Jadwal)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Manual: Kontrol manual via tombol. Otomatis: LED aktif/nonaktif sesuai jadwal waktu.
        </p>
      </div>
      {formData.mode === 'auto' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="startTime">Waktu Mulai</Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endTime">Waktu Selesai</Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );

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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Tambah switch Baru</DialogTitle>
              <DialogDescription>
                Konfigurasi switch baru dengan pin dan jadwal yang diinginkan
              </DialogDescription>
            </DialogHeader>
            <LEDFormFields formData={newLED} setFormData={setNewLED} />
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit switch</DialogTitle>
            <DialogDescription>
              Ubah konfigurasi switch: pin, jadwal, dan waktu operasi
            </DialogDescription>
          </DialogHeader>
          <LEDFormFields formData={editFormData} setFormData={setEditFormData} />
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {leds.map((led) => (
            <Card key={led.id} className="relative overflow-hidden transition-all hover:shadow-lg border-2">
              <div className={`absolute top-0 left-0 right-0 h-2 ${led.active ? 'bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_2px_4px_rgba(59,130,246,0.4)]' : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3)]'}`} />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{led.name}</CardTitle>
                  <Switch
                    checked={led.active}
                    onCheckedChange={() => toggleLED(led.id)}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>
                <CardDescription>
                  Device: {getDeviceName(led.device_id)}
                </CardDescription>
                <CardDescription>Pin GPIO: {led.pin}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-300">
                  <Power className={`h-5 w-5 ${led.active ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-xs text-muted-foreground">
                      {led.active ? "Aktif" : "Nonaktif"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-300">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Mode</p>
                    <p className="text-xs text-muted-foreground">
                      {led.mode === 'auto' ? 'Otomatis (Jadwal)' : 'Manual'}
                    </p>
                  </div>
                </div>

                {led.mode === 'auto' && (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-300">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Jadwal</p>
                        <p className="text-xs text-muted-foreground capitalize">{led.schedule}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-300">
                      <Clock className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Waktu Operasi</p>
                        <p className="text-xs text-muted-foreground">
                          {led.active_time} - {led.inactive_time}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEditDialog(led)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => deleteLED(led.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
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
