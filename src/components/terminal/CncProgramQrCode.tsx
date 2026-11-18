import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface CncProgramQrCodeProps {
    programName: string;
    className?: string;
    size?: number;
}

export function CncProgramQrCode({
    programName,
    className,
    size = 64,
}: CncProgramQrCodeProps) {
    if (!programName) return null;

    return (
        <QRCodeSVG
            value={programName}
            size={size}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
            className={cn(className)}
        />
    );
}
