'use client';
import { useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Camera, Video, X, RotateCcw, CircleDot, Square } from 'lucide-react';

type Mode = 'idle' | 'photo' | 'video';

type Props = {
  /** Fichier sélectionné (file ou blob de capture) */
  file: File | null;
  setFile: (f: File | null) => void;
  /** URL preview pour affichage immédiat */
  preview: string;
  setPreview: (s: string) => void;
  /** Texte d'invite (drop_label) */
  dropLabel: string;
  /** Si true, n'accepte que les images (pas de vidéo) */
  imagesOnly?: boolean;
};

export function MediaCaptureZone({ file, setFile, preview, setPreview, dropLabel, imagesOnly = false }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<any>(null);

  const accept = imagesOnly ? { 'image/*': [] } : { 'image/*': [], 'video/*': [] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles: 1,
    onDrop: (files) => {
      const f = files[0];
      if (!f) return;
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  });

  /* === Gestion stream caméra === */
  async function openCamera(target: Mode) {
    setError('');
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode },
        audio: target === 'video'
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      setMode(target);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (e: any) {
      setError(e?.message || 'Impossible d\'accéder à la caméra. Vérifie les permissions du navigateur.');
    }
  }

  function closeCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    setRecording(false);
    setMode('idle');
    setRecordedDuration(0);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
  }

  async function flipCamera() {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: next },
          audio: mode === 'video'
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch { /* fallback to current */ }
    }
  }

  function snapPhoto() {
    if (!videoRef.current || !canvasRef.current || !stream) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    c.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setFile(f);
      setPreview(URL.createObjectURL(blob));
      closeCamera();
    }, 'image/jpeg', 0.92);
  }

  function startRecording() {
    if (!stream) return;
    chunksRef.current = [];
    setRecordedDuration(0);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus'
                : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm'
                : 'video/mp4';
    try {
      const rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const f = new File([blob], `video-${Date.now()}.${ext}`, { type: mime });
        setFile(f);
        setPreview(URL.createObjectURL(blob));
        closeCamera();
      };
      rec.start(1000);
      recorderRef.current = rec;
      setRecording(true);
      durationTimerRef.current = setInterval(() => setRecordedDuration(d => d + 1), 1000);
    } catch (e: any) {
      setError(`Recording impossible : ${e?.message}`);
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setRecording(false);
  }

  // Cleanup on unmount
  useEffect(() => () => closeCamera(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function clearSelection() {
    setFile(null);
    setPreview('');
  }

  /* === Render === */
  if (mode !== 'idle' && stream) {
    const isVideo = mode === 'video';
    return (
      <div className="rounded-2xl border-2 border-brand-pink/40 bg-black overflow-hidden relative">
        <video ref={videoRef} className="w-full h-auto max-h-[500px] object-cover" playsInline muted={!isVideo} autoPlay />
        <canvas ref={canvasRef} className="hidden" />

        {/* Indicateur d'enregistrement */}
        {recording && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
            <CircleDot size={12} /> REC {Math.floor(recordedDuration / 60)}:{String(recordedDuration % 60).padStart(2, '0')}
          </div>
        )}

        {/* Bouton fermer */}
        <button
          onClick={closeCamera}
          className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2"
          title="Fermer"
        >
          <X size={18} />
        </button>

        {/* Bouton flip caméra */}
        {!recording && (
          <button
            onClick={flipCamera}
            className="absolute top-3 right-14 bg-black/60 hover:bg-black/80 text-white rounded-full p-2"
            title="Caméra avant/arrière"
          >
            <RotateCcw size={18} />
          </button>
        )}

        {/* Contrôles bas */}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
          {!isVideo ? (
            <button
              onClick={snapPhoto}
              className="bg-white hover:bg-zinc-200 text-black font-bold w-16 h-16 rounded-full flex items-center justify-center shadow-2xl"
              title="Capturer la photo"
            >
              <Camera size={28} />
            </button>
          ) : !recording ? (
            <button
              onClick={startRecording}
              className="bg-red-500 hover:bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl"
              title="Démarrer enregistrement"
            >
              <CircleDot size={28} />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl animate-pulse"
              title="Arrêter enregistrement"
            >
              <Square size={26} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mode "idle" : preview ou drop zone + boutons capture
  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition relative
          ${isDragActive ? 'border-brand-pink bg-brand-pink/5' : 'border-white/20 hover:border-brand-pink'}
        `}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="relative">
            {file?.type.startsWith('video/') ? (
              <video src={preview} controls className="max-h-64 mx-auto rounded-xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="max-h-64 mx-auto rounded-xl" />
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearSelection(); }}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5"
              title="Supprimer"
            >
              <X size={14} />
            </button>
            <div className="text-[11px] text-white/60 mt-2">{file?.name} · {file ? Math.round(file.size / 1024) : 0} Ko</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <UploadCloud size={40} className="text-brand-pink" />
            <p className="text-sm">{dropLabel}</p>
            <p className="text-[10px] text-white/40">— ou utilisez les boutons ci-dessous —</p>
          </div>
        )}
      </div>

      {/* Boutons capture live */}
      {!preview && (
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => openCamera('photo')}
            className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold px-4 py-2.5 rounded-full text-sm flex items-center gap-2 shadow-lg shadow-fuchsia-500/20"
          >
            <Camera size={16} /> Prendre une photo
          </button>
          {!imagesOnly && (
            <button
              type="button"
              onClick={() => openCamera('video')}
              className="bg-violet-500 hover:bg-violet-600 text-white font-bold px-4 py-2.5 rounded-full text-sm flex items-center gap-2 shadow-lg shadow-violet-500/20"
            >
              <Video size={16} /> Enregistrer une vidéo
            </button>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}
