// Room.jsx - Updated for split payment system
import usePageTitle from "../hooks/usePageTitle.js";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import RoomShell from "../room/RoomShell.jsx";
import { Loader2, Lock, SearchX, Wallet } from "lucide-react";
import api from "../utils/api";
import { isLoggedIn } from "../utils/auth";

const Room = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [isTutor, setIsTutor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentSetupWarning, setPaymentSetupWarning] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  usePageTitle(room?.topic);


  useEffect(() => {
    const fetchRoom = async () => {
      let authenticated = false;
      try {
        const res = await api.get('/auth/check-auth');
        // console.log("Auth check response:", res);
        authenticated = true;
        setIsAuthenticated(true);
      } catch (err) {
        authenticated = false;
        setIsAuthenticated(false);
      }

      try {
        setLoading(true);
        setError(null);
        
        // First, try to get basic room info (no auth needed for free rooms)
        let res;
        try {
          if (authenticated) {
            // If user is logged in, get full room data with payment status
            res = await api.get(`/rooms/${code}`);
          } else {
            // If no token, get basic room info
            res = await api.get(`/rooms/${code}/public`);
          }
        } catch (err) {
          if (err.response?.status === 401 && !authenticated) {
            // Try public endpoint if auth fails and no token
            res = await api.get(`/rooms/${code}/public`);
          } else {
            throw err;
          }
        }

        const roomData = res.data;
        setRoom(roomData);
        // console.log(roomData)
        setIsTutor(roomData.isTutor || false);
        // console.log("Fetched room data:", roomData);
        // Check if tutor has payment setup for paid rooms
        if (roomData.isPaid && roomData.isTutor && !roomData.creator?.hasPaymentSetup) {
          setPaymentSetupWarning(true);
        }

        // Access control logic
        if (roomData.isTutor) {
          // Tutors always get access
          setAccessGranted(true);
          setPaymentRequired(false);
        } else if (!roomData.isPaid) {
          // Free rooms - grant access to everyone (no login required)
          setAccessGranted(true);
          setPaymentRequired(false);
        } else if (roomData.isPaid) {
          if (!authenticated) {
            // Paid room but user not logged in - redirect to login
            navigate(`/login?redirect=/room/${code}`);
            return;
          } else if (roomData.hasPaid) {
            // Paid room and user has paid
            setAccessGranted(true);
            setPaymentRequired(false);
          } else {
            // Paid room and user hasn't paid
            setAccessGranted(false);
            setPaymentRequired(true);
          }
        }

      } catch (err) {
        console.error("Error fetching room:", err);
        setError(err.response?.data?.message || "Room not found");
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchRoom();
    }
  }, [code, navigate]);

  // Handle SplitisAPayment
  const handlePayment = async () => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      navigate(`/login?redirect=/room/${code}`);
      return;
    }

    try {
      const res = await api.post(
        `/payments/initiate`,
        { roomId: room._id }
      );
      
      if (res.data.free) {
        // Room became free, refresh page
        window.location.reload();
      } else if (res.data.authorization_url) {
        // Redirect to Paystack split payment checkout
        window.location.href = res.data.authorization_url;
      } else {
        alert("Unable to initiate payment. Please try again.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      const errorMessage = err.response?.data?.message || "Payment initiation failed";
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div role="status" className="flex items-center gap-3 text-sm text-muted">
          <Loader2 size={18} className="animate-spin" /> Opening room…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <StatusCard icon={SearchX} title="Room not found" body={error}>
        <button onClick={() => navigate("/")} className="h-10 w-full rounded-md bg-accent text-sm font-medium text-white hover:bg-accent-strong">Back to home</button>
      </StatusCard>
    );
  }

  if (paymentRequired) {
    return (
      <StatusCard icon={Lock} title="This session is paid" body={room?.topic}>
        <div className="mb-4 rounded-md border border-line bg-sunken px-4 py-3 text-left">
          <div className="text-xs uppercase tracking-wider text-muted">One-time payment</div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums">₦{room?.price?.toLocaleString()}</div>
        </div>
        <button onClick={handlePayment} className="h-10 w-full rounded-md bg-accent text-sm font-medium text-white hover:bg-accent-strong">Pay and join</button>
        <button onClick={() => navigate("/dashboard")} className="mt-2 h-10 w-full rounded-md border border-line text-sm hover:bg-sunken">Not now</button>
      </StatusCard>
    );
  }

  if (paymentSetupWarning) {
    return (
      <StatusCard icon={Wallet} title="Set up payouts first" body="This is a paid session, but your bank account is not connected yet. Listeners cannot pay until it is.">
        <button onClick={() => navigate("/profile")} className="h-10 w-full rounded-md bg-accent text-sm font-medium text-white hover:bg-accent-strong">Connect bank account</button>
        <button onClick={() => navigate("/lobby")} className="mt-2 h-10 w-full rounded-md border border-line text-sm hover:bg-sunken">Back to my rooms</button>
      </StatusCard>
    );
  }

  return room && accessGranted ? <RoomShell room={room} isTutor={isTutor} /> : null;
};

function StatusCard({ icon: Icon, title, body, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-7 text-center">
        <Icon size={26} strokeWidth={1.5} className="mx-auto text-gray-500" />
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        {body && <p className="mb-6 mt-1.5 text-sm text-muted">{body}</p>}
        {children}
      </div>
    </div>
  );
}

export default Room;
