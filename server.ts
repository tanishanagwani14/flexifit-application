import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const APPOINTMENTS_FILE = path.resolve(DATA_DIR, 'appointments.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(APPOINTMENTS_FILE)) {
  fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

export interface StoredAppointment {
  id: string;
  userId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  service: string;
  doctor: string;
  appointmentDate: string; // DD/MM/YYYY
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  createdBy?: 'patient' | 'admin';
}

function readAppointments(): StoredAppointment[] {
  try {
    if (!fs.existsSync(APPOINTMENTS_FILE)) return [];
    const content = fs.readFileSync(APPOINTMENTS_FILE, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading appointments file:', err);
    return [];
  }
}

function writeAppointments(appts: StoredAppointment[]) {
  try {
    fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(appts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing appointments file:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const appts = readAppointments();
    res.json({ status: 'ok', count: appts.length });
  });

  // Get all appointments (Admin Portal)
  app.get('/api/appointments', (req, res) => {
    const appts = readAppointments();
    const sorted = [...appts].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    res.json(sorted);
  });

  // Get user appointments (Patient Portal)
  app.get('/api/appointments/user/:userId', (req, res) => {
    const { userId } = req.params;
    const phone = req.query.phone as string | undefined;
    const appts = readAppointments();
    const userAppts = appts.filter((a) => {
      if (a.userId === userId) return true;
      if (phone && a.patientPhone && a.patientPhone.replace(/\D/g, '') === phone.replace(/\D/g, '')) return true;
      return false;
    });
    const sorted = [...userAppts].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    res.json(sorted);
  });

  // Create new appointment (Patient Booking or Admin Walk-in)
  app.post('/api/appointments', (req, res) => {
    try {
      const {
        id,
        userId,
        patientName,
        patientPhone,
        patientEmail,
        service,
        doctor,
        appointmentDate,
        timeSlot,
        notes,
        createdBy,
        status,
      } = req.body;

      if (!patientName || !patientPhone) {
        return res.status(400).json({ error: 'Patient name and phone are required.' });
      }

      const generatedId =
        id ||
        (createdBy === 'admin'
          ? `FF-ADM-${Date.now().toString(36).toUpperCase()}`
          : `FF-${Date.now().toString(36).toUpperCase()}`);

      const newAppt: StoredAppointment = {
        id: generatedId,
        userId: userId || 'guest_patient',
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientEmail: patientEmail ? patientEmail.trim() : '',
        service: service || 'General Physiotherapy Assessment',
        doctor: doctor || 'First Available Senior Specialist',
        appointmentDate: appointmentDate || new Date().toLocaleDateString('en-GB'),
        timeSlot: timeSlot || '11:00 AM - 12:30 PM (Morning)',
        status: status || 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: notes || '',
        createdBy: createdBy || 'patient',
      };

      const existing = readAppointments();
      const filtered = existing.filter((a) => a.id !== generatedId);
      const updated = [newAppt, ...filtered];
      writeAppointments(updated);

      console.log(`[Cross-Device Shared DB] Stored new appointment ${generatedId} for ${newAppt.patientName}`);
      res.status(201).json(newAppt);
    } catch (err: any) {
      console.error('Failed to create appointment:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Update appointment status (Admin Approve / Mark Completed / Cancel)
  app.patch('/api/appointments/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const appts = readAppointments();
      const index = appts.findIndex((a) => a.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const current = appts[index];
      const updatedAppt: StoredAppointment = {
        ...current,
        status: status || current.status,
        notes: notes !== undefined ? notes : current.notes,
        updatedAt: new Date().toISOString(),
      };

      appts[index] = updatedAppt;
      writeAppointments(appts);

      console.log(`[Cross-Device Shared DB] Updated appointment ${id} status to ${status}`);
      res.json(updatedAppt);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Admin login endpoint
  app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    const ADMIN_EMAIL = 'aayashkushwaha9@gmail.com';
    const ADMIN_DEFAULT_PASSWORD = 'aurafarmer@25';

    if (
      email &&
      email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      password === ADMIN_DEFAULT_PASSWORD
    ) {
      return res.json({
        success: true,
        user: {
          email: ADMIN_EMAIL,
          role: 'admin',
          displayName: 'Clinic Administrator',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid email or password. Access is restricted to clinic administrator.',
    });
  });

  // Vite middleware for development or static serving for production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Flexifit Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
});
