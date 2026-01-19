import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZoomIn, ZoomOut, RotateCcw, Move, Hand } from "lucide-react";

interface ChartDataPoint {
  time: string;
  fullTime: string;
  timestamp: number;
  [key: string]: string | number | null;
}

interface DataLine {
  key: string;
  name: string;
  color: string;
}

interface InteractiveChartProps {
  data: ChartDataPoint[];
  lines: DataLine[];
  height?: number;
  autoFollow?: boolean;
  // optional external time range controls
  timeRange?: string;
  setTimeRange?: (value: string) => void;
}

const InteractiveChart = ({ data, lines, height = 350, autoFollow = true, timeRange, setTimeRange }: InteractiveChartProps) => {
  const [brushStartIndex, setBrushStartIndex] = useState<number>(0);
  const [brushEndIndex, setBrushEndIndex] = useState<number>(data.length - 1);
  const [isFollowing, setIsFollowing] = useState<boolean>(autoFollow);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const prevDataLengthRef = useRef<number>(data.length);

  // Touch gesture state
  const touchStateRef = useRef({
    initialPinchDistance: 0,
    initialStartIndex: 0,
    initialEndIndex: 0,
    lastTouchX: 0,
    isTouching: false,
  });

  // Calculate visible data range
  const visibleData = useMemo(() => {
    if (data.length === 0) return [];
    const start = Math.max(0, brushStartIndex);
    const end = Math.min(data.length - 1, brushEndIndex);
    return data.slice(start, end + 1);
  }, [data, brushStartIndex, brushEndIndex]);

  // Handle brush change - disable auto-follow when user manually adjusts
  const handleBrushChange = useCallback((brushData: any) => {
    if (brushData && typeof brushData.startIndex === 'number' && typeof brushData.endIndex === 'number') {
      setBrushStartIndex(brushData.startIndex);
      setBrushEndIndex(brushData.endIndex);
      // If user manually moves away from the end, disable auto-follow
      if (brushData.endIndex < data.length - 1) {
        setIsFollowing(false);
      }
    }
  }, [data.length]);

  // Zoom function
  const applyZoom = useCallback((zoomFactor: number, center?: number) => {
    const currentRange = brushEndIndex - brushStartIndex;
    const newRange = Math.max(2, Math.min(data.length - 1, Math.round(currentRange * zoomFactor)));
    const rangeChange = currentRange - newRange;

    const centerPoint = center ?? (brushStartIndex + brushEndIndex) / 2;
    const centerRatio = (centerPoint - brushStartIndex) / currentRange;

    const newStart = Math.max(0, Math.round(brushStartIndex + rangeChange * centerRatio));
    const newEnd = Math.min(data.length - 1, newStart + newRange);

    if (newEnd - newStart >= 2) {
      setBrushStartIndex(newStart);
      setBrushEndIndex(newEnd);
    }
  }, [brushStartIndex, brushEndIndex, data.length]);

  // Pan function
  const applyPan = useCallback((panAmount: number) => {
    const currentRange = brushEndIndex - brushStartIndex;
    let newStart = brushStartIndex + panAmount;
    let newEnd = brushEndIndex + panAmount;

    if (newStart < 0) {
      newStart = 0;
      newEnd = currentRange;
    }
    if (newEnd > data.length - 1) {
      newEnd = data.length - 1;
      newStart = Math.max(0, newEnd - currentRange);
    }

    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
  }, [brushStartIndex, brushEndIndex, data.length]);

  // Touch event handlers
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || data.length === 0) return;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        touchStateRef.current.initialPinchDistance = getDistance(e.touches);
        touchStateRef.current.initialStartIndex = brushStartIndex;
        touchStateRef.current.initialEndIndex = brushEndIndex;
      } else if (e.touches.length === 1) {
        // Pan start
        touchStateRef.current.lastTouchX = e.touches[0].clientX;
        touchStateRef.current.isTouching = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch zoom
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const initialDistance = touchStateRef.current.initialPinchDistance;

        if (initialDistance > 0) {
          const scale = initialDistance / currentDistance;
          const initialRange = touchStateRef.current.initialEndIndex - touchStateRef.current.initialStartIndex;
          const newRange = Math.max(2, Math.min(data.length - 1, Math.round(initialRange * scale)));
          const rangeChange = initialRange - newRange;

          const newStart = Math.max(0, Math.round(touchStateRef.current.initialStartIndex + rangeChange / 2));
          const newEnd = Math.min(data.length - 1, newStart + newRange);

          if (newEnd - newStart >= 2) {
            setBrushStartIndex(newStart);
            setBrushEndIndex(newEnd);
          }
        }
      } else if (e.touches.length === 1 && touchStateRef.current.isTouching) {
        // Pan
        const currentX = e.touches[0].clientX;
        const deltaX = touchStateRef.current.lastTouchX - currentX;
        const containerWidth = container.clientWidth;
        const currentRange = brushEndIndex - brushStartIndex;

        // Calculate pan amount based on swipe distance
        const panAmount = Math.round((deltaX / containerWidth) * currentRange * 0.5);

        if (Math.abs(panAmount) >= 1) {
          applyPan(panAmount);
          touchStateRef.current.lastTouchX = currentX;
        }
      }
    };

    const handleTouchEnd = () => {
      touchStateRef.current.isTouching = false;
      touchStateRef.current.initialPinchDistance = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [data.length, brushStartIndex, brushEndIndex, applyPan]);

  // Zoom in - reduce visible range by 25%
  const handleZoomIn = useCallback(() => {
    applyZoom(0.75);
  }, [applyZoom]);

  // Zoom out - increase visible range by 50%
  const handleZoomOut = useCallback(() => {
    applyZoom(1.5);
  }, [applyZoom]);

  // Reset zoom
  const handleReset = useCallback(() => {
    setBrushStartIndex(0);
    setBrushEndIndex(data.length - 1);
  }, [data.length]);

  // Pan left
  const handlePanLeft = useCallback(() => {
    const currentRange = brushEndIndex - brushStartIndex;
    const panAmount = Math.max(1, Math.floor(currentRange * 0.3));
    applyPan(-panAmount);
  }, [brushStartIndex, brushEndIndex, applyPan]);

  // Pan right
  const handlePanRight = useCallback(() => {
    const currentRange = brushEndIndex - brushStartIndex;
    const panAmount = Math.max(1, Math.floor(currentRange * 0.3));
    applyPan(panAmount);
  }, [brushStartIndex, brushEndIndex, applyPan]);

  // Auto-follow new data when enabled
  useEffect(() => {
    // Handle initial load: when data transitions from empty -> non-empty, set full range so chart shows immediately
    if (data.length === 0) {
      prevDataLengthRef.current = 0;
      return;
    }

    // If this is the first time data arrived, initialize the brush to show the full range
    if (prevDataLengthRef.current === 0 && data.length > 0) {
      setBrushStartIndex(0);
      setBrushEndIndex(data.length - 1);
      setIsFollowing(true);
      prevDataLengthRef.current = data.length;
      return;
    }

    // If new data arrived and we're following, shift the window to the end preserving range size
    if (data.length > prevDataLengthRef.current && isFollowing) {
      const currentRange = Math.max(1, brushEndIndex - brushStartIndex);
      const newEnd = data.length - 1;
      const newStart = Math.max(0, newEnd - currentRange);
      setBrushStartIndex(newStart);
      setBrushEndIndex(newEnd);
    }

    // If indices are invalid (e.g., end < start or end < 0), reset to show the full range
    if (brushEndIndex < brushStartIndex || brushEndIndex < 0) {
      setBrushStartIndex(0);
      setBrushEndIndex(data.length - 1);
    }

    prevDataLengthRef.current = data.length;
  }, [data.length, isFollowing, brushStartIndex, brushEndIndex]);

  // Enable auto-follow when clicking "Geser Kanan" to end
  const handlePanRightWithFollow = useCallback(() => {
    const currentRange = brushEndIndex - brushStartIndex;
    const panAmount = Math.max(1, Math.floor(currentRange * 0.3));
    applyPan(panAmount);
    // Re-enable following if we're at the end
    if (brushEndIndex + panAmount >= data.length - 1) {
      setIsFollowing(true);
    }
  }, [brushStartIndex, brushEndIndex, applyPan, data.length]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        Belum ada data untuk ditampilkan
      </div>
    );
  }

  const currentRange = brushEndIndex - brushStartIndex + 1;
  const totalPoints = data.length;

  return (
    <div className="space-y-3 sm:space-y-4 w-full overflow-hidden">
      {/* Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={currentRange <= 3}
            className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
          >
            <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Zoom In</span>
            <span className="sm:hidden">+</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={currentRange >= totalPoints}
            className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
          >
            <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Zoom Out</span>
            <span className="sm:hidden">−</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
          >
            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {setTimeRange && (
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-10 min-w-[95px]">
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
            )}

            <Button
              variant={isFollowing ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsFollowing(!isFollowing);
                if (!isFollowing) {
                  const currentRange = brushEndIndex - brushStartIndex;
                  const newEnd = data.length - 1;
                  const newStart = Math.max(0, newEnd - currentRange);
                  setBrushStartIndex(newStart);
                  setBrushEndIndex(newEnd);
                }
              }}
              className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
            >
              {isFollowing ? "● Live" : "○ Live"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePanLeft}
            disabled={brushStartIndex === 0}
            className="text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-none"
          >
            ← <span className="hidden sm:inline">Geser Kiri</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePanRightWithFollow}
            disabled={brushEndIndex >= data.length - 1}
            className="text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">Geser Kanan</span> →
          </Button>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground bg-secondary/30 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md gap-2">
        <span className="flex items-center gap-1 sm:gap-2">
          <Hand className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Pinch 2 jari untuk zoom, geser 1 jari untuk navigasi</span>
          <span className="sm:hidden">Pinch / geser</span>
        </span>
        <span className="flex-shrink-0">
          {currentRange}/{totalPoints}
        </span>
      </div>

      {/* Main Chart with touch support */}
      <div ref={chartContainerRef} className="touch-none w-full">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ left: 20, right: 0, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              tickMargin={4}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              tickMargin={7}
              width={10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontSize: '12px'
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return payload[0].payload.fullTime;
                }
                return label;
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
              iconSize={10}
            />

            {/* Brush for zoom/pan */}
            <Brush
              dataKey="time"
              height={30}
              stroke="hsl(var(--primary))"
              fill="hsl(var(--secondary))"
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
              onChange={handleBrushChange}
              tickFormatter={(value) => value}
            />

            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={2}
                name={line.name}
                dot={currentRange <= 50}
                activeDot={{ r: 4, fill: line.color }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default InteractiveChart;
