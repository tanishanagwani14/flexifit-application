export interface CertificateItem {
  id: string;
  type: 'certificate' | 'facility' | 'post';
  title: string;
  subtitle: string;
  issuerOrDept: string;
  dateOrYear: string;
  image: string;
  description: string;
  tags: string[];
  doctor?: 'Dr. Mohit Madan' | 'Dr. Karuna Madan' | 'Flexifit Clinics';
}

export interface InstagramPost {
  id: string;
  type: 'reel' | 'post' | 'video';
  thumbnail: string;
  likes: string;
  comments: string;
  caption: string;
  tags: string[];
  duration?: string;
  date: string;
}

export const CLINIC_CERTIFICATES_AND_POSTS: CertificateItem[] = [
  {
    id: 'cert-1',
    type: 'certificate',
    title: 'Master of Physiotherapy (MPT - Ortho & Spine)',
    subtitle: 'Advanced Musculoskeletal & Spinal Rehabilitation',
    issuerOrDept: 'Indian Association of Physiotherapists (IAP)',
    dateOrYear: 'Certified Specialist',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
    description: 'Dr. Mohit Madan holds advanced credentials in Orthopedic & Spine Physiotherapy, specializing in non-surgical decompression and severe disc herniation management.',
    tags: ['Spine Specialist', 'MPT Orthopaedics', 'IAP Certified'],
    doctor: 'Dr. Mohit Madan',
  },
  {
    id: 'cert-2',
    type: 'certificate',
    title: 'Fellowship in Osteopathy & Chiropractic Manipulative Therapy',
    subtitle: 'Spinal Alignment & Joint Mobilization Accreditation',
    issuerOrDept: 'Academy of Manual Medicine & Chiropractic Sciences',
    dateOrYear: 'Accredited Fellow',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    description: 'Specialized postgraduate accreditation in high-velocity low-amplitude (HVLA) thrust techniques, cranial osteopathy, and postural restoration.',
    tags: ['Chiropractic', 'Osteopathy', 'Manual Therapy'],
    doctor: 'Dr. Mohit Madan',
  },
  {
    id: 'cert-3',
    type: 'certificate',
    title: 'Certified Postnatal Rehabilitation & Diastasis Recti Specialist',
    subtitle: "Creator of 'Bounce Back Stronger' Motherhood Rehab",
    issuerOrDept: "Women's Health & Pelvic Floor Institute",
    dateOrYear: 'Clinical Excellence',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    description: 'Dr. Karuna Madan is certified in postpartum core restoration, diastasis recti closure, C-section scar tissue mobilization, and pelvic floor re-education.',
    tags: ["Women's Health", 'Diastasis Recti', 'Postpartum Care'],
    doctor: 'Dr. Karuna Madan',
  },
  {
    id: 'cert-4',
    type: 'certificate',
    title: 'Best Physiotherapy & Spine Clinic in Indore Award',
    subtitle: 'Healthcare Leadership Summit & Clinical Excellence Honor',
    issuerOrDept: 'Central India Medical Excellence Council',
    dateOrYear: 'Annual Healthcare Awards',
    image: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=800&q=80',
    description: 'Recognized as the premier clinical destination in Indore for non-invasive spine treatments, helping over 5,000+ patients avoid spinal surgeries.',
    tags: ['#1 in Indore', 'Excellence Award', '50K+ Patients'],
    doctor: 'Flexifit Clinics',
  },
  {
    id: 'facility-1',
    type: 'facility',
    title: 'Advanced Spinal Decompression & Mechanical Traction Unit',
    subtitle: 'Computerized Cervical & Lumbar Traction',
    issuerOrDept: 'Spine Rehabilitation Suite',
    dateOrYear: 'Modern Technology',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    description: 'State-of-the-art computerized traction tables designed to gently relieve nerve root compression in sciatica, PIVD (slip disc), and cervical radiculopathy.',
    tags: ['Spine Decompression', 'Lumbar Traction', 'Sciatica Care'],
    doctor: 'Flexifit Clinics',
  },
  {
    id: 'facility-2',
    type: 'facility',
    title: 'Electrotherapy & High-Intensity Ultrasound Treatment Room',
    subtitle: 'Deep Tissue Healing & Pain Modulation',
    issuerOrDept: 'Pain Management Division',
    dateOrYear: 'Clinical Setup',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
    description: 'Equipped with 4-channel Interferential Therapy (IFT), TENS, therapeutic ultrasound, and laser biostimulation for rapid muscle spasm and joint inflammation relief.',
    tags: ['Electrotherapy', 'IFT / TENS', 'Pain Relief'],
    doctor: 'Flexifit Clinics',
  },
  {
    id: 'facility-3',
    type: 'facility',
    title: "Postpartum Core & Pelvic Floor Recovery Studio",
    subtitle: 'Dedicated Private Women’s Health Space',
    issuerOrDept: "Dr. Karuna Madan's Wellness Clinic",
    dateOrYear: 'Specialized Suite',
    image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80',
    description: 'A private, hygienic, and supportive space with clinical Pilates reformers, Swiss balls, and biofeedback tools specifically curated for new mothers.',
    tags: ['Private Studio', 'Maternal Rehab', 'Core Restoration'],
    doctor: 'Dr. Karuna Madan',
  },
  {
    id: 'facility-4',
    type: 'facility',
    title: 'Functional Kinetic & Gait Rehabilitation Zone',
    subtitle: 'Post-Surgical Knee & Hip Joint Re-education',
    issuerOrDept: 'Orthopedic Rehabilitation',
    dateOrYear: 'Indore Facility',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    description: 'Custom parallel bars, wobble boards, and resistance trainers for accelerated recovery following knee replacement, ligament tears (ACL/PCL), and ankle fractures.',
    tags: ['Knee Rehab', 'Gait Training', 'Post-Surgery'],
    doctor: 'Flexifit Clinics',
  },
  {
    id: 'post-1',
    type: 'post',
    title: 'Slip Disc (PIVD): Can Surgery Be Avoided with Targeted Decompression?',
    subtitle: 'Clinical Case Review & MRI Comparison by Dr. Mohit Madan',
    issuerOrDept: 'Clinical Insights Series',
    dateOrYear: 'Case Study',
    image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80',
    description: 'Detailed analysis of a 42-year-old patient with L5-S1 disc protrusion who achieved 95% symptom resolution and avoided spinal fusion through 4 weeks of structured decompression therapy.',
    tags: ['Slip Disc', 'Case Study', 'Surgery Alternative'],
    doctor: 'Dr. Mohit Madan',
  },
  {
    id: 'post-2',
    type: 'post',
    title: 'Diastasis Recti: Closing the Abdominal Gap Safely Post-Delivery',
    subtitle: 'Essential Guidelines for New Mothers by Dr. Karuna Madan',
    issuerOrDept: 'Postnatal Health Guide',
    dateOrYear: 'Educational Post',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80',
    description: 'Why standard crunches worsen diastasis recti and how activating the transversus abdominis alongside pelvic floor coordination heals the linea alba without surgery.',
    tags: ['Diastasis Recti', "Mother's Health", 'Safe Core Exercises'],
    doctor: 'Dr. Karuna Madan',
  },
  {
    id: 'post-3',
    type: 'post',
    title: 'Knee Osteoarthritis: Quad Strengthening & Joint Mobilization',
    subtitle: 'Proven Protocol to Delay or Prevent Total Knee Replacement',
    issuerOrDept: 'Orthopedic Research',
    dateOrYear: 'Patient Advisory',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
    description: 'Clinical findings demonstrating how improving VMO strength and restoring patellofemoral gliding reduces knee joint contact stress by up to 40%.',
    tags: ['Knee Pain', 'Osteoarthritis', 'Joint Mobilization'],
    doctor: 'Dr. Mohit Madan',
  },
];

