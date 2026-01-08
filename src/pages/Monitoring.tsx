import { useState, useEffect } from "react";
import { Thermometer, Droplets, Wind, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/contexts/DeviceContext";
import InteractiveChart from "@/components/InteractiveChart";

const Monitoring = () => {
  const [timeRange, setTimeRange] = useState("24");
  const [sensorData, setSensorData] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const { selectedDeviceId, setSelectedDeviceId } = useDevice();
  const selectedDevice = selectedDeviceId;
  const setSelectedDevice = setSelectedDeviceId;
  const { toast } = useToast();

  const currentData = sensorData.length > 0 ? {
    temperature: sensorData[sensorData.length - 1]?.temperature || 0,
    soilHumidity: sensorData[sensorData.length - 1]?.soil_humidity || 0,
    airHumidity: sensorData[sensorData.length - 1]?.air_humidity || 0,
    tds: sensorData[sensorData.length - 1]?.tds || 0,
  } : {
    temperature: 0,
    soilHumidity: 0,
    airHumidity: 0,
    tds: 0,
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchSensorData();

      // Setup polling (fallback for realtime)
      const fetchLatest = async () => {
        const { data } = await supabase
          .from('sensor_data')
          .select('*')
          .eq('device_id', selectedDevice)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          setSensorData((prevData) => {
            const lastData = prevData[prevData.length - 1];
            // Only add if it's newer than what we have
            if (!lastData || new Date(data.created_at).getTime() > new Date(lastData.created_at).getTime()) {
              return [...prevData, data];
            }
            return prevData;
          });
        }
      };

      const intervalId = setInterval(fetchLatest, 5000);

      // Setup realtime subscription
      const channel = supabase
        .channel('sensor-data-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_data',
            filter: `device_id=eq.${selectedDevice}`
          },
          (payload) => {
            console.log('New sensor data received:', payload);
            // Add new data to the existing array
            setSensorData((prevData) => [...prevData, payload.new]);
          }
        )
        .subscribe();

      return () => {
        clearInterval(intervalId);
        supabase.removeChannel(channel);
      };
    }
  }, [selectedDevice, timeRange]);

  const fetchDevices = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengambil daftar device",
        variant: "destructive",
      });
      return;
    }

    if (data && data.length > 0) {
      setDevices(data);
      // Only auto-select if no device is selected yet
      if (!selectedDeviceId) {
        setSelectedDevice(data[0].id);
      }
    }
  };

  const fetchSensorData = async () => {
    if (!selectedDevice) return;

    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - parseInt(timeRange));

    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('device_id', selectedDevice)
      .gte('created_at', hoursAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengambil data sensor",
        variant: "destructive",
      });
      return;
    }

    setSensorData(data || []);
  };

  const chartData = sensorData.map(item => {
    const date = new Date(item.created_at);
    return {
      time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      fullTime: date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      timestamp: date.getTime(),
      temperature: item.temperature,
      soilHumidity: item.soil_humidity,
      airHumidity: item.air_humidity,
      tds: item.tds,
    };
  });

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Monitoring Sistem</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Pantau kondisi lingkungan secara real-time</p>
        </div>
        {devices.length > 0 && (
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Pilih device" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {sensorData.length === 0 && (
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {devices.length === 0
                ? "Belum ada device terdaftar. Silakan daftarkan device ESP32 Anda terlebih dahulu."
                : "Belum ada data sensor. Pastikan ESP32 sudah mengirim data ke cloud."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border hover:shadow-lg transition-shadow bg-gradient-to-br from-card to-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suhu Ruangan</CardTitle>
            <Thermometer className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{currentData.temperature}°C</div>
            <p className="text-xs text-muted-foreground mt-1">Kondisi normal</p>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg transition-shadow bg-gradient-to-br from-card to-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kelembapan Tanah</CardTitle>
            <Droplets className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{currentData.soilHumidity}%</div>
            <p className="text-xs text-muted-foreground mt-1">Lembap optimal</p>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg transition-shadow bg-gradient-to-br from-card to-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kelembapan Udara</CardTitle>
            <Wind className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{currentData.airHumidity}%</div>
            <p className="text-xs text-muted-foreground mt-1">Udara segar</p>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg transition-shadow bg-gradient-to-br from-card to-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TDS Meter</CardTitle>
            <Gauge className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{currentData.tds} ppm</div>
            <p className="text-xs text-muted-foreground mt-1">Kualitas air baik</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Grafik Suhu & Kelembapan</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Zoom in/out dan geser untuk melihat data historis</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Jam Terakhir</SelectItem>
                <SelectItem value="2">2 Jam Terakhir</SelectItem>
                <SelectItem value="3">3 Jam Terakhir</SelectItem>
                <SelectItem value="4">4 Jam Terakhir</SelectItem>
                <SelectItem value="5">5 Jam Terakhir</SelectItem>
                <SelectItem value="6">6 Jam Terakhir</SelectItem>
                <SelectItem value="12">12 Jam Terakhir</SelectItem>
                <SelectItem value="24">24 Jam Terakhir</SelectItem>
                <SelectItem value="72">3 Hari Terakhir</SelectItem>
                <SelectItem value="168">7 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <InteractiveChart
            data={chartData}
            lines={[
              { key: "temperature", name: "Suhu (°C)", color: "hsl(var(--primary))" },
              { key: "soilHumidity", name: "Kelembapan Tanah (%)", color: "hsl(195, 80%, 40%)" },
              { key: "airHumidity", name: "Kelembapan Udara (%)", color: "hsl(195, 60%, 60%)" },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-border overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Grafik TDS</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Total Dissolved Solids (ppm)</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Jam Terakhir</SelectItem>
                <SelectItem value="2">2 Jam Terakhir</SelectItem>
                <SelectItem value="3">3 Jam Terakhir</SelectItem>
                <SelectItem value="4">4 Jam Terakhir</SelectItem>
                <SelectItem value="5">5 Jam Terakhir</SelectItem>
                <SelectItem value="6">6 Jam Terakhir</SelectItem>
                <SelectItem value="12">12 Jam Terakhir</SelectItem>
                <SelectItem value="24">24 Jam Terakhir</SelectItem>
                <SelectItem value="72">3 Hari Terakhir</SelectItem>
                <SelectItem value="168">7 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <InteractiveChart
            data={chartData}
            lines={[
              { key: "tds", name: "TDS (ppm)", color: "hsl(280, 70%, 50%)" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Monitoring;
