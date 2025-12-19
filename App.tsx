
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured, base64ToBlob } from './services/supabaseClient';
import { generateLandingPage, generateReviews, generateActionImages, translateLandingPage, getLanguageConfig } from './services/geminiService';
import LandingPage, { ThankYouPage } from './components/LandingPage';
import { ProductDetails, GeneratedContent, PageTone, UserSession, LandingPageRow, TemplateId, FormFieldConfig, TypographyConfig, UiTranslation, SiteConfig, Testimonial, VideoItem } from './types';
import { 
  Loader2, LogOut, Sparkles, Star, ChevronLeft, ChevronRight, Save, ShoppingBag, 
  ArrowRight, Trash2, Eye, UserPlus, LogIn, LayoutDashboard, Check, Image as ImageIcon, 
  X, MonitorPlay, RefreshCcw, ArrowLeft, Settings, CreditCard, Link as LinkIcon, 
  ListChecks, Pencil, Smartphone, Tablet, Monitor, Plus, MessageSquare, Images, 
  Upload, Type, Truck, Flame, Zap, Globe, Banknote, MousePointerClick, Palette, 
  Users, Copy, Target, MessageCircle, Code, Mail, Lock, Map, User, ArrowUp, 
  ArrowDown, Package, ShieldCheck, FileText as FileTextIcon, Gift, Play, Film, Square, Timer 
} from 'lucide-react';

// --- HELPER PER SLUG ---
const formatSlug = (text: string) => { 
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Rimuove accenti
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim(); 
};

const getThankYouSuffix = (lang: string) => {
    const suffixes: Record<string, string> = {
        'Italiano': '-grazie',
        'Inglese': '-thanks',
        'Francese': '-merci',
        'Tedesco': '-danke',
        'Austriaco': '-danke',
        'Spagnolo': '-gracias',
        'Portoghese': '-obrigado',
        'Olandese': '-bedankt',
        'Polacco': '-dziekuje',
        'Rumeno': '-multumesc',
        'Svedese': '-tack',
        'Bulgaro': '-blagodarya',
        'Greco': '-efcharisto',
        'Ungherese': '-koszonom',
        'Croato': '-hvala',
        'Serbo': '-hvala',
        'Slovacco': '-dakujem'
    };
    return suffixes[lang] || '-thanks';
};

