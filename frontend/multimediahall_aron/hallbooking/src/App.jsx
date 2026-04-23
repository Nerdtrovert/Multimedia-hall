import React, { useState, useEffect } from 'react';
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc,
  onSnapshot, 
  query, 
  deleteDoc, 
  Timestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { Calendar, Clock, School, ShieldCheck, Trash2, User, AlertCircle, CheckCircle2, Info, FileText } from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCjCnsICZWe7HB1FIt8YEQdMUuZACAtf7U",
  authDomain: "hall-booking-b77e4.firebaseapp.com",
  projectId: "hall-booking-b77e4",
  storageBucket: "hall-booking-b77e4.firebasestorage.app",
  messagingSenderId: "836828187160",
  appId: "1:836828187160:web:253b3e6da196c46b76516d",
  measurementId: "G-ZH3Y68RKWY"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'hall-booking-system';

const COLLEGES = [
  { id: 'college_a', name: 'Dr H N National College of Engineering', color: 'bg-blue-600', text: 'text-blue-600' },
  { id: 'college_b', name: 'National College (Degree)', color: 'bg-emerald-600', text: 'text-emerald-600' },
  { id: 'college_c', name: 'National Pre-University College', color: 'bg-amber-600', text: 'text-amber-600' }
];

const START_LIMIT = "08:30";
const END_LIMIT = "18:00";

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [eventDescription, setEventDescription] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Subscription
  useEffect(() => {
    if (!user) return;

    const publicDataRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
    const q = query(publicDataRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort: 1. Date, 2. Start Time, 3. Priority by bookedAt
      const sorted = data.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
        return a.bookedAt.seconds - b.bookedAt.seconds;
      });
      setBookings(sorted);
    }, (err) => {
      console.error("Firestore error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleBooking = async () => {
    if (!selectedCollege) {
      showToast("Please select your college admin profile first.", "error");
      return;
    }

    if (!eventDescription.trim()) {
      showToast("Please provide an event description.", "error");
      return;
    }

    if (!bookingDate || !startTime || !endTime) return;

    // Validate operating hours
    if (startTime < START_LIMIT || endTime > END_LIMIT) {
      showToast(`Hall is only available between ${START_LIMIT} and ${END_LIMIT}.`, "error");
      return;
    }

    if (startTime >= endTime) {
      showToast("Start time must be before end time.", "error");
      return;
    }

    // Overlap check
    const isOverlapping = bookings.some(b => {
      if (b.date !== bookingDate) return false;
      // Overlap logic: (StartA < EndB) AND (EndA > StartB)
      return startTime < b.endTime && endTime > b.startTime;
    });

    if (isOverlapping) {
      showToast("This time slot overlaps with an existing booking.", "error");
      return;
    }

    try {
      const publicDataRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
      
      await addDoc(publicDataRef, {
        date: bookingDate,
        startTime,
        endTime,
        eventDescription: eventDescription.trim(),
        collegeId: selectedCollege.id,
        collegeName: selectedCollege.name,
        bookedBy: user.uid,
        bookedAt: Timestamp.now(),
      });

      setEventDescription(""); // Clear description after success
      showToast(`Successfully booked for ${bookingDate} (${startTime} - ${endTime})`);
    } catch (err) {
      showToast("Error processing booking. Please try again.", "error");
    }
  };

  const cancelBooking = async (id, ownerId) => {
    if (ownerId !== user.uid) {
      showToast("You can only cancel your own college's bookings.", "error");
      return;
    }

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id));
      showToast("Booking cancelled.");
    } catch (err) {
      showToast("Error cancelling booking.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School className="w-6 h-6 text-indigo-600" />
            <h1 className="font-bold text-xl tracking-tight">Multimedia App</h1>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Operating Hours</p>
              <p className="text-xs font-semibold text-slate-600">{START_LIMIT} - {END_LIMIT}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {/* Toast Notifications */}
        {message && (
          <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all transform animate-bounce z-50 ${
            message.type === 'error' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
          }`}>
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Admin Identity & Action */}
          <div className="md:col-span-1 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold">Admin Profile</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4 uppercase font-bold tracking-wider">Identity Selection</p>
              
              <div className="space-y-2">
                {COLLEGES.map((college) => (
                  <button
                    key={college.id}
                    onClick={() => setSelectedCollege(college)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                      selectedCollege?.id === college.id 
                        ? `${college.color} border-transparent text-white shadow-md` 
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50'
                    }`}
                  >
                    <span className="font-medium text-sm">{college.name}</span>
                    {selectedCollege?.id === college.id && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold">New Booking</h2>
              </div>
              <div className="space-y-4">
                {/* Event Description above Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Event Description</label>
                  <textarea 
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="e.g. Annual Symposium, Guest Lecture..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm resize-none h-20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date</label>
                  <input 
                    type="date" 
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Start Time</label>
                    <input 
                      type="time" 
                      value={startTime}
                      min={START_LIMIT}
                      max={END_LIMIT}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">End Time</label>
                    <input 
                      type="time" 
                      value={endTime}
                      min={START_LIMIT}
                      max={END_LIMIT}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg flex gap-2 items-start border border-amber-100">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 leading-tight">
                    Operating window: {START_LIMIT} AM to {END_LIMIT} PM (18:00).
                  </p>
                </div>

                <button
                  onClick={handleBooking}
                  className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg active:scale-95 transform"
                >
                  Confirm Reservation
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Schedule */}
          <div className="md:col-span-2">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  <h2 className="font-semibold">Booking Schedule</h2>
                </div>
                <span className="text-xs font-medium text-slate-400">{bookings.length} Total Slots</span>
              </div>
              
              <div className="divide-y divide-slate-100">
                {bookings.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-medium">No bookings yet.</p>
                    <p className="text-xs text-slate-300">Choose a time slot to reserve the hall.</p>
                  </div>
                ) : (
                  bookings.map((booking) => {
                    const collegeTheme = COLLEGES.find(c => c.id === booking.collegeId);
                    const isOwner = booking.bookedBy === user?.uid;
                    const logTime = booking.bookedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div key={booking.id} className="p-4 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 w-full">
                            <div className={`w-2 h-16 rounded-full shrink-0 ${collegeTheme?.color || 'bg-slate-300'}`}></div>
                            <div className="flex-grow">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">
                                  {new Date(booking.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                {isOwner && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Your Entry</span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600">
                                  <Clock className="w-3 h-3" />
                                  {booking.startTime} - {booking.endTime}
                                </div>
                                <span className={`text-sm font-semibold ${collegeTheme?.text || 'text-slate-600'}`}>
                                  {booking.collegeName}
                                </span>
                              </div>

                              {/* Display Event Description */}
                              <div className="flex items-start gap-1 mt-1.5 text-slate-600 italic">
                                <FileText className="w-3 h-3 mt-1 shrink-0 opacity-40" />
                                <p className="text-xs leading-relaxed line-clamp-2">
                                  {booking.eventDescription || 'No description provided.'}
                                </p>
                              </div>

                              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                <span>Priority: System logged request at {logTime}</span>
                              </div>
                            </div>
                          </div>
                          
                          {isOwner && (
                            <button 
                              onClick={() => cancelBooking(booking.id, booking.bookedBy)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                              title="Cancel Booking"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-800 leading-relaxed">
                <p className="font-bold mb-1 underline">Booking Rules</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Hall is strictly available from <strong>08:30 AM to 06:00 PM</strong>.</li>
                  <li><strong>Event Description</strong> is mandatory for all bookings.</li>
                  <li>Multiple colleges can book the same day as long as their durations do not overlap.</li>
                  <li>In case of a collision, the system assigns the slot to whoever submitted the request first.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

