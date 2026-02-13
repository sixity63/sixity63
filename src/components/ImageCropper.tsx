
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, ZoomIn, ZoomOut, Check, X } from "lucide-react";

interface ImageCropperProps {
    open: boolean;
    imageSrc: string | null;
    onClose: () => void;
    onCropComplete: (croppedImg: string) => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ open, imageSrc, onClose, onCropComplete }) => {
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const ImageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state when new image opens
    useEffect(() => {
        if (open) {
            setZoom(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [open, imageSrc]);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragStart({ x: clientX - position.x, y: clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setPosition({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleCrop = () => {
        if (!ImageRef.current) return;

        const canvas = document.createElement('canvas');
        const size = 500; // Output size increased for better quality
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw circular mask (optional, but good for preview)
        // We will output a square image, but user crops based on circle view

        // Calculate image position relative to the center 150,150
        // The container is fixed size, let's say 300px visual size.
        // We assume the visual container matches the output canvas size for simplicity mapping

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        const img = ImageRef.current;

        // Logic: The image is transformed by translate(x,y) scale(zoom)
        // The center of the container is (150, 150).
        // Standard drawImage takes (img, dx, dy, dWidth, dHeight).

        // Center the operation
        ctx.translate(size / 2, size / 2);
        // Scale position offset by the ratio of output size / visual size?
        // Actually, position x/y is in pixels of the DOM element.
        // If DOM is 450px and Canvas is 500px, we strictly need to scale the translation.
        // Let's grab the actual container size.
        const container = containerRef.current;
        const containerWidth = container ? container.offsetWidth : 450; // Default to 450px for larger screens
        const ratio = size / containerWidth;

        ctx.translate(position.x * ratio, position.y * ratio);
        ctx.scale(zoom * ratio, zoom * ratio);

        // Draw image centered at current context
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Get generic base64
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        onCropComplete(base64);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-white/10 p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Sesuaikan Foto</DialogTitle>
                    <DialogDescription>
                        Geser dan perbesar untuk mengambil bagian terbaik.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4 w-full bg-black/5 dark:bg-black/40">
                    {/* Crop Area Container */}
                    <div
                        ref={containerRef}
                        className="relative w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] rounded-full overflow-hidden border-4 border-primary/50 shadow-2xl cursor-move bg-black/20"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleMouseDown}
                        onTouchMove={handleMouseMove}
                        onTouchEnd={handleMouseUp}
                    >
                        {imageSrc && (
                            <img
                                ref={ImageRef}
                                src={imageSrc}
                                alt="Crop Preview"
                                className="absolute max-w-none origin-center pointer-events-none select-none"
                                draggable={false}
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                    maxWidth: 'none', // Allow image to overflow
                                    // Initial sizing: we want image to cover
                                }}
                                onLoad={(e) => {
                                    // Scale image to fit min dimension initially
                                    const img = e.currentTarget;
                                    const min = Math.min(img.width, img.height);
                                    const scale = 280 / min;
                                    // We'll handle this via zoom state if needed, but for now CSS transform handles display
                                    // Actually, we need to set initial width to match container or similar logic
                                    // For simplicity, let's just render it natural size and let user zoom
                                    if (img.width < 280 || img.height < 280) {
                                        setZoom(Math.max(280 / img.width, 280 / img.height));
                                    }
                                }}
                            />
                        )}

                        {/* Grid Overlay for Visual Guide */}
                        <div className="absolute inset-0 pointer-events-none opacity-30">
                            <div className="absolute inset-0 border border-white/20 rounded-full"></div>
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20"></div>
                            <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/20"></div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4 w-full px-4">
                        <ZoomOut className="w-4 h-4 text-muted-foreground" />
                        <Slider
                            value={[zoom]}
                            min={0.2}
                            max={3}
                            step={0.1}
                            onValueChange={(val) => setZoom(val[0])}
                            className="flex-1"
                        />
                        <ZoomIn className="w-4 h-4 text-muted-foreground" />
                    </div>
                </div>

                <DialogFooter className="flex sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        <X className="w-4 h-4 mr-2" />
                        Batal
                    </Button>
                    <Button onClick={handleCrop} className="flex-1">
                        <Check className="w-4 h-4 mr-2" />
                        Gunakan Foto
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImageCropper;