// --- COMPONENTE PAGE CARD ---
const PageCard = React.memo(({ page, onView, onEdit, onDuplicate, onDelete }: { 
    page: LandingPageRow, 
    onView: (p: LandingPageRow) => void,
    onEdit?: (p: LandingPageRow) => void, 
    onDuplicate?: (p: LandingPageRow) => void,
    onDelete?: (id: string) => void
}) => {
    return (
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 overflow-hidden transition-all duration-300 cursor-pointer hover:-translate-y-1 relative" onClick={() => onView(page)}>
             <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-slate-900/80 rounded-bl-xl backdrop-blur z-20" onClick={(e) => e.stopPropagation()}>
                {onDuplicate && <button onClick={() => onDuplicate(page)} className="p-1.5 hover:bg-purple-600 rounded text-white" title="Duplica & Traduci"><Copy className="w-4 h-4"/></button>}
                {onEdit && <button onClick={() => onEdit(page)} className="p-1.5 hover:bg-blue-600 rounded text-white" title="Modifica"><Pencil className="w-4 h-4"/></button>}
                {onDelete && <button onClick={() => onDelete(page.id)} className="p-1.5 hover:bg-red-600 rounded text-white" title="Elimina"><Trash2 className="w-4 h-4"/></button>}
            </div>
            <div className="aspect-video bg-slate-200 relative overflow-hidden">
                <img src={page.content.heroImageBase64 || (page.content.generatedImages?.[0] || `https://picsum.photos/seed/${page.product_name.replace(/\s/g,'')}/800/600`)} alt={page.product_name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-slate-900 z-10">{page.niche}</div>
            </div>
            <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors truncate">{page.product_name}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-4">{page.content.subheadline}</p>
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">/{page.slug}</span>
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors"><ArrowRight className="w-4 h-4" /></div>
                </div>
            </div>
        </div>
    );
});

// --- MAIN APP ---
export const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'product_view' | 'thank_you_view' | 'admin' | 'builder'>('home');
  const [session, setSession] = useState<UserSession | null>(null);
  const [adminSection, setAdminSection] = useState<'pages' | 'settings'>('pages');
  const [publicPages, setPublicPages] = useState<LandingPageRow[]>([]);
  const [adminPages, setAdminPages] = useState<LandingPageRow[]>([]);
  const [selectedPublicPage, setSelectedPublicPage] = useState<LandingPageRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [slug, setSlug] = useState('');
  const [tySlug, setTySlug] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedThankYouContent, setGeneratedThankYouContent] = useState<GeneratedContent | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetails>({
    name: '', niche: '', description: '', targetAudience: '', tone: PageTone.PROFESSIONAL, language: 'Italiano', featureCount: 3
  });
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ siteName: 'ZenZio Admin', footerText: `© ${new Date().getFullYear()} Tutti i diritti riservati.` });

  // --- ROUTING LOGIC (SLUG SYNC) ---
  const handleRouting = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const pageSlug = params.get('s');
    
    if (pageSlug) {
      setIsLoadingPages(true);
      if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase
            .from('landing_pages')
            .select('*')
            .or(`slug.eq.${pageSlug},thank_you_slug.eq.${pageSlug}`)
            .maybeSingle();
          
          if (!error && data) {
              setSelectedPublicPage(data);
              // Decidi se è landing o thank you
              if (data.thank_you_slug === pageSlug) {
                  setView('thank_you_view');
              } else {
                  setView('product_view');
              }
          } else {
              setView('home');
              const newUrl = window.location.pathname;
              window.history.replaceState({}, '', newUrl);
          }
      }
      setIsLoadingPages(false);
    } else if (view !== 'admin' && view !== 'builder') {
        setView('home');
    }
  }, [view]);

  useEffect(() => {
    handleRouting();
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, [handleRouting]);

  // Caricamento Pagine Home
  useEffect(() => {
    if (view === 'home') {
        const fetchPublic = async () => {
            if (!supabase) return;
            setIsLoadingPages(true);
            const { data } = await supabase.from('landing_pages').select('*').eq('is_published', true).order('created_at', { ascending: false });
            if (data) setPublicPages(data);
            setIsLoadingPages(false);
        };
        fetchPublic();
    }
  }, [view]);

  const handleViewPage = (page: LandingPageRow) => {
      setSelectedPublicPage(page);
      const newUrl = `${window.location.pathname}?s=${page.slug}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      setView('product_view');
      window.scrollTo(0,0);
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured() && supabase) await supabase.auth.signOut();
    setSession(null);
    setView('home');
    window.history.replaceState({}, '', window.location.pathname);
  };

  // --- UI RENDERING ---
  if (isLoadingPages) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Se siamo in visualizzazione Prodotto (Landing)
  if (view === 'product_view' && selectedPublicPage) {
      const lang = selectedPublicPage.content.language || 'Italiano';
      const config = getLanguageConfig(lang);
      const content = {
          ...selectedPublicPage.content,
          uiTranslation: { ...config.ui, ...selectedPublicPage.content.uiTranslation }
      };
      return (
          <div className="relative">
              <button 
                onClick={() => { setView('home'); window.history.pushState({}, '', window.location.pathname); }}
                className="fixed top-4 left-4 z-[100] bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-full shadow-lg hover:scale-110 transition-all"
              >
                  <ArrowLeft className="w-5 h-5 text-slate-800" />
              </button>
              <LandingPage 
                content={content as GeneratedContent} 
                thankYouSlug={selectedPublicPage.thank_you_slug} 
                onPurchase={(url) => {
                    // Redirect manuale dopo acquisto alla Thank You Page tramite Slug
                    const tyUrl = `${window.location.pathname}?s=${selectedPublicPage.thank_you_slug}`;
                    window.history.pushState({}, '', tyUrl);
                    setView('thank_you_view');
                }}
              />
          </div>
      );
  }

  // Se siamo in visualizzazione Thank You
  if (view === 'thank_you_view' && selectedPublicPage) {
    const lang = selectedPublicPage.content.language || 'Italiano';
    const config = getLanguageConfig(lang);
    const tyContent = selectedPublicPage.thank_you_content || selectedPublicPage.content;
    return <ThankYouPage content={{ ...tyContent, uiTranslation: { ...config.ui, ...tyContent.uiTranslation } } as GeneratedContent} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('home'); window.history.pushState({}, '', window.location.pathname); }}>
                <div className="bg-blue-600 p-2 rounded-xl shadow-md rotate-3"><Sparkles className="w-5 h-5 text-white" /></div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{siteConfig.siteName}</h1>
            </div>
            {session ? (
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('admin')} className="text-sm font-bold text-blue-600 hover:underline">Admin Panel</button>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
                </div>
            ) : (
                <button onClick={() => setSession({ id: 'mock', email: 'admin@demo.com' })} className="text-xs font-bold text-slate-400 hover:text-slate-900">Admin Login</button>
            )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {view === 'home' && (
            <div className="space-y-12">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">Le Migliori Offerte, <span className="text-blue-600">Selezionate per Te</span></h2>
                    <p className="text-slate-500 text-lg">Qualità garantita, spedizione veloce e pagamento alla consegna sicuro.</p>
                </div>

                {publicPages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {publicPages.map(page => (
                            <PageCard key={page.id} page={page} onView={handleViewPage} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] p-16 text-center border border-slate-100 shadow-sm">
                        <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900">Nessuna offerta attiva</h3>
                        <p className="text-slate-500">Torna a trovarci presto per scoprire le nuove promozioni.</p>
                    </div>
                )}
            </div>
        )}
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-8 mt-20">
          <div className="container mx-auto px-6 text-center">
              <p className="text-slate-400 text-sm">{siteConfig.footerText}</p>
          </div>
      </footer>
    </div>
  );
};
