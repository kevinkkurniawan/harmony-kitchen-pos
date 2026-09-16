import { useCallback, useState, useEffect } from 'react';

// ESC/POS commands
const ESC = '\x1B';
const GS = '\x1D';
const INIT = ESC + '@'; // Initialize printer
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';
const CENTER = ESC + 'a' + '\x01';
const LEFT = ESC + 'a' + '\x00';
const CUT = GS + 'V' + '\x41' + '\x00'; // Partial cut
const KICK_DRAWER = ESC + 'p' + '\x00' + '\x32' + '\x32'; // Kick cash drawer (pin 2)

export function usePOSHardware() {
  const [port, setPort] = useState<unknown>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Audio Context for Beeps
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext only on client side
    if (typeof window !== 'undefined') {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAudioCtx(ctx);
    }
  }, []);

  const playBeep = useCallback((type: 'success' | 'error' = 'success') => {
    if (!audioCtx) return;
    
    // Resume context if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); // Short beep
    } else {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime); // Lower pitch, harsher
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3); // Longer beep for error
    }
  }, [audioCtx]);

  const connectPrinter = useCallback(async () => {
    if (!('serial' in navigator)) {
      alert('WebSerial API tidak didukung di browser ini. Gunakan Chrome/Edge.');
      return false;
    }

    try {
      // @ts-expect-error (WebSerial types might not be present by default)
      const newPort = await navigator.serial.requestPort();
      await newPort.open({ baudRate: 9600 }); // Common baud rate for thermal printers
      setPort(newPort);
      setIsConnected(true);
      return true;
    } catch (err) {
      console.error('Gagal menghubungkan printer:', err);
      return false;
    }
  }, []);

  const disconnectPrinter = useCallback(async () => {
    if (port && typeof (port as { close: () => Promise<void> }).close === 'function') {
      try {
        await (port as { close: () => Promise<void> }).close();
        setPort(null);
        setIsConnected(false);
      } catch (err) {
        console.error('Gagal memutuskan printer:', err);
      }
    }
  }, [port]);

  const [isPrinting, setIsPrinting] = useState(false);

  const printText = useCallback(async (text: string): Promise<{ success: boolean; error?: string }> => {
    if (isPrinting) {
      return { success: false, error: 'Pencetakan sedang berlangsung, mohon tunggu.' };
    }
    setIsPrinting(true);

    if (!port) {
      // Fallback if no serial printer is connected
      console.warn('Printer tidak terhubung via WebSerial. Menggunakan fallback window.print().');
      try {
        window.print();
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'Gagal membuka dialog cetak browser.' };
      } finally {
        setIsPrinting(false);
      }
    }

    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    try {
      const encoder = new TextEncoder();
      writer = (port as unknown as { writable: WritableStream<Uint8Array> }).writable.getWriter();
      
      // Convert text and ESC/POS commands to Uint8Array
      const data = encoder.encode(text);
      await writer.write(data);
      return { success: true };
    } catch (err: unknown) {
      console.error('Gagal mencetak ke printer serial:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal mencetak ke printer serial. Periksa koneksi kabel USB/Serial.',
      };
    } finally {
      if (writer) {
        try {
          writer.releaseLock();
        } catch (releaseErr) {
          console.warn('Gagal melepaskan kunci writer serial:', releaseErr);
        }
      }
      setIsPrinting(false);
    }
  }, [port, isPrinting]);

  const formatStruk = useCallback((lines: string[]) => {
    // Basic ESC/POS formatting builder
    let rawStr = INIT + CENTER + BOLD_ON + 'HARMONY KITCHEN\n' + BOLD_OFF;
    rawStr += 'Jl. Contoh Alamat No. 123\n';
    rawStr += 'Telp: 0812-3456-7890\n\n' + LEFT;
    
    lines.forEach(line => {
      rawStr += line + '\n';
    });
    
    rawStr += '\n' + CENTER + 'Terima Kasih\nSelamat Belanja Kembali\n';
    rawStr += '\n\n' + CUT + KICK_DRAWER;
    
    return rawStr;
  }, []);

  return {
    isConnected,
    isPrinting,
    connectPrinter,
    disconnectPrinter,
    printText,
    formatStruk,
    playBeep
  };
}
