/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Phone,
  User,
  Plus,
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  LogOut,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Stethoscope,
  Activity,
  FileText,
  Lock,
  ArrowLeft,
  Mail,
  CalendarCheck,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  ADMIN_DEFAULT_PASSWORD,
  getAllAppointments,
  subscribeToAllAppointments,
  updateAppointmentStatus,
  createAdminAppointment,
  AppointmentRecord,
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from '../firebase';
import type { User as FirebaseUser } from 'firebase/auth';

interface AdminPortalProps {
  currentUser: FirebaseUser | null;
  onExit: () => void;
}

export default function AdminPortal({ currentUser, onExit }: AdminPortalProps) {
  // Admin Login credentials - initialized empty so browser/form does not prefill
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  // Authenticated state (checked against email or verified session)
  const [isAdminSessionUnlocked, setIsAdminSessionUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('flexifit_admin_session') === 'true';
    } catch {
      return false;
    }
  });

  const isCurrentlyAdmin =
    (currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ||
    isAdminSessionUnlocked;

  // Appointments data
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  // New Booking Modal State
  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newDoctor, setNewDoctor] = useState('Dr. Mohit Madan (Spine & Musculoskeletal)');
  const [newService, setNewService] = useState('Spine & Slip Disc Rehabilitation (PIVD)');
  const [newTimeSlot, setNewTimeSlot] = useState('11:00 AM - 12:30 PM (Morning)');
  const [newNotes, setNewNotes] = useState('Walk-in patient at Anand Nagar clinic');

  // Date formatting for new booking
  const today = new Date();
  const formatToDDMMYYYY = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const toInputDate = (date: Date) => date.toISOString().split('T')[0];

  const [dateInputValue, setDateInputValue] = useState(toInputDate(today));
  const [displayDateDDMMYY, setDisplayDateDDMMYY] = useState(formatToDDMMYYYY(today));
  const [addingSubmitting, setAddingSubmitting] = useState(false);

  // Real-time subscription to ALL appointments from Firestore
  useEffect(() => {
    if (!isCurrentlyAdmin) return;

    setLoadingAppts(true);
    const unsubscribe = subscribeToAllAppointments(
      (data) => {
        setAppointments(data);
        setLoadingAppts(false);
      },
      (err) => {
        console.warn('Real-time subscription notice:', err);
        setLoadingAppts(false);
      }
    );

    return () => unsubscribe();
  }, [isCurrentlyAdmin]);

  const loadAppointments = async () => {
    setLoadingAppts(true);
    const data = await getAllAppointments();
    setAppointments(data);
    setLoadingAppts(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    setAdminAuthLoading(true);

    const emailTrimmed = adminEmailInput.trim().toLowerCase();
    if (emailTrimmed !== ADMIN_EMAIL.toLowerCase()) {
      setAdminAuthError(`Access restricted. Only clinic admin account (${ADMIN_EMAIL}) is permitted.`);
      setAdminAuthLoading(false);
      return;
    }

    try {
      // 1. Authenticate with server API endpoint
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailTrimmed, password: adminPasswordInput }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success) {
            setIsAdminSessionUnlocked(true);
            try {
              sessionStorage.setItem('flexifit_admin_session', 'true');
            } catch {}
            // Attempt background Firebase Auth sign-in as supplementary channel
            try {
              await signInWithEmailAndPassword(auth, emailTrimmed, adminPasswordInput);
            } catch {}
            setAdminAuthLoading(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('Server login API notice:', apiErr);
      }

      // 2. Client verification against configured credentials
      if (
        emailTrimmed === ADMIN_EMAIL.toLowerCase() &&
        (adminPasswordInput === ADMIN_DEFAULT_PASSWORD || auth.currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())
      ) {
        setIsAdminSessionUnlocked(true);
        try {
          sessionStorage.setItem('flexifit_admin_session', 'true');
        } catch {}
      } else {
        setAdminAuthError('Invalid admin password. Please enter the correct password.');
      }
    } catch (err: any) {
      console.error('Admin login check:', err);
      if (
        emailTrimmed === ADMIN_EMAIL.toLowerCase() &&
        adminPasswordInput === ADMIN_DEFAULT_PASSWORD
      ) {
        setIsAdminSessionUnlocked(true);
        try {
          sessionStorage.setItem('flexifit_admin_session', 'true');
        } catch {}
      } else {
        setAdminAuthError('Invalid admin password. Please verify credentials.');
      }
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    setIsAdminSessionUnlocked(false);
    try {
      sessionStorage.removeItem('flexifit_admin_session');
    } catch {}
    try {
      await signOut(auth);
    } catch {}
    onExit();
  };

  const handleStatusChange = async (
    apptId: string | undefined,
    newStatus: 'confirmed' | 'pending' | 'completed' | 'cancelled',
    notes?: string
  ) => {
    if (!apptId) return;
    // Optimistic instant UI update
    setAppointments((prev) =>
      prev.map((a) => (a.id === apptId ? { ...a, status: newStatus, notes: notes !== undefined ? notes : a.notes } : a))
    );
    await updateAppointmentStatus(apptId, newStatus, notes);
  };


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

  const handleCreateNewBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSubmitting(true);

    try {
      await createAdminAppointment({
        userId: 'admin_created',
        patientName: newPatientName,
        patientPhone: newPatientPhone,
        patientEmail: newPatientEmail || 'reception@flexifit.in',
        service: newService,
        doctor: newDoctor,
        appointmentDate: displayDateDDMMYY,
        timeSlot: newTimeSlot,
        status: 'confirmed',
        notes: newNotes,
      });

      setIsAddBookingOpen(false);
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientEmail('');
      await loadAppointments();
    } catch (err) {
      console.error('Error creating admin appointment:', err);
      alert('Failed to save booking.');
    } finally {
      setAddingSubmitting(false);
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === 'all' || appt.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesSearch =
      appt.patientName.toLowerCase().includes(q) ||
      appt.patientPhone.toLowerCase().includes(q) ||
      appt.service.toLowerCase().includes(q) ||
      appt.doctor.toLowerCase().includes(q) ||
      appt.appointmentDate.includes(q) ||
      (appt.id && appt.id.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  // Key Metrics
  const totalCount = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const todayFormatted = formatToDDMMYYYY(new Date());
  const todayCount = appointments.filter((a) => a.appointmentDate === todayFormatted).length;

  // ================= NOT LOGGED IN AS ADMIN: RENDER ADMIN LOGIN =================
  if (!isCurrentlyAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl relative">
          <button
            onClick={onExit}
            className="absolute top-5 left-5 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Website
          </button>

          <div className="text-center mt-6 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 p-0.5 mx-auto mb-4 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Lock className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-white">Flexifit Admin Portal</h2>
            <p className="text-xs text-slate-400 mt-1">
              Authorized clinical administrator login only.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {adminAuthError && (
              <div className="bg-rose-950/80 border border-rose-600/50 text-rose-200 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{adminAuthError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="aayashkushwaha9@gmail.com"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Enter clinic admin password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={adminAuthLoading}
              className="w-full bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white font-black py-3.5 rounded-xl text-xs shadow-lg transition mt-2 disabled:opacity-50"
            >
              {adminAuthLoading ? 'Authenticating Admin...' : 'Login to Admin Dashboard'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/60 text-center">
            <span className="text-[11px] text-slate-500">
              Authorized account: <strong className="text-slate-300">{ADMIN_EMAIL}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ================= LOGGED IN ADMIN DASHBOARD =================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Admin Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/image_afdadbda.png"
                alt="Flexifit Clinics Logo"
                className="h-10 w-auto bg-white/10 p-1 rounded-lg"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg text-white">Flexifit Admin Portal</span>
                  <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                    Clinic Management
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Anand Nagar, Indore • Dr. Mohit &amp; Dr. Karuna</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300 font-medium">Logged in:</span>
                <span className="font-bold text-white">{currentUser?.email || ADMIN_EMAIL}</span>
              </div>

              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Live Sync
              </span>

              <button
                onClick={onExit}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 sm:px-3 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Patient Site</span>
              </button>

              <button
                onClick={handleAdminLogout}
                className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold px-2.5 sm:px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                title="Sign Out Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Admin Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Action Bar & Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Appointment Management &amp; Approvals
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review incoming patient booking requests, approve visits, and record walk-in clinic entries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAppointments}
              className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 shadow-sm transition flex items-center gap-2"
              title="Refresh Appointments"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAppts ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsAddBookingOpen(true)}
              className="bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Booking</span>
            </button>
          </div>
        </div>

        {/* Metric Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bookings</div>
            <div className="text-3xl font-black text-slate-900 mt-2">{totalCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">All time records</div>
          </div>

          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Needs Approval</span>
              {pendingCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
            </div>
            <div className="text-3xl font-black text-amber-900 mt-2">{pendingCount}</div>
            <div className="text-[11px] text-amber-700 font-semibold mt-1">Pending patient requests</div>
          </div>

          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Approved / Confirmed</div>
            <div className="text-3xl font-black text-emerald-900 mt-2">{confirmedCount}</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">Active scheduled visits</div>
          </div>

          <div className="bg-sky-50 p-5 rounded-2xl border border-sky-200 shadow-sm">
            <div className="text-xs font-bold text-sky-800 uppercase tracking-wider">Today&apos;s Appointments</div>
            <div className="text-3xl font-black text-sky-900 mt-2">{todayCount}</div>
            <div className="text-[11px] text-sky-700 font-semibold mt-1">{todayFormatted}</div>
          </div>

          <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200 shadow-sm">
            <div className="text-xs font-bold text-purple-800 uppercase tracking-wider">Completed</div>
            <div className="text-3xl font-black text-purple-900 mt-2">{completedCount}</div>
            <div className="text-[11px] text-purple-700 font-semibold mt-1">Discharged / Finished</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              <span>Pending</span>
              <span className="bg-white/40 px-1.5 py-0.2 rounded-full text-[10px]">{pendingCount}</span>
            </button>
            <button
              onClick={() => setStatusFilter('confirmed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === 'confirmed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              }`}
            >
              Approved ({confirmedCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === 'completed'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
              }`}
            >
              Cancelled
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, date..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-sky-600"
            />
          </div>
        </div>

        {/* Appointment Records List */}
        {loadingAppts ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 text-sm border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
            <span>Loading clinic appointments...</span>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-base text-slate-800">No Appointments Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no appointment records matching the selected filter or query. You can add a new walk-in booking above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((appt) => (
              <div
                key={appt.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
              >
                {/* Patient & Booking Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        appt.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : appt.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : appt.status === 'completed'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {appt.status === 'pending'
                        ? '⏳ Needs Approval'
                        : appt.status === 'confirmed'
                        ? '✓ Approved'
                        : appt.status === 'completed'
                        ? '★ Completed'
                        : '✕ Cancelled'}
                    </span>

                    <span className="text-xs font-mono text-slate-400">ID: {appt.id}</span>

                    {appt.createdBy === 'admin' ? (
                      <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-bold border border-sky-100">
                        Admin Walk-in
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                        Online Patient
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-baseline gap-3">
                    <h3 className="text-lg font-black text-slate-900">{appt.patientName}</h3>
                    <a
                      href={`tel:${appt.patientPhone}`}
                      className="text-xs font-bold text-sky-700 hover:text-sky-800 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{appt.patientPhone}</span>
                    </a>
                    {appt.patientEmail && (
                      <span className="text-xs text-slate-400">({appt.patientEmail})</span>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400">Treatment: </span>
                      <strong className="text-slate-800">{appt.service}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Doctor: </span>
                      <strong className="text-slate-800">{appt.doctor}</strong>
                    </div>
                  </div>

                  {appt.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                      Note: {appt.notes}
                    </p>
                  )}
                </div>

                {/* Appointment Date / Time Pill & Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 w-full lg:w-auto">
                  <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-2 text-right">
                    <div className="text-xs font-extrabold text-sky-950 flex items-center gap-1.5 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-sky-700" />
                      <span>{appt.appointmentDate} (DD/MM/YYYY)</span>
                    </div>
                    <div className="text-[11px] font-semibold text-sky-800 flex items-center gap-1 justify-end mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{appt.timeSlot}</span>
                    </div>
                  </div>

                  {/* Actions according to state */}
                  <div className="flex flex-wrap items-center gap-2">
                    {appt.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(appt.id, 'confirmed')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Request</span>
                      </button>
                    )}

                    {appt.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusChange(appt.id, 'completed')}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                    )}

                    {appt.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to cancel ${appt.patientName}'s appointment?`)) {
                            handleStatusChange(appt.id, 'cancelled', 'Cancelled by Clinic Admin');
                          }
                        }}
                        className="bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs px-3 py-2 rounded-xl transition"
                      >
                        Cancel
                      </button>
                    )}

                    {appt.status === 'cancelled' && (
                      <button
                        onClick={() => handleStatusChange(appt.id, 'confirmed')}
                        className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs px-3 py-1.5 rounded-xl transition"
                      >
                        Re-Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ================= MODAL: ADD NEW BOOKING FROM ADMIN END ================= */}
      {isAddBookingOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsAddBookingOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-emerald-600 text-white p-6 relative">
              <button
                onClick={() => setIsAddBookingOpen(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Add New Patient Booking</h3>
                  <p className="text-xs text-sky-100">Schedule walk-in or phone consultation directly</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateNewBooking} className="p-6 sm:p-8 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Verma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Email (Optional)</label>
                <input
                  type="email"
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  placeholder="patient@example.com (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs outline-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Doctor *</label>
                  <select
                    value={newDoctor}
                    onChange={(e) => setNewDoctor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs outline-none bg-white"
                  >
                    <option value="Dr. Mohit Madan (Spine & Musculoskeletal)">Dr. Mohit Madan (Spine &amp; Chiro)</option>
                    <option value="Dr. Karuna Madan (Women's Health & Postpartum)">Dr. Karuna Madan (Postpartum)</option>
                    <option value="First Available Senior Specialist">First Available Senior Specialist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service / Treatment *</label>
                  <select
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs outline-none bg-white"
                  >
                    <option value="Spine & Slip Disc Rehabilitation (PIVD)">Spine &amp; Slip Disc Rehab (PIVD)</option>
                    <option value="Knee Pain & Orthopedic Rehabilitation">Knee Pain &amp; Orthopedic Care</option>
                    <option value="Postpartum & Women's Health (Diastasis Recti)">Postpartum Diastasis Recti</option>
                    <option value="Osteopathy & Chiropractic Alignment">Osteopathy &amp; Chiropractic</option>
                    <option value="Electrotherapy & Pain Management (IFT/Ultrasound)">Electrotherapy (IFT / TENS)</option>
                    <option value="General Physiotherapy Assessment">General Assessment</option>
                  </select>
                </div>
              </div>

              {/* Appointment Date in DD/MM/YYYY */}
              <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-sky-950 uppercase tracking-wider">
                    Appointment Date (DD/MM/YYYY) *
                  </label>
                  <span className="text-[11px] font-bold text-sky-900 bg-white px-2 py-0.5 rounded-md border border-sky-200">
                    Selected: {displayDateDDMMYY}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRelativeDate(0)}
                    className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-900 text-xs rounded-lg border border-sky-200 font-semibold"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDate(1)}
                    className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-900 text-xs rounded-lg border border-sky-200 font-semibold"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDate(3)}
                    className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-900 text-xs rounded-lg border border-sky-200 font-semibold"
                  >
                    In 3 Days
                  </button>
                </div>

                <input
                  type="date"
                  required
                  value={dateInputValue}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sky-300 text-xs font-semibold bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot *</label>
                <select
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs outline-none bg-white"
                >
                  <option value="9:30 AM - 11:00 AM (Morning)">9:30 AM – 11:00 AM (Morning)</option>
                  <option value="11:00 AM - 12:30 PM (Morning)">11:00 AM – 12:30 PM (Morning)</option>
                  <option value="4:00 PM - 5:30 PM (Evening)">4:00 PM – 5:30 PM (Evening)</option>
                  <option value="5:30 PM - 7:00 PM (Evening)">5:30 PM – 7:00 PM (Evening)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Notes</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Walk-in consultation, severe L5-S1 radiating pain"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 text-xs outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddBookingOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {addingSubmitting ? 'Saving Booking...' : 'Save & Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
