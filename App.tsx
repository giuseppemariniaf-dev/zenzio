
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured, base64ToBlob } from './services/supabaseClient';
import { generateLandingPage, generateReviews, generateActionImages, translateLandingPage, getLanguageConfig } from './services/geminiService';
import LandingPage, { ThankYouPage } from './components/LandingPage';
import { ProductDetails, GeneratedContent, PageTone, UserSession, LandingPageRow, TemplateId, FormFieldConfig, TypographyConfig, UiTranslation, SiteConfig, Testimonial, VideoItem, Order } from './types';
import { Loader2, LogOut, Sparkles, Star, ChevronLeft, ChevronRight, Save, ShoppingBag, ArrowRight, Trash2, Eye, UserPlus, LogIn, LayoutDashboard, Check, Image as ImageIcon, X, MonitorPlay, RefreshCcw, ArrowLeft, Settings, CreditCard, Link as LinkIcon, ListChecks, Pencil, Smartphone, Tablet, Monitor, Plus, MessageSquare, Images, Upload, Type, Truck, Flame, Zap, Globe, Banknote, MousePointerClick, Palette, Users, Copy, Target, MessageCircle, Code, Mail, Lock, Map, User, ArrowUp, ArrowDown, Package, ShieldCheck, FileText as FileTextIcon, Gift, Play, Film, Square, Send, Filter, Calendar } from 'lucide-react';

// Declare Leaflet global
declare global {
  interface Window {
    L: any;
  }
}

interface OnlineUser {
    id: string;
    lat?: number;
    lon?: number;
    city?: string;
    country?: string;
    ip?: string;
    online_at: string;
    action?: 'purchased';
    pageUrl?: string;
}

const TEMPLATES: { id: TemplateId; name: string; desc: string; color: string }[] = [
    { id: 'gadget-cod', name: 'Gadget COD', desc: 'Stile "Offerte-On". Perfetto per prodotti fisici e pagamento alla consegna.', color: 'bg-blue-600 text-white border-blue-800' },
];

