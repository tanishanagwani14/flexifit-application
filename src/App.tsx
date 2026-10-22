/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Phone,
  MapPin,
  Clock,
  Calendar,
  Award,
  ShieldCheck,
  Star,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Instagram,
  Send,
  X,
  Sparkles,
  HeartPulse,
  Activity,
  FileText,
  UserCheck,
  Stethoscope,
  Maximize2,
  Menu,
  Heart,
  Eye,
  Check,
  LogIn,
  LogOut,
  User as UserIcon,
  Lock,
  Mail,
  AlertCircle,
  CalendarCheck,
  Clock3,
} from 'lucide-react';
import {
  CLINIC_CERTIFICATES_AND_POSTS,
  INSTAGRAM_POSTS,
  CertificateItem,
  InstagramPost,
} from './data/clinicData';
import {
  auth,
  saveUserProfile,
  getUserProfile,
  createAppointment,
  getUserAppointments,
  subscribeToUserAppointments,
  cancelAppointment,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInGuestPatient,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  googleProvider,
  UserProfile,
  AppointmentRecord,
  ADMIN_EMAIL,
} from './firebase';
import type { User } from 'firebase/auth';
import AdminPortal from './components/AdminPortal';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'services' | 'gallery' | 'instagram' | 'reviews' | 'contact'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'quick' | 'signin' | 'signup'>('quick');

  // Auth Form Fields
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Bookings / History State
  const [userAppointments, setUserAppointments] = useState<AppointmentRecord[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [bookingViewTab, setBookingViewTab] = useState<'book' | 'my-bookings'>('book');

  // Gallery filter & modal
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'certificate' | 'facility' | 'post'>('all');
  const [selectedItem, setSelectedItem] = useState<CertificateItem | null>(null);

  // Instagram Modal / Selected Post
  const [selectedInstaPost, setSelectedInstaPost] = useState<InstagramPost | null>(null);

  // AI Chat Widget State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: "Hello! I'm the Flexifit AI Assistant. Looking to consult Dr. Mohit Madan for spine care or Dr. Karuna Madan for postpartum health? Ask me anything or let me help you book an appointment!",
      time: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Booking Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientService, setPatientService] = useState('Spine & Slip Disc Rehabilitation (PIVD)');
  const [preferredDoctor, setPreferredDoctor] = useState('Dr. Mohit Madan (Spine & Musculoskeletal)');
  const [timeSlot, setTimeSlot] = useState('11:00 AM - 12:30 PM (Morning)');
  
  // Date State with explicit DD/MM/YYYY formatting
  const today = new Date();
  const formatToDDMMYYYY = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toInputDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const [dateInputValue, setDateInputValue] = useState(toInputDate(today));
  const [displayDateDDMMYY, setDisplayDateDDMMYY] = useState(formatToDDMMYYYY(today));
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  // Listen to Firebase Auth state & subscribe in real-time to user's appointments
  useEffect(() => {
    let unsubscribeAppts: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
        if (profile?.displayName) setPatientName(profile.displayName);
        else if (user.displayName) setPatientName(user.displayName);
        if (profile?.phone) setPatientPhone(profile.phone);

        // Real-time listener for patient's appointments (syncs immediately when admin confirms/updates)
        setAppointmentsLoading(true);
        if (unsubscribeAppts) unsubscribeAppts();
        const userPhone = profile?.phone || user.phoneNumber || undefined;
        unsubscribeAppts = subscribeToUserAppointments(
          user.uid,
          (bookings) => {
            setUserAppointments(bookings);
            setAppointmentsLoading(false);
          },
          undefined,
          userPhone
        );
      } else {
        if (unsubscribeAppts) unsubscribeAppts();
        setUserProfile(null);
        setUserAppointments([]);
        setAppointmentsLoading(false);
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeAppts) unsubscribeAppts();
    };
  }, []);

  const fetchUserBookings = async (uid: string) => {
    setAppointmentsLoading(true);
    const userPhone = userProfile?.phone || currentUser?.phoneNumber || undefined;
    const bookings = await getUserAppointments(uid, userPhone);
    setUserAppointments(bookings);
    setAppointmentsLoading(false);
  };

  // When date input changes, update display DD/MM/YYYY
  const handleDateChange = (isoDate: string) => {
    setDateInputValue(isoDate);
    if (isoDate) {
      const [year, month, day] = isoDate.split('-');
      if (year && month && day) {
        setDisplayDateDDMMYY(`${day}/${month}/${year}`);
      }
    }
  };

  const setRelativeDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(today.getDate() + daysAhead);
    setDateInputValue(toInputDate(target));
    setDisplayDateDDMMYY(formatToDDMMYYYY(target));
  };

  // Quick 1-Click Patient Sign-In (Name & Phone) - 100% reliable on all mobile phones!
  const handleQuickPatientSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (!authPhone.trim()) {
      setAuthError('Please enter your contact phone number.');
      return;
    }

    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const profile = await signInGuestPatient(authName.trim(), authPhone.trim());
      setUserProfile(profile);
      setPatientName(authName.trim());
      setPatientPhone(authPhone.trim());
      setShowAuthModal(false);
    } catch (err: any) {
      console.error('Quick patient sign-in error:', err);
      setAuthError(err.message || 'Could not complete quick sign in.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Auth Submit (Sign in or Sign up with Email/Password)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      if (authMode === 'signup') {
        if (!authName.trim()) {
          throw new Error('Please enter your full name.');
        }

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
          try {
            await updateProfile(userCredential.user, { displayName: authName });
          } catch (e) {
            console.warn('Profile name update skipped:', e);
          }

          try {
            const profile = await saveUserProfile(userCredential.user, authPhone);
            setUserProfile(profile);
          } catch (e) {
            console.warn('Save user profile warning:', e);
          }

          setPatientName(authName);
          if (authPhone) setPatientPhone(authPhone);
        } catch (signUpErr: any) {
          // If the account was already created during a previous attempt, try signing in directly!
          if (signUpErr.code === 'auth/email-already-in-use') {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
              if (authName && !userCredential.user.displayName) {
                try {
                  await updateProfile(userCredential.user, { displayName: authName });
                } catch {}
              }
              const profile = await saveUserProfile(userCredential.user, authPhone);
              setUserProfile(profile);
              if (authName) setPatientName(authName);
              if (authPhone) setPatientPhone(authPhone);
            } catch (signInErr: any) {
              setAuthMode('signin');
              throw new Error('This account already exists. Please enter your password above to sign in.');
            }
          } else {
            throw signUpErr;
          }
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        try {
          const profile = await getUserProfile(userCredential.user.uid);
          setUserProfile(profile);
          if (profile?.displayName) setPatientName(profile.displayName);
          if (profile?.phone) setPatientPhone(profile.phone);
        } catch (e) {
          console.warn('Get user profile warning:', e);
        }
      }

      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthPhone('');
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please switch to Sign In.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please verify your login credentials.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Google Sign-in helper with smart unauthorized-domain feedback
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await saveUserProfile(result.user);
      setUserProfile(profile);
      if (result.user.displayName) setPatientName(result.user.displayName);
      setShowAuthModal(false);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        setAuthError(
          `Firebase Error (auth/unauthorized-domain): This domain (${hostname}) is not in Firebase Console Authorized Domains. Please use Quick Patient Sign-in (Name & Phone) above to book immediately!`
        );
      } else {
        setAuthError(err.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };


  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setBookingViewTab('book');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Handle Appointment Booking - Stored in Firebase, NO WhatsApp redirect
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setAuthMode('signin');
      setShowAuthModal(true);
      return;
    }

    setFormSubmitting(true);

    try {
      // 1. Update user profile with phone if newly provided
      if (patientPhone && patientPhone !== userProfile?.phone) {
        await saveUserProfile(currentUser, patientPhone);
      }

      // 2. Save appointment to Firebase Firestore
      const bookingId = await createAppointment({
        userId: currentUser.uid,
        patientName: patientName || currentUser.displayName || 'Patient',
        patientPhone: patientPhone,
        patientEmail: currentUser.email || '',
        service: patientService,
        doctor: preferredDoctor,
        appointmentDate: displayDateDDMMYY, // DD/MM/YYYY format
        timeSlot: timeSlot,
        notes: `Direct booking via Flexifit portal.`,
      });

      setConfirmedBookingId(bookingId);

      // Refresh appointments list
      await fetchUserBookings(currentUser.uid);

      setFormSubmitting(false);
    } catch (err: any) {
      console.error('Error saving appointment:', err);
      alert('Could not save appointment to Firebase: ' + (err.message || 'Unknown error'));
      setFormSubmitting(false);
    }
  };

  // Cancel Appointment handler
  const handleCancelBooking = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      if (currentUser) {
        await cancelAppointment(currentUser.uid, appointmentId);
        await fetchUserBookings(currentUser.uid);
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert('Failed to cancel appointment.');
    }
  };

  // AI Chat Bot Interaction
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessages((prev) => [...prev, { sender: 'user', text: userText, time: now }]);
    setChatInput('');
    setIsBotTyping(true);

    setTimeout(() => {
      let botReply = '';
      const lower = userText.toLowerCase();

      if (lower.includes('book') || lower.includes('appointment') || lower.includes('slot')) {
        botReply = `You can book your appointment directly in our portal! Please sign in with your account, pick an Appointment Date in DD/MM/YYYY, and your booking will be stored securely in our system.`;
      } else if (lower.includes('mohit') || lower.includes('spine') || lower.includes('slip disc') || lower.includes('chiro')) {
        botReply = `Dr. Mohit Madan is our Senior Physiotherapist & Spine Specialist with Fellowship in Osteopathy & Chiropractic. He has helped over 5,000+ patients in Indore avoid spine surgery for PIVD slip disc and sciatica using targeted computerized decompression. Would you like to schedule an assessment with him?`;
      } else if (lower.includes('karuna') || lower.includes('postpartum') || lower.includes('women') || lower.includes('diastasis') || lower.includes('baby')) {
        botReply = `Dr. Karuna Madan is the founder of 'Bounce Back Stronger' and our Women's Health & Postnatal Rehabilitation Specialist. She specializes in Diastasis Recti recovery, C-section scar mobilization, and pelvic floor strengthening in a private dedicated studio.`;
      } else if (lower.includes('location') || lower.includes('address') || lower.includes('where') || lower.includes('indore')) {
        botReply = `Flexifit Clinics is located at: 11, Behind Aishwarya Pathology Lab, Opposite SBI Bank, Sahid Bhagat Singh Colony, Anand Nagar, Indore (M.P.) - 452001. We are open Monday to Saturday from 9:00 AM to 7:00 PM.`;
      } else if (lower.includes('fee') || lower.includes('cost') || lower.includes('charge')) {
        botReply = `Initial comprehensive clinical assessment & biomechanical diagnosis is ₹500 - ₹700, with customized treatment packages for computerized decompression, IFT electrotherapy, and manual osteopathy. You can also reach our reception at +91 88198 00030.`;
      } else {
        botReply = `Thank you for reaching out! Flexifit Clinics in Anand Nagar, Indore provides specialized Spine, Knee, Osteopathy, and Postpartum therapy. Sign in to view and manage all your appointments!`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsBotTyping(false);
    }, 900);
  };

  const filteredGallery = CLINIC_CERTIFICATES_AND_POSTS.filter((item) => {
    if (galleryFilter === 'all') return true;
    return item.type === galleryFilter;
  });

  // If in Admin View, render the dedicated Admin Portal
  if (isAdminView) {
    return <AdminPortal currentUser={currentUser} onExit={() => setIsAdminView(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans w-full max-w-full overflow-x-hidden">
      {/* Top Header / Announcement Bar */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-emerald-600 text-white text-xs sm:text-sm py-2 px-3 sm:px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-300" />
              Sahid Bhagat Singh Colony, Anand Nagar, Indore
            </span>
            <span className="hidden md:inline text-sky-200">|</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-emerald-300" />
              +91 88198 00030 / +91 7610078988
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin Portal Quick Access */}
            <button
              onClick={() => setIsAdminView(true)}
              className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 border border-white/20 text-white px-2.5 py-0.5 rounded-full transition text-xs font-bold"
              title="Admin Portal (Staff Only)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Admin Portal</span>
            </button>

            <a
              href="https://www.instagram.com/flexifitphysiotherapy.clinic/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-2.5 py-0.5 rounded-full transition font-semibold"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-300" />
              <span>@flexifitphysiotherapy.clinic</span>
            </a>
            <span className="hidden sm:flex items-center gap-1 bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full text-xs font-bold">
              <Star className="w-3 h-3 fill-slate-900" /> 4.9/5 Rating
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar with Flexifit Logo */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-2 lg:gap-4">
            {/* Logo matching logo colors - flex-shrink-0 prevents crushing or overlapping */}
            <div
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group flex-shrink-0"
            >
              <img
                src="/assets/aistudio/image_afdadbda.png"
                alt="Flexifit Clinics Logo"
                className="h-12 sm:h-14 lg:h-14 xl:h-16 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="hidden sm:block">
                <div className="flex items-center">
                  <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-sky-700">Flexi</span>
                  <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600">fit</span>
                  <span className="ml-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Clinics</span>
                </div>
                <p className="hidden xl:block text-[9.5px] xl:text-[10px] text-slate-500 font-medium tracking-tight whitespace-nowrap">
                  Spine • Osteopathy • Chiropractic • Women&apos;s Health • Indore
                </p>
                <p className="xl:hidden text-[9px] text-slate-500 font-medium tracking-tight whitespace-nowrap">
                  Spine &amp; Rehab Clinic • Indore
                </p>
              </div>
            </div>

            {/* Desktop Navigation - responsive spacing and labels so it never overlaps */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 2xl:gap-2 ml-auto justify-end flex-shrink-0">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'home' ? 'text-sky-700 bg-sky-50' : 'text-slate-600 hover:text-sky-700 hover:bg-slate-50'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'about' ? 'text-sky-700 bg-sky-50' : 'text-slate-600 hover:text-sky-700 hover:bg-slate-50'
                }`}
              >
                <span className="xl:hidden">About</span>
                <span className="hidden xl:inline">About Doctors</span>
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'services' ? 'text-sky-700 bg-sky-50' : 'text-slate-600 hover:text-sky-700 hover:bg-slate-50'
                }`}
              >
                Treatments
              </button>
              <button
                onClick={() => setActiveTab('gallery')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition flex items-center gap-1 xl:gap-1.5 whitespace-nowrap ${
                  activeTab === 'gallery' ? 'text-sky-700 bg-sky-50' : 'text-slate-600 hover:text-sky-700 hover:bg-slate-50'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span className="xl:hidden">Certificates</span>
                <span className="hidden xl:inline">Certificates &amp; Photos</span>
              </button>
              <button
                onClick={() => setActiveTab('instagram')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition flex items-center gap-1 xl:gap-1.5 whitespace-nowrap ${
                  activeTab === 'instagram' ? 'text-sky-700 bg-sky-50' : 'text-slate-600 hover:text-sky-700 hover:bg-slate-50'
                }`}
              >
                <Instagram className="w-3.5 h-3.5 text-pink-600" />
                <span className="xl:hidden">Instagram</span>
                <span className="hidden xl:inline">Instagram Feed</span>
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'reviews' ? 'text-sky-700 bg-sky-50' : 'text-slate-600 hover:text-sky-700 hover:bg-slate-50'
                }`}
              >
                Reviews
              </button>
              <button
                onClick={() => setActiveTab('contact')}
                className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'contact' ? 'text-sky-700 bg-sky-50' : 'text-slate-600 hover:text-sky-700 hover:bg-slate-50'
                }`}
              >
                Contact
              </button>

              {/* User Account / Auth Button */}
              {currentUser ? (
                <div className="flex items-center gap-1 xl:gap-1.5 ml-1 pl-1.5 xl:pl-2 border-l border-slate-200">
                  {currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
                    <button
                      onClick={() => setIsAdminView(true)}
                      className="flex items-center gap-1 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black px-2 xl:px-2.5 py-1.5 rounded-lg shadow-xs transition whitespace-nowrap"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                      <span>Admin</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveTab('contact');
                      setBookingViewTab('my-bookings');
                    }}
                    className="flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold px-2 xl:px-2.5 py-1.5 rounded-lg border border-sky-200 transition whitespace-nowrap"
                    title="View My Bookings"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-sky-600" />
                    <span className="max-w-[60px] xl:max-w-[100px] truncate">{currentUser.displayName || 'Patient'}</span>
                    {userAppointments.length > 0 && (
                      <span className="bg-emerald-600 text-white rounded-full px-1.5 text-[10px] font-black">
                        {userAppointments.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                  className="ml-1 flex items-center gap-1 text-slate-700 hover:text-sky-700 hover:bg-slate-50 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs xl:text-sm font-bold border border-slate-200 transition whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-600" />
                  <span>Sign In</span>
                </button>
              )}

              <button
                onClick={() => {
                  setActiveTab('contact');
                  setBookingViewTab('book');
                }}
                className="ml-1 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white px-2.5 xl:px-3.5 2xl:px-4 py-1.5 xl:py-2 rounded-full text-xs xl:text-sm font-bold shadow-md shadow-sky-600/20 hover:shadow-lg transition flex items-center gap-1 xl:gap-1.5 whitespace-nowrap flex-shrink-0"
              >
                <Calendar className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                <span className="hidden xl:inline">Book Appointment</span>
                <span className="xl:hidden">Book Now</span>
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 lg:hidden">
              {currentUser ? (
                <button
                  onClick={() => {
                    setActiveTab('contact');
                    setBookingViewTab('my-bookings');
                  }}
                  className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>My Bookings</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                  className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-700 hover:text-sky-700 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-2 shadow-xl">
            <button
              onClick={() => {
                setActiveTab('home');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
            >
              Home
            </button>
            <button
              onClick={() => {
                setActiveTab('about');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
            >
              About Doctors
            </button>
            <button
              onClick={() => {
                setActiveTab('services');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
            >
              Services & Treatments
            </button>
            <button
              onClick={() => {
                setActiveTab('gallery');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
            >
              Clinic Photos, Posts & Certificates
            </button>
            <button
              onClick={() => {
                setActiveTab('instagram');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
            >
              Instagram Feed (@flexifitphysiotherapy.clinic)
            </button>
            <button
              onClick={() => {
                setActiveTab('reviews');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
            >
              Patient Reviews
            </button>

            {currentUser ? (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-3">
                <span className="text-xs font-bold text-slate-700">Signed in as {currentUser.displayName || currentUser.email}</span>
                <button
                  onClick={handleSignOut}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Sign Out
                </button>
              </div>
            ) : null}

            <button
              onClick={() => {
                setIsAdminView(true);
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md font-bold text-amber-900 bg-amber-100 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Admin Portal Login</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('contact');
                setBookingViewTab('book');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md font-semibold text-emerald-700 bg-emerald-50"
            >
              Book Appointment (DD/MM/YYYY)
            </button>
          </div>
        )}
      </header>

      {/* Main Content Sections */}
      <main className="flex-grow">
        {/* ================= SECTION: HOME ================= */}
        {activeTab === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-emerald-50/30 pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-12 gap-12 items-center">
                  {/* Left Column Text */}
                  <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full shadow-sm">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>#1 Physiotherapy & Spine Clinic in Indore</span>
                      <span className="text-emerald-700">• 4.9★ Google Rating</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                      Move Freely, <br className="hidden sm:inline" />
                      <span className="bg-gradient-to-r from-sky-700 to-emerald-600 bg-clip-text text-transparent">
                        Live Without Pain.
                      </span>
                    </h1>

                    <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                      Indore&apos;s premier center for non-surgical spine decompression, joint rehabilitation, chiropractic spinal alignment, and specialized postpartum health. Led by <strong>Dr. Mohit Madan</strong> &amp; <strong>Dr. Karuna Madan</strong> at Anand Nagar.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                      <button
                        onClick={() => {
                          setActiveTab('contact');
                          setBookingViewTab('book');
                        }}
                        className="w-full sm:w-auto bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-sky-600/25 hover:shadow-xl transition flex items-center justify-center gap-2 text-base"
                      >
                        <Calendar className="w-5 h-5" />
                        <span>Book Appointment Date (DD/MM/YY)</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('gallery')}
                        className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold px-6 py-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                      >
                        <Award className="w-5 h-5 text-emerald-600" />
                        <span>View Certificates & Photos</span>
                      </button>
                    </div>

                    {/* Trust Highlights */}
                    <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-200">
                      <div className="text-left">
                        <div className="text-2xl font-black text-sky-700">12+</div>
                        <div className="text-xs text-slate-500 font-medium">Years Experience</div>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-black text-emerald-600">50K+</div>
                        <div className="text-xs text-slate-500 font-medium">Patients Treated</div>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-black text-sky-700">5K+</div>
                        <div className="text-xs text-slate-500 font-medium">Surgeries Avoided</div>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-black text-emerald-600">4.9★</div>
                        <div className="text-xs text-slate-500 font-medium">Google Maps Rating</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Visual Banner */}
                  <div className="lg:col-span-5 relative">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-gradient-to-tr from-sky-600 to-emerald-500 p-1">
                      <div className="relative rounded-[22px] overflow-hidden bg-slate-100 aspect-[4/3] sm:aspect-[1/1]">
                        <img
                          src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=80"
                          alt="Physiotherapy treatment session at Flexifit Clinics Indore"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                            <ShieldCheck className="w-4 h-4" /> ISO & IAP Standards
                          </div>
                          <h3 className="text-xl font-bold text-white">Flexifit Clinics Indore</h3>
                          <p className="text-xs text-slate-200">Advanced Spinal Traction • Postpartum Recovery • Osteopathy</p>
                        </div>
                      </div>
                    </div>

                    {/* Doctor floating badges */}
                    <div className="absolute -bottom-5 -left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Dr. Mohit Madan</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">Spine & Slip Disc Specialist</p>
                      </div>
                    </div>

                    <div className="absolute -top-4 -right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                        <Heart className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Dr. Karuna Madan</p>
                        <p className="text-[10px] text-sky-700 font-semibold">Women&apos;s Postpartum Rehab</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Feature Grid */}
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-14">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Why Flexifit Clinics Indore?
                  </span>
                  <h2 className="text-3xl font-extrabold text-slate-900 mt-3 sm:text-4xl">
                    Dedicated to Treating the Root Cause, Not Just Pain
                  </h2>
                  <p className="text-slate-600 mt-3">
                    Combining modern computerized decompression, evidence-based manual therapy, and patient-first rehabilitation.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="bg-slate-50 hover:bg-sky-50/50 p-8 rounded-2xl border border-slate-200/80 transition duration-300 shadow-sm hover:shadow-md">
                    <div className="w-14 h-14 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center mb-6">
                      <Activity className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Non-Surgical Spine Decompression</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      Computerized mechanical traction designed to restore disc height, reduce herniation pressure, and release trapped sciatic nerves.
                    </p>
                    <button
                      onClick={() => setActiveTab('services')}
                      className="text-sky-700 font-bold text-sm flex items-center gap-1 hover:text-sky-800"
                    >
                      Read treatment details <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-slate-50 hover:bg-emerald-50/50 p-8 rounded-2xl border border-slate-200/80 transition duration-300 shadow-sm hover:shadow-md">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-6">
                      <HeartPulse className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Postpartum &lsquo;Bounce Back&rsquo; Rehab</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      Dr. Karuna Madan&apos;s signature program for Diastasis Recti, pelvic floor weakness, and safe post-delivery exercise in Indore.
                    </p>
                    <button
                      onClick={() => setActiveTab('services')}
                      className="text-emerald-700 font-bold text-sm flex items-center gap-1 hover:text-emerald-800"
                    >
                      Explore postpartum care <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-slate-50 hover:bg-sky-50/50 p-8 rounded-2xl border border-slate-200/80 transition duration-300 shadow-sm hover:shadow-md">
                    <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-6">
                      <Award className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Verified Credentials & Accreditations</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      Certified Master of Physiotherapy, Osteopathy Fellowships, and recognized by Central India Medical Excellence.
                    </p>
                    <button
                      onClick={() => setActiveTab('gallery')}
                      className="text-amber-800 font-bold text-sm flex items-center gap-1 hover:text-amber-900"
                    >
                      View certifications <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Teaser for Clinic Photos & Instagram */}
            <section className="py-16 bg-gradient-to-r from-sky-900 via-slate-900 to-emerald-950 text-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div>
                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">
                      Community & Clinical Excellence
                    </span>
                    <h2 className="text-3xl font-extrabold mt-2">
                      Explore Clinic Facilities, Certificates &amp; Social Posts
                    </h2>
                    <p className="text-slate-300 max-w-2xl mt-2 text-sm sm:text-base">
                      See our Anand Nagar Indore clinic photos, verified certifications, case studies, and live reels from @flexifitphysiotherapy.clinic.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setActiveTab('gallery')}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl transition shadow-lg flex items-center gap-2"
                    >
                      <Award className="w-4 h-4 text-slate-950" />
                      <span>Certificates & Photos</span>
                    </button>
                    <a
                      href="https://www.instagram.com/flexifitphysiotherapy.clinic/?hl=en"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2"
                    >
                      <Instagram className="w-4 h-4 text-pink-400" />
                      <span>Instagram Feed</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================= SECTION: ABOUT DOCTORS ================= */}
        {activeTab === 'about' && (
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Our Medical Directors
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
                  Meet Indore&apos;s Most Trusted Physiotherapy Specialists
                </h2>
                <p className="text-slate-600 mt-4 text-base">
                  Dr. Mohit Madan and Dr. Karuna Madan bring over a decade of clinical mastery in spinal alignment, orthopedic recovery, and maternal wellness.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                {/* Doctor 1: Dr. Mohit Madan */}
                <div className="bg-gradient-to-b from-sky-50/60 to-white rounded-3xl p-8 border border-sky-100 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                        <Stethoscope className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900">Dr. Mohit Madan</h3>
                        <p className="text-sky-700 font-bold text-sm">
                          Senior Consultant Physiotherapist & Spine Specialist
                        </p>
                        <p className="text-xs text-slate-500">MPT (Ortho & Spine), FCMT (Osteopathy & Chiropractic)</p>
                      </div>
                    </div>

                    <div className="space-y-4 text-slate-700 text-sm leading-relaxed">
                      <p>
                        Dr. Mohit Madan is widely recognized in Indore for his expertise in avoiding spinal surgeries for severe Slip Disc (PIVD), sciatica, and lumbar disc bulges through specialized decompression and osteopathic manual therapy.
                      </p>
                      <p>
                        He has been a featured medical expert on <strong>Akashvani (All India Radio)</strong>, educating thousands of listeners across Madhya Pradesh on spine ergonomics, back pain prevention, and active lifestyle recovery.
                      </p>

                      <div className="bg-white p-4 rounded-xl border border-sky-100 space-y-2">
                        <p className="font-bold text-xs uppercase tracking-wider text-sky-800">Key Specializations:</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-sky-100 text-sky-800 text-xs px-2.5 py-1 rounded-md font-medium">Slip Disc / PIVD</span>
                          <span className="bg-sky-100 text-sky-800 text-xs px-2.5 py-1 rounded-md font-medium">Sciatic Nerve Decompression</span>
                          <span className="bg-sky-100 text-sky-800 text-xs px-2.5 py-1 rounded-md font-medium">Cervical & Postural Realignment</span>
                          <span className="bg-sky-100 text-sky-800 text-xs px-2.5 py-1 rounded-md font-medium">Chiropractic HVLA Adjustment</span>
                          <span className="bg-sky-100 text-sky-800 text-xs px-2.5 py-1 rounded-md font-medium">Sports Knee & Shoulder Rehab</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-sky-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">12+ Years Clinical Practice</span>
                    <button
                      onClick={() => {
                        setPreferredDoctor('Dr. Mohit Madan (Spine & Musculoskeletal)');
                        setActiveTab('contact');
                        setBookingViewTab('book');
                      }}
                      className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                    >
                      Consult Dr. Mohit
                    </button>
                  </div>
                </div>

                {/* Doctor 2: Dr. Karuna Madan */}
                <div className="bg-gradient-to-b from-emerald-50/60 to-white rounded-3xl p-8 border border-emerald-100 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                        <Heart className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900">Dr. Karuna Madan</h3>
                        <p className="text-emerald-700 font-bold text-sm">
                          Women&apos;s Health & Postnatal Rehabilitation Specialist
                        </p>
                        <p className="text-xs text-slate-500">Creator of &lsquo;Bounce Back Stronger&rsquo; Motherhood Program</p>
                      </div>
                    </div>

                    <div className="space-y-4 text-slate-700 text-sm leading-relaxed">
                      <p>
                        Dr. Karuna Madan is a passionate pioneer in women&apos;s physical health in Central India. She founded the &lsquo;Bounce Back Stronger&rsquo; program to help mothers heal abdominal wall separation (Diastasis Recti), pelvic floor issues, and pregnancy back pain.
                      </p>
                      <p>
                        Her clinic features a dedicated private studio where women receive empathetic, evidence-based care, gentle scar tissue release after C-sections, and guided core stability routines.
                      </p>

                      <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-2">
                        <p className="font-bold text-xs uppercase tracking-wider text-emerald-800">Key Specializations:</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-medium">Diastasis Recti Closure</span>
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-medium">C-Section Scar Healing</span>
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-medium">Pelvic Floor Re-education</span>
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-medium">Antenatal & Postnatal Fitness</span>
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-medium">Bounce Back Stronger Protocol</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-emerald-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Women&apos;s Wellness Pioneer</span>
                    <button
                      onClick={() => {
                        setPreferredDoctor('Dr. Karuna Madan (Women\'s Health & Postpartum)');
                        setActiveTab('contact');
                        setBookingViewTab('book');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                    >
                      Consult Dr. Karuna
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= SECTION: SERVICES ================= */}
        {activeTab === 'services' && (
          <section className="py-16 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Comprehensive Treatments
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
                  Advanced Physiotherapy &amp; Rehabilitation Services
                </h2>
                <p className="text-slate-600 mt-4">
                  Targeted non-invasive therapies delivered with state-of-the-art medical equipment at our Anand Nagar, Indore clinic.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Service 1 */}
                <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-5 font-bold">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Spine &amp; Musculoskeletal Rehab</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-5">
                    Indore&apos;s leading treatment center for Slip Disc (PIVD), sciatica, cervical radiculopathy, spinal stenosis, and chronic back stiffness.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 mb-6">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Computerized Lumbar &amp; Cervical Traction</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Non-surgical disc decompression</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Core stabilization strengthening</li>
                  </ul>
                  <button
                    onClick={() => {
                      setPatientService('Spine & Slip Disc Rehabilitation (PIVD)');
                      setActiveTab('contact');
                      setBookingViewTab('book');
                    }}
                    className="text-sky-700 hover:text-sky-800 font-bold text-sm flex items-center gap-1"
                  >
                    Book Spine Consultation <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Service 2 */}
                <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Knee Pain &amp; Orthopedic Care</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-5">
                    Prevent knee replacement surgeries. Proven protocols for knee osteoarthritis, ACL/PCL ligament injuries, meniscus tears, and post-fracture recovery.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 mb-6">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Quad &amp; VMO muscle strengthening</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Patellofemoral joint mobilization</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Gait retraining &amp; balance therapy</li>
                  </ul>
                  <button
                    onClick={() => {
                      setPatientService('Knee Pain & Orthopedic Rehabilitation');
                      setActiveTab('contact');
                      setBookingViewTab('book');
                    }}
                    className="text-emerald-700 hover:text-emerald-800 font-bold text-sm flex items-center gap-1"
                  >
                    Book Knee Rehab <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Service 3 */}
                <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center mb-5 font-bold">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Postpartum &amp; Women&apos;s Health</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-5">
                    Personalized postpartum therapy created by Dr. Karuna Madan to rebuild core strength and pelvic health following childbirth.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 mb-6">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Diastasis Recti gap closure</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> C-Section scar tissue release</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Pelvic floor muscle restoration</li>
                  </ul>
                  <button
                    onClick={() => {
                      setPatientService('Postpartum & Women\'s Health (Diastasis Recti)');
                      setActiveTab('contact');
                      setBookingViewTab('book');
                    }}
                    className="text-pink-700 hover:text-pink-800 font-bold text-sm flex items-center gap-1"
                  >
                    Book Women&apos;s Health Rehab <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Service 4 */}
                <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-5 font-bold">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Osteopathy &amp; Chiropractic Care</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-5">
                    High-precision manual alignment for the spine, ribs, and pelvis to eliminate nerve impingements, headaches, and postural tech-neck.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 mb-6">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Gentle spinal HVLA manipulation</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Cranial &amp; myofascial release</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Postural symmetry correction</li>
                  </ul>
                  <button
                    onClick={() => {
                      setPatientService('Osteopathy & Chiropractic Alignment');
                      setActiveTab('contact');
                      setBookingViewTab('book');
                    }}
                    className="text-indigo-700 hover:text-indigo-800 font-bold text-sm flex items-center gap-1"
                  >
                    Book Chiropractic Session <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Service 5 */}
                <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-5 font-bold">
                    <HeartPulse className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Electrotherapy &amp; Pain Tech</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-5">
                    Interferential Therapy (IFT), TENS, therapeutic ultrasound, and hot/cold biophysical modalities for immediate acute and chronic pain reduction.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 mb-6">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Deep tissue cellular healing</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Swelling &amp; edema resolution</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Muscle spasm relaxation</li>
                  </ul>
                  <button
                    onClick={() => {
                      setPatientService('Electrotherapy & Pain Management (IFT/Ultrasound)');
                      setActiveTab('contact');
                      setBookingViewTab('book');
                    }}
                    className="text-cyan-700 hover:text-cyan-800 font-bold text-sm flex items-center gap-1"
                  >
                    Schedule Electrotherapy <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Service 6 */}
                <div className="bg-gradient-to-br from-sky-700 to-emerald-700 text-white rounded-2xl p-7 shadow-md flex flex-col justify-between">
                  <div>
                    <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Custom Assessment</span>
                    <h3 className="text-2xl font-bold mt-4 mb-2">Not Sure Which Therapy You Need?</h3>
                    <p className="text-sky-100 text-sm leading-relaxed mb-6">
                      Book a diagnostic assessment. Dr. Mohit or Dr. Karuna will examine your MRI, X-rays, posture, and flexibility to design a custom treatment roadmap.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('contact');
                      setBookingViewTab('book');
                    }}
                    className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm py-3 px-6 rounded-xl transition text-center shadow"
                  >
                    Book Diagnostic Assessment
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= SECTION: GALLERY, POSTS & CERTIFICATES ================= */}
        {activeTab === 'gallery' && (
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Google Photos, Posts &amp; Accreditations
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
                  Clinic Photos, Clinical Posts &amp; Doctor Certificates
                </h2>
                <p className="text-slate-600 mt-4">
                  Verified accreditations, treatment technology, and clinical case posts from Flexifit Clinics Indore.
                </p>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setGalleryFilter('all')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition ${
                      galleryFilter === 'all'
                        ? 'bg-sky-700 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All ({CLINIC_CERTIFICATES_AND_POSTS.length})
                  </button>
                  <button
                    onClick={() => setGalleryFilter('certificate')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                      galleryFilter === 'certificate'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    Doctor Certificates &amp; Awards
                  </button>
                  <button
                    onClick={() => setGalleryFilter('facility')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                      galleryFilter === 'facility'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Clinic Facilities &amp; Equipment
                  </button>
                  <button
                    onClick={() => setGalleryFilter('post')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                      galleryFilter === 'post'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Clinical Posts &amp; Case Studies
                  </button>
                </div>
              </div>

              {/* Grid of Items */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredGallery.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="group bg-slate-50 hover:bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow ${
                            item.type === 'certificate'
                              ? 'bg-emerald-600 text-white'
                              : item.type === 'facility'
                              ? 'bg-sky-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {item.type === 'certificate'
                            ? 'Certificate'
                            : item.type === 'facility'
                            ? 'Clinic Facility'
                            : 'Case Study Post'}
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3 bg-slate-900/75 backdrop-blur-sm text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
                          <span>{item.issuerOrDept}</span>
                          <span>{item.dateOrYear}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-700 transition line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-1.5">
                        {item.tags.map((t) => (
                          <span key={t} className="text-[11px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* View more on Google Search link */}
              <div className="mt-14 text-center">
                <a
                  href="https://www.google.com/search?q=flexifit+clinics+best+physiotherapy+clinic+indore+photos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-6 py-3 rounded-full text-sm border border-slate-300 transition"
                >
                  <Eye className="w-4 h-4 text-sky-600" />
                  <span>View All Google Photos &amp; Verified Reviews on Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ================= SECTION: INSTAGRAM FEED ================= */}
        {activeTab === 'instagram' && (
          <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Instagram Profile Header */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md mb-12">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Insta Avatar with Gradient Ring */}
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 shadow-lg flex-shrink-0">
                    <img
                      src="/assets/aistudio/image_afdadbda.png"
                      alt="Flexifit Instagram Profile"
                      className="w-full h-full rounded-full object-contain bg-white p-1"
                    />
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                      <h2 className="text-2xl font-black text-slate-900">flexifitphysiotherapy.clinic</h2>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200 w-fit mx-auto sm:mx-0">
                        <Check className="w-3.5 h-3.5" /> Verified Clinic
                      </span>
                      <a
                        href="https://www.instagram.com/flexifitphysiotherapy.clinic/?hl=en"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold px-5 py-2 rounded-full transition shadow-md w-fit mx-auto sm:mx-0"
                      >
                        Follow on Instagram
                      </a>
                    </div>

                    <p className="text-sm font-semibold text-slate-700">Flexifit Clinics | Best Physiotherapy Clinic Indore</p>
                    <p className="text-xs text-slate-500 max-w-2xl mt-1">
                      🩺 Spine Decompression • Osteopathy • Diastasis Recti • Knee Pain <br />
                      📍 Anand Nagar, Indore | Led by Dr. Mohit Madan &amp; Dr. Karuna Madan
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-6 mt-4 text-xs font-bold text-slate-700">
                      <div><span className="text-slate-900 font-extrabold text-sm">240+</span> Posts</div>
                      <div><span className="text-slate-900 font-extrabold text-sm">2.8K+</span> Followers</div>
                      <div><span className="text-slate-900 font-extrabold text-sm">350</span> Following</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instagram Feed Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {INSTAGRAM_POSTS.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedInstaPost(post)}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    {/* Media Thumbnail */}
                    <div className="relative aspect-square overflow-hidden bg-slate-900">
                      <img
                        src={post.thumbnail}
                        alt={post.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Reel Badge if reel */}
                      {post.type === 'reel' && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-pink-400" />
                          <span>Reel {post.duration}</span>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold">
                        <span className="flex items-center gap-1.5"><Heart className="w-5 h-5 fill-white" /> {post.likes}</span>
                        <span className="flex items-center gap-1.5"><MessageSquare className="w-5 h-5 fill-white" /> {post.comments}</span>
                      </div>
                    </div>

                    {/* Caption Preview */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
                        {post.caption}
                      </p>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">{post.date}</span>
                        <a
                          href="https://www.instagram.com/flexifitphysiotherapy.clinic/?hl=en"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-pink-600 hover:text-pink-700 font-bold flex items-center gap-1"
                        >
                          View on Instagram <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct Instagram Profile Link Button */}
              <div className="mt-12 text-center">
                <a
                  href="https://www.instagram.com/flexifitphysiotherapy.clinic/?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-8 py-3.5 rounded-full shadow-lg transition"
                >
                  <Instagram className="w-5 h-5" />
                  <span>Visit @flexifitphysiotherapy.clinic on Instagram</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ================= SECTION: REVIEWS ================= */}
        {activeTab === 'reviews' && (
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Google Map Patient Feedback
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
                  Loved by Over 50,000+ Healed Patients
                </h2>
                <div className="flex items-center justify-center gap-1.5 text-amber-400 mt-3 text-xl">
                  <Star className="fill-amber-400 w-5 h-5" />
                  <Star className="fill-amber-400 w-5 h-5" />
                  <Star className="fill-amber-400 w-5 h-5" />
                  <Star className="fill-amber-400 w-5 h-5" />
                  <Star className="fill-amber-400 w-5 h-5" />
                  <span className="text-slate-900 font-extrabold text-base ml-2">4.9 / 5.0 Google Rating</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Review 1 */}
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex text-amber-400 mb-3">
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                    </div>
                    <p className="text-slate-700 text-sm italic leading-relaxed">
                      &ldquo;I had a distal radius fracture in my right hand, and after surgery I came here for physiotherapy. Now that my sessions are complete, I&apos;m happy to say I have recovered fully with full wrist movement. Highly recommend the staff here.&rdquo;
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">- D. (Verified Patient)</span>
                    <span className="text-xs text-emerald-600 font-semibold">Hand Rehab</span>
                  </div>
                </div>

                {/* Review 2 */}
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex text-amber-400 mb-3">
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                    </div>
                    <p className="text-slate-700 text-sm italic leading-relaxed">
                      &ldquo;I came here with chronic hip &amp; low back pain since 1.5 months. Dr. Karuna Ma&apos;am treated me with utmost patience and my pain got fully reduced. It was an excellent experience.&rdquo;
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">- Omprakash Bhaya</span>
                    <span className="text-xs text-sky-600 font-semibold">Low Back &amp; Hip Care</span>
                  </div>
                </div>

                {/* Review 3 */}
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex text-amber-400 mb-3">
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                      <Star className="fill-amber-400 w-4 h-4" />
                    </div>
                    <p className="text-slate-700 text-sm italic leading-relaxed">
                      &ldquo;Flexifit Physiotherapy Clinic offers excellent services with a genuine focus on patient recovery. The facilities are top-notch, featuring modern decompression equipment and a very hygienic environment.&rdquo;
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">- Ankit Saini</span>
                    <span className="text-xs text-emerald-600 font-semibold">Spine Therapy</span>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <a
                  href="https://www.google.com/search?q=flexifit+clinics+best+physiotherapy+clinic+indore+photos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-bold px-6 py-3 rounded-full text-sm border border-slate-300 shadow-sm transition"
                >
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Read all reviews on Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ================= SECTION: CONTACT & BOOKING (FIREBASE AUTH & FIRESTORE STORAGE) ================= */}
        {activeTab === 'contact' && (
          <section className="py-16 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="grid lg:grid-cols-12">
                  {/* Left Column: Clinic Information & Instagram Preview */}
                  <div className="lg:col-span-5 bg-gradient-to-br from-sky-800 via-sky-700 to-emerald-800 text-white p-5 sm:p-8 lg:p-12 flex flex-col justify-between">
                    <div>
                      {/* Logo Display */}
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl w-fit mb-8 border border-white/20">
                        <img
                          src="/assets/aistudio/image_afdadbda.png"
                          alt="Flexifit Clinics Logo"
                          className="h-14 sm:h-16 w-auto object-contain"
                        />
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Visit Flexifit Clinics</h2>
                      <p className="text-sky-100 text-xs sm:text-sm mb-8 leading-relaxed">
                        Don&apos;t let chronic pain limit your movement. Schedule your clinical assessment with Dr. Mohit Madan or Dr. Karuna Madan today.
                      </p>

                      <div className="space-y-6 text-xs sm:text-sm">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 text-emerald-300">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm sm:text-base">Clinic Location</h4>
                            <p className="text-sky-100 leading-snug mt-0.5">
                              11, Behind Aishwarya Pathology Lab,<br />
                              Opposite SBI Bank, Sahid Bhagat Singh Colony,<br />
                              Anand Nagar, Indore – 452001 (Madhya Pradesh)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 text-emerald-300">
                            <Phone className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm sm:text-base">Reception &amp; Enquiries</h4>
                            <p className="text-sky-100 leading-snug mt-0.5">
                              +91 88198 00030<br />
                              +91 7610078988
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 text-emerald-300">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm sm:text-base">Consultation Hours</h4>
                            <p className="text-sky-100 leading-snug mt-0.5">
                              Monday – Saturday: 9:00 AM – 7:00 PM<br />
                              Sunday: Closed (Emergency on call)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Instagram badge in contact box */}
                    <div className="mt-8 sm:mt-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Instagram className="w-6 h-6 text-pink-300 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-white">Instagram Profile</p>
                            <p className="text-[11px] text-sky-200">@flexifitphysiotherapy.clinic</p>
                          </div>
                        </div>
                        <a
                          href="https://www.instagram.com/flexifitphysiotherapy.clinic/?hl=en"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-slate-100 transition"
                        >
                          Follow
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Appointment Booking & My Bookings (With Firebase Auth) */}
                  <div className="lg:col-span-7 p-5 sm:p-8 lg:p-12">
                    {/* View Switching Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                          {bookingViewTab === 'book' ? 'Book an Appointment' : 'My Booked Appointments'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {bookingViewTab === 'book'
                            ? 'Securely recorded in clinic records. Direct live synchronization.'
                            : 'View and manage all appointments associated with your account.'}
                        </p>
                      </div>

                      {currentUser && (
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
                          <button
                            onClick={() => {
                              setBookingViewTab('book');
                              setConfirmedBookingId(null);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              bookingViewTab === 'book'
                                ? 'bg-white text-sky-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            New Booking
                          </button>
                          <button
                            onClick={() => setBookingViewTab('my-bookings')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                              bookingViewTab === 'my-bookings'
                                ? 'bg-white text-sky-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>My Bookings</span>
                            {userAppointments.length > 0 && (
                              <span className="bg-sky-600 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                                {userAppointments.length}
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Check if user is signed in */}
                    {!currentUser ? (
                      /* USER NOT SIGNED IN: Show Sign In / Sign Up Card */
                      <div className="bg-gradient-to-b from-sky-50/50 to-white border border-sky-200/80 rounded-2xl p-5 sm:p-8 text-center space-y-5">
                        <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto shadow-sm">
                          <UserCheck className="w-7 h-7" />
                        </div>

                        <div>
                          <h4 className="text-xl font-bold text-slate-900">Book Your Appointment</h4>
                          <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                            Sign in to reserve your consultation slot with Dr. Mohit or Dr. Karuna Madan. Quick Patient option requires only your name &amp; phone!
                          </p>
                        </div>

                        {/* Prominent Quick Patient Booking Trigger */}
                        <div className="pt-1">
                          <button
                            onClick={() => {
                              setAuthMode('quick');
                              setShowAuthModal(true);
                            }}
                            className="w-full bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-sm sm:text-base group"
                          >
                            <span>⚡ Quick Patient Sign-In (Name &amp; Phone)</span>
                            <ChevronRight className="w-4 h-4 transition group-hover:translate-x-1" />
                          </button>
                        </div>

                        {/* Quick Sign In / Sign Up Trigger */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                          <button
                            onClick={() => {
                              setAuthMode('signin');
                              setShowAuthModal(true);
                            }}
                            className="w-full sm:w-auto flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-4 py-2.5 rounded-xl shadow-xs transition text-xs flex items-center justify-center gap-1.5"
                          >
                            <LogIn className="w-3.5 h-3.5 text-sky-600" />
                            <span>Sign In with Email</span>
                          </button>

                          <button
                            onClick={() => {
                              setAuthMode('signup');
                              setShowAuthModal(true);
                            }}
                            className="w-full sm:w-auto flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-4 py-2.5 rounded-xl shadow-xs transition text-xs"
                          >
                            <span>Create Full Account</span>
                          </button>
                        </div>

                        {/* Google Auth shortcut */}
                        <div className="pt-1">
                          <button
                            onClick={handleGoogleSignIn}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white px-4 py-2 rounded-lg hover:shadow-xs transition"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                              />
                            </svg>
                            <span>Continue with Google</span>
                          </button>
                        </div>


                        <div className="pt-4 border-t border-sky-100 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Stored in Firebase Database</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-sky-600" /> Private Patient Profile</span>
                        </div>
                      </div>
                    ) : bookingViewTab === 'my-bookings' ? (
                      /* MY BOOKINGS VIEW */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Patient: <strong>{currentUser.displayName || currentUser.email}</strong></span>
                          <span>{userAppointments.length} record(s)</span>
                        </div>

                        {appointmentsLoading ? (
                          <div className="py-12 text-center text-slate-400 text-sm">
                            Loading your bookings...
                          </div>
                        ) : userAppointments.length === 0 ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-3">
                            <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                            <h5 className="font-bold text-slate-800">No Appointments Booked Yet</h5>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                              You haven&apos;t scheduled any appointments yet. Click below to book your consultation with Dr. Mohit or Dr. Karuna.
                            </p>
                            <button
                              onClick={() => setBookingViewTab('book')}
                              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition mt-2"
                            >
                              Book Appointment Now
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {userAppointments.map((appt) => (
                              <div
                                key={appt.id}
                                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                                          appt.status === 'confirmed'
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : appt.status === 'pending'
                                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                                            : appt.status === 'completed'
                                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                                            : 'bg-rose-100 text-rose-800 border-rose-300'
                                        }`}
                                      >
                                        {appt.status === 'pending'
                                          ? '⏳ Pending Admin Approval'
                                          : appt.status === 'confirmed'
                                          ? '✓ Approved & Confirmed'
                                          : appt.status === 'completed'
                                          ? '★ Completed'
                                          : '✕ Cancelled'}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-base mt-2">{appt.service}</h4>
                                    <p className="text-xs text-sky-700 font-semibold">{appt.doctor}</p>
                                    {appt.status === 'pending' && (
                                      <p className="text-[11px] text-amber-700 font-medium mt-1">
                                        ℹ️ Request received. Awaiting admin approval by Dr. Mohit / Dr. Karuna Madan.
                                      </p>
                                    )}
                                    {appt.status === 'confirmed' && (
                                      <p className="text-[11px] text-emerald-700 font-medium mt-1">
                                        ✓ Approved by clinic! Please arrive 10 minutes early at Anand Nagar clinic.
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-right">
                                    <div className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-900 px-2.5 py-1 rounded-lg text-xs font-bold border border-sky-100">
                                      <Calendar className="w-3.5 h-3.5 text-sky-600" />
                                      <span>{appt.appointmentDate}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-end gap-1">
                                      <Clock3 className="w-3 h-3" /> {appt.timeSlot}
                                    </p>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                  <span>Patient: <strong>{appt.patientName}</strong> ({appt.patientPhone})</span>
                                  {appt.status !== 'cancelled' && appt.id && (
                                    <button
                                      onClick={() => handleCancelBooking(appt.id!)}
                                      className="text-rose-600 hover:text-rose-800 font-bold hover:underline"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : confirmedBookingId ? (
                      /* BOOKING REQUEST SUBMITTED CARD - PENDING ADMIN APPROVAL */
                      <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-8 text-center text-slate-900 space-y-5 shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto text-2xl font-bold shadow-md">
                          <Clock className="w-8 h-8" />
                        </div>

                        <div>
                          <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full mb-2">
                            ⏳ Pending Admin Approval
                          </span>
                          <h4 className="text-2xl font-black text-slate-900">Appointment Request Submitted!</h4>
                          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
                            Thank you, <strong>{patientName}</strong>. Your request for <strong>{displayDateDDMMYY} ({timeSlot})</strong> has been received by Flexifit Clinics. It is currently <strong className="text-amber-800">awaiting admin approval</strong>.
                          </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-amber-200 text-left text-xs space-y-2 max-w-md mx-auto text-slate-700 shadow-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Approval Status:</span>
                            <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Pending Review
                            </span>
                          </div>
                          <div><strong>Booking ID:</strong> <span className="font-mono text-slate-900">{confirmedBookingId}</span></div>
                          <div><strong>Assigned Doctor:</strong> {preferredDoctor}</div>
                          <div><strong>Requested Service:</strong> {patientService}</div>
                          <div><strong>Requested Date (DD/MM/YYYY):</strong> {displayDateDDMMYY}</div>
                          <div><strong>Time Slot:</strong> {timeSlot}</div>
                          <div><strong>Clinic:</strong> 11, Anand Nagar, Indore (Opp. SBI Bank)</div>
                        </div>

                        <p className="text-[11px] text-amber-800 font-medium">
                          The clinic administrator will review and confirm your slot. You can check the updated approval status anytime under <strong>My Bookings</strong>.
                        </p>

                        <div className="pt-2 flex flex-wrap justify-center gap-3">
                          <button
                            onClick={() => {
                              setBookingViewTab('my-bookings');
                              setConfirmedBookingId(null);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow"
                          >
                            Track Status in My Bookings
                          </button>
                          <button
                            onClick={() => {
                              setConfirmedBookingId(null);
                            }}
                            className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 font-bold px-5 py-2.5 rounded-xl text-xs transition"
                          >
                            Submit Another Request
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* LOGGED IN USER: BOOKING FORM */
                      <form onSubmit={handleBookingSubmit} className="space-y-5">
                        <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100 flex items-center justify-between text-xs">
                          <span className="text-sky-900 font-medium">
                            Signed in as: <strong>{currentUser.displayName || currentUser.email}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setBookingViewTab('my-bookings')}
                            className="text-sky-700 hover:underline font-bold"
                          >
                            My Bookings ({userAppointments.length})
                          </button>
                        </div>

                        {/* Full Name */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Patient Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 focus:border-sky-600 outline-none transition text-sm text-slate-800"
                          />
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Contact Phone Number *
                          </label>
                          <input
                            type="tel"
                            required
                            value={patientPhone}
                            onChange={(e) => setPatientPhone(e.target.value)}
                            placeholder="e.g. +91 98765 43210"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 focus:border-sky-600 outline-none transition text-sm text-slate-800"
                          />
                        </div>

                        {/* Preferred Doctor */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Select Doctor
                          </label>
                          <select
                            value={preferredDoctor}
                            onChange={(e) => setPreferredDoctor(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 focus:border-sky-600 outline-none transition text-sm text-slate-800 bg-white"
                          >
                            <option value="Dr. Mohit Madan (Spine & Musculoskeletal)">
                              Dr. Mohit Madan (Spine, Chiropractic, Osteopathy)
                            </option>
                            <option value="Dr. Karuna Madan (Women's Health & Postpartum)">
                              Dr. Karuna Madan (Postpartum, Diastasis Recti, Women&apos;s Health)
                            </option>
                            <option value="First Available Senior Specialist">
                              First Available Senior Specialist
                            </option>
                          </select>
                        </div>

                        {/* Treatment Service */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Select Treatment Service *
                          </label>
                          <select
                            value={patientService}
                            onChange={(e) => setPatientService(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 focus:border-sky-600 outline-none transition text-sm text-slate-800 bg-white"
                          >
                            <option value="Spine & Slip Disc Rehabilitation (PIVD)">Spine &amp; Slip Disc Rehabilitation (PIVD)</option>
                            <option value="Knee Pain & Orthopedic Rehabilitation">Knee Pain &amp; Orthopedic Rehabilitation</option>
                            <option value="Postpartum & Women's Health (Diastasis Recti)">Postpartum &amp; Women&apos;s Health (Diastasis Recti)</option>
                            <option value="Osteopathy & Chiropractic Alignment">Osteopathy &amp; Chiropractic Alignment</option>
                            <option value="Electrotherapy & Pain Management (IFT/Ultrasound)">Electrotherapy &amp; Pain Management (IFT/Ultrasound)</option>
                            <option value="General Physiotherapy Assessment">General Physiotherapy Assessment</option>
                          </select>
                        </div>

                        {/* APPOINTMENT DATE in DD/MM/YYYY */}
                        <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-black text-sky-950 uppercase tracking-wider">
                              Appointment Date (DD/MM/YYYY) *
                            </label>
                            <span className="text-[11px] font-bold text-sky-800 bg-white px-2 py-0.5 rounded-md border border-sky-200">
                              Selected: <span className="font-extrabold text-sky-950">{displayDateDDMMYY}</span>
                            </span>
                          </div>

                          {/* Quick Relative Date Shortcuts */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setRelativeDate(0)}
                              className="px-3 py-1 bg-white hover:bg-sky-100 border border-sky-200 text-sky-900 rounded-lg font-semibold transition"
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={() => setRelativeDate(1)}
                              className="px-3 py-1 bg-white hover:bg-sky-100 border border-sky-200 text-sky-900 rounded-lg font-semibold transition"
                            >
                              Tomorrow
                            </button>
                            <button
                              type="button"
                              onClick={() => setRelativeDate(3)}
                              className="px-3 py-1 bg-white hover:bg-sky-100 border border-sky-200 text-sky-900 rounded-lg font-semibold transition"
                            >
                              In 3 Days
                            </button>
                            <button
                              type="button"
                              onClick={() => setRelativeDate(7)}
                              className="px-3 py-1 bg-white hover:bg-sky-100 border border-sky-200 text-sky-900 rounded-lg font-semibold transition"
                            >
                              Next Week
                            </button>
                          </div>

                          {/* Date input connected to DD/MM/YYYY */}
                          <div className="relative">
                            <input
                              type="date"
                              required
                              min={toInputDate(today)}
                              value={dateInputValue}
                              onChange={(e) => handleDateChange(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-sky-300 focus:ring-2 focus:ring-sky-600 focus:border-sky-600 outline-none transition text-sm font-semibold text-slate-900 bg-white"
                            />
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                              <span>Format saved in Firebase: <strong>DD/MM/YYYY ({displayDateDDMMYY})</strong></span>
                              <span className="text-emerald-700 font-bold">✓ Direct System Confirmation</span>
                            </div>
                          </div>
                        </div>

                        {/* Preferred Time Slot */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Preferred Time Slot
                          </label>
                          <select
                            value={timeSlot}
                            onChange={(e) => setTimeSlot(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 focus:border-sky-600 outline-none transition text-sm text-slate-800 bg-white"
                          >
                            <option value="9:30 AM - 11:00 AM (Morning)">9:30 AM – 11:00 AM (Morning)</option>
                            <option value="11:00 AM - 12:30 PM (Morning)">11:00 AM – 12:30 PM (Morning)</option>
                            <option value="4:00 PM - 5:30 PM (Evening)">4:00 PM – 5:30 PM (Evening)</option>
                            <option value="5:30 PM - 7:00 PM (Evening)">5:30 PM – 7:00 PM (Evening)</option>
                          </select>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={formSubmitting}
                          className="w-full bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white font-black py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-base disabled:opacity-50"
                        >
                          {formSubmitting ? (
                            <span>Submitting Booking Request...</span>
                          ) : (
                            <>
                              <span>Submit Appointment Request ({displayDateDDMMYY})</span>
                              <CalendarCheck className="w-5 h-5" />
                            </>
                          )}
                        </button>

                        <p className="text-[11px] text-center text-slate-500">
                          Your request will be submitted to the clinic administrator for approval. You can track its status under My Bookings.
                        </p>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer Matching Logo Colors & Branding */}
      <footer className="bg-slate-950 text-slate-300 pt-16 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            {/* Col 1: Brand & Logo */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/image_afdadbda.png"
                  alt="Flexifit Clinics Logo"
                  className="h-16 w-auto object-contain bg-white/5 p-1 rounded-xl"
                />
                <div>
                  <div className="flex items-center">
                    <span className="text-xl font-black text-sky-400">Flexi</span>
                    <span className="text-xl font-black text-emerald-400">fit</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wide">CLINICS INDORE</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Indore&apos;s leading physiotherapy, osteopathy, chiropractic, and postpartum clinic. Dedicated to treating the root biomechanical cause.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://www.instagram.com/flexifitphysiotherapy.clinic/?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-pink-600 hover:border-pink-500 text-white transition"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://www.google.com/search?q=flexifit+clinics+best+physiotherapy+clinic+indore+photos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-sky-600 hover:border-sky-500 text-white transition"
                >
                  <MapPin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-widest mb-4">Quick Navigation</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => setActiveTab('home')} className="hover:text-emerald-400 transition">Home</button></li>
                <li><button onClick={() => setActiveTab('about')} className="hover:text-emerald-400 transition">About Dr. Mohit &amp; Dr. Karuna</button></li>
                <li><button onClick={() => setActiveTab('services')} className="hover:text-emerald-400 transition">Treatments &amp; Decompression</button></li>
                <li><button onClick={() => setActiveTab('gallery')} className="hover:text-emerald-400 transition">Clinic Photos &amp; Certificates</button></li>
                <li><button onClick={() => setActiveTab('instagram')} className="hover:text-emerald-400 transition">Instagram Feed (@flexifitphysiotherapy.clinic)</button></li>
                <li><button onClick={() => setActiveTab('contact')} className="hover:text-emerald-400 transition">Book Appointment (DD/MM/YY)</button></li>
                <li><button onClick={() => setIsAdminView(true)} className="text-amber-400 font-bold hover:underline transition">🔐 Admin Portal Login</button></li>
              </ul>
            </div>

            {/* Col 3: Specializations */}
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-widest mb-4">Core Specialties</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>• Slip Disc / PIVD (Non-Surgical)</li>
                <li>• Sciatic Nerve Pain Relief</li>
                <li>• Postpartum Diastasis Recti</li>
                <li>• Osteopathy &amp; Spinal Manipulation</li>
                <li>• Knee Osteoarthritis Therapy</li>
                <li>• Computerized Spinal Traction</li>
              </ul>
            </div>

            {/* Col 4: Location & Contact */}
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-widest mb-4">Clinic Address</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                11, Behind Aishwarya Pathology Lab, Opposite SBI Bank, Sahid Bhagat Singh Colony, Anand Nagar, Indore – 452001 (M.P.)
              </p>
              <p className="text-xs text-emerald-400 font-bold mb-1">📞 +91 88198 00030 / +91 7610078988</p>
              <p className="text-xs text-sky-400 font-bold">🏢 Flexifit Portal with Firebase Cloud Data</p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>&copy; {new Date().getFullYear()} Flexifit Clinics Indore. All rights reserved.</p>
            <p className="tracking-widest text-[11px] font-semibold text-slate-400">
              POWERED BY <span className="text-white font-extrabold">TEAM VISIONARY</span>
            </p>
          </div>
        </div>
      </footer>

      {/* ================= MODAL: SIGN IN / SIGN UP ================= */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-[94vw] max-w-md overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-emerald-600 text-white p-5 sm:p-6 relative">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {authMode === 'quick'
                      ? 'Quick Patient Sign-In'
                      : authMode === 'signin'
                      ? 'Sign In to Account'
                      : 'Create Patient Account'}
                  </h3>
                  <p className="text-xs text-sky-100">Direct booking &amp; instant Firestore synchronization</p>
                </div>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-[11px] sm:text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('quick');
                  setAuthError(null);
                }}
                className={`flex-1 py-3 text-center border-b-2 transition ${
                  authMode === 'quick'
                    ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                ⚡ Quick Patient
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                }}
                className={`flex-1 py-3 text-center border-b-2 transition ${
                  authMode === 'signin'
                    ? 'border-sky-600 text-sky-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                }}
                className={`flex-1 py-3 text-center border-b-2 transition ${
                  authMode === 'signup'
                    ? 'border-sky-600 text-sky-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                New Account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={authMode === 'quick' ? handleQuickPatientSignIn : handleAuthSubmit} className="p-5 sm:p-6 space-y-4">
              {authError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{authError}</span>
                  </div>
                  {authError.includes('auth/unauthorized-domain') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('quick');
                        setAuthError(null);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] shadow-sm transition"
                    >
                      ⚡ Switch to Quick Patient Sign-In (Works Instantly)
                    </button>
                  )}
                </div>
              )}

              {/* QUICK PATIENT FORM */}
              {authMode === 'quick' && (
                <>
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 leading-snug">
                    <p className="font-bold">Fast Mobile Booking for Patients:</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Enter your name and mobile number to proceed directly with your appointment. No password needed!
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name *</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="e.g. Ramesh Verma"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 text-xs sm:text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 text-xs sm:text-sm outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white font-black py-3 rounded-xl text-xs sm:text-sm shadow-md transition disabled:opacity-50"
                  >
                    {authSubmitting ? 'Starting Session...' : 'Instant Patient Sign-In & Book'}
                  </button>
                </>
              )}

              {/* EMAIL SIGN IN OR SIGN UP */}
              {authMode !== 'quick' && (
                <>
                  {authMode === 'signup' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            placeholder="e.g. Aayash Kushwaha"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs sm:text-sm outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="tel"
                            value={authPhone}
                            onChange={(e) => setAuthPhone(e.target.value)}
                            placeholder="+91 9329906127"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs sm:text-sm outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs sm:text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs sm:text-sm outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm shadow-md transition disabled:opacity-50"
                  >
                    {authSubmitting
                      ? 'Processing...'
                      : authMode === 'signin'
                      ? 'Sign In to Account'
                      : 'Register Account & Continue'}
                  </button>
                </>
              )}

              <div className="relative my-3 text-center">
                <span className="bg-white px-2 text-[11px] text-slate-400 uppercase tracking-wider relative z-10">Or</span>
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ================= MODAL: CERTIFICATE / CLINIC PHOTO PREVIEW ================= */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-slate-900">
              <img
                src={selectedItem.image}
                alt={selectedItem.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  {selectedItem.issuerOrDept}
                </span>
                <span className="text-xs text-slate-500 font-medium">{selectedItem.dateOrYear}</span>
              </div>

              <h3 className="text-2xl font-black text-slate-900">{selectedItem.title}</h3>
              <p className="text-sm font-semibold text-sky-700 mt-1">{selectedItem.subtitle}</p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">{selectedItem.description}</p>

              <div className="flex flex-wrap gap-2 mt-6">
                {selectedItem.tags.map((t) => (
                  <span key={t} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-md font-medium">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Flexifit Clinics • Anand Nagar, Indore</span>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setActiveTab('contact');
                    setBookingViewTab('book');
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
                >
                  Book Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: INSTAGRAM POST PREVIEW ================= */}
      {selectedInstaPost && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedInstaPost(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square bg-slate-900">
              <img
                src={selectedInstaPost.thumbnail}
                alt={selectedInstaPost.caption}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedInstaPost(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-pink-600 p-[2px]">
                    <img
                      src="/assets/aistudio/image_afdadbda.png"
                      alt="Flexifit Instagram"
                      className="w-full h-full rounded-full bg-white object-contain p-0.5"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">flexifitphysiotherapy.clinic</p>
                    <p className="text-[10px] text-slate-500">{selectedInstaPost.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-pink-600 fill-pink-600" /> {selectedInstaPost.likes}</span>
                </div>
              </div>

              <p className="text-xs text-slate-800 leading-relaxed mb-4">{selectedInstaPost.caption}</p>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {selectedInstaPost.tags.map((t) => (
                  <span key={t} className="text-[11px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>

              <a
                href="https://www.instagram.com/flexifitphysiotherapy.clinic/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"
              >
                <Instagram className="w-4 h-4" />
                <span>Open in Instagram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================= AI BOT LOGO & FLOATING CHAT WIDGET ================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Chat Window */}
        {isChatOpen && (
          <div className="w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden mb-4 flex flex-col h-[500px] animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header with AI Bot Logo */}
            <div className="bg-gradient-to-r from-sky-700 via-slate-900 to-emerald-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* AI Bot Logo from user uploaded image */}
                <div className="w-11 h-11 rounded-full bg-slate-950 p-1 border-2 border-emerald-400 shadow-md flex items-center justify-center overflow-hidden">
                  <img
                    src="/assets/aistudio/image_b708813b.png"
                    alt="AI Bot Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                    Flexifit AI Bot
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h4>
                  <p className="text-[10px] text-sky-200 font-medium">Clinic Assistant • Powered by TEAM VISIONARY</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex gap-2 overflow-x-auto text-[11px] whitespace-nowrap">
              <button
                onClick={() => {
                  setChatInput('How to book an appointment?');
                }}
                className="bg-white hover:bg-sky-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 font-medium"
              >
                📅 Book Appointment
              </button>
              <button
                onClick={() => {
                  setChatInput('Tell me about Dr. Mohit Madan for slip disc');
                }}
                className="bg-white hover:bg-sky-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 font-medium"
              >
                🩺 Spine &amp; Dr. Mohit
              </button>
              <button
                onClick={() => {
                  setChatInput('Postpartum rehab with Dr. Karuna Madan');
                }}
                className="bg-white hover:bg-emerald-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 font-medium"
              >
                👶 Dr. Karuna Postpartum
              </button>
              <button
                onClick={() => {
                  setChatInput('Where is the clinic located in Indore?');
                }}
                className="bg-white hover:bg-sky-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 font-medium"
              >
                📍 Location &amp; Hours
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-full bg-slate-950 p-0.5 border border-emerald-400 flex-shrink-0 flex items-center justify-center">
                      <img
                        src="/assets/aistudio/image_b708813b.png"
                        alt="AI Bot"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-sky-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none leading-relaxed'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`text-[9px] block mt-1 ${
                        msg.sender === 'user' ? 'text-sky-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}

              {isBotTyping && (
                <div className="flex gap-2 items-center text-slate-400 text-xs italic">
                  <div className="w-6 h-6 rounded-full bg-slate-950 p-0.5 flex items-center justify-center">
                    <img
                      src="/assets/aistudio/image_b708813b.png"
                      alt="AI Bot"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span>Flexifit AI is typing...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder="Ask about spine, fees, appointments..."
                className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-xs outline-none focus:ring-2 focus:ring-sky-600 text-slate-800"
              />
              <button
                onClick={handleSendMessage}
                className="w-9 h-9 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white rounded-full flex items-center justify-center shadow transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Floating Button with AI Bot Logo */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="relative group w-16 h-16 rounded-full bg-slate-950 p-1.5 shadow-2xl border-2 border-emerald-400 hover:border-sky-400 hover:scale-105 transition-all duration-300 flex items-center justify-center focus:outline-none"
          title="Chat with Flexifit AI Assistant"
        >
          {/* Subtle glowing ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 via-sky-500 to-emerald-400 opacity-40 blur-md group-hover:opacity-80 transition"></div>
          
          <img
            src="/assets/aistudio/image_b708813b.png"
            alt="Flexifit AI Bot"
            className="relative w-full h-full object-contain"
          />

          {/* Active Status Badge */}
          <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
          </span>
        </button>
      </div>
    </div>
  );
}
