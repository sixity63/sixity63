import { useState, useEffect } from "react";
import { Thermometer, Droplets, Wind, Gauge } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/contexts/DeviceContext";
import InteractiveChart from "@/components/InteractiveChart";

const Monitoring = () => {
  const [timeRange, setTimeRange] = useState(() => {
    return localStorage.getItem("monitoringTimeRange") || "24";
  });

  useEffect(() => {
    localStorage.setItem("monitoringTimeRange", timeRange);
  }, [timeRange]);

  const [devices, setDevices] = useState<any[]>([]);
  const { selectedDeviceId, setSelectedDeviceId } = useDevice();
  const selectedDevice = selectedDeviceId;
  const setSelectedDevice = setSelectedDeviceId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sensorData = [] } = useQuery({
    queryKey: ['sensorData', selectedDevice, timeRange],
    queryFn: async () => {
      if (!selectedDevice) return [];

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
        throw error;
      }

      return data || [];
    },
    enabled: !!selectedDevice,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

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

    const devicesChannel = supabase
      .channel('monitoring-devices-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload) => {
          console.log('Device update in monitoring:', payload);
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(devicesChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      // Setup polling (fallback for realtime) - Updates Cache
      const fetchLatest = async () => {
        const { data } = await supabase
          .from('sensor_data')
          .select('*')
          .eq('device_id', selectedDevice)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          queryClient.setQueryData(['sensorData', selectedDevice, timeRange], (prevData: any[] = []) => {
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

      // Setup realtime subscription - Updates Cache
      const channelName = `sensor-data-changes-${selectedDevice}`;
      const channel = supabase
        .channel(channelName)
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
            // Add new data to the react-query cache
            queryClient.setQueryData(['sensorData', selectedDevice, timeRange], (prevData: any[] = []) => {
              return [...prevData, payload.new];
            });
          }
        )
        .subscribe();

      // Refetch full data on focus (optional, but handled by useQuery refetchOnWindowFocus if enabled, here we manually sync via polling or let stales handle it)
      // Since we set refetchOnWindowFocus: false, we rely on realtime/polling.
      // But if user was away for LOOOONG time, polling handles it (if interval runs in background? no).
      // Let's rely on standard query invalidation if needed, or just the polling when visible.

      return () => {
        clearInterval(intervalId);
        supabase.removeChannel(channel);
      };
    }
  }, [selectedDevice, timeRange, queryClient]);

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
            <SelectTrigger className="w-20 min-w-[140mx] sm:min-w-[220px]">
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

      <Card className="border-border overflow-hidden bg-white dark:bg-transparent rounded-xl transform-gpu shadow-[inset_2px_2px_4px_hsl(var(--neumorphic-shadow-dark)),inset_-2px_-2px_4px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none dark:border-white/10">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Grafik Suhu & Kelembapan</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Zoom in/out dan geser untuk melihat data historis</CardDescription>
            </div>

          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <InteractiveChart
            data={chartData}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            lines={[
              { key: "temperature", name: "Suhu (°C)", color: "hsl(var(--primary))" },
              { key: "soilHumidity", name: "Kelembapan Tanah (%)", color: "hsl(195, 80%, 40%)" },
              { key: "airHumidity", name: "Kelembapan Udara (%)", color: "hsl(195, 60%, 60%)" },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-border overflow-hidden bg-white dark:bg-transparent rounded-xl transform-gpu shadow-[inset_2px_2px_4px_hsl(var(--neumorphic-shadow-dark)),inset_-2px_-2px_4px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none dark:border-white/10">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Grafik TDS</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Total Dissolved Solids (ppm)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <InteractiveChart
            data={chartData}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            lines={[
              { key: "tds", name: "TDS (ppm)", color: "hsl(280, 70%, 50%)" },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border hover:shadow-lg transition-shadow bg-white dark:bg-transparent rounded-xl transform-gpu shadow-[inset_2px_2px_4px_hsl(var(--neumorphic-shadow-dark)),inset_-2px_-2px_4px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none dark:border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suhu Ruangan</CardTitle>
            <Thermometer className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{currentData.temperature}°C</div>
            <p className="text-xs text-muted-foreground mt-1">Kondisi normal</p>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg transition-shadow bg-white dark:bg-transparent rounded-xl transform-gpu shadow-[inset_2px_2px_4px_hsl(var(--neumorphic-shadow-dark)),inset_-2px_-2px_4px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none dark:border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kelembapan Tanah</CardTitle>
            <Droplets className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{currentData.soilHumidity}%</div>
            <p className="text-xs text-muted-foreground mt-1">Lembap optimal</p>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg transition-shadow bg-white dark:bg-transparent rounded-xl transform-gpu shadow-[inset_2px_2px_4px_hsl(var(--neumorphic-shadow-dark)),inset_-2px_-2px_4px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none dark:border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kelembapan Udara</CardTitle>
            <Wind className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{currentData.airHumidity}%</div>
            <p className="text-xs text-muted-foreground mt-1">Udara segar</p>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg transition-shadow bg-white dark:bg-transparent rounded-xl transform-gpu shadow-[inset_2px_2px_4px_hsl(var(--neumorphic-shadow-dark)),inset_-2px_-2px_4px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none dark:border-white/10">
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
    </div>
  );
};

export default Monitoring;
