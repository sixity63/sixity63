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
import { startOfWeek } from 'date-fns';

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
            const monday = startOfWeek(now, { weekStartsOn: 1 });
            monday.setHours(0, 0, 0, 0);

            const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

            // Query each day separately to avoid Supabase 1000-row default limit
            const dayPromises = days.map(async (dayName, index) => {
                const dayStart = new Date(monday);
                dayStart.setDate(monday.getDate() + index);
                dayStart.setHours(0, 0, 0, 0);

                const dayEnd = new Date(dayStart);
                dayEnd.setHours(23, 59, 59, 999);

                const startStr = dayStart.toISOString();
                const endStr = dayEnd.toISOString();

                // Fetch up to 10000 records per day to cover high-frequency sensors
                const { data: records } = await supabase
                    .from('sensor_chart')
                    .select('temperature')
                    .eq('device_id', deviceId)
                    .gte('created_at', startStr)
                    .lte('created_at', endStr)
                    .not('temperature', 'is', null)
                    .limit(10000);

                let avg = 0;
                if (records && records.length > 0) {
                    const sum = records.reduce((acc, r) => acc + Number(r.temperature), 0);
                    avg = Number((sum / records.length).toFixed(1));
                }

                return { day: dayName, temp: avg };
            });

            const results = await Promise.all(dayPromises);
            setData(results);
            setLoading(false);
        };

        fetchData();

        // Setup realtime subscription
        subscription = supabase
            .channel(`weekly-chart-${deviceId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sensor_chart', filter: `device_id=eq.${deviceId}` },
                () => fetchData()
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
