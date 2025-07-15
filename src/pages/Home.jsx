import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">🎓 Welcome to TutorHub</h1>
      <Link to="/create" className="text-blue-600 underline">Create a Room</Link>
    </div>
  );
}

export default Home;