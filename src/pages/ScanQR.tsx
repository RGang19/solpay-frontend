import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import ParticleBackground from '@/components/ParticleBackground';
import { ArrowLeft, Camera, CameraOff, Zap, AlertCircle } from 'lucide-react';

const ScanQR = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedAddress, setScannedAddress] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    setError(null);
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Parse Solana Pay URI (e.g. solana:6... or solana:6...?amount=1)
          let address = decodedText.trim();
          if (address.toLowerCase().startsWith('solana:')) {
            address = address.split(':')[1].split('?')[0];
          }
          setScannedAddress(address);
          scanner.stop().catch(() => {});
          setScanning(false);
        },
        () => {}
      );
      setScanning(true);
    } catch (err: any) {
      setError(err?.message || 'Camera access denied. Please allow camera permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleProceed = () => {
    if (scannedAddress) {
      navigate('/send', { state: { address: scannedAddress } });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => { stopScanner(); navigate(-1); }}
            className="w-10 h-10 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-heading font-semibold text-foreground">Scan QR Code</h1>
        </motion.div>

        {/* Scanner Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card-glow gradient-border p-4 mb-6 flex flex-col items-center"
        >
          <div
            ref={containerRef}
            className="w-full aspect-square rounded-xl overflow-hidden bg-muted/30 relative"
          >
            <div id="qr-reader" className="w-full h-full" />

            {!scanning && !scannedAddress && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center px-6">
                  Tap the button below to activate your camera and scan a wallet QR code
                </p>
              </div>
            )}

            {scanning && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner markers */}
                <div className="absolute top-[15%] left-[15%] w-8 h-8 border-t-2 border-l-2 border-secondary rounded-tl-lg" />
                <div className="absolute top-[15%] right-[15%] w-8 h-8 border-t-2 border-r-2 border-secondary rounded-tr-lg" />
                <div className="absolute bottom-[15%] left-[15%] w-8 h-8 border-b-2 border-l-2 border-secondary rounded-bl-lg" />
                <div className="absolute bottom-[15%] right-[15%] w-8 h-8 border-b-2 border-r-2 border-secondary rounded-br-lg" />

                {/* Scanning line */}
                <motion.div
                  className="absolute left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent"
                  animate={{ top: ['15%', '85%', '15%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-4 mb-4 flex items-center gap-3 border-destructive/30"
            >
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanned Result */}
        <AnimatePresence>
          {scannedAddress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card-glow p-4 mb-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-secondary" />
                <p className="text-sm font-medium text-secondary">Address Detected!</p>
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all bg-muted/30 p-3 rounded-lg">
                {scannedAddress}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-auto space-y-3"
        >
          {scannedAddress ? (
            <button onClick={handleProceed} className="w-full btn-gradient text-center">
              Send to this Address
            </button>
          ) : (
            <button
              onClick={scanning ? stopScanner : startScanner}
              className={`w-full btn-gradient text-center flex items-center justify-center gap-2 ${scanning ? 'opacity-90' : ''}`}
            >
              {scanning ? (
                <>
                  <CameraOff className="w-5 h-5" /> Stop Scanner
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" /> Start Scanner
                </>
              )}
            </button>
          )}

          {scannedAddress && (
            <button
              onClick={() => { setScannedAddress(null); startScanner(); }}
              className="w-full glass-card py-3 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Scan Again
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ScanQR;
