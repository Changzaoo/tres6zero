import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Download, Share2, QrCode, Lock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getEventBySlug } from '@/services/eventService';
import { getEventVideos } from '@/services/videoService';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { AppEvent, AppVideo } from '@/types';

export default function GalleryPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [videos, setVideos] = useState<AppVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [wrongPass, setWrongPass] = useState(false);

  useEffect(() => {
    if (!eventSlug) return;
    getEventBySlug(eventSlug).then(e => {
      setEvent(e);
      if (e && !e.passwordEnabled) {
        setUnlocked(true);
        getEventVideos(e.id).then(setVideos);
      }
    }).finally(() => setLoading(false));
  }, [eventSlug]);

  function handleUnlock() {
    if (event && password === 'senha123') { // In production: compare hashed password
      setUnlocked(true);
      getEventVideos(event.id).then(setVideos);
    } else {
      setWrongPass(true);
    }
  }

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-brand-500 animate-spin" /></div>;

  if (!event) return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 text-center p-4">
      <Video className="w-16 h-16 text-white/20" />
      <h1 className="text-xl font-bold text-white">Galeria não encontrada</h1>
      <p className="text-white/40">Este evento não existe ou foi removido.</p>
    </div>
  );

  if (event.passwordEnabled && !unlocked) return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-glass border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <div className="text-center">
          <Lock className="w-10 h-10 text-brand-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Galeria protegida</h2>
          <p className="text-white/40 text-sm">{event.name}</p>
        </div>
        <Input label="Senha" type="password" placeholder="Digite a senha" value={password}
          onChange={e => setPassword(e.target.value)} error={wrongPass ? 'Senha incorreta' : undefined} />
        <Button className="w-full justify-center" onClick={handleUnlock}>Acessar</Button>
      </div>
    </div>
  );

  const publicUrl = window.location.href;

  return (
    <div className="min-h-screen bg-surface">
      <div className="relative">
        {event.coverUrl ? (
          <img src={event.coverUrl} className="w-full h-48 object-cover" alt="" />
        ) : (
          <div className="w-full h-48 bg-gradient-brand opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-16 relative pb-20">
        <div className="flex items-end gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center text-3xl font-black text-white shadow-2xl shrink-0">
            {event.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{event.name}</h1>
            <p className="text-white/50 text-sm">{event.clientName}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)} icon={<QrCode className="w-4 h-4" />}>QR Code</Button>
          <Button variant="secondary" size="sm" icon={<Share2 className="w-4 h-4" />}
            onClick={() => navigator.share?.({ url: publicUrl, title: event.name }) || navigator.clipboard.writeText(publicUrl)}>
            Compartilhar
          </Button>
        </div>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Video className="w-12 h-12 text-white/20" />
            <p className="text-white/40">Nenhum vídeo publicado ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {videos.map(v => (
              <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => navigate(`/g/${eventSlug}/${v.id}`)}
                className="bg-gradient-glass border border-white/[0.08] rounded-xl overflow-hidden cursor-pointer hover:border-brand-500/30 transition-all">
                <div className="aspect-[9/16] bg-black/40 flex items-center justify-center">
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} className="w-full h-full object-cover" alt={v.title} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/20">
                      <Video className="w-10 h-10" />
                      <span className="text-xs">Vídeo 360</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-white/60 truncate">{v.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="QR Code da galeria" size="sm">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={publicUrl} size={200} />
          </div>
          <p className="text-xs text-white/30 break-all text-center">{publicUrl}</p>
          <Button className="w-full justify-center" onClick={() => navigator.clipboard.writeText(publicUrl)}>
            Copiar link
          </Button>
        </div>
      </Modal>
    </div>
  );
}