export const INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: 'insta-1',
    type: 'reel',
    thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80',
    likes: '1,428',
    comments: '86',
    caption: 'Live Cervical Spine Mobilization & Rapid Neck Alignment session with Dr. Mohit Madan 🩺 Feel instant relief from chronic desk stiffness! #IndorePhysiotherapy #FlexifitClinics',
    tags: ['#IndorePhysio', '#SpineSpecialist', '#NeckPainRelief'],
    duration: '0:48',
    date: '2 days ago',
  },
  {
    id: 'insta-2',
    type: 'reel',
    thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80',
    likes: '2,150',
    comments: '134',
    caption: 'Bounce Back Stronger 💪 Watch our patient successfully close a 3-finger Diastasis Recti gap in 8 weeks with Dr. Karuna Madan. You are not alone, new mamas! #PostpartumHealth',
    tags: ['#DiastasisRecti', '#BounceBackStronger', '#IndoreMoms'],
    duration: '1:12',
    date: '4 days ago',
  },
  {
    id: 'insta-3',
    type: 'post',
    thumbnail: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
    likes: '984',
    comments: '42',
    caption: 'Patient Milestone: 65-year-old Smt. Sharda Devi walking pain-free without a cane after 3 weeks of intensive knee rehabilitation at Anand Nagar clinic! 🌸🙏',
    tags: ['#KneePainRelief', '#PatientSuccess', '#FlexifitIndore'],
    date: '1 week ago',
  },
  {
    id: 'insta-4',
    type: 'reel',
    thumbnail: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
    likes: '3,290',
    comments: '210',
    caption: 'World Physical Therapy Day Celebration at Flexifit Clinics Indore 🏥🩺 Free posture screening camp & patient appreciation day! Thank you Indore for your immense trust.',
    tags: ['#WorldPTDay', '#IndoreDoctors', '#SpineClinic'],
    duration: '0:59',
    date: '2 weeks ago',
  },
  {
    id: 'insta-5',
    type: 'post',
    thumbnail: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
    likes: '1,120',
    comments: '58',
    caption: 'Computerized Decompression in action! 💡 How creating negative intradiscal pressure draws back herniated disc material without surgical cuts. Watch the mechanism!',
    tags: ['#SlipDiscTreatment', '#SciaticaPain', '#ChiropracticIndore'],
    date: '3 weeks ago',
  },
  {
    id: 'insta-6',
    type: 'reel',
    thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80',
    likes: '2,640',
    comments: '172',
    caption: '3 Simple Stretches you can do right at your work desk in Vijay Nagar or Palasia to prevent Tech-Neck & Lower Back Spasms 💻 Try them right now!',
    tags: ['#Ergonomics', '#DeskStretches', '#HealthTips'],
    duration: '0:42',
    date: '1 month ago',
  },
];
