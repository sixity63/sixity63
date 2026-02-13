import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { startOfWeek, getDay } from 'date-fns';

interface WeeklyChartProps {
    deviceId: string;
}

const WeeklyChart = ({ deviceId }: WeeklyChartProps) => {
    const [data, setData] = useState<{ day: string; temp: number }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!deviceId) return;

        let subscription: any = null;

        const fetchData = async () => {
            setLoading(true);
            const now = new Date();
            // Start from Monday of current week
            const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });

            const { data: sensorData } = await supabase
                .from('sensor_data')
                .select('created_at, temperature')
                .eq('device_id', deviceId)
                .gte('created_at', startOfCurrentWeek.toISOString())
                .order('created_at', { ascending: true });

            processData(sensorData || []);
            setLoading(false);
        };

        const processData = (rawData: any[]) => {
            // Init Mon-Sun structure
            const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
            const weeklyStats = days.map(day => ({
                day,
                total: 0,
                count: 0
            }));

            if (rawData) {
                rawData.forEach(record => {
                    if (record.temperature !== null) {
                        const date = new Date(record.created_at);
                        const rawDay = getDay(date);
                        const monIndexedDay = (rawDay + 6) % 7; // Shift so Mon is 0

                        weeklyStats[monIndexedDay].total += record.temperature;
                        weeklyStats[monIndexedDay].count += 1;
                    }
                });
            }

            // Format data: use 0 instead of null to ensure line is drawn
            const formattedData = weeklyStats.map(d => ({
                day: d.day,
                temp: d.count > 0 ? Number((d.total / d.count).toFixed(1)) : 0
            }));

            setData(formattedData);
        };

        fetchData();

        // Setup realtime subscription
        subscription = supabase
            .channel(`weekly-chart-${deviceId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sensor_data', filter: `device_id=eq.${deviceId}` },
                () => {
                    // Re-fetch data on new insert
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, [deviceId]);

    return (
        <div className="w-full mt-6">
            <div className="bg-background dark:bg-black/20 rounded-2xl transform-gpu shadow-[inset_4px_4px_8px_hsl(var(--neumorphic-shadow-dark)),inset_-4px_-4px_8px_hsl(var(--neumorphic-shadow-light))] dark:shadow-none dark:border dark:border-white/10 p-4 md:p-6 transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-6 bg-[#0ea5e9] rounded-full"></span>
                        Statistik Suhu (Minggu Ini)
                    </h3>
                    <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                        Senin - Minggu
                    </span>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 25, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                            <XAxis
                                dataKey="day"
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                                interval={0}
                            />
                            <YAxis
                                width={40}
                                tickMargin={10}
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `${value}°`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    color: 'hsl(var(--foreground))'
                                }}
                                formatter={(value: number) => [`${value}°C`, 'Rata-rata']}
                                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="temp"
                                stroke="#0ea5e9"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorTemp)"
                                animationDuration={1500}
                                connectNulls={true}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default WeeklyChart;
