import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Copy, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Device {
  id: string;
  name: string;
  mac_address: string;
  last_seen: string | null;
  wifi_ssid: string | null;
  created_at: string;
}

const Devices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [macAddress, setMacAddress] = useState('');

  const fetchDevices = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: devicesData, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Gagal memuat devices');
    } else if (devicesData) {
      // Check latest sensor data for each device to verify real online status
      const devicesWithStatus = await Promise.all(devicesData.map(async (device) => {
        const { data: sensorData } = await supabase
          .from('sensor_data')
          .select('created_at')
          .eq('device_id', device.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sensorData?.created_at) {
          const st = new Date(sensorData.created_at).getTime();
          const dt = device.last_seen ? new Date(device.last_seen).getTime() : 0;
          if (st > dt) return { ...device, last_seen: sensorData.created_at };
        }
        return device;
      }));

      setDevices(devicesWithStatus);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();

    const channel = supabase
      .channel('devices-changes-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
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

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('devices')
      .insert([
        {
          name: deviceName,
          mac_address: macAddress,
          user_id: user.id
        }
      ]);

    if (error) {
      toast.error('Gagal menambahkan device');
    } else {
      toast.success('Device berhasil ditambahkan!');
      setDeviceName('');
      setMacAddress('');
      setOpen(false);
      fetchDevices();
    }
  };

  const handleDeleteDevice = async (id: string) => {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Gagal menghapus device');
    } else {
      toast.success('Device berhasil dihapus');
      fetchDevices();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Device ID disalin!');
  };

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 10000; // Online jika update dalam 10 detik
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-2xl md:text-3xl font-bold">Device Management</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Kelola ESP32 devices Anda</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="self-end sm:self-auto">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Tambah Device</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddDevice}>
              <DialogHeader>
                <DialogTitle>Tambah Device Baru</DialogTitle>
                <DialogDescription>
                  Masukkan informasi ESP32 device Anda
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Device</Label>
                  <Input
                    id="name"
                    placeholder="ESP32 Ruang Tamu"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mac">MAC Address</Label>
                  <Input
                    id="mac"
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={macAddress}
                    onChange={(e) => setMacAddress(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Tambah Device</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              Belum ada device. Tambahkan device pertama Anda!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <Card key={device.id}>
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      <span className="break-words">{device.name}</span>
                      {isOnline(device.last_seen) ? (
                        <Badge variant="default" className="gap-1 flex-shrink-0">
                          <Wifi className="h-3 w-3" />
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 flex-shrink-0">
                          <WifiOff className="h-3 w-3" />
                          Offline
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="break-all">{device.mac_address}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDevice(device.id)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Device ID</Label>
                  <div className="flex gap-2">
                    <Input
                      value={device.id}
                      readOnly
                      className="font-mono text-xs flex-1 min-w-0"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(device.id)}
                      className="flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Salin ID ini ke ESP32 code
                  </p>
                </div>
                {device.wifi_ssid && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">WiFi SSID</Label>
                    <p className="text-sm">{device.wifi_ssid}</p>
                  </div>
                )}
                {device.last_seen && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Last Seen</Label>
                    <p className="text-sm">
                      {new Date(device.last_seen).toLocaleString('id-ID')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Devices;
