import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Thermometer, Droplets, Wind, Beaker, Cpu, User, Camera } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import WeeklyChart from '@/components/WeeklyChart';
import { useDevice } from '@/contexts/DeviceContext';

interface Device {
  id: string;
  name: string;
  last_seen: string | null;
}

interface SensorData {
  temperature: number | null;
  soil_humidity: number | null;
  air_humidity: number | null;
  tds: number | null;
  device_id: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorData, setSensorData] = useState<Record<string, SensorData>>({});
  const [loading, setLoading] = useState(true);
  const updateTimersRef = useRef<Record<string, number>>({});
  const deviceIdsRef = useRef<string[]>([]);
  const { selectedDeviceId, setSelectedDeviceId } = useDevice();
  /* Profile Image Logic */
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const saved = localStorage.getItem(`user_profile_image_${user.id}`);
        if (saved) setProfileImage(saved);

        try {
          const { data, error } = await supabase
            .from('profiles' as any)
            .select('avatar_url')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error("Error fetching profile:", error);
            return;
          }

          if (data && (data as any).avatar_url) {
            const remoteUrl = (data as any).avatar_url;
            if (remoteUrl !== saved) {
              setProfileImage(remoteUrl);
              localStorage.setItem(`user_profile_image_${user.id}`, remoteUrl);
            }
          } else {
            if (saved) {
              setProfileImage(null);
              localStorage.removeItem(`user_profile_image_${user.id}`);
            }
          }
        } catch (err) {
          console.error("Failed to sync profile", err);
        }
      } else {
        setProfileImage(null);
      }
    };

    loadProfile();
    window.addEventListener('profile-updated', loadProfile);
    return () => window.removeEventListener('profile-updated', loadProfile);
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  const getUserName = () => {
    if (!user?.email) return 'User';
    const name = user.email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const getOnlineDevicesCount = () => {
    return devices.filter(device => {
      if (!device.last_seen) return false;
      const lastSeen = new Date(device.last_seen);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastSeen.getTime()) / 1000;
      return diffSeconds < 10; // Online jika update dalam 10 detik
    }).length;
  };

  useEffect(() => {
    if (!user) return;

    let sensorChannel: any = null;
    let devicesChannel: any = null;

    const fetchData = async () => {
      const { data: devicesData } = await supabase
        .from('devices')
        .select('id, name, last_seen')
        .eq('user_id', user.id);

      if (devicesData) {
        if (devicesData.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(devicesData[0].id);
        }

        const sensorPromises = devicesData.map(async (device) => {
          const { data } = await supabase
            .from('sensor_data')
            .select('temperature, soil_humidity, air_humidity, tds, device_id, created_at')
            .eq('device_id', device.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return { deviceId: device.id, data: data || null };
        });

        const results = await Promise.all(sensorPromises);
        const sensorMap: Record<string, SensorData> = {};

        const updatedDevices = devicesData.map(device => {
          const deviceSensor = results.find(r => r.deviceId === device.id)?.data;
          if (deviceSensor?.created_at) {
            const st = new Date(deviceSensor.created_at).getTime();
            const dt = device.last_seen ? new Date(device.last_seen).getTime() : 0;
            if (st > dt) return { ...device, last_seen: deviceSensor.created_at };
          }
          return device;
        });

        setDevices(updatedDevices);
        deviceIdsRef.current = devicesData.map((d) => d.id);

        results.forEach(({ deviceId, data }) => {
          if (data) sensorMap[deviceId] = data;
        });
        setSensorData(sensorMap);
      }

      setLoading(false);
    };

    fetchData();

    sensorChannel = supabase
      .channel('sensor-data-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data' },
        (payload: any) => {
          const row = payload?.new;
          if (!row?.device_id) return;
          setSensorData((prev) => ({
            ...prev,
            [row.device_id]: {
              device_id: row.device_id,
              temperature: row.temperature,
              soil_humidity: row.soil_humidity,
              air_humidity: row.air_humidity,
              tds: row.tds,
            },
          }));
          setDevices((prev) =>
            prev.map(d => d.id === row.device_id ? { ...d, last_seen: row.created_at || new Date().toISOString() } : d)
          );
        }
      )
      .subscribe();

    const pollInterval = setInterval(async () => {
      if (deviceIdsRef.current.length === 0) return;

      // 1. Ambil status terbaru dari tabel devices (untuk Heartbeat/Status Online)
      const { data: updatedDevices } = await supabase
        .from('devices')
        .select('id, last_seen')
        .eq('user_id', user.id);

      if (updatedDevices) {
        setDevices((prev) =>
          prev.map(d => {
            const match = updatedDevices.find(ud => ud.id === d.id);
            return match ? { ...d, last_seen: match.last_seen || d.last_seen } : d;
          })
        );
      }

      // 2. Tetap ambil data sensor terbaru untuk tampilan nilai
      for (const deviceId of deviceIdsRef.current) {
        const { data } = await supabase
          .from('sensor_data')
          .select('temperature, soil_humidity, air_humidity, tds, device_id, created_at')
          .eq('device_id', deviceId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) setSensorData((prev) => ({ ...prev, [deviceId]: data }));
      }
    }, 5000);

    devicesChannel = supabase
      .channel('devices-changes-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload: any) => {
          if (payload?.new) {
            const newDevice = payload.new;
            setDevices((prev) => {
              const exists = prev.some(d => d.id === newDevice.id);
              const next = exists ? prev.map(d => d.id === newDevice.id ? { ...d, ...newDevice } : d) : [newDevice, ...prev];
              deviceIdsRef.current = next.map(d => d.id);
              return next;
            });
          } else if (payload?.old) {
            const oldDevice = payload.old;
            setDevices((prev) => {
              const next = prev.filter(d => d.id !== oldDevice.id);
              deviceIdsRef.current = next.map(d => d.id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      if (sensorChannel) supabase.removeChannel(sensorChannel);
      if (devicesChannel) supabase.removeChannel(devicesChannel);
    };
  }, [user]);

  const getDisplayData = () => {
    return sensorData[selectedDeviceId] || { temperature: null, soil_humidity: null, air_humidity: null, tds: null };
  };

  const displayData = getDisplayData();

  const formatValue = (value: number | null | undefined, unit: string, decimals: number = 0) => {
    if (value === null || value === undefined) return '--';
    return `${Number(value).toFixed(decimals)}${unit}`;
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-background dark:bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sensorCards = [
    {
      icon: Thermometer,
      label: 'Temperature',
      value: formatValue(displayData.temperature, '°C', 1),
      subtitle: 'Now',
      iconBg: 'bg-gradient-to-br from-orange-400 to-red-500',
    },
    {
      icon: Droplets,
      label: 'Soil Humidity',
      value: formatValue(displayData.soil_humidity, '%', 0),
      subtitle: 'Current',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-green-600',
    },
    {
      icon: Wind,
      label: 'Air Humidity',
      value: formatValue(displayData.air_humidity, '%', 0),
      subtitle: 'Current',
      iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600',
    },
    {
      icon: Beaker,
      label: 'TDS',
      value: formatValue(displayData.tds, '', 1),
      subtitle: 'ppm',
      iconBg: 'bg-gradient-to-br from-violet-400 to-purple-600',
    },
  ];



  return (
    <div className="min-h-screen bg-background dark:bg-transparent p-0 md:p-6 lg:p-8 safe-area-top">
      {/* Main Container - Neumorphic Card */}
      <div className="w-full bg-background dark:bg-transparent rounded-3xl transform-gpu shadow-[12px_12px_24px_hsl(var(--neumorphic-shadow-dark)),-12px_-12px_24px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none p-3 md:p-8">

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-background dark:bg-white/10 shadow-[4px_4px_8px_hsl(var(--neumorphic-shadow-dark)),-4px_-4px_8px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none flex items-center justify-center overflow-hidden border border-border/50">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{getGreeting()}</p>
              <h1 className="text-2xl md:text-xl font-bold text-foreground">{getUserName()}</h1>
            </div>
          </div>

          {/* Device Selector */}
          {devices.length > 0 && (
            <div className="flex justify-end">
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger className="w-auto min-w-[150px] bg-background dark:bg-white/10 border-none shadow-[inset_2px_2px_4px_hsl(var(--neumorphic-shadow-dark)),inset_-2px_-2px_4px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none text-foreground">
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Sensor Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4">
          {sensorCards.map((card, index) => (
            <div
              key={index}
              className="bg-background dark:bg-black/20 rounded-2xl transform-gpu shadow-[6px_6px_12px_hsl(var(--neumorphic-shadow-dark)),-6px_-6px_12px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none dark:border dark:border-white/10 p-4 md:p-5 transition-all hover:scale-[1.02]"
            >
              {/* Icon */}
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-3 md:mb-4 shadow-md`}>
                <card.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>

              {/* Label */}
              <p className="text-xs md:text-sm text-muted-foreground mb-1">{card.label}</p>

              {/* Value */}
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-bold text-foreground">{card.value}</span>
              </div>

              {/* Subtitle */}
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Devices Section */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Connected Devices</h2>
            <span className="text-sm text-muted-foreground">
              {getOnlineDevicesCount()} online
            </span>
          </div>

          {devices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => {
                const isOnline = device.last_seen &&
                  (new Date().getTime() - new Date(device.last_seen).getTime()) / 1000 < 10; // 10 seconds
                const deviceSensor = sensorData[device.id];

                return (
                  <div
                    key={device.id}
                    className="bg-background dark:bg-black/20 rounded-xl transform-gpu shadow-[inset_4px_4px_8px_hsl(var(--neumorphic-shadow-dark)),inset_-4px_-4px_8px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none dark:border dark:border-white/10 p-4 flex items-center gap-4"
                  >
                    {/* Device Icon */}
                    <div className="w-10 h-10 rounded-lg bg-background dark:bg-white/10 shadow-[3px_3px_6px_hsl(var(--neumorphic-shadow-dark)),-3px_-3px_6px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none flex items-center justify-center">
                      <Cpu className={`w-5 h-5 ${isOnline ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{device.name}</h4>
                      <p className="text-[10px] text-muted-foreground opacity-70">
                        {device.last_seen
                          ? `Update: ${new Date(device.last_seen).toLocaleTimeString('id-ID')}`
                          : 'Belum pernah konek'}
                      </p>
                    </div>

                    {/* Status Indicator */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-background rounded-2xl shadow-[inset_6px_6px_12px_hsl(var(--neumorphic-shadow-dark)),inset_-6px_-6px_12px_hsl(var(--neumorphic-shadow-light))] p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-background shadow-[4px_4px_8px_hsl(var(--neumorphic-shadow-dark)),-4px_-4px_8px_hsl(var(--neumorphic-shadow-light))] flex items-center justify-center mx-auto mb-4">
                <Cpu className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Devices Connected</h3>
              <p className="text-sm text-muted-foreground">Add your first ESP32 device to get started</p>
            </div>
          )}
        </div>

        {/* Weekly Temperature Chart */}
        {selectedDeviceId && (
          <WeeklyChart deviceId={selectedDeviceId} />
        )}

      </div>
    </div>
  );
};

export default Dashboard;
