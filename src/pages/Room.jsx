import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getToken } from "../utils/auth";
import WhiteboardLayout from "../components/WhiteboardLayout";

const Room = () => {
  const { code } = useParams();
  const [room, setRoom] = useState(null);
  const [isTutor, setIsTutor] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      const res = await axios.get(`http://localhost:5000/rooms/${code}`);
      const token = getToken();
      const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
      setRoom(res.data);
      setIsTutor(res.data.creator._id === payload?.id);
    };
    fetchRoom();
  }, [code]);

  return room ? <WhiteboardLayout room={room} isTutor={isTutor} /> : <p>Loading...</p>;
};

export default Room;