const BUTTON_GRADIENTS = [
    { label: 'Orange Sunset', class: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-orange-400' },
    { label: 'Emerald Green', class: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-emerald-400' },
    { label: 'Ocean Blue', class: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-blue-400' },
    { label: 'Royal Purple', class: 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white border-purple-400' },
    { label: 'Solid Black', class: 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700' },
    { label: 'Solid Red', class: 'bg-red-600 hover:bg-red-700 text-white border-red-500' },
];

const SUPPORTED_LANGUAGES = [
    { code: 'Italiano', label: 'Italiano' },
    { code: 'Inglese', label: 'Inglese' },
    { code: 'Francese', label: 'Francese' },
    { code: 'Tedesco', label: 'Tedesco' },
    { code: 'Austriaco', label: 'Tedesco (Austria)' },
    { code: 'Spagnolo', label: 'Spagnolo' },
    { code: 'Portoghese', label: 'Portoghese' },
    { code: 'Olandese', label: 'Olandese' },
    { code: 'Polacco', label: 'Polacco' },
    { code: 'Rumeno', label: 'Rumeno' },
    { code: 'Svedese', label: 'Svedese' },
    { code: 'Bulgaro', label: 'Bulgaro' },
    { code: 'Greco', label: 'Greco' },
    { code: 'Ungherese', label: 'Ungherese' },
    { code: 'Croato', label: 'Croato' },
    { code: 'Serbo', label: 'Serbo' },
    { code: 'Slovacco', label: 'Slovacco' }
];

const TY_SUFFIXES: Record<string, string> = {
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

const getThankYouSuffix = (lang: string) => TY_SUFFIXES[lang] || '-thanks';

const SUPPORTED_CURRENCIES = [
    { symbol: '€', label: 'Euro (€)' },
    { symbol: '$', label: 'Dollaro ($)' },
    { symbol: '£', label: 'Sterlina (£)' },
    { symbol: 'lei', label: 'Leu Rumeno (lei)' },
    { symbol: 'zł', label: 'Złoty Polacco (zł)' },
    { symbol: 'kr', label: 'Corona Svedese (kr)' },
    { symbol: 'лв', label: 'Lev Bulgaro (лв)' },
    { symbol: 'Ft', label: 'Fiorino Ungherese (Ft)' },
    { symbol: 'din', label: 'Dinaro Serbo (din)' }
];

const DEFAULT_FORM_CONFIG: FormFieldConfig[] = [
    { id: 'name', label: 'Nome e Cognome', enabled: true, required: true, type: 'text' },
    { id: 'phone', label: 'Telefono', enabled: true, required: true, type: 'tel' },
    { id: 'address', label: 'Indirizzo e Civico', enabled: true, required: true, type: 'text' },
    { id: 'city', label: 'Città', enabled: true, required: true, type: 'text' },
    { id: 'cap', label: 'CAP', enabled: true, required: false, type: 'text' },
    { id: 'email', label: 'Email', enabled: false, required: false, type: 'email' },
    { id: 'notes', label: 'Note per il corriere', enabled: true, required: false, type: 'textarea' },
];

// --- MAP MODAL COMPONENT ---
const LiveMapModal = ({ isOpen, onClose, users }: { isOpen: boolean; onClose: () => void; users: OnlineUser[] }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            if (mapRef.current && !mapInstance.current && window.L) {
                mapInstance.current = window.L.map(mapRef.current).setView([45, 10], 2);
                window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 19
                }).addTo(mapInstance.current);
            }
            if (mapInstance.current) {
                // Clear previous markers
                mapInstance.current.eachLayer((layer: any) => {
                    if (layer instanceof window.L.CircleMarker) {
                        mapInstance.current.removeLayer(layer);
                    }
                });
                
                // Add new markers
                users.forEach(user => {
                    if (user.lat && user.lon) {
                        const isPurchase = user.action === 'purchased';
                        const options = {
                            radius: isPurchase ? 12 : 6,
                            fillColor: isPurchase ? "#f59e0b" : "#10b981",
                            color: isPurchase ? "#92400e" : "#333",
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.9
                        };
                        window.L.circleMarker([user.lat, user.lon], options).addTo(mapInstance.current);
                    }
                });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [isOpen, users]);
    
    useEffect(() => {
        if (!isOpen && mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }
    }, [isOpen]);

    const handleUserClick = (user: OnlineUser) => {
        if (mapInstance.current && user.lat && user.lon) {
            mapInstance.current.flyTo([user.lat, user.lon], 10);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex overflow-hidden border border-gray-200 animate-in zoom-in duration-200 h-[75vh]">
                <div className="w-2/3 h-full bg-gray-100 relative">
                    <div ref={mapRef} id="map" className="w-full h-full z-10"></div>
                </div>
                <div className="w-1/3 h-full flex flex-col bg-gray-50 border-l border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-bold text-slate-800">Utenti Attivi</h3>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full border border-emerald-200">{users.length} Online</span>
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-grow p-2 space-y-1">
                        {users.length > 0 ? (
                            users.map(user => (
                                <div 
                                    key={user.id} 
                                    className="p-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                                    onClick={() => handleUserClick(user)}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-sm text-slate-800">{user.city || 'Sconosciuto'}, {user.country || 'N/A'}</p>
                                        {user.action === 'purchased' && <span className="text-yellow-500" title="Acquisto Effettuato!">⭐</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-1">
                                        Pagina: <a href={user.pageUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600" onClick={(e) => e.stopPropagation()}>{user.pageUrl || 'N/D'}</a>
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-slate-400">
                                <p>Nessun utente online al momento.</p>
                            </div>
                        )}
                    </div>
                     <div className="p-3 bg-gray-100 text-xs text-slate-500 text-center border-t border-gray-200 flex-shrink-0">
                        <button onClick={onClose} className="font-bold text-emerald-600 hover:underline">Chiudi Mappa</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{page.slug ? `/${page.slug}` : 'Offerta Limitata'}</span>
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors"><ArrowRight className="w-4 h-4" /></div>
                </div>
            </div>
        </div>
    );
});

// Helper function to create a default thank you page content object
const createDefaultThankYouContent = (landingContent: GeneratedContent): GeneratedContent => {
    return {
        templateId: landingContent.templateId,
        language: landingContent.language,
        currency: landingContent.currency,
        uiTranslation: landingContent.uiTranslation,
        typography: landingContent.typography,
        backgroundColor: '#f8fafc',
        headline: landingContent.uiTranslation?.thankYouTitle || 'Grazie per il suo ordine!',
        subheadline: landingContent.uiTranslation?.thankYouMsg || 'Il suo ordine è stato ricevuto. Un nostro operatore la contatterà a breve al numero che ha inserito nel formulario per confermare l\'ordine.',
        heroImageBase64: undefined,
        // Empty the rest of the fields that don't apply
        heroImagePrompt: '',
        generatedImages: [],
        announcementBarText: '',
        benefits: [],
        features: [],
        testimonials: [],
        ctaText: '',
        ctaSubtext: '',
        colorScheme: 'blue',
        niche: landingContent.niche,
        // Reset non-applicable fields
        price: '',
        originalPrice: '',
        showDiscount: false,
        shippingCost: '',
        enableShippingCost: false,
        stockConfig: { enabled: false, quantity: 0 },
        socialProofConfig: { enabled: false, intervalSeconds: 0, maxShows: 0 },
        formConfiguration: [],
    };
};

const ImagePickerModal = ({ isOpen, onClose, images, onSelect }: { 
    isOpen: boolean; 
    onClose: () => void; 
    images: string[]; 
    onSelect: (image: string) => void; 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-bold text-lg text-slate-900">Scegli un'immagine dalla galleria</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {images.length > 0 ? (
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                            {images.map((img, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => onSelect(img)}
                                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500 transition"
                                >
                                    <img src={img} alt={`Gallery image ${idx+1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 py-10">Nessuna immagine nella galleria. Aggiungine una prima!</p>
                    )}
                </div>
            </div>
        </div>
    );
};


export const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'product_view' | 'thank_you_view' | 'admin' | 'preview'>('home');
  const [adminSection, setAdminSection] = useState<'pages' | 'settings' | 'orders'>('pages');
  const [publicPages, setPublicPages] = useState<LandingPageRow[]>([]);
  const [adminPages, setAdminPages] = useState<LandingPageRow[]>([]);
  const [selectedPublicPage, setSelectedPublicPage] = useState<LandingPageRow | null>(null);
  
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('gadget-cod');
  const [orderData, setOrderData] = useState<{name?: string, phone?: string, price?: string} | undefined>(undefined);
  
  const [slug, setSlug] = useState<string>('');
  const [tySlug, setTySlug] = useState<string>(''); 
  const [product, setProduct] = useState<ProductDetails>({
    name: '', niche: '', description: '', targetAudience: '', tone: PageTone.PROFESSIONAL, language: 'Italiano', image: undefined, images: [], featureCount: 3
  });
  const [imageGenerationCount, setImageGenerationCount] = useState<number>(1);
  const [genTechImages, setGenTechImages] = useState(false);
  const [genBeforeAfter, setGenBeforeAfter] = useState(false);
  const [genHumanUse, setGenHumanUse] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState(''); // State for URL input
  const [galleryImageUrl, setGalleryImageUrl] = useState(''); // State for gallery URL input
  const [newVideoUrl, setNewVideoUrl] = useState(''); // State for new video URL

  const [reviewCount, setReviewCount] = useState<number>(10);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedThankYouContent, setGeneratedThankYouContent] = useState<GeneratedContent | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null); 
  const [editingMode, setEditingMode] = useState<'landing' | 'thankyou'>('landing');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingReviews, setIsGeneratingReviews] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const tyImageInputRef = useRef<HTMLInputElement>(null);
  const boxImageInputRef = useRef<HTMLInputElement>(null);
  const [reviewUrlInputs, setReviewUrlInputs] = useState<Record<number, string>>({});

  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [previewMode, setPreviewMode] = useState<'landing' | 'thankyou'>('landing'); 
  const [stealthCount, setStealthCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ siteName: 'ZenZio.EU', footerText: `© ${new Date().getFullYear()} Tutti i diritti riservati.` });
  
  // Duplication State
  const [duplicationTarget, setDuplicationTarget] = useState<LandingPageRow | null>(null);
  const [duplicationLang, setDuplicationLang] = useState<string>('Inglese');
  const [duplicationName, setDuplicationName] = useState<string>('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [imagePicker, setImagePicker] = useState<{ isOpen: boolean; type: 'feature' | 'testimonial' | 'box' | 'thankyou' | 'testimonial_gallery'; index: number | null }>({ isOpen: false, type: 'feature', index: null });
  const userIdRef = useRef(Math.random().toString(36).substring(7));
  const presenceChannelRef = useRef<any>(null);
  const userGeoRef = useRef<Partial<OnlineUser>>({});

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderFilters, setOrderFilters] = useState({ date: '', productName: '' });
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);


  const fetchPublicPages = useCallback(async () => {
    if (!supabase) return;
    setIsLoadingPages(true);
    const { data, error } = await supabase.from('landing_pages').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(20); 
    if (!error && data) { setPublicPages(data as LandingPageRow[]); }
    setIsLoadingPages(false);
  }, []);

  const fetchAllAdminPages = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || !session) return;
    setIsLoadingPages(true);
    const { data, error } = await supabase.from('landing_pages').select('*').order('created_at', { ascending: false });
    if (!error) {
        setAdminPages(data as LandingPageRow[]);
    } else {
        console.error("Failed to fetch admin pages:", error);
        setAdminPages([]);
    }
    setIsLoadingPages(false);
  }, [session]);

    const fetchOrders = useCallback(async () => {
        if (!supabase) return;
        setIsLoadingOrders(true);
        setSelectedOrders(new Set()); // Reset selection on new fetch

        let query = supabase.from('orders').select('*');

        if (orderFilters.date) {
            const startDate = `${orderFilters.date}T00:00:00.000Z`;
            const endDate = `${orderFilters.date}T23:59:59.999Z`;
            query = query.gte('created_at', startDate).lt('created_at', endDate);
        }

        if (orderFilters.productName.trim()) {
            query = query.ilike('product_name', `%${orderFilters.productName.trim()}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching orders:", error);
            alert("Errore nel caricamento degli ordini: " + error.message);
        } else {
            // Map raw data to the Order type
            const formattedData = data.map(d => ({ ...d, raw_data: d })) as Order[];
            setOrders(formattedData);
        }
        setIsLoadingOrders(false);
    }, [orderFilters]);

    const handleResendWebhook = async () => {
        if (!webhookUrl.trim()) {
            alert("Per favore, inserisci un URL per il webhook.");
            return;
        }
        if (selectedOrders.size === 0) {
            alert("Nessun ordine selezionato.");
            return;
        }

        setIsResending(true);
        setResendStatus(null);
        const ordersToSend = orders.filter(o => selectedOrders.has(o.id));

        const promises = ordersToSend.map(order => {
            const urlParams = new URLSearchParams();
            // Utilizza raw_data per garantire che il payload sia identico all'originale
            Object.entries(order.raw_data).forEach(([key, value]) => {
                // Escludi i metadati di Supabase se presenti
                if (key !== 'id' && key !== 'created_at') {
                    urlParams.append(key, String(value));
                }
            });
             urlParams.append('event_type', 'manual_resend'); // Aggiungi un flag per il reinvio

            return fetch(webhookUrl, {
                method: 'POST',
                body: urlParams,
                mode: 'no-cors', // Mantiene la compatibilità con il metodo originale
            });
        });

        try {
            await Promise.all(promises);
            setResendStatus({ message: `${ordersToSend.length} ordini reinviati con successo.`, type: 'success' });
        } catch (error) {
            console.error("Webhook resend error:", error);
            setResendStatus({ message: "Errore durante il reinvio. Controlla la console.", type: 'error' });
        } finally {
            setIsResending(false);
            setSelectedOrders(new Set());
        }
    };


  const updateUserPresence = useCallback((pageUrl: string) => {
    if (presenceChannelRef.current && presenceChannelRef.current.state === 'joined') {
        const stateToTrack: Partial<OnlineUser> = {
            ...userGeoRef.current, // Get latest geo data
            pageUrl, // Add the new page URL
        };
        presenceChannelRef.current.track(stateToTrack);
    }
  }, []);


  // Effect for fetching data based on the current view
  useEffect(() => {
    if (view === 'home' && isSupabaseConfigured()) {
      fetchPublicPages();
    }
    if (view === 'admin' && session) {
        if (adminSection === 'pages') {
          fetchAllAdminPages();
        } else if (adminSection === 'orders') {
          fetchOrders();
        }
    }
  }, [view, session, adminSection, fetchPublicPages, fetchAllAdminPages, fetchOrders]);

  // Effect for setting up auth, routing, and other initial configurations
  useEffect(() => {
    const fetchSettings = async () => {
        if (isSupabaseConfigured() && supabase) {
            const { data, error } = await supabase.from('site_settings').select('config').eq('id', 1).maybeSingle();
            if (!error && data && data.config) setSiteConfig(data.config);
        } else {
            const savedConfig = localStorage.getItem('site_config');
            if(savedConfig) try { setSiteConfig(JSON.parse(savedConfig)); } catch(e){ console.error("Error parsing site config", e); }
        }
    };
    fetchSettings();
    let authSubscription: { unsubscribe: () => void } | null = null;
    let eventsChannel: any = null;

    const handleRouting = async () => {
      updateUserPresence(window.location.pathname + window.location.search);
      const params = new URLSearchParams(window.location.search);
      const pageId = params.get('p');
      const pageSlug = params.get('s');
      
      if (pageId || pageSlug) {
          setIsLoadingPages(true);
          if (isSupabaseConfigured() && supabase) {
              let query;
              if (pageSlug) {
                  query = supabase.from('landing_pages').select('*').or(`slug.eq.${pageSlug},thank_you_slug.eq.${pageSlug}`).maybeSingle();
              } else if (pageId) {
                  query = supabase.from('landing_pages').select('*').eq('id', pageId).maybeSingle();
              }

              if (query) {
                  const { data: matchedPage, error } = await query;
                  
                  if (!error && matchedPage) {
                      setSelectedPublicPage(matchedPage);
                      if (matchedPage.slug === pageSlug || matchedPage.id === pageId) {
                          setView('product_view');
                      } else {
                          setView('thank_you_view');
                      }
                  } else {
                      if (error) console.error("Error fetching page:", error.message);
                      window.history.replaceState({}, '', window.location.pathname);
                  }
              }
          }
          setIsLoadingPages(false);
      }
    };

    if (isSupabaseConfigured() && supabase) {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session ? { id: session.user.id, email: session.user.email || '' } : null);

            const params = new URLSearchParams(window.location.search);
            const onContentPage = params.get('p') || params.get('s');

            if (event === 'SIGNED_OUT') {
                setView('home');
                return;
            }
            
            if (event === 'SIGNED_IN') {
                setView('admin');
                return;
            }

            if (event === 'INITIAL_SESSION' && session && !onContentPage) {
                setView('admin');
            }
        });
        authSubscription = data.subscription;

      presenceChannelRef.current = supabase.channel('online_users', {
         config: { presence: { key: userIdRef.current } }
      });

      presenceChannelRef.current.on('presence', { event: 'sync' }, () => {
          const newState = presenceChannelRef.current.presenceState();
          const users: OnlineUser[] = Object.values(newState).flatMap((userState: any) => userState);
          setOnlineUsers(users);
      }).subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
              let geoData: Partial<OnlineUser> = {};
              try {
                  const res = await fetch('https://ipapi.co/json/');
                  const data = await res.json();
                  if (!data.error) {
                      geoData = {
                          ip: data.ip,
                          city: data.city,
                          country: data.country_name,
                          lat: data.latitude,
                          lon: data.longitude,
                      };
                  }
              } catch (e) { console.warn("Geo fetch failed", e); }
              
              userGeoRef.current = geoData; // Store geo data in ref

              // Track initial state with full info
              const initialState: Partial<OnlineUser> = {
                  ...userGeoRef.current,
                  id: userIdRef.current,
                  online_at: new Date().toISOString(),
                  pageUrl: window.location.pathname + window.location.search,
              };
              await presenceChannelRef.current.track(initialState);
          }
      });
      
      eventsChannel = supabase.channel('page_events');
      eventsChannel.on('broadcast', { event: 'purchase' }, ({ payload }: { payload: { userId: string, pageUrl: string } }) => {
          setOnlineUsers(prevUsers =>
              prevUsers.map(user =>
                  user.id === payload.userId
                      ? { ...user, action: 'purchased', pageUrl: payload.pageUrl }
                      : user
              )
          );
      }).subscribe();

    } else {
        setIsLoadingPages(false);
        setPublicPages([{ id: '1', created_at: new Date().toISOString(), product_name: 'CryptoBot 3000', niche: 'Finanza', is_published: true, slug: 'cryptobot-3000', thank_you_slug: 'cryptobot-3000-grazie', content: { templateId: 'classic', language: 'Italiano', headline: "Sblocca i tuoi guadagni", subheadline: "Il bot di trading automatico n.1", heroImagePrompt: "trading", benefits: ["Sicuro", "Veloce"], features: [], testimonial: { name: "Test", role: "User", text: "Wow" }, testimonials: [{ name: "Test", role: "User", text: "Wow" }], ctaText: "Compra Ora", ctaSubtext: "Garanzia", colorScheme: "blue", niche: "Finanza", price: "49.00", currency: "€", originalPrice: "99.00", showDiscount: true, announcementBarText: "SPEDIZIONE GRATUITA + PAGAMENTO ALLA CONSEGNA", formConfiguration: DEFAULT_FORM_CONFIG, showSocialProofBadge: true, socialProofConfig: { enabled: true, intervalSeconds: 10, maxShows: 4 }, shippingCost: "0", enableShippingCost: false } }]);
    }
    
    window.addEventListener('popstate', handleRouting);
    handleRouting(); // Initial call on mount
    
    return () => { 
        if (authSubscription) authSubscription.unsubscribe(); 
        if (presenceChannelRef.current) supabase?.removeChannel(presenceChannelRef.current);
        if (eventsChannel) supabase?.removeChannel(eventsChannel);
        window.removeEventListener('popstate', handleRouting); 
    };
  }, [updateUserPresence]);

  const handlePurchase = useCallback((pageUrl: string) => {
      if (isSupabaseConfigured() && supabase) {
          const channel = supabase.channel('page_events');
          channel.send({
              type: 'broadcast',
              event: 'purchase',
              payload: { userId: userIdRef.current, pageUrl }
          });
      }
  }, []);

  const formatSlug = (text: string) => { return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); };

  const saveSiteSettings = async () => {
      if (isSupabaseConfigured() && supabase && session) { const { error } = await supabase.from('site_settings').upsert({ id: 1, config: siteConfig }); if (error) { console.error("Settings save error:", error); alert("Errore salvataggio impostazioni: " + error.message); } else { alert("Impostazioni del sito salvate nel database!"); } } else { localStorage.setItem('site_config', JSON.stringify(siteConfig)); alert("Impostazioni del sito salvate (Locale)!"); }
  };

  const handleClearCache = () => {
    if (confirm("Sei sicuro di voler pulire la cache e ricaricare l'applicazione? Eventuali modifiche non salvate andranno perse.")) {
        // FIX: The `reload` method is called without arguments, as the boolean parameter is deprecated.
        window.location.reload();
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setAuthError(''); setAuthSuccess('');
    if (isSupabaseConfigured() && supabase) {
      if (isRegistering) { const { data, error } = await supabase.auth.signUp({ email, password }); if (error) setAuthError(error.message); else if (data.session) { setSession({ id: data.session.user.id, email: data.session.user.email || '' }); setIsLoginOpen(false); setView('admin'); } else { setAuthSuccess("Registrazione avvenuta! Controlla la posta."); } } else { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setAuthError(error.message); else if (data.session?.user) { setSession({ id: data.session.user.id, email: data.session.user.email || '' }); setIsLoginOpen(false); setView('admin'); } }
    } else { setAuthError("Supabase non configurato. Controlla services/supabaseClient.ts"); }
    setLoading(false);
  };

  const handleLogout = async () => { if (isSupabaseConfigured() && supabase) await supabase.auth.signOut(); setSession(null); setView('home'); };
  
  const handleStealthClick = () => {
    if (session) {
        setView('admin');
        return;
    }
    const now = Date.now();
    if (now - lastClickTime < 1000) {
        const newCount = stealthCount + 1;
        setStealthCount(newCount);
        if (newCount >= 3) {
            setIsLoginOpen(true);
            setStealthCount(0);
        }
    } else {
        setStealthCount(1);
    }
    setLastClickTime(now);
  };

  const handleAddImageUrl = (url: string) => {
    if (!url.startsWith('http')) {
        alert("Per favore, inserisci un URL valido (http o https).");
        return;
    }
    setProduct(prev => ({ ...prev, images: [...(prev.images || []), url], image: (prev.images || []).length === 0 ? url : prev.image }));
    setImageUrl('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, forThankYouPage: boolean = false) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages: string[] = []; const fileList = Array.from(files) as File[];
      for (const file of fileList) { if (file.size > 4 * 1024 * 1024) { alert(`Immagine ${file.name} troppo grande (max 4MB). Saltata.`); continue; } await new Promise<void>((resolve) => { const reader = new FileReader(); reader.onloadend = () => { if (reader.result) newImages.push(reader.result as string); resolve(); }; reader.readAsDataURL(file); }); }
      if (forThankYouPage) {
        setGeneratedThankYouContent(prev => prev ? {...prev, heroImageBase64: newImages[0]} : null);
      } else {
        setProduct(prev => ({ ...prev, images: [...(prev.images || []), ...newImages], image: (prev.images || []).length === 0 && newImages.length > 0 ? newImages[0] : prev.image }));
      }
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!generatedContent) return;
      const files = e.target.files;
      if (files && files.length > 0) { const fileList = Array.from(files) as File[]; fileList.forEach(file => { if (file.size > 4 * 1024 * 1024) return; const reader = new FileReader(); reader.onloadend = () => { if (reader.result) { setGeneratedContent(prev => { if (!prev) return null; const existing = prev.generatedImages || []; if (!existing.includes(reader.result as string)) { return { ...prev, generatedImages: [...existing, reader.result as string] }; } return prev; }); } }; reader.readAsDataURL(file); }); }
      if (galleryInputRef.current) galleryInputRef.current.value = '';
  };
  
  const addGalleryImageUrl = (url: string) => {
      if (generatedContent && url.startsWith('http')) {
          setGeneratedContent(prev => {
              if (!prev) return null;
              const existing = prev.generatedImages || [];
              if (!existing.includes(url)) {
                  return { ...prev, generatedImages: [...existing, url] };
              }
              return prev;
          });
      }
  };

  const handleReviewImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      if (!generatedContent || !e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      if (file.size > 4 * 1024 * 1024) { alert("Immagine troppo grande"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
          if (reader.result) {
              updateTestimonial(index, 'image', reader.result as string);
          }
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
  };
  
  const handleReviewGalleryUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      if (!generatedContent || !e.target.files || e.target.files.length === 0) return;
      const files = Array.from(e.target.files);
      const readers = files.map(file => {
          return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                   if (reader.result) resolve(reader.result as string);
              };
              reader.readAsDataURL(file);
          });
      });

      Promise.all(readers).then(newImages => {
          const currentImages = generatedContent?.testimonials?.[index].images || [];
          updateTestimonial(index, 'images', [...currentImages, ...newImages]);
      });
       e.target.value = '';
  };
  
  const addReviewImage = (index: number, url: string) => {
      if (!generatedContent || !generatedContent.testimonials) return;
      const currentImages = generatedContent.testimonials[index].images || [];
      updateTestimonial(index, 'images', [...currentImages, url]);
  }

  const removeReviewImage = (reviewIndex: number, imageIndex: number) => {
      if (!generatedContent || !generatedContent.testimonials) return;
      const currentImages = generatedContent.testimonials[reviewIndex].images || [];
      const newImages = currentImages.filter((_, i) => i !== imageIndex);
      updateTestimonial(reviewIndex, 'images', newImages);
  };


  const handleReviewUrlChange = (index: number, value: string) => {
    setReviewUrlInputs(prev => ({ ...prev, [index]: value }));
  };

  const handleApplyReviewUrl = (index: number) => {
    const url = reviewUrlInputs[index] ?? ''; 
    updateTestimonial(index, 'image', url);
    setReviewUrlInputs(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
    });
  };
  
  const handleBoxImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!generatedContent || !generatedContent.boxContent || !e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      if (file.size > 4 * 1024 * 1024) { alert("Immagine troppo grande"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
          if (reader.result) {
              updateBoxContent('image', reader.result as string);
          }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const removeImage = (indexToRemove: number) => { setProduct(prev => { const newImages = (prev.images || []).filter((_, i) => i !== indexToRemove); return { ...prev, images: newImages, image: newImages.length > 0 ? newImages[0] : undefined }; }); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const removeGalleryImage = (imgToRemove: string) => { if (!generatedContent) return; const newImages = (generatedContent.generatedImages || []).filter(img => img !== imgToRemove); setGeneratedContent({ ...generatedContent, generatedImages: newImages, heroImageBase64: generatedContent.heroImageBase64 === imgToRemove ? (newImages[0] || undefined) : generatedContent.heroImageBase64 }); }
  const moveGalleryImage = (index: number, direction: 'left' | 'right') => { if (!generatedContent || !generatedContent.generatedImages) return; const images = [...generatedContent.generatedImages]; const targetIndex = direction === 'left' ? index - 1 : index + 1; if (targetIndex < 0 || targetIndex >= images.length) return; [images[index], images[targetIndex]] = [images[targetIndex], images[index]]; setGeneratedContent({ ...generatedContent, generatedImages: images }); };

  const moveFeature = (index: number, direction: 'up' | 'down') => {
      if (!generatedContent || !generatedContent.features) return;
      const features = [...generatedContent.features];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= features.length) return;
      [features[index], features[targetIndex]] = [features[targetIndex], features[index]];
      setGeneratedContent({ ...generatedContent, features });
  };

  const handleGenerate = async () => {
    if (!product.name || !product.description) { alert("Inserisci almeno il nome e una descrizione."); return; }
    setIsGenerating(true); setEditingPageId(null); if (!slug) { setSlug(formatSlug(product.name)); }
    try {
      const result = await generateLandingPage(product, reviewCount);
      let testimonials = result.testimonials || []; if (testimonials.length === 0 && result.testimonial) { testimonials = [result.testimonial]; }
      const initialGallery = [...(product.images || [])];
      let resultWithTemplate: GeneratedContent = { 
          ...result, 
          testimonials, 
          templateId: selectedTemplate, 
          heroImageBase64: initialGallery.length > 0 ? initialGallery[0] : undefined, 
          generatedImages: initialGallery,
          // Initialize Bottom CTA Config
          bottomCtaConfig: {
              enabled: true,
              headline: `Proteggi ${product.name} Oggi`,
              subheadline: "Non aspettare che sia troppo tardi. Investi nella qualità con uno sconto esclusivo."
          }
      };
      setGeneratedContent(resultWithTemplate);
      setGeneratedThankYouContent(createDefaultThankYouContent(resultWithTemplate));
      const lang = result.language || 'Italiano'; setTySlug(formatSlug(product.name) + getThankYouSuffix(lang));
      if (product.images && product.images.length > 0) { setIsGeneratingImage(true); const styles: string[] = []; if (genTechImages) styles.push('technical'); if (genBeforeAfter) styles.push('before_after'); if (genHumanUse) styles.push('human_use'); generateActionImages(product, imageGenerationCount, styles, customImagePrompt).then(generatedImages => { if (generatedImages && generatedImages.length > 0) { setGeneratedContent(prev => { if (!prev) return null; const newGallery = [...generatedImages, ...(prev.generatedImages || [])]; return { ...prev, heroImageBase64: generatedImages[0], generatedImages: newGallery }; }); } setIsGeneratingImage(false); }).catch(err => { console.error("Background image gen failed", err); setIsGeneratingImage(false); }); }
    } catch (error) { console.error(error); alert("Errore generazione. Controlla la console o l'API KEY."); } finally { setIsGenerating(false); }
  };

  const handleGenerateMoreReviews = async () => { if(!generatedContent) return; setIsGeneratingReviews(true); try { const lang = generatedContent.language || 'Italiano'; const newReviews = await generateReviews(product.name || generatedContent.headline, generatedContent.niche, lang); if(newReviews.length > 0) { setGeneratedContent(prev => { if(!prev) return null; return { ...prev, testimonials: [...(prev.testimonials || []), ...newReviews] } }) } } catch(err) { alert("Errore generazione recensioni."); } finally { setIsGeneratingReviews(false); } };

  const handleGenerateMoreImages = async () => { if (!generatedContent) return; const sourceImage = generatedContent.heroImageBase64 || (generatedContent.generatedImages && generatedContent.generatedImages.length > 0 ? generatedContent.generatedImages[0] : null) || product.image; if (!sourceImage) { alert("Nessuna immagine sorgente trovata. Caricane una prima."); return; } setIsGeneratingImage(true); try { const styles: string[] = []; if (genTechImages) styles.push('technical'); if (genBeforeAfter) styles.push('before_after'); if (genHumanUse) styles.push('human_use'); const tempProduct = { ...product, image: sourceImage, images: [sourceImage] }; const newImages = await generateActionImages(tempProduct, imageGenerationCount, styles, customImagePrompt); if (newImages && newImages.length > 0) { setGeneratedContent(prev => { if (!prev) return null; const uniqueNew = newImages.filter(img => !prev.generatedImages?.includes(img)); return { ...prev, generatedImages: [...uniqueNew, ...(prev.generatedImages || [])] }; }); } } catch(e) { console.error(e); alert("Errore generazione immagini"); } finally { setIsGeneratingImage(false); } };
  
  // Initialize Duplication
  const handleOpenDuplicate = (page: LandingPageRow) => {
    setDuplicationTarget(page);
    setDuplicationName(`${page.product_name} (Copia)`);
    setDuplicationLang(page.content.language || 'Italiano');
  };

  const handleProcessDuplication = async () => { 
      if (!duplicationTarget) return; 
      
      const originalLang = duplicationTarget.content.language || 'Italiano';
      const isTranslation = duplicationLang !== originalLang;

      if (isTranslation) {
        setIsDuplicating(true); 
        try { 
            const translatedContent = await translateLandingPage(duplicationTarget.content, duplicationLang); 
            setGeneratedContent(translatedContent);
            // Also translate thank you page if it exists
            if (duplicationTarget.thank_you_content) {
                const translatedTYContent = await translateLandingPage(duplicationTarget.thank_you_content, duplicationLang);
                setGeneratedThankYouContent(translatedTYContent);
            } else {
                setGeneratedThankYouContent(createDefaultThankYouContent(translatedContent));
            }
            setProduct({ 
                name: duplicationName, 
                niche: duplicationTarget.niche, 
                description: "Pagina Tradotta", 
                targetAudience: "N/A", 
                tone: PageTone.PROFESSIONAL, 
                language: duplicationLang, 
                featureCount: translatedContent.features.length,
                image: translatedContent.heroImageBase64,
                images: translatedContent.generatedImages || []
            }); 
            const newSlug = formatSlug(duplicationName);
            setSlug(newSlug); 
            setTySlug(newSlug + getThankYouSuffix(duplicationLang)); 
            setEditingPageId(null); 
            setDuplicationTarget(null); 
            setAdminSection('pages');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) { 
            console.error(error); 
            alert("Errore durante la duplicazione e traduzione."); 
        } finally { 
            setIsDuplicating(false); 
        } 
      } else {
        // Simple Copy
        const newContent = { ...duplicationTarget.content };
        setGeneratedContent(newContent);
        setGeneratedThankYouContent(duplicationTarget.thank_you_content ? { ...duplicationTarget.thank_you_content } : createDefaultThankYouContent(newContent));
        setProduct({
            name: duplicationName,
            niche: duplicationTarget.niche,
            description: "Copia di " + duplicationTarget.product_name,
            targetAudience: "N/A",
            tone: PageTone.PROFESSIONAL,
            language: duplicationLang,
            featureCount: newContent.features.length,
            image: newContent.heroImageBase64,
            images: newContent.generatedImages || []
        });
        const newSlug = formatSlug(duplicationName);
        setSlug(newSlug);
        setTySlug(newSlug + getThankYouSuffix(duplicationLang));
        setEditingPageId(null);
        setDuplicationTarget(null);
        setAdminSection('pages');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleEditPage = (page: LandingPageRow) => {
      setEditingPageId(page.id);
      setSlug(page.slug || formatSlug(page.product_name));
      setTySlug(page.thank_you_slug || (page.slug + getThankYouSuffix(page.content.language || 'Italiano')));
      let testimonials = page.content.testimonials || [];
      if (testimonials.length === 0 && page.content.testimonial) {
          testimonials = [page.content.testimonial];
      }
  
      const pageLang = page.content.language || 'Italiano';
      const langConfig = getLanguageConfig(pageLang);
      const completeUiTranslation = { ...(langConfig.ui || {}), ...(page.content.uiTranslation || {}) } as UiTranslation;
  
      const contentWithDefaults = {
          ...page.content,
          testimonials,
          uiTranslation: completeUiTranslation,
          formConfiguration: page.content.formConfiguration || DEFAULT_FORM_CONFIG,
          price: page.content.price || "49.90",
          currency: page.content.currency || "€",
          originalPrice: page.content.originalPrice || "99.90",
          generatedImages: page.content.generatedImages || (page.content.heroImageBase64 ? [page.content.heroImageBase64] : []),
          typography: page.content.typography || { fontFamily: 'sans', h1Size: 'lg', h2Size: 'md', bodySize: 'md' },
          stockConfig: page.content.stockConfig || { enabled: false, quantity: 13 },
          showFeatureIcons: page.content.showFeatureIcons || false,
          language: page.content.language || 'Italiano',
          showSocialProofBadge: page.content.showSocialProofBadge !== false,
          socialProofConfig: page.content.socialProofConfig || { enabled: true, intervalSeconds: 10, maxShows: 4 },
          shippingCost: page.content.shippingCost || "0",
          enableShippingCost: page.content.enableShippingCost || false,
          insuranceConfig: page.content.insuranceConfig || { enabled: false, label: 'Assicurazione Spedizione VIP', cost: '4.99', defaultChecked: false },
          gadgetConfig: page.content.gadgetConfig || { enabled: false, label: '2 Gadget in Regalo', cost: '9.99', defaultChecked: false },
          videoConfig: page.content.videoConfig || { enabled: false, title: 'Guardalo in azione!', videos: [] },
          bottomCtaConfig: page.content.bottomCtaConfig || { enabled: true, headline: `Proteggi ${page.product_name} Oggi`, subheadline: "Non aspettare che sia troppo tardi. Investi nella qualità con uno sconto esclusivo." }, // DEFAULT BOTTOM CTA
          customTypography: page.content.customTypography || {},
          priceStyles: page.content.priceStyles || {},
          reviewsPosition: page.content.reviewsPosition,
          customHeadHtml: page.custom_head_html || page.content.customHeadHtml || '',
          customThankYouHtml: page.custom_thankyou_html || page.content.customThankYouHtml || '',
          metaLandingHtml: page.content.metaLandingHtml || '',
          tiktokLandingHtml: page.content.tiktokLandingHtml || '',
          metaThankYouHtml: page.content.metaThankYouHtml || '',
          tiktokThankYouHtml: page.content.tiktokThankYouHtml || '',
          extraLandingHtml: page.content.extraLandingHtml || '',
          extraThankYouHtml: page.content.extraThankYouHtml || '',
          customThankYouUrl: page.content.customThankYouUrl || '',
          backgroundColor: page.content.backgroundColor
      };
  
      setGeneratedContent(contentWithDefaults as GeneratedContent);
  
      const existingTyContent = page.thank_you_content 
          ? { ...page.thank_you_content, uiTranslation: completeUiTranslation } 
          : null;
      setGeneratedThankYouContent(existingTyContent ? existingTyContent as GeneratedContent : createDefaultThankYouContent(contentWithDefaults as GeneratedContent));
  
      setProduct({
          name: page.product_name,
          niche: page.niche,
          description: "Caricato da pagina esistente",
          targetAudience: "N/A",
          tone: PageTone.PROFESSIONAL,
          language: contentWithDefaults.language,
          featureCount: contentWithDefaults.features?.length || 3,
          image: contentWithDefaults.heroImageBase64
      });
  
      if (page.content.templateId) {
          setSelectedTemplate(page.content.templateId);
      }
      setReviewUrlInputs({});
      setEditingMode('landing');
  };

  const uploadImageToStorage = async (imageString: string): Promise<string> => {
      if (!supabase || !imageString || !imageString.startsWith('data:')) return imageString; // Don't upload if it's not a base64 string
      try { 
          const blob = base64ToBlob(imageString); 
          if (!blob) return imageString; 
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
          // FIX: The upload method was failing due to a type error with the Blob object.
          // Converting the blob to an ArrayBuffer before uploading is a more robust approach.
          // The `await` is crucial because `blob.arrayBuffer()` returns a Promise.
          const buffer = await blob.arrayBuffer();
          const { data, error } = await supabase.storage.from('landing-images').upload(fileName, buffer, { contentType: blob.type || 'image/png', upsert: false }); 
          if (error) { 
              console.error("Upload error:", error); 
              return imageString; 
          } 
          const { data: publicData } = supabase.storage.from('landing-images').getPublicUrl(fileName); 
          return publicData.publicUrl; 
      } catch (e) { 
          console.error("Exception uploading image:", e); 
          return imageString; 
      }
  };

  const handleSaveToDb = async () => {
    if (!generatedContent || !generatedThankYouContent) return;
    if (!session) { alert("Devi essere loggato per salvare."); return; }
    setIsSaving(true);
    try {
        const lpContentToSave = JSON.parse(JSON.stringify(generatedContent));
        const tyContentToSave = JSON.parse(JSON.stringify(generatedThankYouContent));

        if (isSupabaseConfigured() && supabase) {
            // Process landing page images
            if (lpContentToSave.heroImageBase64) lpContentToSave.heroImageBase64 = await uploadImageToStorage(lpContentToSave.heroImageBase64);
            if (lpContentToSave.generatedImages && lpContentToSave.generatedImages.length > 0) lpContentToSave.generatedImages = await Promise.all(lpContentToSave.generatedImages.map((img: string) => uploadImageToStorage(img)));
            if (lpContentToSave.features) for (let i = 0; i < lpContentToSave.features.length; i++) { if (lpContentToSave.features[i].image) lpContentToSave.features[i].image = await uploadImageToStorage(lpContentToSave.features[i].image); }
            
            // Process Testimonial Images (including multiple images per review)
            if (lpContentToSave.testimonials) {
                for (let i = 0; i < lpContentToSave.testimonials.length; i++) { 
                    if (lpContentToSave.testimonials[i].image) {
                        lpContentToSave.testimonials[i].image = await uploadImageToStorage(lpContentToSave.testimonials[i].image);
                    }
                    if (lpContentToSave.testimonials[i].images && lpContentToSave.testimonials[i].images.length > 0) {
                         lpContentToSave.testimonials[i].images = await Promise.all(lpContentToSave.testimonials[i].images.map((img: string) => uploadImageToStorage(img)));
                    }
                }
            }
            
            if (lpContentToSave.boxContent && lpContentToSave.boxContent.image) lpContentToSave.boxContent.image = await uploadImageToStorage(lpContentToSave.boxContent.image);
            
            // Process thank you page images
            if (tyContentToSave.heroImageBase64) tyContentToSave.heroImageBase64 = await uploadImageToStorage(tyContentToSave.heroImageBase64);
        }

        const finalSlug = slug || formatSlug(product.name); 
        const lang = generatedContent.language || 'Italiano'; 
        const finalTySlug = tySlug || (finalSlug + getThankYouSuffix(lang)); 
        const customHeadScript = lpContentToSave.customHeadHtml || ''; 
        
        // This is tricky, customThankyouHtml from the old model is now on the TY page content.
        // Let's assume meta/tiktok fields on the TY content are what matters.
        const customThankYouScript = tyContentToSave.customThankYouHtml || '';

        const lpContentPayload = { ...lpContentToSave, templateId: selectedTemplate, thankYouConfig: { enabled: true, slugSuffix: getThankYouSuffix(lang) } };
        
        const dbPayload = {
            product_name: product.name,
            slug: finalSlug,
            thank_you_slug: finalTySlug,
            niche: product.niche,
            content: lpContentPayload,
            thank_you_content: tyContentToSave,
            is_published: true,
            custom_head_html: customHeadScript,
            custom_thankyou_html: customThankYouScript // This field is now redundant but kept for safety
        };

        if (isSupabaseConfigured() && supabase && session.id !== 'admin-local') {
            let error: any;
            if (editingPageId) { 
                const { error: updateError } = await supabase.from('landing_pages').update(dbPayload).eq('id', editingPageId); 
                error = updateError;
            } else { 
                const { error: insertError } = await supabase.from('landing_pages').insert(dbPayload); 
                error = insertError; 
            }
            if (error) {
                console.error("Supabase save error:", error);
                if (error.message.includes('thank_you_content') && error.code === 'PGRST204') {
                    alert("Errore Database: La colonna 'thank_you_content' non esiste. Esegui il comando SQL per aggiungerla:\n\nALTER TABLE public.landing_pages\nADD COLUMN thank_you_content jsonb;");
                } else {
                    alert("Errore salvataggio database: " + error.message);
                }
            } else {
                alert(editingPageId ? "Pagina aggiornata con successo!" : "Pagina pubblicata con successo!");
                await fetchAllAdminPages();
                handleCloseEditor();
            }
        } else {
            // MOCK MODE
            alert("Modalità Demo: Pagina salvata localmente.");
            handleCloseEditor();
        }
    } catch (err) { console.error("Unexpected error saving:", err); alert("Errore imprevisto durante il salvataggio."); } finally { setIsSaving(false); }
  };

  // Adding the new helper for updating bottom CTA
  const updateBottomCtaConfig = (key: 'enabled' | 'headline' | 'subheadline', value: any) => {
      if (!generatedContent) return;
      const currentConfig = generatedContent.bottomCtaConfig || { enabled: false, headline: '', subheadline: '' };
      setGeneratedContent({ ...generatedContent, bottomCtaConfig: { ...currentConfig, [key]: value } });
  };

  const handleCloseEditor = () => {
      setEditingPageId(null);
      setGeneratedContent(null);
      setGeneratedThankYouContent(null);
      setProduct({ name: '', niche: '', description: '', targetAudience: '', tone: PageTone.PROFESSIONAL, language: 'Italiano', featureCount: 3, image: undefined, images: [] });
      setSlug('');
      setTySlug('');
      setAdminSection('pages');
      setDuplicationTarget(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDiscard = () => {
      if (confirm("Sei sicuro di voler uscire? Le modifiche non salvate andranno perse.")) {
          handleCloseEditor();
      }
  };

  const updateStateContent = (updater: (prev: GeneratedContent) => GeneratedContent) => {
      if (editingMode === 'landing') {
          setGeneratedContent(prev => prev ? updater(prev) : null);
      } else {
          setGeneratedThankYouContent(prev => prev ? updater(prev) : null);
      }
  };

  const updateContentField = (field: keyof GeneratedContent, value: any) => {
      updateStateContent(prev => ({ ...prev, [field]: value }));
  };

  const updateStockConfig = (field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          return { ...prev, stockConfig: { ...prev.stockConfig, [field]: value } as any };
      });
  };

  const updateSocialProofConfig = (field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          return { ...prev, socialProofConfig: { ...prev.socialProofConfig, [field]: value } as any };
      });
  };

  const updateInsuranceConfig = (field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          return { ...prev, insuranceConfig: { ...prev.insuranceConfig, [field]: value } as any };
      });
  };

  const updateGadgetConfig = (field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          return { ...prev, gadgetConfig: { ...prev.gadgetConfig, [field]: value } as any };
      });
  };

  const updateFeature = (index: number, field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          const newFeatures = [...prev.features];
          newFeatures[index] = { ...newFeatures[index], [field]: value };
          return { ...prev, features: newFeatures };
      });
  };

  const updateBenefit = (index: number, value: string) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          const newBenefits = [...prev.benefits];
          newBenefits[index] = value;
          return { ...prev, benefits: newBenefits };
      });
  };

  const updateBoxContent = (field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          return { ...prev, boxContent: { ...prev.boxContent, [field]: value } as any };
      });
  };

  const updateTestimonial = (index: number, field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          const newTestimonials = [...(prev.testimonials || [])];
          newTestimonials[index] = { ...newTestimonials[index], [field]: value };
          return { ...prev, testimonials: newTestimonials };
      });
  };

  const addTestimonial = () => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          const newTestimonial: Testimonial = { name: "Nuovo Cliente", text: "Recensione...", rating: 5, role: "Acquisto Verificato", date: new Date().toLocaleDateString() };
          return { ...prev, testimonials: [newTestimonial, ...(prev.testimonials || [])] };
      });
  };

  const removeTestimonial = (index: number) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          const newTestimonials = [...(prev.testimonials || [])];
          newTestimonials.splice(index, 1);
          return { ...prev, testimonials: newTestimonials };
      });
  };

  const updateFormConfig = (index: number, field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          const newForm = [...(prev.formConfiguration || [])];
          newForm[index] = { ...newForm[index], [field]: value };
          return { ...prev, formConfiguration: newForm };
      });
  };

  const updatePriceStyles = (field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          return { ...prev, priceStyles: { ...prev.priceStyles, [field]: value } };
      });
  };
  
  const updateTypography = (field: string, value: any) => {
      updateStateContent(prev => ({ ...prev, typography: { ...prev.typography, [field]: value } as TypographyConfig }));
  };

  const updateCustomTypography = (field: string, value: any) => {
      updateStateContent(prev => ({ ...prev, customTypography: { ...prev.customTypography, [field]: value } }));
  };

  const updateVideoConfig = (field: string, value: any) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          return { ...prev, videoConfig: { ...prev.videoConfig, [field]: value } as any };
      });
  };

  const addVideo = () => {
      if (!newVideoUrl.trim()) return;
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          const currentVideos = prev.videoConfig?.videos || [];
          const newVideo: VideoItem = {
              id: Math.random().toString(36).substr(2, 9),
              url: newVideoUrl,
              active: true
          };
          return { 
              ...prev, 
              videoConfig: { 
                  ...prev.videoConfig, 
                  videos: [...currentVideos, newVideo],
                  enabled: true 
              } as any 
          };
      });
      setNewVideoUrl('');
  };

  const removeVideo = (id: string) => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          const currentVideos = prev.videoConfig?.videos || [];
          return { 
              ...prev, 
              videoConfig: { 
                  ...prev.videoConfig, 
                  videos: currentVideos.filter(v => v.id !== id) 
              } as any 
          };
      });
  };

  const moveVideo = (index: number, direction: 'up' | 'down') => {
      if(editingMode !== 'landing') return;
      setGeneratedContent(prev => {
          if (!prev) return null;
          const videos = [...(prev.videoConfig?.videos || [])];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= videos.length) return prev;
          [videos[index], videos[targetIndex]] = [videos[targetIndex], videos[index]];
          return { ...prev, videoConfig: { ...prev.videoConfig, videos } as any };
      });
  };

  const handleViewPage = (page: LandingPageRow) => {
    // Set the state to show the correct page content
    setSelectedPublicPage(page);
    setView('product_view');
    window.scrollTo(0, 0);

    // Manually update the browser's URL without reloading the page
    const newUrl = new URL(window.location.href);
    newUrl.search = ''; // Clear existing search params
    if (page.slug) {
        newUrl.searchParams.set('s', page.slug);
    } else {
        newUrl.searchParams.set('p', page.id);
    }
    // Use pushState to change the URL and add to history
    window.history.pushState({}, '', newUrl);

    // Update user presence with the new, correct URL
    updateUserPresence(newUrl.pathname + newUrl.search);
};

  const handleDeletePage = async (id: string) => {
      if (!confirm("Sei sicuro di voler eliminare questa pagina?")) return;
      if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.from('landing_pages').delete().eq('id', id);
          if (error) {
              alert("Errore eliminazione: " + error.message);
          } else {
              fetchAllAdminPages();
          }
      } else {
          setAdminPages(prev => prev.filter(p => p.id !== id));
      }
  };

  // ... (Render logic) ...
  if (view === 'product_view' && selectedPublicPage) {
      // ... (Existing product view logic) ...
      const pageLang = selectedPublicPage.content.language || 'Italiano';
      const langConfig = getLanguageConfig(pageLang);
      const completeUiTranslation = { ...(langConfig.ui || {}), ...(selectedPublicPage.content.uiTranslation || {}) } as UiTranslation;
      
      const contentWithDefaults = {
        ...selectedPublicPage.content,
        uiTranslation: completeUiTranslation,
        customHeadHtml: selectedPublicPage.custom_head_html || selectedPublicPage.content.customHeadHtml,
        customThankYouHtml: selectedPublicPage.custom_thankyou_html || selectedPublicPage.content.customThankYouHtml
      };

      return (
        <div className="relative">
            <div className="fixed top-3 left-3 z-[100] md:left-3 left-auto right-3 md:right-auto">
                <button 
                    onClick={() => { 
                        setView('home'); 
                        const newUrl = window.location.pathname;
                        window.history.pushState({}, '', newUrl); 
                        updateUserPresence(newUrl);
                    }} 
                    className="hidden md:flex bg-white/80 backdrop-blur-md text-slate-800 p-2 md:px-4 md:py-2 rounded-full shadow-sm border border-slate-200/50 hover:bg-white hover:shadow-md transition-all items-center gap-2 group" 
                    title="Torna allo Shop">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" /> 
                        <span className="hidden md:inline font-bold text-sm">Torna allo Shop</span>
                </button>
            </div>
            <LandingPage content={contentWithDefaults} thankYouSlug={selectedPublicPage.thank_you_slug} onPurchase={handlePurchase} />
        </div>
      );
  }

  // ... (Thank you view logic) ...
  if (view === 'thank_you_view' && selectedPublicPage) {
    const pageLang = selectedPublicPage.content.language || 'Italiano';
    const langConfig = getLanguageConfig(pageLang);

    // The base landing page content, with its UI translations completed.
    // This is needed in case we must generate a default TY page.
    const completeLandingContent = {
        ...selectedPublicPage.content,
        uiTranslation: { ...(langConfig.ui || {}), ...(selectedPublicPage.content.uiTranslation || {}) } as UiTranslation
    };

    // Use the thank_you_content if it exists, otherwise generate a default.
    // In either case, ensure its UI translations are complete.
    const tyContentSource = selectedPublicPage.thank_you_content || createDefaultThankYouContent(completeLandingContent as GeneratedContent);
    const tyContent = {
        ...tyContentSource,
        uiTranslation: { ...(langConfig.ui || {}), ...(tyContentSource.uiTranslation || {}) } as UiTranslation
    };
      return ( <div className="relative"> <ThankYouPage content={tyContent} initialData={orderData} /> </div> )
  }

  if (view === 'admin' && session) {
    return (
      <div className="min-h-screen bg-gray-100 text-slate-800 font-sans">
        <LiveMapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} users={onlineUsers} />
         <ImagePickerModal 
            isOpen={imagePicker.isOpen}
            onClose={() => setImagePicker({ isOpen: false, type: 'feature', index: null })}
            images={generatedContent?.generatedImages || []}
            onSelect={(image) => {
                if (imagePicker.type === 'feature' && imagePicker.index !== null) {
                    updateFeature(imagePicker.index, 'image', image);
                } else if (imagePicker.type === 'testimonial' && imagePicker.index !== null) {
                    updateTestimonial(imagePicker.index, 'image', image);
                } else if (imagePicker.type === 'testimonial_gallery' && imagePicker.index !== null) {
                    addReviewImage(imagePicker.index, image);
                } else if (imagePicker.type === 'box') {
                    updateBoxContent('image', image);
                } else if (imagePicker.type === 'thankyou') {
                    updateContentField('heroImageBase64', image);
                }
                setImagePicker({ isOpen: false, type: 'feature', index: null });
            }}
        />
        <nav className="border-b border-gray-200 bg-white p-4 sticky top-0 z-40">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xl"><Sparkles className="w-6 h-6" /><span>Agdid Admin</span></div>
                
                <div className="hidden md:flex gap-1 bg-gray-200 p-1 rounded-lg border border-gray-300">
                    <button onClick={() => setAdminSection('pages')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${adminSection === 'pages' ? 'bg-white text-emerald-700 shadow' : 'text-slate-500 hover:text-slate-900'}`}>Generatore</button>
                    <button onClick={() => setAdminSection('orders')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${adminSection === 'orders' ? 'bg-white text-emerald-700 shadow' : 'text-slate-500 hover:text-slate-900'}`}>Ordini</button>
                    <button onClick={() => setAdminSection('settings')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${adminSection === 'settings' ? 'bg-white text-emerald-700 shadow' : 'text-slate-500 hover:text-slate-900'}`}>Impostazioni</button>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsMapOpen(true)}
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors font-semibold py-1 px-3 rounded-full bg-white border border-gray-200 hover:bg-gray-100 shadow-sm"
                >
                    <span className="relative flex h-2.5 w-2.5">
                        {onlineUsers.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${onlineUsers.length > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    </span>
                    <span>{onlineUsers.length} Live</span>
                </button>
                <button onClick={() => setView('home')} className="text-sm text-slate-500 hover:text-slate-900 mr-4">Vedi Sito Pubblico</button><span className="text-xs bg-gray-100 px-2 py-1 rounded text-slate-600 hidden sm:block">{session.email}</span><button onClick={handleLogout} className="p-2 hover:bg-gray-200 rounded-lg transition text-slate-500 hover:text-slate-900"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-12">
            {adminSection === 'settings' ? (
                // ... (Settings view) ...
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                    {/* ... Settings Content ... */}
                    <div className="flex items-center gap-3 mb-8"><div className="bg-gray-100 p-3 rounded-xl"><Settings className="w-8 h-8 text-emerald-600" /></div><div><h1 className="text-2xl font-bold text-slate-900">Impostazioni Globali Sito</h1><p className="text-slate-600">Personalizza il nome del sito e i testi del footer.</p></div></div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xl space-y-6">
                        <div><label className="block text-sm font-bold text-slate-700 mb-2">Nome del Sito</label><input type="text" value={siteConfig.siteName} onChange={(e) => setSiteConfig({...siteConfig, siteName: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold" placeholder="es. BESTOFFERS"/><p className="text-xs text-slate-500 mt-2">Appare nell'header e nel footer.</p></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-2">Testo Footer</label><input type="text" value={siteConfig.footerText} onChange={(e) => setSiteConfig({...siteConfig, footerText: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="es. © 2025 Tutti i diritti riservati."/><p className="text-xs text-slate-500 mt-2">Appare in fondo a tutte le pagine.</p></div>
                        <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                            <button onClick={handleClearCache} className="bg-gray-200 hover:bg-gray-300 text-slate-700 font-bold py-3 px-6 rounded-xl transition flex items-center gap-2 text-sm"><RefreshCcw className="w-4 h-4"/> Pulisci Cache & Ricarica</button>
                            <button onClick={saveSiteSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-2"><Save className="w-5 h-5" /> Salva Impostazioni</button>
                        </div>
                    </div>
                </div>
            ) : adminSection === 'orders' ? (
                 <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-3 rounded-xl border border-gray-200"><ShoppingBag className="w-8 h-8 text-emerald-600" /></div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Gestione Ordini</h1>
                                <p className="text-slate-600">Visualizza, filtra e gestisci gli ordini ricevuti.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full md:w-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><Calendar className="w-3 h-3"/> Data</label>
                                    <input type="date" value={orderFilters.date} onChange={e => setOrderFilters({...orderFilters, date: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-emerald-500"/>
                                </div>
                                <div>
                                     <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><ShoppingBag className="w-3 h-3"/> Nome Prodotto</label>
                                    <input type="text" value={orderFilters.productName} onChange={e => setOrderFilters({...orderFilters, productName: e.target.value})} placeholder="Filtra per prodotto..." className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-emerald-500"/>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={fetchOrders} className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition"><Filter className="w-4 h-4"/> Applica Filtri</button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-b border-gray-200">
                             <div className="flex flex-col md:flex-row items-center gap-4">
                                <div className="flex-grow w-full">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><Send className="w-3 h-3"/> Webhook URL per Reinvio</label>
                                    <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://tuo-webhook.com/endpoint" className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-mono focus:ring-emerald-500"/>
                                </div>
                                <div className="w-full md:w-auto flex-shrink-0">
                                     <button onClick={handleResendWebhook} disabled={isResending || selectedOrders.size === 0} className="w-full mt-5 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isResending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                                        Reinvia Selezionati ({selectedOrders.size})
                                    </button>
                                </div>
                             </div>
                             {resendStatus && (
                                <div className={`mt-3 p-2 text-center text-xs rounded-md ${resendStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {resendStatus.message}
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                             <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-3 text-left w-12"><input type="checkbox" onChange={(e) => {
                                            const newSelected = new Set<string>();
                                            if (e.target.checked) {
                                                orders.forEach(o => newSelected.add(o.id));
                                            }
                                            setSelectedOrders(newSelected);
                                        }} checked={selectedOrders.size > 0 && selectedOrders.size === orders.length} className="w-4 h-4 accent-emerald-500" /></th>
                                        <th className="p-3 text-left">Data</th>
                                        <th className="p-3 text-left">Prodotto</th>
                                        <th className="p-3 text-left">Cliente</th>
                                        <th className="p-3 text-left">Telefono</th>
                                        <th className="p-3 text-left">Indirizzo</th>
                                        <th className="p-3 text-left">Totale</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {isLoadingOrders ? (
                                        <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto"/></td></tr>
                                    ) : orders.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nessun ordine trovato con i filtri attuali.</td></tr>
                                    ) : (
                                        orders.map(order => (
                                            <tr key={order.id} className={`transition-colors ${selectedOrders.has(order.id) ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                                                <td className="p-3"><input type="checkbox" checked={selectedOrders.has(order.id)} onChange={() => {
                                                    const newSelected = new Set(selectedOrders);
                                                    if (newSelected.has(order.id)) {
                                                        newSelected.delete(order.id);
                                                    } else {
                                                        newSelected.add(order.id);
                                                    }
                                                    setSelectedOrders(newSelected);
                                                }} className="w-4 h-4 accent-emerald-500"/></td>
                                                <td className="p-3 font-mono text-xs text-slate-600">{new Date(order.created_at).toLocaleString('it-IT')}</td>
                                                <td className="p-3 font-bold text-slate-800">{order.product_name}</td>
                                                <td className="p-3">{order.name}</td>
                                                <td className="p-3">{order.phone}</td>
                                                <td className="p-3 text-slate-600">{order.address}, {order.city}</td>
                                                <td className="p-3 font-bold">{order.total_price}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* ... (Editor Layout: Left and Right Columns) ... */}
                    <div className="lg:col-span-5 xl:col-span-4 h-fit sticky top-24">
                        {!generatedContent ? (
                            <>
                                {/* ... (Generation Form) ... */}
                                <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900 mb-1">Crea Nuova Landing</h1><p className="text-slate-600 text-sm">Compila i dati e genera la tua pagina.</p></div>
                                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400">
                                    <div className="space-y-6">
                                        {/* ... (Existing Generation Inputs) ... */}
                                        <div>
                                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3">Step 1: Design</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {TEMPLATES.map((t) => (<div key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`cursor-pointer relative p-2 rounded-lg border-2 transition-all text-center ${selectedTemplate === t.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:bg-gray-100'}`}><div className={`h-8 mb-1 rounded w-full ${t.color}`}></div><p className="text-[10px] font-bold text-slate-800 leading-tight">{t.name}</p></div>))}
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-200 pt-6">
                                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3">Step 2: Dettagli</label>
                                            <div className="space-y-4">
                                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Nome Prodotto</label><input type="text" value={product.name} onChange={(e) => setProduct({...product, name: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="es. Integratore FocusPro"/></div>
                                                <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-slate-500 mb-1">Nicchia</label><input type="text" value={product.niche} onChange={(e) => setProduct({...product, niche: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="es. Salute"/></div><div><label className="block text-xs font-medium text-slate-500 mb-1">Target</label><input type="text" value={product.targetAudience} onChange={(e) => setProduct({...product, targetAudience: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="es. Studenti"/></div></div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Foto (Carica o Incolla URL)</label>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="w-full border border-dashed border-gray-300 hover:border-emerald-500 rounded-lg p-3 text-center cursor-pointer transition bg-gray-50 flex flex-col items-center justify-center gap-1 group" onClick={() => fileInputRef.current?.click()}>
                                                            <Images className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" />
                                                            <span className="text-[10px] text-slate-500">Carica Foto Prodotto</span>
                                                            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="flex-1 bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Oppure incolla URL immagine..."/>
                                                            <button onClick={() => handleAddImageUrl(imageUrl)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"><Plus className="w-4 h-4"/></button>
                                                        </div>
                                                        {product.images && product.images.length > 0 && (
                                                            <div className="grid grid-cols-4 gap-2 mt-2">
                                                                {product.images.map((img, idx) => (
                                                                    <div key={idx} className="relative aspect-square rounded border border-gray-300 overflow-hidden group">
                                                                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                                                        <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {product.images && product.images.length > 0 && (<div className="bg-gray-100 p-2 rounded-lg border border-gray-200 mt-2 space-y-2"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500">Genera altre varianti AI?</span><div className="flex items-center gap-2"><span className="text-xs font-bold text-emerald-600">{imageGenerationCount}</span><input type="range" min="0" max="5" value={imageGenerationCount} onChange={(e) => setImageGenerationCount(parseInt(e.target.value))} className="w-20 accent-emerald-500 h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer"/></div></div><div className="flex flex-col gap-2 pt-1 border-t border-gray-200"><div className="flex items-center gap-3"><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={genTechImages} onChange={(e) => setGenTechImages(e.target.checked)} className="w-3 h-3 accent-emerald-500 rounded"/><span className="text-[10px] text-slate-600">Tecniche/Esploso</span></label><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={genBeforeAfter} onChange={(e) => setGenBeforeAfter(e.target.checked)} className="w-3 h-3 accent-emerald-500 rounded"/><span className="text-[10px] text-slate-600">Prima/Dopo</span></label></div><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={genHumanUse} onChange={(e) => setGenHumanUse(e.target.checked)} className="w-3 h-3 accent-emerald-500 rounded"/><span className="text-[10px] text-slate-600">Umano/Lifestyle <span className="text-slate-400">(Usato da una persona)</span></span></label><div><input type="text" value={customImagePrompt} onChange={(e) => setCustomImagePrompt(e.target.value)} className="w-full bg-white border border-gray-300 rounded p-1.5 text-[10px] text-slate-900 placeholder-slate-400" placeholder="Prompt opzionale (es: ambientato in montagna...)"/></div></div></div>)}
                                                </div>
                                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Descrizione</label><textarea value={product.description} onChange={(e) => setProduct({...product, description: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none h-24" placeholder="Punti di forza..."/></div>
                                                <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-slate-500 mb-1">Tono</label><select value={product.tone} onChange={(e) => setProduct({...product, tone: e.target.value as PageTone})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none">{Object.values(PageTone).map((t) => (<option key={t} value={t}>{t}</option>))}</select></div><div><label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Globe className="w-3 h-3"/> Lingua Landing</label><select value={product.language} onChange={(e) => setProduct({...product, language: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none">{SUPPORTED_LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}</select></div></div>
                                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Numero Paragrafi/Features</label><div className="flex items-center gap-2 h-10 bg-gray-50 border border-gray-300 rounded-lg px-2"><input type="range" min="1" max="20" value={product.featureCount || 3} onChange={(e) => setProduct({...product, featureCount: parseInt(e.target.value)})} className="flex-1 accent-emerald-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><span className="text-xs font-bold text-slate-800 w-5 text-center">{product.featureCount || 3}</span></div></div>
                                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Num. Recensioni</label><div className="flex items-center gap-2 h-10 bg-gray-50 border border-gray-300 rounded-lg px-2"><input type="range" min="1" max="20" value={reviewCount} onChange={(e) => setReviewCount(parseInt(e.target.value))} className="flex-1 accent-emerald-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><span className="text-xs font-bold text-slate-800 w-5 text-center">{reviewCount}</span></div></div>
                                                <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-lg shadow-lg hover:shadow-emerald-500/20 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">{isGenerating ? (<><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>) : (<><Sparkles className="w-4 h-4" /> Genera Anteprima</>)}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                {/* ... (Edit Mode Header) ... */}
                                <div className="flex items-center gap-2 mb-4">
                                    <button onClick={handleDiscard} className="p-2 hover:bg-gray-200 rounded-full transition"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
                                    <div><h1 className="text-2xl font-bold text-slate-900 mb-0.5">Modifica Pagina</h1><p className="text-slate-500 text-xs">{product.name}</p></div>
                                </div>
                                <div className="flex items-center gap-2 mb-4 p-1 bg-gray-200 rounded-lg border border-gray-300">
                                    <button onClick={() => { setEditingMode('landing'); setPreviewMode('landing'); }} className={`flex-1 text-center py-2 px-3 rounded-md text-sm font-bold transition flex items-center justify-center gap-2 ${editingMode === 'landing' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-gray-100'}`}><FileTextIcon className="w-4 h-4"/> Landing Page</button>
                                    <button onClick={() => { setEditingMode('thankyou'); setPreviewMode('thankyou'); }} className={`flex-1 text-center py-2 px-3 rounded-md text-sm font-bold transition flex items-center justify-center gap-2 ${editingMode === 'thankyou' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-gray-100'}`}><Check className="w-4 h-4"/> Thank You Page</button>
                                </div>

                                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-600">
                                    {editingMode === 'landing' ? (
                                    <div className="space-y-8">
                                        {/* ... (Previous Sections 1-12) ... */}
                                        <div className="border-b border-gray-200 pb-4">
                                            <div className="flex items-center gap-2 mb-3"><LinkIcon className="w-4 h-4 text-emerald-600" /><label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide">URL & Link</label></div>
                                            <div className="space-y-3">
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Landing Page Slug</label>
                                                    <div className="flex items-center">
                                                        <span className="text-xs text-slate-500 bg-gray-200 px-2 py-2 rounded-l border-y border-l border-gray-300">/s/</span>
                                                        <input type="text" value={slug} onChange={(e) => setSlug(formatSlug(e.target.value))} className="w-full bg-white border border-gray-300 rounded-r p-2 text-sm text-slate-900 focus:border-emerald-500 outline-none font-mono" placeholder="nome-prodotto"/>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Thank You Page Slug (Redirect Normale)</label>
                                                    <div className="flex items-center">
                                                        <span className="text-xs text-slate-500 bg-gray-200 px-2 py-2 rounded-l border-y border-l border-gray-300">/s/</span>
                                                        <input
                                                            type="text"
                                                            value={tySlug}
                                                            onChange={(e) => setTySlug(formatSlug(e.target.value))}
                                                            className="w-full bg-white border border-gray-300 rounded-r p-2 text-sm text-slate-900 focus:border-emerald-500 outline-none font-mono"
                                                            placeholder="nome-prodotto-grazie"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Redirect URL Esterno (Ignora la Thank You Page)</label>
                                                     <input type="text" value={generatedContent.customThankYouUrl || ''} onChange={(e) => updateContentField('customThankYouUrl', e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm" placeholder="https://altrosito.com/grazie"/>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Design */}
                                        <div><label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">1. Design</label><div className="grid grid-cols-3 gap-2 mb-4">{TEMPLATES.map((t) => (<div key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`cursor-pointer p-1.5 rounded border-2 transition-all text-center ${selectedTemplate === t.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:bg-gray-100'}`}><p className="text-[9px] font-bold text-slate-800 truncate">{t.name}</p></div>))}</div></div>
                                        {/* Price & Offer */}
                                        <div className="border-t border-gray-200 pt-4"><label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">2. Prezzo & Offerta</label><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] text-slate-500">Prezzo</label><input type="text" value={generatedContent.price} onChange={(e) => updateContentField('price', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900"/></div><div><label className="text-[10px] text-slate-500">Prezzo Originale</label><input type="text" value={generatedContent.originalPrice} onChange={(e) => updateContentField('originalPrice', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900"/></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] text-slate-500">Valuta</label><select value={generatedContent.currency} onChange={(e) => updateContentField('currency', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900">{SUPPORTED_CURRENCIES.map(c => <option key={c.symbol} value={c.symbol}>{c.label}</option>)}</select></div><div><label className="text-[10px] text-slate-500">Costo Spedizione</label><input type="text" value={generatedContent.shippingCost} onChange={(e) => updateContentField('shippingCost', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900"/></div></div><div className="flex items-center gap-2"><input type="checkbox" checked={generatedContent.enableShippingCost || false} onChange={(e) => updateContentField('enableShippingCost', e.target.checked)} className="w-4 h-4 accent-emerald-500"/><span className="text-xs text-slate-600">Mostra Costo Spedizione nel carrello</span></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] text-slate-500">Quantità Stock</label><input type="number" value={generatedContent.stockConfig?.quantity || 13} onChange={(e) => updateStockConfig('quantity', parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900"/></div><div className="flex items-end pb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={generatedContent.stockConfig?.enabled || false} onChange={(e) => updateStockConfig('enabled', e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded"/><span className="text-xs text-slate-600">Mostra Scarsità</span></label></div></div>{generatedContent.stockConfig?.enabled && (<div className="mt-2 animate-in fade-in slide-in-from-top-1"><label className="text-[10px] text-slate-500">Testo Personalizzato (Usa <strong>{'{x}'}</strong> per il numero)</label><input type="text" placeholder="Es: Affrettati! Solo {x} pezzi rimasti!" value={generatedContent.stockConfig?.textOverride || ''} onChange={(e) => updateStockConfig('textOverride', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900 placeholder-slate-400"/></div>)}<div className="bg-gray-50 p-3 rounded-lg border border-gray-200"><div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-700">Notifiche Social Proof</label><input type="checkbox" checked={generatedContent.socialProofConfig?.enabled !== false} onChange={(e) => updateSocialProofConfig('enabled', e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded"/></div>{generatedContent.socialProofConfig?.enabled !== false && (<div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-slate-500">Intervallo (sec)</label><input type="number" value={generatedContent.socialProofConfig?.intervalSeconds || 10} onChange={(e) => updateSocialProofConfig('intervalSeconds', parseInt(e.target.value))} className="w-full bg-white border border-gray-300 rounded p-1 text-xs text-slate-900"/></div><div><label className="text-[10px] text-slate-500">Max Mostre</label><input type="number" value={generatedContent.socialProofConfig?.maxShows || 4} onChange={(e) => updateSocialProofConfig('maxShows', parseInt(e.target.value))} className="w-full bg-white border border-gray-300 rounded p-1 text-xs text-slate-900"/></div></div>)}</div>
                                            {/* ... Insurance & Gadget Config ... */}
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-500"/> Assicurazione Spedizione</label>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={generatedContent.insuranceConfig?.enabled || false} 
                                                        onChange={(e) => updateInsuranceConfig('enabled', e.target.checked)} 
                                                        className="w-4 h-4 accent-emerald-500 rounded"
                                                    />
                                                </div>
                                                {generatedContent.insuranceConfig?.enabled && (
                                                    <div className="space-y-2 mt-2 pt-2 border-t border-gray-200 animate-in fade-in slide-in-from-top-1">
                                                        <div>
                                                            <label className="text-[10px] text-slate-500">Etichetta</label>
                                                            <input 
                                                                type="text" 
                                                                value={generatedContent.insuranceConfig?.label || ''} 
                                                                onChange={(e) => updateInsuranceConfig('label', e.target.value)} 
                                                                className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-slate-900"/>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[10px] text-slate-500">Costo</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={generatedContent.insuranceConfig?.cost || '0.00'} 
                                                                    onChange={(e) => updateInsuranceConfig('cost', e.target.value)} 
                                                                    className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-slate-900"/>
                                                            </div>
                                                            <div className="flex items-end pb-2">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={generatedContent.insuranceConfig?.defaultChecked || false} 
                                                                        onChange={(e) => updateInsuranceConfig('defaultChecked', e.target.checked)} 
                                                                        className="w-4 h-4 accent-emerald-500 rounded"/>
                                                                    <span className="text-xs text-slate-600">Attiva di default</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Gift className="w-3 h-3 text-purple-500"/> Gadget Add-on</label>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={generatedContent.gadgetConfig?.enabled || false} 
                                                        onChange={(e) => updateGadgetConfig('enabled', e.target.checked)} 
                                                        className="w-4 h-4 accent-purple-500 rounded"
                                                    />
                                                </div>
                                                {generatedContent.gadgetConfig?.enabled && (
                                                    <div className="space-y-2 mt-2 pt-2 border-t border-gray-200 animate-in fade-in slide-in-from-top-1">
                                                        <div>
                                                            <label className="text-[10px] text-slate-500">Etichetta</label>
                                                            <input 
                                                                type="text" 
                                                                value={generatedContent.gadgetConfig?.label || ''} 
                                                                onChange={(e) => updateGadgetConfig('label', e.target.value)} 
                                                                className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-slate-900"/>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[10px] text-slate-500">Costo</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={generatedContent.gadgetConfig?.cost || '0.00'} 
                                                                    onChange={(e) => updateGadgetConfig('cost', e.target.value)} 
                                                                    className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-slate-900"/>
                                                            </div>
                                                            <div className="flex items-end pb-2">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={generatedContent.gadgetConfig?.defaultChecked || false} 
                                                                        onChange={(e) => updateGadgetConfig('defaultChecked', e.target.checked)} 
                                                                        className="w-4 h-4 accent-purple-500 rounded"/>
                                                                    <span className="text-xs text-slate-600">Attiva di default</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div></div>
                                        {/* Testo, Gallery, Benefits, Box, Features, Reviews, Form, Style, Typography, Advanced, Video */}
                                        <div className="border-t border-gray-200 pt-4"><label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">3. Testo & Contenuto</label><div className="space-y-3"><div><label className="text-[10px] text-slate-500">Headline H1</label><textarea value={generatedContent.headline} onChange={(e) => updateContentField('headline', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900 h-20"/></div><div><label className="text-[10px] text-slate-500">Subheadline H2</label><textarea value={generatedContent.subheadline} onChange={(e) => updateContentField('subheadline', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900 h-20"/></div><div><label className="text-[10px] text-slate-500">Testo Barra Annunci</label><input type="text" value={generatedContent.announcementBarText} onChange={(e) => updateContentField('announcementBarText', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900"/></div><div><label className="text-[10px] text-slate-500">Testo Bottone CTA</label><input type="text" value={generatedContent.ctaText} onChange={(e) => updateContentField('ctaText', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900"/></div><div><label className="text-[10px] text-slate-500">Sottotesto Bottone</label><input type="text" value={generatedContent.ctaSubtext} onChange={(e) => updateContentField('ctaSubtext', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-slate-900"/></div></div></div>
                                        {/* Gallery */}
                                        <div className="border-t border-gray-200 pt-4"><div className="flex justify-between items-center mb-2"><label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide">4. Galleria Immagini</label><span className="text-xs text-slate-500">{generatedContent.generatedImages?.length || 0} immagini</span></div><div className="flex flex-col gap-2"><div className="grid grid-cols-3 gap-2">{generatedContent.generatedImages?.map((img, i) => (<div key={i} className="relative aspect-square rounded border border-gray-300 overflow-hidden group bg-gray-100"><img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1"><button onClick={() => moveGalleryImage(i, 'left')} className="p-1 text-white hover:bg-white/20 rounded"><ChevronLeft className="w-4 h-4"/></button><button onClick={() => removeGalleryImage(img)} className="p-1 text-white hover:bg-red-500 rounded"><X className="w-4 h-4"/></button><button onClick={() => moveGalleryImage(i, 'right')} className="p-1 text-white hover:bg-white/20 rounded"><ChevronRight className="w-4 h-4"/></button></div><button onClick={() => updateContentField('heroImageBase64', img)} className={`absolute top-1 left-1 p-1 text-xs rounded-full border transition ${generatedContent.heroImageBase64 === img ? 'bg-emerald-500 text-white border-emerald-300' : 'bg-white/50 backdrop-blur text-slate-700 border-slate-200'}`} title="Imposta come principale"><ImageIcon className="w-3 h-3"/></button></div>))}</div><div className="flex items-center gap-2"><input type="url" value={galleryImageUrl} onChange={e => setGalleryImageUrl(e.target.value)} placeholder="Aggiungi URL" className="flex-1 bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm"/><button onClick={() => {addGalleryImageUrl(galleryImageUrl); setGalleryImageUrl('');}} className="p-2 bg-emerald-500 text-white rounded-lg"><Plus className="w-4 h-4"/></button></div><div className="w-full border border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer bg-gray-50 text-xs text-slate-500 hover:border-emerald-500" onClick={() => galleryInputRef.current?.click()}>Carica Altre<input type="file" ref={galleryInputRef} multiple className="hidden" onChange={handleGalleryUpload}/></div><button onClick={handleGenerateMoreImages} disabled={isGeneratingImage} className="w-full text-xs py-2 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-blue-100 transition">{isGeneratingImage ? <><Loader2 className="w-3 h-3 animate-spin"/> Generando...</> : <><Sparkles className="w-3 h-3"/> Genera con AI</>}</button></div></div>
                                        {/* Benefits */}
                                        <div className="border-t border-gray-200 pt-4"><label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">5. Benefici (Lista puntata)</label><div className="space-y-2">{generatedContent.benefits.map((b, i) => (<div key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0"/><input type="text" value={b} onChange={(e) => updateBenefit(i, e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-sm text-slate-900"/></div>))}</div></div>
                                        {/* Box Content */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-2"><Package className="w-4 h-4"/> Box Contenuto</label>
                                                <input type="checkbox" checked={generatedContent.boxContent?.enabled || false} onChange={e => updateBoxContent('enabled', e.target.checked)} className="w-4 h-4 accent-emerald-500"/>
                                            </div>
                                            {generatedContent.boxContent?.enabled && (
                                                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Titolo (es. "Cosa Ricevi")</label>
                                                        <input type="text" value={generatedContent.boxContent.title} onChange={e => updateBoxContent('title', e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Elementi della lista</label>
                                                        <textarea value={(generatedContent.boxContent.items || []).join('\n')} onChange={e => updateBoxContent('items', e.target.value.split('\n'))} className="w-full bg-white border border-gray-300 rounded p-2 text-sm h-24" placeholder="Un elemento per riga..."/>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Immagine (Opzionale)</label>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-12 h-12 bg-white border rounded flex-shrink-0">
                                                                {generatedContent.boxContent.image && <img src={generatedContent.boxContent.image} className="w-full h-full object-contain"/>}
                                                            </div>
                                                            <div className="flex-1 flex gap-1">
                                                                <button onClick={() => boxImageInputRef.current?.click()} className="text-xs bg-white border border-gray-300 rounded p-1.5 w-full hover:bg-gray-50">Carica</button>
                                                                <button onClick={() => setImagePicker({isOpen: true, type: 'box', index: null})} className="text-xs bg-white border border-gray-300 rounded p-1.5 w-full hover:bg-gray-50">Galleria</button>
                                                                <button onClick={() => updateBoxContent('image', '')} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded p-1.5 hover:bg-red-100"><Trash2 className="w-3 h-3"/></button>
                                                                <input type="file" ref={boxImageInputRef} className="hidden" onChange={handleBoxImageUpload} accept="image/*" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* Features */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">6. Paragrafi Features</label>
                                            <div className="flex items-center gap-2 mb-2"><label className="text-xs flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={generatedContent.showFeatureIcons || false} onChange={(e) => updateContentField('showFeatureIcons', e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded"/>Mostra Icone</label></div>
                                            <div className="space-y-4">
                                                {generatedContent.features.map((f, i) => (
                                                    <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative group">
                                                        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                            <button onClick={() => moveFeature(i, 'up')} disabled={i === 0} className="p-1 bg-white/50 backdrop-blur rounded-full text-slate-600 hover:bg-white disabled:opacity-30"><ArrowUp className="w-3 h-3"/></button>
                                                            <button onClick={() => moveFeature(i, 'down')} disabled={i === generatedContent.features.length-1} className="p-1 bg-white/50 backdrop-blur rounded-full text-slate-600 hover:bg-white disabled:opacity-30"><ArrowDown className="w-3 h-3"/></button>
                                                        </div>
                                                        <label className="text-[10px] text-slate-500">Titolo {i+1}</label>
                                                        <input type="text" value={f.title} onChange={(e) => updateFeature(i, 'title', e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm"/>
                                                        <label className="text-[10px] text-slate-500 mt-2 block">Descrizione {i+1}</label>
                                                        <textarea value={f.description} onChange={(e) => updateFeature(i, 'description', e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm h-24"/>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-12 h-12 bg-white border rounded flex-shrink-0">{f.image && <img src={f.image} className="w-full h-full object-cover"/>}</div>
                                                                <div className="flex gap-1">
                                                                    <button onClick={() => { (document.getElementById(`feature-img-${i}`) as HTMLInputElement)?.click(); }} className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">Carica</button>
                                                                    <button onClick={() => setImagePicker({isOpen: true, type: 'feature', index: i})} className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">Galleria</button>
                                                                    <button onClick={() => updateFeature(i, 'image', '')} className="text-xs bg-red-50 text-red-700 border border-red-200 p-1.5 rounded hover:bg-red-100"><Trash2 className="w-3 h-3"/></button>
                                                                    <input type="file" id={`feature-img-${i}`} className="hidden" accept="image/*" onChange={(e) => updateFeature(i, 'image', e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : '')} />
                                                                </div>
                                                            </div>
                                                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600"><input type="checkbox" checked={f.showCta || false} onChange={(e) => updateFeature(i, 'showCta', e.target.checked)} className="w-4 h-4 accent-emerald-500"/>Mostra CTA</label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Reviews */}
                                        <div className="border-t border-gray-200 pt-4"><div className="flex justify-between items-center mb-2"><label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide">7. Recensioni</label><div className="flex gap-2"><button onClick={handleGenerateMoreReviews} disabled={isGeneratingReviews} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 font-bold px-2 py-1 rounded-md hover:bg-blue-100">{isGeneratingReviews ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}</button><button onClick={addTestimonial} className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-1 rounded-md hover:bg-emerald-100"><Plus className="w-3 h-3"/></button></div></div><div><label className="text-[10px] text-slate-500">Inserisci dopo paragrafo #</label><input type="number" min="0" max={generatedContent.features.length} value={generatedContent.reviewsPosition === undefined ? generatedContent.features.length : generatedContent.reviewsPosition} onChange={(e) => updateContentField('reviewsPosition', e.target.value === '' ? undefined : parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-sm"/></div><div className="space-y-4 mt-2">{generatedContent.testimonials?.map((t, i) => (<div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative group"><button onClick={() => removeTestimonial(i)} className="absolute top-1 right-1 p-1 text-red-500 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3"/></button><div className="grid grid-cols-2 gap-2"><input type="text" value={t.name} onChange={e => updateTestimonial(i, 'name', e.target.value)} placeholder="Nome" className="bg-white border rounded p-1.5 text-xs col-span-1"/><input type="text" value={t.title} onChange={e => updateTestimonial(i, 'title', e.target.value)} placeholder="Titolo" className="bg-white border rounded p-1.5 text-xs col-span-1"/></div><textarea value={t.text} onChange={e => updateTestimonial(i, 'text', e.target.value)} placeholder="Testo recensione" className="w-full bg-white border rounded p-1.5 text-xs mt-2 h-16"/>
                                        <div className="mt-2">
                                            <label className="text-[10px] text-slate-500 mb-1 block">Immagini Recensione</label>
                                            <div className="flex flex-wrap gap-2 items-start">
                                                {/* Main Image */}
                                                <div className="relative w-16 h-16 bg-white border rounded flex-shrink-0 group/img">
                                                     {t.image ? <img src={t.image} className="w-full h-full object-cover rounded"/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-6 h-6"/></div>}
                                                     {t.image && <button onClick={() => updateTestimonial(i, 'image', '')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition"><X className="w-3 h-3"/></button>}
                                                </div>
                                                {/* Gallery Images */}
                                                {t.images?.map((img, imgIdx) => (
                                                    <div key={imgIdx} className="relative w-16 h-16 bg-white border rounded flex-shrink-0 group/img">
                                                        <img src={img} className="w-full h-full object-cover rounded" />
                                                        <button onClick={() => removeReviewImage(i, imgIdx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition"><X className="w-3 h-3"/></button>
                                                    </div>
                                                ))}
                                                {/* Add Button */}
                                                 <div className="flex flex-col gap-1">
                                                    <button onClick={() => (document.getElementById(`review-gallery-img-${i}`) as HTMLInputElement)?.click()} className="w-16 h-16 bg-white border border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition">
                                                        <Plus className="w-5 h-5"/>
                                                        <span className="text-[9px]">Add</span>
                                                    </button>
                                                    <button onClick={() => setImagePicker({isOpen: true, type: 'testimonial_gallery', index: i})} className="text-[10px] text-blue-600 hover:underline">Galleria</button>
                                                    <input type="file" id={`review-gallery-img-${i}`} className="hidden" accept="image/*" multiple onChange={(e) => handleReviewGalleryUpload(i, e)} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                            <div className="flex items-center gap-1">
                                                <input type="number" min="1" max="5" value={t.rating || 5} onChange={e => updateTestimonial(i, 'rating', parseInt(e.target.value))} className="w-12 bg-white border rounded p-1.5 text-xs"/>
                                                <Star className="w-3 h-3 text-yellow-400 fill-current"/>
                                            </div>
                                             {/* URL Input */}
                                            <div className="flex items-center gap-1 w-1/2">
                                                <input type="url" placeholder="URL immagine..." className="flex-1 bg-white border rounded p-1.5 text-[10px]" value={reviewUrlInputs[i] ?? ''} onChange={(e) => handleReviewUrlChange(i, e.target.value)} />
                                                <button type="button" onClick={() => handleApplyReviewUrl(i)} className="text-[10px] bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">Set Main</button>
                                            </div>
                                        </div>
                                        </div>))}</div></div>
                                        {/* Form */}
                                        <div className="border-t border-gray-200 pt-4"><label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">8. Form Contatti</label><div><label className="text-[10px] text-slate-500">Webhook URL</label><input type="url" value={generatedContent.webhookUrl || ''} onChange={(e) => updateContentField('webhookUrl', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm" placeholder="https://"/></div><div className="space-y-2 mt-2">{generatedContent.formConfiguration?.map((field, i) => (<div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded border"><div className="flex items-center gap-2"><input type="text" value={field.label} onChange={e => updateFormConfig(i, 'label', e.target.value)} className="bg-white border rounded p-1 text-xs"/><select value={field.type} onChange={e => updateFormConfig(i, 'type', e.target.value)} className="bg-white border rounded p-1 text-xs"><option value="text">Testo</option><option value="tel">Tel</option><option value="email">Email</option><option value="textarea">Area Testo</option></select></div><div className="flex items-center gap-3"><label className="text-xs flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={field.required} onChange={e => updateFormConfig(i, 'required', e.target.checked)} disabled={!field.enabled} className="w-3 h-3 accent-emerald-500"/>Obbl.</label><label className="text-xs flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={field.enabled} onChange={e => updateFormConfig(i, 'enabled', e.target.checked)} className="w-3 h-3 accent-emerald-500"/>Attivo</label></div></div>))}</div></div>
                                        {/* Style */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">9. Stile & Colori</label>
                                            <div className="space-y-3">
                                                <div><label className="text-[10px] text-slate-500">Colore Bottone CTA</label><div className="grid grid-cols-4 gap-2 mt-1">{BUTTON_GRADIENTS.map(b => (<button key={b.label} onClick={() => updateContentField('buttonColor', b.class)} className={`p-1 rounded text-white text-[9px] border-2 ${generatedContent.buttonColor === b.class ? 'border-emerald-500' : 'border-transparent'}`}><div className={`${b.class} w-full h-5 rounded`}></div></button>))}</div></div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Colore Prezzo (Hex)</label>
                                                        <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500">
                                                            <input
                                                                type="color"
                                                                value={generatedContent.priceStyles?.color || '#000000'}
                                                                onChange={(e) => updatePriceStyles('color', e.target.value)}
                                                                className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-l-lg p-1"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={generatedContent.priceStyles?.color || ''}
                                                                onChange={(e) => updatePriceStyles('color', e.target.value)}
                                                                className="w-full bg-transparent p-2 text-sm text-slate-900 outline-none"
                                                                placeholder="#0ea5e9"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div><label className="text-[10px] text-slate-500">Dimensione Prezzo (px)</label><input type="number" value={generatedContent.priceStyles?.fontSize?.replace('px','') || ''} onChange={(e) => updatePriceStyles('fontSize', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm"/></div>
                                                </div>
                                                <div><label className="text-[10px] text-slate-500">Colore Sfondo Pagina (Hex)</label><input type="text" value={generatedContent.backgroundColor || ''} onChange={(e) => updateContentField('backgroundColor', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm"/></div>
                                            </div>
                                        </div>
                                        {/* Typography */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">10. Tipografia</label>
                                            <div className="space-y-3">
                                                <div><label className="text-[10px] text-slate-500">Font Famiglia</label><select value={generatedContent.typography?.fontFamily} onChange={(e) => updateTypography('fontFamily', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm"><option value="sans">Sans-serif</option><option value="serif">Serif</option><option value="mono">Mono</option></select></div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div><label className="text-[10px] text-slate-500">H1</label><select value={generatedContent.typography?.h1Size} onChange={(e) => updateTypography('h1Size', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm"><option value="sm">SM</option><option value="md">MD</option><option value="lg">LG</option><option value="xl">XL</option><option value="2xl">2XL</option></select></div>
                                                    <div><label className="text-[10px] text-slate-500">H2</label><select value={generatedContent.typography?.h2Size} onChange={(e) => updateTypography('h2Size', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm"><option value="sm">SM</option><option value="md">MD</option><option value="lg">LG</option><option value="xl">XL</option></select></div>
                                                    <div><label className="text-[10px] text-slate-500">Body</label><select value={generatedContent.typography?.bodySize} onChange={(e) => updateTypography('bodySize', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm"><option value="sm">SM</option><option value="md">MD</option><option value="lg">LG</option></select></div>
                                                </div>
                                                {/* Custom Typography Inputs... */}
                                                <div>
                                                    <label className="text-[10px] text-slate-500">Dimensioni Custom (px) - <span className="text-red-500">Avanzato</span></label>
                                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                                        <input type="number" placeholder="H1" value={generatedContent.customTypography?.h1 || ''} onChange={(e) => updateCustomTypography('h1', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1 text-xs"/>
                                                        <input type="number" placeholder="H2" value={generatedContent.customTypography?.h2 || ''} onChange={(e) => updateCustomTypography('h2', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1 text-xs"/>
                                                        <input type="number" placeholder="H3 (Features)" value={generatedContent.customTypography?.h3 || ''} onChange={(e) => updateCustomTypography('h3', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1 text-xs"/>
                                                        <input type="number" placeholder="Body" value={generatedContent.customTypography?.body || ''} onChange={(e) => updateCustomTypography('body', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1 text-xs"/>
                                                        <input type="number" placeholder="Small" value={generatedContent.customTypography?.small || ''} onChange={(e) => updateCustomTypography('small', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1 text-xs"/>
                                                        <input type="number" placeholder="CTA" value={generatedContent.customTypography?.cta || ''} onChange={(e) => updateCustomTypography('cta', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1 text-xs"/>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                         {/* Advanced */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">11. Avanzato</label>
                                            <div className="space-y-3">
                                                <div><label className="text-[10px] text-slate-500">HTML Extra Body (sotto i contenuti)</label><textarea value={generatedContent.extraLandingHtml || ''} onChange={(e) => updateContentField('extraLandingHtml', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm h-24 font-mono"/></div>
                                                <div><label className="text-[10px] text-slate-500">Script <strong className="text-red-500">HEAD</strong> (Meta Pixel, GTM, etc.)</label><textarea value={generatedContent.metaLandingHtml || ''} onChange={(e) => updateContentField('metaLandingHtml', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm h-24 font-mono"/></div>
                                                <div><label className="text-[10px] text-slate-500">Script <strong className="text-sky-500">HEAD</strong> (TikTok Pixel, etc.)</label><textarea value={generatedContent.tiktokLandingHtml || ''} onChange={(e) => updateContentField('tiktokLandingHtml', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm h-24 font-mono"/></div>
                                                <div><label className="text-[10px] text-slate-500">Testo Copyright Footer</label><input type="text" value={generatedContent.customFooterCopyrightText || ''} onChange={(e) => updateContentField('customFooterCopyrightText', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm"/></div>
                                            </div>
                                        </div>
                                         {/* VIDEO SECTION (12) */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-pink-500 uppercase tracking-wide flex items-center gap-2"><Film className="w-4 h-4"/> 12. Sezione Video (TikTok/Reels)</label>
                                                <input type="checkbox" checked={generatedContent.videoConfig?.enabled || false} onChange={e => updateVideoConfig('enabled', e.target.checked)} className="w-4 h-4 accent-pink-500"/>
                                            </div>
                                            {generatedContent.videoConfig?.enabled && (
                                                <div className="space-y-3 p-3 bg-pink-50 rounded-lg border border-pink-100">
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Titolo Sezione</label>
                                                        <input type="text" value={generatedContent.videoConfig?.title || ''} onChange={e => updateVideoConfig('title', e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm" placeholder="Guardalo in azione!"/>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Aggiungi Video (Link MP4/CDN)</label>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <input type="text" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} className="flex-1 bg-white border border-gray-300 rounded p-2 text-sm" placeholder="https://cdn.example.com/video.mp4"/>
                                                            <button onClick={addVideo} disabled={!newVideoUrl.trim()} className="bg-pink-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-pink-600 disabled:opacity-50">Aggiungi</button>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 mb-2">Nota: Inserisci solo link diretti a file video (.mp4) o CDN. I link web di TikTok/Instagram non funzionano direttamente.</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {generatedContent.videoConfig?.videos?.map((v, idx) => (
                                                            <div key={v.id} className="bg-white p-2 rounded border border-gray-200 flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">{idx + 1}</div>
                                                                    <p className="text-xs text-slate-600 truncate flex-1">{v.url}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => moveVideo(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUp className="w-3 h-3"/></button>
                                                                    <button onClick={() => moveVideo(idx, 'down')} disabled={idx === (generatedContent.videoConfig?.videos?.length || 0) - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDown className="w-3 h-3"/></button>
                                                                    <button onClick={() => removeVideo(v.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3"/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(!generatedContent.videoConfig?.videos || generatedContent.videoConfig.videos.length === 0) && (
                                                            <p className="text-center text-xs text-slate-400 py-2">Nessun video aggiunto.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* NEW: BOTTOM CTA SECTION (13) */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-teal-600 uppercase tracking-wide flex items-center gap-2"><Square className="w-4 h-4"/> 13. Sezione Finale CTA (Sotto Recensioni)</label>
                                                <input type="checkbox" checked={generatedContent.bottomCtaConfig?.enabled !== false} onChange={e => updateBottomCtaConfig('enabled', e.target.checked)} className="w-4 h-4 accent-teal-600"/>
                                            </div>
                                            {generatedContent.bottomCtaConfig?.enabled !== false && (
                                                <div className="space-y-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Titolo Finale</label>
                                                        <input type="text" value={generatedContent.bottomCtaConfig?.headline || ''} onChange={e => updateBottomCtaConfig('headline', e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm" placeholder="Proteggi i Tuoi Piedi Oggi"/>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Sottotitolo</label>
                                                        <textarea value={generatedContent.bottomCtaConfig?.subheadline || ''} onChange={e => updateBottomCtaConfig('subheadline', e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm h-16" placeholder="Non aspettare che sia troppo tardi..."/>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    ) : (
                                    <div className="space-y-8 animate-in fade-in">
                                        {/* ... TY Page Settings ... */}
                                        <div className="border-b border-gray-200 pb-4"><label className="block text-xs font-bold text-purple-600 uppercase tracking-wide mb-2">Testo Thank You Page</label><div className="space-y-3"><div><label className="text-[10px] text-slate-500">Titolo (Usa <strong>{'{name}'}</strong> e <strong>{'{phone}'}</strong>)</label><input type="text" value={generatedThankYouContent?.headline || ''} onChange={(e) => updateContentField('headline', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm"/></div><div><label className="text-[10px] text-slate-500">Messaggio (Usa <strong>{'{name}'}</strong> e <strong>{'{phone}'}</strong>)</label><textarea value={generatedThankYouContent?.subheadline || ''} onChange={(e) => updateContentField('subheadline', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm h-20"/></div></div></div>
                                        <div>
                                            <label className="block text-xs font-bold text-purple-600 uppercase tracking-wide mb-2">Design Thank You Page</label>
                                            <div className="space-y-3">
                                                 <div>
                                                    <label className="text-[10px] text-slate-500">Immagine Principale</label>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-12 bg-white border rounded flex-shrink-0">
                                                            {generatedThankYouContent?.heroImageBase64 && <img src={generatedThankYouContent.heroImageBase64} className="w-full h-full object-contain"/>}
                                                        </div>
                                                        <div className="flex-1 flex gap-1">
                                                            <button onClick={() => tyImageInputRef.current?.click()} className="text-xs bg-white border border-gray-300 rounded p-1.5 w-full hover:bg-gray-50">Carica</button>
                                                            <button onClick={() => setImagePicker({isOpen: true, type: 'thankyou', index: null})} className="text-xs bg-white border border-gray-300 rounded p-1.5 w-full hover:bg-gray-50">Galleria</button>
                                                            <button onClick={() => updateContentField('heroImageBase64', '')} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded p-1.5 hover:bg-red-100"><Trash2 className="w-3 h-3"/></button>
                                                            <input type="file" ref={tyImageInputRef} className="hidden" onChange={(e) => handleImageUpload(e, true)} accept="image/*" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div><label className="text-[10px] text-slate-500">Colore Sfondo Pagina (Hex)</label><input type="text" value={generatedThankYouContent?.backgroundColor || '#f8fafc'} onChange={(e) => updateContentField('backgroundColor', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm"/></div>
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-200 pt-4">
                                            <label className="block text-xs font-bold text-purple-600 uppercase tracking-wide mb-2">Script Thank You Page</label>
                                            <div className="space-y-3">
                                                <div><label className="text-[10px] text-slate-500">HTML Extra Body (sotto i contenuti)</label><textarea value={generatedThankYouContent?.extraThankYouHtml || ''} onChange={(e) => updateContentField('extraThankYouHtml', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm h-24 font-mono"/></div>
                                                <div><label className="text-[10px] text-slate-500">Script <strong className="text-red-500">HEAD</strong> (Meta Pixel, etc.)</label><textarea value={generatedThankYouContent?.metaThankYouHtml || ''} onChange={(e) => updateContentField('metaThankYouHtml', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm h-24 font-mono"/></div>
                                                <div><label className="text-[10px] text-slate-500">Script <strong className="text-sky-500">HEAD</strong> (TikTok Pixel, etc.)</label><textarea value={generatedThankYouContent?.tiktokThankYouHtml || ''} onChange={(e) => updateContentField('tiktokThankYouHtml', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm h-24 font-mono"/></div>
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* ... (Existing Right Column Logic) ... */}
                    <div className="lg:col-span-7 xl:col-span-8">
                        {!generatedContent ? (
                           <div className="h-full">
                               <div className="flex justify-between items-center mb-6">
                                   <h2 className="text-2xl font-bold text-slate-900">Pagine Esistenti</h2>
                                   <div className="flex items-center gap-2">
                                       <button onClick={fetchAllAdminPages} className="p-2 hover:bg-gray-200 rounded-lg text-slate-500 transition"><RefreshCcw className="w-4 h-4"/></button>
                                   </div>
                               </div>
                               {isLoadingPages ? (<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500"/></div>) : (
                                   adminPages.length > 0 ? (
                                       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                           {adminPages.map(page => <PageCard key={page.id} page={page} onView={handleViewPage} onEdit={handleEditPage} onDuplicate={handleOpenDuplicate} onDelete={handleDeletePage} />)}
                                       </div>
                                   ) : (<div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-300"><p className="text-slate-500">Nessuna pagina trovata. Creane una!</p></div>)
                               )}
                               {duplicationTarget && (
                                   <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                       <div className="absolute inset-0 bg-black/60" onClick={() => setDuplicationTarget(null)}></div>
                                       <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
                                            <h3 className="text-xl font-bold mb-2">Duplica & Traduci</h3>
                                            <p className="text-sm text-slate-500 mb-6">Crea una copia o traduci la pagina <span className="font-bold">{duplicationTarget.product_name}</span>.</p>
                                            <div className="space-y-4">
                                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Nuovo Nome</label><input type="text" value={duplicationName} onChange={e => setDuplicationName(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm" /></div>
                                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Lingua di Destinazione</label><select value={duplicationLang} onChange={e => setDuplicationLang(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm">{SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></div>
                                            </div>
                                            <div className="flex justify-end gap-3 mt-8">
                                                <button onClick={() => setDuplicationTarget(null)} className="py-2 px-5 text-sm font-bold text-slate-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Annulla</button>
                                                <button onClick={handleProcessDuplication} disabled={isDuplicating} className="py-2 px-5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-2 disabled:opacity-50">{isDuplicating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Copy className="w-4 h-4"/>} Prosegui</button>
                                            </div>
                                       </div>
                                   </div>
                               )}
                           </div>
                        ) : (
                            <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden h-fit sticky top-24 animate-in fade-in zoom-in-95 duration-300">
                                <div className="p-3 bg-gray-900 flex justify-between items-center border-b border-gray-700">
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div></div>
                                    <div className="flex items-center gap-1 bg-gray-700 p-1 rounded-lg">
                                        <button onClick={() => setPreviewDevice('mobile')} className={`p-1.5 rounded-md transition ${previewDevice === 'mobile' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}><Smartphone className="w-4 h-4"/></button>
                                        <button onClick={() => setPreviewDevice('tablet')} className={`p-1.5 rounded-md transition ${previewDevice === 'tablet' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}><Tablet className="w-4 h-4"/></button>
                                        <button onClick={() => setPreviewDevice('desktop')} className={`p-1.5 rounded-md transition ${previewDevice === 'desktop' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}><Monitor className="w-4 h-4"/></button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleSaveToDb} disabled={isSaving} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50">{isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>} {editingPageId ? "Aggiorna" : "Pubblica"}</button>
                                    </div>
                                </div>
                                <div className={`mx-auto transition-all duration-300 ease-in-out ${previewDevice === 'mobile' ? 'w-[375px]' : previewDevice === 'tablet' ? 'w-[768px]' : 'w-full'}`}>
                                    <div className="w-full h-[75vh] bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400">
                                        {previewMode === 'landing' ? (
                                            <LandingPage content={generatedContent} onRedirect={(data) => { setOrderData(data); setPreviewMode('thankyou'); }} />
                                        ) : (
                                            generatedThankYouContent && <ThankYouPage content={generatedThankYouContent} initialData={orderData} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
      </div>
    );
  }

  // HOME VIEW (Default)
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-lg"><Sparkles className="w-6 h-6 text-white"/></div>
                <h1 className="text-xl font-bold text-slate-900" onClick={handleStealthClick}>{siteConfig.siteName}</h1>
            </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-12">
        <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl mb-10 border border-slate-200 bg-black">
                <video 
                    className="w-full h-full object-cover"
                    src="https://res.cloudinary.com/db1qkdntm/video/upload/v1765727527/site-businessman-working-with-virtual-reality-at-o-2025-12-09-06-42-01-utc_bnkst2.webm"
                    autoPlay
                    loop
                    muted
                    playsInline
                />
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
              Da Oltre 30 Anni <br className="hidden md:block" />
              <span className="text-emerald-600">Leader nel Risparmio e Qualità</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Non affidarti al caso. Scegli l'esperienza di chi seleziona per te solo il meglio da tre decenni. 
              Prodotti esclusivi, <strong>pagamento sicuro alla consegna</strong> e la tranquillità di acquistare da veri professionisti. 
              La tua soddisfazione è la nostra storia.
            </p>
        </div>
        {isLoadingPages ? (
             <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500"/></div>
        ) : (
            publicPages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {publicPages.map(page => <PageCard key={page.id} page={page} onView={handleViewPage} />)}
                </div>
            ) : (<div className="text-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><p className="text-slate-500">Nessuna offerta disponibile al momento. Torna a trovarci presto!</p></div>)
        )}
      </main>
      <footer className="bg-slate-50 border-t border-slate-200 mt-20">
        <div className="container mx-auto px-6 py-6 text-center text-slate-500 text-sm">{siteConfig.footerText}</div>
      </footer>
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLoginOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">{isRegistering ? 'Crea Account' : 'Accesso Admin'}</h3>
                    <p className="text-sm text-slate-500">{isRegistering ? 'Inserisci i tuoi dati per registrarti' : 'Inserisci le credenziali per accedere'}</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"/>
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"/>
                    {authError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-md">{authError}</p>}
                    {authSuccess && <p className="text-xs text-green-600 bg-green-50 p-2 rounded-md">{authSuccess}</p>}
                    <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2">{loading ? <Loader2 className="w-5 h-5 animate-spin"/> : (isRegistering ? 'Registrati' : 'Accedi')}</button>
                </form>
                <p className="text-center text-xs text-slate-500 mt-4">
                    {isRegistering ? 'Hai già un account?' : 'Non hai un account?'} <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); setAuthSuccess(''); }} className="font-bold text-emerald-600 hover:underline">{isRegistering ? 'Accedi' : 'Registrati'}</button>
                </p>
            </div>
        </div>
      )}
    </div>
  );
};
